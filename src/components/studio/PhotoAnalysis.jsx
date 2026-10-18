import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function PhotoAnalysis({ analysis, palette, analyzing, error, onRetry }) {
  if (analyzing) return <p className="text-sm text-muted-foreground flex items-center gap-2"><Loader2 className="w-4 h-4 animate-spin" />Looking at your photo…</p>;
  if (error) return (
    <div className="text-sm flex items-center gap-3"><span className="text-destructive">{error}</span>
      <Button size="sm" variant="outline" onClick={onRetry}><RefreshCw className="w-3 h-3" />Try again</Button></div>
  );
  if (!analysis) return null;
  return (
    <div className="space-y-2">
      {palette?.length > 0 && (
        <div className="flex gap-2">{palette.map((c) => <span key={c} title={c} className="w-7 h-7 rounded-full border" style={{ background: c }} />)}</div>
      )}
      {analysis.style_notes && <p className="text-sm text-muted-foreground">{analysis.style_notes}</p>}
    </div>
  );
}