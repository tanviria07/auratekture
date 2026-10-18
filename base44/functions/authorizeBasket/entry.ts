import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkMandate } from '../../shared/mandate.ts';
import { getAgentKeys, signedAgentFetch } from '../../shared/agentSig.ts';
import { hasVisa, authorizeVisa } from '../../shared/visa.ts';

const block = (reason) => Response.json({ error: 'MANDATE_TAMPER_BLOCKED', reason }, { status: 403 });

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

    await base44.asServiceRole.entities.Mandate.update(m.id, { used: true });
    const keys = await getAgentKeys();
    const origin = req.headers.get('X-Base44-App-Url') || new URL(req.url).origin;
    const sandbox = hasVisa();
    const authorizations = await Promise.all(Object.entries(totals).map(async ([store, amount_cents]) => {
      const v = await signedAgentFetch(origin, keys, { mandate_id: m.id, store, amount_cents });
      let r;
      if (v.status !== 200) r = { mode: sandbox ? 'sandbox' : 'simulated', status: 'MERCHANT_REJECTED', transaction_id: '', summary: JSON.stringify(v.body).slice(0, 300) };
      else if (sandbox) r = await authorizeVisa(amount_cents, `${m.id}-${store}`);
      else r = { mode: 'simulated', status: 'SIMULATED', transaction_id: 'sim_' + crypto.randomUUID().replace(/-/g, '').slice(0, 16), summary: 'Simulated: Visa secrets not set' };
      return base44.asServiceRole.entities.Authorization.create({ mandate_id: m.id, store, amount_cents, mode: r.mode, status: r.status, transaction_id: r.transaction_id || '', response_summary: r.summary });
    }));
    const allOk = authorizations.every((a) => a.status === 'AUTHORIZED' || a.status === 'SIMULATED');
    await base44.asServiceRole.entities.Basket.update(basket.id, { status: allOk ? 'authorized' : 'failed' });
    return Response.json({ authorizations, fingerprint: hash.slice(0, 12), keyid: keys.keyid, time: new Date().toISOString() });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}