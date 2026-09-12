import { GET, POST } from '@/app/api/call/route';
import { signJWT } from '@/lib/auth';
import { initiateCallInvite, joinRoom, setRoomOffer } from '@/lib/callSignalingStore';

function sessionCookie(overrides: Record<string, unknown> = {}) {
  const token = signJWT({
    userId: 'user-alice',
    email: 'alice@kissmycheek.org',
    role: 'MEMBER',
    fullName: 'Alice',
    ...overrides
  });
  return `session-token=${encodeURIComponent(token)}`;
}

function jsonRequest(url: string, body: unknown, method = 'POST') {
  return new Request(url, {
    method,
    headers: {
      'content-type': 'application/json',
      cookie: sessionCookie()
    },
    body: method === 'GET' ? undefined : JSON.stringify(body)
  });
}

async function read(res: Response) {
  return res.json();
}

describe('POST /api/call', () => {
  it('rejects initiate_call without a callee', async () => {
    const res = await POST(jsonRequest('http://localhost/api/call', { action: 'initiate_call', roomId: 'r1' }));
    expect(res.status).toBe(400);
    expect(await read(res)).toEqual({ error: 'Room ID and Callee ID are required' });
  });

  it('initiates, joins with role, offers, and lets the callee poll the SDP', async () => {
    const init = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'call_alice__bob',
        callerId: 'user-alice',
        callerName: 'Alice',
        calleeId: 'user-bob',
        calleeEmail: 'bob@kissmycheek.org',
        callMode: 'video'
      })
    );
    const initBody = await read(init);
    expect(init.status).toBe(200);
    expect(initBody.invite.status).toBe('RINGING');

    const join = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'call_alice__bob',
        peerId: 'peer-alice',
        role: 'caller',
        userName: 'Alice'
      })
    );
    expect((await read(join)).role).toBe('caller');

    const offer = { type: 'offer', sdp: 'v=0-offer' };
    const offerRes = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'offer',
        roomId: 'call_alice__bob',
        peerId: 'peer-alice',
        offer
      })
    );
    expect((await read(offerRes)).success).toBe(true);

    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'call_alice__bob',
        peerId: 'peer-bob',
        preferredRole: 'callee'
      })
    );

    const poll = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'poll_signaling',
        roomId: 'call_alice__bob',
        peerId: 'peer-bob',
        role: 'callee',
        lastCandidateIndex: 0
      })
    );
    const pollBody = await read(poll);
    expect(pollBody.offer).toEqual(offer);
    expect(pollBody.inviteStatus).toBe('RINGING');
  });

  it('routes a batch of ICE candidates to the other peer', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'ice-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'ice-room',
        peerId: 'peer-alice',
        role: 'caller'
      })
    );
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'ice-room',
        peerId: 'peer-bob',
        role: 'callee'
      })
    );

    const ice = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'ice_candidate_batch',
        roomId: 'ice-room',
        peerId: 'peer-alice',
        role: 'caller',
        candidates: [{ candidate: 'candidate:9', sdpMid: '0' }]
      })
    );
    expect((await read(ice)).success).toBe(true);

    const poll = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'poll_signaling',
        roomId: 'ice-room',
        peerId: 'peer-bob',
        role: 'callee',
        lastCandidateIndex: 0
      })
    );
    expect((await read(poll)).candidates).toEqual([{ candidate: 'candidate:9', sdpMid: '0' }]);
  });

  it('rejects an ICE post with no candidates', async () => {
    const res = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'ice_candidate_batch',
        roomId: 'ice-room',
        peerId: 'peer-alice'
      })
    );
    expect(res.status).toBe(400);
  });

  it('forwards live call events on poll', async () => {
    initiateCallInvite({
      roomId: 'evt-room',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      callMode: 'video'
    });
    joinRoom('evt-room', 'peer-alice', 'caller');
    joinRoom('evt-room', 'peer-bob', 'callee');

    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'send_event',
        roomId: 'evt-room',
        peerId: 'peer-alice',
        type: 'reaction',
        data: { emoji: '🔥' }
      })
    );

    const poll = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'poll_signaling',
        roomId: 'evt-room',
        peerId: 'peer-bob',
        role: 'callee',
        lastEventTimestamp: 0
      })
    );
    expect((await read(poll)).events[0].data.emoji).toBe('🔥');
  });

  it('surfaces decline, cancel, and end on the other phone', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'end-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'end-room',
        peerId: 'peer-alice',
        role: 'caller'
      })
    );

    const declined = await POST(
      jsonRequest('http://localhost/api/call', { action: 'decline_call', roomId: 'end-room' })
    );
    expect((await read(declined)).success).toBe(true);

    const poll = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'poll_signaling',
        roomId: 'end-room',
        peerId: 'peer-alice',
        role: 'caller'
      })
    );
    const body = await read(poll);
    expect(body.inviteStatus).toBe('DECLINED');
    expect(body.roomStatus).toBe('cancelled');
  });

  it('cancels and ends through dedicated actions', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'cancel-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );

    const cancel = await POST(
      jsonRequest('http://localhost/api/call', { action: 'cancel_call', roomId: 'cancel-room' })
    );
    expect((await read(cancel)).message).toBe('Call cancelled');
    expect((await read(await POST(jsonRequest('http://localhost/api/call', { action: 'get_call_status', roomId: 'cancel-room' })))).status).toBe(
      'CANCELLED'
    );

    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'hangup-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'hangup-room',
        peerId: 'peer-alice',
        role: 'caller'
      })
    );
    const ended = await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'end_call',
        roomId: 'hangup-room',
        peerId: 'peer-alice'
      })
    );
    expect((await read(ended)).message).toBe('Call ended');
  });

  it('accepts a call and leaves a room without marking it ended', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'leave-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'join_room',
        roomId: 'leave-room',
        peerId: 'peer-alice',
        role: 'caller'
      })
    );
    setRoomOffer('leave-room', 'peer-alice', { type: 'offer', sdp: 'x' });

    const accepted = await POST(
      jsonRequest('http://localhost/api/call', { action: 'accept_call', roomId: 'leave-room' })
    );
    expect((await read(accepted)).message).toBe('Call accepted');

    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'leave_room',
        roomId: 'leave-room',
        peerId: 'peer-alice'
      })
    );

    const status = await read(
      await POST(jsonRequest('http://localhost/api/call', { action: 'get_call_status', roomId: 'leave-room' }))
    );
    expect(status.status).toBe('ACCEPTED');
  });

  it('rejects unknown actions and missing poll fields', async () => {
    expect((await POST(jsonRequest('http://localhost/api/call', { action: 'not-real' }))).status).toBe(400);
    expect(
      (await POST(jsonRequest('http://localhost/api/call', { action: 'poll_signaling', roomId: 'r' }))).status
    ).toBe(400);
  });

  it('supports the legacy start action', async () => {
    const res = await read(await POST(jsonRequest('http://localhost/api/call', { action: 'start' })));
    expect(res.roomId).toMatch(/^date-/);
    expect(res.sessionId).toBe(res.roomId);
  });
});

