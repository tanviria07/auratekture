import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { money } from '@/lib/trust';
import { downloadTrustReceipt } from '@/lib/trustReceipt';
import ItemWhy from './ItemWhy';
import StoreChecks from './StoreChecks';

export default function Receipt({ receipt, mandate, items = [], lines = {}, neededBy }) {
  return (
    <div className="rounded-xl border bg-accent/40 p-4 space-y-3 text-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="font-heading text-lg">Receipt</p>
        <Button size="sm" variant="outline" className="rounded-full" onClick={() => downloadTrustReceipt({ receipt, mandate, items, lines, neededBy })}>
          <Download className="w-3.5 h-3.5" />Download trust receipt
        </Button>
      </div>
      {receipt.authorizations.map((a) => (
        <div key={a.id} className="border-b pb-3 space-y-2">
          <div className="flex justify-between font-medium"><span>{a.store}</span><span>{money(a.amount_cents)}</span></div>
          <p className="text-muted-foreground">
            {a.mode === 'sandbox' ? 'Sandbox' : 'Simulated'} · {a.mode === 'simulated' ? 'Simulated authorization' : a.status}
          </p>
          <p className="font-mono text-xs break-all">{a.transaction_id || '—'}</p>
          {items.filter((i) => i.store === a.store).map((i) => (
            <div key={i.line_id}>
              <p>{i.qty} × {i.title}</p>
              <ItemWhy line={lines[i.line_id]} neededBy={neededBy} signedCents={i.unit_price_cents} />
            </div>
          ))}
          <StoreChecks steps={a.verifier_steps} />
        </div>
      ))}
      <p><span className="text-muted-foreground">Mandate fingerprint:</span> <span className="font-mono">{receipt.fingerprint}</span></p>
      <p><span className="text-muted-foreground">Signing key:</span> <span className="font-mono">{receipt.keyid}</span></p>
      <p><span className="text-muted-foreground">Time:</span> {new Date(receipt.time).toLocaleString()}</p>
    </div>
  );
}