/**
 * Media Permissions Utility for Kiss My Cheek
 * Triggers native camera and microphone permission prompts synchronously on user tap
 * and immediately releases physical camera hardware locks so WebRTC / Daily can
 * acquire exclusive access to the mobile Camera HAL without 'Device in use' conflicts.
 */

let inFlightPermissionPromise: Promise<{
  granted: boolean;
  hasCamera: boolean;
  hasAudio: boolean;
  stream: MediaStream | null;
  error?: string;
}> | null = null;

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
  inFlightPermissionPromise = null;
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

  // If a permission request is already in flight, wait for it instead of spawning a concurrent hardware request
  if (inFlightPermissionPromise) {
    return inFlightPermissionPromise;
  }

  const needsVideo = mode !== 'voice';

  inFlightPermissionPromise = (async () => {
    try {
      return await executeMediaRequest(needsVideo);
    } finally {
      inFlightPermissionPromise = null;
    }
  })();

  return inFlightPermissionPromise;
}

async function executeMediaRequest(needsVideo: boolean): Promise<{
  granted: boolean;
  hasCamera: boolean;
  hasAudio: boolean;
  stream: MediaStream | null;
  error?: string;
}> {
  if (needsVideo) {
    // 1. Mobile-native front camera probe
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { facingMode: 'user' }
      });
      // CRITICAL FOR MOBILE ANDROID:
      // Release hardware lock immediately so Daily's WebRTC engine can open the camera without 'Device in use' conflict!
      stream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cachedLocalStream = null;
      return { granted: true, hasCamera: true, hasAudio: true, stream: null };
    } catch (errFacing: any) {
      console.warn('triggerMediaPermissions front facingMode failed, trying generic video:', errFacing);
      if (errFacing?.name === 'NotAllowedError' || errFacing?.name === 'PermissionDeniedError') {
        return {
          granted: false,
          hasCamera: false,
          hasAudio: false,
          stream: null,
          error: 'Camera permission denied. Please allow camera access in your phone settings.'
        };
      }
    }

    // 2. Generic video fallback (any available camera on device)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true
      });
      stream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cachedLocalStream = null;
      return { granted: true, hasCamera: true, hasAudio: true, stream: null };
    } catch (errGeneric: any) {
      console.warn('triggerMediaPermissions generic video failed, trying low-res constraints:', errGeneric);
      if (errGeneric?.name === 'NotAllowedError' || errGeneric?.name === 'PermissionDeniedError') {
        return {
          granted: false,
          hasCamera: false,
          hasAudio: false,
          stream: null,
          error: 'Camera permission denied. Please allow camera access in your phone settings.'
        };
      }
    }

    // 3. Low-resolution standard constraint (handles older Android front cams)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: { width: { ideal: 640 }, height: { ideal: 480 } }
      });
      stream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cachedLocalStream = null;
      return { granted: true, hasCamera: true, hasAudio: true, stream: null };
    } catch (errLowRes) {
      console.warn('triggerMediaPermissions all video constraints failed, falling back to audio:', errLowRes);
    }

    // 4. Absolute fallback: audio-only if camera hardware is completely unavailable or blocked
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cachedLocalStream = null;
      return { granted: true, hasCamera: false, hasAudio: true, stream: null };
    } catch (audioErr: any) {
      return {
        granted: false,
        hasCamera: false,
        hasAudio: false,
        stream: null,
        error: audioErr?.message || 'Microphone and camera permissions required'
      };
    }
  } else {
    // Audio-only call
    try {
      const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioStream.getTracks().forEach(t => {
        try { t.stop(); } catch {}
      });
      cachedLocalStream = null;
      return { granted: true, hasCamera: false, hasAudio: true, stream: null };
    } catch (audioErr: any) {
      return {
        granted: false,
        hasCamera: false,
        hasAudio: false,
        stream: null,
        error: audioErr?.message || 'Microphone permission required'
      };
    }
  }
}
