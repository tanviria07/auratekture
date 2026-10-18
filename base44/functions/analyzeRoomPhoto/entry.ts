import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';

// Keep in sync with ROOM_KEYS in src/lib/categories.js
const ROOM_KEYS = ['table', 'chair', 'sofa', 'coffee_table', 'fireplace', 'heater', 'shelf', 'tv', 'desk', 'whiteboard', 'podium', 'rug', 'lamp', 'plant', 'other'];
const WALL = { type: 'STRING', enum: ['left', 'back', 'right', 'front'] };

const schema = {
  type: 'OBJECT',
  properties: {
    existing_items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      category: { type: 'STRING', enum: ROOM_KEYS }, label: { type: 'STRING' }, count: { type: 'INTEGER' }, confidence: { type: 'NUMBER' },
    }, required: ['category', 'label', 'count', 'confidence'] } },
    heat_sources: { type: 'ARRAY', items: { type: 'OBJECT', properties: { label: { type: 'STRING' }, wall: WALL }, required: ['label', 'wall'] } },
    doors_and_windows: { type: 'ARRAY', items: { type: 'OBJECT', properties: { type: { type: 'STRING' }, wall: WALL }, required: ['type', 'wall'] } },
    color_palette_hex: { type: 'ARRAY', items: { type: 'STRING' }, minItems: 3, maxItems: 5 },
    style_notes: { type: 'STRING' },
  },
  required: ['existing_items', 'heat_sources', 'doors_and_windows', 'color_palette_hex', 'style_notes'],
};

const PROMPT = `You are looking at a photo of a room. Describe only what is clearly visible.
- existing_items: furniture and fixtures actually in the photo, using only the allowed categories (use "other" if none fit). Give a count and a confidence from 0 to 1. Use low confidence (below 0.6) whenever you are unsure.
- heat_sources: fireplaces, heaters or radiators, with the wall they are on (as seen from the camera: left, back, right, front).
- doors_and_windows: each visible door or window with its wall.
- color_palette_hex: 3 to 5 dominant colors from the room as #RRGGBB.
- style_notes: one sentence about the room's style.
Never guess the room's purpose or what event it is for. Never invent items that are not visible.`;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    const ev = await base44.asServiceRole.entities.Event.get(event_id);
    if (!ev.photo_url) return Response.json({ error: 'This room has no photo' }, { status: 400 });

    const url = ev.photo_url.startsWith('http') ? ev.photo_url
      : (await base44.asServiceRole.integrations.Core.CreateFileSignedUrl({ file_uri: ev.photo_url, expires_in: 300 })).signed_url;
    const img = await fetch(url, { signal: AbortSignal.timeout(30000) });
    const bytes = new Uint8Array(await img.arrayBuffer());
    if (bytes.length > 15_000_000) return Response.json({ error: 'Photo is too large' }, { status: 400 });
    let bin = '';
    for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));

    const r = await generateContent('gemini-4-argon', {
      contents: [{ role: 'user', parts: [
        { inline_data: { mime_type: img.headers.get('content-type') || 'image/jpeg', data: btoa(bin) } },
        { text: PROMPT },
      ] }],
      generationConfig: { responseMimeType: 'application/json', responseSchema: schema, thinkingConfig: { thinkingLevel: 'low' } },
    });
    if (!r.ok) return Response.json({ error: `Photo analysis failed (${r.status ?? 'timeout'})`, detail: r.errorText }, { status: 502 });
    const text = (r.data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('');
    const analysis = JSON.parse(text);
    analysis.existing_items = (analysis.existing_items || []).filter((i) => ROOM_KEYS.includes(i.category));
    const color_palette = (analysis.color_palette_hex || []).filter((c) => /^#[0-9a-f]{6}$/i.test(c)).slice(0, 5);
    await base44.asServiceRole.entities.Event.update(event_id, { photo_analysis: analysis, color_palette });
    return Response.json({ photo_analysis: analysis, color_palette, ms: r.ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}