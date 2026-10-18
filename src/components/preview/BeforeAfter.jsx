import { useState } from 'react';

// Original photo on the left of the handle, AI preview on the right.
export default function BeforeAfter({ before, after, children }) {
  const [pos, setPos] = useState(50);
  return (
    <div className="relative rounded-2xl overflow-hidden border bg-muted select-none">
      <img src={after} alt="AI preview of the room" className="w-full h-auto block" />
      <img src={before} alt="Original room photo" className="absolute inset-0 w-full h-full object-cover"
        style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }} />
      <div className="absolute inset-y-0 w-0.5 bg-background shadow pointer-events-none" style={{ left: `${pos}%` }} />
      <span className="absolute top-3 left-3 text-xs bg-background/90 rounded-full px-2.5 py-1">Before</span>
      <span className="absolute top-3 right-3 text-xs bg-background/90 rounded-full px-2.5 py-1">After</span>
      {children}
      <input type="range" min={0} max={100} value={pos} onChange={(e) => setPos(Number(e.target.value))} aria-label="Compare before and after"
        className="absolute bottom-3 left-1/2 -translate-x-1/2 w-2/3 accent-primary" />
    </div>
  );
}