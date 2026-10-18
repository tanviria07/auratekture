import { Loader2, Save, Search, History } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ShopActions({ hasKit, busy, progress, hasProducts, hasDemo, isAdmin, onFind, onSaveDemo, onLoadDemo }) {
  const [done, total] = (progress || '').split('/');
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button className="rounded-full" disabled={!hasKit || busy} onClick={onFind}>{busy ? <Loader2 className="animate-spin" /> : <Search />}Find real products</Button>
      {hasDemo && <Button variant="outline" className="rounded-full" disabled={busy} onClick={onLoadDemo}><History />Load demo run</Button>}
      {isAdmin && hasProducts && <Button variant="ghost" className="rounded-full" disabled={busy} onClick={onSaveDemo}><Save />Save as demo run</Button>}
      {busy && <span className="text-sm text-muted-foreground">{done === total ? 'Picking the best matches…' : `Searching stores… ${done} of ${total} lines`}</span>}
      {!hasKit && <span className="text-sm text-muted-foreground">Plan a kit first to shop for it.</span>}
    </div>
  );
}