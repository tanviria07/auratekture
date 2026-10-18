import { createElement as h, useEffect, useRef, useState } from 'react';
import GridToolbar from './GridToolbar';
import GridMarker from './GridMarker';
import DensityNote from './DensityNote';
import SuggestedList from './SuggestedList';
import { useSize } from '@/hooks/use-size';
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
  const size = useSize(svg);
  // 14px radius (28px target) converted to feet at the current render scale.
  const scale = size ? Math.min(size.width / (W + 2), size.height / (D + 2.6)) : 30;
  const hit = Math.max(14 / scale, 0.6);

  const toFt = (e) => {
    const pt = svg.current.createSVGPoint(); pt.x = e.clientX; pt.y = e.clientY;
    const p = pt.matrixTransform(svg.current.getScreenCTM().inverse());
    const snap = (v, max) => Math.min(max, Math.max(0, Math.round(v * 2) / 2));
    return { x_ft: snap(p.x, W), z_ft: snap(p.y, D) };
  };
  const layoutRef = useRef(layout); layoutRef.current = layout;
  const saveTimer = useRef(null), lastSaved = useRef(JSON.stringify(layout)), frame = useRef(0);
  // One debounced save, skipped when nothing changed.
  const scheduleSave = (next) => {
    clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      const json = JSON.stringify(next);
      if (json === lastSaved.current) return;
      lastSaved.current = json; onSave(next);
    }, 400);
  };
  useEffect(() => () => { clearTimeout(saveTimer.current); cancelAnimationFrame(frame.current); }, []);
  const commit = (next) => { setLayout(next); scheduleSave(next); };

  const place = (e) => {
    const pos = toFt(e), id = crypto.randomUUID().slice(0, 8);
    const item = tool === 'outlet' ? { id, ...pos, circuit_id: circuit } : tool === 'exit' ? { id, ...pos, width_ft: exitWidth }
      : { id, type: tool === 'window' ? 'window' : heatType, ...pos };
    commit({ ...layout, [KIND[tool]]: [...layout[KIND[tool]], item] });
  };
  const down = (kind, id) => (e) => { e.stopPropagation(); svg.current.setPointerCapture(e.pointerId); drag.current = { kind, id, moved: false }; };
  const move = (e) => {
    const d = drag.current; if (!d) return;
    d.pos = toFt(e);
    if (frame.current) return;
    frame.current = requestAnimationFrame(() => {
      frame.current = 0;
      const cur = drag.current; if (!cur?.pos) return;
      const m0 = layoutRef.current[cur.kind].find((m) => m.id === cur.id);
      if (m0 && m0.x_ft === cur.pos.x_ft && m0.z_ft === cur.pos.z_ft && !m0.suggested) return;
      cur.moved = true; const pos = cur.pos;
      setLayout((l) => ({ ...l, [cur.kind]: l[cur.kind].map((m) => (m.id === cur.id ? { ...m, ...pos, suggested: false } : m)) }));
    });
  };
  const up = (e) => {
    const d = drag.current; if (!d) return; drag.current = null;
    if (svg.current.hasPointerCapture?.(e.pointerId)) svg.current.releasePointerCapture(e.pointerId);
    cancelAnimationFrame(frame.current); frame.current = 0;
    const l = layoutRef.current;
    let next = l;
    if (d.moved && d.pos) next = { ...l, [d.kind]: l[d.kind].map((m) => (m.id === d.id ? { ...m, ...d.pos, suggested: false } : m)) };
    else if (!l[d.kind].find((m) => m.id === d.id)?.suggested) next = { ...l, [d.kind]: l[d.kind].filter((m) => m.id !== d.id) };
    commit(next);
  };

  const lines = [];
  for (let x = 0; x <= W; x++) lines.push(h('line', { key: `x${x}`, x1: x, y1: 0, x2: x, y2: D, stroke: '#e5ddd0', strokeWidth: 0.04 }));
  for (let z = 0; z <= D; z++) lines.push(h('line', { key: `z${z}`, x1: 0, y1: z, x2: W, y2: z, stroke: '#e5ddd0', strokeWidth: 0.04 }));

  return (
    <div className="space-y-3">
      <GridToolbar {...{ tool, setTool, circuit, setCircuit, exitWidth, setExitWidth, heatType, setHeatType }} />
      {h('svg', { ref: svg, viewBox: `-1 -1.6 ${W + 2} ${D + 2.6}`, className: 'w-full max-h-[420px] rounded-2xl border bg-card touch-none select-none', onPointerMove: move, onPointerUp: up, onPointerCancel: up },
        h('rect', { x: 0, y: 0, width: W, height: D, fill: '#faf7f2', stroke: '#a8a29e', strokeWidth: 0.1, onPointerDown: place }),
        h('g', { pointerEvents: 'none' }, ...lines),
        h('text', { x: W / 2, y: -1.05, fontSize: 0.45, textAnchor: 'middle', fill: '#a8a29e' }, `Back wall · ${W} × ${D} ft`),
        ...['outlets', 'exits', 'fixtures'].flatMap((k) => layout[k].map((m) => h(GridMarker, { key: m.id, kind: k, m, W, hit, onDown: down(k, m.id) }))))}
      <SuggestedList layout={layout} onConfirm={(k, id) => setMark(k, id, (m) => [{ ...m, suggested: false }])} onDismiss={(k, id) => setMark(k, id, () => [])} />
      <DensityNote W={W} D={D} headcount={Number(headcount)} hasOutlets={layout.outlets.length > 0} />
    </div>
  );
}