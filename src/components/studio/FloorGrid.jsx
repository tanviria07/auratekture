import { createElement as h, useRef, useState } from 'react';
import GridToolbar from './GridToolbar';
import GridMarker from './GridMarker';
import DensityNote from './DensityNote';
import SuggestedList from './SuggestedList';
import { suggestedLayout } from '@/lib/photoSuggestions';

const KIND = { outlet: 'outlets', exit: 'exits', heat: 'fixtures', window: 'fixtures' };

export default function FloorGrid({ width, depth, headcount, initial, analysis, onSave }) {
  const W = Math.max(Number(width) || 20, 1), D = Math.max(Number(depth) || 16, 1);
  const [layout, setLayout] = useState(() => {
    const fresh = !initial.exits?.length && !initial.fixtures?.length;
    const sug = fresh ? suggestedLayout(analysis, W, D) : { exits: [], fixtures: [] };
    return { outlets: initial.outlets || [], exits: fresh ? sug.exits : initial.exits, fixtures: fresh ? sug.fixtures : initial.fixtures };
  });
  const setMark = (kind, id, fn) => commit({ ...layout, [kind]: layout[kind].flatMap((m) => (m.id === id ? fn(m) : [m])) });
  const [tool, setTool] = useState('outlet');
  const [circuit, setCircuit] = useState('1');
  const [exitWidth, setExitWidth] = useState(3);
  const [heatType, setHeatType] = useState('fireplace');
  const svg = useRef(null), drag = useRef(null);

  const toFt = (e) => {
    const pt = svg.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse());
    const snap = (v, max) => Math.min(max, Math.max(0, Math.round(v * 2) / 2));
    return { x_ft: snap(p.x, W), z_ft: snap(p.y, D) };
  };
  const commit = (next) => { setLayout(next); onSave(next); };

  const place = (e) => {
    const pos = toFt(e), id = crypto.randomUUID().slice(0, 8);
    const item = tool === 'outlet' ? { id, ...pos, circuit_id: circuit } : tool === 'exit' ? { id, ...pos, width_ft: exitWidth }
      : { id, type: tool === 'window' ? 'window' : heatType, ...pos };
    commit({ ...layout, [KIND[tool]]: [...layout[KIND[tool]], item] });
  };
  const down = (kind, id) => (e) => { e.stopPropagation(); svg.current.setPointerCapture(e.pointerId); drag.current = { kind, id, moved: false }; };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    const pos = toFt(e); d.moved = true;
    setLayout((l) => ({ ...l, [d.kind]: l[d.kind].map((m) => (m.id === d.id ? { ...m, ...pos, suggested: false } : m)) }));
  };
  const up = () => {
    const d = drag.current; if (!d) return; drag.current = null;
    setLayout((l) => {
      const tapped = l[d.kind].find((m) => m.id === d.id);
      const next = d.moved || tapped?.suggested ? l : { ...l, [d.kind]: l[d.kind].filter((m) => m.id !== d.id) };
      onSave(next); return next;
    });
  };

  const lines = [];
  for (let x = 0; x <= W; x++) lines.push(h('line', { key: `x${x}`, x1: x, y1: 0, x2: x, y2: D, stroke: '#e5ddd0', strokeWidth: 0.04 }));
  for (let z = 0; z <= D; z++) lines.push(h('line', { key: `z${z}`, x1: 0, y1: z, x2: W, y2: z, stroke: '#e5ddd0', strokeWidth: 0.04 }));

  return (
    <div className="space-y-3">
      <GridToolbar {...{ tool, setTool, circuit, setCircuit, exitWidth, setExitWidth, heatType, setHeatType }} />
      {h('svg', { ref: svg, viewBox: `-0.5 -0.5 ${W + 1} ${D + 1}`, className: 'w-full max-h-[420px] rounded-2xl border bg-card touch-none select-none', onPointerMove: move, onPointerUp: up },
        h('rect', { x: 0, y: 0, width: W, height: D, fill: '#faf7f2', stroke: '#a8a29e', strokeWidth: 0.1, onPointerDown: place }),
        h('g', { pointerEvents: 'none' }, ...lines),
        h('text', { x: W / 2, y: -0.15, fontSize: 0.45, textAnchor: 'middle', fill: '#a8a29e' }, `Back wall · ${W} × ${D} ft`),
        ...['outlets', 'exits', 'fixtures'].flatMap((k) => layout[k].map((m) => h(GridMarker, { key: m.id, kind: k, m, W, onDown: down(k, m.id) }))))}
      <SuggestedList layout={layout} onConfirm={(k, id) => setMark(k, id, (m) => [{ ...m, suggested: false }])} onDismiss={(k, id) => setMark(k, id, () => [])} />
      <DensityNote W={W} D={D} headcount={Number(headcount)} hasOutlets={layout.outlets.length > 0} />
    </div>
  );
}