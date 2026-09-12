import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { 
  getWallet, 
  topUpWallet, 
  upgradeToEliteTier, 
  clearBillingHistory,
  setMemberTier,
  setMemberVerification,
  toggleMemberVerification,
  deductCredits,
  getCreatorEarnings,
  awardGiftRoyalties,
  requestCashout,
  diamondsToCashString,
  MIN_CASHOUT_DIAMONDS,
  CREDIT_PACKS, 
  BESPOKE_GIFTS, 
  CURRENCIES, 
  ELITE_MONTHLY_PRICE_GBP,
  SupportedCurrency 
} from '@/lib/creditsStore';
import { postMessageToThread } from '@/lib/messageStore';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const wallet = getWallet();
    const earnings = getCreatorEarnings();
    const currentCurrency = wallet.currency || 'NGN';

    return NextResponse.json({
      success: true,
      wallet: {
        credits: wallet.credits,
        tier: wallet.tier,
        currency: wallet.currency || 'NGN',
        isVerified: wallet.isVerified ?? false,
        billingHistory: wallet.billingHistory || []
      },
      earnings: {
        withdrawableDiamonds: earnings.withdrawableDiamonds,
        pendingDiamonds: earnings.pendingDiamonds,
        lifetimeEarnedDiamonds: earnings.lifetimeEarnedDiamonds,
        isVerifiedCreator: earnings.isVerifiedCreator,
        withdrawableCash: diamondsToCashString(earnings.withdrawableDiamonds, currentCurrency),
        pendingCash: diamondsToCashString(earnings.pendingDiamonds, currentCurrency),
        lifetimeCash: diamondsToCashString(earnings.lifetimeEarnedDiamonds, currentCurrency),
        minCashoutDiamonds: MIN_CASHOUT_DIAMONDS,
        minCashoutCash: diamondsToCashString(MIN_CASHOUT_DIAMONDS, currentCurrency),
        payoutHistory: earnings.payoutHistory
      },
      packs: CREDIT_PACKS,
      gifts: BESPOKE_GIFTS,
      currencies: Object.values(CURRENCIES),
      eliteMonthlyPriceGBP: ELITE_MONTHLY_PRICE_GBP
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch wallet info' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const body = await req.json();
    const { 
      action, 
      packId, 
      currency, 
      giftId, 
      threadId,
      diamonds,
      payoutMethod,
      destinationSummary
    } = body;
    const wallet = getWallet();
    const earnings = getCreatorEarnings();
    const selectedCurrency = (currency as SupportedCurrency) || wallet.currency || 'NGN';

    // 1. TOP UP CREDITS
    if (action === 'top_up') {
      const result = topUpWallet(packId, selectedCurrency);

      return NextResponse.json({
        success: true,
        message: `Successfully topped up ${result.pack.credits + result.pack.bonusCredits} Club Credits!`,
        wallet: {
          credits: result.newBalance,
          tier: wallet.tier,
          currency: wallet.currency
        }
      });
    }

    // 2. UPGRADE TO ELITE TIER
    if (action === 'upgrade_elite') {
      upgradeToEliteTier(selectedCurrency);

      return NextResponse.json({
        success: true,
        message: 'Welcome to Elite Membership! 1080p and 4K Ultra video dates unlocked.',
        wallet: {
          credits: wallet.credits,
          tier: 'ELITE',
          currency: wallet.currency
        }
      });
    }

    // 2a. CLEAR BILLING HISTORY (FLUSH TEST INVOICES)
    if (action === 'clear_billing_history') {
      clearBillingHistory();
      return NextResponse.json({
        success: true,
        message: 'Billing and invoice history cleared.',
        wallet: {
          credits: wallet.credits,
          tier: wallet.tier,
          currency: wallet.currency,
          billingHistory: []
        }
      });
    }

    // 2b. TOGGLE/SET TIER (For testing & member management)
    if (action === 'toggle_tier') {
      const newTier = wallet.tier === 'ELITE' ? 'STANDARD' : 'ELITE';
      setMemberTier(newTier);
      return NextResponse.json({
        success: true,
        message: `Membership tier switched to ${newTier}`,
        wallet: {
          credits: wallet.credits,
          tier: newTier,
          currency: wallet.currency
        }
      });
    }

    if (action === 'set_tier') {
      const targetTier = body.tier === 'ELITE' ? 'ELITE' : 'STANDARD';
      setMemberTier(targetTier);
      return NextResponse.json({
        success: true,
        message: `Membership tier set to ${targetTier}`,
        wallet: {
          credits: wallet.credits,
          tier: targetTier,
          currency: wallet.currency,
          isVerified: wallet.isVerified ?? true
        }
      });
    }

    // 2c. TOGGLE/SET PROFILE VERIFICATION (For safety, directory gating & chat gating)
    if (action === 'toggle_verification') {
      const updated = toggleMemberVerification();
      return NextResponse.json({
        success: true,
        message: `Profile verification switched to ${updated.isVerified ? 'Verified ✓' : 'Unverified 🔒'}`,
        wallet: {
          credits: wallet.credits,
          tier: wallet.tier,
          currency: wallet.currency,
          isVerified: updated.isVerified
        }
      });
    }

    if (action === 'set_verification') {
      const targetVerified = Boolean(body.isVerified);
      const updated = setMemberVerification(targetVerified);
      return NextResponse.json({
        success: true,
        message: `Profile verification set to ${updated.isVerified ? 'Verified ✓' : 'Unverified 🔒'}`,
        wallet: {
          credits: wallet.credits,
          tier: wallet.tier,
          currency: wallet.currency,
          isVerified: updated.isVerified
        }
      });
    }

    // 3. SEND BESPOKE GIFT (During video date or messaging)
    if (action === 'send_gift') {
      const gift = BESPOKE_GIFTS.find(g => g.id === giftId);
      if (!gift) {
        return NextResponse.json({ error: 'Gift not found' }, { status: 404 });
      }

      if (wallet.credits < gift.credits) {
        return NextResponse.json({ 
          error: `Insufficient Club Credits. Need ${gift.credits} credits, you have ${wallet.credits}.`,
          insufficientCredits: true 
        }, { status: 400 });
      }

      // Deduct sender credits
      deductCredits(gift.credits);

      // Award 60% creator royalty to recipient wallet as Diamonds!
      const royalty = awardGiftRoyalties(gift.credits);

      // If threadId provided, post gift dispatch into the chat history
      let partnerReply = gift.reactionText;
      if (threadId) {
        try {
          const giftDispatch = `Sent a Bespoke Gift: ${gift.icon} ${gift.name} (${gift.tagline})`;
          postMessageToThread(threadId, giftDispatch);
        } catch (e) {
          // Fallback if threadId is arbitrary
        }
      }

      return NextResponse.json({
        success: true,
        message: `Dispatched ${gift.name} successfully! Recipient awarded ${royalty.awardedDiamonds} Diamonds.`,
        gift,
        partnerReply,
        royaltyAwarded: royalty.awardedDiamonds,
        remainingCredits: wallet.credits
      });
    }

    // 4. DEDUCT STREAM TIME (Free unlimited during testing phase)
    if (action === 'deduct_stream') {
      return NextResponse.json({
        success: true,
        unlimited: true,
        remainingCredits: wallet.credits
      });
    }

    // 5. REQUEST CASH-OUT (Creator Payout)
    if (action === 'request_payout') {
      const diamondCount = Number(diamonds) || 0;
      const method = payoutMethod || 'BANK_TRANSFER';
      const destination = destinationSummary || 'Direct Bank Account';

      const result = requestCashout(diamondCount, method, destination, selectedCurrency);

      if (!result.success) {
        return NextResponse.json({ error: result.error }, { status: 400 });
      }

      return NextResponse.json({
        success: true,
        message: `Cash-out request for ${result.payoutRecord?.cashAmount} submitted successfully! Expected delivery in 2-3 business days.`,
        payoutRecord: result.payoutRecord,
        remainingDiamonds: earnings.withdrawableDiamonds
      });
    }

    // 6. TOGGLE VERIFIED CREATOR STATUS
    if (action === 'toggle_verify') {
      earnings.isVerifiedCreator = !earnings.isVerifiedCreator;
      return NextResponse.json({
        success: true,
        isVerifiedCreator: earnings.isVerifiedCreator
      });
    }

    // 7. RESET EARNINGS (FOR DEMO/TESTING)
    if (action === 'reset_earnings') {
      earnings.withdrawableDiamonds = 680;
      return NextResponse.json({
        success: true,
        withdrawableDiamonds: earnings.withdrawableDiamonds
      });
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
