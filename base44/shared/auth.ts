// Returns the admin user, or null for logged-out visitors and non-admins. Never throws.
export async function getAdmin(base44) {
  try {
    const u = await base44.auth.me();
    return u?.role === 'admin' ? u : null;
  } catch {
    return null;
  }
}

export const adminOnly = () => Response.json({ error: 'Admins only' }, { status: 403 });