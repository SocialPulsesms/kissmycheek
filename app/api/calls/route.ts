import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { getAllStoredUsers } from '@/lib/usersStore';
import { getCanonicalRoomName } from '@/lib/callRoomId';
import {
  createCallInvite,
  getCallInvite,
  getIncomingCallForUser,
  isCallParticipant,
  isCallee,
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

async function resolveMemberIds(idOrEmail: string | undefined, extra: string[] = []): Promise<string[]> {
  const ids = new Set<string>();
  const seed = [idOrEmail, ...extra].map((v) => String(v || '').trim()).filter(Boolean);
  seed.forEach((id) => ids.add(id));

  const stored = getAllStoredUsers();
  seed.forEach((token) => {
    stored.forEach((user) => {
      if (
        user.id === token ||
        user.email?.toLowerCase() === token.toLowerCase() ||
        user.profile?.fullName?.toLowerCase() === token.toLowerCase()
      ) {
        ids.add(user.id);
        if (user.email) ids.add(user.email);
      }
    });
  });

  try {
    const or = seed.flatMap((token) => {
      const clause: object[] = [{ id: token }];
      if (token.includes('@')) {
        clause.push({ email: { equals: token, mode: 'insensitive' } });
      }
      return clause;
    });
    if (or.length > 0) {
      const rows = await prisma.user.findMany({
        where: { OR: or },
        select: { id: true, email: true }
      });
      rows.forEach((row) => {
        ids.add(row.id);
        if (row.email) ids.add(row.email);
      });
    }
  } catch {}

  return Array.from(ids);
}

async function sessionIds(req: Request, session: Record<string, any>): Promise<string[]> {
  const { searchParams } = new URL(req.url);
  const extra = (searchParams.get('ids') || '')
    .split(',')
    .map((v) => v.trim())
    .filter(Boolean);
  return resolveMemberIds(session.userId, [session.email, ...extra]);
}

export async function GET(req: Request) {
  const session = getSessionUser(req);
  if (!session?.userId) return unauthorized();

  const { searchParams } = new URL(req.url);
  const action = searchParams.get('action') || 'incoming';
  const roomName = searchParams.get('roomName') || '';
  const aliases = await sessionIds(req, session);

  if (action === 'incoming') {
    return NextResponse.json({
      success: true,
      incomingCall: getIncomingCallForUser(session.userId, aliases)
    });
  }

  if (action === 'status' && roomName) {
    const invite = getCallInvite(roomName);
    if (!invite || !isCallParticipant(invite, session.userId, aliases)) {
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
  const aliases = await resolveMemberIds(userId, [session.email]);

  if (action === 'invite') {
    const calleeId = String(body.calleeId || '').trim();
    if (!calleeId || aliases.some((id) => id.toLowerCase() === calleeId.toLowerCase())) {
      return NextResponse.json({ error: 'A valid call partner is required' }, { status: 400 });
    }

    const calleeIds = await resolveMemberIds(calleeId, [body.calleeEmail, body.calleeName]);
    const roomName = getCanonicalRoomName(userId, calleeIds[0] || calleeId);
    const invite = createCallInvite({
      roomName,
      callerId: userId,
      calleeId: calleeIds[0] || calleeId,
      callerIds: aliases,
      calleeIds,
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
    if (!invite || !isCallParticipant(invite, userId, aliases)) {
      return NextResponse.json({ error: 'Call not found' }, { status: 404 });
    }

    if (action === 'accept' && !isCallee(invite, userId, aliases)) {
      return NextResponse.json({ error: 'Only the callee can accept' }, { status: 403 });
    }

    const nextStatus =
      action === 'accept' ? 'accepted' :
      action === 'decline' ? 'declined' :
      action === 'cancel' ? 'cancelled' : 'ended';

    const updated = updateCallInvite(roomName, nextStatus, userId, aliases);
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
    if (!invite || !isCallParticipant(invite, userId, aliases)) {
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
