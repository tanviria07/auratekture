import { base44 } from '@/api/base44Client';

// Must match base44/shared/canonical.ts exactly.
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

const toB64 = (b) => btoa(String.fromCharCode(...new Uint8Array(b)));
const toHex = (b) => [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join('');
const enc = (s) => new TextEncoder().encode(s);

export const basketHash = async (items) => toHex(await crypto.subtle.digest('SHA-256', enc(canonicalize(canonicalItems(items)))));

// Fresh Ed25519 key per mandate; the private key stays in this browser tab only.
async function signBytes(bytes) {
  try {
    const kp = await crypto.subtle.generateKey({ name: 'Ed25519' }, false, ['sign', 'verify']);
    return { pub: toB64(await crypto.subtle.exportKey('raw', kp.publicKey)), sig: toB64(await crypto.subtle.sign({ name: 'Ed25519' }, kp.privateKey, bytes)) };
  } catch {
    const ed = await import('@noble/ed25519');
    const priv = ed.utils.randomPrivateKey();
    return { pub: toB64(await ed.getPublicKeyAsync(priv)), sig: toB64(await ed.signAsync(bytes, priv)) };
  }
}

export async function createMandate(event_id, items, cap_cents) {
  const nonce = toHex(crypto.getRandomValues(new Uint8Array(16)));
  const expires_at = new Date(Date.now() + 15 * 60 * 1000).toISOString();
  const basket_sha256 = await basketHash(items);
  const { pub, sig } = await signBytes(enc(canonicalize({ event_id, basket_sha256, cap_cents, nonce, expires_at })));
  return base44.entities.Mandate.create({ event_id, cap_cents, basket_sha256, nonce, expires_at, user_public_key: pub, signature: sig, used: false });
}

export const call = (name, payload) => base44.functions.invoke(name, payload)
  .then((r) => ({ status: r.status, data: r.data }))
  .catch((e) => ({ status: e.response?.status, data: e.response?.data || { error: e.message } }));

// The only two results that count as a real block.
export const BLOCKS = {
  '403 MANDATE_TAMPER_BLOCKED': 'Blocked: the price changed after you signed.',
  '401 AGENT_SIGNATURE_INVALID': 'Blocked: the checkout request was altered after the agent signed it.',
};
export const blockOf = (r) => BLOCKS[`${r?.status} ${r?.data?.error}`] || null;

export const money = (c) => `$${(c / 100).toFixed(2)}`;

// Plain-words reason for a store that didn't authorize. Returns null for successes.
export const plainReason = (a) => {
  const s = a?.status;
  if (!s || s === 'AUTHORIZED' || s === 'SIMULATED') return null;
  if (s === 'DECLINED') return 'The card was declined.';
  if (s === 'MERCHANT_REJECTED') return 'The store rejected the signed checkout request.';
  if (s === 'UNKNOWN') return 'The payment service did not respond in time.';
  if (s === 'ERROR') return 'We could not reach the payment service.';
  if (typeof s === 'string' && s.startsWith('HTTP_')) return 'The payment service returned an error.';
  return 'This store could not be authorized.';
};

export const isAuthorized = (a) => a?.status === 'AUTHORIZED' || a?.status === 'SIMULATED';