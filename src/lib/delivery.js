// Reads a delivery date only when the listing states one. Never guesses.
const MONTHS = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec'];
const DAYS = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];
const DAY_MS = 86400000;

export function deliveryDate(text, today = new Date()) {
  if (!text) return null;
  const t = String(text).toLowerCase();
  const day0 = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const at = (m, d) => {
    const x = new Date(day0.getFullYear(), m, d);
    if (x < day0 - 7 * DAY_MS) x.setFullYear(x.getFullYear() + 1);
    return x;
  };
  const dates = [];
  for (const m of t.matchAll(/\b(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\.?\s+(\d{1,2})(?:\s*[-–]\s*(\d{1,2}))?\b/g)) {
    const mi = MONTHS.indexOf(m[1]);
    dates.push(at(mi, Number(m[2])));
    if (m[3]) dates.push(at(mi, Number(m[3])));
  }
  if (!dates.length && /\btomorrow\b/.test(t)) dates.push(new Date(+day0 + DAY_MS));
  if (!dates.length && /\btoday\b/.test(t)) dates.push(day0);
  if (!dates.length) {
    const w = t.match(/\b(?:by|on|arrives|get it)\b[^a-z]*(sun|mon|tue|wed|thu|fri|sat)[a-z]*\b/);
    if (w) dates.push(new Date(+day0 + (((DAYS.indexOf(w[1]) - day0.getDay() + 7) % 7) || 7) * DAY_MS));
  }
  return dates.length ? new Date(Math.max(...dates)) : null;
}

// null when the room has no needed-by date.
export function deliveryStatus(product, neededBy) {
  if (!neededBy || !product) return null;
  const d = deliveryDate(product.delivery);
  if (!d) return { key: 'unknown', label: 'Delivery date not listed' };
  const need = new Date(`${neededBy}T23:59:59`);
  return d <= need
    ? { key: 'on_time', label: 'Arrives in time', date: d }
    : { key: 'late', label: 'Might be late', date: d };
}