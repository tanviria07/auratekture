import { secrets } from 'base44:runtime';
import { sha256, toHex, toB64 } from './canonical.ts';

// Visa Trusted Agent Protocol (RFC 9421 profile).
export const COVERED = '("@authority" "@path" "content-digest")';
export const TAG = 'agent-payer-auth';
export const MAX_WINDOW_S = 480; // 8 minutes

export async function getAgentKeys() {
  const pem = secrets.get('AGENT_SIGNING_PRIVATE_KEY') || '';
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const publicKey = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, true, ['verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  return { privateKey, publicKey, x: jwk.x, keyid: 'agent-' + toHex(await sha256(raw)).slice(0, 16) };
}

export const publicJwk = (keys) => ({ kty: 'OKP', crv: 'Ed25519', x: keys.x, kid: keys.keyid, alg: 'EdDSA', use: 'sig' });

export const merchantUrl = (origin) => new URL('/functions/merchantVerify', origin);
export const keyDirectoryUrl = (origin, keyid) => {
  const u = new URL('/functions/agentKeys', origin);
  u.searchParams.set('keyid', keyid);
  return u;
};

export function signatureBase(path, authority, digest, params) {
  return `"@authority": ${authority}\n"@path": ${path}\n"content-digest": ${digest}\n"@signature-params": ${params}`;
}

export const contentDigest = async (body) => 'sha-256=:' + toB64(await sha256(body)) + ':';

// Sends an already-signed request to the store verifier, byte for byte.
export async function sendSigned(origin, request) {
  const res = await fetch(merchantUrl(origin), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Digest': request.content_digest, 'Signature-Input': request.signature_input, Signature: request.signature },
    body: request.body,
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})), request };
}

// Signs and sends a request to merchantVerify. tamper=true changes one byte of the body after signing.
export async function signedAgentFetch(origin, keys, payload, tamper = false) {
  const url = merchantUrl(origin);
  const body = JSON.stringify(payload);
  const digest = await contentDigest(body);
  const created = Math.floor(Date.now() / 1000);
  const params = `${COVERED};created=${created};expires=${created + MAX_WINDOW_S};keyid="${keys.keyid}";alg="Ed25519";nonce="${crypto.randomUUID()}";tag="${TAG}"`;
  const base = signatureBase(url.pathname, url.host, digest, params);
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, keys.privateKey, new TextEncoder().encode(base));
  let sent = body;
  if (tamper) {
    const i = body.length - 2;
    sent = body.slice(0, i) + (body[i] === '1' ? '2' : '1') + body.slice(i + 1);
  }
  return sendSigned(origin, { signature_input: `sig1=${params}`, signature: `sig1=:${toB64(sig)}:`, content_digest: digest, body: sent, created });
}