import React, { useId } from "react";
import { motion } from "framer-motion";
import { usePerformanceMode } from "@/lib/PerformanceContext";

function Relic3DShape({ kind, gradMain, gradFacet, gradRim, color }) {
  const main = `url(#${gradMain})`;
  const facet = `url(#${gradFacet})`;
  const rim = `url(#${gradRim})`;

  switch (kind) {
    case "saturn":
      return (
        <>
          <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke={rim} strokeWidth="4.5" transform="rotate(-18 32 32)" />
          <circle cx="32" cy="32" r="13.5" fill={main} stroke="#ffffff" strokeWidth="0.8" strokeOpacity="0.6" />
          <path d="M22 25 C26 20, 35 20, 39 24 C34 22, 26 23, 22 25 Z" fill="#ffffff" fillOpacity="0.7" />
          <ellipse cx="32" cy="32" rx="28" ry="10" fill="none" stroke="#ffffff" strokeWidth="1.2" strokeDasharray="18 24" transform="rotate(-18 32 32)" />
        </>
      );
    case "star":
      return (
        <>
          <polygon points="32,3 39,22 59,23 43,35 49,55 32,43 15,55 21,35 5,23 25,22" fill={main} stroke="#ffffff" strokeWidth="1" />
          <polygon points="32,3 39,22 32,32 25,22" fill={facet} />
          <polygon points="32,32 59,23 43,35" fill={facet} />
          <polygon points="32,32 15,55 21,35" fill={facet} />
          <circle cx="32" cy="30" r="5" fill="#ffffff" fillOpacity="0.85" />
        </>
      );
    case "heart":
      return (
        <>
          <path d="M32 55 C32 55, 7 40, 7 22 C7 11, 18 6, 27 13 L32 18 L37 13 C46 6, 57 11, 57 22 C57 40, 32 55, 32 55 Z" fill={main} stroke="#ffffff" strokeWidth="1.2" />
          <polygon points="32,18 46,14 51,26 32,36" fill={facet} />
          <polygon points="32,18 18,14 13,26 32,36" fill="#ffffff" fillOpacity="0.3" />
          <polygon points="20,24 32,36 32,53 12,35" fill={rim} fillOpacity="0.45" />
          <circle cx="22" cy="19" r="3" fill="#ffffff" fillOpacity="0.9" />
        </>
      );
    case "flame":
      return (
        <>
          <path d="M34 4 C40 16, 56 24, 52 42 C49 54, 38 60, 28 58 C14 55, 9 41, 15 27 C19 19, 25 24, 26 29 C23 18, 27 10, 34 4 Z" fill={main} stroke="#ffffff" strokeWidth="0.9" />
          <path d="M33 18 C38 26, 45 32, 42 44 C39 51, 31 54, 26 50 C21 46, 22 36, 28 31 C30 27, 31 22, 33 18 Z" fill={facet} />
          <circle cx="33" cy="44" r="5.5" fill="#ffffff" fillOpacity="0.9" />
        </>
      );
    case "magic":
      return (
        <>
          <polygon points="32,4 44,20 60,32 44,44 32,60 20,44 4,32 20,20" fill={main} stroke="#ffffff" strokeWidth="1.1" />
          <polygon points="32,4 44,20 32,32 20,20" fill={facet} />
          <polygon points="32,32 60,32 44,44" fill={rim} />
          <circle cx="32" cy="32" r="7" fill="#ffffff" fillOpacity="0.9" />
        </>
      );
    case "crown":
      return (
        <>
          <path d="M7 46 L11 18 L23 30 L32 10 L41 30 L53 18 L57 46 Z" fill={main} stroke="#ffffff" strokeWidth="1.2" />
          <polygon points="32,10 41,30 32,44 23,30" fill={facet} />
          <rect x="9" y="46" width="46" height="7" rx="3" fill={rim} stroke="#ffffff" strokeWidth="0.9" />
          <circle cx="32" cy="28" r="3.5" fill="#ffffff" />
          <circle cx="18" cy="33" r="2.5" fill="#ffffff" />
          <circle cx="46" cy="33" r="2.5" fill="#ffffff" />
        </>
      );
    case "dragon":
      return (
        <>
          <path d="M30 24 C18 8, 5 10, 3 20 C12 22, 15 30, 9 41 C19 38, 25 42, 30 53 Z" fill={main} stroke="#ffffff" strokeWidth="0.9" />
          <path d="M34 24 C46 8, 59 10, 61 20 C52 22, 49 30, 55 41 C45 38, 39 42, 34 53 Z" fill={main} stroke="#ffffff" strokeWidth="0.9" />
          <polygon points="32,8 41,22 37,54 32,60 27,54 23,22" fill={facet} stroke="#ffffff" strokeWidth="1" />
          <circle cx="29" cy="22" r="2" fill="#ffffff" />
          <circle cx="35" cy="22" r="2" fill="#ffffff" />
        </>
      );
    case "thunder":
      return (
        <>
          <polygon points="38,3 13,34 29,34 22,61 52,26 35,26" fill={main} stroke="#ffffff" strokeWidth="1.2" />
          <polygon points="38,3 29,34 35,26" fill="#ffffff" fillOpacity="0.65" />
        </>
      );
    case "crystal":
      return (
        <>
          <polygon points="32,3 54,20 46,53 32,61 18,53 10,20" fill={main} stroke="#ffffff" strokeWidth="1.2" />
          <polygon points="32,3 54,20 32,32" fill={facet} />
          <polygon points="10,20 32,32 32,3" fill="#ffffff" fillOpacity="0.45" />
          <polygon points="18,53 32,32 46,53 32,61" fill={rim} fillOpacity="0.65" />
          <circle cx="26" cy="19" r="3" fill="#ffffff" />
        </>
      );
    case "phoenix":
      return (
        <>
          <path d="M31 22 C18 6, 5 9, 4 19 C14 21, 16 30, 8 43 C20 40, 26 46, 31 58 Z" fill={main} stroke="#ffffff" strokeWidth="0.9" />
          <path d="M33 22 C46 6, 59 9, 60 19 C50 21, 48 30, 56 43 C44 40, 38 46, 33 58 Z" fill={main} stroke="#ffffff" strokeWidth="0.9" />
          <polygon points="32,6 39,27 32,57 25,27" fill={facet} stroke="#ffffff" strokeWidth="0.9" />
          <circle cx="32" cy="24" r="4" fill="#ffffff" />
        </>
      );
    case "moon":
      return (
        <>
          <path d="M46 8 C28 11, 19 25, 23 40 C26 51, 38 57, 51 51 C42 61, 25 63, 14 52 C2 41, 4 20, 18 10 C27 3, 38 3, 46 8 Z" fill={main} stroke="#ffffff" strokeWidth="1.1" />
          <circle cx="42" cy="24" r="4" fill="#ffffff" fillOpacity="0.9" />
        </>
      );
    case "void":
      return (
        <>
          <ellipse cx="32" cy="32" rx="26" ry="15" fill="none" stroke={main} strokeWidth="4.5" />
          <circle cx="32" cy="32" r="12" fill={facet} stroke="#ffffff" strokeWidth="1" />
          <circle cx="32" cy="32" r="5.5" fill="#05070e" stroke={color} strokeWidth="1.5" />
          <circle cx="28" cy="28" r="2.2" fill="#ffffff" />
        </>
      );
    default:
      return <circle cx="32" cy="32" r="20" fill={main} />;
  }
}

