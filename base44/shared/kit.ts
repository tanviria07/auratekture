// Keep in sync with src/lib/kit.js. Builds kit lines with the chosen product per line.
export function productRows(result) {
  return result?.products || result?.results || result?.items || result?.candidates || [];
}

export function buildKit(run, choices = {}) {
  if (!run) return [];
  let kitLines = [];
  try { kitLines = JSON.parse(JSON.parse(run.inputs || '{}').kit_json || '{}').kit_lines || []; } catch { kitLines = []; }
  const rows = productRows(run.parsed_result);
  return kitLines.map((line) => {
    const mine = rows.filter((r) => r.line_id === line.line_id);
    const options = [...mine, ...mine.flatMap((r) => r.alternatives || [])];
    const idx = Math.min(Number(choices?.[line.line_id]) || 0, Math.max(options.length - 1, 0));
    return { ...line, options, choice: idx, product: options[idx] || null };
  });
}

export async function latestBuyerRun(db, event_id) {
  const { items } = await db.entities.CreaoRun.filter({ event_id, role: 'buyer', status: 'completed' }, { sort: '-created_date', limit: 1 });
  return items[0] || null;
}