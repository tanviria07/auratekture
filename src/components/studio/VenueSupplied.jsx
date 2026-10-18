import { Input } from '@/components/ui/input';
import { VENUE_OPTIONS } from '@/lib/categories';

// Saved with the step's main Save button.
export default function VenueSupplied({ value, onChange }) {
  const options = value?.options || [], other = value?.other || '';
  const toggle = (o) => onChange({ other, options: options.includes(o) ? options.filter((x) => x !== o) : [...options, o] });

  return (
    <section className="space-y-4">
      <h2 className="text-xl">What does the venue provide?</h2>
      <div className="flex flex-wrap gap-2">
        {VENUE_OPTIONS.map((o) => (
          <button key={o} onClick={() => toggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm ${options.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>{o}</button>
        ))}
      </div>
      <Input placeholder="Anything else (e.g. projector, coat rack)" value={other} onChange={(e) => onChange({ options, other: e.target.value })} />
    </section>
  );
}