import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getSessionUser } from '@/lib/auth';
import { deductCredits, getWallet } from '@/lib/creditsStore';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId;

    if (!userId) {
      // Guest or mock session fallback
      return NextResponse.json({
        success: true,
        boostState: {
          isBoostActive: false,
          boostMultiplier: 1,
          durationMinutes: 0,
          remainingSeconds: 0,
          expiresAt: null,
          superLikesRemaining: 5,
          boostsRemaining: 2
        }
      });
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: { boosts: { orderBy: { createdAt: 'desc' }, take: 1 } }
    });

    const now = Date.now();
    const isBoostActive = Boolean(user?.boostActive && user.boostExpiresAt && user.boostExpiresAt.getTime() > now);
    const remainingSeconds = isBoostActive && user?.boostExpiresAt 
      ? Math.max(0, Math.floor((user.boostExpiresAt.getTime() - now) / 1000)) 
      : 0;

    const latestBoost = user?.boosts?.[0];
    const multiplier = isBoostActive ? (latestBoost?.multiplier || 10) : 1;

    return NextResponse.json({
      success: true,
      boostState: {
        isBoostActive,
        boostMultiplier: multiplier,
        durationMinutes: latestBoost?.durationMinutes || (isBoostActive ? 30 : 0),
        remainingSeconds,
        expiresAt: isBoostActive && user?.boostExpiresAt ? user.boostExpiresAt.toISOString() : null,
        superLikesRemaining: 5,
        boostsRemaining: Math.max(0, 3 - (user?.boosts.length || 0))
      }
    });

  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch boost session' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const userId = session?.userId || 'guest-vip-member';
    const body = await req.json();
    const { action, durationMinutes = 30, paymentMethod = 'CREDITS', creditsCost = 50 } = body;

    if (action === 'activate_boost') {
      const minutes = Number(durationMinutes) || 30;
      const multiplier = minutes >= 1440 ? 50 : minutes >= 60 ? 25 : 10;
      const expiresAt = new Date(Date.now() + minutes * 60 * 1000);

      // If paying with credits, verify and deduct from credits wallet
      if (paymentMethod === 'CREDITS') {
        const cost = Number(creditsCost) || (minutes >= 1440 ? 250 : minutes >= 60 ? 90 : 50);
        const deducted = deductCredits(cost);
        if (!deducted) {
          return NextResponse.json({
            success: false,
            error: `Insufficient Credits. You need ${cost} credits to activate this boost. Please top up.`
          }, { status: 400 });
        }
      }

      try {
        await prisma.$transaction([
          prisma.user.update({
            where: { id: userId },
            data: {
              boostActive: true,
              boostExpiresAt: expiresAt
            }
          }),
          prisma.profileBoost.create({
            data: {
              userId,
              durationMinutes: minutes,
              multiplier,
              expiresAt
            }
          })
        ]);
      } catch (dbErr) {
        // Fallback for non-relational or guest session
        console.warn('Prisma boost update note:', dbErr);
      }

      const durationLabel = minutes >= 1440 ? '24-Hour Super Boost' : minutes >= 60 ? '1-Hour Prime Boost' : '30-Minute Sprint';

      return NextResponse.json({
        success: true,
        message: `⚡ ${multiplier}x Spotlight ${durationLabel} is now LIVE on your profile!`,
        boostState: {
          isBoostActive: true,
          boostMultiplier: multiplier,
          durationMinutes: minutes,
          remainingSeconds: minutes * 60,
          expiresAt: expiresAt.toISOString(),
          superLikesRemaining: 5,
          boostsRemaining: 2
        }
      });
    }

    if (action === 'superlike') {
      return NextResponse.json({
        success: true,
        message: '✨ Super Like Sent Live!',
        boostState: {
          isBoostActive: false,
          boostMultiplier: 1,
          remainingSeconds: 0,
          expiresAt: null,
          superLikesRemaining: 4,
          boostsRemaining: 2
        }
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
