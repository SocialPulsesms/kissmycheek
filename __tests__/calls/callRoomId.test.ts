import { getCanonicalRoomName } from '@/lib/callRoomId';

describe('getCanonicalRoomName', () => {
  it('is stable regardless of participant order', () => {
    expect(getCanonicalRoomName('user-b', 'user-a')).toBe(getCanonicalRoomName('user-a', 'user-b'));
  });
});
