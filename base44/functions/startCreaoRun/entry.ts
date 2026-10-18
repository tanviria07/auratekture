import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { creaoFetch } from '../../shared/creao.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const { event_id, role, inputs, job_group } = await req.json();
    if (!role || !inputs || typeof inputs !== 'object') return Response.json({ error: 'role and inputs required' }, { status: 400 });

    const origin = req.headers.get('X-Base44-App-Url') || '';
    const webhookUrl = `${origin}/functions/creaoWebhook?token=${encodeURIComponent(secrets.get('CREAO_WEBHOOK_TOKEN') || '')}`;
    const run = await creaoFetch(role, '', { method: 'POST', body: JSON.stringify({ inputs, webhookUrl }) });

    const row = await base44.asServiceRole.entities.CreaoRun.create({
      event_id, role, job_group, creao_run_id: run.id, status: run.status || 'pending',
      inputs: JSON.stringify(inputs), started_at: new Date().toISOString(),
    });
    return Response.json({ run: row });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}