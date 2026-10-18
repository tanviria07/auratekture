import { createElement as h } from 'react';
import { Canvas } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import SampleBox from './SampleBox';

// 3D objects are built with createElement (not JSX) so editor attributes aren't injected into three.js props.
const plane = (args, color, position, rotation) =>
  h('mesh', { position, rotation }, h('planeGeometry', { args }), h('meshStandardMaterial', { color }));

export default function RoomScene({ width, depth, ceiling, onSelect }) {
  // Blank dimensions fall back to a typical room so the view stays usable.
  const W = Math.max(Number(width) || 20, 1), D = Math.max(Number(depth) || 16, 1), C = Math.max(Number(ceiling) || 10, 1);
  const boxes = [
    { id: 1, label: 'Already here', color: '#9ca3af', pos: [-W * 0.3, -D * 0.25], size: [3, 2.5, 2] },
    { id: 2, label: 'Already here', color: '#9ca3af', pos: [W * 0.25, -D * 0.3], size: [2, 3, 2] },
    { id: 3, label: 'Searching…', color: '#e0703a', pos: [-W * 0.1, D * 0.2], size: [2.5, 2.5, 2.5], pulse: true },
    { id: 4, label: 'Selected item', color: '#d9622b', pos: [W * 0.28, D * 0.2], size: [2, 2, 2] },
  ];
  const r = Math.max(W, D);
  return h(Canvas, { camera: { position: [r * 0.9, C * 1.6, r * 1.1], fov: 45 }, onPointerMissed: () => onSelect(null) },
    h('color', { attach: 'background', args: ['#faf7f2'] }),
    h('ambientLight', { intensity: 0.7 }),
    h('directionalLight', { position: [10, 20, 10], intensity: 0.8 }),
    plane([W, D], '#eee6da', [0, 0, 0], [-Math.PI / 2, 0, 0]),
    plane([W, C], '#f5efe6', [0, C / 2, -D / 2], [0, 0, 0]),
    plane([D, C], '#efe7db', [-W / 2, C / 2, 0], [0, Math.PI / 2, 0]),
    ...boxes.map((b) => h(SampleBox, { key: b.id, box: b, onSelect })),
    h(OrbitControls, { target: [0, C / 3, 0], maxPolarAngle: Math.PI / 2.05 })
  );
}