import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { createMandate, call, blockOf } from '@/lib/trust';
import { auraStore } from '@/lib/auraStore';
import { getVisitorId } from '@/lib/visitor';
import TrustResult from './TrustResult';

const NAMES = { price: 'price_changed_after_signing', agent: 'checkout_signature_tampered', replay: 'old_request_replayed' };

const report = (kind, r) => {
  const meaning = blockOf(r);
  const c = auraStore.get().checkout || {};
  const result = meaning
    ? { blocked: true, code: `${r.status} ${r.data.error}`, meaning, sent_to_visa: false }
    : { blocked: false, could_not_run: true, code: `${r.status || ''} ${r.data?.error || ''}`.trim() };
  auraStore.set({ checkout: { ...c, trust: { ...(c.trust || {}), [NAMES[kind]]: result }, ...(meaning && { blocked: true }) } });
};

export default function TrustCheck({ basket, eventId, capCents }) {
  const [busy, setBusy] = useState('');
  const [res, setRes] = useState({});

  const run = async (kind) => {
    setBusy(kind); setRes((p) => ({ ...p, [kind]: null }));
    const payload = { kind, event_id: eventId, visitor_id: getVisitorId() };
    if (kind === 'price') payload.mandate_id = (await createMandate(eventId, basket.items, capCents)).id;
    const r = await call('trustCheck', payload);
    setRes((p) => ({ ...p, [kind]: { ...r, kind } })); report(kind, r); setBusy('');
  };

  return (
    <div className="rounded-xl border p-4 space-y-3">
      <div>
        <p className="font-medium">Trust check</p>
        <p className="text-sm text-muted-foreground">Try to cheat the payment. Each attempt should be blocked.</p>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run('price')}>{busy === 'price' && <Loader2 className="w-3 h-3 animate-spin" />}Change a price after signing (+$50)</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run('agent')}>{busy === 'agent' && <Loader2 className="w-3 h-3 animate-spin" />}Tamper with the checkout signature</Button>
        <Button size="sm" variant="outline" disabled={!!busy} onClick={() => run('replay')}>{busy === 'replay' && <Loader2 className="w-3 h-3 animate-spin" />}Replay an old payment request</Button>
      </div>
      {['price', 'agent', 'replay'].map((k) => <TrustResult key={k} r={res[k]} onRetry={() => run(k)} />)}
    </div>
  );
}