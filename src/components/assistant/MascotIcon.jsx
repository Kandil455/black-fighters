import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * نسخة مصغّرة من مسكوت تسجيل الدخول — تستخدم كأيقونة للزر العائم.
 * state: "idle" | "happy" | "talk"
 */
export default function MascotIcon({ state = "idle", className = "w-full h-full" }) {
  const happy = state === "happy" || state === "talk";

  return (
    <motion.svg
      viewBox="0 0 160 160"
      className={className}
      animate={{ y: happy ? [0, -5, 0] : [0, -3, 0], rotate: state === "talk" ? [-2, 2, -2] : 0 }}
      transition={{ duration: happy ? 0.6 : 3, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <radialGradient id="mascotIconBody" cx="40%" cy="35%" r="75%">
          <stop offset="0%" stopColor="#3affff" />
          <stop offset="55%" stopColor="#1bd6e6" />
          <stop offset="100%" stopColor="#7c4dff" />
        </radialGradient>
        <linearGradient id="mascotIconBelly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#d7faff" stopOpacity="0.7" />
        </linearGradient>
      </defs>

      {/* أذنين */}
      <ellipse cx="46" cy="34" rx="13" ry="20" fill="url(#mascotIconBody)" transform="rotate(-20 46 34)" />
      <ellipse cx="114" cy="34" rx="13" ry="20" fill="url(#mascotIconBody)" transform="rotate(20 114 34)" />

      {/* الجسم / الرأس */}
      <circle cx="80" cy="86" r="54" fill="url(#mascotIconBody)" />
      <ellipse cx="80" cy="100" rx="34" ry="30" fill="url(#mascotIconBelly)" />

      {/* خدود */}
      <circle cx="44" cy="96" r="9" fill="#ff7eb6" opacity="0.55" />
      <circle cx="116" cy="96" r="9" fill="#ff7eb6" opacity="0.55" />

      {/* العيون */}
      <AnimatePresence mode="wait">
        {happy ? (
          <motion.g key="happy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <path d="M52 80 Q62 68 72 80" stroke="#10243a" strokeWidth="5" fill="none" strokeLinecap="round" />
            <path d="M88 80 Q98 68 108 80" stroke="#10243a" strokeWidth="5" fill="none" strokeLinecap="round" />
          </motion.g>
        ) : (
          <motion.g key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <ellipse cx="62" cy="82" rx="13" ry="15" fill="#ffffff" />
            <ellipse cx="98" cy="82" rx="13" ry="15" fill="#ffffff" />
            <circle cx="62" cy="83" r="6.5" fill="#10243a" />
            <circle cx="98" cy="83" r="6.5" fill="#10243a" />
            <circle cx="64" cy="80" r="2" fill="#ffffff" />
            <circle cx="100" cy="80" r="2" fill="#ffffff" />
          </motion.g>
        )}
      </AnimatePresence>

      {/* الفم */}
      {happy ? (
        <path d="M68 104 Q80 118 92 104" stroke="#10243a" strokeWidth="4" fill="#ff9ec4" strokeLinecap="round" />
      ) : (
        <path d="M72 104 Q80 112 88 104" stroke="#10243a" strokeWidth="4" fill="none" strokeLinecap="round" />
      )}
    </motion.svg>
  );
}