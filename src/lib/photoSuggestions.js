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

const WALLS = ['left', 'right', 'back', 'front'];
// Point at fraction t along a wall.
const wallPoint = (wall, t, W, D) => {
  const snap = (v) => Math.round(v * 2) / 2;
  if (wall === 'left') return { x_ft: 0, z_ft: snap(D * t) };
  if (wall === 'right') return { x_ft: W, z_ft: snap(D * t) };
  if (wall === 'front') return { x_ft: snap(W * t), z_ft: D };
  return { x_ft: snap(W * t), z_ft: 0 };
};

// Doors, windows and heat sources pre-placed on their wall, spread evenly when they share one. Never outlets.
export function suggestedLayout(analysis, W, D) {
  const all = [
    ...(analysis?.doors_and_windows || []).map((d, i) => ({ id: `sug-dw-${i}`, wall: d.wall, kind: /window/i.test(d.type) ? 'window' : 'door' })),
    ...(analysis?.heat_sources || []).map((hs, i) => ({ id: `sug-heat-${i}`, wall: hs.wall, kind: heatCategory(hs.label) })),
  ].map((s) => ({ ...s, wall: WALLS.includes(s.wall) ? s.wall : 'back' }));
  const exits = [], fixtures = [];
  for (const wall of WALLS) {
    const on = all.filter((s) => s.wall === wall);
    on.forEach((s, i) => {
      const pos = wallPoint(wall, (i + 1) / (on.length + 1), W, D);
      if (s.kind === 'door') exits.push({ id: s.id, width_ft: 3, ...pos, suggested: true });
      else fixtures.push({ id: s.id, type: s.kind, ...pos, suggested: true });
    });
  }
  return { exits, fixtures };
}

export const confirmedOnly = (list) => (list || []).filter((m) => !m.suggested);