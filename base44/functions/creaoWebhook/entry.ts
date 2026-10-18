import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const base44 = createClientFromRequest(req);
    const payload = (await req.text()).slice(0, 50000);
    await base44.asServiceRole.entities.WebhookLog.create({
      source: 'creao',
      received_at: new Date().toISOString(),
      payload,
    });
    return Response.json({ ok: true }, { status: 200 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}