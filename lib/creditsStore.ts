// Multi-Currency & Creator Royalties Store for Kiss My Cheek
// Primary Currency: Nigerian Naira (NGN - ₦), followed by US Dollar (USD - $)

export type SupportedCurrency = 'NGN' | 'USD' | 'GBP' | 'EUR' | 'CAD' | 'AED';

export interface CurrencyConfig {
  code: SupportedCurrency;
  symbol: string;
  name: string;
  rateAgainstGBP: number;
}

export const CURRENCIES: Record<SupportedCurrency, CurrencyConfig> = {
  NGN: { code: 'NGN', symbol: '₦', name: 'Nigerian Naira (₦)', rateAgainstGBP: 2000 },
  USD: { code: 'USD', symbol: '$', name: 'US Dollar ($)', rateAgainstGBP: 1.30 },
  GBP: { code: 'GBP', symbol: '£', name: 'British Pound (£)', rateAgainstGBP: 1.0 },
  EUR: { code: 'EUR', symbol: '€', name: 'Euro (€)', rateAgainstGBP: 1.17 },
  CAD: { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar (C$)', rateAgainstGBP: 1.75 },
  AED: { code: 'AED', symbol: 'AED ', name: 'UAE Dirham (AED)', rateAgainstGBP: 4.75 }
};

export const NIGERIAN_BANKS = [
  'Guaranty Trust Bank (GTBank)',
  'Access Bank',
  'Zenith Bank',
  'United Bank for Africa (UBA)',
  'First Bank of Nigeria',
  'Kuda Microfinance Bank',
  'OPay Digital Services',
  'Palmpay',
  'Stanbic IBTC Bank',
  'Fidelity Bank',
  'Sterling Bank',
  'Wema Bank / ALAT',
  'Union Bank of Nigeria',
  'First City Monument Bank (FCMB)',
  'Ecobank Nigeria',
  'Other Commercial Bank'
];

export interface CreditPack {
  id: string;
  credits: number;
  bonusCredits: number;
  title: string;
  baseGBPPrice: number;
  popular?: boolean;
  bestValue?: boolean;
}

export const CREDIT_PACKS: CreditPack[] = [
  {
    id: 'pack-starter',
    credits: 50,
    bonusCredits: 0,
    title: 'Starter Pack',
    baseGBPPrice: 1.50
  },
  {
    id: 'pack-favorite',
    credits: 200,
    bonusCredits: 25,
    title: 'Club Favorite',
    baseGBPPrice: 4.00,
    popular: true
  },
  {
    id: 'pack-reserve',
    credits: 600,
    bonusCredits: 100,
    title: 'VIP Reserve',
    baseGBPPrice: 9.50,
    bestValue: true
  }
];

export const ELITE_MONTHLY_PRICE_GBP = 2.625;

export interface BespokeGift {
  id: string;
  name: string;
  icon: string;
  credits: number;
  tagline: string;
  reactionText: string;
}

export const BESPOKE_GIFTS: BespokeGift[] = [
  {
    id: 'gift-rose',
    name: 'Scarlet Rose',
    icon: '🌹',
    credits: 5,
    tagline: 'A delicate romantic introduction',
    reactionText: 'Thank you for the beautiful rose! That is so thoughtful of you ✨'
  },
  {
    id: 'gift-flute',
    name: 'Champagne Flute',
    icon: '🥂',
    credits: 15,
    tagline: 'Raise a glass to captivating chemistry',
    reactionText: 'Cheers! 🥂 I would love to raise a real glass with you in person.'
  },
  {
    id: 'gift-perfume',
    name: 'Bespoke Perfume',
    icon: '✨',
    credits: 35,
    tagline: 'Rare Parisian essence for extraordinary grace',
    reactionText: 'What exquisite taste! You certainly know how to enchant a lady.'
  },
  {
    id: 'gift-watch',
    name: 'Royal Horology',
    icon: '💎',
    credits: 75,
    tagline: 'Swiss mechanical precision for true connoisseurs',
    reactionText: 'An unbelievable gesture! You have my undivided attention now 👑'
  },
  {
    id: 'gift-yacht',
    name: 'Monaco Mega-Yacht',
    icon: '🛥️',
    credits: 150,
    tagline: 'The ultimate pinnacle of prestige & romance',
    reactionText: 'Spectacular! The private charter is waiting. Let us set sail together! 🛥️✨'
  }
];

// Helper to convert base GBP price to selected currency formatted string
export function formatCurrencyPrice(baseGBP: number, currencyCode: SupportedCurrency = 'NGN'): string {
  const currency = CURRENCIES[currencyCode] || CURRENCIES.NGN;
  const converted = baseGBP * currency.rateAgainstGBP;

  if (currency.code === 'NGN') {
    return `${currency.symbol}${Math.round(converted).toLocaleString()}`;
  }

  return `${currency.symbol}${converted.toFixed(2)}`;
}

// Creator Payout Records & Earnings
export interface PayoutRecord {
  id: string;
  requestedAt: string;
  amountDiamonds: number;
  currency: SupportedCurrency;
  cashAmount: string;
  method: 'BANK_TRANSFER' | 'FLUTTERWAVE';
  destinationSummary: string;
  status: 'PENDING_REVIEW' | 'PROCESSING' | 'COMPLETED' | 'CANCELLED';
}

export interface BillingInvoiceRecord {
  id: string;
  date: string;
  planDescription: string;
  amountFormatted: string;
  currency: SupportedCurrency;
  status: 'PAID' | 'PROCESSING';
}

export interface CreatorEarningsWallet {
  withdrawableDiamonds: number; // Available to cash out immediately
  pendingDiamonds: number;      // In 7-day security clearance
  lifetimeEarnedDiamonds: number; // Total historic diamonds
  isVerifiedCreator: boolean;
  payoutHistory: PayoutRecord[];
}

export interface MemberWalletState {
  credits: number;
  tier: 'STANDARD' | 'ELITE';
  currency: SupportedCurrency;
  isVerified: boolean;
  billingHistory: BillingInvoiceRecord[];
}

export const MIN_CASHOUT_DIAMONDS = 250;
export const DIAMOND_TO_GBP_RATE = 0.05;

export function diamondsToCashString(diamonds: number, currencyCode: SupportedCurrency = 'NGN'): string {
  const baseGBP = diamonds * DIAMOND_TO_GBP_RATE;
  return formatCurrencyPrice(baseGBP, currencyCode);
}

// Disk persistence for wallet and earnings
interface PersistedWalletData {
  memberWallet: MemberWalletState;
  creatorEarnings: CreatorEarningsWallet;
}

function loadPersistedWallet(): PersistedWalletData | null {
  if (typeof window !== 'undefined') return null;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    const walletFile = path.join(dataDir, 'persistent_wallet_history.json');
    if (fs.existsSync(walletFile)) {
      const raw = fs.readFileSync(walletFile, 'utf-8');
      const parsed = JSON.parse(raw);
      if (parsed && parsed.memberWallet && parsed.creatorEarnings) {
        return parsed;
      }
    }
  } catch (err) {}
  return null;
}

