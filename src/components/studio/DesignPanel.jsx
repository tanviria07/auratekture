import { Check, Loader2, Sparkles, X } from 'lucide-react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { STEPS } from '@/hooks/use-design-run';

export default function DesignPanel({ steps, busy, error, progress, disabled, onRun, block }) {
  const started = Object.keys(steps).length > 0;
  return (
    <div className="rounded-2xl border bg-card p-6 space-y-4">
      <Button size="lg" className="rounded-full px-8" disabled={busy || disabled || !!block} onClick={onRun}>
        {busy ? <Loader2 className="animate-spin" /> : <Sparkles />}Design my room
      </Button>
      {disabled && !block && <p className="text-sm text-muted-foreground">Add a photo of your room first.</p>}
      {block && !busy && (
        <div className="rounded-xl bg-accent/50 p-4 space-y-2">
          <p className="text-sm text-accent-foreground">{block.message}</p>
          <Link to="/login" className="text-sm font-medium text-primary hover:underline">Log in for unlimited runs</Link>
        </div>
      )}
      {started && (
        <ol className="space-y-2">
          {STEPS.map(([key, label], i) => {
            const s = steps[key];
            return (
              <li key={key} className={`flex items-center gap-2 text-sm ${s ? '' : 'text-muted-foreground'}`}>
                {s?.status === 'done' ? <Check className="w-4 h-4 text-chart-2" /> : s?.status === 'running' ? <Loader2 className="w-4 h-4 animate-spin" /> : s?.status === 'failed' ? <X className="w-4 h-4 text-destructive" /> : <span className="w-4 text-center">{i + 1}</span>}
                <span>{label}</span>
                {s?.status === 'done' && <span className="text-muted-foreground">{(s.ms / 1000).toFixed(1)}s</span>}
                {s?.status === 'running' && key === 'find' && progress && <span className="text-muted-foreground">{progress}</span>}
              </li>
            );
          })}
        </ol>
      )}
      {error && !busy && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}