import {
  DEFAULT_ICE_SERVERS,
  DEFAULT_RTC_CONFIGURATION,
  getStaticEnvTurnServers,
  optimizeSdpForNetwork,
  applyKmcSenderParameters,
  KMC_LUXE_FILTERS
} from '@/lib/webrtcIceConfig';

describe('ICE defaults', () => {
  it('only ships public STUN servers and never the retired openrelay pool', () => {
    const urls = DEFAULT_ICE_SERVERS.flatMap((server) =>
      Array.isArray(server.urls) ? server.urls : [server.urls]
    );

    expect(urls.some((url) => url.includes('stun.l.google.com'))).toBe(true);
    expect(urls.some((url) => url.includes('stun.cloudflare.com'))).toBe(true);
    expect(urls.some((url) => url.includes('openrelay'))).toBe(false);
    expect(DEFAULT_ICE_SERVERS.every((server) => !server.username)).toBe(true);
  });

  it('uses bundle + rtcp-mux for a single media transport', () => {
    expect(DEFAULT_RTC_CONFIGURATION.bundlePolicy).toBe('max-bundle');
    expect(DEFAULT_RTC_CONFIGURATION.rtcpMuxPolicy).toBe('require');
    expect(DEFAULT_RTC_CONFIGURATION.iceCandidatePoolSize).toBe(0);
  });

  it('exposes the luxe filter presets used on the call stage', () => {
    expect(KMC_LUXE_FILTERS.luxe.filter).toContain('saturate');
    expect(KMC_LUXE_FILTERS.none.filter).toBe('none');
  });
});

describe('getStaticEnvTurnServers', () => {
  const original = { ...process.env };

  afterEach(() => {
    process.env.TURN_URLS = original.TURN_URLS;
    process.env.TURN_USERNAME = original.TURN_USERNAME;
    process.env.TURN_CREDENTIAL = original.TURN_CREDENTIAL;
    if (original.TURN_URLS === undefined) delete process.env.TURN_URLS;
    if (original.TURN_USERNAME === undefined) delete process.env.TURN_USERNAME;
    if (original.TURN_CREDENTIAL === undefined) delete process.env.TURN_CREDENTIAL;
  });

  it('returns nothing when TURN env is incomplete', () => {
    delete process.env.TURN_URLS;
    delete process.env.TURN_USERNAME;
    delete process.env.TURN_CREDENTIAL;
    expect(getStaticEnvTurnServers()).toEqual([]);

    process.env.TURN_URLS = 'turn:turn.example.com:3478';
    process.env.TURN_USERNAME = 'user';
    delete process.env.TURN_CREDENTIAL;
    expect(getStaticEnvTurnServers()).toEqual([]);
  });

  it('parses comma-separated TURN urls with credentials', () => {
    process.env.TURN_URLS = 'turn:turn.example.com:3478, turns:turn.example.com:5349';
    process.env.TURN_USERNAME = 'kmc';
    process.env.TURN_CREDENTIAL = 'secret';

    expect(getStaticEnvTurnServers()).toEqual([
      {
        urls: ['turn:turn.example.com:3478', 'turns:turn.example.com:5349'],
        username: 'kmc',
        credential: 'secret'
      }
    ]);
  });
});

describe('optimizeSdpForNetwork', () => {
  it('returns empty input unchanged', () => {
    expect(optimizeSdpForNetwork('')).toBe('');
  });

  it('adds Opus stereo + bitrate without duplicating existing FEC', () => {
    const sdp = [
      'v=0',
      'm=audio 9 UDP/TLS/RTP/SAVPF 111',
      'a=rtpmap:111 opus/48000/2',
      'a=fmtp:111 minptime=10;useinbandfec=1',
      ''
    ].join('\r\n');

    const optimized = optimizeSdpForNetwork(sdp);
    expect(optimized).toContain('useinbandfec=1');
    expect(optimized).toContain('stereo=1');
    expect(optimized).toContain('maxaveragebitrate=128000');
    expect(optimized.match(/useinbandfec=/g)?.length).toBe(1);
  });

  it('inserts video bandwidth when missing and replaces existing values', () => {
    const withoutBandwidth = [
      'v=0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'a=rtpmap:96 VP8/90000',
      ''
    ].join('\r\n');

    const inserted = optimizeSdpForNetwork(withoutBandwidth, 2000);
    expect(inserted).toContain('b=AS:2000');
    expect(inserted).toContain('b=TIAS:2000000');

    const withConnection = [
      'v=0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'c=IN IP4 0.0.0.0',
      'a=rtpmap:96 VP8/90000',
      ''
    ].join('\r\n');
    const afterConnection = optimizeSdpForNetwork(withConnection, 1800);
    const connectionIndex = afterConnection.indexOf('c=IN IP4 0.0.0.0');
    const bandwidthIndex = afterConnection.indexOf('b=AS:1800');
    expect(connectionIndex).toBeGreaterThan(-1);
    expect(bandwidthIndex).toBeGreaterThan(connectionIndex);

    const withBandwidth = [
      'v=0',
      'm=video 9 UDP/TLS/RTP/SAVPF 96',
      'b=AS:800',
      'b=TIAS:800000',
      'a=rtpmap:96 VP8/90000',
      ''
    ].join('\r\n');

    const replaced = optimizeSdpForNetwork(withBandwidth, 1600);
    expect(replaced).toContain('b=AS:1600');
    expect(replaced).toContain('b=TIAS:1600000');
    expect(replaced).not.toContain('b=AS:800');
  });
});

describe('applyKmcSenderParameters', () => {
  it('sets high-priority video encoding when a video sender exists', async () => {
    const setParameters = jest.fn().mockResolvedValue(undefined);
    const fakePc = {
      getSenders: () => [
        {
          track: { kind: 'video' },
          getParameters: () => ({ encodings: [{}] }),
          setParameters
        }
      ]
    } as unknown as RTCPeerConnection;

    await applyKmcSenderParameters(fakePc, 'ultra');

    expect(setParameters).toHaveBeenCalledWith(
      expect.objectContaining({
        encodings: [
          expect.objectContaining({
            maxBitrate: 2_200_000,
            maxFramerate: 30,
            scaleResolutionDownBy: 1.0
          })
        ]
      })
    );
  });

  it('is a no-op when there is no video sender', async () => {
    const fakePc = {
      getSenders: () => []
    } as unknown as RTCPeerConnection;

    await expect(applyKmcSenderParameters(fakePc, 'high')).resolves.toBeUndefined();
  });
});
