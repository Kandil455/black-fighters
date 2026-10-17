import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AVATAR_FRAMES } from "@/lib/avatars";
import AvatarVideo from "@/components/profile/AvatarVideo";
import { usePerformanceMode } from "@/lib/PerformanceContext";

// Floating elemental particles around the frame
function SpecialFx({ special, glow, accent2, size }) {
  if (!special) return null;
  const count = 6;
  const items = Array.from({ length: count });

  return (
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 5 }}>
      {items.map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const color = i % 2 === 0 ? glow : accent2 || glow;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${50 + Math.cos(angle) * 52}%`,
              top: `${50 + Math.sin(angle) * 52}%`,
              width: Math.max(3, size * 0.06),
              height: special === "thunder" || special === "fire" ? Math.max(4, size * 0.1) : Math.max(3, size * 0.06),
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
            animate={{
              y: [0, -size * 0.1, 0],
              opacity: [0.3, 0.95, 0.3],
              scale: [0.7, 1.2, 0.7],
            }}
            transition={{
              duration: 1.8 + (i % 3) * 0.35,
              repeat: Infinity,
              delay: i * 0.18,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

export default function AnimatedAvatar({
  src,
  isVideo = false,
  fallback = "🎓",
  frame = "none",
  size = 48,
  animate = true,
  withSound = false,
  className = "",
}) {
  const { isPowerSaver } = usePerformanceMode();
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const f = AVATAR_FRAMES[frame] || AVATAR_FRAMES.none;
  const hasFrame = Boolean(frame && frame !== "none" && f !== AVATAR_FRAMES.none);
  const pad = hasFrame ? Math.max(3, Math.round(size * 0.09)) : 0;
  const glow = f.glow || "#19f08c";
  const accent2 = f.accent2 || "#38bdf8";
  const speed = f.speed || 4;
  const shouldAnimate = animate && !isPowerSaver;

  const isGradient = typeof src === "string" && src.startsWith("linear-gradient");
  const resolvedSrc = src;
  const hasValidSrc = Boolean(resolvedSrc && !imgError);

  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size, overflow: "visible" }}
    >
      {/* Back Ambient Aura */}
      {hasFrame && (
        <motion.div
          className="absolute rounded-full pointer-events-none"
          style={{
            inset: -size * 0.1,
            background: `radial-gradient(circle, ${glow}44 0%, ${accent2}18 50%, transparent 72%)`,
            zIndex: 1,
          }}
          animate={shouldAnimate ? { opacity: [0.5, 0.9, 0.5], scale: [0.96, 1.05, 0.96] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Spinning Conic Energy Frame Ring */}
      {hasFrame && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: f.gradient || `conic-gradient(from 0deg, ${glow}, ${accent2}, ${glow})`,
            boxShadow: `0 0 ${Math.round(size * 0.2)}px ${glow}77`,
            zIndex: 2,
          }}
          animate={shouldAnimate ? { rotate: 360 } : undefined}
          transition={{ duration: Math.max(3, speed * 1.5), repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Subtle Counter-Rotating Precision Ring */}
      {hasFrame && (
        <motion.div
          className="absolute rounded-full pointer-events-none border border-dashed"
          style={{
            inset: -2,
            borderColor: `${glow}88`,
            zIndex: 4,
          }}
          animate={shouldAnimate ? { rotate: -360 } : undefined}
          transition={{ duration: Math.max(8, speed * 3), repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Inner Avatar Circle */}
      <div
        className="absolute overflow-hidden flex items-center justify-center rounded-full border border-white/15"
        style={{
          inset: pad,
          background: isGradient
            ? src
            : hasValidSrc
            ? "#0b0f19"
            : "radial-gradient(circle at 35% 25%, #1e293b, #090d16 70%)",
          zIndex: 3,
          isolation: "isolate",
          transform: "translate3d(0,0,0)",
        }}
      >
        {isGradient ? (
          <span
            className="font-black text-white drop-shadow-md select-none tracking-wider"
            style={{ fontSize: size * 0.34, fontFamily: "var(--font-heading)" }}
          >
            {fallback && fallback.length <= 3 ? fallback : "BF"}
          </span>
        ) : hasValidSrc ? (
          isVideo ? (
            withSound ? (
              <AvatarVideo src={resolvedSrc} />
            ) : (
              <video
                src={resolvedSrc}
                className="w-full h-full object-cover rounded-full"
                autoPlay
                loop
                muted
                playsInline
              />
            )
          ) : (
            <img
              src={resolvedSrc}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover rounded-full"
              onError={() => setImgError(true)}
            />
          )
        ) : (
          <span className="font-black text-white select-none" style={{ fontSize: size * 0.34 }}>
            {fallback}
          </span>
        )}
      </div>

      {/* Floating Elemental Particles */}
      {hasFrame && shouldAnimate && (
        <SpecialFx special={f.special || "aura"} glow={glow} accent2={accent2} size={size} />
      )}
    </div>
  );
}
