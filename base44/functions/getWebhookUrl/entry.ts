import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const origin = req.headers.get('X-Base44-App-Url') || '';
    return Response.json({ url: `${origin}/functions/creaoWebhook` });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}