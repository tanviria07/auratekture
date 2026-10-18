export default function GeminiResult({ result }) {
  if (!result) return null;
  return (
    <div className="text-sm rounded-lg bg-muted p-3 space-y-1">
      <p><span className="text-muted-foreground">Model:</span> {result.model || '—'}</p>
      <p><span className="text-muted-foreground">HTTP status:</span> {result.status ?? 'no response'}</p>
      <p><span className="text-muted-foreground">Elapsed:</span> {result.ms != null ? `${result.ms} ms` : '—'}</p>
      {result.ok
        ? <p><span className="text-muted-foreground">Reply:</span> <b>{result.text}</b></p>
        : <pre className="text-xs font-mono whitespace-pre-wrap break-all text-destructive">{result.error}</pre>}
    </div>
  );
}