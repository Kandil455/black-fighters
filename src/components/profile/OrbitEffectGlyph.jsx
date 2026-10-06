import React, { useId } from "react";

function GlyphShape({ kind, fillId }) {
  const fill = `url(#${fillId})`;
  switch (kind) {
    case "saturn":
      return <><circle cx="32" cy="32" r="12" fill={fill} /><ellipse cx="32" cy="32" rx="27" ry="10" fill="none" stroke="currentColor" strokeWidth="4" transform="rotate(-14 32 32)" /></>;
    case "star":
      return <path d="M32 4 39 24 60 24 43 37 49 58 32 46 15 58 21 37 4 24 25 24Z" fill={fill} />;
    case "heart":
      return <path d="M32 56S7 42 7 23C7 10 24 5 32 18 40 5 57 10 57 23 57 42 32 56 32 56Z" fill={fill} />;
    case "flame":
      return <path d="M35 4C38 16 29 18 33 27 37 23 42 18 43 13 54 25 58 35 52 47 47 59 31 63 19 55 7 47 8 31 17 21 18 30 23 34 27 35 23 22 28 12 35 4Z" fill={fill} />;
    case "magic":
      return <><path d="M32 3 38 25 61 32 38 39 32 61 26 39 3 32 26 25Z" fill={fill} /><circle cx="51" cy="12" r="4" fill="currentColor" /></>;
    case "crown":
      return <path d="M8 18 21 30 32 9 43 30 56 18 51 51H13Z" fill={fill} stroke="currentColor" strokeWidth="2" />;
    case "dragon":
      return <><path d="M31 24C20 10 8 11 4 16 14 19 15 27 10 36 19 34 25 38 31 49Z" fill={fill} /><path d="M33 24C44 10 56 11 60 16 50 19 49 27 54 36 45 34 39 38 33 49Z" fill={fill} /><path d="M25 31 32 18 39 31 36 54 28 54Z" fill="currentColor" /></>;
    case "thunder":
      return <path d="M38 3 14 35H29L24 61 51 27H36Z" fill={fill} />;
    case "crystal":
      return <><path d="M32 3 54 22 45 54 32 62 19 54 10 22Z" fill={fill} stroke="currentColor" strokeWidth="2" /><path d="M10 22 32 31 54 22M32 3V31M19 54 32 31 45 54" fill="none" stroke="white" strokeOpacity=".65" strokeWidth="2" /></>;
    case "phoenix":
      return <><path d="M31 20C19 5 7 8 4 14 15 17 17 26 8 39 20 37 26 44 31 58Z" fill={fill} /><path d="M33 20C45 5 57 8 60 14 49 17 47 26 56 39 44 37 38 44 33 58Z" fill={fill} /><path d="M32 11 39 29 32 54 25 29Z" fill="currentColor" /></>;
    case "moon":
      return <path d="M46 8C28 11 20 24 23 38 26 50 38 56 51 51 43 61 27 64 15 54 2 43 4 22 18 11 27 4 38 3 46 8Z" fill={fill} />;
    case "void":
      return <><path d="M4 32S15 14 32 14 60 32 60 32 49 50 32 50 4 32 4 32Z" fill="none" stroke="currentColor" strokeWidth="5" /><circle cx="32" cy="32" r="10" fill={fill} /><circle cx="32" cy="32" r="4" fill="#05040a" /></>;
    default:
      return <circle cx="32" cy="32" r="20" fill={fill} />;
  }
}

export default function OrbitEffectGlyph({ kind, color = "#67e8f9", size = 40, animated = false, className = "" }) {
  const id = useId().replace(/:/g, "");
  return (
    <span
      className={`relative inline-grid place-items-center ${animated ? "animate-pulse" : ""} ${className}`}
      style={{ width: size, height: size, color, filter: `drop-shadow(0 0 ${Math.max(5, size * 0.22)}px ${color})` }}
      aria-hidden="true"
    >
      <span className="absolute inset-[18%] rounded-full opacity-50 blur-md" style={{ background: color }} />
      <svg viewBox="0 0 64 64" className="relative h-full w-full overflow-visible" focusable="false">
        <defs>
          <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#fff" />
            <stop offset=".35" stopColor={color} />
            <stop offset="1" stopColor="#05040a" />
          </linearGradient>
        </defs>
        <GlyphShape kind={kind} fillId={id} />
      </svg>
    </span>
  );
}
