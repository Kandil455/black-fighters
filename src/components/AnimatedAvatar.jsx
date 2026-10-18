import React, { useEffect, useId, useState } from "react";
import { motion } from "framer-motion";
import { AVATAR_FRAMES, resolveAvatarFrame } from "@/lib/avatars";
import AvatarVideo from "@/components/profile/AvatarVideo";
import { usePerformanceMode } from "@/lib/PerformanceContext";

// Subtle floating particles matching each frame's artistic theme
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
              left: `${50 + Math.cos(angle) * 55}%`,
              top: `${50 + Math.sin(angle) * 55}%`,
              width: Math.max(2.5, size * 0.05),
              height: Math.max(2.5, size * 0.05),
              background: color,
              boxShadow: `0 0 6px ${color}`,
            }}
            animate={{
              y: [0, -size * 0.07, 0],
              opacity: [0.35, 0.9, 0.35],
              scale: [0.8, 1.2, 0.8],
            }}
            transition={{
              duration: 2.2 + (i % 3) * 0.4,
              repeat: Infinity,
              delay: i * 0.2,
              ease: "easeInOut",
            }}
          />
        );
      })}
    </div>
  );
}

/**
 * Multi-layered Artistic Vector Frame Overlay matching the 10 reference designs
 * from the user's reference sheet (zero AI-generated raster images).
 */
