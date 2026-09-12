'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Zap,
  Clock,
  Eye,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Coins,
  Globe,
  Crown,
  ChevronDown,
  Banknote,
  BarChart3,
  Activity,
  TrendingUp,
  X
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { CreditsAndGiftingModal } from '@/components/ui/CreditsAndGiftingModal';
import { FlutterwaveCheckoutModal, FlutterwaveCheckoutItem } from '@/components/ui/FlutterwaveCheckoutModal';
import {
  CREDIT_PACKS,
  CURRENCIES,
  formatCurrencyPrice,
  SupportedCurrency,
  ELITE_MONTHLY_PRICE_GBP
} from '@/lib/creditsStore';

export default function BoostPage() {
  const [boostActive, setBoostActive] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [selectedBoost, setSelectedBoost] = useState<number>(30);

  // Club Credits Wallet & Currency state
  const [credits, setCredits] = useState<number>(180);
  const [tier, setTier] = useState<'STANDARD' | 'ELITE'>('STANDARD');
  const [currency, setCurrency] = useState<SupportedCurrency>('NGN');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);
  const [walletLoading, setWalletLoading] = useState(false);
  const [walletMsg, setWalletMsg] = useState('');
  const [cashoutModalOpen, setCashoutModalOpen] = useState(false);
  const [withdrawableDiamonds, setWithdrawableDiamonds] = useState(680);
  const [withdrawableCash, setWithdrawableCash] = useState('₦66,500');

  // Live Payment & Boost Selection Modal state
  const [isBoostModalOpen, setIsBoostModalOpen] = useState(false);
  const [pendingBoost, setPendingBoost] = useState<{ duration: number; title: string; multiplier: string; creditsCost: number; baseGBP: number } | null>(null);
  const [flutterwaveItem, setFlutterwaveItem] = useState<FlutterwaveCheckoutItem | null>(null);
  const [isFlutterwaveModalOpen, setIsFlutterwaveModalOpen] = useState(false);

  const fetchWallet = async () => {
    try {
      const res = await fetch('/api/credits');
      if (res.ok) {
        const data = await res.json();
        if (data.wallet) {
          setCredits(data.wallet.credits);
          setTier(data.wallet.tier);
          if (data.wallet.currency) setCurrency(data.wallet.currency);
        }
        if (data.earnings) {
          setWithdrawableDiamonds(data.earnings.withdrawableDiamonds);
          setWithdrawableCash(data.earnings.withdrawableCash);
        }
      }
    } catch { }
  };

  const fetchBoostSession = async () => {
    try {
      const res = await fetch('/api/boost');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.boostState) {
          setBoostActive(data.boostState.isBoostActive);
          setTimeLeft(data.boostState.remainingSeconds || 0);
          setSelectedBoost(data.boostState.durationMinutes || 30);
        }
      }
    } catch { }
  };

  useEffect(() => {
    fetchWallet();
    fetchBoostSession();
  }, []);

  // Launch Flutterwave Checkout for Credit Pack
  const handleBuyCreditPack = (pack: typeof CREDIT_PACKS[0]) => {
    setFlutterwaveItem({
      type: 'CREDITS',
      packId: pack.id,
      title: `${pack.title} (${pack.credits + pack.bonusCredits} Credits)`,
      subtitle: `VIP Private Date & Gifting Credits Pack`,
      baseGBPPrice: pack.baseGBPPrice
    });
    setIsFlutterwaveModalOpen(true);
  };

  // Launch Flutterwave Checkout for Elite Membership
  const handleUpgradeElite = () => {
    setFlutterwaveItem({
      type: 'MEMBERSHIP',
      title: 'Elite Circle Membership',
      subtitle: 'Unlimited HD Video Dates & VIP Privileges',
      baseGBPPrice: ELITE_MONTHLY_PRICE_GBP,
      planTier: 'MONTHLY'
    });
    setIsFlutterwaveModalOpen(true);
  };

  // Open Boost Activation Options Modal
  const openBoostOptions = (duration: number, title: string, multiplier: string, creditsCost: number, baseGBP: number) => {
    setPendingBoost({ duration, title, multiplier, creditsCost, baseGBP });
    setIsBoostModalOpen(true);
  };

  // Pay for Boost using in-app credits
  const handlePayBoostWithCredits = async () => {
    if (!pendingBoost) return;
    setWalletLoading(true);
    setWalletMsg('');
    try {
      const res = await fetch('/api/boost', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'activate_boost',
          durationMinutes: pendingBoost.duration,
          paymentMethod: 'CREDITS',
          creditsCost: pendingBoost.creditsCost
        })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setBoostActive(true);
        setTimeLeft(pendingBoost.duration * 60);
        setSelectedBoost(pendingBoost.duration);
        setWalletMsg(data.message || '⚡ Spotlight Boost activated on live server!');
        setIsBoostModalOpen(false);
        fetchWallet();
        fetchBoostSession();
        setTimeout(() => setWalletMsg(''), 4500);
      } else {
        setWalletMsg(data.error || 'Failed to activate boost. Insufficient credits.');
        setTimeout(() => setWalletMsg(''), 4500);
      }
    } catch {
      setWalletMsg('Error connecting to boost service.');
    } finally {
      setWalletLoading(false);
    }
  };

  // Pay for Boost using Flutterwave
  const handlePayBoostWithFlutterwave = () => {
    if (!pendingBoost) return;
    setIsBoostModalOpen(false);
    setFlutterwaveItem({
      type: 'BOOST',
      title: `${pendingBoost.title} (${pendingBoost.multiplier})`,
      subtitle: `Instant Spotlight Boost Placement`,
      baseGBPPrice: pendingBoost.baseGBP,
      boostDuration: pendingBoost.duration
    });
    setIsFlutterwaveModalOpen(true);
  };

  useEffect(() => {
    if (!boostActive) return;
    const timer = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) {
          setBoostActive(false);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [boostActive]);

  const formatTimer = (secs: number) => {
    const hours = Math.floor(secs / 3600);
    const m = Math.floor((secs % 3600) / 60);
    const s = secs % 60;
    if (hours > 0) {
      return `${hours}h ${m < 10 ? '0' : ''}${m}m ${s < 10 ? '0' : ''}${s}s`;
    }
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-36 sm:pb-24 relative overflow-x-clip">
      <Navigation />

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">

        <div className="text-center max-w-2xl mx-auto mb-10">
          <Badge type="tier" label="PROFILE VISIBILITY" />
          <h1 className="text-3xl sm:text-5xl font-serif font-bold mt-2 gold-gradient-text">
            Profile Boost
          </h1>
          <p className="text-xs sm:text-sm text-white/70 mt-1">
            Amplify your profile to top members in your area.
          </p>
        </div>

        {/* Active Boost Counter Box */}
        {boostActive && (
          <motion.div
            initial={{ scale: 0.95, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="max-w-2xl mx-auto mb-10"
          >
            <Card className="p-6 sm:p-8 border-[#D4AF37] gold-border-glow text-center relative overflow-hidden bg-gradient-to-b from-[#14141E] to-[#070709]">
              <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center mb-3 animate-gold-pulse">
                <Zap className="w-7 h-7 text-[#D4AF37]" />
              </div>

              <Badge type="tier" label="BOOST ACTIVE" />
              <h2 className="text-4xl sm:text-5xl font-serif font-bold text-white mt-3 font-mono tracking-tight">
                {formatTimer(timeLeft)}
              </h2>
              <p className="text-xs text-[#F5E6CA] mt-1.5 font-semibold">
                Your profile is receiving 10x priority discovery.
              </p>

              <div className="mt-6 grid grid-cols-3 gap-4 pt-6 border-t border-white/10 text-center">
                <div>
                  <span className="text-2xl font-serif font-bold gold-gradient-text">+340%</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/60 block mt-0.5">Views Gain</span>
                </div>
                <div className="border-l border-white/10">
                  <span className="text-2xl font-serif font-bold gold-gradient-text">14</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/60 block mt-0.5">New Likes</span>
                </div>
                <div className="border-l border-white/10">
                  <span className="text-2xl font-serif font-bold gold-gradient-text">#1</span>
                  <span className="text-[10px] uppercase tracking-widest text-white/60 block mt-0.5">Deck Rank</span>
                </div>
              </div>
            </Card>
          </motion.div>
        )}

        {/* Boost Duration Options */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mb-16">
          {[
            { duration: 30, title: '30-Minute Sprint', multiplier: '10x Visibility', desc: 'Ideal for evening leisure hours', creditsCost: 50, baseGBP: 12 },
            { duration: 60, title: '1-Hour Prime', multiplier: '25x Visibility', desc: 'Maximum exposure during peak hours', creditsCost: 90, baseGBP: 22 },
            { duration: 1440, title: '24-Hour Super Boost', multiplier: '50x Visibility', desc: 'All-day priority placement across all cities', creditsCost: 250, baseGBP: 45 },
          ].map((item) => (
            <Card key={item.duration} className="p-8 border-white/10 flex flex-col justify-between hover:border-[#D4AF37]/50">
              <div>
                <Zap className="w-8 h-8 text-[#D4AF37] mb-3" />
                <h3 className="text-2xl font-serif font-bold text-white">{item.title}</h3>
                <span className="text-xs font-bold text-[#D4AF37] block mt-1">{item.multiplier}</span>
                <p className="text-xs text-white/60 mt-3">{item.desc}</p>
                
                <div className="mt-4 pt-4 border-t border-white/5 flex items-center justify-between text-xs">
                  <span className="text-white/60">Cost:</span>
                  <div className="text-right">
                    <span className="font-bold text-amber-300 block">{item.creditsCost} Credits</span>
                    <span className="text-[10px] text-white/40">or {formatCurrencyPrice(item.baseGBP, currency)}</span>
                  </div>
                </div>
              </div>

              <Button
                variant="gold"
                fullWidth
                className="mt-6"
                onClick={() => openBoostOptions(item.duration, item.title, item.multiplier, item.creditsCost, item.baseGBP)}
              >
                Activate {item.duration === 1440 ? '24-Hour' : `${item.duration}m`} Boost
              </Button>
            </Card>
          ))}
        </div>

        {/* Private Date Credits & Multi-Currency Top-Up Section */}
        <div className="glass-card p-8 border-[#D4AF37]/30 rounded-3xl max-w-5xl mx-auto mb-16 relative overflow-hidden shadow-2xl">
          <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-white/10">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge type="tier" label="CLUB CREDITS WALLET" />
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${tier === 'ELITE' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/30' : 'bg-white/10 text-white/60'
                  }`}>
                  {tier} Member
                </span>
              </div>
              <h2 className="font-serif font-bold text-2xl text-white">Private Date Credits</h2>
              <p className="text-xs text-white/60 mt-0.5">
                Use credits to dispatch bespoke gifts, access priority video dates, and book exclusive encounters.
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Currency Selector */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-colors"
                >
                  <Globe className="w-3.5 h-3.5 text-[#D4AF37]" />
                  <span>{currency} ({CURRENCIES[currency]?.symbol})</span>
                  <ChevronDown className="w-3 h-3 text-white/50" />
                </button>

                {currencyDropdownOpen && (
                  <div className="absolute right-0 top-full mt-1.5 w-44 bg-[#14141B] border border-[#D4AF37]/30 rounded-2xl p-1.5 shadow-2xl z-50">
                    <span className="text-[9px] uppercase tracking-widest text-white/40 px-2 py-1 block">Preferred Currency</span>
                    {Object.values(CURRENCIES).map(curr => (
                      <button
                        key={curr.code}
                        onClick={() => { setCurrency(curr.code); setCurrencyDropdownOpen(false); }}
                        className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${currency === curr.code ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/80 hover:bg-white/10'
                          }`}
                      >
                        <span>{curr.name}</span>
                        <span className="font-mono text-xs">{curr.symbol}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Balance Box */}
              <div className="px-4 py-2 rounded-2xl bg-black/60 border border-[#D4AF37]/40 text-right">
                <span className="text-[10px] text-white/50 block">Active Balance:</span>
                <span className="text-base font-serif font-bold text-[#D4AF37] flex items-center gap-1">
                  <Coins className="w-4 h-4" /> {credits} Credits
                </span>
              </div>
            </div>
          </div>

          {walletMsg && (
            <div className="mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
              <span>{walletMsg}</span>
            </div>
          )}

          {/* Affordable Credit Bundles */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
            {CREDIT_PACKS.map(pack => {
              const priceStr = formatCurrencyPrice(pack.baseGBPPrice, currency);
              return (
                <div
                  key={pack.id}
                  className={`p-6 rounded-3xl border flex flex-col justify-between transition-all relative ${pack.popular
                      ? 'border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/10 to-transparent shadow-[0_0_20px_rgba(212,175,55,0.15)]'
                      : 'border-white/10 bg-white/[0.02] hover:border-white/20'
                    }`}
                >
                  {pack.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-[#D4AF37] text-black text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                        Most Popular
                      </span>
                    </div>
                  )}

                  {pack.bestValue && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <span className="bg-emerald-500 text-black text-[9px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider shadow-md">
                        Best Value
                      </span>
                    </div>
                  )}

                  <div className="text-center pt-2">
                    <Coins className="w-8 h-8 text-[#D4AF37] mx-auto mb-2" />
                    <h4 className="font-serif font-bold text-white text-lg">{pack.title}</h4>
                    <div className="my-2">
                      <span className="text-3xl font-serif font-bold gold-gradient-text">{pack.credits}</span>
                      {pack.bonusCredits > 0 && (
                        <span className="text-xs font-bold text-emerald-400 block mt-0.5">
                          +{pack.bonusCredits} Free Bonus
                        </span>
                      )}
                      <span className="text-[10px] text-white/50 block">Club Credits</span>
                    </div>
                  </div>

                  <div className="pt-4 border-t border-white/10 text-center">
                    <span className="text-xl font-serif font-bold text-white block mb-3">
                      {priceStr}
                    </span>

                    <Button
                      variant={pack.popular ? 'gold' : 'glass'}
                      size="sm"
                      fullWidth
                      disabled={walletLoading}
                      onClick={() => handleBuyCreditPack(pack)}
                    >
                      {walletLoading ? 'Processing...' : `Buy ${pack.credits} Credits`}
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Elite Tier Upgrade Card */}
          <div className="mt-8 p-6 rounded-3xl border border-[#D4AF37]/40 bg-gradient-to-r from-black via-[#14141E] to-black flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center shrink-0">
                <Crown className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h4 className="font-serif font-bold text-white text-lg">Prefer Unlimited Video Dates?</h4>
                <p className="text-xs text-white/60 mt-0.5">
                  Elite Members unlock unlimited 1080p & 4K Ultra streaming with zero credit burn per minute.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-white/50 block">Monthly Membership:</span>
                <span className="text-xl font-serif font-bold gold-gradient-text">
                  {formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency)}
                  <span className="text-xs font-normal text-white/60">/mo</span>
                </span>
              </div>

              {tier === 'ELITE' ? (
                <span className="px-4 py-2 rounded-full bg-emerald-500/20 text-emerald-300 text-xs font-bold border border-emerald-500/30">
                  ✓ Elite Active
                </span>
              ) : (
                <Button
                  variant="gold"
                  size="md"
                  disabled={walletLoading}
                  onClick={handleUpgradeElite}
                >
                  Upgrade to Elite →
                </Button>
              )}
            </div>
          </div>

          {/* Creator Royalties & Cash-Out Card */}
          <div className="mt-6 p-6 rounded-3xl border border-[#D4AF37]/50 bg-gradient-to-r from-[#0A0A0E] via-[#161622] to-[#0A0A0E] flex flex-col md:flex-row items-center justify-between gap-6 shadow-xl">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] flex items-center justify-center shrink-0">
                <Banknote className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-serif font-bold text-white text-lg">Creator Royalties & Cash-Out</h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                    60% Royalty Active
                  </span>
                </div>
                <p className="text-xs text-white/60 mt-0.5">
                  Earn 60% cash royalties on all luxury virtual gifts sent to you during video dates and encrypted dispatches.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4 shrink-0">
              <div className="text-right">
                <span className="text-[10px] text-white/50 block">Available to Cash Out:</span>
                <span className="text-xl font-serif font-bold text-[#D4AF37] flex items-center justify-end gap-1">
                  <span>💎 {withdrawableDiamonds}</span>
                  <span className="text-white text-sm">({withdrawableCash})</span>
                </span>
              </div>

              <Button
                variant="gold"
                size="md"
                onClick={() => setCashoutModalOpen(true)}
                className="shadow-xl flex items-center gap-1.5"
              >
                <Banknote className="w-4 h-4 text-black" />
                <span>Cash Out →</span>
              </Button>
            </div>
          </div>
        </div>

      </main>

      {/* ========================================================
          BOOST ACTIVATION PAYMENT CHOICE MODAL
          ======================================================== */}
      <AnimatePresence>
        {isBoostModalOpen && pendingBoost && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="relative w-full max-w-md rounded-3xl bg-[#0C0B12] border border-[#D4AF37]/50 p-6 sm:p-7 shadow-[0_0_60px_rgba(212,175,55,0.25)] overflow-hidden my-auto"
            >
              {/* Close Button */}
              <button
                type="button"
                onClick={() => setIsBoostModalOpen(false)}
                className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>

              <div className="text-center mb-5">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center mb-3 animate-gold-pulse">
                  <Zap className="w-7 h-7 text-[#D4AF37]" />
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-[#D4AF37]">Profile Visibility Boost</span>
                <h3 className="text-2xl font-serif font-bold text-white mt-1">{pendingBoost.title}</h3>
                <p className="text-xs text-[#F5E6CA]/80 mt-1">
                  Enjoy {pendingBoost.multiplier} discovery priority across all search feeds.
                </p>
              </div>

              <div className="space-y-3">
                {/* Option 1: Pay with Credits */}
                <button
                  type="button"
                  disabled={walletLoading || credits < pendingBoost.creditsCost}
                  onClick={handlePayBoostWithCredits}
                  className={`w-full p-4 rounded-2xl border text-left transition-all flex items-center justify-between ${
                    credits >= pendingBoost.creditsCost
                      ? 'bg-[#D4AF37]/15 border-[#D4AF37] hover:bg-[#D4AF37]/25 text-white shadow-md cursor-pointer'
                      : 'bg-white/[0.02] border-white/10 text-white/40 cursor-not-allowed opacity-60'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center text-[#D4AF37] border border-[#D4AF37]/30">
                      <Coins className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Pay with Club Credits</span>
                      <span className="text-[10px] text-[#F5E6CA]">
                        {pendingBoost.creditsCost} Credits (Your Balance: {credits})
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-amber-300">
                    {credits >= pendingBoost.creditsCost ? 'Instant ⚡' : 'Top up needed'}
                  </span>
                </button>

                {/* Option 2: Pay with Flutterwave */}
                <button
                  type="button"
                  onClick={handlePayBoostWithFlutterwave}
                  className="w-full p-4 rounded-2xl border border-white/15 bg-white/[0.03] hover:border-[#D4AF37] hover:bg-[#D4AF37]/10 text-left transition-all flex items-center justify-between cursor-pointer shadow-md"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-black/60 flex items-center justify-center text-emerald-400 border border-emerald-500/30">
                      <Banknote className="w-5 h-5" />
                    </div>
                    <div>
                      <span className="text-xs font-bold text-white block">Pay with Card / Bank Transfer</span>
                      <span className="text-[10px] text-white/50">
                        Flutterwave Instant Gateway (USSD, Transfer, Cards)
                      </span>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-[#D4AF37]">
                    {formatCurrencyPrice(pendingBoost.baseGBP, currency)} →
                  </span>
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Credit Wallet, Bespoke Gifting, Cash-Out & Elite Tier Modal */}
      <CreditsAndGiftingModal
        isOpen={cashoutModalOpen}
        onClose={() => { setCashoutModalOpen(false); fetchWallet(); }}
        defaultTab="cashout"
      />

      {/* Flutterwave Live Checkout Modal */}
      {flutterwaveItem && (
        <FlutterwaveCheckoutModal
          isOpen={isFlutterwaveModalOpen}
          onClose={() => setIsFlutterwaveModalOpen(false)}
          item={flutterwaveItem}
          defaultCurrency={currency}
          onSuccess={() => {
            fetchWallet();
            fetchBoostSession();
            setWalletMsg('✨ Payment verified! Your privileges and boost have been activated on live server.');
            setTimeout(() => setWalletMsg(''), 5000);
          }}
        />
      )}
    </div>
  );
}
