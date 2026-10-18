import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAgentKeys, signedAgentFetch } from '../../shared/agentSig.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const keys = await getAgentKeys();
    const origin = req.headers.get('X-Base44-App-Url') || new URL(req.url).origin;
    const r = await signedAgentFetch(origin, keys, { mandate_id: 'tamper-test', store: 'Test', amount_cents: 1001 }, true);
    return Response.json({ merchant_status: r.status, merchant_body: r.body });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}