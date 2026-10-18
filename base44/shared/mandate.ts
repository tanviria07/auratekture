import { canonicalize, basketHash, storeTotals, fromB64 } from './canonical.ts';

// The mandate checks that run before any Visa call. Returns { reason } when blocked.
export async function checkMandate(m, items) {
  if (m.used) return { reason: 'Mandate was already used' };
  if (Date.parse(m.expires_at) < Date.now()) return { reason: 'Mandate expired' };
  const signed = canonicalize({ event_id: m.event_id, basket_sha256: m.basket_sha256, cap_cents: m.cap_cents, nonce: m.nonce, expires_at: m.expires_at });
  const pub = await crypto.subtle.importKey('raw', fromB64(m.user_public_key), { name: 'Ed25519' }, false, ['verify']);
  if (!(await crypto.subtle.verify({ name: 'Ed25519' }, pub, fromB64(m.signature), new TextEncoder().encode(signed)))) return { reason: 'Mandate signature invalid' };
  const hash = await basketHash(items);
  if (hash !== m.basket_sha256) return { reason: 'Basket changed after signing' };
  const totals = storeTotals(items);
  const total = Object.values(totals).reduce((a, b) => a + b, 0);
  if (total > m.cap_cents) return { reason: 'Total exceeds spending cap' };
  return { hash, totals };
}