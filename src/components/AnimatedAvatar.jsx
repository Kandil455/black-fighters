import React, { useEffect, useId, useState } from "react";
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
    <div className="absolute inset-0 pointer-events-none overflow-visible" style={{ zIndex: 7 }}>
      {items.map((_, i) => {
        const angle = (i / count) * Math.PI * 2;
        const color = i % 2 === 0 ? glow : accent2 || glow;
        return (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${50 + Math.cos(angle) * 56}%`,
              top: `${50 + Math.sin(angle) * 56}%`,
              width: Math.max(3, size * 0.055),
              height: special === "thunder" || special === "fire" ? Math.max(4, size * 0.095) : Math.max(3, size * 0.055),
              background: color,
              boxShadow: `0 0 8px ${color}`,
            }}
            animate={{
              y: [0, -size * 0.09, 0],
              opacity: [0.35, 0.95, 0.35],
              scale: [0.75, 1.25, 0.75],
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

/**
 * Multi-layered RPG Vector Frame Overlay rendered around the circular avatar.
 * Restores all 8 archetypes defined in AVATAR_FRAMES (dragon, wyvern, phoenix,
 * wings, crown, thunder, runes, shield) while leaving the inner photo unobstructed.
 */
function RpgFrameArt({ archetype, glow, accent2, uid, shouldAnimate }) {
  if (!archetype || archetype === "none") return null;
  const gradId = `bf-frame-grad-${uid}`;
  const subGradId = `bf-frame-sub-${uid}`;

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="absolute pointer-events-none overflow-visible"
      style={{
        inset: "-22%",
        width: "144%",
        height: "144%",
        zIndex: 6,
        filter: `drop-shadow(0 0 6px ${glow}99)`,
      }}
      animate={shouldAnimate ? { scale: [1, 1.025, 1] } : undefined}
      transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
    >
      <defs>
        <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={glow} />
          <stop offset="50%" stopColor={accent2 || "#ffffff"} />
          <stop offset="100%" stopColor={glow} />
        </linearGradient>
        <linearGradient id={subGradId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={accent2 || glow} />
          <stop offset="100%" stopColor={glow} />
        </linearGradient>
      </defs>

      {/* Base Engraved Outer Metallic Ring */}
      <circle
        cx="60"
        cy="60"
        r="41.5"
        fill="none"
        stroke={`url(#${gradId})`}
        strokeWidth="2.4"
        strokeOpacity="0.92"
      />
      <circle
        cx="60"
        cy="60"
        r="44.5"
        fill="none"
        stroke={accent2 || glow}
        strokeWidth="1"
        strokeDasharray="6 4"
        strokeOpacity="0.65"
      />

      {/* 1. DRAGON ARCHETYPE — Horned Dragon Crest, Swept Scaled Wings & Tail Clasp */}
      {archetype === "dragon" && (
        <g>
          {/* Left & Right Sweeping Dragon Wings */}
          <path
            d="M19 64 C5 52, 4 30, 18 16 C15 28, 17 36, 24 41 C13 38, 11 49, 20 54 C12 54, 13 62, 22 67 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          <path
            d="M101 64 C115 52, 116 30, 102 16 C105 28, 103 36, 96 41 C107 38, 109 49, 100 54 C108 54, 107 62, 98 67 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          {/* Top Dragon Horns & Crown Crest */}
          <path
            d="M44 21 C34 10, 26 6, 22 2 C31 5, 41 11, 49 19 L54 14 L60 5 L66 14 L71 19 C79 11, 89 5, 98 2 C94 6, 86 10, 76 21 Q60 15 44 21 Z"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
          {/* Glowing Dragon Eyes on Top Crest */}
          <circle cx="53" cy="17" r="1.7" fill="#ffffff" />
          <circle cx="67" cy="17" r="1.7" fill="#ffffff" />
          {/* Bottom Dragon Tail & Core Gem */}
          <path
            d="M36 95 Q48 108 60 113 Q72 108 84 95 Q72 102 60 103 Q48 102 36 95 Z"
            fill={`url(#${subGradId})`}
            stroke={accent2}
            strokeWidth="0.8"
          />
          <polygon
            points="60,98 65,105 60,114 55,105"
            fill={accent2 || "#ffffff"}
            stroke={glow}
            strokeWidth="1"
          />
        </g>
      )}

      {/* 2. WYVERN ARCHETYPE — Twin Bahamut Blades, Jagged Horns & Sovereign Claws */}
      {archetype === "wyvern" && (
        <g>
          {/* Jagged Wyvern Blade Wings */}
          <path
            d="M21 74 L4 58 L14 48 L3 34 L17 28 L10 12 L27 23 L32 34 C22 44, 20 58, 25 72 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          <path
            d="M99 74 L116 58 L106 48 L117 34 L103 28 L110 12 L93 23 L88 34 C98 44, 100 58, 95 72 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          {/* Top Sovereign Wyvern Crest & Twin Fangs */}
          <path
            d="M42 22 L35 6 L51 16 L60 2 L69 16 L85 6 L78 22 Q60 16 42 22 Z"
            fill={`url(#${subGradId})`}
            stroke="#ffffff"
            strokeWidth="0.85"
          />
          {/* Bottom Armored Claw & Sovereign Core */}
          <path
            d="M32 91 L44 109 L54 101 L60 116 L66 101 L76 109 L88 91 Q60 103 32 91 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.85"
          />
          <circle cx="60" cy="105" r="3.6" fill="#ffffff" stroke={glow} strokeWidth="1.2" />
        </g>
      )}

      {/* 3. PHOENIX ARCHETYPE — Rising Flame Wings, Solar Plume & 3 Tail Feathers */}
      {archetype === "phoenix" && (
        <g>
          {/* Multi-feathered Rising Phoenix Wings */}
          <path
            d="M24 80 C8 68, 3 44, 14 20 C16 32, 21 38, 25 42 C14 34, 14 20, 26 10 C24 24, 28 32, 33 36 C21 48, 20 65, 27 78 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.85"
          />
          <path
            d="M96 80 C112 68, 117 44, 106 20 C104 32, 99 38, 95 42 C106 34, 106 20, 94 10 C96 24, 92 32, 87 36 C99 48, 100 65, 93 78 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.85"
          />
          {/* Top Phoenix Flame Plume */}
          <path
            d="M50 20 Q55 8 60 3 Q65 8 70 20 Q60 15 50 20 Z"
            fill={`url(#${subGradId})`}
            stroke="#ffffff"
            strokeWidth="0.8"
          />
          <circle cx="60" cy="14" r="2.5" fill={accent2 || "#ffffff"} />
          {/* Flowing Phoenix Tail Feathers */}
          <path
            d="M42 96 Q50 112 46 117 Q55 109 60 118 Q65 109 74 117 Q70 112 78 96 Q60 104 42 96 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* 4. WINGS ARCHETYPE — Seraphim 6-Feather Angelic/Cyber Blades & Halo Star */}
      {archetype === "wings" && (
        <g>
          {/* Left Seraphim Feathers */}
          <path
            d="M22 44 L4 26 L22 33 L6 42 L20 50 L5 58 L21 63 L10 74 L26 74 C20 64, 19 54, 22 44 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.85"
          />
          {/* Right Seraphim Feathers */}
          <path
            d="M98 44 L116 26 L98 33 L114 42 L100 50 L115 58 L99 63 L110 74 L94 74 C100 64, 101 54, 98 44 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.85"
          />
          {/* Top Halo Star */}
          <polygon
            points="60,4 63,13 72,15 63,18 60,26 57,18 48,15 57,13"
            fill={accent2 || "#ffffff"}
            stroke={glow}
            strokeWidth="0.9"
          />
          {/* Bottom Crossed Wing Tips */}
          <path
            d="M38 96 Q60 112 82 96 Q60 104 38 96 Z"
            fill={`url(#${subGradId})`}
            stroke={accent2}
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* 5. CROWN ARCHETYPE — Imperial 5-Peak Sovereign Crown & Golden Laurel Wreath */}
      {archetype === "crown" && (
        <g>
          {/* Royal Imperial Crown on Top */}
          <path
            d="M38 24 L34 9 L47 17 L53 6 L60 15 L67 6 L73 17 L86 9 L82 24 Q60 18 38 24 Z"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.95"
          />
          <circle cx="34" cy="8" r="1.8" fill="#ffffff" />
          <circle cx="53" cy="5" r="2" fill={accent2 || "#ffffff"} />
          <circle cx="67" cy="5" r="2" fill={accent2 || "#ffffff"} />
          <circle cx="86" cy="8" r="1.8" fill="#ffffff" />
          <circle cx="60" cy="18" r="2.3" fill="#ffffff" />
          {/* Left & Right Laurel Wreath Branches */}
          <path
            d="M22 78 C11 64, 11 42, 23 28 C17 44, 17 62, 27 76 Z"
            fill={`url(#${subGradId})`}
          />
          <path
            d="M98 78 C109 64, 109 42, 97 28 C103 44, 103 62, 93 76 Z"
            fill={`url(#${subGradId})`}
          />
          {/* Bottom Sovereign Gem Crest */}
          <polygon
            points="60,96 68,104 60,113 52,104"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.9"
          />
        </g>
      )}

      {/* 6. THUNDER ARCHETYPE — Valkyrie Storm Lightning Arcs & Plasma Spikes */}
      {archetype === "thunder" && (
        <g>
          {/* Top Lightning Crest */}
          <polygon
            points="60,3 52,16 59,16 54,25 69,13 62,13"
            fill={accent2 || "#ffffff"}
            stroke={glow}
            strokeWidth="0.8"
          />
          {/* Left Lightning Bolt Wing */}
          <polygon
            points="16,28 6,46 15,48 5,68 22,52 14,50"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.75"
          />
          {/* Right Lightning Bolt Wing */}
          <polygon
            points="104,28 114,46 105,48 115,68 98,52 106,50"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.75"
          />
          {/* Bottom Storm Conduit */}
          <polygon
            points="44,96 60,114 76,96 65,99 60,106 55,99"
            fill={`url(#${subGradId})`}
            stroke={accent2}
            strokeWidth="0.8"
          />
        </g>
      )}

      {/* 7. RUNES ARCHETYPE — Arcane Sigil Geometry & Floating Void Shards */}
      {archetype === "runes" && (
        <g>
          {/* Outer Arcane Ring & Cardinal Sigil Diamonds */}
          <circle
            cx="60"
            cy="60"
            r="48"
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth="1.3"
            strokeDasharray="10 5 2 5"
          />
          <polygon points="60,4 65,14 60,21 55,14" fill={`url(#${gradId})`} stroke="#ffffff" strokeWidth="0.8" />
          <polygon points="60,99 65,106 60,116 55,106" fill={`url(#${gradId})`} stroke="#ffffff" strokeWidth="0.8" />
          <polygon points="4,60 14,55 21,60 14,65" fill={`url(#${gradId})`} stroke="#ffffff" strokeWidth="0.8" />
          <polygon points="116,60 106,55 99,60 106,65" fill={`url(#${gradId})`} stroke="#ffffff" strokeWidth="0.8" />
          {/* Diagonal Arcane Nodes */}
          <circle cx="24" cy="24" r="3" fill={accent2 || "#ffffff"} stroke={glow} strokeWidth="1" />
          <circle cx="96" cy="24" r="3" fill={accent2 || "#ffffff"} stroke={glow} strokeWidth="1" />
          <circle cx="24" cy="96" r="3" fill={accent2 || "#ffffff"} stroke={glow} strokeWidth="1" />
          <circle cx="96" cy="96" r="3" fill={accent2 || "#ffffff"} stroke={glow} strokeWidth="1" />
        </g>
      )}

      {/* 8. SHIELD ARCHETYPE — Vanguard Paladin Armor Plates & Crest */}
      {archetype === "shield" && (
        <g>
          {/* Left & Right Armored Pauldron Plates */}
          <path
            d="M18 36 L10 46 L10 74 L18 84 L23 76 L20 60 L23 44 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          <path
            d="M102 36 L110 46 L110 74 L102 84 L97 76 L100 60 L97 44 Z"
            fill={`url(#${gradId})`}
            stroke={accent2}
            strokeWidth="0.9"
          />
          {/* Top Vanguard Crest */}
          <polygon
            points="48,18 60,7 72,18 66,21 60,15 54,21"
            fill={`url(#${subGradId})`}
            stroke="#ffffff"
            strokeWidth="0.85"
          />
          {/* Bottom Shield Point */}
          <polygon
            points="46,96 60,113 74,96 60,102"
            fill={`url(#${gradId})`}
            stroke="#ffffff"
            strokeWidth="0.85"
          />
        </g>
      )}
    </motion.svg>
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
  const rawUid = useId();
  const uid = rawUid.replace(/[^a-zA-Z0-9_-]/g, "");

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const f = AVATAR_FRAMES[frame] || AVATAR_FRAMES.none;
  const hasFrame = Boolean(frame && frame !== "none" && f !== AVATAR_FRAMES.none);
  const pad = hasFrame ? Math.max(3, Math.round(size * 0.09)) : 0;
  const glow = f.glow || "#19f08c";
  const accent2 = f.accent2 || "#38bdf8";
  const speed = f.speed || 4;
  const archetype = f.archetype || "dragon";
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
            inset: -size * 0.14,
            background: `radial-gradient(circle, ${glow}55 0%, ${accent2}22 52%, transparent 74%)`,
            zIndex: 1,
          }}
          animate={shouldAnimate ? { opacity: [0.55, 0.95, 0.55], scale: [0.95, 1.06, 0.95] } : undefined}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        />
      )}

      {/* Spinning Conic Energy Frame Ring */}
      {hasFrame && (
        <motion.div
          className="absolute inset-0 rounded-full pointer-events-none"
          style={{
            background: f.gradient || `conic-gradient(from 0deg, ${glow}, ${accent2}, ${glow})`,
            boxShadow: `0 0 ${Math.round(size * 0.22)}px ${glow}88`,
            zIndex: 2,
          }}
          animate={shouldAnimate ? { rotate: 360 } : undefined}
          transition={{ duration: Math.max(3, speed * 1.5), repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Counter-Rotating Precision Ring */}
      {hasFrame && (
        <motion.div
          className="absolute rounded-full pointer-events-none border border-dashed"
          style={{
            inset: -2,
            borderColor: `${glow}99`,
            zIndex: 4,
          }}
          animate={shouldAnimate ? { rotate: -360 } : undefined}
          transition={{ duration: Math.max(8, speed * 3), repeat: Infinity, ease: "linear" }}
        />
      )}

      {/* Inner Avatar Circle */}
      <div
        className="absolute overflow-hidden flex items-center justify-center rounded-full border border-white/20"
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

      {/* Ornate RPG Vector Frame Around Avatar */}
      {hasFrame && (
        <RpgFrameArt
          archetype={archetype}
          glow={glow}
          accent2={accent2}
          uid={uid}
          shouldAnimate={shouldAnimate}
        />
      )}

      {/* Floating Elemental Particles */}
      {hasFrame && shouldAnimate && (
        <SpecialFx special={f.special || "aura"} glow={glow} accent2={accent2} size={size} />
      )}
    </div>
  );
}
