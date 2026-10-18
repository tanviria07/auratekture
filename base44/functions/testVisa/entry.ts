import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { hasVisa, authorizeVisa } from '../../shared/visa.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    if (!hasVisa()) return Response.json({ mode: 'simulated', error: 'Visa secrets are not set' });
    const r = await authorizeVisa(100, 'diag-' + Date.now());
    return Response.json(r);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}