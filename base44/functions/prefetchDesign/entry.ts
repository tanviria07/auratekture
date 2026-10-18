import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAdmin } from '../../shared/auth.ts';

// Runs plan + product search in the background and stores the result under the shopping fingerprint.
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, fingerprint } = await req.json();
    if (!event_id || !fingerprint) return Response.json({ error: 'event_id and fingerprint required' }, { status: 400 });
    const by_admin = !!(await getAdmin(base44));
    const ev = await db.entities.Event.get(event_id);
    const p = ev.prefetch;
    if (p?.fingerprint === fingerprint && (p.status === 'ready' || (p.status === 'running' && Date.now() - new Date(p.started_at).getTime() < 300_000))) {
      return Response.json({ skipped: 'already' });
    }
    if (!by_admin) {
      const tenMin = new Date(Date.now() - 600_000).toISOString();
      if ((await db.entities.CreaoRun.count({ event_id, role: 'prefetch', created_date: { $gte: tenMin } })) >= 3) return Response.json({ skipped: 'room_cap' });
      const hour = new Date(Date.now() - 3600_000).toISOString();
      if (ev.visitor_id && (await db.entities.DesignRun.count({ visitor_id: ev.visitor_id, created_date: { $gte: hour } })) >= 3) return Response.json({ skipped: 'visitor_limit' });
      if ((await db.entities.DesignRun.count({ by_admin: { $ne: true }, created_date: { $gte: hour } })) >= 15) return Response.json({ skipped: 'busy' });
    }

    const id = crypto.randomUUID(), started_at = new Date().toISOString();
    const run = await db.entities.CreaoRun.create({ event_id, role: 'prefetch', by_admin, status: 'running', job_group: id, started_at });
    await db.entities.Event.update(event_id, { prefetch: { id, fingerprint, status: 'running', started_at } });

    const mine = async () => (await db.entities.Event.get(event_id)).prefetch?.id === id;
    try {
      let t = Date.now();
      const plan = (await base44.functions.invoke('proposeKit', { event_id, dry: true })).data;
      const plan_ms = Date.now() - t;
      if (!(await mine())) return Response.json({ discarded: true });
      const found = (await base44.functions.invoke('findProducts', { event_id, kit_lines: plan.kit_lines, dry: true })).data;
      if (!(await mine())) return Response.json({ discarded: true });
      await db.entities.Event.update(event_id, { prefetch: {
        id, fingerprint, status: 'ready', started_at,
        all_kit_lines: plan.kit_lines, kit_lines: plan.kit_lines,
        theme: plan.theme,
        all_products: found.all_products, products: found.products,
        product_choices: found.product_choices || {}, products_at: found.products_at,
        timings: { plan_ms, ...(found.timings || {}) },
      } });
      await db.entities.CreaoRun.update(run.id, { status: 'completed', completed_at: new Date().toISOString() });
      return Response.json({ ready: true });
    } catch (e) {
      if (await mine()) await db.entities.Event.update(event_id, { prefetch: { id, fingerprint, status: 'failed', started_at } });
      await db.entities.CreaoRun.update(run.id, { status: 'failed', error_code: String(e.message).slice(0, 200) });
      return Response.json({ error: e.message }, { status: 502 });
    }
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}