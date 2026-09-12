'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Heart, 
  MessageSquare, 
  ShieldCheck, 
  MapPin, 
  Briefcase, 
  GraduationCap, 
  ChevronLeft, 
  ChevronRight, 
  Sparkles, 
  Flag, 
  Ban, 
  Edit3,
  Check,
  Crown,
  Lock,
  LogOut,
  Settings,
  Camera,
  Phone,
  Video
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { CompatibilityRing } from '@/components/ui/CompatibilityRing';
import { Navigation } from '@/components/ui/Navigation';
import { MemberProfile } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { performLogout } from '@/lib/authClient';
import { calculateAge } from '@/lib/dateUtils';
import { startInAppCall } from '@/components/call/GlobalCallManager';

// Profile Page Component
export default function ProfilePage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const resolvedParams = React.use(params);
  
  const [profile, setProfile] = useState<MemberProfile | null>(null);
  const [userTier, setUserTier] = useState<string>('STANDARD');
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [isLiked, setIsLiked] = useState(false);
  const [isSuperLiked, setIsSuperLiked] = useState(false);
  const [isSaved, setIsSaved] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [isSendingGift, setIsSendingGift] = useState(false);
  const [isReportModalOpen, setIsReportModalOpen] = useState(false);
  const [reportReason, setReportReason] = useState('Inappropriate Content');
  const [reportSubmitted, setReportSubmitted] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isBlocked, setIsBlocked] = useState(false);
  const [isEliteModalOpen, setIsEliteModalOpen] = useState(false);
  const profilePhotoInputRef = React.useRef<HTMLInputElement>(null);

  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [currentAuthUserId, setCurrentAuthUserId] = useState<string>('');

  const fetchUserTier = async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet?.tier) setUserTier(data.wallet.tier);
      }
    } catch {}
  };

  const fetchProfileDetails = async () => {
    setIsLoading(true);
    try {
      let authUser: any = null;
      let authProfile: any = null;
      let myTier = 'STANDARD';
      try {
        const authRes = await fetch('/api/auth/me');
        if (authRes.ok) {
          const authData = await authRes.json();
          if (authData.authenticated && authData.user) {
            authUser = authData.user;
            setCurrentAuthUserId(authData.user.id);
            authProfile = authData.user.profile || null;
            if (authData.user.membershipTier) myTier = authData.user.membershipTier;
          }
        }
      } catch {}

      let localData: any = {};
      let localPhotos: string[] = [];
      try {
        const savedProfile = localStorage.getItem('kmc_user_profile');
        if (savedProfile) {
          localData = JSON.parse(savedProfile);
          if (localData.photos && Array.isArray(localData.photos)) {
            localPhotos = localData.photos.filter((u: string) => u && u !== '/crown-gold.png');
          } else if (localData.avatar && localData.avatar !== '/crown-gold.png') {
            localPhotos = [localData.avatar];
          }
        }
      } catch {}

      let isMe = resolvedParams.id === 'me' || 
        (authUser?.id && resolvedParams.id === authUser.id) ||
        (localData?.id && resolvedParams.id === localData.id) ||
        (authUser?.email && resolvedParams.id.toLowerCase() === authUser.email.toLowerCase()) ||
        (localData?.email && resolvedParams.id.toLowerCase() === localData.email.toLowerCase()) ||
        (localData?.fullName && resolvedParams.id.toLowerCase() === localData.fullName.toLowerCase()) ||
        (localData?.customName && resolvedParams.id.toLowerCase() === localData.customName.toLowerCase()) ||
        (authUser?.fullName && resolvedParams.id.toLowerCase() === authUser.fullName.toLowerCase());

      setIsOwnProfile(isMe);

      if (isMe) {
        const authPhotos = (authProfile?.photos || []).filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
        const cleanLocalPhotos = localPhotos.filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
        const finalPhotos = cleanLocalPhotos.length > 0 ? cleanLocalPhotos : authPhotos;
        const finalName = localData?.customName || localData?.fullName || localData?.name || authProfile?.customName || authProfile?.fullName || authUser?.fullName || 'Lord Henry';
        const finalDob = localData?.dob || authProfile?.dob || '1996-05-14';
        const finalAge = authProfile?.age || calculateAge(finalDob) || 29;
        const finalInterests = (localData?.traits || localData?.interests || authProfile?.interests || ['Fine Dining', 'Art & Culture', 'Venture Capital']);

        setProfile({
          id: authUser?.id || localData?.id || 'me',
          name: finalName,
          age: finalAge,
          bio: localData?.bio || authProfile?.bio || 'Connoisseur of luxury travel, contemporary art, and fine dining.',
          occupation: localData?.occupation || authProfile?.occupation || 'Executive Principal',
          location: localData?.location || authProfile?.location || 'Lagos, Nigeria',
          education: localData?.education || authProfile?.education || 'Oxford University',
          height: localData?.height || authProfile?.height || `6'1"`,
          relationshipGoals: localData?.relationshipGoals || authProfile?.relationshipGoals || 'Exclusive Relationship',
          interests: finalInterests,
          tier: (myTier === 'ELITE' || localData?.membershipTier === 'ELITE' ? 'ELITE' : myTier === 'PREMIUM' ? 'PREMIUM' : 'ESSENTIAL'),
          photos: finalPhotos,
          videos: [
            'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
            'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4'
          ],
          compatibility: 98,
          verified: true,
          online: true,
          distance: 'Direct Profile',
          lifestyle: {
            travel: 'Global Explorer',
            drink: 'Vintage Champagne',
            workout: 'Daily Fitness & Tennis',
            pets: 'Dog Lover'
          }
        });
        setIsLoading(false);
        return;
      }

      try {
        const profRes = await fetch(`/api/profile?id=${encodeURIComponent(resolvedParams.id)}`);
        if (profRes.ok) {
          const profData = await profRes.json();
          if (profData.success && profData.profile) {
            const fetched = profData.profile;
            const matchesViewer = Boolean(
              (authUser?.id && (fetched.id === authUser.id || fetched.userId === authUser.id)) ||
              (localData?.id && (fetched.id === localData.id || fetched.userId === localData.id)) ||
              (authUser?.email && (fetched.email?.toLowerCase() === authUser.email.toLowerCase() || fetched.id?.toLowerCase() === authUser.email.toLowerCase())) ||
              (localData?.email && (fetched.email?.toLowerCase() === localData.email.toLowerCase() || fetched.id?.toLowerCase() === localData.email.toLowerCase())) ||
              (authUser?.fullName && fetched.name?.toLowerCase() === authUser.fullName.toLowerCase()) ||
              (localData?.fullName && fetched.name?.toLowerCase() === localData.fullName.toLowerCase())
            );

            if (matchesViewer) {
              setIsOwnProfile(true);
            }
            setProfile(profData.profile);
            setIsLoading(false);
            return;
          }
        }
      } catch {}

      try {
        const res = await fetch('/api/directory');
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.profiles) {
            const found = data.profiles.find((p: any) => 
              p.id === resolvedParams.id || 
              p.name?.toLowerCase() === resolvedParams.id.toLowerCase()
            );
            if (found) {
              setProfile(found);
              setIsLoading(false);
              return;
            }
          }
        }
      } catch {}
    } catch (err) {
      console.log('Profile details API fallback');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProfileDetails();
    fetchUserTier();
  }, [resolvedParams.id]);

  const handleReportSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setReportSubmitted(true);
    setTimeout(() => {
      setIsReportModalOpen(false);
      setReportSubmitted(false);
    }, 2000);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-hidden">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Back Link */}
        <div className="flex items-center justify-between mb-6">
          <Link href="/discover" className="inline-flex items-center gap-2 text-xs text-white/60 hover:text-[#D4AF37]">
            <ChevronLeft className="w-4 h-4" /> Return to Discovery Deck
          </Link>
          
          <div className="flex items-center gap-2">
            <Link href="/settings">
              <Button variant="outline" size="sm" icon={<Settings className="w-3.5 h-3.5 text-[#D4AF37]" />}>
                Settings
              </Button>
            </Link>
            <Button
              variant="danger"
              size="sm"
              onClick={() => performLogout()}
              icon={<LogOut className="w-3.5 h-3.5" />}
            >
              Log Out
            </Button>
          </div>
        </div>

        {!profile ? (
          <Card className="text-center py-20 max-w-lg mx-auto border-white/10">
            <h2 className="text-2xl font-serif font-bold gold-gradient-text">Member Profile</h2>
            <p className="text-xs text-white/60 mt-2">
              {isLoading ? 'Loading profile clearance details...' : 'This member profile is unavailable or has not been vetted yet.'}
            </p>
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              <Link href="/discover">
                <Button variant="gold" size="sm">Explore Members</Button>
              </Link>
              <Link href="/settings">
                <Button variant="outline" size="sm" icon={<Settings className="w-3.5 h-3.5 text-[#D4AF37]" />}>Settings</Button>
              </Link>
              <Button
                variant="danger"
                size="sm"
                onClick={() => performLogout()}
                icon={<LogOut className="w-3.5 h-3.5" />}
              >
                Log Out
              </Button>
            </div>
          </Card>
        ) : (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          
          {/* Left Column: Photo Carousel (Lg: 5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="relative aspect-[3/4] rounded-3xl overflow-hidden glass-card border-[#D4AF37]/30 shadow-2xl flex items-center justify-center">
              {profile.photos && profile.photos.length > 0 && (profile.photos[activePhotoIndex] || profile.photos[0]) ? (
                <img
                  src={profile.photos[activePhotoIndex] || profile.photos[0]}
                  alt={profile.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#16140D] via-[#0E0D09] to-black flex flex-col items-center justify-center p-8 text-center select-none">
                  <div className="w-28 h-28 rounded-full bg-gradient-to-br from-[#D4AF37]/30 to-amber-500/10 border-2 border-[#D4AF37]/60 flex items-center justify-center mb-4 shadow-[0_0_50px_rgba(212,175,55,0.25)]">
                    <span className="font-serif text-4xl font-bold text-[#D4AF37]">
                      {(profile.name || 'M').charAt(0).toUpperCase()}
                    </span>
                  </div>
                  <span className="text-xs uppercase tracking-widest font-bold text-[#D4AF37]">
                    Verified Member
                  </span>
                  <p className="text-xs text-white/50 mt-1">Direct Private Member Profile</p>
                </div>
              )}

              {/* Photo Dots */}
              {profile.photos && profile.photos.length > 1 && (
                <div className="absolute top-4 left-4 right-4 flex gap-1.5">
                  {profile.photos.map((_, idx) => (
                    <div
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`h-1 flex-1 rounded-full cursor-pointer transition-all ${
                        idx === activePhotoIndex ? 'bg-[#D4AF37]' : 'bg-white/30'
                      }`}
                    />
                  ))}
                </div>
              )}

              {/* Photo Arrows */}
              {profile.photos && profile.photos.length > 1 && (
                <>
                  <button
                    onClick={() => setActivePhotoIndex(Math.max(0, activePhotoIndex - 1))}
                    className="absolute left-3 top-1/2 -translate-y-1/2 p-2 rounded-full glass-panel text-white hover:text-[#D4AF37] transition-colors"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <button
                    onClick={() => setActivePhotoIndex(Math.min(profile.photos.length - 1, activePhotoIndex + 1))}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full glass-panel text-white hover:text-[#D4AF37] transition-colors"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </>
              )}

              {/* Change Profile Photo Button for Owner */}
              {isOwnProfile && (
                <>
                  <button
                    type="button"
                    onClick={() => profilePhotoInputRef.current?.click()}
                    className="absolute bottom-4 right-4 px-3.5 py-1.5 rounded-full gold-gradient-bg text-black text-xs font-bold shadow-xl flex items-center gap-1.5 hover:scale-105 transition-transform cursor-pointer"
                    title="Change Profile Picture"
                  >
                    <Camera className="w-3.5 h-3.5" />
                    <span>Change Picture</span>
                  </button>
                  <input
                    type="file"
                    ref={profilePhotoInputRef}
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;

                      let newUrl = '';
                      try {
                        const formData = new FormData();
                        formData.append('file', file);
                        const uploadRes = await fetch('/api/upload', {
                          method: 'POST',
                          body: formData,
                        });
                        if (uploadRes.ok) {
                          const uploadData = await uploadRes.json();
                          if (uploadData.url) {
                            newUrl = uploadData.url;
                          }
                        }
                      } catch (err) {
                        console.warn('Direct upload error, falling back to data URL', err);
                      }

                      if (!newUrl) {
                        newUrl = await new Promise<string>((resolve) => {
                          const reader = new FileReader();
                          reader.onload = () => resolve(reader.result as string);
                          reader.readAsDataURL(file);
                        });
                      }

                      if (newUrl) {
                        const updatedPhotos = [newUrl, ...(profile?.photos || []).filter(p => p !== newUrl)];
                        if (profile) {
                          setProfile({ ...profile, photos: updatedPhotos });
                        }
                        setActivePhotoIndex(0);
                        try {
                          const existing = localStorage.getItem('kmc_user_profile');
                          const parsed = existing ? JSON.parse(existing) : {};
                          parsed.photos = updatedPhotos;
                          parsed.coverIndex = 0;
                          parsed.avatar = newUrl;
                          localStorage.setItem('kmc_user_profile', JSON.stringify(parsed));
                          window.dispatchEvent(new Event('kmc_profile_updated'));
                        } catch {}

                        // Sync immediately to database & server
                        try {
                          await fetch('/api/profile', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ photos: updatedPhotos, avatar: newUrl })
                          });
                          await fetch('/api/settings', {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ photos: updatedPhotos, avatar: newUrl })
                          });
                        } catch {}
                      }
                    }}
                    accept="image/*"
                    className="hidden"
                  />
                </>
              )}
            </div>

            {/* Thumbnail Row */}
            {profile.photos && profile.photos.length > 1 && (
              <div className="flex gap-3 overflow-x-auto pb-1">
                {profile.photos.map((url, idx) => (
                  <div
                    key={idx}
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`w-20 h-24 rounded-xl overflow-hidden cursor-pointer border-2 shrink-0 transition-all ${
                      idx === activePhotoIndex ? 'border-[#D4AF37] scale-105' : 'border-transparent opacity-60'
                    }`}
                  >
                    <img src={url} alt="Thumbnail" className="w-full h-full object-cover" />
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Complete Member Profile Details (Lg: 7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            
            <Card className="p-6 sm:p-8 border-[#D4AF37]/30 relative">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
                <div>
                  <div className="flex items-center gap-2 mb-1.5">
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-[11px] font-semibold text-emerald-400">
                      <ShieldCheck className="w-3.5 h-3.5" />
                      Verified
                    </span>
                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[11px] font-semibold text-[#D4AF37]">
                      <Crown className="w-3.5 h-3.5 text-[#D4AF37]" />
                      {profile.tier}
                    </span>
                  </div>
                  <h1 className="text-2xl sm:text-3xl font-serif font-bold text-white">{profile.name}, {profile.age}</h1>
                  <p className="text-xs text-white/70 font-medium mt-0.5">{profile.occupation}</p>
                </div>

                <div className="flex items-center gap-3">
                  <CompatibilityRing score={profile.compatibility ?? 90} size={64} strokeWidth={5} />
                </div>
              </div>

              {/* Elite Member Status Banner */}
              {profile.tier === 'ELITE' && (
                <div className="mb-5 p-3 rounded-xl bg-gradient-to-r from-[#D4AF37]/15 via-amber-600/5 to-transparent border border-[#D4AF37]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-full bg-black border border-[#D4AF37]/60 flex items-center justify-center text-[#D4AF37] shrink-0">
                      <Crown className="w-4 h-4" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-1.5">
                        Elite Circle
                      </span>
                      <span className="text-[11px] text-white/60">Priority matching & private dates</span>
                    </div>
                  </div>
                  {userTier !== 'ELITE' && (
                    <button
                      type="button"
                      onClick={() => setIsEliteModalOpen(true)}
                      className="px-3.5 py-1 rounded-full text-xs font-bold gold-gradient-bg text-black shrink-0 hover:scale-105 transition-transform"
                    >
                      Join Elite
                    </button>
                  )}
                </div>
              )}

              {/* Basic Info Bar */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 py-4 border-y border-white/10 my-6 text-xs text-white/80">
                <div className="flex items-center gap-2">
                  <MapPin className="w-4 h-4 text-[#D4AF37]" />
                  <span>{profile.location}</span>
                </div>
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-4 h-4 text-[#D4AF37]" />
                  <span>{profile.education}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                  <span>Height: {profile.height}</span>
                </div>
              </div>

              {/* Bio */}
              <div>
                <h3 className="font-serif font-bold text-lg text-white mb-2">Biography</h3>
                <p className="text-sm text-white/80 leading-relaxed italic">
                  "{profile.bio}"
                </p>
              </div>

              {/* Intentions */}
              <div className="mt-6">
                <h3 className="font-serif font-bold text-lg text-white mb-2">Relationship Goals</h3>
                <p className="text-sm text-[#F5E6CA] font-medium">
                  {profile.relationshipGoals}
                </p>
              </div>

              {/* Interest Tags */}
              <div className="mt-6">
                <h3 className="font-serif font-bold text-lg text-white mb-3">Interests & Passions</h3>
                <div className="flex flex-wrap gap-2">
                  {profile.interests.map(t => (
                    <Badge key={t} label={t} />
                  ))}
                </div>
              </div>

              {/* Video Reels & Showcase */}
              <div className="mt-6 pt-6 border-t border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="font-serif font-bold text-lg text-white flex items-center gap-2">
                    <Crown className="w-4 h-4 text-[#D4AF37]" /> Lifestyle Video Reels & Intros
                  </h3>
                  <span className="text-xs text-[#D4AF37] font-semibold">
                    {(profile.videos && profile.videos.length > 0) ? `${profile.videos.length} Videos` : 'Showcase Available'}
                  </span>
                </div>
                
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  {((profile.videos && profile.videos.length > 0) ? profile.videos : [
                    'https://assets.mixkit.co/videos/preview/mixkit-set-of-plateaus-seen-from-the-sky-in-a-sunset-26070-large.mp4',
                    'https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4'
                  ]).map((vidUrl, vidIdx) => (
                    <div 
                      key={vidIdx} 
                      className="relative aspect-[9/16] rounded-2xl overflow-hidden border border-[#D4AF37]/40 bg-black group shadow-lg hover:border-[#D4AF37] transition-all"
                    >
                      <video
                        src={vidUrl}
                        className="w-full h-full object-cover"
                        autoPlay
                        loop
                        muted
                        playsInline
                        controls
                        preload="metadata"
                      />
                      <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] bg-black/80 text-[#D4AF37] font-bold z-10 pointer-events-none">
                        Reel #{vidIdx + 1}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Action Toolbar */}
              <div className="mt-8 pt-6 border-t border-white/10 flex flex-wrap items-center gap-4">
                {isOwnProfile || (currentAuthUserId && (profile.id === currentAuthUserId || (profile as any).userId === currentAuthUserId)) ? (
                  <>
                    <Link href="/settings" className="flex-1">
                      <Button variant="gold" fullWidth icon={<Settings className="w-4 h-4 text-black" />}>
                        Settings & Preferences
                      </Button>
                    </Link>
                    <Link href="/membership" className="flex-1">
                      <Button variant="outline" fullWidth icon={<Crown className="w-4 h-4 text-[#D4AF37]" />}>
                        Membership Plan
                      </Button>
                    </Link>
                    <Button
                      variant="danger"
                      onClick={() => performLogout()}
                      icon={<LogOut className="w-4 h-4" />}
                      className="px-6"
                    >
                      Log Out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link 
                      href={`/messages?recipient=${profile.id}&name=${encodeURIComponent(profile.name)}&photo=${encodeURIComponent(profile.photos?.[0] || '')}`} 
                      className="flex-1"
                    >
                      <Button variant="gold" fullWidth icon={<MessageSquare className="w-4 h-4 text-black" />}>
                        Message {profile.name.split(' ')[0]}
                      </Button>
                    </Link>

                    <Button 
                      variant="outline" 
                      fullWidth 
                      icon={<Phone className="w-4 h-4 text-[#D4AF37]" />}
                      className="flex-1"
                      onClick={() => {
                        startInAppCall({
                          partnerId: profile.id,
                          partnerName: profile.name,
                          partnerPhoto: profile.photos?.[0] || '',
                          partnerOccupation: profile.occupation || 'Member',
                          partnerLocation: profile.location || 'Verified Member',
                          mode: 'video'
                        });
                      }}
                    >
                      Date Call
                    </Button>

                    <Button
                      variant="outline"
                      onClick={() => setIsReportModalOpen(true)}
                      icon={<Flag className="w-4 h-4 text-rose-400" />}
                    >
                      Report
                    </Button>

                    <Button
                      variant={isBlocked ? 'danger' : 'ghost'}
                      onClick={() => setIsBlocked(!isBlocked)}
                      icon={<Ban className="w-4 h-4" />}
                    >
                      {isBlocked ? 'Blocked' : 'Block'}
                    </Button>
                  </>
                )}
              </div>

            </Card>

          </div>

        </div>
        )}

      </main>

      {/* REPORT MODAL */}
      {isReportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <Card className="max-w-md w-full p-8 border-rose-500/40">
            <h3 className="text-xl font-serif font-bold text-white text-center">Report Member Profile</h3>
            <p className="text-xs text-white/60 text-center mt-1 mb-6">
              Our safety committee investigates all reports strictly. Your submission remains confidential.
            </p>

            {reportSubmitted ? (
              <div className="p-4 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-center text-sm font-medium">
                ✨ Report filed. Our committee will review this account within 12 hours.
              </div>
            ) : (
              <form onSubmit={handleReportSubmit} className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-white/80 block mb-1">Reason for Report</label>
                  <select
                    required
                    value={reportReason}
                    onChange={(e) => setReportReason(e.target.value)}
                    className="w-full px-4 py-3 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-rose-400 focus:outline-none"
                  >
                    <option value="">Select reason...</option>
                    <option value="Fake / Impersonation">Fake / Impersonation</option>
                    <option value="Inappropriate Content">Inappropriate Content</option>
                    <option value="Harassment / Unsolicited messages">Harassment / Unsolicited messages</option>
                  </select>
                </div>

                <Button type="submit" variant="danger" fullWidth>Submit Confidential Report</Button>
                <button
                  type="button"
                  onClick={() => setIsReportModalOpen(false)}
                  className="w-full text-xs text-white/50 hover:text-white mt-2"
                >
                  Cancel
                </button>
              </form>
            )}
          </Card>
        </div>
      )}

      {/* Elite Upgrade Gating Modal */}
      <CreditsAndGiftingModal
        isOpen={isEliteModalOpen}
        onClose={() => { setIsEliteModalOpen(false); fetchUserTier(); }}
        defaultTab="elite"
        recipientName={profile?.name || 'Member'}
      />
    </div>
  );
}
