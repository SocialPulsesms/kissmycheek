import { NextResponse } from 'next/server';
import { getSessionUser } from '@/lib/auth';
import {
  getOrCreateRoom,
  joinRoom,
  setRoomOffer,
  setRoomAnswer,
  addIceCandidate,
  addIceCandidates,
  getRoomPollState,
  leaveRoom,
  initiateCallInvite,
  getIncomingCallForUser,
  getCallInvite,
  acceptCallInvite,
  declineCallInvite,
  cancelCallInvite,
  endCallSession,
  addRoomEvent
} from '@/lib/callSignalingStore';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const action = searchParams.get('action');
    const roomId = searchParams.get('roomId');
    const peerId = searchParams.get('peerId');
    const userId = searchParams.get('userId');

    // 1. Check Incoming Calls for User
    if (action === 'check_incoming' || userId) {
      const session = getSessionUser(req);
      const targetUserId = userId || session?.id || session?.userId;
      const targetUserEmail = searchParams.get('email') || session?.email;
      const extraIds = (searchParams.get('ids') || '')
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);

      if (!targetUserId && !targetUserEmail && extraIds.length === 0) {
        return NextResponse.json({ success: true, incomingCall: null });
      }

      const incoming = getIncomingCallForUser(targetUserId, targetUserEmail, extraIds);
      return NextResponse.json({ success: true, incomingCall: incoming });
    }

    // 2. Check Call Invite Status
    if (action === 'get_call_status' && roomId) {
      const invite = getCallInvite(roomId);
      return NextResponse.json({ success: true, status: invite ? invite.status : 'UNKNOWN', invite });
    }

    if (!roomId) {
      return NextResponse.json({ error: 'Room ID or User ID is required' }, { status: 400 });
    }

    const state = getRoomPollState(roomId, peerId || 'anonymous', 0);
    return NextResponse.json(state);
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const {
      action,
      roomId,
      peerId,
      offer,
      answer,
      candidate,
      candidates,
      lastCandidateIndex = 0,
      duration,
      outcome,
      callerId,
      callerName,
      callerPhoto,
      calleeId,
      calleeName,
      callMode = 'video',
      userId
    } = body;

    // A. Initiate Call / Ring Member
    if (action === 'initiate_call') {
      const session = getSessionUser(req);
      const resolvedCallerId = callerId || session?.id || session?.userId || peerId;
      const resolvedCallerName = callerName || session?.name || 'Exclusive Member';

      if (!roomId || !calleeId) {
        return NextResponse.json({ error: 'Room ID and Callee ID are required' }, { status: 400 });
      }

      const invite = initiateCallInvite({
        roomId,
        callerId: resolvedCallerId,
        callerName: resolvedCallerName,
        callerPhoto: callerPhoto || '',
        calleeId,
        calleeName: calleeName || '',
        calleeEmail: body.calleeEmail || '',
        callMode
      });

      return NextResponse.json({ success: true, invite });
    }

    // B. Check Incoming Calls
    if (action === 'check_incoming') {
      const session = getSessionUser(req);
      const resolvedUserId = userId || peerId || session?.id || session?.userId;
      const resolvedEmail = body.email || session?.email;

      const extraIds = Array.isArray(body.ids) ? body.ids : String(body.ids || '').split(',');
      if (!resolvedUserId && !resolvedEmail && extraIds.filter(Boolean).length === 0) {
        return NextResponse.json({ success: true, incomingCall: null });
      }
      const incoming = getIncomingCallForUser(resolvedUserId, resolvedEmail, extraIds);
      return NextResponse.json({ success: true, incomingCall: incoming });
    }

    // C. Accept Call
    if (action === 'accept_call') {
      if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      acceptCallInvite(roomId, peerId);
      return NextResponse.json({ success: true, message: 'Call accepted' });
    }

    // D. Decline Call
    if (action === 'decline_call') {
      if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      declineCallInvite(roomId, peerId);
      return NextResponse.json({ success: true, message: 'Call declined' });
    }

    // E. Cancel Call (Caller hung up before answer)
    if (action === 'cancel_call') {
      if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      cancelCallInvite(roomId, peerId);
      return NextResponse.json({ success: true, message: 'Call cancelled' });
    }

    // E2. End an in-progress call so the other peer's poll sees ENDED
    if (action === 'end_call') {
      if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      endCallSession(roomId, 'ENDED');
      if (peerId) leaveRoom(roomId, peerId);
      return NextResponse.json({ success: true, message: 'Call ended' });
    }

    // F. Get Call Status
    if (action === 'get_call_status') {
      if (!roomId) {
        return NextResponse.json({ error: 'Room ID is required' }, { status: 400 });
      }
      const inv = getCallInvite(roomId);
      return NextResponse.json({ success: true, status: inv ? inv.status : 'UNKNOWN', invite: inv });
    }

    // 1. Join Room (With Instant Offer/Answer & Partner Name Return)
    if (action === 'join_room') {
      if (!roomId || !peerId) {
        return NextResponse.json({ error: 'Room ID and Peer ID are required' }, { status: 400 });
      }

      const result = joinRoom(
        roomId, 
        peerId, 
        body.preferredRole || body.role,
        body.userName,
        body.userPhoto
      );

      return NextResponse.json({
        success: true,
        role: result.role,
        roomId,
        peerId,
        hasPartner: Boolean(result.room.callerId && result.room.calleeId),
        offer: result.offer,
        answer: result.answer,
        partnerName: result.partnerName,
        partnerPhoto: result.partnerPhoto
      });
    }

    // 2. Send SDP Offer (Caller)
    if (action === 'send_offer' || action === 'offer') {
      const resolvedOffer = offer || body.sdp;
      if (!roomId || !peerId || !resolvedOffer) {
        return NextResponse.json({ error: 'Room ID, Peer ID and Offer are required' }, { status: 400 });
      }
      const ok = setRoomOffer(roomId, peerId, resolvedOffer);
      return NextResponse.json({ success: ok });
    }

    // 3. Send SDP Answer (Callee)
    if (action === 'send_answer' || action === 'answer') {
      const resolvedAnswer = answer || body.sdp;
      if (!roomId || !peerId || !resolvedAnswer) {
        return NextResponse.json({ error: 'Room ID, Peer ID and Answer are required' }, { status: 400 });
      }
      const ok = setRoomAnswer(roomId, peerId, resolvedAnswer);
      return NextResponse.json({ success: ok });
    }

    // 4. Send ICE Candidate(s) (Single or Batch)
    if (action === 'send_ice' || action === 'ice_candidate_batch' || action === 'ice_candidate') {
      if (!roomId || !peerId) {
        return NextResponse.json({ error: 'Room ID and Peer ID are required' }, { status: 400 });
      }
      const resolvedCandidates = candidates || body.candidate_batch;
      if (Array.isArray(resolvedCandidates) && resolvedCandidates.length > 0) {
        const ok = addIceCandidates(roomId, peerId, resolvedCandidates, body.role);
        return NextResponse.json({ success: ok });
      } else if (candidate || body.ice) {
        const ok = addIceCandidate(roomId, peerId, candidate || body.ice, body.role);
        return NextResponse.json({ success: ok });
      }
      return NextResponse.json({ success: false, error: 'No candidates provided' }, { status: 400 });
    }

    // 5. Send Real-Time Live Call Event (reaction, icebreaker, mic/camera toggle)
    if (action === 'send_event') {
      if (!roomId || !peerId || !body.type) {
        return NextResponse.json({ error: 'Room ID, Peer ID and Event Type are required' }, { status: 400 });
      }
      const ok = addRoomEvent(roomId, {
        senderPeerId: peerId,
        type: body.type,
        data: body.data
      });
      return NextResponse.json({ success: ok });
    }

    // 6. Poll Room State & Incoming Signals
    if (action === 'poll' || action === 'poll_signaling') {
      if (!roomId || !peerId) {
        return NextResponse.json({ error: 'Room ID and Peer ID are required' }, { status: 400 });
      }
      const pollData = getRoomPollState(
        roomId,
        peerId,
        Number(lastCandidateIndex) || 0,
        Number(body.lastEventTimestamp) || 0,
        body.role
      );
      return NextResponse.json(pollData);
    }

    // 6. Leave Room
    if (action === 'leave_room') {
      if (roomId && peerId) {
        leaveRoom(roomId, peerId);
      }
      return NextResponse.json({ success: true, message: 'Left call room' });
    }

    // Fallback legacy actions
    if (action === 'start') {
      const generatedRoomId = `date-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
      return NextResponse.json({ success: true, sessionId: generatedRoomId, roomId: generatedRoomId });
    }

    if (action === 'end') {
      if (roomId && peerId) {
        leaveRoom(roomId, peerId);
      }
      return NextResponse.json({ success: true, message: 'Call ended successfully' });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 });
  }
}
