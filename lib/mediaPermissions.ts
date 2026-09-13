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

  if (needsVideo) {
    // 1. Mobile-native front camera (avoids restrictive landscape 1280x720 which breaks portrait Android/iOS front cams)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' }
      });
      cachedLocalStream = stream;
      return { granted: true, hasCamera: true, hasAudio: true, stream };
    } catch (errFacing) {
      console.warn('triggerMediaPermissions front facingMode failed, trying generic video:', errFacing);
    }

    // 2. Generic video fallback (any available camera on device)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      cachedLocalStream = stream;
      return { granted: true, hasCamera: true, hasAudio: true, stream };
    } catch (errGeneric) {
      console.warn('triggerMediaPermissions generic video failed, trying low-res constraints:', errGeneric);
    }

    // 3. Low-resolution standard constraint (handles older Android front cams)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      cachedLocalStream = stream;
      return { granted: true, hasCamera: true, hasAudio: true, stream };
    } catch (errLowRes) {
      console.warn('triggerMediaPermissions all video constraints failed, falling back to audio:', errLowRes);
    }

    // 4. Absolute fallback: audio-only if camera hardware is completely unavailable or blocked
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cachedLocalStream = audioStream;
      return { granted: true, hasCamera: false, hasAudio: true, stream: audioStream };
    } catch (audioErr: any) {
      return { granted: false, hasCamera: false, hasAudio: false, stream: null, error: audioErr?.message };
    }
  } else {
    // Audio-only call
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      cachedLocalStream = audioStream;
      return { granted: true, hasCamera: false, hasAudio: true, stream: audioStream };
    } catch (audioErr: any) {
      return { granted: false, hasCamera: false, hasAudio: false, stream: null, error: audioErr?.message };
    }
  }
}
