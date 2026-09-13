/**
 * Media Permissions Utility for Kiss My Cheek
 * Triggers native camera and microphone prompts synchronously on user tap.
 */

export async function triggerMediaPermissions(mode: 'voice' | 'video' = 'video'): Promise<{
  granted: boolean;
  hasCamera: boolean;
  hasAudio: boolean;
  error?: string;
}> {
  if (typeof window === 'undefined' || !navigator?.mediaDevices?.getUserMedia) {
    return { granted: false, hasCamera: false, hasAudio: false, error: 'MediaDevices not supported' };
  }

  const needsVideo = mode !== 'voice';

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

    // 2. Stop temporary tracks immediately so Daily.co can bind directly to hardware
    stream.getTracks().forEach(track => {
      try {
        track.stop();
      } catch {}
    });

    return { granted: true, hasCamera: needsVideo, hasAudio: true };
  } catch (err: any) {
    console.warn('triggerMediaPermissions primary request:', err);

    // Fallback: If video failed (e.g. camera busy or user restricted camera), try audio-only
    if (needsVideo) {
      try {
        const audioStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        audioStream.getTracks().forEach(t => t.stop());
        return { granted: true, hasCamera: false, hasAudio: true };
      } catch (audioErr: any) {
        return { granted: false, hasCamera: false, hasAudio: false, error: audioErr?.message || err?.message };
      }
    }

    return { granted: false, hasCamera: false, hasAudio: false, error: err?.message };
  }
}
