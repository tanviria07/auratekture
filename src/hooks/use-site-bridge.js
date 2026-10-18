import { useEffect, useRef } from 'react';
import { VENUE_OPTIONS } from '@/lib/categories';

// window.SITE: same actions as the Studio controls. Nothing here signs or pays.
export function useSiteBridge(api) {
  const ref = useRef(api); ref.current = api;
  useEffect(() => {
    const a = () => ref.current;
    window.SITE = {
      set_room: ({ purpose, ceiling_ft, people, budget, needed_by } = {}) => {
        const m = { room_purpose: purpose, ceiling_ft, headcount: people, budget, deadline: needed_by };
        a().setRoom(Object.fromEntries(Object.entries(m).filter(([, v]) => v !== undefined)));
      },
      mark_already_here: ({ item } = {}) => {
        if (!item) return;
        const v = a().venue || {}, options = v.options || [];
        const hit = VENUE_OPTIONS.find((o) => o.toLowerCase() === String(item).toLowerCase());
        if (hit) { if (!options.includes(hit)) a().setVenue({ ...v, options: [...options, hit] }); }
        else a().setVenue({ options, other: [v.other, item].filter(Boolean).join(', ') });
      },
      design_room: () => a().design(),
      focus_product: ({ number } = {}) => a().focus(Number(number)),
      swap_product: ({ number, alternative } = {}) => { if ([1, 2].includes(Number(alternative))) a().swapN(Number(number), Number(alternative)); },
      open_checkout: () => a().openCheckout(),
    };
    return () => { delete window.SITE; };
  }, []);
}