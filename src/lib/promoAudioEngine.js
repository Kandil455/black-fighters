/**
 * src/lib/promoAudioEngine.js
 * ─────────────────────────────────────────────────────────────────────────────
 * High-energy Web Audio API Cinematic Sound & Upbeat Synth Synthesizer
 * + Gemini Omni 1.1 Flash Audio / Egyptian Arabic (ar-EG) Voiceover Engine.
 */

class PromoAudioEngine {
  constructor() {
    this.ctx = null;
    this.isMuted = false;
    this.isPlayingMusic = false;
    this.musicTimer = null;
    this.masterGain = null;
    this.stepIndex = 0;
    this.omniAudioCache = new Map();
    this.activeHtmlAudio = null;
  }

  init() {
    if (typeof window === "undefined") return false;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (!AudioCtx) return false;
      this.ctx = new AudioCtx();
      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : 0.3;
      this.masterGain.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume().catch(() => {});
    }
    return true;
  }

  setMuted(muted) {
    this.isMuted = Boolean(muted);
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : 0.3,
        this.ctx.currentTime,
        0.05
      );
    }
    if (this.isMuted) {
      if (this.activeHtmlAudio) {
        try {
          this.activeHtmlAudio.pause();
        } catch {}
      }
      if (typeof window !== "undefined" && window.speechSynthesis) {
        try {
          window.speechSynthesis.cancel();
        } catch {}
      }
    }
  }

  /**
   * Plays a fast, punchy kinetic whoosh + sub-bass drop on scene transition.
   */
  playSceneTransition() {
    if (this.isMuted || !this.init()) return;
    try {
      const now = this.ctx.currentTime;

      // Fast punchy sub-bass drop
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(140, now);
      osc.frequency.exponentialRampToValueAtTime(38, now + 0.32);

      gain.gain.setValueAtTime(0.48, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.36);

      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.38);

      // Rising electric arpeggio sweep
      const freqs = [587.33, 783.99, 987.77, 1174.66];
      freqs.forEach((f, idx) => {
        const sOsc = this.ctx.createOscillator();
        const sGain = this.ctx.createGain();
        sOsc.type = "triangle";
        sOsc.frequency.setValueAtTime(f, now + idx * 0.022);
        sGain.gain.setValueAtTime(0.09, now + idx * 0.022);
        sGain.gain.exponentialRampToValueAtTime(0.001, now + 0.25 + idx * 0.025);
        sOsc.connect(sGain);
        sGain.connect(this.masterGain);
        sOsc.start(now + idx * 0.022);
        sOsc.stop(now + 0.28 + idx * 0.025);
      });
    } catch {}
  }

  /**
   * Plays a crisp micro-tick for sub-step UI animations inside each scene.
   */
  playSubBeatTick() {
    if (this.isMuted || !this.init()) return;
    try {
      const now = this.ctx.currentTime;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = "sine";
      osc.frequency.setValueAtTime(1320, now);
      osc.frequency.exponentialRampToValueAtTime(660, now + 0.045);
      gain.gain.setValueAtTime(0.04, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.05);
      osc.connect(gain);
      gain.connect(this.masterGain);
      osc.start(now);
      osc.stop(now + 0.055);
    } catch {}
  }

  /**
   * Plays a crisp UI confirmation / cache-hit chime.
   */
  playSuccessChime() {
    if (this.isMuted || !this.init()) return;
    try {
      const now = this.ctx.currentTime;
      const notes = [659.25, 987.77, 1318.51];
      notes.forEach((freq, i) => {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(freq, now + i * 0.045);
        gain.gain.setValueAtTime(0.16, now + i * 0.045);
        gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.045 + 0.24);
        osc.connect(gain);
        gain.connect(this.masterGain);
        osc.start(now + i * 0.045);
        osc.stop(now + i * 0.045 + 0.26);
      });
    } catch {}
  }

  /**
   * Starts a fast, hype synthwave arpeggio bed (165ms per 16th note).
   */
  startBackgroundMusic() {
    if (this.isPlayingMusic) return;
    if (!this.init()) return;
    this.isPlayingMusic = true;
    this.stepIndex = 0;

    const progression = [
      [146.83, 220.0, 293.66, 349.23, 440.0, 587.33, 440.0, 349.23],
      [116.54, 174.61, 233.08, 293.66, 349.23, 466.16, 349.23, 293.66],
      [130.81, 196.0, 261.63, 329.63, 392.0, 523.25, 392.0, 329.63],
      [110.0, 164.81, 220.0, 277.18, 329.63, 440.0, 329.63, 277.18],
    ];

    const playStep = () => {
      if (!this.isPlayingMusic) return;
      if (!this.isMuted && this.ctx && this.ctx.state === "running") {
        try {
          const now = this.ctx.currentTime;
          const bar = Math.floor(this.stepIndex / 8) % progression.length;
          const beat = this.stepIndex % 8;
          const freq = progression[bar][beat];

          // Fast synth pluck
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          osc.type = beat % 2 === 0 ? "sawtooth" : "triangle";
          osc.frequency.setValueAtTime(freq, now);

          const noteVol = beat === 0 ? 0.1 : beat === 4 ? 0.08 : 0.05;
          gain.gain.setValueAtTime(noteVol, now);
          gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

          osc.connect(gain);
          gain.connect(this.masterGain);
          osc.start(now);
          osc.stop(now + 0.16);

          // Punchy sub-bass kick on beat 0 and beat 4
          if (beat === 0 || beat === 4) {
            const bass = this.ctx.createOscillator();
            const bassGain = this.ctx.createGain();
            bass.type = "sine";
            bass.frequency.setValueAtTime(freq * 0.5, now);
            bass.frequency.exponentialRampToValueAtTime(42, now + 0.25);
            bassGain.gain.setValueAtTime(0.18, now);
            bassGain.gain.exponentialRampToValueAtTime(0.002, now + 0.28);
            bass.connect(bassGain);
            bassGain.connect(this.masterGain);
            bass.start(now);
            bass.stop(now + 0.3);
          }
        } catch {}
      }
      this.stepIndex += 1;
      this.musicTimer = setTimeout(playStep, 165);
    };

    playStep();
  }

  stopBackgroundMusic() {
    this.isPlayingMusic = false;
    if (this.musicTimer) {
      clearTimeout(this.musicTimer);
      this.musicTimer = null;
    }
  }

  /**
   * Speaks synchronized voiceover narration for the active scene.
   * Uses gemini-omni-1.1-flash audio when cached/available, with instant Egyptian Arabic SpeechSynthesis fallback.
   */
  async speakNarration(text, lang = "ar", sceneId = "upload-cache") {
    if (this.isMuted || typeof window === "undefined") return;

    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio = null;
      } catch {}
    }
    if (window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }

    const cacheKey = `${lang}:${sceneId}:${text}`;

    // If we already cached Gemini Omni 1.1 Flash audio for this scene, play it immediately
    if (this.omniAudioCache.has(cacheKey)) {
      const dataUrl = this.omniAudioCache.get(cacheKey);
      try {
        const audio = new Audio(dataUrl);
        audio.volume = 0.95;
        this.activeHtmlAudio = audio;
        await audio.play();
        return;
      } catch {}
    }

    // Speak immediately via browser SpeechSynthesis (Egyptian Arabic ar-EG prioritized) so there is zero latency
    this.speakBrowserSynthesis(text, lang);

    // Asynchronously pre-warm Gemini Omni 1.1 Flash audio into cache for subsequent loops
    if (lang === "ar") {
      fetch("/api/promo-omni", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "tts", sceneId, text }),
      })
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (data?.ok && data?.audioBase64) {
            const mime = data.mimeType || "audio/wav";
            this.omniAudioCache.set(cacheKey, `data:${mime};base64,${data.audioBase64}`);
          }
        })
        .catch(() => {});
    }
  }

  speakBrowserSynthesis(text, lang = "ar") {
    if (this.isMuted || typeof window === "undefined" || !window.speechSynthesis) return;
    try {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.lang = lang === "ar" ? "ar-EG" : "en-US";
      utterance.rate = lang === "ar" ? 1.18 : 1.12;
      utterance.pitch = 1.04;
      utterance.volume = 0.96;

      const voices = window.speechSynthesis.getVoices?.() || [];
      if (lang === "ar") {
        const egVoice =
          voices.find((v) => /ar[-_]?eg/i.test(v.lang)) ||
          voices.find(
            (v) =>
              v.lang?.toLowerCase().startsWith("ar") &&
              /hoda|salma|shakir|google|natural|microsoft/i.test(v.name)
          ) ||
          voices.find((v) => v.lang?.toLowerCase().startsWith("ar"));
        if (egVoice) utterance.voice = egVoice;
      } else {
        const enVoice =
          voices.find(
            (v) =>
              v.lang?.toLowerCase().startsWith("en") &&
              /natural|google|premium|enhanced/i.test(v.name)
          ) || voices.find((v) => v.lang?.toLowerCase().startsWith("en"));
        if (enVoice) utterance.voice = enVoice;
      }

      window.speechSynthesis.speak(utterance);
    } catch {}
  }

  stopAll() {
    this.stopBackgroundMusic();
    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio = null;
      } catch {}
    }
    if (typeof window !== "undefined" && window.speechSynthesis) {
      try {
        window.speechSynthesis.cancel();
      } catch {}
    }
  }
}

export const promoAudio = new PromoAudioEngine();
