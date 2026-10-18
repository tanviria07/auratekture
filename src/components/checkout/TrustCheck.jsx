import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createMandate, call } from '@/lib/trust';

function Banner({ r }) {
  if (!r) return null;
  const blocked = r.status === 403 || r.status === 401;
  return (
    <div className={`rounded-lg p-3 text-sm ${blocked ? 'bg-destructive text-destructive-foreground' : 'bg-muted'}`}>
      <b>{r.status} {r.data?.error}</b>{r.data?.reason && ` — ${r.data.reason}`}
    </div>
  );
}

export default function TrustCheck({ basket, eventId, capCents }) {
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState(null);

  const priceTamper = async () => {
    setBusy('price'); setRes(null);
    const mandate = await createMandate(eventId, basket.items, capCents);
    const original = basket.items;
    await base44.entities.Basket.update(basket.id, { items: original.map((it, i) => (i === 0 ? { ...it, unit_price_cents: it.unit_price_cents + 5000 } : it)) });
    const r = await call('authorizeBasket', { mandate_id: mandate.id });
    await base44.entities.Basket.update(basket.id, { items: original });
    setRes(r); setBusy('');
  };

  const agentTamper = async () => {
    setBusy('agent'); setRes(null);
    const r = await call('agentTamperTest', {});
    setRes({ status: r.data?.merchant_status ?? r.status, data: r.data?.merchant_body || r.data });
    setBusy('');
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <p className="font-medium">Trust check</p>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={priceTamper}>{busy === 'price' && <Loader2 className="w-3 h-3 animate-spin" />}Change a price after signing (+$50)</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={agentTamper}>{busy === 'agent' && <Loader2 className="w-3 h-3 animate-spin" />}Tamper with the checkout signature</Button>
      </div>
      <Banner r={res} />
    </div>
  );
}