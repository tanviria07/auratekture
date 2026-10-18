export function canonicalize(v) {
  if (Array.isArray(v)) return '[' + v.map(canonicalize).join(',') + ']';
  if (v && typeof v === 'object') return '{' + Object.keys(v).sort().map((k) => JSON.stringify(k) + ':' + canonicalize(v[k])).join(',') + '}';
  return JSON.stringify(v);
}

export function canonicalItems(items) {
  return [...(items || [])]
    .sort((a, b) => (String(a.line_id) < String(b.line_id) ? -1 : 1))
    .map((i) => ({
      line_id: String(i.line_id), store: i.store, title: i.title, product_url: i.product_url || '',
      unit_price_cents: Number(i.unit_price_cents), qty: Number(i.qty),
    }));
}

export async function sha256(data) {
  const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data;
  return new Uint8Array(await crypto.subtle.digest('SHA-256', bytes));
}

export const toHex = (b) => [...b].map((x) => x.toString(16).padStart(2, '0')).join('');
export const toB64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
export const fromB64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));

export async function basketHash(items) {
  return toHex(await sha256(canonicalize(canonicalItems(items))));
}

export function storeTotals(items) {
  const totals = {};
  for (const i of items || []) totals[i.store] = (totals[i.store] || 0) + Number(i.unit_price_cents) * Number(i.qty);
  return totals;
}