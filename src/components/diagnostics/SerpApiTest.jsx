import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function SerpApiTest() {
  const [busy, setBusy] = useState(false);
  const [res, setRes] = useState(null);
  const run = async () => {
    setBusy(true); setRes(null);
    const r = await base44.functions.invoke('testSerpApi', {}).then((x) => x.data).catch((e) => e.response?.data || { error: e.message });
    setRes(r); setBusy(false);
  };
  return (
    <section className="rounded-2xl border bg-card p-8 space-y-4">
      <h2 className="text-xl">Product search</h2>
      <Button onClick={run} disabled={busy} className="rounded-full">{busy && <Loader2 className="w-4 h-4 animate-spin" />}Test SerpApi</Button>
      {res?.error && <p className="text-sm text-destructive">{res.error}</p>}
      {res?.top && (
        <div className="space-y-2 text-sm">
          <p className="text-muted-foreground">{res.count} results in {res.ms} ms</p>
          {res.top.map((p, i) => (
            <a key={i} href={p.link} target="_blank" rel="noreferrer" className="flex items-center gap-3 border-t pt-2">
              {p.thumbnail && <img src={p.thumbnail} alt="" className="w-10 h-10 object-contain rounded bg-muted" />}
              <span className="flex-1">{p.title}<span className="block text-muted-foreground">{p.store}</span></span>
              <span>${p.price}</span>
            </a>
          ))}
        </div>
      )}
    </section>
  );
}