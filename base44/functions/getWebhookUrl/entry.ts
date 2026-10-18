import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';
import { getAdmin, adminOnly } from '../../shared/auth.ts';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await getAdmin(base44))) return adminOnly();
    const origin = req.headers.get('X-Base44-App-Url') || '';
    const token = encodeURIComponent(secrets.get('CREAO_WEBHOOK_TOKEN') || '');
    return Response.json({ url: `${origin}/functions/creaoWebhook?token=${token}` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}