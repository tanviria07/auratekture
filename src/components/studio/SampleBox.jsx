import { createElement as h, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Html } from '@react-three/drei';

export default function SampleBox({ box, onSelect }) {
  const mat = useRef();
  useFrame(({ clock }) => {
    if (box.pulse && mat.current) mat.current.opacity = 0.25 + 0.25 * (1 + Math.sin(clock.elapsedTime * 3)) / 2;
  });
  const [w, ht, d] = box.size;
  return h('mesh', {
      position: [box.pos[0], ht / 2, box.pos[1]],
      onClick: (e) => { e.stopPropagation(); onSelect(box); },
      onPointerOver: () => (document.body.style.cursor = 'pointer'),
      onPointerOut: () => (document.body.style.cursor = ''),
    },
    h('boxGeometry', { args: [w, ht, d] }),
    h('meshStandardMaterial', { ref: mat, color: box.color, transparent: !!box.pulse, opacity: box.pulse ? 0.4 : 1 }),
    h(Html, { position: [0, ht / 2 + 0.8, 0], center: true, distanceFactor: 20 },
      h('span', { className: 'whitespace-nowrap rounded-full bg-card/90 px-2 py-0.5 text-[11px] shadow border' }, box.label))
  );
}