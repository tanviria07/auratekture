import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { getAdmin } from '../../shared/auth.ts';
import { loadKitLines } from '../../shared/kit.ts';
import { cachedSearch } from '../../shared/serpapi.ts';

const MATCH_MODEL = 'gemini-3.5-flash';
const DIMS = ['width_in', 'depth_in', 'height_in', 'watts', 'length_ft'];
const CONF = { type: 'STRING', enum: ['quoted', 'estimated', 'missing'] };
const PICK = {
  type: 'OBJECT',
  properties: {
    candidate_index: { type: 'INTEGER' }, link: { type: 'STRING' }, price: { type: 'NUMBER' },
    specs: { type: 'OBJECT', properties: Object.fromEntries(DIMS.map((k) => [k, { type: 'NUMBER', nullable: true }])), required: DIMS },
    confidence: { type: 'OBJECT', properties: Object.fromEntries(DIMS.map((k) => [k, CONF])), required: DIMS },
    raw_spec_quote: { type: 'STRING' },
    indoor_rated: { type: 'STRING', enum: ['yes', 'no', 'not stated'] },
  },
  required: ['candidate_index', 'link', 'price', 'specs', 'confidence', 'raw_spec_quote', 'indoor_rated'],
};
const LINE_SCHEMA = {
  type: 'OBJECT',
  properties: {
    status: { type: 'STRING', enum: ['found', 'not_found'] },
    reason: { type: 'STRING' },
    pick: PICK,
    alternatives: { type: 'ARRAY', items: PICK },
  },
  required: ['status', 'reason', 'alternatives'],
};

const PROMPT = `You are picking a real product for one kit line from Google Shopping candidates.
Pick the best candidate that fits the specs and costs at most max_unit_price_usd, plus up to 2 alternatives.
You may ONLY choose among the given candidates: copy candidate_index, link and price exactly. Never invent a product, link or price.
Prefer major retailers (Amazon, Walmart, Target, Home Depot, Lowe's, Wayfair, Michaels, Kohl's, Macy's, Best Buy). Use eBay or Etsy only if nothing else fits.
For trees, prefer listings that state the height in the title, and match the height from the specs (height_in_max).
Fill specs (width_in, depth_in, height_in, watts, length_ft) from the listing text. confidence per spec: "quoted" if the listing states the value, "estimated" if inferred, "missing" if absent (value null).
Copy the exact listing text you used into raw_spec_quote. Set indoor_rated from the listing text: "yes" if indoor/interior rated, "no" if outdoor only, "not stated" if it does not say.
If no candidate fits, set status "not_found" and explain in reason; otherwise give a one-sentence reason.`;

function toProduct(pick: any, cands: any[], qty: number) {
  const c = cands[pick?.candidate_index];
  if (!c || pick.link !== c.link || Number(pick.price) !== c.price) return null;
  const text = `${c.title} ${c.delivery || ''}`.toLowerCase();
  const quote = (pick.raw_spec_quote || '').trim();
  const quoteOk = !!quote && text.includes(quote.toLowerCase());
  const specs: any = {}, confidence: any = {};
  for (const k of DIMS) {
    const v = pick.specs?.[k];
    specs[k] = v == null ? null : Number(v);
    let s = v == null ? 'missing' : pick.confidence?.[k] || 'estimated';
    if (s === 'quoted' && !quoteOk) s = 'estimated';
    if (s === 'missing' && v != null) s = 'estimated';
    confidence[k] = s;
  }
  return {
    title: c.title, store: c.store, product_url: c.link, via_google: c.via_google, image_url: c.thumbnail,
    unit_price_usd: c.price, qty, delivery: c.delivery, rating: c.rating, reviews: c.reviews,
    indoor_rated: pick.indoor_rated || 'not stated',
    specs: { ...specs, confidence, raw_spec_quote: quoteOk ? quote : null },
  };
}

