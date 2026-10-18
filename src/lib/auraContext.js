import { lineName, productPrice } from '@/lib/kit';
import { safetyChecks } from '@/lib/safety';

// Studio's part of Aura's context.
export function studioContext({ facts, design, numbered, chosen, analyzing, chips, imageUpdated, checkoutOpen }) {
  const pa = facts.photo_analysis;
  const venue = facts.venue_supplied;
  return {
    room_name: facts.name || null, has_photo: !!facts.photo_url, analyzing, analyzed: !!pa,
    designing: design.busy && design.steps.place?.status !== 'done' && !facts.previews?.length,
    products_ready: design.busy && design.steps.find?.status === 'done' && design.steps.place?.status !== 'done' && chosen.length > 0 && !facts.previews?.length,
    designed: chosen.length > 0 && !!facts.previews?.length, image_updated: imageUpdated, checkout_open: checkoutOpen,
    photo_summary: { items: (chips || []).map((c) => c.label), style_notes: pa?.style_notes || pa?.style || null, colors: facts.color_palette || [] },
    purpose: facts.room_purpose || null, ceiling_ft: facts.ceiling_ft || null, people: facts.headcount || null,
    budget: facts.budget || null, needed_by: facts.deadline || null, theme: facts.theme || null,
    already_here: [...(venue?.options || []), venue?.other].filter(Boolean),
    items: numbered.map((x) => ({ number: x.n, name: lineName(x.line), store: x.line.product?.store, price: productPrice(x.line.product), alternatives: Math.max((x.line.options?.length || 0) - 1, 0) })),
    total: Math.round(chosen.reduce((s, l) => s + (productPrice(l.product) || 0) * (l.qty || 1), 0) * 100) / 100,
    warnings: chosen.length ? safetyChecks(chosen, facts.ceiling_ft).filter((c) => c.ok !== true).map((c) => c.label) : [],
  };
}

function stepOf(s, c) {
  if (!s) return 'home';
  if (c.blocked) return 'blocked';
  if (c.paid) return 'paid';
  if (c.partial) return 'partial';
  if (s.checkout_open) return 'checkout_open';
  if (s.products_ready) return 'products_ready';
  if (s.designing) return 'designing';
  if (!s.has_photo) return 'need_photo';
  if (s.analyzing) return 'analyzing';
  if (s.designed) return s.image_updated ? 'image_updated' : 'designed';
  return 'room_ready';
}

export function buildAuraContext({ onStudio, studio, checkout, rooms }) {
  const s = onStudio ? studio : null;
  const { room_name = null, has_photo = false, photo_summary = { items: [], style_notes: null, colors: [] }, purpose = null, ceiling_ft = null, people = null, budget = null, needed_by = null, already_here = [], theme = null, items = [], total = 0, warnings = [] } = s || {};
  return {
    page: !s ? 'home' : s.checkout_open ? 'checkout' : 'studio', step: stepOf(s, checkout || {}), room_name, has_photo, rooms,
    photo_summary, purpose, ceiling_ft, people, budget, needed_by, already_here, theme, items, total, warnings,
    receipt_total: s ? checkout?.receipt_total ?? null : null,
    trust_check: s ? checkout?.trust || null : null,
    partial: s ? checkout?.partial ?? null : null,
  };
}