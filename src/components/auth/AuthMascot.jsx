import React from "react";
import { motion, AnimatePresence } from "framer-motion";

/**
 * شخصية تفاعلية خرافية فوق فورم تسجيل الدخول.
 * state:
 *  - "idle"   : ثابتة بتبص قدام
 *  - "peek"   : العين بتتبع الكتابة (الإيميل)
 *  - "cover"  : مغطّية عينها بإيديها (الباسورد)
 *  - "happy"  : فرحانة (نجاح / تحويم)
 * lookX: من -1 (شمال) لـ 1 (يمين) لتحريك بؤبؤ العين
 */
export default function AuthMascot({ state = "idle", lookX = 0, className = "w-32 h-32 mb-2" }) {
  const covering = state === "cover";
  const happy = state === "happy";
  const peeking = state === "peek";

  // حركة البؤبؤ
  const pupilX = Math.max(-1, Math.min(1, lookX)) * 5;
  const pupilY = peeking ? 3 : 0;

  return (
    <div className={`relative mx-auto select-none ${className}`}>
      {/* هالة نيون متوهجة خلف الشخصية — the halo is a pre-falloff radial
          gradient (no blur filter): a moving blurred layer re-rasterizes its
          blur every frame (§6/aurora-orb rule), and this halo animated inside
          the summary popup's header. Extra gradient stops carry the falloff. */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, hsl(184 100% 50% / 0.42) 0%, hsl(184 100% 50% / 0.18) 40%, transparent 72%)",
        }}
        animate={{ scale: happy ? [1, 1.2, 1] : [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: happy ? 0.8 : 3, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.svg
        viewBox="0 0 160 160"
        className="relative z-10 w-full h-full drop-shadow-[0_8px_24px_rgba(34,238,238,0.3)]"
        animate={{
          y: happy ? [0, -8, 0] : [0, -4, 0],
          rotate: covering ? [-2, 2, -2] : 0,
        }}
        transition={{ duration: happy ? 0.5 : 3, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <radialGradient id="bodyGrad" cx="40%" cy="35%" r="75%">
            <stop offset="0%" stopColor="#3affff" />
            <stop offset="55%" stopColor="#1bd6e6" />
            <stop offset="100%" stopColor="#7c4dff" />
          </radialGradient>
          <linearGradient id="bellyGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#d7faff" stopOpacity="0.7" />
          </linearGradient>
        </defs>

        {/* أذنين */}
        <motion.g
          animate={{ rotate: happy ? [0, -8, 8, 0] : 0 }}
          transition={{ duration: 0.6, repeat: happy ? Infinity : 0 }}
          style={{ transformOrigin: "80px 50px" }}
        >
          <ellipse cx="46" cy="34" rx="13" ry="20" fill="url(#bodyGrad)" transform="rotate(-20 46 34)" />
          <ellipse cx="114" cy="34" rx="13" ry="20" fill="url(#bodyGrad)" transform="rotate(20 114 34)" />
          <ellipse cx="46" cy="36" rx="6" ry="11" fill="#7c4dff" opacity="0.5" transform="rotate(-20 46 36)" />
          <ellipse cx="114" cy="36" rx="6" ry="11" fill="#7c4dff" opacity="0.5" transform="rotate(20 114 36)" />
        </motion.g>

        {/* الجسم / الرأس */}
        <circle cx="80" cy="86" r="54" fill="url(#bodyGrad)" />
        <ellipse cx="80" cy="100" rx="34" ry="30" fill="url(#bellyGrad)" />

        {/* خدود وردية */}
        <circle cx="44" cy="96" r="9" fill="#ff7eb6" opacity="0.55" />
        <circle cx="116" cy="96" r="9" fill="#ff7eb6" opacity="0.55" />

        {/* العيون */}
        <AnimatePresence mode="wait">
          {happy ? (
            // عيون مبسوطة (^ ^)
            <motion.g key="happy" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <path d="M52 80 Q62 68 72 80" stroke="#10243a" strokeWidth="5" fill="none" strokeLinecap="round" />
              <path d="M88 80 Q98 68 108 80" stroke="#10243a" strokeWidth="5" fill="none" strokeLinecap="round" />
            </motion.g>
          ) : (
            <motion.g key="open" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {/* بياض العين */}
              <ellipse cx="62" cy="82" rx="13" ry="15" fill="#ffffff" />
              <ellipse cx="98" cy="82" rx="13" ry="15" fill="#ffffff" />
              {/* البؤبؤ بيتحرك */}
              <motion.g animate={{ x: pupilX, y: pupilY }} transition={{ type: "spring", stiffness: 220, damping: 16 }}>
                <circle cx="62" cy="82" r="6.5" fill="#10243a" />
                <circle cx="98" cy="82" r="6.5" fill="#10243a" />
                <circle cx="64" cy="79" r="2" fill="#ffffff" />
                <circle cx="100" cy="79" r="2" fill="#ffffff" />
              </motion.g>
            </motion.g>
          )}
        </AnimatePresence>

        {/* البوز / الفم */}
        {happy ? (
          <path d="M68 104 Q80 118 92 104" stroke="#10243a" strokeWidth="4" fill="#ff9ec4" strokeLinecap="round" />
        ) : (
          <path d="M72 104 Q80 112 88 104" stroke="#10243a" strokeWidth="4" fill="none" strokeLinecap="round" />
        )}

        {/* الإيدين بتغطّي العين لما الباسورد */}
        <AnimatePresence>
          {covering && (
            <motion.g
              initial={{ y: 50, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 50, opacity: 0 }}
              transition={{ type: "spring", stiffness: 260, damping: 20 }}
            >
              <ellipse cx="62" cy="82" rx="16" ry="17" fill="url(#bodyGrad)" stroke="#7c4dff" strokeWidth="1" />
              <ellipse cx="98" cy="82" rx="16" ry="17" fill="url(#bodyGrad)" stroke="#7c4dff" strokeWidth="1" />
              {/* خطوط الأصابع */}
              <path d="M54 72 L54 92 M62 70 L62 94 M70 72 L70 92" stroke="#10243a" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
              <path d="M90 72 L90 92 M98 70 L98 94 M106 72 L106 92" stroke="#10243a" strokeWidth="1.5" opacity="0.35" strokeLinecap="round" />
            </motion.g>
          )}
        </AnimatePresence>
      </motion.svg>
    </div>
  );
}
