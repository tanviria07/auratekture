import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    if (user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });
    const origin = req.headers.get('X-Base44-App-Url') || '';
    const token = encodeURIComponent(secrets.get('CREAO_WEBHOOK_TOKEN') || '');
    return Response.json({ url: `${origin}/functions/creaoWebhook?token=${token}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}