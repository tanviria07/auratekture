import { RefreshCw, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { blockOf } from '@/lib/trust';

const PLAIN = {
  NOT_YOUR_CHECKOUT: 'This checkout belongs to someone else.',
  NO_CHECKOUT: 'Approve and sign a checkout first, then try again.',
  RATE_LIMITED: 'You have used all 10 attempts this hour. Try again later.',
  'Admins only': 'You need to be signed in as an admin for this.',
};

export default function TrustResult({ r, onRetry }) {
  if (!r) return null;
  const blocked = blockOf(r);
  if (blocked) return (
    <div data-testid="trust-blocked" className="rounded-lg p-3 text-sm bg-green-50 border border-green-200 text-green-900 space-y-1">
      <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4 text-green-600" />Blocked</p>
      <p>{blocked}</p>
      <p className="text-xs text-green-800/70 font-mono">{r.status} {r.data.error}</p>
      <p className="text-xs">No charge was sent to Visa.</p>
    </div>
  );
  const reason = PLAIN[r.data?.error] || (r.status ? 'Something went wrong on our side.' : 'The check timed out or the connection dropped.');
  return (
    <div data-testid="trust-error" className="rounded-lg p-3 text-sm bg-muted text-foreground space-y-2">
      <p className="font-semibold">Couldn't run this check</p>
      <p className="text-muted-foreground">{reason}</p>
      <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="w-3 h-3" />Try again</Button>
    </div>
  );
}