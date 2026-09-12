import { getCanonicalRoomId } from '@/lib/callRoomId';

describe('getCanonicalRoomId', () => {
  it('is commutative so both phones land in the same room', () => {
    expect(getCanonicalRoomId('alice', 'bob')).toBe(getCanonicalRoomId('bob', 'alice'));
    expect(getCanonicalRoomId('alice', 'bob')).toBe('call_alice__bob');
  });

  it('trims whitespace before sorting', () => {
    expect(getCanonicalRoomId('  alice  ', 'bob')).toBe('call_alice__bob');
  });

  it('uses the remaining id when one side is empty', () => {
    expect(getCanonicalRoomId('', 'bob')).toBe('call_bob');
    expect(getCanonicalRoomId('alice', '')).toBe('call_alice');
  });

  it('falls back to a timestamped room when both ids are empty', () => {
    const roomId = getCanonicalRoomId('', '');
    expect(roomId).toMatch(/^call_room_\d+$/);
  });
});
