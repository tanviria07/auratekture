import { getAgentKeys, publicJwk } from '../../shared/agentSig.ts';

// Public key directory: GET ?keyid=... returns the agent's public key as a JWK.
export default async function(req) {
  try {
    const keys = await getAgentKeys();
    const keyid = new URL(req.url).searchParams.get('keyid');
    if (!keyid) return Response.json({ keys: [publicJwk(keys)] });
    if (keyid !== keys.keyid) return Response.json({ error: 'KEY_NOT_FOUND' }, { status: 404 });
    return Response.json(publicJwk(keys));
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}