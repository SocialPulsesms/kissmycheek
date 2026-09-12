'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { motion } from 'framer-motion';
import { Crown, CheckCircle2, ShieldCheck, Zap, CreditCard, Sparkles, Clock, ArrowRight, Globe } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Navigation } from '@/components/ui/Navigation';
import { SupportedCurrency, CURRENCIES, formatCurrencyPrice } from '@/lib/creditsStore';
import { FlutterwaveCheckoutModal, FlutterwaveCheckoutItem } from '@/components/ui/FlutterwaveCheckoutModal';

export default function MembershipPage() {
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'quarterly' | 'annual'>('annual');
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<string>('ELITE');
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  const [currentTier, setCurrentTier] = useState<string>('ESSENTIAL');
  const [isLoading, setIsLoading] = useState(false);
  const [currency, setCurrency] = useState<SupportedCurrency>('NGN');

  const plans = [
    {
      id: 'ESSENTIAL',
      name: 'Essential Member',
      baseGbp: {
        monthly: 1.70,
        quarterly: 1.445,
        annual: 1.275
      },
      features: [
        'Curated daily matches',
        'Direct messaging suite',
        'Verified Member Badge',
        'Standard filters'
      ]
    },
    {
      id: 'PREMIUM',
      name: 'Premium Privilege',
      baseGbp: {
        monthly: 2.25,
        quarterly: 1.9125,
        annual: 1.6875
      },
      popular: true,
      features: [
        'Unlimited swipes & rewinds',
        'See who liked your profile',
        'HD Voice & Video Dating',
        '1 Monthly Profile Boost'
      ]
    },
    {
      id: 'ELITE',
      name: 'Elite Black Card',
      baseGbp: {
        monthly: 2.625,
        quarterly: 2.23125,
        annual: 1.96875
      },
      features: [
        'All Premium benefits included',
        'Private VIP club events',
        'Direct Elite-to-Elite matching',
        '3 Monthly Profile Boosts'
      ]
    }
  ];

  const [billingHistory, setBillingHistory] = useState<any[]>([]);

  const fetchSessionTier = async () => {
    try {
      // 1. Check localStorage for cached billing history first
      const savedBilling = localStorage.getItem('kmc_billing_history_v1');
      if (savedBilling) {
        const parsed = JSON.parse(savedBilling);
        if (Array.isArray(parsed) && parsed.length > 0) {
          const realBilling = parsed.filter((b: any) => !['inv-101', 'inv-102'].includes(b.id));
          setBillingHistory(realBilling);
          if (realBilling.length === 0) {
            localStorage.removeItem('kmc_billing_history_v1');
          }
        }
      }
    } catch {}

    try {
      const res = await fetch('/api/auth/me');
      if (res.ok) {
        const data = await res.json();
        if (data.authenticated && data.user) {
          setCurrentTier(data.user.membershipTier);
        }
      }
    } catch (err) {
      console.log('Error loading membership session');
    }

    try {
      const credRes = await fetch('/api/credits');
      if (credRes.ok) {
        const credData = await credRes.json();
        if (credData.wallet?.currency) {
          setCurrency(credData.wallet.currency);
        }
        if (credData.wallet?.billingHistory && credData.wallet.billingHistory.length > 0) {
          setBillingHistory(credData.wallet.billingHistory);
          localStorage.setItem('kmc_billing_history_v1', JSON.stringify(credData.wallet.billingHistory));
        }
      }
    } catch {}
  };

  useEffect(() => {
    fetchSessionTier();
  }, []);

  const [flutterwaveItem, setFlutterwaveItem] = useState<FlutterwaveCheckoutItem | null>(null);
  const [isFlutterwaveModalOpen, setIsFlutterwaveModalOpen] = useState(false);

  const startFlutterwaveCheckout = (planId: string) => {
    const plan = plans.find(p => p.id === planId) || plans[2];
    setSelectedPlan(planId);
    setFlutterwaveItem({
      type: 'MEMBERSHIP',
      title: `${plan.name} (${billingCycle.toUpperCase()} Tier)`,
      subtitle: `Unlock confidential club galas, 4K video dates, and VIP placement`,
      baseGBPPrice: plan.baseGbp[billingCycle],
      planTier: billingCycle === 'annual' ? 'ANNUAL' : 'MONTHLY'
    });
    setIsFlutterwaveModalOpen(true);
  };

  const handleCheckout = async (e: React.FormEvent) => {
    e.preventDefault();
    startFlutterwaveCheckout(selectedPlan);
  };

  const handleClearBillingHistory = async () => {
    try {
      localStorage.removeItem('kmc_billing_history_v1');
      setBillingHistory([]);
      await fetch('/api/credits', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'clear_billing_history' })
      });
    } catch {}
  };

  return (
    <div className="min-h-screen bg-[#070709] text-[#F4F4F6] pb-[calc(7rem+env(safe-area-inset-bottom,0px))] md:pb-24 relative overflow-hidden">
      <Navigation />

      <main className="max-w-6xl mx-auto px-3 sm:px-6 lg:px-8 pt-4 sm:pt-8">
        
        {/* Active Membership Status Banner */}
        <Card className="p-4 sm:p-6 border-[#D4AF37] gold-border-glow mb-8 sm:mb-12 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 sm:gap-6">
          <div className="flex items-center gap-3 sm:gap-4 min-w-0 flex-1">
            <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-full bg-gradient-to-tr from-[#D4AF37] to-amber-600 flex items-center justify-center shadow-lg shrink-0">
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 text-black" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] sm:text-xs uppercase tracking-widest text-white/60">Current Status</span>
                <Badge type="tier" label={`${currentTier} MEMBER`} />
              </div>
              <h2 className="font-serif text-lg sm:text-2xl font-bold text-white mt-0.5 truncate">
                {currentTier === 'ESSENTIAL' ? 'Essential Membership Active' : currentTier === 'PREMIUM' ? 'Premium Privilege Active' : 'Elite Black Card Active'}
              </h2>
              <p className="text-[11px] sm:text-xs text-white/60">
                Renews automatically • Verified VIP Status: Active
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto shrink-0">
            <Link href="/boost">
              <Button variant="gold" size="sm" icon={<Zap className="w-4 h-4 text-black" />}>
                Activate Boost
              </Button>
            </Link>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => startFlutterwaveCheckout('ELITE')}
            >
              Manage Subscription
            </Button>
          </div>
        </Card>

        {/* Plan Header */}
        <div className="text-center max-w-3xl mx-auto mb-8 sm:mb-12 px-2">
          <span className="px-3 py-0.5 sm:py-1 rounded-full text-[10px] sm:text-xs font-bold uppercase tracking-widest bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30 mb-2 sm:mb-3 inline-block">
            Elevate Your Experience
          </span>
          <h1 className="font-serif text-2xl sm:text-4xl md:text-5xl font-bold text-white mb-2 sm:mb-4 gold-gradient-text">
            Exclusive Membership Tiers
          </h1>
          <p className="text-xs sm:text-sm text-white/70 max-w-xl mx-auto mb-5 sm:mb-6">
            Gain verified status, unlock private encounters, and experience confidential VIP club galas with high-society patrons.
          </p>

          {/* Billing Cycle Switcher */}
          <div className="flex flex-wrap sm:inline-flex justify-center gap-1 p-1 sm:p-1.5 rounded-2xl sm:rounded-full bg-black/60 border border-white/10 glass-panel max-w-full">
            <button
              onClick={() => setBillingCycle('monthly')}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                billingCycle === 'monthly'
                  ? 'bg-[#D4AF37] text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Monthly
            </button>
            <button
              onClick={() => setBillingCycle('quarterly')}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                billingCycle === 'quarterly'
                  ? 'bg-[#D4AF37] text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Quarterly (-15%)
            </button>
            <button
              onClick={() => setBillingCycle('annual')}
              className={`px-3.5 sm:px-5 py-1.5 sm:py-2 rounded-xl sm:rounded-full text-[11px] sm:text-xs font-semibold transition-all ${
                billingCycle === 'annual'
                  ? 'bg-[#D4AF37] text-black shadow-lg font-bold'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              Annual (-25%)
            </button>
          </div>
        </div>

        {/* Pricing Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 md:gap-8 mb-12 sm:mb-16">
          {plans.map((plan) => {
            const priceStr = formatCurrencyPrice(plan.baseGbp[billingCycle], currency);
            return (
              <Card
                key={plan.id}
                className={`p-5 sm:p-8 flex flex-col justify-between relative overflow-hidden transition-all duration-300 hover:scale-[1.01] ${
                  plan.popular ? 'border-[#D4AF37] gold-border-glow bg-gradient-to-b from-[#14141E] via-[#0A0A0E] to-black' : 'border-white/10'
                }`}
              >
                {plan.popular && (
                  <div className="absolute top-4 right-4">
                    <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full text-[9px] sm:text-[10px] font-bold uppercase tracking-widest bg-[#D4AF37] text-black">
                      Most Popular
                    </span>
                  </div>
                )}

                <div>
                  <span className="text-[11px] sm:text-xs uppercase tracking-widest text-[#D4AF37] font-semibold">{plan.id}</span>
                  <h3 className="text-xl sm:text-2xl font-serif font-bold text-white mt-1">{plan.name}</h3>

                  <div className="mt-3 sm:mt-4 flex items-baseline gap-1">
                    <span className="text-3xl sm:text-4xl font-serif font-bold gold-gradient-text">{priceStr}</span>
                    <span className="text-xs text-white/60">/ month</span>
                  </div>

                  <ul className="mt-5 sm:mt-6 space-y-2.5 sm:space-y-3 text-xs sm:text-sm text-white/80 border-t border-white/10 pt-4 sm:pt-6">
                    {plan.features.map((feat, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <CheckCircle2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <Button
                  variant={plan.popular ? 'gold' : 'outline'}
                  fullWidth
                  className="mt-6 sm:mt-8 font-bold"
                  onClick={() => startFlutterwaveCheckout(plan.id)}
                >
                  {plan.popular ? `Get ${plan.name}` : `Join ${plan.name}`}
                </Button>
              </Card>
            );
          })}
        </div>

        {/* Billing History Table */}
        <div className="glass-card p-6 border-white/10 rounded-3xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-serif font-bold text-xl text-white">Billing History & Invoices</h3>
            {billingHistory.length > 0 && (
              <button
                type="button"
                onClick={handleClearBillingHistory}
                className="text-xs text-rose-400/90 hover:text-rose-300 font-semibold px-3 py-1 rounded-full border border-rose-500/30 hover:bg-rose-500/15 transition-all"
              >
                Clear History
              </button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-white/70">
              <thead className="border-b border-white/10 uppercase tracking-widest text-[#D4AF37]">
                <tr>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4">Plan Description</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Invoice PDF</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {billingHistory.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-white/50 text-xs">
                      No billing records found. Your membership and tier upgrade receipts will appear here.
                    </td>
                  </tr>
                ) : (
                  billingHistory.map((invoice, idx) => (
                    <tr key={invoice.id || idx} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-4 font-medium text-white">{invoice.date}</td>
                      <td className="py-3.5 px-4">{invoice.planDescription}</td>
                      <td className="py-3.5 px-4 font-bold text-white">{invoice.amountFormatted}</td>
                      <td className="py-3.5 px-4"><span className="text-emerald-400 font-bold">PAID</span></td>
                      <td className="py-3.5 px-4 text-right">
                        <button 
                          onClick={() => alert(`Receipt #${invoice.id || 'INV-001'} downloaded.`)}
                          className="text-[#D4AF37] hover:underline font-semibold"
                        >
                          Download Receipt
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </main>

      {/* FLUTTERWAVE INTEGRATED CHECKOUT MODAL */}
      {flutterwaveItem && (
        <FlutterwaveCheckoutModal
          isOpen={isFlutterwaveModalOpen}
          onClose={() => setIsFlutterwaveModalOpen(false)}
          item={flutterwaveItem}
          defaultCurrency={currency}
          onSuccess={() => {
            fetchSessionTier();
          }}
        />
      )}

    </div>
  );
}
