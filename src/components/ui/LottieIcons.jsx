/**
 * LottieIcons.jsx
 * High-fidelity, cinematic animated icons powered by real Lottie animations
 * and self-contained Framer Motion SVG fallbacks.
 * All JSON assets are served locally from /lottie/ with 0ms network latency.
 * Zero external CDN calls — 100% offline, zero lag, zero 403 errors.
 */
import React, { memo, useState, useEffect, useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import Lottie from "lottie-react";
import { cn } from "@/lib/utils";
import { prefersReducedMotion } from "@/lib/webglQuality";

// ─────────────────────────────────────────────────────────
// LOCAL LOTTIE ASSETS (Served by Vite via public/lottie/)
// ─────────────────────────────────────────────────────────
const LOTTIE_URLS = {
  lightning: "/lottie/lightning.json",
  brain:     "/lottie/brain.json",
  doc:       "/lottie/doc.json",
  trophy:    "/lottie/trophy.json",
  flame:     "/lottie/flame.json",
  rocket:    "/lottie/rocket.json",
  upload:    "/lottie/upload.json",
  success:   "/lottie/success.json",
  loader:    "/lottie/loader.json",
  users:     "/lottie/users.json",
  bot:       "/lottie/bot.json",
  code:      "/lottie/code.json",
  payment:   "/lottie/payment.json",
  radar:     "/lottie/radar.json",
  stars:     "/lottie/stars.json",
  lock:      "/lottie/lock.json",
  crown:     "/lottie/crown.json",
  search:    "/lottie/search.json",
};

// In-memory cache so each animation JSON is parsed once and reused instantaneously
const lottieCache = {};

// Prefetch ONLY the loader to avoid blocking the initial network waterfall
if (typeof window !== "undefined") {
  fetch(LOTTIE_URLS.loader)
    .then((res) => res.ok ? res.json() : null)
    .then((json) => { if (json) lottieCache[LOTTIE_URLS.loader] = json; })
    .catch(() => {});
}

function useLottieData(url) {
  const [data, setData] = useState(lottieCache[url] || null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!url) return;
    if (lottieCache[url]) {
      setData(lottieCache[url]);
      return;
    }
    let cancelled = false;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((json) => {
        lottieCache[url] = json;
        if (!cancelled) setData(json);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      });
    return () => {
      cancelled = true;
    };
  }, [url]);

  return { data, error };
}

// ─────────────────────────────────────────────────────────
// HIGH-FIDELITY SVG FALLBACKS (Used instantly while loading / error)
// ─────────────────────────────────────────────────────────
const SvgLightning = memo(function SvgLightning({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{
          scale: [1, 1.15, 0.95, 1.1, 1],
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="lzGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="60%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#bf5fff" />
          </linearGradient>
        </defs>
        <motion.path
          d="M13 2L3 14h8l-1 8 11-12h-9l1-8z"
          fill="url(#lzGrad)"
          stroke="#ffffff"
          strokeWidth="0.8"
          animate={{ strokeOpacity: [0.3, 1, 0.3] }}
          transition={{ duration: 1.2, repeat: Infinity }}
        />
      </motion.svg>
    </div>
  );
});

const SvgBrain = memo(function SvgBrain({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{
          scale: [1, 1.08, 1],
        }}
        transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="brGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf5fff" />
            <stop offset="100%" stopColor="#00f5ff" />
          </linearGradient>
        </defs>
        <path
          d="M9.5 2A4.5 4.5 0 0 0 5 6.5c0 .4.05.8.15 1.17A4 4 0 0 0 3 11a4 4 0 0 0 1.6 3.2A4.5 4.5 0 0 0 9 19h1V2h-.5zm5 0A4.5 4.5 0 0 1 19 6.5c0 .4-.05.8-.15 1.17A4 4 0 0 1 21 11a4 4 0 0 1-1.6 3.2A4.5 4.5 0 0 1 15 19h-1V2h.5z"
          fill="url(#brGrad)"
          opacity="0.88"
        />
        <motion.circle cx="8" cy="8" r="1.2" fill="#ffffff" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <motion.circle cx="16" cy="8" r="1.2" fill="#ffffff" animate={{ opacity: [1, 0.2, 1] }} transition={{ duration: 1.4, repeat: Infinity }} />
        <motion.circle cx="8" cy="13" r="1.2" fill="#00f5ff" animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
        <motion.circle cx="16" cy="13" r="1.2" fill="#00f5ff" animate={{ opacity: [1, 0.4, 1] }} transition={{ duration: 1.8, repeat: Infinity, delay: 0.3 }} />
      </motion.svg>
    </div>
  );
});

