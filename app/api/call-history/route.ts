import { NextResponse } from 'next/server';
import { getPersistentCallHistory, addCallRecord, getCallHistoryBetweenUsers, getCallHistoryForUser } from '@/lib/callHistoryStore';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(req: Request) {
  try {
    const session = getSessionUser(req);
    const { searchParams } = new URL(req.url);
    const withUser = searchParams.get('withUser') || searchParams.get('partnerId');
    const user1Id = searchParams.get('user1Id') || session?.userId || 'user-me';
    const user2Id = searchParams.get('user2Id') || withUser;

    if (withUser) {
      const history = getCallHistoryBetweenUsers(user1Id, withUser);
      return NextResponse.json({
        success: true,
        callHistory: history,
        totalCalls: history.length
      });
    }

    if (user1Id && user2Id) {
      const history = getCallHistoryBetweenUsers(user1Id, user2Id);
      return NextResponse.json({
        success: true,
        callHistory: history,
        totalCalls: history.length
      });
    }

    const currentUserId = session?.userId;
    const history = currentUserId ? getCallHistoryForUser(currentUserId) : getPersistentCallHistory();
    return NextResponse.json({
      success: true,
      callHistory: history,
      totalCalls: history.length
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to fetch call history' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const session = getSessionUser(req);
    const body = await req.json();
    const { 
      callerId, 
      receiverId, 
      partnerId, 
      partnerName, 
      partnerPhoto, 
      partnerOccupation, 
      callType, 
      durationSeconds, 
      durationFormatted, 
      timestamp, 
      status, 
      qualityPreset 
    } = body;

    const resolvedCallerId = callerId || session?.userId || 'user-me';
    const resolvedReceiverId = receiverId || partnerId || 'partner';
    const resolvedPartnerId = partnerId || resolvedReceiverId;

    const record = addCallRecord({
      callerId: resolvedCallerId,
      receiverId: resolvedReceiverId,
      partnerId: resolvedPartnerId,
      partnerName: partnerName || 'Private Encounter',
      partnerPhoto: partnerPhoto || '',
      partnerOccupation: partnerOccupation || 'VIP Member',
      callType: callType || 'video',
      durationSeconds: Number(durationSeconds) || 60,
      durationFormatted: durationFormatted || '1m 00s',
      timestamp: timestamp || 'Just now',
      status: status || 'completed',
      qualityPreset: qualityPreset || '1080p',
      createdAt: new Date().toISOString()
    });

    // Optionally sync to Prisma CallHistory table if available
    try {
      if (prisma?.callHistory) {
        await prisma.callHistory.create({
          data: {
            callerId: resolvedCallerId,
            receiverId: resolvedReceiverId,
            duration: Number(durationSeconds) || 0,
            outcome: (status || 'COMPLETED').toUpperCase()
          }
        });
      }
    } catch {}

    return NextResponse.json({
      success: true,
      record
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to add call record' }, { status: 500 });
  }
}

