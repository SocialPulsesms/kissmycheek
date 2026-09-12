'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Flame, 
  Crown, 
  MessageSquare, 
  Sparkles, 
  Trophy, 
  PlusCircle, 
  ShieldCheck, 
  Heart, 
  Share2, 
  MapPin, 
  CheckCircle2, 
  AlertCircle, 
  X, 
  Upload, 
  Clock, 
  Coins, 
  ChevronRight,
  Send,
  Zap,
  Filter,
  Eye,
  ArrowLeft
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Navigation } from '@/components/ui/Navigation';
import { NaughtyPost, NAUGHTY_TAGS, PRIZE_POOL_NAIRA, PRIZE_POOL_DIAMONDS } from '@/lib/naughtyZoneStore';
import { ALL_COUNTRIES, POPULAR_FILTER_CITIES } from '@/lib/locationsData';

const SAMPLE_UPLOADS = [
  {
    url: 'https://images.unsplash.com/photo-1531746020798-e6953c6e8e04?auto=format&fit=crop&w=1200&q=85',
    title: 'Golden Sunset Elegance'
  },
  {
    url: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&w=1200&q=85',
    title: 'High-Society Evening Silk'
  },
  {
    url: 'https://images.unsplash.com/photo-1529626455594-4ff0802cfb7e?auto=format&fit=crop&w=1200&q=85',
    title: 'Velvet Midnight Glamour'
  },
  {
    url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=1200&q=85',
    title: 'Yacht Deck Sunset'
  },
  {
    url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=1200&q=85',
    title: 'Resort Poolside Luxe'
  },
  {
    url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=1200&q=85',
    title: 'Tailored Red Carpet'
  }
];

