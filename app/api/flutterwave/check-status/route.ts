import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { 
  upgradeToEliteTier, 
  topUpWallet, 
  getWallet, 
  SupportedCurrency 
} from '@/lib/creditsStore';
import { toggleEventRsvpRecord } from '@/lib/eventsStore';
import { verifyFlutterwaveByReference } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId;

    const body = await req.json();
    const { 
      tx_ref, 
      type = 'MEMBERSHIP', 
      planTier = 'MONTHLY', 
      packId, 
      eventId, 
      boostDuration,
      currency = 'NGN' 
    } = body;

    if (!tx_ref) {
      return NextResponse.json(
        { success: false, status: 'error', error: 'Missing tx_ref reference' },
        { status: 400 }
      );
    }

    // Check with Flutterwave API
    const verifyCheck = await verifyFlutterwaveByReference(tx_ref);

    if (verifyCheck.success && verifyCheck.data?.status === 'successful') {
      const txData = verifyCheck.data;
      const selectedCurrency = (currency || txData.currency || 'NGN') as SupportedCurrency;

      // Extract transaction type
      const isMembership = type === 'MEMBERSHIP' || tx_ref.includes('MEMBERSHIP');
      const isCredits = type === 'CREDITS' || tx_ref.includes('CREDITS');
      const isEvent = type === 'EVENT_TICKET' || tx_ref.includes('EVENT');
      const isBoost = type === 'BOOST' || tx_ref.includes('BOOST');

      if (isMembership) {
        upgradeToEliteTier(selectedCurrency);
        if (userId) {
          try {
            await prisma.user.update({
              where: { id: userId },
              data: { membershipTier: 'ELITE' }
            });
          } catch (dbErr) {
            console.warn('Could not update user membership in DB:', dbErr);
          }
        }
      } else if (isCredits) {
        const targetPackId = packId || 'pack-favorite';
        topUpWallet(targetPackId, selectedCurrency);
      } else if (isEvent) {
        const targetEventId = eventId || 'event-1';
        toggleEventRsvpRecord(targetEventId, true);
      } else if (isBoost) {
        const duration = Number(boostDuration) || 30;
        const expiresAt = new Date(Date.now() + duration * 60 * 1000);
        const multiplier = duration >= 1440 ? 50 : duration >= 60 ? 25 : 10;
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
          } catch (boostErr) {
            console.warn('Could not activate boost in DB:', boostErr);
          }
        }
      } else {
        upgradeToEliteTier(selectedCurrency);
      }

      return NextResponse.json({
        success: true,
        status: 'successful',
        message: 'Payment received and fulfilled successfully!',
        data: {
          transactionId: txData.id,
          tx_ref: txData.tx_ref,
          amount: txData.amount,
          currency: txData.currency,
          wallet: getWallet()
        }
      });
    }

    if (verifyCheck.pending) {
      return NextResponse.json({
        success: false,
        status: 'pending',
        message: 'Transfer is pending network clearance'
      });
    }

    return NextResponse.json({
      success: false,
      status: 'unconfirmed',
      error: verifyCheck.error || 'Payment not yet confirmed'
    });

  } catch (err: any) {
    console.error('Check status error:', err);
    return NextResponse.json(
      { success: false, status: 'error', error: err.message || 'Error verifying status' },
      { status: 500 }
    );
  }
}
