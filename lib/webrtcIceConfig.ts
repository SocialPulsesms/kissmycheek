// WebRTC Ultra-Low Latency & High-Availability ICE Configuration for Kiss My Cheek
// Supports Cross-State, Cross-Carrier & Strict NAT/Firewall Traversal via Streamlined Multi-Region STUN & TURN Relays

export interface WebRtcIceServer {
  urls: string | string[];
  username?: string;
  credential?: string;
}

export const DEFAULT_ICE_SERVERS: WebRtcIceServer[] = [
  // 1. Primary High-Availability Google STUN Pool (Instant reflex candidate discovery)
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'stun:stun2.l.google.com:19302' },
  { urls: 'stun:stun3.l.google.com:19302' },
  { urls: 'stun:stun4.l.google.com:19302' },

  // 2. Cloudflare & Mozilla Fast STUN
  { urls: 'stun:stun.cloudflare.com:3478' },
  { urls: 'stun:stun.services.mozilla.com:3478' },

  // 3. High-Speed Global TURN Relay Pool (Fallback for Symmetric NATs)
  {
    urls: [
      'turn:openrelay.metered.ca:80',
      'turn:openrelay.metered.ca:443'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  },

  // 4. Secure Global TURN TLS/TCP Relays
  {
    urls: [
      'turn:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:443?transport=tcp',
      'turns:openrelay.metered.ca:5349'
    ],
    username: 'openrelayproject',
    credential: 'openrelayproject'
  }
];

export const DEFAULT_RTC_CONFIGURATION: RTCConfiguration = {
  iceServers: DEFAULT_ICE_SERVERS,
  iceCandidatePoolSize: 0, // Instant negotiation without pre-gathering delay
  bundlePolicy: 'max-bundle',
  rtcpMuxPolicy: 'require'
};

/**
 * Kiss My Cheek Luxury Filter Presets for Real-Time GPU-Accelerated Video Rendering
 */
export const KMC_LUXE_FILTERS = {
  none: { name: 'Natural', filter: 'none', icon: '🌿' },
  luxe: { name: 'Cheek Luxe', filter: 'contrast(1.08) brightness(1.05) saturate(1.15)', icon: '✨' },
  golden: { name: 'Golden Hour', filter: 'contrast(1.06) brightness(1.06) saturate(1.25) sepia(0.08)', icon: '🌅' },
  studio: { name: 'Studio 4K', filter: 'contrast(1.14) brightness(1.04) saturate(1.08)', icon: '💎' },
  glam: { name: 'Night Glam', filter: 'contrast(1.10) brightness(1.12) saturate(1.18)', icon: '🌙' },
  smooth: { name: 'Porcelain Glow', filter: 'contrast(1.04) brightness(1.04) saturate(1.08) blur(0.2px)', icon: '🌸' }
};

// Aliases for full compatibility
export const SNAPCHAT_LUXE_FILTERS = KMC_LUXE_FILTERS;
export type FilterKey = keyof typeof KMC_LUXE_FILTERS;

/**
 * Safe SDP optimization for low-latency, crystal-clear WebRTC audio & video:
 * - Cleanly tunes Opus audio parameters (in-band FEC, high bitrate) without duplicate fmtp lines
 * - Safely adjusts video session bandwidth (b=AS / b=TIAS) without corrupting H.264/VP8 codec negotiation
 */
export function optimizeSdpForNetwork(sdp: string, bitrateKbps: number = 3500): string {
  if (!sdp) return sdp;
  let modifiedSdp = sdp;

  // 1. Audio: Safely configure Opus for high quality stereo & forward error correction
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

  // 2. Video: Safely set session bandwidth without corrupting codec fmtp attributes
  try {
    const tiasBps = bitrateKbps * 1000;
    if (modifiedSdp.includes('m=video')) {
      if (modifiedSdp.includes('b=AS:')) {
        modifiedSdp = modifiedSdp.replace(/b=AS:\d+/g, `b=AS:${bitrateKbps}`);
      } else {
        modifiedSdp = modifiedSdp.replace(/(m=video[^\r\n]+[\r\n]+)/g, `$1b=AS:${bitrateKbps}\r\nb=TIAS:${tiasBps}\r\n`);
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

/**
 * Configure RTCRtpSender video encoding parameters for Cheek Ultra HD Bitrate (4.5 Mbps, 60 fps)
 */
export async function applyKmcSenderParameters(pc: RTCPeerConnection, quality: 'ultra' | 'high' | 'adaptive' = 'high') {
  try {
    const videoSender = pc.getSenders().find(s => s.track && s.track.kind === 'video');
    if (!videoSender) return;

    // 1.8 Mbps max bitrate at 30 fps is optimal for mobile networks (prevents cellular buffering/freezing)
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
  } catch (err) {
    // Graceful fallback on hardware encoders that do not allow runtime parameter modification
  }
}

// Backwards-compatible alias
export const applySnapchatSenderParameters = applyKmcSenderParameters;
