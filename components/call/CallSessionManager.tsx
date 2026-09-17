'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Phone, PhoneOff, Video } from 'lucide-react';
import { LiveKitStage } from './LiveKitStage';

export interface StartCallDetail {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  mode?: 'video' | 'voice';
}

export function startInAppCall(detail: StartCallDetail) {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent('kmc-start-call', { detail }));
}

interface ActiveCall {
  roomName: string;
  token: string;
  url: string;
  partnerName?: string;
  partnerPhoto?: string;
  mode: 'video' | 'voice';
  waitingLabel?: string;
}

interface IncomingCall {
  roomName: string;
  callerName?: string;
  callerPhoto?: string;
  mode: 'video' | 'voice';
}

async function postCall(body: Record<string, unknown>) {
  const res = await fetch('/api/calls', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || 'Call request failed');
  }
  return data;
}

export function CallSessionManager() {
  const [active, setActive] = useState<ActiveCall | null>(null);
  const [incoming, setIncoming] = useState<IncomingCall | null>(null);
  const [notice, setNotice] = useState('');
  const activeRoomRef = useRef<string | null>(null);

  const leaveCall = useCallback(async (roomName?: string) => {
    const room = roomName || activeRoomRef.current;
    activeRoomRef.current = null;
    setActive(null);
    sessionStorage.removeItem('kmc_in_call');
    if (room) {
      try {
        await postCall({ action: 'end', roomName: room });
      } catch {}
    }
  }, []);

  const beginFromInvite = useCallback(async (detail: StartCallDetail) => {
    try {
      const data = await postCall({
        action: 'invite',
        calleeId: detail.partnerId,
        calleeName: detail.partnerName,
        calleePhoto: detail.partnerPhoto,
        mode: detail.mode || 'video'
      });
      activeRoomRef.current = data.invite.roomName;
      setIncoming(null);
      setActive({
        roomName: data.invite.roomName,
        token: data.token,
        url: data.url,
        partnerName: detail.partnerName,
        partnerPhoto: detail.partnerPhoto,
        mode: data.invite.mode || 'video',
        waitingLabel: `Calling ${detail.partnerName || 'member'}…`
      });
    } catch (err: any) {
      setNotice(err?.message || 'Unable to start video date');
      setTimeout(() => setNotice(''), 4000);
    }
  }, []);

  const acceptIncoming = useCallback(async () => {
    if (!incoming) return;
    try {
      const data = await postCall({ action: 'accept', roomName: incoming.roomName });
      activeRoomRef.current = incoming.roomName;
      setActive({
        roomName: incoming.roomName,
        token: data.token,
        url: data.url,
        partnerName: incoming.callerName,
        partnerPhoto: incoming.callerPhoto,
        mode: incoming.mode
      });
      setIncoming(null);
    } catch (err: any) {
      setNotice(err?.message || 'Unable to join');
      setIncoming(null);
    }
  }, [incoming]);

  const declineIncoming = useCallback(async () => {
    if (!incoming) return;
    try {
      await postCall({ action: 'decline', roomName: incoming.roomName });
    } catch {}
    setIncoming(null);
  }, [incoming]);

  useEffect(() => {
    const onStart = (event: Event) => {
      const detail = (event as CustomEvent<StartCallDetail>).detail;
      if (detail?.partnerId) beginFromInvite(detail);
    };
    window.addEventListener('kmc-start-call', onStart);
    return () => window.removeEventListener('kmc-start-call', onStart);
  }, [beginFromInvite]);

  useEffect(() => {
    let timer: ReturnType<typeof setInterval>;
    const poll = async () => {
      if (activeRoomRef.current) return;
      if (typeof document !== 'undefined' && !document.cookie.includes('session-token=')) return;
      try {
        const res = await fetch('/api/calls?action=incoming');
        if (!res.ok) return;
        const data = await res.json();
        const invite = data.incomingCall;
        if (invite?.roomName && invite.status === 'ringing') {
          setIncoming({
            roomName: invite.roomName,
            callerName: invite.callerName,
            callerPhoto: invite.callerPhoto,
            mode: invite.mode || 'video'
          });
        } else if (!activeRoomRef.current) {
          setIncoming(null);
        }
      } catch {}
    };
    poll();
    timer = setInterval(poll, 2000);
    return () => clearInterval(timer);
  }, [active]);

  useEffect(() => {
    if (!active?.roomName) return;
    const timer = setInterval(async () => {
      try {
        const res = await fetch(`/api/calls?action=status&roomName=${encodeURIComponent(active.roomName)}`);
        if (!res.ok) return;
        const data = await res.json();
        const status = data.invite?.status;
        if (status === 'declined' || status === 'cancelled' || status === 'ended') {
          await leaveCall(active.roomName);
          if (status === 'declined') {
            setNotice('The member declined this date');
            setTimeout(() => setNotice(''), 3500);
          }
        }
      } catch {}
    }, 2000);
    return () => clearInterval(timer);
  }, [active?.roomName, leaveCall]);

  const stableLeave = useCallback(() => {
    leaveCall();
  }, [leaveCall]);

  return (
    <>
      {notice && (
        <div className="fixed top-4 inset-x-0 z-[95] flex justify-center px-4 pointer-events-none">
          <div className="pointer-events-auto px-4 py-2 rounded-full bg-black/80 border border-[#D4AF37]/40 text-xs text-[#D4AF37] shadow-lg">
            {notice}
          </div>
        </div>
      )}

      {incoming && !active && (
        <div className="fixed inset-0 z-[88] bg-black/80 backdrop-blur-sm flex items-center justify-center p-6">
          <div className="w-full max-w-sm rounded-3xl bg-[#101018] border border-[#D4AF37]/40 p-6 text-center shadow-2xl">
            {incoming.callerPhoto ? (
              <img src={incoming.callerPhoto} alt="" className="w-20 h-20 rounded-full object-cover mx-auto border-2 border-[#D4AF37]" />
            ) : (
              <div className="w-20 h-20 rounded-full mx-auto bg-[#1E1B13] border-2 border-[#D4AF37] flex items-center justify-center font-serif text-3xl text-[#D4AF37]">
                {(incoming.callerName || 'M').charAt(0)}
              </div>
            )}
            <h3 className="font-serif text-lg text-white mt-4">{incoming.callerName || 'Club Member'}</h3>
            <p className="text-xs text-white/60 mt-1">Incoming {incoming.mode === 'voice' ? 'voice' : 'video'} date</p>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={declineIncoming}
                className="flex-1 h-12 rounded-full bg-red-600 text-white text-sm font-bold flex items-center justify-center gap-2"
              >
                <PhoneOff className="w-4 h-4" /> Decline
              </button>
              <button
                type="button"
                onClick={acceptIncoming}
                className="flex-1 h-12 rounded-full bg-[#D4AF37] text-black text-sm font-bold flex items-center justify-center gap-2"
              >
                {incoming.mode === 'voice' ? <Phone className="w-4 h-4" /> : <Video className="w-4 h-4" />} Accept
              </button>
            </div>
          </div>
        </div>
      )}

      {active && (
        <LiveKitStage
          token={active.token}
          serverUrl={active.url}
          partnerName={active.partnerName}
          partnerPhoto={active.partnerPhoto}
          mode={active.mode}
          waitingLabel={active.waitingLabel}
          onLeave={stableLeave}
        />
      )}
    </>
  );
}
