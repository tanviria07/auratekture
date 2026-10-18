import { itemChecks } from '@/lib/itemChecks';

// Downloads everything about a checkout as a JSON trust receipt.
export function downloadTrustReceipt({ receipt, mandate, items, lines, neededBy }) {
  const data = {
    generated_at: new Date().toISOString(),
    items: items.map((i) => {
      const l = lines?.[i.line_id];
      return {
        line_id: i.line_id, store: i.store, title: i.title, product_url: i.product_url || null, qty: i.qty,
        price_when_signed_cents: i.unit_price_cents, reason: l?.reason || null,
        delivery: l?.product?.delivery ? { text: l.product.delivery, source: 'from the listing' } : { text: null, source: 'not listed' },
        checks: l ? itemChecks(l, neededBy) : [],
      };
    }),
    approval: mandate && {
      id: mandate.id, cap_cents: mandate.cap_cents, basket_sha256: mandate.basket_sha256, nonce: mandate.nonce,
      expires_at: mandate.expires_at, user_public_key: mandate.user_public_key, user_signature: mandate.signature,
    },
    agent: { keyid: receipt.keyid, key_directory: `/functions/agentKeys?keyid=${receipt.keyid}` },
    stores: receipt.authorizations.map((a) => ({
      store: a.store, amount_cents: a.amount_cents, mode: a.mode, status: a.status, transaction_id: a.transaction_id || null,
      signature_input: a.signed_request?.signature_input || null, signature: a.signed_request?.signature || null,
      content_digest: a.signed_request?.content_digest || null, verifier_results: a.verifier_steps || [],
    })),
    fingerprint: receipt.fingerprint, time: receipt.time,
  };
  const url = URL.createObjectURL(new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' }));
  const a = document.createElement('a');
  a.href = url; a.download = `trust-receipt-${mandate?.id || 'checkout'}.json`; a.click();
  URL.revokeObjectURL(url);
}