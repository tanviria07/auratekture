import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { getAdmin } from '../../shared/auth.ts';
import { buildKit, loadKitLines } from '../../shared/kit.ts';
import { fetchImage, fromB64, nearestRatio, prepareRef, resizeToJpeg, toB64 } from '../../shared/image.ts';

const IMAGE_MODEL = 'gemini-nano-banana-2.1';
const MAX_REFS = 10;

const SIZE_KEY = /(ft|in|size|height|width|length|diameter)/i;
function describe(l: any) {
  const name = l.product?.title || (l.category || 'item').replace(/_/g, ' ');
  const size = Object.entries(l.specs || {}).find(([k]) => SIZE_KEY.test(k));
  const zone = l.zone ? ` in ${l.zone}` : '';
  const where = l.placement || l.placement_notes || l.notes;
  return `${l.qty || 1} × ${name}${size ? ` (${size[0].replace(/_/g, ' ')}: ${size[1]})` : ''}${zone}${where ? `, ${where}` : ''}`;
}
const cost = (l: any) => (l.product?.unit_price_usd || 0) * (l.qty || 1);
const refFor = async (l: any) => {
  if (l.product?.ref_url) { const r = await fetchImage(l.product.ref_url, 1_000_000, 4000); if (r) return r; }
  return l.product?.image_url ? prepareRef(l.product.image_url) : null;
};
const signed = async (db: any, uri: string) => (uri.startsWith('http') ? uri : (await db.integrations.Core.CreateFileSignedUrl({ file_uri: uri, expires_in: 300 })).signed_url);

