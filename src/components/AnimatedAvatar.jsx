import React, { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { AVATAR_FRAMES } from "@/lib/avatars";
import AvatarVideo from "@/components/profile/AvatarVideo";
import { usePerformanceMode } from "@/lib/PerformanceContext";

const SHAPE_CLIPS = {
  circle: "circle(50% at 50% 50%)",
  square: "inset(8% round 5%)",
  hex: "polygon(25% 4%,75% 4%,98% 50%,75% 96%,25% 96%,2% 50%)",
  shield: "polygon(12% 5%,88% 5%,96% 60%,50% 100%,4% 60%)",
  gem: "polygon(50% 0,94% 27%,82% 82%,50% 100%,18% 82%,6% 27%)",
  diamond: "polygon(50% 0,100% 50%,50% 100%,0 50%)",
  blossom: "polygon(50% 3%,64% 18%,84% 10%,90% 31%,99% 50%,84% 65%,88% 89%,64% 84%,50% 99%,35% 84%,12% 90%,16% 66%,1% 50%,12% 31%,17% 10%,36% 18%)",
  wing: "polygon(50% 8%,77% 2%,96% 24%,91% 53%,100% 78%,66% 92%,50% 80%,34% 92%,0 78%,9% 53%,4% 24%,23% 2%)",
  portal: "ellipse(42% 50% at 50% 50%)",
  sun: "polygon(50% 0,60% 17%,78% 5%,80% 24%,98% 20%,88% 39%,100% 50%,84% 61%,98% 80%,78% 76%,76% 96%,59% 83%,50% 100%,41% 83%,24% 96%,22% 76%,2% 80%,16% 61%,0 50%,12% 39%,2% 20%,20% 24%,22% 5%,40% 17%)",
  moon: "polygon(38% 0,76% 4%,100% 30%,88% 68%,58% 100%,20% 88%,0 55%,10% 20%)",
  mask: "polygon(8% 10%,50% 0,92% 10%,100% 58%,76% 92%,50% 100%,24% 92%,0 58%)",
  dragon: "polygon(8% 18%,28% 2%,50% 14%,72% 2%,92% 18%,98% 64%,72% 82%,50% 100%,28% 82%,2% 64%)",
  crown: "polygon(4% 25%,24% 38%,34% 4%,50% 34%,66% 4%,76% 38%,96% 25%,88% 92%,12% 92%)",
  rift: "polygon(28% 0,68% 8%,88% 0,82% 30%,100% 52%,78% 70%,70% 100%,45% 84%,18% 100%,24% 68%,0 48%,20% 30%)",
};

function FrameCrest({ special, glow, size }) {
  const glyph = { royal: "◆", thunder: "ϟ", fire: "▲", ice: "◇", crystal: "✦", shadow: "◈", water: "≋" }[special];
  if (!glyph) return null;
  return (
    <motion.span
      className="absolute z-[4] flex items-center justify-center font-black pointer-events-none"
      style={{ top: -size * 0.12, left: "50%", width: size * 0.28, height: size * 0.28, marginLeft: -size * 0.14, color: glow, fontSize: size * 0.17, textShadow: `0 0 12px ${glow}` }}
      animate={{ y: [0, -3, 0], scale: [1, 1.12, 1] }}
      transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
    >{glyph}</motion.span>
  );
}

// تأثيرات خاصة فوق الإطار (جزيئات نار/تلج/هالة)
function SpecialFx({ special, size }) {
  if (!special) return null;
  const count = 8;
  const items = Array.from({ length: count });

  if (special === "fire") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {items.map((_, i) => (
          <motion.span
            key={i}
            className="absolute rounded-full"
            style={{
              left: `${8 + (i * 84) / count}%`,
              bottom: "-5%",
              width: size * 0.07,
              height: size * 0.11,
              background: i % 2 ? "#ff7a00" : "#ffd500",
              filter: "blur(1px)",
              borderRadius: "60% 40% 70% 30%",
            }}
            animate={{ y: [-2, -size * 0.58], opacity: [0.9, 0], scale: [1, 0.25], rotate: [0, 30] }}
            transition={{ duration: 1 + (i % 3) * 0.25, repeat: Infinity, delay: i * 0.13, ease: "easeOut" }}
          />
        ))}
      </div>
    );
  }

  if (["ice", "stars", "love", "butterfly", "royal", "petals", "crystal", "thunder", "water", "shadow"].includes(special)) {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {items.map((_, i) => (
          <motion.span
            key={i}
            className="absolute"
            style={{
              left: `${50 + Math.cos((i / count) * Math.PI * 2) * 58}%`,
              top: `${50 + Math.sin((i / count) * Math.PI * 2) * 58}%`,
              width: size * 0.055,
              height: special === "thunder" ? size * 0.15 : size * 0.055,
              borderRadius: special === "water" ? "999px" : "2px",
              background: special === "ice" ? "#bae6fd" : special === "love" || special === "petals" ? "#f9a8d4" : special === "royal" || special === "thunder" ? "#fbbf24" : special === "water" ? "#67e8f9" : special === "shadow" ? "#a855f7" : "#e0e7ff",
              boxShadow: "0 0 10px currentColor",
            }}
            animate={{ opacity: [0, 1, 0], scale: [0.45, 1.15, 0.45], rotate: [0, 180, 360] }}
            transition={{ duration: 1.8 + (i % 3) * 0.35, repeat: Infinity, delay: i * 0.16, ease: "easeInOut" }}
          />
        ))}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 pointer-events-none">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="absolute inset-0 rounded-full border-2 border-primary/70"
          animate={{ scale: [1, 1.42], opacity: [0.5, 0] }}
          transition={{ duration: 2.2, repeat: Infinity, delay: i * 0.7, ease: "easeOut" }}
        />
      ))}
    </div>
  );
}

