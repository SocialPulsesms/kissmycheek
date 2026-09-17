import {
  createCallInvite,
  getIncomingCallForUser,
  resetCallInviteStore,
  updateCallInvite
} from '@/lib/callInviteStore';

describe('callInviteStore', () => {
  beforeEach(() => {
    resetCallInviteStore();
  });

  it('creates a ringing invite and finds it for the callee', () => {
    createCallInvite({
      roomName: 'kmc_a_b',
      callerId: 'user-a',
      calleeId: 'user-b',
      mode: 'video'
    });
    expect(getIncomingCallForUser('user-b')?.callerId).toBe('user-a');
    expect(getIncomingCallForUser('user-a')).toBeNull();
  });

  it('accepts and then no longer rings the callee', () => {
    createCallInvite({
      roomName: 'kmc_a_b',
      callerId: 'user-a',
      calleeId: 'user-b',
      mode: 'video'
    });
    updateCallInvite('kmc_a_b', 'accepted', 'user-b');
    expect(getIncomingCallForUser('user-b')).toBeNull();
  });

  it('matches a callee by an alternate id', () => {
    createCallInvite({
      roomName: 'kmc_a_b',
      callerId: 'prisma-a',
      calleeId: 'prisma-b',
      callerIds: ['prisma-a', 'ada@test.com'],
      calleeIds: ['prisma-b', 'user_bob', 'bob@test.com'],
      mode: 'video'
    });
    expect(getIncomingCallForUser('bob@test.com')?.roomName).toBe('kmc_a_b');
    expect(getIncomingCallForUser('user_bob')?.roomName).toBe('kmc_a_b');
    expect(getIncomingCallForUser('prisma-a')).toBeNull();
  });

  it('rejects status updates from a stranger', () => {
    createCallInvite({
      roomName: 'kmc_a_b',
      callerId: 'user-a',
      calleeId: 'user-b',
      mode: 'video'
    });
    expect(updateCallInvite('kmc_a_b', 'ended', 'stranger')).toBeNull();
  });
});
