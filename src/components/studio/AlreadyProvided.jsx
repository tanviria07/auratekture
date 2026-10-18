import { Input } from '@/components/ui/input';
import { VENUE_OPTIONS } from '@/lib/categories';

// Compact "already here" chips for things the photo can't show. Counts as venue-supplied,
// so the kit never buys them. Every change saves right away.
export default function AlreadyProvided({ value, onChange }) {
  const options = value?.options || [], other = value?.other || '';
  const toggle = (o) => onChange({ other, options: options.includes(o) ? options.filter((x) => x !== o) : [...options, o] });
  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">Already here (the kit won't buy these)</p>
      <div className="flex flex-wrap gap-2 items-center">
        {VENUE_OPTIONS.map((o) => (
          <button key={o} type="button" onClick={() => toggle(o)}
            className={`rounded-full border px-3 py-1.5 text-sm transition-colors ${options.includes(o) ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`}>{o}</button>
        ))}
        <Input placeholder="Other (e.g. projector, coat rack)" value={other}
          onChange={(e) => onChange({ options, other: e.target.value })}
          className="h-8 rounded-full text-sm max-w-[14rem] flex-1 min-w-[10rem]" />
      </div>
    </div>
  );
}