import { useLocation } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getVisitorId } from '@/lib/visitor';
import { useAuraState } from '@/lib/auraStore';
import { useGlobalSite } from '@/hooks/use-site-bridge';
import { buildAuraContext } from '@/lib/auraContext';
import AuraWidget from './AuraWidget';

// Lives in the site layout so the Aura call survives page changes.
export default function AuraLayer() {
  const { pathname } = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const { data: rooms } = useQuery({
    queryKey: ['events', isAdmin],
    queryFn: () => base44.entities.Event.filter(isAdmin ? {} : { visitor_id: getVisitorId() }, { sort: '-updated_date', limit: 50 }).then((p) => p.items),
  });
  useGlobalSite(rooms);
  const s = useAuraState();
  const context = buildAuraContext({ onStudio: pathname === '/studio', studio: s.studio, checkout: s.checkout, rooms: (rooms || []).map((r) => r.name) });
  return <AuraWidget context={context} />;
}