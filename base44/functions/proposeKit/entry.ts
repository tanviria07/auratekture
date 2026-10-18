import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { needRules } from '../../shared/needRules.ts';

const STYLIST_MODEL = 'gemini-3.5-flash';

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    theme: { type: 'STRING' },
    items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      line_id: { type: 'STRING' },
      category: { type: 'STRING' },
      qty: { type: 'INTEGER' },
      specs: { type: 'OBJECT' },
      search_query: { type: 'STRING' },
      max_unit_price_usd: { type: 'NUMBER' },
      zone: { type: 'STRING' },
      placement: { type: 'STRING' },
      reason: { type: 'STRING' },
    }, required: ['category', 'qty', 'search_query', 'zone', 'placement', 'reason'] } },
  },
  required: ['theme', 'items'],
};

const toB64 = (bytes: Uint8Array) => { let bin = ''; for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000)); return btoa(bin); };

async function fetchPhoto(db: any, url: string) {
  try {
    const signed = url.startsWith('http') ? url : (await db.integrations.Core.CreateFileSignedUrl({ file_uri: url, expires_in: 120 })).signed_url;
    const res = await fetch(signed, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;
    const type = (res.headers.get('content-type') || 'image/jpeg').split(';')[0];
    if (!type.startsWith('image/')) return null;
    return { data: toB64(new Uint8Array(await res.arrayBuffer())), type };
  } catch { return null; }
}

// Flash-model stylist: takes the room photo + context and returns a cohesive design concept.
async function stylist(db: any, ev: any, base: any[]) {
  const a = ev.photo_analysis || {};
  const budget = ev.budget_cents ? ev.budget_cents / 100 : null;
  const palette = (ev.color_palette || []).join(', ');
  const existing = (ev.existing_items || []).map((i: any) => i.label || i.category).join(', ');
  const venue = (ev.venue_supplied?.options || []).join(', ');
  const requiredLines = base.map((l) => ({ line_id: l.line_id, category: l.category, qty: l.qty, specs: l.specs, reason: l.reason }));

  const prompt = `You are a professional interior stylist designing a cohesive, beautiful setup for this room.
Purpose: ${ev.room_purpose || 'an event'}
Budget: ${budget ? `$${budget}` : 'no limit'}
Room palette: ${palette || 'unknown'}
Style notes: ${a.style_notes || 'none'}
Existing items in the room: ${existing || 'none'}
Already provided by venue (do not buy these): ${venue || 'none'}

Required items with safety specs you MUST include (keep their line_id and specs):
${JSON.stringify(requiredLines)}

Create a cohesive design concept. Return:
- theme: a one-line theme (e.g. "Warm Nordic Christmas in charcoal, oak and cream")
- items: 10 to 14 items total. Include ALL required items above (keep their line_id and specs), plus additional items to complete the design (e.g. tree topper, stockings, throw pillows, throw blanket, rug, centerpiece, LED candles, wreaths, window lights).
- Arrange items in zones: Tree corner, Fireplace and mantel, Windows, Seating area, Tabletop, etc.
- For each item: category (snake_case), qty, specs (keep required specs, add any), search_query (Google Shopping query, max 8 words, include height for trees, "indoor" for indoor lights, never "candles" or "open flames" — use "LED candles" instead), max_unit_price_usd, zone, placement (where in the room, in words), reason (one sentence).
- Merge duplicates: if two items serve the same purpose, combine them.
- Budget: aim for 75 to 95 percent of the budget, never over. If over, drop the lowest-impact optional items first (never drop the tree or lights).
- Never include open flames, real candles, or non-LED candles.`;

  const parts: any[] = [];
  const photo = ev.photo_url ? await fetchPhoto(db, ev.photo_url) : null;
  if (photo) parts.push({ inline_data: { mime_type: photo.type, data: photo.data } });
  parts.push({ text: prompt });

  const r = await generateContent(STYLIST_MODEL, {
    contents: [{ role: 'user', parts }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, thinkingConfig: { thinkingLevel: 'low' } },
  }, 60000);
  if (!r.ok) return null;
  try {
    const text = (r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
    return JSON.parse(text);
  } catch { return null; }
}

export default async function(req: Request) {
  try {
    const db = createClientFromRequest(req).asServiceRole;
    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    const ev = await db.entities.Event.get(event_id);
    const base = needRules(ev);
    const concept = await stylist(db, ev, base);

    let kit_lines: any[], theme: string | null = null;
    if (concept?.items?.length) {
      theme = concept.theme || null;
      const byId = new Map(base.map((l) => [l.line_id, l]));
      let nextId = base.length;
      kit_lines = concept.items.map((item: any) => {
        const baseLine = byId.get(item.line_id);
        if (baseLine) {
          return { ...baseLine, search_query: item.search_query || baseLine.search_query, reason: item.reason || baseLine.reason, zone: item.zone, placement: item.placement, max_unit_price_usd: item.max_unit_price_usd ?? baseLine.max_unit_price_usd, specs: { ...baseLine.specs, ...(item.specs || {}) } };
        }
        return { line_id: item.line_id || `L${++nextId}`, category: item.category, qty: item.qty || 1, specs: item.specs || {}, search_query: item.search_query, max_unit_price_usd: item.max_unit_price_usd ?? null, zone: item.zone, placement: item.placement, reason: item.reason, weight: 1, enabled: true };
      });
      // Budget enforcement: drop optional items if over 95% of budget
      const budget = ev.budget_cents ? ev.budget_cents / 100 : null;
      if (budget) {
        const total = () => kit_lines.reduce((s, l) => s + (l.max_unit_price_usd || 0) * (l.qty || 1), 0);
        if (total() > budget * 0.95) {
          const requiredCats = new Set(['christmas_tree', 'string_lights']);
          const droppable = [...kit_lines].filter((l) => !requiredCats.has(l.category)).sort((a, b) => (a.weight || 1) - (b.weight || 1));
          for (const l of droppable) {
            if (total() <= budget * 0.95) break;
            kit_lines = kit_lines.filter((x) => x !== l);
          }
        }
      }
    } else {
      kit_lines = base;
    }

    await db.entities.Event.update(event_id, { kit_lines, products: [], product_choices: {}, theme });
    return Response.json({ kit_lines, theme });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}