function ReferenceFrameArt({ archetype, glow, accent2, uid, shouldAnimate }) {
  if (!archetype || archetype === "none") return null;
  const gradId = `bf-frame-grad-${uid}`;
  const subGradId = `bf-frame-sub-${uid}`;

  return (
    <motion.svg
      viewBox="0 0 120 120"
      className="absolute pointer-events-none overflow-visible"
      style={{
        inset: "-24%",
        width: "148%",
        height: "148%",
        zIndex: 6,
      }}
      animate={shouldAnimate ? { scale: [1, 1.018, 1] } : undefined}
      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
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

      {/* 1. ZEN CRIMSON INK ENSO — Black & Red Japanese Calligraphy Brush Ring + Splatter */}
      {archetype === "zen_crimson_enso" && (
        <g>
          {/* Heavy Black Sumi-e Brush Arc */}
          <path
            d="M 24 82 A 43 43 0 1 1 97 80 C 90 96, 68 106, 44 101 C 62 103, 84 93, 91 77 A 38 38 0 1 0 28 77 Z"
            fill="#0b0f17"
            stroke="#1e293b"
            strokeWidth="0.8"
          />
          {/* Crimson Inner & Outer Dry-Brush Strokes */}
          <path
            d="M 18 56 A 42 42 0 0 1 88 26"
            fill="none"
            stroke="#dc2626"
            strokeWidth="3.8"
            strokeLinecap="round"
          />
          <path
            d="M 88 30 A 41 41 0 0 1 94 86"
            fill="none"
            stroke="#ef4444"
            strokeWidth="2.6"
            strokeDasharray="18 4 8 3"
            strokeLinecap="round"
          />
          <path
            d="M 26 86 C 40 102, 70 105, 92 88"
            fill="none"
            stroke="#991b1b"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          {/* Calligraphy Brush Feathered Tails (Bottom-Left) */}
          <path
            d="M 21 72 Q 12 85 19 94 M 25 78 Q 17 90 27 98 M 31 84 Q 24 94 35 101"
            fill="none"
            stroke="#dc2626"
            strokeWidth="1.6"
            strokeLinecap="round"
          />
          {/* Ink Splatters (Red & Black) */}
          <circle cx="14" cy="44" r="2.2" fill="#dc2626" />
          <circle cx="11" cy="52" r="1.2" fill="#0f172a" />
          <circle cx="96" cy="24" r="2" fill="#ef4444" />
          <circle cx="104" cy="34" r="1.4" fill="#dc2626" />
          <circle cx="102" cy="84" r="2.1" fill="#0f172a" />
          <circle cx="95" cy="94" r="1.5" fill="#dc2626" />
          <circle cx="22" cy="98" r="1.8" fill="#ef4444" />
        </g>
      )}

      {/* 2. CELESTIAL ICE CRYSTAL — Icy Blue Ring, 4-Point Stars & Crystal Branches */}
      {archetype === "celestial_ice_crystal" && (
        <g>
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#bae6fd" strokeWidth="2.2" />
          <circle
            cx="60"
            cy="60"
            r="44"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="1.1"
            strokeDasharray="8 4 2 4"
          />
          {/* Top-Left Crystal Cluster & Frost Branch */}
          <polygon points="24,30 15,20 28,23 23,11 33,21 38,14 35,26" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.9" />
          <polygon points="18,42 8,38 19,35 14,27 23,33" fill="#7dd3fc" stroke="#ffffff" strokeWidth="0.7" />
          {/* Bottom-Right Crystal Cluster & Frost Branch */}
          <polygon points="96,90 105,100 92,97 97,109 87,99 82,106 85,94" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.9" />
          <polygon points="102,78 112,82 101,85 106,93 97,87" fill="#7dd3fc" stroke="#ffffff" strokeWidth="0.7" />
          {/* 4-Point Celestial Stars */}
          <polygon points="88,18 90,24 96,26 90,28 88,34 86,28 80,26 86,24" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.6" />
          <polygon points="28,92 30,96 34,98 30,100 28,104 26,100 22,98 26,96" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.6" />
          <polygon points="14,62 16,65 19,66 16,67 14,70 12,67 9,66 12,65" fill="#e0f2fe" />
          <polygon points="106,52 108,55 111,56 108,57 106,60 104,57 101,56 104,55" fill="#e0f2fe" />
          {/* Hanging Crystal Drops */}
          <polygon points="60,102 63,109 60,115 57,109" fill="#bae6fd" stroke="#ffffff" strokeWidth="0.7" />
        </g>
      )}

      {/* 3. LUMINOUS BUTTERFLY MOON — Glowing Cyan Crescent, Top-Right Butterfly & Bottom-Left White Bird */}
      {archetype === "luminous_butterfly_moon" && (
        <g>
          {/* Glowing Crescent Ring */}
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#38bdf8" strokeWidth="2" />
          <path
            d="M 22 44 A 42 42 0 1 0 88 92 A 39 39 0 1 1 22 44 Z"
            fill="#00f2fe"
            fillOpacity="0.85"
          />
          {/* Top-Right Glowing Cyan & White Butterfly */}
          <g transform="translate(88, 24) rotate(22)">
            <path
              d="M 0 0 C -12 -14, -22 -6, -12 4 C -18 10, -10 18, 0 6 C 10 18, 18 10, 12 4 C 22 -6, 12 -14, 0 0 Z"
              fill="#38bdf8"
              stroke="#ffffff"
              strokeWidth="1.1"
            />
            <path
              d="M 0 0 C -8 -9, -14 -4, -7 2 C 7 2, 14 -4, 8 -9 Z"
              fill="#e0f2fe"
            />
            <line x1="0" y1="-5" x2="0" y2="8" stroke="#ffffff" strokeWidth="1.4" strokeLinecap="round" />
          </g>
          {/* Bottom-Left Graceful White Bird / Dove Silhouette */}
          <g transform="translate(26, 88) rotate(-18)">
            <path
              d="M -12 -4 C -4 -12, 4 -8, 8 -2 C 14 -10, 22 -8, 16 2 C 10 8, 0 10, -8 6 L -16 10 L -11 3 Z"
              fill="#ffffff"
              stroke="#bae6fd"
              strokeWidth="0.9"
            />
          </g>
          {/* Twinkling Stardust */}
          <circle cx="72" cy="15" r="1.8" fill="#ffffff" />
          <circle cx="102" cy="40" r="1.6" fill="#00f2fe" />
          <circle cx="16" cy="72" r="1.8" fill="#ffffff" />
          <circle cx="44" cy="103" r="1.5" fill="#7dd3fc" />
        </g>
      )}

      {/* 4. WATERCOLOR BLUE FLORA — Soft Sky-Blue & Cobalt Floral Wreath */}
      {archetype === "watercolor_blue_flora" && (
        <g>
          {/* Botanical Vine Ring */}
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#60a5fa" strokeWidth="2" />
          <path
            d="M 18 55 Q 14 78 36 96 Q 60 108 86 94 Q 106 76 101 50"
            fill="none"
            stroke="#3b82f6"
            strokeWidth="1.6"
          />
          {/* Watercolor Leaves */}
          <path d="M 17 48 Q 7 42 13 33 Q 21 38 19 48 Z" fill="#93c5fd" stroke="#2563eb" strokeWidth="0.7" />
          <path d="M 24 88 Q 14 94 18 103 Q 28 99 26 89 Z" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="0.7" />
          <path d="M 96 86 Q 106 92 102 101 Q 92 97 94 87 Z" fill="#93c5fd" stroke="#2563eb" strokeWidth="0.7" />
          <path d="M 102 46 Q 112 40 106 31 Q 98 36 100 46 Z" fill="#60a5fa" stroke="#1d4ed8" strokeWidth="0.7" />
          {/* 5-Petal Watercolor Blue Flowers (Left, Bottom-Left, Bottom-Right, Right) */}
          {[
            { cx: 19, cy: 66, r: 8, fill: "#60a5fa", core: "#fef08a" },
            { cx: 40, cy: 97, r: 9.5, fill: "#3b82f6", core: "#ffffff" },
            { cx: 78, cy: 97, r: 8.5, fill: "#60a5fa", core: "#fef08a" },
            { cx: 101, cy: 66, r: 8, fill: "#93c5fd", core: "#1d4ed8" },
            { cx: 60, cy: 103, r: 7, fill: "#dbeafe", core: "#2563eb" },
          ].map((fl, idx) => (
            <g key={idx} transform={`translate(${fl.cx}, ${fl.cy})`}>
              <circle cx="0" cy={-fl.r * 0.55} r={fl.r * 0.48} fill={fl.fill} stroke="#eff6ff" strokeWidth="0.6" />
              <circle cx={fl.r * 0.52} cy={-fl.r * 0.18} r={fl.r * 0.48} fill={fl.fill} stroke="#eff6ff" strokeWidth="0.6" />
              <circle cx={fl.r * 0.32} cy={fl.r * 0.45} r={fl.r * 0.48} fill={fl.fill} stroke="#eff6ff" strokeWidth="0.6" />
              <circle cx={-fl.r * 0.32} cy={fl.r * 0.45} r={fl.r * 0.48} fill={fl.fill} stroke="#eff6ff" strokeWidth="0.6" />
              <circle cx={-fl.r * 0.52} cy={-fl.r * 0.18} r={fl.r * 0.48} fill={fl.fill} stroke="#eff6ff" strokeWidth="0.6" />
              <circle cx="0" cy="0" r={fl.r * 0.26} fill={fl.core} />
            </g>
          ))}
        </g>
      )}

      {/* 5. BOTANICAL AZURE BLOSSOMS — Delicate Silver-Blue Branch & Sakura Blossoms */}
      {archetype === "botanical_azure_blossoms" && (
        <g>
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#bae6fd" strokeWidth="1.9" />
          <circle cx="60" cy="60" r="43.5" fill="none" stroke="#38bdf8" strokeWidth="0.7" strokeOpacity="0.6" />
          {/* Delicate Silver-Blue Twigs */}
          <path d="M 18 72 C 12 52, 18 32, 34 20" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          <path d="M 102 48 C 108 68, 98 88, 80 99" fill="none" stroke="#475569" strokeWidth="1.5" strokeLinecap="round" />
          {/* Azure Sakura Blossoms on Top-Left & Bottom-Right */}
          {[
            { cx: 20, cy: 48, s: 1 },
            { cx: 27, cy: 32, s: 0.78 },
            { cx: 16, cy: 64, s: 0.72 },
            { cx: 95, cy: 78, s: 1 },
            { cx: 84, cy: 92, s: 0.82 },
            { cx: 101, cy: 63, s: 0.7 },
          ].map((b, i) => (
            <g key={i} transform={`translate(${b.cx}, ${b.cy}) scale(${b.s})`}>
              <circle cx="0" cy="-5" r="4.2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.7" />
              <circle cx="4.8" cy="-1.5" r="4.2" fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.7" />
              <circle cx="3" cy="4" r="4.2" fill="#7dd3fc" stroke="#38bdf8" strokeWidth="0.7" />
              <circle cx="-3" cy="4" r="4.2" fill="#e0f2fe" stroke="#38bdf8" strokeWidth="0.7" />
              <circle cx="-4.8" cy="-1.5" r="4.2" fill="#bae6fd" stroke="#38bdf8" strokeWidth="0.7" />
              <circle cx="0" cy="0" r="2" fill="#0284c7" />
              <circle cx="0" cy="0" r="0.9" fill="#fef08a" />
            </g>
          ))}
        </g>
      )}

      {/* 6. CRIMSON WING & RUBY CREST — Dark Obsidian & Red Feathered Wing + Ruby Gem */}
      {archetype === "crimson_wing_ruby" && (
        <g>
          {/* Dark Obsidian & Crimson Metallic Ring */}
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#1e293b" strokeWidth="3" />
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#dc2626" strokeWidth="1.4" strokeDasharray="22 8" />
          {/* Sweeping Dark & Crimson Feathered Wing on Left/Top-Left */}
          <path
            d="M 52 18 C 30 14, 10 28, 6 52 C 12 46, 18 44, 22 45 C 10 54, 6 70, 14 84 C 18 76, 23 73, 27 74 C 19 84, 22 96, 34 102 C 24 84, 20 56, 32 34 C 38 25, 45 20, 52 18 Z"
            fill="#0f172a"
            stroke="#ef4444"
            strokeWidth="1.1"
          />
          <path
            d="M 42 22 C 24 24, 12 38, 10 56 C 16 50, 22 48, 25 50 C 16 60, 15 74, 22 86 C 24 72, 26 48, 42 22 Z"
            fill="#dc2626"
            fillOpacity="0.88"
          />
          {/* Right Gothic Filigree & Bottom-Right Glowing Ruby Gem */}
          <path
            d="M 96 42 C 106 56, 105 78, 92 94 L 84 99"
            fill="none"
            stroke="#0f172a"
            strokeWidth="2.8"
            strokeLinecap="round"
          />
          <polygon
            points="88,84 95,91 88,100 81,91"
            fill="#ef4444"
            stroke="#fecaca"
            strokeWidth="1"
          />
          <polygon points="88,87 92,91 88,96 84,91" fill="#991b1b" />
          {/* Crimson Feather Sparks */}
          <polygon points="16,28 22,24 19,32" fill="#ef4444" />
          <polygon points="10,66 15,62 13,70" fill="#dc2626" />
          <circle cx="96" cy="78" r="2" fill="#ef4444" />
        </g>
      )}

      {/* 7. COILED FROST DRAGON — Silver-Ice Dragon Coiling Around Circle */}
      {archetype === "coiled_frost_dragon" && (
        <g>
          {/* Icy Scaled Dragon Body Coiling Around the Ring */}
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke="#0284c7"
            strokeWidth="4.2"
            strokeOpacity="0.85"
          />
          <circle
            cx="60"
            cy="60"
            r="42"
            fill="none"
            stroke="#e0f2fe"
            strokeWidth="2.4"
            strokeDasharray="6 3"
          />
          {/* Outer Dorsal Ice Spikes Along Left & Bottom Arc */}
          <path
            d="M 28 28 L 19 22 L 23 33 L 13 31 L 19 41 L 9 43 L 17 52 L 8 58 L 18 65 L 11 74 L 22 78"
            fill="none"
            stroke="#bae6fd"
            strokeWidth="1.5"
            strokeLinejoin="round"
          />
          {/* Horned Frost Dragon Head (Top-Right) */}
          <path
            d="M 62 16 C 76 8, 94 12, 104 24 L 96 26 L 106 34 L 92 34 L 86 28 Q 74 20 62 16 Z"
            fill="#e0f2fe"
            stroke="#0284c7"
            strokeWidth="1.1"
          />
          {/* Dragon Swept Ice Horns */}
          <path d="M 74 16 L 64 4 L 82 12 M 82 14 L 76 2 L 90 12" fill="#38bdf8" stroke="#ffffff" strokeWidth="0.8" />
          {/* Glowing Dragon Eye */}
          <circle cx="89" cy="23" r="1.8" fill="#00f2fe" />
          {/* Sweeping Dragon Wing on Right & Whipping Forked Tail on Bottom */}
          <path
            d="M 98 42 C 114 48, 116 68, 102 84 C 105 72, 101 66, 95 64 C 103 58, 102 49, 98 42 Z"
            fill="#bae6fd"
            stroke="#0284c7"
            strokeWidth="1"
          />
          <path
            d="M 30 92 C 44 108, 68 112, 88 96 L 96 104 L 92 92 L 102 91"
            fill="none"
            stroke="#38bdf8"
            strokeWidth="2.2"
            strokeLinecap="round"
          />
        </g>
      )}

      {/* 8. CRIMSON ROSES & DARK THORNS — Black Thorny Vines & Red Blooming Roses */}
      {archetype === "crimson_roses_thorns" && (
        <g>
          {/* Intertwined Black Thorny Vines */}
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#111827" strokeWidth="2.8" />
          <path
            d="M 18 52 C 14 28, 38 14, 62 18 C 88 22, 106 42, 101 68 C 96 94, 72 106, 46 101 C 22 96, 12 74, 18 52 Z"
            fill="none"
            stroke="#1f2937"
            strokeWidth="1.8"
          />
          {/* Sharp Black Thorns */}
          <polygon points="36,19 32,12 40,17" fill="#111827" />
          <polygon points="82,21 88,15 86,24" fill="#111827" />
          <polygon points="103,52 110,48 104,57" fill="#111827" />
          <polygon points="17,68 10,72 18,74" fill="#111827" />
          <polygon points="52,102 48,110 57,103" fill="#111827" />
          {/* Crimson Velvet Blooming Roses (Top-Left, Right, Bottom-Left, Bottom-Right) */}
          {[
            { cx: 22, cy: 36, r: 9 },
            { cx: 99, cy: 38, r: 7.5 },
            { cx: 96, cy: 82, r: 9.5 },
            { cx: 28, cy: 90, r: 8.5 },
            { cx: 68, cy: 102, r: 7.5 },
          ].map((rose, i) => (
            <g key={i} transform={`translate(${rose.cx}, ${rose.cy})`}>
              {/* Dark Leaf Base */}
              <path d={`M -${rose.r} -2 Q -${rose.r * 1.4} -${rose.r} -3 -${rose.r * 0.8} Z`} fill="#111827" />
              <path d={`M ${rose.r} 2 Q ${rose.r * 1.4} ${rose.r} 3 ${rose.r * 0.8} Z`} fill="#111827" />
              {/* Outer Crimson Petals */}
              <circle cx="0" cy="0" r={rose.r} fill="#9f1239" stroke="#4c0519" strokeWidth="0.8" />
              <circle cx="-1.5" cy="-1" r={rose.r * 0.75} fill="#be123c" />
              <circle cx="1" cy="1" r={rose.r * 0.55} fill="#e11d48" />
              {/* Inner Rose Swirl */}
              <path
                d="M -3 0 A 3 3 0 1 1 3 1 A 1.8 1.8 0 1 1 -1.5 -1"
                fill="none"
                stroke="#fda4af"
                strokeWidth="0.9"
                strokeLinecap="round"
              />
            </g>
          ))}
        </g>
      )}

      {/* 9. MONOCHROME INK BUTTERFLIES — Black & Silver Ink Ring + Fluttering Butterflies */}
      {archetype === "monochrome_ink_butterflies" && (
        <g>
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#1e293b" strokeWidth="2.4" />
          <circle
            cx="60"
            cy="60"
            r="43.5"
            fill="none"
            stroke="#cbd5e1"
            strokeWidth="1"
            strokeDasharray="14 6 4 6"
          />
          {/* Flock of Monochrome Ink Butterflies along Top-Left, Right & Bottom-Right */}
          {[
            { x: 24, y: 28, scale: 0.9, rot: -28 },
            { x: 94, y: 30, scale: 1.05, rot: 25 },
            { x: 103, y: 54, scale: 0.78, rot: 42 },
            { x: 96, y: 78, scale: 0.95, rot: 18 },
            { x: 78, y: 98, scale: 0.75, rot: -12 },
            { x: 18, y: 74, scale: 0.72, rot: -35 },
          ].map((bf, i) => (
            <g key={i} transform={`translate(${bf.x}, ${bf.y}) rotate(${bf.rot}) scale(${bf.scale})`}>
              <path
                d="M 0 0 C -10 -12, -18 -4, -9 3 C -14 8, -7 14, 0 5 C 7 14, 14 8, 9 3 C 18 -4, 10 -12, 0 0 Z"
                fill="#0f172a"
                stroke="#f8fafc"
                strokeWidth="0.9"
              />
              <circle cx="-6" cy="-3" r="1.3" fill="#f8fafc" />
              <circle cx="6" cy="-3" r="1.3" fill="#f8fafc" />
            </g>
          ))}
          {/* Ink Dust Dots */}
          <circle cx="84" cy="16" r="1.5" fill="#cbd5e1" />
          <circle cx="108" cy="42" r="1.3" fill="#0f172a" />
          <circle cx="104" cy="90" r="1.6" fill="#cbd5e1" />
          <circle cx="16" cy="40" r="1.4" fill="#94a3b8" />
        </g>
      )}

      {/* 10. CRYSTAL LEAF & GLOWING ORBS WREATH — Symmetric Translucent Ice Leaves & Dewdrop Orbs */}
      {archetype === "crystal_leaf_wreath" && (
        <g>
          <circle cx="60" cy="60" r="41.5" fill="none" stroke="#a5f3fc" strokeWidth="2.2" />
          <circle cx="60" cy="60" r="44" fill="none" stroke="#ffffff" strokeWidth="0.9" strokeOpacity="0.7" />
          {/* Left & Right Crystal Leaf Pairs */}
          {[
            { x: 18, y: 68, rot: -20 },
            { x: 17, y: 48, rot: 15 },
            { x: 26, y: 30, rot: 42 },
            { x: 102, y: 68, rot: 200 },
            { x: 103, y: 48, rot: 165 },
            { x: 94, y: 30, rot: 138 },
            { x: 38, y: 94, rot: -55 },
            { x: 82, y: 94, rot: 235 },
          ].map((lf, i) => (
            <g key={i} transform={`translate(${lf.x}, ${lf.y}) rotate(${lf.rot})`}>
              <path
                d="M 0 0 Q -9 -6 -12 -16 Q -2 -12 0 0 Z"
                fill="#e0f2fe"
                fillOpacity="0.88"
                stroke="#38bdf8"
                strokeWidth="0.8"
              />
              <path
                d="M 0 0 Q 7 -8 6 -17 Q -1 -11 0 0 Z"
                fill="#67e8f9"
                fillOpacity="0.75"
                stroke="#ffffff"
                strokeWidth="0.7"
              />
            </g>
          ))}
          {/* Top & Bottom Crystal Crown Gem & Glowing Dewdrop Orbs */}
          <polygon points="60,10 64,17 60,23 56,17" fill="#ffffff" stroke="#38bdf8" strokeWidth="0.8" />
          <polygon points="60,97 65,105 60,113 55,105" fill="#a5f3fc" stroke="#ffffff" strokeWidth="0.9" />
          <circle cx="44" cy="18" r="2.2" fill="#ffffff" />
          <circle cx="76" cy="18" r="2.2" fill="#ffffff" />
          <circle cx="24" cy="84" r="2.5" fill="#67e8f9" stroke="#ffffff" strokeWidth="0.7" />
          <circle cx="96" cy="84" r="2.5" fill="#67e8f9" stroke="#ffffff" strokeWidth="0.7" />
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

  const f = resolveAvatarFrame(frame);
  const hasFrame = Boolean(frame && frame !== "none" && f !== AVATAR_FRAMES.none);
  const pad = hasFrame ? Math.max(3, Math.round(size * 0.09)) : 0;
  const glow = f.glow || "#19f08c";
  const accent2 = f.accent2 || "#38bdf8";
  const speed = f.speed || 4;
  const archetype = f.archetype || "celestial_ice_crystal";
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

      {/* Ornate Reference Artistic Vector Frame Around Avatar */}
      {hasFrame && (
        <ReferenceFrameArt
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
