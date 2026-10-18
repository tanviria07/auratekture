import { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { parseKit } from '@/lib/kit';

// The room's kit, falling back to the kit stored on its last shopping run.
export function useKitLines(eventId, kitLines) {
  const [legacy, setLegacy] = useState([]);
  const has = !!kitLines?.length;
  useEffect(() => {
    if (!eventId || has) return;
    base44.entities.CreaoRun.filter({ event_id: eventId, role: 'buyer' }, { sort: '-created_date', limit: 1 })
      .then((p) => setLegacy(parseKit(p.items[0])));
  }, [eventId, has]);
  return has ? kitLines : legacy;
}