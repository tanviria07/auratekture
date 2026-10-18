import { Minus, Plus, X } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

export default function ItemChip({ item, onCount, onRemove }) {
  const unsure = item.confidence != null && item.confidence < 0.6;
  return (
    <div className={`inline-flex items-center gap-1 rounded-full border pl-3 pr-1 py-1 text-sm ${unsure ? 'border-primary bg-accent' : 'bg-card'}`}>
      <span>{item.label || CATEGORIES[item.category]?.label} × {item.count}</span>
      {item.heat_source && <span className="text-[11px] rounded-full bg-orange-100 text-orange-700 px-2 ml-1">Heat source</span>}
      {unsure && <span className="text-[11px] text-accent-foreground ml-1">Please confirm</span>}
      <button aria-label="Fewer" onClick={() => onCount(-1)} className="p-1 rounded-full hover:bg-muted"><Minus className="w-3 h-3" /></button>
      <button aria-label="More" onClick={() => onCount(1)} className="p-1 rounded-full hover:bg-muted"><Plus className="w-3 h-3" /></button>
      <button aria-label="Remove" onClick={onRemove} className="p-1 rounded-full hover:bg-muted"><X className="w-3 h-3" /></button>
    </div>
  );
}