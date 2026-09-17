import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { getCanonicalRoomName } from '@/lib/callRoomId';
import {
  createCallInvite,
  getCallInvite,
  getIncomingCallForUser,
  isCallParticipant,
  updateCallInvite
} from '@/lib/callInviteStore';
import { createLiveKitJoinToken, getLiveKitConfig } from '@/lib/livekitConfig';

function unauthorized() {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
}

function livekitMissing() {
  return NextResponse.json(
    {
      error: 'Video calling is not configured on this server. Run LiveKit locally or set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, and NEXT_PUBLIC_LIVEKIT_URL.'
    },
    { status: 503 }
  );
}

export async function GET(req: Request) {
  const session = getSessionUser(req);
  if (!session?.userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'incoming';
  const roomName = searchParams.get('roomName') || '';

  if (action === 'incoming') {
    return NextResponse.json({
      success: true,
      incomingCall: getIncomingCallForUser(session.userId)
    });
  }

  if (action === 'status' && roomName) {
    const invite = getCallInvite(roomName);
    if (!invite || !isCallParticipant(invite, session.userId)) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    return NextResponse.json({ success: true, invite });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}

export async function POST(req: Request) {
  const session = getSessionUser(req);
  if (!session?.userId) return unauthorized();
  if (!getLiveKitConfig()) return livekitMissing();

  const body = await req.json().catch(() => ({}));
  const action = String(body.action || '');
  const userId = session.userId as string;
  const userName = session.fullName || session.name || 'Club Member';

  if (action === 'invite') {
    const calleeId = String(body.calleeId || '').trim();
    if (!calleeId || calleeId === userId) {
      return NextResponse.json({ error: 'A valid call partner is required' }, { status: 400 });
    }

    const roomName = getCanonicalRoomName(userId, calleeId);
    const invite = createCallInvite({
      roomName,
      callerId: userId,
      calleeId,
      callerName: userName,
      callerPhoto: body.callerPhoto,
      calleeName: body.calleeName,
      calleePhoto: body.calleePhoto,
      mode: body.mode === 'voice' ? 'voice' : 'video'
    });

    const join = await createLiveKitJoinToken({
      identity: userId,
      name: userName,
      roomName
    });

    return NextResponse.json({ success: true, invite, ...join });
  }

  if (action === 'accept' || action === 'decline' || action === 'cancel' || action === 'end') {
    const roomName = String(body.roomName || '').trim();
    const invite = getCallInvite(roomName);
    if (!invite || !isCallParticipant(invite, userId)) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    const nextStatus =
      action === 'accept' ? 'accepted' :
      action === 'decline' ? 'declined' :
      action === 'cancel' ? 'cancelled' : 'ended';

    if (action === 'accept' && userId !== invite.calleeId) {
      return NextResponse.json({ error: 'Only the callee can accept' }, { status: 403 });
    }

    const updated = updateCallInvite(roomName, nextStatus, userId);
    if (action !== 'accept') {
      return NextResponse.json({ success: true, invite: updated });
    }

    const join = await createLiveKitJoinToken({
      identity: userId,
      name: userName,
      roomName
    });
    return NextResponse.json({ success: true, invite: updated, ...join });
  }

  if (action === 'token') {
    const roomName = String(body.roomName || '').trim();
    const invite = getCallInvite(roomName);
    if (!invite || !isCallParticipant(invite, userId)) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }
    const join = await createLiveKitJoinToken({
      identity: userId,
      name: userName,
      roomName
    });
    return NextResponse.json({ success: true, invite, ...join });
  }

  return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
}
