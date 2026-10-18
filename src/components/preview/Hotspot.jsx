import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lineName } from '@/lib/kit';
import ProductCard from './ProductCard';

export default function Hotspot({ n, spot, line, onSwap }) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <button title={lineName(line)} aria-label={lineName(line)} style={{ left: `${spot.x * 100}%`, top: `${spot.y * 100}%` }}
          className="absolute -translate-x-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-primary text-primary-foreground text-xs font-semibold ring-2 ring-background shadow hover:scale-110 transition-transform">
          {n}
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-auto"><ProductCard line={line} onSwap={onSwap} /></PopoverContent>
    </Popover>
  );
}