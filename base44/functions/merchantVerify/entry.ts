import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { getAgentKeys, merchantUrl, signatureBase, contentDigest, COVERED } from '../../shared/agentSig.ts';
import { storeTotals, fromB64 } from '../../shared/canonical.ts';

const deny = (reason) => Response.json({ error: 'AGENT_SIGNATURE_INVALID', reason }, { status: 401 });

export default async function(req) {
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const body = await req.text();
    const input = req.headers.get('Signature-Input') || '';
    const sigHeader = req.headers.get('Signature') || '';
    const digest = req.headers.get('Content-Digest') || '';
    const params = input.startsWith('sig1=') ? input.slice(5) : '';
    if (!params.startsWith(COVERED)) return deny('Missing or wrong covered components');
    const created = Number(params.match(/;created=(\d+)/)?.[1]);
    const expires = Number(params.match(/;expires=(\d+)/)?.[1]);
    const keyid = params.match(/;keyid="([^"]+)"/)?.[1];
    if (!params.match(/;nonce="[^"]+"/)) return deny('Missing nonce');
    const now = Math.floor(Date.now() / 1000);
    if (!created || !expires || now > expires || created > now + 30) return deny('Signature expired or not yet valid');

    const keys = await getAgentKeys();
    if (keyid !== keys.keyid) return deny('Unknown keyid');
    if (digest !== (await contentDigest(body))) return deny('Content-Digest mismatch');
    const sig = sigHeader.match(/^sig1=:([^:]+):$/)?.[1];
    if (!sig) return deny('Malformed Signature header');
    const url = merchantUrl(req.headers.get('X-Base44-App-Url') || new URL(req.url).origin);
    const base = signatureBase(req.method, url.pathname, url.host, digest, params);
    const ok = await crypto.subtle.verify({ name: 'Ed25519' }, keys.publicKey, fromB64(sig), new TextEncoder().encode(base));
    if (!ok) return deny('Signature verification failed');

    const { mandate_id, store, amount_cents } = JSON.parse(body);
    const base44 = createClientFromRequest(req);
    const mandate = await base44.asServiceRole.entities.Mandate.get(mandate_id);
    const { items } = await base44.asServiceRole.entities.Basket.filter({ event_id: mandate.event_id }, { sort: '-created_date', limit: 1 });
    if (!items[0] || storeTotals(items[0].items)[store] !== amount_cents) return deny('Amount does not match the mandate basket');
    return Response.json({ ok: true, store, amount_cents, keyid });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}