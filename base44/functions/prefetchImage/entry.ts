import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAdmin } from '../../shared/auth.ts';

// Generates the room picture for a ready background result and keeps it hidden on the prefetch.
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, fingerprint } = await req.json();
    if (!event_id || !fingerprint) return Response.json({ error: 'event_id and fingerprint required' }, { status: 400 });
    const by_admin = !!(await getAdmin(base44));
    const ev = await db.entities.Event.get(event_id);
    const p = ev.prefetch;
    if (p?.status !== 'ready' || p.fingerprint !== fingerprint) return Response.json({ skipped: 'no_result' });
    if (p.image && (p.image.status === 'ready' || (p.image.status === 'running' && Date.now() - new Date(p.image.started_at).getTime() < 180_000))) return Response.json({ skipped: 'already' });
    if (!by_admin) {
      const tenMin = new Date(Date.now() - 600_000).toISOString();
      if ((await db.entities.CreaoRun.count({ event_id, role: 'prefetch_image', created_date: { $gte: tenMin } })) >= 2) return Response.json({ skipped: 'room_cap' });
      const hour = new Date(Date.now() - 3600_000).toISOString();
      if (ev.visitor_id && (await db.entities.DesignRun.count({ visitor_id: ev.visitor_id, created_date: { $gte: hour } })) >= 3) return Response.json({ skipped: 'visitor_limit' });
      if ((await db.entities.DesignRun.count({ by_admin: { $ne: true }, created_date: { $gte: hour } })) >= 15) return Response.json({ skipped: 'busy' });
    }

    const started_at = new Date().toISOString();
    const run = await db.entities.CreaoRun.create({ event_id, role: 'prefetch_image', by_admin, status: 'running', job_group: p.id, started_at });
    const save = async (image: any) => {
      const cur = (await db.entities.Event.get(event_id)).prefetch;
      if (cur?.id !== p.id) return false; // facts changed: discard
      await db.entities.Event.update(event_id, { prefetch: { ...cur, image } });
      return true;
    };
    await save({ status: 'running', started_at });
    const t = Date.now();
    const res = await base44.functions.invoke('generateRoomPreview', { event_id, background: true }).catch((e: any) => ({ data: { error: e.message } }));
    const image_ms = Date.now() - t;
    const ok = !!res.data?.preview;
    const kept = await save(ok ? { status: 'ready', started_at, preview: res.data.preview, image_ms } : { status: 'failed', started_at, image_ms });
    await db.entities.CreaoRun.update(run.id, { status: ok ? 'completed' : 'failed', completed_at: new Date().toISOString() });
    return Response.json({ ready: ok && kept, discarded: !kept, image_ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}