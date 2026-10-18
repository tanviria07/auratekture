import { Loader2, RefreshCw, Sparkles } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PreviewControls({ hasKit, hasPreview, stale, busy, secs, error, onGenerate }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap items-center gap-3">
        {!hasPreview && <Button className="rounded-full" disabled={!hasKit || busy} onClick={onGenerate}>{busy ? <Loader2 className="animate-spin" /> : <Sparkles />}Generate preview</Button>}
        {hasPreview && stale && <Button className="rounded-full" disabled={busy} onClick={onGenerate}>{busy ? <Loader2 className="animate-spin" /> : <RefreshCw />}Update preview</Button>}
        {hasPreview && <Button variant="outline" className="rounded-full" disabled={busy} onClick={onGenerate}>{busy && !stale ? <Loader2 className="animate-spin" /> : <RefreshCw />}Regenerate</Button>}
        {busy && <span className="text-sm text-muted-foreground">Creating your preview… {secs}s</span>}
        {!hasKit && <span className="text-sm text-muted-foreground">Find real products first to see them in your room.</span>}
      </div>
      {error && !busy && (
        <p className="text-sm text-destructive">{error} <button className="underline ml-1" onClick={onGenerate}>Try again</button></p>
      )}
    </div>
  );
}