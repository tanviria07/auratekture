import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { VENUE_OPTIONS } from '@/lib/categories';

export default function VenueSupplied({ initial, onSave }) {
  const [options, setOptions] = useState(initial?.options || []);
  const [other, setOther] = useState(initial?.other || '');
  const [saving, setSaving] = useState(false);
  const toggle = (o) => setOptions((l) => (l.includes(o) ? l.filter((x) => x !== o) : [...l, o]));
  const save = async () => { setSaving(true); await onSave({ options, other }); setSaving(false); };

  return (
    <section className="space-y-4">
      <h2 className="text-xl">What does the venue or home already provide?</h2>
      <div className="flex flex-wrap gap-2">
        {VENUE_OPTIONS.map((o) => (
          <button key={o} onClick={() => toggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm ${options.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>{o}</button>
        ))}
      </div>
      <Input placeholder="Anything else (e.g. projector, coat rack)" value={other} onChange={(e) => setOther(e.target.value)} />
      <Button variant="outline" className="rounded-full" onClick={save} disabled={saving}>{saving && <Loader2 className="w-4 h-4 animate-spin" />}Save</Button>
    </section>
  );
}