// Renders the products the Buyer agent returned, whatever list key it used.
export default function BuyerResults({ result }) {
  const rows = result?.products || result?.results || result?.items || result?.candidates || [];
  if (!rows.length) return <pre className="text-xs font-mono whitespace-pre-wrap break-all bg-muted rounded-lg p-3">{JSON.stringify(result, null, 2)}</pre>;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead className="text-left text-muted-foreground"><tr>{['Line', 'Title', 'Store', 'Price', 'Spec confidence', ''].map((h) => <th key={h} className="py-2 pr-3 font-medium">{h}</th>)}</tr></thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i} className="border-t">
              <td className="py-2 pr-3">{r.line_id}</td>
              <td className="py-2 pr-3">{r.title}</td>
              <td className="py-2 pr-3">{r.store}</td>
              <td className="py-2 pr-3">{r.price_usd ?? r.unit_price_usd ?? r.price}</td>
              <td className="py-2 pr-3">{r.spec_confidence}</td>
              <td className="py-2">{(r.url || r.product_url) && <a href={r.url || r.product_url} target="_blank" rel="noreferrer" className="text-primary underline">Open</a>}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}