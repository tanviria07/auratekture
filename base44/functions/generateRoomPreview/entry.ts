import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import jpeg from 'npm:jpeg-js@0.4.4';
import { generateContent } from '../../shared/gemini.ts';
import { getAdmin } from '../../shared/auth.ts';
import { buildKit, loadKitLines } from '../../shared/kit.ts';

const IMAGE_MODEL = 'gemini-nano-banana-2.1';
const DETECT_MODELS = ['gemini-3.5-flash', 'gemini-4-argon'];
const RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];

const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const ratioOf = (r: string) => { const [a, b] = r.split(':').map(Number); return a / b; };
const nearestRatio = (w: number, h: number) => RATIOS.reduce((best, r) => (Math.abs(ratioOf(r) - w / h) < Math.abs(ratioOf(best) - w / h) ? r : best), '4:3');

// Pure-JS JPEG downscale (box sampling) to max 2048px.
function resizeJpeg(bytes: Uint8Array) {
  const src = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
  const s = Math.min(1, 2048 / Math.max(src.width, src.height));
  if (s === 1) return { bytes, w: src.width, h: src.height };
  const w = Math.round(src.width * s), h = Math.round(src.height * s), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x / s), x1 = Math.max(x0 + 1, Math.floor((x + 1) / s)), y0 = Math.floor(y / s), y1 = Math.max(y0 + 1, Math.floor((y + 1) / s));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * src.width + xx) * 4; r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++; }
    const o = (y * w + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { bytes: jpeg.encode({ data: out, width: w, height: h }, 90).data, w, h };
}
const pngSize = (b: Uint8Array) => { const v = new DataView(b.buffer, b.byteOffset); return { w: v.getUint32(16), h: v.getUint32(20) }; };

async function fetchImage(url: string, maxBytes: number) {
  if (!/^https?:\/\//i.test(url || '')) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length <= maxBytes ? { bytes, type } : null;
  } catch { return null; }
}

// Resize the room photo to max 2048px; fall back to the original bytes if it can't be decoded.
async function prepareBase(img: any) {
  try {
    if (img.bytes[0] === 0xff && img.bytes[1] === 0xd8) {
      const r = resizeJpeg(img.bytes);
      return { data: toB64(r.bytes), type: 'image/jpeg', ratio: nearestRatio(r.w, r.h) };
    }
    if (img.bytes[0] === 0x89 && img.bytes[1] === 0x50) {
      const { w, h } = pngSize(img.bytes);
      return { data: toB64(img.bytes), type: 'image/png', ratio: nearestRatio(w, h) };
    }
  } catch { /* fall through */ }
  return { data: toB64(img.bytes), type: img.type, ratio: '4:3' };
}

const SIZE_KEY = /(ft|in|size|height|width|length|diameter)/i;
function describe(l: any) {
  const name = l.product?.title || (l.category || 'item').replace(/_/g, ' ');
  const size = Object.entries(l.specs || {}).find(([k]) => SIZE_KEY.test(k));
  const zone = l.zone ? ` in ${l.zone}` : '';
  const where = l.placement || l.placement_notes || l.notes;
  return `${l.qty || 1} × ${name}${size ? ` (${size[0].replace(/_/g, ' ')}: ${size[1]})` : ''}${zone}${where ? `, ${where}` : ''}`;
}

