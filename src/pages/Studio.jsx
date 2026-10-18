import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useToast } from '@/components/ui/use-toast';
import { EMPTY_FACTS } from '@/lib/savedRooms';

const num = (v) => (v === '' || v == null ? null : Number(v));
import RoomPhoto from '@/components/studio/RoomPhoto';
import RoomFactsForm from '@/components/studio/RoomFactsForm';
import RoomScene from '@/components/studio/RoomScene';
import BoxPanel from '@/components/studio/BoxPanel';
import CheckoutPanel from '@/components/checkout/CheckoutPanel';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { ShoppingBag } from 'lucide-react';

export default function Studio() {
  const params = new URLSearchParams(window.location.search);
  const [eventId, setEventId] = useState(params.get('event'));
  const [facts, setFacts] = useState(EMPTY_FACTS);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (!eventId) return;
    base44.entities.Event.get(eventId).then((e) => setFacts({ ...EMPTY_FACTS, ...e, budget: e.budget_cents != null ? e.budget_cents / 100 : '' }));
  }, []);

  const save = async () => {
    setSaving(true);
    const { budget, ...rest } = facts;
    const data = {
      name: rest.name, room_purpose: rest.room_purpose, venue_name: rest.venue_name, width_ft: num(rest.width_ft),
      depth_ft: num(rest.depth_ft), ceiling_ft: num(rest.ceiling_ft), headcount: num(rest.headcount),
      budget_cents: budget === '' || budget == null ? null : Math.round(budget * 100), deadline: rest.deadline || undefined, photo_url: rest.photo_url, status: 'planning',
    };
    if (eventId) await base44.entities.Event.update(eventId, data);
    else setEventId((await base44.entities.Event.create(data)).id);
    setSaving(false);
    toast({ title: 'Event saved' });
  };

  return (
    <div className="max-w-7xl mx-auto px-gutter pb-16 grid lg:grid-cols-[380px_1fr] gap-8">
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl">{facts.name}</h1>
          {facts.venue_name && <p className="text-muted-foreground mt-1">{facts.venue_name}</p>}
        </div>
        <RoomPhoto uri={facts.photo_url} />
        <RoomFactsForm facts={facts} onChange={(k, v) => setFacts((f) => ({ ...f, [k]: v }))} onSave={save} saving={saving} saved={!!eventId} />
        <Sheet>
          <SheetTrigger asChild><Button variant="outline" className="w-full rounded-full"><ShoppingBag className="w-4 h-4" />Checkout</Button></SheetTrigger>
          <SheetContent className="w-full sm:max-w-md overflow-y-auto">
            <SheetHeader><SheetTitle>Checkout</SheetTitle></SheetHeader>
            <div className="mt-6"><CheckoutPanel eventId={eventId} budget={facts.budget === '' ? null : facts.budget} /></div>
          </SheetContent>
        </Sheet>
      </div>
      <div className="relative h-[520px] lg:h-[calc(100vh-10rem)] rounded-2xl overflow-hidden border bg-card">
        <RoomScene width={facts.width_ft} depth={facts.depth_ft} ceiling={facts.ceiling_ft} onSelect={setSelected} />
        <BoxPanel box={selected} onClose={() => setSelected(null)} />
      </div>
    </div>
  );
}