const SvgDoc = memo(function SvgDoc({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="docG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#00f5ff" />
          </linearGradient>
        </defs>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#docG)" opacity="0.85" />
        <path d="M14 2v6h6" stroke="#ffffff" strokeWidth="1.5" />
        <motion.line x1="8" y1="13" x2="16" y2="13" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity }} />
        <motion.line x1="8" y1="17" x2="13" y2="17" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ duration: 1.2, repeat: Infinity, delay: 0.2 }} />
      </motion.svg>
    </div>
  );
});

const SvgUpload = memo(function SvgUpload({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg viewBox="0 0 24 24" fill="none" className="h-full w-full" animate={{ y: [0, -1.5, 0] }} transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}>
        <defs><linearGradient id="uploadGradient" x1="0%" y1="0%" x2="100%" y2="100%"><stop stopColor="#00f5ff" /><stop offset="1" stopColor="#bf5fff" /></linearGradient></defs>
        <path d="M6 18.5h12a3.5 3.5 0 0 0 .5-6.96A6 6 0 0 0 7.1 9.3 4.7 4.7 0 0 0 6 18.5Z" fill="url(#uploadGradient)" opacity=".82" />
        <motion.path d="M12 15V5m0 0-3.5 3.5M12 5l3.5 3.5" stroke="white" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" animate={{ y: [1.25, -1.25, 1.25] }} transition={{ duration: 1.2, repeat: Infinity, ease: "easeInOut" }} />
      </motion.svg>
    </div>
  );
});

const SvgTrophy = memo(function SvgTrophy({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{
          rotate: [-3, 3, -3],
        }}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="trG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        <path d="M6 9H4a2 2 0 0 1-2-2V5h4m12 4h2a2 2 0 0 0 2-2V5h-4" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" fill="url(#trG)" />
        <path d="M12 16v3m-4 3h8" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
      </motion.svg>
    </div>
  );
});

const SvgFlame = memo(function SvgFlame({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{
          scale: [1, 1.12, 0.96, 1.08, 1],
        }}
        transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="flG" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fde047" />
          </linearGradient>
        </defs>
        <path
          d="M12 2c.5 3-1.5 5-2 7.5S12 13 12 13s2-2 2.5-4c1.5 1.5 2.5 3.5 2.5 6a7 7 0 1 1-14 0c0-3.5 3-7 5-9 1 1.5 2 2.5 4 2.5V2z"
          fill="url(#flG)"
        />
      </motion.svg>
    </div>
  );
});

