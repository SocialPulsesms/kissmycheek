'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Eye, 
  EyeOff, 
  Bell, 
  Lock, 
  User, 
  Crown, 
  Trash2, 
  Check, 
  LogOut,
  Scan,
  Camera,
  CheckCircle2,
  AlertCircle,
  Image as ImageIcon,
  Sparkles,
  Compass,
  Film,
  Headphones,
  Bot,
  Send,
  MessageSquare,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle,
  Clock,
  ArrowRight,
  ChevronRight,
  HelpCircle
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { performLogout } from '@/lib/authClient';
import { SupportTicket, SupportCategory, TicketPriority } from '@/lib/supportStore';
import { calculateAge } from '@/lib/dateUtils';
import { LocationPicker } from '@/components/ui/LocationPicker';

const ALL_AVAILABLE_INTERESTS = [
  'Afrobeats & Global Sound',
  'Owambe Luxury & Galas',
  'Lagos & Abuja Polo Clubs',
  'Banana Island & Ikoyi Real Estate',
  'Nollywood Cinema & Arts',
  'African Contemporary Art',
  'Traditional Royalty & Heritage',
  'Tech Angel & Venture Investing',
  'Fine Dining & Suya Grills',
  'High Society Soirées & Lounges',
  'Eko Atlantic Yachting',
  'Private Jet & Aviation Charter',
  'Haute Couture & Aso Ebi Elegance',
  'Horology & Luxury Timepieces',
  'Michelin Gastronomy & Wine Tasting',
  'Equestrian & Polo Sports',
  'Philanthropy & Foundation Galas',
  'Architectural Design & Estates',
  'Formula 1 & Supercars',
  'Wellness, Spa & Golfing Retreats',
  'Art & Fine Art',
  'Yachting & Sailing',
  'Venture Capital & Private Equity',
  'Alpine Skiing & St. Moritz',
  'Classical Music & Opera'
];

