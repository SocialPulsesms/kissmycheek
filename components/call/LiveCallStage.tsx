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
  Volume2,
  AlertCircle
} from 'lucide-react';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';

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
  const containerRef = useRef<HTMLDivElement | null>(null);
  const dailyFrameRef = useRef<any>(null);

  const [callMode, setCallMode] = useState<'voice' | 'video'>(initialMode);
  const [resolvedRoomUrl, setResolvedRoomUrl] = useState<string>(propRoomUrl || '');
  const [isJoining, setIsJoining] = useState<boolean>(true);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [partnerInRoom, setPartnerInRoom] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [isMicMuted, setIsMicMuted] = useState<boolean>(false);
  const [isCamOff, setIsCamOff] = useState<boolean>(initialMode === 'voice');
  const [secondsElapsed, setSecondsElapsed] = useState<number>(0);

  // Gifting modal inside call
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');
  const [activeGiftEffect, setActiveGiftEffect] = useState<{ gift: BespokeGift; reaction: string } | null>(null);

  // Format call duration helper (e.g. 02:45)
  const formatDuration = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // 1. Provision or resolve Daily room URL
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

  // 2. Mount Daily Call Frame once resolvedRoomUrl & containerRef are ready
  useEffect(() => {
    if (!resolvedRoomUrl || !containerRef.current || typeof window === 'undefined') return;

    let isMounted = true;
    let callFrame: any = null;

    async function initDaily() {
      try {
        setIsJoining(true);
        setErrorMsg(null);

        // Dynamic client-side import of @daily-co/daily-js
        const DailyModule = (await import('@daily-co/daily-js')).default;
        if (!isMounted || !containerRef.current) return;

        // Clean up any existing iframe inside container
        containerRef.current.innerHTML = '';

        callFrame = DailyModule.createFrame(containerRef.current, {
          iframeStyle: {
            width: '100%',
            height: '100%',
            border: '0',
            borderRadius: '1.5rem',
            backgroundColor: '#070709',
          },
          showLeaveButton: false,
          showFullscreenButton: true,
          theme: {
            colors: {
              mainAreaBg: '#070709',
              mainAreaBgAccent: '#0D0D14',
              accent: '#D4AF37',
              accentText: '#000000',
            }
          }
        });

        dailyFrameRef.current = callFrame;

        // Daily Event Listeners
        callFrame.on('joined-meeting', () => {
          if (!isMounted) return;
          setIsJoining(false);
          setIsConnected(true);
        });

        callFrame.on('participant-joined', () => {
          if (!isMounted) return;
          setPartnerInRoom(true);
        });

        callFrame.on('participant-left', () => {
          if (!isMounted) return;
          setPartnerInRoom(false);
        });

        callFrame.on('left-meeting', () => {
          if (!isMounted) return;
          handleCleanExit();
        });

        callFrame.on('error', (e: any) => {
          if (!isMounted) return;
          setErrorMsg(e?.errorMsg || 'Audio/Video streaming error');
          setIsJoining(false);
        });

        // Join the Daily Room
        await callFrame.join({
          url: resolvedRoomUrl,
          videoSource: initialMode === 'voice' ? false : true,
          audioSource: true,
        });

      } catch (err: any) {
        if (!isMounted) return;
        setErrorMsg(err?.message || 'Failed to initialize transmission');
        setIsJoining(false);
      }
    }

    initDaily();

    return () => {
      isMounted = false;
      if (callFrame) {
        try {
          callFrame.destroy();
        } catch {}
      }
    };
  }, [resolvedRoomUrl, initialMode]);

  // 3. Call Duration Timer
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
    const finalFormatted = formatDuration(secondsElapsed);
    // Tell signaling store call has ended
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
    if (dailyFrameRef.current) {
      const nextState = !isMicMuted;
      dailyFrameRef.current.setLocalAudio(!nextState);
      setIsMicMuted(nextState);
    }
  };

  // Toggle Camera
  const toggleCam = () => {
    if (dailyFrameRef.current) {
      const nextState = !isCamOff;
      dailyFrameRef.current.setLocalVideo(!nextState);
      setIsCamOff(nextState);
    }
  };

  // Flip Camera (Mobile)
  const flipCamera = async () => {
    if (dailyFrameRef.current?.cycleCamera) {
      try {
        await dailyFrameRef.current.cycleCamera();
      } catch {}
    }
  };

  // End Call
  const handleHangup = async () => {
    if (dailyFrameRef.current) {
      try {
        await dailyFrameRef.current.leave();
      } catch {}
    }
    handleCleanExit();
  };

  return (
    <div className="fixed inset-0 z-[9995] bg-[#070709] text-white flex flex-col justify-between overflow-hidden select-none font-sans">
      
      {/* Top Header Bar */}
      <div className="relative z-20 px-4 pt-4 pb-3 flex items-center justify-between bg-gradient-to-b from-black/80 via-black/40 to-transparent">
        {/* Partner Info Pill */}
        <div className="flex items-center gap-3 bg-black/50 backdrop-blur-md px-3.5 py-1.5 rounded-full border border-white/10 shadow-lg">
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
              {isConnected ? (callMode === 'video' ? '4K Video Date' : 'HD Voice Call') : (role === 'callee' ? 'Connecting...' : 'Calling...')}
            </p>
          </div>
        </div>

        {/* Center: Live Timer & Security Pill */}
        <div className="hidden sm:flex items-center gap-2 bg-black/50 backdrop-blur-md px-4 py-1.5 rounded-full border border-white/10 text-xs font-medium text-white/80">
          <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
          <span className="text-[11px] uppercase tracking-wider text-white/60">Encrypted</span>
          <span className="text-white/30">•</span>
          <span className="font-mono font-bold text-[#D4AF37] text-xs">{formatDuration(secondsElapsed)}</span>
        </div>

        {/* Right Badge: Daily SFU Status */}
        <div className="flex items-center gap-2">
          <span className="sm:hidden font-mono font-bold text-xs text-[#D4AF37] bg-black/50 px-2.5 py-1 rounded-full border border-white/10">
            {formatDuration(secondsElapsed)}
          </span>
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#D4AF37] text-[11px] font-bold">
            <Sparkles className="w-3 h-3" />
            <span>Daily 4K</span>
          </div>
        </div>
      </div>

      {/* Main Video/Audio Calling Canvas */}
      <div className="flex-1 relative mx-2 sm:mx-6 my-1 rounded-3xl overflow-hidden bg-black border border-[#D4AF37]/20 shadow-2xl flex items-center justify-center">
        
        {/* Daily Iframe Injection Container */}
        <div 
          ref={containerRef} 
          className="w-full h-full absolute inset-0 z-10" 
        />

        {/* Loading / Connecting Overlay */}
        {isJoining && !errorMsg && (
          <div className="absolute inset-0 z-20 bg-[#070709] flex flex-col items-center justify-center p-6 text-center">
            <div className="w-24 h-24 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border-2 border-[#D4AF37] p-1 mb-6 relative">
              {partnerPhoto ? (
                <img 
                  src={partnerPhoto} 
                  alt={partnerName} 
                  className="w-full h-full rounded-full object-cover" 
                />
              ) : (
                <div className="w-full h-full rounded-full bg-[#13131A] flex items-center justify-center text-[#D4AF37] font-serif text-2xl font-bold">
                  {partnerName.charAt(0).toUpperCase()}
                </div>
              )}
              <div className="absolute inset-0 rounded-full border-2 border-[#D4AF37] animate-ping opacity-30" />
            </div>

            <h3 className="font-serif text-xl font-bold text-white mb-1">{partnerName}</h3>
            <p className="text-xs text-white/50 mb-6">{partnerOccupation} • {partnerLocation}</p>

            <div className="flex items-center gap-2 text-xs text-[#D4AF37] font-semibold bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-4 py-2 rounded-full shadow-lg">
              <Sparkles className="w-4 h-4 animate-spin text-[#D4AF37]" />
              <span>Establishing High-Definition Line...</span>
            </div>
          </div>
        )}

        {/* Error Fallback Notice */}
        {errorMsg && (
          <div className="absolute inset-0 z-30 bg-[#070709]/95 flex flex-col items-center justify-center p-6 text-center max-w-md mx-auto">
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
                  // Triggers re-fetch
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
                Exit Call
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
              className="absolute z-40 top-16 left-1/2 -translate-x-1/2 bg-black/80 backdrop-blur-md border border-[#D4AF37] rounded-3xl p-6 shadow-2xl text-center pointer-events-none"
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

      {/* Bottom Luxury Dock Controls */}
      <div className="relative z-20 px-4 pt-2 pb-6 flex items-center justify-center">
        <div className="flex items-center gap-3 sm:gap-4 bg-black/75 backdrop-blur-xl px-5 py-3 rounded-full border border-white/15 shadow-2xl">
          
          {/* Mute/Unmute Mic */}
          <button
            onClick={toggleMic}
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
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
            className={`w-12 h-12 rounded-full flex items-center justify-center transition-all ${
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
            className="w-12 h-12 rounded-full bg-white/10 text-white hover:bg-white/20 border border-white/10 flex items-center justify-center transition-all"
            title="Flip Camera"
          >
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Bespoke In-Call Luxury Gift */}
          <button
            onClick={() => setModalOpen(true)}
            className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black flex items-center justify-center transition-all shadow-md"
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
