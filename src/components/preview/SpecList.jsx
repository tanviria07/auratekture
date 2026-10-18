const BADGE = {
  quoted: 'bg-emerald-100 text-emerald-800',
  estimated: 'bg-amber-100 text-amber-800',
  missing: 'bg-muted text-muted-foreground',
};

const LABEL = { quoted: 'from the listing', estimated: 'estimated', missing: 'not listed' };

// A spec value may be plain or {value, status|source}.
const read = (v, src) => {
  const value = v && typeof v === 'object' && !Array.isArray(v) ? v.value : v;
  const status = (v && typeof v === 'object' && (v.status || v.source)) || src || (value == null || value === '' ? 'missing' : 'quoted');
  return { value, status: BADGE[status] ? status : 'estimated' };
};

export default function SpecList({ specs, sources = {} }) {
  const rows = Object.entries(specs || {});
  if (!rows.length) return null;
  return (
    <ul className="space-y-1 text-sm">
      {rows.map(([k, v]) => {
        const { value, status } = read(v, sources?.[k]);
        return (
          <li key={k} className="flex items-center justify-between gap-2">
            <span className="text-muted-foreground">{k.replace(/_/g, ' ')}</span>
            <span className="flex items-center gap-1.5">
              <span>{value == null ? '—' : String(value)}</span>
              <span className={`text-[10px] rounded-full px-1.5 py-0.5 ${BADGE[status]}`}>{LABEL[status]}</span>
            </span>
          </li>
        );
      })}
    </ul>
  );
}