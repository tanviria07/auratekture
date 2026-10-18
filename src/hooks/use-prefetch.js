import { useEffect, useRef, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { invoke } from '@/lib/shop';

const num = (v) => (v === '' || v == null ? null : Number(v));

// Only purpose, budget, people or ceiling restarts background shopping.
export const fingerprintOf = (f) => JSON.stringify([
  (f.room_purpose || '').trim(), num(f.budget), num(f.headcount), num(f.ceiling_ft),
]);

// Changes to these update the existing result without re-shopping.
const detailFingerprintOf = (f) => JSON.stringify([
  [...(f.venue_supplied?.options || [])].sort(), f.venue_supplied?.other || '',
  (f.existing_items || []).map((i) => `${i.category || i.label}:${i.count || 1}`).sort(),
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

// Starts plan + search in the background 3s after the photo is analyzed and purpose + budget are set.
export function usePrefetch({ facts, loaded, busy, save, eventId }) {
  const fp = fingerprintOf(facts);
  const detail = detailFingerprintOf(facts);
  const started = useRef(null);
  const lastDetail = useRef(null);
  const saveRef = useRef(save); saveRef.current = save;
  const detailRef = useRef(detail); detailRef.current = detail;
  const ready = loaded && !!facts.photo_analysis && !!facts.room_purpose?.trim() && facts.budget !== '' && facts.budget != null;

  useEffect(() => { if (loaded && started.current == null && facts.kit_lines?.length) started.current = fp; }, [loaded]);

  // On load, sync to an existing ready prefetch: apply detail changes and start the picture if needed.
  const synced = useRef(false);
  useEffect(() => {
    if (!loaded || synced.current || !eventId || busy) return;
    synced.current = true;
    (async () => {
      const ev = await base44.entities.Event.get(eventId);
      const p = ev.prefetch;
      if (p?.status === 'ready' && p.fingerprint === fp) {
        started.current = fp;
        const r = await invoke('updatePrefetch', { event_id: eventId, fingerprint: fp });
        lastDetail.current = detailRef.current;
        if (r.productsChanged || !p.image) setReadyFor({ id: eventId, fp });
      }
    })();
  }, [loaded, eventId, busy]);

  // Start shopping 3s after the fingerprint is ready and unchanged.
  useEffect(() => {
    if (!ready || busy || started.current === fp) return;
    const t = setTimeout(async () => {
      started.current = fp;
      lastDetail.current = null;
      const id = await saveRef.current();
      const r = await invoke('prefetchDesign', { event_id: id, fingerprint: fp });
      if (r.ready || r.skipped === 'already') {
        if (r.skipped === 'already') { const pre = await waitPrefetch(id, fp); if (!pre) return; }
        lastDetail.current = detailRef.current;
        setReadyFor({ id, fp });
      }
    }, 3000);
    return () => clearTimeout(t);
  }, [fp, ready, busy]);

  // Start the picture the moment the background result is ready (no extra wait).
  const [readyFor, setReadyFor] = useState(null);
  useEffect(() => {
    if (!readyFor || readyFor.fp !== fp || busy) return;
    setReadyFor(null);
    invoke('prefetchImage', { event_id: readyFor.id, fingerprint: fp });
  }, [readyFor, fp, busy]);

  // When detail changes but the shopping fingerprint is unchanged, update the existing result.
  useEffect(() => {
    if (!ready || busy || started.current !== fp || lastDetail.current == null || lastDetail.current === detail) return;
    const t = setTimeout(async () => {
      const id = await saveRef.current();
      const r = await invoke('updatePrefetch', { event_id: id, fingerprint: fp });
      lastDetail.current = detailRef.current;
      if (r.productsChanged) setReadyFor({ id, fp });
    }, 3000);
    return () => clearTimeout(t);
  }, [detail, fp, ready, busy]);

  return { fp, claim: (f) => { started.current = f; lastDetail.current = null; setReadyFor(null); } };
}

// Waits for the hidden background picture; null if it failed or the facts changed.
export async function waitImage(id, prefetchId) {
  for (let i = 0; i < 90; i++) {
    const p = (await base44.entities.Event.get(id)).prefetch;
    if (p?.id !== prefetchId || !p.image || p.image.status === 'failed') return null;
    if (p.image.status === 'ready') return p.image;
    await new Promise((r) => setTimeout(r, 2000));
  }
  return null;
}