// Fit the basket to budget: switch expensive items to cheaper alternatives,
// then drop low-impact optional items. Pure code, no AI calls.
export function fitBudget(products: any[], lines: any[], budgetCents: number) {
  if (!budgetCents) return { products, choices: {} };
  const budget = budgetCents / 100;
  const requiredCats = new Set(['christmas_tree', 'string_lights']);
  const lineMap = new Map(lines.map((l) => [l.line_id, l]));
  const choices: Record<string, number> = {};

  const selected = (p: any) => {
    const idx = choices[p.line_id] || 0;
    return idx === 0 ? p : (p.alternatives || [])[idx - 1] || p;
  };
  const total = () => products.filter((p) => p.status === 'found')
    .reduce((s, p) => s + selected(p).unit_price_usd * (p.qty || 1), 0);

  // Step 1: Switch expensive items to cheaper alternatives
  if (total() > budget) {
    const found = products.filter((p) => p.status === 'found')
      .sort((a, b) => selected(b).unit_price_usd - selected(a).unit_price_usd);
    for (const p of found) {
      if (total() <= budget) break;
      const alts = (p.alternatives || [])
        .map((a, i) => ({ a, i: i + 1 }))
        .filter(({ a }) => a.unit_price_usd < selected(p).unit_price_usd)
        .sort((x, y) => x.a.unit_price_usd - y.a.unit_price_usd);
      if (alts.length) choices[p.line_id] = alts[0].i;
    }
  }

  // Step 2: Drop lowest-impact optional items (never tree or lights)
  if (total() > budget) {
    const droppable = products.filter((p) => p.status === 'found')
      .filter((p) => !requiredCats.has(lineMap.get(p.line_id)?.category || ''))
      .sort((a, b) => (lineMap.get(a.line_id)?.weight || 1) - (lineMap.get(b.line_id)?.weight || 1));
    for (const p of droppable) {
      if (total() <= budget) break;
      const idx = products.findIndex((pr) => pr.line_id === p.line_id);
      products[idx] = { line_id: p.line_id, status: 'dropped', reason: 'Dropped to fit budget', qty: p.qty };
    }
  }

  return { products, choices };
}