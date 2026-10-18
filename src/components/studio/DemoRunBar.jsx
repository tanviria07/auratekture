import { useState } from 'react';
import { Save, Upload, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';

// Admin-only demo safety: save the current run (kit, products, image, hotspots, basket)
// and restore it instantly without re-running the AI pipeline.
export default function DemoRunBar({ hasRun, savedAt, onSave, onLoad, busy }) {
  const [done, setDone] = useState('');
  const save = async () => { await onSave(); setDone('saved'); setTimeout(() => setDone(''), 2000); };
  return (
    <div className="flex flex-wrap items-center gap-2 text-sm">
      <span className="text-xs text-muted-foreground">Demo</span>
      <Button variant="outline" size="sm" className="rounded-full" disabled={busy || !hasRun} onClick={save}>
        <Save className="w-3.5 h-3.5" />Save as demo run
      </Button>
      <Button variant="outline" size="sm" className="rounded-full" disabled={busy || !savedAt} onClick={onLoad}>
        <Upload className="w-3.5 h-3.5" />Load demo run
      </Button>
      {savedAt && <span className="text-xs text-muted-foreground flex items-center gap-1"><Check className="w-3 h-3 text-chart-2" />Saved run</span>}
      {done === 'saved' && <span className="text-xs text-chart-2">Saved</span>}
    </div>
  );
}