function savePersistedWallet() {
  if (typeof window !== 'undefined') return;
  try {
    const fs = require('fs');
    const path = require('path');
    const dataDir = path.join(process.cwd(), '.data');
    const walletFile = path.join(dataDir, 'persistent_wallet_history.json');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    fs.writeFileSync(
      walletFile,
      JSON.stringify(
        {
          memberWallet: globalForCredits.memberWallet,
          creatorEarnings: globalForCredits.creatorEarnings
        },
        null,
        2
      ),
      'utf-8'
    );
  } catch (err) {}
}

// Global in-memory singleton for member wallet
const globalForCredits = globalThis as unknown as {
  memberWallet?: MemberWalletState;
  creatorEarnings?: CreatorEarningsWallet;
};

const diskWallet = loadPersistedWallet();

if (diskWallet?.memberWallet && diskWallet?.creatorEarnings) {
  globalForCredits.memberWallet = diskWallet.memberWallet;
  globalForCredits.creatorEarnings = diskWallet.creatorEarnings;
} else {
  globalForCredits.memberWallet = {
    credits: 0,
    tier: 'STANDARD',
    currency: 'NGN',
    isVerified: false,
    billingHistory: []
  };
  globalForCredits.creatorEarnings = {
    withdrawableDiamonds: 0,
    pendingDiamonds: 0,
    lifetimeEarnedDiamonds: 0,
    isVerifiedCreator: false,
    payoutHistory: []
  };
}

if (!globalForCredits.memberWallet.billingHistory) {
  globalForCredits.memberWallet.billingHistory = [];
}

export const memberWallet = globalForCredits.memberWallet!;
export const creatorEarnings = globalForCredits.creatorEarnings!;

export function getWallet(): MemberWalletState {
  return globalForCredits.memberWallet!;
}

export function getCreatorEarnings(): CreatorEarningsWallet {
  return globalForCredits.creatorEarnings!;
}

export function topUpWallet(packId: string, currency: SupportedCurrency = 'NGN'): { newBalance: number; pack: CreditPack } {
  const pack = CREDIT_PACKS.find(p => p.id === packId) || CREDIT_PACKS[0];
  const added = pack.credits + pack.bonusCredits;
  memberWallet.credits += added;
  memberWallet.currency = currency;

  // Record top-up to persistent billing history
  if (!Array.isArray(memberWallet.billingHistory)) {
    memberWallet.billingHistory = [];
  }
  memberWallet.billingHistory.unshift({
    id: `inv-${Date.now().toString().slice(-6)}`,
    date: 'Just now',
    planDescription: `${pack.title} (${pack.credits + pack.bonusCredits} Credits Top-Up)`,
    amountFormatted: formatCurrencyPrice(pack.baseGBPPrice, currency),
    currency,
    status: 'PAID'
  });

  savePersistedWallet();
  return { newBalance: memberWallet.credits, pack };
}

