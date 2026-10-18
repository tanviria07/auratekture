import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';

const s = (ms) => (ms == null ? '–' : `${Math.round(ms / 1000)}s`);

export default function DesignTimings() {
  const { data: runs = [] } = useQuery({
    queryKey: ['design-timings'],
    queryFn: () => base44.entities.DesignTiming.filter({}, { sort: '-created_date', limit: 5 }).then((r) => r.items),
  });
  return (
    <section className="rounded-2xl border bg-card p-8 space-y-4">
      <h2 className="text-xl">Last 5 design runs</h2>
      {!runs.length && <p className="text-sm text-muted-foreground">No runs yet.</p>}
      <ul className="space-y-2 text-sm">
        {runs.map((r) => (
          <li key={r.id} className="flex flex-wrap gap-x-3">
            <span className="text-muted-foreground">{new Date(r.created_date).toLocaleString()} · {r.mode === 'background' ? 'background' : 'fresh'}</span>
            <span>plan {s(r.plan_ms)} · search {s(r.search_ms)} · match {s(r.match_ms)} · retry {s(r.retry_ms)} · image {s(r.image_ms)}{r.bg_image_ms != null && ` · background picture ${s(r.bg_image_ms)}`} · dots {s(r.dots_ms)} · total {s(r.total_ms)}{r.waited_ms != null && ` · waited after pressing Design: ${s(r.waited_ms)}`}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}