import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkMandate } from '../../shared/mandate.ts';
import { getAgentKeys, signedAgentFetch } from '../../shared/agentSig.ts';
import { hasVisa, authorizeVisa, searchVisaByRef } from '../../shared/visa.ts';

const block = (reason) => Response.json({ error: 'MANDATE_TAMPER_BLOCKED', reason }, { status: 403 });

// A store auth we won't retry: success, a hard decline, or a merchant-signature rejection.
// PENDING / ERROR / HTTP_* are transient (network, timeout) and safe to retry with the same mandate.
const TERMINAL = new Set(['AUTHORIZED', 'SIMULATED', 'DECLINED', 'MERCHANT_REJECTED']);

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { mandate_id } = await req.json();
    if (!mandate_id) return Response.json({ error: 'mandate_id required' }, { status: 400 });

    const m = await base44.asServiceRole.entities.Mandate.get(mandate_id);
    const { items: [basket] } = await base44.asServiceRole.entities.Basket.filter({ event_id: m.event_id }, { sort: '-created_date', limit: 1 });
    if (!basket) return Response.json({ error: 'No basket for this room' }, { status: 404 });

    const checked = await checkMandate(m, basket.items);
    if (checked.reason) return block(checked.reason);
    const { hash, totals } = checked;

    const keys = await getAgentKeys();
    const origin = req.headers.get('X-Base44-App-Url') || new URL(req.url).origin;
    const sandbox = hasVisa();
    const ref = (store) => `${m.id}-${store}`; // stable Visa client reference → idempotent on retry

    const authorizations = await Promise.all(Object.entries(totals).map(async ([store, amount_cents]) => {
      // Idempotency: a terminal auth for this mandate+store is reused as-is.
      const { items: existing } = await base44.asServiceRole.entities.Authorization.filter({ mandate_id: m.id, store }, { sort: '-created_date', limit: 1 });
      const prev = existing[0];
      if (prev && TERMINAL.has(prev.status)) return prev;

      // Reconcile an ambiguous prior attempt (timeout / network error): Visa may already have the charge.
      // Look it up before retrying, and only retry if Visa has no record of it.
      if (prev && (prev.status === 'UNKNOWN' || prev.status === 'ERROR') && sandbox) {
        const found = await searchVisaByRef(ref(store)).catch(() => null);
        if (found?.found) {
          const status = found.status === 'AUTHORIZED' ? 'AUTHORIZED' : (found.status || 'DECLINED');
          return await base44.asServiceRole.entities.Authorization.update(prev.id, {
            status, transaction_id: found.transaction_id || prev.transaction_id,
            response_summary: `Visa search: ${found.status || 'transaction'} ${found.transaction_id || ''}`,
          });
        }
      }

      // Reserve the row before any external call, so a crash/timeout leaves a traceable PENDING record.
      let rec = prev || await base44.asServiceRole.entities.Authorization.create({ mandate_id: m.id, store, amount_cents, mode: sandbox ? 'sandbox' : 'simulated', status: 'PENDING', transaction_id: '', response_summary: '' });

      const v = await signedAgentFetch(origin, keys, { mandate_id: m.id, store, amount_cents });
      let patch;
      if (v.status !== 200) {
        patch = { status: 'MERCHANT_REJECTED', response_summary: JSON.stringify(v.body).slice(0, 300) };
      } else if (sandbox) {
        const r = await authorizeVisa(amount_cents, ref(store));
        patch = { status: r.status || 'ERROR', transaction_id: r.transaction_id || '', response_summary: r.summary || JSON.stringify(r).slice(0, 300) };
      } else {
        patch = { status: 'SIMULATED', transaction_id: 'sim_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), response_summary: 'Simulated: Visa secrets not set' };
      }
      rec = await base44.asServiceRole.entities.Authorization.update(rec.id, patch);
      return rec;
    }));

    const allOk = authorizations.every((a) => a.status === 'AUTHORIZED' || a.status === 'SIMULATED');
    // Burn the mandate only once every authorization is persisted, so a transient failure
    // can be retried on the same mandate; per-store idempotency above prevents a double charge.
    if (allOk) await base44.asServiceRole.entities.Mandate.update(m.id, { used: true });
    await base44.asServiceRole.entities.Basket.update(basket.id, { status: allOk ? 'authorized' : 'failed' });
    return Response.json({ authorizations, fingerprint: hash.slice(0, 12), keyid: keys.keyid, time: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}