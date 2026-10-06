import React, { memo } from "react";
import { motion } from "framer-motion";
import { AVATAR_STYLES, styleForName } from "@/lib/avatars";

/**
 * GeneratedAvatar — no AI images, pure CSS.
 * Shows: uploaded image > gradient + initials.
 * Used everywhere instead of static WebP avatars.
 */
const GeneratedAvatar = memo(function GeneratedAvatar({
  src,               // uploaded image URL (if any)
  name = "",         // full name for initials + auto color
  styleId = null,    // explicit AVATAR_STYLES id
  size = 48,
  fallback = "🎓",
  frame = "none",    // kept for compat, not rendered here
  className = "",
  animate = true,
}) {
  const isImage = src && (src.startsWith("http") || src.startsWith("/") && !src.startsWith("linear-gradient"));
  const style = styleId ? (AVATAR_STYLES.find(s => s.id === styleId) || styleForName(name)) : styleForName(name);

  const initials = (() => {
    const parts = (name || "").trim().split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    if (fallback && fallback.length <= 2) return fallback;
    return "؟";
  })();

  const fontSize = Math.round(size * 0.38);

  return (
    <div
      className={`relative shrink-0 overflow-hidden flex items-center justify-center select-none ${className}`}
      style={{
        width: size, height: size, borderRadius: "50%",
        background: isImage ? "#111827" : style.gradient,
        boxShadow: `0 0 0 1px rgba(255,255,255,0.08), 0 4px 20px rgba(0,0,0,0.4), 0 0 ${Math.round(size * 0.3)}px ${style.bg}55`,
      }}
    >
      {isImage ? (
        <img
          src={src}
          alt={name || "avatar"}
          className="w-full h-full object-cover"
          loading="lazy"
          onError={(e) => { e.currentTarget.style.display = "none"; }}
        />
      ) : null}
      {/* initials overlay — shows if no image or image failed */}
      <span
        className="absolute inset-0 flex items-center justify-center font-black tracking-widest text-white"
        style={{
          fontSize,
          fontFamily: "var(--font-heading)",
          textShadow: "0 2px 12px rgba(0,0,0,0.5), 0 0 20px rgba(0,0,0,0.3)",
          opacity: isImage ? 0 : 1,
          pointerEvents: "none",
        }}
      >
        {initials}
      </span>
      {/* subtle inner highlight */}
      <span className="absolute inset-0 rounded-full pointer-events-none" style={{ boxShadow: "inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(0,0,0,0.2)" }} />
      {/* hover glow */}
      {animate && (
        <motion.span
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{ background: `radial-gradient(circle at 30% 20%, rgba(255,255,255,0.18), transparent 60%)` }}
          animate={{ opacity: [0.5, 0.85, 0.5] }}
          transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
    </div>
  );
});

export default GeneratedAvatar;
