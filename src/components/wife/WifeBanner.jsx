import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Heart, Crown, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const AR_TITLES = ["حبيبتي", "ملكتي 👑", "قلبي ❤️", "روحي ✨"];
const EN_TITLES = ["My Love ❤️", "My Queen 👑", "My Heart ✨", "Soulmate 💫"];

/**
 * بانر بريميوم خاص جداً بدور "زوجتي" — متغيّر الألوان، قلوب متحركة، وعنوان بتأثير flip.
 */
export default function WifeBanner({ name = "My Wife" }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [titleIndex, setTitleIndex] = useState(0);
  const baseTitles = isEn ? EN_TITLES : AR_TITLES;
  const titles = [name, ...baseTitles.filter((t) => t !== name)];

  useEffect(() => {
    const t = setInterval(() => setTitleIndex((i) => (i + 1) % titles.length), 2600);
    return () => clearInterval(t);
  }, [titles.length]);

  return (
    <motion.div
      initial={{ opacity: 0, y: -24, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
      dir={dir}
      className="relative overflow-hidden rounded-3xl p-[2px] mb-6"
      style={{
        background:
          "linear-gradient(120deg, #ff5fb4, #c850ff, #ff5fb4, #ff9ad4, #c850ff)",
        backgroundSize: "300% 300%",
        animation: "wifeShift 6s ease infinite",
      }}
    >
      <style>{`
        @keyframes wifeShift { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }
      `}</style>

      <div
        className="relative rounded-[22px] px-6 py-7 sm:px-10 sm:py-9 overflow-hidden"
        style={{
          background:
            "linear-gradient(135deg, rgba(40,8,38,0.92), rgba(24,6,34,0.96))",
        }}
      >
        {/* Floating hearts */}
        {Array.from({ length: 12 }).map((_, i) => (
          <motion.div
            key={i}
            className="absolute"
            style={{ left: `${(i * 8.3 + 4) % 96}%`, bottom: -20 }}
            initial={{ y: 0, opacity: 0 }}
            animate={{ y: -160 - (i % 4) * 40, opacity: [0, 1, 1, 0] }}
            transition={{
              duration: 4 + (i % 5),
              repeat: Infinity,
              delay: i * 0.5,
              ease: "easeOut",
            }}
          >
            <Heart
              className="text-pink-400 fill-pink-400"
              style={{ width: 10 + (i % 4) * 5, height: 10 + (i % 4) * 5, opacity: 0.7 }}
            />
          </motion.div>
        ))}

        {/* Sheen sweep */}
        <motion.div
          className="absolute inset-0 pointer-events-none"
          style={{
            background:
              "linear-gradient(110deg, transparent 30%, rgba(255,255,255,0.18) 50%, transparent 70%)",
          }}
          initial={{ x: "-120%" }}
          animate={{ x: "120%" }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut", repeatDelay: 1 }}
        />

        <div className="relative z-10 flex items-center justify-center gap-4 sm:gap-6">
          <motion.div
            animate={{ scale: [1, 1.18, 1], rotate: [0, -6, 6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
            className="shrink-0"
          >
            <Heart className="w-10 h-10 sm:w-14 sm:h-14 text-pink-400 fill-pink-400 drop-shadow-[0_0_14px_rgba(255,95,180,0.8)]" />
          </motion.div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-2 mb-1">
              <Crown className="w-4 h-4 text-yellow-300" />
              <span className="text-[11px] sm:text-xs font-bold tracking-widest text-pink-200/90 uppercase">
                Exclusive • The One & Only
              </span>
              <Sparkles className="w-4 h-4 text-yellow-300" />
            </div>

            {/* Flip title */}
            <div className="h-10 sm:h-14 flex items-center justify-center overflow-hidden">
              <AnimatePresence mode="wait">
                <motion.h2
                  key={titleIndex}
                  initial={{ rotateX: 90, opacity: 0, y: 18 }}
                  animate={{ rotateX: 0, opacity: 1, y: 0 }}
                  exit={{ rotateX: -90, opacity: 0, y: -18 }}
                  transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                  className="text-2xl sm:text-4xl font-black"
                  style={{
                    backgroundImage: "linear-gradient(90deg,#ffd6f0,#ff8fd0,#ffe28a,#ff8fd0,#ffd6f0)",
                    backgroundSize: "200% auto",
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    WebkitTextFillColor: "transparent",
                    animation: "wifeShift 4s linear infinite",
                  }}
                >
                  {titles[titleIndex]}
                </motion.h2>
              </AnimatePresence>
            </div>

            <p className="text-xs sm:text-sm text-pink-100/70 mt-1 font-medium">
              {isEn ? "The most beloved queen on the entire platform 💜 — one and only" : "أجمل واحدة في الموقع كله 💜 — مفيش حد زيها"}
            </p>
          </div>

          <motion.div
            animate={{ scale: [1, 1.18, 1], rotate: [0, 6, -6, 0] }}
            transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
            className="shrink-0"
          >
            <Heart className="w-10 h-10 sm:w-14 sm:h-14 text-pink-400 fill-pink-400 drop-shadow-[0_0_14px_rgba(255,95,180,0.8)]" />
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
}