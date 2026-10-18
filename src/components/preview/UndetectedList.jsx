import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { lineName } from '@/lib/kit';
import ProductCard from './ProductCard';

// Kit items the preview didn't clearly show.
export default function UndetectedList({ lines, onSwap }) {
  if (!lines.length) return null;
  return (
    <div className="space-y-2">
      <p className="text-sm text-muted-foreground">Not clearly visible in the preview:</p>
      <div className="flex flex-wrap gap-2">
        {lines.map((l) => (
          <Popover key={l.line_id}>
            <PopoverTrigger asChild><button className="text-sm rounded-full border px-3 py-1 hover:bg-accent">{lineName(l)}</button></PopoverTrigger>
            <PopoverContent className="w-auto"><ProductCard line={l} onSwap={onSwap} /></PopoverContent>
          </Popover>
        ))}
      </div>
    </div>
  );
}