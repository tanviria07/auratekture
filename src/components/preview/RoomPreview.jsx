import { useEffect, useState } from 'react';
import { numberKit } from '@/lib/numbering';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useSignedUrl } from '@/hooks/use-signed-url';
import BeforeAfter from './BeforeAfter';
import Hotspot from './Hotspot';
import NumberLegend from './NumberLegend';

export default function RoomPreview({ photoUrl, previews, choices, kit, onSwap, onUpdate, updating, theme, focus }) {
  const latest = previews?.[0];
  const before = useSignedUrl(photoUrl), after = useSignedUrl(latest?.preview_url);
  const [activeId, setActiveId] = useState(null);
  const [openId, setOpenId] = useState(null);
  useEffect(() => { if (focus) { setActiveId(focus.line_id); setOpenId(focus.line_id); } }, [focus]);
  if (!latest) return null;
  const stale = JSON.stringify(latest.choices || {}) !== JSON.stringify(choices || {});
  const numbered = numberKit(kit, latest);
  return (
    <section className="space-y-4">
      {theme && <h2 className="text-2xl font-heading">{theme}</h2>}
      {before && after ? (
        <BeforeAfter before={before} after={after}>
          {numbered.filter((x) => x.visible).map((x) => (
            <Hotspot key={`${x.line.line_id}-${x.n}`} n={x.n} spot={x.spot} line={x.line} onSwap={onSwap} active={activeId === x.line.line_id} />
          ))}
        </BeforeAfter>
      ) : <div className="aspect-[4/3] rounded-2xl bg-muted animate-pulse" />}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">AI preview of your room — illustrative. Products and prices are real; check final placement yourself.</p>
        <Button className="rounded-full" disabled={updating} onClick={onUpdate}>{updating ? <Loader2 className="animate-spin" /> : <RefreshCw />}{stale ? 'Update image' : 'Retry image'}</Button>
      </div>
      <NumberLegend items={numbered} onSwap={onSwap} activeId={activeId} onHover={setActiveId} openId={openId} onOpen={setOpenId} />
    </section>
  );
}