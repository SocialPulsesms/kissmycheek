'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  CheckCircle2, 
  CreditCard, 
  Building2, 
  Smartphone, 
  Globe2, 
  Sparkles, 
  X, 
  ArrowRight,
  Loader2,
  Copy,
  Check,
  PhoneCall,
  Clock,
  AlertCircle,
  RefreshCw,
  Radio
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { Button } from '@/components/ui/Button';
import { 
  CURRENCIES, 
  SupportedCurrency, 
  formatCurrencyPrice 
} from '@/lib/creditsStore';

export interface FlutterwaveCheckoutItem {
  type: 'MEMBERSHIP' | 'CREDITS' | 'EVENT_TICKET' | 'BOOST';
  title: string;
  subtitle: string;
  baseGBPPrice: number;
  planTier?: 'MONTHLY' | 'ANNUAL';
  packId?: string;
  eventId?: string;
  boostDuration?: number;
  creditsAmount?: number;
}

export type FlutterwavePaymentMethod = 'banktransfer' | 'card' | 'ussd' | 'global_card' | 'applepay';

interface FlutterwaveCheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  item: FlutterwaveCheckoutItem;
  defaultCurrency?: SupportedCurrency;
  onSuccess?: () => void;
}

const NIGERIAN_BANKS = [
  { name: 'GTBank', code: '737', dialPrefix: '*737*2*' },
  { name: 'Zenith Bank', code: '966', dialPrefix: '*966*2*' },
  { name: 'UBA', code: '919', dialPrefix: '*919*4*' },
  { name: 'Access Bank', code: '901', dialPrefix: '*901*2*' },
  { name: 'First Bank', code: '894', dialPrefix: '*894*2*' },
  { name: 'Fidelity Bank', code: '770', dialPrefix: '*770*2*' },
  { name: 'Stanbic IBTC', code: '909', dialPrefix: '*909*2*' },
  { name: 'Sterling Bank', code: '822', dialPrefix: '*822*2*' }
];

