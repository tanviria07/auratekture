import { secrets } from 'base44:runtime';
import { sha256, toHex, toB64 } from './canonical.ts';

export const COVERED = '("@method" "@path" "@authority" "content-digest")';

export async function getAgentKeys() {
  const pem = secrets.get('AGENT_SIGNING_PRIVATE_KEY') || '';
  const der = Uint8Array.from(atob(pem.replace(/-----[^-]+-----|\s/g, '')), (c) => c.charCodeAt(0));
  const privateKey = await crypto.subtle.importKey('pkcs8', der, { name: 'Ed25519' }, true, ['sign']);
  const jwk = await crypto.subtle.exportKey('jwk', privateKey);
  const publicKey = await crypto.subtle.importKey('jwk', { kty: 'OKP', crv: 'Ed25519', x: jwk.x }, { name: 'Ed25519' }, true, ['verify']);
  const raw = new Uint8Array(await crypto.subtle.exportKey('raw', publicKey));
  return { privateKey, publicKey, keyid: 'agent-' + toHex(await sha256(raw)).slice(0, 16) };
}

export const merchantUrl = (origin) => new URL('/functions/merchantVerify', origin);

export function signatureBase(method, path, authority, digest, params) {
  return `"@method": ${method}\n"@path": ${path}\n"@authority": ${authority}\n"content-digest": ${digest}\n"@signature-params": ${params}`;
}

export const contentDigest = async (body) => 'sha-256=:' + toB64(await sha256(body)) + ':';

// Sends an RFC 9421-signed request to merchantVerify. tamper=true changes one byte of the body after signing.
export async function signedAgentFetch(origin, keys, payload, tamper = false) {
  const url = merchantUrl(origin);
  const body = JSON.stringify(payload);
  const digest = await contentDigest(body);
  const created = Math.floor(Date.now() / 1000);
  const params = `${COVERED};created=${created};expires=${created + 60};nonce="${crypto.randomUUID()}";keyid="${keys.keyid}";alg="ed25519"`;
  const base = signatureBase('POST', url.pathname, url.host, digest, params);
  const sig = await crypto.subtle.sign({ name: 'Ed25519' }, keys.privateKey, new TextEncoder().encode(base));
  let sent = body;
  if (tamper) {
    const i = body.length - 2;
    sent = body.slice(0, i) + (body[i] === '1' ? '2' : '1') + body.slice(i + 1);
  }
  const res = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Content-Digest': digest, 'Signature-Input': `sig1=${params}`, Signature: `sig1=:${toB64(sig)}:` },
    body: sent,
    signal: AbortSignal.timeout(15000),
  });
  return { status: res.status, body: await res.json().catch(() => ({})) };
}