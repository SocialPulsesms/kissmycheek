import {
  addCallRecord,
  getPersistentCallHistory,
  getCallHistoryBetweenUsers,
  getCallHistoryForUser
} from '@/lib/callHistoryStore';

function record(overrides: Partial<Parameters<typeof addCallRecord>[0]> = {}) {
  return addCallRecord({
    callerId: 'user-alice',
    receiverId: 'user-bob',
    partnerId: 'user-bob',
    partnerName: 'Bob',
    partnerPhoto: '',
    partnerOccupation: 'Member',
    callType: 'video',
    durationSeconds: 42,
    durationFormatted: '00:42',
    timestamp: 'Just now',
    status: 'completed',
    qualityPreset: '1080p',
    ...overrides
  });
}

describe('callHistoryStore', () => {
  it('prepends new records with a generated id', () => {
    const first = record({ durationSeconds: 10 });
    const second = record({ durationSeconds: 20, callType: 'voice', status: 'missed' });

    const history = getPersistentCallHistory();
    expect(history).toHaveLength(2);
    expect(history[0].id).toBe(second.id);
    expect(history[0].callType).toBe('voice');
    expect(history[1].id).toBe(first.id);
    expect(first.id).toMatch(/^call-rec-\d+$/);
  });

  it('filters history between two members by caller/receiver pair', () => {
    record({ callerId: 'user-alice', receiverId: 'user-bob', partnerId: 'user-bob' });
    record({ callerId: 'user-cara', receiverId: 'user-dan', partnerId: 'user-dan' });

    const between = getCallHistoryBetweenUsers('user-alice', 'user-bob');
    expect(between).toHaveLength(1);
    expect(between[0].receiverId).toBe('user-bob');
  });

  it('returns a member\'s own calls', () => {
    record({ callerId: 'user-alice', receiverId: 'user-bob', partnerId: 'user-bob' });
    record({ callerId: 'user-cara', receiverId: 'user-alice', partnerId: 'user-alice' });
    record({ callerId: 'user-cara', receiverId: 'user-dan', partnerId: 'user-dan' });

    const mine = getCallHistoryForUser('user-alice');
    expect(mine).toHaveLength(2);
    expect(mine.every((item) => item.callerId === 'user-alice' || item.receiverId === 'user-alice')).toBe(
      true
    );
  });

  it('does not leak unrelated calls when both ids are known', () => {
    record({ callerId: 'user-alice', receiverId: 'user-bob', partnerId: 'user-bob' });
    const hits = getCallHistoryBetweenUsers('user-alice', 'user-zzz');
    expect(hits).toHaveLength(0);
  });
});
