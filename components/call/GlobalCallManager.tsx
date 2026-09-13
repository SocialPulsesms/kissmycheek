'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';
import { Phone, PhoneOff, Video, Crown, Sparkles } from 'lucide-react';
import { callRingtone } from '@/lib/callRingtone';
import { triggerMediaPermissions } from '@/lib/mediaPermissions';
import { LiveCallStage, LiveCallStageProps } from './LiveCallStage';

export interface StartCallEventDetail {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  mode?: 'voice' | 'video';
  roomId?: string;
  roomUrl?: string;
  role?: 'caller' | 'callee';
}

export async function startInAppCall(detail: StartCallEventDetail) {
  if (typeof window !== 'undefined') {
    // Synchronously trigger native permission dialog in response to the user's tap
    try {
      await triggerMediaPermissions(detail.mode || 'video');
    } catch {}

    window.dispatchEvent(new CustomEvent('kmc_start_call', { detail }));
  }
}

interface IncomingCallData {
  callId: string;
  roomId: string;
  callerId: string;
  callerName: string;
  callerPhoto?: string;
  calleeId: string;
  callMode: 'voice' | 'video';
  status: string;
  createdAt: number;
  roomUrl?: string;
}

export function GlobalCallManager() {
  const pathname = usePathname();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallParams, setActiveCallParams] = useState<LiveCallStageProps | null>(null);

  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  incomingCallRef.current = incomingCall;

  // Check if member is logged in
  const isUserLoggedIn = () => {
    if (typeof window === 'undefined') return false;
    try {
      const isGuestRoute = /^\/(login|register|forgot-password|reset-password)/.test(pathname || '');
      if (isGuestRoute) return false;
      const hasCookie = document.cookie.includes('session-token=') && !document.cookie.includes('session-token=;');
      const hasProfile = Boolean(localStorage.getItem('kmc_user_profile') || localStorage.getItem('kmc_session'));
      return hasCookie || hasProfile;
    } catch {
      return false;
    }
  };

  // 1. Resolve current user identity
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.id) setCurrentUserId(p.id);
        if (p.email) setCurrentUserEmail(p.email);
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession) {
        const s = JSON.parse(savedSession);
        if (s.userId || s.id) setCurrentUserId(prev => prev || s.userId || s.id);
        if (s.email) setCurrentUserEmail(prev => prev || s.email);
      }
    } catch {}
  }, [pathname]);

  // 2. Listen for 'kmc_start_call' CustomEvent to launch calls instantly
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStartCall = async (e: Event) => {
      const detail = (e as CustomEvent<StartCallEventDetail>).detail;
      if (!detail || !detail.partnerId) return;

      const callMode = detail.mode || 'video';
      const canonicalRoomId = detail.roomId || `call_${[currentUserId || 'caller', detail.partnerId].sort().join('_')}`;

      // Provision Daily room immediately
      let roomUrl = detail.roomUrl || '';
      try {
        const res = await fetch('/api/daily/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: canonicalRoomId, mode: callMode })
        });
        const data = await res.json();
        if (data?.url) {
          roomUrl = data.url;
        }
      } catch {}

      // Broadcast invitation to callee
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'initiate_call',
          roomId: canonicalRoomId,
          callerId: currentUserId || 'caller',
          callerName: localStorage.getItem('kmc_user_name') || 'Exclusive Member',
          callerPhoto: localStorage.getItem('kmc_user_photo') || '',
          calleeId: detail.partnerId,
          calleeName: detail.partnerName || 'Member',
          callMode,
          roomUrl
        })
      }).catch(() => {});

      // Mount the caller stage
      setActiveCallParams({
        partnerId: detail.partnerId,
        partnerName: detail.partnerName || 'Club Member',
        partnerPhoto: detail.partnerPhoto || '',
        partnerOccupation: detail.partnerOccupation || 'Member',
        partnerLocation: detail.partnerLocation || 'Verified Member',
        initialMode: callMode,
        initialRoomId: canonicalRoomId,
        roomUrl,
        role: 'caller',
        onEndCall: () => setActiveCallParams(null)
      });
    };

    window.addEventListener('kmc_start_call', handleStartCall);
    return () => {
      window.removeEventListener('kmc_start_call', handleStartCall);
    };
  }, [currentUserId]);

  // 3. Poll for incoming calls
  useEffect(() => {
    if (!isUserLoggedIn() || activeCallParams || pathname?.startsWith('/call/')) {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      return;
    }

    const pollIncoming = async () => {
      if (activeCallParams || !currentUserId) return;

      try {
        const res = await fetch(`/api/call?action=check_incoming&userId=${encodeURIComponent(currentUserId)}&email=${encodeURIComponent(currentUserEmail)}`);
        if (!res.ok) return;
        const data = await res.json();

        if (data.incomingCall && data.incomingCall.status === 'RINGING') {
          const inc = data.incomingCall;
          if (!incomingCallRef.current || incomingCallRef.current.callId !== inc.callId) {
            setIncomingCall(inc);

            // Play luxury audio ringtone
            if (!stopRingtoneRef.current) {
              try {
                stopRingtoneRef.current = callRingtone.startIncomingRingtone();
              } catch {}
            }
          }
        } else {
          // No active ringing call
          if (incomingCallRef.current) {
            setIncomingCall(null);
            if (stopRingtoneRef.current) {
              stopRingtoneRef.current();
              stopRingtoneRef.current = null;
            }
          }
        }
      } catch {}
    };

    const interval = setInterval(pollIncoming, 2500);
    pollIncoming();

    return () => {
      clearInterval(interval);
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
    };
  }, [currentUserId, currentUserEmail, activeCallParams, pathname]);

  // Accept Call Handler
  const handleAcceptCall = async () => {
    if (!incomingCall) return;

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    // Trigger native permission dialog on accept tap
    try {
      await triggerMediaPermissions(incomingCall.callMode);
    } catch {}

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'accept_call',
        roomId: incomingCall.roomId
      })
    }).catch(() => {});

    setActiveCallParams({
      partnerId: incomingCall.callerId,
      partnerName: incomingCall.callerName,
      partnerPhoto: incomingCall.callerPhoto || '',
      initialMode: incomingCall.callMode,
      initialRoomId: incomingCall.roomId,
      roomUrl: incomingCall.roomUrl || '',
      role: 'callee',
      onEndCall: () => setActiveCallParams(null)
    });

    setIncomingCall(null);
  };

  // Decline Call Handler
  const handleDeclineCall = () => {
    if (!incomingCall) return;

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'decline_call',
        roomId: incomingCall.roomId
      })
    }).catch(() => {});

    setIncomingCall(null);
  };

  return (
    <>
      {/* 1. Active Call Stage Overlay */}
      {activeCallParams && (
        <LiveCallStage {...activeCallParams} />
      )}

      {/* 2. Incoming Call Banner Modal */}
      {incomingCall && !activeCallParams && (
        <div className="fixed inset-0 z-[9998] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 select-none font-sans animate-in fade-in duration-200">
          <div className="max-w-sm w-full bg-[#0E0E14] border border-[#D4AF37]/50 rounded-3xl p-6 shadow-2xl text-center relative overflow-hidden">
            
            {/* Ambient Gold Glow */}
            <div className="absolute -top-12 -left-12 w-36 h-36 bg-[#D4AF37]/15 rounded-full blur-3xl pointer-events-none" />

            {/* Caller Photo with Pulsing Gold Rings */}
            <div className="relative w-24 h-24 mx-auto mb-4">
              <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-40" />
              <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border-2 border-[#D4AF37] p-1 relative z-10 shadow-xl">
                {incomingCall.callerPhoto ? (
                  <img
                    src={incomingCall.callerPhoto}
                    alt={incomingCall.callerName}
                    className="w-full h-full rounded-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full rounded-full bg-[#13131A] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-2xl">
                    {incomingCall.callerName.charAt(0).toUpperCase()}
                  </div>
                )}
              </div>
            </div>

            {/* Title & Mode */}
            <div className="space-y-1 mb-6">
              <div className="flex items-center justify-center gap-1.5">
                <h3 className="font-serif text-xl font-bold text-white truncate">{incomingCall.callerName}</h3>
                <Crown className="w-4 h-4 text-[#D4AF37]" />
              </div>
              <p className="text-xs text-[#D4AF37] font-semibold tracking-wide uppercase flex items-center justify-center gap-1.5">
                {incomingCall.callMode === 'video' ? (
                  <>
                    <Video className="w-3.5 h-3.5" />
                    <span>Incoming 4K Video Date</span>
                  </>
                ) : (
                  <>
                    <Phone className="w-3.5 h-3.5" />
                    <span>Incoming HD Voice Call</span>
                  </>
                )}
              </p>
            </div>

            {/* Actions: Decline / Accept */}
            <div className="flex items-center justify-center gap-6 pt-2">
              {/* Decline */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleDeclineCall}
                  className="w-14 h-14 rounded-full bg-rose-600/20 hover:bg-rose-600 border border-rose-500/40 text-rose-400 hover:text-white flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
                >
                  <PhoneOff className="w-6 h-6" />
                </button>
                <span className="text-[11px] text-white/50">Decline</span>
              </div>

              {/* Accept */}
              <div className="flex flex-col items-center gap-1.5">
                <button
                  onClick={handleAcceptCall}
                  className="w-16 h-16 rounded-full bg-emerald-500 hover:bg-emerald-400 text-black font-bold flex items-center justify-center transition-all shadow-xl hover:scale-105 active:scale-95 animate-pulse"
                >
                  {incomingCall.callMode === 'video' ? <Video className="w-7 h-7" /> : <Phone className="w-7 h-7" />}
                </button>
                <span className="text-[11px] text-emerald-400 font-bold">Accept Date</span>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
