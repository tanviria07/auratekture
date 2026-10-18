export default function DensityNote({ W, D, headcount, hasOutlets }) {
  const per = headcount > 0 ? (W * D) / headcount : null;
  return (
    <div className="space-y-1 text-sm">
      {!hasOutlets && <p className="text-accent-foreground">Add at least one outlet so we can check power.</p>}
      {per != null && (
        <p className="text-muted-foreground">
          {Math.round(per)} sq ft per person
          {per < 15 && <span className="block text-accent-foreground">This may feel crowded; it's a planning guide, not a fire-code check.</span>}
        </p>
      )}
    </div>
  );
}