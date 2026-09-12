import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { upgradeToEliteTier, topUpWallet, SupportedCurrency } from '@/lib/creditsStore';
import { toggleEventRsvpRecord } from '@/lib/eventsStore';
import { verifyFlutterwaveWebhookSignature, verifyFlutterwaveTransaction } from '@/lib/flutterwave';

export async function POST(req: Request) {
  try {
    const signature = req.headers.get('verif-hash');

    // Verify webhook authenticity
    if (!verifyFlutterwaveWebhookSignature(signature)) {
      console.warn('Unauthorized Flutterwave webhook attempt - signature mismatch');
      return NextResponse.json({ error: 'Unauthorized signature' }, { status: 401 });
    }

    const payload = await req.json();
    const event = payload.event;
    const data = payload.data;

    if (event === 'charge.completed' && data && data.status === 'successful') {
      const transactionId = data.id;
      const verifyCheck = await verifyFlutterwaveTransaction(transactionId);

      if (verifyCheck.success && verifyCheck.data?.status === 'successful') {
        const tx = verifyCheck.data;
        const meta = tx.meta || {};
        const txRef = tx.tx_ref || '';
        const currency = (tx.currency as SupportedCurrency) || 'NGN';

        if (meta.type === 'MEMBERSHIP' || txRef.includes('MEMBERSHIP')) {
          upgradeToEliteTier(currency);
          if (meta.userId) {
            try {
              await prisma.user.update({
                where: { id: meta.userId },
                data: { membershipTier: 'ELITE' }
              });
            } catch {}
          }
          console.log(`[Flutterwave Webhook] Membership upgraded for user: ${meta.userId}`);
        } else if (meta.type === 'CREDITS' || txRef.includes('CREDITS')) {
          const packId = meta.packId || 'pack-favorite';
          topUpWallet(packId, currency);
          console.log(`[Flutterwave Webhook] Credits topped up for user: ${meta.userId}`);
        } else if (meta.type === 'EVENT_TICKET' || txRef.includes('EVENT')) {
          const eventId = meta.eventId || 'event-1';
          toggleEventRsvpRecord(eventId, true);
          console.log(`[Flutterwave Webhook] Event ticket booked for event: ${eventId}`);
        } else if (meta.type === 'BOOST' || txRef.includes('BOOST')) {
          const duration = Number(meta.boostDuration) || 30;
          const expiresAt = new Date(Date.now() + duration * 60 * 1000);
          const multiplier = duration >= 1440 ? 50 : duration >= 60 ? 25 : 10;
          if (meta.userId) {
            try {
              await prisma.user.update({
                where: { id: meta.userId },
                data: { boostActive: true, boostExpiresAt: expiresAt }
              });
              await prisma.profileBoost.create({
                data: {
                  userId: meta.userId,
                  durationMinutes: duration,
                  multiplier,
                  expiresAt
                }
              });
            } catch {}
          }
          console.log(`[Flutterwave Webhook] Profile boost activated for user: ${meta.userId}`);
        }
      }
    }

    return NextResponse.json({ status: 'success', received: true });
  } catch (err: any) {
    console.error('Flutterwave webhook handling error:', err);
    return NextResponse.json({ error: err.message || 'Webhook processing failed' }, { status: 500 });
  }
}
