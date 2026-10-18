// Deterministic "what's missing" rules: purpose, headcount, ceiling and venue → kit lines with a budget split.
export const QUERY: Record<string, string> = {
  christmas_tree: 'artificial christmas tree', string_lights: 'indoor LED string lights', tree_skirt: 'christmas tree skirt',
  ornaments: 'shatterproof christmas ornaments set', garland: 'christmas garland', wreath: 'christmas wreath',
  tablecloth: 'rectangle tablecloth', speaker: 'portable bluetooth speaker', trash_bin: 'trash can with lid',
  power_strip: 'surge protector power strip', cable_cover: 'floor cable cover', table_tent: 'table tent card holders',
  sign_holder: 'acrylic sign holder', water_station: 'beverage dispenser with stand',
};

export function needRules(ev: any) {
  const purpose = (ev.room_purpose || '').toLowerCase();
  const venue = (ev.venue_supplied?.options || []).map((s: string) => s.toLowerCase());
  const people = Number(ev.headcount) || 10;
  const ceiling = Number(ev.ceiling_ft) || 8;
  const lines: any[] = [];
  const add = (category: string, qty: number, reason: string, specs: any = {}, weight = 1) =>
    lines.push({ line_id: `L${lines.length + 1}`, category, qty, reason, specs, weight, enabled: true });

  if (/holiday|christmas|xmas|festive/.test(purpose)) {
    add('christmas_tree', 1, `The centerpiece, sized to leave 1 ft under your ${ceiling} ft ceiling.`, { height_in_max: (ceiling - 1) * 12 }, 6);
    add('string_lights', 2, 'Indoor-rated LED lights for the tree.', { indoor: true, watts_max: 60 }, 1);
    add('tree_skirt', 1, 'Covers the tree stand and cords.', {}, 1);
    add('ornaments', 1, 'Shatterproof ornaments to dress the tree.', {}, 2);
    add('garland', 1, 'Ties the decor into the rest of the room.', {}, 1);
    add('wreath', 1, 'A finishing touch on a wall or door (not over a heat source).', {}, 1);
  } else if (/party|birthday|reception|wedding|celebrat|shower/.test(purpose)) {
    add('tablecloth', Math.ceil(people / 8), 'One per table so the room looks finished.');
    add('string_lights', 1, 'Indoor-rated ambient lighting.', { indoor: true, watts_max: 60 });
    if (!venue.includes('sound system')) add('speaker', 1, 'Music for the room.', {}, 3);
    if (!venue.includes('trash bins')) add('trash_bin', Math.max(1, Math.ceil(people / 40)), 'Keeps cleanup easy.');
  } else if (/meet|workshop|conference|hackathon|offsite|expo|judg|class|pop-up/.test(purpose)) {
    if (!venue.includes('power strips')) add('power_strip', Math.max(1, Math.ceil(people / 6)), 'Laptops and devices need power.', { watts_max: 1440 });
    add('cable_cover', 2, 'Keeps cords from being a trip hazard.');
    add('table_tent', Math.max(1, Math.ceil(people / 4)), 'Labels tables and teams.');
    add('sign_holder', 2, 'Wayfinding and agenda signs.');
    if (!venue.includes('water')) add('water_station', 1, 'Keeps people hydrated.', {}, 3);
    if (!venue.includes('trash bins')) add('trash_bin', Math.max(1, Math.ceil(people / 40)), 'Keeps cleanup easy.');
  } else {
    add('string_lights', 1, 'Indoor-rated ambient lighting.', { indoor: true, watts_max: 60 });
    add('trash_bin', 1, 'Keeps cleanup easy.');
  }

  const budget = ev.budget_cents ? ev.budget_cents / 100 : null;
  const total = lines.reduce((s, l) => s + l.weight * l.qty, 0);
  return lines.map(({ weight, ...l }) => ({
    ...l, search_query: QUERY[l.category] || l.category.replace(/_/g, ' '),
    max_unit_price_usd: budget ? Math.round((budget * weight / total) * 100) / 100 : null,
  }));
}