// أفاتار بإطار نيون متحرك. يدعم صورة أو فيديو + تأثيرات خاصة.
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

  useEffect(() => { setImgError(false); }, [src]);

  const f = AVATAR_FRAMES[frame] || AVATAR_FRAMES.none;
  const hasFrame = frame && frame !== "none";
  const isAssetFrame = !!f.img;
  const pad = hasFrame ? Math.max(5, Math.round(size * (isAssetFrame ? 0.16 : 0.12))) : 0;
  const glow = f.glow || "#00e5ff";
  const speed = f.speed || 8;
  const clipPath = SHAPE_CLIPS[f.shape] || SHAPE_CLIPS.circle;
  const avatarClipPath = isAssetFrame && f.shape === "square" ? "inset(0 round 12%)" : SHAPE_CLIPS.circle;

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size, overflow: "visible" }}>
      {hasFrame && !isAssetFrame && (
        isPowerSaver ? (
          <div
            className={`absolute inset-0 ${f.cssClass || ""}`}
            style={{
              background: f.gradient,
              clipPath,
              WebkitClipPath: clipPath,
              boxShadow: `0 0 ${Math.round(size * 0.18)}px ${glow}88, inset 0 0 ${Math.round(size * 0.1)}px rgba(255,255,255,.2)`,
            }}
          />
        ) : (
          <>
            <motion.div
              className={`absolute blur-xl ${f.cssClass ? `${f.cssClass}-glow` : ""}`}
              style={{ inset: -size * 0.12, background: `radial-gradient(circle, ${glow}88, transparent 68%)`, clipPath }}
              animate={animate && !f.cssClass ? { opacity: [0.35, 0.85, 0.35], scale: [0.92, 1.12, 0.92] } : {}}
              transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className={`absolute inset-0 ${f.cssClass || ""}`}
              style={{ background: f.gradient, clipPath, boxShadow: `0 0 ${Math.round(size * 0.25)}px ${glow}88, inset 0 0 ${Math.round(size * 0.12)}px rgba(255,255,255,.18)` }}
              animate={animate && !f.cssClass ? { opacity: [0.82, 1, 0.82], scale: [1, 1.025, 1] } : {}}
              transition={{ duration: Math.max(2.2, speed / 2), repeat: Infinity, ease: "easeInOut" }}
            />

            <motion.div
              className="absolute border border-white/25"
              style={{ inset: Math.max(2, Math.round(size * 0.035)), clipPath, boxShadow: `inset 0 0 ${Math.round(size * 0.18)}px ${glow}66` }}
              animate={animate ? { opacity: [0.45, 1, 0.45] } : {}}
              transition={{ duration: 1.8, repeat: Infinity }}
            />

            <motion.div
              className="absolute border-2 border-white/20"
              style={{ inset: -size * 0.06, clipPath }}
              animate={animate ? { scale: [1, 1.08, 1], opacity: [0.25, 0.65, 0.25] } : {}}
              transition={{ duration: 2.2, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )
      )}

      {f.effectVideo && (
        <div className="absolute pointer-events-none" style={{ inset: -size * 0.22, zIndex: 5, mixBlendMode: "screen" }}>
          {animate && !isPowerSaver ? (
            <video src={f.effectVideo} poster={f.effectPoster} className="h-full w-full object-contain" autoPlay loop muted playsInline preload="metadata" />
          ) : (
            <img src={f.effectPoster} alt="" className="h-full w-full object-contain" />
          )}
        </div>
      )}

      {isAssetFrame && (
        isPowerSaver ? (
          <img
            src={f.img}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
            style={{ zIndex: 4, filter: `drop-shadow(0 0 ${Math.max(4, size * 0.08)}px ${glow}88)` }}
          />
        ) : (
          <>
            <motion.div
              className="absolute blur-xl pointer-events-none"
              style={{ inset: -size * 0.08, background: `radial-gradient(circle, ${glow}88, transparent 70%)` }}
              animate={animate ? { opacity: [0.28, 0.7, 0.28], scale: [0.96, 1.07, 0.96] } : {}}
              transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            />
            <motion.img
              src={f.img}
              alt=""
              aria-hidden="true"
              className="absolute inset-0 w-full h-full object-contain pointer-events-none select-none"
              style={{ zIndex: 4, filter: `drop-shadow(0 0 ${Math.max(4, size * 0.09)}px ${glow}88)` }}
              animate={animate ? { y: [0, -size * 0.012, 0] } : {}}
              style={animate ? { filter: `drop-shadow(0 0 ${Math.max(5, size * 0.09)}px ${glow}88)` } : undefined}
              transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
            />
          </>
        )
      )}

      {(() => {
        const isGradient = typeof src === "string" && src.startsWith("linear-gradient");
        // No localStorage substitution here.
        //
        // This used to fall back to `local_avatar_fallback` (the VIEWER's own
        // cached upload) whenever `src` was empty, so every other user rendered
        // with YOUR photo — and it masked a real bug: the server validator was
        // rejecting our relative media URLs and persisting `avatar_url: null`, so
        // a student's upload never actually left their own device.
        const resolvedSrc = src;
        const hasValidSrc = Boolean(resolvedSrc && !imgError);

        return (
          <div
            className="absolute overflow-hidden flex items-center justify-center border border-white/10"
            style={{
              inset: pad,
              clipPath: avatarClipPath,
              WebkitClipPath: avatarClipPath,
              background: isGradient ? src : hasValidSrc ? "#111827" : "radial-gradient(circle at 35% 25%, #334155, #111827 68%)",
              zIndex: 2,
              borderRadius: isAssetFrame && f.shape === "square" ? "12%" : "50%",
              isolation: "isolate",
              transform: "translate3d(0,0,0)",
              WebkitMaskImage: "-webkit-radial-gradient(white, black)",
            }}
          >
            {isGradient ? (
              <span
                className="font-black text-white drop-shadow-md select-none tracking-wider"
                style={{ fontSize: size * 0.38, fontFamily: "var(--font-heading)" }}
              >
                {fallback && fallback.length <= 2 ? fallback : "⚡"}
              </span>
            ) : hasValidSrc ? (
              isVideo ? (
                withSound ? (
                  <AvatarVideo src={resolvedSrc} />
                ) : (
                  <video
                    src={resolvedSrc}
                    className="w-full h-full max-w-full max-h-full object-cover"
                    style={{ width: "100%", height: "100%", objectFit: "cover", borderRadius: "inherit" }}
                    autoPlay
                    loop
                    muted
                    playsInline
                  />
                )
              ) : (
                <motion.img
                  src={resolvedSrc}
                  alt=""
                  className="w-full h-full max-w-full max-h-full object-cover"
                  onError={() => setImgError(true)}
                  animate={animate && !isPowerSaver ? { scale: [1.02, 1.07, 1.02], y: [0, -size * 0.012, 0] } : {}}
                  transition={{ duration: 4.8, repeat: Infinity, ease: "easeInOut" }}
                />
              )
            ) : (
              <span className="font-bold select-none" style={{ fontSize: size * 0.42 }}>{fallback}</span>
            )}
          </div>
        );
      })()}

      {hasFrame && animate && !isPowerSaver && <SpecialFx special={f.special} size={size} />}
      {hasFrame && animate && !isPowerSaver && <FrameCrest special={f.special} glow={glow} size={size} />}
    </div>
  );
}
