import { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { createMandate, call, blockOf } from '@/lib/trust';
import BasketGroups from './BasketGroups';
import Receipt from './Receipt';
import { auraStore } from '@/lib/auraStore';
import TrustCheck from './TrustCheck';

export default function CheckoutPanel({ eventId, budget }) {
  const { data: basket, isLoading } = useQuery({
    queryKey: ['basket', eventId],
    queryFn: () => base44.entities.Basket.filter({ event_id: eventId }, { sort: '-created_date', limit: 1 }).then((p) => p.items[0] || null),
    enabled: !!eventId,
  });
  const [cap, setCap] = useState(budget ?? '');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  useEffect(() => setCap(budget ?? ''), [budget]);
  const capCents = Math.round(Number(cap || 0) * 100);

  const approve = async () => {
    setBusy(true); setError(null); setReceipt(null);
    const mandate = await createMandate(eventId, basket.items, capCents);
    const r = await call('authorizeBasket', { mandate_id: mandate.id });
    if (r.status === 200) {
      setReceipt(r.data);
      auraStore.set({ checkout: { paid: true, receipt_total: r.data.authorizations.reduce((s, a) => s + a.amount_cents, 0) / 100 } });
    } else {
      setError(r);
      if (blockOf(r)) auraStore.set({ checkout: { blocked: true } });
    }
    setBusy(false);
  };

  if (!eventId) return <p className="text-sm text-muted-foreground">Save this room first.</p>;
  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  if (!basket?.items?.length) return <p className="text-sm text-muted-foreground">No basket for this room yet.</p>;

  return (
    <div className="space-y-6">
      <BasketGroups items={basket.items} />
      <div className="space-y-2">
        <Label>Spending cap ($)</Label>
        <Input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} />
      </div>
      <Button className={`w-full rounded-full ${!receipt && !busy && capCents ? 'ring-4 ring-primary/40 shadow-[0_0_24px_hsl(var(--primary))] animate-pulse' : ''}`} onClick={approve} disabled={busy || !capCents}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}Approve and sign
      </Button>
      {error && <div className="rounded-lg p-3 text-sm bg-destructive text-destructive-foreground"><b>{error.status} {error.data?.error}</b>{error.data?.reason && ` — ${error.data.reason}`}</div>}
      {receipt && <Receipt receipt={receipt} />}
      <TrustCheck basket={basket} eventId={eventId} capCents={capCents} />
    </div>
  );
}