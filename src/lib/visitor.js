// Random per-browser id so logged-out visitors see only their own rooms.
let memoryId = null;

export function getVisitorId() {
  try {
    let id = localStorage.getItem('visitor_id');
    if (!id) { id = crypto.randomUUID(); localStorage.setItem('visitor_id', id); }
    return id;
  } catch {
    return (memoryId ??= crypto.randomUUID());
  }
}