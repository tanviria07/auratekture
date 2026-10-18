// Plain-code safety checks on the chosen products. ok: true pass, false fail, null needs a look.
const POWERED = { string_lights: 24, speaker: 50 }; // fallback watts when a listing doesn't say
const FLAME = /candle|tealight|tea light|open flame|torch|lantern oil/i;
const SAFE_FLAME = /flameless|led|battery/i;

export function safetyChecks(kit, ceilingFt) {
  const items = kit.filter((l) => l.product);
  const out = [];
  const ceiling = Number(ceilingFt) || 8;

  const tree = items.find((l) => l.category === 'christmas_tree');
  if (tree) {
    const max = (ceiling - 1) * 12, h = tree.product.specs?.height_in;
    out.push(h == null
      ? { ok: null, label: `Tree height not listed — keep it at most ${ceiling - 1} ft` }
      : { ok: h <= max, label: `Tree ${+(h / 12).toFixed(1)} ft, limit ${ceiling - 1} ft (ceiling minus 1 ft)`, note: tree.product.specs?.confidence?.height_in === 'quoted' ? 'from the listing' : 'estimated' });
  }

  const lights = items.filter((l) => l.category === 'string_lights');
  if (lights.length) {
    const rated = lights.map((l) => l.product.indoor_rated || 'not stated');
    out.push(rated.includes('no')
      ? { ok: false, label: 'String lights marked outdoor only' }
      : rated.includes('not stated')
        ? { ok: null, label: 'Check the listing: indoor rating not stated' }
        : { ok: true, label: 'String lights are indoor rated' });
  }

  const powered = items.filter((l) => l.category in POWERED);
  if (powered.length) {
    let w = 0, est = false;
    for (const l of powered) { const v = l.product.specs?.watts; if (v == null) est = true; w += (v ?? POWERED[l.category]) * (l.qty || 1); }
    out.push({ ok: w <= 1440, label: `${Math.round(w)} W of 1,440 W on one 15 A circuit`, note: est ? 'estimated' : 'from the listing' });
  }

  const flames = items.filter((l) => FLAME.test(l.product.title) && !SAFE_FLAME.test(l.product.title));
  out.push({ ok: !flames.length, label: flames.length ? `Open flame: ${flames.map((l) => l.product.title).join(', ')}` : 'No open flames or candles' });
  const mantelDecor = items.filter((l) => {
    const z = (l.zone || '').toLowerCase(), p = (l.placement || '').toLowerCase();
    return z.includes('mantel') || p.includes('mantel') || (['garland', 'stockings'].includes(l.category) && (z.includes('fireplace') || p.includes('fireplace')));
  });
  if (mantelDecor.length) out.push({ ok: null, label: "Don't use the fireplace while mantel decor is up.", note: 'Fire hazard' });
  out.push({ ok: true, label: 'Decor 3 ft from heat sources, doors kept clear', note: 'Placement shown is a suggestion' });
  return out;
}