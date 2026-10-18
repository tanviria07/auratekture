import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { needRules } from '../../shared/needRules.ts';

const MODELS = ['gemini-4-argon', 'gemini-3.5-flash'];
const SCHEMA = { type: 'OBJECT', properties: { lines: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
  line_id: { type: 'STRING' }, search_query: { type: 'STRING' }, reason: { type: 'STRING' },
}, required: ['line_id', 'search_query', 'reason'] } } }, required: ['lines'] };

// Lets Gemini tailor search queries and reasons to the room's style; the rules stay the source of what's needed.
async function tailor(ev: any, lines: any[]) {
  const a = ev.photo_analysis || {};
  const prompt = `You help style a room for: "${ev.room_purpose || 'an event'}". Room palette: ${(ev.color_palette || []).join(', ') || 'unknown'}. Style notes: ${a.style_notes || 'none'}.
For each kit line write a Google Shopping search_query (max 8 words) that matches the room's style and respects the specs (e.g. include a height for height_in_max, "indoor" for indoor lights, never candles or open flames), and a one-sentence reason why the room needs it. Keep line_id exactly.
Lines: ${JSON.stringify(lines.map(({ line_id, category, qty, specs, reason }) => ({ line_id, category, qty, specs, reason })))}`;
  for (const model of MODELS) {
    const r = await generateContent(model, { contents: [{ role: 'user', parts: [{ text: prompt }] }], generationConfig: { responseMimeType: 'application/json', responseSchema: SCHEMA, thinkingConfig: { thinkingLevel: 'low' } } });
    if (!r.ok) continue;
    try { return JSON.parse((r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('')).lines || []; } catch { /* next */ }
  }
  return [];
}

export default async function(req: Request) {
  try {
    const db = createClientFromRequest(req).asServiceRole;
    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    const ev = await db.entities.Event.get(event_id);
    const base = needRules(ev);
    const ai = await tailor(ev, base);
    const kit_lines = base.map((l) => {
      const t = ai.find((x: any) => x.line_id === l.line_id);
      return t ? { ...l, search_query: t.search_query || l.search_query, reason: t.reason || l.reason } : l;
    });
    await db.entities.Event.update(event_id, { kit_lines, products: [], product_choices: {} });
    return Response.json({ kit_lines });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}