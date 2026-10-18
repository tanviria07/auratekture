import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { hasVisa, authorizeVisa } from '../../shared/visa.ts';
import { getAdmin, adminOnly } from '../../shared/auth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await getAdmin(base44))) return adminOnly();
    if (!hasVisa()) return Response.json({ mode: 'simulated', error: 'Visa secrets are not set' });
    const r = await authorizeVisa(100, 'diag-' + Date.now());
    return Response.json(r);
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}