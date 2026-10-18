import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useSignedUrl } from '@/hooks/use-signed-url';
import BeforeAfter from './BeforeAfter';
import Hotspot from './Hotspot';
import PreviewControls from './PreviewControls';
import UndetectedList from './UndetectedList';

export default function RoomPreview({ eventId, photoUrl, previews, choices, kit, onSwap: swap, onPreviews }) {
  const [busy, setBusy] = useState(false);
  const [start, setStart] = useState(0);
  const [secs, setSecs] = useState(0);
  const [error, setError] = useState('');
  const latest = previews?.[0];
  const before = useSignedUrl(photoUrl), after = useSignedUrl(latest?.preview_url);

  useEffect(() => {
    if (!busy) return;
    const t = setInterval(() => setSecs(Math.round((Date.now() - start) / 1000)), 1000);
    return () => clearInterval(t);
  }, [busy, start]);

  const stale = !!latest && JSON.stringify(latest.choices || {}) !== JSON.stringify(choices || {});

  const generate = async () => {
    setBusy(true); setError(''); setStart(Date.now()); setSecs(0);
    const r = await base44.functions.invoke('generateRoomPreview', { event_id: eventId })
      .then((res) => res.data).catch((e) => ({ error: e.response?.data?.error || e.message }));
    if (r.error) setError(r.error); else onPreviews(r.previews);
    setBusy(false);
  };

  const spots = latest?.hotspots || [];
  const found = new Set(spots.map((s) => s.line_id));
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-xl">Your room, styled</h2>
        <p className="text-sm text-muted-foreground">AI preview — illustrative. Sizes, power and safety are checked on the floor plan.</p>
      </div>
      <PreviewControls hasKit={kit.some((l) => l.product) && !!photoUrl} hasPreview={!!latest} stale={stale} busy={busy} secs={secs} error={error} onGenerate={generate} />
      {latest && before && after && (
        <BeforeAfter before={before} after={after}>
          {spots.map((s, i) => {
            const line = kit.find((l) => l.line_id === s.line_id);
            return line && <Hotspot key={s.line_id} n={i + 1} spot={s} line={line} onSwap={swap} />;
          })}
        </BeforeAfter>
      )}
      {latest && <UndetectedList lines={kit.filter((l) => !found.has(l.line_id))} onSwap={swap} />}
    </section>
  );
}