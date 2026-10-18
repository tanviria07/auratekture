import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import BuyerResults from './BuyerResults';

const KIT = {"job_group": "power_av", "kit_lines": [{"line_id": "L1", "category": "power_strip", "qty": 7, "specs": {"outlets_min": 6, "surge_protected": true, "cord_length_ft_min": 6}, "max_unit_price_usd": 25, "reason": "20 teams with laptops; the wall outlets can't reach every table."}, {"line_id": "L2", "category": "extension_cord", "qty": 4, "specs": {"length_ft": 15, "gauge": "14 or 16 AWG", "indoor_rated": true}, "max_unit_price_usd": 20, "reason": "Reach the center tables from the walls."}, {"line_id": "L3", "category": "cable_cover_ramp", "qty": 3, "specs": {"length_ft_min": 5, "flat": true}, "max_unit_price_usd": 30, "reason": "Cords cross the walkways to the exits."}]};
const active = (r) => r && ['pending', 'running'].includes(r.status);

export default function CreaoBuyerTest() {
  const [run, setRun] = useState(null);
  const [error, setError] = useState('');
  const [starting, setStarting] = useState(false);
  const [now, setNow] = useState(Date.now());

  useEffect(() => {
    if (!active(run)) return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(() => base44.functions.invoke('pollCreaoRun', { run_row_id: run.id })
      .then((r) => setRun(r.data.run)).catch((e) => setError(e.response?.data?.error || e.message)), 10000);
    return () => { clearInterval(tick); clearInterval(poll); };
  }, [run?.id, run?.status]);

  const start = async () => {
    setStarting(true); setError(''); setRun(null);
    const { items } = await base44.entities.Event.filter({}, { sort: '-updated_date', limit: 1, fields: ['name'] });
    if (!items[0]) { setError('Add a room first.'); setStarting(false); return; }
    const deadline = new Date(Date.now() + 7 * 864e5).toISOString().slice(0, 10);
    const r = await base44.functions.invoke('startCreaoRun', { event_id: items[0].id, role: 'buyer', job_group: KIT.job_group, inputs: { kit_json: JSON.stringify(KIT), deadline } })
      .catch((e) => ({ data: { error: e.response?.data?.error || e.message } }));
    if (r.data.error) setError(r.data.error); else setRun(r.data.run);
    setStarting(false);
  };

  const end = run?.completed_at ? new Date(run.completed_at).getTime() : now;
  const secs = run ? Math.max(0, Math.round((end - new Date(run.started_at).getTime()) / 1000)) : 0;

  return (
    <section className="rounded-2xl border bg-card p-8 space-y-4">
      <h2 className="text-xl">CREAO Buyer</h2>
      <p className="text-sm text-muted-foreground">Each run uses CREAO credits.</p>
      <Button onClick={start} disabled={starting || active(run)} className="rounded-full">{(starting || active(run)) && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Test Buyer</Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
      {run && <p className="text-sm">Status: <b>{run.status}</b> · {Math.floor(secs / 60)}m {secs % 60}s{run.error_code && <> · <span className="text-destructive">{run.error_code}</span></>}</p>}
      {run?.status === 'completed' && (run.parsed_result ? <BuyerResults result={run.parsed_result} /> : <pre className="text-xs whitespace-pre-wrap">{run.result_text}</pre>)}
    </section>
  );
}