const SvgRocket = memo(function SvgRocket({ className }) {
  return (
    <div className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}>
      <motion.svg
        viewBox="0 0 24 24"
        fill="none"
        className="w-full h-full"
        animate={{
          y: [-2, 2, -2],
          x: [1, -1, 1],
          rotate: [-2, 2, -2],
        }}
        transition={{ duration: 1.6, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <linearGradient id="rktG" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#bf5fff" />
          </linearGradient>
        </defs>
        <path
          d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z"
          fill="#f97316"
        />
        <path
          d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6.05 11a22.35 22.35 0 0 1-3.95 2z"
          fill="url(#rktG)"
        />
        <circle cx="15.5" cy="8.5" r="1.5" fill="#ffffff" />
      </motion.svg>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// PLAYBACK BUDGET — visibility + concurrency gate (shared policy)
//  1) Only on-screen icons animate (IntersectionObserver).
//  2) At most MAX_PLAYING_LOTTIES instances run at once — the same slot
//     budget the future hardware-decoded MP4 loops will use: low-end Android
//     video decoders often handle only 2–3 concurrent streams before falling
//     back to slow software decoding (review warning #1).
//  3) Offscreen / over-budget = paused on a static frame — never removed.
// ─────────────────────────────────────────────────────────
const MAX_PLAYING_LOTTIES = 4;
let activePlayers = 0;
const playerQueue = [];

function requestPlayerSlot(onGranted) {
  const entry = { onGranted, granted: false };
  const release = () => {
    if (entry.granted) {
      entry.granted = false;
      activePlayers = Math.max(0, activePlayers - 1);
      pumpPlayerQueue();
    } else {
      const i = playerQueue.indexOf(entry);
      if (i >= 0) playerQueue.splice(i, 1);
    }
  };
  if (activePlayers < MAX_PLAYING_LOTTIES) {
    activePlayers += 1;
    entry.granted = true;
    onGranted();
  } else {
    playerQueue.push(entry);
  }
  return release;
}

function pumpPlayerQueue() {
  while (activePlayers < MAX_PLAYING_LOTTIES && playerQueue.length > 0) {
    const entry = playerQueue.shift();
    activePlayers += 1;
    entry.granted = true;
    entry.onGranted();
  }
}

// BASE LOTTIE COMPONENT (Seamless switch to real Lottie)
// ─────────────────────────────────────────────────────────
const LottieIcon = memo(function LottieIcon({
  url,
  className = "w-8 h-8",
  loop = true,
  glowColor = "rgba(0,245,255,0.35)",
  glowIntensity = 1,
  fallback = null,
  speed = 1,
  style = {},
}) {
  const { data, error } = useLottieData(url);
  const wrapRef = useRef(null);
  const animRef = useRef(null);
  const releaseSlotRef = useRef(null);
  const [granted, setGranted] = useState(false);
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = Boolean(shouldReduceMotion ?? prefersReducedMotion());

  // Visibility + concurrency gate (report §6 warning #1): play only when
  // on-screen AND within the shared playback budget.
  useEffect(() => {
    // When reduced motion is preferred, never take a player-budget slot
    if (reduceMotion) return;

    const el = wrapRef.current;
    const grant = () => {
      if (releaseSlotRef.current) {
        setGranted(true);
        return;
      }
      releaseSlotRef.current = requestPlayerSlot(() => setGranted(true));
    };
    const revoke = () => {
      if (releaseSlotRef.current) {
        releaseSlotRef.current();
        releaseSlotRef.current = null;
      }
      setGranted(false);
    };

    if (!el || typeof IntersectionObserver === "undefined") {
      grant();
      return revoke;
    }

    let inView = false;
    const io = new IntersectionObserver(
      ([entry]) => {
        inView = entry.isIntersecting;
        if (inView) grant();
        else revoke();
      },
      { rootMargin: "64px" },
    );
    io.observe(el);

    const onVisibility = () => {
      // revoke() — NOT setGranted(false): only revoke decrements the shared
      // player budget. Without it a hidden tab keeps holding its slots and
      // starves every icon that mounts afterwards (AGY_ANIMATION_REVIEW.md §8.1).
      if (document.hidden) revoke();
      else if (inView) grant();
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      io.disconnect();
      document.removeEventListener("visibilitychange", onVisibility);
      revoke();
    };
  // `data` is required here: the first render shows the instant SVG fallback,
  // then the real Lottie canvas mounts after its JSON arrives. Without it the
  // observer never attaches to that newly-mounted canvas and autoplay remains
  // paused forever.
  }, [reduceMotion, data]);

  // Drive the Lottie instance from the gate (autoplay stays off).
  useEffect(() => {
    const anim = animRef.current;
    if (!anim) return;
    if (reduceMotion) {
      anim.goToAndStop?.(0, true);
      anim.pause?.();
      return;
    }
    if (granted) anim.play?.();
    else anim.pause?.();
  }, [granted, data, reduceMotion]);

  if (error || (!data && fallback)) {
    return fallback;
  }

  if (!data) {
    return fallback || (
      <div
        className={cn("rounded-xl animate-pulse", className)}
        style={{
          background: "linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.1) 50%, rgba(255,255,255,0.04) 100%)",
          ...style,
        }}
      />
    );
  }

  return (
    <motion.div
      ref={wrapRef}
      className={cn("relative inline-flex items-center justify-center select-none pointer-events-none", className)}
      style={{ ...style, filter: `drop-shadow(0 0 ${4 * glowIntensity}px ${glowColor})` }}
    >
      <Lottie
        lottieRef={animRef}
        animationData={data}
        loop={loop}
        autoplay={false}
        renderer="canvas"
        style={{ width: "100%", height: "100%" }}
        speed={speed}
        onDOMLoaded={() => {
          if (reduceMotion) {
            animRef.current?.goToAndStop?.(0, true);
            animRef.current?.pause?.();
          }
        }}
      />
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// EXPORTED ICON COMPONENTS (Used across app & Landing page)
// ─────────────────────────────────────────────────────────

/** ⚡ Electric Lightning Animation */
export const LottieLightning = memo(function LottieLightning({ className = "w-8 h-8", loop = true, style }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.lightning}
      className={className}
      style={style}
      fallback={<SvgLightning className={className} />}
      glowColor="rgba(0,245,255,0.6)"
      glowIntensity={1.4}
      speed={1.2}
    />
  );
});

/** 🧠 Synaptic AI Brain Animation */
export const LottieBrain = memo(function LottieBrain({ className = "w-8 h-8", loop = true, style }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.brain}
      className={className}
      style={style}
      fallback={<SvgBrain className={className} />}
      glowColor="rgba(168,85,247,0.6)"
      glowIntensity={1.3}
    />
  );
});

/** 📄 Document Scanning Animation */
export const LottieDoc = memo(function LottieDoc({ className = "w-8 h-8", loop = true, style }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.doc}
      className={className}
      style={style}
      fallback={<SvgDoc className={className} />}
      glowColor="rgba(56,189,248,0.55)"
      glowIntensity={1.1}
    />
  );
});

/** 🏆 Championship Trophy Animation */
export const LottieTrophy = memo(function LottieTrophy({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.trophy}
      className={className}
      style={style}
      fallback={<SvgTrophy className={className} />}
      glowColor="rgba(255,200,0,0.6)"
      glowIntensity={1.5}
    />
  );
});

