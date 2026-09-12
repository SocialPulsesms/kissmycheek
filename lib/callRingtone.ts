// Web Audio API Ringtone & Audio Signal Synthesizer
// Provides crystal-clear, zero-latency authentic ringing tones without external audio file dependencies

class CallRingtoneManager {
  private audioCtx: AudioContext | null = null;

  private getAudioContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;
    try {
      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          this.audioCtx = new AudioContextClass();
        }
      }
      if (this.audioCtx && this.audioCtx.state === 'suspended') {
        this.audioCtx.resume().catch(() => {});
      }
      return this.audioCtx;
    } catch {
      return null;
    }
  }

  /**
   * Outgoing Ringback Tone (Played for the Caller while waiting for partner to answer)
   * Dual frequencies 440Hz + 480Hz with 1.6s burst and 2.4s silence cadence.
   */
  public startOutgoingRingback(): () => void {
    const ctx = this.getAudioContext();
    if (!ctx) return () => {};

    let isPlaying = true;
    let timer: any = null;
    let currentOsc1: OscillatorNode | null = null;
    let currentOsc2: OscillatorNode | null = null;
    let currentGain: GainNode | null = null;

    const playToneBurst = () => {
      if (!isPlaying || !ctx || ctx.state === 'closed') return;

      try {
        const now = ctx.currentTime;
        const gainNode = ctx.createGain();
        currentGain = gainNode;

        // Subtle soft volume (0.12)
        gainNode.gain.setValueAtTime(0.0001, now);
        gainNode.gain.exponentialRampToValueAtTime(0.12, now + 0.08);
        gainNode.gain.setValueAtTime(0.12, now + 1.4);
        gainNode.gain.exponentialRampToValueAtTime(0.0001, now + 1.55);

        // Standard North American / European telephone ringback frequencies
        const osc1 = ctx.createOscillator();
        const osc2 = ctx.createOscillator();
        currentOsc1 = osc1;
        currentOsc2 = osc2;

        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(440, now);

        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(480, now);

        osc1.connect(gainNode);
        osc2.connect(gainNode);
        gainNode.connect(ctx.destination);

        osc1.start(now);
        osc2.start(now);
        osc1.stop(now + 1.6);
        osc2.stop(now + 1.6);

        // Schedule next burst after 3.8s total cycle
        timer = setTimeout(() => {
          if (isPlaying) {
            playToneBurst();
          }
        }, 3800);
      } catch (err) {
        console.warn('Ringback tone error:', err);
      }
    };

    playToneBurst();

    return () => {
      isPlaying = false;
      if (timer) clearTimeout(timer);
      try {
        if (currentGain && ctx && ctx.state !== 'closed') {
          currentGain.gain.cancelScheduledValues(ctx.currentTime);
          currentGain.gain.setValueAtTime(0.0001, ctx.currentTime);
        }
        if (currentOsc1) {
          try { currentOsc1.stop(); } catch {}
        }
        if (currentOsc2) {
          try { currentOsc2.stop(); } catch {}
        }
      } catch {}
    };
  }

  /**
   * Synthesize a standalone PCM WAV audio Blob URL for background audio playback
   */
  private generateChimeWavUrl(): string | null {
    if (typeof window === 'undefined') return null;
    try {
      const sampleRate = 22050;
      const duration = 2.4;
      const numSamples = Math.floor(sampleRate * duration);
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      const writeStr = (offset: number, s: string) => {
        for (let i = 0; i < s.length; i++) view.setUint8(offset + i, s.charCodeAt(i));
      };

      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true); // PCM
      view.setUint16(22, 1, true); // Mono
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeStr(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      // Notes: E5 (659Hz), G#5 (830Hz), B5 (987Hz), E6 (1318Hz)
      const notes = [
        { freq: 659.25, start: 0.0, dur: 0.35 },
        { freq: 830.61, start: 0.18, dur: 0.35 },
        { freq: 987.77, start: 0.36, dur: 0.4 },
        { freq: 1318.51, start: 0.54, dur: 0.7 }
      ];

      for (let i = 0; i < numSamples; i++) {
        const t = i / sampleRate;
        let sample = 0;
        for (const n of notes) {
          if (t >= n.start && t < n.start + n.dur) {
            const dt = t - n.start;
            const env = Math.exp(-dt * 4.5);
            sample += Math.sin(2 * Math.PI * n.freq * dt) * env * 0.35;
          }
        }
        const clamped = Math.max(-1, Math.min(1, sample));
        view.setInt16(44 + i * 2, clamped * 32767, true);
      }

      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch {
      return null;
    }
  }

  /**
   * Incoming Luxury Ringtone (Played for Callee on incoming call)
   * Plays crystal-clear chime with HTML5 background audio & continuous vibration
   */
  public startIncomingRingtone(): () => void {
    let isPlaying = true;
    let intervalTimer: any = null;
    let bgAudio: HTMLAudioElement | null = null;
    let blobUrl: string | null = null;

    // 1. Start background-compatible HTML5 Audio loop
    try {
      blobUrl = this.generateChimeWavUrl();
      if (blobUrl) {
        bgAudio = new Audio(blobUrl);
        bgAudio.loop = true;
        bgAudio.volume = 1.0;
        bgAudio.play().catch(() => {});
      }
    } catch {}

    // 2. Start phone vibration cadence (1s vibrate, 0.5s pause)
    const triggerVibration = () => {
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate([1000, 500, 1000, 500, 1000, 500]);
        } catch {}
      }
    };
    triggerVibration();

    // 3. Concurrently run Web Audio chime for rich spatial acoustics
    const ctx = this.getAudioContext();
    const playMelodicChime = () => {
      if (!isPlaying) return;
      triggerVibration();

      if (ctx && ctx.state !== 'closed') {
        try {
          if (ctx.state === 'suspended') {
            ctx.resume().catch(() => {});
          }

          const notes = [
            { freq: 659.25, time: 0.0, dur: 0.3 },
            { freq: 830.61, time: 0.18, dur: 0.3 },
            { freq: 987.77, time: 0.36, dur: 0.35 },
            { freq: 1318.51, time: 0.54, dur: 0.6 }
          ];

          const masterGain = ctx.createGain();
          masterGain.gain.setValueAtTime(0.25, ctx.currentTime);
          masterGain.connect(ctx.destination);

          notes.forEach(note => {
            const osc = ctx.createOscillator();
            const noteGain = ctx.createGain();

            osc.type = 'triangle';
            const startTime = ctx.currentTime + note.time;
            const stopTime = startTime + note.dur;

            osc.frequency.setValueAtTime(note.freq, startTime);

            noteGain.gain.setValueAtTime(0.0001, startTime);
            noteGain.gain.exponentialRampToValueAtTime(0.3, startTime + 0.04);
            noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

            osc.connect(noteGain);
            noteGain.connect(masterGain);

            osc.start(startTime);
            osc.stop(stopTime + 0.05);
          });
        } catch {}
      }

      intervalTimer = setTimeout(() => {
        if (isPlaying) {
          playMelodicChime();
        }
      }, 2400);
    };

    // If HTML audio failed to play, fall back to Web Audio interval loop
    if (!bgAudio) {
      playMelodicChime();
    } else {
      // Still start chime interval for vibration cadence
      intervalTimer = setInterval(triggerVibration, 2400);
    }

    return () => {
      isPlaying = false;
      if (intervalTimer) {
        clearTimeout(intervalTimer);
        clearInterval(intervalTimer);
      }
      if (bgAudio) {
        try {
          bgAudio.pause();
          bgAudio.currentTime = 0;
        } catch {}
      }
      if (blobUrl) {
        try {
          URL.revokeObjectURL(blobUrl);
        } catch {}
      }
      if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
        try {
          navigator.vibrate(0);
        } catch {}
      }
    };
  }

  /**
   * Call Disconnect / End Tone
   */
  public playCallEndTone() {
    const ctx = this.getAudioContext();
    if (!ctx) return;
    try {
      const now = ctx.currentTime;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();

      osc.type = 'sine';
      osc.frequency.setValueAtTime(480, now);
      osc.frequency.setValueAtTime(320, now + 0.12);

      gain.gain.setValueAtTime(0.15, now);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.3);
    } catch {}
  }
}

export const callRingtone = new CallRingtoneManager();
