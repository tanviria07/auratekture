import { AlertTriangle, Info } from 'lucide-react';
import { money } from '@/lib/trust';
import { deliveryStatus } from '@/lib/delivery';

// Plain summary of what the user is about to sign.
export default function SignSummary({ items, capCents, lines, neededBy }) {
  const stores = [...new Set(items.map((i) => i.store))];
  const count = items.reduce((s, i) => s + i.qty, 0);
  const status = items.map((i) => ({ i, d: deliveryStatus(lines?.[i.line_id]?.product, neededBy) }));
  const late = status.filter((x) => x.d?.key === 'late');
  const unknown = status.filter((x) => x.d?.key === 'unknown');
  return (
    <div className="space-y-2 text-xs">
      <div className="rounded-lg border bg-muted/50 p-3 space-y-1">
        <p className="text-sm">You're approving up to <b>{money(capCents)}</b> for <b>{count} item{count === 1 ? '' : 's'}</b> from {stores.join(', ')}.</p>
        <p className="text-muted-foreground">Valid for 15 minutes · Can be used once</p>
      </div>
      {late.length > 0 && (
        <p className="rounded-lg bg-amber-100 text-amber-900 p-2 flex gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span><b>Might be late:</b> {late.map((x) => x.i.title).join(', ')} may arrive after {neededBy}.</span>
        </p>
      )}
      {unknown.length > 0 && (
        <p className="text-muted-foreground flex gap-1.5">
          <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>Delivery date not listed for {unknown.map((x) => x.i.title).join(', ')}.</span>
        </p>
      )}
    </div>
  );
}