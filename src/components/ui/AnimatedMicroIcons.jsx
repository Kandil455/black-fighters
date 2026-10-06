/**
 * AnimatedMicroIcons.jsx
 * High-performance, clean micro-animations for Black Fighters Study Platform.
 * Elegant vector SVGs with gentle CSS/Framer Motion transforms.
 * Designed for crisp dark UI without heavy GPU drop-shadow stacks.
 */
import React, { memo } from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

// ─────────────────────────────────────────────────────────
// ⚡ LIGHTNING — electric bolt
// ─────────────────────────────────────────────────────────
/**
 * Every icon accepts `animated = true`. List/grid contexts (course-card
 * badges, sidebar nav — dozens of instances) MUST pass `animated={false}`:
 * an infinite framer keyframe per instance never settles, so the page is
 * never idle and the compositor budget dies (measured Dashboard asymmetry
 * vs Landing). `animated={false}` = same SVG, static glow, zero motion.
 */
export const AnimatedLightning = memo(function AnimatedLightning({ size = 20, className = "", animated = true }) {
  return (
    <motion.div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 6px rgba(0,245,255,0.55))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.08, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amLg-v3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#38bdf8" />
          </linearGradient>
        </defs>
        <path d="M13 2L3 14h8l-1 8 11-12h-9l1-8z" fill="url(#amLg-v3)" stroke="rgba(255,255,255,0.3)" strokeWidth="0.5" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🧠 BRAIN — neural pulse
// ─────────────────────────────────────────────────────────
export const AnimatedBrain = memo(function AnimatedBrain({ size = 20, className = "", animated = true }) {
  const nodes = [
    { cx: 8, cy: 7, r: 1, delay: 0 },
    { cx: 16, cy: 7, r: 1, delay: 0.3 },
    { cx: 7, cy: 12, r: 0.8, delay: 0.6 },
    { cx: 17, cy: 12, r: 0.8, delay: 0.9 },
  ];
  return (
    <motion.div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 5px rgba(191,95,255,0.6))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.06, 1] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amBr-v3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#bf5fff" />
            <stop offset="100%" stopColor="#00f5ff" />
          </linearGradient>
        </defs>
        <path
          d="M9.5 2A4.5 4.5 0 0 0 5 6.5c0 .4.05.8.15 1.17A4 4 0 0 0 3 11a4 4 0 0 0 1.6 3.2A4.5 4.5 0 0 0 9 19h1V2h-.5zm5 0A4.5 4.5 0 0 1 19 6.5c0 .4-.05.8-.15 1.17A4 4 0 0 1 21 11a4 4 0 0 1-1.6 3.2A4.5 4.5 0 0 1 15 19h-1V2h.5z"
          fill="url(#amBr-v3)"
          opacity="0.9"
        />
        {nodes.map((n, i) => (
          <motion.circle
            key={i}
            cx={n.cx}
            cy={n.cy}
            r={n.r}
            fill="#ffffff"
            animate={{ opacity: [0.3, 1, 0.3] }}
            transition={{ duration: 1.8, repeat: Infinity, delay: n.delay, ease: "easeInOut" }}
          />
        ))}
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 📄 DOCUMENT — with gentle floating
// ─────────────────────────────────────────────────────────
export const AnimatedDocument = memo(function AnimatedDocument({ size = 20, className = "", animated = true }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ y: [0, -2, 0] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amDoc-v3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#38bdf8" />
            <stop offset="100%" stopColor="#0284c7" />
          </linearGradient>
        </defs>
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" fill="url(#amDoc-v3)" opacity="0.9" />
        <path d="M14 2v6h6" stroke="rgba(255,255,255,0.7)" strokeWidth="1.5" />
        <line x1={8} y1={13} x2={16} y2={13} stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
        <line x1={8} y1={17} x2={13} y2={17} stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.7" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🏆 TROPHY — subtle swing
// ─────────────────────────────────────────────────────────
export const AnimatedTrophy = memo(function AnimatedTrophy({ size = 20, className = "", animated = true }) {
  return (
    <motion.div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 6px rgba(250,204,21,0.55))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ rotate: [-3, 3, -3] }}
      transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amTr-v3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fde047" />
            <stop offset="100%" stopColor="#eab308" />
          </linearGradient>
        </defs>
        <path d="M6 9H4a2 2 0 0 1-2-2V5h4m12 4h2a2 2 0 0 0 2-2V5h-4" stroke="#fde047" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M6 4h12v6a6 6 0 0 1-12 0V4z" fill="url(#amTr-v3)" />
        <path d="M12 16v3m-4 3h8" stroke="#fde047" strokeWidth="2" strokeLinecap="round" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🔥 FLAME — gentle flicker
// ─────────────────────────────────────────────────────────
export const AnimatedFlame = memo(function AnimatedFlame({ size = 20, className = "", animated = true }) {
  return (
    <motion.div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 6px rgba(249,115,22,0.6))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.07, 1] }}
      transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amFl-v3" x1="0%" y1="100%" x2="0%" y2="0%">
            <stop offset="0%" stopColor="#ef4444" />
            <stop offset="50%" stopColor="#f97316" />
            <stop offset="100%" stopColor="#fbbf24" />
          </linearGradient>
        </defs>
        <path
          d="M12 2c.5 3-1.5 5-2 7.5S12 13 12 13s2-2 2.5-4c1.5 1.5 2.5 3.5 2.5 6a7 7 0 1 1-14 0c0-3.5 3-7 5-9 1 1.5 2 2.5 4 2.5V2z"
          fill="url(#amFl-v3)"
        />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🚀 ROCKET — gentle bobbing
// ─────────────────────────────────────────────────────────
export const AnimatedRocket = memo(function AnimatedRocket({ size = 20, className = "", animated = true }) {
  return (
    <motion.div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 5px rgba(0,245,255,0.55))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ y: [-1.5, 1.5, -1.5] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="amRkt-v3" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <path d="M4.5 16.5c-1.5 1.26-2 5-2 5s3.74-.5 5-2c.71-.84.7-2.13-.09-2.91a2.18 2.18 0 0 0-2.91-.09z" fill="#f97316" />
        <path d="M12 15l-3-3a22 22 0 0 1 2-3.95A12.88 12.88 0 0 1 22 2c0 2.72-.78 7.5-6.05 11a22.35 22.35 0 0 1-3.95 2z" fill="url(#amRkt-v3)" />
        <circle cx="15.5" cy="8.5" r="1.5" fill="#ffffff" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🤖 AI BOT CORE — calm orbital rotation
// ─────────────────────────────────────────────────────────
export const AnimatedBotCore = memo(function AnimatedBotCore({ size = 20, className = "", animated = true }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
    >
      <motion.svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        className="absolute"
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="12" cy="12" r="9" stroke="rgba(0,245,255,0.4)" strokeWidth="1.5" strokeDasharray="6 4" />
      </motion.svg>
      <div
        className="rounded-full"
        style={{ width: "35%", height: "35%", background: "linear-gradient(135deg, #00f5ff, #a855f7)" }}
      />
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// ⬆️ UPLOAD — rising arrow
// ─────────────────────────────────────────────────────────
export const AnimatedUpload = memo(function AnimatedUpload({ size = 20, className = "", animated = true }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242" stroke="#00f5ff" strokeWidth="1.8" strokeLinecap="round" />
        <motion.path
          d="M12 12v9m0-9l-3 3m3-3l3 3"
          stroke="#00f5ff"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          animate={{ y: [-2, 1, -2] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// ✅ SUCCESS — clean checkmark
// ─────────────────────────────────────────────────────────
export const AnimatedSuccess = memo(function AnimatedSuccess({ size = 20, className = "", animated = true }) {
  return (
    <div
      style={{ width: size, height: size, filter: "drop-shadow(0 0 6px rgba(16,185,129,0.55))" }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <circle cx="12" cy="12" r="10" stroke="#10b981" strokeWidth="1.8" fill="rgba(16,185,129,0.12)" />
        <path
          d="M8 12.5l2.5 2.5 5.5-5.5"
          stroke="#ffffff"
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// 🔄 LOADER — clean spinner
// ─────────────────────────────────────────────────────────
export const AnimatedLoader = memo(function AnimatedLoader({ size = 20, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
    >
      <motion.svg
        width={size} height={size} viewBox="0 0 24 24" fill="none"
        animate={{ rotate: 360 }}
        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
      >
        <circle cx="12" cy="12" r="9" stroke="rgba(255,255,255,0.1)" strokeWidth="2.5" />
        <path d="M12 3a9 9 0 0 1 9 9" stroke="#00f5ff" strokeWidth="2.5" strokeLinecap="round" />
      </motion.svg>
    </div>
  );
});

// ─────────────────────────────────────────────────────────
// ▶️ YOUTUBE — iconic red player badge
// ─────────────────────────────────────────────────────────
export const AnimatedYoutube = memo(function AnimatedYoutube({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.07, 1] }}
      transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="ayGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ff0033" />
            <stop offset="100%" stopColor="#cc0000" />
          </linearGradient>
        </defs>
        <rect x="2" y="5" width="20" height="14" rx="4.5" fill="url(#ayGrad)" />
        <path d="M10 8.5L16 12L10 15.5V8.5Z" fill="#ffffff" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 📁 GOOGLE DRIVE — official triangular tricolor
// ─────────────────────────────────────────────────────────
export const AnimatedGoogleDrive = memo(function AnimatedGoogleDrive({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ y: [0, -1.5, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <img
        src="/icons/google-drive.png"
        alt="Google Drive"
        width={size}
        height={size}
        className="w-full h-full object-contain pointer-events-none select-none drop-shadow-sm"
        loading="lazy"
      />
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 📝 SUMMARY NOTE — smart digital notes with AI sparkle
// ─────────────────────────────────────────────────────────
export const AnimatedSummaryNote = memo(function AnimatedSummaryNote({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="asnGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#00f5ff" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <rect x="3" y="3" width="15" height="18" rx="3" fill="url(#asnGrad)" opacity="0.9" />
        <path d="M6 7h8M6 11h6M6 15h7" stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
        <motion.path
          d="M19 2l.8 2 2 .8-2 .8-.8 2-.8-2-2-.8 2-.8.8-2z"
          fill="#fbbf24"
          animate={{ scale: [0.85, 1.25, 0.85], rotate: [0, 15, 0] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🎯 THEORY QUIZ (EBE) — MCQ checklist paper
// ─────────────────────────────────────────────────────────
export const AnimatedTheoryQuiz = memo(function AnimatedTheoryQuiz({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ y: [0, -1.5, 0] }}
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="atqGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#6366f1" />
            <stop offset="100%" stopColor="#a855f7" />
          </linearGradient>
        </defs>
        <rect x="3" y="2" width="18" height="20" rx="3" fill="url(#atqGrad)" opacity="0.9" />
        <circle cx="7.5" cy="7.5" r="2" fill="#22c55e" />
        <path d="M6.5 7.5l.8.8 1.4-1.4" stroke="#ffffff" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="12" y1="7.5" x2="17" y2="7.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="7.5" cy="12.5" r="2" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
        <line x1="12" y1="12.5" x2="17" y2="12.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="7.5" cy="17.5" r="2" stroke="#ffffff" strokeWidth="1.2" opacity="0.7" />
        <line x1="12" y1="17.5" x2="15" y2="17.5" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🔬 PRACTICAL QUIZ (OSCE / OSPE) — clinical microscope
// ─────────────────────────────────────────────────────────
export const AnimatedPracticalQuiz = memo(function AnimatedPracticalQuiz({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.07, 1] }}
      transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <path d="M5 21h14" stroke="#06b6d4" strokeWidth="2" strokeLinecap="round" />
        <path d="M8 21v-3m0-3h8M16 15a5 5 0 0 0-5-5h-1" stroke="#10b981" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M12 4l3 5" stroke="#ffffff" strokeWidth="2.5" strokeLinecap="round" />
        <path d="M13.5 2.5l2.5 4" stroke="#00f5ff" strokeWidth="2" strokeLinecap="round" />
        <rect x="9" y="14" width="6" height="2" rx="0.5" fill="#ffffff" opacity="0.9" />
        <motion.circle
          cx="12" cy="15" r="1.2" fill="#ef4444"
          animate={{ opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 👥 FRIENDS — warriors & buddies
// ─────────────────────────────────────────────────────────
export const AnimatedFriends = memo(function AnimatedFriends({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ y: [0, -1.2, 0] }}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="afGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#06b6d4" />
            <stop offset="100%" stopColor="#3b82f6" />
          </linearGradient>
        </defs>
        <circle cx="9" cy="7" r="3.5" fill="url(#afGrad)" />
        <path d="M2 19c0-3.3 3.1-6 7-6s7 2.7 7 6" stroke="#06b6d4" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="17" cy="9" r="2.5" fill="#a855f7" opacity="0.85" />
        <path d="M16 14.5c2.3.5 4 2.2 4 4.5" stroke="#a855f7" strokeWidth="1.6" strokeLinecap="round" opacity="0.85" />
      </svg>
    </motion.div>
  );
});

// ─────────────────────────────────────────────────────────
// 🎓 STUDY GROUP — collaborative squad
// ─────────────────────────────────────────────────────────
export const AnimatedStudyGroup = memo(function AnimatedStudyGroup({ size = 20, className = "" }) {
  return (
    <motion.div
      style={{ width: size, height: size }}
      className={cn("relative inline-flex items-center justify-center shrink-0 select-none pointer-events-none", className)}
      animate={{ scale: [1, 1.05, 1] }}
      transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
        <defs>
          <linearGradient id="asgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ec4899" />
            <stop offset="100%" stopColor="#8b5cf6" />
          </linearGradient>
        </defs>
        <circle cx="12" cy="6" r="3" fill="url(#asgGrad)" />
        <path d="M6 19c0-3 2.7-5 6-5s6 2 6 5" stroke="#ec4899" strokeWidth="1.8" strokeLinecap="round" />
        <circle cx="5" cy="10" r="2" fill="#38bdf8" opacity="0.8" />
        <path d="M2 18c0-1.8 1.4-3.2 3.2-3.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
        <circle cx="19" cy="10" r="2" fill="#38bdf8" opacity="0.8" />
        <path d="M18.8 14.5c1.8.3 3.2 1.7 3.2 3.5" stroke="#38bdf8" strokeWidth="1.5" strokeLinecap="round" opacity="0.8" />
      </svg>
    </motion.div>
  );
});

