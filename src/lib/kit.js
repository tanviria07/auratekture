// Keep in sync with base44/shared/kit.ts.
export function parseKit(run) {
  try { return JSON.parse(JSON.parse(run?.inputs || '{}').kit_json || '{}').kit_lines || []; } catch { return []; }
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

const DIMS = ['width_in', 'depth_in', 'height_in', 'watts', 'length_ft'];
const required = (line) => DIMS.filter((k) => Object.keys(line.specs || {}).some((s) => s.startsWith(k)));
// Specs worth showing: known values plus the ones the line requires.
export const specValues = (line, p) => Object.fromEntries(DIMS.filter((k) => p?.specs?.[k] != null || required(line).includes(k)).map((k) => [k, p?.specs?.[k] ?? null]));
export const missingSpecs = (line, p) => required(line).filter((k) => p?.specs?.[k] == null);

export const productUrl = (p) => p?.product_url || p?.url;
export const productPrice = (p) => p?.unit_price_usd ?? p?.price_usd ?? p?.price;
export const lineName = (l) => l.product?.title || l.category?.replace(/_/g, ' ') || l.line_id;