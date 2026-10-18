import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { creaoFetch, applyRun } from '../../shared/creao.ts';

function safeEqual(a, b) {
  if (!a || !b || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export default async function(req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const token = new URL(req.url).searchParams.get('token') || '';
    if (!safeEqual(token, secrets.get('CREAO_WEBHOOK_TOKEN') || '')) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }
    const db = createClientFromRequest(req).asServiceRole;
    const raw = (await req.text()).slice(0, 50000);
    const deliveryId = req.headers.get('X-Creao-Delivery-Id') || '';
    await db.entities.WebhookLog.create({ source: 'creao', received_at: new Date().toISOString(), payload: raw });

    const body = JSON.parse(raw || '{}');
    const [row] = body.runId ? await db.entities.CreaoRun.filter({ creao_run_id: body.runId }) : [];
    if (!row || (deliveryId && row.delivery_id === deliveryId) || row.status === 'completed') {
      return Response.json({ ok: true, ignored: true });
    }
    // Webhook is only a signal: the polled run is the source of truth.
    const run = await creaoFetch(row.role, `/${body.runId}`);
    await applyRun(db, row, run, { delivery_id: deliveryId });
    return Response.json({ ok: true });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}