export default function NaughtyZonePage() {
  const router = useRouter();
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const [posts, setPosts] = useState<NaughtyPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedFilter, setSelectedFilter] = useState<'trending' | 'dms' | 'latest'>('trending');
  const [selectedCity, setSelectedCity] = useState('All Cities');
  const [selectedCountryFilter, setSelectedCountryFilter] = useState('All Countries');

  // Compute clean deduplicated cities for the selected country filter
  const availableCountryCities = useMemo(() => {
    if (selectedCountryFilter === 'All Countries') return [];
    const countryObj = ALL_COUNTRIES.find(c => c.country === selectedCountryFilter);
    if (!countryObj) return [];
    const uniqueNames = new Set<string>();
    countryObj.cities.forEach(c => {
      const short = c.split(' (')[0].trim();
      if (short) uniqueNames.add(short);
    });
    return Array.from(uniqueNames);
  }, [selectedCountryFilter]);

  // Modal states
  const [isPostModalOpen, setIsPostModalOpen] = useState(false);
  const [isTipModalOpen, setIsTipModalOpen] = useState(false);
  const [activeTipPost, setActiveTipPost] = useState<NaughtyPost | null>(null);
  const [tipDiamonds, setTipDiamonds] = useState(50);
  const [tipSuccessMessage, setTipSuccessMessage] = useState<string | null>(null);

  // New Post Form state
  const [newImage, setNewImage] = useState(SAMPLE_UPLOADS[0].url);
  const [uploadedFileName, setUploadedFileName] = useState<string | null>(null);
  const [isUploadedFromDevice, setIsUploadedFromDevice] = useState(false);
  const [newCaption, setNewCaption] = useState('');
  
  // Country & City Selection
  const [selectedCountry, setSelectedCountry] = useState('Nigeria');
  const [selectedCityOption, setSelectedCityOption] = useState('Enugu (Independence Layout)');
  const [customCity, setCustomCity] = useState('');
  const [isCustomCity, setIsCustomCity] = useState(false);

  const [selectedTags, setSelectedTags] = useState<string[]>(['#SexyWears', '#AlluringGlam', '#EnuguFinest']);
  const [pledgeAccepted, setPledgeAccepted] = useState(false);
  const [postSubmitting, setPostSubmitting] = useState(false);
  const [postSuccess, setPostSuccess] = useState(false);

  // Floating flame hearts animation state
  const [floatingHearts, setFloatingHearts] = useState<{ id: number; x: number; y: number }[]>([]);

  // Device File Upload Handler
  const handleDeviceFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate image format
    if (!file.type.startsWith('image/')) {
      alert('Please select a valid image file (JPG, PNG, WebP, HEIC).');
      return;
    }

    // Max 15MB limit
    if (file.size > 15 * 1024 * 1024) {
      alert('File size exceeds 15MB. Please choose a smaller image.');
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      if (result) {
        setNewImage(result);
        setUploadedFileName(file.name);
        setIsUploadedFromDevice(true);
      }
    };
    reader.readAsDataURL(file);
  };

  const removeUploadedFile = () => {
    setUploadedFileName(null);
    setIsUploadedFromDevice(false);
    setNewImage(SAMPLE_UPLOADS[0].url);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Fetch posts
  const fetchLeaderboard = async () => {
    try {
      setLoading(true);
      const cityQuery = selectedCity === 'All Cities' ? 'all' : selectedCity;
      const countryQuery = selectedCountryFilter === 'All Countries' ? 'all' : selectedCountryFilter;
      
      const queryParam = cityQuery !== 'all' ? cityQuery : countryQuery !== 'all' ? countryQuery : 'all';

      const res = await fetch(`/api/naughty-zone?filter=${selectedFilter}&city=${encodeURIComponent(queryParam)}`);
      const data = await res.json();
      if (data.success) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load naughty zone posts:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchLeaderboard();
  }, [selectedFilter, selectedCity, selectedCountryFilter]);

  // Handle Like Action with Flame Animation
  const handleLike = async (post: NaughtyPost, e?: React.MouseEvent) => {
    if (e) {
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      const x = rect.left + rect.width / 2;
      const y = rect.top;
      const id = Date.now() + Math.random();
      setFloatingHearts(prev => [...prev, { id, x, y }]);
      setTimeout(() => {
        setFloatingHearts(prev => prev.filter(h => h.id !== id));
      }, 1500);
    }

    // Optimistic UI update
    setPosts(prev => prev.map(p => {
      if (p.id === post.id) {
        return {
          ...p,
          hasLiked: !p.hasLiked,
          likesCount: p.hasLiked ? Math.max(0, p.likesCount - 1) : p.likesCount + 1
        };
      }
      return p;
    }));

    try {
      await fetch('/api/naughty-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'like', postId: post.id })
      });
    } catch (err) {
      console.error('Failed to like post:', err);
    }
  };

  // Double tap to like
  const handleDoubleTap = (post: NaughtyPost, e: React.MouseEvent) => {
    const x = e.clientX;
    const y = e.clientY;
    const id = Date.now() + Math.random();
    setFloatingHearts(prev => [...prev, { id, x, y }]);
    setTimeout(() => {
      setFloatingHearts(prev => prev.filter(h => h.id !== id));
    }, 1500);

    if (!post.hasLiked) {
      handleLike(post);
    }
  };

  // Handle DM button click
  const handleSlideIntoDM = async (post: NaughtyPost) => {
    try {
      await fetch('/api/naughty-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'dm', postId: post.id })
      });
    } catch (err) {
      console.error('Failed to register DM dispatch:', err);
    }
    // Route into messages with creator
    router.push(`/messages?recipient=${post.author.id}&name=${encodeURIComponent(post.author.name)}&refPost=${post.id}`);
  };

  // Open Tip Modal
  const openTipModal = (post: NaughtyPost) => {
    setActiveTipPost(post);
    setTipDiamonds(50);
    setTipSuccessMessage(null);
    setIsTipModalOpen(true);
  };

  // Submit Diamond Tip
  const handleSendTip = async () => {
    if (!activeTipPost) return;
    try {
      const res = await fetch('/api/naughty-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'tip', postId: activeTipPost.id, diamonds: tipDiamonds })
      });
      const data = await res.json();
      if (data.success) {
        setTipSuccessMessage(`Sent ${tipDiamonds} Diamonds to ${activeTipPost.author.name}! Post boosted! 🔥`);
        setTimeout(() => {
          setIsTipModalOpen(false);
          fetchLeaderboard();
        }, 1800);
      } else {
        alert(data.error || 'Failed to send tip');
      }
    } catch (err) {
      console.error('Error tipping:', err);
    }
  };

  // Handle Post Creation
  const handleCreatePost = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pledgeAccepted) {
      alert('Please accept the sexy wears & non-nudity safety pledge before publishing.');
      return;
    }
    if (!newCaption.trim()) {
      alert('Please write a captivating caption for your picture.');
      return;
    }

    const finalCity = isCustomCity && customCity.trim()
      ? customCity.trim()
      : `${selectedCityOption.split(' (')[0]}, ${selectedCountry}`;

    try {
      setPostSubmitting(true);
      const res = await fetch('/api/naughty-zone', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          image: newImage,
          caption: newCaption,
          tags: selectedTags,
          city: finalCity
        })
      });
      const data = await res.json();
      if (data.success) {
        setPostSuccess(true);
        setTimeout(() => {
          setIsPostModalOpen(false);
          setPostSuccess(false);
          setNewCaption('');
          removeUploadedFile();
          fetchLeaderboard();
        }, 1500);
      }
    } catch (err) {
      console.error('Failed to publish post:', err);
    } finally {
      setPostSubmitting(false);
    }
  };

  const toggleTag = (tag: string) => {
    if (selectedTags.includes(tag)) {
      setSelectedTags(prev => prev.filter(t => t !== tag));
    } else {
      setSelectedTags(prev => [...prev, tag]);
    }
  };

  const top3 = posts.slice(0, 3);
  const podiumOrder = top3.length >= 3 ? [top3[1], top3[0], top3[2]] : top3;

  return (
    <div className="min-h-screen bg-[#070709] text-white pb-32 selection:bg-rose-500 selection:text-white relative overflow-x-clip">
      <Navigation />

      {/* Floating Fire Particles on Likes */}
      {floatingHearts.map(h => (
        <motion.div
          key={h.id}
          initial={{ opacity: 1, scale: 0.8, y: 0, x: 0 }}
          animate={{ opacity: 0, scale: 2.2, y: -120, x: (Math.random() - 0.5) * 60 }}
          transition={{ duration: 1.2, ease: 'easeOut' }}
          className="fixed pointer-events-none z-[9999] text-3xl font-bold filter drop-shadow-[0_0_12px_rgba(255,100,50,0.8)]"
          style={{ left: h.x - 15, top: h.y - 20 }}
        >
          🔥
        </motion.div>
      ))}

      {/* HERO SECTION */}
      <section className="relative pt-4 sm:pt-8 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Glow ambient backgrounds */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-gradient-to-b from-rose-600/20 via-amber-500/15 to-transparent blur-[100px] pointer-events-none" />
        <div className="absolute top-1/4 right-10 w-72 h-72 bg-amber-500/10 blur-[80px] pointer-events-none" />

        {/* Top Floating Minimize / Return Bar */}
        <div className="relative z-20 flex items-center justify-between w-full mb-6">
          <button
            onClick={() => {
              if (window.history.length > 1) {
                window.history.back();
              } else {
                router.push('/discover');
              }
            }}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-black/60 hover:bg-black/80 border border-[#D4AF37]/40 text-white/90 hover:text-white text-xs font-semibold backdrop-blur-xl transition-all shadow-lg active:scale-95 group"
            title="Minimize and return to Discover"
          >
            <ArrowLeft className="w-4 h-4 text-[#D4AF37] group-hover:-translate-x-1 transition-transform" />
            <span>Minimize / Return</span>
          </button>
        </div>

        <div className="relative z-10 text-center flex flex-col items-center">
          
          {/* Flame Pill Badge */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-gradient-to-r from-rose-950/80 via-amber-950/60 to-rose-950/80 border border-rose-500/40 text-rose-300 shadow-[0_0_20px_rgba(244,63,94,0.25)] mb-3"
          >
            <Flame className="w-3.5 h-3.5 text-rose-500 animate-pulse" />
            <span className="text-[11px] font-bold tracking-wider uppercase text-rose-200">🔥 Glamour & Style • No Nudity</span>
            <Sparkles className="w-3 h-3 text-amber-400" />
          </motion.div>

          {/* Main Title */}
          <motion.h1 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="font-serif text-3xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight"
          >
            <span className="bg-gradient-to-r from-rose-400 via-amber-200 to-rose-400 bg-clip-text text-transparent">
              THE NAUGHTY ZONE
            </span>
          </motion.h1>

          <motion.p 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="mt-2 text-xs sm:text-sm text-white/70 max-w-lg leading-relaxed"
          >
            Post your alluring glam looks to compete for the Weekly Crown and prize pool.
          </motion.p>

          {/* PRIZE POOL & RULES BANNER */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
            className="mt-8 w-full max-w-4xl p-0.5 rounded-3xl bg-gradient-to-r from-amber-500/40 via-rose-500/50 to-amber-500/40 shadow-[0_0_40px_rgba(244,63,94,0.2)]"
          >
            <div className="bg-[#0e0c13]/90 backdrop-blur-2xl rounded-[23px] p-5 sm:p-7 flex flex-col md:flex-row items-center justify-between gap-6">
              
              {/* Prize Pool Info */}
              <div className="flex items-center gap-4 text-left">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-500 to-rose-500 p-0.5 shadow-[0_0_20px_rgba(212,175,55,0.4)] flex-shrink-0">
                  <div className="w-full h-full bg-[#09080d] rounded-2xl flex items-center justify-center">
                    <Trophy className="w-7 h-7 text-amber-400" />
                  </div>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase tracking-widest text-amber-400 font-bold">Weekly Grand Prize Pool</span>
                    <span className="px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-300 font-semibold border border-amber-500/30">
                      LIVE RACE
                    </span>
                  </div>
                  <div className="text-2xl sm:text-3xl font-black font-serif text-white flex items-center gap-2">
                    <span className="text-amber-300">{PRIZE_POOL_NAIRA}</span>
                    <span className="text-xs font-normal text-white/50">or {PRIZE_POOL_DIAMONDS.toLocaleString()} Diamonds</span>
                  </div>
                  <p className="text-xs text-white/60 mt-0.5 flex items-center gap-1.5">
                    <Clock className="w-3.5 h-3.5 text-rose-400" />
                    <span>Race resets in: <strong className="text-white">04d : 18h : 32m</strong></span>
                  </p>
                </div>
              </div>

              {/* Strict Non-Nudity Safety Badge & Post CTA */}
              <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
                <div className="hidden sm:flex flex-col items-start text-xs text-white/70 bg-white/5 px-4 py-2.5 rounded-2xl border border-white/10">
                  <div className="flex items-center gap-1.5 text-emerald-400 font-bold">
                    <ShieldCheck className="w-4 h-4 text-emerald-400" />
                    <span>✓ Sexy Wears Allowed</span>
                  </div>
                  <span className="text-[11px] text-white/60">Bikinis, Lingerie & Seduction (No Nude)</span>
                </div>

                <button
                  onClick={() => setIsPostModalOpen(true)}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.7)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                >
                  <PlusCircle className="w-5 h-5" />
                  <span>Post Your Picture</span>
                </button>
              </div>

            </div>
          </motion.div>

          {/* Sexy Wears Style Guide Quick Bar */}
          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 max-w-4xl text-[11px]">
            <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-medium">
              👙 Sexy Bikinis & Beachwear — Allowed ✓
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-medium">
              💋 Luxury Lingerie & Silk — Allowed ✓
            </span>
            <span className="px-3 py-1 rounded-full bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 font-medium">
              👗 Seductive Fits & Bodycon — Allowed ✓
            </span>
            <span className="px-3 py-1 rounded-full bg-rose-950/40 border border-rose-500/30 text-rose-300 font-medium">
              🚫 Explicit Nudity — Prohibited ✗
            </span>
          </div>

        </div>
      </section>

      {/* TOP 3 PODIUM OF CHAMPIONS */}
      {top3.length > 0 && (
        <section className="py-8 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
          <div className="flex items-center justify-center gap-2 mb-6">
            <Crown className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg sm:text-xl font-bold uppercase tracking-widest text-amber-200">
              Podium of Champions
            </h2>
            <Crown className="w-5 h-5 text-amber-400" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
            {podiumOrder.map((post, idx) => {
              const isFirst = post.rank === 1;
              const isSecond = post.rank === 2;
              const isThird = post.rank === 3;

              return (
                <motion.div
                  key={post.id}
                  initial={{ opacity: 0, y: 30 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * idx }}
                  className={`relative rounded-3xl overflow-hidden glass-card transition-all duration-300 ${
                    isFirst 
                      ? 'border-2 border-amber-400 shadow-[0_0_35px_rgba(212,175,55,0.35)] md:-translate-y-4 order-first md:order-none' 
                      : isSecond 
                        ? 'border border-slate-300/50 shadow-[0_0_25px_rgba(203,213,225,0.2)]' 
                        : 'border border-amber-700/50 shadow-[0_0_25px_rgba(180,83,9,0.2)]'
                  }`}
                >
                  {/* Glowing Top Banner */}
                  <div className={`py-2 px-4 text-center font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 ${
                    isFirst 
                      ? 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-black shadow-md' 
                      : isSecond 
                        ? 'bg-gradient-to-r from-slate-400 via-slate-200 to-slate-400 text-black' 
                        : 'bg-gradient-to-r from-amber-800 via-amber-600 to-amber-800 text-white'
                  }`}>
                    {isFirst && <Crown className="w-4 h-4 text-black animate-bounce" />}
                    <span>{isFirst ? '👑 #1 Gold Crown' : isSecond ? '🥈 #2 Silver Crown' : '🥉 #3 Bronze Crown'}</span>
                  </div>

                  {/* Photo Container */}
                  <div 
                    className="relative h-72 sm:h-80 w-full overflow-hidden cursor-pointer group"
                    onDoubleClick={(e) => handleDoubleTap(post, e)}
                  >
                    <img 
                      src={post.image} 
                      alt={post.author.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

                    {/* City Badge & Double tap hint */}
                    <div className="absolute top-3 left-3 px-2.5 py-1 rounded-full bg-black/60 backdrop-blur-md text-[11px] font-semibold text-white/90 border border-white/15 flex items-center gap-1">
                      <MapPin className="w-3 h-3 text-rose-400" />
                      <span>{post.city}</span>
                    </div>

                    {/* Creator Info on Image */}
                    <div className="absolute bottom-3 left-3 right-3">
                      <div className="flex items-center gap-2.5">
                        <img 
                          src={post.author?.photos?.[0] || post.image || '/default-avatar.png'} 
                          alt={post.author?.name || 'Creator'}
                          className="w-10 h-10 rounded-full border-2 border-amber-400 object-cover"
                        />
                        <div>
                          <div className="flex items-center gap-1.5">
                            <span className="font-bold text-white text-sm">{post.author?.name || 'Creator'}</span>
                            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          </div>
                          <p className="text-[11px] text-white/70 truncate max-w-[200px]">{post.caption}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Stats & Actions */}
                  <div className="p-4 bg-[#0d0c11] flex flex-col gap-3">
                    <div className="grid grid-cols-3 gap-2 py-2 px-3 rounded-2xl bg-black/50 border border-white/5 text-center">
                      <div>
                        <span className="text-[10px] uppercase text-white/50 block">Likes</span>
                        <span className="text-xs sm:text-sm font-bold text-rose-400 flex items-center justify-center gap-1">
                          <Flame className="w-3.5 h-3.5" />
                          {post.likesCount.toLocaleString()}
                        </span>
                      </div>
                      <div className="border-x border-white/10">
                        <span className="text-[10px] uppercase text-white/50 block">DMs</span>
                        <span className="text-xs sm:text-sm font-bold text-cyan-400 flex items-center justify-center gap-1">
                          <MessageSquare className="w-3.5 h-3.5" />
                          {post.dmsCount}
                        </span>
                      </div>
                      <div>
                        <span className="text-[10px] uppercase text-white/50 block">Tips</span>
                        <span className="text-xs sm:text-sm font-bold text-amber-400 flex items-center justify-center gap-1">
                          💎 {post.diamondsTipped}
                        </span>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div className="flex items-center gap-2">
                      <button
                        onClick={(e) => handleLike(post, e)}
                        className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                          post.hasLiked 
                            ? 'bg-rose-600 text-white shadow-[0_0_15px_rgba(244,63,94,0.5)]' 
                            : 'bg-white/10 text-white hover:bg-rose-600/30'
                        }`}
                      >
                        <Flame className={`w-4 h-4 ${post.hasLiked ? 'fill-white' : 'text-rose-400'}`} />
                        <span>{post.hasLiked ? 'Fired Up 🔥' : 'Fire 🔥'}</span>
                      </button>

                      <button
                        onClick={() => handleSlideIntoDM(post)}
                        className="flex-1 py-2 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                      >
                        <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                        <span>Slide DM</span>
                      </button>

                      <button
                        onClick={() => openTipModal(post)}
                        className="p-2 rounded-xl bg-white/10 hover:bg-amber-500/20 text-amber-300 border border-white/10 transition-colors"
                        title="Tip Diamonds"
                      >
                        💎
                      </button>
                    </div>

                  </div>
                </motion.div>
              );
            })}
          </div>
        </section>
      )}

      {/* FILTER TABS & CITY SELECTOR */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4 border-y border-white/10 py-4">
          
          {/* Main Filter Tabs */}
          <div className="flex items-center gap-2 bg-black/60 p-1.5 rounded-2xl border border-white/10 w-full md:w-auto overflow-x-auto">
            <button
              onClick={() => setSelectedFilter('trending')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                selectedFilter === 'trending'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Flame className="w-4 h-4 text-amber-300" />
              <span>🔥 Trending Race</span>
            </button>

            <button
              onClick={() => setSelectedFilter('dms')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                selectedFilter === 'dms'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <MessageSquare className="w-4 h-4 text-cyan-300" />
              <span>💬 Most Desired (DMs)</span>
            </button>

            <button
              onClick={() => setSelectedFilter('latest')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
                selectedFilter === 'latest'
                  ? 'bg-gradient-to-r from-rose-600 to-amber-500 text-white shadow-md'
                  : 'text-white/60 hover:text-white'
              }`}
            >
              <Zap className="w-4 h-4 text-yellow-300" />
              <span>⚡ Just Dropped</span>
            </button>
          </div>

          {/* Country & City Filter Selector */}
          <div className="flex flex-wrap items-center gap-2 w-full md:w-auto">
            {/* Country Dropdown */}
            <select
              value={selectedCountryFilter}
              onChange={(e) => {
                setSelectedCountryFilter(e.target.value);
                setSelectedCity('All Cities');
              }}
              className="px-3 py-2 rounded-xl bg-black/80 border border-white/15 text-white text-xs font-semibold focus:outline-none focus:border-amber-400 cursor-pointer shadow-sm"
            >
              <option value="All Countries">🌍 All Countries</option>
              {ALL_COUNTRIES.map(c => (
                <option key={c.country} value={c.country} className="bg-[#0e0c13] text-white">
                  {c.flag} {c.country}
                </option>
              ))}
            </select>

            {/* City Pills Horizontal Scroll */}
            <div className="flex items-center gap-1.5 overflow-x-auto max-w-full md:max-w-xl pb-1 md:pb-0 scrollbar-none">
              {selectedCountryFilter === 'All Countries' ? (
                POPULAR_FILTER_CITIES.map(city => (
                  <button
                    key={city}
                    onClick={() => setSelectedCity(city)}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCity === city
                        ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                  >
                    {city}
                  </button>
                ))
              ) : (
                <>
                  <button
                    onClick={() => setSelectedCity('All Cities')}
                    className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                      selectedCity === 'All Cities'
                        ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                        : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                    }`}
                  >
                    All {selectedCountryFilter} Cities
                  </button>
                  {availableCountryCities.map(shortCity => (
                    <button
                      key={shortCity}
                      onClick={() => setSelectedCity(shortCity)}
                      className={`px-3 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                        selectedCity === shortCity
                          ? 'bg-amber-400 text-black font-bold shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                          : 'bg-white/5 text-white/70 hover:bg-white/10 hover:text-white border border-white/5'
                      }`}
                    >
                      {shortCity}
                    </button>
                  ))}
                </>
              )}
            </div>
          </div>

        </div>
      </section>

      {/* COMPETITION PHOTO FEED GRID */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {loading ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-3">
            <Flame className="w-10 h-10 text-rose-500 animate-spin" />
            <p className="text-sm text-white/60">Igniting the race leaderboard...</p>
          </div>
        ) : posts.length === 0 ? (
          <div className="py-20 text-center flex flex-col items-center justify-center gap-4 glass-card rounded-3xl p-8 max-w-md mx-auto">
            <Flame className="w-12 h-12 text-rose-400/50" />
            <h3 className="text-lg font-bold text-white">No photos in {selectedCity} yet</h3>
            <p className="text-xs text-white/60">Be the first to post your picture from this city and claim the top spot!</p>
            <button
              onClick={() => {
                if (selectedCity !== 'All Cities') {
                  setSelectedCityOption(selectedCity);
                }
                setIsPostModalOpen(true);
              }}
              className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold text-xs shadow-md"
            >
              Post Your Picture
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {posts.map((post) => (
              <motion.div
                key={post.id}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="group relative rounded-3xl overflow-hidden glass-card border border-white/10 hover:border-rose-500/40 transition-all duration-300 flex flex-col justify-between bg-[#0d0c11]"
              >
                {/* Author Header */}
                <div className="p-3.5 flex items-center justify-between z-10 bg-gradient-to-b from-black/80 to-transparent">
                  <div className="flex items-center gap-2.5">
                    <img 
                      src={post.author?.photos?.[0] || post.image || '/default-avatar.png'} 
                      alt={post.author?.name || 'Creator'}
                      className="w-9 h-9 rounded-full object-cover border border-amber-400/60"
                    />
                    <div>
                      <div className="flex items-center gap-1">
                        <span className="font-bold text-xs text-white">{post.author?.name || 'Creator'}</span>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      </div>
                      <span className="text-[10px] text-white/50">{post.city} • {post.createdAt}</span>
                    </div>
                  </div>

                  {/* Rank Badge */}
                  <span className={`px-2.5 py-1 rounded-full text-[11px] font-black tracking-wider ${
                    post.rank === 1 
                      ? 'bg-amber-400 text-black shadow-[0_0_15px_rgba(212,175,55,0.6)]' 
                      : post.rank === 2 
                        ? 'bg-slate-300 text-black' 
                        : post.rank === 3 
                          ? 'bg-amber-700 text-white' 
                          : 'bg-white/10 text-white/80'
                  }`}>
                    #{post.rank}
                  </span>
                </div>

                {/* Photo with double-tap like */}
                <div 
                  className="relative aspect-[4/5] w-full overflow-hidden cursor-pointer"
                  onDoubleClick={(e) => handleDoubleTap(post, e)}
                >
                  <img 
                    src={post.image} 
                    alt={post.caption}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent opacity-80" />

                  {/* Floating Like Count & DM stats badge on image */}
                  <div className="absolute top-3 right-3 flex items-center gap-1.5">
                    <div className="px-2 py-1 rounded-full bg-black/60 backdrop-blur-md border border-white/10 text-[11px] font-bold text-rose-400 flex items-center gap-1">
                      <Flame className="w-3.5 h-3.5 fill-rose-400" />
                      <span>{post.likesCount}</span>
                    </div>
                  </div>

                  {/* Double click instruction overlay on hover */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/30 pointer-events-none">
                    <span className="text-xs bg-black/70 backdrop-blur-md px-3 py-1.5 rounded-full text-white/90 border border-white/20 font-medium">
                      Double-tap to Flame 🔥
                    </span>
                  </div>
                </div>

                {/* Card Content & Action Bar */}
                <div className="p-4 flex flex-col gap-3">
                  
                  {/* Caption & Hashtags */}
                  <p className="text-xs text-white/90 leading-snug line-clamp-2">
                    {post.caption}
                  </p>

                  <div className="flex flex-wrap gap-1">
                    {post.tags.map(tag => (
                      <span key={tag} className="text-[10px] text-amber-300/80 font-medium">
                        {tag}
                      </span>
                    ))}
                  </div>

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-white/10 flex items-center justify-between gap-2">
                    
                    {/* Flame Like Button */}
                    <button
                      onClick={(e) => handleLike(post, e)}
                      className={`flex-1 py-2 px-3 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                        post.hasLiked 
                          ? 'bg-rose-600 text-white shadow-[0_0_12px_rgba(244,63,94,0.4)]' 
                          : 'bg-white/5 hover:bg-rose-500/20 text-white/80 border border-white/10'
                      }`}
                    >
                      <Flame className={`w-4 h-4 ${post.hasLiked ? 'fill-white text-white' : 'text-rose-400'}`} />
                      <span>{post.likesCount}</span>
                    </button>

                    {/* Slide into DM Button */}
                    <button
                      onClick={() => handleSlideIntoDM(post)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 hover:from-amber-500/30 hover:to-rose-500/30 border border-amber-500/40 text-amber-200 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                    >
                      <MessageSquare className="w-3.5 h-3.5 text-amber-400" />
                      <span>DM ({post.dmsCount})</span>
                    </button>

                    {/* Tip Diamonds */}
                    <button
                      onClick={() => openTipModal(post)}
                      className="p-2 rounded-xl bg-white/5 hover:bg-amber-500/20 text-amber-300 border border-white/10 transition-colors"
                      title="Tip Diamonds & Boost Rank"
                    >
                      💎
                    </button>

                  </div>

                </div>

              </motion.div>
            ))}
          </div>
        )}
      </section>

      {/* POST YOUR PICTURE MODAL */}
      <AnimatePresence>
        {isPostModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="bg-[#0e0c13] border border-[#D4AF37]/40 rounded-3xl p-6 sm:p-8 max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(244,63,94,0.3)] relative text-white"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsPostModalOpen(false)}
                className="absolute top-5 right-5 p-2 rounded-full text-white/60 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              {/* Modal Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 p-0.5 flex-shrink-0">
                  <div className="w-full h-full bg-[#070709] rounded-2xl flex items-center justify-center">
                    <Flame className="w-6 h-6 text-rose-500" />
                  </div>
                </div>
                <div>
                  <h3 className="font-serif text-2xl font-bold text-white">Post to Naughty Zone</h3>
                  <p className="text-xs text-white/60">Enter the live race for the {PRIZE_POOL_NAIRA} Weekly Crown</p>
                </div>
              </div>

              {/* Sexy Wears Allowed Callout Box */}
              <div className="mb-5 p-3 rounded-2xl bg-gradient-to-r from-emerald-950/50 via-amber-950/40 to-emerald-950/50 border border-emerald-500/30 flex items-center gap-2.5 text-xs text-emerald-200">
                <ShieldCheck className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                <span>
                  <strong>Sexy Wears Allowed & Welcomed!</strong> Seductive bikinis, luxury lingerie, evening glam, and alluring styles are fully permitted. Only explicit nudity is prohibited.
                </span>
              </div>

              {postSuccess ? (
                <div className="py-12 text-center flex flex-col items-center justify-center gap-3">
                  <div className="w-16 h-16 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center text-3xl mb-2">
                    🔥
                  </div>
                  <h4 className="text-xl font-bold text-white">Photo Published to Live Race!</h4>
                  <p className="text-xs text-white/70">Your picture is now live on the leaderboard. Watch your flames and DMs soar!</p>
                </div>
              ) : (
                <form onSubmit={handleCreatePost} className="space-y-5">
                  
                  {/* Photo Upload Area (Device Upload + Presets) */}
                  <div>
                    <div className="flex items-center justify-between mb-2">
                      <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                        Your Picture (Device Upload or Preset)
                      </label>
                      {isUploadedFromDevice && (
                        <button
                          type="button"
                          onClick={removeUploadedFile}
                          className="text-[11px] text-rose-400 hover:text-rose-300 flex items-center gap-1 font-semibold"
                        >
                          <X className="w-3.5 h-3.5" />
                          <span>Remove upload</span>
                        </button>
                      )}
                    </div>

                    {/* Hidden native file input */}
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handleDeviceFileUpload}
                      className="hidden"
                    />

                    {/* Device Upload Drag/Click Zone */}
                    <div
                      onClick={() => fileInputRef.current?.click()}
                      className={`p-4 rounded-2xl border-2 border-dashed transition-all cursor-pointer text-center mb-3 flex flex-col items-center justify-center gap-2 ${
                        isUploadedFromDevice
                          ? 'border-emerald-400/60 bg-emerald-950/20'
                          : 'border-[#D4AF37]/40 bg-white/5 hover:bg-white/10 hover:border-[#D4AF37]'
                      }`}
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center text-white shadow-md">
                        <Upload className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-white block">
                          {isUploadedFromDevice ? `Uploaded: ${uploadedFileName}` : '📁 Upload Photo Directly From Your Device'}
                        </span>
                        <span className="text-[11px] text-white/50">
                          Tap to select from phone gallery, camera, or computer • JPG, PNG, WebP (up to 15MB)
                        </span>
                      </div>
                    </div>

                    {/* Selected Image Preview */}
                    <div className="relative aspect-[16/10] rounded-2xl overflow-hidden border border-white/20 mb-3 bg-black">
                      <img 
                        src={newImage} 
                        alt="Selected Preview" 
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute bottom-2 left-2 px-2.5 py-1 rounded-full bg-black/70 backdrop-blur-md text-[10px] text-white/80 border border-white/15 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{isUploadedFromDevice ? 'Device Photo Ready' : 'Sample Preset Selected'}</span>
                      </div>
                    </div>

                    {/* Curated Sample Media Presets */}
                    <div>
                      <p className="text-[11px] text-white/50 mb-1.5 flex items-center justify-between">
                        <span>Or select curated sample:</span>
                        {isUploadedFromDevice && <span className="text-amber-400/80 text-[10px]">Click sample to replace</span>}
                      </p>
                      <div className="grid grid-cols-6 gap-2">
                        {SAMPLE_UPLOADS.map((sample, idx) => (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setNewImage(sample.url);
                              setIsUploadedFromDevice(false);
                              setUploadedFileName(null);
                            }}
                            className={`aspect-square rounded-xl overflow-hidden border-2 transition-all ${
                              newImage === sample.url && !isUploadedFromDevice
                                ? 'border-amber-400 scale-105 shadow-[0_0_10px_rgba(212,175,55,0.6)]' 
                                : 'border-transparent opacity-60 hover:opacity-100'
                            }`}
                          >
                            <img src={sample.url} alt={sample.title} className="w-full h-full object-cover" />
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Caption */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-2">
                      Caption (Allure & Chemistry)
                    </label>
                    <textarea
                      value={newCaption}
                      onChange={(e) => setNewCaption(e.target.value)}
                      placeholder="e.g. Stepping out in Enugu for the midnight masquerade. Who is joining my VIP table? 🔥"
                      rows={3}
                      className="w-full px-4 py-3 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-white/30 focus:outline-none focus:border-amber-400 resize-none"
                    />
                  </div>

                  {/* Country & City Cascading Selector */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Country Selector */}
                    <div>
                      <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-1.5">
                        Country
                      </label>
                      <select
                        value={selectedCountry}
                        onChange={(e) => {
                          const country = e.target.value;
                          setSelectedCountry(country);
                          const countryData = ALL_COUNTRIES.find(c => c.country === country);
                          if (countryData && countryData.cities.length > 0) {
                            setSelectedCityOption(countryData.cities[0]);
                          }
                        }}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                      >
                        {ALL_COUNTRIES.map((c) => (
                          <option key={c.country} value={c.country} className="bg-[#0e0c13] text-white">
                            {c.flag} {c.country}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* City Selector */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-white/70">
                          City / District
                        </label>
                        <button
                          type="button"
                          onClick={() => setIsCustomCity(!isCustomCity)}
                          className="text-[10px] text-amber-400 hover:underline"
                        >
                          {isCustomCity ? 'Choose from list' : '+ Custom city'}
                        </button>
                      </div>

                      {isCustomCity ? (
                        <input
                          type="text"
                          value={customCity}
                          onChange={(e) => setCustomCity(e.target.value)}
                          placeholder="e.g. Lekki Phase 1, Lagos"
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-amber-400/50 text-white text-xs focus:outline-none"
                        />
                      ) : (
                        <select
                          value={selectedCityOption}
                          onChange={(e) => setSelectedCityOption(e.target.value)}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs focus:outline-none focus:border-amber-400 cursor-pointer"
                        >
                          {(ALL_COUNTRIES.find(c => c.country === selectedCountry)?.cities || []).map((city) => (
                            <option key={city} value={city} className="bg-[#0e0c13] text-white">
                              {city}
                            </option>
                          ))}
                        </select>
                      )}
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <label className="text-xs font-bold uppercase tracking-wider text-white/70 block mb-2">
                      Hashtags & Category
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {NAUGHTY_TAGS.map(tag => {
                        const isSelected = selectedTags.includes(tag);
                        return (
                          <button
                            key={tag}
                            type="button"
                            onClick={() => toggleTag(tag)}
                            className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all ${
                              isSelected
                                ? 'bg-gradient-to-r from-rose-500 to-amber-500 text-white font-bold shadow-sm'
                                : 'bg-white/5 text-white/60 hover:bg-white/10'
                            }`}
                          >
                            {tag}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* STRICT NON-NUDITY SAFETY PLEDGE */}
                  <div className="p-4 rounded-2xl bg-rose-950/30 border border-rose-500/30">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input 
                        type="checkbox"
                        checked={pledgeAccepted}
                        onChange={(e) => setPledgeAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 rounded text-rose-500 focus:ring-rose-400 bg-black border-white/20"
                      />
                      <div className="text-xs text-white/80">
                        <span className="font-bold text-emerald-400 block mb-0.5">✓ Sexy Wears & Non-Nudity Safety Pledge</span>
                        I confirm this photo celebrates <strong>sexy wears, seductive lingerie, bikinis, or luxury fashion</strong> and contains <strong>NO explicit nudity</strong>.
                      </div>
                    </label>
                  </div>

                  {/* Submit Button */}
                  <button
                    type="submit"
                    disabled={postSubmitting || !pledgeAccepted}
                    className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 via-amber-500 to-rose-600 text-white font-bold text-sm tracking-wide shadow-[0_0_25px_rgba(244,63,94,0.4)] hover:shadow-[0_0_35px_rgba(244,63,94,0.7)] disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
                  >
                    {postSubmitting ? (
                      <>
                        <Flame className="w-5 h-5 animate-spin" />
                        <span>Publishing to Race...</span>
                      </>
                    ) : (
                      <>
                        <Flame className="w-5 h-5" />
                        <span>Ignite My Entry 🔥</span>
                      </>
                    )}
                  </button>

                </form>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* DIAMOND TIP MODAL */}
      <AnimatePresence>
        {isTipModalOpen && activeTipPost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xl">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-[#0e0c13] border border-amber-400/40 rounded-3xl p-6 max-w-sm w-full shadow-[0_0_40px_rgba(212,175,55,0.3)] relative text-white"
            >
              <button
                onClick={() => setIsTipModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-white/60 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="text-center flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-amber-400 to-amber-600 p-0.5 mb-3 shadow-[0_0_20px_rgba(212,175,55,0.5)]">
                  <div className="w-full h-full bg-black rounded-2xl flex items-center justify-center text-2xl">
                    💎
                  </div>
                </div>

                <h4 className="font-serif text-xl font-bold text-white">
                  Tip & Boost Rank
                </h4>
                <p className="text-xs text-white/60 mt-1">
                  Boost <strong className="text-amber-300">{activeTipPost.author.name}</strong> on the Leaderboard
                </p>

                {tipSuccessMessage ? (
                  <div className="py-6 text-emerald-400 font-bold text-sm flex flex-col items-center gap-2">
                    <CheckCircle2 className="w-8 h-8" />
                    <span>{tipSuccessMessage}</span>
                  </div>
                ) : (
                  <div className="w-full mt-6 space-y-4">
                    <div className="grid grid-cols-4 gap-2">
                      {[25, 50, 100, 250].map((amt) => (
                        <button
                          key={amt}
                          type="button"
                          onClick={() => setTipDiamonds(amt)}
                          className={`py-2.5 rounded-xl text-xs font-bold transition-all border ${
                            tipDiamonds === amt
                              ? 'bg-amber-400 text-black border-amber-300 shadow-[0_0_12px_rgba(212,175,55,0.5)]'
                              : 'bg-white/5 text-white/80 border-white/10 hover:bg-white/10'
                          }`}
                        >
                          {amt} 💎
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={handleSendTip}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-400 via-amber-500 to-amber-600 text-black font-bold text-xs tracking-wider uppercase shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>Send {tipDiamonds} Diamonds Tip</span>
                    </button>

                    <Link 
                      href="/boost" 
                      className="text-[11px] text-amber-400/80 hover:underline block text-center"
                    >
                      Need more Diamonds? Top up wallet →
                    </Link>
                  </div>
                )}

              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

    </div>
  );
}
