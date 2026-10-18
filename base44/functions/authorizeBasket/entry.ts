import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { canonicalize, basketHash, storeTotals, fromB64 } from '../../shared/canonical.ts';
import { getAgentKeys, signedAgentFetch } from '../../shared/agentSig.ts';
import { hasVisa, authorizeVisa } from '../../shared/visa.ts';

const block = (reason) => Response.json({ error: 'MANDATE_TAMPER_BLOCKED', reason }, { status: 403 });

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { mandate_id } = await req.json();
    if (!mandate_id) return Response.json({ error: 'mandate_id required' }, { status: 400 });

    const m = await base44.entities.Mandate.get(mandate_id);
    const { items: [basket] } = await base44.entities.Basket.filter({ event_id: m.event_id }, { sort: '-created_date', limit: 1 });
    if (!basket) return Response.json({ error: 'No basket for this room' }, { status: 404 });

    if (m.used) return block('Mandate was already used');
    if (Date.parse(m.expires_at) < Date.now()) return block('Mandate expired');
    const signed = canonicalize({ event_id: m.event_id, basket_sha256: m.basket_sha256, cap_cents: m.cap_cents, nonce: m.nonce, expires_at: m.expires_at });
    const pub = await crypto.subtle.importKey('raw', fromB64(m.user_public_key), { name: 'Ed25519' }, false, ['verify']);
    if (!(await crypto.subtle.verify({ name: 'Ed25519' }, pub, fromB64(m.signature), new TextEncoder().encode(signed)))) return block('Mandate signature invalid');
    const hash = await basketHash(basket.items);
    if (hash !== m.basket_sha256) return block('Basket changed after signing');
    const totals = storeTotals(basket.items);
    const total = Object.values(totals).reduce((a, b) => a + b, 0);
    if (total > m.cap_cents) return block('Total exceeds spending cap');

    await base44.entities.Mandate.update(m.id, { used: true });
    const keys = await getAgentKeys();
    const origin = req.headers.get('X-Base44-App-Url') || new URL(req.url).origin;
    const sandbox = hasVisa();
    const authorizations = [];
    for (const [store, amount_cents] of Object.entries(totals)) {
      const v = await signedAgentFetch(origin, keys, { mandate_id: m.id, store, amount_cents });
      let r;
      if (v.status !== 200) r = { mode: sandbox ? 'sandbox' : 'simulated', status: 'MERCHANT_REJECTED', transaction_id: '', summary: JSON.stringify(v.body).slice(0, 300) };
      else if (sandbox) r = await authorizeVisa(amount_cents, `${m.id}-${store}`);
      else r = { mode: 'simulated', status: 'SIMULATED', transaction_id: 'sim_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), summary: 'Simulated: Visa secrets not set' };
      const rec = await base44.entities.Authorization.create({ mandate_id: m.id, store, amount_cents, mode: r.mode, status: r.status, transaction_id: r.transaction_id || '', response_summary: r.summary });
      authorizations.push(rec);
    }
    const allOk = authorizations.every((a) => a.status === 'AUTHORIZED' || a.status === 'SIMULATED');
    await base44.entities.Basket.update(basket.id, { status: allOk ? 'authorized' : 'failed' });
    return Response.json({ authorizations, fingerprint: hash.slice(0, 12), keyid: keys.keyid, time: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}