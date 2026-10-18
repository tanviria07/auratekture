import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { secrets } from 'base44:runtime';

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const start = Date.now();
    const res = await fetch('https://generativelanguage.googleapis.com/v1beta/models/gemini-4-argon:generateContent', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': secrets.get('GEMINI_API_KEY') },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
        generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
      }),
      signal: AbortSignal.timeout(30000),
    });
    const ms = Date.now() - start;
    const data = await res.json();
    if (!res.ok) return Response.json({ error: data?.error?.message || `HTTP ${res.status}`, ms }, { status: 502 });
    const text = (data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim();
    return Response.json({ text, ms });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}