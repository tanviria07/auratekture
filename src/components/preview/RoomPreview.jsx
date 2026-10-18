import { useState } from 'react';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/use-signed-url';
import BeforeAfter from './BeforeAfter';
import Hotspot from './Hotspot';
import NumberLegend from './NumberLegend';

export default function RoomPreview({ photoUrl, previews, choices, kit, onSwap, onUpdate, updating, theme }) {
  const latest = previews?.[0];
  const before = useSignedUrl(photoUrl), after = useSignedUrl(latest?.preview_url);
  const [activeId, setActiveId] = useState(null);
  if (!latest) return null;
  const stale = JSON.stringify(latest.choices || {}) !== JSON.stringify(choices || {});
  const spots = latest.hotspots || [];
  const found = new Set(spots.map((s) => s.line_id));
  // Number detected items first (in hotspot order), then undetected items.
  const numbered = [
    ...spots.map((s, i) => ({ n: i + 1, line: kit.find((l) => l.line_id === s.line_id), spot: s, visible: true })),
    ...kit.filter((l) => !found.has(l.line_id)).map((l, i) => ({ n: spots.length + i + 1, line: l, spot: null, visible: false })),
  ].filter((x) => x.line);
  return (
    <section className="space-y-4">
      {theme && <h2 className="text-2xl font-heading">{theme}</h2>}
      {before && after ? (
        <BeforeAfter before={before} after={after}>
          {numbered.filter((x) => x.visible).map((x) => (
            <Hotspot key={x.line.line_id} n={x.n} spot={x.spot} line={x.line} onSwap={onSwap} active={activeId === x.line.line_id} />
          ))}
        </BeforeAfter>
      ) : <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">AI preview of your room — illustrative. Products and prices are real; check final placement yourself.</p>
        {(stale || updating) && (
          <Button className="rounded-full" disabled={updating} onClick={onUpdate}>{updating ? <Loader2 className="animate-spin" /> : <RefreshCw />}Update image</Button>
        )}
      </div>
      <NumberLegend items={numbered} onSwap={onSwap} activeId={activeId} onHover={setActiveId} />
    </section>
  );
}