import { useLocation } from 'react-router-dom';
import Studio from '@/pages/Studio';

// Remount the Studio when the room in the URL changes (e.g. Aura opens another room).
export default function StudioRoute() {
  const { search } = useLocation();
  return <Studio key={search} />;
}