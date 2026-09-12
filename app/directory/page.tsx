'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Search, MapPin, Briefcase, ShieldCheck, ShieldAlert, UserPlus, Sparkles, Filter, Crown, Lock, ArrowRight, CheckCircle2, Users, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { MemberProfile } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { NIGERIAN_STATES } from '@/lib/locationsData';

export default function DirectoryPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCity, setSelectedCity] = useState('All');
  const [sentRequests, setSentRequests] = useState<string[]>([]);
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [userTier, setUserTier] = useState<'STANDARD' | 'ELITE'>('STANDARD');
  const [isVerified, setIsVerified] = useState<boolean>(true);
  const [isVerifying, setIsVerifying] = useState<boolean>(false);
  const [isEliteModalOpen, setIsEliteModalOpen] = useState(false);
  const [targetEliteName, setTargetEliteName] = useState('Elite Member');

  const fetchUserTier = async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet?.tier) setUserTier(data.wallet.tier);
        if (data.wallet?.isVerified !== undefined) setIsVerified(data.wallet.isVerified);
      }
    } catch (err) {}
  };

  const toggleVerificationStatus = async () => {
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'toggle_verification' })
      });
      if (res.ok) {
        const data = await res.json();
        setIsVerified(data.wallet.isVerified);
      }
    } catch (err) {
      setIsVerified(prev => !prev);
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
        const data = await res.json();
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
          photos = parsed.photos.filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
        } else if (parsed.avatar && !parsed.avatar.includes('unsplash.com') && parsed.avatar !== '/crown-gold.png') {
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

  const fetchLiveDirectory = async () => {
    syncLocalUser();
    try {
      const url = `/api/directory?query=${encodeURIComponent(searchQuery)}&city=${encodeURIComponent(selectedCity)}`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.profiles) {
          setMembers(data.profiles);
        }
      }
    } catch (err) {
      console.log('Directory API fallback');
    }
  };

  useEffect(() => {
    fetchLiveDirectory();
    fetchUserTier();
    const handleProfileUpdate = () => {
      syncLocalUser();
      fetchLiveDirectory();
    };
    window.addEventListener('kmc_profile_updated', handleProfileUpdate);
    window.addEventListener('storage', handleProfileUpdate);
    return () => {
      window.removeEventListener('kmc_profile_updated', handleProfileUpdate);
      window.removeEventListener('storage', handleProfileUpdate);
    };
  }, [searchQuery, selectedCity]);

  const toggleConnectionRequest = (member: MemberProfile) => {
    if (member.tier === 'ELITE' && userTier !== 'ELITE') {
      setTargetEliteName(member.name);
      setIsEliteModalOpen(true);
      return;
    }

    if (sentRequests.includes(member.id)) {
      setSentRequests(sentRequests.filter(rId => rId !== member.id));
    } else {
      setSentRequests([...sentRequests, member.id]);
    }
  };

  const nonSelfMembers = members.filter(m => {
    const isCurrentUser = Boolean(
      (localUserData.id && m.id === localUserData.id) ||
      (localUserData.email && m.id && m.id.toLowerCase() === localUserData.email.toLowerCase()) ||
      (localUserData.email && (m as any).email && (m as any).email.toLowerCase() === localUserData.email.toLowerCase()) ||
      (localUserData.name && m.name && m.name.toLowerCase() === localUserData.name.toLowerCase())
    );
    return !isCurrentUser;
  });

  const filteredMembers = nonSelfMembers.filter(m => {
    const matchesSearch = !searchQuery || 
      m.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.occupation.toLowerCase().includes(searchQuery.toLowerCase()) ||
      m.location.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCity = selectedCity === 'All' || m.location.toLowerCase().includes(selectedCity.toLowerCase());
    return matchesSearch && matchesCity;
  });

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-x-clip">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Verified Member Directory Access */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
          <div>
            <Badge type="tier" label="MEMBER DIRECTORY" />
            <h1 className="text-3xl sm:text-5xl font-serif font-bold mt-2 gold-gradient-text">
              Member Directory
            </h1>
            <p className="text-xs sm:text-sm text-white/70 mt-1">
              Connect with verified members across Nigeria and international hubs.
            </p>
          </div>

          {/* Search & Global / Nigerian City Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center gap-3 w-full md:w-auto">
            <div className="relative w-full sm:w-64">
              <Search className="w-4 h-4 text-white/40 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search name, role, city..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 rounded-full bg-white/5 border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <select
              value={selectedCity}
              onChange={(e) => setSelectedCity(e.target.value)}
              className="w-full sm:w-auto px-4 py-2 rounded-full bg-[#0D0D12] border border-[#D4AF37]/30 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
            >
              <option value="All">All Worldwide Locations</option>
              
              {/* Nigeria Organized by Geopolitical Zones covering all 36 States + FCT */}
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

              <optgroup label="Africa — Key Hubs">
                <option value="Accra">Accra (Ghana)</option>
                <option value="Nairobi">Nairobi (Kenya)</option>
                <option value="Johannesburg">Johannesburg (South Africa)</option>
                <option value="Cape Town">Cape Town (South Africa)</option>
                <option value="Cairo">Cairo (Egypt)</option>
                <option value="Kigali">Kigali (Rwanda)</option>
                <option value="Dakar">Dakar (Senegal)</option>
                <option value="Abidjan">Abidjan (Ivory Coast)</option>
                <option value="Marrakech">Marrakech (Morocco)</option>
              </optgroup>

              <optgroup label="Europe">
                <option value="London">London (United Kingdom)</option>
                <option value="Paris">Paris (France)</option>
                <option value="Milan">Milan (Italy)</option>
                <option value="Geneva">Geneva & Zurich (Switzerland)</option>
                <option value="Monaco">Monaco (Monte Carlo)</option>
                <option value="Madrid">Madrid & Barcelona (Spain)</option>
                <option value="Berlin">Berlin & Munich (Germany)</option>
                <option value="Amsterdam">Amsterdam (Netherlands)</option>
                <option value="Rome">Rome & Amalfi Coast (Italy)</option>
              </optgroup>

              <optgroup label="Americas">
                <option value="New York">New York (USA)</option>
                <option value="Miami">Miami (USA)</option>
                <option value="Los Angeles">Los Angeles (USA)</option>
                <option value="Atlanta">Atlanta & Houston (USA)</option>
                <option value="Toronto">Toronto (Canada)</option>
                <option value="Rio de Janeiro">Rio de Janeiro (Brazil)</option>
              </optgroup>

              <optgroup label="Middle East">
                <option value="Dubai">Dubai & Abu Dhabi (UAE)</option>
                <option value="Doha">Doha (Qatar)</option>
                <option value="Riyadh">Riyadh & Jeddah (Saudi Arabia)</option>
              </optgroup>

              <optgroup label="Asia & Pacific">
                <option value="Singapore">Singapore</option>
                <option value="Tokyo">Tokyo (Japan)</option>
                <option value="Hong Kong">Hong Kong</option>
                <option value="Seoul">Seoul (South Korea)</option>
                <option value="Bangkok">Bangkok & Phuket (Thailand)</option>
                <option value="Bali">Bali (Indonesia)</option>
                <option value="Sydney">Sydney & Melbourne (Australia)</option>
              </optgroup>
            </select>
          </div>
        </div>

            {/* Members Directory Grid */}
            {filteredMembers.length === 0 ? (
              <Card className="text-center py-16 max-w-lg mx-auto border-white/10">
                <Users className="w-10 h-10 text-[#D4AF37] mx-auto mb-3 opacity-80" />
                <h3 className="font-serif text-xl font-bold text-white">No Members Found</h3>
                <p className="text-xs text-white/50 mt-1 max-w-xs mx-auto">
                  No verified club members match your search or city criteria. New vetted profiles join daily.
                </p>
              </Card>
            ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {filteredMembers.map((member) => {
                const isRequested = sentRequests.includes(member.id);
                const isElite = member.tier === 'ELITE';
                const isCurrentUser = Boolean(
                  (localUserData.id && member.id === localUserData.id) ||
                  (localUserData.name && member.name && member.name.toLowerCase() === localUserData.name.toLowerCase()) ||
                  (localUserData.email && member.id && member.id.toLowerCase() === localUserData.email.toLowerCase())
                );
                const memberPhoto = (member.photos && member.photos.length > 0 && member.photos[0] && !member.photos[0].includes('unsplash.com') && member.photos[0] !== '/crown-gold.png')
                  ? member.photos[0]
                  : (isCurrentUser && localUserData.photos.length > 0 ? localUserData.photos[0] : null);

                return (
                  <Card key={member.id} className="p-6 border-white/10 hover:border-[#D4AF37]/40 flex flex-col justify-between relative group">
                    {isElite && (
                      <div className="absolute top-4 right-4">
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold tracking-wider uppercase bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/50 flex items-center gap-1 shadow-sm">
                          <Crown className="w-3 h-3" /> Elite Circle
                        </span>
                      </div>
                    )}

                    <div>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="relative">
                          {memberPhoto ? (
                            <img
                              src={memberPhoto}
                              alt={member.name}
                              className={`w-16 h-16 rounded-full object-cover border-2 ${
                                isElite ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-white/20'
                              }`}
                            />
                          ) : (
                            <div className={`w-16 h-16 rounded-full bg-gradient-to-br from-[#1E1B13] via-[#12110C] to-black flex items-center justify-center font-serif font-bold text-xl text-[#D4AF37] border-2 ${
                              isElite ? 'border-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.3)]' : 'border-[#D4AF37]/40'
                            }`}>
                              {(member.name || 'M').charAt(0).toUpperCase()}
                            </div>
                          )}
                          {isElite && (
                            <div className="absolute -bottom-1 -right-1 w-5 h-5 rounded-full bg-black border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                              <Crown className="w-2.5 h-2.5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <h3 className="font-serif font-bold text-lg text-white flex items-center gap-1.5">
                            <span>{member.name}, {member.age}</span>
                          </h3>
                          <p className="text-xs text-[#F5E6CA]">{member.occupation}</p>
                          <p className="text-[11px] text-white/50 flex items-center gap-1 mt-0.5">
                            <MapPin className="w-3 h-3 text-[#D4AF37]" /> {member.location}
                          </p>
                        </div>
                      </div>

                      <p className="text-xs text-white/70 line-clamp-2 leading-relaxed">
                        "{member.bio}"
                      </p>

                      <div className="flex flex-wrap gap-1.5 mt-4">
                        {member.interests.slice(0, 3).map((tag) => (
                          <Badge key={tag} label={tag} />
                        ))}
                      </div>
                    </div>

                    <div className="mt-6 pt-4 border-t border-white/10 flex items-center gap-2">
                      <Link 
                        href={`/messages?recipient=${member.id}&name=${encodeURIComponent(member.name)}&photo=${encodeURIComponent(member.photos?.[0] || '')}`} 
                        className="flex-1"
                      >
                        <Button
                          variant="gold"
                          size="sm"
                          fullWidth
                          icon={<MessageSquare className="w-3.5 h-3.5 text-black" />}
                        >
                          Message
                        </Button>
                      </Link>
                      <Link href={`/profile/${member.id}`} className="flex-1">
                        <Button variant="glass" size="sm" fullWidth>
                          View Profile
                        </Button>
                      </Link>
                    </div>
                  </Card>
                );
              })}
            </div>
            )}

      </main>

      {/* Elite Upgrade Gating Modal */}
      <CreditsAndGiftingModal
        isOpen={isEliteModalOpen}
        onClose={() => { setIsEliteModalOpen(false); fetchUserTier(); }}
        defaultTab="elite"
        recipientName={targetEliteName}
      />
    </div>
  );
}
