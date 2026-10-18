const STEPS = ['Room', 'Plan', 'Shop', 'Checkout'];

export default function StepIndicator({ current = 1 }) {
  return (
    <ol className="flex flex-wrap items-center gap-2 sm:gap-4 text-sm">
      {STEPS.map((s, i) => {
        const n = i + 1, active = n === current;
        return (
          <li key={s} className="flex items-center gap-2">
            <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-medium ${active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground'}`}>{n}</span>
            <span className={active ? 'font-medium' : 'text-muted-foreground'}>{s}</span>
            {n < STEPS.length && <span className="w-6 sm:w-10 h-px bg-border" />}
          </li>
        );
      })}
    </ol>
  );
}