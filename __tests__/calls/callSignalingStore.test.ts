import {
  initiateCallInvite,
  joinRoom,
  setRoomOffer,
  setRoomAnswer,
  addIceCandidates,
  addIceCandidate,
  getRoomPollState,
  getIncomingCallForUser,
  getCallInvite,
  acceptCallInvite,
  declineCallInvite,
  cancelCallInvite,
  endCallSession,
  leaveRoom,
  addRoomEvent,
  getOrCreateRoom,
  getCanonicalRoomId
} from '@/lib/callSignalingStore';

const OFFER = { type: 'offer', sdp: 'v=0\r\no=alice' };
const ANSWER = { type: 'answer', sdp: 'v=0\r\no=bob' };
const CALLER_ICE = { candidate: 'candidate:1', sdpMid: '0' };
const CALLEE_ICE = { candidate: 'candidate:2', sdpMid: '0' };

function startHandshake(roomId = 'call_alice__bob') {
  const invite = initiateCallInvite({
    roomId,
    callerId: 'user-alice',
    callerName: 'Alice',
    callerPhoto: 'alice.jpg',
    calleeId: 'user-bob',
    calleeName: 'Bob',
    calleeEmail: 'bob@kissmycheek.org',
    callMode: 'video'
  });

  const caller = joinRoom(roomId, 'peer-alice', 'caller', 'Alice', 'alice.jpg');
  setRoomOffer(roomId, 'peer-alice', OFFER);
  addIceCandidates(roomId, 'peer-alice', [CALLER_ICE], 'caller');

  return { invite, caller, roomId };
}

describe('call invite + handshake', () => {
  it('creates a RINGING invite keyed by room id', () => {
    const invite = initiateCallInvite({
      roomId: 'call_alice__bob',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      calleeEmail: 'bob@kissmycheek.org',
      callMode: 'voice'
    });

    expect(invite.status).toBe('RINGING');
    expect(invite.callMode).toBe('voice');
    expect(getCallInvite('call_alice__bob')?.callId).toBe(invite.callId);
  });

  it('does not wipe an in-flight room when initiate_call is fired a second time', () => {
    const { roomId } = startHandshake();

    const second = initiateCallInvite({
      roomId,
      callerId: 'user-alice',
      callerName: 'Alice Club',
      calleeId: 'user-bob',
      calleeEmail: 'bob@kissmycheek.org',
      callMode: 'video'
    });

    const room = getOrCreateRoom(roomId);
    expect(second.status).toBe('RINGING');
    expect(room.callerId).toBe('peer-alice');
    expect(room.offer).toEqual(OFFER);
    expect(room.callerCandidates).toEqual([CALLER_ICE]);
  });

  it('completes offer / answer / ICE in the right direction', () => {
    const { roomId } = startHandshake();

    const calleeJoin = joinRoom(roomId, 'peer-bob', 'callee', 'Bob', 'bob.jpg');
    expect(calleeJoin.role).toBe('callee');
    expect(calleeJoin.offer).toEqual(OFFER);

    const calleePoll = getRoomPollState(roomId, 'peer-bob', 0, 0, 'callee');
    expect(calleePoll.offer).toEqual(OFFER);
    expect(calleePoll.candidates).toEqual([CALLER_ICE]);
    expect(calleePoll.answer).toBeUndefined();

    setRoomAnswer(roomId, 'peer-bob', ANSWER);
    addIceCandidates(roomId, 'peer-bob', [CALLEE_ICE], 'callee');

    const callerPoll = getRoomPollState(roomId, 'peer-alice', 0, 0, 'caller');
    expect(callerPoll.answer).toEqual(ANSWER);
    expect(callerPoll.candidates).toEqual([CALLEE_ICE]);
    expect(callerPoll.offer).toBeUndefined();
    expect(callerPoll.status).toBe('CONNECTED');
    expect(callerPoll.hasPartner).toBe(true);
    expect(getCallInvite(roomId)?.status).toBe('ACCEPTED');
  });

  it('honors preferredRole so a callee who joins first is not seated as caller', () => {
    initiateCallInvite({
      roomId: 'room-1',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      callMode: 'video'
    });

    const first = joinRoom('room-1', 'peer-bob', 'callee', 'Bob');
    expect(first.role).toBe('callee');

    const second = joinRoom('room-1', 'peer-alice', 'caller', 'Alice');
    expect(second.role).toBe('caller');

    const room = getOrCreateRoom('room-1');
    expect(room.callerId).toBe('peer-alice');
    expect(room.calleeId).toBe('peer-bob');
  });

  it('accepts the client `role` field as preferredRole through joinRoom', () => {
    const joined = joinRoom('room-role', 'peer-x', 'callee');
    expect(joined.role).toBe('callee');
    expect(getOrCreateRoom('room-role').calleeId).toBe('peer-x');
  });

  it('does not let fallbackRole override the opposite seat when polling', () => {
    const { roomId } = startHandshake();
    joinRoom(roomId, 'peer-bob', 'callee', 'Bob');
    setRoomAnswer(roomId, 'peer-bob', ANSWER);

    const confused = getRoomPollState(roomId, 'peer-bob', 0, 0, 'caller');
    expect(confused.role).toBe('callee');
    expect(confused.offer).toEqual(OFFER);
    expect(confused.answer).toBeUndefined();
  });

  it('slices ICE candidates from the last index', () => {
    const { roomId } = startHandshake();
    joinRoom(roomId, 'peer-bob', 'callee');
    addIceCandidate(roomId, 'peer-alice', { candidate: 'candidate:3', sdpMid: '0' }, 'caller');

    const first = getRoomPollState(roomId, 'peer-bob', 0, 0, 'callee');
    expect(first.candidates).toHaveLength(2);
    expect(first.nextCandidateIndex).toBe(2);

    const second = getRoomPollState(roomId, 'peer-bob', 2, 0, 'callee');
    expect(second.candidates).toEqual([]);
    expect(second.nextCandidateIndex).toBe(2);
  });

  it('delivers reactions and media-state events only to the other peer', () => {
    const { roomId } = startHandshake();
    joinRoom(roomId, 'peer-bob', 'callee');

    addRoomEvent(roomId, { senderPeerId: 'peer-alice', type: 'reaction', data: { emoji: '❤️' } });
    addRoomEvent(roomId, { senderPeerId: 'peer-bob', type: 'media_state', data: { micMuted: true } });

    const forBob = getRoomPollState(roomId, 'peer-bob', 0, 0, 'callee');
    expect(forBob.events).toEqual([
      expect.objectContaining({ type: 'reaction', data: { emoji: '❤️' } })
    ]);

    const forAlice = getRoomPollState(roomId, 'peer-alice', 0, 0, 'caller');
    expect(forAlice.events).toEqual([
      expect.objectContaining({ type: 'media_state', data: { micMuted: true } })
    ]);
  });
});

