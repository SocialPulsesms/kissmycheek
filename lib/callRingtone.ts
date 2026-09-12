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
   * Incoming Luxury Ringtone (Played for Callee on incoming call)
   * Elegant, melodic luxury crystal chime chord sequence (E5, G#5, B5, E6)
   */
  public startIncomingRingtone(): () => void {
    const ctx = this.getAudioContext();
    if (!ctx) return () => {};

    let isPlaying = true;
    let intervalTimer: any = null;

    const playMelodicChime = () => {
      if (!isPlaying || !ctx || ctx.state === 'closed') return;

      try {
        const notes = [
          { freq: 659.25, time: 0.0, dur: 0.3 },   // E5
          { freq: 830.61, time: 0.18, dur: 0.3 },  // G#5
          { freq: 987.77, time: 0.36, dur: 0.35 }, // B5
          { freq: 1318.51, time: 0.54, dur: 0.6 }  // E6
        ];

        const masterGain = ctx.createGain();
        masterGain.gain.setValueAtTime(0.2, ctx.currentTime);
        masterGain.connect(ctx.destination);

        notes.forEach(note => {
          const osc = ctx.createOscillator();
          const noteGain = ctx.createGain();

          osc.type = 'triangle';
          const startTime = ctx.currentTime + note.time;
          const stopTime = startTime + note.dur;

          osc.frequency.setValueAtTime(note.freq, startTime);

          noteGain.gain.setValueAtTime(0.0001, startTime);
          noteGain.gain.exponentialRampToValueAtTime(0.25, startTime + 0.04);
          noteGain.gain.exponentialRampToValueAtTime(0.0001, stopTime);

          osc.connect(noteGain);
          noteGain.connect(masterGain);

          osc.start(startTime);
          osc.stop(stopTime + 0.05);
        });

        // Loop melodic chime every 2.4s
        intervalTimer = setTimeout(() => {
          if (isPlaying) {
            playMelodicChime();
          }
        }, 2400);
      } catch (err) {
        console.warn('Incoming ringtone error:', err);
      }
    };

    playMelodicChime();

    return () => {
      isPlaying = false;
      if (intervalTimer) clearTimeout(intervalTimer);
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
