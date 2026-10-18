import { Check, X } from 'lucide-react';

// The store verifier's real step results, in the order it ran them.
export default function StoreChecks({ steps }) {
  if (!steps?.length) return <p className="text-xs text-muted-foreground">No store checks recorded for this store.</p>;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">Store checks</p>
      <ul className="space-y-0.5">
        {steps.map((s) => (
          <li key={s.id} className="flex gap-1.5 text-xs">
            {s.ok ? <Check className="w-3.5 h-3.5 text-green-600 shrink-0" /> : <X className="w-3.5 h-3.5 text-destructive shrink-0" />}
            <span>{s.label}{s.detail && <span className="text-muted-foreground"> · {s.detail}</span>}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}