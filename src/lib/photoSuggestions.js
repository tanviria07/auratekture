import { CATEGORIES } from '@/lib/categories';

const heatCategory = (label = '') => (/fire/i.test(label) ? 'fireplace' : 'heater');
const keyOf = (it) => (it.label || CATEGORIES[it.category]?.label || it.category || '').toLowerCase().trim().replace(/s$/, '');

// One chip per thing: duplicates (same label) merge, keeping the larger count.
export function mergeItems(list) {
  const out = [];
  for (const it of list || []) {
    const m = out.find((o) => keyOf(o) === keyOf(it));
    if (m) { m.count = Math.max(m.count || 1, it.count || 1); m.heat_source = m.heat_source || it.heat_source; }
    else out.push({ ...it, count: it.count || 1 });
  }
  return out;
}

// Chips from the photo analysis: contents, heat sources, doors and windows.
export function mergeDetectedItems(analysis) {
  if (!analysis) return [];
  const items = mergeItems(analysis.existing_items);
  for (const hs of analysis.heat_sources || []) {
    const category = heatCategory(hs.label);
    const match = items.find((it) => it.category === category);
    if (match) match.heat_source = true;
    else items.push({ category, label: CATEGORIES[category].label, count: 1, heat_source: true });
  }
  const dw = (analysis.doors_and_windows || []).map((d) => (/window/i.test(d.type) ? 'window' : 'door'));
  for (const k of ['door', 'window']) {
    const n = dw.filter((x) => x === k).length;
    if (n) items.push({ category: k, label: CATEGORIES[k].label, count: n });
  }
  return mergeItems(items);
}