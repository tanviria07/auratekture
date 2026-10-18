import { Button } from '@/components/ui/button';
import { productPrice } from '@/lib/kit';

export default function AltList({ line, onSwap }) {
  if (line.options.length === 1) return <p className="text-xs text-muted-foreground border-t pt-3">No other options found</p>;
  if (line.options.length < 2) return null;
  return (
    <div className="space-y-1.5 border-t pt-3">
      <p className="text-xs font-medium text-muted-foreground">Alternatives</p>
      {line.options.map((o, i) => i !== line.choice && (
        <div key={i} className="flex items-center justify-between gap-2 text-sm">
          <span className="truncate">{o.title} <span className="text-muted-foreground">{o.store} · ${productPrice(o)}</span></span>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => onSwap(line.line_id, i)}>Swap</Button>
        </div>
      ))}
    </div>
  );
}