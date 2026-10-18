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
  const res = await fetch(`https://${host}/pts/v2/payments`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json;charset=utf-8', 'v-c-merchant-id': mid, 'v-c-date': date, Digest: digest,
      Signature: `keyid="${secrets.get('VISA_KEY_ID').trim()}", algorithm="HmacSHA256", headers="host v-c-date request-target digest v-c-merchant-id", signature="${sig}"`,
    },
    body,
    signal: AbortSignal.timeout(30000),
  });
  const data = await res.json().catch(() => ({}));
  return {
    mode: 'sandbox', httpStatus: res.status, ms: Date.now() - start,
    status: data.status || `HTTP_${res.status}`, transaction_id: data.id || null,
    summary: JSON.stringify({ http: res.status, status: data.status, reason: data.errorInformation?.reason || data.reason, message: data.errorInformation?.message || data.message }).slice(0, 300),
  };
}