import { secrets } from 'base44:runtime';
import { sha256, toB64, fromB64 } from './canonical.ts';

export const hasVisa = () => ['VISA_MERCHANT_ID', 'VISA_KEY_ID', 'VISA_SECRET_KEY'].every((k) => (secrets.get(k) || '').trim());

export async function authorizeVisa(amount_cents, ref) {
  const host = 'apitest.visaacceptance.com';
  const mid = secrets.get('VISA_MERCHANT_ID').trim();
  const body = JSON.stringify({
    clientReferenceInformation: { code: String(ref).slice(0, 50) },
    processingInformation: { capture: false },
    paymentInformation: { card: { number: '4111111111111111', expirationMonth: '12', expirationYear: '2031' } },
    orderInformation: {
      amountDetails: { totalAmount: (amount_cents / 100).toFixed(2), currency: 'USD' },
      billTo: { firstName: 'Test', lastName: 'Buyer', address1: '1 Market St', locality: 'San Francisco', administrativeArea: 'CA', postalCode: '94105', country: 'US', email: 'test@example.com', phoneNumber: '4155550100' },
    },
  });
  const digest = 'SHA-256=' + toB64(await sha256(body));
  const date = new Date().toUTCString();
  const sigString = `host: ${host}\nv-c-date: ${date}\nrequest-target: post /pts/v2/payments\ndigest: ${digest}\nv-c-merchant-id: ${mid}`;
  const key = await crypto.subtle.importKey('raw', fromB64(secrets.get('VISA_SECRET_KEY').trim()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = toB64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigString)));
  const start = Date.now();
  let res;
  try {
    res = await fetch(`https://${host}/pts/v2/payments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json;charset=utf-8', 'v-c-merchant-id': mid, 'v-c-date': date, Digest: digest,
        Signature: `keyid="${secrets.get('VISA_KEY_ID').trim()}", algorithm="HmacSHA256", headers="host v-c-date request-target digest v-c-merchant-id", signature="${sig}"`,
      },
      body,
      signal: AbortSignal.timeout(30000),
    });
  } catch (e) {
    // A timeout means we don't know whether Visa processed the charge — mark UNKNOWN so a retry
    // reconciles with the transaction search before charging again.
    if (e?.name === 'TimeoutError' || e?.name === 'AbortError') {
      return { mode: 'sandbox', httpStatus: 0, ms: Date.now() - start, status: 'UNKNOWN', transaction_id: null, summary: 'Visa call timed out before a response arrived.' };
    }
    return { mode: 'sandbox', httpStatus: 0, ms: Date.now() - start, status: 'ERROR', transaction_id: null, summary: String(e?.message || e).slice(0, 300) };
  }
  const data = await res.json().catch(() => ({}));
  return {
    mode: 'sandbox', httpStatus: res.status, ms: Date.now() - start,
    status: data.status || `HTTP_${res.status}`, transaction_id: data.id || null,
    summary: JSON.stringify({ http: res.status, status: data.status, reason: data.errorInformation?.reason || data.reason, message: data.errorInformation?.message || data.message }).slice(0, 300),
  };
}

// Look up whether Visa has any record of a charge under this client reference.
// Used to reconcile an UNKNOWN/ERROR store before retrying, so we never double-charge.
export async function searchVisaByRef(ref) {
  const host = 'apitest.visaacceptance.com';
  const mid = secrets.get('VISA_MERCHANT_ID').trim();
  const body = JSON.stringify({ save: 'false', query: `clientReferenceInformation.code:"${String(ref).slice(0, 50)}"`, offset: 0, limit: 5, sort: 'submitTimeUtc:desc' });
  const digest = 'SHA-256=' + toB64(await sha256(body));
  const date = new Date().toUTCString();
  const sigString = `host: ${host}\nv-c-date: ${date}\nrequest-target: post /tss/v2/searches\ndigest: ${digest}\nv-c-merchant-id: ${mid}`;
  const key = await crypto.subtle.importKey('raw', fromB64(secrets.get('VISA_SECRET_KEY').trim()), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
  const sig = toB64(await crypto.subtle.sign('HMAC', key, new TextEncoder().encode(sigString)));
  const res = await fetch(`https://${host}/tss/v2/searches`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8', 'v-c-merchant-id': mid, 'v-c-date': date, Digest: digest,
      Signature: `keyid="${secrets.get('VISA_KEY_ID').trim()}", algorithm="HmacSHA256", headers="host v-c-date request-target digest v-c-merchant-id", signature="${sig}"`,
    },
    body,
    signal: AbortSignal.timeout(15000),
  }).catch(() => null);
  if (!res) return { found: false };
  const data = await res.json().catch(() => ({}));
  const txns = data.transactions || data._embedded?.transactions || [];
  const first = txns[0];
  return { found: txns.length > 0, transaction_id: first?.id || null, status: first?.applicationInformation?.status || null };
}