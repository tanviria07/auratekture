import { missingSpecs } from '@/lib/kit';
import { deliveryStatus } from '@/lib/delivery';

// Checks one product passed (true), flagged (false) or couldn't confirm (null).
export function itemChecks(line, neededBy) {
  const p = line?.product;
  if (!p) return [];
  const out = [];
  if (line.max_unit_price_usd != null) {
    out.push(p.unit_price_usd > line.max_unit_price_usd ? { ok: false, label: 'Over the per-item budget' } : { ok: true, label: 'Within the per-item budget' });
  }
  const missing = missingSpecs(line, p);
  if (missing.length) out.push({ ok: null, label: `Not listed: ${missing.map((k) => k.replace(/_/g, ' ')).join(', ')}` });
  else if (Object.keys(line.specs || {}).length) out.push({ ok: true, label: 'Required sizes listed' });
  if (line.category === 'string_lights') {
    const r = p.indoor_rated;
    out.push(r === 'yes' ? { ok: true, label: 'Indoor rated (from the listing)' } : r === 'no' ? { ok: false, label: 'Outdoor only (from the listing)' } : { ok: null, label: 'Indoor rating not listed' });
  }
  const d = deliveryStatus(p, neededBy);
  if (d) out.push({ ok: d.key === 'on_time' ? true : d.key === 'late' ? false : null, label: d.label });
  return out;
}