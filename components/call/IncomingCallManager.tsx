'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video, Crown, Sparkles, ShieldCheck } from 'lucide-react';
import { callRingtone } from '@/lib/callRingtone';

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
}

export function IncomingCallManager() {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [ringingSeconds, setRingingSeconds] = useState(0);

  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // 1. Fetch current logged-in user ID
  useEffect(() => {
    let resolvedId: string | null = null;
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.id) resolvedId = parsed.id;
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        if (parsed.userId || parsed.id) resolvedId = parsed.userId || parsed.id;
      }
    } catch {}

    if (resolvedId) {
      setCurrentUserId(resolvedId);
    }

    // Always re-verify canonical ID via auth/me
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.id) {
          setCurrentUserId(data.user.id);
        }
      })
      .catch(() => {});
  }, [pathname]);

  // 2. Poll for incoming calls every 2.5s (only when not in an active call page)
  useEffect(() => {
    // If user is currently on the call page, do not show incoming call modal
    if (pathname?.startsWith('/call/')) {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      setIncomingCall(null);
      return;
    }

    const checkIncoming = async () => {
      try {
        let userEmail = '';
        let userName = '';
        try {
          const savedProfile = localStorage.getItem('kmc_user_profile');
          if (savedProfile) {
            const parsed = JSON.parse(savedProfile);
            if (parsed.email) userEmail = parsed.email;
            if (parsed.customName || parsed.fullName || parsed.name) {
              userName = parsed.customName || parsed.fullName || parsed.name;
            }
          }
          const savedSession = localStorage.getItem('kmc_session');
          if (savedSession) {
            const parsed = JSON.parse(savedSession);
            if (parsed.email && !userEmail) userEmail = parsed.email;
            if ((parsed.customName || parsed.fullName || parsed.name) && !userName) {
              userName = parsed.customName || parsed.fullName || parsed.name;
            }
          }
        } catch {}

        const queryUrl = `/api/call?action=check_incoming&userId=${encodeURIComponent(currentUserId || '')}&email=${encodeURIComponent(userEmail)}&name=${encodeURIComponent(userName)}`;
        const res = await fetch(queryUrl);
        if (!res.ok) return;
        const data = await res.json();

        if (data.success && data.incomingCall) {
          const call = data.incomingCall as IncomingCallData;
          
          if (!currentUserId && call.calleeId) {
            setCurrentUserId(call.calleeId);
          }

          // New incoming call detected
          if (!incomingCall || incomingCall.roomId !== call.roomId) {
            setIncomingCall(call);
            setRingingSeconds(0);

            // Start luxury incoming ringtone
            if (!stopRingtoneRef.current) {
              stopRingtoneRef.current = callRingtone.startIncomingRingtone();
            }
          }
        } else {
          // No incoming call or caller cancelled
          if (incomingCall) {
            if (stopRingtoneRef.current) {
              stopRingtoneRef.current();
              stopRingtoneRef.current = null;
            }
            callRingtone.playCallEndTone();
            setIncomingCall(null);
          }
        }
      } catch {}
    };

    // Immediate check + interval
    checkIncoming();
    const interval = setInterval(checkIncoming, 2000);

    return () => {
      clearInterval(interval);
    };
  }, [currentUserId, pathname, incomingCall]);

  // 3. Ringing timer
  useEffect(() => {
    if (incomingCall) {
      timerRef.current = setInterval(() => {
        setRingingSeconds(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) clearInterval(timerRef.current);
      setRingingSeconds(0);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [incomingCall]);

  // 4. Action: Accept Call (Instant 0ms Client Navigation)
  const handleAcceptCall = () => {
    if (!incomingCall) return;

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    const targetUrl = `/call/${incomingCall.callerId}?room=${incomingCall.roomId}&mode=${incomingCall.callMode}&role=callee&name=${encodeURIComponent(incomingCall.callerName || '')}&photo=${encodeURIComponent(incomingCall.callerPhoto || '')}`;
    
    setIncomingCall(null);
    router.push(targetUrl);

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'accept_call',
        roomId: incomingCall.roomId,
        peerId: currentUserId
      })
    }).catch(() => {});
  };

  // 5. Action: Decline Call
  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    callRingtone.playCallEndTone();

    try {
      await fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'decline_call',
          roomId: incomingCall.roomId,
          peerId: currentUserId
        })
      });
    } catch {}

    setIncomingCall(null);
  };

  if (!incomingCall) return null;

  const initials = (incomingCall.callerName || 'Member')
    .split(' ')
    .map(n => n[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
      <div className="relative w-full max-w-md bg-neutral-950 border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(212,175,55,0.4)] overflow-hidden">
        
        {/* Ambient Top Glow */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#D4AF37]/20 blur-3xl pointer-events-none" />

        {/* Pulsing Concentric Radar Rings */}
        <div className="relative mx-auto w-32 h-32 mb-6 flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border border-[#D4AF37]/30 animate-ping duration-1000" />
          <div className="absolute -inset-4 rounded-full border border-[#D4AF37]/20 animate-pulse" />
          
          {/* Avatar */}
          <div className="w-28 h-28 rounded-full border-2 border-[#D4AF37] p-1 bg-black relative z-10 shadow-2xl flex items-center justify-center overflow-hidden">
            {incomingCall.callerPhoto ? (
              <img
                src={incomingCall.callerPhoto}
                alt={incomingCall.callerName}
                className="w-full h-full object-cover rounded-full"
              />
            ) : (
              <span className="font-serif font-bold text-3xl text-[#D4AF37] tracking-widest">{initials}</span>
            )}
          </div>

          <div className="absolute bottom-1 right-1 w-8 h-8 rounded-full gold-gradient-bg text-black flex items-center justify-center shadow-lg z-20">
            {incomingCall.callMode === 'video' ? (
              <Video className="w-4 h-4" />
            ) : (
              <Phone className="w-4 h-4" />
            )}
          </div>
        </div>

        {/* Caller Info */}
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-xs font-bold text-[#D4AF37] uppercase tracking-wider mb-2">
          <Crown className="w-3.5 h-3.5" />
          <span>{incomingCall.callMode === 'video' ? 'Incoming HD Video Date' : 'Incoming Private Voice Call'}</span>
        </div>

        <h3 className="font-serif text-2xl sm:text-3xl font-bold text-white mb-1">
          {incomingCall.callerName}
        </h3>

        <p className="text-xs text-neutral-400 flex items-center justify-center gap-1.5 mb-6">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Verified Member • Ringing ({ringingSeconds}s)...</span>
        </p>

        {/* Action Controls */}
        <div className="flex items-center justify-center gap-6 pt-2">
          {/* Decline Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleDeclineCall}
              className="w-16 h-16 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-xl transition-all border border-rose-400/40"
              title="Decline Call"
            >
              <PhoneOff className="w-7 h-7" />
            </button>
            <span className="text-xs text-neutral-400 font-medium">Decline</span>
          </div>

          {/* Accept Button */}
          <div className="flex flex-col items-center gap-1.5">
            <button
              onClick={handleAcceptCall}
              className="w-16 h-16 rounded-full gold-gradient-bg text-black hover:scale-105 active:scale-95 flex items-center justify-center shadow-[0_0_30px_rgba(212,175,55,0.6)] transition-all font-bold"
              title="Accept Call"
            >
              {incomingCall.callMode === 'video' ? (
                <Video className="w-7 h-7 text-black animate-pulse" />
              ) : (
                <Phone className="w-7 h-7 text-black animate-pulse" />
              )}
            </button>
            <span className="text-xs text-[#D4AF37] font-bold">Accept</span>
          </div>
        </div>

      </div>
    </div>
  );
}
