import { AlertTriangle, ExternalLink, Star, Truck } from 'lucide-react';
import { specValues, missingSpecs } from '@/lib/kit';
import SpecList from '@/components/preview/SpecList';

export default function Listing({ line }) {
  const p = line.product, qty = line.qty || 1;
  const over = line.max_unit_price_usd != null && p.unit_price_usd > line.max_unit_price_usd;
  const missing = missingSpecs(line, p);
  return (
    <div className="space-y-3">
      <div className="flex gap-4">
        {p.image_url && <img src={p.image_url} alt={p.title} className="w-20 h-20 object-contain rounded-lg bg-muted shrink-0" />}
        <div className="min-w-0 space-y-1">
          <p className="font-medium leading-snug line-clamp-2">{p.title}</p>
          <p className="text-sm text-muted-foreground">{p.store}{p.rating != null && <span className="inline-flex items-center gap-0.5 ml-2"><Star className="w-3 h-3" />{p.rating} ({p.reviews ?? 0})</span>}</p>
          <p className="text-sm">${p.unit_price_usd} × {qty} = <b>${(p.unit_price_usd * qty).toFixed(2)}</b></p>
        </div>
      </div>
      {p.delivery && <p className="text-xs text-muted-foreground inline-flex items-center gap-1"><Truck className="w-3 h-3" />{p.delivery}</p>}
      {(over || missing.length > 0) && (
        <div className="text-xs rounded-lg bg-accent text-accent-foreground p-2 space-y-0.5">
          {over && <p className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Over the ${line.max_unit_price_usd} per-item budget</p>}
          {missing.length > 0 && <p className="flex items-center gap-1"><AlertTriangle className="w-3 h-3" />Listing doesn't state: {missing.map((k) => k.replace(/_/g, ' ')).join(', ')}</p>}
        </div>
      )}
      <SpecList specs={specValues(line, p)} sources={p.specs?.confidence} />
      {p.specs?.raw_spec_quote && <p className="text-xs text-muted-foreground"><span className="font-medium">From the listing:</span> “{p.specs.raw_spec_quote}”</p>}
      <a href={p.product_url} target="_blank" rel="noreferrer" className="text-sm text-primary inline-flex items-center gap-1">
        {p.via_google ? 'View via Google Shopping' : `View at ${p.store}`}<ExternalLink className="w-3 h-3" />
      </a>
    </div>
  );
}