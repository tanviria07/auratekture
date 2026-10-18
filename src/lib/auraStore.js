import { useSyncExternalStore } from 'react';

// Small shared store so any page can feed Aura's context and UI hints (glows).
let state = { studio: null, checkout: {}, photoGlow: false };
const subs = new Set();
export const auraStore = {
  get: () => state,
  set(patch) { state = { ...state, ...patch }; subs.forEach((f) => f()); },
  subscribe(f) { subs.add(f); return () => subs.delete(f); },
};
export const useAuraState = () => useSyncExternalStore(auraStore.subscribe, auraStore.get);

// Widget controls (start) and the Studio's action registry.
export const auraControl = { start: null };
export const studioBridge = { actions: null, pending: [] };