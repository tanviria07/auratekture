import { useState } from 'react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/lib/AuthContext';
import { findProducts } from '@/lib/shop';
import ShopActions from './ShopActions';
import KitCard from './KitCard';

export default function ShopStep({ eventId, kit, facts, budget, onApply, onSwap }) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState('');
  const [error, setError] = useState('');
  const total = kit.reduce((s, l) => s + (l.product ? l.product.unit_price_usd * (l.qty || 1) : 0), 0);

  const find = async () => {
    setBusy(true); setError(''); setProgress(`0/${kit.length}`);
    const r = await findProducts(eventId, setProgress);
    if (r.error) setError(r.error);
    else await onApply({ products: r.products, products_at: r.products_at, products_source: 'live', product_choices: {} });
    setBusy(false);
  };
  const saveDemo = async () => { await onApply({ demo_run: { products: facts.products, products_at: facts.products_at } }); toast({ title: 'Saved as demo run' }); };
  const loadDemo = () => onApply({ ...facts.demo_run, products_source: 'demo', product_choices: {} });

  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <h2 className="text-xl">Shop</h2>
        {facts.products_source === 'demo' && <span className="text-xs rounded-full bg-accent text-accent-foreground px-2 py-0.5">Saved run</span>}
      </div>
      <ShopActions hasKit={kit.length > 0} busy={busy} progress={progress} hasProducts={!!facts.products?.length} hasDemo={!!facts.demo_run?.products}
        isAdmin={user?.role === 'admin'} onFind={find} onSaveDemo={saveDemo} onLoadDemo={loadDemo} />
      {error && !busy && <p className="text-sm text-destructive">{error}</p>}
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">{kit.map((l) => <KitCard key={l.line_id} line={l} onSwap={onSwap} />)}</div>
      {facts.products?.length > 0 && (
        <div className="flex flex-wrap justify-between gap-2 text-sm">
          <p className="text-muted-foreground">Prices and availability from Google Shopping via SerpApi, as of {new Date(facts.products_at).toLocaleString()}.</p>
          <p className={budget && total > budget ? 'text-destructive font-medium' : 'font-medium'}>Basket ${total.toFixed(2)}{budget ? ` of $${budget} budget` : ''}</p>
        </div>
      )}
    </section>
  );
}