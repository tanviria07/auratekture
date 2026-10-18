import { ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { productPrice, productUrl, lineName, specValues } from '@/lib/kit';
import SpecList from './SpecList';

export default function ProductCard({ line, onSwap }) {
  const p = line.product || {};
  const price = productPrice(p);
  return (
    <div className="space-y-3 w-72">
      {p.image_url && <img src={p.image_url} alt={p.title} className="w-full h-36 object-contain rounded-lg bg-muted" />}
      <div>
        <p className="font-medium leading-snug">{lineName(line)}</p>
        <p className="text-sm text-muted-foreground">{[p.store, price != null && `$${price}`, `qty ${line.qty || 1}`].filter(Boolean).join(' · ')}</p>
      </div>
      {productUrl(p) && <a href={productUrl(p)} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">View product <ExternalLink className="w-3 h-3" /></a>}
      <SpecList specs={specValues(line, p)} sources={p.specs?.confidence} />
      {line.reason && <p className="text-sm text-muted-foreground"><span className="font-medium text-foreground">Why: </span>{line.reason}</p>}
      {line.options.length > 1 && (
        <div className="space-y-1.5 border-t pt-3">
          <p className="text-xs font-medium text-muted-foreground">Alternatives</p>
          {line.options.map((o, i) => i !== line.choice && (
            <div key={i} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate">{o.title} {productPrice(o) != null && <span className="text-muted-foreground">${productPrice(o)}</span>}</span>
              <Button size="sm" variant="outline" className="rounded-full" onClick={() => onSwap(line.line_id, i)}>Swap</Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}