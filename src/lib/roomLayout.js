import { CATEGORIES } from '@/lib/categories';

// Grid coords: x 0..W left→right, z 0..D back→front. 3D coords are centered on the room.
export function nearestWall(x, z, W, D) {
  const d = { left: x, right: W - x, back: z, front: D - z };
  return Object.keys(d).reduce((a, b) => (d[a] <= d[b] ? a : b));
}

// Position + Y rotation for something of thickness t flush against its nearest wall.
export function onWall(x, z, W, D, t) {
  const wall = nearestWall(x, z, W, D), X = x - W / 2, Z = z - D / 2;
  if (wall === 'back') return { pos: [X, -D / 2 + t / 2], rot: 0 };
  if (wall === 'front') return { pos: [X, D / 2 - t / 2], rot: 0 };
  return { pos: [wall === 'left' ? -W / 2 + t / 2 : W / 2 - t / 2, Z], rot: Math.PI / 2 };
}

// Tidy default arrangement: back wall left→right, then left wall, then right wall. Rugs go center.
export function layoutItems(items, W, D) {
  const out = [];
  let back = -W / 2 + 0.5, left = -D / 2 + 4, right = -D / 2 + 4;
  (items || []).forEach((it, i) => {
    for (let n = 0; n < (it.count || 1); n++) {
      const c = CATEGORIES[it.category] || CATEGORIES.other;
      const w = c.w / 12, d = c.d / 12, ht = Math.max(c.h / 12, 0.05);
      const base = { id: `${i}-${n}`, label: 'Already here', title: it.label || c.label, color: '#9ca3af' };
      if (it.category === 'rug') out.push({ ...base, pos: [0, 0], size: [w, ht, d] });
      else if (back + w <= W / 2 - 0.5) { out.push({ ...base, pos: [back + w / 2, -D / 2 + d / 2 + 0.1], size: [w, ht, d] }); back += w + 1; }
      else if (left + w <= D / 2 - 0.5) { out.push({ ...base, pos: [-W / 2 + d / 2 + 0.1, left + w / 2], size: [w, ht, d], rot: Math.PI / 2 }); left += w + 1; }
      else if (right + w <= D / 2 - 0.5) { out.push({ ...base, pos: [W / 2 - d / 2 - 0.1, right + w / 2], size: [w, ht, d], rot: Math.PI / 2 }); right += w + 1; }
      else out.push({ ...base, pos: [0, 0], size: [w, ht, d] });
    }
  });
  return out;
}