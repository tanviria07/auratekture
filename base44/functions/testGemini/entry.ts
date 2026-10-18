import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { generateContent } from '../../shared/gemini.ts';
import { getAdmin, adminOnly } from '../../shared/auth.ts';

const MODELS = { default: 'gemini-4-argon', flash: 'gemini-3.5-flash' };

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    if (!(await getAdmin(base44))) return adminOnly();
    const { variant } = await req.json().catch(() => ({}));
    const model = MODELS[variant] || MODELS.default;

    const r = await generateContent(model, {
      contents: [{ role: 'user', parts: [{ text: 'Reply with exactly: OK' }] }],
      generationConfig: { thinkingConfig: { thinkingLevel: 'low' } },
    });
    const text = r.ok ? (r.data?.candidates?.[0]?.content?.parts || []).map((p) => p.text || '').join('').trim() : null;
    return Response.json({ model, ok: r.ok, status: r.status, ms: r.ms, text, error: r.errorText || null });
  } catch (error) {
    return Response.json({ ok: false, error: error.message }, { status: 500 });
  }
}