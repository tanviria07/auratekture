import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { buildKit, loadKitLines } from '../../shared/kit.ts';
import { fetchImage, resizeToJpeg, toB64 } from '../../shared/image.ts';

const DETECT_MODELS = ['gemini-3.5-flash', 'gemini-4-argon'];

async function detect(data: string, mime: string, kit: any[]) {
  const list = kit.map((l) => `${l.line_id}: ${l.product?.title || l.category}`).join('\n');
  const body = {
    contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data } }, { text: `Find each of these items in the image. Only include items that are clearly visible.\n${list}\nReturn box_2d as [ymin, xmin, ymax, xmax] normalized 0 to 1000.` }] }],
    generationConfig: { responseMimeType: 'application/json', thinkingConfig: { thinkingLevel: 'minimal' }, responseSchema: { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      line_id: { type: 'STRING' }, box_2d: { type: 'ARRAY', items: { type: 'NUMBER' } }, confidence: { type: 'NUMBER' },
    }, required: ['line_id', 'box_2d', 'confidence'] } } }, required: ['items'] } },
  };
  for (const model of DETECT_MODELS) {
    const r = await generateContent(model, body, 30000);
    if (!r.ok) continue;
    try {
      const text = (r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.text || '').join('');
      const ids = new Set(kit.map((l) => l.line_id));
      return JSON.parse(text).items.filter((i: any) => ids.has(i.line_id) && i.box_2d?.length === 4 && i.confidence >= 0.4)
        .map((i: any) => ({ line_id: i.line_id, confidence: i.confidence, box_2d: i.box_2d, x: (i.box_2d[1] + i.box_2d[3]) / 2000, y: (i.box_2d[0] + i.box_2d[2]) / 2000 }));
    } catch { /* try next model */ }
  }
  return [];
}

// Finds the numbered-dot positions on the latest room image. `only` re-detects just those items.
export default async function(req: Request) {
  try {
    const db = createClientFromRequest(req).asServiceRole;
    const { event_id, only } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });
    const ev = await db.entities.Event.get(event_id);
    const latest = ev.previews?.[0];
    if (!latest) return Response.json({ error: 'No room image yet' }, { status: 400 });
    const kit = buildKit(await loadKitLines(db, ev), ev.products, latest.choices).filter((l) => l.product);
    const target = Array.isArray(only) && only.length ? kit.filter((l) => only.includes(l.line_id)) : kit;

    const url = (await db.integrations.Core.CreateFileSignedUrl({ file_uri: latest.preview_url, expires_in: 300 })).signed_url;
    const img = await fetchImage(url, 30_000_000, 20000);
    if (!img) return Response.json({ error: 'Could not load the room image' }, { status: 400 });
    const small = resizeToJpeg(img.bytes, 1024, 85);
    const t = Date.now();
    const found = await detect(small ? toB64(small.bytes) : toB64(img.bytes), small ? small.type : img.type, target);
    const ms = Date.now() - t;

    const cur = await db.entities.Event.get(event_id);
    const previews = [...(cur.previews || [])];
    const idx = previews.findIndex((p: any) => p.preview_url === latest.preview_url);
    if (idx < 0) return Response.json({ previews, ms });
    const keep = (previews[idx].hotspots || []).filter((h: any) => !target.some((l) => l.line_id === h.line_id));
    previews[idx] = { ...previews[idx], hotspots: [...keep, ...found] };
    await db.entities.Event.update(event_id, { previews });
    return Response.json({ previews, ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}