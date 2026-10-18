import { Check, AlertTriangle, HelpCircle } from 'lucide-react';
import { itemChecks } from '@/lib/itemChecks';
import { money } from '@/lib/trust';

const ICON = { true: [Check, 'text-green-600'], false: [AlertTriangle, 'text-amber-600'], null: [HelpCircle, 'text-muted-foreground'] };

// Why an item is in the plan, its checks, and the signed price.
export default function ItemWhy({ line, neededBy, signedCents }) {
  if (!line) return null;
  const checks = itemChecks(line, neededBy);
  return (
    <div className="text-xs text-muted-foreground space-y-1 pb-1">
      {line.reason && <p><span className="font-medium text-foreground">Why: </span>{line.reason}</p>}
      {checks.length > 0 && (
        <p className="flex flex-wrap gap-x-3 gap-y-1">
          {checks.map((c) => {
            const [I, cls] = ICON[String(c.ok)];
            return <span key={c.label} className="inline-flex items-center gap-1"><I className={`w-3 h-3 ${cls}`} />{c.label}</span>;
          })}
        </p>
      )}
      {signedCents != null && <p>Price when you signed: <span className="text-foreground">{money(signedCents)}</span></p>}
    </div>
  );
}