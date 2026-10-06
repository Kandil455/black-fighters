import React from "react";
import { motion } from "framer-motion";
import { PROFILE_BANNERS } from "@/lib/avatars";
import { usePerformanceMode } from "@/lib/PerformanceContext";

// تأثيرات الجزيئات فوق البانر
function BannerFx({ special }) {
  if (!special) return null;
  const items = Array.from({ length: 14 });

  if (["hearts", "embers", "stars", "waves", "rays", "dust"].includes(special)) {
    const color = special === "embers" || special === "rays" ? "#fb923c" : special === "waves" ? "#38bdf8" : special === "hearts" ? "#f472b6" : "#e0e7ff";
    return (
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {items.map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{ left: `${(i * 100) / items.length}%`, bottom: "-12%", width: 3 + (i % 4) * 2, height: special === "rays" ? 24 : 3 + (i % 4) * 2, background: color, boxShadow: `0 0 12px ${color}`, transform: special === "rays" ? "rotate(28deg)" : undefined }}
            animate={{ y: [0, -90], opacity: [0, 0.9, 0], x: [0, (i % 2 ? 1 : -1) * 12], scale: [0.4, 1.2, 0.3] }}
            transition={{ duration: 2.6 + (i % 4) * 0.5, repeat: Infinity, delay: i * 0.22, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }
  return null;
}

export default function ProfileBanner({ banner = "none", className = "" }) {
  const { isPowerSaver } = usePerformanceMode();
  const b = PROFILE_BANNERS[banner] || PROFILE_BANNERS.none;
  if (banner === "none") return null;

  return (
    <div className={`relative h-24 sm:h-28 w-full overflow-hidden rounded-2xl ${className}`}>
      {b.video && !isPowerSaver ? (
        <video src={b.video} poster={b.poster} className="absolute inset-0 h-full w-full object-cover" autoPlay loop muted playsInline preload="metadata" />
      ) : b.poster ? (
        <img src={b.poster} alt="" className="absolute inset-0 h-full w-full object-cover" />
      ) : null}
      {/* الخلفية المتدرّجة المتحركة (انزلاق لوني) */}
      <motion.div
        className="absolute inset-0"
        style={{ background: b.css, backgroundSize: "220% 220%", opacity: b.video || b.poster ? 0.38 : 1 }}
        animate={{ backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* طبقة نبض لونية فوقها */}
      <motion.div
        className="absolute inset-0 mix-blend-overlay"
        style={{ background: b.css }}
        animate={{ opacity: [0.25, 0.55, 0.25] }}
        transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* لمعة قطرية تمرّ بسرعة */}
      <motion.div
        className="absolute inset-0"
        style={{ background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.28) 48%, rgba(255,255,255,0.05) 56%, transparent 70%)" }}
        animate={{ x: ["-120%", "120%"] }}
        transition={{ duration: 3.2, repeat: Infinity, repeatDelay: 1.2, ease: "easeInOut" }}
      />

      {/* صورة الإطار (نيون مثلاً) */}
      {b.img && (
        <motion.img
          src={b.img}
          alt=""
          className="absolute inset-0 w-full h-full object-cover pointer-events-none"
          animate={{ opacity: [0.75, 1, 0.75] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* توهّج سفلي خفيف */}
      <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/25 to-transparent" />

      <BannerFx special={b.special} />
    </div>
  );
}
