import React from "react";
import { motion } from "framer-motion";
import { getSkin } from "@/lib/mascotSkins";
import Mascot3DModel from "@/components/course/Mascot3DModel";

// حركات الجسم حسب نوع الشكل
const BODY_MOTION = {
  float:  { animate: { y: [0, -6, 0] }, transition: { duration: 3, repeat: Infinity, ease: "easeInOut" } },
  bounce: { animate: { y: [0, -10, 0], scale: [1, 1.05, 1] }, transition: { duration: 0.9, repeat: Infinity, ease: "easeInOut" } },
  pulse:  { animate: { scale: [1, 1.07, 1] }, transition: { duration: 1.4, repeat: Infinity, ease: "easeInOut" } },
  shake:  { animate: { rotate: [-3, 3, -3], y: [0, -3, 0] }, transition: { duration: 0.6, repeat: Infinity, ease: "easeInOut" } },
  flame:  { animate: { y: [0, -5, 0], scale: [1, 1.04, 1] }, transition: { duration: 1.1, repeat: Infinity, ease: "easeInOut" } },
  cosmic: { animate: { y: [0, -7, 0], rotate: [-2, 2, -2] }, transition: { duration: 2.2, repeat: Infinity, ease: "easeInOut" } },
  ascend: { animate: { y: [0, -9, 0], scale: [1, 1.06, 1] }, transition: { duration: 2.6, repeat: Infinity, ease: "easeInOut" } },
  scan:   { animate: { y: [1, -5, 1], rotateY: [-4, 5, -4] }, transition: { duration: 2.1, repeat: Infinity, ease: "easeInOut" } },
  arcane: { animate: { y: [0, -7, 0], rotateZ: [-1.5, 1.5, -1.5] }, transition: { duration: 2.7, repeat: Infinity, ease: "easeInOut" } },
  mech:   { animate: { y: [2, -8, 2], rotateY: [-5, 5, -5] }, transition: { duration: 1.8, repeat: Infinity, ease: "easeInOut" } },
  inferno:{ animate: { y: [0, -5, 0], rotateZ: [-1, 1, -1] }, transition: { duration: 1.45, repeat: Infinity, ease: "easeInOut" } },
};

// جزيئات حصرية حسب الشكل
function SkinFx({ motionType, glow, size }) {
  const n = 8;
  const items = Array.from({ length: n });

  if (motionType === "flame" || motionType === "inferno") {
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {items.map((_, i) => (
          <motion.span key={i} className="absolute rounded-full"
            style={{ left: `${15 + (i * 70) / n}%`, bottom: "-4%", width: size * 0.06, height: size * 0.1, background: i % 2 ? "#ff5a00" : "#ffd500", filter: "blur(1px)", borderRadius: "60% 40% 70% 30%" }}
            animate={{ y: [-2, -size * 0.5], opacity: [0.9, 0], scale: [1, 0.2] }}
            transition={{ duration: 1 + (i % 3) * 0.2, repeat: Infinity, delay: i * 0.12, ease: "easeOut" }} />
        ))}
      </div>
    );
  }

  if (["cosmic", "ascend", "pulse", "scan", "arcane", "mech"].includes(motionType)) {
    const glyph = motionType === "mech" ? "◉" : motionType === "scan" ? "⌁" : motionType === "ascend" ? "✦" : motionType === "cosmic" ? "◆" : "✧";
    return (
      <div className="absolute inset-0 pointer-events-none overflow-visible">
        {items.map((_, i) => (
          <motion.span key={i} className="absolute font-black"
            style={{ left: `${50 + Math.cos((i / n) * Math.PI * 2) * 56}%`, top: `${50 + Math.sin((i / n) * Math.PI * 2) * 56}%`, fontSize: size * 0.1, color: glow, textShadow: `0 0 10px ${glow}` }}
            animate={{ opacity: [0, 1, 0], scale: [0.4, 1.1, 0.4], rotate: [0, 180, 360] }}
            transition={{ duration: 1.8 + (i % 3) * 0.3, repeat: Infinity, delay: i * 0.15, ease: "easeInOut" }}>
            {glyph}
          </motion.span>
        ))}
      </div>
    );
  }

  return null;
}

/**
 * عرض شكل الماسكوت 3D بحركة وهالة حسب نوعه.
 */
export default function MascotSkin({ skinId, size = 40, animate = true, showFx = true, state = "idle", className = "", render3d = true }) {
  const skin = getSkin(skinId);
  const m = BODY_MOTION[skin.motion] || BODY_MOTION.float;
  const expressive = state === "active" || state === "talking";
  const bodyAnimation = skin.model3d && render3d
    ? {}
    : expressive
    ? { y: [0, -size * 0.07, 0, -size * 0.025, 0], rotateZ: [0, -4, 3, -2, 0], rotateY: [0, 12, -10, 6, 0], scaleY: [1, 1.035, 0.97, 1.025, 1], scaleX: [1, 0.98, 1.025, 0.99, 1] }
    : m.animate;

  const imageFallback = (
    <img
      src={skin.img}
      alt={skin.name}
      className="w-full h-full object-contain drop-shadow-lg"
      style={{ transform: `scale(${skin.scale || 1})` }}
    />
  );

  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size, overflow: "visible" }}>
      {/* هالة */}
      <motion.div
        className="absolute rounded-full blur-lg"
        style={{ inset: -size * 0.18, background: `radial-gradient(circle, ${skin.glow}99, transparent 65%)` }}
        animate={animate ? { opacity: [0.4, 0.85, 0.4], scale: [0.9, 1.15, 0.9] } : {}}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* الجسم */}
      <motion.div
        className="relative w-full h-full"
        style={{ zIndex: 2 }}
        animate={animate ? bodyAnimation : {}}
        transition={expressive ? { duration: 2.2, repeat: Infinity, ease: "easeInOut" } : m.transition}
      >
        {skin.model3d && render3d ? (
          <Mascot3DModel
            model={skin.model3d}
            size={size}
            state={state}
            glow={skin.glow}
            animate={animate}
            fallback={imageFallback}
          />
        ) : imageFallback}
      </motion.div>
      {animate && expressive && (
        <div className="absolute end-0 top-1/2 z-[3] pointer-events-none">
          {[0, 1, 2].map((index) => (
            <motion.span key={index} className="absolute rounded-full border" style={{ width: size * 0.16, height: size * 0.16, borderColor: skin.glow }}
              animate={{ x: [0, size * 0.34], scale: [0.35, 1.15], opacity: [0.8, 0] }}
              transition={{ duration: 1.2, repeat: Infinity, delay: index * 0.35, ease: "easeOut" }} />
          ))}
        </div>
      )}
      {showFx && animate && <SkinFx motionType={skin.motion} glow={skin.glow} size={size} />}
    </div>
  );
}