async function loadBase(db: any, uri: string) {
  const img = await fetchImage(await signed(db, uri), 20_000_000, 20000);
  if (!img) return null;
  const r = resizeToJpeg(img.bytes, 1280, 88);
  return r ? { data: toB64(r.bytes), type: r.type, ratio: nearestRatio(r.w, r.h) } : { data: toB64(img.bytes), type: img.type, ratio: '4:3' };
}

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, retry, edit, background } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const by_admin = !!(await getAdmin(base44));

    const stored = await db.entities.Event.get(event_id);
    // Background mode: render the hidden background result instead of the room's current products.
    const pf = stored.prefetch;
    if (background && pf?.status !== 'ready') return Response.json({ error: 'No background result' }, { status: 400 });
    const ev = background ? { ...stored, kit_lines: pf.kit_lines, products: pf.products, product_choices: pf.product_choices || {}, theme: pf.theme, previews: [] } : stored;
    if (retry && !by_admin && ev.visitor_id) {
      const since = new Date(Date.now() - 3600_000).toISOString();
      const q = { visitor_id: ev.visitor_id, created_date: { $gte: since } };
      if ((await db.entities.ImageRetry.count(q)) >= 5) {
        const { items } = await db.entities.ImageRetry.filter(q, { sort: 'created_date', limit: 1 });
        const mins = items[0] ? Math.max(1, Math.ceil((new Date(items[0].created_date).getTime() + 3600_000 - Date.now()) / 60000)) : 60;
        return Response.json({ error: `You've used all 5 image retries this hour. Try again in ${mins} min.` }, { status: 429 });
      }
      await db.entities.ImageRetry.create({ visitor_id: ev.visitor_id, event_id });
    }
    if (!ev.photo_url) return Response.json({ error: 'This room has no photo' }, { status: 400 });
    const lines = await loadKitLines(db, ev);
    const kit = buildKit(lines, ev.products, ev.product_choices).filter((l) => l.product);
    if (!kit.length) return Response.json({ error: 'Find real products first' }, { status: 400 });

    const latest = ev.previews?.[0];
    const changed = edit && latest ? kit.filter((l) => (latest.choices?.[l.line_id] || 0) !== (ev.product_choices?.[l.line_id] || 0)).map((l) => l.line_id) : [];
    const { items: [setting] } = await db.entities.AppSetting.filter({ key: 'image_quality' }, { limit: 1 });
    const imageSize = setting?.value === 'hd' ? '2K' : '1K';

    // Count toward the shared hourly limit before calling the model.
    if (!background) await db.entities.CreaoRun.create({ event_id, role: 'preview', by_admin, status: 'running', started_at: new Date().toISOString() });

    let base: any, parts: any[], prompt: string, hotspots: any[] = [];
    if (changed.length) {
      // Edit the current image: swap only the changed items in place.
      const prev = new Map(buildKit(lines, ev.products, latest.choices).filter((l) => l.product).map((l) => [l.line_id, l]));
      const swaps = kit.filter((l) => changed.includes(l.line_id));
      const [b, ...refs] = await Promise.all([loadBase(db, latest.preview_url), ...swaps.map(refFor)]);
      if (!b) return Response.json({ error: 'Could not load the current image' }, { status: 400 });
      base = b;
      const where = (id: string) => { const h = (latest.hotspots || []).find((x: any) => x.line_id === id); return h ? `, about ${Math.round(h.x * 100)}% from the left and ${Math.round(h.y * 100)}% from the top` : ''; };
      prompt = `Edit this styled room photo. Replace only these items, in exactly the same spot and at the same size: ${swaps.map((l, i) => `the ${prev.get(l.line_id)?.product?.title || l.category}${where(l.line_id)}, with the ${l.product.title}${refs[i] ? ` shown in reference image ${i + 1}` : ''}`).join('; ')}. Keep everything else exactly the same: the room, lighting, camera angle, and every other item and its position. No people, no text, no logos.`;
      parts = refs.flatMap((r, i) => (r ? [{ text: `Reference image ${i + 1}: ${swaps[i].product.title}` }, { inline_data: { mime_type: r.type, data: toB64(r.bytes) } }] : []));
      hotspots = (latest.hotspots || []).filter((h: any) => !changed.includes(h.line_id));
    } else {
      const ranked = [...kit].sort((a, b) => (b.weight || 1) - (a.weight || 1) || cost(b) - cost(a));
      const refLines = ranked.filter((l) => l.product.ref_url || l.product.image_url).slice(0, MAX_REFS);
      const rest = kit.filter((l) => !refLines.includes(l));
      const [b, ...refs] = await Promise.all([loadBase(db, ev.photo_url), ...refLines.map(refFor)]);
      if (!b) return Response.json({ error: 'Could not load the room photo' }, { status: 400 });
      base = b;
      parts = refs.flatMap((r, i) => (r ? [{ text: `Reference image for: ${describe(refLines[i])}` }, { inline_data: { mime_type: r.type, data: toB64(r.bytes) } }] : []));
      prompt = `Photorealistic, magazine-quality interior styling of this exact room for ${ev.room_purpose || 'an event'}, theme: ${ev.theme || 'cozy holiday decor'}. Keep the architecture, walls, floor, windows, door, fireplace and camera angle exactly the same. Add every listed item clearly and prominently, in its zone: ${kit.map(describe).join('; ')}. Make it look finished and inviting: lights glowing warmly, a cozy evening mood, items styled together like a professional photo shoot. Match each product with a reference image to that image${rest.length ? `; for the others, follow their name and color: ${rest.map((l) => l.product.title).join('; ')}` : ''}. Keep the tree and floor decor at least 3 ft from the fireplace opening, and keep the door clear. No people, no text, no logos, no real candles.`;
    }

    const r = await generateContent(IMAGE_MODEL, {
      contents: [{ role: 'user', parts: [{ inline_data: { mime_type: base.type, data: base.data } }, ...parts, { text: prompt }] }],
      generationConfig: { responseModalities: ['IMAGE'], imageConfig: { aspectRatio: base.ratio, imageSize } },
    }, 90000);
    if (!r.ok) return Response.json({ error: `Preview failed (${r.status ?? 'timeout'})`, detail: r.errorText }, { status: 502 });
    const out = (r.data?.candidates?.[0]?.content?.parts || []).map((p: any) => p.inlineData || p.inline_data).find(Boolean);
    if (!out?.data) return Response.json({ error: 'The model returned no image' }, { status: 502 });

    const mime = out.mimeType || out.mime_type || 'image/png';
    const { file_uri } = await db.integrations.Core.UploadPrivateFile({ file: new File([fromB64(out.data)], `preview-${event_id}.png`, { type: mime }) });

    const preview = { preview_url: file_uri, prompt, model: `${IMAGE_MODEL} ${imageSize}`, created_at: new Date().toISOString(), hotspots, choices: ev.product_choices || {} };
    if (background) return Response.json({ preview, ms: r.ms });
    const previews = [preview, ...(ev.previews || [])].slice(0, 3);
    await db.entities.Event.update(event_id, { previews });
    return Response.json({ previews, changed, ms: r.ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}