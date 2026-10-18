import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lineName } from '@/lib/kit';
import ProductCard from './ProductCard';

// 32px numbered dot: white fill, dark ring, bold number, shadow. Pulses once on appear.
export default function Hotspot({ n, spot, line, onSwap, active }) {
  return (
    <span className="animate-in fade-in duration-700">
    <Popover>
      <PopoverTrigger asChild>
        <button
          title={lineName(line)}
          aria-label={lineName(line)}
          style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
          className={`absolute -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white text-foreground text-sm font-bold ring-2 ring-foreground/40 shadow-lg flex items-center justify-center animate-pulse-once hover:scale-110 transition-transform ${active ? 'ring-primary ring-4 scale-110' : ''}`}
        >
          {n}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto"><ProductCard line={line} onSwap={onSwap} /></PopoverContent>
    </Popover>
    </span>
  );
}