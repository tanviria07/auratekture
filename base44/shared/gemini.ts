import { secrets } from 'base44:runtime';

export const GEMINI_TIMEOUT_MS = 60000;

// Calls Gemini generateContent; returns { ok, status, data, errorText, ms }.
export async function generateContent(model, body) {
  const start = Date.now();
  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-goog-api-key': secrets.get('GEMINI_API_KEY') },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(GEMINI_TIMEOUT_MS),
    });
    const raw = await res.text();
    const ms = Date.now() - start;
    if (!res.ok) return { ok: false, status: res.status, errorText: raw.slice(0, 300), ms };
    return { ok: true, status: res.status, data: JSON.parse(raw), ms };
  } catch (e) {
    return { ok: false, status: null, errorText: e.message.slice(0, 300), ms: Date.now() - start };
  }
}