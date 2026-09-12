// WebRTC ICE configuration for Kiss My Cheek.
// STUN is always available. TURN must come from env (Metered, Twilio, or static credentials).
// The old public openrelay.metered.ca pool is retired and is no longer included.

export interface WebRtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const DEFAULT_ICE_SERVERS: WebRtcIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },
  { urls: 'stun:stun.cloudflare.com:3478' }
];

export function getStaticEnvTurnServers(): WebRtcIceServer[] {
  const urls = (process.env.TURN_URLS || '')
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean);
  const username = process.env.TURN_USERNAME || '';
  const credential = process.env.TURN_CREDENTIAL || '';
  if (urls.length === 0 || !username || !credential) return [];
  return [{ urls, username, credential }];
}

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: DEFAULT_ICE_SERVERS,
  iceCandidatePoolSize: 0,
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

export const KMC_LUXE_FILTERS = {
  none: { name: 'Natural', filter: 'none', icon: '🌿' },
  luxe: { name: 'Cheek Luxe', filter: 'contrast(1.08) brightness(1.05) saturate(1.15)', icon: '✨' },
  golden: { name: 'Golden Hour', filter: 'contrast(1.06) brightness(1.06) saturate(1.25) sepia(0.08)', icon: '🌅' },
  studio: { name: 'Studio 4K', filter: 'contrast(1.14) brightness(1.04) saturate(1.08)', icon: '💎' },
  glam: { name: 'Night Glam', filter: 'contrast(1.10) brightness(1.12) saturate(1.18)', icon: '🌙' },
  smooth: { name: 'Porcelain Glow', filter: 'contrast(1.04) brightness(1.04) saturate(1.08) blur(0.2px)', icon: '🌸' }
};

export const SNAPCHAT_LUXE_FILTERS = KMC_LUXE_FILTERS;
export type FilterKey = keyof typeof KMC_LUXE_FILTERS;

export function optimizeSdpForNetwork(sdp: string, bitrateKbps: number = 3500): string {
  if (!sdp) return sdp;
  let modifiedSdp = sdp;

  try {
    if (modifiedSdp.includes('opus/48000')) {
      const match = modifiedSdp.match(/a=rtpmap:(\d+) opus\/48000\/2/);
      if (match) {
        const pt = match[1];
        const fmtpRegex = new RegExp(`a=fmtp:${pt} (.*)`);
        if (fmtpRegex.test(modifiedSdp)) {
          modifiedSdp = modifiedSdp.replace(fmtpRegex, (m, p1) => {
            let params = p1;
            if (!params.includes('useinbandfec=')) params += ';useinbandfec=1';
            if (!params.includes('stereo=')) params += ';stereo=1';
            if (!params.includes('maxaveragebitrate=')) params += ';maxaveragebitrate=128000';
            return `a=fmtp:${pt} ${params}`;
          });
        }
      }
    }
  } catch (err) {
    console.warn('Opus SDP tune fallback:', err);
  }

  try {
    const tiasBps = bitrateKbps * 1000;
    if (modifiedSdp.includes('m=video')) {
      if (modifiedSdp.includes('b=AS:')) {
        modifiedSdp = modifiedSdp.replace(/b=AS:\d+/g, `b=AS:${bitrateKbps}`);
      } else if (/m=video[^\r\n]+[\r\n]+c=[^\r\n]+/.test(modifiedSdp)) {
        // RFC 4566: bandwidth lines must come after the connection line, never before it.
        modifiedSdp = modifiedSdp.replace(
          /(m=video[^\r\n]+[\r\n]+c=[^\r\n]+[\r\n]+)/,
          `$1b=AS:${bitrateKbps}\r\nb=TIAS:${tiasBps}\r\n`
        );
      } else {
        modifiedSdp = modifiedSdp.replace(
          /(m=video[^\r\n]+[\r\n]+)/,
          `$1b=AS:${bitrateKbps}\r\nb=TIAS:${tiasBps}\r\n`
        );
      }
      if (modifiedSdp.includes('b=TIAS:')) {
        modifiedSdp = modifiedSdp.replace(/b=TIAS:\d+/g, `b=TIAS:${tiasBps}`);
      }
    }
  } catch (err) {
    console.warn('Video bandwidth SDP tune fallback:', err);
  }

  return modifiedSdp;
}

export async function applyKmcSenderParameters(pc: RTCPeerConnection, quality: 'ultra' | 'high' | 'adaptive' = 'high') {
  try {
    const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (!videoSender) return;

    const maxBitrate = quality === 'ultra' ? 2_200_000 : quality === 'high' ? 1_600_000 : 1_000_000;
    const maxFramerate = 30;

    const params = videoSender.getParameters();
    if (!params.encodings || params.encodings.length === 0) {
      params.encodings = [{}];
    }
    params.encodings[0].maxBitrate = maxBitrate;
    params.encodings[0].maxFramerate = maxFramerate;
    params.encodings[0].scaleResolutionDownBy = 1.0;

    if ('priority' in params.encodings[0]) {
      (params.encodings[0] as any).priority = 'high';
      (params.encodings[0] as any).networkPriority = 'high';
    }

    await videoSender.setParameters(params);
  } catch {
    // Some hardware encoders reject runtime parameter changes.
  }
}

export const applySnapchatSenderParameters = applyKmcSenderParameters;