async function detect(data: string, mime: string, kit: any[]) {
  const list = kit.map((l) => `${l.line_id}: ${l.product?.title || l.category}`).join('\n');
  const body = {
    contents: [{ role: 'user', parts: [{ inline_data: { mime_type: mime, data } }, { text: `Find each of these items in the image. Only include items that are clearly visible.\n${list}\nReturn box_2d as [ymin, xmin, ymax, xmax] normalized 0 to 1000.` }] }],
    generationConfig: { responseMimeType: 'application/json', responseSchema: { type: 'OBJECT', properties: { items: { type: 'ARRAY', items: { type: 'OBJECT', properties: {
      line_id: { type: 'STRING' }, box_2d: { type: 'ARRAY', items: { type: 'NUMBER' } }, confidence: { type: 'NUMBER' },
    }, required: ['line_id', 'box_2d', 'confidence'] } } }, required: ['items'] } },
  };
  for (const model of DETECT_MODELS) {
    const r = await generateContent(model, body);
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

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const by_admin = !!(await getAdmin(base44));
    if (!by_admin) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const recent = await db.entities.CreaoRun.count({ by_admin: { $ne: true }, created_date: { $gte: since } });
      if (recent >= 3) return Response.json({ error: 'Previews are busy, try again in a few minutes' }, { status: 429 });
    }

    const ev = await db.entities.Event.get(event_id);
    if (!ev.photo_url) return Response.json({ error: 'This room has no photo' }, { status: 400 });
    const kit = buildKit(await loadKitLines(db, ev), ev.products, ev.product_choices).filter((l) => l.product);
    if (!kit.length) return Response.json({ error: 'Find real products first' }, { status: 400 });

    const photoUrl = ev.photo_url.startsWith('http') ? ev.photo_url
      : (await db.integrations.Core.CreateFileSignedUrl({ file_uri: ev.photo_url, expires_in: 300 })).signed_url;
    const photo = await fetchImage(photoUrl, 15_000_000);
    if (!photo) return Response.json({ error: 'Could not load the room photo' }, { status: 400 });

    // Count toward the shared hourly limit before calling the model.
    await db.entities.CreaoRun.create({ event_id, role: 'preview', by_admin, status: 'running', started_at: new Date().toISOString() });

    const refsLines = kit.filter((l) => l.product?.image_url).slice(0, 12);
    const [base, ...refs] = await Promise.all([prepareBase(photo), ...refsLines.map((l) => fetchImage(l.product.image_url, 1_000_000))]);
    const refParts = refs.flatMap((r, i) => (r ? [{ text: `Reference image for: ${describe(refsLines[i])}` }, { inline_data: { mime_type: r.type, data: toB64(r.bytes) } }] : []));

    const prompt = `Photorealistic, magazine-quality interior styling of this exact room for ${ev.room_purpose || 'an event'}, theme: ${ev.theme || 'cozy holiday decor'}. Keep the architecture, walls, floor, windows, door, fireplace and camera angle exactly the same. Add every listed item clearly and prominently, in its zone: ${kit.map(describe).join('; ')}. Make it look finished and inviting: lights glowing warmly, a cozy evening mood, items styled together like a professional photo shoot. Match each product to its reference image. Keep the tree and floor decor at least 3 ft from the fireplace opening, and keep the door clear. No people, no text, no logos, no real candles.`;
    const r = await generateContent(IMAGE_MODEL, {
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: base.type, data: base.data } }, ...refParts, { text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: base.ratio, imageSize: '2K' } },
    }, 90000);
    if (!r.ok) return Response.json({ error: `Preview failed (${r.status ?? 'timeout'})`, detail: r.errorText }, { status: 502 });
    const out = (r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.inlineData || p.inline_data).find(Boolean);
    if (!out?.data) return Response.json({ error: 'The model returned no image' }, { status: 502 });

    const mime = out.mimeType || out.mime_type || 'image/png';
    const bytes = Uint8Array.from(atob(out.data), (c) => c.charCodeAt(0));
    const [{ file_uri }, hotspots] = await Promise.all([
      db.integrations.Core.UploadPrivateFile({ file: new File([bytes], `preview-${event_id}.png`, { type: mime }) }),
      detect(out.data, mime, kit),
    ]);

    const preview = { preview_url: file_uri, prompt, model: IMAGE_MODEL, created_at: new Date().toISOString(), hotspots, choices: ev.product_choices || {} };
    const previews = [preview, ...(ev.previews || [])].slice(0, 3);
    await db.entities.Event.update(event_id, { previews });
    return Response.json({ previews, ms: r.ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}