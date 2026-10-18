import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { creaoFetch, applyRun, TERMINAL } from '../../shared/creao.ts';

const TIMEOUT_MS = 15 * 60 * 1000;

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const { run_row_id } = await req.json();
    const db = base44.asServiceRole;
    const row = await db.entities.CreaoRun.get(run_row_id);
    if (TERMINAL.includes(row.status)) return Response.json({ run: row });

    const run = await creaoFetch(row.role, `/${row.creao_run_id}`);
    let updated = await applyRun(db, row, run);
    if (!TERMINAL.includes(updated.status) && Date.now() - new Date(row.started_at).getTime() > TIMEOUT_MS) {
      updated = await db.entities.CreaoRun.update(row.id, { status: 'timed_out', completed_at: new Date().toISOString() });
    }
    return Response.json({ run: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}