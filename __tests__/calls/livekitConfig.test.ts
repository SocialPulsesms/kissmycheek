import { createLiveKitJoinToken } from '@/lib/livekitConfig';

describe('createLiveKitJoinToken', () => {
  const prev = { ...process.env };

  afterEach(() => {
    process.env.LIVEKIT_API_KEY = prev.LIVEKIT_API_KEY;
    process.env.LIVEKIT_API_SECRET = prev.LIVEKIT_API_SECRET;
    process.env.NEXT_PUBLIC_LIVEKIT_URL = prev.NEXT_PUBLIC_LIVEKIT_URL;
    process.env.LIVEKIT_URL = prev.LIVEKIT_URL;
    (process.env as Record<string, string | undefined>).NODE_ENV = prev.NODE_ENV;
  });

  it('mints a JWT for the requested room', async () => {
    process.env.LIVEKIT_API_KEY = 'devkey';
    process.env.LIVEKIT_API_SECRET = 'secret';
    process.env.NEXT_PUBLIC_LIVEKIT_URL = 'ws://127.0.0.1:7880';
    const { token, url } = await createLiveKitJoinToken({
      identity: 'user-a',
      name: 'Ada',
      roomName: 'kmc_a_b'
    });
    expect(url).toContain('7880');
    expect(token.split('.').length).toBe(3);
  });
});