export function upgradeToEliteTier(currency: SupportedCurrency = 'NGN'): { success: boolean; tier: 'ELITE' } {
  memberWallet.tier = 'ELITE';
  memberWallet.currency = currency;

  if (!Array.isArray(memberWallet.billingHistory)) {
    memberWallet.billingHistory = [];
  }
  memberWallet.billingHistory.unshift({
    id: `inv-${Date.now().toString().slice(-6)}`,
    date: 'Just now',
    planDescription: 'Elite Black Card Membership (Monthly Tier Active)',
    amountFormatted: formatCurrencyPrice(ELITE_MONTHLY_PRICE_GBP, currency),
    currency,
    status: 'PAID'
  });

  savePersistedWallet();
  return { success: true, tier: 'ELITE' };
}

export function clearBillingHistory(): { success: boolean } {
  memberWallet.billingHistory = [];
  savePersistedWallet();
  return { success: true };
}

export function setMemberTier(tier: 'STANDARD' | 'ELITE'): { success: boolean; tier: 'STANDARD' | 'ELITE' } {
  memberWallet.tier = tier;
  savePersistedWallet();
  return { success: true, tier };
}

export function setMemberVerification(isVerified: boolean): { success: boolean; isVerified: boolean } {
  memberWallet.isVerified = isVerified;
  savePersistedWallet();
  return { success: true, isVerified };
}

export function toggleMemberVerification(): { success: boolean; isVerified: boolean } {
  memberWallet.isVerified = !memberWallet.isVerified;
  savePersistedWallet();
  return { success: true, isVerified: memberWallet.isVerified };
}

export function deductCredits(amount: number): boolean {
  if (memberWallet.credits >= amount) {
    memberWallet.credits -= amount;
    savePersistedWallet();
    return true;
  }
  return false;
}

export function addCredits(amount: number, reason: string = 'Admin Credit Grant'): { success: boolean; newBalance: number } {
  memberWallet.credits = (memberWallet.credits || 0) + amount;
  
  if (!Array.isArray(memberWallet.billingHistory)) {
    memberWallet.billingHistory = [];
  }
  memberWallet.billingHistory.unshift({
    id: `grant-${Date.now().toString().slice(-6)}`,
    date: 'Just now',
    planDescription: `${reason} (+${amount} Date Credits)`,
    amountFormatted: '₦0 (VIP Grant)',
    currency: memberWallet.currency || 'NGN',
    status: 'PAID'
  });

  savePersistedWallet();
  return { success: true, newBalance: memberWallet.credits };
}

// Award 60% of gift credit value to recipient as Diamonds
export function awardGiftRoyalties(giftCredits: number): { awardedDiamonds: number; totalWithdrawable: number } {
  const awardedDiamonds = Math.round(giftCredits * 0.60);
  creatorEarnings.withdrawableDiamonds += awardedDiamonds;
  creatorEarnings.lifetimeEarnedDiamonds += awardedDiamonds;
  savePersistedWallet();
  return {
    awardedDiamonds,
    totalWithdrawable: creatorEarnings.withdrawableDiamonds
  };
}

// Process a member cash-out request
export function requestCashout(
  diamonds: number,
  method: 'BANK_TRANSFER' | 'FLUTTERWAVE',
  destinationSummary: string,
  currency: SupportedCurrency = 'NGN'
): { success: boolean; error?: string; payoutRecord?: PayoutRecord } {
  if (diamonds < MIN_CASHOUT_DIAMONDS) {
    return {
      success: false,
      error: `Minimum withdrawal is ${MIN_CASHOUT_DIAMONDS} Diamonds (${diamondsToCashString(MIN_CASHOUT_DIAMONDS, currency)})`
    };
  }

  if (creatorEarnings.withdrawableDiamonds < diamonds) {
    return {
      success: false,
      error: `Insufficient withdrawable Diamonds. Available: ${creatorEarnings.withdrawableDiamonds}`
    };
  }

  // Deduct diamonds
  creatorEarnings.withdrawableDiamonds -= diamonds;

  const cashAmount = diamondsToCashString(diamonds, currency);
  const payoutRecord: PayoutRecord = {
    id: `payout-${Date.now().toString().slice(-6)}`,
    requestedAt: 'Just now',
    amountDiamonds: diamonds,
    currency,
    cashAmount,
    method,
    destinationSummary,
    status: 'PROCESSING'
  };

  if (!Array.isArray(creatorEarnings.payoutHistory)) {
    creatorEarnings.payoutHistory = [];
  }
  creatorEarnings.payoutHistory.unshift(payoutRecord);
  savePersistedWallet();
  return { success: true, payoutRecord };
}
