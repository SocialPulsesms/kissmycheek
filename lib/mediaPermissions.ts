/**
 * Media Permissions Utility for Kiss My Cheek
 * Triggers native camera and microphone prompts synchronously on user tap
 * and preserves the live stream for instantaneous video rendering (zero lag, zero play icon).
 */

let cachedLocalStream: MediaStream | null = null;

export function getCachedLocalStream(): MediaStream | null {
  if (cachedLocalStream && cachedLocalStream.active) {
    const hasLiveTrack = cachedLocalStream.getTracks().some(t => t.readyState === 'live');
    if (hasLiveTrack) return cachedLocalStream;
  }
  return null;
}

export function clearCachedLocalStream() {
  if (cachedLocalStream) {
    try {
      cachedLocalStream.getTracks().forEach(track => {
        try {
          track.stop();
        } catch {}
      });
    } catch {}
    cachedLocalStream = null;
  }
}

export async function triggerMediaPermissions(mode: 'voice' | 'video' = 'video'): Promise<{
  granted: boolean;
  hasCamera: boolean;
  hasAudio: boolean;
  stream: MediaStream | null;
  error?: string;
}> {
  if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    return { granted: false, hasCamera: false, hasAudio: false, stream: null, error: 'MediaDevices not supported' };
  }

  const needsVideo = mode !== 'voice';

  // Return existing active stream if available
  const existing = getCachedLocalStream();
  if (existing) {
    const hasVid = existing.getVideoTracks().some(t => t.readyState === 'live');
    const hasAud = existing.getAudioTracks().some(t => t.readyState === 'live');
    if (!needsVideo || hasVid) {
      return { granted: true, hasCamera: hasVid, hasAudio: hasAud, stream: existing };
    }
  }

  try {
    // 1. Trigger native permission prompt in direct response to user gesture
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: needsVideo ? {
        facingMode: 'user',
        width: { ideal: 1280 },
        height: { ideal: 720 }
      } : false
    });

    cachedLocalStream = stream;
    return { granted: true, hasCamera: needsVideo, hasAudio: true, stream };
  } catch (err: any) {
    console.warn('triggerMediaPermissions primary request:', err);

    // Fallback: If video failed, try audio-only
    if (needsVideo) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        cachedLocalStream = audioStream;
        return { granted: true, hasCamera: false, hasAudio: true, stream: audioStream };
      } catch (audioErr: any) {
        return { granted: false, hasCamera: false, hasAudio: false, stream: null, error: audioErr?.message || err?.message };
      }
    }

    return { granted: false, hasCamera: false, hasAudio: false, stream: null, error: err?.message };
  }
}
