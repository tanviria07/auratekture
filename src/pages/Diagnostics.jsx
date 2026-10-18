import { useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { base44 } from '@/api/base44Client';
import { DEMO_ROOMS } from '@/lib/savedRooms';
import GeminiResult from '@/components/diagnostics/GeminiResult';
import CommerceTools from '@/components/diagnostics/CommerceTools';
import SerpApiTest from '@/components/diagnostics/SerpApiTest';

export default function Diagnostics() {
  const [result, setResult] = useState(null);
  const [testing, setTesting] = useState(false);

  const [loadingDemo, setLoadingDemo] = useState(false);
  const [demoMsg, setDemoMsg] = useState('');
  const loadDemo = async () => {
    setLoadingDemo(true);
    const { items } = await base44.entities.Event.filter({ name: { $in: DEMO_ROOMS.map((r) => r.name) } }, { fields: ['name'], limit: 50 });
    const missing = DEMO_ROOMS.filter((r) => !items.some((e) => e.name === r.name));
    if (missing.length) await base44.entities.Event.bulkCreate(missing);
    setDemoMsg(missing.length ? `Added ${missing.length} demo room(s).` : 'Demo rooms already exist.');
    setLoadingDemo(false);
  };

  const test = async (variant) => {
    setTesting(variant);
    setResult(null);
    const r = await base44.functions.invoke('testGemini', { variant }).catch((e) => ({ data: e.response?.data || { error: e.message } }));
    setResult(r.data);
    setTesting(false);
  };

  return (
    <div className="max-w-3xl mx-auto px-gutter pb-section space-y-12">
      <h1 className="text-4xl">Diagnostics</h1>
      <section className="rounded-2xl border bg-card p-8 space-y-4">
        <h2 className="text-xl">Demo data</h2>
        <Button variant="outline" onClick={loadDemo} disabled={loadingDemo} className="rounded-full">{loadingDemo && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Load demo rooms</Button>
        {demoMsg && <p className="text-sm text-muted-foreground">{demoMsg}</p>}
      </section>
      <section className="rounded-2xl border bg-card p-8 space-y-4">
        <h2 className="text-xl">Gemini</h2>
        <div className="flex flex-wrap gap-3">
          <Button onClick={() => test('default')} disabled={!!testing} className="rounded-full">{testing === 'default' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Test Gemini</Button>
          <Button variant="outline" onClick={() => test('flash')} disabled={!!testing} className="rounded-full">{testing === 'flash' && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}Test Gemini Flash</Button>
        </div>
        <GeminiResult result={result} />
      </section>
      <CommerceTools />
      <SerpApiTest />
    </div>
  );
}