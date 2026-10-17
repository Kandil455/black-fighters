import React from "react";
import { motion } from "framer-motion";
import { PROFILE_TITLES, TIER_LABELS } from "@/lib/avatars";
import { usePerformanceMode } from "@/lib/PerformanceContext";

export default function AnimatedTitle({ titleKey, size = "md", className = "", animate = true }) {
  const { isPowerSaver } = usePerformanceMode();
  const t = PROFILE_TITLES[titleKey];
  if (!t || titleKey === "none") return null;

  const displayText = t.text || t.labelAr || t.label;
  if (!displayText) return null;

  const shouldAnimate = animate && !isPowerSaver;
  const tierInfo = TIER_LABELS[t.tier || "vanguard"] || TIER_LABELS.vanguard;
  const primaryColor = (t.grad && t.grad[0]) || tierInfo.color || "#19f08c";
  const secondaryColor = (t.grad && t.grad[1]) || tierInfo.color || "#fbbf24";
  const grad = t.grad
    ? `linear-gradient(90deg, ${t.grad.join(", ")})`
    : `linear-gradient(90deg, #ffffff, ${primaryColor}, ${secondaryColor})`;

  const sizeCls =
    size === "lg"
      ? "text-xs sm:text-sm px-3.5 py-1"
      : size === "sm"
      ? "text-[10px] px-2.5 py-0.5"
      : "text-[11px] sm:text-xs px-3 py-1";

  const isHighTier = ["epic", "legendary", "exclusive"].includes(t.tier) || t.fx === "supreme";

  return (
    <motion.span
      className={`relative inline-flex items-center gap-1.5 rounded-full border font-black tracking-wider overflow-hidden select-none ${sizeCls} ${className}`}
      style={{
        borderColor: `${primaryColor}66`,
        background: "linear-gradient(135deg, rgba(9,13,22,0.92) 0%, rgba(18,24,38,0.88) 100%)",
        boxShadow: isHighTier
          ? `0 0 16px -3px ${primaryColor}55`
          : `0 0 10px -4px ${primaryColor}33`,
      }}
    >
      {shouldAnimate && (
        <motion.span
          className="pointer-events-none absolute inset-0"
          style={{
            background: `linear-gradient(110deg, transparent 32%, ${primaryColor}28 48%, rgba(255,255,255,0.35) 52%, transparent 68%)`,
          }}
          animate={{ x: ["-130%", "130%"] }}
          transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
        />
      )}

      <span
        className={`relative z-10 font-black whitespace-nowrap ${shouldAnimate ? "title-flow" : ""}`}
        style={{
          backgroundImage: grad,
          backgroundSize: "250% auto",
          backgroundClip: "text",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          color: "transparent",
        }}
      >
        {displayText}
      </span>
    </motion.span>
  );
}
