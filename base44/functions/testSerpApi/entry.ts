import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAdmin, adminOnly } from '../../shared/auth.ts';
import { searchShopping } from '../../shared/serpapi.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await getAdmin(base44))) return adminOnly();
    const { results, ms } = await searchShopping('surge protector power strip 6 outlet');
    return Response.json({ ms, count: results.length, top: results.slice(0, 3) });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}