import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useKitLines } from '@/hooks/use-kit-lines';
import { buildKit } from '@/lib/kit';
import { syncBasket } from '@/lib/shop';
import ShopStep from '@/components/shop/ShopStep';
import { ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EMPTY_FACTS } from '@/lib/savedRooms';
import { getVisitorId } from '@/lib/visitor';
import { mergeDetectedItems } from '@/lib/photoSuggestions';
import RoomPhoto from '@/components/studio/RoomPhoto';
import RoomFactsForm from '@/components/studio/RoomFactsForm';
import RoomPreview from '@/components/preview/RoomPreview';
import StepIndicator from '@/components/studio/StepIndicator';
import PhotoAnalysis from '@/components/studio/PhotoAnalysis';
import RoomContents from '@/components/studio/RoomContents';
import VenueSupplied from '@/components/studio/VenueSupplied';
import FloorGrid from '@/components/studio/FloorGrid';
import CheckoutPanel from '@/components/checkout/CheckoutPanel';

const num = (v) => (v === '' || v == null ? null : Number(v));

export default function Studio() {
  const params = new URLSearchParams(window.location.search);
  const [eventId, setEventId] = useState(params.get('event'));
  const [facts, setFacts] = useState(EMPTY_FACTS);
  const [loaded, setLoaded] = useState(!params.get('event'));
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const { toast } = useToast();
  const analyzedRef = useRef(false);

  const analyze = async (id) => {
    setAnalyzing(true); setAnalysisError('');
    const r = await base44.functions.invoke('analyzeRoomPhoto', { event_id: id })
      .then((res) => res.data).catch((e) => ({ error: e.response?.data?.error || e.message }));
    if (r.error) setAnalysisError(r.error);
    else setFacts((f) => ({ ...f, photo_analysis: r.photo_analysis, color_palette: r.color_palette }));
    setAnalyzing(false);
  };

  useEffect(() => {
    if (!eventId) return;
    base44.entities.Event.get(eventId).then((e) => {
      setFacts({ ...EMPTY_FACTS, ...e, budget: e.budget_cents != null ? e.budget_cents / 100 : '' });
      setLoaded(true);
      // First visit after upload only; afterwards analysis runs only via "Analyze again".
      if (e.photo_url && !e.photo_analysis && !analyzedRef.current) { analyzedRef.current = true; analyze(e.id); }
    });
  }, []);

  const factsRef = useRef(facts); factsRef.current = facts;
  // Saves only fields that actually changed; never reloads the Event.
  const patch = async (data) => {
    const changed = Object.fromEntries(Object.entries(data).filter(([k, v]) => JSON.stringify(factsRef.current[k]) !== JSON.stringify(v)));
    if (!Object.keys(changed).length) return;
    setFacts((f) => ({ ...f, ...changed }));
    if (eventId) await base44.entities.Event.update(eventId, changed);
  };
  const saveLayout = useCallback((layout) => patch(layout), [eventId]);

  const qc = useQueryClient();
  const kitLines = useKitLines(eventId, facts.kit_lines);
  const kit = useMemo(() => buildKit(kitLines, facts.products, facts.product_choices), [kitLines, facts.products, facts.product_choices]);
  // Saves product results/choices, then rebuilds the basket from them.
  const applyProducts = async (data) => {
    await patch(data);
    if (!data.products && !data.product_choices) return;
    await syncBasket(eventId, buildKit(kitLines, data.products ?? factsRef.current.products, data.product_choices ?? factsRef.current.product_choices));
    qc.invalidateQueries({ queryKey: ['basket', eventId] });
  };
  const swap = (line_id, i) => applyProducts({ product_choices: { ...(facts.product_choices || {}), [line_id]: i } });

  const save = async () => {
    setSaving(true);
    const { budget, ...rest } = facts;
    const data = {
      name: rest.name, room_purpose: rest.room_purpose, venue_name: rest.venue_name, width_ft: num(rest.width_ft),
      depth_ft: num(rest.depth_ft), ceiling_ft: num(rest.ceiling_ft), headcount: num(rest.headcount),
      budget_cents: budget === '' || budget == null ? null : Math.round(budget * 100), deadline: rest.deadline || undefined, photo_url: rest.photo_url, venue_supplied: rest.venue_supplied, status: 'planning',
    };
    if (eventId) await base44.entities.Event.update(eventId, data);
    else setEventId((await base44.entities.Event.create({ ...data, visitor_id: getVisitorId() })).id);
    setSaving(false);
    toast({ title: 'Event saved' });
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter pb-16 space-y-10">
      <StepIndicator current={1} />
      <div>
        <h1 className="text-3xl">{facts.name}</h1>
        {facts.venue_name && <p className="text-muted-foreground mt-1">{facts.venue_name}</p>}
      </div>

      <div className="grid lg:grid-cols-2 gap-8 items-start">
        <div className="space-y-4">
          <RoomPhoto uri={facts.photo_url} />
          <PhotoAnalysis analysis={facts.photo_analysis} palette={facts.color_palette} analyzing={analyzing} error={analysisError} onRetry={() => analyze(eventId)} />
        </div>
        <div className="space-y-6">
          <RoomFactsForm facts={facts} onChange={(k, v) => setFacts((f) => ({ ...f, [k]: v }))} onSave={save} saving={saving} saved={!!eventId} />
          <Sheet>
            <SheetTrigger asChild><Button variant="outline" className="w-full rounded-full"><ShoppingBag className="w-4 h-4" />Checkout</Button></SheetTrigger>
            <SheetContent className="w-full sm:max-w-md overflow-y-auto">
              <SheetHeader><SheetTitle>Checkout</SheetTitle></SheetHeader>
              <div className="mt-6"><CheckoutPanel eventId={eventId} budget={facts.budget === '' ? null : facts.budget} /></div>
            </SheetContent>
          </Sheet>
        </div>
      </div>

      {loaded && (
        <div className="grid lg:grid-cols-2 gap-8">
          <RoomContents key={facts.photo_analysis ? 'detected' : 'none'}
            initial={facts.existing_items?.length ? facts.existing_items : mergeDetectedItems(facts.photo_analysis)}
            onConfirm={async (items) => { await patch({ existing_items: items }); toast({ title: 'Room contents confirmed' }); }} />
          <VenueSupplied value={facts.venue_supplied} onChange={(v) => setFacts((f) => ({ ...f, venue_supplied: v }))} />
        </div>
      )}

      {loaded && (
        <FloorGrid key={`${facts.width_ft}x${facts.depth_ft}-${!!facts.photo_analysis}`} width={facts.width_ft} depth={facts.depth_ft} headcount={facts.headcount}
          initial={facts} analysis={facts.photo_analysis} onSave={saveLayout} />
      )}

      {loaded && eventId && (
        <ShopStep eventId={eventId} kit={kit} facts={facts} budget={facts.budget === '' ? null : facts.budget} onApply={applyProducts} onSwap={swap} />
      )}

      {loaded && eventId && (
        <RoomPreview eventId={eventId} photoUrl={facts.photo_url} previews={facts.previews} choices={facts.product_choices} kit={kit.filter((l) => l.product)}
          onSwap={swap} onPreviews={(previews) => setFacts((f) => ({ ...f, previews }))} />
      )}
    </div>
  );
}