export function FlutterwaveCheckoutModal({
  isOpen,
  onClose,
  item,
  defaultCurrency = 'NGN',
  onSuccess
}: FlutterwaveCheckoutModalProps) {
  const [selectedCurrency, setSelectedCurrency] = useState<SupportedCurrency>(defaultCurrency);
  const [paymentMode, setPaymentMode] = useState<'LOCAL' | 'INTERNATIONAL'>(
    defaultCurrency === 'NGN' ? 'LOCAL' : 'INTERNATIONAL'
  );
  const [selectedMethod, setSelectedMethod] = useState<FlutterwavePaymentMethod>(
    defaultCurrency === 'NGN' ? 'banktransfer' : 'global_card'
  );

  // In-App Transaction State
  const [isLoading, setIsLoading] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [copiedField, setCopiedField] = useState<'account' | 'amount' | 'ussd' | null>(null);

  // Dynamic Virtual Account State
  interface DynamicVirtualAccount {
    bankName: string;
    accountNumber: string;
    accountName: string;
    amount: number;
    formattedAmount: string;
    expiryDate?: string;
    tx_ref: string;
    orderRef?: string;
    flwRef?: string;
  }
  const [virtualAccount, setVirtualAccount] = useState<DynamicVirtualAccount | null>(null);
  const [isGeneratingAccount, setIsGeneratingAccount] = useState(false);
  const [generationError, setGenerationError] = useState<string | null>(null);
  const [transferStatusMessage, setTransferStatusMessage] = useState<string | null>(null);

  // Card Form State
  const [cardNumber, setCardNumber] = useState('');
  const [cardHolder, setCardHolder] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [cardBrand, setCardBrand] = useState<'verve' | 'mastercard' | 'visa' | null>(null);
  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpCode, setOtpCode] = useState('');

  // USSD Bank Selection
  const [selectedUssdBank, setSelectedUssdBank] = useState(NIGERIAN_BANKS[0]);

  // Virtual countdown timer (30 mins)
  const [secondsRemaining, setSecondsRemaining] = useState(1794);

  useEffect(() => {
    if (!isOpen) return;
    const timer = setInterval(() => {
      setSecondsRemaining(prev => (prev > 0 ? prev - 1 : 1800));
    }, 1000);

    if (typeof window !== 'undefined') {
      const scriptId = 'flutterwave-inline-v3-js';
      if (!document.getElementById(scriptId)) {
        const script = document.createElement('script');
        script.id = scriptId;
        script.src = 'https://checkout.flutterwave.com/v3.js';
        script.async = true;
        document.body.appendChild(script);
      }
    }

    return () => clearInterval(timer);
  }, [isOpen]);

  if (!isOpen) return null;

  const currentCurrencyConfig = CURRENCIES[selectedCurrency] || CURRENCIES.NGN;
  const convertedAmount = Math.round(item.baseGBPPrice * currentCurrencyConfig.rateAgainstGBP);
  const formattedPrice = formatCurrencyPrice(item.baseGBPPrice, selectedCurrency);

  // Format countdown mm:ss
  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const timerString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

  const handleSelectPaymentMode = (mode: 'LOCAL' | 'INTERNATIONAL') => {
    setPaymentMode(mode);
    if (mode === 'LOCAL') {
      setSelectedCurrency('NGN');
      setSelectedMethod('banktransfer');
    } else {
      if (selectedCurrency === 'NGN') setSelectedCurrency('USD');
      setSelectedMethod('global_card');
    }
  };

  const copyToClipboard = (text: string, field: 'account' | 'amount' | 'ussd') => {
    try {
      navigator.clipboard.writeText(text);
      setCopiedField(field);
      setTimeout(() => setCopiedField(null), 2500);
    } catch {}
  };

  // Card number input handler with auto grouping & brand detection
  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 19);
    const parts = raw.match(/[\s\S]{1,4}/g) || [];
    setCardNumber(parts.join(' '));

    if (raw.startsWith('5060') || raw.startsWith('5061') || raw.startsWith('5078') || raw.startsWith('6500')) {
      setCardBrand('verve');
    } else if (raw.startsWith('4')) {
      setCardBrand('visa');
    } else if (/^5[1-5]/.test(raw) || /^2[2-7]/.test(raw)) {
      setCardBrand('mastercard');
    } else {
      setCardBrand(null);
    }
  };

  const handleExpiryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/\D/g, '').slice(0, 4);
    if (raw.length >= 2) {
      setCardExpiry(`${raw.slice(0, 2)}/${raw.slice(2)}`);
    } else {
      setCardExpiry(raw);
    }
  };

  // Fulfill VIP access and trigger celebration
  const fulfillSuccess = useCallback(() => {
    try {
      const savedBilling = localStorage.getItem('kmc_billing_history_v1');
      const existing = savedBilling ? JSON.parse(savedBilling) : [];
      const newInvoice = {
        id: `inv-${Date.now().toString().slice(-6)}`,
        date: 'Just now',
        planDescription: item.title,
        amountFormatted: formattedPrice,
        status: 'PAID'
      };
      localStorage.setItem('kmc_billing_history_v1', JSON.stringify([newInvoice, ...existing]));
    } catch {}

    setIsVerifying(false);
    setShowOtpModal(false);
    setIsSuccess(true);

    try {
      confetti({
        particleCount: 90,
        spread: 80,
        origin: { y: 0.6 }
      });
    } catch {}

    if (onSuccess) {
      onSuccess();
    }
  }, [item.title, formattedPrice, onSuccess]);

  // Dynamic Virtual Account Generator
  const generateVirtualAccount = useCallback(async () => {
    setIsGeneratingAccount(true);
    setGenerationError(null);
    setTransferStatusMessage(null);

    try {
      const res = await fetch('/api/flutterwave/virtual-account', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          planTier: item.planTier,
          packId: item.packId,
          eventId: item.eventId,
          boostDuration: item.boostDuration,
          baseGBPPrice: item.baseGBPPrice,
          title: item.title,
          description: item.subtitle
        })
      });

      const data = await res.json();
      if (!res.ok || !data.success || !data.virtualAccount) {
        throw new Error(data.error || 'Failed to allocate dynamic account');
      }

      setVirtualAccount(data.virtualAccount);
      setSecondsRemaining(1800);
    } catch (err: any) {
      console.error('Virtual account generation error:', err);
      setGenerationError(err.message || 'Could not generate dynamic account number. Please check connection or retry.');
    } finally {
      setIsGeneratingAccount(false);
    }
  }, [item]);

  // Automatically generate dynamic virtual account when Bank Transfer is selected
  useEffect(() => {
    if (isOpen && paymentMode === 'LOCAL' && selectedMethod === 'banktransfer' && !virtualAccount && !isGeneratingAccount) {
      generateVirtualAccount();
    }
  }, [isOpen, paymentMode, selectedMethod, virtualAccount, isGeneratingAccount, generateVirtualAccount]);

  // Background Auto-Listener: Polls status every 5 seconds while listening
  useEffect(() => {
    if (!isOpen || isSuccess || !virtualAccount?.tx_ref) return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await fetch('/api/flutterwave/check-status', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tx_ref: virtualAccount.tx_ref,
            type: item.type,
            planTier: item.planTier,
            packId: item.packId,
            eventId: item.eventId,
            boostDuration: item.boostDuration,
            currency: 'NGN'
          })
        });

        const data = await res.json();
        if (data.success && data.status === 'successful') {
          clearInterval(pollInterval);
          fulfillSuccess();
        }
      } catch (err) {
        // Silent background polling retry
      }
    }, 5000);

    return () => clearInterval(pollInterval);
  }, [isOpen, isSuccess, virtualAccount?.tx_ref, item, fulfillSuccess]);

  // Manual check when user clicks "I Have Sent The Transfer"
  const handleBankTransferConfirm = async () => {
    if (!virtualAccount?.tx_ref) {
      if (!isGeneratingAccount) {
        generateVirtualAccount();
      }
      return;
    }

    setIsVerifying(true);
    setErrorMessage('');
    setTransferStatusMessage(null);

    try {
      const res = await fetch('/api/flutterwave/check-status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tx_ref: virtualAccount.tx_ref,
          type: item.type,
          planTier: item.planTier,
          packId: item.packId,
          eventId: item.eventId,
          boostDuration: item.boostDuration,
          currency: 'NGN'
        })
      });

      const data = await res.json();

      if (data.success && data.status === 'successful') {
        fulfillSuccess();
      } else {
        setIsVerifying(false);
        setTransferStatusMessage(
          'Transfer not yet confirmed on bank network. Interbank transfers typically clear within 30 to 90 seconds. We are actively listening and will activate automatically once received.'
        );
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'Unable to connect to verification server. Please retry in a moment.');
    }
  };

  // Central in-app fulfillment and verification for Card/Inline
  const verifyAndComplete = async (transactionId: string | number, txRef: string) => {
    setIsVerifying(true);
    setErrorMessage('');

    try {
      const verifyRes = await fetch('/api/flutterwave/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          transaction_id: transactionId,
          tx_ref: txRef,
          type: item.type,
          planTier: item.planTier,
          packId: item.packId,
          eventId: item.eventId,
          amount: convertedAmount,
          currency: selectedCurrency,
          title: item.title
        })
      });

      const verifyData = await verifyRes.json();
      if (!verifyRes.ok || !verifyData.success) {
        throw new Error(verifyData.error || 'Payment verification failed');
      }

      fulfillSuccess();
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'Payment verification unconfirmed. Please verify and retry.');
    }
  };

  const handleProceedClick = async () => {
    setIsVerifying(true);
    setErrorMessage('');

    try {
      // 1. Initialize live payment session with backend
      const initRes = await fetch('/api/flutterwave/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: item.type,
          currency: selectedCurrency,
          planTier: item.planTier,
          packId: item.packId,
          eventId: item.eventId,
          boostDuration: item.boostDuration,
          baseGBPPrice: item.baseGBPPrice,
          title: item.title,
          description: item.subtitle,
          payment_options: selectedMethod === 'banktransfer' ? 'banktransfer' : selectedMethod === 'ussd' ? 'ussd' : 'card,applepay'
        })
      });

      const initData = await initRes.json();

      if (!initRes.ok || !initData.success) {
        throw new Error(initData.error || 'Payment initialization failed. Please log in.');
      }

      // 2. If Flutterwave inline modal script is loaded, launch in-app checkout overlay
      if (typeof window !== 'undefined' && (window as any).FlutterwaveCheckout) {
        setIsVerifying(false);
        (window as any).FlutterwaveCheckout({
          public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY || 'FLWPUBK-e2911cf9a8e827352206765699f80bf0-X',
          tx_ref: initData.tx_ref,
          amount: initData.amount,
          currency: initData.currency,
          payment_options: selectedMethod === 'banktransfer' ? 'banktransfer' : selectedMethod === 'ussd' ? 'ussd' : 'card,applepay',
          customer: {
            email: 'member@kissmycheek.club',
            name: 'Verified Club Patron',
          },
          customizations: {
            title: 'Kiss My Cheek VIP',
            description: item.title,
          },
          callback: async function (paymentData: any) {
            const txId = paymentData.transaction_id || paymentData.id;
            if (txId) {
              await verifyAndComplete(txId, paymentData.tx_ref || initData.tx_ref);
            }
          },
          onclose: function () {
            setIsVerifying(false);
          }
        });
      } else if (initData.checkoutUrl) {
        window.location.href = initData.checkoutUrl;
      } else {
        throw new Error('Could not retrieve payment checkout URL.');
      }
    } catch (err: any) {
      setIsVerifying(false);
      setErrorMessage(err.message || 'Payment processing error. Please try again.');
    }
  };

  const completeTransactionInApp = handleProceedClick;

  const ussdDialCode = virtualAccount 
    ? `${selectedUssdBank.dialPrefix}${convertedAmount}*${virtualAccount.accountNumber}#`
    : `${selectedUssdBank.dialPrefix}${convertedAmount}#`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/90 backdrop-blur-md overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 15 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 15 }}
        className="relative w-full max-w-lg rounded-3xl bg-[#0B0B11] border border-[#D4AF37]/50 p-5 sm:p-7 shadow-[0_0_70px_rgba(212,175,55,0.25)] overflow-hidden my-auto"
      >
        {/* Background ambient lighting */}
        <div className="absolute top-0 right-0 w-52 h-52 bg-[#D4AF37]/10 blur-[90px] pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-52 h-52 bg-[#D4AF37]/5 blur-[80px] pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-2 rounded-full text-white/50 hover:text-white hover:bg-white/10 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* STATE 1: SUCCESS VIEW */}
        {isSuccess ? (
          <div className="py-8 text-center space-y-4">
            <div className="w-20 h-20 rounded-full bg-emerald-500/20 border-2 border-emerald-400 flex items-center justify-center text-emerald-400 mx-auto shadow-[0_0_30px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-11 h-11" />
            </div>

            <div>
              <span className="px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 inline-block mb-2">
                Transaction Verified
              </span>
              <h3 className="text-2xl sm:text-3xl font-serif font-bold text-white">Payment Confirmed!</h3>
              <p className="text-xs text-[#F5E6CA] max-w-sm mx-auto mt-2 leading-relaxed">
                Your transaction was verified successfully. Your privileges are now active on Kiss My Cheek.
              </p>
            </div>

            {/* Receipt mini pill */}
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-left max-w-sm mx-auto space-y-2 text-xs">
              <div className="flex justify-between text-white/60">
                <span>Item</span>
                <span className="text-white font-semibold">{item.title}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Amount Paid</span>
                <span className="text-amber-300 font-bold">{formattedPrice}</span>
              </div>
              <div className="flex justify-between text-white/60">
                <span>Status</span>
                <span className="text-emerald-400 font-bold flex items-center gap-1">
                  <Check className="w-3 h-3" /> Activated
                </span>
              </div>
            </div>

            <Button
              variant="gold"
              fullWidth
              size="lg"
              onClick={() => {
                onClose();
                setIsSuccess(false);
              }}
              className="mt-4 font-bold shadow-xl text-black py-3.5"
            >
              Continue to Club
            </Button>
          </div>
        ) : isVerifying ? (
          /* STATE 2: IN-APP VERIFYING SPINNER */
          <div className="py-12 text-center space-y-5">
            <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
              <div className="absolute inset-0 rounded-full border-4 border-[#D4AF37]/20 animate-ping" />
              <div className="w-16 h-16 rounded-full border-3 border-t-[#D4AF37] border-white/10 animate-spin flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#D4AF37]" />
              </div>
            </div>

            <div className="space-y-1.5">
              <h4 className="text-xl font-serif font-bold text-white">Processing Transaction...</h4>
              <p className="text-xs text-white/60 max-w-xs mx-auto">
                Verifying payment with secure interbank settlement network. Please do not close this window.
              </p>
            </div>
          </div>
        ) : showOtpModal ? (
          /* STATE 3: IN-APP 3D SECURE / OTP PROMPT */
          <div className="py-4 space-y-5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37]">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
                  Bank 3D Secure Authorization
                </span>
                <h3 className="text-lg font-serif font-bold text-white leading-tight">
                  Enter One-Time Password (OTP)
                </h3>
              </div>
            </div>

            <p className="text-xs text-white/70">
              A 6-digit verification code was sent to the phone number linked to your card ending in{' '}
              <span className="text-amber-300 font-mono font-bold">
                •••• {cardNumber.replace(/\s/g, '').slice(-4) || '8842'}
              </span>.
            </p>

            <div>
              <label className="block text-[11px] font-semibold text-white/70 mb-1.5">
                One-Time Password (OTP)
              </label>
              <input
                type="text"
                maxLength={6}
                value={otpCode}
                onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
                placeholder="123456"
                className="w-full text-center tracking-[0.4em] font-mono text-xl py-3 rounded-xl bg-black/60 border border-[#D4AF37]/40 text-white focus:outline-none focus:border-[#D4AF37] focus:ring-1 focus:ring-[#D4AF37]"
              />
            </div>

            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="md"
                className="flex-1 text-xs"
                onClick={() => setShowOtpModal(false)}
              >
                Back
              </Button>
              <Button
                variant="gold"
                size="md"
                className="flex-1 text-xs font-bold text-black"
                disabled={otpCode.length < 4}
                onClick={completeTransactionInApp}
              >
                Authorize {formattedPrice}
              </Button>
            </div>
          </div>
        ) : (
          /* STATE 4: MAIN IN-APP CHECKOUT FORM */
          <div>
            {/* Header */}
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#D4AF37]/15 border border-[#D4AF37]/40 flex items-center justify-center text-[#D4AF37] shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#D4AF37]">
                  Exclusive VIP Checkout
                </span>
                <h3 className="text-xl font-serif font-bold text-white leading-tight">
                  {item.title}
                </h3>
              </div>
            </div>

            {/* Item Summary Box */}
            <div className="p-3.5 rounded-2xl bg-white/[0.03] border border-white/10 mb-4 flex items-center justify-between">
              <div>
                <span className="text-xs text-white/60 block">{item.subtitle}</span>
                <span className="text-lg font-serif font-black text-amber-300">
                  {formattedPrice}
                </span>
              </div>
              <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-[#D4AF37]/15 text-[#D4AF37] border border-[#D4AF37]/30">
                {selectedCurrency}
              </span>
            </div>

            {/* Payment Rail Selector: Nigeria Local vs International */}
            <div className="mb-4">
              <label className="block text-xs font-semibold text-white/80 mb-2">
                Select Payment Rail:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('LOCAL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMode === 'LOCAL'
                      ? 'bg-amber-500/15 border-[#D4AF37] text-white shadow-lg ring-1 ring-[#D4AF37]'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">🇳🇬</span>
                    <span className="text-xs font-bold text-white">Nigeria (Local)</span>
                  </div>
                  <span className="text-[10px] text-white/50 block leading-tight">
                    Bank Transfer, Verve, Cards, USSD
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => handleSelectPaymentMode('INTERNATIONAL')}
                  className={`p-3 rounded-2xl border text-left transition-all ${
                    paymentMode === 'INTERNATIONAL'
                      ? 'bg-amber-500/15 border-[#D4AF37] text-white shadow-lg ring-1 ring-[#D4AF37]'
                      : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className="text-base">🌍</span>
                    <span className="text-xs font-bold text-white">International</span>
                  </div>
                  <span className="text-[10px] text-white/50 block leading-tight">
                    USD, GBP, EUR, Apple Pay
                  </span>
                </button>
              </div>
            </div>

            {/* Currency Selector (for International Mode) */}
            {paymentMode === 'INTERNATIONAL' && (
              <div className="mb-4">
                <label className="block text-xs font-semibold text-white/80 mb-1.5">
                  Select Currency:
                </label>
                <div className="flex items-center gap-2 overflow-x-auto pb-1">
                  {(['USD', 'GBP', 'EUR', 'CAD', 'AED'] as SupportedCurrency[]).map((c) => (
                    <button
                      key={c}
                      type="button"
                      onClick={() => setSelectedCurrency(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shrink-0 ${
                        selectedCurrency === c
                          ? 'bg-[#D4AF37] text-black shadow-md'
                          : 'bg-white/5 text-white/70 hover:text-white border border-white/10'
                      }`}
                    >
                      {c} ({CURRENCIES[c].symbol})
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* RAIL 1: NIGERIA LOCAL PAYMENT OPTIONS */}
            {paymentMode === 'LOCAL' ? (
              <div className="mb-4 space-y-3.5">
                {/* Method Tabs */}
                <div className="grid grid-cols-3 gap-2">
                  {/* Tab 1: Bank Transfer (Primary / Recommended) */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('banktransfer')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      selectedMethod === 'banktransfer'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Building2 className={`w-4 h-4 ${selectedMethod === 'banktransfer' ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                    <span className="text-xs font-bold leading-tight">Bank Transfer</span>
                    <span className="text-[9px] text-amber-300/90 font-semibold">Recommended</span>
                  </button>

                  {/* Tab 2: Cards & Verve */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('card')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      selectedMethod === 'card'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${selectedMethod === 'card' ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                    <span className="text-xs font-bold leading-tight">Cards & Verve</span>
                    <span className="text-[9px] text-white/40">Direct Entry</span>
                  </button>

                  {/* Tab 3: Bank USSD */}
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('ussd')}
                    className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      selectedMethod === 'ussd'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white shadow-[0_0_15px_rgba(212,175,55,0.3)] ring-1 ring-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Smartphone className={`w-4 h-4 ${selectedMethod === 'ussd' ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                    <span className="text-xs font-bold leading-tight">Bank USSD</span>
                    <span className="text-[9px] text-white/40">*737#, *966#</span>
                  </button>
                </div>

                {/* CONTENT FOR TAB 1: DYNAMIC BANK TRANSFER VIRTUAL ACCOUNT */}
                {selectedMethod === 'banktransfer' && (
                  <div className="space-y-3">
                    {isGeneratingAccount ? (
                      <div className="p-8 rounded-2xl bg-[#12121C] border border-[#D4AF37]/30 flex flex-col items-center justify-center text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#D4AF37]/10 border border-[#D4AF37]/30 flex items-center justify-center text-[#D4AF37]">
                          <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-white">Generating Dedicated Virtual Account...</p>
                          <p className="text-xs text-white/50 mt-1 max-w-xs">
                            Allocating a secure, unique bank account from Flutterwave for instant transfer verification.
                          </p>
                        </div>
                      </div>
                    ) : generationError ? (
                      <div className="p-5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-center space-y-2.5">
                        <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
                        <p className="text-xs text-rose-200 font-medium">{generationError}</p>
                        <Button
                          variant="gold"
                          size="sm"
                          onClick={generateVirtualAccount}
                          className="text-black font-bold text-xs"
                          icon={<RefreshCw className="w-3.5 h-3.5 text-black" />}
                        >
                          Retry Generation
                        </Button>
                      </div>
                    ) : virtualAccount ? (
                      <div className="p-4 rounded-2xl bg-[#12121C] border border-[#D4AF37]/40 relative overflow-hidden shadow-inner">
                        {/* Top Bar with Live Listening Indicator & Timer */}
                        <div className="flex items-center justify-between pb-3 border-b border-white/10 mb-3 text-xs">
                          <span className="text-white/80 flex items-center gap-2">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                            </span>
                            <span className="font-semibold text-emerald-400">Listening for transfer...</span>
                          </span>
                          <span className="text-[11px] font-mono font-bold text-amber-300 flex items-center gap-1">
                            <Clock className="w-3.5 h-3.5" />
                            <span>{timerString}</span>
                          </span>
                        </div>

                        {/* Dedicated Account Slip */}
                        <div className="space-y-2.5">
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-white/10">
                            <div>
                              <span className="text-[10px] text-white/50 uppercase block font-semibold">Bank Name</span>
                              <span className="text-sm font-bold text-white flex items-center gap-1.5">
                                <span>🏛️</span> {virtualAccount.bankName}
                              </span>
                            </div>
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                              Instant Credit
                            </span>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-[#D4AF37]/30">
                            <div>
                              <span className="text-[10px] text-white/50 uppercase block font-semibold">Dedicated Account Number</span>
                              <span className="text-lg font-mono font-extrabold text-amber-300 tracking-wider">
                                {virtualAccount.accountNumber}
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => copyToClipboard(virtualAccount.accountNumber, 'account')}
                              className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                                copiedField === 'account'
                                  ? 'bg-emerald-500 text-black'
                                  : 'bg-[#D4AF37] text-black hover:bg-amber-300'
                              }`}
                            >
                              {copiedField === 'account' ? (
                                <>
                                  <Check className="w-3.5 h-3.5" />
                                  <span>Copied!</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3.5 h-3.5" />
                                  <span>Copy</span>
                                </>
                              )}
                            </button>
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-black/50 border border-white/10 text-xs">
                            <div>
                              <span className="text-[10px] text-white/50 uppercase block font-semibold">Account Name / Note</span>
                              <span className="text-xs font-bold text-white">{virtualAccount.accountName}</span>
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-white/50 uppercase block font-semibold">Exact Amount</span>
                              <span className="text-sm font-bold text-amber-300">{virtualAccount.formattedAmount || formattedPrice}</span>
                            </div>
                          </div>
                        </div>

                        {/* Status update alert if transfer not yet reflected */}
                        {transferStatusMessage && (
                          <div className="mt-3 p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2">
                            <Clock className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="leading-snug">{transferStatusMessage}</p>
                          </div>
                        )}

                        {/* 3 Step Instruction Guide */}
                        <div className="mt-3 pt-2.5 border-t border-white/5 text-[11px] text-white/70 space-y-1">
                          <p className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold text-white shrink-0">1</span>
                            <span>Open your bank app (GTB, Zenith, Kuda, Access, OPay, ALAT, etc.)</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold text-white shrink-0">2</span>
                            <span>Transfer exactly <strong className="text-amber-300">{virtualAccount.formattedAmount || formattedPrice}</strong> to the account above</span>
                          </p>
                          <p className="flex items-center gap-1.5">
                            <span className="w-4 h-4 rounded-full bg-white/10 text-[9px] flex items-center justify-center font-bold text-white shrink-0">3</span>
                            <span>Status auto-detects automatically once sent, or tap below to check</span>
                          </p>
                        </div>
                      </div>
                    ) : null}
                  </div>
                )}

                {/* CONTENT FOR TAB 2: CARDS & VERVE FORM */}
                {selectedMethod === 'card' && (
                  <div className="p-4 rounded-2xl bg-[#12121C] border border-white/10 space-y-3 text-xs">
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="text-[11px] font-semibold text-white/80">Card Number</label>
                        {cardBrand && (
                          <span className="text-[10px] font-bold text-amber-300 uppercase">
                            {cardBrand === 'verve' && '🇳🇬 Verve Card'}
                            {cardBrand === 'mastercard' && 'Mastercard'}
                            {cardBrand === 'visa' && 'Visa'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="5061 0000 0000 0000"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="e.g. Chioma Adebayo"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">CVV (3 Digits)</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1">
                        4-Digit Card PIN <span className="text-white/40 text-[10px]">(Encrypted)</span>
                      </label>
                      <input
                        type="password"
                        value={cardPin}
                        onChange={(e) => setCardPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                        placeholder="••••"
                        maxLength={4}
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>
                  </div>
                )}

                {/* CONTENT FOR TAB 3: BANK USSD */}
                {selectedMethod === 'ussd' && (
                  <div className="p-4 rounded-2xl bg-[#12121C] border border-white/10 space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1.5">
                        Select Your Nigerian Bank:
                      </label>
                      <div className="grid grid-cols-4 gap-1.5">
                        {NIGERIAN_BANKS.map((b) => (
                          <button
                            key={b.name}
                            type="button"
                            onClick={() => setSelectedUssdBank(b)}
                            className={`p-2 rounded-xl text-center border transition-all ${
                              selectedUssdBank.name === b.name
                                ? 'bg-[#D4AF37] text-black font-bold border-[#D4AF37]'
                                : 'bg-black/50 border-white/10 text-white/70 hover:text-white'
                            }`}
                          >
                            <span className="text-[10px] block leading-tight">{b.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-black/60 border border-[#D4AF37]/30 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-white/50 block font-semibold">Dial String</span>
                        <span className="text-base font-mono font-bold text-amber-300">
                          {ussdDialCode}
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(ussdDialCode, 'ussd')}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 ${
                          copiedField === 'ussd' ? 'bg-emerald-500 text-black' : 'bg-[#D4AF37] text-black'
                        }`}
                      >
                        {copiedField === 'ussd' ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedField === 'ussd' ? 'Copied' : 'Copy'}</span>
                      </button>
                    </div>

                    <p className="text-[10px] text-white/60 leading-relaxed">
                      Dial this USSD code on the mobile phone linked to your bank account, enter your 4-digit bank PIN to authorize, then tap Confirm below.
                    </p>
                  </div>
                )}
              </div>
            ) : (
              /* RAIL 2: INTERNATIONAL PAYMENT OPTIONS */
              <div className="mb-4 space-y-3.5">
                {/* Method Tabs */}
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setSelectedMethod('global_card')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      selectedMethod === 'global_card'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white ring-1 ring-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <CreditCard className={`w-4 h-4 ${selectedMethod === 'global_card' ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                    <span className="text-xs font-bold">International Cards</span>
                    <span className="text-[9px] text-white/40">Visa, Mastercard, AMEX</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setSelectedMethod('applepay')}
                    className={`p-3 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all text-center ${
                      selectedMethod === 'applepay'
                        ? 'bg-[#D4AF37]/20 border-[#D4AF37] text-white ring-1 ring-[#D4AF37]'
                        : 'bg-white/[0.02] border-white/10 text-white/60 hover:text-white'
                    }`}
                  >
                    <Globe2 className={`w-4 h-4 ${selectedMethod === 'applepay' ? 'text-[#D4AF37]' : 'text-white/60'}`} />
                    <span className="text-xs font-bold">Apple Pay & Google Pay</span>
                    <span className="text-[9px] text-white/40">1-Touch Biometrics</span>
                  </button>
                </div>

                {/* Form for Global Card */}
                {selectedMethod === 'global_card' && (
                  <div className="p-4 rounded-2xl bg-[#12121C] border border-white/10 space-y-3 text-xs">
                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1">Card Number</label>
                      <input
                        type="text"
                        value={cardNumber}
                        onChange={handleCardNumberChange}
                        placeholder="4111 2222 3333 4444"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div>
                      <label className="text-[11px] font-semibold text-white/80 block mb-1">Cardholder Name</label>
                      <input
                        type="text"
                        value={cardHolder}
                        onChange={(e) => setCardHolder(e.target.value)}
                        placeholder="Name as printed on card"
                        className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">Expiry Date</label>
                        <input
                          type="text"
                          value={cardExpiry}
                          onChange={handleExpiryChange}
                          placeholder="MM/YY"
                          maxLength={5}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                      <div>
                        <label className="text-[11px] font-semibold text-white/80 block mb-1">CVC / CVV</label>
                        <input
                          type="password"
                          value={cardCvv}
                          onChange={(e) => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))}
                          placeholder="123"
                          maxLength={4}
                          className="w-full px-3.5 py-2.5 rounded-xl bg-black/60 border border-white/15 text-white font-mono placeholder:text-white/30 focus:outline-none focus:border-[#D4AF37]"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Apple Pay Sheet */}
                {selectedMethod === 'applepay' && (
                  <div className="p-5 rounded-2xl bg-[#12121C] border border-white/10 text-center space-y-3">
                    <div className="w-12 h-12 rounded-full bg-white/10 flex items-center justify-center text-white mx-auto text-xl">
                      
                    </div>
                    <div>
                      <h4 className="font-serif font-bold text-white text-base">Apple Pay Express</h4>
                      <p className="text-xs text-white/60 mt-0.5">
                        Confirm {formattedPrice} securely with Touch ID or Face ID.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}

            {errorMessage && (
              <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs mb-3 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{errorMessage}</span>
              </div>
            )}

            {/* Primary Action Button (100% In-App) */}
            <Button
              variant="gold"
              fullWidth
              size="lg"
              disabled={isLoading || isVerifying || (paymentMode === 'LOCAL' && selectedMethod === 'banktransfer' && isGeneratingAccount)}
              onClick={
                paymentMode === 'LOCAL' && selectedMethod === 'banktransfer'
                  ? handleBankTransferConfirm
                  : handleProceedClick
              }
              icon={
                isLoading || isVerifying || (paymentMode === 'LOCAL' && selectedMethod === 'banktransfer' && isGeneratingAccount) ? (
                  <Loader2 className="w-4 h-4 animate-spin text-black" />
                ) : (
                  <Lock className="w-4 h-4 text-black" />
                )
              }
              className="py-3.5 font-bold shadow-xl text-black transition-transform active:scale-[0.98]"
            >
              {paymentMode === 'LOCAL'
                ? selectedMethod === 'banktransfer'
                  ? isVerifying
                    ? 'Verifying Bank Network...'
                    : `I Have Sent The Transfer (${virtualAccount?.formattedAmount || formattedPrice})`
                  : selectedMethod === 'ussd'
                  ? `I Have Completed USSD Payment (${formattedPrice})`
                  : `Pay ${formattedPrice} Securely`
                : selectedMethod === 'applepay'
                ? `Pay with Pay (${formattedPrice})`
                : `Pay ${formattedPrice} Securely`}
            </Button>

            {/* Trust Footer Badges */}
            <div className="mt-3.5 pt-3 border-t border-white/5 flex items-center justify-center gap-2 text-[10px] text-white/50">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>256-Bit Bank-Grade SSL Encryption • Instant Verification • PCI-DSS Certified</span>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}

// Backwards-compatible export
export const InAppCheckoutModal = FlutterwaveCheckoutModal;
