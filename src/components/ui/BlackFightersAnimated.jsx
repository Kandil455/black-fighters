import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BlackFightersCrest } from "@/components/ui/BlackFightersCrest";

/**
 * BlackFightersAnimated — High-performance 60fps Framer Motion Logo Component.
 * Executes a smooth 3D Spin (rotateY: 0 -> 360deg) on page load followed by
 * a continuous compositor-only Glow Pulse (scale + opacity, zero main-thread filter/box-shadow repaints).
 */
export function BlackFightersAnimated({
  size = 36,
  variant = "emerald",
  className = "",
  interactive = true,
}) {
  const reduceMotion = useReducedMotion();
  const [spinComplete, setSpinComplete] = useState(false);

  const glowColor =
    variant === "gold"
      ? "rgba(251, 191, 36, 0.45)"
      : variant === "crimson"
      ? "rgba(239, 68, 68, 0.45)"
      : "rgba(25, 240, 140, 0.48)";

  if (reduceMotion) {
    return (
      <div
        style={{ width: size, height: size }}
        className={cn("relative inline-grid shrink-0 place-items-center select-none", className)}
      >
        <BlackFightersCrest size={size} variant={variant} animated={false} />
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size, perspective: 640 }}
      className={cn(
        "relative inline-grid shrink-0 place-items-center select-none",
        className
      )}
    >
      {/* 1. Compositor-only Glow Pulse Ring (starts bright burst after 3D spin, then pulses smoothly) */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute -inset-1.5 rounded-full"
        style={{
          background: `radial-gradient(circle, ${glowColor} 0%, rgba(25, 240, 140, 0.12) 55%, transparent 75%)`,
        }}
        initial={{ scale: 0.6, opacity: 0 }}
        animate={
          spinComplete
            ? {
                scale: [0.92, 1.28, 0.92],
                opacity: [0.4, 0.95, 0.4],
              }
            : {
                scale: [0.6, 1.35, 1],
                opacity: [0, 1, 0.75],
              }
        }
        transition={
          spinComplete
            ? {
                duration: 2.4,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {
                duration: 0.95,
                ease: "easeOut",
              }
        }
      />

      {/* 2. Secondary Specular Ring Flash on Spin Completion */}
      <motion.span
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 rounded-xl border border-[#19f08c]/50"
        initial={{ scale: 0.85, opacity: 0 }}
        animate={
          spinComplete
            ? {
                scale: [1, 1.38],
                opacity: [0.65, 0],
              }
            : { scale: 0.85, opacity: 0 }
        }
        transition={
          spinComplete
            ? {
                duration: 2.4,
                repeat: Infinity,
                ease: "easeOut",
              }
            : { duration: 0.3 }
        }
      />

      {/* 3. 3D Spin Container (360° Y-axis spin on mount -> smooth 3D idle hover) */}
      <motion.div
        style={{ transformStyle: "preserve-3d" }}
        initial={{ rotateY: 0, scale: 0.84 }}
        animate={
          spinComplete
            ? {
                rotateY: [0, 10, -10, 0],
                scale: [1, 1.04, 1],
              }
            : {
                rotateY: 360,
                scale: [0.84, 1.08, 1],
              }
        }
        transition={
          spinComplete
            ? {
                duration: 4.2,
                repeat: Infinity,
                ease: "easeInOut",
              }
            : {
                duration: 0.95,
                ease: [0.22, 1, 0.36, 1],
              }
        }
        whileHover={interactive ? { scale: 1.08 } : undefined}
        onAnimationComplete={() => {
          if (!spinComplete) setSpinComplete(true);
        }}
        className="relative z-10 grid place-items-center"
      >
        <BlackFightersCrest size={size} variant={variant} animated={true} />
      </motion.div>
    </div>
  );
}

export default BlackFightersAnimated;
