import { AlertTriangle, Check, X } from 'lucide-react';
import { safetyChecks } from '@/lib/safety';

export default function SafetyChecks({ kit, ceiling }) {
  const checks = safetyChecks(kit, ceiling);
  return (
    <div className="rounded-2xl border bg-card p-4 space-y-2">
      <p className="text-sm font-medium">Checked</p>
      {checks.map((c) => (
        <div key={c.label} className="flex items-start gap-2 text-sm">
          {c.ok === true ? <Check className="w-4 h-4 text-chart-2 mt-0.5 shrink-0" /> : c.ok === false ? <X className="w-4 h-4 text-destructive mt-0.5 shrink-0" /> : <AlertTriangle className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
          <span>{c.label}{c.note && <span className="text-muted-foreground"> · {c.note}</span>}</span>
        </div>
      ))}
    </div>
  );
}