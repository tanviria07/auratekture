import { Check, X } from 'lucide-react';
import { Button } from '@/components/ui/button';

const name = (kind, m) => (kind === 'exits' ? 'Door' : m.type === 'window' ? 'Window' : m.type === 'fireplace' ? 'Fireplace' : 'Heater');

export default function SuggestedList({ layout, onConfirm, onDismiss }) {
  const list = ['exits', 'fixtures'].flatMap((k) => layout[k].filter((m) => m.suggested).map((m) => ({ k, m })));
  if (!list.length) return null;
  return (
    <div className="rounded-2xl border border-dashed p-4 space-y-2">
      <p className="text-sm text-muted-foreground">Suggested from photo: drag to the exact spot</p>
      {list.map(({ k, m }) => (
        <div key={m.id} className="flex items-center gap-2 text-sm">
          <span className="flex-1">{name(k, m)}</span>
          <Button size="sm" variant="outline" className="rounded-full" onClick={() => onConfirm(k, m.id)}><Check className="w-3 h-3" />Confirm</Button>
          <Button size="icon" variant="ghost" aria-label="Dismiss" onClick={() => onDismiss(k, m.id)}><X className="w-4 h-4" /></Button>
        </div>
      ))}
    </div>
  );
}