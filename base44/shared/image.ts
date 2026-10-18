import jpeg from 'npm:jpeg-js@0.4.4';
import { decode as decodePng } from 'npm:fast-png@6.2.0';

export const toB64 = (bytes: Uint8Array) => {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
export const fromB64 = (s: string) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

const RATIOS = ['1:1', '2:3', '3:2', '3:4', '4:3', '4:5', '5:4', '9:16', '16:9', '21:9'];
const ratioOf = (r: string) => { const [a, b] = r.split(':').map(Number); return a / b; };
export const nearestRatio = (w: number, h: number) => RATIOS.reduce((best, r) => (Math.abs(ratioOf(r) - w / h) < Math.abs(ratioOf(best) - w / h) ? r : best), '4:3');

export async function fetchImage(url: string, maxBytes: number, timeoutMs = 10000) {
  if (!/^https?:\/\//i.test(url || '')) return null;
  try {
    const res = await fetch(url, { signal: AbortSignal.timeout(timeoutMs) });
    const type = (res.headers.get('content-type') || '').split(';')[0];
    if (!res.ok || !type.startsWith('image/')) return null;
    const bytes = new Uint8Array(await res.arrayBuffer());
    return bytes.length <= maxBytes ? { bytes, type } : null;
  } catch { return null; }
}

// Decodes JPEG or 8/16-bit PNG to RGBA; null for anything else.
function decodeRgba(bytes: Uint8Array) {
  if (bytes[0] === 0xff && bytes[1] === 0xd8) {
    const d = jpeg.decode(bytes, { useTArray: true, maxMemoryUsageInMB: 1024 });
    return { data: d.data, width: d.width, height: d.height };
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50) {
    const p: any = decodePng(bytes);
    if (p.depth < 8) return null;
    const n = p.width * p.height, ch = p.channels, src = p.data, sh = p.depth === 16 ? 8 : 0, out = new Uint8Array(n * 4);
    for (let i = 0; i < n; i++) {
      let r, g, b;
      if (p.palette) [r, g, b] = p.palette[src[i]];
      else if (ch < 3) r = g = b = src[i * ch] >> sh;
      else { r = src[i * ch] >> sh; g = src[i * ch + 1] >> sh; b = src[i * ch + 2] >> sh; }
      out[i * 4] = r; out[i * 4 + 1] = g; out[i * 4 + 2] = b; out[i * 4 + 3] = 255;
    }
    return { data: out, width: p.width, height: p.height };
  }
  return null;
}

// Downscales to max `max` px and re-encodes as JPEG; null if the image can't be decoded.
export function resizeToJpeg(bytes: Uint8Array, max: number, quality = 85) {
  let src;
  try { src = decodeRgba(bytes); } catch { return null; }
  if (!src) return null;
  const s = Math.min(1, max / Math.max(src.width, src.height));
  const w = Math.max(1, Math.round(src.width * s)), h = Math.max(1, Math.round(src.height * s)), out = new Uint8Array(w * h * 4);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const x0 = Math.floor(x / s), x1 = Math.min(src.width, Math.max(x0 + 1, Math.floor((x + 1) / s))), y0 = Math.floor(y / s), y1 = Math.min(src.height, Math.max(y0 + 1, Math.floor((y + 1) / s)));
    let r = 0, g = 0, b = 0, n = 0;
    for (let yy = y0; yy < y1; yy++) for (let xx = x0; xx < x1; xx++) { const i = (yy * src.width + xx) * 4; r += src.data[i]; g += src.data[i + 1]; b += src.data[i + 2]; n++; }
    const o = (y * w + x) * 4; out[o] = r / n; out[o + 1] = g / n; out[o + 2] = b / n; out[o + 3] = 255;
  }
  return { bytes: jpeg.encode({ data: out, width: w, height: h }, quality).data as Uint8Array, w, h, type: 'image/jpeg' };
}

// Product reference photo: 4s download limit, max 512px JPEG (small undecodable images pass through).
export async function prepareRef(url: string) {
  const img = await fetchImage(url, 3_000_000, 4000);
  if (!img) return null;
  const r = resizeToJpeg(img.bytes, 512, 80);
  if (r) return { bytes: r.bytes, type: r.type };
  return img.bytes.length <= 300_000 ? img : null;
}