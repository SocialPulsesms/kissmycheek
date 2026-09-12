'use client';

import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  PhoneOff, 
  Phone, 
  Video, 
  Crown, 
  Gift, 
  ShieldCheck, 
  Sparkles,
  ExternalLink,
  Copy,
  Check
} from 'lucide-react';
import { MemberProfile } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';
import { getCanonicalRoomId } from '@/lib/callRoomId';
import { callRingtone } from '@/lib/callRingtone';

export interface LiveCallStageProps {
  partnerId: string;
  partnerName?: string;
  partnerPhoto?: string;
  partnerOccupation?: string;
  partnerLocation?: string;
  initialMode?: 'voice' | 'video';
  initialRoomId?: string;
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
  role: initialRole,
  onEndCall
}: LiveCallStageProps) {
  const [callMode, setCallMode] = useState<'voice' | 'video'>(initialMode);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [callConnected, setCallConnected] = useState(false);
  const [roomUrl, setRoomUrl] = useState<string>('');
  const [copiedLink, setCopiedLink] = useState(false);
  const [isRoomLoading, setIsRoomLoading] = useState(true);

  // Floating reactions & animations
  const [showReactions, setShowReactions] = useState(false);
  const [floatingReactions, setFloatingReactions] = useState<Array<{ id: string; emoji: string; x: number }>>([]);
  const [heartBursts, setHeartBursts] = useState<Array<{ id: string; x: number; y: number }>>([]);
  const lastTapRef = useRef<number>(0);

  // Gifting state
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');
  const [activeGiftEffect, setActiveGiftEffect] = useState<{ gift: BespokeGift; reaction: string } | null>(null);

  // Synchronous session initialization
  const getInitialUserId = () => {
    if (typeof window === 'undefined') return 'caller';
    try {
      const saved = localStorage.getItem('kmc_user_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.id) return p.id;
      }
      const sess = localStorage.getItem('kmc_session');
      if (sess) {
        const s = JSON.parse(sess);
        if (s.userId || s.id) return s.userId || s.id;
      }
    } catch {}
    return 'user-me';
  };

  const getInitialUserName = () => {
    if (typeof window === 'undefined') return 'Exclusive Member';
    try {
      const saved = localStorage.getItem('kmc_user_profile');
      if (saved) {
        const p = JSON.parse(saved);
        if (p.customName || p.fullName || p.name) return p.customName || p.fullName || p.name;
      }
      const sess = localStorage.getItem('kmc_session');
      if (sess) {
        const s = JSON.parse(sess);
        if (s.customName || s.fullName || s.name) return s.customName || s.fullName || s.name;
      }
    } catch {}
    return 'Exclusive Member';
  };

  const [currentUserId] = useState<string>(getInitialUserId);
  const [currentUserName] = useState<string>(getInitialUserName);
  const [currentUserPhoto] = useState<string>('');

  const [profile, setProfile] = useState<MemberProfile>({
    id: partnerId,
    name: partnerName,
    age: 28,
    location: partnerLocation,
    occupation: partnerOccupation,
    education: 'Verified',
    bio: '',
    height: "5'10\"",
    verified: true,
    tier: 'ELITE',
    compatibility: 95,
    relationshipGoals: 'Exclusive Dating',
    photos: partnerPhoto ? [partnerPhoto] : [],
    interests: [],
    lifestyle: { travel: '', drink: '', workout: '', pets: '' },
    online: true,
    distance: 'Direct'
  });

  const stopRingbackRef = useRef<(() => void) | null>(null);
  const pollTimerRef = useRef<NodeJS.Timeout | null>(null);
  const endedRef = useRef(false);
  const secondsElapsedRef = useRef(0);
  const roomIdRef = useRef<string>('');

  // Fallback photo lookup from directory
  useEffect(() => {
    if (!profile.photos || profile.photos.length === 0 || !profile.photos[0]) {
      fetch(`/api/directory?search=${encodeURIComponent(partnerName)}`)
        .then(res => res.json())
        .then(data => {
          if (data.members && data.members.length > 0) {
            const found = data.members.find((m: any) => m.id === partnerId || m.name === partnerName);
            if (found && found.photos && found.photos.length > 0) {
              setProfile(prev => ({
                ...prev,
                photos: found.photos,
                occupation: found.occupation || prev.occupation,
                location: found.location || prev.location
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [partnerId, partnerName]);

  // Duration Timer
  useEffect(() => {
    const timer = setInterval(() => {
      setSecondsElapsed(prev => {
        const next = prev + 1;
        secondsElapsedRef.current = next;
        return next;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDuration = (totalSec: number) => {
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Main Call Initialization via Metered Video API
  useEffect(() => {
    endedRef.current = false;
    const canonicalRoom = (initialRoomId || getCanonicalRoomId(currentUserId || 'caller', partnerId))
      .toLowerCase()
      .replace(/[^a-z0-9_-]/g, '-')
      .slice(0, 50);

    roomIdRef.current = canonicalRoom;

    // 1. If Callee: silence all incoming ringtones immediately
    if (initialRole === 'callee') {
      callRingtone.stopAll();
    } else {
      // 2. If Caller: start luxury outgoing ringback tone and initiate room invite
      stopRingbackRef.current = callRingtone.startOutgoingRingback();

      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: 'initiate_call',
          roomId: canonicalRoom,
          callerId: currentUserId || 'caller',
          callerName: currentUserName || 'Exclusive Member',
          callerPhoto: currentUserPhoto,
          calleeId: partnerId,
          calleeName: partnerName,
          callMode: callMode
        })
      }).catch(() => {});
    }

    // 3. Provision / Join Metered Cloud Room API
    fetch('/api/metered/room', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ roomId: canonicalRoom })
    })
      .then(res => res.json())
      .then(data => {
        const url = data.url || `https://kissmycheek.metered.live/${canonicalRoom}`;
        const autoJoinUrl = `${url}?name=${encodeURIComponent(currentUserName)}&autoJoin=true&video=${callMode === 'video'}&audio=true`;
        setRoomUrl(autoJoinUrl);
        setIsRoomLoading(false);
        setCallConnected(true);

        // Stop ringback tone as soon as room is active
        callRingtone.stopAll();
        if (stopRingbackRef.current) {
          stopRingbackRef.current();
          stopRingbackRef.current = null;
        }
      })
      .catch(() => {
        const fallbackUrl = `https://kissmycheek.metered.live/${canonicalRoom}?name=${encodeURIComponent(currentUserName)}&autoJoin=true&video=${callMode === 'video'}&audio=true`;
        setRoomUrl(fallbackUrl);
        setIsRoomLoading(false);
        setCallConnected(true);

        callRingtone.stopAll();
        if (stopRingbackRef.current) {
          stopRingbackRef.current();
          stopRingbackRef.current = null;
        }
      });

    // 4. Polling for remote call state (ended / declined)
    pollTimerRef.current = setInterval(async () => {
      try {
        const pollRes = await fetch(`/api/call?roomId=${encodeURIComponent(canonicalRoom)}`);
        if (!pollRes.ok) return;
        const pollData = await pollRes.json();

        const remoteEnded =
          pollData.inviteStatus === 'DECLINED' ||
          pollData.inviteStatus === 'CANCELLED' ||
          pollData.inviteStatus === 'ENDED' ||
          pollData.status === 'ENDED' ||
          pollData.roomStatus === 'cancelled';

        if (remoteEnded) {
          handleEndCall({ remote: true });
        }
      } catch {}
    }, 1500);

    return () => {
      callRingtone.stopAll();
      if (stopRingbackRef.current) {
        stopRingbackRef.current();
        stopRingbackRef.current = null;
      }
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    };
  }, [partnerId, initialRoomId]);

  // End Call Handler
  const handleEndCall = (opts?: { remote?: boolean }) => {
    if (endedRef.current) return;
    endedRef.current = true;

    callRingtone.stopAll();
    if (stopRingbackRef.current) {
      stopRingbackRef.current();
      stopRingbackRef.current = null;
    }
    callRingtone.playCallEndTone();

    if (pollTimerRef.current) clearInterval(pollTimerRef.current);

    const activeRoomId = roomIdRef.current;
    if (activeRoomId && !opts?.remote) {
      fetch('/api/call', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        keepalive: true,
        body: JSON.stringify({
          action: 'end_call',
          roomId: activeRoomId,
          peerId: currentUserId
        })
      }).catch(() => {});
    }

    const durationStr = formatDuration(secondsElapsedRef.current);
    if (onEndCall) {
      onEndCall(durationStr);
    }
  };

  const spawnReaction = (emoji: string) => {
    const id = `rx_${Date.now()}_${Math.random()}`;
    const x = 15 + Math.random() * 70;
    setFloatingReactions(prev => [...prev, { id, emoji, x }]);
    setTimeout(() => {
      setFloatingReactions(prev => prev.filter(r => r.id !== id));
    }, 3000);
  };

  const handleStageTap = (e: React.MouseEvent | React.TouchEvent) => {
    const now = Date.now();
    if (now - lastTapRef.current < 350) {
      const clientX = 'touches' in e && e.touches[0] ? e.touches[0].clientX : (e as React.MouseEvent).clientX;
      const clientY = 'touches' in e && e.touches[0] ? e.touches[0].clientY : (e as React.MouseEvent).clientY;
      const id = `hb_${Date.now()}_${Math.random()}`;
      setHeartBursts(prev => [...prev, { id, x: clientX || window.innerWidth / 2, y: clientY || window.innerHeight / 2 }]);
      spawnReaction('❤️');
      setTimeout(() => {
        setHeartBursts(prev => prev.filter(h => h.id !== id));
      }, 1400);
    }
    lastTapRef.current = now;
  };

  const initials = (profile.name || 'Member')
    .split(' ')
    .map(n => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  return (
    <div 
      onClick={handleStageTap}
      className="fixed inset-0 z-[999999] h-[100dvh] w-full bg-[#050507] text-[#F4F4F6] relative overflow-hidden flex flex-col justify-between pt-12 pb-14 sm:pt-6 sm:pb-6 px-3.5 sm:px-6 select-none font-sans"
      style={{
        paddingTop: 'max(env(safe-area-inset-top), 2.75rem)',
        paddingBottom: 'max(env(safe-area-inset-bottom), 3.25rem)'
      }}
    >
      {/* FLOATING REAL-TIME REACTIONS PARTICLES */}
      <div className="absolute inset-0 pointer-events-none z-40 overflow-hidden">
        <AnimatePresence>
          {floatingReactions.map(rx => (
            <motion.div
              key={rx.id}
              initial={{ opacity: 0, y: 30, scale: 0.5 }}
              animate={{
                opacity: [0, 1, 1, 0],
                y: -650,
                scale: [0.5, 1.4, 1.2, 0.9],
                rotate: [0, -12, 12, -8, 0]
              }}
              exit={{ opacity: 0 }}
              transition={{ duration: 2.8, ease: "easeOut" }}
              style={{ left: `${rx.x}%` }}
              className="absolute bottom-28 text-4xl sm:text-5xl filter drop-shadow-[0_0_20px_rgba(212,175,55,0.9)]"
            >
              {rx.emoji}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Interactive Double-Tap Heart Burst */}
      <AnimatePresence>
        {heartBursts.map(h => (
          <motion.div
            key={h.id}
            initial={{ opacity: 0, scale: 0.3 }}
            animate={{ opacity: [0, 1, 1, 0], scale: [0.3, 2, 2.3, 2], y: -120 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.2, ease: 'easeOut' }}
            style={{ left: h.x - 30, top: h.y - 30 }}
            className="fixed z-50 pointer-events-none text-5xl filter drop-shadow-[0_0_25px_rgba(255,50,100,0.9)]"
          >
            ❤️
          </motion.div>
        ))}
      </AnimatePresence>

      {/* 1. TOP LUXURY VIP HEADER */}
      <div className="relative z-30 flex items-center justify-between gap-3 bg-black/75 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-[#D4AF37]/35 shadow-[0_8px_32px_rgba(0,0,0,0.8)]">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full border-2 border-[#D4AF37] p-0.5 bg-black shadow-[0_0_15px_rgba(212,175,55,0.4)] overflow-hidden">
              {profile.photos?.[0] ? (
                <img src={profile.photos[0]} alt={profile.name} className="w-full h-full object-cover rounded-full" />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-[#111116] font-serif font-bold text-lg text-[#D4AF37]">
                  {initials}
                </div>
              )}
            </div>
            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-black flex items-center justify-center">
              <ShieldCheck className="w-3 h-3 text-black" />
            </div>
          </div>

          <div className="min-w-0 flex flex-col">
            <div className="flex items-center gap-1.5">
              <h2 className="font-serif text-base sm:text-lg font-bold text-white truncate">{profile.name}</h2>
              <Crown className="w-4 h-4 text-[#D4AF37] shrink-0" />
            </div>
            <div className="flex items-center gap-2 text-xs text-neutral-300">
              <span className="flex items-center gap-1 text-emerald-400 font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                {formatDuration(secondsElapsed)}
              </span>
              <span>•</span>
              <span className="truncate text-neutral-400">{profile.occupation || 'Verified Member'}</span>
            </div>
          </div>
        </div>

        {/* Quick Top End Call & Room Action */}
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (roomUrl) {
                navigator.clipboard.writeText(roomUrl).catch(() => {});
                setCopiedLink(true);
                setTimeout(() => setCopiedLink(false), 2000);
              }
            }}
            className="p-2.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 text-[#D4AF37] transition-all border border-[#D4AF37]/30"
            title="Copy Encrypted Room Link"
          >
            {copiedLink ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={(e) => {
              e.stopPropagation();
              handleEndCall();
            }}
            className="px-4 py-2 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center gap-1.5 shadow-lg font-bold text-xs transition-all border border-rose-400/40"
            title="End Call"
          >
            <PhoneOff className="w-4 h-4" />
            <span className="hidden sm:inline">End Call</span>
          </button>
        </div>
      </div>

      {/* 2. MAIN CENTER STAGE: METEDED CLOUD HD VIDEO & VOICE ROOM */}
      <div className="relative z-10 flex-1 my-3 sm:my-4 rounded-3xl border-2 border-[#D4AF37]/40 shadow-[0_0_50px_rgba(0,0,0,0.9)] overflow-hidden bg-black flex items-center justify-center">
        {isRoomLoading ? (
          <div className="flex flex-col items-center justify-center p-6 text-center">
            <div className="w-16 h-16 rounded-full border-3 border-[#D4AF37] border-t-transparent animate-spin mb-4" />
            <Crown className="w-8 h-8 text-[#D4AF37] animate-pulse mb-2" />
            <h3 className="font-serif text-xl text-white font-bold tracking-wider mb-1">Connecting Encrypted Date</h3>
            <p className="text-xs text-neutral-400">Activating HD Audio & Video Transmission...</p>
          </div>
        ) : (
          <iframe
            src={roomUrl}
            allow="camera *; microphone *; display-capture *; autoplay *; clipboard-write *; fullscreen *"
            className="w-full h-full border-0 rounded-3xl"
            title="Kiss My Cheek VIP Encrypted Date"
          />
        )}
      </div>

      {/* 3. BOTTOM FLOATING LUXURY CONTROLS */}
      <div className="relative z-30 flex items-center justify-between gap-3 bg-black/80 backdrop-blur-xl p-3 sm:p-4 rounded-3xl border border-[#D4AF37]/35 shadow-[0_8px_32px_rgba(0,0,0,0.9)]">
        {/* Send Luxury Gift */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            setModalTab('gifting');
            setModalOpen(true);
          }}
          className="flex items-center gap-2 px-4 py-2.5 rounded-full gold-gradient-bg text-black font-bold text-xs sm:text-sm hover:scale-105 active:scale-95 transition-all shadow-[0_0_20px_rgba(212,175,55,0.4)]"
        >
          <Gift className="w-4 h-4" />
          <span>Send VIP Gift</span>
        </button>

        {/* Floating Quick Reaction Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2">
          {['❤️', '🥂', '👑', '🔥', '✨'].map((emoji) => (
            <button
              key={emoji}
              onClick={(e) => {
                e.stopPropagation();
                spawnReaction(emoji);
              }}
              className="w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-white/10 hover:bg-white/20 active:scale-125 transition-all flex items-center justify-center text-lg sm:text-xl border border-white/10"
              title={`Send ${emoji}`}
            >
              {emoji}
            </button>
          ))}
        </div>

        {/* End Call Button */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            handleEndCall();
          }}
          className="w-11 h-11 sm:w-12 sm:h-12 rounded-full bg-rose-600 hover:bg-rose-700 active:scale-95 text-white flex items-center justify-center shadow-[0_0_25px_rgba(225,29,72,0.6)] transition-all border border-rose-400/40"
          title="End Call"
        >
          <PhoneOff className="w-5 h-5 sm:w-6 sm:h-6" />
        </button>
      </div>

      {/* Bespoke 3D Gift Animation Overlay */}
      <AnimatePresence>
        {activeGiftEffect && (
          <motion.div
            initial={{ opacity: 0, scale: 0.5, y: 50 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: -50 }}
            className="fixed inset-0 z-50 pointer-events-none flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm"
          >
            <motion.div
              animate={{ rotate: [0, -10, 10, -5, 5, 0], scale: [1, 1.2, 1] }}
              transition={{ duration: 1.5, repeat: Infinity }}
              className="w-32 h-32 rounded-3xl gold-gradient-bg p-1 shadow-[0_0_80px_rgba(212,175,55,0.8)] flex items-center justify-center mb-4 text-6xl"
            >
              <span>{activeGiftEffect.gift.icon}</span>
            </motion.div>
            <h2 className="font-serif text-3xl font-bold text-[#E5C378] tracking-wide mb-1">
              {activeGiftEffect.gift.name}
            </h2>
            <p className="text-sm font-semibold text-white/90">{activeGiftEffect.reaction}</p>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Luxury VIP Gifting Modal */}
      <CreditsAndGiftingModal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        defaultTab={modalTab}
        recipientName={profile.name}
        threadId={partnerId}
        onGiftSent={(gift) => {
          setActiveGiftEffect({ gift, reaction: gift.reactionText || 'Sent with love' });
          spawnReaction('👑');
          setTimeout(() => setActiveGiftEffect(null), 4000);
        }}
      />
    </div>
  );
}
