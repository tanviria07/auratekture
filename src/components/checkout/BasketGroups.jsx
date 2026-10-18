import { money } from '@/lib/trust';

import ItemWhy from './ItemWhy';

export default function BasketGroups({ items, lines, neededBy, signed }) {
  const groups = {};
  items.forEach((i) => (groups[i.store] = groups[i.store] || []).push(i));
  const total = items.reduce((s, i) => s + i.unit_price_cents * i.qty, 0);
  return (
    <div className="space-y-5">
      {Object.entries(groups).map(([store, list]) => (
        <div key={store} className="rounded-xl border p-4">
          <p className="font-medium mb-2">{store}</p>
          {list.map((i) => (
            <div key={i.line_id} className="py-1">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">{i.qty} × {i.title}</span>
                <span>{money(i.unit_price_cents * i.qty)}</span>
              </div>
              {lines && <ItemWhy line={lines[i.line_id]} neededBy={neededBy} signedCents={signed?.[i.line_id]} />}
            </div>
          ))}
          <div className="flex justify-between text-sm border-t mt-2 pt-2 font-medium">
            <span>Subtotal</span><span>{money(list.reduce((s, i) => s + i.unit_price_cents * i.qty, 0))}</span>
          </div>
        </div>
      ))}
      <div className="flex justify-between text-lg font-heading"><span>Total</span><span>{money(total)}</span></div>
    </div>
  );
}