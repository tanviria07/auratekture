import { lineName, productPrice } from '@/lib/kit';
import { safetyChecks } from '@/lib/safety';

// Compact page summary Aura receives on topic "context".
export function auraContext({ facts, design, numbered, chosen, venue }) {
  const step = !facts.photo_url ? 'add_photo' : design.busy ? 'designing' : chosen.length ? 'results' : 'room_details';
  const items = numbered.map((x) => ({ number: x.n, name: lineName(x.line), store: x.line.product?.store, price: productPrice(x.line.product) }));
  const total = Math.round(chosen.reduce((s, l) => s + (l.product.unit_price_usd || 0) * (l.qty || 1), 0) * 100) / 100;
  const warnings = chosen.length ? safetyChecks(chosen, facts.ceiling_ft).filter((c) => c.ok !== true).map((c) => c.label) : [];
  return {
    step, purpose: facts.room_purpose || null, ceiling_ft: facts.ceiling_ft || null, budget: facts.budget || null,
    needed_by: facts.deadline || null, theme: facts.theme || null, already_here: [...(venue?.options || []), venue?.other].filter(Boolean),
    design_progress: design.error || null, items, total, warnings,
  };
}