import { createElement as h } from 'react';
import { Html } from '@react-three/drei';

export default function SampleBox({ box, onSelect }) {
  const [w, ht, d] = box.size;
  return h('mesh', {
      position: [box.pos[0], (box.y ?? 0) + ht / 2, box.pos[1]],
      rotation: [0, box.rot || 0, 0],
      onClick: (e) => { e.stopPropagation(); onSelect(box); },
      onPointerOver: () => (document.body.style.cursor = 'pointer'),
      onPointerOut: () => (document.body.style.cursor = ''),
    },
    h('boxGeometry', { args: [w, ht, d] }),
    h('meshStandardMaterial', { color: box.color }),
    h(Html, { position: [0, ht / 2 + 0.8, 0], center: true, distanceFactor: 20 },
      h('span', { className: 'whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-[11px] shadow border' }, box.label))
  );
}