import { useEffect, useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Loader2, ShieldCheck, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { base44 } from '@/api/base44Client';
import { createMandate, call, blockOf, plainReason, isAuthorized } from '@/lib/trust';
import BasketGroups from './BasketGroups';
import Receipt from './Receipt';
import { auraStore } from '@/lib/auraStore';
import TrustCheck from './TrustCheck';

export default function CheckoutPanel({ eventId, budget }) {
  const qc = useQueryClient();
  const { data: basket, isLoading } = useQuery({
    queryKey: ['basket', eventId],
    queryFn: () => base44.entities.Basket.filter({ event_id: eventId }, { sort: '-created_date', limit: 1 }).then((p) => p.items[0] || null),
    enabled: !!eventId,
  });
  const [cap, setCap] = useState(budget ?? '');
  const [busy, setBusy] = useState(false);
  const [receipt, setReceipt] = useState(null);
  const [error, setError] = useState(null);
  const [mandateId, setMandateId] = useState(null);
  useEffect(() => setCap(budget ?? ''), [budget]);
  const capCents = Math.round(Number(cap || 0) * 100);

  const finish = (data) => {
    const auths = data.authorizations || [];
    const ok = auths.filter(isAuthorized);
    const failed = auths.filter((a) => !isAuthorized(a));
    setReceipt(data);
    if (!failed.length) {
      const total = ok.reduce((s, a) => s + a.amount_cents, 0) / 100;
      auraStore.set({ checkout: { paid: true, partial: null, receipt_total: total } });
    } else {
      const failedSummary = failed.map((a) => ({ store: a.store, reason: plainReason(a) }));
      auraStore.set({ checkout: { paid: false, partial: { authorized: ok.length, total: auths.length, failed: failedSummary } } });
    }
  };

  const authorize = async (mid) => {
    setBusy(true); setError(null);
    const r = await call('authorizeBasket', { mandate_id: mid });
    if (r.status === 200) finish(r.data);
    else { setError(r); if (blockOf(r)) auraStore.set({ checkout: { blocked: true } }); }
    setBusy(false);
    qc.invalidateQueries({ queryKey: ['basket', eventId] });
  };

  const approve = async () => {
    setBusy(true); setError(null); setReceipt(null);
    const mandate = await createMandate(eventId, basket.items, capCents);
    setMandateId(mandate.id);
    await authorize(mandate.id);
  };

  const retry = async () => { if (mandateId) await authorize(mandateId); };

  if (!eventId) return <p className="text-sm text-muted-foreground">Save this room first.</p>;
  if (isLoading) return <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />;
  if (!basket?.items?.length) return <p className="text-sm text-muted-foreground">No basket for this room yet.</p>;

  const partial = !busy && receipt && receipt.authorizations.some((a) => !isAuthorized(a));
  const failedStores = partial ? receipt.authorizations.filter((a) => !isAuthorized(a)) : [];

  return (
    <div className="space-y-6">
      <BasketGroups items={basket.items} />
      <div className="space-y-2">
        <Label>Spending cap ($)</Label>
        <Input type="number" min={0} value={cap} onChange={(e) => setCap(e.target.value)} />
        <p className="text-xs text-muted-foreground">Valid for 15 minutes · Can be used once</p>
      </div>
      <Button className={`w-full rounded-full ${!receipt && !busy && capCents ? 'ring-4 ring-primary/40 shadow-[0_0_24px_hsl(var(--primary))] animate-pulse' : ''}`} onClick={approve} disabled={busy || !capCents}>
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}Approve and sign
      </Button>
      {error && <div className="rounded-lg p-3 text-sm bg-destructive text-destructive-foreground"><b>{error.status} {error.data?.error}</b>{error.data?.reason && ` — ${error.data.reason}`}</div>}
      {partial && (
        <div className="rounded-xl border p-4 space-y-3 bg-accent/40">
          <p className="font-medium">{failedStores.length} of {receipt.authorizations.length} stores could not be authorized</p>
          <ul className="space-y-1 text-sm">
            {failedStores.map((a) => (
              <li key={a.id}><b>{a.store}</b> — {plainReason(a)}</li>
            ))}
          </ul>
          <Button variant="outline" onClick={retry} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}Retry failed stores
          </Button>
        </div>
      )}
      {receipt && <Receipt receipt={receipt} />}
      <TrustCheck basket={basket} eventId={eventId} capCents={capCents} />
    </div>
  );
}