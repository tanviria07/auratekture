import { useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { CATEGORIES, ROOM_KEYS } from '@/lib/categories';
import ItemChip from './ItemChip';

export default function RoomContents({ initial, confirmed, onConfirm }) {
  const [items, setItems] = useState(initial || []);
  const [saving, setSaving] = useState(false);

  const setCount = (i, d) => setItems((list) => list.map((it, j) => (j === i ? { ...it, count: Math.max(1, it.count + d), confidence: 1 } : it)));
  const add = (category) => setItems((list) => {
    const i = list.findIndex((it) => it.category === category);
    if (i >= 0) return list.map((it, j) => (j === i ? { ...it, count: it.count + 1 } : it));
    return [...list, { category, label: CATEGORIES[category].label, count: 1, confidence: 1 }];
  });
  const confirm = async () => { setSaving(true); await onConfirm(items); setSaving(false); };

  return (
    <section className="space-y-4">
      <h2 className="text-xl">What's already in the room</h2>
      <div className="flex flex-wrap gap-2">
        {items.length === 0 && <p className="text-sm text-muted-foreground">Nothing listed yet.</p>}
        {items.map((it, i) => (
          <ItemChip key={`${it.category}-${i}`} item={it} onCount={(d) => setCount(i, d)} onRemove={() => setItems((l) => l.filter((_, j) => j !== i))} />
        ))}
      </div>
      <div className="flex flex-wrap gap-3 items-center">
        <Select value="" onValueChange={add}>
          <SelectTrigger className="w-40 rounded-full"><SelectValue placeholder="Add item" /></SelectTrigger>
          <SelectContent>{ROOM_KEYS.map((k) => <SelectItem key={k} value={k}>{CATEGORIES[k].label}</SelectItem>)}</SelectContent>
        </Select>
        <Button className="rounded-full" onClick={confirm} disabled={saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}Confirm room contents
        </Button>
        {confirmed && <span className="text-sm text-muted-foreground">Confirmed</span>}
      </div>
    </section>
  );
}