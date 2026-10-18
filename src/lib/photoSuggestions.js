import { CATEGORIES } from '@/lib/categories';

const heatCategory = (label = '') => (/fire/i.test(label) ? 'fireplace' : 'heater');

// existing_items plus detected heat sources, merging the same thing found in both lists.
export function mergeDetectedItems(analysis) {
  if (!analysis) return null;
  const items = (analysis.existing_items || []).map((it) => ({ ...it }));
  for (const hs of analysis.heat_sources || []) {
    const category = heatCategory(hs.label);
    const match = items.find((it) => it.category === category);
    if (match) match.heat_source = true;
    else items.push({ category, label: hs.label || CATEGORIES[category]?.label, count: 1, confidence: 0.8, heat_source: true });
  }
  return items;
}

const wallCenter = (wall, W, D) => ({ left: [0, D / 2], right: [W, D / 2], back: [W / 2, 0], front: [W / 2, D] }[wall] || [W / 2, 0]);

// Doors, windows and heat sources pre-placed at the center of their wall. Never outlets.
export function suggestedLayout(analysis, W, D) {
  const exits = [], fixtures = [];
  const at = (wall) => { const [x, z] = wallCenter(wall, W, D); return { x_ft: x, z_ft: z }; };
  (analysis?.doors_and_windows || []).forEach((d, i) => {
    const id = `sug-dw-${i}`;
    if (/window/i.test(d.type)) fixtures.push({ id, type: 'window', ...at(d.wall), suggested: true });
    else exits.push({ id, width_ft: 3, ...at(d.wall), suggested: true });
  });
  (analysis?.heat_sources || []).forEach((hs, i) => fixtures.push({ id: `sug-heat-${i}`, type: heatCategory(hs.label), ...at(hs.wall), suggested: true }));
  return { exits, fixtures };
}

export const confirmedOnly = (list) => (list || []).filter((m) => !m.suggested);