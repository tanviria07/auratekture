import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { base44 } from '@/api/base44Client';
import { getVisitorId } from '@/lib/visitor';
import { studioBridge } from '@/lib/auraStore';

// Studio registers its actions; calls made before the Studio is mounted are queued.
export function useStudioActions(api) {
  const ref = useRef(api); ref.current = api;
  useEffect(() => {
    studioBridge.actions = ref;
    const q = studioBridge.pending.splice(0);
    setTimeout(() => q.forEach(([n, args]) => ref.current[n]?.(args)), 300);
    return () => { if (studioBridge.actions === ref) studioBridge.actions = null; };
  }, []);
}

// window.SITE: same actions as tapping the UI. Nothing here signs or pays.
export function useGlobalSite(rooms) {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const roomsRef = useRef(rooms); roomsRef.current = rooms;
  useEffect(() => {
    const studio = (name) => (args = {}) => {
      if (studioBridge.actions) return studioBridge.actions.current[name]?.(args);
      studioBridge.pending.push([name, args]);
      navigate('/studio');
    };
    const go = (id, then) => { if (then) studioBridge.pending.push([then, {}]); navigate(`/studio?event=${id}`); };
    window.SITE = {
      new_room: async () => {
        const ev = await base44.entities.Event.create({ name: 'New room', visitor_id: getVisitorId(), status: 'draft', width_ft: 20, depth_ft: 16, ceiling_ft: 10 });
        qc.invalidateQueries({ queryKey: ['events'] });
        go(ev.id, 'request_photo');
      },
      open_room: ({ name } = {}) => {
        const q = String(name || '').toLowerCase().trim();
        if (!q) return;
        const all = roomsRef.current || [];
        const words = q.split(/\s+/);
        const newest = [...all].sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
        const r = all.find((x) => x.name?.toLowerCase().trim() === q)
          || newest.find((x) => words.every((w) => x.name?.toLowerCase().includes(w)));
        if (r) go(r.id);
      },
      ...Object.fromEntries(['request_photo', 'update_image', 'set_room', 'mark_already_here', 'design_room', 'focus_product', 'swap_product', 'open_checkout'].map((n) => [n, studio(n)])),
    };
    return () => { delete window.SITE; };
  }, []);
}