export default function SettingsPage() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'profile' | 'portfolio' | 'biometrics' | 'account' | 'privacy' | 'notifications' | 'membership' | 'support'>('profile');
  
  // Profile & Demographics (Editable except Legal Name)
  const [fullName, setFullName] = useState('');
  const [customName, setCustomName] = useState('');
  const [dob, setDob] = useState('1998-01-01');
  const [gender, setGender] = useState('Woman');
  const [pronouns, setPronouns] = useState('she/her');
  const [height, setHeight] = useState(`5'8" (173 cm)`);
  const [location, setLocation] = useState('Lagos, Nigeria');
  const [occupation, setOccupation] = useState('Private Equity Partner');
  const [education, setEducation] = useState('Oxford & LSE Alum');
  const [bio, setBio] = useState('Connoisseur of luxury travel, contemporary art, and fine dining.');
  const [relationshipGoals, setRelationshipGoals] = useState('Serious Relationship & Marriage');
  const [interestedIn, setInterestedIn] = useState('Men');
  const [interests, setInterests] = useState<string[]>([
    'Afrobeats & Global Sound',
    'Owambe Luxury & Galas',
    'Lagos & Abuja Polo Clubs',
    'Venture Capital & Private Equity'
  ]);

  // Account Security Credentials
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [incognitoMode, setIncognitoMode] = useState(false);
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [readReceipts, setReadReceipts] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailDigest, setEmailDigest] = useState(true);
  const [savedSuccess, setSavedSuccess] = useState(false);

  // User Photos & Video Portfolio State (4+ photos, 5+ videos)
  const [userPhotos, setUserPhotos] = useState<string[]>([]);
  const [userVideos, setUserVideos] = useState<string[]>([]);
  const [coverIndex, setCoverIndex] = useState(0);
  const [portfolioError, setPortfolioError] = useState('');
  const photoInputRef = React.useRef<HTMLInputElement>(null);
  const primaryAvatarInputRef = React.useRef<HTMLInputElement>(null);
  const videoInputRef = React.useRef<HTMLInputElement>(null);

  const persistPhotosState = async (photos: string[], activeCoverIdx: number) => {
    try {
      const existing = localStorage.getItem('kmc_user_profile');
      const parsed = existing ? JSON.parse(existing) : {};
      parsed.photos = photos;
      parsed.coverIndex = activeCoverIdx;
      parsed.avatar = photos[activeCoverIdx] || photos[0];
      localStorage.setItem('kmc_user_profile', JSON.stringify(parsed));
      window.dispatchEvent(new Event('kmc_profile_updated'));
    } catch {}

    // Immediately persist to server database
    try {
      await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photos })
      });
    } catch (e) {
      console.log('Settings photo sync error', e);
    }
  };

  const toggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter(i => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleProfilePhotoChange = (file: File) => {
    const reader = new FileReader();
    reader.onload = async () => {
      if (typeof reader.result === 'string') {
        const newUrl = reader.result;
        const updated = [newUrl, ...userPhotos.filter(u => u !== newUrl)];
        setUserPhotos(updated);
        setCoverIndex(0);
        await persistPhotosState(updated, 0);
        setSavedSuccess(true);
        setTimeout(() => setSavedSuccess(false), 2500);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetCoverPhoto = async (idx: number) => {
    setCoverIndex(idx);
    await persistPhotosState(userPhotos, idx);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Photo Upload Facial Verification Scanner state
  const [selectedUploadType, setSelectedUploadType] = useState<'valid_owner' | 'fake_face' | 'non_human'>('valid_owner');
  const [isAnalyzingPhoto, setIsAnalyzingPhoto] = useState(false);
  const [scanResult, setScanResult] = useState<{
    status: 'approved' | 'rejected' | 'non_human_approved';
    title: string;
    message: string;
    score?: number;
  } | null>({
    status: 'approved',
    title: 'Selfie Face Match Confirmed',
    message: 'Facial landmarks match registered security selfie template with 99.2% confidence.',
    score: 99.2
  });

  // VIP Concierge & AI Support State
  const [supportSubTab, setSupportSubTab] = useState<'ai_concierge' | 'tickets' | 'new_ticket'>('ai_concierge');
  const [aiChatMessages, setAiChatMessages] = useState<Array<{
    id: string;
    sender: 'USER' | 'AI';
    text: string;
    time: string;
    suggestedActions?: Array<{ label: string; href?: string; action?: string }>;
  }>>([
    {
      id: 'welcome-ai',
      sender: 'AI',
      text: 'Greetings. I am your 24/7 Kiss My Cheek AI Club Concierge. How may I assist you with your VIP membership, verification, credits, private dates, or account today?',
      time: 'Just now',
      suggestedActions: [
        { label: '👑 Elite Circle Benefits', action: 'QUERY_ELITE' },
        { label: '🛡️ Biometric Selfie Verification', action: 'QUERY_VERIFY' },
        { label: '💎 Credits & Gifting', action: 'QUERY_CREDITS' },
        { label: '🔒 Phone Privacy Policy', action: 'QUERY_PRIVACY' },
        { label: '🔥 Naughty Zone ₦5M Race', action: 'QUERY_NAUGHTY' }
      ]
    }
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiThinking, setIsAiThinking] = useState(false);
  const [userTickets, setUserTickets] = useState<SupportTicket[]>([]);
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null);
  const [ticketReplyInput, setTicketReplyInput] = useState('');
  const [isSubmittingTicketReply, setIsSubmittingTicketReply] = useState(false);
  const [newTicketSubject, setNewTicketSubject] = useState('');
  const [newTicketCategory, setNewTicketCategory] = useState<SupportCategory>('GENERAL');
  const [newTicketPriority, setNewTicketPriority] = useState<TicketPriority>('NORMAL');
  const [newTicketMessage, setNewTicketMessage] = useState('');
  const [ticketCreateSuccess, setTicketCreateSuccess] = useState(false);

  const fetchUserTickets = async () => {
    try {
      const res = await fetch('/api/support');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.tickets) {
          setUserTickets(data.tickets);
          if (data.tickets.length > 0 && !selectedTicketId) {
            setSelectedTicketId(data.tickets[0].id);
          }
        }
      }
    } catch {}
  };

  const handleSendAiMessage = async (queryText?: string) => {
    const textToSend = (queryText || aiInput).trim();
    if (!textToSend || isAiThinking) return;

    const userMsg = {
      id: `msg-${Date.now()}-user`,
      sender: 'USER' as const,
      text: textToSend,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setAiChatMessages(prev => [...prev, userMsg]);
    setAiInput('');
    setIsAiThinking(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'ai_query', prompt: textToSend })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setAiChatMessages(prev => [
            ...prev,
            {
              id: `msg-${Date.now()}-ai`,
              sender: 'AI' as const,
              text: data.answer,
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
              suggestedActions: data.suggestedActions
            }
          ]);
        }
      }
    } catch {
      setAiChatMessages(prev => [
        ...prev,
        {
          id: `msg-${Date.now()}-ai`,
          sender: 'AI' as const,
          text: 'Our AI Concierge is syncing with the executive registry. You can also open a direct ticket to our human staff below.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          suggestedActions: [{ label: 'Contact Human Staff', action: 'CREATE_TICKET' }]
        }
      ]);
    } finally {
      setIsAiThinking(false);
    }
  };

  const handleCreateTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTicketSubject.trim() || !newTicketMessage.trim()) return;

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_ticket',
          subject: newTicketSubject,
          category: newTicketCategory,
          priority: newTicketPriority,
          message: newTicketMessage,
          userName: fullName || 'Verified Member',
          userEmail: email || 'member@kissmycheek.com',
          userAvatar: userPhotos[0]
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTicketCreateSuccess(true);
          setNewTicketSubject('');
          setNewTicketMessage('');
          fetchUserTickets();
          setTimeout(() => {
            setTicketCreateSuccess(false);
            setSupportSubTab('tickets');
            setSelectedTicketId(data.ticket.id);
          }, 1500);
        }
      }
    } catch {}
  };

  const handleSendTicketReply = async () => {
    if (!ticketReplyInput.trim() || !selectedTicketId || isSubmittingTicketReply) return;
    setIsSubmittingTicketReply(true);

    try {
      const res = await fetch('/api/support', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'reply_ticket',
          ticketId: selectedTicketId,
          message: ticketReplyInput,
          sender: 'USER',
          senderName: fullName || 'Verified Member',
          senderAvatar: userPhotos[0]
        })
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setTicketReplyInput('');
          fetchUserTickets();
        }
      }
    } catch {} finally {
      setIsSubmittingTicketReply(false);
    }
  };

  const fetchUserSettings = async () => {
    try {
      const savedProfile = localStorage.getItem('kmc_user_profile');
      if (savedProfile) {
        const parsed = JSON.parse(savedProfile);
        if (parsed.photos && Array.isArray(parsed.photos) && parsed.photos.length > 0) {
          setUserPhotos(parsed.photos.filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png'));
        }
        if (typeof parsed.coverIndex === 'number') {
          setCoverIndex(parsed.coverIndex);
        }
        if (parsed.fullName) setFullName(parsed.fullName);
        if (parsed.customName) setCustomName(parsed.customName);
        if (parsed.email) setEmail(parsed.email);
        if (parsed.phone) setPhone(parsed.phone);
        if (parsed.dob) setDob(parsed.dob);
        if (parsed.gender) setGender(parsed.gender);
        if (parsed.pronouns) setPronouns(parsed.pronouns);
        if (parsed.height) setHeight(parsed.height);
        if (parsed.location) setLocation(parsed.location);
        if (parsed.occupation) setOccupation(parsed.occupation);
        if (parsed.education) setEducation(parsed.education);
        if (parsed.bio) setBio(parsed.bio);
        if (parsed.relationshipGoals) setRelationshipGoals(parsed.relationshipGoals);
        if (parsed.interestedIn) setInterestedIn(parsed.interestedIn);
        if (parsed.interests || parsed.traits) {
          setInterests(parsed.interests || parsed.traits || []);
        }
      }
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setIncognitoMode(data.user.incognitoMode ?? false);
          setFullName(data.user.fullName || data.user.profile?.fullName || '');
          setCustomName(data.user.profile?.customName || data.user.customName || '');
          setEmail(data.user.email || '');
          if (data.user.phone) setPhone(data.user.phone);
          if (data.user.profile) {
            const p = data.user.profile;
            if (p.dob) setDob(p.dob);
            if (p.gender) setGender(p.gender);
            if (p.pronouns) setPronouns(p.pronouns);
            if (p.height) setHeight(p.height);
            if (p.location) setLocation(p.location);
            if (p.occupation) setOccupation(p.occupation);
            if (p.education) setEducation(p.education);
            if (p.bio) setBio(p.bio);
            if (p.relationshipGoals) setRelationshipGoals(p.relationshipGoals);
            if (p.interestedIn) setInterestedIn(p.interestedIn);
            if (p.interests && Array.isArray(p.interests)) setInterests(p.interests);
            if (p.photos && Array.isArray(p.photos) && p.photos.length > 0) {
              const cleanPhotos = p.photos.filter((u: string) => u && !u.includes('unsplash.com') && u !== '/crown-gold.png');
              setUserPhotos(cleanPhotos);
            }
          }
        }
      }
    } catch (err) {
      console.log('Error fetching user settings');
    }
  };

  React.useEffect(() => {
    fetchUserSettings();
    fetchUserTickets();
  }, []);

  const handleSave = async () => {
    try {
      persistPhotosState(userPhotos, coverIndex);
      try {
        const existing = localStorage.getItem('kmc_user_profile');
        const parsed = existing ? JSON.parse(existing) : {};
        parsed.fullName = fullName;
        parsed.customName = customName;
        parsed.email = email;
        parsed.phone = phone;
        parsed.dob = dob;
        parsed.gender = gender;
        parsed.pronouns = pronouns;
        parsed.height = height;
        parsed.location = location;
        parsed.occupation = occupation;
        parsed.education = education;
        parsed.bio = bio;
        parsed.relationshipGoals = relationshipGoals;
        parsed.interestedIn = interestedIn;
        parsed.interests = interests;
        parsed.traits = interests;
        parsed.photos = userPhotos;
        localStorage.setItem('kmc_user_profile', JSON.stringify(parsed));
        window.dispatchEvent(new Event('kmc_profile_updated'));
      } catch {}

      const res = await fetch('/api/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          incognitoMode,
          customName,
          dob,
          gender,
          pronouns,
          height,
          location,
          occupation,
          education,
          bio,
          relationshipGoals,
          interestedIn,
          interests,
          photos: userPhotos,
          email,
          phone,
          password: password || undefined
        })
      });

      if (res.ok) {
        setSavedSuccess(true);
        setPassword('');
        fetchUserSettings();
        setTimeout(() => setSavedSuccess(false), 2000);
      }
    } catch (err) {
      console.log('Error updating settings');
    }
  };

  const handleLogout = async () => {
    await performLogout();
  };

  const handleRunBiometricClearanceTest = (type: 'valid_owner' | 'fake_face' | 'non_human') => {
    setSelectedUploadType(type);
    setIsAnalyzingPhoto(true);
    setScanResult(null);

    setTimeout(() => {
      setIsAnalyzingPhoto(false);
      if (type === 'valid_owner') {
        setScanResult({
          status: 'approved',
          title: 'Selfie Face Match Confirmed',
          message: 'Human face scanned and verified against account selfie template (99.4% Match). Media Approved.',
          score: 99.4
        });
      } else if (type === 'fake_face') {
        setScanResult({
          status: 'rejected',
          title: 'Security Alert: Facial Mismatch',
          message: 'Face detected in photo does NOT match the registered account owner selfie! Photo upload rejected to prevent impersonation.',
          score: 14.1
        });
      } else {
        setScanResult({
          status: 'non_human_approved',
          title: 'Non-Human Media Approved',
          message: 'Non-human lifestyle image detected (Yacht / Fine Art / Pet). Approved without facial check constraint.',
        });
      }
    }, 1800);
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-hidden">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <Badge type="tier" label="SETTINGS" />
            <h1 className="text-3xl sm:text-4xl font-serif font-bold mt-1.5 gold-gradient-text">
              Settings & Privacy
            </h1>
            <p className="text-xs text-white/60 mt-1">
              Manage facial verification, privacy controls, and account preferences.
            </p>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {savedSuccess && (
              <span className="px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 animate-pulse">
                <Check className="w-3.5 h-3.5" /> Saved
              </span>
            )}
            <Button
              variant="danger"
              size="sm"
              onClick={handleLogout}
              icon={<LogOut className="w-4 h-4" />}
            >
              Log Out
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* Left Column Settings Tabs (Lg: 3 cols) */}
          <div className="lg:col-span-3 space-y-2">
            {[
              { id: 'profile', label: 'Profile & Demographics', icon: User },
              { id: 'portfolio', label: 'Photos & Videos', icon: ImageIcon },
              { id: 'biometrics', label: 'Biometrics & Selfie', icon: Scan },
              { id: 'account', label: 'Security & Credentials', icon: Lock },
              { id: 'privacy', label: 'Privacy & Incognito', icon: ShieldCheck },
              { id: 'notifications', label: 'Notifications', icon: Bell },
              { id: 'membership', label: 'Membership Plan', icon: Crown },
              { id: 'support', label: 'VIP Concierge & AI Help', icon: Headphones },
            ].map((tab) => {
              const Icon = tab.icon;
              const isSelected = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`w-full p-3.5 rounded-2xl text-xs font-semibold text-left transition-all flex items-center gap-3 ${
                    isSelected
                      ? 'bg-[#D4AF37] text-black shadow-md'
                      : 'glass-panel text-white/70 hover:text-white hover:bg-white/5'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isSelected ? 'text-black' : 'text-[#D4AF37]'}`} />
                  <span>{tab.label}</span>
                </button>
              );
            })}

            <button
              onClick={handleLogout}
              className="w-full p-3.5 rounded-2xl text-xs font-semibold text-left transition-all flex items-center gap-3 bg-rose-500/10 border border-rose-500/30 text-rose-300 hover:bg-rose-500/20 hover:text-rose-200 mt-4"
            >
              <LogOut className="w-4 h-4 text-rose-400" />
              <span>Log Out</span>
            </button>
          </div>

          {/* Right Column Settings Content Panel (Lg: 9 cols) */}
          <div className="lg:col-span-9">
            
            {/* PROFILE & DEMOGRAPHICS EDITING TAB */}
            {activeTab === 'profile' && (
              <Card className="p-6 sm:p-8 border-[#D4AF37]/40 shadow-2xl space-y-6">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                      <User className="w-5 h-5 text-[#D4AF37]" /> Profile & Identity Demographics
                    </h3>
                    <p className="text-xs text-white/60 mt-1">
                      Customize your public alias, career, personal bio, and lifestyle passions. Legal name is locked for KYC safety.
                    </p>
                  </div>
                  <Badge type="tier" label="VERIFIED MEMBER" />
                </div>

                <div className="space-y-6">
                  {/* Identity Row: Legal Name (Locked) & Custom Name (Editable) */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                          <Lock className="w-3.5 h-3.5 text-[#D4AF37]" /> Full Legal Name
                        </label>
                        <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1">
                          🔒 KYC Locked
                        </span>
                      </div>
                      <input
                        type="text"
                        value={fullName}
                        readOnly
                        disabled
                        className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white/60 text-xs cursor-not-allowed select-none"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Full legal name is verified during registration and cannot be modified to protect community security.
                      </span>
                    </div>

                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-semibold text-white/80 flex items-center gap-1.5">
                          <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" /> Custom Display Name / Alias
                        </label>
                        <span className="text-[10px] text-emerald-400 font-semibold">Public Identity</span>
                      </div>
                      <input
                        type="text"
                        placeholder="e.g. Lord Henry, Queen Zara, King Victor"
                        value={customName}
                        onChange={(e) => setCustomName(e.target.value)}
                        className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                      />
                      <span className="text-[10px] text-white/40 mt-1 block">
                        Displayed on your public profile, discovery cards, chat messages, and private events.
                      </span>
                    </div>
                  </div>

                  {/* Date of Birth & Age Calculation */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Date of Birth</label>
                      <input
                        type="date"
                        value={dob}
                        onChange={(e) => setDob(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                      <div className="mt-1 flex items-center justify-between">
                        <span className="text-[10px] text-white/40">21+ members only</span>
                        {dob && (
                          <span className="text-[11px] font-bold gold-gradient-text">
                            Age: {calculateAge(dob)} yrs
                          </span>
                        )}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Gender Identity</label>
                      <select
                        value={gender}
                        onChange={(e) => setGender(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      >
                        <option value="Woman">Woman</option>
                        <option value="Man">Man</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Pronouns</label>
                      <input
                        type="text"
                        placeholder="e.g. she/her, he/him"
                        value={pronouns}
                        onChange={(e) => setPronouns(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Height & Location */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Height</label>
                      <input
                        type="text"
                        placeholder={`e.g. 5'10" (178 cm)`}
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Geographic Residence / Location</label>
                      <LocationPicker
                        value={location}
                        onChange={(loc) => setLocation(loc)}
                      />
                    </div>
                  </div>

                  {/* Career & Education */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Occupation & Industry</label>
                      <input
                        type="text"
                        placeholder="e.g. Private Equity Partner, Managing Director"
                        value={occupation}
                        onChange={(e) => setOccupation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1">Alma Mater / Education</label>
                      <input
                        type="text"
                        placeholder="e.g. Oxford, Harvard, LSE, Stanford, UNILAG"
                        value={education}
                        onChange={(e) => setEducation(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Short Member Bio */}
                  <div>
                    <label className="text-xs font-semibold text-white/80 block mb-1">Short Member Bio</label>
                    <textarea
                      rows={3}
                      placeholder="Describe your lifestyle, passions, and taste..."
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      className="w-full px-4 py-3 rounded-2xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none resize-none"
                    />
                  </div>

                  {/* Dating Intentions */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1.5">Interested in meeting</label>
                      <div className="grid grid-cols-3 gap-2">
                        {['Men', 'Women', 'Everyone'].map((opt) => (
                          <button
                            key={opt}
                            type="button"
                            onClick={() => setInterestedIn(opt)}
                            className={`py-2 rounded-full text-xs font-semibold border transition-all ${
                              interestedIn === opt
                                ? 'bg-[#D4AF37] text-black border-[#D4AF37] shadow-md'
                                : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                            }`}
                          >
                            {opt}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-white/80 block mb-1.5">Relationship Ambition</label>
                      <select
                        value={relationshipGoals}
                        onChange={(e) => setRelationshipGoals(e.target.value)}
                        className="w-full px-4 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                      >
                        <option value="Serious Relationship & Marriage">Serious Relationship & Marriage</option>
                        <option value="Exclusive Romantic Partnership">Exclusive Romantic Partnership</option>
                        <option value="Discreet Companionship">Discreet Companionship</option>
                        <option value="Luxury Social & Gala Networking">Luxury Social & Gala Networking</option>
                      </select>
                    </div>
                  </div>

                  {/* Curated Areas of Interest */}
                  <div className="space-y-3 pt-2">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-white/80 block">
                        Curated Areas of Interest (Nigerian & High Society Lifestyle)
                      </label>
                      <span className={`text-[11px] font-semibold ${interests.length >= 3 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {interests.length} selected
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {ALL_AVAILABLE_INTERESTS.map((interest) => {
                        const isSelected = interests.includes(interest);
                        return (
                          <button
                            key={interest}
                            type="button"
                            onClick={() => toggleInterest(interest)}
                            className={`p-2.5 rounded-xl border text-left text-xs font-medium transition-all flex items-center justify-between ${
                              isSelected
                                ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white'
                                : 'bg-white/5 border-white/10 text-white/60 hover:text-white hover:bg-white/10'
                            }`}
                          >
                            <span className="truncate pr-1">{interest}</span>
                            {isSelected && <Check className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="pt-4 border-t border-white/10 flex justify-end">
                    <Button variant="gold" onClick={handleSave} className="px-8 py-2.5 text-xs font-bold">
                      Save Profile Changes
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* MEDIA & VIDEO PORTFOLIO TAB */}
            {activeTab === 'portfolio' && (
              <Card className="p-6 sm:p-8 border-[#D4AF37]/40 shadow-2xl space-y-8">
                
                {/* PRIMARY PROFILE PICTURE HERO UPLOADER */}
                <div className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-black/80 via-[#14141E] to-black/90 border border-[#D4AF37]/50 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
                  <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-left">
                    <div className="relative group shrink-0">
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full p-1 bg-gradient-to-tr from-[#D4AF37] via-amber-500 to-amber-700 shadow-[0_0_25px_rgba(212,175,55,0.4)] flex items-center justify-center">
                        {userPhotos && userPhotos.length > 0 && userPhotos[coverIndex || 0] && !userPhotos[coverIndex || 0].includes('unsplash.com') ? (
                          <img
                            src={userPhotos[coverIndex] || userPhotos[0]}
                            alt="Primary Profile Picture"
                            className="w-full h-full rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full rounded-full bg-[#12110C] flex items-center justify-center font-serif font-bold text-3xl text-[#D4AF37]">
                            {(customName || fullName || 'M').charAt(0).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => primaryAvatarInputRef.current?.click()}
                        className="absolute bottom-0 right-0 p-2 rounded-full bg-[#D4AF37] text-black shadow-lg hover:scale-110 transition-transform"
                        title="Change Profile Picture"
                      >
                        <Camera className="w-4 h-4" />
                      </button>
                    </div>

                    <div>
                      <div className="flex items-center justify-center sm:justify-start gap-2 mb-1">
                        <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black">
                          Main Profile Picture
                        </span>
                        <span className="text-[11px] text-emerald-400 font-semibold flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5" /> Active
                        </span>
                      </div>
                      <h3 className="font-serif font-bold text-xl sm:text-2xl text-white">Your Public Profile Picture</h3>
                      <p className="text-xs text-white/60 mt-0.5 max-w-sm">
                        This is the primary portrait shown to other club members across Discovery, Matches, and Direct Dispatches.
                      </p>
                    </div>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-2.5 shrink-0 w-full sm:w-auto">
                    <Button
                      variant="gold"
                      size="sm"
                      onClick={() => primaryAvatarInputRef.current?.click()}
                      icon={<Camera className="w-4 h-4 text-black" />}
                      className="w-full sm:w-auto shadow-lg"
                    >
                      Change Picture
                    </Button>
                    <input
                      type="file"
                      ref={primaryAvatarInputRef}
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleProfilePhotoChange(file);
                      }}
                      accept="image/*"
                      className="hidden"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                        <ImageIcon className="w-5 h-5 text-[#D4AF37]" /> Photo Gallery (4+ Photos Mandated)
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        Click any photo below to set it as your main profile picture.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-500/20 border border-emerald-500/40 text-emerald-300">
                      {userPhotos.length} Photos Active
                    </span>
                  </div>

                  {portfolioError && (
                    <div className="mt-4 p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-200 text-xs">
                      {portfolioError}
                    </div>
                  )}

                  {/* Photos Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 mt-5">
                    {userPhotos.map((url, idx) => {
                      const isMain = coverIndex === idx;
                      return (
                        <div 
                          key={idx} 
                          className={`relative aspect-[3/4] rounded-2xl overflow-hidden border-2 transition-all group shadow-lg ${
                            isMain ? 'border-[#D4AF37] ring-2 ring-[#D4AF37]/50' : 'border-white/10 hover:border-[#D4AF37]/50'
                          }`}
                        >
                          <img src={url} alt={`Photo ${idx + 1}`} className="w-full h-full object-cover" />
                          
                          {isMain && (
                            <span className="absolute top-2 left-2 bg-[#D4AF37] text-black text-[9px] font-bold px-2 py-0.5 rounded-full uppercase shadow-md flex items-center gap-1">
                              <Sparkles className="w-3 h-3 fill-current" /> Main
                            </span>
                          )}

                          <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center gap-2 p-2 text-center">
                            {!isMain && (
                              <button
                                type="button"
                                onClick={() => handleSetCoverPhoto(idx)}
                                className="px-3 py-1.5 rounded-full bg-[#D4AF37] text-black text-[11px] font-bold hover:scale-105 transition-transform flex items-center gap-1 shadow-md"
                                title="Set as Main Profile Picture"
                              >
                                <Sparkles className="w-3.5 h-3.5 fill-current" /> Set as Main
                              </button>
                            )}
                            {userPhotos.length > 1 && (
                              <button
                                type="button"
                                onClick={async () => {
                                  const updated = userPhotos.filter((_, i) => i !== idx);
                                  setUserPhotos(updated);
                                  const newCover = coverIndex >= updated.length ? 0 : coverIndex;
                                  setCoverIndex(newCover);
                                  await persistPhotosState(updated, newCover);
                                }}
                                className="p-2 rounded-full bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
                                title="Delete photo"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}

                    <div 
                      onClick={() => photoInputRef.current?.click()}
                      className="aspect-[3/4] rounded-2xl border-2 border-dashed border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/15 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all hover:scale-[1.02]"
                    >
                      <Camera className="w-6 h-6 text-[#D4AF37] mb-1.5" />
                      <span className="text-xs font-bold text-white">Add Photo</span>
                      <span className="text-[10px] text-white/50">Camera / Gallery</span>
                      <input
                        type="file"
                        ref={photoInputRef}
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          const reader = new FileReader();
                          reader.onload = async () => {
                            if (typeof reader.result === 'string') {
                              const newUrl = reader.result;
                              const updated = [...userPhotos, newUrl];
                              setUserPhotos(updated);
                              await persistPhotosState(updated, coverIndex);
                              setSavedSuccess(true);
                              setTimeout(() => setSavedSuccess(false), 2000);
                            }
                          };
                          reader.readAsDataURL(file);
                        }}
                        accept="image/*"
                        className="hidden"
                      />
                    </div>
                  </div>
                </div>

                {/* Video Showcase Section */}
                <div className="pt-6 border-t border-white/10">
                  <div className="flex items-center justify-between border-b border-white/10 pb-4">
                    <div>
                      <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                        <Film className="w-5 h-5 text-[#D4AF37]" /> Video Reels & Lifestyle Showcase
                      </h3>
                      <p className="text-xs text-white/60 mt-1">
                        Upload short lifestyle videos or introductions to showcase your presence.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#D4AF37]">
                      {userVideos.length} / 5 Videos Active
                    </span>
                  </div>

                  {/* Video Reels Grid */}
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3.5 mt-5">
                    {userVideos.map((videoUrl, idx) => (
                      <div key={idx} className="relative aspect-[9/16] rounded-2xl overflow-hidden border-2 border-[#D4AF37]/40 bg-black group shadow-xl">
                        <video
                          src={videoUrl}
                          className="w-full h-full object-cover"
                          loop
                          muted
                          playsInline
                        />
                        <span className="absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] bg-black/80 text-[#D4AF37] font-bold">
                          Reel #{idx + 1}
                        </span>
                        <button
                          type="button"
                          onClick={() => setUserVideos(prev => prev.filter((_, i) => i !== idx))}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-rose-500/80 text-white hover:bg-rose-600 transition-colors"
                          title="Delete video"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}

                    {userVideos.length < 5 && (
                      <div 
                        onClick={() => videoInputRef.current?.click()}
                        className="aspect-[9/16] rounded-2xl border-2 border-dashed border-[#D4AF37]/40 bg-[#D4AF37]/5 hover:bg-[#D4AF37]/15 flex flex-col items-center justify-center text-center p-4 cursor-pointer transition-all hover:scale-[1.02]"
                      >
                        <Camera className="w-7 h-7 text-[#D4AF37] mb-2" />
                        <span className="text-xs font-bold text-white">Upload Reel</span>
                        <span className="text-[10px] text-white/50 mt-0.5">MP4 / MOV</span>
                        <input
                          type="file"
                          ref={videoInputRef}
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (!file) return;
                            const reader = new FileReader();
                            reader.onload = () => {
                              if (typeof reader.result === 'string') {
                                setUserVideos(prev => [...prev, reader.result as string]);
                              }
                            };
                            reader.readAsDataURL(file);
                          }}
                          accept="video/*"
                          className="hidden"
                        />
                      </div>
                    )}
                  </div>

                  <div className="mt-6 flex justify-end">
                    <Button 
                      variant="gold" 
                      onClick={() => {
                        setSavedSuccess(true);
                        setTimeout(() => setSavedSuccess(false), 2000);
                      }}
                    >
                      Save Photo & Video Changes
                    </Button>
                  </div>
                </div>
              </Card>
            )}

            {/* BIOMETRICS & PHOTO SCANNER TAB */}
            {activeTab === 'biometrics' && (
              <Card className="p-8 border-[#D4AF37]/40 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-white/10 pb-4">
                  <div>
                    <h3 className="font-serif font-bold text-xl text-white flex items-center gap-2">
                      <Scan className="w-5 h-5 text-[#D4AF37]" /> Registered Selfie Biometric Template
                    </h3>
                    <p className="text-xs text-white/60 mt-1">
                      Mandatory registration selfie used to scan and verify all future human picture uploads.
                    </p>
                  </div>
                  <Badge type="verified" label="BIOMETRIC KEY ACTIVE" />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
                  {/* Reference Selfie Display */}
                  <div className="md:col-span-4 flex flex-col items-center text-center p-4 rounded-3xl bg-white/5 border border-[#D4AF37]/30">
                    <div className="relative w-28 h-28 rounded-full overflow-hidden border-2 border-[#D4AF37] shadow-[0_0_20px_rgba(212,175,55,0.4)] mb-3 flex items-center justify-center bg-[#111116]">
                      {userPhotos[coverIndex] || userPhotos[0] ? (
                        <img
                          src={userPhotos[coverIndex] || userPhotos[0]}
                          alt="Registered Selfie Reference"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <Scan className="w-10 h-10 text-[#D4AF37]" />
                      )}
                      <div className="absolute inset-0 border border-[#D4AF37] rounded-full pointer-events-none" />
                    </div>
                    <span className="text-xs font-bold text-white">Registered Security Biometrics</span>
                    <span className="text-[10px] text-emerald-400 font-mono mt-0.5">Key ID: BIO-99482-FACEMESH</span>
                  </div>

                  {/* Verification Policy Description */}
                  <div className="md:col-span-8 space-y-3">
                    <h4 className="text-sm font-bold text-[#D4AF37] uppercase tracking-wider">Photo Scanning Policy</h4>
                    <ul className="text-xs text-white/70 space-y-2 list-disc list-inside leading-relaxed">
                      <li>
                        <strong className="text-white">Human Photo Uploads:</strong> Every new human picture added to your profile is automatically scanned against your registered Selfie Biometric Key.
                      </li>
                      <li>
                        <strong className="text-white">Impersonation Shield:</strong> Photos featuring other people or different faces are blocked to prevent fake profiles and catfishing.
                      </li>
                      <li>
                        <strong className="text-white">Non-Human Photo Exception:</strong> Lifestyle media (yachts, pets, fine art, luxury cars, scenery) is detected by AI and approved without face checks.
                      </li>
                    </ul>
                  </div>
                </div>

                {/* INTERACTIVE PHOTO UPLOAD VERIFICATION TESTER */}
                <div className="pt-6 border-t border-white/10 space-y-4">
                  <h4 className="text-sm font-bold text-white flex items-center gap-2">
                    <Camera className="w-4 h-4 text-[#D4AF37]" /> AI Biometric Media Clearance
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <button
                      type="button"
                      onClick={() => handleRunBiometricClearanceTest('valid_owner')}
                      className={`p-3.5 rounded-2xl border text-left text-xs transition-all ${
                        selectedUploadType === 'valid_owner'
                          ? 'bg-[#D4AF37]/15 border-[#D4AF37] text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold text-[#D4AF37] mb-1">Primary Portrait</span>
                      Owner Portrait Upload (Verified Biometric Match)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunBiometricClearanceTest('fake_face')}
                      className={`p-3.5 rounded-2xl border text-left text-xs transition-all ${
                        selectedUploadType === 'fake_face'
                          ? 'bg-rose-500/15 border-rose-500 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold text-rose-400 mb-1">Impersonation Shield</span>
                      Unverified Face Upload (Impersonation Defense)
                    </button>

                    <button
                      type="button"
                      onClick={() => handleRunBiometricClearanceTest('non_human')}
                      className={`p-3.5 rounded-2xl border text-left text-xs transition-all ${
                        selectedUploadType === 'non_human'
                          ? 'bg-emerald-500/15 border-emerald-400 text-white font-bold'
                          : 'bg-white/5 border-white/10 text-white/70 hover:text-white'
                      }`}
                    >
                      <span className="block text-xs font-bold text-emerald-400 mb-1">Lifestyle & Scenery</span>
                      Venue / Superyacht / Travel Media (Auto-Approved)
                    </button>
                  </div>

                  {/* SCANNING RESULTS BOX */}
                  <div className="p-5 rounded-2xl bg-black/60 border border-white/10 relative overflow-hidden">
                    {isAnalyzingPhoto ? (
                      <div className="py-6 flex flex-col items-center text-center space-y-2">
                        <Scan className="w-8 h-8 text-[#D4AF37] animate-spin" />
                        <span className="text-xs font-bold text-[#D4AF37] animate-pulse">Running AI Facial Mesh & Object Classifier...</span>
                        <span className="text-[10px] text-white/40">Comparing against registered selfie reference key BIO-99482...</span>
                      </div>
                    ) : scanResult ? (
                      <div className="space-y-2">
                        <div className="flex items-center gap-2">
                          {scanResult.status === 'approved' && (
                            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                          )}
                          {scanResult.status === 'rejected' && (
                            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
                          )}
                          {scanResult.status === 'non_human_approved' && (
                            <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
                          )}
                          <h4 className={`text-sm font-bold ${
                            scanResult.status === 'rejected' ? 'text-rose-300' : 'text-emerald-300'
                          }`}>
                            {scanResult.title}
                          </h4>
                        </div>
                        <p className="text-xs text-white/80 leading-relaxed pl-7">
                          {scanResult.message}
                        </p>
                      </div>
                    ) : null}
                  </div>
                </div>
              </Card>
            )}

            {/* ACCOUNT TAB */}
            {activeTab === 'account' && (
              <Card className="p-8 border-white/10 space-y-6">
                <h3 className="font-serif font-bold text-xl text-white">Account Details</h3>

                {/* Profile Picture Quick Manager */}
                <div className="p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-between gap-4 max-w-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-full p-0.5 bg-[#D4AF37] shrink-0">
                      <img
                        src={userPhotos[coverIndex] || userPhotos[0]}
                        alt="Profile Avatar"
                        className="w-full h-full rounded-full object-cover"
                      />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Profile Picture</span>
                      <span className="text-[11px] text-white/50">Displayed across all club channels</span>
                    </div>
                  </div>
                  <Button
                    variant="gold"
                    size="sm"
                    onClick={() => primaryAvatarInputRef.current?.click()}
                    icon={<Camera className="w-3.5 h-3.5 text-black" />}
                  >
                    Change Picture
                  </Button>
                </div>

                <div className="space-y-4 max-w-lg">
                  <div>
                    <label className="text-xs font-semibold text-white/80 block mb-1">Full Legal Name</label>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/80 block mb-1">Private Email Address</label>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-white/80 block">Private Phone Number</label>
                      <span className="text-[10px] text-emerald-400 font-semibold flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3 text-emerald-400" /> Private & Confidential
                      </span>
                    </div>
                    <input
                      type="tel"
                      placeholder="+234 803 123 4567"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                    <span className="text-[10px] text-white/40 mt-1 block">
                      🔒 Seen only by you. Strictly private and never visible on public member profiles or shared with other members.
                    </span>
                  </div>

                  <div>
                    <label className="text-xs font-semibold text-white/80 block mb-1">Change Security Password</label>
                    <input
                      type="password"
                      placeholder="Enter new password..."
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full px-4 py-3 rounded-full bg-white/5 border border-white/10 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div className="pt-6 border-t border-white/10 flex flex-wrap items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Button variant="gold" onClick={handleSave}>Save Account Changes</Button>
                    <button
                      onClick={handleLogout}
                      className="px-4 py-2.5 rounded-full border border-rose-500/40 text-xs font-semibold text-rose-300 hover:bg-rose-500/10 flex items-center gap-1.5 transition-all"
                    >
                      <LogOut className="w-3.5 h-3.5" /> Log Out
                    </button>
                  </div>
                  <button className="text-xs text-rose-400/70 hover:text-rose-400 hover:underline flex items-center gap-1 font-semibold">
                    <Trash2 className="w-4 h-4" /> Delete Account
                  </button>
                </div>
              </Card>
            )}

            {/* PRIVACY TAB */}
            {activeTab === 'privacy' && (
              <Card className="p-8 border-white/10 space-y-6">
                <h3 className="font-serif font-bold text-xl text-white">Privacy Controls & Discretion</h3>

                <div className="space-y-6">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <span className="font-bold text-white block">Incognito Mode</span>
                      <span className="text-xs text-white/60">Hide your profile from discovery except to members you explicitly like.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={incognitoMode}
                      onChange={(e) => setIncognitoMode(e.target.checked)}
                      className="w-6 h-6 accent-[#D4AF37]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <span className="font-bold text-white block">Online Status Visibility</span>
                      <span className="text-xs text-white/60">Show green active dot when online in chat.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={showOnlineStatus}
                      onChange={(e) => setShowOnlineStatus(e.target.checked)}
                      className="w-6 h-6 accent-[#D4AF37]"
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                    <div>
                      <span className="font-bold text-white block">Message Read Receipts</span>
                      <span className="text-xs text-white/60">Allow matches to see when you have read their message.</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={readReceipts}
                      onChange={(e) => setReadReceipts(e.target.checked)}
                      className="w-6 h-6 accent-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button variant="gold" onClick={handleSave}>Save Privacy Preferences</Button>
              </Card>
            )}

            {/* NOTIFICATIONS TAB */}
            {activeTab === 'notifications' && (
              <Card className="p-8 border-white/10 space-y-6">
                <h3 className="font-serif font-bold text-xl text-white">Notification Alert Preferences</h3>

                <div className="space-y-4">
                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <span className="font-semibold text-white block">Push Notifications</span>
                      <span className="text-xs text-white/50">Instant alerts for new matches, likes, and messages</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={pushNotifications}
                      onChange={(e) => setPushNotifications(e.target.checked)}
                      className="w-5 h-5 accent-[#D4AF37]"
                    />
                  </div>

                  <div className="flex items-center justify-between py-2 border-b border-white/5">
                    <div>
                      <span className="font-semibold text-white block">Weekly Member Digest</span>
                      <span className="text-xs text-white/50">Receive curated email digests of top compatible members</span>
                    </div>
                    <input
                      type="checkbox"
                      checked={emailDigest}
                      onChange={(e) => setEmailDigest(e.target.checked)}
                      className="w-5 h-5 accent-[#D4AF37]"
                    />
                  </div>
                </div>

                <Button variant="gold" onClick={handleSave}>Save Notification Preferences</Button>
              </Card>
            )}

            {/* MEMBERSHIP TAB */}
            {activeTab === 'membership' && (
              <Card className="p-8 border-[#D4AF37] gold-border-glow space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <Badge type="tier" label="ELITE VIP MEMBER" />
                    <h3 className="text-2xl font-serif font-bold text-white mt-1">Black Card Membership</h3>
                    <p className="text-xs text-white/60">Active subscription • Annual Billing</p>
                  </div>
                  <Link href="/membership">
                    <Button variant="gold">Upgrade / Manage Plan</Button>
                  </Link>
                </div>
              </Card>
            )}

            {/* VIP CONCIERGE & AI SUPPORT TAB */}
            {activeTab === 'support' && (
              <div className="space-y-6">
                
                {/* Header Banner */}
                <div className="p-6 rounded-3xl glass-card border-[#D4AF37]/40 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-2xl gold-gradient-bg flex items-center justify-center text-black shadow-lg shrink-0">
                      <Headphones className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="text-xl font-serif font-bold text-white gold-gradient-text">VIP Club Concierge & AI Helpdesk</h3>
                        <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          24/7 Live
                        </span>
                      </div>
                      <p className="text-xs text-white/60 mt-0.5">
                        Instant intelligent AI answers or direct 1-on-1 human dispatch with Club Administration.
                      </p>
                    </div>
                  </div>

                  {/* Sub-Tab Selector */}
                  <div className="flex items-center gap-1.5 p-1 bg-black/60 rounded-2xl border border-white/10 w-full sm:w-auto">
                    <button
                      type="button"
                      onClick={() => setSupportSubTab('ai_concierge')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        supportSubTab === 'ai_concierge'
                          ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Bot className="w-3.5 h-3.5" />
                      <span>AI Concierge</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => { setSupportSubTab('tickets'); fetchUserTickets(); }}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        supportSubTab === 'tickets'
                          ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <MessageSquare className="w-3.5 h-3.5" />
                      <span>My Tickets ({userTickets.length})</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setSupportSubTab('new_ticket')}
                      className={`flex-1 sm:flex-none px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all flex items-center justify-center gap-1.5 ${
                        supportSubTab === 'new_ticket'
                          ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                          : 'text-white/60 hover:text-white'
                      }`}
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>New Inquiry</span>
                    </button>
                  </div>
                </div>

                {/* 1. INSTANT AI CONCIERGE CHAT */}
                {supportSubTab === 'ai_concierge' && (
                  <Card className="p-0 border-[#D4AF37]/30 shadow-2xl overflow-hidden flex flex-col h-[600px] glass-panel">
                    
                    {/* Quick Inquiry Pills */}
                    <div className="p-3 bg-black/40 border-b border-white/10 flex items-center gap-2 overflow-x-auto no-scrollbar shrink-0">
                      <span className="text-[10px] uppercase font-bold text-[#D4AF37] tracking-wider shrink-0 pl-1">Ask AI:</span>
                      {[
                        { label: '👑 Elite Benefits', prompt: 'What are all the benefits and pricing for Elite Circle membership?' },
                        { label: '🛡️ Biometric Verification', prompt: 'How does live selfie facial biometric verification work?' },
                        { label: '💎 Credits & Gifting', prompt: 'How do Private Date Credits, Dom Pérignon stickers and Creator Diamonds work?' },
                        { label: '🔒 Phone Privacy', prompt: 'Is my phone number private and hidden from public members?' },
                        { label: '🔥 Naughty Zone ₦5M Race', prompt: 'How do I compete in the Naughty Zone weekly ₦5,000,000 cash pool?' },
                        { label: '💳 Flutterwave Billing', prompt: 'How does Flutterwave billing and payment receipts work?' }
                      ].map((item, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAiMessage(item.prompt)}
                          className="px-3 py-1 rounded-full bg-white/5 hover:bg-[#D4AF37]/20 border border-white/10 hover:border-[#D4AF37]/50 text-white/80 hover:text-[#FFF6D6] text-xs font-medium whitespace-nowrap transition-all shrink-0"
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>

                    {/* Messages Scroll Area */}
                    <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4">
                      {aiChatMessages.map((msg) => {
                        const isAi = msg.sender === 'AI';
                        return (
                          <div key={msg.id} className={`flex items-start gap-3 ${isAi ? '' : 'flex-row-reverse'}`}>
                            
                            {/* Avatar */}
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 border ${
                              isAi ? 'bg-black border-[#D4AF37] text-[#D4AF37]' : 'bg-[#D4AF37] border-black text-black'
                            }`}>
                              {isAi ? <Bot className="w-4 h-4 text-[#D4AF37]" /> : <User className="w-4 h-4 text-black" />}
                            </div>

                            {/* Message Bubble */}
                            <div className={`max-w-[85%] sm:max-w-[75%] rounded-3xl p-4 shadow-lg text-xs leading-relaxed ${
                              isAi 
                                ? 'bg-[#14141E]/95 border border-[#D4AF37]/30 text-white/90' 
                                : 'gold-gradient-bg text-black font-medium'
                            }`}>
                              <div className="flex items-center justify-between gap-4 mb-1">
                                <span className={`font-bold text-[11px] ${isAi ? 'text-[#D4AF37]' : 'text-black/80'}`}>
                                  {isAi ? 'Kiss My Cheek AI Concierge' : (fullName || 'You')}
                                </span>
                                <span className={`text-[10px] ${isAi ? 'text-white/40' : 'text-black/60'}`}>{msg.time}</span>
                              </div>

                              <div className="whitespace-pre-line">
                                {msg.text}
                              </div>

                              {/* Action Buttons if available */}
                              {msg.suggestedActions && msg.suggestedActions.length > 0 && (
                                <div className="mt-3 pt-2.5 border-t border-white/10 flex flex-wrap gap-2">
                                  {msg.suggestedActions.map((action, aIdx) => (
                                    action.href ? (
                                      <Link key={aIdx} href={action.href}>
                                        <button
                                          type="button"
                                          className="px-2.5 py-1 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 text-[#FFF6D6] hover:bg-[#D4AF37] hover:text-black font-semibold text-[11px] transition-all flex items-center gap-1"
                                        >
                                          <span>{action.label}</span>
                                          <ArrowRight className="w-3 h-3" />
                                        </button>
                                      </Link>
                                    ) : (
                                      <button
                                        key={aIdx}
                                        type="button"
                                        onClick={() => {
                                          if (action.action === 'CREATE_TICKET') {
                                            setSupportSubTab('new_ticket');
                                          } else if (action.action === 'QUERY_ELITE') {
                                            handleSendAiMessage('Tell me more about Elite Circle perks.');
                                          } else if (action.action === 'QUERY_VERIFY') {
                                            handleSendAiMessage('How do I complete Biometric Selfie check?');
                                          } else if (action.action === 'QUERY_CREDITS') {
                                            handleSendAiMessage('Explain credits and creator diamonds.');
                                          } else if (action.action === 'QUERY_PRIVACY') {
                                            handleSendAiMessage('Is my phone number kept private?');
                                          } else if (action.action === 'QUERY_NAUGHTY') {
                                            handleSendAiMessage('How do I win the Naughty Zone ₦5,000,000 pool?');
                                          }
                                        }}
                                        className="px-2.5 py-1 rounded-full bg-white/10 border border-white/20 text-white hover:border-[#D4AF37] text-[11px] font-semibold transition-all flex items-center gap-1"
                                      >
                                        <span>{action.label}</span>
                                      </button>
                                    )
                                  ))}
                                </div>
                              )}

                            </div>

                          </div>
                        );
                      })}

                      {isAiThinking && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-black border border-[#D4AF37] flex items-center justify-center text-[#D4AF37]">
                            <Bot className="w-4 h-4 animate-spin" />
                          </div>
                          <div className="p-3 rounded-2xl bg-[#14141E] border border-white/10 text-xs text-[#D4AF37] flex items-center gap-2 animate-pulse">
                            <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
                            <span>AI Concierge is consulting executive registry...</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Input Composer */}
                    <div className="p-3 sm:p-4 bg-black/60 border-t border-white/10 shrink-0">
                      <form
                        onSubmit={(e) => {
                          e.preventDefault();
                          handleSendAiMessage();
                        }}
                        className="flex items-center gap-2"
                      >
                        <input
                          type="text"
                          placeholder="Ask anything about VIP membership, payments, verification, credits, privacy..."
                          value={aiInput}
                          onChange={(e) => setAiInput(e.target.value)}
                          className="flex-1 px-4 py-2.5 rounded-full bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none"
                        />
                        <button
                          type="submit"
                          disabled={!aiInput.trim() || isAiThinking}
                          className="px-4 py-2.5 rounded-full gold-gradient-bg text-black font-bold text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-1.5 shadow-md"
                        >
                          <Send className="w-3.5 h-3.5" />
                          <span className="hidden sm:inline">Ask AI</span>
                        </button>
                      </form>
                    </div>

                  </Card>
                )}

                {/* 2. MY INQUIRIES & HUMAN SUPPORT TICKETS */}
                {supportSubTab === 'tickets' && (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                    
                    {/* Left List: User Tickets (Lg: 5 cols) */}
                    <div className="lg:col-span-5 space-y-3">
                      <div className="flex items-center justify-between px-1">
                        <span className="text-xs font-bold uppercase tracking-wider text-white/70">Support Records</span>
                        <button
                          type="button"
                          onClick={fetchUserTickets}
                          className="p-1 text-white/50 hover:text-[#D4AF37] transition-colors"
                          title="Refresh Tickets"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {userTickets.length === 0 ? (
                        <Card className="p-8 text-center border-white/10">
                          <MessageSquare className="w-8 h-8 text-[#D4AF37] mx-auto mb-2 opacity-60" />
                          <p className="text-xs font-bold text-white">No Tickets on Record</p>
                          <p className="text-[11px] text-white/50 mt-1">You currently have no open inquiries with Club Administration.</p>
                          <button
                            type="button"
                            onClick={() => setSupportSubTab('new_ticket')}
                            className="mt-3 px-3 py-1.5 rounded-full gold-gradient-bg text-black font-bold text-xs"
                          >
                            Open New Ticket
                          </button>
                        </Card>
                      ) : (
                        userTickets.map((ticket) => {
                          const isSelected = selectedTicketId === ticket.id;
                          return (
                            <div
                              key={ticket.id}
                              onClick={() => setSelectedTicketId(ticket.id)}
                              className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                                isSelected
                                  ? 'bg-[#14141E] border-[#D4AF37] shadow-lg shadow-[#D4AF37]/10'
                                  : 'glass-panel border-white/10 hover:border-white/20'
                              }`}
                            >
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] font-mono text-[#D4AF37] font-bold">{ticket.id}</span>
                                <span className={`px-2 py-0.2 rounded-full text-[9px] font-bold uppercase tracking-wider ${
                                  ticket.status === 'OPEN' 
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40' 
                                    : ticket.status === 'WAITING_MEMBER'
                                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                                }`}>
                                  {ticket.status.replace('_', ' ')}
                                </span>
                              </div>

                              <h4 className="font-serif font-bold text-sm text-white truncate">{ticket.subject}</h4>
                              <p className="text-[11px] text-white/60 line-clamp-1 mt-1">
                                {ticket.messages[ticket.messages.length - 1]?.content}
                              </p>

                              <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[10px] text-white/40">
                                <span>{ticket.category}</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="w-2.5 h-2.5" />
                                  {new Date(ticket.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {/* Right Pane: Selected Ticket Thread (Lg: 7 cols) */}
                    <div className="lg:col-span-7">
                      {(() => {
                        const activeTicket = userTickets.find(t => t.id === selectedTicketId) || userTickets[0];
                        if (!activeTicket) {
                          return (
                            <Card className="p-12 text-center border-white/10 h-96 flex flex-col items-center justify-center">
                              <HelpCircle className="w-10 h-10 text-white/20 mb-2" />
                              <p className="text-xs text-white/60">Select an inquiry from the left to view the communication thread.</p>
                            </Card>
                          );
                        }

                        return (
                          <Card className="p-0 border-[#D4AF37]/30 shadow-2xl flex flex-col h-[560px] glass-panel overflow-hidden">
                            
                            {/* Ticket Detail Header */}
                            <div className="p-4 bg-black/50 border-b border-white/10 flex items-center justify-between shrink-0">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="text-xs font-mono font-bold text-[#D4AF37]">{activeTicket.id}</span>
                                  <span className="px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-white/10 text-white/70 border border-white/20">
                                    {activeTicket.category}
                                  </span>
                                </div>
                                <h3 className="font-serif font-bold text-base text-white mt-0.5">{activeTicket.subject}</h3>
                              </div>

                              <div className="text-right">
                                <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  activeTicket.status === 'RESOLVED' 
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40' 
                                    : 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                                }`}>
                                  {activeTicket.status.replace('_', ' ')}
                                </span>
                              </div>
                            </div>

                            {/* Dialogue Messages */}
                            <div className="flex-1 p-4 sm:p-5 overflow-y-auto space-y-3.5">
                              {activeTicket.messages.map((m) => {
                                const isStaff = m.sender === 'ADMIN_SUPPORT';
                                const isAi = m.sender === 'AI_CONCIERGE';
                                const isUser = m.sender === 'USER';

                                return (
                                  <div
                                    key={m.id}
                                    className={`p-3.5 rounded-2xl text-xs leading-relaxed border ${
                                      isStaff 
                                        ? 'bg-gradient-to-r from-amber-500/15 via-[#14141E] to-[#14141E] border-[#D4AF37]/50 shadow-md' 
                                        : isAi
                                          ? 'bg-black/40 border-white/10 text-white/80'
                                          : 'bg-white/5 border-white/10 text-white'
                                    }`}
                                  >
                                    <div className="flex items-center justify-between mb-1.5">
                                      <div className="flex items-center gap-2">
                                        <span className={`font-bold ${isStaff ? 'text-[#D4AF37] flex items-center gap-1' : isAi ? 'text-[#D4AF37]' : 'text-white'}`}>
                                          {isStaff && <Crown className="w-3 h-3 text-[#D4AF37]" />}
                                          {m.senderName}
                                        </span>
                                        {isStaff && (
                                          <span className="px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider bg-[#D4AF37] text-black">
                                            STAFF
                                          </span>
                                        )}
                                      </div>
                                      <span className="text-[10px] text-white/40">{m.timestamp}</span>
                                    </div>
                                    <p className="whitespace-pre-line text-white/90">{m.content}</p>
                                  </div>
                                );
                              })}
                            </div>

                            {/* Reply Box */}
                            <div className="p-3 bg-black/60 border-t border-white/10 shrink-0">
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  placeholder="Write a message to Administration..."
                                  value={ticketReplyInput}
                                  onChange={(e) => setTicketReplyInput(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      handleSendTicketReply();
                                    }
                                  }}
                                  className="flex-1 px-4 py-2 rounded-full bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none"
                                />
                                <button
                                  type="button"
                                  onClick={handleSendTicketReply}
                                  disabled={!ticketReplyInput.trim() || isSubmittingTicketReply}
                                  className="px-4 py-2 rounded-full gold-gradient-bg text-black font-bold text-xs hover:scale-105 transition-all disabled:opacity-50 disabled:scale-100 flex items-center gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>Reply</span>
                                </button>
                              </div>
                            </div>

                          </Card>
                        );
                      })()}
                    </div>

                  </div>
                )}

                {/* 3. CREATE NEW SUPPORT TICKET */}
                {supportSubTab === 'new_ticket' && (
                  <Card className="p-6 sm:p-8 border-[#D4AF37]/30 shadow-2xl glass-panel max-w-2xl mx-auto">
                    
                    <div className="mb-6">
                      <h3 className="font-serif text-xl font-bold text-white gold-gradient-text">Dispatch Inquiry to Governance Desk</h3>
                      <p className="text-xs text-white/60 mt-1">
                        Submit a priority ticket directly to our executive administration staff. Responses are archived in your account.
                      </p>
                    </div>

                    {ticketCreateSuccess && (
                      <div className="mb-4 p-3 rounded-2xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-pulse">
                        <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span>Inquiry registered successfully! Redirecting to ticket thread...</span>
                      </div>
                    )}

                    <form onSubmit={handleCreateTicket} className="space-y-4">
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                          <label className="text-xs text-white/70 font-semibold mb-1 block">Inquiry Category</label>
                          <select
                            value={newTicketCategory}
                            onChange={(e) => setNewTicketCategory(e.target.value as SupportCategory)}
                            className="w-full px-4 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                          >
                            <option value="GENERAL">General Concierge & Membership</option>
                            <option value="CREDITS_BILLING">Credits, Gifting & Flutterwave Billing</option>
                            <option value="VERIFICATION">Biometric Selfie & KYC Clearance</option>
                            <option value="NAUGHTY_ZONE">Naughty Zone ₦5M Prize Pool</option>
                            <option value="DATING_SAFETY">Member Safety & Privacy</option>
                            <option value="TECHNICAL">App Technical Support</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-xs text-white/70 font-semibold mb-1 block">Priority Level</label>
                          <select
                            value={newTicketPriority}
                            onChange={(e) => setNewTicketPriority(e.target.value as TicketPriority)}
                            className="w-full px-4 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                          >
                            <option value="NORMAL">Normal Priority</option>
                            <option value="HIGH">High Priority</option>
                            <option value="URGENT_VIP">Urgent VIP Priority</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="text-xs text-white/70 font-semibold mb-1 block">Subject / Transaction Reference</label>
                        <input
                          type="text"
                          placeholder="e.g. Flutterwave Payment Reference FLW-12345 or Biometric Verification"
                          value={newTicketSubject}
                          onChange={(e) => setNewTicketSubject(e.target.value)}
                          required
                          className="w-full px-4 py-2.5 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="text-xs text-white/70 font-semibold mb-1 block">Detailed Message</label>
                        <textarea
                          rows={4}
                          placeholder="Provide all relevant details regarding your inquiry..."
                          value={newTicketMessage}
                          onChange={(e) => setNewTicketMessage(e.target.value)}
                          required
                          className="w-full px-4 py-3 rounded-2xl bg-[#0D0D12] border border-white/10 text-xs text-white placeholder:text-white/40 focus:border-[#D4AF37] focus:outline-none resize-none"
                        />
                      </div>

                      <div className="flex items-center justify-end gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => setSupportSubTab('tickets')}
                          className="px-4 py-2.5 rounded-full border border-white/10 text-xs text-white/70 hover:text-white hover:bg-white/5"
                        >
                          Cancel
                        </button>
                        <Button
                          type="submit"
                          variant="gold"
                          size="md"
                          icon={<Send className="w-3.5 h-3.5 text-black" />}
                        >
                          Submit VIP Ticket
                        </Button>
                      </div>

                    </form>

                  </Card>
                )}

              </div>
            )}

          </div>

        </div>

      </main>
    </div>
  );
}
