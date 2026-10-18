import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { getAdmin } from '../../shared/auth.ts';
import { loadKitLines } from '../../shared/kit.ts';
import { cachedSearch } from '../../shared/serpapi.ts';
import { QUERY } from '../../shared/needRules.ts';
import { prepareRef } from '../../shared/image.ts';
import { fitBudget } from '../../shared/budget.ts';

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
Pick the best candidate that fits the specs. The max_unit_price_usd is a guide, not a hard cap — you may pick a product up to 1.5x that price if it fits the specs better. Also pick up to 2 cheaper alternatives.
You may ONLY choose among the given candidates: copy candidate_index, link and price exactly. Never invent a product, link or price.
Prefer major retailers (Amazon, Walmart, Target, Home Depot, Lowe's, Wayfair, Michaels, Kohl's, Macy's, Best Buy). Use eBay or Etsy only if nothing else fits.
For trees, prefer listings that state the height in the title, and match the height from the specs (height_in_max).
Fill specs (width_in, depth_in, height_in, watts, length_ft) from the listing text. confidence per spec: "quoted" if the listing states the value, "estimated" if inferred, "missing" if absent (value null).
Copy the exact listing text you used into raw_spec_quote. Set indoor_rated from the listing text: "yes" if indoor/interior rated, "no" if outdoor only, "not stated" if it does not say.
If no candidate fits even at 1.5x the guide price, set status "not_found" and explain in reason; otherwise give a one-sentence reason.`;

// Category-specific exclusion words: the picked product must BE the item, not a part or accessory.
const EXCLUDE_ALWAYS: Record<string, string[]> = {
  christmas_tree: ['tips', 'tip', 'picks', 'pick', 'branches', 'branch', 'topper', 'skirt', 'ornament', 'ornaments', 'storage', 'bag', 'bags', 'replacement'],
  string_lights: ['clips', 'clip', 'hooks', 'hook', 'extension cord', 'extension cords'],
  stockings: ['holder', 'holders', 'hanger', 'hangers', 'hook', 'hooks', 'stand', 'stands'],
};
// Weak exclusions: only exclude if the title doesn't clearly describe the item itself.
const EXCLUDE_WEAK: Record<string, string[]> = {
  christmas_tree: ['stand', 'collar'],
  string_lights: ['timer', 'timers'],
};
const STRING_LIGHT_RE = /string\s*light|fairy\s*light|mini\s*light|led\s*light|icicle\s*light|rope\s*light|christmas\s*light/;

function hasHeightInFt(title: string): boolean {
  return /\d+(\.\d+)?\s*(ft|ft\.|feet|foot)\b/i.test(title) || /\d+'\b/i.test(title);
}
function isWholeTree(title: string): boolean {
  const t = title.toLowerCase();
  return (t.includes('artificial tree') || t.includes('pencil tree') || t.includes('flocked tree') || t.includes('pre-lit tree'))
    && !t.includes('skirt') && !t.includes('topper');
}
function validateCandidate(category: string, title: string): boolean {
  const t = title.toLowerCase();
  const always = EXCLUDE_ALWAYS[category];
  if (always && always.some((w) => t.includes(w))) return false;
  const weak = EXCLUDE_WEAK[category];
  if (weak && weak.some((w) => t.includes(w))) {
    if (category === 'christmas_tree' && t.includes('tree') && hasHeightInFt(title)) return true;
    if (category === 'string_lights' && STRING_LIGHT_RE.test(t)) return true;
    return false;
  }
  if (category === 'christmas_tree' && !hasHeightInFt(title)) return false;
  if ((category === 'tree_skirt' || category === 'tree_topper') && isWholeTree(title)) return false;
  return true;
}

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
    generationConfig: { responseMimeType: 'application/json', responseSchema: LINE_SCHEMA, thinkingConfig: { thinkingLevel: 'minimal' } },
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

// Match one line, then validate the pick in code. If excluded, re-match with only valid candidates.
async function matchAndBuild(line: any, cands: any[], error: string | null) {
  if (error || !cands.length) return buildProduct(line, cands, null, error);
  let ans = await matchLine(line, cands);
  let effectiveCands = cands;
  if (ans.status === 'found' && ans.pick != null) {
    const pickedCand = cands[ans.pick.candidate_index];
    if (pickedCand && !validateCandidate(line.category, pickedCand.title)) {
      const validCands = cands.filter((c) => validateCandidate(line.category, c.title));
      if (validCands.length) {
        effectiveCands = validCands;
        ans = await matchLine(line, validCands);
      } else {
        ans = { line_id: line.line_id, status: 'not_found', reason: 'Only parts and accessories found, not the item itself.' };
      }
    }
  }
  return buildProduct(line, effectiveCands, ans, null);
}

// Build a product result from a match answer.
function buildProduct(line: any, cands: any[], ans: any, error: string | null) {
  const qty = line.qty || 1;
  const main = ans?.status === 'found' ? toProduct(ans.pick, cands, qty) : null;
  if (!main) {
    const reason = error ? `Search failed: ${error}` : !cands.length ? 'No listings found.'
      : ans?.status === 'not_found' ? ans.reason : 'The suggested listing did not match a real search result.';
    return { line_id: line.line_id, status: 'not_found', reason, qty };
  }
  const seen = new Set([main.product_url]);
  const alternatives = (ans.alternatives || []).map((a) => toProduct(a, cands, qty))
    .filter((a) => a && validateCandidate(line.category, a.title))
    .filter((a) => !seen.has(a.product_url) && seen.add(a.product_url)).slice(0, 2);
  return { line_id: line.line_id, status: 'found', reason: ans.reason, ...main, alternatives };
}

// Simpler query for the single retry round: category default + key spec.
function retryQuery(line: any) {
  const q = QUERY[line.category] || line.category.replace(/_/g, ' ');
  const specs = line.specs || {};
  if (specs.height_in_max) {
    const ft = Math.round((specs.height_in_max / 12) * 10) / 10;
    return `${ft} ft ${q}`;
  }
  return q;
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, progress_id, kit_lines, dry } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const by_admin = !!(await getAdmin(base44));

    const ev = await db.entities.Event.get(event_id);
    if (!by_admin) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      if (ev.visitor_id) {
        const visitorRuns = await db.entities.DesignRun.count({ visitor_id: ev.visitor_id, created_date: { $gte: since } });
        if (visitorRuns >= 3) return Response.json({ error: "You've used all 3 runs this hour. Try again later or log in for unlimited runs." }, { status: 429 });
      }
      const globalRuns = await db.entities.DesignRun.count({ by_admin: { $ne: true }, created_date: { $gte: since } });
      if (globalRuns >= 15) return Response.json({ error: 'Our service is busy right now. Try again in a few minutes.' }, { status: 429 });
    }
    const lines = (await loadKitLines(db, kit_lines ? { ...ev, kit_lines } : ev)).filter((l) => l.enabled !== false);
    // Download + shrink each found product's photo while matching continues, so the image step doesn't wait.
    const withRef = async (p: any) => {
      if (p.status !== 'found' || !p.image_url) return p;
      const r = await prepareRef(p.image_url);
      if (!r) return p;
      try {
        const { file_url } = await db.integrations.Core.UploadPublicFile({ file: new File([r.bytes], r.type === 'image/jpeg' ? 'ref.jpg' : 'ref', { type: r.type }) });
        return { ...p, ref_url: file_url };
      } catch { return p; }
    };
    if (!lines.length) return Response.json({ error: 'Add a kit first' }, { status: 400 });

    const total = lines.length;
    const run = await db.entities.CreaoRun.create({ event_id, role: 'find_products', by_admin, status: 'running', job_group: progress_id || null, result_text: `0 of ${total} found`, started_at: new Date().toISOString() });
    const setProgress = (txt: string) => { run.result_text = txt; return db.entities.CreaoRun.update(run.id, { result_text: txt }).catch(() => {}); };

    // Round 1: search all lines in parallel (8s timeout each), then match all in parallel.
    let t = Date.now();
    const round1 = await Promise.all(lines.map(async (line) => {
      const q = line.search_query || (line.category || '').replace(/_/g, ' ');
      let cands: any[] = [], error: string | null = null;
      try { cands = await cachedSearch(db, q, 8000); } catch (e: any) { error = e.message; }
      return { line, q, cands, error };
    }));
    const search_ms = Date.now() - t;
    t = Date.now();
    let products = await Promise.all(round1.map(({ line, cands, error }) => matchAndBuild(line, cands, error).then(withRef)));
    const match_ms = Date.now() - t;

    let foundCount = products.filter((p) => p.status === 'found').length;
    await setProgress(`${foundCount} of ${total} found`);

    // Round 2 (single retry): re-search only still-missing items with a simpler query.
    let retry_ms = 0;
    const notFound = products.filter((p) => p.status === 'not_found').map((p) => p.line_id);
    if (notFound.length) {
      const retryLines = lines.filter((l) => notFound.includes(l.line_id));
      t = Date.now();
      const round2 = await Promise.all(retryLines.map(async (line) => {
        const q = retryQuery(line);
        let cands: any[] = [], error: string | null = null;
        try { cands = await cachedSearch(db, q, 8000); } catch (e: any) { error = e.message; }
        return { line, q, cands, error };
      }));
      const r2products = await Promise.all(round2.map(({ line, cands, error }) => matchAndBuild(line, cands, error).then(withRef)));
      retry_ms = Date.now() - t;
      for (const np of r2products) {
        if (np.status === 'found') {
          const idx = products.findIndex((p) => p.line_id === np.line_id);
          products[idx] = np;
        }
      }
      foundCount = products.filter((p) => p.status === 'found').length;
      await setProgress(`${foundCount} of ${total} found`);
    }

    // Budget fitting: switch to alternatives, then drop optional items (plain code, no AI call).
    // Keep a pre-fit copy so background updates can re-fit without losing dropped items.
    const all_products = products.map((p) => ({ ...p }));
    const { choices } = fitBudget(products, lines, ev.budget_cents);
    foundCount = products.filter((p) => p.status === 'found').length;
    const totalCost = products.filter((p) => p.status === 'found')
      .reduce((s, p) => {
        const idx = choices[p.line_id] || 0;
        const pr = idx === 0 ? p : (p.alternatives || [])[idx - 1] || p;
        return s + pr.unit_price_usd * (p.qty || 1);
      }, 0);
    await setProgress(`${foundCount} of ${total} found, $${totalCost.toFixed(2)}`);

    const products_at = new Date().toISOString();
    if (!dry) await db.entities.Event.update(event_id, { products, products_at, products_source: 'live', product_choices: choices });
    await db.entities.CreaoRun.update(run.id, { status: 'completed', completed_at: products_at });
    return Response.json({ products, all_products, products_at, product_choices: choices, timings: { search_ms, match_ms, retry_ms } });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}