import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { productPrice, lineName } from '@/lib/kit';
import ProductCard from './ProductCard';

// Numbered legend: number, thumbnail, name, price. Clicking a row opens the product card.
export default function NumberLegend({ items, onSwap, activeId, onHover }) {
  if (!items.length) return null;
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
      {items.map((x) => (
        <Popover key={x.line.line_id}>
          <PopoverTrigger asChild>
            <button
              onMouseEnter={() => onHover(x.line.line_id)}
              onMouseLeave={() => onHover(null)}
              className={`flex items-center gap-2 rounded-xl border p-2 text-left hover:bg-accent transition-colors ${activeId === x.line.line_id ? 'ring-2 ring-primary' : ''}`}
            >
              <span className="w-7 h-7 rounded-full bg-white text-foreground border border-foreground/30 shadow text-xs font-bold flex items-center justify-center shrink-0">
                {x.n}
              </span>
              {x.line.product?.image_url ? (
                <img src={x.line.product.image_url} alt="" className="w-10 h-10 object-contain rounded shrink-0" />
              ) : (
                <div className="w-10 h-10 rounded bg-muted shrink-0" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-xs font-medium truncate">{lineName(x.line)}</p>
                {x.visible ? (
                  <p className="text-xs text-muted-foreground">{productPrice(x.line.product) != null ? `$${productPrice(x.line.product)}` : ''}</p>
                ) : (
                  <p className="text-xs text-primary">not visible in image</p>
                )}
              </div>
            </button>
          </PopoverTrigger>
          <PopoverContent className="w-auto"><ProductCard line={x.line} onSwap={onSwap} /></PopoverContent>
        </Popover>
      ))}
    </div>
  );
}