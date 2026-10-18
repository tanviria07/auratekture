import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';

export default function Diagnostics() {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);
  const [url, setUrl] = useState('');
  const [logs, setLogs] = useState([]);

  const loadLogs = () => base44.entities.WebhookLog.filter({}, { sort: '-created_date', limit: 10 }).then((p) => setLogs(p.items));
  useEffect(() => {
    base44.functions.invoke('getWebhookUrl', {}).then((r) => setUrl(r.data.url));
    loadLogs();
  }, []);

  const test = async () => {
    setTesting(true);
    const r = await base44.functions.invoke('testGemini', {}).catch((e) => ({ data: e.response?.data || { error: e.message } }));
    setResult(r.data);
    setTesting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-gutter pb-section space-y-12">
      <h1 className="text-4xl">Diagnostics</h1>
      <section className="rounded-2xl border bg-card p-8 space-y-4">
        <h2 className="text-xl">Gemini</h2>
        <Button onClick={test} disabled={testing} className="rounded-full">{testing && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Test Gemini</Button>
        {result && (result.error
          ? <p className="text-destructive text-sm">{result.error}</p>
          : <p className="text-sm">Reply: <b>{result.text}</b> · {result.ms} ms</p>)}
      </section>
      <section className="rounded-2xl border bg-card p-8 space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl">Creao webhook</h2>
          <Button variant="outline" size="sm" className="rounded-full" onClick={loadLogs}>Refresh</Button>
        </div>
        <code className="block text-xs bg-muted rounded-lg p-3 break-all font-mono">{url || 'Loading…'}</code>
        {logs.length === 0 ? <p className="text-sm text-muted-foreground">No webhooks received yet.</p> : logs.map((l) => (
          <div key={l.id} className="border-t pt-3">
            <p className="text-xs text-muted-foreground">{l.source} · {new Date(l.received_at).toLocaleString()}</p>
            <pre className="text-xs font-mono whitespace-pre-wrap break-all mt-1">{l.payload}</pre>
          </div>
        ))}
      </section>
    </div>
  );
}