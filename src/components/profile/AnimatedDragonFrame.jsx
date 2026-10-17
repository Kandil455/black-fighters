import React, { useId } from "react";
import { motion } from "framer-motion";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { cn } from "@/lib/utils";

/**
 * Tiered Dragon Card Frame Catalog (each with its own rarity & price tier)
 */
export const DRAGON_CARD_TIERS = {
  emerald: {
    key: "emerald",
    labelAr: "تنين الزمرد الحارس",
    labelEn: "Emerald Guardian Dragon",
    price: 600,
    primary: "#19f08c",
    secondary: "#059669",
    highlight: "#a7f3d0",
    eye: "#ffffff",
  },
  frost: {
    key: "frost",
    labelAr: "تنين الصقيع القطبي",
    labelEn: "Cryo Frost Wyrm",
    price: 1200,
    primary: "#38bdf8",
    secondary: "#0284c7",
    highlight: "#e0f2fe",
    eye: "#ffffff",
  },
  void: {
    key: "void",
    labelAr: "تنين الهاوية البنفسجي",
    labelEn: "Abyssal Void Dragon",
    price: 1800,
    primary: "#a855f7",
    secondary: "#6d28d9",
    highlight: "#f3e8ff",
    eye: "#22d3ee",
  },
  crimson: {
    key: "crimson",
    labelAr: "تنين الحمم البركانية",
    labelEn: "Crimson Magma Bahamut",
    price: 2400,
    primary: "#ef4444",
    secondary: "#f97316",
    highlight: "#fef08a",
    eye: "#fde047",
  },
  gold: {
    key: "gold",
    labelAr: "إمبراطور التنانين الذهبي",
    labelEn: "Sovereign Golden Dragon King",
    price: 3000,
    primary: "#fbbf24",
    secondary: "#d97706",
    highlight: "#ffffff",
    eye: "#19f08c",
  },
};

export function resolveDragonVariant({ variant, frame, profileColor, isAdmin } = {}) {
  if (variant && DRAGON_CARD_TIERS[variant]) return DRAGON_CARD_TIERS[variant];
  if (isAdmin || frame === "spartanApex" || frame === "titaniumVault" || frame === "vip5" || profileColor === "gold") {
    return DRAGON_CARD_TIERS.gold;
  }
  if (frame === "blazingAura" || frame === "firering" || frame === "crimsonSteel" || frame === "vip6" || profileColor === "red") {
    return DRAGON_CARD_TIERS.crimson;
  }
  if (frame === "obsidianMetal" || frame === "arcaneRunes" || frame === "runeStone" || frame === "vip4" || profileColor === "purple") {
    return DRAGON_CARD_TIERS.void;
  }
  if (frame === "moonMarble" || frame === "frostTemple" || frame === "cyberPlate" || profileColor === "cyan" || profileColor === "blue") {
    return DRAGON_CARD_TIERS.frost;
  }
  return DRAGON_CARD_TIERS.emerald;
}

/**
 * AnimatedDragonFrame — Wraps profile cards with real drawn dragon wings,
 * horned dragon head crest, corner claws, and continuous perimeter light pulse.
 */
