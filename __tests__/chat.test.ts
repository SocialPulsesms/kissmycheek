import { getCanonicalThreadId } from '@/lib/messageStore';

describe('Message Store', () => {
  it('generates consistent canonical thread IDs regardless of user order', () => {
    const id1 = getCanonicalThreadId('user_alpha', 'user_beta');
    const id2 = getCanonicalThreadId('user_beta', 'user_alpha');
    expect(id1).toBe(id2);
    expect(id1).toBe('th_user_alpha__user_beta');
  });
});
