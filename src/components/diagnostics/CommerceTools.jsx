import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { call } from '@/lib/trust';

const SAMPLE_ITEMS = [
  { line_id: 'l1', store: 'Home Depot', title: '6 ft folding table', product_url: 'https://www.homedepot.com', unit_price_cents: 4999, qty: 1 },
  { line_id: 'l2', store: 'Home Depot', title: 'Outdoor extension cord', product_url: 'https://www.homedepot.com', unit_price_cents: 1299, qty: 2 },
  { line_id: 'l3', store: 'Amazon', title: 'Warm white string lights', product_url: 'https://www.amazon.com', unit_price_cents: 2499, qty: 1 },
];

export default function CommerceTools() {
  const [busy, setBusy] = useState('');
  const [basketMsg, setBasketMsg] = useState('');
  const [visa, setVisa] = useState(null);

  const loadBasket = async () => {
    setBusy('basket');
    const { items } = await base44.entities.Event.filter({}, { sort: '-updated_date', limit: 1 });
    if (!items[0]) setBasketMsg('Create a room first.');
    else {
      const total_cents = SAMPLE_ITEMS.reduce((s, i) => s + i.unit_price_cents * i.qty, 0);
      await base44.entities.Basket.create({ event_id: items[0].id, items: SAMPLE_ITEMS, total_cents, status: 'open' });
      setBasketMsg(`Sample basket ($${(total_cents / 100).toFixed(2)}) added to "${items[0].name}".`);
    }
    setBusy('');
  };

  const testVisa = async () => {
    setBusy('visa'); setVisa(null);
    const r = await call('testVisa', {});
    setVisa(r.data); setBusy('');
  };

  return (
    <section className="rounded-2xl border bg-card p-8 space-y-4">
      <h2 className="text-xl">Checkout</h2>
      <div className="flex flex-wrap gap-3">
        <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={loadBasket}>{busy === 'basket' && <Loader2 className="w-4 h-4 animate-spin" />}Load sample basket</Button>
        <Button variant="outline" className="rounded-full" disabled={!!busy} onClick={testVisa}>{busy === 'visa' && <Loader2 className="w-4 h-4 animate-spin" />}Test Visa sandbox</Button>
      </div>
      {basketMsg && <p className="text-sm text-muted-foreground">{basketMsg}</p>}
      {visa && (
        <div className="text-sm rounded-lg bg-muted p-3 space-y-1">
          {visa.error ? <p className="text-destructive">{visa.error}</p> : <>
            <p><span className="text-muted-foreground">HTTP status:</span> {visa.httpStatus}</p>
            <p><span className="text-muted-foreground">Visa status:</span> {visa.status}</p>
            <p><span className="text-muted-foreground">Response time:</span> {visa.ms} ms</p>
            {visa.status !== 'AUTHORIZED' && <pre className="text-xs font-mono whitespace-pre-wrap break-all">{visa.summary}</pre>}
          </>}
        </div>
      )}
    </section>
  );
}