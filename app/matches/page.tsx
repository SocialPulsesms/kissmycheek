'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Heart, Lock, Sparkles, MessageSquare, ShieldCheck, Clock, CheckCircle, Eye } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { MemberProfile } from '@/lib/mockData';

export default function MatchesPage() {
  const [activeTab, setActiveTab] = useState<'likedYou' | 'youLiked' | 'mutual' | 'expiring'>('likedYou');
  const [isPremiumUser, setIsPremiumUser] = useState(true); // Toggle to test blur/reveal
  
  // Live matches state
  const [likesData, setLikesData] = useState<{
    likedYou: MemberProfile[];
    mutual: MemberProfile[];
    youLiked: MemberProfile[];
    expiring: MemberProfile[];
  }>({
    likedYou: [],
    mutual: [],
    youLiked: [],
    expiring: []
  });

  const [counts, setCounts] = useState({
    likedYou: 0,
    mutual: 0,
    youLiked: 0,
    expiring: 0
  });

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.likes) {
          setLikesData(data.likes);
          setCounts(data.counts);
        }
      }
    } catch (err) {
      console.log('Fallback matches data');
    }
  };

  useEffect(() => {
    fetchMatches();
  }, []);

  const handleMatchAction = async (targetUserId: string) => {
    try {
      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetUserId, action: 'like' })
      });
      if (res.ok) {
        fetchMatches();
      }
    } catch (err) {
      console.log('Match action error');
    }
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-x-clip">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Header Title */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <div>
            <Badge type="tier" label="CONNECTIONS" />
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mt-1.5 gold-gradient-text">
              Likes & Connections
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Members who liked your profile and mutual connections.
            </p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex items-center gap-2 overflow-x-auto pb-3 mb-6 border-b border-white/10 scrollbar-none">
          {[
            { id: 'likedYou', label: 'Liked You', count: counts.likedYou },
            { id: 'mutual', label: 'Mutual', count: counts.mutual },
            { id: 'youLiked', label: 'You Liked', count: counts.youLiked },
            { id: 'expiring', label: 'Expiring', count: counts.expiring },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-5 py-2.5 rounded-full text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-2 ${
                activeTab === tab.id
                  ? 'bg-[#D4AF37] text-black shadow-lg shadow-[#D4AF37]/25'
                  : 'glass-panel text-white/70 hover:text-white'
              }`}
            >
              <span>{tab.label}</span>
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                activeTab === tab.id ? 'bg-black text-[#D4AF37]' : 'bg-white/10 text-white'
              }`}>
                {tab.count}
              </span>
            </button>
          ))}
        </div>

        {/* LIKED YOU GRID */}
        {activeTab === 'likedYou' && (
          likesData.likedYou.length === 0 ? (
            <Card className="text-center py-16 max-w-lg mx-auto border-white/10">
              <Heart className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-80" />
              <h3 className="font-serif text-xl font-bold text-white">No Admirers Yet</h3>
              <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                Members who like your profile will appear here. Swipe on Discovery to connect with more verified patrons.
              </p>
              <Link href="/discover" className="inline-block mt-4">
                <Button variant="gold" size="sm">Explore Discovery Deck</Button>
              </Link>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {likesData.likedYou.map((profile, i) => (
              <motion.div
                key={profile.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.4, delay: i * 0.1 }}
              >
                <Card className="p-0 h-[380px] border-[#D4AF37]/30 group relative overflow-hidden">
                  
                  {/* Photo or Gold Monogram */}
                  {profile.photos && profile.photos.length > 0 && profile.photos[0] && !profile.photos[0].includes('unsplash.com') ? (
                    <img
                      src={profile.photos[0]}
                      alt={profile.name}
                      className={`w-full h-full object-cover transition-all duration-500 ${
                        !isPremiumUser ? 'blur-xl scale-110' : 'group-hover:scale-105'
                      }`}
                    />
                  ) : (
                    <div className={`w-full h-full bg-gradient-to-br from-[#1E1B13] via-[#12110C] to-black flex flex-col items-center justify-center p-6 text-center ${
                      !isPremiumUser ? 'blur-md' : ''
                    }`}>
                      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/10 border-2 border-[#D4AF37] flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                        <span className="font-serif text-3xl font-bold text-[#D4AF37]">
                          {(profile.name || 'M').charAt(0).toUpperCase()}
                        </span>
                      </div>
                      <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">
                        Verified Member
                      </span>
                    </div>
                  )}

                  {/* Lock Overlay for Essential Users */}
                  {!isPremiumUser ? (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md p-6 flex flex-col items-center justify-center text-center z-20">
                      <Lock className="w-10 h-10 text-[#D4AF37] mb-3 animate-pulse" />
                      <h4 className="font-serif text-lg font-bold text-white">Admirer Locked</h4>
                      <p className="text-xs text-white/70 mt-1 mb-4">
                        Upgrade to Premium or Elite membership to instantly unblur and match with admirers.
                      </p>
                      <Link href="/membership">
                        <Button variant="gold" size="sm">Unlock Admirers</Button>
                      </Link>
                    </div>
                  ) : (
                    /* Revealed Profile Card Overlay */
                    <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent p-5 flex flex-col justify-end">
                      <div className="flex items-center justify-between mb-1">
                        <Badge type="verified" label="Verified" />
                        <span className="text-xs font-bold text-[#D4AF37] bg-black/60 px-2.5 py-0.5 rounded-full border border-[#D4AF37]/30">
                          {profile.compatibility}% Match
                        </span>
                      </div>
                      <h3 className="text-xl font-serif font-bold text-white">{profile.name}, {profile.age}</h3>
                      <p className="text-xs text-[#F5E6CA] font-medium">{profile.occupation}</p>
                      <p className="text-[11px] text-white/60 mt-0.5">{profile.location}</p>

                      <div className="grid grid-cols-2 gap-2 mt-4">
                        <button
                          onClick={() => handleMatchAction(profile.id)}
                          className="w-full py-2 bg-[#D4AF37] hover:bg-[#FFF6D6] text-black font-bold text-xs rounded-full flex items-center justify-center gap-1.5 transition-all"
                        >
                          <Heart className="w-3.5 h-3.5 fill-current" /> Match
                        </button>
                        <Link href={`/profile/${profile.id}`}>
                          <Button variant="outline" size="sm" fullWidth>
                            Profile
                          </Button>
                        </Link>
                      </div>
                    </div>
                  )}

                </Card>
              </motion.div>
            ))}
          </div>
          )
        )}

        {/* MUTUAL MATCHES TAB */}
        {activeTab === 'mutual' && (
          likesData.mutual.length === 0 ? (
            <Card className="text-center py-16 max-w-lg mx-auto border-white/10">
              <Sparkles className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-80" />
              <h3 className="font-serif text-xl font-bold text-white">No Mutual Matches Yet</h3>
              <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                When two club patrons like each other, private dates and dispatches are unlocked immediately.
              </p>
              <Link href="/discover" className="inline-block mt-4">
                <Button variant="gold" size="sm">Start Swiping</Button>
              </Link>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
            {likesData.mutual.map((profile) => (
              <Card key={profile.id} className="p-5 border-[#D4AF37] gold-border-glow flex items-center gap-4">
                {profile.photos && profile.photos.length > 0 && profile.photos[0] && !profile.photos[0].includes('unsplash.com') ? (
                  <img
                    src={profile.photos[0]}
                    alt={profile.name}
                    className="w-20 h-20 rounded-2xl object-cover border border-[#D4AF37] shrink-0"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#1E1B13] to-black border border-[#D4AF37] flex items-center justify-center text-[#D4AF37] font-serif font-bold text-2xl shrink-0">
                    {(profile.name || 'M').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="flex-1">
                  <Badge type="verified" label="Mutual Match" />
                  <h3 className="font-serif font-bold text-lg text-white mt-1">{profile.name}, {profile.age}</h3>
                  <p className="text-xs text-white/60">{profile.occupation}</p>
                  
                  <div className="mt-3">
                    <Link 
                      href={`/messages?recipient=${profile.id}&name=${encodeURIComponent(profile.name)}&photo=${encodeURIComponent(profile.photos?.[0] || '')}`} 
                      className="block w-full"
                    >
                      <Button variant="gold" size="sm" fullWidth icon={<MessageSquare className="w-3.5 h-3.5 text-black" />}>
                        Chat Now
                      </Button>
                    </Link>
                  </div>
                </div>
              </Card>
            ))}
          </div>
          )
        )}

        {/* YOU LIKED & EXPIRING TABS */}
        {(activeTab === 'youLiked' || activeTab === 'expiring') && (
          (activeTab === 'youLiked' ? likesData.youLiked : likesData.expiring).length === 0 ? (
            <Card className="text-center py-16 max-w-lg mx-auto border-white/10">
              <Clock className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-80" />
              <h3 className="font-serif text-xl font-bold text-white">
                {activeTab === 'youLiked' ? 'No Profiles Liked Yet' : 'No Expiring Matches'}
              </h3>
              <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                {activeTab === 'youLiked'
                  ? 'Profiles you admire in Discovery will be recorded here.'
                  : 'Matches approaching the 24-hour response deadline will appear here.'}
              </p>
            </Card>
          ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {(activeTab === 'youLiked' ? likesData.youLiked : likesData.expiring).map((profile) => (
              <Card key={profile.id} className="p-0 h-[340px] border-white/10 group overflow-hidden">
                {profile.photos && profile.photos.length > 0 && profile.photos[0] && !profile.photos[0].includes('unsplash.com') ? (
                  <img
                    src={profile.photos[0]}
                    alt={profile.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#1E1B13] via-[#12110C] to-black flex flex-col items-center justify-center p-6 text-center">
                    <div className="w-20 h-20 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/10 border-2 border-[#D4AF37] flex items-center justify-center mb-2 shadow-[0_0_30px_rgba(212,175,55,0.2)]">
                      <span className="font-serif text-3xl font-bold text-[#D4AF37]">
                        {(profile.name || 'M').charAt(0).toUpperCase()}
                      </span>
                    </div>
                    <span className="text-[10px] uppercase tracking-widest font-bold text-[#D4AF37]">
                      Verified Member
                    </span>
                  </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent p-5 flex flex-col justify-end">
                  <h3 className="font-serif font-bold text-lg text-white">{profile.name}, {profile.age}</h3>
                  <p className="text-xs text-white/60">{profile.location}</p>
                  {activeTab === 'expiring' && (
                    <span className="text-[10px] text-amber-400 font-semibold mt-1 flex items-center gap-1">
                      <Clock className="w-3 h-3" /> Expires in 4 hours
                    </span>
                  )}
                </div>
              </Card>
            ))}
          </div>
          )
        )}

      </main>
    </div>
  );
}
