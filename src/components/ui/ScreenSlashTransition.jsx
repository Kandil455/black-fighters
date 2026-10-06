import React, { useEffect, useState } from "react";

/**
 * ScreenSlashTransition.jsx
 * 
 * Cinematic 0.85s Blade Screen-Slash Transition for Black Fighters.
 * Slices the interface diagonally into two parting halves with a laser blade beam,
 * neon sparks, and deep cyber void portal.
 */
export default function ScreenSlashTransition({ active = false, onComplete }) {
  const [phase, setPhase] = useState("idle"); // 'idle' | 'strike' | 'fracture' | 'portal'

  useEffect(() => {
    if (!active) {
      setPhase("idle");
      return;
    }

    // Phase 1: Sudden blade streak & impact flash (0 to 120ms)
    setPhase("strike");

    // Phase 2: Full physical screen fracture & dual parting (120ms to 650ms)
    const t1 = setTimeout(() => {
      setPhase("fracture");
    }, 120);

    // Phase 3: Teleport portal flash (650ms to 850ms)
    const t2 = setTimeout(() => {
      setPhase("portal");
    }, 650);

    // Phase 4: Completion trigger
    const t3 = setTimeout(() => {
      onComplete?.();
    }, 850);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [active, onComplete]);

  if (!active && phase === "idle") return null;

  return (
    <div className="fixed inset-0 z-50 pointer-events-none overflow-hidden select-none">
      {/* ── 1. Top-Left Sliced Half (Slides Up-Left) ── */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          clipPath: "polygon(0 0, 100% 0, 100% 30%, 0 78%)",
          transform:
            phase === "fracture" || phase === "portal"
              ? "translate(-120px, -80px) rotate(-1.8deg) scale(0.98)"
              : "translate(0, 0) scale(1)",
          opacity: phase === "portal" ? 0 : 1,
          transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-in 0.35s",
        }}
      >
        <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-md" />
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-transparent to-transparent" />
      </div>

      {/* ── 2. Bottom-Right Sliced Half (Slides Down-Right) ── */}
      <div
        className="absolute inset-0 transition-transform duration-700 ease-out"
        style={{
          clipPath: "polygon(0 78%, 100% 30%, 100% 100%, 0 100%)",
          transform:
            phase === "fracture" || phase === "portal"
              ? "translate(120px, 80px) rotate(1.8deg) scale(0.98)"
              : "translate(0, 0) scale(1)",
          opacity: phase === "portal" ? 0 : 1,
          transition: "transform 0.65s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.35s ease-in 0.35s",
        }}
      >
        <div className="absolute inset-0 bg-[#07090e]/85 backdrop-blur-md" />
        <div className="absolute inset-0 bg-gradient-to-tl from-cyan-500/10 via-transparent to-transparent" />
      </div>

      {/* ── 3. Piercing Neon Laser Blade Seam Line ── */}
      <div
        className="absolute inset-0 pointer-events-none transition-opacity duration-300"
        style={{
          opacity: phase === "strike" || phase === "fracture" ? 1 : 0,
        }}
      >
        {/* Glowing cutting line */}
        <div
          className="absolute origin-left"
          style={{
            top: "78%",
            left: "0%",
            width: "145%",
            height: "2px",
            transform: "rotate(-25.6deg) translateY(-50%)",
            background: "linear-gradient(90deg, transparent 0%, rgba(180,245,248,0.95) 50%, transparent 100%)",
            boxShadow: "0 0 10px 2px rgba(0,245,255,0.35)",
            filter: "none",
            animation: phase === "strike" ? "bladeSlash 0.15s ease-out forwards" : "none",
          }}
        />

        {/* Second soft flare line */}
        <div
          className="absolute origin-left"
          style={{
            top: "78%",
            left: "0%",
            width: "145%",
            height: "12px",
            transform: "rotate(-25.6deg) translateY(-50%)",
            background: "linear-gradient(90deg, transparent 0%, rgba(0,245,255,0.6) 50%, transparent 100%)",
            filter: "blur(4px)",
          }}
        />
      </div>

      {/* ── 4. Cyber Kinetic Sparks Bursting Along Seam ── */}
      {(phase === "strike" || phase === "fracture") && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(4)].map((_, i) => {
            const progress = (i + 1) / 15;
            const topPercent = 78 - progress * 48; // along the cut line
            const leftPercent = progress * 100;
            const dirX = (Math.random() - 0.5) * 120;
            const dirY = (Math.random() - 0.5) * 120;

            return (
              <span
                key={i}
                className="absolute w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,245,255,0.6)]"
                style={{
                  top: `${topPercent}%`,
                  left: `${leftPercent}%`,
                  transform: `translate(${dirX}px, ${dirY}px)`,
                  animationDuration: `${0.35 + Math.random() * 0.3}s`,
                }}
              />
            );
          })}
        </div>
      )}

      {/* ── 5. Blinding Impact Flash ── */}
      <div
        className="absolute inset-0 bg-cyan-400 pointer-events-none"
        style={{
          opacity: phase === "strike" ? 0.16 : 0,
          transition: "opacity 0.22s ease-out",
          mixBlendMode: "screen",
        }}
      />

      {/* ── 6. Portal Vortex Flash at Exit (700ms - 850ms) ── */}
      <div
        className="absolute inset-0 bg-black pointer-events-none"
        style={{
          opacity: phase === "portal" ? 1 : 0,
          transition: "opacity 0.2s ease-in",
        }}
      />
    </div>
  );
}
