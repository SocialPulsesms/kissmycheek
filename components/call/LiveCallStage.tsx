'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Mic, 
  MicOff, 
  Video, 
  VideoOff, 
  PhoneOff, 
  Crown, 
  Gift, 
  ShieldCheck, 
  RefreshCw,
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';
import { 
  triggerMediaPermissions, 
  getCachedLocalStream, 
  clearCachedLocalStream 
} from '@/lib/mediaPermissions';

export interface LiveCallStageProps {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  initialMode?: 'voice' | 'video';
  initialRoomId?: string;
  roomUrl?: string;
  role?: 'caller' | 'callee';
  onEndCall?: (durationFormatted: string) => void;
}

export function LiveCallStage({
  partnerId,
  partnerName = 'Club Member',
  partnerPhoto = '',
  partnerOccupation = 'Member',
  partnerLocation = 'Verified Member',
  initialMode = 'video',
  initialRoomId,
  roomUrl: propRoomUrl,
  role = 'caller',
  onEndCall
}: LiveCallStageProps) {
  const localVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null);
  const remoteAudioRef = useRef<HTMLAudioElement | null>(null);
  const dailyCallRef = useRef<any>(null);

  const [callMode, setCallMode] = useState<'voice' | 'video'>(initialMode);
  const [resolvedRoomUrl, setResolvedRoomUrl] = useState<string>(propRoomUrl || '');
  const [isJoining, setIsJoining] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [partnerInRoom, setPartnerInRoom] = useState<boolean>(false);
  const [hasRemoteVideo, setHasRemoteVideo] = useState<boolean>(false);
  const [hasLocalVideo, setHasLocalVideo] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(initialMode === 'voice');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Gifting modal inside call
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');
  const [activeGiftEffect, setActiveGiftEffect] = useState<{ gift: BespokeGift; reaction: string } | null>(null);

  // Robust video stream attachment helper with auto-play enforcement for mobile WebView
  const attachStreamToVideo = (
    videoEl: HTMLVideoElement | null, 
    stream: MediaStream | null, 
    isMuted = false
  ) => {
    if (!videoEl) return;
    if (!stream) {
      try {
        videoEl.srcObject = null;
      } catch {}
      return;
    }
    try {
      videoEl.srcObject = stream;
      videoEl.muted = isMuted;
      videoEl.defaultMuted = isMuted;
      videoEl.setAttribute('playsinline', 'true');
      videoEl.setAttribute('webkit-playsinline', 'true');
      videoEl.setAttribute('autoplay', 'true');
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch(err => {
          console.warn('Video auto-play handled:', err);
        });
      }
    } catch (err) {
      console.warn('attachStreamToVideo error:', err);
    }
  };

  // Format call duration helper (e.g. 02:45)
  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Instant local camera binding immediately on mount (zero lag, no play button)
  useEffect(() => {
    if (initialMode === 'voice') return;

    const existingStream = getCachedLocalStream();
    if (existingStream && existingStream.getVideoTracks().some(t => t.readyState === 'live')) {
      attachStreamToVideo(localVideoRef.current, existingStream, true);
      setHasLocalVideo(true);
    }
  }, [initialMode]);

  // 2. Provision or resolve Daily room URL
  useEffect(() => {
    let isCancelled = false;

    async function setupRoom() {
      if (propRoomUrl) {
        setResolvedRoomUrl(propRoomUrl);
        return;
      }

      try {
        const canonicalId = initialRoomId || `call_${[partnerId, 'user'].sort().join('_')}`;
        const res = await fetch('/api/daily/room', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ roomId: canonicalId, mode: initialMode })
        });

        const data = await res.json();
        if (!isCancelled) {
          if (data?.url) {
            setResolvedRoomUrl(data.url);
          } else {
            setErrorMsg(data?.error || 'Could not connect to Daily call network');
            setIsJoining(false);
          }
        }
      } catch (err: any) {
        if (!isCancelled) {
          setErrorMsg(err?.message || 'Failed to establish call room');
          setIsJoining(false);
        }
      }
    }

    setupRoom();

    return () => {
      isCancelled = true;
    };
  }, [propRoomUrl, initialRoomId, partnerId, initialMode]);

  // 3. Headless Daily Call Object setup (Native HTML5 video, zero iframe)
  useEffect(() => {
    if (!resolvedRoomUrl || typeof window === 'undefined') return;

    let isMounted = true;
    let callObject: any = null;

    // Helper to sync local participant video
    const syncLocalParticipant = (participant: any) => {
      if (!isMounted || !participant) return;
      const vTrack = participant.tracks?.video?.persistentTrack || participant.tracks?.video?.track;
      const vState = participant.tracks?.video?.state;

      if (vTrack && vTrack.readyState === 'live' && vState !== 'off' && vState !== 'blocked') {
        if (localVideoRef.current) {
          const currStream = localVideoRef.current.srcObject as MediaStream | null;
          const currTrack = currStream?.getVideoTracks()[0];
          if (!currStream || currTrack?.id !== vTrack.id) {
            attachStreamToVideo(localVideoRef.current, new MediaStream([vTrack]), true);
          }
        }
        setHasLocalVideo(true);
      } else {
        // Fallback: If Daily hasn't populated persistentTrack or is in transient state, check cached stream
        const fallbackStream = getCachedLocalStream();
        const fallbackTrack = fallbackStream?.getVideoTracks().find(t => t.readyState === 'live');
        if (fallbackTrack && !isCamOff) {
          if (localVideoRef.current && !localVideoRef.current.srcObject) {
            attachStreamToVideo(localVideoRef.current, fallbackStream, true);
          }
          setHasLocalVideo(true);
        } else if (isCamOff) {
          setHasLocalVideo(false);
        }
      }
    };

    // Helper to sync remote participant audio/video
    const syncRemoteParticipant = (participant: any) => {
      if (!isMounted || !participant || participant.local) return;
      setPartnerInRoom(true);

      const vTrack = participant.tracks?.video?.persistentTrack || participant.tracks?.video?.track;
      const vState = participant.tracks?.video?.state;
      if (vTrack && vTrack.readyState === 'live' && vState !== 'off' && vState !== 'blocked') {
        if (remoteVideoRef.current) {
          const currStream = remoteVideoRef.current.srcObject as MediaStream | null;
          const currTrack = currStream?.getVideoTracks()[0];
          if (!currStream || currTrack?.id !== vTrack.id) {
            attachStreamToVideo(remoteVideoRef.current, new MediaStream([vTrack]), false);
          }
        }
        setHasRemoteVideo(true);
      } else if (vState === 'off') {
        setHasRemoteVideo(false);
      }

      const aTrack = participant.tracks?.audio?.persistentTrack || participant.tracks?.audio?.track;
      if (aTrack && aTrack.readyState === 'live' && remoteAudioRef.current) {
        const currAudioStream = remoteAudioRef.current.srcObject as MediaStream | null;
        const currAudioTrack = currAudioStream?.getAudioTracks()[0];
        if (!currAudioStream || currAudioTrack?.id !== aTrack.id) {
          remoteAudioRef.current.srcObject = new MediaStream([aTrack]);
          remoteAudioRef.current.play().catch(() => {});
        }
      }
    };

    async function initHeadlessDaily() {
      try {
        setIsJoining(true);
        setErrorMsg(null);

        // Pre-prompt native permissions immediately
        let localStream = getCachedLocalStream();
        if (!localStream) {
          const permRes = await triggerMediaPermissions(initialMode);
          localStream = permRes.stream;
        }

        // Immediately bind localStream to self-preview if available
        if (localStream && localStream.getVideoTracks().some(t => t.readyState === 'live') && localVideoRef.current) {
          attachStreamToVideo(localVideoRef.current, localStream, true);
          setHasLocalVideo(true);
        }

        const DailyModule = (await import('@daily-co/daily-js')).default;
        if (!isMounted) return;

        // Headless call object - NO IFRAME, NO DAILY UI, NO LOCK-ICON POPUP
        callObject = DailyModule.createCallObject({
          subscribeToTracksAutomatically: true,
          dailyConfig: {
            useDevicePreferenceCookies: false
          }
        });

        dailyCallRef.current = callObject;

        // Joined meeting event
        callObject.on('joined-meeting', () => {
          if (!isMounted) return;
          setIsJoining(false);
          setIsConnected(true);

          const participants = callObject.participants();
          if (participants.local) {
            syncLocalParticipant(participants.local);
          }

          for (const [id, p] of Object.entries(participants)) {
            if (id !== 'local' && p) {
              syncRemoteParticipant(p);
            }
          }

          // Ensure camera is active if video call and no track yet
          if (initialMode !== 'voice') {
            const localPart = callObject.participants()?.local;
            const hasExisting = !!(localPart?.tracks?.video?.persistentTrack || localPart?.tracks?.video?.track);
            if (!hasExisting) {
              try {
                callObject.setLocalVideo(true);
              } catch (err) {
                console.warn('Daily setLocalVideo on join error:', err);
              }
            }
          }
        });

        // Participant Updated - CRITICAL for local camera track detection in Daily
        callObject.on('participant-updated', (e: any) => {
          if (!isMounted || !e?.participant) return;
          if (e.participant.local) {
            syncLocalParticipant(e.participant);
          } else {
            syncRemoteParticipant(e.participant);
          }
        });

        // Remote participant events
        callObject.on('participant-joined', (e: any) => {
          if (!isMounted || !e?.participant) return;
          syncRemoteParticipant(e.participant);
        });

        callObject.on('participant-left', () => {
          if (!isMounted) return;
          setPartnerInRoom(false);
          setHasRemoteVideo(false);
          if (remoteVideoRef.current) {
            attachStreamToVideo(remoteVideoRef.current, null);
          }
        });

        // WebRTC Track Started
        callObject.on('track-started', (e: any) => {
          if (!isMounted) return;
          if (e.participant?.local) {
            syncLocalParticipant(e.participant);
          } else if (e.participant) {
            syncRemoteParticipant(e.participant);
          }
        });

        // WebRTC Track Stopped
        callObject.on('track-stopped', (e: any) => {
          if (!isMounted) return;
          if (e.participant?.local) {
            // Only detach local video if camera was explicitly turned off or track is truly dead
            const p = callObject?.participants()?.local;
            const vTrack = p?.tracks?.video?.persistentTrack || p?.tracks?.video?.track;
            if (!vTrack || vTrack.readyState !== 'live' || p?.tracks?.video?.state === 'off') {
              if (isCamOff) {
                setHasLocalVideo(false);
                attachStreamToVideo(localVideoRef.current, null);
              }
            }
          } else {
            if (e.type === 'video') {
              setHasRemoteVideo(false);
              attachStreamToVideo(remoteVideoRef.current, null);
            }
          }
        });

        callObject.on('camera-error', (e: any) => {
          if (!isMounted) return;
          console.warn('Daily camera error:', e);
          const errorType = e?.error?.msg || e?.errorMsg || e?.error?.type || '';
          if (errorType.includes('NotReadable') || errorType.includes('in use') || errorType.includes('busy')) {
            setErrorMsg('Camera hardware is currently in use by another app. Please close other camera apps and reconnect.');
          } else if (errorType.includes('Permission') || errorType.includes('NotAllowed')) {
            setErrorMsg('Camera access was declined. Please allow camera permissions in your phone settings.');
          }
        });

        // Exit / Hangup
        callObject.on('left-meeting', () => {
          if (!isMounted) return;
          handleCleanExit();
        });

        callObject.on('error', (e: any) => {
          if (!isMounted) return;
          console.warn('Daily call error:', e);
          setErrorMsg(e?.errorMsg || 'Audio/Video streaming error');
          setIsJoining(false);
        });

        // Pass live tracks directly to Daily
        const videoTrack = localStream?.getVideoTracks().find(t => t.readyState === 'live');
        const audioTrack = localStream?.getAudioTracks().find(t => t.readyState === 'live');

        await callObject.join({
          url: resolvedRoomUrl,
          videoSource: videoTrack || (initialMode !== 'voice'),
          audioSource: audioTrack || true,
        });

        if (isMounted) {
          const currentParts = callObject.participants();
          if (currentParts?.local) {
            syncLocalParticipant(currentParts.local);
          }
        }

      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err?.message || 'Failed to initialize transmission');
        setIsJoining(false);
      }
    }

    initHeadlessDaily();

    return () => {
      isMounted = false;
      if (callObject) {
        try {
          callObject.leave();
          callObject.destroy();
        } catch {}
      }
    };
  }, [resolvedRoomUrl, initialMode]);

  // 4. Call Duration Timer
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (isConnected) {
      timer = setInterval(() => {
        setSecondsElapsed(prev => prev + 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [isConnected]);

  // Clean Exit Helper
  const handleCleanExit = () => {
    clearCachedLocalStream();
    const finalFormatted = formatDuration(secondsElapsed);
    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'end_call',
        roomId: initialRoomId || `call_${partnerId}`,
        duration: secondsElapsed
      })
    }).catch(() => {});

    if (onEndCall) {
      onEndCall(finalFormatted);
    }
  };

  // Toggle Microphone
  const toggleMic = () => {
    if (dailyCallRef.current) {
      const nextState = !isMicMuted;
      dailyCallRef.current.setLocalAudio(!nextState);
      setIsMicMuted(nextState);
    }
  };

  // Toggle Camera
  const toggleCam = async () => {
    if (dailyCallRef.current) {
      const nextCamOff = !isCamOff;
      setIsCamOff(nextCamOff);
      dailyCallRef.current.setLocalVideo(!nextCamOff);

      if (nextCamOff) {
        setHasLocalVideo(false);
        attachStreamToVideo(localVideoRef.current, null);
      } else {
        const localP = dailyCallRef.current.participants()?.local;
        const vTrack = localP?.tracks?.video?.persistentTrack || localP?.tracks?.video?.track;
        if (vTrack && vTrack.readyState === 'live') {
          attachStreamToVideo(localVideoRef.current, new MediaStream([vTrack]), true);
          setHasLocalVideo(true);
        } else {
          try {
            const res = await triggerMediaPermissions('video');
            if (res.stream && localVideoRef.current) {
              attachStreamToVideo(localVideoRef.current, res.stream, true);
              setHasLocalVideo(true);
            }
          } catch {}
        }
      }
    }
  };

  // Flip Camera (Front/Back)
  const flipCamera = async () => {
    if (dailyCallRef.current?.cycleCamera) {
      try {
        await dailyCallRef.current.cycleCamera();
      } catch {}
    }
  };

  // Hangup / End Call
  const handleHangup = async () => {
    clearCachedLocalStream();
    if (dailyCallRef.current) {
      try {
        await dailyCallRef.current.leave();
        dailyCallRef.current.destroy();
      } catch {}
    }
    handleCleanExit();
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-[#070709] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      {/* Hidden audio element for remote participant */}
      <audio ref={remoteAudioRef} autoPlay playsInline />

      {/* Top Header Bar */}
      <div className="relative z-30 px-4 pt-4 pb-2 flex items-center justify-between bg-gradient-to-b from-black/90 via-black/50 to-transparent">
        {/* Partner Info Pill */}
        <div className="flex items-center gap-3 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
          <div className="relative">
            {partnerPhoto ? (
              <img 
                src={partnerPhoto} 
                alt={partnerName} 
                className="w-9 h-9 rounded-full object-cover border border-[#D4AF37]/50" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-[#1A1813] border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-xs">
                {partnerName.charAt(0).toUpperCase()}
              </div>
            )}
            <span className={`absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full border-2 border-black ${isConnected ? 'bg-emerald-400' : 'bg-amber-400 animate-pulse'}`} />
          </div>

          <div className="min-w-0 pr-1">
            <div className="flex items-center gap-1.5">
              <h3 className="font-serif font-bold text-xs text-white truncate">{partnerName}</h3>
              <Crown className="w-3 h-3 text-[#D4AF37]" />
            </div>
            <p className="text-[10px] text-white/50 truncate">
              {isConnected ? (callMode === 'video' ? 'Face-to-Face Video' : 'HD Voice') : (role === 'callee' ? 'Connecting...' : 'Calling...')}
            </p>
          </div>
        </div>

        {/* Center: Live Timer & Security Pill */}
        <div className="flex items-center gap-2 bg-black/60 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 text-xs font-medium">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="font-mono font-bold text-[#D4AF37] text-xs">{formatDuration(secondsElapsed)}</span>
        </div>

        {/* Right Badge: Luxury Status */}
        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold">
          <Sparkles className="w-3 h-3" />
          <span>4K Private</span>
        </div>
      </div>

      {/* Main Tinder-Style Video Stage Canvas */}
      <div className="flex-1 relative mx-2 sm:mx-6 my-1 rounded-3xl overflow-hidden bg-[#0A0A0E] border border-white/10 shadow-2xl flex items-center justify-center">
        
        {/* Remote Video Stream (Full Bleed Background) */}
        <video
          ref={remoteVideoRef}
          autoPlay
          playsInline
          className={`w-full h-full object-cover transition-opacity duration-500 ${hasRemoteVideo ? 'opacity-100' : 'opacity-0 absolute inset-0'}`}
        />

        {/* Remote Video Placeholder (When partner's camera is off or connecting) */}
        {!hasRemoteVideo && (
          <div className="absolute inset-0 z-10 bg-[#0B0B10] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-28 h-28 sm:w-36 sm:h-36 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border-2 border-[#D4AF37] p-1 mb-4 relative shadow-2xl">
              {partnerPhoto ? (
                <img 
                  src={partnerPhoto} 
                  alt={partnerName} 
                  className="w-full h-full rounded-full object-cover" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#13131A] flex items-center justify-center text-[#D4AF37] font-serif text-3xl font-bold">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
              )}
              {isConnected && (
                <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-25" />
              )}
            </div>

            <h3 className="font-serif text-xl sm:text-2xl font-bold text-white mb-1">{partnerName}</h3>
            <p className="text-xs text-white/50 mb-3">{partnerOccupation} • {partnerLocation}</p>

            {isJoining && (
              <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-4 py-1.5 rounded-full mt-2">
                <Sparkles className="w-3.5 h-3.5 animate-spin text-[#D4AF37]" />
                <span>Connecting Line...</span>
              </div>
            )}
          </div>
        )}

        {/* Self Camera Preview (Tinder-Style Floating Picture-in-Picture Card) */}
        <div 
          className="absolute bottom-4 right-4 w-28 h-40 sm:w-36 sm:h-52 rounded-2xl overflow-hidden border-2 border-[#D4AF37]/60 shadow-2xl bg-black z-30 transition-transform duration-200 group select-none"
        >
          <video
            ref={localVideoRef}
            autoPlay
            playsInline
            muted
            style={{ transform: 'scaleX(-1)' }}
            className={`w-full h-full object-cover transition-opacity duration-300 ${!isCamOff ? 'opacity-100' : 'opacity-0'}`}
          />
          {isCamOff ? (
            <div className="absolute inset-0 bg-[#141418] flex flex-col items-center justify-center text-white/40 p-2">
              <VideoOff className="w-6 h-6 mb-1 text-white/40" />
              <span className="text-[10px] font-medium">Camera Off</span>
            </div>
          ) : !hasLocalVideo ? (
            <div className="absolute inset-0 bg-[#141418]/80 flex flex-col items-center justify-center text-[#D4AF37]/60 p-2">
              <Sparkles className="w-5 h-5 mb-1 animate-spin text-[#D4AF37]" />
              <span className="text-[9px] font-medium tracking-wider">Starting...</span>
            </div>
          ) : null}
          <div className="absolute bottom-1 left-1.5 bg-black/60 px-1.5 py-0.5 rounded text-[9px] font-medium text-white/70 backdrop-blur-sm pointer-events-none">
            You
          </div>
        </div>

        {/* Error Fallback Notice */}
        {errorMsg && (
          <div className="absolute inset-0 z-40 bg-[#070709]/95 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
            <div className="w-14 h-14 rounded-full bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 mb-4">
              <AlertCircle className="w-7 h-7" />
            </div>
            <h4 className="font-serif text-lg font-bold text-white mb-2">Connection Notice</h4>
            <p className="text-xs text-white/60 mb-6 leading-relaxed">{errorMsg}</p>
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setErrorMsg(null);
                  setIsJoining(true);
                  setResolvedRoomUrl('');
                  setTimeout(() => setResolvedRoomUrl(propRoomUrl || ''), 100);
                }}
                className="px-5 py-2.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c49f27] transition-all flex items-center gap-2"
              >
                <RefreshCw className="w-4 h-4" /> Reconnect
              </button>
              <button
                onClick={handleCleanExit}
                className="px-5 py-2.5 rounded-full bg-white/10 text-white text-xs font-bold hover:bg-white/20 transition-all"
              >
                Exit
              </button>
            </div>
          </div>
        )}

        {/* Active In-Call Luxury Gift Animation Overlay */}
        <AnimatePresence>
          {activeGiftEffect && (
            <motion.div
              initial={{ scale: 0.5, opacity: 0, y: 50 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.8, opacity: 0, y: -50 }}
              className="absolute z-40 top-16 left-1/2 -translate-x-1/2 bg-black/85 backdrop-blur-md border border-[#D4AF37] rounded-3xl p-6 shadow-2xl text-center pointer-events-none"
            >
              <span className="text-5xl block mb-2">{activeGiftEffect.gift.icon}</span>
              <p className="font-serif text-sm font-bold text-[#D4AF37]">
                You gifted {activeGiftEffect.gift.name}!
              </p>
              <p className="text-[11px] text-white/60 mt-0.5 font-sans">
                {activeGiftEffect.reaction}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Bottom Tinder-Style Control Dock (Minimal, familiar, 4 clean circle buttons) */}
      <div className="relative z-30 px-4 pt-2 pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3 sm:gap-4 bg-black/80 backdrop-blur-xl px-5 py-3 rounded-full border border-white/15 shadow-2xl">
          
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
              isMicMuted 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500 hover:text-white' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isMicMuted ? 'Unmute Audio' : 'Mute Audio'}
          >
            {isMicMuted ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
          </button>

          {/* Camera On/Off */}
          <button
            onClick={toggleCam}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all shadow-md active:scale-95 ${
              isCamOff 
                ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 hover:bg-rose-500 hover:text-white' 
                : 'bg-white/10 text-white hover:bg-white/20 border border-white/10'
            }`}
            title={isCamOff ? 'Turn Camera On' : 'Turn Camera Off'}
          >
            {isCamOff ? <VideoOff className="w-5 h-5" /> : <Video className="w-5 h-5" />}
          </button>

          {/* Flip Camera (Mobile Front/Back) */}
          <button
            onClick={flipCamera}
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all shadow-md active:scale-95"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Bespoke In-Call Luxury Gift */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center transition-all shadow-md active:scale-95"
            title="Send Bespoke Gift"
          >
            <Gift className="w-5 h-5" />
          </button>

          {/* End Call Button */}
          <button
            onClick={handleHangup}
            className="w-14 h-12 rounded-full bg-rose-600 hover:bg-rose-500 text-white font-bold flex items-center justify-center transition-all shadow-lg hover:scale-105 active:scale-95"
            title="End Call"
          >
            <PhoneOff className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Credit Wallet & Bespoke Gifting Modal */}
      <CreditsAndGiftingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        recipientName={partnerName}
        onGiftSent={(gift) => {
          setActiveGiftEffect({ gift, reaction: `${partnerName} received your ${gift.name}!` });
          setTimeout(() => setActiveGiftEffect(null), 4000);
        }}
      />
    </div>
  );
}