export default function OrbitEffectGlyph({
  kind,
  color = "#67e8f9",
  secondary = "#a855f7",
  size = 44,
  animated = true,
  className = "",
}) {
  const { isPowerSaver } = usePerformanceMode();
  const id = useId().replace(/:/g, "");
  const gradMain = `orb-m-${id}`;
  const gradFacet = `orb-f-${id}`;
  const gradRim = `orb-r-${id}`;
  const shouldAnimate = animated && !isPowerSaver;

  return (
    <motion.span
      className={`relative inline-grid place-items-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        color,
        filter: `drop-shadow(0 0 ${Math.max(6, size * 0.24)}px ${color}aa)`,
      }}
      animate={
        shouldAnimate
          ? {
              y: [-2.5, 2.5, -2.5],
              rotate: [-5, 5, -5],
              scale: [0.96, 1.06, 0.96],
            }
          : undefined
      }
      transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
      aria-hidden="true"
    >
      {/* Back 3D Collectible Aura */}
      <span
        className="absolute inset-[12%] rounded-full opacity-55 blur-md"
        style={{ background: `radial-gradient(circle, #ffffff 0%, ${color} 55%, transparent 100%)` }}
      />

      <svg viewBox="0 0 64 64" className="relative h-full w-full overflow-visible" focusable="false">
        <defs>
          <linearGradient id={gradMain} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" />
            <stop offset="38%" stopColor={color} />
            <stop offset="82%" stopColor={secondary || color} />
            <stop offset="100%" stopColor="#090d16" />
          </linearGradient>
          <linearGradient id={gradFacet} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.92" />
            <stop offset="55%" stopColor={color} stopOpacity="0.85" />
            <stop offset="100%" stopColor={secondary || color} stopOpacity="0.9" />
          </linearGradient>
          <linearGradient id={gradRim} x1="100%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor={secondary || "#fbbf24"} />
            <stop offset="100%" stopColor={color} />
          </linearGradient>
        </defs>

        <Relic3DShape
          kind={kind}
          gradMain={gradMain}
          gradFacet={gradFacet}
          gradRim={gradRim}
          color={color}
        />

        {/* Animated Specular Glint Star */}
        {shouldAnimate && (
          <motion.g
            style={{ transformOrigin: "48px 16px" }}
            animate={{ scale: [0.4, 1.25, 0.4], opacity: [0.3, 1, 0.3], rotate: [0, 90, 180] }}
            transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
          >
            <path d="M48 9 L50 14 L55 16 L50 18 L48 23 L46 18 L41 16 L46 14 Z" fill="#ffffff" />
          </motion.g>
        )}
      </svg>
    </motion.span>
  );
}