describe('hangup, decline, and cancel', () => {
  it('makes a decline visible on the caller poll', () => {
    const { roomId } = startHandshake();

    expect(declineCallInvite(roomId)).toBe(true);

    const poll = getRoomPollState(roomId, 'peer-alice', 0, 0, 'caller');
    expect(poll.inviteStatus).toBe('DECLINED');
    expect(poll.status).toBe('ENDED');
    expect(poll.roomStatus).toBe('cancelled');
  });

  it('makes a cancel visible on the callee poll', () => {
    const { roomId } = startHandshake();
    joinRoom(roomId, 'peer-bob', 'callee');

    cancelCallInvite(roomId);

    const poll = getRoomPollState(roomId, 'peer-bob', 0, 0, 'callee');
    expect(poll.inviteStatus).toBe('CANCELLED');
    expect(poll.roomStatus).toBe('cancelled');
  });

  it('marks an in-progress call ENDED for the remaining peer', () => {
    const { roomId } = startHandshake();
    joinRoom(roomId, 'peer-bob', 'callee');
    setRoomAnswer(roomId, 'peer-bob', ANSWER);

    endCallSession(roomId, 'ENDED');

    const poll = getRoomPollState(roomId, 'peer-bob', 0, 0, 'callee');
    expect(poll.status).toBe('ENDED');
    expect(poll.inviteStatus).toBe('ENDED');
    expect(poll.roomStatus).toBe('cancelled');
  });

  it('leaveRoom detaches a peer without ending the invite', () => {
    const { roomId } = startHandshake();
    leaveRoom(roomId, 'peer-alice');

    const room = getOrCreateRoom(roomId);
    expect(room.callerId).toBeNull();
    expect(room.offer).toBeNull();
    expect(getCallInvite(roomId)?.status).toBe('RINGING');
    expect(room.status).not.toBe('ENDED');
  });

  it('still reports a declined invite after the room is gone', () => {
    initiateCallInvite({
      roomId: 'ghost-room',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      callMode: 'video'
    });
    declineCallInvite('ghost-room');

    const poll = getRoomPollState('missing-room-id', 'peer-alice', 0, 0, 'caller');
    expect(poll).toEqual(expect.objectContaining({ error: 'Room not found' }));

    const declined = getRoomPollState('ghost-room', 'peer-alice', 0, 0, 'caller');
    expect(declined.inviteStatus).toBe('DECLINED');
    expect(declined.roomStatus).toBe('cancelled');
  });

  it('acceptCallInvite flips RINGING to ACCEPTED', () => {
    initiateCallInvite({
      roomId: 'room-accept',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      callMode: 'video'
    });

    expect(acceptCallInvite('room-accept', 'user-bob')).toBe(true);
    expect(getCallInvite('room-accept')?.status).toBe('ACCEPTED');
  });
});

describe('incoming-call matching', () => {
  beforeEach(() => {
    initiateCallInvite({
      roomId: 'call_alice__bob',
      callerId: 'user-alice',
      callerName: 'Alice',
      calleeId: 'user-bob',
      calleeName: 'Bob Smith',
      calleeEmail: 'bob@kissmycheek.org',
      callMode: 'video'
    });
  });

  it('matches an exact callee id', () => {
    expect(getIncomingCallForUser('user-bob')?.calleeId).toBe('user-bob');
  });

  it('matches an exact email when ids differ across stores', () => {
    expect(getIncomingCallForUser('prisma-uuid-bob', 'bob@kissmycheek.org')?.calleeEmail).toBe(
      'bob@kissmycheek.org'
    );
  });

  it('matches one of several extra ids from profile/session/auth', () => {
    expect(
      getIncomingCallForUser('stale-local-id', undefined, ['other', 'user-bob'])?.roomId
    ).toBe('call_alice__bob');
  });

  it('does not match a partial id or a similar name', () => {
    expect(getIncomingCallForUser('bob')).toBeNull();
    expect(getIncomingCallForUser('user-bobby')).toBeNull();
    expect(getIncomingCallForUser(undefined, undefined, [])).toBeNull();
  });

  it('ignores invites that are no longer ringing', () => {
    declineCallInvite('call_alice__bob');
    expect(getIncomingCallForUser('user-bob')).toBeNull();
  });
});

describe('getCanonicalRoomId re-export', () => {
  it('stays aligned with the shared helper', () => {
    expect(getCanonicalRoomId('z', 'a')).toBe('call_a__z');
  });
});