describe('GET /api/call', () => {
  it('returns an incoming ring only for the exact callee', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'ring-room',
        callerId: 'user-alice',
        calleeId: 'user-bob',
        calleeEmail: 'bob@kissmycheek.org'
      })
    );

    const hit = await GET(
      new Request('http://localhost/api/call?action=check_incoming&userId=user-bob&ids=stale-id,user-bob')
    );
    const hitBody = await read(hit);
    expect(hitBody.incomingCall.calleeId).toBe('user-bob');

    const miss = await GET(
      new Request('http://localhost/api/call?action=check_incoming&userId=user-bobby&name=Bob')
    );
    expect((await read(miss)).incomingCall).toBeNull();

    const byEmail = await GET(
      new Request('http://localhost/api/call?action=check_incoming&email=bob@kissmycheek.org')
    );
    expect((await read(byEmail)).incomingCall.calleeEmail).toBe('bob@kissmycheek.org');
  });

  it('returns empty incoming when no identity is provided', async () => {
    const res = await GET(new Request('http://localhost/api/call?action=check_incoming'));
    expect(await read(res)).toEqual({ success: true, incomingCall: null });
  });

  it('returns invite status and requires a room when polling via GET', async () => {
    await POST(
      jsonRequest('http://localhost/api/call', {
        action: 'initiate_call',
        roomId: 'status-room',
        callerId: 'user-alice',
        calleeId: 'user-bob'
      })
    );

    const status = await read(
      await GET(new Request('http://localhost/api/call?action=get_call_status&roomId=status-room'))
    );
    expect(status.status).toBe('RINGING');

    const missing = await GET(new Request('http://localhost/api/call?action=poll'));
    expect(missing.status).toBe(400);
  });
});
