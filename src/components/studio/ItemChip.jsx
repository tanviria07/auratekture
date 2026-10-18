import { X } from 'lucide-react';
import { CATEGORIES } from '@/lib/categories';

export default function ItemChip({ item, onRemove }) {
  const name = item.label || CATEGORIES[item.category]?.label || item.category;
  return (
    <div className="inline-flex items-center gap-1 rounded-full border bg-card pl-3 pr-1 py-1 text-sm">
      <span>{name}{item.heat_source && ' · heat source'}{item.count > 1 && ` × ${item.count}`}</span>
      <button aria-label={`Remove ${name}`} onClick={onRemove} className="p-1 rounded-full hover:bg-muted"><X className="w-3 h-3" /></button>
    </div>
  );
}