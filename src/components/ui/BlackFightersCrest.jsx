import React, { useId } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * BlackFightersCrest — 60fps Animated Vector & CSS-3D Spartan/Vanguard Emblem
 * Features living visor eye pulse, diagonal spear sheen, and subtle shield hover/breathing.
 * Zero external textures, zero main-thread filter animations.
 */
export function BlackFightersCrest({
  size = 36,
  variant = "emerald",
  interactive = false,
  animated = true,
  className = "",
}) {
  const uid = useId().replace(/:/g, "");
  const reduceMotion = useReducedMotion();
  const shouldAnimate = animated && !reduceMotion;

  const palette =
    variant === "gold"
      ? { primary: "#fbbf24", secondary: "#f59e0b", deep: "#1c1305", rim: "#fde68a" }
      : variant === "crimson"
      ? { primary: "#ef4444", secondary: "#b91c1c", deep: "#1a0608", rim: "#fca5a5" }
      : { primary: "#19f08c", secondary: "#059669", deep: "#03150c", rim: "#6ee7b7" };

  return (
    <motion.div
      style={{ width: size, height: size }}
      animate={
        shouldAnimate
          ? {
              y: [0, -1.5, 0],
              scale: [1, 1.035, 1],
            }
          : undefined
      }
      transition={
        shouldAnimate
          ? {
              duration: 3.4,
              repeat: Infinity,
              ease: "easeInOut",
            }
          : undefined
      }
      className={cn(
        "relative inline-grid shrink-0 place-items-center select-none rounded-xl",
        interactive && "transition-transform duration-200 hover:scale-105",
        className
      )}
    >
      {/* Ambient composited aura ring */}
      {shouldAnimate && (
        <motion.span
          aria-hidden="true"
          className="pointer-events-none absolute -inset-1 rounded-full"
          style={{
            background: `radial-gradient(circle, ${palette.primary}38 0%, transparent 72%)`,
          }}
          animate={{ opacity: [0.35, 0.85, 0.35], scale: [0.92, 1.12, 0.92] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      <svg
        viewBox="0 0 64 64"
        className="relative z-10 h-full w-full overflow-visible"
        aria-hidden="true"
        focusable="false"
      >
        <defs>
          <linearGradient id={`bf-shield-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#141c26" />
            <stop offset="50%" stopColor="#090d14" />
            <stop offset="100%" stopColor={palette.deep} />
          </linearGradient>
          <linearGradient id={`bf-edge-${uid}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={palette.rim} />
            <stop offset="45%" stopColor={palette.primary} />
            <stop offset="100%" stopColor={palette.secondary} />
          </linearGradient>
          <linearGradient id={`bf-blade-${uid}`} x1="0.5" y1="0" x2="0.5" y2="1">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="35%" stopColor={palette.primary} />
            <stop offset="100%" stopColor={palette.secondary} />
          </linearGradient>
        </defs>

        {/* Outer Dragon/Spartan Wings behind shield */}
        <motion.g
          animate={shouldAnimate ? { scaleX: [0.97, 1.04, 0.97] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
          style={{ transformOrigin: "32px 28px" }}
        >
          <path
            d="M8 18 L2 10 L5 26 L11 34 Z"
            fill={palette.primary}
            fillOpacity="0.55"
          />
          <path
            d="M56 18 L62 10 L59 26 L53 34 Z"
            fill={palette.primary}
            fillOpacity="0.55"
          />
        </motion.g>

        {/* Outer Tactical Shield */}
        <path
          d="M32 3 L56 12 L52 40 L32 61 L12 40 L8 12 Z"
          fill={`url(#bf-shield-${uid})`}
          stroke={`url(#bf-edge-${uid})`}
          strokeWidth="2.4"
          strokeLinejoin="round"
        />

        {/* Inner Bevel Frame */}
        <path
          d="M32 7.5 L51 15 L48 38.5 L32 55.5 L16 38.5 L13 15 Z"
          fill="none"
          stroke={palette.primary}
          strokeOpacity="0.32"
          strokeWidth="1.2"
        />

        {/* Spartan / Black Fighters Vanguard Wings */}
        <path
          d="M32 14 L46 21 L42 35 L32 29 L22 35 L18 21 Z"
          fill={palette.primary}
          fillOpacity="0.2"
        />

        {/* Helmet Visor & Cheek Plates */}
        <path
          d="M21 20 L32 13 L43 20 L41 37 L34 45 L34 31 L30 31 L30 45 L23 37 Z"
          fill={`url(#bf-edge-${uid})`}
        />

        {/* Glowing Visor Eyes (Animated pulse) */}
        <path d="M24 25 L30 27.5 L29.5 29.8 L23.5 27.2 Z" fill="#05070a" />
        <path d="M40 25 L34 27.5 L34.5 29.8 L40.5 27.2 Z" fill="#05070a" />
        <motion.g
          animate={shouldAnimate ? { opacity: [0.55, 1, 0.55] } : undefined}
          transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M24.6 25.6 L29.6 27.7 L29.2 28.9 L24.2 26.8 Z" fill="#ffffff" />
          <path d="M39.4 25.6 L34.4 27.7 L34.8 28.9 L39.8 26.8 Z" fill="#ffffff" />
        </motion.g>

        {/* Central Sovereign Spear / Crest */}
        <path
          d="M32 7 L35.2 17 L32 53 L28.8 17 Z"
          fill={`url(#bf-blade-${uid})`}
        />

        {/* Crown Energy Gem at top of helmet */}
        <motion.circle
          cx="32"
          cy="10"
          r="2.1"
          fill="#ffffff"
          animate={shouldAnimate ? { scale: [0.85, 1.35, 0.85], opacity: [0.6, 1, 0.6] } : undefined}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        />
      </svg>
    </motion.div>
  );
}

/**
 * BlackFighters3DEmblem — Lightweight 60fps CSS-3D / SVG interactive showcase
 * Pauses automatically when reduced-motion is preferred.
 */
export function BlackFighters3DEmblem({ size = 88, className = "" }) {
  return (
    <div
      style={{ width: size, height: size, perspective: 500 }}
      className={cn("relative inline-grid place-items-center select-none", className)}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-1 rounded-full bg-[#19f08c]/15 blur-xl"
      />
      <motion.div
        animate={{ rotateY: [-12, 12, -12], y: [-2.5, 2.5, -2.5] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformStyle: "preserve-3d" }}
        className="relative grid place-items-center"
      >
        <BlackFightersCrest size={size} variant="emerald" animated={true} />
      </motion.div>
    </div>
  );
}

export default BlackFightersCrest;
