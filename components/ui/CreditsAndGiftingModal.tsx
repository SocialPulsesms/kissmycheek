'use client';

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Crown, 
  Sparkles, 
  Coins, 
  Gift, 
  CheckCircle2, 
  Globe, 
  Lock, 
  Zap, 
  X, 
  ShieldCheck, 
  ArrowRight,
  ChevronDown,
  Banknote,
  Building2,
  CreditCard,
  Clock,
  ArrowUpRight,
  Check
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { 
  CURRENCIES, 
  SupportedCurrency, 
  formatCurrencyPrice, 
  CREDIT_PACKS, 
  BESPOKE_GIFTS, 
  ELITE_MONTHLY_PRICE_GBP,
  BespokeGift,
  MIN_CASHOUT_DIAMONDS,
  diamondsToCashString,
  NIGERIAN_BANKS
} from '@/lib/creditsStore';
import { FlutterwaveCheckoutModal, FlutterwaveCheckoutItem } from '@/components/ui/FlutterwaveCheckoutModal';

interface CreditsAndGiftingModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultTab?: 'gifting' | 'topup' | 'elite' | 'cashout';
  recipientName?: string;
  onGiftSent?: (gift: BespokeGift, partnerReply?: string) => void;
  threadId?: string;
}

export function CreditsAndGiftingModal({
  isOpen,
  onClose,
  defaultTab = 'gifting',
  recipientName = 'Club Member',
  onGiftSent,
  threadId
}: CreditsAndGiftingModalProps) {
  const [activeTab, setActiveTab] = useState<'gifting' | 'topup' | 'elite' | 'cashout'>(defaultTab);
  const [currency, setCurrency] = useState<SupportedCurrency>('NGN');
  const [credits, setCredits] = useState<number>(180);
  const [tier, setTier] = useState<'STANDARD' | 'ELITE'>('STANDARD');
  const [loading, setLoading] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string>('');
  const [currencyDropdownOpen, setCurrencyDropdownOpen] = useState(false);

  // Creator Royalties & Cash-Out State
  const [earnings, setEarnings] = useState<{
    withdrawableDiamonds: number;
    pendingDiamonds: number;
    lifetimeEarnedDiamonds: number;
    isVerifiedCreator: boolean;
    withdrawableCash: string;
    pendingCash: string;
    lifetimeCash: string;
    minCashoutDiamonds: number;
    minCashoutCash: string;
    payoutHistory: any[];
  }>({
    withdrawableDiamonds: 680,
    pendingDiamonds: 180,
    lifetimeEarnedDiamonds: 1150,
    isVerifiedCreator: true,
    withdrawableCash: '₦66,500',
    pendingCash: '₦17,500',
    lifetimeCash: '₦112,000',
    minCashoutDiamonds: 250,
    minCashoutCash: '₦25,000',
    payoutHistory: []
  });

  const [payoutMethod, setPayoutMethod] = useState<'BANK_TRANSFER' | 'FLUTTERWAVE'>('BANK_TRANSFER');
  const [payoutAmount, setPayoutAmount] = useState<number>(400);
  const [bankName, setBankName] = useState('Guaranty Trust Bank (GTBank)');
  const [accountNumber, setAccountNumber] = useState('');
  const [accountName, setAccountName] = useState('');
  const [sortCode, setSortCode] = useState('');

  // Flutterwave Modal Integration
  const [flutterwaveItem, setFlutterwaveItem] = useState<FlutterwaveCheckoutItem | null>(null);
  const [isFlutterwaveModalOpen, setIsFlutterwaveModalOpen] = useState(false);

  // Sync with server wallet & earnings
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
          setEarnings(data.earnings);
          if (data.earnings.withdrawableDiamonds) {
            setPayoutAmount(Math.max(MIN_CASHOUT_DIAMONDS, data.earnings.withdrawableDiamonds));
          }
        }
      }
    } catch {
      // Local fallback
    }
  };

  useEffect(() => {
    if (isOpen) {
      setActiveTab(defaultTab);
      setSuccessMessage('');
      setErrorMessage('');
      fetchWallet();
    }
  }, [isOpen, defaultTab]);

  const handleTopUp = async (packId: string) => {
    const pack = CREDIT_PACKS.find(p => p.id === packId) || CREDIT_PACKS[0];
    setFlutterwaveItem({
      type: 'CREDITS',
      title: `${pack.title} Top-Up`,
      subtitle: `${pack.credits + pack.bonusCredits} Club Credits & Diamonds`,
      baseGBPPrice: pack.baseGBPPrice,
      packId: pack.id,
      creditsAmount: pack.credits + pack.bonusCredits
    });
    setIsFlutterwaveModalOpen(true);
  };

  const handleUpgradeElite = async () => {
    setFlutterwaveItem({
      type: 'MEMBERSHIP',
      title: 'Elite Black Card Membership',
      subtitle: 'Monthly VIP Access Pass',
      baseGBPPrice: ELITE_MONTHLY_PRICE_GBP,
      planTier: 'MONTHLY'
    });
    setIsFlutterwaveModalOpen(true);
  };

  const handleSendGift = async (gift: BespokeGift) => {
    if (credits < gift.credits) {
      setActiveTab('topup');
      setErrorMessage(`You need ${gift.credits - credits} more credits for ${gift.name}. Please top up.`);
      return;
    }

    setLoading(true);
    setErrorMessage('');
    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          action: 'send_gift', 
          giftId: gift.id,
          threadId: threadId || ''
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setCredits(data.remainingCredits);
        setSuccessMessage(`Dispatched ${gift.name} to ${recipientName}!`);
        if (onGiftSent) {
          onGiftSent(gift, data.partnerReply || gift.reactionText);
        }
        setTimeout(() => {
          setSuccessMessage('');
          onClose();
        }, 1800);
      } else {
        setErrorMessage(data.error || 'Failed to dispatch gift');
        if (data.insufficientCredits) {
          setActiveTab('topup');
        }
      }
    } catch {
      setErrorMessage('Network error while dispatching gift');
    } finally {
      setLoading(false);
    }
  };

  const handleRequestCashout = async () => {
    if (payoutAmount < MIN_CASHOUT_DIAMONDS) {
      setErrorMessage(`Minimum cash-out is ${MIN_CASHOUT_DIAMONDS} Diamonds (${diamondsToCashString(MIN_CASHOUT_DIAMONDS, currency)})`);
      return;
    }

    if (payoutAmount > earnings.withdrawableDiamonds) {
      setErrorMessage(`Cannot withdraw more than your available ${earnings.withdrawableDiamonds} Diamonds.`);
      return;
    }

    setLoading(true);
    setErrorMessage('');

    const destinationSummary = `${bankName} •••• ${accountNumber.slice(-4) || '1234'}`;

    try {
      const res = await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'request_payout',
          diamonds: payoutAmount,
          payoutMethod,
          destinationSummary,
          currency
        })
      });

      const data = await res.json();
      if (res.ok && data.success) {
        setSuccessMessage(data.message);
        fetchWallet();
        setTimeout(() => {
          setSuccessMessage('');
        }, 4000);
      } else {
        setErrorMessage(data.error || 'Cash-out request failed');
      }
    } catch {
      setErrorMessage('Network error during cash-out');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-xl animate-fadeIn">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="max-w-2xl w-full bg-[#0A0A0E] border border-[#D4AF37]/40 rounded-3xl shadow-[0_0_50px_rgba(212,175,55,0.25)] overflow-hidden flex flex-col max-h-[90vh]"
      >
        {/* Modal Header */}
        <div className="p-5 border-b border-white/10 flex items-center justify-between bg-black/40">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
              {activeTab === 'elite' ? <Crown className="w-5 h-5" /> : activeTab === 'gifting' ? <Gift className="w-5 h-5" /> : activeTab === 'cashout' ? <Banknote className="w-5 h-5" /> : <Coins className="w-5 h-5" />}
            </div>
            <div>
              <h3 className="font-serif font-bold text-white text-lg">
                {activeTab === 'gifting' 
                  ? `Bespoke Gift for ${recipientName}` 
                  : activeTab === 'elite' 
                  ? 'Elite Membership Privilege' 
                  : activeTab === 'cashout'
                  ? 'Creator Royalties & Cash-Out'
                  : 'Private Date Credits'}
              </h3>
              <div className="flex items-center gap-2 mt-0.5">
                <span className="text-xs text-white/50">Your Balance:</span>
                <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5" /> {credits} Credits
                </span>
                <span className="text-white/30">•</span>
                <span className="text-xs font-bold text-cyan-400 flex items-center gap-1">
                  💎 {earnings.withdrawableDiamonds} Diamonds
                </span>
                <span className="text-white/30">•</span>
                <span className={`text-[10px] uppercase tracking-wider font-bold px-2 py-0.2 rounded-full ${
                  tier === 'ELITE' ? 'bg-[#D4AF37]/20 text-[#D4AF37] border border-[#D4AF37]/40' : 'bg-white/10 text-white/60'
                }`}>
                  {tier}
                </span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Preferred Currency Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setCurrencyDropdownOpen(!currencyDropdownOpen)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-semibold text-white transition-colors"
                title="Change display currency"
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
                      className={`w-full text-left px-2.5 py-1.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                        currency === curr.code ? 'bg-[#D4AF37] text-black font-bold' : 'text-white/80 hover:bg-white/10'
                      }`}
                    >
                      <span>{curr.name}</span>
                      <span className="font-mono text-xs">{curr.symbol}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            <button
              onClick={onClose}
              className="p-2 rounded-full hover:bg-white/10 text-white/50 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-white/10 bg-black/20 px-6 pt-3 gap-2 overflow-x-auto no-scrollbar">
          <button
            onClick={() => { setActiveTab('gifting'); setErrorMessage(''); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'gifting' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5" /> Bespoke Gifts
          </button>
          <button
            onClick={() => { setActiveTab('topup'); setErrorMessage(''); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'topup' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Coins className="w-3.5 h-3.5" /> Buy Credits
          </button>
          <button
            onClick={() => { setActiveTab('cashout'); setErrorMessage(''); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'cashout' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Banknote className="w-3.5 h-3.5" /> 💰 Cash Out
          </button>
          <button
            onClick={() => { setActiveTab('elite'); setErrorMessage(''); }}
            className={`pb-3 px-3 text-xs font-bold transition-all border-b-2 flex items-center gap-1.5 shrink-0 ${
              activeTab === 'elite' ? 'border-[#D4AF37] text-[#D4AF37]' : 'border-transparent text-white/50 hover:text-white'
            }`}
          >
            <Crown className="w-3.5 h-3.5" /> Elite HD Video
          </button>
        </div>

        {/* Status Alerts */}
        {successMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="mx-6 mt-4 p-3 rounded-2xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center justify-between gap-2">
            <span>{errorMessage}</span>
            {errorMessage.includes('credits') && activeTab !== 'topup' && (
              <button
                onClick={() => setActiveTab('topup')}
                className="underline font-bold hover:text-white"
              >
                Top Up Now →
              </button>
            )}
          </div>
        )}

        {/* Tab Content Container */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">

          {/* TAB 1: BESPOKE LUXURY GIFTS */}
          {activeTab === 'gifting' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="font-serif font-bold text-white text-base">Send Virtual Romance & Affection</h4>
                  <p className="text-xs text-white/50">Dispatches an encrypted luxury gift into the date feed and chat room.</p>
                </div>
                <span className="text-[11px] text-[#D4AF37] font-semibold bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-1 rounded-full">
                  60% Royalty Credited to Partner
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {BESPOKE_GIFTS.map((gift) => {
                  const affordable = credits >= gift.credits;
                  return (
                    <div 
                      key={gift.id}
                      className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-[#D4AF37]/50 transition-all flex flex-col justify-between group shadow-md"
                    >
                      <div className="flex items-start gap-3">
                        <div className="text-4xl p-2 rounded-2xl bg-black/50 border border-white/5 group-hover:scale-110 transition-transform">
                          {gift.icon}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <h5 className="font-serif font-bold text-white text-sm">{gift.name}</h5>
                            <span className="text-xs font-bold text-[#D4AF37] flex items-center gap-1">
                              <Coins className="w-3 h-3" /> {gift.credits}
                            </span>
                          </div>
                          <p className="text-xs text-white/60 mt-1 leading-snug">{gift.tagline}</p>
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between">
                        <span className="text-[10px] text-white/40 italic">
                          Partner earns 💎 {Math.round(gift.credits * 0.6)} Diamonds
                        </span>
                        <Button
                          variant={affordable ? 'gold' : 'glass'}
                          size="sm"
                          disabled={loading}
                          onClick={() => handleSendGift(gift)}
                        >
                          {affordable ? 'Dispatch Gift' : `Need ${gift.credits - credits} More`}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* TAB 2: TOP-UP PACKS */}
          {activeTab === 'topup' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-serif font-bold text-white text-base">Select Private Credit Pack</h4>
                <p className="text-xs text-white/50">Credits are used for high-definition streaming and sending bespoke gifts.</p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {CREDIT_PACKS.map((pack) => {
                  const priceStr = formatCurrencyPrice(pack.baseGBPPrice, currency);

                  return (
                    <div
                      key={pack.id}
                      className={`relative p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                        pack.popular 
                          ? 'border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/15 to-black shadow-[0_0_30px_rgba(212,175,55,0.2)]' 
                          : 'border-white/10 bg-black/40 hover:border-white/20'
                      }`}
                    >
                      {pack.popular && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#D4AF37] text-black text-[9px] font-bold uppercase tracking-wider shadow-md">
                          Most Popular
                        </span>
                      )}
                      {pack.bestValue && (
                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-bold uppercase tracking-wider shadow-md">
                          Best Value
                        </span>
                      )}

                      <div>
                        <span className="text-xs uppercase tracking-wider text-white/50 font-bold block mb-1">
                          {pack.title}
                        </span>
                        <div className="my-3">
                          <span className="text-3xl font-serif font-bold text-white">
                            {pack.credits}
                          </span>
                          {pack.bonusCredits > 0 && (
                            <span className="ml-2 text-xs font-bold text-emerald-400">
                              +{pack.bonusCredits} Free Bonus
                            </span>
                          )}
                          <span className="text-[10px] text-white/50 block">Club Credits</span>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 text-center">
                        <span className="text-lg font-serif font-bold text-white block mb-3">
                          {priceStr}
                        </span>

                        <Button
                          variant={pack.popular ? 'gold' : 'glass'}
                          size="sm"
                          fullWidth
                          disabled={loading}
                          onClick={() => handleTopUp(pack.id)}
                        >
                          {loading ? 'Processing...' : 'Get Credits'}
                        </Button>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between text-xs text-white/60">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>Secure 256-Bit Encrypted Payment in {currency}</span>
                </span>
                <span className="text-[#D4AF37] text-[11px] font-semibold">Instant Balance Credit</span>
              </div>
            </div>
          )}

          {/* TAB 3: CASH OUT / CREATOR ROYALTIES */}
          {activeTab === 'cashout' && (
            <div className="space-y-5">
              
              {/* Top Earnings Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                
                {/* Ready to Cash Out */}
                <div className="p-4 rounded-2xl bg-gradient-to-br from-[#D4AF37]/20 via-black to-[#0A0A0E] border border-[#D4AF37]/50 shadow-lg">
                  <div className="flex items-center justify-between text-xs text-[#D4AF37] font-semibold mb-1">
                    <span>Available to Cash Out</span>
                    <span className="text-base">💎</span>
                  </div>
                  <div className="text-2xl font-serif font-bold text-white">
                    {diamondsToCashString(earnings.withdrawableDiamonds, currency)}
                  </div>
                  <span className="text-[11px] text-emerald-400 font-medium">
                    {earnings.withdrawableDiamonds} Diamonds Cleared
                  </span>
                </div>

                {/* 7-Day Anti-Fraud Clearance */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/50 font-semibold mb-1">
                    <span>In 7-Day Clearing</span>
                    <Clock className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-white/80">
                    {diamondsToCashString(earnings.pendingDiamonds, currency)}
                  </div>
                  <span className="text-[10px] text-white/40">
                    Anti-fraud security hold
                  </span>
                </div>

                {/* Lifetime Total */}
                <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10">
                  <div className="flex items-center justify-between text-xs text-white/50 font-semibold mb-1">
                    <span>Lifetime Royalties</span>
                    <ArrowUpRight className="w-3.5 h-3.5 text-[#D4AF37]" />
                  </div>
                  <div className="text-2xl font-serif font-bold text-white/80">
                    {diamondsToCashString(earnings.lifetimeEarnedDiamonds, currency)}
                  </div>
                  <span className="text-[10px] text-white/40">
                    60% Creator Royalty Share
                  </span>
                </div>

              </div>

              {/* Creator Royalty Rules Badge */}
              <div className="p-3.5 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 text-xs text-[#F5E6CA] flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                  <span><strong>Creator Royalty Split:</strong> You receive 60% of all gift credits. Platform retains 40%.</span>
                </span>
                <span className="text-[10px] font-bold bg-[#D4AF37]/20 text-[#D4AF37] px-2 py-0.5 rounded-full">
                  Min. Cash-Out: {diamondsToCashString(MIN_CASHOUT_DIAMONDS, currency)}
                </span>
              </div>

              {/* Request Cash-Out Form */}
              <div className="p-5 rounded-3xl bg-black/60 border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="font-serif font-bold text-white text-base flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-[#D4AF37]" />
                    <span>Request Direct Bank Payout</span>
                  </h4>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                    Direct Bank Transfer (NUBAN)
                  </span>
                </div>

                {/* Amount to Withdraw */}
                <div>
                  <div className="flex justify-between text-xs mb-1.5">
                    <span className="text-white/70">Withdrawal Amount:</span>
                    <span className="font-bold text-[#D4AF37]">
                      {payoutAmount} Diamonds = {diamondsToCashString(payoutAmount, currency)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={MIN_CASHOUT_DIAMONDS}
                      max={earnings.withdrawableDiamonds}
                      value={payoutAmount}
                      onChange={(e) => setPayoutAmount(Number(e.target.value))}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm focus:border-[#D4AF37] focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() => setPayoutAmount(earnings.withdrawableDiamonds)}
                      className="px-3 py-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-xs font-bold text-white transition-colors"
                    >
                      Max Available
                    </button>
                  </div>
                </div>

                {/* Bank Transfer Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Select Bank / Institution</label>
                    <select
                      value={bankName}
                      onChange={(e) => setBankName(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-[#14141B] border border-white/15 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    >
                      {NIGERIAN_BANKS.map((bank) => (
                        <option key={bank} value={bank} className="bg-[#14141B] text-white">
                          {bank}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Account Holder Name</label>
                    <input
                      type="text"
                      value={accountName}
                      onChange={(e) => setAccountName(e.target.value)}
                      placeholder="Account Name as registered with Bank"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Account Number (10-Digit NUBAN)</label>
                    <input
                      type="text"
                      maxLength={10}
                      value={accountNumber}
                      onChange={(e) => setAccountNumber(e.target.value)}
                      placeholder="e.g. 0148219033"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-white/50 block mb-1">Branch / Optional Note</label>
                    <input
                      type="text"
                      value={sortCode}
                      onChange={(e) => setSortCode(e.target.value)}
                      placeholder="e.g. Victoria Island, Lagos"
                      className="w-full px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-xs text-white focus:border-[#D4AF37] focus:outline-none font-mono"
                    />
                  </div>
                </div>

                {/* Submit Payout Button */}
                <Button
                  variant="gold"
                  size="md"
                  fullWidth
                  disabled={loading || payoutAmount < MIN_CASHOUT_DIAMONDS || payoutAmount > earnings.withdrawableDiamonds}
                  onClick={handleRequestCashout}
                  className="shadow-xl"
                >
                  {loading ? 'Processing Transfer...' : `Request Payout of ${diamondsToCashString(payoutAmount, currency)} →`}
                </Button>
              </div>

              {/* Payout History Activity */}
              {earnings.payoutHistory && earnings.payoutHistory.length > 0 && (
                <div className="space-y-2 pt-2">
                  <h5 className="font-serif font-bold text-white text-xs uppercase tracking-wider">
                    Recent Payout Transfers
                  </h5>
                  <div className="divide-y divide-white/5 border border-white/10 rounded-2xl bg-black/40 overflow-hidden">
                    {earnings.payoutHistory.map((item, idx) => (
                      <div key={idx} className="p-3 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
                            <Check className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <span className="font-bold text-white block">{item.cashAmount}</span>
                            <span className="text-[10px] text-white/50">{item.destinationSummary} • {item.requestedAt}</span>
                          </div>
                        </div>

                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                          item.status === 'COMPLETED' 
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' 
                            : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                        }`}>
                          {item.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

            </div>
          )}

          {/* TAB 4: ELITE TIER HD VIDEO UPGRADE */}
          {activeTab === 'elite' && (
            <div className="space-y-4">
              <div className="p-6 rounded-3xl border border-[#D4AF37] bg-gradient-to-b from-[#D4AF37]/15 via-black to-[#0A0A0E] text-center relative overflow-hidden shadow-2xl">
                <div className="w-14 h-14 rounded-full bg-[#D4AF37]/20 border border-[#D4AF37] mx-auto flex items-center justify-center mb-3">
                  <Crown className="w-7 h-7 text-[#D4AF37]" />
                </div>

                <h3 className="font-serif font-bold text-2xl text-white">The Elite Circle</h3>
                <p className="text-xs text-[#F5E6CA] mt-1 max-w-lg mx-auto">
                  The most coveted tier in West Africa. Access is strictly gated: only verified high-net-worth members, executives, and leaders are admitted.
                </p>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-5 text-left">
                  <div className="p-3 rounded-2xl bg-black/60 border border-[#D4AF37]/30">
                    <span className="text-[#D4AF37] font-bold text-xs flex items-center gap-1.5 mb-1">
                      <span>🏰</span> Confidential Private Events
                    </span>
                    <p className="text-[10px] text-white/70">
                      Unlock confidential gala itineraries, secret venues, and complimentary VIP passes across Enugu, Owerri, Port Harcourt, Lagos & Abuja.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-[#D4AF37]/30">
                    <span className="text-[#D4AF37] font-bold text-xs flex items-center gap-1.5 mb-1">
                      <span>🥂</span> Elite-to-Elite Encounters
                    </span>
                    <p className="text-[10px] text-white/70">
                      Communicate, message, and date exclusively with fellow verified Elite Members. Standard members cannot initiate contact.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-[#D4AF37]/30">
                    <span className="text-[#D4AF37] font-bold text-xs flex items-center gap-1.5 mb-1">
                      <span>💬</span> Unlimited Private Dispatches
                    </span>
                    <p className="text-[10px] text-white/70">
                      Chat freely with verified members without the standard message cap.
                    </p>
                  </div>

                  <div className="p-3 rounded-2xl bg-black/60 border border-[#D4AF37]/30">
                    <span className="text-[#D4AF37] font-bold text-xs flex items-center gap-1.5 mb-1">
                      <span>⚡</span> 10x Priority Visibility
                    </span>
                    <p className="text-[10px] text-white/70">
                      Ranked at the very apex of member discovery across Nigeria, Africa, Europe, Americas, Middle East, Asia and global capitals.
                    </p>
                  </div>
                </div>

                <div className="pt-2 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-4">
                  <div className="text-left">
                    <span className="text-[11px] text-white/50 block">Introductory Club Rate:</span>
                    <span className="text-2xl font-serif font-bold gold-gradient-text">
                      {formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency)}
                      <span className="text-xs font-normal text-white/60"> / month</span>
                    </span>
                  </div>

                  {tier === 'ELITE' ? (
                    <div className="flex items-center gap-2 px-5 py-2.5 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold">
                      <CheckCircle2 className="w-4 h-4" /> You are an Elite Member
                    </div>
                  ) : (
                    <Button
                      variant="gold"
                      size="md"
                      disabled={loading}
                      onClick={handleUpgradeElite}
                      className="shadow-xl"
                    >
                      {loading ? 'Activating...' : `Activate Elite Tier (${formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency)}) →`}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}

        </div>

      </motion.div>

      {/* FLUTTERWAVE INTEGRATED CHECKOUT MODAL */}
      {flutterwaveItem && (
        <FlutterwaveCheckoutModal
          isOpen={isFlutterwaveModalOpen}
          onClose={() => setIsFlutterwaveModalOpen(false)}
          item={flutterwaveItem}
          defaultCurrency={currency}
          onSuccess={() => {
            fetchWallet();
            setSuccessMessage('Payment successful! Your credits are now available.');
            setTimeout(() => setSuccessMessage(''), 3000);
          }}
        />
      )}
    </div>
  );
}
