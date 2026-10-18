// Keep in sync with src/lib/kit.js.
export function parseKit(run) {
  try { return JSON.parse(JSON.parse(run?.inputs || '{}').kit_json || '{}').kit_lines || []; } catch { return []; }
}

// The Event's kit, falling back to the kit stored on its last shopping run.
export async function loadKitLines(db, ev) {
  if (ev.kit_lines?.length) return ev.kit_lines;
  const { items } = await db.entities.CreaoRun.filter({ event_id: ev.id, role: 'buyer' }, { sort: '-created_date', limit: 1 });
  return parseKit(items[0]);
}

// Enabled kit lines with their search result, options (pick + alternatives) and the chosen product.
export function buildKit(lines, products = [], choices = {}) {
  return (lines || []).filter((l) => l.enabled !== false).map((line) => {
    const result = (products || []).find((p) => p.line_id === line.line_id) || null;
    const options = result?.status === 'found' ? [result, ...(result.alternatives || [])] : [];
    const idx = Math.min(Number(choices?.[line.line_id]) || 0, Math.max(options.length - 1, 0));
    return { ...line, result, options, choice: idx, product: options[idx] || null };
  });
}