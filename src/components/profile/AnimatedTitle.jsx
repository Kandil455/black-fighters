import React from "react";
import { motion } from "framer-motion";
import { PROFILE_TITLES } from "@/lib/avatars";

/* لقب متحرك فخم — تدرّج لوني سائل + توهّج + جزيئات حسب الـ fx */
function TitleFx({ fx, animate }) {
  if (!animate || !fx || fx === "none" || fx === "shine" || fx === "glow") return null;
  const items = Array.from({ length: 7 });
  const color = fx === "fire" || fx === "emberShine" ? "#fb923c" : fx === "love" ? "#f472b6" : fx === "royal" || fx === "supreme" ? "#facc15" : "#a78bfa";

  return (
    <span className="absolute inset-0 overflow-visible pointer-events-none">
      {items.map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{ left: `${5 + (i * 90) / items.length}%`, top: "25%", width: 3 + (i % 3), height: fx === "fire" ? 10 : 3 + (i % 3), background: color, boxShadow: `0 0 8px ${color}` }}
          animate={{ y: [0, -14], opacity: [0, 1, 0], scale: [0.6, 1.4, 0.4], rotate: [0, 90] }}
          transition={{ duration: 1.4 + (i % 3) * 0.4, repeat: Infinity, delay: i * 0.22, ease: "easeOut" }}
        />
      ))}
    </span>
  );
}

export default function AnimatedTitle({ titleKey, size = "md", className = "", animate = true }) {
  const t = PROFILE_TITLES[titleKey];
  if (!t || titleKey === "none" || !t.text) return null;

  const grad = t.grad
    ? `linear-gradient(90deg, ${t.grad.join(", ")})`
    : "linear-gradient(90deg,#fff,#fff)";

  const sizeCls =
    size === "lg" ? "text-base sm:text-lg" :
    size === "sm" ? "text-[11px]" : "text-sm";

  // ===== رتبة الأدمن الأسطورية — بادج مؤطّر فخم =====
  if (t.fx === "supreme") {
    return (
      <span className={`relative inline-flex items-center ${className}`}>
        {/* توهّج خلفي نابض */}
        <motion.span
          className="absolute -inset-1 rounded-full blur-md"
          style={{ background: "linear-gradient(90deg,#ffd700,#ff3d3d,#a855f7,#00e5ff,#ffd700)" }}
          animate={animate ? { opacity: [0.4, 0.8, 0.4] } : { opacity: 0.45 }}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        />
        <motion.span
          className="relative inline-flex items-center gap-1.5 rounded-full border px-3 py-1 font-black tracking-wider"
          style={{ borderColor: "#ffd70088", background: "linear-gradient(90deg,#1a1030,#2a0a3a,#0a1a2a)", boxShadow: "0 0 14px rgba(255,215,0,0.35)" }}
          animate={animate ? { scale: [1, 1.04, 1] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <span
            className={`${animate ? "title-flow" : ""} ${sizeCls}`}
            style={{
              backgroundImage: grad,
              backgroundSize: "300% auto",
              backgroundClip: "text",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
              color: "transparent",
            }}
          >
            {t.text}
          </span>
        </motion.span>
        <TitleFx fx="supreme" animate={animate} />
      </span>
    );
  }

  const anim = !animate
    ? ""
    : t.fx === "glow" || t.fx === "emberShine"
      ? "title-flow title-glow-pulse"
      : "title-flow";

  return (
    <span className={`relative inline-flex items-center font-black tracking-wide ${sizeCls} ${className}`}>
      <span
        className={anim}
        style={{
          backgroundImage: grad,
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}
      >
        {t.text}
      </span>
      <TitleFx fx={t.fx} animate={animate} />
    </span>
  );
}
