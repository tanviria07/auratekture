import { useState } from 'react';

export const STEPS = [['kit', "Planning what's missing"], ['find', 'Finding real products'], ['place', 'Placing them in your room']];

// Runs the step tasks in order; each task returns { error } to stop the run.
export function useDesignRun() {
  const [steps, setSteps] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (key, v) => setSteps((s) => ({ ...s, [key]: v }));

  const run = async (tasks) => {
    setBusy(true); setError(''); setSteps({});
    for (const [key] of STEPS) {
      set(key, { status: 'running' });
      const t = Date.now();
      const r = await tasks[key]();
      if (r?.error) { set(key, { status: 'failed' }); setError(r.error); break; }
      set(key, { status: 'done', ms: Date.now() - t });
    }
    setBusy(false);
  };
  return { steps, busy, error, run };
}