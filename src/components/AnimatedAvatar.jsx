import React, { useEffect, useState } from "react";
import AvatarVideo from "@/components/profile/AvatarVideo";

/**
 * AnimatedAvatar — the app's single avatar renderer.
 *
 * HISTORY: this component used to draw eight "RPG" frame archetypes (dragon,
 * wyvern, phoenix, wings, crown, thunder, runes, shield) plus animated elemental
 * particles around the photo. The owner removed all cosmetic RPG layers, so what
 * is left is the part that actually matters: the photo.
 *
 * The public API is unchanged — `src`, `isVideo`, `fallback`, `size`,
 * `className` — so every existing call site keeps working. The `frame`,
 * `animate` and `withSound` props are still accepted and ignored so callers
 * don't have to be touched.
 */
export default function AnimatedAvatar({
  src,
  isVideo = false,
  fallback = "🎓",
  frame = "none", // accepted for backwards compatibility; RPG frames removed
  size = 48,
  animate = true, // accepted for backwards compatibility; nothing animates now
  withSound = false,
  className = "",
}) {
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    setImgError(false);
  }, [src]);

  const isGradient = typeof src === "string" && src.startsWith("linear-gradient");
  const hasValidSrc = Boolean(src && !imgError);

  const inner = isGradient ? (
    <span
      className="font-black text-white drop-shadow-md select-none tracking-wider"
      style={{ fontSize: size * 0.34, fontFamily: "var(--font-heading)" }}
    >
      {fallback && fallback.length <= 3 ? fallback : "BF"}
    </span>
  ) : hasValidSrc ? (
    isVideo && withSound ? (
      <AvatarVideo src={src} />
    ) : isVideo ? (
      <video
        src={src}
        className="h-full w-full rounded-full object-cover"
        autoPlay
        loop
        muted
        playsInline
      />
    ) : (
      <img
        src={src}
        alt=""
        referrerPolicy="no-referrer"
        className="h-full w-full rounded-full object-cover"
        onError={() => setImgError(true)}
      />
    )
  ) : (
    <span className="font-black text-white select-none" style={{ fontSize: size * 0.34 }}>
      {fallback}
    </span>
  );

  return (
    <div
      className={`relative grid shrink-0 place-items-center overflow-hidden rounded-full bg-muted select-none ${className}`}
      style={{ width: size, height: size }}
    >
      {inner}
    </div>
  );
}
