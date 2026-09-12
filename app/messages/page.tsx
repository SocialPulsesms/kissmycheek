'use client';

import React, { useState, useEffect, useRef, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  Send, 
  Paperclip, 
  Mic, 
  Phone, 
  Video, 
  MoreVertical, 
  Smile, 
  CheckCheck,
  Play,
  Pause,
  Volume2,
  Image as ImageIcon,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Sparkles,
  CheckCircle2,
  X,
  UserCheck,
  Gift,
  Coins,
  ChevronDown,
  Crown,
  RotateCcw,
  Heart,
  Flame,
  ThumbsUp,
  SmilePlus,
  Maximize2,
  Upload,
  Plus,
  ArrowLeft,
  PhoneCall,
  History,
  Clock
} from 'lucide-react';
import { startInAppCall } from '@/components/call/GlobalCallManager';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { ConversationThread, ChatMessage, MessageReaction } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { BespokeGift } from '@/lib/creditsStore';
import { CallHistoryItem } from '@/lib/callHistoryStore';

// Initialized conversations starting empty for live platform
const INITIAL_CONVERSATIONS: ConversationThread[] = [];

// Luxury animated & emoji stickers catalog
export interface LuxurySticker {
  id: string;
  code: string;
  label: string;
  sub: string;
  category: 'royalty' | 'seductive' | 'cheeky' | 'exciting';
  accentGradient: string;
}

export const LUXURY_STICKERS: LuxurySticker[] = [
  // 1. Royalty, VIP & High Roller
  { id: 'st-crown', code: '👑', label: 'Royalty Patron', sub: 'Crown VIP Status', category: 'royalty', accentGradient: 'from-amber-400 to-yellow-600' },
  { id: 'st-diamond', code: '💎', label: 'Flawless Karat', sub: 'Billionaire Tier', category: 'royalty', accentGradient: 'from-cyan-400 to-blue-600' },
  { id: 'st-champagne', code: '🥂', label: 'Crystal Toast', sub: 'Vintage Champagne', category: 'royalty', accentGradient: 'from-amber-300 to-amber-600' },
  { id: 'st-bottle', code: '🍾', label: 'Dom Pérignon', sub: 'VIP Bottle Service', category: 'royalty', accentGradient: 'from-emerald-400 to-amber-500' },
  { id: 'st-yacht', code: '🛥️', label: 'Sunset Charter', sub: 'Monaco Mega-Yacht', category: 'royalty', accentGradient: 'from-blue-400 to-cyan-500' },
  { id: 'st-jet', code: '✈️', label: 'Private Altitude', sub: 'Gulfstream Jet', category: 'royalty', accentGradient: 'from-slate-300 to-sky-500' },
  { id: 'st-car', code: '🏎️', label: 'Supercar Drive', sub: 'Midnight Ferrari', category: 'royalty', accentGradient: 'from-red-500 to-rose-700' },
  { id: 'st-penthouse', code: '🏰', label: 'Penthouse Key', sub: 'Presidential Suite', category: 'royalty', accentGradient: 'from-amber-400 to-amber-700' },
  { id: 'st-amex', code: '💳', label: 'Black Centurion', sub: 'Limitless Access', category: 'royalty', accentGradient: 'from-zinc-400 to-black' },
  { id: 'st-ring', code: '💍', label: 'Solitaire Gem', sub: 'High Elegance', category: 'royalty', accentGradient: 'from-cyan-300 to-indigo-500' },

  // 2. Seductive, Sensual & Heat
  { id: 'st-kiss', code: '💋', label: 'Kiss My Cheek', sub: 'Club Signature Kiss', category: 'seductive', accentGradient: 'from-rose-500 to-red-600' },
  { id: 'st-lipbite', code: '🫦', label: 'Naughty Lip Bite', sub: 'Intense Chemistry', category: 'seductive', accentGradient: 'from-rose-600 to-pink-700' },
  { id: 'st-heartfire', code: '❤️‍🔥', label: 'Burning Passion', sub: 'Uncontrollable Heat', category: 'seductive', accentGradient: 'from-orange-500 to-rose-600' },
  { id: 'st-rose', code: '🌹', label: 'Velvet Rose', sub: 'Red Grand Romance', category: 'seductive', accentGradient: 'from-red-600 to-rose-800' },
  { id: 'st-fire', code: '🔥', label: 'Pure Flame', sub: 'Too Hot to Handle', category: 'seductive', accentGradient: 'from-amber-500 to-red-600' },
  { id: 'st-strawberries', code: '🍓', label: 'Strawberries & Cream', sub: 'Midnight Decadence', category: 'seductive', accentGradient: 'from-rose-400 to-red-500' },
  { id: 'st-cherry', code: '🍒', label: 'Forbidden Cherry', sub: 'Sweet Temptation', category: 'seductive', accentGradient: 'from-red-500 to-rose-700' },
  { id: 'st-candle', code: '🕯️', label: 'Candlelight Secret', sub: 'Private Whispers', category: 'seductive', accentGradient: 'from-amber-300 to-orange-500' },
  { id: 'st-stiletto', code: '👠', label: 'Red Carpet Stiletto', sub: 'Dangerous Curves', category: 'seductive', accentGradient: 'from-rose-500 to-red-700' },
  { id: 'st-jacuzzi', code: '🛁', label: 'Champagne Jacuzzi', sub: 'Bubbles & Silk', category: 'seductive', accentGradient: 'from-sky-400 to-indigo-600' },

  // 3. Awkward, Shy, Cheeky & Playful
  { id: 'st-peeking', code: '🫣', label: 'Caught You Looking', sub: "Can't Look Away", category: 'cheeky', accentGradient: 'from-pink-400 to-rose-500' },
  { id: 'st-blush', code: '😳', label: 'Made Me Blush', sub: 'Heart Skipping Beats', category: 'cheeky', accentGradient: 'from-rose-300 to-pink-500' },
  { id: 'st-grimace', code: '😬', label: 'Did I Say That?', sub: 'Awkward But Cute', category: 'cheeky', accentGradient: 'from-yellow-400 to-amber-600' },
  { id: 'st-melting', code: '🫠', label: 'Completely Melting', sub: "You're Too Charming", category: 'cheeky', accentGradient: 'from-amber-300 to-yellow-500' },
  { id: 'st-smirk', code: '😏', label: 'Smooth Operator', sub: 'I Know Your Game', category: 'cheeky', accentGradient: 'from-purple-400 to-indigo-600' },
  { id: 'st-shy', code: '🙈', label: "Don't Make Me Shy", sub: 'Covering My Eyes', category: 'cheeky', accentGradient: 'from-pink-400 to-rose-400' },
  { id: 'st-secret', code: '🤫', label: 'Keep It Secret', sub: 'Strictly Confidential', category: 'cheeky', accentGradient: 'from-indigo-400 to-purple-600' },
  { id: 'st-pleading', code: '🥺', label: 'Pretty Please?', sub: 'Puppy Dog Eyes', category: 'cheeky', accentGradient: 'from-blue-300 to-cyan-400' },
  { id: 'st-wink', code: '😜', label: 'Winking Mischief', sub: 'Pure Trouble', category: 'cheeky', accentGradient: 'from-amber-400 to-orange-500' },
  { id: 'st-sweat', code: '😅', label: 'Nervously Smiling', sub: 'Butterflies Inside', category: 'cheeky', accentGradient: 'from-teal-300 to-blue-400' },

  // 4. Exciting, Sparks & Celebration
  { id: 'st-sparks', code: '⚡', label: 'Instant Sparks', sub: 'Dangerous Chemistry', category: 'exciting', accentGradient: 'from-yellow-300 to-amber-500' },
  { id: 'st-martini', code: '🍸', label: 'Espresso Martini', sub: 'Shaken, Not Stirred', category: 'exciting', accentGradient: 'from-emerald-400 to-teal-600' },
  { id: 'st-match', code: '🎯', label: 'Bullseye Match', sub: 'Exactly My Type', category: 'exciting', accentGradient: 'from-red-500 to-orange-500' },
  { id: 'st-bombshell', code: '💣', label: 'Total Bombshell', sub: 'Stunning Arrival', category: 'exciting', accentGradient: 'from-zinc-400 to-rose-600' },
  { id: 'st-fireworks', code: '🎆', label: 'Fireworks Night', sub: 'Pure Exhilaration', category: 'exciting', accentGradient: 'from-fuchsia-500 to-indigo-500' },
  { id: 'st-dance', code: '💃', label: 'Dance Floor VIP', sub: 'All Eyes On Us', category: 'exciting', accentGradient: 'from-rose-500 to-amber-500' },
  { id: 'st-sparkles', code: '✨', label: 'Golden Dust', sub: 'Enchanting Magic', category: 'exciting', accentGradient: 'from-amber-300 to-yellow-400' },
  { id: 'st-masquerade', code: '🎭', label: 'Venetian Ball', sub: 'Intrigue & Mystery', category: 'exciting', accentGradient: 'from-purple-500 to-amber-500' }
];

// Rich Curated Emojis across Smiling, Awkward, Romance, and Exciting
export interface EmojiCategory {
  id: 'smiling' | 'awkward' | 'romance' | 'exciting';
  label: string;
  icon: string;
  emojis: { char: string; name: string }[];
}

export const EMOJI_CATALOG: EmojiCategory[] = [
  {
    id: 'smiling',
    label: 'Smiling & Sweet',
    icon: '😊',
    emojis: [
      { char: '😊', name: 'Warm Smile' },
      { char: '🥰', name: 'In Love' },
      { char: '😍', name: 'Heart Eyes' },
      { char: '😘', name: 'Blowing Kiss' },
      { char: '😋', name: 'Playful Yummy' },
      { char: '😜', name: 'Wink Tongue' },
      { char: '🤪', name: 'Wild & Fun' },
      { char: '🤩', name: 'Starstruck' },
      { char: '😁', name: 'Beaming Grin' },
      { char: '😏', name: 'Flirty Smirk' },
      { char: '😇', name: 'Angelic Halo' },
      { char: '🤗', name: 'Warm Hug' },
      { char: '🤤', name: 'Drooling Gorgeous' },
      { char: '🤭', name: 'Giggle Hand Over Mouth' },
      { char: '😄', name: 'Joyful Laugh' },
      { char: '✨', name: 'Golden Sparkles' }
    ]
  },
  {
    id: 'awkward',
    label: 'Awkward & Cheeky',
    icon: '😬',
    emojis: [
      { char: '😬', name: 'Grimacing Awkward' },
      { char: '🫣', name: 'Peeking Through Fingers' },
      { char: '😳', name: 'Flushed Red Blush' },
      { char: '😅', name: 'Nervous Sweat Smile' },
      { char: '🫠', name: 'Melting From Charm' },
      { char: '🙈', name: 'See No Evil Shy' },
      { char: '😶', name: 'Speechless' },
      { char: '🥴', name: 'Woozy Smitten' },
      { char: '🤐', name: 'Zipped Lips Sealed' },
      { char: '🤫', name: 'Shh Quiet Secret' },
      { char: '🥺', name: 'Pleading Puppy Eyes' },
      { char: '🙃', name: 'Upside Down Silly' },
      { char: '🤦', name: 'Playful Facepalm' },
      { char: '😵‍💫', name: 'Dizzily Smitten' },
      { char: '👀', name: 'Curious Side Eye' },
      { char: '💅', name: 'Sassy Polished Nails' }
    ]
  },
  {
    id: 'romance',
    label: 'Romance & Seduction',
    icon: '🫦',
    emojis: [
      { char: '🫦', name: 'Biting Lip' },
      { char: '💋', name: 'Club Kiss' },
      { char: '❤️‍🔥', name: 'Heart On Fire' },
      { char: '💖', name: 'Sparkling Heart' },
      { char: '💘', name: 'Cupid Arrow' },
      { char: '🌹', name: 'Scarlet Rose' },
      { char: '🍷', name: 'Fine Red Wine' },
      { char: '🥂', name: 'Champagne Toast' },
      { char: '🍓', name: 'Sweet Strawberry' },
      { char: '🍒', name: 'Twin Cherries' },
      { char: '🕯️', name: 'Romantic Candle' },
      { char: '💌', name: 'Love Note' },
      { char: '💍', name: 'Diamond Ring' },
      { char: '💕', name: 'Two Beating Hearts' },
      { char: '🛁', name: 'Warm Bubble Bath' },
      { char: '👠', name: 'High Fashion Stiletto' }
    ]
  },
  {
    id: 'exciting',
    label: 'Exciting & Luxury',
    icon: '🔥',
    emojis: [
      { char: '🔥', name: 'Blazing Fire' },
      { char: '👑', name: 'Gold Crown' },
      { char: '💎', name: 'Flawless Karat' },
      { char: '🍾', name: 'Popping Champagne' },
      { char: '🛥️', name: 'Superyacht Charter' },
      { char: '✈️', name: 'Private Jet Flight' },
      { char: '🏎️', name: 'Sports Car' },
      { char: '💃', name: 'Dancing in Red' },
      { char: '🕶️', name: 'Designer Shades' },
      { char: '⚡', name: 'High Voltage Spark' },
      { char: '🎆', name: 'Midnight Fireworks' },
      { char: '💸', name: 'Flying Wealth' },
      { char: '🍸', name: 'Classic Cocktail' },
      { char: '🏰', name: 'Penthouse Castle' },
      { char: '🎉', name: 'Celebration Confetti' },
      { char: '🌟', name: 'Superstar Glow' }
    ]
  }
];

