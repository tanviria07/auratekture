import { Input } from '@/components/ui/input';

const TOOLS = [['outlet', 'Outlet'], ['exit', 'Exit'], ['heat', 'Heat source'], ['window', 'Window']];
const pill = (on) => `rounded-full border px-3 py-1 text-sm ${on ? 'bg-primary text-primary-foreground border-primary' : 'bg-card hover:bg-muted'}`;

export default function GridToolbar({ tool, setTool, circuit, setCircuit, exitWidth, setExitWidth, heatType, setHeatType }) {
  return (
    <div className="space-y-2">
      <div className="flex flex-wrap gap-2">{TOOLS.map(([k, l]) => <button key={k} className={pill(tool === k)} onClick={() => setTool(k)}>{l}</button>)}</div>
      <div className="flex flex-wrap gap-2 items-center text-sm text-muted-foreground min-h-9">
        {tool === 'outlet' && ['1', '2', '3'].map((c) => <button key={c} className={pill(circuit === c)} onClick={() => setCircuit(c)}>Circuit {c}</button>)}
        {tool === 'exit' && <>Width (ft) <Input type="number" min={1} className="w-20 h-8" value={exitWidth} onChange={(e) => setExitWidth(Number(e.target.value) || 3)} /></>}
        {tool === 'heat' && ['fireplace', 'heater'].map((t) => <button key={t} className={pill(heatType === t)} onClick={() => setHeatType(t)}>{t === 'fireplace' ? 'Fireplace' : 'Heater'}</button>)}
        <span>Tap to place · drag to move · tap again to delete</span>
      </div>
    </div>
  );
}