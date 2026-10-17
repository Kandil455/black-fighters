import React from "react";
import { motion } from "framer-motion";
import { PROFILE_BANNERS } from "@/lib/avatars";
import { usePerformanceMode } from "@/lib/PerformanceContext";

// Floating particles over the Banner
function BannerFx({ special, accent = "#19f08c" }) {
  if (!special) return null;
  const items = Array.from({ length: 10 });
  const color =
    special === "embers" || special === "rays"
      ? "#fb923c"
      : special === "waves"
      ? "#38bdf8"
      : special === "hearts"
      ? "#f472b6"
      : accent || "#19f08c";

  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {items.map((_, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full"
          style={{
            left: `${(i * 100) / items.length}%`,
            bottom: "-10%",
            width: 3 + (i % 3) * 2,
            height: special === "rays" ? 18 : 3 + (i % 3) * 2,
            background: color,
            boxShadow: `0 0 10px ${color}`,
          }}
          animate={{
            y: [0, -80],
            opacity: [0, 0.9, 0],
            x: [0, (i % 2 ? 1 : -1) * 12],
            scale: [0.5, 1.15, 0.4],
          }}
          transition={{
            duration: 2.5 + (i % 4) * 0.45,
            repeat: Infinity,
            delay: i * 0.2,
            ease: "easeOut",
          }}
        />
      ))}
    </div>
  );
}

export default function ProfileBanner({ banner = "none", className = "", previewMode = false }) {
  const { isPowerSaver } = usePerformanceMode();
  const b = PROFILE_BANNERS[banner] || PROFILE_BANNERS.none;
  if (banner === "none" && !previewMode) return null;

  const shouldAnimate = !isPowerSaver;

  return (
    <div
      className={`relative ${previewMode ? "h-24" : "h-28 sm:h-32"} w-full overflow-hidden rounded-2xl ${className}`}
    >
      {banner === "none" ? (
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center">
          <span className="text-xs font-bold text-muted-foreground">Default Header</span>
        </div>
      ) : (
        <>
          {/* Animated Gradient Backdrop */}
          <motion.div
            className="absolute inset-0"
            style={{ background: b.css, backgroundSize: "200% 200%" }}
            animate={shouldAnimate ? { backgroundPosition: ["0% 0%", "100% 100%", "0% 0%"] } : undefined}
            transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
          />

          {/* Sweeping Light Beam */}
          {shouldAnimate && (
            <motion.div
              className="absolute inset-0 pointer-events-none"
              style={{
                background:
                  "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.2) 48%, rgba(255,255,255,0.04) 56%, transparent 70%)",
              }}
              animate={{ x: ["-130%", "130%"] }}
              transition={{ duration: 3.6, repeat: Infinity, repeatDelay: 1, ease: "easeInOut" }}
            />
          )}

          {/* Measured Bottom Contrast Scrim */}
          <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-black/65 via-black/20 to-transparent pointer-events-none" />

          {shouldAnimate && <BannerFx special={b.special || "stars"} accent={b.accent} />}
        </>
      )}
    </div>
  );
}
