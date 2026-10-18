import { base44 } from '@/api/base44Client';

// Runs findProducts and reports "done/total" progress while it searches.
export async function findProducts(eventId, onProgress) {
  const progress_id = crypto.randomUUID();
  const t = setInterval(async () => {
    const { items } = await base44.entities.CreaoRun.filter({ job_group: progress_id }, { limit: 1, fields: ['result_text'] });
    if (items[0]?.result_text) onProgress(items[0].result_text);
  }, 1500);
  const r = await base44.functions.invoke('findProducts', { event_id: eventId, progress_id })
    .then((res) => res.data).catch((e) => ({ error: e.response?.data?.error || e.message }));
  clearInterval(t);
  return r;
}

// Builds or replaces the room's basket from the chosen products.
export async function syncBasket(eventId, kit) {
  const items = kit.filter((l) => l.product).map((l) => ({
    line_id: l.line_id, store: l.product.store, title: l.product.title, product_url: l.product.product_url,
    unit_price_cents: Math.round(l.product.unit_price_usd * 100), qty: l.qty || 1,
  }));
  const data = { event_id: eventId, items, total_cents: items.reduce((s, i) => s + i.unit_price_cents * i.qty, 0), status: 'open' };
  const { items: [b] } = await base44.entities.Basket.filter({ event_id: eventId }, { sort: '-created_date', limit: 1 });
  return b ? base44.entities.Basket.update(b.id, data) : base44.entities.Basket.create(data);
}