export default function AnimatedDragonFrame({
  children,
  variant,
  frame,
  profileColor,
  isAdmin = false,
  enabled = true,
  showBadge = false,
  className = "",
}) {
  const { isPowerSaver } = usePerformanceMode();
  const uid = useId().replace(/:/g, "");
  const theme = resolveDragonVariant({ variant, frame, profileColor, isAdmin });
  const shouldAnimate = enabled && !isPowerSaver;

  const wingGradId = `df-wing-${uid}`;
  const boneGradId = `df-bone-${uid}`;
  const fireGradId = `df-fire-${uid}`;

  return (
    <div className={cn("relative group select-none", className)} style={{ overflow: "visible" }}>
      {/* Shared SVG Gradients */}
      <svg width="0" height="0" className="absolute pointer-events-none" aria-hidden="true">
        <defs>
          <linearGradient id={wingGradId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor={theme.highlight} stopOpacity="0.95" />
            <stop offset="45%" stopColor={theme.primary} stopOpacity="0.85" />
            <stop offset="100%" stopColor="#070a12" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id={boneGradId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor={theme.highlight} />
            <stop offset="50%" stopColor={theme.primary} />
            <stop offset="100%" stopColor={theme.secondary} />
          </linearGradient>
          <radialGradient id={fireGradId} cx="50%" cy="50%" r="50%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="45%" stopColor={theme.primary} />
            <stop offset="100%" stopColor="transparent" />
          </radialGradient>
        </defs>
      </svg>

      {/* 1. Outer Pulsing Dragon Aura & Perimeter Illumination */}
      <motion.div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-[3px] rounded-[30px] z-0"
        style={{
          background: `linear-gradient(135deg, ${theme.primary}77, ${theme.secondary}22, ${theme.highlight}66, ${theme.primary}77)`,
          boxShadow: `0 0 32px -4px ${theme.primary}55, inset 0 0 20px ${theme.primary}33`,
        }}
        animate={
          shouldAnimate
            ? {
                opacity: [0.65, 1, 0.65],
                scale: [0.998, 1.006, 0.998],
              }
            : undefined
        }
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* 2. Left Sweeping Dragon Wing (Flaps & Flashes along left card edge) */}
      <motion.svg
        viewBox="0 0 120 190"
        className="pointer-events-none absolute -left-5 sm:-left-7 top-6 w-16 sm:w-20 h-32 sm:h-40 z-20 overflow-visible"
        style={{
          transformOrigin: "105px 85px",
          filter: `drop-shadow(0 0 10px ${theme.primary}99)`,
        }}
        animate={
          shouldAnimate
            ? {
                rotate: [-5, 6, -5],
                scaleY: [0.96, 1.05, 0.96],
                opacity: [0.85, 1, 0.85],
              }
            : undefined
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        {/* Main Dragon Wing Membrane & Rib Bones */}
        <path
          d="M112 82 C82 52, 42 22, 8 6 C18 36, 36 58, 56 72 C28 68, 10 82, 4 106 C28 96, 52 96, 76 104 C44 112, 24 132, 18 160 C46 140, 78 132, 112 136 Z"
          fill={`url(#${wingGradId})`}
          stroke={`url(#${boneGradId})`}
          strokeWidth="2.2"
          strokeLinejoin="round"
        />
        {/* Wing Thumb Claw */}
        <path d="M8 6 L2 0 L16 4 L12 12 Z" fill={theme.highlight} />
        {/* Glowing Wing Veins */}
        <path
          d="M110 86 L22 24 M108 98 L16 96 M108 114 L30 144"
          stroke={theme.highlight}
          strokeWidth="1.4"
          strokeOpacity="0.75"
          strokeLinecap="round"
        />
      </motion.svg>

      {/* 3. Right Sweeping Dragon Wing (Mirrored, Flaps & Flashes along right card edge) */}
      <motion.svg
        viewBox="0 0 120 190"
        className="pointer-events-none absolute -right-5 sm:-right-7 top-6 w-16 sm:w-20 h-32 sm:h-40 z-20 overflow-visible"
        style={{
          transformOrigin: "15px 85px",
          filter: `drop-shadow(0 0 10px ${theme.primary}99)`,
        }}
        animate={
          shouldAnimate
            ? {
                rotate: [5, -6, 5],
                scaleY: [0.96, 1.05, 0.96],
                opacity: [0.85, 1, 0.85],
              }
            : undefined
        }
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        <g transform="translate(120, 0) scale(-1, 1)">
          <path
            d="M112 82 C82 52, 42 22, 8 6 C18 36, 36 58, 56 72 C28 68, 10 82, 4 106 C28 96, 52 96, 76 104 C44 112, 24 132, 18 160 C46 140, 78 132, 112 136 Z"
            fill={`url(#${wingGradId})`}
            stroke={`url(#${boneGradId})`}
            strokeWidth="2.2"
            strokeLinejoin="round"
          />
          <path d="M8 6 L2 0 L16 4 L12 12 Z" fill={theme.highlight} />
          <path
            d="M110 86 L22 24 M108 98 L16 96 M108 114 L30 144"
            stroke={theme.highlight}
            strokeWidth="1.4"
            strokeOpacity="0.75"
            strokeLinecap="round"
          />
        </g>
      </motion.svg>

      {/* 4. Top Center Fierce Dragon Head, Horns & Breath Flame */}
      <motion.svg
        viewBox="0 0 180 70"
        className="pointer-events-none absolute -top-6 left-1/2 -translate-x-1/2 w-36 sm:w-44 h-14 sm:h-16 z-30 overflow-visible"
        style={{ filter: `drop-shadow(0 0 12px ${theme.primary})` }}
        animate={shouldAnimate ? { y: [0, -2.5, 0], scale: [1, 1.04, 1] } : undefined}
        transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        {/* Sweeping Left & Right Dragon Horns */}
        <path
          d="M68 34 C50 18, 30 8, 12 4 C28 18, 42 30, 56 40 Z"
          fill={`url(#${boneGradId})`}
          stroke="#060911"
          strokeWidth="1.2"
        />
        <path
          d="M112 34 C130 18, 150 8, 168 4 C152 18, 138 30, 124 40 Z"
          fill={`url(#${boneGradId})`}
          stroke="#060911"
          strokeWidth="1.2"
        />
        {/* Inner Crown Spikes */}
        <polygon points="75,26 66,8 84,22" fill={theme.highlight} />
        <polygon points="105,26 114,8 96,22" fill={theme.highlight} />

        {/* Armored Dragon Skull & Snout */}
        <path
          d="M60 32 L78 16 L90 24 L102 16 L120 32 L110 48 L90 58 L70 48 Z"
          fill={`url(#${wingGradId})`}
          stroke={`url(#${boneGradId})`}
          strokeWidth="2"
        />

        {/* Glowing Dragon Eyes */}
        <polygon points="72,34 83,38 75,42" fill={theme.eye} />
        <polygon points="108,34 97,38 105,42" fill={theme.eye} />

        {/* Pulsing Dragon Breath Core */}
        <motion.circle
          cx="90"
          cy="54"
          r="8"
          fill={`url(#${fireGradId})`}
          animate={shouldAnimate ? { scale: [0.8, 1.35, 0.8], opacity: [0.6, 1, 0.6] } : undefined}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.svg>

      {/* 5. Bottom Dragon Claws & Spiked Tail Crest */}
      <svg
        viewBox="0 0 260 40"
        className="pointer-events-none absolute -bottom-3.5 left-1/2 -translate-x-1/2 w-56 sm:w-64 h-9 z-20 overflow-visible"
        style={{ filter: `drop-shadow(0 0 8px ${theme.primary}88)` }}
        aria-hidden="true"
      >
        {/* Left & Right Dragon Talons gripping bottom edge */}
        <path d="M24 12 L14 28 L26 22 L28 32 L36 18 Z" fill={`url(#${boneGradId})`} />
        <path d="M236 12 L246 28 L234 22 L232 32 L224 18 Z" fill={`url(#${boneGradId})`} />
        {/* Center Coiled Tail Barb */}
        <path
          d="M75 14 Q130 34 185 14 Q155 24 130 36 Q105 24 75 14 Z"
          fill={`url(#${wingGradId})`}
          stroke={`url(#${boneGradId})`}
          strokeWidth="1.5"
        />
        <polygon points="130,39 122,22 130,27 138,22" fill={theme.highlight} />
      </svg>

      {/* 6. Floating Elemental Dragon Sparks along Card Edges */}
      {shouldAnimate && (
        <div className="pointer-events-none absolute inset-0 overflow-visible z-20" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => {
            const isLeft = i % 2 === 0;
            return (
              <motion.span
                key={i}
                className="absolute rounded-full"
                style={{
                  [isLeft ? "left" : "right"]: -4,
                  top: `${18 + i * 13}%`,
                  width: 5,
                  height: 9,
                  background: i % 3 === 0 ? theme.highlight : theme.primary,
                  boxShadow: `0 0 10px ${theme.primary}`,
                }}
                animate={{
                  y: [0, -22, 0],
                  opacity: [0.2, 1, 0.2],
                  scale: [0.6, 1.25, 0.6],
                }}
                transition={{
                  duration: 1.9 + (i % 3) * 0.4,
                  repeat: Infinity,
                  delay: i * 0.25,
                  ease: "easeInOut",
                }}
              />
            );
          })}
        </div>
      )}

      {/* Optional Dragon Tier Price / Rank Pill */}
      {showBadge && (
        <div
          className="pointer-events-none absolute top-3 right-3 z-30 rounded-full border px-2.5 py-0.5 text-[10px] font-black backdrop-blur-md"
          style={{
            borderColor: `${theme.primary}66`,
            background: "rgba(6, 9, 17, 0.82)",
            color: theme.highlight,
            boxShadow: `0 0 12px ${theme.primary}44`,
          }}
        >
          {theme.labelAr}
        </div>
      )}

      {/* Card Content */}
      <div className="relative z-10">{children}</div>
    </div>
  );
}
