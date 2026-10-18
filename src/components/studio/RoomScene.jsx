import { createElement as h, memo } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SampleBox from './SampleBox';
import { CIRCUIT_COLORS } from './GridMarker';
import { layoutItems, onWall } from '@/lib/roomLayout';

// 3D objects are built with createElement (not JSX) so editor attributes aren't injected into three.js props.
const plane = (args, color, position, rotation) =>
  h('mesh', { position, rotation }, h('planeGeometry', { args }), h('meshStandardMaterial', { color }));
const block = (key, { pos, rot }, y, size, color) =>
  h('mesh', { key, position: [pos[0], y, pos[1]], rotation: [0, rot, 0] }, h('boxGeometry', { args: size }), h('meshStandardMaterial', { color }));

export default memo(function RoomScene({ width, depth, ceiling, items, outlets, exits, fixtures, onSelect }) {
  const W = Math.max(Number(width) || 20, 1), D = Math.max(Number(depth) || 16, 1), C = Math.max(Number(ceiling) || 10, 1);
  const heat = (fixtures || []).filter((f) => f.type !== 'window').map((f) => {
    const big = f.type === 'fireplace', t = big ? 1.5 : 0.7, place = onWall(f.x_ft, f.z_ft, W, D, t);
    return { id: f.id, label: big ? 'Fireplace' : 'Heater', color: '#ea580c', ...place, size: [big ? 5 : 2, big ? 3.3 : 2, t] };
  });
  const r = Math.max(W, D);
  return h(Canvas, { camera: { position: [r * 0.9, C * 1.6, r * 1.1], fov: 45 }, onPointerMissed: () => onSelect(null) },
    h('color', { attach: 'background', args: ['#faf7f2'] }),
    h('ambientLight', { intensity: 0.7 }),
    h('directionalLight', { position: [10, 20, 10], intensity: 0.8 }),
    plane([W, D], '#eee6da', [0, 0, 0], [-Math.PI / 2, 0, 0]),
    plane([W, C], '#f5efe6', [0, C / 2, -D / 2], [0, 0, 0]),
    plane([D, C], '#efe7db', [-W / 2, C / 2, 0], [0, Math.PI / 2, 0]),
    ...layoutItems(items, W, D).map((b) => h(SampleBox, { key: b.id, box: b, onSelect })),
    ...heat.map((b) => h(SampleBox, { key: b.id, box: b, onSelect })),
    ...(outlets || []).map((o) => block(o.id, onWall(o.x_ft, o.z_ft, W, D, 0.15), 1, [0.4, 0.6, 0.15], CIRCUIT_COLORS[o.circuit_id] || '#2563eb')),
    ...(exits || []).map((e) => block(e.id, onWall(e.x_ft, e.z_ft, W, D, 0.2), 3.5, [e.width_ft || 3, 7, 0.2], '#16a34a')),
    ...(fixtures || []).filter((f) => f.type === 'window').map((f) => block(f.id, onWall(f.x_ft, f.z_ft, W, D, 0.12), 5, [3, 3, 0.12], '#7dd3fc')),
    h(OrbitControls, { target: [0, C / 3, 0], maxPolarAngle: Math.PI / 2.05 })
  );
});