import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { 
  upgradeToEliteTier, 
  topUpWallet, 
  getWallet, 
  SupportedCurrency 
} from '@/lib/creditsStore';
import { toggleEventRsvpRecord } from '@/lib/eventsStore';
import { verifyFlutterwaveTransaction } from '@/lib/flutterwave';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get('status');
  const tx_ref = searchParams.get('tx_ref');
  const transaction_id = searchParams.get('transaction_id');

  const origin = new URL(req.url).origin;

  if (status === 'successful' || status === 'completed') {
    try {
      if (transaction_id) {
        await verifyAndFulfill(transaction_id, tx_ref);
      }
      return NextResponse.redirect(`${origin}/membership?payment=success&tx_ref=${tx_ref || ''}`);
    } catch (err) {
      console.warn('Fulfillment error during redirect:', err);
      return NextResponse.redirect(`${origin}/membership?payment=success`);
    }
  }

  if (status === 'cancelled') {
    return NextResponse.redirect(`${origin}/membership?payment=cancelled`);
  }

  return NextResponse.redirect(`${origin}/membership?payment=failed`);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { transaction_id, tx_ref, type, planTier, packId, eventId, amount, currency, title } = body;

    const result = await verifyAndFulfill(transaction_id, tx_ref, {
      type,
      planTier,
      packId,
      eventId,
      amount,
      currency,
      title
    });
    return NextResponse.json({
      success: true,
      message: 'Transaction verified and service provisioned successfully',
      data: result
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err.message || 'Verification failed' },
      { status: 400 }
    );
  }
}

async function verifyAndFulfill(
  transactionId: string | number, 
  txRefParam?: string | null,
  overrides?: {
    type?: string;
    planTier?: string;
    packId?: string;
    eventId?: string;
    amount?: number;
    currency?: string;
    title?: string;
  }
) {
  const verifyResult = await verifyFlutterwaveTransaction(transactionId);
  if (!verifyResult.success || !verifyResult.data) {
    throw new Error('Payment verification failed or unconfirmed');
  }

  const txData = verifyResult.data;
  const meta: Record<string, any> = { ...(txData.meta || {}), ...(overrides || {}) };
  const txRef = txData.tx_ref || txRefParam || `KMC-INAPP-${Date.now()}`;
  const currency = (overrides?.currency || txData.currency || 'NGN') as SupportedCurrency;

  // Extract payment type from meta or tx_ref
  const isMembership = meta.type === 'MEMBERSHIP' || txRef.includes('MEMBERSHIP');
  const isCredits = meta.type === 'CREDITS' || txRef.includes('CREDITS');
  const isEvent = meta.type === 'EVENT_TICKET' || txRef.includes('EVENT');
  const isBoost = meta.type === 'BOOST' || txRef.includes('BOOST');

  if (isMembership) {
    upgradeToEliteTier(currency);
    const userId = meta.userId;
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: { membershipTier: meta.planTier === 'ANNUAL' ? 'ELITE' : 'ELITE' }
        });
      } catch {}
    }
  } else if (isCredits) {
    const packId = meta.packId || 'pack-favorite';
    topUpWallet(packId, currency);
  } else if (isEvent) {
    const eventId = meta.eventId || 'event-1';
    toggleEventRsvpRecord(eventId, true);
  } else if (isBoost) {
    const duration = Number(meta.boostDuration) || 30;
    const expiresAt = new Date(Date.now() + duration * 60 * 1000);
    const multiplier = duration >= 1440 ? 50 : duration >= 60 ? 25 : 10;
    const userId = meta.userId;
    if (userId) {
      try {
        await prisma.user.update({
          where: { id: userId },
          data: {
            boostActive: true,
            boostExpiresAt: expiresAt
          }
        });
        await prisma.profileBoost.create({
          data: {
            userId,
            durationMinutes: duration,
            multiplier,
            expiresAt
          }
        });
      } catch {}
    }
  } else {
    // Default fallback to Elite upgrade
    upgradeToEliteTier(currency);
  }

  return {
    transaction: txData,
    wallet: getWallet()
  };
}
