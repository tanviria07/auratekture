// Shared item catalog. Footprints are inches: w (width) × d (depth) × h (height).
const c = (label, w, d, h, kind) => ({ label, w, d, h, kind });

export const CATEGORIES = {
  table: c('Table', 72, 30, 30, 'room'),
  chair: c('Chair', 18, 20, 32, 'room'),
  sofa: c('Sofa', 84, 36, 34, 'room'),
  coffee_table: c('Coffee table', 48, 24, 18, 'room'),
  fireplace: c('Fireplace', 60, 18, 40, 'room'),
  heater: c('Heater', 24, 8, 24, 'room'),
  shelf: c('Shelf', 36, 12, 72, 'room'),
  tv: c('TV', 50, 4, 30, 'room'),
  desk: c('Desk', 48, 24, 30, 'room'),
  whiteboard: c('Whiteboard', 72, 4, 48, 'room'),
  podium: c('Podium', 24, 20, 45, 'room'),
  rug: c('Rug', 96, 60, 1, 'room'),
  lamp: c('Lamp', 14, 14, 60, 'room'),
  plant: c('Plant', 18, 18, 36, 'room'),
  door: c('Door', 36, 4, 80, 'room'),
  window: c('Window', 36, 4, 48, 'room'),
  other: c('Other', 24, 24, 24, 'room'),
  power_strip: c('Power strip', 12, 3, 2, 'purchasable'),
  extension_cord: c('Extension cord', 8, 8, 3, 'purchasable'),
  cable_cover: c('Cable cover', 60, 10, 1, 'purchasable'),
  table_tent: c('Table tent', 4, 3, 5, 'purchasable'),
  water_station: c('Water station', 30, 24, 40, 'purchasable'),
  trash_bin: c('Trash bin', 16, 16, 30, 'purchasable'),
  speaker: c('Speaker', 10, 10, 20, 'purchasable'),
  christmas_tree: c('Christmas tree', 50, 50, 90, 'purchasable'),
  string_lights: c('String lights', 6, 6, 6, 'purchasable'),
  tree_skirt: c('Tree skirt', 48, 48, 1, 'purchasable'),
  ornaments: c('Ornaments', 12, 12, 12, 'purchasable'),
  garland: c('Garland', 72, 6, 6, 'purchasable'),
  wreath: c('Wreath', 24, 4, 24, 'purchasable'),
  tablecloth: c('Tablecloth', 72, 30, 1, 'purchasable'),
  sign_holder: c('Sign holder', 9, 4, 12, 'purchasable'),
};

export const ROOM_KEYS = Object.keys(CATEGORIES).filter((k) => CATEGORIES[k].kind === 'room');
export const PURCHASABLE_KEYS = Object.keys(CATEGORIES).filter((k) => CATEGORIES[k].kind === 'purchasable');

export const VENUE_OPTIONS = ['Wi-Fi', 'Sound system', 'Tables', 'Chairs', 'Power strips', 'Trash bins', 'Water'];