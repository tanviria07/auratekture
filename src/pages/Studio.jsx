import { useEffect, useState } from 'react';
import { ShoppingBag } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { EMPTY_FACTS } from '@/lib/savedRooms';
import { getVisitorId } from '@/lib/visitor';
import { mergeDetectedItems, confirmedOnly } from '@/lib/photoSuggestions';
import RoomPhoto from '@/components/studio/RoomPhoto';
import RoomFactsForm from '@/components/studio/RoomFactsForm';
import RoomScene from '@/components/studio/RoomScene';
import BoxPanel from '@/components/studio/BoxPanel';
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
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const { toast } = useToast();

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
      if (e.photo_url && !e.photo_analysis) analyze(e.id);
    });
  }, []);

  const patch = async (data) => {
    setFacts((f) => ({ ...f, ...data }));
    if (eventId) await base44.entities.Event.update(eventId, data);
  };

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
          initial={facts} analysis={facts.photo_analysis} onSave={(layout) => patch(layout)} />
      )}

      <div className="relative h-[520px] lg:h-[70vh] rounded-2xl overflow-hidden border bg-card">
        <RoomScene width={facts.width_ft} depth={facts.depth_ft} ceiling={facts.ceiling_ft} items={facts.existing_items}
          outlets={facts.outlets} exits={confirmedOnly(facts.exits)} fixtures={confirmedOnly(facts.fixtures)} onSelect={setSelected} />
        <BoxPanel box={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}