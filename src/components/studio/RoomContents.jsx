import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, ROOM_KEYS } from '@/lib/categories';
import { mergeItems } from '@/lib/photoSuggestions';
import ItemChip from './ItemChip';

// Chips for what's in the room; every change saves right away.
export default function RoomContents({ items, onChange }) {
  const add = (category) => onChange(mergeItems([...items, { category, label: CATEGORIES[category].label, count: 1, heat_source: ['fireplace', 'heater'].includes(category) }]));
  return (
    <div className="flex flex-wrap gap-2 items-center">
      {items.map((it, i) => <ItemChip key={`${it.category}-${it.label}`} item={it} onRemove={() => onChange(items.filter((_, j) => j !== i))} />)}
      <Select value="" onValueChange={add}>
        <SelectTrigger className="w-32 h-8 rounded-full text-sm"><SelectValue placeholder="+ Add" /></SelectTrigger>
        <SelectContent>{ROOM_KEYS.map((k) => <SelectItem key={k} value={k}>{CATEGORIES[k].label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}