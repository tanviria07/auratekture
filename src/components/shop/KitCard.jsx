import Listing from './Listing';
import AltList from './AltList';

export default function KitCard({ line, onSwap }) {
  const r = line.result;
  return (
    <div className="rounded-2xl border bg-card p-5 space-y-3">
      <div className="flex justify-between gap-2">
        <p className="text-xs uppercase tracking-wide text-muted-foreground">{(line.category || line.line_id).replace(/_/g, ' ')}</p>
        <span className="text-xs text-muted-foreground">qty {line.qty || 1}</span>
      </div>
      {!r && <p className="text-sm text-muted-foreground">Not searched yet.</p>}
      {r?.status === 'not_found' && <p className="text-sm text-destructive">Nothing fits: {r.reason}</p>}
      {line.product && <Listing line={line} />}
      {line.product && <AltList line={line} onSwap={onSwap} />}
    </div>
  );
}