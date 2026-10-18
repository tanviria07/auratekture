import { base44 } from '@/api/base44Client';

const title = (s) => s.trim().replace(/\s+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

// "christmas" + "living room" → "Christmas Living Room", numbered if already taken.
export async function autoRoomName(purpose, roomType, visitorId, selfId) {
  const p = title(purpose);
  const t = title(roomType || 'room');
  const base = p.toLowerCase().endsWith(t.toLowerCase()) ? p : `${p} ${t}`;
  const esc = base.replace(/[.*+?^${}()|[\]\\']/g, '\\$&');
  const query = { name: { $regex: `^${esc}( \\d+)?$`, $options: 'i' }, ...(selfId && { id: { $ne: selfId } }), ...(visitorId && { visitor_id: visitorId }) };
  const { items } = await base44.entities.Event.filter(query, { fields: ['name'], limit: 200 });
  const taken = new Set(items.map((e) => e.name.toLowerCase()));
  if (!taken.has(base.toLowerCase())) return base;
  let n = 2;
  while (taken.has(`${base} ${n}`.toLowerCase())) n++;
  return `${base} ${n}`;
}