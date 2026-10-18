import { useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { invoke } from '@/lib/shop';

const num = (v) => (v === '' || v == null ? null : Number(v));

// The facts the plan depends on.
export const fingerprintOf = (f) => JSON.stringify([
  (f.room_purpose || '').trim(), num(f.budget), num(f.headcount), num(f.ceiling_ft),
  [...(f.venue_supplied?.options || [])].sort(), f.venue_supplied?.other || '',
  (f.existing_items || []).map((i) => `${i.label}:${i.count || 1}`),
]);

// Waits for a matching background result; null if there's none to use.
export async function waitPrefetch(id, fp) {
  for (let i = 0; i < 150; i++) {
    const p = (await base44.entities.Event.get(id)).prefetch;
    if (!p || p.fingerprint !== fp) return null;
    if (p.status === 'ready') return p;
    if (p.status !== 'running' || Date.now() - new Date(p.started_at).getTime() > 300000) return null;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}

// Starts plan + search in the background when the facts are complete, or after 10s without changes.
export function usePrefetch({ facts, loaded, busy, save }) {
  const fp = fingerprintOf(facts);
  const started = useRef(null);
  const saveRef = useRef(save); saveRef.current = save;
  const ready = loaded && !!facts.photo_analysis && !!facts.room_purpose?.trim() && facts.budget !== '' && facts.budget != null;
  const all = ready && !!facts.ceiling_ft && !!facts.headcount && !!facts.deadline;

  useEffect(() => { if (loaded && started.current == null && facts.kit_lines?.length) started.current = fp; }, [loaded]);
  useEffect(() => {
    if (!ready || busy || started.current === fp) return;
    const t = setTimeout(async () => {
      started.current = fp;
      const id = await saveRef.current();
      invoke('prefetchDesign', { event_id: id, fingerprint: fp });
    }, all ? 0 : 10000);
    return () => clearTimeout(t);
  }, [fp, ready, all, busy]);

  return { fp, claim: (f) => { started.current = f; } };
}