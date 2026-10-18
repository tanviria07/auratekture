import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { checkMandate } from '../../shared/mandate.ts';
import { getAgentKeys, signedAgentFetch } from '../../shared/agentSig.ts';
import { storeTotals } from '../../shared/canonical.ts';

const fail = (status, error, reason) => Response.json({ error, reason }, { status });

// Lets the owner of a room try to cheat their own latest sandbox checkout.
// Neither attempt reaches Visa: price tampering is stopped by checkMandate, and the
// altered agent request is stopped by merchantVerify (which never calls Visa).
export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { kind, event_id, visitor_id, mandate_id } = await req.json();
    if (!['price', 'agent'].includes(kind) || !event_id || !visitor_id) return fail(400, 'BAD_REQUEST', 'Missing details for this check');

    let user = null;
    try { user = await base44.auth.me(); } catch { user = null; }
    const ev = await db.entities.Event.get(event_id).catch(() => null);
    const owns = ev && (ev.visitor_id === visitor_id || (user && ev.created_by_id === user.id) || user?.role === 'admin');
    if (!owns) return fail(403, 'NOT_YOUR_CHECKOUT', 'This checkout belongs to someone else');

    const { items: [last] } = await db.entities.Mandate.filter({ event_id, used: true }, { sort: '-created_date', limit: 1 });
    const { items: [auth] } = last ? await db.entities.Authorization.filter({ mandate_id: last.id, mode: 'sandbox' }, { limit: 1 }) : { items: [] };
    if (!auth) return fail(409, 'NO_CHECKOUT', 'Approve and sign a sandbox checkout first');

    const since = new Date(Date.now() - 3600_000).toISOString();
    if ((await db.entities.TrustAttempt.count({ visitor_id, created_date: { $gte: since } })) >= 10) return fail(429, 'RATE_LIMITED', 'You have used all 10 attempts this hour');
    await db.entities.TrustAttempt.create({ visitor_id, event_id, kind });

    const { items: [basket] } = await db.entities.Basket.filter({ event_id }, { sort: '-created_date', limit: 1 });
    if (kind === 'price') {
      const m = mandate_id && await db.entities.Mandate.get(mandate_id).catch(() => null);
      if (!m || m.event_id !== event_id) return fail(400, 'BAD_REQUEST', 'Signing step was missing');
      const tampered = basket.items.map((it, i) => (i === 0 ? { ...it, unit_price_cents: it.unit_price_cents + 5000 } : it));
      const r = await checkMandate(m, tampered);
      if (r.reason) return fail(403, 'MANDATE_TAMPER_BLOCKED', r.reason);
      return fail(500, 'NOT_BLOCKED', 'The change was not caught');
    }

    const keys = await getAgentKeys();
    const origin = req.headers.get('X-Base44-App-Url') || new URL(req.url).origin;
    const [store, amount_cents] = Object.entries(storeTotals(basket.items))[0];
    const v = await signedAgentFetch(origin, keys, { mandate_id: last.id, store, amount_cents }, true);
    return Response.json(v.body, { status: v.status === 200 ? 500 : v.status });
  } catch (error) {
    return fail(500, 'SERVER_ERROR', error.message);
  }
}