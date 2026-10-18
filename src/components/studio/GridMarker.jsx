import { createElement as h } from 'react';

export const CIRCUIT_COLORS = { 1: '#2563eb', 2: '#7c3aed', 3: '#0891b2' };

// One placed thing on the floor grid, drawn in feet units.
export default function GridMarker({ kind, m, W, onDown }) {
  const p = { onPointerDown: onDown, style: { cursor: 'grab' } };
  if (kind === 'outlets') return h('g', p,
    h('circle', { cx: m.x_ft, cy: m.z_ft, r: 0.45, fill: CIRCUIT_COLORS[m.circuit_id] || '#2563eb' }),
    h('text', { x: m.x_ft, y: m.z_ft + 0.2, fontSize: 0.55, textAnchor: 'middle', fill: '#fff' }, m.circuit_id));
  if (kind === 'exits') {
    const vertical = m.x_ft <= 1 || m.x_ft >= W - 1, w = m.width_ft || 3;
    return h('rect', { ...p, x: vertical ? m.x_ft - 0.25 : m.x_ft - w / 2, y: vertical ? m.z_ft - w / 2 : m.z_ft - 0.25, width: vertical ? 0.5 : w, height: vertical ? w : 0.5, fill: '#16a34a', rx: 0.1 });
  }
  const heat = m.type !== 'window';
  return h('rect', { ...p, x: m.x_ft - 0.6, y: m.z_ft - 0.6, width: 1.2, height: 1.2, rx: heat ? 0.15 : 0.6, fill: heat ? '#ea580c' : '#38bdf8' });
}