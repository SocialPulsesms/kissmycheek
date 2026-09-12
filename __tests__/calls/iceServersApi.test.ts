import { DEFAULT_ICE_SERVERS } from '@/lib/webrtcIceConfig';

const originalEnv = { ...process.env };
const originalFetch = global.fetch;

describe('GET /api/ice-servers', () => {
  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
    delete process.env.METERED_API_KEY;
    delete process.env.METERED_DOMAIN;
    delete process.env.TWILIO_ACCOUNT_SID;
    delete process.env.TWILIO_AUTH_TOKEN;
    delete process.env.TURN_URLS;
    delete process.env.TURN_USERNAME;
    delete process.env.TURN_CREDENTIAL;
  });

  afterAll(() => {
    process.env = originalEnv;
    global.fetch = originalFetch;
  });

  it('returns STUN defaults when no TURN provider is configured', async () => {
    global.fetch = jest.fn();
    const { GET } = await import('@/app/api/ice-servers/route');
    const res = await GET();
    const body = await res.json();

    expect(body.success).toBe(true);
    expect(body.iceServers).toEqual(DEFAULT_ICE_SERVERS);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('prepends static env TURN and Metered + Twilio credentials', async () => {
    process.env.TURN_URLS = 'turn:static.example.com:3478';
    process.env.TURN_USERNAME = 'static-user';
    process.env.TURN_CREDENTIAL = 'static-pass';
    process.env.METERED_API_KEY = 'metered-key';
    process.env.METERED_DOMAIN = 'kmc';
    process.env.TWILIO_ACCOUNT_SID = 'ACxxx';
    process.env.TWILIO_AUTH_TOKEN = 'twilio-token';

    global.fetch = jest.fn(async (input: RequestInfo | URL) => {
      const url = String(input);
      if (url.includes('metered.live')) {
        return {
          ok: true,
          json: async () => [{ urls: 'turn:metered.example:80', username: 'm', credential: 'c' }]
        } as Response;
      }
      if (url.includes('twilio.com')) {
        return {
          ok: true,
          json: async () => ({ ice_servers: [{ urls: 'turn:twilio.example', username: 't', credential: 'c' }] })
        } as Response;
      }
      return { ok: false, json: async () => ({}) } as Response;
    }) as typeof fetch;

    const { GET } = await import('@/app/api/ice-servers/route');
    const body = await (await GET()).json();

    expect(body.iceServers[0]).toEqual({
      urls: ['turn:static.example.com:3478'],
      username: 'static-user',
      credential: 'static-pass'
    });
    expect(body.iceServers).toEqual(
      expect.arrayContaining([
        { urls: 'turn:metered.example:80', username: 'm', credential: 'c' },
        { urls: 'turn:twilio.example', username: 't', credential: 'c' },
        ...DEFAULT_ICE_SERVERS
      ])
    );
  });

  it('falls back to STUN when provider fetches fail', async () => {
    process.env.METERED_API_KEY = 'metered-key';
    process.env.METERED_DOMAIN = 'kmc';
    jest.spyOn(console, 'warn').mockImplementation(() => {});
    global.fetch = jest.fn(async () => {
      throw new Error('network down');
    }) as typeof fetch;

    const { GET } = await import('@/app/api/ice-servers/route');
    const body = await (await GET()).json();
    expect(body.success).toBe(true);
    expect(body.iceServers).toEqual(DEFAULT_ICE_SERVERS);
  });
});
