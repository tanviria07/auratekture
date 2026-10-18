import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

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