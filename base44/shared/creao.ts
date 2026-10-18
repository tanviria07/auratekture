import { secrets } from 'base44:runtime';

export const CREAO_AGENTS = [
  { role: 'buyer', name: 'Buyer', app_id: '42293471-ea0d-495c-8041-3378e5d924f8', secret: 'CREAO_BUYER_API_KEY' },
  { role: 'inspector', name: 'Inspector', app_id: '', secret: 'CREAO_INSPECTOR_API_KEY' },
  { role: 'logistics', name: 'Logistics', app_id: '', secret: 'CREAO_LOGISTICS_API_KEY' },
  { role: 'finance', name: 'Finance', app_id: '', secret: 'CREAO_FINANCE_API_KEY' },
].filter((a) => a.app_id);

const BASE = 'https://agent.creao.ai/api/v1/apps';
export const TERMINAL = ['completed', 'failed', 'cancelled', 'timed_out'];

export function agentFor(role) {
  const a = CREAO_AGENTS.find((x) => x.role === role);
  if (!a) throw new Error(`Unknown or unconfigured role: ${role}`);
  return { ...a, key: secrets.get(a.secret) };
}

export async function creaoFetch(role, path, init = {}) {
  const a = agentFor(role);
  const res = await fetch(`${BASE}/${a.app_id}/runs${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${a.key}`, 'Content-Type': 'application/json' },
    signal: AbortSignal.timeout(8000),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(`CREAO ${res.status}: ${data.error || 'request failed'}`);
  return data;
}

// Strip fences/prose and take the outermost {...}.
export function parseResult(text) {
  if (!text) return null;
  const s = text.replace(/```(?:json)?/gi, '');
  const i = s.indexOf('{'), j = s.lastIndexOf('}');
  if (i < 0 || j <= i) return null;
  try { return JSON.parse(s.slice(i, j + 1)); } catch { return null; }
}

// Save the polled run (source of truth) onto our CreaoRun row.
export async function applyRun(db, row, run, extra = {}) {
  const status = run.status || row.status;
  const patch = { status, thread_id: run.threadId || row.thread_id, error_code: run.errorCode || undefined, ...extra };
  if (TERMINAL.includes(status)) patch.completed_at = new Date().toISOString();
  const text = run.result?.text;
  if (text) {
    patch.result_text = text;
    const parsed = parseResult(text);
    if (parsed) patch.parsed_result = parsed;
    else patch.error_code = 'PARSE_FAILED';
  }
  return db.entities.CreaoRun.update(row.id, patch);
}