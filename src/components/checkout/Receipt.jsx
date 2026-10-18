import { money } from '@/lib/trust';

export default function Receipt({ receipt }) {
  return (
    <div className="rounded-xl border bg-accent/40 p-4 space-y-3 text-sm">
      <p className="font-heading text-lg">Receipt</p>
      {receipt.authorizations.map((a) => (
        <div key={a.id} className="border-b pb-2">
          <div className="flex justify-between font-medium"><span>{a.store}</span><span>{money(a.amount_cents)}</span></div>
          <p className="text-muted-foreground">
            {a.mode === 'sandbox' ? 'Sandbox' : 'Simulated'} · {a.mode === 'simulated' ? 'Simulated authorization' : a.status}
          </p>
          <p className="font-mono text-xs break-all">{a.transaction_id || '—'}</p>
        </div>
      ))}
      <p><span className="text-muted-foreground">Mandate fingerprint:</span> <span className="font-mono">{receipt.fingerprint}</span></p>
      <p><span className="text-muted-foreground">Signing key:</span> <span className="font-mono">{receipt.keyid}</span></p>
      <p><span className="text-muted-foreground">Time:</span> {new Date(receipt.time).toLocaleString()}</p>
    </div>
  );
}