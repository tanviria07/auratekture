import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { fitBudget } from '../../shared/budget.ts';

// Maps venue-supplied options to kit categories they replace.
const VENUE_EXCLUDES: Record<string, string[]> = {
  'sound system': ['speaker'],
  'trash bins': ['trash_bin'],
  'power strips': ['power_strip'],
  'water': ['water_station'],
};

// Updates an existing background result when only already-here items or venue-supplied change.
// No new searches: drops/restores matching products and re-fits the budget from found alternatives.
export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { event_id, fingerprint } = await req.json();
    if (!event_id || !fingerprint) return Response.json({ error: 'event_id and fingerprint required' }, { status: 400 });

    const ev = await db.entities.Event.get(event_id);
    const p = ev.prefetch;
    if (!p || p.fingerprint !== fingerprint || p.status !== 'ready' || !p.all_kit_lines || !p.all_products) {
      return Response.json({ skipped: 'no_result' });
    }

    // Compute excluded categories from current venue-supplied and existing items.
    const excluded = new Set<string>();
    for (const opt of ev.venue_supplied?.options || []) {
      const cats = VENUE_EXCLUDES[String(opt).toLowerCase()];
      if (cats) cats.forEach((c) => excluded.add(c));
    }
    for (const item of ev.existing_items || []) {
      if (item.category) excluded.add(item.category);
    }

    // Filter the original kit lines and products by excluded categories.
    const activeLines = p.all_kit_lines.filter((l: any) => !excluded.has(l.category));
    const activeLineIds = new Set(activeLines.map((l: any) => l.line_id));
    const activeProducts = p.all_products.filter((pr: any) => activeLineIds.has(pr.line_id));

    // Detect whether the active product set changed from what's currently stored.
    const oldLineIds = new Set((p.kit_lines || []).map((l: any) => l.line_id));
    let productsChanged = activeLineIds.size !== oldLineIds.size;
    if (!productsChanged) {
      for (const id of activeLineIds) { if (!oldLineIds.has(id)) { productsChanged = true; break; } }
    }

    // Re-fit budget on the active products (plain code, no AI call).
    const products = activeProducts.map((pr: any) => ({ ...pr }));
    const { choices } = fitBudget(products, activeLines, ev.budget_cents);

    // If products changed, rotate the prefetch id so the old background picture is discarded.
    const newId = productsChanged ? crypto.randomUUID() : p.id;
    const update: any = { ...p, id: newId, kit_lines: activeLines, products, product_choices: choices };
    update.image = productsChanged ? null : p.image;
    await db.entities.Event.update(event_id, { prefetch: update });

    return Response.json({ productsChanged, fingerprint });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}