/** 🔥 Fire / Daily Streak Animation */
export const LottieFlame = memo(function LottieFlame({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.flame}
      className={className}
      style={style}
      fallback={<SvgFlame className={className} />}
      glowColor="rgba(249,115,22,0.6)"
      glowIntensity={1.4}
      speed={1.1}
    />
  );
});

/** 🚀 Rocket / Launch Animation */
export const LottieRocket = memo(function LottieRocket({ className = "w-8 h-8", loop = true, style }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.rocket}
      className={className}
      style={style}
      fallback={<SvgRocket className={className} />}
      glowColor="rgba(0,245,255,0.55)"
      glowIntensity={1.3}
      speed={0.9}
    />
  );
});

/** ☁️ Cloud Upload Animation */
export const LottieUpload = memo(function LottieUpload({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.upload}
      className={className}
      style={style}
      fallback={<SvgUpload className={className} />}
      glowColor="rgba(0,245,255,0.5)"
      glowIntensity={1.1}
    />
  );
});

/** ✅ Success / Celebration Animation */
export const LottieSuccess = memo(function LottieSuccess({ className = "w-8 h-8", loop = true, style }) {
  return (
    <LottieIcon
      url={LOTTIE_URLS.success}
      className={className}
      style={style}
      loop={loop}
      glowColor="rgba(16,185,129,0.55)"
      glowIntensity={1.3}
    />
  );
});

/** 🔄 Modern Quantum Loader */
export const LottieLoader = memo(function LottieLoader({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.loader}
      className={className}
      style={style}
      glowColor="rgba(0,245,255,0.5)"
      glowIntensity={1.1}
      speed={1.3}
    />
  );
});

/** 👥 Users / Community Animation */
export const LottieUsers = memo(function LottieUsers({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.users}
      className={className}
      style={style}
      glowColor="rgba(255,200,0,0.5)"
      glowIntensity={1.1}
    />
  );
});

/** 🤖 Futuristic Robot Assistant Animation */
export const LottieBot = memo(function LottieBot({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.bot}
      className={className}
      style={style}
      glowColor="rgba(0,245,255,0.55)"
      glowIntensity={1.2}
    />
  );
});

/** 💻 Cyber Code Animation */
export const LottieCode = memo(function LottieCode({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.code}
      className={className}
      style={style}
      glowColor="rgba(56,189,248,0.5)"
      glowIntensity={1.1}
    />
  );
});

/** 💳 Payment / Token Wallet Animation */
export const LottiePayment = memo(function LottiePayment({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.payment}
      className={className}
      style={style}
      glowColor="rgba(34,197,94,0.55)"
      glowIntensity={1.2}
    />
  );
});

/** 📡 Radar Telemetry Animation */
export const LottieRadar = memo(function LottieRadar({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.radar}
      className={className}
      style={style}
      glowColor="rgba(0,245,255,0.5)"
      glowIntensity={1.2}
    />
  );
});

/** ⭐ Sparkles / XP Reward Animation */
export const LottieStars = memo(function LottieStars({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.stars}
      className={className}
      style={style}
      glowColor="rgba(255,200,0,0.55)"
      glowIntensity={1.2}
    />
  );
});

/** 🔒 Cyber Security Lock Animation */
export const LottieLock = memo(function LottieLock({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.lock}
      className={className}
      style={style}
      glowColor="rgba(0,245,255,0.5)"
      glowIntensity={1.1}
    />
  );
});

/** 👑 Imperial Golden Crown Animation */
export const LottieCrown = memo(function LottieCrown({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.crown}
      className={className}
      style={style}
      glowColor="rgba(255,200,0,0.6)"
      glowIntensity={1.4}
    />
  );
});

/** 🔍 Quantum Search Radar Animation */
export const LottieSearch = memo(function LottieSearch({ className = "w-8 h-8", style, loop = true }) {
  return (
    <LottieIcon
      loop={loop}
      url={LOTTIE_URLS.search}
      className={className}
      style={style}
      glowColor="rgba(0,245,255,0.45)"
      glowIntensity={1}
    />
  );
});