// Match one line against its candidates using the Flash model.
async function matchLine(line: any, cands: any[]) {
  if (!cands.length) return { line_id: line.line_id, status: 'not_found', reason: 'No listings found.' };
  const input = {
    line_id: line.line_id, category: line.category, qty: line.qty || 1, specs: line.specs || {},
    max_unit_price_usd: line.max_unit_price_usd ?? null, reason: line.reason || '',
    candidates: cands.map((c, i) => ({ candidate_index: i, title: c.title, store: c.store, price: c.price, link: c.link, delivery: c.delivery, rating: c.rating, reviews: c.reviews })),
  };
  const body = {
    contents: [{ role: 'user', parts: [{ text: `${PROMPT}\n\nLine:\n${JSON.stringify(input)}` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: LINE_SCHEMA, thinkingConfig: { thinkingLevel: 'low' } },
  };
  const r = await generateContent(MATCH_MODEL, body, 30000);
  if (!r.ok) return { line_id: line.line_id, status: 'not_found', reason: 'Could not check the listings, try again.' };
  try {
    const parsed = JSON.parse((r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join(''));
    return { line_id: line.line_id, ...parsed };
  } catch {
    return { line_id: line.line_id, status: 'not_found', reason: 'Could not parse the listing check.' };
  }
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, progress_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const by_admin = !!(await getAdmin(base44));
    if (!by_admin) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const recent = await db.entities.CreaoRun.count({ by_admin: { $ne: true }, created_date: { $gte: since } });
      if (recent >= 3) return Response.json({ error: 'Product search is busy, try again in a few minutes' }, { status: 429 });
    }

    const ev = await db.entities.Event.get(event_id);
    const lines = (await loadKitLines(db, ev)).filter((l) => l.enabled !== false);
    if (!lines.length) return Response.json({ error: 'Add a kit first' }, { status: 400 });

    const total = lines.length;
    const run = await db.entities.CreaoRun.create({ event_id, role: 'find_products', by_admin, status: 'running', job_group: progress_id || null, result_text: `0/${total}`, started_at: new Date().toISOString() });
    let done = 0, progress = Promise.resolve();

    // Run all SerpApi searches in parallel
    const searched = await Promise.all(lines.map(async (line) => {
      const q = line.search_query || (line.category || '').replace(/_/g, ' ');
      let cands: any[] = [], error: string | null = null;
      try { cands = await cachedSearch(db, q); } catch (e: any) { error = e.message; }
      const n = ++done;
      progress = progress.then(() => db.entities.CreaoRun.update(run.id, { result_text: `${n}/${total}` })).catch(() => {});
      await progress;
      return { line, q, cands, error };
    }));

    // Match all lines in parallel with the Flash model
    const picks = await Promise.all(searched.map(({ line, cands }) => matchLine(line, cands)));

    const products = searched.map(({ line, q, cands, error }) => {
      const qty = line.qty || 1, ans = picks.find((p) => p.line_id === line.line_id);
      const main = ans?.status === 'found' ? toProduct(ans.pick, cands, qty) : null;
      if (!main) {
        const reason = error ? `Search failed: ${error}` : !cands.length ? `No listings found for "${q}".`
          : ans?.status === 'not_found' ? ans.reason : 'The suggested listing did not match a real search result.';
        return { line_id: line.line_id, status: 'not_found', reason, qty };
      }
      const seen = new Set([main.product_url]);
      const alternatives = (ans.alternatives || []).map((a) => toProduct(a, cands, qty))
        .filter((a) => a && !seen.has(a.product_url) && seen.add(a.product_url)).slice(0, 2);
      return { line_id: line.line_id, status: 'found', reason: ans.reason, ...main, alternatives };
    });

    const products_at = new Date().toISOString();
    await db.entities.Event.update(event_id, { products, products_at, products_source: 'live', product_choices: {} });
    await db.entities.CreaoRun.update(run.id, { status: 'completed', completed_at: products_at });
    return Response.json({ products, products_at });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}