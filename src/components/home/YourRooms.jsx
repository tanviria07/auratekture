import { Link } from 'react-router-dom';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { format } from 'date-fns';
import { Trash2, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function YourRooms() {
  const qc = useQueryClient();
  const { data: rooms, isLoading } = useQuery({
    queryKey: ['events'],
    queryFn: () => base44.entities.Event.filter({}, { sort: '-updated_date', limit: 50 }).then((p) => p.items),
  });

  const remove = async (e, id) => {
    e.preventDefault();
    if (!confirm('Delete this room?')) return;
    await base44.entities.Event.delete(id);
    qc.invalidateQueries({ queryKey: ['events'] });
  };

  return (
    <section className="pb-section">
      <h2 className="text-3xl mb-6">Your rooms</h2>
      {isLoading ? <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" /> : rooms.length === 0 ? (
        <div className="rounded-2xl border border-dashed p-10 text-center text-muted-foreground">
          No rooms yet. Snap a photo and plan your first room.
        </div>
      ) : (
        <div className="divide-y rounded-2xl border bg-card">
          {rooms.map((r) => (
            <Link key={r.id} to={`/studio?event=${r.id}`} className="flex items-center gap-4 px-6 py-5 hover:bg-muted/50 transition-colors">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{r.name}</p>
                <p className="text-sm text-muted-foreground truncate">{r.room_purpose || 'No purpose yet'}</p>
              </div>
              <span className="hidden sm:block text-sm text-muted-foreground">{format(new Date(r.updated_date), 'MMM d, yyyy')}</span>
              <span className="text-xs rounded-full bg-accent text-accent-foreground px-3 py-1 capitalize">{r.status || 'draft'}</span>
              <button onClick={(e) => remove(e, r.id)} className="text-muted-foreground hover:text-destructive" aria-label="Delete room">
                <Trash2 className="w-4 h-4" />
              </button>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}