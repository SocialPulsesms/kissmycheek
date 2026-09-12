'use client';

import React, { useState, useEffect, useRef } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { Phone, PhoneOff, Video, Crown, ShieldCheck } from 'lucide-react';
import { callRingtone } from '@/lib/callRingtone';
import { LiveCallStage, LiveCallStageProps } from './LiveCallStage';

export interface StartCallEventDetail {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  mode?: 'voice' | 'video';
  roomId?: string;
  role?: 'caller' | 'callee';
}

export function startInAppCall(detail: StartCallEventDetail) {
  if (typeof window !== 'undefined') {
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
}

export function GlobalCallManager() {
  const pathname = usePathname();
  const router = useRouter();

  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [currentUserIds, setCurrentUserIds] = useState<string[]>([]);
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const [incomingCall, setIncomingCall] = useState<IncomingCallData | null>(null);
  const [activeCallParams, setActiveCallParams] = useState<LiveCallStageProps | null>(null);
  const [ringingSeconds, setRingingSeconds] = useState(0);

  const stopRingtoneRef = useRef<(() => void) | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const incomingCallRef = useRef<IncomingCallData | null>(null);
  incomingCallRef.current = incomingCall;

  // Helper: check if a user is currently logged in
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

  // 1. Resolve current user IDs (profile, session, and auth can disagree)
  useEffect(() => {
    if (!isUserLoggedIn()) {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      setIncomingCall(null);
      setActiveCallParams(null);
      return;
    }

    const ids = new Set<string>();
    let resolvedId: string | null = null;
    let resolvedEmail = '';
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.id) {
          ids.add(String(parsed.id));
          resolvedId = parsed.id;
        }
        if (parsed.email) resolvedEmail = parsed.email;
      }
      const sess = localStorage.getItem('kmc_session');
      if (sess) {
        const parsed = JSON.parse(sess);
        if (parsed.userId) {
          ids.add(String(parsed.userId));
          resolvedId = parsed.userId;
        }
        if (parsed.id) {
          ids.add(String(parsed.id));
          if (!resolvedId) resolvedId = parsed.id;
        }
        if (parsed.email && !resolvedEmail) resolvedEmail = parsed.email;
      }
    } catch {}

    if (resolvedId) setCurrentUserId(resolvedId);
    if (resolvedEmail) setCurrentUserEmail(resolvedEmail);
    setCurrentUserIds(Array.from(ids));

    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.id) {
          setCurrentUserId(data.user.id);
          setCurrentUserIds(prev => Array.from(new Set([...prev, String(data.user.id)])));
        }
        if (data.user?.email) {
          setCurrentUserEmail(data.user.email);
        }
      })
      .catch(() => {});

    // Request notification permission once on authenticated session mount
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }
  }, [pathname]);

  // 2. Listen for internal in-app call triggers and logout events
  useEffect(() => {
    const handleStartCallEvent = (e: Event) => {
      const customEvent = e as CustomEvent<StartCallEventDetail>;
      if (!customEvent.detail || !customEvent.detail.partnerId) return;
      
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      setIncomingCall(null);

      setActiveCallParams({
        partnerId: customEvent.detail.partnerId,
        partnerName: customEvent.detail.partnerName || 'Club Member',
        partnerPhoto: customEvent.detail.partnerPhoto || '',
        partnerOccupation: customEvent.detail.partnerOccupation || 'Member',
        partnerLocation: customEvent.detail.partnerLocation || 'Verified Member',
        initialMode: customEvent.detail.mode || 'video',
        initialRoomId: customEvent.detail.roomId,
        role: customEvent.detail.role || 'caller',
        onEndCall: () => {
          setActiveCallParams(null);
        }
      });
    };

    const handleLogoutHalt = () => {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      setIncomingCall(null);
      setActiveCallParams(null);
      setCurrentUserId(null);
      setCurrentUserIds([]);
    };

    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === 'kmc_user_profile' || e.key === 'kmc_session') {
        if (!e.newValue) {
          handleLogoutHalt();
        }
      }
    };

    window.addEventListener('kmc_start_call', handleStartCallEvent);
    window.addEventListener('kmc_logout', handleLogoutHalt);
    window.addEventListener('storage', handleStorageChange);

    return () => {
      window.removeEventListener('kmc_start_call', handleStartCallEvent);
      window.removeEventListener('kmc_logout', handleLogoutHalt);
      window.removeEventListener('storage', handleStorageChange);
    };
  }, []);

  // 3. Poll for incoming calls when logged in and not inside an active call
  useEffect(() => {
    // If not logged in or currently inside active call, halt ringing and polling immediately
    if (!isUserLoggedIn() || activeCallParams || pathname?.startsWith('/call/')) {
      if (stopRingtoneRef.current) {
        stopRingtoneRef.current();
        stopRingtoneRef.current = null;
      }
      setIncomingCall(null);
      return;
    }

    let isChecking = false;

    const checkIncoming = async () => {
      // Strict guard: App MUST NOT ring or check calls if user is logged out
      if (!isUserLoggedIn()) {
        if (stopRingtoneRef.current) {
          stopRingtoneRef.current();
          stopRingtoneRef.current = null;
        }
        setIncomingCall(null);
        return;
      }

      if (isChecking) return;
      isChecking = true;

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

        const extraIds = Array.from(new Set([
          ...(currentUserIds || []),
          currentUserId || '',
        ].filter(Boolean)));
        const queryUrl = `/api/call?action=check_incoming&userId=${encodeURIComponent(currentUserId || '')}&email=${encodeURIComponent(userEmail || currentUserEmail)}&ids=${encodeURIComponent(extraIds.join(','))}`;
        const res = await fetch(queryUrl);
        if (!res.ok) {
          if (res.status === 401) {
            if (stopRingtoneRef.current) {
              stopRingtoneRef.current();
              stopRingtoneRef.current = null;
            }
            setIncomingCall(null);
          }
          return;
        }
        const data = await res.json();

        if (data.success && data.incomingCall) {
          const call = data.incomingCall as IncomingCallData;
          
          if (!currentUserId && call.calleeId) {
            setCurrentUserId(call.calleeId);
          }

          const currentCall = incomingCallRef.current;
          if (!currentCall || currentCall.roomId !== call.roomId) {
            setIncomingCall(call);
            setRingingSeconds(0);

            // Ring out with background HTML5 audio and vibration
            if (!stopRingtoneRef.current) {
              stopRingtoneRef.current = callRingtone.startIncomingRingtone();
            }

            // If app is minimized or hidden, present a system notification
            if (typeof document !== 'undefined' && document.hidden && typeof Notification !== 'undefined' && Notification.permission === 'granted') {
              try {
                const notif = new Notification(`${call.callerName || 'Member'} is calling...`, {
                  body: call.callMode === 'video' ? 'Incoming HD Video Date' : 'Incoming Private Voice Call',
                  icon: call.callerPhoto || '/icons/icon-192x192.png',
                  tag: `call-${call.roomId}`,
                  requireInteraction: true
                });
                notif.onclick = () => {
                  try { window.focus(); } catch {}
                  notif.close();
                };
              } catch {}
            }
          }
        } else {
          // No incoming call or caller cancelled
          const currentCall = incomingCallRef.current;
          if (currentCall) {
            if (stopRingtoneRef.current) {
              stopRingtoneRef.current();
              stopRingtoneRef.current = null;
            }
            callRingtone.playCallEndTone();
            setIncomingCall(null);
          }
        }
      } catch {} finally {
        isChecking = false;
      }
    };

    // Immediate check
    checkIncoming();

    // 1. Main thread fallback interval
    const mainInterval = setInterval(checkIncoming, 2000);

    // 2. Web Worker background timer: ensures polling continues every 2s even when app is minimized / document is hidden
    let worker: Worker | null = null;
    let workerBlobUrl: string | null = null;
    try {
      const workerCode = `
        var t = null;
        self.onmessage = function(e) {
          if (e.data === 'start') {
            if (!t) {
              t = setInterval(function() {
                self.postMessage('tick');
              }, 2000);
            }
          } else if (e.data === 'stop') {
            if (t) {
              clearInterval(t);
              t = null;
            }
          }
        };
      `;
      const blob = new Blob([workerCode], { type: 'application/javascript' });
      workerBlobUrl = URL.createObjectURL(blob);
      worker = new Worker(workerBlobUrl);
      worker.onmessage = (e) => {
        if (e.data === 'tick') {
          checkIncoming();
        }
      };
      worker.postMessage('start');
    } catch {}

    // 3. Keep-alive listener on visibility change
    const handleVisibilityChange = () => {
      if (isUserLoggedIn()) {
        checkIncoming();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // 4. Capacitor App State Change listener (minimized <-> foreground)
    let removeCapListener: (() => void) | null = null;
    import('@capacitor/app').then(({ App }) => {
      App.addListener('appStateChange', ({ isActive }) => {
        if (isUserLoggedIn()) {
          checkIncoming();
        }
      }).then(handle => {
        removeCapListener = () => handle.remove();
      }).catch(() => {});
    }).catch(() => {});

    return () => {
      clearInterval(mainInterval);
      if (worker) {
        try {
          worker.postMessage('stop');
          worker.terminate();
        } catch {}
      }
      if (workerBlobUrl) {
        try { URL.revokeObjectURL(workerBlobUrl); } catch {}
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      if (removeCapListener) removeCapListener();
    };
  }, [currentUserId, currentUserIds, currentUserEmail, pathname, activeCallParams]);

  // Ringing timer
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

  // Accept Incoming Call (Instant In-App Transition)
  const handleAcceptCall = () => {
    if (!incomingCall) return;

    callRingtone.stopAll();
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    const currentInc = { ...incomingCall };
    setIncomingCall(null);

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'accept_call',
        roomId: currentInc.roomId,
        peerId: currentUserId
      })
    }).catch(() => {});

    // Open active call stage 100% inside app
    setActiveCallParams({
      partnerId: currentInc.callerId,
      partnerName: currentInc.callerName || 'Club Member',
      partnerPhoto: currentInc.callerPhoto || '',
      initialMode: currentInc.callMode || 'video',
      initialRoomId: currentInc.roomId,
      role: 'callee',
      onEndCall: () => {
        callRingtone.stopAll();
        setActiveCallParams(null);
      }
    });
  };

  // Decline Incoming Call
  const handleDeclineCall = async () => {
    if (!incomingCall) return;

    callRingtone.stopAll();
    if (stopRingtoneRef.current) {
      stopRingtoneRef.current();
      stopRingtoneRef.current = null;
    }

    callRingtone.playCallEndTone();

    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'decline_call',
        roomId: incomingCall.roomId,
        peerId: currentUserId
      })
    }).catch(() => {});

    setIncomingCall(null);
  };

  return (
    <>
      {/* 1. In-App Active Call Live Stage (Full screen inside app) */}
      {activeCallParams && (
        <LiveCallStage {...activeCallParams} />
      )}

      {/* 2. Incoming Call Ringing Dialog */}
      {incomingCall && !activeCallParams && (
        <div className="fixed inset-0 z-[999999] flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative w-full max-w-md bg-neutral-950 border-2 border-[#D4AF37] rounded-3xl p-6 sm:p-8 text-center shadow-[0_0_80px_rgba(212,175,55,0.4)] overflow-hidden">
            
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-[#D4AF37]/20 blur-3xl pointer-events-none" />

            <div className="relative mx-auto w-32 h-32 mb-6 flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border border-[#D4AF37]/30 animate-ping duration-1000" />
              <div className="absolute -inset-4 rounded-full border border-[#D4AF37]/20 animate-pulse" />
              
              <div className="w-28 h-28 rounded-full border-2 border-[#D4AF37] p-1 bg-black relative z-10 shadow-2xl flex items-center justify-center overflow-hidden">
                {incomingCall.callerPhoto ? (
                  <img
                    src={incomingCall.callerPhoto}
                    alt={incomingCall.callerName}
                    className="w-full h-full object-cover rounded-full"
                  />
                ) : (
                  <span className="font-serif font-bold text-3xl text-[#D4AF37] tracking-widest">
                    {(incomingCall.callerName || 'M').slice(0, 2).toUpperCase()}
                  </span>
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

            <div className="flex items-center justify-center gap-6 pt-2">
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
      )}
    </>
  );
}
