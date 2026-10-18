import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/use-signed-url';
import BeforeAfter from './BeforeAfter';
import Hotspot from './Hotspot';
import UndetectedList from './UndetectedList';

export default function RoomPreview({ photoUrl, previews, choices, kit, onSwap, onUpdate, updating }) {
  const latest = previews?.[0];
  const before = useSignedUrl(photoUrl), after = useSignedUrl(latest?.preview_url);
  if (!latest) return null;
  const stale = JSON.stringify(latest.choices || {}) !== JSON.stringify(choices || {});
  const spots = latest.hotspots || [];
  const found = new Set(spots.map((s) => s.line_id));
  return (
    <section className="space-y-3">
      {before && after ? (
        <BeforeAfter before={before} after={after}>
          {spots.map((s, i) => {
            const line = kit.find((l) => l.line_id === s.line_id);
            return line && <Hotspot key={s.line_id} n={i + 1} spot={s} line={line} onSwap={onSwap} />;
          })}
        </BeforeAfter>
      ) : <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">AI preview of your room — illustrative. Products and prices are real; check final placement yourself.</p>
        {(stale || updating) && (
          <Button className="rounded-full" disabled={updating} onClick={onUpdate}>{updating ? <Loader2 className="animate-spin" /> : <RefreshCw />}Update image</Button>
        )}
      </div>
      <UndetectedList lines={kit.filter((l) => !found.has(l.line_id))} onSwap={onSwap} />
    </section>
  );
}