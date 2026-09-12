'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Heart, 
  MessageSquare, 
  Calendar, 
  Zap, 
  Crown, 
  Settings,
  Compass,
  Users,
  Flame,
  LogOut,
  User,
  ChevronDown,
  SlidersHorizontal
} from 'lucide-react';
import { Badge } from './Badge';
import { CrownLogo } from './CrownLogo';
import { performLogout } from '@/lib/authClient';

export const Navigation: React.FC = () => {
  const pathname = usePathname();
  const router = useRouter();
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [avatarUrl, setAvatarUrl] = useState<string>('');
  const profileMenuRef = useRef<HTMLDivElement>(null);

  // Sync profile avatar from local storage or API
  const syncAvatar = async () => {
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.photos && Array.isArray(parsed.photos) && parsed.photos.length > 0) {
          const validPhotos = parsed.photos.filter((u: string) => u && u !== '/crown-gold.png');
          if (validPhotos.length > 0) {
            const coverIdx = typeof parsed.coverIndex === 'number' && validPhotos[parsed.coverIndex] ? parsed.coverIndex : 0;
            setAvatarUrl(validPhotos[coverIdx]);
            return;
          }
        }
        if (parsed.avatar && parsed.avatar !== '/crown-gold.png') {
          setAvatarUrl(parsed.avatar);
          return;
        }
      }

      // Fallback: fetch from /api/auth/me
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user?.profile?.photos?.length > 0) {
          const validAuthPhotos = data.user.profile.photos.filter((u: string) => u && u !== '/crown-gold.png');
          if (validAuthPhotos.length > 0) {
            setAvatarUrl(validAuthPhotos[0]);
            return;
          }
        }
      }
      setAvatarUrl('');
    } catch {
      setAvatarUrl('');
    }
  };

  useEffect(() => {
    syncAvatar();
    const handleProfileUpdated = () => syncAvatar();
    window.addEventListener('kmc_profile_updated', handleProfileUpdated);
    window.addEventListener('storage', handleProfileUpdated);
    return () => {
      window.removeEventListener('kmc_profile_updated', handleProfileUpdated);
      window.removeEventListener('storage', handleProfileUpdated);
    };
  }, []);

  // Close profile dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setIsProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on route change
  useEffect(() => {
    setIsProfileMenuOpen(false);
  }, [pathname]);

  // Don't show global app navbar on onboarding, login, register, or active call pages
  if (pathname === '/onboarding' || pathname === '/login' || pathname === '/register' || pathname?.startsWith('/call/')) return null;

  // Desktop Navigation links (no artificial static badge numbers)
  const desktopNavItems = [
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Members', path: '/directory', icon: Users },
    { label: 'Naughty Zone', path: '/naughty-zone', icon: Flame, badge: 'HOT' },
    { label: 'Matches', path: '/matches', icon: Heart },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Events', path: '/events', icon: Calendar },
    { label: 'Boost', path: '/boost', icon: Zap },
    { label: 'Elite', path: '/membership', icon: Crown },
  ];

  // Mobile Bottom Dock
  const mobileDockItems = [
    { label: 'Discover', path: '/discover', icon: Compass },
    { label: 'Members', path: '/directory', icon: Users },
    { label: 'Naughty', path: '/naughty-zone', icon: Flame, badge: 'HOT' },
    { label: 'Matches', path: '/matches', icon: Heart },
    { label: 'Messages', path: '/messages', icon: MessageSquare },
    { label: 'Boost', path: '/boost', icon: Zap },
    { label: 'Elite', path: '/membership', icon: Crown },
  ];

  return (
    <>
      {/* Desktop & Mobile Top Header Bar with Safe Area support */}
      <header className="sticky top-0 z-50 w-full bg-[#070709]/95 backdrop-blur-2xl border-b border-[#D4AF37]/25 shadow-lg pt-[env(safe-area-inset-top,0px)]">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 h-16 sm:h-20 flex items-center justify-between gap-2">
          
          {/* Logo */}
          <Link href="/discover" className="flex items-center gap-2 sm:gap-3 group shrink-0">
            <CrownLogo className="w-8 h-8 sm:w-10 sm:h-10 group-hover:scale-105 transition-transform" />
            <div className="flex flex-col">
              <span className="font-serif tracking-widest text-lg sm:text-xl font-bold gold-gradient-text">
                KISSMYCHEEK
              </span>
              <span className="text-[8px] sm:text-[9px] uppercase tracking-[0.25em] text-[#D4AF37]/80 -mt-0.5 sm:-mt-1 font-medium">
                Social & Dating Club
              </span>
            </div>
          </Link>

          {/* Desktop & Horizontal Landscape Navigation Links */}
          <nav className="hidden lg:flex items-center gap-1 bg-black/40 p-1.5 rounded-full border border-white/10">
            {desktopNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.path;

              return (
                <Link key={item.path} href={item.path}>
                  <div className={`relative px-3.5 py-2 rounded-full text-xs font-medium tracking-wider transition-all duration-300 flex items-center gap-2 ${
                    isActive 
                      ? 'text-black font-semibold' 
                      : 'text-white/70 hover:text-[#FFF6D6] hover:bg-white/5'
                  }`}>
                    {isActive && (
                      <motion.div
                        layoutId="activeNavBackground"
                        className="absolute inset-0 gold-gradient-bg rounded-full shadow-md"
                        transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                      />
                    )}
                    <Icon className={`w-4 h-4 relative z-10 ${isActive ? 'text-black' : 'text-[#D4AF37]'}`} />
                    <span className="relative z-10">{item.label}</span>

                    {item.badge && !isActive && (
                      <span className="relative z-10 px-1.5 py-0.5 rounded-full text-[10px] bg-[#D4AF37] text-black font-bold">
                        {item.badge}
                      </span>
                    )}
                  </div>
                </Link>
              );
            })}
          </nav>

          {/* Top Right Bar: Filters + Events + Profile Dropdown */}
          <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0" ref={profileMenuRef}>
            
            {/* Quick Filter Preferences Button */}
            <button
              type="button"
              onClick={() => {
                if (pathname !== '/discover') {
                  router.push('/discover');
                  setTimeout(() => {
                    window.dispatchEvent(new CustomEvent('kmc_open_filters'));
                  }, 200);
                } else {
                  window.dispatchEvent(new CustomEvent('kmc_open_filters'));
                }
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 border border-[#D4AF37]/40 text-[#FFF6D6] hover:border-[#D4AF37] hover:bg-[#D4AF37]/15 transition-all text-xs font-semibold shadow-sm shrink-0 active:scale-95 cursor-pointer"
              title="Filter Preferences"
            >
              <SlidersHorizontal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#D4AF37]" />
              <span className="text-[#FFF6D6] font-semibold text-xs tracking-tight">Filters</span>
            </button>

            {/* Top Right Events Icon Button */}
            <Link 
              href="/events" 
              className={`p-1.5 sm:p-2 rounded-full transition-all flex items-center justify-center relative ${
                pathname === '/events'
                  ? 'text-[#D4AF37] bg-[#D4AF37]/20 border border-[#D4AF37]/50 shadow-[0_0_10px_rgba(212,175,55,0.3)]'
                  : 'text-white/70 hover:text-[#FFF6D6] hover:bg-white/5'
              }`} 
              title="Club Events"
            >
              <Calendar className="w-4 h-4 sm:w-4.5 sm:h-4.5 text-[#D4AF37]" />
              <span className="absolute top-1 right-1 w-1.5 h-1.5 rounded-full bg-[#D4AF37] animate-pulse" />
            </Link>

            {/* Profile Avatar Button with Dropdown Trigger */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
                className="flex items-center gap-1.5 p-0.5 rounded-full hover:bg-white/5 transition-colors focus:outline-none"
                title="Account Menu"
              >
                <div className="relative">
                  <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-full p-0.5 bg-gradient-to-r from-[#D4AF37] to-amber-600 group-hover:scale-105 transition-transform shadow-md flex items-center justify-center">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt="My Profile"
                        className="w-full h-full rounded-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full rounded-full bg-[#111116] flex items-center justify-center text-[#D4AF37]">
                        <User className="w-4 h-4 text-[#D4AF37]" />
                      </div>
                    )}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-400 border-2 border-[#070709]" />
                </div>
                <ChevronDown className={`w-3.5 h-3.5 text-[#D4AF37] transition-transform duration-200 hidden sm:block ${isProfileMenuOpen ? 'rotate-180' : ''}`} />
              </button>

              {/* Profile Dropdown Menu */}
              <AnimatePresence>
                {isProfileMenuOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 10, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 10, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 mt-2 w-56 rounded-2xl glass-card border border-[#D4AF37]/40 shadow-2xl p-2 z-50 backdrop-blur-2xl"
                  >
                    <div className="px-3 py-2 border-b border-white/10 mb-1">
                      <span className="text-xs font-bold text-white block truncate">My Account</span>
                      <span className="text-[10px] text-[#D4AF37] uppercase tracking-wider font-semibold">Verified Member</span>
                    </div>

                    <Link
                      href="/profile/me"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-[#D4AF37]/15 transition-colors"
                    >
                      <User className="w-4 h-4 text-[#D4AF37]" />
                      <span>My Profile</span>
                    </Link>

                    <Link
                      href="/settings"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-[#D4AF37]/15 transition-colors"
                    >
                      <Settings className="w-4 h-4 text-[#D4AF37]" />
                      <span>Settings & Privacy</span>
                    </Link>

                    <Link
                      href="/membership"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-[#D4AF37]/15 transition-colors"
                    >
                      <Crown className="w-4 h-4 text-[#D4AF37]" />
                      <span>Membership & Billing</span>
                    </Link>

                    <Link
                      href="/boost"
                      onClick={() => setIsProfileMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-medium text-white/80 hover:text-white hover:bg-[#D4AF37]/15 transition-colors"
                    >
                      <Zap className="w-4 h-4 text-[#D4AF37]" />
                      <span>Profile Boost</span>
                    </Link>

                    <div className="pt-1 mt-1 border-t border-white/10">
                      <button
                        type="button"
                        onClick={() => {
                          setIsProfileMenuOpen(false);
                          performLogout();
                        }}
                        className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-500/15 transition-colors text-left"
                      >
                        <LogOut className="w-4 h-4 text-rose-400" />
                        <span>Log Out</span>
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

          </div>
        </div>
      </header>

      {/* Mobile & Tablet Bottom Dock Bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 z-50 glass-panel border-t border-[#D4AF37]/30 backdrop-blur-2xl pt-1.5 pb-[max(0.6rem,env(safe-area-inset-bottom,0.6rem))] px-1 shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
        <div className="flex items-center justify-between max-w-lg mx-auto gap-0.5">
          {mobileDockItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.path;

            return (
              <Link 
                key={item.path} 
                href={item.path} 
                className="relative flex-1 flex flex-col items-center justify-center py-1 px-0.5 rounded-xl transition-all min-w-0"
              >
                <div className="relative">
                  <Icon className={`w-4.5 h-4.5 transition-transform duration-200 ${isActive ? 'text-[#D4AF37] scale-110' : 'text-white/60'}`} />
                  {item.badge && (
                    <span className="absolute -top-1 -right-2 px-1 py-0.2 rounded-full text-[7px] bg-rose-500 text-white font-extrabold leading-none">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className={`text-[8.5px] sm:text-[9.5px] mt-0.5 font-medium tracking-tight truncate w-full text-center ${isActive ? 'text-[#D4AF37] font-bold' : 'text-white/60'}`}>
                  {item.label}
                </span>
                {isActive && (
                  <motion.div
                    layoutId="mobileNavIndicator"
                    className="absolute -top-1.5 w-5 h-0.5 bg-[#D4AF37] rounded-full shadow-[0_0_8px_#D4AF37]"
                  />
                )}
              </Link>
            );
          })}
        </div>
      </div>
    </>
  );
};

