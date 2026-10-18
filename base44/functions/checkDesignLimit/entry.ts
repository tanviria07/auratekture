import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAdmin } from '../../shared/auth.ts';

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id } = await req.json();
    if (!event_id) return Response.json({ error: 'event_id required' }, { status: 400 });

    const by_admin = !!(await getAdmin(base44));
    if (by_admin) return Response.json({ allowed: true });

    const ev = await db.entities.Event.get(event_id);
    const visitor_id = ev.visitor_id;
    if (!visitor_id) return Response.json({ allowed: true });

    const since = new Date(Date.now() - 3600_000).toISOString();
    const visitorCount = await db.entities.DesignRun.count({ visitor_id, created_date: { $gte: since } });
    const globalCount = await db.entities.DesignRun.count({ by_admin: { $ne: true }, created_date: { $gte: since } });

    if (visitorCount >= 3) {
      const { items } = await db.entities.DesignRun.filter({ visitor_id, created_date: { $gte: since } }, { sort: 'created_date', limit: 1 });
      const mins = items[0] ? Math.max(1, Math.ceil((new Date(items[0].created_date).getTime() + 3600_000 - Date.now()) / 60000)) : 60;
      return Response.json({ allowed: false, message: `You've used all 3 runs this hour. Try again in ${mins} min.`, retryAfterMinutes: mins });
    }

    if (globalCount >= 15) {
      const { items } = await db.entities.DesignRun.filter({ by_admin: { $ne: true }, created_date: { $gte: since } }, { sort: 'created_date', limit: 1 });
      const mins = items[0] ? Math.max(1, Math.ceil((new Date(items[0].created_date).getTime() + 3600_000 - Date.now()) / 60000)) : 60;
      return Response.json({ allowed: false, message: `Our service is busy right now. Try again in ${mins} min.`, retryAfterMinutes: mins });
    }

    await db.entities.DesignRun.create({ visitor_id, event_id, by_admin });
    return Response.json({ allowed: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}