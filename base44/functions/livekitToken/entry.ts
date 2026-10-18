import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { AccessToken } from 'npm:livekit-server-sdk@2.9.7';
import { RoomConfiguration, RoomAgentDispatch } from 'npm:@livekit/protocol@1.29.4';
import { secrets } from 'base44:runtime';
import { getAdmin } from '../../shared/auth.ts';

const hex = (n: number) => Array.from(crypto.getRandomValues(new Uint8Array(n / 2)), (b) => b.toString(16).padStart(2, '0')).join('');

export default async function(req: Request) {
  try {
    const base44 = createClientFromRequest(req);
    const db = base44.asServiceRole;
    const { visitor_id } = await req.json();
    const by_admin = !!(await getAdmin(base44));
    if (!by_admin) {
      if (!visitor_id || typeof visitor_id !== 'string') return Response.json({ error: 'visitor_id required' }, { status: 400 });
      const since = new Date(Date.now() - 3600_000).toISOString();
      const q = { visitor_id, created_date: { $gte: since } };
      if ((await db.entities.AuraSession.count(q)) >= 5) {
        const { items } = await db.entities.AuraSession.filter(q, { sort: 'created_date', limit: 1 });
        const mins = items[0] ? Math.max(1, Math.ceil((new Date(items[0].created_date).getTime() + 3600_000 - Date.now()) / 60000)) : 60;
        return Response.json({ error: `You've talked to Aura 5 times this hour. Try again in ${mins} min.` }, { status: 429 });
      }
    }

    const room = 'aura-' + hex(8);
    const identity = 'user-' + hex(8);
    const at = new AccessToken(secrets.get('LIVEKIT_API_KEY'), secrets.get('LIVEKIT_API_SECRET'), { identity, ttl: '15m' });
    at.addGrant({ roomJoin: true, room, canPublish: true, canSubscribe: true, canPublishData: true });
    at.roomConfig = new RoomConfiguration({ syncStreams: true, agents: [new RoomAgentDispatch({ agentName: 'aura' })] });
    const token = await at.toJwt();

    await db.entities.AuraSession.create({ visitor_id: visitor_id || 'admin', room_name: room });
    return Response.json({ url: secrets.get('LIVEKIT_URL'), token });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}