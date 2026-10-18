import { useState } from 'react';
import { Loader2, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { createMandate, call } from '@/lib/trust';
import { auraStore } from '@/lib/auraStore';

const PLAIN = {
  MANDATE_TAMPER_BLOCKED: 'Blocked: the price changed after you signed.',
  AGENT_SIGNATURE_INVALID: 'Blocked: the checkout request was altered after the agent signed it.',
};

function Banner({ r }) {
  if (!r) return null;
  const blocked = r.status === 403 || r.status === 401;
  if (!blocked) return <div className="rounded-lg p-3 text-sm bg-muted"><b>{r.status} {r.data?.error}</b>{r.data?.reason && ` — ${r.data.reason}`}</div>;
  return (
    <div className="rounded-lg p-3 text-sm bg-green-50 border border-green-200 text-green-900 space-y-1">
      <p className="flex items-center gap-2 font-semibold"><ShieldCheck className="w-4 h-4 text-green-600" />Blocked</p>
      <p>{PLAIN[r.data?.error] || 'Blocked: the attempt was stopped.'}</p>
      <p className="text-xs text-green-800/70 font-mono">{r.status} {r.data?.error}</p>
      <p className="text-xs">No charge was sent to Visa.</p>
    </div>
  );
}

const report = (kind, status, data) => {
  const blocked = status === 401 || status === 403;
  const c = auraStore.get().checkout || {};
  const trust = { ...(c.trust || {}), [kind]: { blocked, code: `${status} ${data?.error || ''}`.trim(), meaning: blocked ? PLAIN[data?.error] : data?.reason || null, sent_to_visa: !blocked ? 'unknown' : false } };
  auraStore.set({ checkout: { ...c, trust, ...(blocked && { blocked: true }) } });
};

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
    report('price_changed_after_signing', r.status, r.data);
  };

  const agentTamper = async () => {
    setBusy('agent'); setRes(null);
    const r = await call('agentTamperTest', {});
    const status = r.data?.merchant_status ?? r.status;
    const data = r.data?.merchant_body || r.data;
    setRes({ status, data });
    report('checkout_signature_tampered', status, data);
    setBusy('');
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div>
        <p className="font-medium">Trust check</p>
        <p className="text-sm text-muted-foreground">Try to cheat the payment. Each attempt should be blocked.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={priceTamper}>{busy === 'price' && <Loader2 className="w-3 h-3 animate-spin" />}Change a price after signing (+$50)</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={agentTamper}>{busy === 'agent' && <Loader2 className="w-3 h-3 animate-spin" />}Tamper with the checkout signature</Button>
      </div>
      <Banner r={res} />
    </div>
  );
}