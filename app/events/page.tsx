'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  MapPin, 
  Users, 
  Ticket, 
  Sparkles, 
  CheckCircle2, 
  Clock, 
  Crown, 
  Lock, 
  PlusCircle, 
  Share2, 
  Flame, 
  Check, 
  ArrowRight,
  ShieldCheck,
  Globe,
  X,
  Compass,
  PartyPopper,
  Utensils,
  Wine,
  Music,
  HeartHandshake
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { ExclusiveEvent } from '@/lib/mockData';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { POPULAR_FILTER_CITIES, NIGERIAN_STATES } from '@/lib/locationsData';
import { 
  SupportedCurrency, 
  formatCurrencyPrice, 
  ELITE_MONTHLY_PRICE_GBP 
} from '@/lib/creditsStore';
import { FlutterwaveCheckoutModal, FlutterwaveCheckoutItem } from '@/components/ui/FlutterwaveCheckoutModal';

export default function EventsPage() {
  const [events, setEvents] = useState<ExclusiveEvent[]>([]);
  const [activeTab, setActiveTab] = useState<'gathering_interest' | 'greenlit' | 'all'>('gathering_interest');
  const [selectedCity, setSelectedCity] = useState<string>('All Cities');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [userTier, setUserTier] = useState<'STANDARD' | 'ELITE'>('STANDARD');
  const [currency, setCurrency] = useState<SupportedCurrency>('NGN');
  const [isEliteModalOpen, setIsEliteModalOpen] = useState<boolean>(false);
  const [isProposeModalOpen, setIsProposeModalOpen] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // VIP Bespoke Preferences State for Exclusive Members
  const [isVipPreferencesModalOpen, setIsVipPreferencesModalOpen] = useState(false);
  const [selectedVipEvent, setSelectedVipEvent] = useState<ExclusiveEvent | null>(null);
  const [selectedFoodOptions, setSelectedFoodOptions] = useState<string[]>([]);
  const [customFoodNote, setCustomFoodNote] = useState('');
  const [selectedDrinkOptions, setSelectedDrinkOptions] = useState<string[]>([]);
  const [customDrinkNote, setCustomDrinkNote] = useState('');
  const [selectedFunOptions, setSelectedFunOptions] = useState<string[]>([]);
  const [customFunNote, setCustomFunNote] = useState('');
  const [isSubmittingVipPref, setIsSubmittingVipPref] = useState(false);

  // Flutterwave payment state for tickets
  const [flutterwaveItem, setFlutterwaveItem] = useState<FlutterwaveCheckoutItem | null>(null);
  const [isFlutterwaveModalOpen, setIsFlutterwaveModalOpen] = useState(false);

  // Proposal form state
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalCity, setProposalCity] = useState('Lagos');
  const [proposalCategory, setProposalCategory] = useState<'Gala' | 'VIP Party' | 'Retreat' | 'Dining' | 'Networking'>('Gala');
  const [proposalQuorum, setProposalQuorum] = useState<number>(35);
  const [proposalVenue, setProposalVenue] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [isSubmittingProposal, setIsSubmittingProposal] = useState(false);

  const openVipPreferencesModal = (ev: ExclusiveEvent) => {
    setSelectedVipEvent(ev);
    setSelectedFoodOptions([]);
    setCustomFoodNote('');
    setSelectedDrinkOptions([]);
    setCustomDrinkNote('');
    setSelectedFunOptions([]);
    setCustomFunNote('');
    setIsVipPreferencesModalOpen(true);
  };

  const handleSaveVipPreferences = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVipEvent) return;

    setIsSubmittingVipPref(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'vip_preferences',
          eventId: selectedVipEvent.id,
          foodPreferences: selectedFoodOptions,
          drinkPreferences: selectedDrinkOptions,
          funPreferences: selectedFunOptions,
          notes: [
            customFoodNote ? `Food: ${customFoodNote}` : '',
            customDrinkNote ? `Drink: ${customDrinkNote}` : '',
            customFunNote ? `Fun: ${customFunNote}` : ''
          ].filter(Boolean).join(' | ')
        })
      });
      if (res.ok) {
        showToast('✨ Your VIP Dining, Beverage & Fun Entertainment wishes have been dispatched to the Concierge!');
        setIsVipPreferencesModalOpen(false);
        fetchLiveEvents();
      }
    } catch (err) {
      showToast('Failed to save preferences.');
    } finally {
      setIsSubmittingVipPref(false);
    }
  };

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Fetch member tier and currency
  const fetchUserTier = async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet?.tier) setUserTier(data.wallet.tier);
        if (data.wallet?.currency) setCurrency(data.wallet.currency);
      }
    } catch (err) {
      console.log('Credits API fallback');
    }
  };

  // Fetch live events with interest metrics
  const fetchLiveEvents = async () => {
    try {
      const res = await fetch('/api/events');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.events) {
          setEvents(data.events);
        }
      }
    } catch (err) {
      console.log('Events API fallback');
    }
  };

  useEffect(() => {
    fetchLiveEvents();
    fetchUserTier();
  }, []);

  // Toggle interest in proposed event
  const toggleInterest = async (eventId: string) => {
    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;

    const willBeInterested = !targetEvent.hasInterested;

    // Optimistic UI update
    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const newCount = willBeInterested ? ev.interestedCount + 1 : Math.max(0, ev.interestedCount - 1);
        const reachedQuorum = newCount >= ev.minInterestedMembers && ev.status === 'gathering_interest';
        return {
          ...ev,
          hasInterested: willBeInterested,
          interestedCount: newCount,
          status: reachedQuorum ? 'greenlit' : ev.status,
          targetDateNotice: reachedQuorum 
            ? 'Quorum Reached • Event Confirmed for Hosting!' 
            : `Needs ${Math.max(1, ev.minInterestedMembers - newCount)} more interested members to host`
        };
      }
      return ev;
    }));

    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'interest', eventId })
      });
      if (res.ok) {
        const data = await res.json();
        showToast(willBeInterested 
          ? '✨ Interest Registered! You will be notified when this event is greenlit.' 
          : 'Interest updated.'
        );
        fetchLiveEvents();
      }
    } catch (err) {
      console.log('Error registering interest');
    }
  };

  // Handle RSVP for greenlit events
  const toggleRsvp = async (eventId: string) => {
    if (userTier !== 'ELITE') {
      setIsEliteModalOpen(true);
      return;
    }

    const targetEvent = events.find(e => e.id === eventId);
    if (!targetEvent) return;
    const action = targetEvent.isRsvped ? 'cancel' : 'rsvp';

    setEvents(prev => prev.map(ev => {
      if (ev.id === eventId) {
        const isRsvped = !ev.isRsvped;
        return {
          ...ev,
          isRsvped,
          attendeesCount: isRsvped ? ev.attendeesCount + 1 : Math.max(0, ev.attendeesCount - 1)
        };
      }
      return ev;
    }));

    try {
      await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ eventId, action })
      });
      showToast(action === 'rsvp' ? '🎟️ VIP Pass Confirmed! We look forward to seeing you.' : 'RSVP Cancelled.');
      fetchLiveEvents();
    } catch (err) {
      console.log('RSVP API error');
    }
  };

  const handleEventAction = (ev: ExclusiveEvent) => {
    if (userTier === 'ELITE' || ev.isRsvped) {
      toggleRsvp(ev.id);
    } else {
      setFlutterwaveItem({
        type: 'EVENT_TICKET',
        title: `${ev.title} VIP Pass`,
        subtitle: `Confirmed Gala Ticket • ${ev.city}`,
        baseGBPPrice: 50,
        eventId: ev.id
      });
      setIsFlutterwaveModalOpen(true);
    }
  };

  // Submit new event proposal
  const handleSubmitProposal = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!proposalTitle.trim() || !proposalDescription.trim()) return;

    setIsSubmittingProposal(true);
    try {
      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'propose',
          proposal: {
            title: proposalTitle.trim(),
            city: proposalCity,
            category: proposalCategory,
            minInterestedMembers: Number(proposalQuorum),
            location: proposalVenue.trim() || `Curated Venue, ${proposalCity}`,
            description: proposalDescription.trim(),
            proposedBy: 'Club Member'
          }
        })
      });

      if (res.ok) {
        showToast('🎉 Your event concept is now live and gathering member interest!');
        setIsProposeModalOpen(false);
        setProposalTitle('');
        setProposalDescription('');
        setProposalVenue('');
        setActiveTab('gathering_interest');
        fetchLiveEvents();
      }
    } catch (err) {
      console.log('Proposal submit error');
    } finally {
      setIsSubmittingProposal(false);
    }
  };

  const copyEventLink = (ev: ExclusiveEvent) => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(`${window.location.origin}/events?id=${ev.id}`);
      showToast(`🔗 Link for "${ev.title}" copied to clipboard! Share with club friends.`);
    }
  };

  // Filtered Events
  const filteredEvents = events.filter(e => {
    const matchesTab = activeTab === 'all' 
      ? true 
      : activeTab === 'gathering_interest' 
        ? e.status === 'gathering_interest' 
        : e.status === 'greenlit';

    const matchesCity = selectedCity === 'All Cities' 
      ? true 
      : e.city.toLowerCase() === selectedCity.toLowerCase();

    const matchesCategory = selectedCategory === 'All' 
      ? true 
      : e.category === selectedCategory;

    return matchesTab && matchesCity && matchesCategory;
  });

  const totalInterestsCount = events.reduce((sum, ev) => sum + (ev.interestedCount || 0), 0);
  const gatheringCount = events.filter(e => e.status === 'gathering_interest').length;
  const greenlitCount = events.filter(e => e.status === 'greenlit').length;
  const priceStr = formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency);

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-x-clip">
      <Navigation />

      {/* Floating Toast Notification */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            className="fixed top-20 left-1/2 -translate-x-1/2 z-50 bg-[#161622]/95 border border-[#D4AF37] px-6 py-3 rounded-full text-white text-xs sm:text-sm font-semibold shadow-[0_10px_35px_rgba(212,175,55,0.3)] backdrop-blur-md flex items-center gap-2"
          >
            <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
            <span>{toastMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">

        {/* ========================================================
            HERO: DEMAND-DRIVEN EVENT HOSTING ARCHITECTURE
            ======================================================== */}
        <div className="relative rounded-3xl p-6 sm:p-10 border border-[#D4AF37]/30 bg-gradient-to-b from-[#14141E] via-[#0A0A0E] to-black overflow-hidden shadow-[0_0_50px_rgba(212,175,55,0.12)] text-center mb-8">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-48 bg-[#D4AF37]/10 blur-[100px] pointer-events-none" />

          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-[#D4AF37] text-xs font-bold uppercase tracking-wider mb-3">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Member-Powered Event Hosting</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-serif font-bold text-white mb-3 gold-gradient-text tracking-tight">
            Show Interest & Greenlight Events
          </h1>

          <p className="text-xs sm:text-sm text-[#F5E6CA]/90 max-w-2xl mx-auto leading-relaxed">
            Vote on bespoke galas, rooftop soirées, and luxury retreats in your city. When enough members show interest to meet the quorum, we greenlight the five-star venue and host the event!
          </p>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-3xl mx-auto mt-6 text-left">
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-[#D4AF37]/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-white block font-serif leading-none">{totalInterestsCount}+</span>
                <span className="text-[11px] text-white/50">Patrons Interested</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-amber-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center text-amber-400 shrink-0">
                <Flame className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-amber-300 block font-serif leading-none">{gatheringCount}</span>
                <span className="text-[11px] text-white/50">Gathering Interest</span>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-emerald-500/20 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 shrink-0">
                <CheckCircle2 className="w-5 h-5" />
              </div>
              <div>
                <span className="text-lg font-bold text-emerald-300 block font-serif leading-none">{greenlitCount}</span>
                <span className="text-[11px] text-white/50">Greenlit & Confirmed</span>
              </div>
            </div>

            <button
              onClick={() => setIsProposeModalOpen(true)}
              className="p-3.5 rounded-2xl bg-[#D4AF37]/15 hover:bg-[#D4AF37]/25 border border-[#D4AF37]/50 flex items-center gap-3 transition-all group text-left"
            >
              <div className="w-10 h-10 rounded-xl bg-[#D4AF37] flex items-center justify-center text-black shrink-0 group-hover:scale-105 transition-transform">
                <PlusCircle className="w-5 h-5" />
              </div>
              <div>
                <span className="text-xs font-bold text-white block leading-tight group-hover:text-[#D4AF37] transition-colors">Propose Event</span>
                <span className="text-[10px] text-white/60">Pitch your city idea →</span>
              </div>
            </button>
          </div>
        </div>

        {/* ========================================================
            NAVIGATION TABS & CITY FILTER CONTROLS
            ======================================================== */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          
          {/* Main State Tabs */}
          <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-black/60 border border-white/10 w-full sm:w-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab('gathering_interest')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'gathering_interest'
                  ? 'bg-gradient-to-r from-amber-500 to-amber-600 text-black shadow-lg shadow-amber-500/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Flame className="w-4 h-4" />
              <span>Gathering Interest</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-black">
                {gatheringCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('greenlit')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'greenlit'
                  ? 'bg-gradient-to-r from-[#D4AF37] to-amber-400 text-black shadow-lg shadow-[#D4AF37]/20'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Greenlit & Hosting</span>
              <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/20 text-current font-black">
                {greenlitCount}
              </span>
            </button>

            <button
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shrink-0 ${
                activeTab === 'all'
                  ? 'bg-white/20 text-white'
                  : 'text-white/70 hover:text-white hover:bg-white/5'
              }`}
            >
              <Compass className="w-4 h-4" />
              <span>All Events</span>
              <span className="text-[10px] text-white/50">({events.length})</span>
            </button>
          </div>

          {/* City & Category Selectors */}
          <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 bg-black/60 border border-white/10 rounded-2xl px-3 py-1.5 text-xs text-white/80">
              <MapPin className="w-3.5 h-3.5 text-[#D4AF37]" />
              <select
                value={selectedCity}
                onChange={(e) => setSelectedCity(e.target.value)}
                aria-label="Filter events by city"
                className="bg-transparent text-white font-medium focus:outline-none cursor-pointer pr-2 max-w-[200px]"
              >
                <option value="All Cities" className="bg-[#121218] text-white">All Worldwide Cities</option>
                <optgroup label="Nigeria — All States & Cities" className="bg-[#121218] text-amber-300">
                  {POPULAR_FILTER_CITIES.slice(1, 40).map((city) => (
                    <option key={city} value={city} className="bg-[#121218] text-white">
                      {city}
                    </option>
                  ))}
                </optgroup>
                <optgroup label="Global Luxury Hubs" className="bg-[#121218] text-amber-300">
                  {POPULAR_FILTER_CITIES.slice(40).map((city) => (
                    <option key={city} value={city} className="bg-[#121218] text-white">
                      {city}
                    </option>
                  ))}
                </optgroup>
              </select>
            </div>

            <div className="flex items-center gap-1 bg-black/60 border border-white/10 rounded-2xl p-1 text-xs">
              {['All', 'Gala', 'VIP Party', 'Retreat'].map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-xl text-[11px] font-semibold transition-all ${
                    selectedCategory === cat
                      ? 'bg-[#D4AF37] text-black font-bold'
                      : 'text-white/60 hover:text-white'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

        </div>

        {/* ========================================================
            EVENTS GRID
            ======================================================== */}
        {filteredEvents.length === 0 ? (
          <div className="p-12 text-center rounded-3xl bg-white/[0.02] border border-white/10">
            <Compass className="w-12 h-12 text-white/30 mx-auto mb-3" />
            <h3 className="text-lg font-serif font-bold text-white mb-1">No Events In Selected Filter</h3>
            <p className="text-xs text-white/50 mb-4 max-w-sm mx-auto">
              Be the first to pitch an exclusive gathering in {selectedCity !== 'All Cities' ? selectedCity : 'your area'}!
            </p>
            <Button
              variant="gold"
              onClick={() => {
                setSelectedCity('All Cities');
                setSelectedCategory('All');
                setIsProposeModalOpen(true);
              }}
              icon={<PlusCircle className="w-4 h-4 text-black" />}
            >
              Propose an Event Concept
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 sm:gap-8">
            {filteredEvents.map((ev) => {
              const isGathering = ev.status === 'gathering_interest';
              const progressPct = Math.min(100, Math.round(((ev.interestedCount || 0) / (ev.minInterestedMembers || 35)) * 100));
              const remaining = Math.max(0, (ev.minInterestedMembers || 35) - (ev.interestedCount || 0));

              return (
                <motion.div
                  key={ev.id}
                  layout
                  initial={{ opacity: 0, y: 15 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.35 }}
                >
                  <Card className="p-0 border-[#D4AF37]/30 flex flex-col justify-between h-full group overflow-hidden bg-black/70 hover:border-[#D4AF37]/60 transition-all shadow-xl">
                    <div>
                      {/* Image Banner */}
                      <div className="relative aspect-[16/10] overflow-hidden">
                        <img
                          src={ev.image}
                          alt={ev.title}
                          onError={(e) => {
                            e.currentTarget.src = 'https://images.unsplash.com/photo-1519671482749-fd09be7ccebf?auto=format&fit=crop&w=1000&q=80';
                          }}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/30 to-transparent" />

                        {/* Top Badges */}
                        <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                          <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-black/80 text-[#D4AF37] border border-[#D4AF37]/40 backdrop-blur-md">
                            {ev.category}
                          </span>

                          <div className="flex items-center gap-1.5">
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-semibold bg-black/80 text-white/90 border border-white/20 backdrop-blur-md flex items-center gap-1">
                              <MapPin className="w-3 h-3 text-[#D4AF37]" />
                              <span>{ev.city}</span>
                            </span>
                            <button
                              onClick={() => copyEventLink(ev)}
                              title="Share Event"
                              className="p-1.5 rounded-full bg-black/80 text-white/70 hover:text-white border border-white/20 backdrop-blur-md"
                            >
                              <Share2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>

                        {/* Status Overlay Tag */}
                        <div className="absolute bottom-3 left-3 right-3">
                          {isGathering ? (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-950/80 border border-amber-500/40 text-amber-300 text-xs backdrop-blur-md font-medium">
                              <Flame className="w-3.5 h-3.5 text-amber-400 animate-pulse shrink-0" />
                              <span className="truncate">
                                {remaining === 0 ? 'Quorum Met! Confirming venue...' : `Needs ${remaining} more interested members to host`}
                              </span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-950/80 border border-emerald-500/40 text-emerald-300 text-xs backdrop-blur-md font-medium">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate font-bold">Greenlit & Confirmed for Hosting</span>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Content Details */}
                      <div className="p-5 sm:p-6">
                        <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold mb-1">
                          <div className="flex items-center gap-1.5">
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{ev.date}</span>
                          </div>
                          <span className="text-white/40 text-[11px]">{ev.time}</span>
                        </div>

                        <h3 className="text-xl font-serif font-bold text-white mt-1 group-hover:text-amber-200 transition-colors line-clamp-2">
                          {ev.title}
                        </h3>
                        <p className="text-xs text-[#F5E6CA]/80 font-medium mt-0.5 line-clamp-1">{ev.subtitle}</p>

                        <div className="flex items-center gap-2 text-xs text-white/70 mt-3">
                          <MapPin className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                          <span className="truncate">{ev.location}</span>
                        </div>

                        <p className="text-xs text-white/60 mt-3 line-clamp-2 leading-relaxed">
                          {ev.description}
                        </p>

                        {/* Crowd Interest Threshold Progress Bar */}
                        <div className="mt-5 p-3.5 rounded-2xl bg-white/[0.03] border border-white/10">
                          <div className="flex items-center justify-between text-xs mb-1.5">
                            <span className="font-semibold text-white/80 flex items-center gap-1.5">
                              <Users className="w-3.5 h-3.5 text-[#D4AF37]" />
                              <span>Member Interest Quorum</span>
                            </span>
                            <span className="font-bold text-[#D4AF37]">
                              {ev.interestedCount} / {ev.minInterestedMembers} ({progressPct}%)
                            </span>
                          </div>

                          {/* Progress Meter */}
                          <div className="w-full h-2.5 bg-black/60 rounded-full overflow-hidden border border-white/10">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${progressPct}%` }}
                              transition={{ duration: 0.6, ease: 'easeOut' }}
                              className={`h-full rounded-full transition-all ${
                                progressPct >= 100 
                                  ? 'bg-gradient-to-r from-emerald-400 to-emerald-500 shadow-[0_0_10px_rgba(52,211,153,0.5)]' 
                                  : 'bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-300 shadow-[0_0_10px_rgba(212,175,55,0.4)]'
                              }`}
                            />
                          </div>

                          <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/5 text-[11px] text-white/50">
                            <span>{ev.proposedBy ? `Proposed by: ${ev.proposedBy}` : 'Club Committee'}</span>
                            <span className="text-white/80 font-medium">{ev.price}</span>
                          </div>
                        </div>

                      </div>
                    </div>

                    {/* Action Footers */}
                    <div className="p-5 sm:p-6 pt-0 space-y-2.5">
                      {isGathering ? (
                        <Button
                          variant={ev.hasInterested ? 'outline' : 'gold'}
                          fullWidth
                          onClick={() => toggleInterest(ev.id)}
                          className={ev.hasInterested ? 'border-emerald-500/50 text-emerald-400 hover:bg-emerald-500/10' : ''}
                          icon={ev.hasInterested ? <Check className="w-4 h-4 text-emerald-400" /> : <Sparkles className="w-4 h-4 text-black" />}
                        >
                          {ev.hasInterested 
                            ? "✓ You're Interested (Priority Reserved)" 
                            : "✨ Show Interest (Count Me In)"}
                        </Button>
                      ) : (
                        <Button
                          variant={ev.isRsvped ? 'outline' : 'gold'}
                          fullWidth
                          onClick={() => handleEventAction(ev)}
                          icon={ev.isRsvped ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Ticket className="w-4 h-4 text-black" />}
                        >
                          {ev.isRsvped ? 'VIP Pass Confirmed' : 'Reserve VIP Ticket / RSVP'}
                        </Button>
                      )}

                      {/* Exclusive Member Bespoke Preferences Button */}
                      <button
                        type="button"
                        onClick={() => openVipPreferencesModal(ev)}
                        className="w-full py-2 px-3 rounded-xl bg-white/[0.03] hover:bg-[#D4AF37]/15 border border-[#D4AF37]/30 text-[#F5E6CA] text-[11px] font-semibold flex items-center justify-center gap-1.5 transition-all shadow-sm group/vip"
                      >
                        <Utensils className="w-3.5 h-3.5 text-[#D4AF37] group-hover/vip:scale-110 transition-transform" />
                        <span>✨ VIP Dining, Drinks & Fun Requests</span>
                      </button>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* ========================================================
            ELITE MEMBERSHIP UPGRADE PREVIEW BANNER
            ======================================================== */}
        <div className="mt-14 p-8 rounded-3xl border border-[#D4AF37]/50 bg-gradient-to-r from-black via-[#101018] to-black relative overflow-hidden">
          <div className="max-w-3xl mx-auto text-center">
            <span className="px-3.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40 mb-3 inline-block">
              VIP Privileges at Every Hosted Event
            </span>

            <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white mb-2">
              Complimentary VIP Passes For Elite Members
            </h2>

            <p className="text-xs sm:text-sm text-white/70 mb-6">
              When any proposed gathering meets its quorum and is greenlit, Elite Tier patrons receive complimentary VIP table seating, priority guestlist reservations, and backstage host encounters.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mb-6">
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#D4AF37]/20">
                <span className="text-xs font-bold text-white block mb-1">🎟️ Complimentary VIP Passes</span>
                <p className="text-[11px] text-white/60">Free access to greenlit galas and yacht soirées without separate ticket purchases.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#D4AF37]/20">
                <span className="text-xs font-bold text-white block mb-1">⚡ 2x Voting Weight</span>
                <p className="text-[11px] text-white/60">Your interest counts double toward greenlighting events in your preferred city.</p>
              </div>
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-[#D4AF37]/20">
                <span className="text-xs font-bold text-white block mb-1">🍸 Dedicated Private Table</span>
                <p className="text-[11px] text-white/60">Guaranteed bottle service and concierge escort at all hosted functions.</p>
              </div>
            </div>

            {userTier !== 'ELITE' && (
              <Button
                variant="gold"
                size="lg"
                onClick={() => setIsEliteModalOpen(true)}
                icon={<Crown className="w-5 h-5 text-black" />}
                className="shadow-2xl px-8 py-3 text-sm font-bold"
              >
                Upgrade to Elite Membership ({formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency)}/mo)
              </Button>
            )}
          </div>
        </div>

      </main>

      {/* ========================================================
          VIP BESPOKE DINING, DRINKS & FUN PREFERENCES MODAL
          ======================================================== */}
      <AnimatePresence>
        {isVipPreferencesModalOpen && selectedVipEvent && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-2xl rounded-3xl bg-[#0C0B12] border border-[#D4AF37]/60 p-6 sm:p-8 shadow-[0_0_60px_rgba(212,175,55,0.25)] overflow-hidden my-auto"
            >
              {/* Background ambient gold glow */}
              <div className="absolute top-0 right-0 w-60 h-60 bg-[#D4AF37]/10 blur-[100px] pointer-events-none" />

              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsVipPreferencesModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2.5 mb-1.5">
                <div className="w-9 h-9 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                  <Crown className="w-5 h-5" />
                </div>
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">VIP Concierge Service</span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-white">Exclusive Patron Preferences</h3>
                </div>
              </div>
              <p className="text-xs text-[#F5E6CA]/80 mb-6">
                Personalize your experience for <span className="text-white font-bold">{selectedVipEvent.title}</span>. Let our culinary and hospitality directors prepare your preferred refreshments and fun activities.
              </p>

              <form onSubmit={handleSaveVipPreferences} className="space-y-5">
                
                {/* 1. FOOD & FINE DINING PREFERENCES */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
                    <Utensils className="w-4 h-4 text-[#D4AF37]" />
                    <span>1. What would you like to eat? (Gourmet Dining)</span>
                  </label>
                  
                  {/* Quick Select Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      '🥩 Wagyu Beef Ribeye',
                      '🦞 Grilled Truffle Lobster Tail',
                      '🍤 Jumbo Tiger Prawns',
                      '🍢 Suya & Asun Skewers Platter',
                      '🍣 Fresh Sashimi & Nigiri',
                      '🥗 Vegan Caviar & Avocado Tartare',
                      '🍫 Belgian Dark Chocolate Soufflé'
                    ].map(food => {
                      const isSelected = selectedFoodOptions.includes(food);
                      return (
                        <button
                          key={food}
                          type="button"
                          onClick={() => {
                            setSelectedFoodOptions(prev => 
                              isSelected ? prev.filter(f => f !== food) : [...prev, food]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                          }`}
                        >
                          {food}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={customFoodNote}
                    onChange={(e) => setCustomFoodNote(e.target.value)}
                    placeholder="Specific dietary notes or custom chef requests (e.g. Medium-rare steak, gluten-free)..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* 2. BEVERAGES & CHAMPAGNE PREFERENCES */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
                    <Wine className="w-4 h-4 text-[#D4AF37]" />
                    <span>2. What would you like to drink? (Vintage Cellar & Bar)</span>
                  </label>
                  
                  {/* Quick Select Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      '🍾 Dom Pérignon Vintage',
                      '🥃 Hennessy XO Cognac',
                      '🥂 Veuve Clicquot Brut',
                      '🍹 Casamigos Reposado Tequila',
                      '🥃 Macallan 18yr Single Malt',
                      '🍸 Espresso Martini',
                      '🌺 Fresh Hibiscus Zobo Mocktail'
                    ].map(drink => {
                      const isSelected = selectedDrinkOptions.includes(drink);
                      return (
                        <button
                          key={drink}
                          type="button"
                          onClick={() => {
                            setSelectedDrinkOptions(prev => 
                              isSelected ? prev.filter(d => d !== drink) : [...prev, drink]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                          }`}
                        >
                          {drink}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={customDrinkNote}
                    onChange={(e) => setCustomDrinkNote(e.target.value)}
                    placeholder="Specific wine vintages, cocktails, mixers or non-alcoholic choices..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* 3. FUN & ENTERTAINMENT DESIRES */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  <label className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-300 mb-2.5">
                    <Music className="w-4 h-4 text-[#D4AF37]" />
                    <span>3. What would you love to do for fun? (VIP Leisure & Experiences)</span>
                  </label>
                  
                  {/* Quick Select Pills */}
                  <div className="flex flex-wrap gap-1.5 mb-3">
                    {[
                      '🎷 Live Saxophone Jazz Set',
                      '🛥️ Moonlight Yacht Cruise Afterparty',
                      '♠️ Private Casino & Blackjack Lounge',
                      '💫 Curated Speed Dating Circle',
                      '💨 Rooftop Cigar Lounge',
                      '🎧 Celebrity Afrobeat DJ Set',
                      '📸 High-Fashion Portrait Session'
                    ].map(fun => {
                      const isSelected = selectedFunOptions.includes(fun);
                      return (
                        <button
                          key={fun}
                          type="button"
                          onClick={() => {
                            setSelectedFunOptions(prev => 
                              isSelected ? prev.filter(f => f !== fun) : [...prev, fun]
                            );
                          }}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${
                            isSelected
                              ? 'bg-[#D4AF37] text-black font-bold shadow-md'
                              : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                          }`}
                        >
                          {fun}
                        </button>
                      );
                    })}
                  </div>

                  <input
                    type="text"
                    value={customFunNote}
                    onChange={(e) => setCustomFunNote(e.target.value)}
                    placeholder="Any specific entertainment, private games, dance, or conversation preferences..."
                    className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                {/* Submit button */}
                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="gold"
                    fullWidth
                    disabled={isSubmittingVipPref}
                    icon={<Sparkles className="w-4 h-4 text-black" />}
                    className="py-3.5 font-bold shadow-xl"
                  >
                    {isSubmittingVipPref ? 'Dispatching to Concierge...' : 'Dispatch VIP Wishes to Executive Concierge ✨'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ========================================================
          PROPOSE AN EVENT MODAL
          ======================================================== */}
      <AnimatePresence>
        {isProposeModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-lg rounded-3xl bg-[#0D0D14] border border-[#D4AF37]/50 p-6 sm:p-8 shadow-2xl overflow-hidden"
            >
              {/* Close Button */}
              <button
                onClick={() => setIsProposeModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 rounded-full bg-[#D4AF37]/20 flex items-center justify-center text-[#D4AF37]">
                  <PlusCircle className="w-4 h-4" />
                </div>
                <h3 className="text-xl font-serif font-bold text-white">Propose an Event</h3>
              </div>
              <p className="text-xs text-white/60 mb-6">
                Pitch a bespoke gathering for your city. When members show enough interest to hit the quorum, we coordinate the venue and host it!
              </p>

              <form onSubmit={handleSubmitProposal} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Event Concept Title</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Maitama Rooftop Sunset Jazz & Whiskey"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">City / Region</label>
                    <select
                      value={proposalCity}
                      onChange={(e) => setProposalCity(e.target.value)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#14141E] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <optgroup label="Nigeria — All States & Major Hubs">
                        {POPULAR_FILTER_CITIES.slice(1, 40).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </optgroup>
                      <optgroup label="International Hubs">
                        {POPULAR_FILTER_CITIES.slice(40).map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </optgroup>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Category</label>
                    <select
                      value={proposalCategory}
                      onChange={(e) => setProposalCategory(e.target.value as any)}
                      className="w-full px-3 py-2.5 rounded-xl bg-[#14141E] border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    >
                      <option value="Gala">Gala</option>
                      <option value="VIP Party">VIP Party</option>
                      <option value="Retreat">Retreat</option>
                      <option value="Dining">Dining</option>
                      <option value="Networking">Networking</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Target Quorum (Members)</label>
                    <input
                      type="number"
                      min={10}
                      max={200}
                      value={proposalQuorum}
                      onChange={(e) => setProposalQuorum(Number(e.target.value))}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-white/80 mb-1">Suggested Venue (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Transcorp Hilton or Private Beach"
                      value={proposalVenue}
                      onChange={(e) => setProposalVenue(e.target.value)}
                      className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-white/80 mb-1">Event Vision & Description</label>
                  <textarea
                    rows={3}
                    required
                    placeholder="Describe the experience, music, dress code, and vibe..."
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white text-xs placeholder:text-white/30 focus:border-[#D4AF37] focus:outline-none resize-none"
                  />
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="gold"
                    fullWidth
                    disabled={isSubmittingProposal}
                    icon={<Sparkles className="w-4 h-4 text-black" />}
                  >
                    {isSubmittingProposal ? 'Publishing Concept...' : 'Submit Event Concept for Member Votes'}
                  </Button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Elite Upgrade Modal */}
      <CreditsAndGiftingModal
        isOpen={isEliteModalOpen}
        onClose={() => {
          setIsEliteModalOpen(false);
          fetchUserTier();
        }}
        defaultTab="elite"
      />

      {/* Flutterwave Ticket Checkout Modal */}
      {flutterwaveItem && (
        <FlutterwaveCheckoutModal
          isOpen={isFlutterwaveModalOpen}
          onClose={() => setIsFlutterwaveModalOpen(false)}
          item={flutterwaveItem}
          defaultCurrency={currency}
          onSuccess={() => {
            fetchLiveEvents();
            showToast('🎟️ VIP Event Pass Confirmed! Your tickets are ready.');
          }}
        />
      )}
    </div>
  );
}
