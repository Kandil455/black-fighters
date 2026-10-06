/**
 * soundSynthesizer.js
 * Crystal-clear, zero-dependency Web Audio API synthesizer for Black Fighters.
 * Works 100% offline and respects user sound settings and reduced motion.
 */

class SoundSynthesizer {
  constructor() {
    this.ctx = null;
    this.enabled = true;
    this.volume = 0.35; // Gentle default volume
    this.initSettings();
    this.registerGestureUnlock();
  }

  initSettings() {
    if (typeof window === "undefined") return;
    try {
      const saved = localStorage.getItem("sound_effects_enabled");
      this.enabled = saved !== "false";
    } catch {
      this.enabled = true;
    }
  }

  getAudioContext() {
    if (typeof window === "undefined") return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        try {
          this.ctx = new AudioCtx();
        } catch {
          this.ctx = null;
        }
      }
    }
    if (this.ctx && this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    // Chrome autoplay policy: a context created before any user gesture stays
    // "suspended" and every play attempt warns loudly. Return null until the
    // context is actually runnable — every play* caller already guards on a
    // null context, so pre-gesture calls become silent no-ops instead of
    // console errors (playSwoosh fires on route changes before any click).
    return this.ctx && this.ctx.state === "running" ? this.ctx : null;
  }

  /**
   * One-time gesture listeners that create + resume the context on the FIRST
   * pointer/key/touch. After that, every play* call works instantly. The
   * listeners stay registered so a context that gets re-suspended (iOS tab
   * backgrounding) unlocks again on the next gesture.
   */
  registerGestureUnlock() {
    if (typeof window === "undefined") return;
    const unlock = () => {
      this.getAudioContext();
      if (this.ctx && this.ctx.state === "suspended") {
        this.ctx.resume().catch(() => {});
      }
    };
    const opts = { passive: true };
    window.addEventListener("pointerdown", unlock, opts);
    window.addEventListener("keydown", unlock, opts);
    window.addEventListener("touchend", unlock, opts);
  }

  setEnabled(val) {
    this.enabled = Boolean(val);
    try {
      localStorage.setItem("sound_effects_enabled", String(this.enabled));
    } catch {}
  }

  // 1. Button Press: Subtly crisp, short "pop"
  playPress() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(420, now);
      osc.frequency.exponentialRampToValueAtTime(180, now + 0.04);

      gain.gain.setValueAtTime(this.volume * 0.4, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.045);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.05);
    } catch {}
  }

  // 2. Quiz Correct Answer: Sweet ascending chord (C5 -> E5 -> G5)
  playCorrectChime() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.06;

        osc.type = "triangle";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(this.volume * 0.6, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + 0.28);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + 0.3);
      });
    } catch {}
  }

  // 3. Quiz Wrong Answer: Soft, non-jarring low buzz (F#3 -> E3)
  playWrongBuzz() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(185, now);
      osc.frequency.linearRampToValueAtTime(155, now + 0.18);

      gain.gain.setValueAtTime(this.volume * 0.35, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      // Low pass filter to make the sawtooth warm and non-annoying
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(450, now);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // 4. Level Up / New Badge: Short celebration fanfare
  playLevelUpFanfare() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const notes = [440, 554.37, 659.25, 880]; // A4, C#5, E5, A5
      notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const start = ctx.currentTime + idx * 0.08;
        const duration = idx === 3 ? 0.45 : 0.15;

        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, start);

        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(this.volume * 0.7, start + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.001, start + duration);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start(start);
        osc.stop(start + duration + 0.05);
      });
    } catch {}
  }

  // 5. Streak Increment: Energetic airy "whoosh"
  playStreakWhoosh() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(this.volume * 0.5, now + 0.06);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.2);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.22);
    } catch {}
  }

  // 6. Notification / Subtle click: Neutral wood-tap sound
  playNotification() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      const now = ctx.currentTime;

      osc.type = "sine";
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.06);

      gain.gain.setValueAtTime(this.volume * 0.3, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.065);

      osc.connect(gain);
      gain.connect(ctx.destination);

      osc.start(now);
      osc.stop(now + 0.07);
    } catch {}
  }

  // 7. Blade Slash: High metallic unsheathe + violent air slice impact
  playBladeSlash() {
    if (!this.enabled) return;
    const ctx = this.getAudioContext();
    if (!ctx) return;

    try {
      const now = ctx.currentTime;

      // Layer A: High-pitched metallic ring / blade slice
      const metalOsc = ctx.createOscillator();
      const metalGain = ctx.createGain();
      metalOsc.type = "sawtooth";
      metalOsc.frequency.setValueAtTime(2400, now);
      metalOsc.frequency.exponentialRampToValueAtTime(320, now + 0.28);

      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(1800, now);
      filter.Q.setValueAtTime(6, now);

      metalGain.gain.setValueAtTime(this.volume * 0.7, now);
      metalGain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);

      metalOsc.connect(filter);
      filter.connect(metalGain);
      metalGain.connect(ctx.destination);
      metalOsc.start(now);
      metalOsc.stop(now + 0.32);

      // Layer B: Heavy air whoosh & sub impact
      const whooshOsc = ctx.createOscillator();
      const whooshGain = ctx.createGain();
      whooshOsc.type = "triangle";
      whooshOsc.frequency.setValueAtTime(350, now);
      whooshOsc.frequency.exponentialRampToValueAtTime(60, now + 0.35);

      whooshGain.gain.setValueAtTime(this.volume * 0.85, now);
      whooshGain.gain.exponentialRampToValueAtTime(0.001, now + 0.4);

      whooshOsc.connect(whooshGain);
      whooshGain.connect(ctx.destination);
      whooshOsc.start(now);
      whooshOsc.stop(now + 0.42);
    } catch {}
  }
}

export const sound = new SoundSynthesizer();
export default sound;
