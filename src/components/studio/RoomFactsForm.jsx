import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Loader2 } from 'lucide-react';

const FIELDS = [
  ['room_purpose', 'Room purpose', 'text', 'col-span-2'],
  ['width_ft', 'Width (ft)', 'number'],
  ['depth_ft', 'Depth (ft)', 'number'],
  ['ceiling_ft', 'Ceiling height (ft)', 'number'],
  ['headcount', 'People at once', 'number'],
  ['budget', 'Budget ($)', 'number'],
  ['deadline', 'Deadline', 'date'],
];

export default function RoomFactsForm({ facts, onChange, onSave, saving, saved }) {
  return (
    <form onSubmit={(e) => { e.preventDefault(); onSave(); }} className="grid grid-cols-2 gap-4">
      {FIELDS.map(([key, label, type, span]) => (
        <div key={key} className={`space-y-1.5 ${span || ''}`}>
          <Label className="text-xs text-muted-foreground">{label}</Label>
          <Input type={type} value={facts[key] ?? ''} min={type === 'number' ? 0 : undefined}
            onChange={(e) => onChange(key, type === 'number' ? (e.target.value === '' ? '' : Number(e.target.value)) : e.target.value)} />
        </div>
      ))}
      <div className="col-span-2 flex items-center gap-3 pt-2">
        <Button type="submit" className="rounded-full px-6" disabled={saving}>
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}{saved ? 'Update event' : 'Save event'}
        </Button>
      </div>
    </form>
  );
}