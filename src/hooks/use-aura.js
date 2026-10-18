import { useEffect, useRef, useState } from 'react';
import { Room, RoomEvent, Track } from 'livekit-client';
import { base44 } from '@/api/base44Client';
import { getVisitorId } from '@/lib/visitor';

const enc = new TextEncoder(), dec = new TextDecoder();

// Voice session with the "aura" agent. Aura only calls window.SITE methods (same as clicking).
export function useAura(videoRef, context) {
  const roomRef = useRef(null), timers = useRef([]);
  const [status, setStatus] = useState('idle'); // idle | connecting | live
  const [agentState, setAgentState] = useState('');
  const [speaking, setSpeaking] = useState(false);
  const [hasVideo, setHasVideo] = useState(false);
  const [message, setMessage] = useState('');
  const ctxRef = useRef(context); ctxRef.current = context;

  const publish = (room) => room?.localParticipant.publishData(enc.encode(JSON.stringify(ctxRef.current)), { reliable: true, topic: 'context' }).catch(() => {});

  const stop = (msg = '') => {
    timers.current.forEach(clearTimeout); timers.current = [];
    roomRef.current?.disconnect(); roomRef.current = null;
    setStatus('idle'); setAgentState(''); setSpeaking(false); setHasVideo(false); setMessage(msg);
  };

  const start = async () => {
    setMessage(''); setStatus('connecting');
    try {
      const res = await base44.functions.invoke('livekitToken', { visitor_id: getVisitorId() }).catch((e) => ({ data: e.response?.data || { error: e.message } }));
      if (res.data?.error) throw new Error(res.data.error);
      const room = new Room(); roomRef.current = room;
      let agentJoined = false;
      const onAgent = (p) => { if (!p.isAgent) return; agentJoined = true; setStatus('live'); setAgentState(p.attributes['lk.agent.state'] || ''); publish(room); };
      room.on(RoomEvent.ParticipantConnected, onAgent)
        .on(RoomEvent.ParticipantAttributesChanged, (_c, p) => { if (p.isAgent) setAgentState(p.attributes['lk.agent.state'] || ''); })
        .on(RoomEvent.TrackSubscribed, (track) => {
          if (videoRef.current) track.attach(videoRef.current);
          if (track.kind === Track.Kind.Video) setHasVideo(true);
        })
        .on(RoomEvent.ActiveSpeakersChanged, (s) => setSpeaking(s.some((p) => p.identity === room.localParticipant.identity)))
        .on(RoomEvent.DataReceived, (payload, _p, _k, topic) => {
          if (topic !== 'ui') return;
          try { const { action, ...args } = JSON.parse(dec.decode(payload)); if (typeof window.SITE?.[action] === 'function') window.SITE[action](args); } catch { /* ignore */ }
        })
        .on(RoomEvent.Disconnected, () => { if (roomRef.current === room) stop(); });
      await room.connect(res.data.url, res.data.token);
      await room.localParticipant.setMicrophoneEnabled(true);
      room.remoteParticipants.forEach(onAgent);
      timers.current.push(setTimeout(() => { if (!agentJoined) stop('Aura is offline. The Studio works without her.'); }, 20000));
    } catch (e) { stop(e.message || 'Could not connect to Aura.'); }
  };

  useEffect(() => { if (status === 'live') publish(roomRef.current); }, [JSON.stringify(context), status]);
  useEffect(() => () => stop(), []);
  return { status, agentState, speaking, hasVideo, message, start, stop: () => stop() };
}