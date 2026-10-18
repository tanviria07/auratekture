import { ShoppingBag } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import BasketGroups from '@/components/checkout/BasketGroups';
import CheckoutPanel from '@/components/checkout/CheckoutPanel';

export default function ShoppingList({ kit, eventId, budget, open, onOpenChange }) {
  const items = kit.filter((l) => l.product).map((l) => ({
    line_id: l.line_id, store: l.product.store, title: l.product.title, qty: l.qty || 1, unit_price_cents: Math.round(l.product.unit_price_usd * 100),
  }));
  const total = items.reduce((s, i) => s + i.unit_price_cents * i.qty, 0) / 100;
  if (!items.length) return null;
  return (
    <div className="space-y-4">
      <h2 className="text-xl">Shopping list</h2>
      <BasketGroups items={items} />
      {budget && <p className={`text-sm ${total > budget ? 'text-destructive font-medium' : 'text-muted-foreground'}`}>${total.toFixed(2)} of your ${budget} budget{total > budget && ' — over budget'}</p>}
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetTrigger asChild><Button className="w-full rounded-full" size="lg"><ShoppingBag className="w-4 h-4" />Checkout</Button></SheetTrigger>
        <SheetContent className="w-full sm:max-w-md overflow-y-auto">
          <SheetHeader><SheetTitle>Checkout</SheetTitle></SheetHeader>
          <div className="mt-6"><CheckoutPanel eventId={eventId} budget={budget} /></div>
        </SheetContent>
      </Sheet>
    </div>
  );
}