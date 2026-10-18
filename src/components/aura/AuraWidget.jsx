import { useEffect, useRef, useState } from 'react';
import { Loader2, Mic, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAura } from '@/hooks/use-aura';

// Optional voice concierge, bottom-right. The Studio works fully without it.
export default function AuraWidget({ context }) {
  const videoRef = useRef(null);
  const a = useAura(videoRef, context);
  const [orb, setOrb] = useState(false);
  useEffect(() => {
    if (a.status === 'idle' || a.hasVideo) { setOrb(false); return; }
    const t = setTimeout(() => setOrb(true), 20000);
    return () => clearTimeout(t);
  }, [a.status, a.hasVideo]);
  const active = a.status !== 'idle';
  return (
    <div className="fixed bottom-4 right-4 z-50 w-[280px] rounded-2xl border bg-card shadow-xl p-3 space-y-3">
      <div className={`relative aspect-square rounded-xl overflow-hidden bg-muted ${active ? '' : 'hidden'}`}>
        <video ref={videoRef} autoPlay playsInline className={`w-full h-full object-cover ${orb ? 'opacity-0' : ''}`} />
        {orb && <div className="absolute inset-0 flex items-center justify-center"><div className="w-28 h-28 rounded-full bg-primary/70 blur-sm animate-pulse shadow-[0_0_60px_hsl(var(--primary))]" /></div>}
      </div>
      <div className="flex items-center gap-2 text-sm">
        <span className={`w-2.5 h-2.5 rounded-full ${a.speaking ? 'bg-chart-2 shadow-[0_0_8px_hsl(var(--chart-2))]' : 'bg-muted-foreground/30'}`} />
        <span className="font-medium">Aura</span>
        <span className="text-muted-foreground">{a.status === 'connecting' ? 'connecting…' : a.agentState}</span>
      </div>
      {a.message && <p className="text-xs text-muted-foreground">{a.message}</p>}
      <Button className="w-full rounded-full" variant={active ? 'outline' : 'default'} onClick={active ? a.stop : a.start}>
        {a.status === 'connecting' ? <Loader2 className="animate-spin" /> : active ? <Square /> : <Mic />}{active ? 'Stop' : 'Talk to Aura'}
      </Button>
    </div>
  );
}