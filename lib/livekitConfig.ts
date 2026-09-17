import { AccessToken } from 'livekit-server-sdk';

export interface LiveKitRuntimeConfig {
  apiKey: string;
  apiSecret: string;
  url: string;
}

export function getLiveKitConfig(): LiveKitRuntimeConfig | null {
  const isProd = process.env.NODE_ENV === 'production';
  const apiKey = process.env.LIVEKIT_API_KEY || (!isProd ? 'devkey' : '');
  const apiSecret = process.env.LIVEKIT_API_SECRET || (!isProd ? 'secret' : '');
  const url =
    process.env.NEXT_PUBLIC_LIVEKIT_URL ||
    process.env.LIVEKIT_URL ||
    (!isProd ? 'ws://127.0.0.1:7880' : '');

  if (!apiKey || !apiSecret || !url) return null;
  return { apiKey, apiSecret, url };
}

export async function createLiveKitJoinToken(opts: {
  identity: string;
  name?: string;
  roomName: string;
  ttlSeconds?: number;
}): Promise<{ token: string; url: string }> {
  const config = getLiveKitConfig();
  if (!config) {
    throw new Error('LiveKit is not configured');
  }

  const at = new AccessToken(config.apiKey, config.apiSecret, {
    identity: opts.identity,
    name: opts.name || opts.identity,
    ttl: opts.ttlSeconds ?? 60 * 60
  });
  at.addGrant({
    roomJoin: true,
    room: opts.roomName,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true
  });

  return {
    token: await at.toJwt(),
    url: config.url
  };
}