// Curated Luxury Image Presets
const QUICK_IMAGE_VAULT = [
  {
    id: 'vault-1',
    title: 'Candlelight Dinner',
    url: 'https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?auto=format&fit=crop&w=800&q=80',
    caption: 'Reserved a quiet table for two tonight ✨'
  },
  {
    id: 'vault-2',
    title: 'Private Yacht Sunset',
    url: 'https://images.unsplash.com/photo-1544551763-46a013bb70d5?auto=format&fit=crop&w=800&q=80',
    caption: 'Evening ocean breeze on deck 🛥️🌅'
  },
  {
    id: 'vault-3',
    title: 'Masquerade Gala Attire',
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=800&q=80',
    caption: 'All dressed up for the grand ball tonight 🌹'
  },
  {
    id: 'vault-4',
    title: 'Rooftop Lounge Skyline',
    url: 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=800&q=80',
    caption: 'Champagne with an unforgettable city view 🥂'
  }
];

// Floating quick reactions bar on message bubbles (smiling, awkward, romance, exciting)
const EMOJI_REACTIONS = [
  '❤️', '🔥', '😂', '😍', '🥂', '👍',
  '😬', '🫣', '😳', '💋', '😏', '✨', '🫠', '🫦'
];

const MOCK_NAMES = [
  'Sophia Nwachukwu',
  'Alexander Okonkwo',
  'Lady Victoria',
  'Zainab Al-Mansoor',
  'Kelechi Eze',
  'Elena Rostova',
  'Aria Chen',
  'Sophia Sterling',
  'Alexander Wright',
  'Chidera Anya',
  'Adaeze Nwosu'
];

const MOCK_SNIPPETS = [
  'contemporary sculpture',
  'gallery opening',
  'piano acoustics',
  'Art Basel',
  'architectural renovation',
  'sunset cruise in Monaco',
  'performance rehearsal'
];

const sanitizeMessage = (m: any): ChatMessage => {
  if (!m) return m;
  const content = String(m.content || '');
  const isActualCall = m.mediaType === 'call_log' || 
    content.startsWith('📞') || 
    content.startsWith('📹') || 
    content.toLowerCase().includes('call ended') || 
    content.toLowerCase().includes('video date ended');

  if (!isActualCall && (m.callType || m.mediaType === 'call_log')) {
    const copy = { ...m };
    delete copy.callType;
    delete copy.callDuration;
    delete copy.callStatus;
    if (copy.mediaType === 'call_log') delete copy.mediaType;
    return copy;
  }
  return m;
};

const isRealConversation = (t: any): boolean => {
  if (!t || !t.participant) return false;
  const threadId = String(t.id || '');
  if (threadId.startsWith('conv-') || threadId.startsWith('mock-')) return false;
  return true;
};

const getParticipantPhoto = (participant?: any): string => {
  if (!participant) return '';
  if (participant.photos && Array.isArray(participant.photos) && participant.photos.length > 0 && participant.photos[0]) {
    const p = participant.photos[0];
    if (p && !p.includes('unsplash.com') && p !== '/crown-gold.png') return p;
    if (p) return p;
  }
  if (participant.avatar) return participant.avatar;
  if (participant.photo) return participant.photo;
  if (participant.image) return participant.image;
  return '';
};

function MessagesContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const recipientParam = searchParams.get('recipient') || searchParams.get('user') || searchParams.get('id');
  const nameParam = searchParams.get('name');
  const photoParam = searchParams.get('photo');

  const [currentUserPhoto, setCurrentUserPhoto] = useState<string>('');
  const [isInitiatingCall, setIsInitiatingCall] = useState(false);

  const handleStartCall = (mode: 'voice' | 'video') => {
    if (!activeConv?.participant) return;
    const participant = activeConv.participant;
    const targetRoomId = `call_${[currentUserId || 'caller', participant.id].sort().join('__')}`;
    
    // Reliably resolve current user name from all storage sources
    let resolvedCallerName = currentUserName || 'Exclusive Member';
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.customName || parsed.fullName || parsed.name) {
          resolvedCallerName = parsed.customName || parsed.fullName || parsed.name;
        }
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession && (!resolvedCallerName || resolvedCallerName === 'Exclusive Member')) {
        const parsed = JSON.parse(savedSession);
        if (parsed.customName || parsed.fullName || parsed.name) {
          resolvedCallerName = parsed.customName || parsed.fullName || parsed.name;
        }
      }
    } catch {}

    // 1. Instant 0ms In-App Call
    startInAppCall({
      partnerId: participant.id,
      partnerName: participant.name,
      partnerPhoto: getParticipantPhoto(participant) || participant.photos?.[0] || (participant as any).avatar || (participant as any).photo || '',
      partnerOccupation: participant.occupation || 'Member',
      partnerLocation: participant.location || 'London',
      mode,
      roomId: targetRoomId,
      role: 'caller'
    });

    // 2. Broadcast Call Invitation non-blockingly in background
    fetch('/api/call', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: true,
      body: JSON.stringify({
        action: 'initiate_call',
        roomId: targetRoomId,
        callerId: currentUserId || 'caller',
        callerName: resolvedCallerName || 'Exclusive Member',
        callerPhoto: currentUserPhoto,
        calleeId: participant.id,
        calleeName: participant.name,
        calleeEmail: (participant as any).email || '',
        callMode: mode
      })
    }).catch(() => {});
  };

  const [conversations, setConversations] = useState<ConversationThread[]>(() => {
    if (typeof window === 'undefined') return INITIAL_CONVERSATIONS;
    try {
      const savedThreads = localStorage.getItem('kmc_persistent_chat_v2');
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.filter(isRealConversation).map(t => ({
            ...t,
            messages: Array.isArray(t.messages) ? t.messages.map(sanitizeMessage) : []
          }));
        }
      }
    } catch {}
    return INITIAL_CONVERSATIONS;
  });

  const [activeConvId, setActiveConvId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const savedActiveId = localStorage.getItem('kmc_active_conv_id');
      if (savedActiveId && !savedActiveId.startsWith('conv-') && !savedActiveId.startsWith('mock-')) {
        return savedActiveId;
      }
    } catch {}
    return '';
  });
  const activeConvIdRef = useRef<string>('');
  activeConvIdRef.current = activeConvId;
  const lastProcessedRecipientRef = useRef<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 1-on-1 Call Logs between two users modal/drawer state
  const [isUserCallLogsOpen, setIsUserCallLogsOpen] = useState(false);
  const [userCallHistory, setUserCallHistory] = useState<CallHistoryItem[]>([]);
  const [isLoadingUserCalls, setIsLoadingUserCalls] = useState(false);
  
  const [currentUserId, setCurrentUserId] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.id) return p.id;
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession) {
        const p = JSON.parse(savedSession);
        if (p.userId || p.id) return p.userId || p.id;
      }
    } catch {}
    return '';
  });

  const [currentUserEmail, setCurrentUserEmail] = useState<string>(() => {
    if (typeof window === 'undefined') return '';
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const p = JSON.parse(savedProfile);
        if (p.email) return p.email;
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession) {
        const p = JSON.parse(savedSession);
        if (p.email) return p.email;
      }
    } catch {}
    return '';
  });
  const [sidebarTab, setSidebarTab] = useState<'messages' | 'calls'>('messages');
  const [callHistory, setCallHistory] = useState<CallHistoryItem[]>([]);
  const [messageInput, setMessageInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [audioProgress, setAudioProgress] = useState(0);

  // New Chat modal state
  const [isNewChatOpen, setIsNewChatOpen] = useState(false);
  const [directoryMembers, setDirectoryMembers] = useState<any[]>([]);
  const [isLoadingDirectory, setIsLoadingDirectory] = useState(false);
  const [directorySearch, setDirectorySearch] = useState('');

  // Sticker, Image, Lightbox & Reaction drawers
  const [isStickerDrawerOpen, setIsStickerDrawerOpen] = useState(false);
  const [drawerTab, setDrawerTab] = useState<'stickers' | 'emojis'>('stickers');
  const [stickerCategory, setStickerCategory] = useState<'all' | 'royalty' | 'seductive' | 'cheeky' | 'exciting'>('all');
  const [emojiCategory, setEmojiCategory] = useState<'all' | 'smiling' | 'awkward' | 'romance' | 'exciting'>('all');
  const [isImageVaultOpen, setIsImageVaultOpen] = useState(false);
  const [activeLightboxImage, setActiveLightboxImage] = useState<string | null>(null);
  const [reactionMenuMessageId, setReactionMenuMessageId] = useState<string | null>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Member Wallet, Tier, Verification & Gifting modal state
  const [currentUserName, setCurrentUserName] = useState<string>('Exclusive Member');
  const [memberCredits, setMemberCredits] = useState<number>(180);
  const [userTier, setUserTier] = useState<'STANDARD' | 'ELITE'>('STANDARD');
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [modalOpen, setModalOpen] = useState<boolean>(false);
  const [modalTab, setModalTab] = useState<'gifting' | 'topup' | 'elite'>('gifting');

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setMemberCredits(data.wallet.credits);
          if (data.wallet.tier) {
            setUserTier(data.wallet.tier);
          }
          if (data.wallet.isVerified !== undefined) {
            setIsVerified(data.wallet.isVerified);
          }
        }
      }
    } catch {}
  };

  const fetchCallHistory = async () => {
    try {
      const res = await fetch('/api/call-history');
      if (res.ok) {
        const data = await res.json();
        if (data.callHistory && Array.isArray(data.callHistory)) {
          setCallHistory(data.callHistory);
          try {
            localStorage.setItem('kmc_call_history_v1', JSON.stringify(data.callHistory));
          } catch {}
        }
      }
    } catch {}
  };

  const fetchUserCallLogs = async (partnerId: string) => {
    if (!partnerId) return;
    setIsLoadingUserCalls(true);
    try {
      const res = await fetch(`/api/call-history?withUser=${encodeURIComponent(partnerId)}&user1Id=${encodeURIComponent(currentUserId || '')}`);
      if (res.ok) {
        const data = await res.json();
        if (data.callHistory && Array.isArray(data.callHistory)) {
          setUserCallHistory(data.callHistory);
        }
      }
    } catch {} finally {
      setIsLoadingUserCalls(false);
    }
  };

  const handleQuickVerify = async () => {
    setIsVerifying(true);
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'set_verification', isVerified: true })
      });
      if (res.ok) {
        setTimeout(() => {
          setIsVerified(true);
          setIsVerifying(false);
        }, 600);
        return;
      }
    } catch (err) {}
    setTimeout(() => {
      setIsVerified(true);
      setIsVerifying(false);
    }, 600);
  };

  const fetchConversations = async (targetActiveId?: string) => {
    try {
      const activeIdToUse = targetActiveId !== undefined ? targetActiveId : activeConvIdRef.current;
      const url = activeIdToUse 
        ? `/api/messages?activeThreadId=${encodeURIComponent(activeIdToUse)}` 
        : '/api/messages';
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.currentUserId && data.currentUserId !== 'user-me') {
          setCurrentUserId(data.currentUserId);
        }
        if (data.conversations && Array.isArray(data.conversations)) {
          const incomingRealThreads = data.conversations.filter(isRealConversation);
          
          setConversations(prev => {
            const threadMap = new Map<string, ConversationThread>();

            // 1. Preserve ALL current active chats in the chat line permanently
            prev.forEach(t => {
              if (t && t.id) threadMap.set(t.id, t);
            });

            // 2. Intelligently merge incoming threads from backend
            incomingRealThreads.forEach((incomingThread: ConversationThread) => {
              if (!incomingThread || !incomingThread.id) return;
              const existingThread = threadMap.get(incomingThread.id);
              const currentActive = activeConvIdRef.current;
              const isActive = currentActive && (incomingThread.id === currentActive || incomingThread.id.includes(currentActive));

              if (!existingThread) {
                const hasUnread = (incomingThread.messages || []).some(m => !isMessageMe(m) && !m.read);
                threadMap.set(incomingThread.id, {
                  ...incomingThread,
                  unreadCount: isActive ? 0 : (hasUnread ? incomingThread.unreadCount : 0)
                });
              } else {
                const msgMap = new Map<string, ChatMessage>();
                existingThread.messages.forEach(m => msgMap.set(m.id, m));

                incomingThread.messages.forEach((rawIncMsg: any) => {
                  const incMsg = sanitizeMessage(rawIncMsg);
                  // Find existing message by id or matching content + timestamp
                  const existingKey = Array.from(msgMap.keys()).find(k => {
                    const m = msgMap.get(k);
                    return m?.id === incMsg.id || (m?.content === incMsg.content && m?.timestamp === incMsg.timestamp);
                  });

                  if (existingKey) {
                    const existingMsg = msgMap.get(existingKey)!;
                    const reactions = (incMsg.reactions && incMsg.reactions.length > 0)
                      ? incMsg.reactions
                      : (existingMsg.reactions || []);
                    // If message was already read locally or currently active, it remains read
                    const isRead = isActive || Boolean(existingMsg.read) || Boolean(incMsg.read);
                    msgMap.set(existingKey, {
                      ...existingMsg,
                      ...incMsg,
                      id: existingMsg.id, // Keep stable key to prevent re-render flipping
                      reactions,
                      read: isRead
                    });
                  } else {
                    msgMap.set(incMsg.id, {
                      ...incMsg,
                      read: isActive ? true : incMsg.read
                    });
                  }
                });

                const allMsgs = Array.from(msgMap.values());
                // Only count unread if there are genuinely unread messages from partner
                const hasUnreadFromPartner = allMsgs.some(m => !isMessageMe(m) && !m.read);
                const computedUnread = isActive ? 0 : (hasUnreadFromPartner ? incomingThread.unreadCount : 0);

                threadMap.set(incomingThread.id, {
                  ...incomingThread,
                  participant: {
                    ...existingThread.participant,
                    ...incomingThread.participant,
                    photos: (incomingThread.participant.photos?.length ? incomingThread.participant.photos : existingThread.participant.photos) || []
                  },
                  unreadCount: computedUnread,
                  messages: allMsgs
                });
              }
            });

            const mergedList = Array.from(threadMap.values());
            if (mergedList.length > 0) {
              try {
                localStorage.setItem('kmc_persistent_chat_v2', JSON.stringify(mergedList));
              } catch {}
            }
            return mergedList;
          });

          // Only auto-select first thread if no thread is active AND no recipient query param exists
          if (!activeConvIdRef.current && !targetActiveId && !recipientParam && incomingRealThreads.length > 0 && typeof window !== 'undefined' && window.innerWidth >= 1024) {
            setActiveConvId(incomingRealThreads[0].id);
            activeConvIdRef.current = incomingRealThreads[0].id;
          }
        }
      }
    } catch {}
  };

  const handleSelectConversation = (convId: string) => {
    setActiveConvId(convId);
    activeConvIdRef.current = convId;

    if (typeof window !== 'undefined') {
      try {
        sessionStorage.setItem('kmc_active_conv_id', convId);
      } catch {}
      if (window.location.search) {
        window.history.replaceState(null, '', '/messages');
      }
    }

    setConversations(prev => {
      const updated = prev.map(c => {
        if (c.id === convId || c.id.includes(convId) || convId.includes(c.id)) {
          return {
            ...c,
            unreadCount: 0,
            messages: c.messages.map(m => (!isMessageMe(m) ? { ...m, read: true } : m))
          };
        }
        return c;
      });
      try {
        localStorage.setItem('kmc_persistent_chat_v2', JSON.stringify(updated));
      } catch {}
      return updated;
    });

    // Dispatch mark_read to backend
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'mark_read',
        threadId: convId,
        senderId: currentUserId
      })
    }).catch(() => {});
  };

  const handleCloseActiveConversation = () => {
    const closingId = activeConvId || activeConvIdRef.current;
    if (closingId) {
      setConversations(prev => {
        const updated = prev.map(c => {
          if (c.id === closingId || c.id.includes(closingId) || closingId.includes(c.id)) {
            return {
              ...c,
              unreadCount: 0,
              messages: c.messages.map(m => (!isMessageMe(m) ? { ...m, read: true } : m))
            };
          }
          return c;
        });
        try {
          localStorage.setItem('kmc_persistent_chat_v2', JSON.stringify(updated));
        } catch {}
        return updated;
      });

      fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'mark_read',
          threadId: closingId,
          senderId: currentUserId
        })
      }).catch(() => {});
    }

    setActiveConvId('');
    activeConvIdRef.current = '';
    try {
      sessionStorage.removeItem('kmc_active_conv_id');
    } catch {}
  };

  useEffect(() => {
    fetchWallet();
    fetchCallHistory();
    fetchConversations();

    // 0. Load authenticated member identity dynamically
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        const nameVal = parsed.customName || parsed.fullName || parsed.name;
        if (nameVal) setCurrentUserName(nameVal);
        if (parsed.id) setCurrentUserId(parsed.id);
      }
      const savedSession = localStorage.getItem('kmc_session');
      if (savedSession) {
        const parsed = JSON.parse(savedSession);
        const nameVal = parsed.customName || parsed.fullName || parsed.name;
        if (nameVal && !savedProfile) setCurrentUserName(nameVal);
        if (parsed.userId || parsed.id) setCurrentUserId(parsed.userId || parsed.id);
      }
    } catch (err) {}

    // 1. Fetch authenticated user from me endpoint
    fetch('/api/auth/me')
      .then(res => res.json())
      .then(data => {
        if (data.user?.id) {
          setCurrentUserId(data.user.id);
          if (data.user.fullName || data.user.name) setCurrentUserName(data.user.fullName || data.user.name);
          if (data.user.email) setCurrentUserEmail(data.user.email);
        }
      })
      .catch(() => {});

    // 2. Clean and purge legacy mock conversations
    try {
      const LEGACY_KEYS = [
        'kmc_persistent_chat',
        'kmc_persistent_chat_v1',
        'kmc_chat_history',
        'kmc_messages',
        'kmc_conversations',
        'kmc_chats'
      ];
      LEGACY_KEYS.forEach(k => {
        try { localStorage.removeItem(k); } catch {}
      });

      const savedThreads = localStorage.getItem('kmc_persistent_chat_v2');
      if (savedThreads) {
        const parsed = JSON.parse(savedThreads);
        if (Array.isArray(parsed)) {
          const realThreads = parsed.filter(isRealConversation).map(t => ({
            ...t,
            messages: Array.isArray(t.messages) ? t.messages.map(sanitizeMessage) : []
          }));
          if (realThreads.length > 0) {
            setConversations(realThreads);
          }
        }
      }
      const savedActiveId = localStorage.getItem('kmc_active_conv_id');
      if (!recipientParam && savedActiveId && !savedActiveId.startsWith('conv-') && !savedActiveId.startsWith('mock-')) {
        setActiveConvId(savedActiveId);
        activeConvIdRef.current = savedActiveId;
      }

      const savedCalls = localStorage.getItem('kmc_call_history_v1');
      if (savedCalls) {
        const parsedCalls = JSON.parse(savedCalls);
        if (Array.isArray(parsedCalls) && parsedCalls.length > 0) {
          const realCalls = parsedCalls.filter((c: any) => !MOCK_NAMES.includes(c.partnerName) && !String(c.partnerId).startsWith('prof-') && !String(c.partnerId).startsWith('profile-'));
          setCallHistory(realCalls);
        }
      }
    } catch (err) {}
  }, []);

  // 2. Real-time Live Polling for End-to-End Chat Synchronization
  useEffect(() => {
    const pollInterval = setInterval(() => {
      fetchConversations();
    }, 3000);
    return () => clearInterval(pollInterval);
  }, []);

  // 3. Persist real conversations to localStorage whenever updated
  useEffect(() => {
    try {
      if (conversations && conversations.length > 0) {
        const realThreads = conversations.filter(isRealConversation);
        if (realThreads.length > 0) {
          localStorage.setItem('kmc_persistent_chat_v2', JSON.stringify(realThreads));
        }
      }
    } catch (err) {}
  }, [conversations]);

  // 4. Persist active conversation ID and mark read
  useEffect(() => {
    try {
      if (activeConvId && !activeConvId.startsWith('conv-') && !activeConvId.startsWith('mock-')) {
        localStorage.setItem('kmc_active_conv_id', activeConvId);
        
        // Auto mark read on active conversation change
        fetch('/api/messages', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            action: 'mark_read',
            threadId: activeConvId,
            senderId: currentUserId
          })
        }).catch(() => {});
      } else {
        localStorage.removeItem('kmc_active_conv_id');
      }
    } catch (err) {}
  }, [activeConvId, currentUserId]);

  // 5. Auto-activate or initialize genuine 1-on-1 chat when navigating with ?recipient= query param
  useEffect(() => {
    if (!recipientParam) return;
    if (lastProcessedRecipientRef.current === recipientParam) return;
    lastProcessedRecipientRef.current = recipientParam;

    if (recipientParam === currentUserId && !nameParam) {
      console.warn('Cannot initiate messaging with oneself.');
      return;
    }

    const decodedName = nameParam ? decodeURIComponent(nameParam) : 'Club Member';
    const decodedPhoto = photoParam ? decodeURIComponent(photoParam) : '';

    // Clean browser URL immediately so polling and subsequent clicks don't snap back
    if (typeof window !== 'undefined' && window.location.search.includes('recipient=')) {
      window.history.replaceState(null, '', '/messages');
    }

    setConversations(prev => {
      const existing = prev.find(c => 
        c.participant?.id === recipientParam || 
        c.id === `th-${recipientParam}` || 
        c.id.includes(recipientParam)
      );

      if (existing) {
        if (decodedName && (!existing.participant.name || existing.participant.name === 'Club Member')) {
          existing.participant.name = decodedName;
        }
        if (decodedPhoto && (!existing.participant.photos || existing.participant.photos.length === 0)) {
          existing.participant.photos = [decodedPhoto];
        }
        setActiveConvId(existing.id);
        activeConvIdRef.current = existing.id;
        return [...prev];
      }

      const canonicalId = `th_${[currentUserId || 'user-me', recipientParam].sort().join('__')}`;

      const newThread: ConversationThread = {
        id: canonicalId,
        participant: {
          id: recipientParam,
          name: decodedName,
          age: 28,
          location: 'Verified Member',
          occupation: 'Member',
          photos: decodedPhoto ? [decodedPhoto] : [],
          interests: [],
          online: true
        },
        lastMessage: 'Conversation initiated',
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        messages: []
      };

      setActiveConvId(canonicalId);
      activeConvIdRef.current = canonicalId;
      return [newThread, ...prev];
    });

    // Notify backend API to register canonical 1-on-1 thread
    fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action: 'start_or_get_thread',
        recipientId: recipientParam,
        senderId: currentUserId,
        participantName: decodedName,
        participantPhoto: decodedPhoto
      })
    })
    .then(res => res.json())
    .then(data => {
      if (data.thread?.id) {
        setActiveConvId(data.thread.id);
        activeConvIdRef.current = data.thread.id;
      }
      if (data.conversations && Array.isArray(data.conversations)) {
        setConversations(data.conversations.filter(isRealConversation));
      }
    })
    .catch(() => {});
  }, [recipientParam, nameParam, photoParam, currentUserId]);

  const chatContainerRef = useRef<HTMLDivElement>(null);
  const [isScrolledUp, setIsScrolledUp] = useState(false);
  const activeConv = conversations.find(c => 
    c.id === activeConvId || 
    c.participant?.id === activeConvId ||
    c.id.includes(activeConvId) ||
    (c.participant?.id && activeConvId.includes(c.participant.id))
  );

  // Synchronize activeConvId if matched through participantId or variant
  useEffect(() => {
    if (activeConv && activeConv.id !== activeConvId) {
      setActiveConvId(activeConv.id);
      activeConvIdRef.current = activeConv.id;
    }
  }, [activeConv?.id]);

  // Fetch 1-on-1 call history when active participant changes
  useEffect(() => {
    if (activeConv?.participant?.id) {
      fetchUserCallLogs(activeConv.participant.id);
    }
  }, [activeConv?.participant?.id]);

  // Helper to determine if a message was sent by the current viewer
  const isMessageMe = (msg: ChatMessage) => {
    if (!msg) return false;
    if (currentUserId && msg.senderId === currentUserId) return true;
    if (msg.senderId === 'user-me') return true;
    if (currentUserEmail && (msg.senderId === currentUserEmail || (msg as any).senderEmail === currentUserEmail)) return true;
    // In 1-on-1 direct conversation, if sender is NOT the active partner, it is sent by the viewer!
    if (activeConv?.participant?.id && msg.senderId && msg.senderId !== activeConv.participant.id) {
      return true;
    }
    // Optimistic / locally created messages
    if (msg.id && (msg.id.startsWith('m-opt-') || msg.id.startsWith('m-stk-') || msg.id.startsWith('m-voice-') || msg.id.startsWith('m-img-'))) {
      return true;
    }
    return false;
  };

  // Open New Chat member picker modal and load verified members
  const handleOpenNewChat = async () => {
    setIsNewChatOpen(true);
    setIsLoadingDirectory(true);
    try {
      const res = await fetch('/api/directory');
      if (res.ok) {
        const data = await res.json();
        const rawMembers = Array.isArray(data.profiles) ? data.profiles : Array.isArray(data.members) ? data.members : [];
        if (rawMembers.length > 0) {
          const others = rawMembers.filter((m: any) => 
            m.id !== currentUserId && 
            (!currentUserEmail || m.email !== currentUserEmail)
          );
          setDirectoryMembers(others);
        }
      }
    } catch (err) {
      console.error('Failed to load directory members', err);
    } finally {
      setIsLoadingDirectory(false);
    }
  };

  // Handle member selection from modal to start/open chat
  const handleSelectNewChatMember = async (member: any) => {
    setIsNewChatOpen(false);
    if (!member || !member.id || member.id === currentUserId) return;

    const canonicalId = `th_${[currentUserId || 'user-me', member.id].sort().join('__')}`;
    
    // Check if thread already exists
    const existing = conversations.find(c => 
      c.participant?.id === member.id || 
      c.id === canonicalId ||
      c.id.includes(member.id)
    );

    if (existing) {
      setActiveConvId(existing.id);
    } else {
      const newThread: ConversationThread = {
        id: canonicalId,
        participant: {
          id: member.id,
          name: member.name,
          age: member.age || 30,
          location: member.location || 'Verified Member',
          occupation: member.occupation || member.headline || 'Member',
          photos: (member.photos && member.photos.length > 0) ? member.photos : [],
          interests: member.interests || [],
          online: true
        },
        lastMessage: 'Conversation initiated',
        lastMessageTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        unreadCount: 0,
        messages: []
      };
      setConversations(prev => [newThread, ...prev]);
      setActiveConvId(canonicalId);
    }

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'start_or_get_thread',
          recipientId: member.id,
          senderId: currentUserId,
          participantName: member.name,
          participantPhoto: member.photos?.[0] || ''
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.thread?.id) {
          setActiveConvId(data.thread.id);
        }
        if (data.conversations && Array.isArray(data.conversations)) {
          setConversations(data.conversations.filter(isRealConversation));
        }
      }
    } catch {}
  };

  const userSentMessages = activeConv?.messages.filter(m => isMessageMe(m)) || [];
  const userSentCount = userSentMessages.length;
  // Free testing mode: unlimited messages and calls for all users
  const FREE_MESSAGE_LIMIT = 999999;
  const isFreeQuotaExhausted = false;
  const remainingFreeMessages = 999999;

  // Scroll chat history container only without affecting outer page scroll
  const scrollToBottom = (smooth = false) => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: smooth ? 'smooth' : 'auto'
      });
      setIsScrolledUp(false);
    }
    if (messagesEndRef.current) {
      try {
        messagesEndRef.current.scrollIntoView({ behavior: smooth ? 'smooth' : 'auto' });
      } catch {}
    }
  };

  // Instant scroll to bottom when entering a conversation so the last message is the first thing seen
  useEffect(() => {
    if (!activeConvId) return;
    scrollToBottom(false);

    const rAf = requestAnimationFrame(() => {
      scrollToBottom(false);
    });

    const timer1 = setTimeout(() => {
      scrollToBottom(false);
    }, 50);

    const timer2 = setTimeout(() => {
      scrollToBottom(false);
    }, 200);

    return () => {
      cancelAnimationFrame(rAf);
      clearTimeout(timer1);
      clearTimeout(timer2);
    };
  }, [activeConvId]);

  // Keep pinned to latest message when new messages arrive if user hasn't scrolled up
  useEffect(() => {
    if (!activeConvId || !activeConv) return;
    if (!isScrolledUp) {
      scrollToBottom(false);
    }
  }, [activeConv?.messages?.length]);

  const handleScrollChat = (e: React.UIEvent<HTMLDivElement>) => {
    const target = e.currentTarget;
    const distanceFromBottom = target.scrollHeight - target.scrollTop - target.clientHeight;
    setIsScrolledUp(distanceFromBottom > 150);
  };

  // WhatsApp-Style Message Reaction Handler
  const handleReactToMessage = async (messageId: string, emoji: string) => {
    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        const updatedMessages = c.messages.map(m => {
          if (m.id === messageId || (messageId.startsWith('m-opt-') && m === c.messages[c.messages.length - 1])) {
            const reactions = m.reactions ? [...m.reactions] : [];
            const existing = reactions.find(r => r.emoji === emoji);
            if (existing) {
              if (existing.userIds.includes(currentUserId || 'user-me')) {
                existing.userIds = existing.userIds.filter(id => id !== (currentUserId || 'user-me'));
                existing.count = existing.userIds.length;
              } else {
                existing.userIds.push(currentUserId || 'user-me');
                existing.count = existing.userIds.length;
              }
            } else {
              reactions.push({ emoji, count: 1, userIds: [currentUserId || 'user-me'] });
            }
            return { ...m, reactions: reactions.filter(r => r.count > 0) };
          }
          return m;
        });
        return { ...c, messages: updatedMessages };
      }
      return c;
    }));

    setReactionMenuMessageId(null);

    try {
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'react',
          threadId: activeConvId,
          senderId: currentUserId,
          messageId,
          emoji
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedThread) {
          setConversations(prev => prev.map(c => c.id === activeConvId ? {
            ...data.updatedThread,
            unreadCount: 0
          } : c));
        }
      }
    } catch {}
  };

  // Send Sticker Handler
  const handleSendSticker = async (sticker: { code: string; label: string }) => {
    setIsStickerDrawerOpen(false);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optMsg: ChatMessage = {
      id: `m-stk-${Date.now()}`,
      senderId: currentUserId || 'user-me',
      content: `${sticker.code} ${sticker.label}`,
      timestamp: timeString,
      stickerCode: sticker.code,
      mediaType: 'sticker',
      read: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: `Sent a sticker ${sticker.code}`,
          lastMessageTime: timeString,
          messages: [...c.messages, optMsg]
        };
      }
      return c;
    }));

    setTimeout(() => scrollToBottom(true), 50);

    try {
      const currentActive = conversations.find(c => c.id === activeConvId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeConvId,
          recipientId: currentActive?.participant?.id || activeConvId.replace(/^th[-_]/, ''),
          senderId: currentUserId,
          participantName: currentActive?.participant?.name,
          participantPhoto: currentActive?.participant?.photos?.[0],
          participantLocation: currentActive?.participant?.location,
          participantOccupation: currentActive?.participant?.occupation,
          content: `${sticker.code} ${sticker.label}`,
          stickerCode: sticker.code,
          mediaType: 'sticker'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedThread) {
          setConversations(prev => prev.map(c => c.id === activeConvId ? data.updatedThread : c));
          scrollToBottom(true);
        }
      }
    } catch {}
  };

  // Insert emoji character into compose input
  const handleInsertEmoji = (emojiChar: string) => {
    setMessageInput(prev => prev + emojiChar);
  };

  // Send Image Handler (From Local Device or Quick Vault)
  const handleSendImage = async (imageUrl: string, caption?: string) => {
    setIsImageVaultOpen(false);

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const optMsg: ChatMessage = {
      id: `m-img-${Date.now()}`,
      senderId: currentUserId || 'user-me',
      content: caption || 'Shared a photograph',
      mediaUrl: imageUrl,
      mediaType: 'image',
      timestamp: timeString,
      read: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: caption || 'Shared a photo',
          lastMessageTime: timeString,
          messages: [...c.messages, optMsg]
        };
      }
      return c;
    }));

    setTimeout(() => scrollToBottom(true), 50);

    try {
      const currentActive = conversations.find(c => c.id === activeConvId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeConvId,
          recipientId: currentActive?.participant?.id || activeConvId.replace(/^th[-_]/, ''),
          senderId: currentUserId,
          participantName: currentActive?.participant?.name,
          participantPhoto: currentActive?.participant?.photos?.[0],
          participantLocation: currentActive?.participant?.location,
          participantOccupation: currentActive?.participant?.occupation,
          content: caption || 'Shared a photo',
          mediaUrl: imageUrl,
          mediaType: 'image'
        })
      });
      if (res.ok) {
        const data = await res.json();
        if (data.updatedThread) {
          setConversations(prev => prev.map(c => c.id === activeConvId ? data.updatedThread : c));
          scrollToBottom(true);
        }
      }
    } catch {}
  };

  const handleDevicePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        handleSendImage(reader.result, 'Direct photo dispatch');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleGiftSentInChat = (gift: BespokeGift) => {
    const timeString = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const giftMsg: ChatMessage = {
      id: `m-gift-${Date.now()}`,
      senderId: currentUserId || 'user-me',
      content: `Sent a Bespoke Gift: ${gift.icon} ${gift.name} (${gift.tagline})`,
      timestamp: timeString,
      read: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: giftMsg.content,
          lastMessageTime: timeString,
          messages: [...c.messages, giftMsg]
        };
      }
      return c;
    }));

    setTimeout(() => scrollToBottom(true), 50);
  };

  // Audio note playback simulation
  const toggleAudioPlay = (msgId: string) => {
    if (playingAudioId === msgId) {
      setPlayingAudioId(null);
      setAudioProgress(0);
    } else {
      setPlayingAudioId(msgId);
      setAudioProgress(10);
      const interval = setInterval(() => {
        setAudioProgress(prev => {
          if (prev >= 100) {
            clearInterval(interval);
            setPlayingAudioId(null);
            return 0;
          }
          return prev + 15;
        });
      }, 300);
    }
  };

  // Send standard text message
  const handleSendMessage = async (textToSend?: string) => {

    const text = textToSend !== undefined ? textToSend : messageInput;
    if (!text.trim()) return;

    setMessageInput('');

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const optimisticMsg: ChatMessage = {
      id: `m-opt-${Date.now()}`,
      senderId: currentUserId || 'user-me',
      content: text,
      timestamp: timeString,
      read: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          unreadCount: 0,
          lastMessage: text,
          lastMessageTime: timeString,
          messages: [
            ...c.messages.map(m => (!isMessageMe(m) ? { ...m, read: true } : m)),
            optimisticMsg
          ]
        };
      }
      return c;
    }));

    setTimeout(() => scrollToBottom(true), 50);

    try {
      const currentActive = conversations.find(c => c.id === activeConvId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeConvId,
          recipientId: currentActive?.participant?.id || activeConvId.replace(/^th[-_]/, ''),
          senderId: currentUserId,
          participantName: currentActive?.participant?.name,
          participantPhoto: currentActive?.participant?.photos?.[0],
          participantLocation: currentActive?.participant?.location,
          participantOccupation: currentActive?.participant?.occupation,
          content: text
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.updatedThread) {
          setConversations(prev => prev.map(c => {
            if (c.id === activeConvId || (activeConv && c.id === activeConv.id)) {
              const existingMsgMap = new Map<string, ChatMessage>();
              c.messages.forEach(m => existingMsgMap.set(m.id, m));

              (data.updatedThread.messages || []).forEach((srvMsg: ChatMessage) => {
                if (srvMsg.content === optimisticMsg.content && (srvMsg.senderId === currentUserId || srvMsg.senderId === 'user-me')) {
                  existingMsgMap.set(optimisticMsg.id, {
                    ...srvMsg,
                    id: optimisticMsg.id,
                    read: true
                  });
                } else if (!existingMsgMap.has(srvMsg.id)) {
                  existingMsgMap.set(srvMsg.id, srvMsg);
                }
              });

              return {
                ...data.updatedThread,
                id: c.id,
                messages: Array.from(existingMsgMap.values()),
                lastMessage: text,
                lastMessageTime: timeString
              };
            }
            return c;
          }));
          if (!isScrolledUp) {
            scrollToBottom(true);
          }
        }
      }
    } catch (err) {}
  };

  const handleSendVoiceNote = async () => {
    setIsRecording(false);

    const duration = `0:0${Math.max(recordSeconds, 3)}`;
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const voiceMsg: ChatMessage = {
      id: `m-voice-${Date.now()}`,
      senderId: currentUserId || 'user-me',
      content: 'Voice note dispatched',
      timestamp: timeString,
      isVoiceNote: true,
      voiceDuration: duration,
      read: true
    };

    setConversations(prev => prev.map(c => {
      if (c.id === activeConvId) {
        return {
          ...c,
          lastMessage: 'Voice message',
          lastMessageTime: timeString,
          messages: [...c.messages, voiceMsg]
        };
      }
      return c;
    }));

    try {
      const currentActive = conversations.find(c => c.id === activeConvId);
      const res = await fetch('/api/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          threadId: activeConvId,
          recipientId: currentActive?.participant?.id || activeConvId.replace(/^th[-_]/, ''),
          senderId: currentUserId,
          participantName: currentActive?.participant?.name,
          participantPhoto: currentActive?.participant?.photos?.[0],
          participantLocation: currentActive?.participant?.location,
          participantOccupation: currentActive?.participant?.occupation,
          content: 'Voice message note',
          isVoiceNote: true
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.updatedThread) {
          setConversations(prev => prev.map(c => c.id === activeConvId ? data.updatedThread : c));
        }
      }
    } catch {}
  };

  const filteredConversations = conversations.filter(c => {
    if (!c || !c.participant) return false;
    const isSelf = Boolean(
      (currentUserId && c.participant.id === currentUserId) ||
      (currentUserEmail && c.participant.id === currentUserEmail)
    );
    if (isSelf) return false;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      return (
        (c.participant.name || '').toLowerCase().includes(query) ||
        (c.lastMessage || '').toLowerCase().includes(query)
      );
    }
    return true;
  });

  return (
    <div className="h-screen max-h-screen bg-[#070709] text-[#F4F4F6] flex flex-col relative overflow-hidden select-none">
      <div className="shrink-0 z-50">
        <Navigation />
      </div>

      <main className="max-w-6xl mx-auto w-full px-2 sm:px-4 lg:px-6 pt-1 sm:pt-2 pb-[calc(4.5rem+env(safe-area-inset-bottom,0px))] md:pb-2 flex-1 flex flex-col h-full min-h-0 overflow-hidden">
        
        {/* Messaging Container */}
        <div className="glass-card border-[#D4AF37]/25 rounded-2xl sm:rounded-3xl grid grid-cols-1 lg:grid-cols-12 flex-1 h-full min-h-0 overflow-hidden shadow-2xl">
          
          {/* Left Column: Conversation Threads & Call History (Lg: 4 cols) */}
          <div className={`${activeConvId ? 'hidden lg:flex' : 'flex'} lg:col-span-4 border-r border-white/10 flex-col bg-[#0A0A0E]/80 h-full min-h-0 overflow-hidden`}>
            
            {/* Header & Sub-Tabs */}
            <div className="p-4 border-b border-white/10 space-y-3 shrink-0">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1 bg-black/50 p-1 rounded-2xl border border-white/10">
                  <button
                    onClick={() => setSidebarTab('messages')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      sidebarTab === 'messages' ? 'bg-[#D4AF37] text-black font-bold shadow-md' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Chats ({filteredConversations.length})
                  </button>
                  <button
                    onClick={() => setSidebarTab('calls')}
                    className={`px-3 py-1 rounded-xl text-xs font-semibold transition-all ${
                      sidebarTab === 'calls' ? 'bg-[#D4AF37] text-black font-bold shadow-md' : 'text-white/60 hover:text-white'
                    }`}
                  >
                    Call History ({callHistory.length})
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleOpenNewChat}
                    className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37] hover:bg-[#D4AF37] hover:text-black transition-all text-[11px] font-bold shadow-sm"
                    title="Start new dispatch with a member"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>New Chat</span>
                  </button>
                  <Badge type="verified" label="Encrypted" />
                </div>
              </div>

              {sidebarTab === 'messages' && (
                <div className="relative">
                  <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search conversations..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none transition-colors"
                  />
                  {searchQuery && (
                    <button 
                      onClick={() => setSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-white/40 hover:text-white"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              )}
            </div>

            {/* Conversation Threads or Call History List */}
            <div className="flex-1 overflow-y-auto overscroll-contain divide-y divide-white/5 min-h-0">
              {sidebarTab === 'messages' ? (
                filteredConversations.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-12 h-12 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-3">
                      <Sparkles className="w-5 h-5" />
                    </div>
                    <p className="font-bold text-xs text-white">No Dispatches Yet</p>
                    <p className="text-[11px] text-white/50 mt-1 max-w-[200px] leading-relaxed">
                      Connect with verified club members to unlock private messaging.
                    </p>
                    <div className="mt-4 flex items-center gap-2">
                      <button 
                        onClick={handleOpenNewChat}
                        className="px-4 py-1.5 rounded-full bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c49f27] transition-colors shadow-md flex items-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" /> Message a Member
                      </button>
                      <Link href="/directory" className="px-3.5 py-1.5 rounded-full bg-white/10 text-white text-xs font-medium hover:bg-white/20 transition-colors">
                        Directory
                      </Link>
                    </div>
                  </div>
                ) : (
                  filteredConversations.map((conv) => {
                    const isSelected = conv.id === activeConvId;
                    return (
                      <div
                        key={conv.id}
                        onClick={() => handleSelectConversation(conv.id)}
                        className={`p-4 flex items-center gap-3 cursor-pointer transition-all ${
                          isSelected ? 'bg-[#D4AF37]/15 border-l-4 border-[#D4AF37]' : 'hover:bg-white/5'
                        }`}
                      >
                        <div className="relative shrink-0">
                          {getParticipantPhoto(conv.participant) ? (
                            <img
                              src={getParticipantPhoto(conv.participant)}
                              alt={conv.participant.name}
                              className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/40 shadow-sm"
                            />
                          ) : (
                            <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-base shadow-sm">
                              {(conv.participant.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {conv.participant.online && (
                            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#070709]" />
                          )}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-0.5">
                            <div className="flex items-center gap-1.5 min-w-0">
                              <h4 className="font-serif font-bold text-white text-sm truncate">{conv.participant.name}</h4>
                              {conv.participant.tier === 'ELITE' && (
                                <span className="px-1.5 py-0.2 rounded text-[8px] font-black uppercase tracking-wider bg-gradient-to-r from-[#D4AF37]/30 to-amber-500/20 text-[#D4AF37] border border-[#D4AF37]/50 shrink-0">
                                  👑 ELITE
                                </span>
                              )}
                            </div>
                            <span className="text-[10px] text-white/40 shrink-0">{conv.lastMessageTime}</span>
                          </div>
                          <p className="text-xs text-white/60 truncate">{conv.lastMessage}</p>
                        </div>

                        {conv.unreadCount > 0 && (
                          <span className="w-5 h-5 rounded-full bg-[#D4AF37] text-black text-[10px] font-bold flex items-center justify-center shrink-0 shadow-md">
                            {conv.unreadCount}
                          </span>
                        )}
                      </div>
                    );
                  })
                )
              ) : (
                /* Call History List */
                callHistory.length === 0 ? (
                  <div className="p-8 text-center flex flex-col items-center justify-center h-64 text-center">
                    <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/40 mb-3">
                      <Phone className="w-5 h-5 text-[#D4AF37]" />
                    </div>
                    <p className="font-bold text-xs text-white">No Call Logs</p>
                    <p className="text-[11px] text-white/50 mt-1 max-w-[200px] leading-relaxed">
                      Voice and 4K video date logs with verified club patrons will be archived here.
                    </p>
                  </div>
                ) : (
                  callHistory.map((call) => (
                    <div
                      key={call.id}
                      onClick={() => {
                        setSidebarTab('messages');
                        const existing = conversations.find(c => 
                          c.participant?.id === call.partnerId || 
                          c.id.includes(call.partnerId)
                        );
                        if (existing) {
                          handleSelectConversation(existing.id);
                        } else {
                          handleSelectNewChatMember({
                            id: call.partnerId,
                            name: call.partnerName,
                            photos: call.partnerPhoto ? [call.partnerPhoto] : [],
                            occupation: call.partnerOccupation
                          });
                        }
                      }}
                      className="p-4 flex items-center justify-between gap-3 hover:bg-white/5 transition-all cursor-pointer group"
                    >
                      <div className="flex items-center gap-3 min-w-0">
                        {call.partnerPhoto ? (
                          <img
                            src={call.partnerPhoto}
                            alt={call.partnerName}
                            className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/30 group-hover:border-[#D4AF37] shrink-0 transition-colors"
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border border-[#D4AF37]/30 group-hover:border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-sm shrink-0 transition-colors">
                            {(call.partnerName || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <h4 className="font-serif font-bold text-white group-hover:text-[#D4AF37] text-sm truncate transition-colors">{call.partnerName}</h4>
                            <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 shrink-0">
                              {call.callType === 'video' ? 'HD Video' : 'Voice'}
                            </span>
                          </div>
                          <p className="text-[11px] text-white/50 truncate">{call.partnerOccupation}</p>
                          <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                            <span>{call.timestamp}</span>
                            <span>•</span>
                            <span className="text-emerald-400 font-medium">{call.durationFormatted}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/call/${call.partnerId}?mode=${call.callType}&name=${encodeURIComponent(call.partnerName)}&photo=${encodeURIComponent(call.partnerPhoto || '')}`}>
                          <button className="p-2 rounded-full bg-white/5 hover:bg-[#D4AF37] text-white hover:text-black transition-all border border-white/10" title="Call again">
                            {call.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                          </button>
                        </Link>
                      </div>
                    </div>
                  ))
                )
              )}
            </div>

          </div>

          {/* Right Column: Active Conversation Room (Lg: 8 cols) */}
          {!activeConv ? (
            <div className="hidden lg:flex lg:col-span-8 flex-col items-center justify-center bg-[#070709]/90 relative p-8 text-center h-full min-h-0 overflow-hidden">
              <div className="w-16 h-16 rounded-3xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37] mb-4 shadow-2xl">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-serif text-xl font-bold text-white gold-gradient-text">Private Dispatch Chamber</h3>
              <p className="text-xs text-white/60 mt-2 max-w-md leading-relaxed">
                Connect and coordinate with verified club patrons. All messages, high-resolution photographs, and luxury animated stickers are protected with end-to-end encryption.
              </p>
              <div className="mt-6 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleOpenNewChat}
                  className="px-4 py-2 rounded-full bg-[#D4AF37] text-black text-xs font-bold hover:bg-[#c49f27] transition-all shadow-lg flex items-center gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" /> Start New Dispatch
                </button>
                <Link href="/directory">
                  <Button variant="outline" size="sm" className="text-xs">
                    Browse Directory
                  </Button>
                </Link>
              </div>
            </div>
          ) : (
            <div className={`${activeConvId ? 'flex' : 'hidden lg:flex'} lg:col-span-8 flex-col bg-[#070709]/90 relative h-full min-h-0 overflow-hidden`}>
              
              {/* Active Conversation Header */}
              <div className="px-3 py-2.5 sm:px-4 sm:py-3 border-b border-white/10 flex items-center justify-between bg-black/40 backdrop-blur-md shrink-0 gap-2">
                <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={handleCloseActiveConversation}
                    className="lg:hidden p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-white/80 transition-colors shrink-0"
                    title="Back to conversations"
                  >
                    <ArrowLeft className="w-4 h-4 text-[#D4AF37]" />
                  </button>
                  <div className="relative shrink-0">
                    {getParticipantPhoto(activeConv.participant) ? (
                      <img
                        src={getParticipantPhoto(activeConv.participant)}
                        alt={activeConv.participant.name}
                        className="w-10 h-10 rounded-full object-cover border border-[#D4AF37] shadow-md"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-sm shadow-md">
                        {(activeConv.participant.name || 'M').charAt(0).toUpperCase()}
                      </div>
                    )}
                    {activeConv.participant.online && (
                      <div className="absolute bottom-0 right-0 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-black" />
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 min-w-0">
                      <h3 className="font-serif font-bold text-white text-sm sm:text-base truncate">
                        {activeConv.participant.name}
                      </h3>
                      <Badge type="verified" label="Verified" />
                    </div>
                    <span className="text-[10px] sm:text-[11px] text-white/50 block truncate">
                      {activeConv.participant.occupation || 'Member'} • {activeConv.participant.location || 'London'}
                    </span>
                  </div>
                </div>

                {/* Call & Action Controls */}
                <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                  <button 
                    onClick={() => handleStartCall('voice')}
                    disabled={isInitiatingCall}
                    className="p-2 sm:p-2.5 rounded-full glass-panel hover:border-[#D4AF37] text-[#D4AF37] transition-all hover:scale-105 relative disabled:opacity-50" 
                    title="Start Voice Call"
                  >
                    <Phone className="w-4 h-4" />
                  </button>

                  <button 
                    onClick={() => handleStartCall('video')}
                    disabled={isInitiatingCall}
                    className="p-2 sm:p-2.5 rounded-full gold-gradient-bg text-black hover:scale-105 transition-transform font-bold shadow-lg relative disabled:opacity-50" 
                    title="Start HD Video Date"
                  >
                    <Video className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Message History Window */}
              <div 
                ref={chatContainerRef}
                onScroll={handleScrollChat}
                className="flex-1 p-3 sm:p-5 overflow-y-auto space-y-3 relative"
              >
                
                {/* End-to-End Encryption Notice */}
                <div className="flex justify-center my-2">
                  <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[10px] text-white/40">
                    <Lock className="w-3 h-3 text-[#D4AF37]" />
                    <span>Dispatches are end-to-end encrypted & confidential.</span>
                  </div>
                </div>

                {/* Empty Conversation Welcome Greeting */}
                {activeConv.messages.length === 0 && (
                  <div className="py-10 px-4 text-center max-w-sm mx-auto space-y-3">
                    <div className="w-14 h-14 rounded-full bg-gradient-to-br from-[#D4AF37]/20 to-amber-500/10 border border-[#D4AF37]/40 flex items-center justify-center mx-auto text-[#D4AF37] shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h4 className="font-serif font-bold text-white text-base">Direct Member Dispatch</h4>
                    <p className="text-xs text-white/60 leading-relaxed">
                      You are connected with <span className="text-[#D4AF37] font-semibold">{activeConv.participant.name}</span>. Break the ice and send your first message, sticker, or voice note below.
                    </p>
                  </div>
                )}

                {activeConv.messages.map((msg) => {
                  const isMe = isMessageMe(msg);

                  return (
                    <div key={msg.id} className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group relative`}>
                      
                      {/* Incoming partner identity crest & name */}
                      {!isMe && (
                        <div className="flex items-center gap-1.5 mb-1 pl-1">
                          <div className="w-5 h-5 rounded-full overflow-hidden border border-[#D4AF37]/50 bg-black flex items-center justify-center shrink-0">
                            {getParticipantPhoto(activeConv.participant) ? (
                              <img src={getParticipantPhoto(activeConv.participant)} alt={activeConv.participant.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[9px] font-serif font-bold text-[#D4AF37]">
                                {activeConv.participant.name.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || 'KM'}
                              </span>
                            )}
                          </div>
                          <span className="text-[11px] font-semibold text-white/70">{activeConv.participant.name}</span>
                        </div>
                      )}

                      {/* Floating Luxury Emoji Quick Bar */}
                      <div className={`opacity-0 group-hover:opacity-100 transition-opacity absolute -top-8 ${isMe ? 'right-2' : 'left-2'} z-20 flex items-center gap-1 bg-[#14141E] border border-[#D4AF37]/50 rounded-full px-2.5 py-1 shadow-2xl backdrop-blur-md max-w-[280px] sm:max-w-none overflow-x-auto no-scrollbar`}>
                        {EMOJI_REACTIONS.map(emoji => (
                          <button
                            key={emoji}
                            type="button"
                            onClick={() => handleReactToMessage(msg.id, emoji)}
                            className="hover:scale-135 active:scale-95 transition-transform text-xs p-1"
                            title={`React with ${emoji}`}
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>

                      {/* Message Bubble */}
                      <div className={`max-w-md rounded-2xl text-sm leading-relaxed relative ${
                        isMe 
                          ? 'gold-gradient-bg text-black font-medium rounded-br-none shadow-md' 
                          : 'glass-panel text-white rounded-bl-none border-white/10 shadow-md'
                      } ${msg.mediaType === 'image' || msg.stickerCode ? 'p-2' : 'p-4'}`}>
                        
                        {/* 1. Sticker Rendering */}
                        {msg.stickerCode ? (
                          <div className="p-3.5 text-center flex flex-col items-center">
                            <div className="relative group/sticker">
                              <span className="text-6xl sm:text-7xl select-none block drop-shadow-2xl hover:scale-110 transition-transform duration-200 cursor-pointer">
                                {msg.stickerCode}
                              </span>
                              <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-10 h-2 bg-[#D4AF37]/30 blur-sm rounded-full" />
                            </div>
                            <span className={`text-[11px] font-bold mt-2 px-2.5 py-0.5 rounded-full ${
                              isMe 
                                ? 'bg-black/15 text-black' 
                                : 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40'
                            }`}>
                              {msg.content}
                            </span>
                          </div>
                        ) : msg.mediaType === 'image' || msg.mediaUrl ? (
                          /* 2. Photo / Image Rendering with Lightbox trigger */
                          <div className="space-y-1.5">
                            <div 
                              onClick={() => msg.mediaUrl && setActiveLightboxImage(msg.mediaUrl)}
                              className="relative rounded-xl overflow-hidden cursor-pointer group/img max-h-72 border border-black/20"
                            >
                              <img 
                                src={msg.mediaUrl} 
                                alt="Shared photograph" 
                                className="w-full h-full object-cover group-hover/img:scale-105 transition-transform duration-300"
                              />
                              <div className="absolute inset-0 bg-black/30 opacity-0 group-hover/img:opacity-100 transition-opacity flex items-center justify-center">
                                <span className="px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold flex items-center gap-1.5 backdrop-blur-sm">
                                  <Maximize2 className="w-3.5 h-3.5 text-[#D4AF37]" /> View Full Photo
                                </span>
                              </div>
                            </div>
                            {msg.content && msg.content !== 'Shared a photograph' && msg.content !== 'Shared a photo' && (
                              <p className={`text-xs px-2 pt-1 font-medium ${isMe ? 'text-black/90' : 'text-white/90'}`}>
                                {msg.content}
                              </p>
                            )}
                          </div>
                        ) : msg.isVoiceNote ? (
                          /* 3. Voice Note */
                          <div className="flex items-center gap-3 pr-2 min-w-[200px] p-2">
                            <button 
                              type="button"
                              onClick={() => toggleAudioPlay(msg.id)}
                              className={`w-9 h-9 rounded-full flex items-center justify-center transition-transform hover:scale-105 ${
                                isMe ? 'bg-black text-[#D4AF37]' : 'bg-[#D4AF37] text-black'
                              }`}
                            >
                              {playingAudioId === msg.id ? (
                                <Pause className="w-4 h-4 fill-current" />
                              ) : (
                                <Play className="w-4 h-4 fill-current ml-0.5" />
                              )}
                            </button>

                            <div className="flex-1">
                              <div className="h-1.5 bg-black/20 rounded-full w-32 overflow-hidden relative">
                                <div 
                                  className={`h-full transition-all duration-200 ${isMe ? 'bg-black' : 'bg-[#D4AF37]'}`}
                                  style={{ width: playingAudioId === msg.id ? `${audioProgress}%` : '40%' }}
                                />
                              </div>
                              <span className={`text-[10px] block mt-1 ${isMe ? 'text-black/70' : 'text-white/60'}`}>
                                {playingAudioId === msg.id ? 'Playing audio note...' : `Audio Note (${msg.voiceDuration || '0:18'})`}
                              </span>
                            </div>
                          </div>
                        ) : (msg.mediaType === 'call_log' || msg.content.startsWith('📞') || msg.content.startsWith('📹') || msg.content.toLowerCase().includes('call ended') || msg.content.toLowerCase().includes('video date ended')) ? (
                          /* 4. In-Chat Call Log Card */
                          <div className="flex items-center gap-3 py-1.5 px-2 min-w-[220px] sm:min-w-[260px]">
                            <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 shadow-inner ${
                              isMe 
                                ? 'bg-black/25 text-[#1a1810] border border-black/20' 
                                : 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/35'
                            }`}>
                              {msg.callType === 'voice' || msg.content.includes('Voice') || msg.content.startsWith('📞') ? (
                                <Phone className="w-5 h-5 fill-current/20" />
                              ) : (
                                <Video className="w-5 h-5 fill-current/20" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className={`text-xs font-serif font-bold truncate ${isMe ? 'text-black' : 'text-white'}`}>
                                  {msg.callType === 'voice' || msg.content.includes('Voice') || msg.content.startsWith('📞') ? 'HD Voice Call' : '4K Video Date'}
                                </span>
                              </div>
                              <div className="flex items-center gap-1.5 mt-0.5">
                                <span className={`text-[10px] font-semibold tracking-wide ${isMe ? 'text-black/85' : 'text-emerald-400'}`}>
                                  {msg.callDuration || (msg.content.includes('•') ? msg.content.split('•')[1]?.trim() : msg.content.includes('(') ? msg.content.split('(')[1]?.replace(')', '') : 'Completed')}
                                </span>
                                <span className={`text-[9px] ${isMe ? 'text-black/40' : 'text-white/40'}`}>•</span>
                                <span className={`text-[10px] ${isMe ? 'text-black/60' : 'text-white/50'}`}>{msg.timestamp}</span>
                              </div>
                            </div>
                            <button
                              type="button"
                              onClick={() => handleStartCall(msg.callType === 'voice' || msg.content.includes('Voice') || msg.content.startsWith('📞') ? 'voice' : 'video')}
                              className={`p-2 rounded-full transition-transform hover:scale-110 shrink-0 shadow-md ${
                                isMe 
                                  ? 'bg-black text-[#D4AF37] hover:bg-black/90' 
                                  : 'gold-gradient-bg text-black hover:opacity-95'
                              }`}
                              title="Call back"
                            >
                              {msg.callType === 'voice' || msg.content.includes('Voice') || msg.content.startsWith('📞') ? (
                                <Phone className="w-3.5 h-3.5" />
                              ) : (
                                <Video className="w-3.5 h-3.5" />
                              )}
                            </button>
                          </div>
                        ) : (
                          /* 5. Text Content */
                          msg.content
                        )}

                        {/* Reaction Badges on Corner */}
                        {msg.reactions && msg.reactions.length > 0 && (
                          <div className={`absolute -bottom-3 ${isMe ? 'right-3' : 'left-3'} flex items-center gap-1 bg-[#101018] border border-[#D4AF37]/50 rounded-full px-2 py-0.5 shadow-md z-10`}>
                            {msg.reactions.map((r, ri) => (
                              <button
                                key={ri}
                                onClick={() => handleReactToMessage(msg.id, r.emoji)}
                                className="flex items-center gap-1 text-[10px] hover:scale-110 transition-transform"
                                title="Click to toggle reaction"
                              >
                                <span>{r.emoji}</span>
                                {r.count > 1 && <span className="text-[9px] font-bold text-white">{r.count}</span>}
                              </button>
                            ))}
                          </div>
                        )}

                      </div>
                      
                      {/* Timestamp & Read Receipts */}
                      <div className="flex items-center gap-1.5 text-[10px] text-white/40 mt-1.5 px-1">
                        <span>{msg.timestamp}</span>
                        {isMe && (
                          <CheckCheck className={`w-3.5 h-3.5 ${msg.read ? 'text-[#D4AF37]' : 'text-white/40'}`} />
                        )}
                      </div>
                    </div>
                  );
                })}

                {isTyping && (
                  <div className="flex items-center gap-2 text-xs text-[#D4AF37] italic bg-white/[0.02] border border-white/5 rounded-full px-4 py-2 w-fit">
                    <span className="w-2 h-2 rounded-full bg-[#D4AF37] animate-ping" />
                    <span>{activeConv.participant.name.split(' ')[0]} is typing...</span>
                  </div>
                )}

                {/* Optional Jump to Latest Button when scrolled up */}
                {isScrolledUp && (
                  <button
                    type="button"
                    onClick={() => scrollToBottom(true)}
                    className="sticky bottom-2 ml-auto mr-2 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-black/90 border border-[#D4AF37]/60 text-xs font-semibold text-[#D4AF37] shadow-2xl hover:scale-105 transition-all backdrop-blur-md"
                    title="Jump to latest message"
                  >
                    <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
                    <span>Scroll to latest</span>
                  </button>
                )}

                {/* Scroll Anchor to ensure bottom is visible first */}
                <div ref={messagesEndRef} className="h-1 w-full shrink-0" />
              </div>

              {/* Complimentary message quota indicator or topup prompt */}
              {isFreeQuotaExhausted ? (
                /* 5-MESSAGE LIMIT REACHED: Chatting requires credits or upgrade */
                <div className="p-6 border-t border-[#D4AF37]/40 bg-gradient-to-b from-[#181308] via-[#0D0B05] to-black relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-1/3 w-80 h-32 bg-[#D4AF37]/20 blur-[60px] pointer-events-none" />

                  <div className="flex flex-col md:flex-row items-center justify-between gap-5 relative z-10">
                    <div className="flex items-center gap-4 text-center md:text-left">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/15 border border-[#D4AF37]/70 flex items-center justify-center shrink-0 shadow-[0_0_30px_rgba(212,175,55,0.3)]">
                        <Crown className="w-7 h-7 text-[#D4AF37]" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2 justify-center md:justify-start">
                          <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37] px-2.5 py-0.5 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center gap-1">
                            <Lock className="w-3 h-3 text-[#D4AF37]" /> Free Quota Used ({userSentCount}/{FREE_MESSAGE_LIMIT} Messages Sent)
                          </span>
                        </div>
                        <h4 className="font-serif text-base font-bold text-white mt-1">
                          Complimentary Message Limit Reached — Top Up Credits to Continue
                        </h4>
                        <p className="text-xs text-white/70 max-w-xl mt-0.5 leading-relaxed">
                          You have sent your complimentary dispatches. To continue exchanging messages, audio notes, stickers, and photos, top up your date credits or upgrade your membership.
                        </p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
                      <Button
                        type="button"
                        variant="gold"
                        size="md"
                        onClick={() => { setModalTab('topup'); setModalOpen(true); }}
                        icon={<Crown className="w-4 h-4 text-black" />}
                        className="shadow-2xl px-6 py-3 text-xs uppercase font-bold tracking-wider whitespace-nowrap"
                      >
                        Top Up Credits →
                      </Button>
                      <Button
                        type="button"
                        variant="outline"
                        size="md"
                        onClick={() => { setModalTab('elite'); setModalOpen(true); }}
                        icon={<Crown className="w-4 h-4 text-[#D4AF37]" />}
                        className="px-5 py-3 text-xs uppercase font-bold tracking-wider whitespace-nowrap"
                      >
                        Join Elite Circle
                      </Button>
                    </div>
                  </div>
                </div>
              ) : (
                /* 4. ACTIVE CHAT COMPOSER WITH STICKERS & PHOTO SHARING */
                <>
                  {/* LUXURY STICKERS & EMOJIS DRAWER POPUP */}
                  <AnimatePresence>
                    {isStickerDrawerOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="p-4 bg-[#101018] border-t border-[#D4AF37]/40 shadow-2xl relative"
                      >
                        {/* Drawer Header & Tab Switcher */}
                        <div className="flex items-center justify-between mb-3 border-b border-white/10 pb-2.5">
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setDrawerTab('stickers')}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                drawerTab === 'stickers'
                                  ? 'bg-[#D4AF37] text-black shadow-md'
                                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Luxury Stickers ({LUXURY_STICKERS.length})</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => setDrawerTab('emojis')}
                              className={`px-3 py-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1.5 ${
                                drawerTab === 'emojis'
                                  ? 'bg-[#D4AF37] text-black shadow-md'
                                  : 'bg-white/5 text-white/60 hover:text-white hover:bg-white/10'
                              }`}
                            >
                              <Smile className="w-3.5 h-3.5" />
                              <span>All Emojis (64)</span>
                            </button>
                          </div>

                          <button 
                            type="button"
                            onClick={() => setIsStickerDrawerOpen(false)}
                            className="text-white/40 hover:text-white p-1 rounded-full hover:bg-white/10"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* 1. STICKERS TAB CONTENT */}
                        {drawerTab === 'stickers' && (
                          <div className="space-y-3">
                            {/* Sticker Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                              {[
                                { id: 'all', label: `All (${LUXURY_STICKERS.length})` },
                                { id: 'royalty', label: '👑 Royalty & VIP' },
                                { id: 'seductive', label: '🫦 Seductive & Heat' },
                                { id: 'cheeky', label: '🫣 Awkward & Cheeky' },
                                { id: 'exciting', label: '⚡ Exciting & Sparks' }
                              ].map(pill => (
                                <button
                                  key={pill.id}
                                  type="button"
                                  onClick={() => setStickerCategory(pill.id as any)}
                                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                    stickerCategory === pill.id
                                      ? 'bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]'
                                      : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                                  }`}
                                >
                                  {pill.label}
                                </button>
                              ))}
                            </div>

                            {/* Stickers Grid */}
                            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 max-h-64 overflow-y-auto pr-1">
                              {LUXURY_STICKERS
                                .filter(s => stickerCategory === 'all' || s.category === stickerCategory)
                                .map(s => (
                                  <button
                                    key={s.id}
                                    type="button"
                                    onClick={() => handleSendSticker(s)}
                                    className="p-2.5 rounded-2xl bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37] transition-all flex flex-col items-center text-center group relative overflow-hidden"
                                  >
                                    <div className={`absolute top-0 inset-x-0 h-1 bg-gradient-to-r ${s.accentGradient} opacity-75 group-hover:opacity-100 transition-opacity`} />
                                    <span className="text-3xl sm:text-4xl group-hover:scale-125 transition-transform duration-200 block my-1">
                                      {s.code}
                                    </span>
                                    <span className="text-[11px] font-bold text-white group-hover:text-[#D4AF37] transition-colors truncate w-full">
                                      {s.label}
                                    </span>
                                    <span className="text-[9px] text-white/40 group-hover:text-white/70 transition-colors truncate w-full">
                                      {s.sub}
                                    </span>
                                  </button>
                                ))}
                            </div>
                          </div>
                        )}

                        {/* 2. EMOJIS TAB CONTENT */}
                        {drawerTab === 'emojis' && (
                          <div className="space-y-3">
                            {/* Emoji Category Filter Pills */}
                            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1">
                              {[
                                { id: 'all', label: 'All Emojis (64)' },
                                { id: 'smiling', label: '😊 Smiling & Sweet' },
                                { id: 'awkward', label: '😬 Awkward & Cheeky' },
                                { id: 'romance', label: '🫦 Romance & Seduction' },
                                { id: 'exciting', label: '🔥 Exciting & Luxury' }
                              ].map(pill => (
                                <button
                                  key={pill.id}
                                  type="button"
                                  onClick={() => setEmojiCategory(pill.id as any)}
                                  className={`shrink-0 px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all ${
                                    emojiCategory === pill.id
                                      ? 'bg-[#D4AF37]/30 text-[#D4AF37] border border-[#D4AF37]'
                                      : 'bg-white/5 text-white/60 hover:text-white border border-white/5'
                                  }`}
                                >
                                  {pill.label}
                                </button>
                              ))}
                            </div>

                            {/* Emojis Grouped List */}
                            <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
                              {EMOJI_CATALOG
                                .filter(cat => emojiCategory === 'all' || cat.id === emojiCategory)
                                .map(cat => (
                                  <div key={cat.id} className="space-y-1.5">
                                    <div className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider flex items-center gap-1">
                                      <span>{cat.icon}</span>
                                      <span>{cat.label}</span>
                                    </div>
                                    <div className="grid grid-cols-8 sm:grid-cols-12 md:grid-cols-16 gap-1.5">
                                      {cat.emojis.map(e => (
                                        <button
                                          key={e.char + e.name}
                                          type="button"
                                          onClick={() => handleInsertEmoji(e.char)}
                                          title={`${e.name} (Click to insert)`}
                                          className="w-9 h-9 text-xl sm:text-2xl rounded-xl bg-white/5 hover:bg-[#D4AF37]/25 border border-white/5 hover:border-[#D4AF37]/60 hover:scale-125 active:scale-95 transition-all flex items-center justify-center"
                                        >
                                          {e.char}
                                        </button>
                                      ))}
                                    </div>
                                  </div>
                                ))}
                            </div>

                            <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-white/50">
                              <span>💡 Tap any emoji to append to your message dispatch</span>
                              {messageInput.trim() && (
                                <button
                                  type="button"
                                  onClick={() => handleSendMessage()}
                                  className="text-[#D4AF37] hover:underline font-bold text-xs"
                                >
                                  Send Now →
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* IMAGE SHARING VAULT DRAWER */}
                  <AnimatePresence>
                    {isImageVaultOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        className="p-4 bg-[#101018] border-t border-[#D4AF37]/40 shadow-2xl relative"
                      >
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <ImageIcon className="w-4 h-4 text-[#D4AF37]" />
                            <span className="text-xs font-bold text-white">Share High-Definition Photos</span>
                          </div>
                          <button 
                            onClick={() => setIsImageVaultOpen(false)}
                            className="text-white/40 hover:text-white"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>

                        {/* Direct Upload + Presets */}
                        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                          {/* Direct Device Upload Card */}
                          <div 
                            onClick={() => photoInputRef.current?.click()}
                            className="p-3 rounded-2xl border-2 border-dashed border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/15 flex flex-col items-center justify-center text-center cursor-pointer transition-all aspect-video sm:aspect-auto"
                          >
                            <Upload className="w-6 h-6 text-[#D4AF37] mb-1" />
                            <span className="text-xs font-bold text-white">Upload from Phone / PC</span>
                            <span className="text-[9px] text-white/50">Camera & Gallery</span>
                          </div>

                          {/* Quick Luxury Vault Presets */}
                          {QUICK_IMAGE_VAULT.map(img => (
                            <div 
                              key={img.id}
                              onClick={() => handleSendImage(img.url, img.caption)}
                              className="relative rounded-2xl overflow-hidden cursor-pointer group border border-white/10 hover:border-[#D4AF37] aspect-video sm:aspect-auto h-24"
                            >
                              <img src={img.url} alt={img.title} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                              <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent p-2 flex flex-col justify-end">
                                <span className="text-[10px] font-bold text-white truncate">{img.title}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Hidden Device Photo Input */}
                  <input
                    type="file"
                    ref={photoInputRef}
                    onChange={handleDevicePhotoUpload}
                    accept="image/*"
                    className="hidden"
                  />

                  {/* Voice Recording Active Bar */}
                  <AnimatePresence>
                    {isRecording && (
                      <motion.div 
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="px-4 py-2.5 bg-rose-500/10 border-t border-rose-500/30 flex items-center justify-between text-xs text-rose-300"
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                          <span>Recording confidential audio note: <strong>0:0{recordSeconds}</strong></span>
                        </div>
                        <div className="flex items-center gap-2">
                          <button 
                            type="button"
                            onClick={() => setIsRecording(false)}
                            className="px-3 py-1 rounded-full text-xs text-white/60 hover:text-white border border-white/10"
                          >
                            Cancel
                          </button>
                          <button 
                            type="button"
                            onClick={handleSendVoiceNote}
                            className="px-3 py-1 rounded-full text-xs bg-rose-500 text-white font-bold hover:bg-rose-600 transition-colors"
                          >
                            Send Audio Note
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Message Input Toolbar */}
                  <form 
                    onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }} 
                    className="p-2.5 sm:p-3.5 border-t border-white/10 bg-black/60 backdrop-blur-md flex items-center gap-1.5 sm:gap-2 shrink-0"
                  >
                    {/* Share Photo Button */}
                    <button 
                      type="button" 
                      onClick={() => { setIsImageVaultOpen(!isImageVaultOpen); setIsStickerDrawerOpen(false); }}
                      className={`p-2 rounded-full transition-colors shrink-0 ${
                        isImageVaultOpen ? 'text-[#D4AF37] bg-[#D4AF37]/20' : 'text-white/60 hover:text-[#D4AF37] hover:bg-white/5'
                      }`}
                      title="Share High-Definition Photos"
                    >
                      <ImageIcon className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Emojis & Stickers Drawer Toggle */}
                    <button 
                      type="button" 
                      onClick={() => { 
                        if (isStickerDrawerOpen) {
                          setIsStickerDrawerOpen(false);
                        } else {
                          setIsStickerDrawerOpen(true);
                          setDrawerTab('emojis');
                          setIsImageVaultOpen(false);
                        }
                      }}
                      className={`p-2 rounded-full transition-colors shrink-0 ${
                        isStickerDrawerOpen ? 'text-[#D4AF37] bg-[#D4AF37]/20' : 'text-white/60 hover:text-[#D4AF37] hover:bg-white/5'
                      }`}
                      title="Emojis & Luxury Stickers"
                    >
                      <Smile className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Send Bespoke Gift Button (Desktop) */}
                    <button 
                      type="button" 
                      onClick={() => { setModalTab('gifting'); setModalOpen(true); }}
                      className="hidden sm:flex p-2 text-[#D4AF37] hover:bg-[#D4AF37]/20 rounded-full transition-colors shrink-0"
                      title="Send Bespoke Luxury Gift"
                    >
                      <Gift className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <input
                      type="text"
                      placeholder="Compose a confidential dispatch..."
                      value={messageInput}
                      onChange={(e) => setMessageInput(e.target.value)}
                      className="flex-1 min-w-0 px-3.5 py-2 sm:px-4 sm:py-2.5 rounded-full bg-white/5 border border-white/10 text-white placeholder:text-white/30 text-xs sm:text-sm focus:border-[#D4AF37] focus:outline-none transition-colors"
                    />

                    {/* Audio Note Mic Button */}
                    <button 
                      type="button" 
                      onClick={() => setIsRecording(!isRecording)}
                      className={`p-2 rounded-full transition-colors shrink-0 ${
                        isRecording ? 'text-rose-400 bg-rose-500/20' : 'text-white/50 hover:text-[#D4AF37] hover:bg-white/5'
                      }`}
                      title="Record Audio Note"
                    >
                      <Mic className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {/* Send Button */}
                    <button 
                      type="submit" 
                      disabled={!messageInput.trim()}
                      className="p-2 sm:px-4 sm:py-2 rounded-full gold-gradient-bg text-black font-bold text-xs flex items-center justify-center gap-1.5 shadow-md hover:scale-105 active:scale-95 transition-all shrink-0 disabled:opacity-40 disabled:hover:scale-100"
                      title="Send Dispatch"
                    >
                      <Send className="w-4 h-4 text-black" />
                      <span className="hidden sm:inline font-bold">Send</span>
                    </button>
                  </form>
                </>
              )}

            </div>
          )}

        </div>

      </main>

      {/* FULLSCREEN PHOTO LIGHTBOX MODAL */}
      {activeLightboxImage && (
        <div 
          onClick={() => setActiveLightboxImage(null)}
          className="fixed inset-0 z-[9999] bg-black/90 backdrop-blur-md flex items-center justify-center p-4 cursor-pointer"
        >
          <div className="relative max-w-4xl max-h-[85vh]">
            <img 
              src={activeLightboxImage} 
              alt="Expanded view" 
              className="w-full h-full object-contain rounded-3xl border border-[#D4AF37]/50 shadow-2xl"
            />
            <button 
              onClick={() => setActiveLightboxImage(null)}
              className="absolute -top-3 -right-3 w-9 h-9 rounded-full bg-black border border-[#D4AF37] text-white flex items-center justify-center hover:bg-[#D4AF37] hover:text-black transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* NEW CHAT / SELECT MEMBER MODAL */}
      {isNewChatOpen && (
        <div 
          className="fixed inset-0 z-[9990] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsNewChatOpen(false)}
        >
          <div 
            className="w-full max-w-md bg-[#0D0D12] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div>
                <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" /> Start New Dispatch
                </h3>
                <p className="text-[11px] text-white/50 mt-0.5">Select a verified club member to begin private messaging</p>
              </div>
              <button 
                onClick={() => setIsNewChatOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Search Input */}
            <div className="pt-4 pb-3 shrink-0">
              <div className="relative">
                <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search members by name or profession..."
                  value={directorySearch}
                  onChange={(e) => setDirectorySearch(e.target.value)}
                  className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none transition-colors"
                  autoFocus
                />
              </div>
            </div>

            {/* Member List */}
            <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px]">
              {isLoadingDirectory ? (
                <div className="flex flex-col items-center justify-center h-48 text-white/50 text-xs gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-spin" />
                  <span>Loading verified members...</span>
                </div>
              ) : directoryMembers.filter((m: any) => 
                  m.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
                  (m.headline || m.occupation || '').toLowerCase().includes(directorySearch.toLowerCase())
                ).length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <p className="text-white/70 text-xs font-semibold">No other members found</p>
                  <p className="text-white/40 text-[11px] mt-1">Check back as new members receive identity clearance.</p>
                </div>
              ) : (
                directoryMembers
                  .filter((m: any) => 
                    m.name.toLowerCase().includes(directorySearch.toLowerCase()) ||
                    (m.headline || m.occupation || '').toLowerCase().includes(directorySearch.toLowerCase())
                  )
                  .map((member: any) => (
                    <button
                      key={member.id}
                      onClick={() => handleSelectNewChatMember(member)}
                      className="w-full p-3 rounded-2xl bg-white/[0.02] hover:bg-[#D4AF37]/10 border border-white/5 hover:border-[#D4AF37]/40 flex items-center gap-3.5 transition-all text-left group"
                    >
                      <div className="relative shrink-0">
                        {member.photos && member.photos.length > 0 && member.photos[0] ? (
                          <img 
                            src={member.photos[0]} 
                            alt={member.name}
                            className="w-11 h-11 rounded-full object-cover border border-[#D4AF37]/40 group-hover:border-[#D4AF37]" 
                          />
                        ) : (
                          <div className="w-11 h-11 rounded-full bg-gradient-to-br from-[#1E1B13] to-black border border-[#D4AF37]/50 flex items-center justify-center text-[#D4AF37] font-serif font-bold text-sm">
                            {(member.name || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-[#0D0D12]" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center justify-between">
                          <span className="font-serif font-bold text-sm text-white group-hover:text-[#D4AF37] transition-colors truncate">
                            {member.name}{member.age ? `, ${member.age}` : ''}
                          </span>
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-[#D4AF37]/10 text-[#D4AF37] border border-[#D4AF37]/20 uppercase">
                            Clearance Verified
                          </span>
                        </div>
                        <p className="text-[11px] text-white/50 truncate mt-0.5">
                          {member.headline || member.occupation || 'Exclusive Club Member'}
                        </p>
                      </div>
                    </button>
                  ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* 1-ON-1 CALL LOGS MODAL BETWEEN TWO USERS */}
      {isUserCallLogsOpen && activeConv && (
        <div 
          className="fixed inset-0 z-[9992] bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-200"
          onClick={() => setIsUserCallLogsOpen(false)}
        >
          <div 
            className="w-full max-w-lg bg-[#0D0D12] border border-[#D4AF37]/40 rounded-3xl p-6 shadow-2xl relative flex flex-col max-h-[85vh] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-white/10 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                  <PhoneCall className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-serif text-lg font-bold text-white flex items-center gap-2">
                    <span>Call Logs</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 font-sans font-bold">
                      {userCallHistory.length}
                    </span>
                  </h3>
                  <p className="text-[11px] text-white/50">
                    Confidential call records with {activeConv.participant.name}
                  </p>
                </div>
              </div>
              <button 
                onClick={() => setIsUserCallLogsOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-white/60 hover:text-white flex items-center justify-center transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Overview Metric Bar */}
            <div className="grid grid-cols-2 gap-3 my-4 shrink-0">
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Total Encounters</span>
                <span className="font-serif text-xl font-bold text-white mt-1 flex items-center gap-1.5">
                  <Phone className="w-4 h-4 text-[#D4AF37]" /> {userCallHistory.length} calls
                </span>
              </div>
              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/5 flex flex-col">
                <span className="text-[10px] uppercase tracking-wider text-white/40 font-medium">Total Duration</span>
                <span className="font-serif text-xl font-bold text-emerald-400 mt-1 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-400" />
                  {(() => {
                    const totalSecs = userCallHistory.reduce((acc, curr) => acc + (curr.durationSeconds || 0), 0);
                    const mins = Math.floor(totalSecs / 60);
                    const secs = totalSecs % 60;
                    return `${mins}m ${secs}s`;
                  })()}
                </span>
              </div>
            </div>

            {/* Call List */}
            <div className="flex-1 overflow-y-auto space-y-2.5 pr-1 min-h-[220px]">
              {isLoadingUserCalls ? (
                <div className="flex flex-col items-center justify-center h-48 text-white/50 text-xs gap-2">
                  <Sparkles className="w-5 h-5 text-[#D4AF37] animate-spin" />
                  <span>Retrieving encrypted call records...</span>
                </div>
              ) : userCallHistory.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-48 text-center p-4">
                  <div className="w-12 h-12 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-white/30 mb-3">
                    <Phone className="w-5 h-5 text-[#D4AF37]/50" />
                  </div>
                  <p className="text-white/80 text-xs font-bold">No Call History Yet</p>
                  <p className="text-white/40 text-[11px] mt-1 max-w-[240px]">
                    Voice calls and 4K video dates between you and {activeConv.participant.name} will be logged here.
                  </p>
                  <div className="flex items-center gap-2 mt-4">
                    <button
                      onClick={() => {
                        setIsUserCallLogsOpen(false);
                        handleStartCall('voice');
                      }}
                      className="px-3.5 py-1.5 rounded-full bg-white/10 hover:bg-white/20 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      <Phone className="w-3.5 h-3.5 text-[#D4AF37]" /> Start Voice Call
                    </button>
                    <button
                      onClick={() => {
                        setIsUserCallLogsOpen(false);
                        handleStartCall('video');
                      }}
                      className="px-3.5 py-1.5 rounded-full gold-gradient-bg text-black text-xs font-bold flex items-center gap-1.5 hover:scale-105 transition-transform"
                    >
                      <Video className="w-3.5 h-3.5" /> Start 4K Date
                    </button>
                  </div>
                </div>
              ) : (
                userCallHistory.map((call) => (
                  <div 
                    key={call.id}
                    className="p-3.5 rounded-2xl bg-white/[0.03] hover:bg-[#D4AF37]/10 border border-white/5 hover:border-[#D4AF37]/30 transition-all flex items-center justify-between gap-3"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                        call.callType === 'video' ? 'bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/40' : 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                      }`}>
                        {call.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-serif font-bold text-sm text-white truncate">
                            {call.callType === 'video' ? '4K Video Date' : 'HD Voice Call'}
                          </span>
                          <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded uppercase tracking-wider ${
                            call.status === 'completed' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          }`}>
                            {call.status}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-[10px] text-white/40">
                          <span>{call.timestamp}</span>
                          <span>•</span>
                          <span className="text-emerald-400 font-semibold">{call.durationFormatted}</span>
                          <span>•</span>
                          <span className="text-white/60">{call.qualityPreset || '1080p'}</span>
                        </div>
                      </div>
                    </div>

                    <button
                      onClick={() => {
                        setIsUserCallLogsOpen(false);
                        handleStartCall(call.callType);
                      }}
                      className="p-2 rounded-full bg-white/5 hover:bg-[#D4AF37] text-white hover:text-black transition-all border border-white/10 shrink-0"
                      title={`Call ${activeConv.participant.name} again`}
                    >
                      {call.callType === 'video' ? <Video className="w-4 h-4" /> : <Phone className="w-4 h-4" />}
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Modal Bottom Actions */}
            <div className="pt-4 border-t border-white/10 flex items-center justify-between shrink-0">
              <span className="text-[11px] text-white/40 flex items-center gap-1.5">
                <Lock className="w-3 h-3 text-[#D4AF37]" /> End-to-end encrypted WebRTC sessions
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setIsUserCallLogsOpen(false);
                    handleStartCall('voice');
                  }}
                  icon={<Phone className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  className="text-xs"
                >
                  Voice Call
                </Button>
                <Button
                  variant="gold"
                  size="sm"
                  onClick={() => {
                    setIsUserCallLogsOpen(false);
                    handleStartCall('video');
                  }}
                  icon={<Video className="w-3.5 h-3.5 text-black" />}
                  className="text-xs font-bold shadow-lg"
                >
                  4K Video Date
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Credit Wallet, Bespoke Gifting & Elite Tier Upgrade Modal */}
      <CreditsAndGiftingModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); fetchWallet(); }}
        defaultTab={modalTab}
        recipientName={activeConv?.participant?.name || 'Club Member'}
        onGiftSent={handleGiftSentInChat}
        threadId={activeConvId}
      />
    </div>
  );
}

export default function MessagesPage() {
  return (
    <Suspense fallback={
      <div className="h-screen bg-[#070709] flex flex-col items-center justify-center text-[#D4AF37] font-serif">
        <Sparkles className="w-8 h-8 animate-spin mb-3 text-[#D4AF37]" />
        <span>Loading Private Dispatches...</span>
      </div>
    }>
      <MessagesContent />
    </Suspense>
  );
}

