import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';
import { merchantUrl, keyDirectoryUrl, signatureBase, contentDigest, COVERED, TAG, MAX_WINDOW_S } from '../../shared/agentSig.ts';
import { fromB64 } from '../../shared/canonical.ts';
import { checkMandate } from '../../shared/mandate.ts';

const LABELS = {
  tag: 'Tag is agent-payer-auth',
  fields: 'All required fields present',
  window: 'Created in the past, not expired, window at most 8 minutes',
  nonce: 'Request not seen in the last 8 minutes',
  key: 'Agent key found in the directory',
  signature: 'Signature verifies',
  approval: 'Matches your approval (items, prices, cap, stores, not expired, not used)',
};

const parseParams = (s) => Object.fromEntries([...s.matchAll(/;([a-z]+)=(?:"([^"]*)"|(\d+))/g)].map((m) => [m[1], m[2] ?? Number(m[3])]));

// Store-side verifier. Runs the steps in order and stops at the first failure.
export default async function(req) {
  const steps = [];
  const pass = (id, detail = '') => steps.push({ id, label: LABELS[id], ok: true, detail });
  const stop = (id, detail, error = 'AGENT_SIGNATURE_INVALID', status = 401) => {
    steps.push({ id, label: LABELS[id], ok: false, detail });
    return Response.json({ error, reason: detail, steps }, { status });
  };
  try {
    if (req.method !== 'POST') return Response.json({ error: 'Method not allowed' }, { status: 405 });
    const body = await req.text();
    const input = req.headers.get('Signature-Input') || '';
    const sigHeader = req.headers.get('Signature') || '';
    const digest = req.headers.get('Content-Digest') || '';
    const raw = input.startsWith('sig1=') ? input.slice(5) : '';
    const p = parseParams(raw);

    // 1. Tag
    if (p.tag !== TAG) return stop('tag', `Tag was ${p.tag ? `"${p.tag}"` : 'missing'}`);
    pass('tag', TAG);

    // 2. Required fields
    const missing = [
      !raw.startsWith(COVERED) && 'covered components (@authority @path content-digest)',
      !p.created && 'created', !p.expires && 'expires', !p.keyid && 'keyid', p.alg !== 'Ed25519' && 'alg="Ed25519"', !p.nonce && 'nonce',
      !digest && 'Content-Digest', !/^sig1=:[^:]+:$/.test(sigHeader) && 'Signature',
    ].filter(Boolean);
    if (missing.length) return stop('fields', `Missing: ${missing.join(', ')}`);
    pass('fields', '@authority, @path, content-digest, created, expires, keyid, alg, nonce, tag');

    // 3. Time window
    const now = Math.floor(Date.now() / 1000);
    if (p.created > now + 5) return stop('window', 'Created in the future');
    if (p.expires <= now) return stop('window', 'Signature has expired');
    if (p.expires - p.created > MAX_WINDOW_S) return stop('window', `Window is ${p.expires - p.created}s, over ${MAX_WINDOW_S}s`);
    pass('window', `${p.expires - p.created}s window, ${p.expires - now}s left`);

    // 4. Nonce
    const db = createClientFromRequest(req).asServiceRole;
    const since = new Date(Date.now() - MAX_WINDOW_S * 1000).toISOString();
    if (await db.entities.AgentNonce.count({ nonce: p.nonce, created_date: { $gte: since } })) {
      return stop('nonce', 'This exact request was already used', 'NONCE_REPLAYED');
    }
    pass('nonce', 'New nonce');

    // 5. Key directory
    const url = merchantUrl(req.headers.get('X-Base44-App-Url') || new URL(req.url).origin);
    const kr = await fetch(keyDirectoryUrl(url.origin, p.keyid), { signal: AbortSignal.timeout(10000) });
    if (!kr.ok) return stop('key', `No key in the directory for ${p.keyid}`);
    const jwk = await kr.json();
    const pub = await crypto.subtle.importKey('jwk', { kty: jwk.kty, crv: jwk.crv, x: jwk.x }, { name: 'Ed25519' }, false, ['verify']);
    pass('key', p.keyid);

    // 6. Signature
    if (digest !== (await contentDigest(body))) return stop('signature', 'Body does not match its Content-Digest');
    const sig = sigHeader.match(/^sig1=:([^:]+):$/)[1];
    const base = signatureBase(url.pathname, url.host, digest, raw);
    if (!(await crypto.subtle.verify({ name: 'Ed25519' }, pub, fromB64(sig), new TextEncoder().encode(base)))) return stop('signature', 'Signature does not match');
    await db.entities.AgentNonce.create({ nonce: p.nonce, keyid: p.keyid });
    pass('signature', 'Ed25519');

    // 7. Approval check
    const { mandate_id, store, amount_cents } = JSON.parse(body);
    const m = mandate_id && await db.entities.Mandate.get(mandate_id).catch(() => null);
    if (!m) return stop('approval', 'No approval found for this request');
    const { items: [basket] } = await db.entities.Basket.filter({ event_id: m.event_id }, { sort: '-created_date', limit: 1 });
    if (!basket) return stop('approval', 'No basket for this approval');
    const c = await checkMandate(m, basket.items);
    if (c.reason) return stop('approval', c.reason, 'MANDATE_TAMPER_BLOCKED', 403);
    if (!(store in c.totals)) return stop('approval', `${store} is not one of the approved stores`);
    if (c.totals[store] !== amount_cents) return stop('approval', 'Amount does not match the mandate basket');
    pass('approval', `${store} $${(amount_cents / 100).toFixed(2)}, total within the $${(m.cap_cents / 100).toFixed(2)} cap`);

    return Response.json({ ok: true, store, amount_cents, keyid: p.keyid, steps });
  } catch (error) {
    return Response.json({ error: error.message, steps }, { status: 500 });
  }
}