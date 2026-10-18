import { useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { useKitLines } from '@/hooks/use-kit-lines';
import { useDesignRun } from '@/hooks/use-design-run';
import { buildKit } from '@/lib/kit';
import { findProducts, invoke, syncBasket } from '@/lib/shop';
import { EMPTY_FACTS } from '@/lib/savedRooms';
import { getVisitorId } from '@/lib/visitor';
import { mergeDetectedItems, mergeItems } from '@/lib/photoSuggestions';
import RoomPhoto from '@/components/studio/RoomPhoto';
import PhotoUpload from '@/components/studio/PhotoUpload';
import RoomFactsForm from '@/components/studio/RoomFactsForm';
import PhotoAnalysis from '@/components/studio/PhotoAnalysis';
import RoomContents from '@/components/studio/RoomContents';
import AlreadyProvided from '@/components/studio/AlreadyProvided';
import DesignPanel from '@/components/studio/DesignPanel';
import SafetyChecks from '@/components/studio/SafetyChecks';
import ShoppingList from '@/components/studio/ShoppingList';
import RoomPreview from '@/components/preview/RoomPreview';
import DemoRunBar from '@/components/studio/DemoRunBar';
import { Loader2, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/lib/AuthContext';

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function Studio() {
  const params = new URLSearchParams(window.location.search);
  const [eventId, setEventId] = useState(params.get('event'));
  const [facts, setFacts] = useState(EMPTY_FACTS);
  const [loaded, setLoaded] = useState(!params.get('event'));
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [progress, setProgress] = useState('');
  const [updating, setUpdating] = useState(false);
  const [limitBlock, setLimitBlock] = useState(null);
  const { toast } = useToast();
  const qc = useQueryClient();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [demoBusy, setDemoBusy] = useState(false);
  const design = useDesignRun();
  const analyzedRef = useRef(false);
  const factsRef = useRef(facts); factsRef.current = facts;

  const analyze = async (id) => {
    setAnalyzing(true); setAnalysisError('');
    const r = await invoke('analyzeRoomPhoto', { event_id: id });
    if (r.error) setAnalysisError(r.error);
    else setFacts((f) => ({ ...f, photo_analysis: r.photo_analysis, color_palette: r.color_palette, existing_items: [] }));
    setAnalyzing(false);
  };

  useEffect(() => {
    if (!eventId) return;
    base44.entities.Event.get(eventId).then((e) => {
      setFacts({ ...EMPTY_FACTS, ...e, budget: e.budget_cents != null ? e.budget_cents / 100 : '' });
      setLoaded(true);
      if (e.photo_url && !e.photo_analysis && !analyzedRef.current) { analyzedRef.current = true; analyze(e.id); }
    });
  }, []);

  const patch = async (data) => {
    setFacts((f) => ({ ...f, ...data }));
    if (eventId) await base44.entities.Event.update(eventId, data);
  };

  const kitLines = useKitLines(eventId, facts.kit_lines);
  const kit = useMemo(() => buildKit(kitLines, facts.products, facts.product_choices), [kitLines, facts.products, facts.product_choices]);
  const chips = facts.existing_items?.length ? mergeItems(facts.existing_items) : mergeDetectedItems(facts.photo_analysis);
  const budget = facts.budget === '' ? null : facts.budget;

  const refreshBasket = async (k) => { await syncBasket(eventId, k); qc.invalidateQueries({ queryKey: ['basket', eventId] }); };
  const swap = async (line_id, i) => {
    const product_choices = { ...(facts.product_choices || {}), [line_id]: i };
    await patch({ product_choices });
    await refreshBasket(buildKit(kitLines, facts.products, product_choices));
  };

  const save = async () => {
    setSaving(true);
    const f = factsRef.current;
    const data = {
      name: f.name, room_purpose: f.room_purpose, ceiling_ft: num(f.ceiling_ft), headcount: num(f.headcount),
      budget_cents: f.budget === '' || f.budget == null ? null : Math.round(f.budget * 100), deadline: f.deadline || undefined, photo_url: f.photo_url, status: 'planning',
    };
    let id = eventId;
    if (id) await base44.entities.Event.update(id, data);
    else { id = (await base44.entities.Event.create({ ...data, visitor_id: getVisitorId() })).id; setEventId(id); }
    setSaving(false);
    return id;
  };

  const onPhoto = async (photo_url) => {
    setFacts((f) => ({ ...f, photo_url }));
    factsRef.current = { ...factsRef.current, photo_url };
    const id = await save();
    await base44.entities.Event.update(id, { photo_analysis: null, existing_items: [] });
    analyze(id);
  };

  const runDesign = async () => {
    const id = await save();
    const limit = await invoke('checkDesignLimit', { event_id: id });
    if (limit.error) { toast({ title: 'Could not start', description: limit.error, variant: 'destructive' }); return; }
    if (!limit.allowed) { setLimitBlock(limit); return; }
    setLimitBlock(null);
    let lines = [];
    await design.run({
      kit: async () => { const r = await invoke('proposeKit', { event_id: id }); if (!r.error) { lines = r.kit_lines; setFacts((f) => ({ ...f, kit_lines: lines, products: [], product_choices: {}, theme: r.theme })); } return r; },
      find: async () => {
        setProgress('');
        const r = await findProducts(id, setProgress);
        if (r.error) return r;
        setFacts((f) => ({ ...f, products: r.products, products_at: r.products_at, product_choices: r.product_choices || {} }));
        await refreshBasket(buildKit(lines, r.products, r.product_choices || {}));
        if (!r.products.some((p) => p.status === 'found')) return { error: 'No matching products were found. Try a different budget or purpose.' };
      },
      place: async () => { const r = await invoke('generateRoomPreview', { event_id: id }); if (!r.error) setFacts((f) => ({ ...f, previews: r.previews })); return r; },
    });
  };

  const updateImage = async () => {
    setUpdating(true);
    const r = await invoke('generateRoomPreview', { event_id: eventId, retry: true });
    if (r.error) toast({ title: 'Could not update the image', description: r.error, variant: 'destructive' });
    else setFacts((f) => ({ ...f, previews: r.previews }));
    setUpdating(false);
  };

  const saveDemoRun = async () => {
    if (!eventId) return;
    setDemoBusy(true);
    try {
      const { items: [b] } = await base44.entities.Basket.filter({ event_id: eventId }, { sort: '-created_date', limit: 1 });
      const demo_run = { kit_lines: facts.kit_lines || [], products: facts.products || [], products_at: facts.products_at, previews: facts.previews || [], basket: b || null, saved_at: new Date().toISOString() };
      await base44.entities.Event.update(eventId, { demo_run });
      setFacts((f) => ({ ...f, demo_run }));
      toast({ title: 'Demo run saved' });
    } catch (e) { toast({ title: 'Could not save', description: e.message, variant: 'destructive' }); }
    setDemoBusy(false);
  };

  const loadDemoRun = async () => {
    const d = facts.demo_run;
    if (!d) return;
    setDemoBusy(true);
    try {
      const data = { kit_lines: d.kit_lines || [], products: d.products || [], products_at: d.products_at, previews: d.previews || [], products_source: 'demo', product_choices: {} };
      await base44.entities.Event.update(eventId, data);
      if (d.basket) {
        const { items: [b] } = await base44.entities.Basket.filter({ event_id: eventId }, { sort: '-created_date', limit: 1 });
        const bd = { ...d.basket, event_id: eventId, status: 'open' };
        if (b) await base44.entities.Basket.update(b.id, bd);
        else await base44.entities.Basket.create(bd);
        qc.invalidateQueries({ queryKey: ['basket', eventId] });
      }
      setFacts((f) => ({ ...f, ...data }));
      toast({ title: 'Demo run loaded' });
    } catch (e) { toast({ title: 'Could not load', description: e.message, variant: 'destructive' }); }
    setDemoBusy(false);
  };

  const chosen = kit.filter((l) => l.product);
  return (
    <div className="max-w-7xl mx-auto px-gutter pb-16 space-y-10">
      <h1 className="text-3xl">{facts.name}</h1>

      {isAdmin && (
        <DemoRunBar hasRun={chosen.length > 0} savedAt={facts.demo_run?.saved_at} busy={demoBusy} onSave={saveDemoRun} onLoad={loadDemoRun} />
      )}

      <section className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <RoomPhoto uri={facts.photo_url} />
          <PhotoUpload hasPhoto={!!facts.photo_url} onUploaded={onPhoto} />
          {loaded && facts.photo_url && <RoomContents items={chips} onChange={(items) => patch({ existing_items: items })} />}
          {loaded && facts.photo_url && <AlreadyProvided value={facts.venue_supplied} onChange={(v) => patch({ venue_supplied: v })} />}
          <PhotoAnalysis analysis={facts.photo_analysis} palette={facts.color_palette} analyzing={analyzing} error={analysisError} onRetry={() => analyze(eventId)} />
        </div>
        <div className="space-y-6">
          <h2 className="text-xl">Your room</h2>
          <RoomFactsForm facts={facts} onChange={(k, v) => setFacts((f) => ({ ...f, [k]: v }))} onSave={async () => { await save(); toast({ title: 'Saved' }); }} saving={saving} saved={!!eventId} />
          <DesignPanel {...design} progress={progress} disabled={!facts.photo_url} onRun={runDesign} block={limitBlock} />
        </div>
      </section>

      {loaded && (
        <RoomPreview photoUrl={facts.photo_url} previews={facts.previews} choices={facts.product_choices} kit={chosen}
          onSwap={swap} onUpdate={updateImage} updating={updating} theme={facts.theme} />
      )}

      {chosen.length > 0 && !facts.previews?.length && (
        <section className="rounded-2xl border bg-card p-6 space-y-3">
          <p className="text-sm text-muted-foreground">The room image didn't generate. Retry with the products already found, no new search needed.</p>
          <Button variant="outline" onClick={updateImage} disabled={updating}>
            {updating ? <Loader2 className="animate-spin" /> : <RefreshCw />}Retry image
          </Button>
        </section>
      )}

      {chosen.length > 0 && (
        <section className="grid lg:grid-cols-[1fr_2fr] gap-8 items-start">
          <SafetyChecks kit={chosen} ceiling={facts.ceiling_ft} />
          <ShoppingList kit={chosen} eventId={eventId} budget={budget} />
        </section>
      )}
    </div>
  );
}