'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { motion, AnimatePresence, useMotionValue, useTransform } from 'framer-motion';
import confetti from 'canvas-confetti';
import { 
  Heart, 
  X, 
  Star, 
  RotateCcw, 
  Bookmark, 
  Filter, 
  Sparkles, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  MessageSquare, 
  ChevronRight,
  SlidersHorizontal,
  Info,
  Crown
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CompatibilityRing } from '@/components/ui/CompatibilityRing';
import { Navigation } from '@/components/ui/Navigation';
import { MemberProfile } from '@/lib/mockData';
import { NIGERIAN_STATES } from '@/lib/locationsData';

export default function DiscoverPage() {
  const [profiles, setProfiles] = useState<MemberProfile[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [activeTab, setActiveTab] = useState<'highly' | 'perfect' | 'recent' | 'popular' | 'nearby'>('highly');
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<MemberProfile | null>(null);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  // Filters state
  const [filterAge, setFilterAge] = useState([21, 45]);
  const [filterDistance, setFilterDistance] = useState(50);
  const [filterLocation, setFilterLocation] = useState('All');
  const [verifiedOnly, setVerifiedOnly] = useState(true);

  // Curated Feed Filter Interests (Member Selection)
  const [selectedCuratedInterests, setSelectedCuratedInterests] = useState<string[]>([]);

  const allInterestOptions = [
    'Art Collector', 'Yachting', 'Michelin Dining', 'Wine Connoisseur', 
    'Equestrian', 'Haute Couture', 'Classical Music', 'Venture Investing', 'Alpine Skiing'
  ];

  // Local user sync for instantaneous photo rendering
  const [localUserData, setLocalUserData] = useState<{ id?: string; name?: string; email?: string; photos: string[] }>({ photos: [] });

  const syncLocalUser = () => {
    if (typeof window === 'undefined') return;
    try {
      let photos: string[] = [];
      let name = '';
      let email = '';
      let id = '';

      const saved = localStorage.getItem('kmc_user_profile');
      if (saved) {
        const parsed = JSON.parse(saved);
        name = parsed.customName || parsed.fullName || parsed.name || '';
        email = parsed.email || '';
        if (parsed.photos && Array.isArray(parsed.photos)) {
          photos = parsed.photos.filter((u: string) => u && u !== '/crown-gold.png');
        } else if (parsed.avatar && parsed.avatar !== '/crown-gold.png') {
          photos = [parsed.avatar];
        }
      }

      const session = localStorage.getItem('kmc_session');
      if (session) {
        const parsedSession = JSON.parse(session);
        if (parsedSession.id) id = parsedSession.id;
        if (!email && parsedSession.email) email = parsedSession.email;
        if (!name && parsedSession.fullName) name = parsedSession.fullName;
      }

      setLocalUserData({ id, name, email, photos });
    } catch {}
  };

  // Fetch profiles from live API
  const fetchLiveDiscover = async () => {
    syncLocalUser();
    try {
      const res = await fetch('/api/discover');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profiles) {
          setProfiles(data.profiles);
        }
      }
    } catch (err) {
      console.log('Discover feed api fallback');
    }
  };

  React.useEffect(() => {
    fetchLiveDiscover();
    const handleProfileUpdate = () => {
      syncLocalUser();
      fetchLiveDiscover();
    };
    const handleOpenFilters = () => {
      setShowFilterDrawer(true);
    };
    window.addEventListener('kmc_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    window.addEventListener('kmc_open_filters', handleOpenFilters);
    return () => {
      window.removeEventListener('kmc_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
      window.removeEventListener('kmc_open_filters', handleOpenFilters);
    };
  }, []);

  const toggleCuratedInterest = (interest: string) => {
    if (selectedCuratedInterests.includes(interest)) {
      setSelectedCuratedInterests(selectedCuratedInterests.filter(i => i !== interest));
    } else {
      setSelectedCuratedInterests([...selectedCuratedInterests, interest]);
    }
  };

  // Filter out current user from discover feed
  const nonSelfProfiles = profiles.filter(p => {
    const isCurrentUser = Boolean(
      (localUserData.id && p.id === localUserData.id) ||
      (localUserData.email && p.id && p.id.toLowerCase() === localUserData.email.toLowerCase()) ||
      (localUserData.email && (p as any).email && (p as any).email.toLowerCase() === localUserData.email.toLowerCase()) ||
      (localUserData.name && p.name && p.name.toLowerCase() === localUserData.name.toLowerCase())
    );
    return !isCurrentUser;
  });

  // Filter profiles strictly based on selected curated interests, age, and location
  const filteredProfiles = nonSelfProfiles.filter(p => {
    const matchesInterests = selectedCuratedInterests.length === 0 || 
      !p.interests || 
      p.interests.length === 0 || 
      p.interests.some(interest => selectedCuratedInterests.includes(interest));
    const matchesAge = isNaN(p.age) || (p.age >= filterAge[0] && p.age <= filterAge[1]);
    const matchesLocation = filterLocation === 'All' || 
      !p.location ||
      p.location.toLowerCase().includes(filterLocation.toLowerCase()) ||
      filterLocation.toLowerCase().includes(p.location.toLowerCase());
    return matchesInterests && matchesAge && matchesLocation;
  });
  const displayProfiles = filteredProfiles.length > 0 ? filteredProfiles : nonSelfProfiles;
  const currentProfile = displayProfiles.length > 0 ? displayProfiles[currentIndex % displayProfiles.length] : null;

  const [actionToast, setActionToast] = useState<{ message: string; type: 'like' | 'pass' | 'superlike' | 'save' } | null>(null);
  const [savedProfiles, setSavedProfiles] = useState<string[]>([]);
  const [swipeHistory, setSwipeHistory] = useState<{ index: number; profile: MemberProfile; action: string }[]>([]);

  const showFeedbackToast = (message: string, type: 'like' | 'pass' | 'superlike' | 'save') => {
    setActionToast({ message, type });
    setTimeout(() => {
      setActionToast(prev => (prev?.message === message ? null : prev));
    }, 2000);
  };

  const handleSwipe = (direction: 'left' | 'right' | 'up') => {
    const profileToSwipe = currentProfile;
    if (!profileToSwipe) return;

    // Record history for undo
    setSwipeHistory(prev => [...prev, { index: currentIndex, profile: profileToSwipe, action: direction }]);

    // Move to next card immediately (optimistic UI update)
    if (displayProfiles.length > 0) {
      setCurrentIndex(prev => (prev + 1) % displayProfiles.length);
      setActivePhotoIndex(0);
    }

    // Instant tactile & visual feedback
    if (direction === 'right') {
      showFeedbackToast(`Liked ${profileToSwipe.name} ❤️`, 'like');
    } else if (direction === 'up') {
      showFeedbackToast(`Super Liked ${profileToSwipe.name}! 🌟`, 'superlike');
    } else {
      showFeedbackToast(`Passed on ${profileToSwipe.name}`, 'pass');
    }

    // Background server dispatch
    const apiAction = direction === 'up' ? 'superlike' : direction === 'right' ? 'like' : 'pass';
    fetch('/api/matches', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        targetUserId: profileToSwipe.id,
        action: apiAction
      })
    })
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          if (data.isMatch) {
            setMatchedProfile(profileToSwipe);
            setShowMatchModal(true);
            confetti({
              particleCount: 80,
              spread: 70,
              origin: { y: 0.6 },
              colors: ['#D4AF37', '#FFF6D6', '#E6C858', '#E0A96D']
            });
          }
        }
      })
      .catch((err) => {
        console.log('Swipe match sync error', err);
      });
  };

  const handleUndo = () => {
    if (swipeHistory.length > 0) {
      const last = swipeHistory[swipeHistory.length - 1];
      setSwipeHistory(prev => prev.slice(0, -1));
      setCurrentIndex(last.index);
      setActivePhotoIndex(0);
      showFeedbackToast(`Reverted to ${last.profile.name}`, 'save');
    } else if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setActivePhotoIndex(0);
      showFeedbackToast('Reverted to previous card', 'save');
    }
  };

  const handleSave = (profileToSave: MemberProfile) => {
    if (!profileToSave) return;
    const isSaved = savedProfiles.includes(profileToSave.id);
    const updated = isSaved 
      ? savedProfiles.filter(id => id !== profileToSave.id)
      : [...savedProfiles, profileToSave.id];
    setSavedProfiles(updated);
    showFeedbackToast(
      isSaved ? `Removed ${profileToSave.name} from saved` : `Saved ${profileToSave.name} to VIP Bookmarks 🔖`,
      'save'
    );
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-x-clip">
      <Navigation />

      {/* Floating Action Feedback Toast */}
      <AnimatePresence>
        {actionToast && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -15, scale: 0.9 }}
            className={`fixed top-20 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full backdrop-blur-2xl border text-xs font-bold shadow-2xl flex items-center gap-2 pointer-events-none transition-all ${
              actionToast.type === 'like'
                ? 'bg-rose-950/90 border-rose-500/60 text-rose-200 shadow-rose-950/50'
                : actionToast.type === 'superlike'
                ? 'bg-amber-950/90 border-amber-400/60 text-amber-200 shadow-amber-950/50'
                : actionToast.type === 'save'
                ? 'bg-[#181508]/95 border-[#D4AF37]/60 text-[#F5E6CA] shadow-[#D4AF37]/20'
                : 'bg-zinc-900/95 border-white/20 text-white/90 shadow-black/60'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>{actionToast.message}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Top Category Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full pb-1 mb-4 scrollbar-none">
          {[
            { id: 'highly', label: 'Curated' },
            { id: 'perfect', label: 'Top Match' },
            { id: 'recent', label: 'New' },
            { id: 'popular', label: 'Popular' },
            { id: 'nearby', label: 'Nearby' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-[#E6C858] to-[#9A7B1C] text-black shadow-[0_0_12px_rgba(212,175,55,0.25)]'
                  : 'glass-panel text-white/70 hover:text-white'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Main Swiping Container */}
        {currentProfile ? (() => {
          const resolvedCardPhotos = currentProfile.photos && currentProfile.photos.length > 0 
            ? currentProfile.photos.filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png')
            : [];

          return (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            
            {/* Left/Center: Interactive Swipe Deck Card (Lg: 8 cols) */}
            <div className="lg:col-span-8 flex flex-col items-center">
              
              <div className="relative w-full max-w-lg aspect-[3/4] sm:aspect-[3/4] max-h-[62vh] sm:max-h-none rounded-3xl overflow-hidden glass-card border-[#D4AF37]/30 shadow-2xl group">
                
                {/* Photo Carousel Navigation Bar */}
                {resolvedCardPhotos.length > 1 && (
                  <div className="absolute top-3 left-4 right-4 z-20 flex gap-1">
                    {resolvedCardPhotos.map((_, pIdx) => (
                      <div
                        key={pIdx}
                        className={`h-1 flex-1 rounded-full transition-all ${
                          pIdx === activePhotoIndex ? 'bg-[#D4AF37]' : 'bg-white/30'
                        }`}
                      />
                    ))}
                  </div>
                )}

                {/* Profile Photo or Luxury Monogram Fallback */}
                {resolvedCardPhotos.length > 0 && resolvedCardPhotos[0] ? (
                  <img
                    src={resolvedCardPhotos[activePhotoIndex % resolvedCardPhotos.length] || resolvedCardPhotos[0]}
                    alt={currentProfile.name}
                    className="w-full h-full object-cover select-none"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#16140D] via-[#0E0D09] to-black flex flex-col items-center justify-center p-8 text-center relative select-none">
                    <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/10 border-2 border-[#D4AF37]/60 flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
                      <span className="font-serif text-4xl font-bold text-[#D4AF37]">
                        {(currentProfile.name || 'M').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-xs uppercase tracking-widest font-bold text-[#D4AF37]">
                      Verified Member
                    </span>
                    <p className="text-xs text-white/50 mt-1">Direct Private Member Profile</p>
                  </div>
                )}

                {/* Photo Tap Controls */}
                {resolvedCardPhotos.length > 1 && (
                  <>
                    <div
                      className="absolute inset-y-0 left-0 w-1/2 z-10 cursor-pointer"
                      onClick={() => setActivePhotoIndex(Math.max(0, activePhotoIndex - 1))}
                    />
                    <div
                      className="absolute inset-y-0 right-0 w-1/2 z-10 cursor-pointer"
                      onClick={() => setActivePhotoIndex(Math.min(resolvedCardPhotos.length - 1, activePhotoIndex + 1))}
                    />
                  </>
                )}

                {/* Subtle Compatibility Badge Top Right */}
                <div className="absolute top-4 right-4 z-20 backdrop-blur-md bg-black/40 px-2 py-0.5 rounded-full border border-[#D4AF37]/30 shadow-md flex items-center gap-1">
                  <span className="text-[10px] font-bold gold-gradient-text">{currentProfile.compatibility}% Match</span>
                </div>

                {/* Minimalist Profile Bottom Gradient Overlay (Photo is 90%+ completely unobstructed) */}
                <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-black/85 via-black/30 to-transparent pt-8 pb-3.5 px-4 sm:px-5">
                  
                  {/* Name, Age & Discreet Verified Icon */}
                  <div className="flex items-center justify-between">
                    <h2 className="text-xl sm:text-2xl font-serif font-bold text-white flex items-center gap-1.5">
                      <span>{currentProfile.name}, {currentProfile.age}</span>
                      <span title="Verified"><ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" /></span>
                      {currentProfile.tier === 'ELITE' && (
                        <span title="Elite Circle"><Crown className="w-3.5 h-3.5 text-amber-400 shrink-0" /></span>
                      )}
                    </h2>
                    <Link 
                      href={`/profile/${currentProfile.id}`}
                      className="p-1.5 rounded-full bg-white/10 hover:bg-[#D4AF37] hover:text-black text-white/80 transition-colors"
                      title="View Details"
                    >
                      <Info className="w-3.5 h-3.5" />
                    </Link>
                  </div>

                  {/* Clean Subtitle */}
                  <p className="text-[11px] sm:text-xs text-white/70 mt-0.5 font-medium">
                    {currentProfile.occupation} • {currentProfile.location}
                  </p>
                </div>

              </div>

              {/* Action Buttons Toolbar */}
              <div className="flex items-center justify-center gap-3.5 mt-4 z-30">
                
                {/* Undo Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={handleUndo}
                  className="w-11 h-11 rounded-full glass-panel flex items-center justify-center text-white/70 hover:text-[#D4AF37] hover:border-[#D4AF37] transition-colors cursor-pointer shadow-md"
                  title="Undo last swipe"
                >
                  <RotateCcw className="w-4 h-4" />
                </motion.button>

                {/* Pass Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('left')}
                  className="w-14 h-14 rounded-full glass-panel border-rose-500/40 text-rose-400 hover:bg-rose-500/20 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                  title="Pass"
                >
                  <X className="w-6 h-6" />
                </motion.button>

                {/* Super Like Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.12 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('up')}
                  className="w-12 h-12 rounded-full glass-panel border-amber-400/40 text-amber-300 hover:bg-amber-400/20 transition-all flex items-center justify-center shadow-lg cursor-pointer"
                  title="Super Like"
                >
                  <Star className="w-5 h-5 fill-amber-300" />
                </motion.button>

                {/* Like Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSwipe('right')}
                  className="w-14 h-14 rounded-full gold-gradient-bg text-black transition-all flex items-center justify-center shadow-xl shadow-[#D4AF37]/30 cursor-pointer"
                  title="Like Profile"
                >
                  <Heart className="w-7 h-7 fill-black" />
                </motion.button>

                {/* Save Profile Button */}
                <motion.button
                  type="button"
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.88 }}
                  onClick={() => handleSave(currentProfile)}
                  className={`w-11 h-11 rounded-full glass-panel flex items-center justify-center transition-colors cursor-pointer shadow-md ${
                    savedProfiles.includes(currentProfile.id)
                      ? 'text-[#D4AF37] border-[#D4AF37] bg-[#D4AF37]/20'
                      : 'text-white/70 hover:text-[#D4AF37] hover:border-[#D4AF37]'
                  }`}
                  title={savedProfiles.includes(currentProfile.id) ? 'Saved' : 'Save to Bookmarks'}
                >
                  <Bookmark className={`w-4 h-4 ${savedProfiles.includes(currentProfile.id) ? 'fill-[#D4AF37]' : ''}`} />
                </motion.button>

              </div>

            </div>

            {/* Right Column: Detailed Compatibility & Lifestyle Breakdown (Lg: 4 cols) */}
            <div className="lg:col-span-4 space-y-4">
              
              <Card className="p-5 border-[#D4AF37]/30">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-bold text-base text-white">Compatibility</h3>
                  <Badge type="compatibility" label={`${currentProfile.compatibility}% MATCH`} />
                </div>

                <div className="space-y-2.5 text-xs">
                  <div>
                    <div className="flex justify-between text-white/80 mb-1">
                      <span>Shared Values</span>
                      <span className="text-[#D4AF37]">98%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#D4AF37] w-[98%]" />
                    </div>
                  </div>

                  <div>
                    <div className="flex justify-between text-white/80 mb-1">
                      <span>Lifestyle Alignment</span>
                      <span className="text-[#D4AF37]">91%</span>
                    </div>
                    <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                      <div className="h-full bg-[#D4AF37] w-[91%]" />
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-white/10">
                  <span className="text-[10px] uppercase tracking-widest text-[#D4AF37] font-semibold block mb-1">
                    Intentions
                  </span>
                  <p className="text-xs text-white/80 italic">
                    "{currentProfile.relationshipGoals}"
                  </p>
                </div>
              </Card>

              {/* Lifestyle Snapshot */}
              <Card className="p-5 border-white/10">
                <h3 className="font-serif font-bold text-base text-white mb-3">Passions</h3>
                
                <div className="flex flex-wrap gap-1.5 mb-4">
                  {currentProfile.interests.map(t => (
                    <Badge key={t} label={t} />
                  ))}
                </div>

                <Link href={`/profile/${currentProfile.id}`}>
                  <Button variant="outline" fullWidth className="text-xs py-2">
                    View Full Profile
                  </Button>
                </Link>
              </Card>

            </div>

          </div>
          );
        })() : (
          <Card className="text-center py-16 max-w-lg mx-auto">
            <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto mb-3" />
            <h2 className="text-2xl font-serif font-bold gold-gradient-text">All Matches Reviewed</h2>
            <p className="text-xs text-white/60 mt-1.5">
              New verified members join daily. Check back soon or refine your discovery filters.
            </p>
            <Button variant="gold" onClick={() => setCurrentIndex(0)} className="mt-5 text-xs">
              Restart Deck
            </Button>
          </Card>
        )}

      </main>

      {/* IT'S A MATCH ✨ CELEBRATION MODAL */}
      <AnimatePresence>
        {showMatchModal && matchedProfile && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-2xl">
            <motion.div
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.8, opacity: 0 }}
              className="max-w-lg w-full text-center relative"
            >
              <h2 className="text-4xl sm:text-6xl font-serif font-bold gold-gradient-text animate-gold-pulse">
                It's a Match ✨
              </h2>
              <p className="text-sm text-[#F5E6CA] mt-2">
                You and <span className="font-bold text-white">{matchedProfile.name}</span> have expressed mutual admiration.
              </p>

              {/* Overlapping Profile Avatars */}
              <div className="flex items-center justify-center gap-4 my-8">
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#D4AF37] to-amber-600 shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center bg-[#111116]">
                  <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-2xl">
                    YOU
                  </div>
                </div>
                <Heart className="w-8 h-8 text-[#D4AF37] fill-[#D4AF37] animate-bounce" />
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#D4AF37] to-amber-600 shadow-[0_0_30px_rgba(212,175,55,0.4)] flex items-center justify-center bg-[#111116] overflow-hidden">
                  {matchedProfile.photos && matchedProfile.photos.length > 0 ? (
                    <img
                      src={matchedProfile.photos[0]}
                      alt={matchedProfile.name}
                      className="w-full h-full rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-2xl">
                      {(matchedProfile.name || 'M').charAt(0).toUpperCase()}
                    </div>
                  )}
                </div>
              </div>

              <div className="space-y-3">
                <Link href={`/messages?recipient=${matchedProfile.id}&name=${encodeURIComponent(matchedProfile.name)}&photo=${encodeURIComponent(matchedProfile.photos?.[0] || '')}`}>
                  <Button variant="gold" fullWidth size="lg" icon={<MessageSquare className="w-5 h-5 text-black" />}>
                    Send a Message to {matchedProfile.name.split(' ')[0]}
                  </Button>
                </Link>
                <Button
                  variant="outline"
                  fullWidth
                  onClick={() => setShowMatchModal(false)}
                >
                  Keep Discovering Members
                </Button>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* FILTER DRAWER MODAL */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex justify-end">
          <div className="w-full max-w-md bg-[#0D0D12] h-full p-6 border-l border-[#D4AF37]/30 flex flex-col justify-between overflow-y-auto">
            <div>
              <div className="flex items-center justify-between pb-4 border-b border-white/10 mb-6">
                <h3 className="text-xl font-serif font-bold text-white">Discovery Preferences</h3>
                <button onClick={() => setShowFilterDrawer(false)} className="p-2 text-white/60 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6 text-sm">
                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-2">Age Preference</label>
                  <div className="flex justify-between text-xs text-[#D4AF37] font-bold mb-2">
                    <span>{filterAge[0]} yrs</span>
                    <span>{filterAge[1]} yrs</span>
                  </div>
                  <input
                    type="range"
                    min="21"
                    max="65"
                    value={filterAge[1]}
                    onChange={(e) => setFilterAge([filterAge[0], parseInt(e.target.value)])}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-2">Maximum Distance (Miles)</label>
                  <span className="text-xs text-[#D4AF37] font-bold block mb-2">{filterDistance} Miles</span>
                  <input
                    type="range"
                    min="5"
                    max="500"
                    value={filterDistance}
                    onChange={(e) => setFilterDistance(parseInt(e.target.value))}
                    className="w-full accent-[#D4AF37]"
                  />
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-2">Location (State / City / Global)</label>
                  <select
                    value={filterLocation}
                    onChange={(e) => setFilterLocation(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-[#D4AF37]/30 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                  >
                    <option value="All">All Locations (Nigeria & Worldwide)</option>
                    {(['FCT', 'South West', 'South East', 'South South', 'North Central', 'North West', 'North East'] as const).map((zone) => {
                      const statesInZone = NIGERIAN_STATES.filter(s => s.zone === zone);
                      if (statesInZone.length === 0) return null;
                      return (
                        <optgroup key={zone} label={`Nigeria — ${zone}`}>
                          {statesInZone.map((s) => (
                            <React.Fragment key={s.state}>
                              <option value={s.state}>📍 {s.state} (All {s.state})</option>
                              {s.cities.map((city) => (
                                <option key={city} value={city}>
                                  &nbsp;&nbsp;• {city}
                                </option>
                              ))}
                            </React.Fragment>
                          ))}
                        </optgroup>
                      );
                    })}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-white/70 block mb-2">Lifestyle & Passions</label>
                  <div className="flex flex-wrap gap-1.5">
                    {allInterestOptions.map((interest) => {
                      const active = selectedCuratedInterests.includes(interest);
                      return (
                        <button
                          key={interest}
                          type="button"
                          onClick={() => toggleCuratedInterest(interest)}
                          className={`px-3 py-1 rounded-full text-xs font-semibold transition-all ${
                            active
                              ? 'bg-[#D4AF37] text-black shadow-sm'
                              : 'bg-white/5 text-white/60 hover:text-white border border-white/10'
                          }`}
                        >
                          {active && '✓ '}{interest}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between py-2 border-t border-white/10">
                  <div>
                    <span className="font-semibold text-white block">Verified Members Only</span>
                    <span className="text-xs text-white/50">Strict identity check requirement</span>
                  </div>
                  <input
                    type="checkbox"
                    checked={verifiedOnly}
                    onChange={(e) => setVerifiedOnly(e.target.checked)}
                    className="w-5 h-5 accent-[#D4AF37]"
                  />
                </div>
              </div>
            </div>

            <Button variant="gold" fullWidth onClick={() => setShowFilterDrawer(false)} className="mt-8">
              Apply Filters
            </Button>
          </div>
        </div>
      )}

    </div>
  );
}
