import React from "react";
import { motion } from "framer-motion";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { ORBIT_EFFECTS } from "@/lib/avatars";
import OrbitEffectGlyph from "@/components/profile/OrbitEffectGlyph";

export const ORBIT_MODELS = { none: null, ...ORBIT_EFFECTS };

export default function Avatar3DOrbit({ model = "none", size = 140, children }) {
  const { isPowerSaver } = usePerformanceMode();
  const models = (Array.isArray(model) ? model : model && model !== "none" ? [model] : []).slice(0, 5);

  return (
    <div className="relative" style={{ width: size, height: size, perspective: 600, overflow: "visible" }}>
      {/* Avatar Core */}
      <div className="absolute inset-0 z-10">{children}</div>

      {/* Multi-layered 3D Collectible Orbit Rings */}
      {!isPowerSaver &&
        models.map((modelKey, layerIndex) => {
          const cfg = ORBIT_EFFECTS[modelKey];
          if (!cfg) return null;
          const radius = size / 2 + Math.max(20, size * (0.16 + layerIndex * 0.065));
          const direction = layerIndex % 2 ? -360 : 360;
          return (
            <motion.div
              key={modelKey}
              className="absolute inset-0 z-20 pointer-events-none"
              animate={{ rotate: direction }}
              transition={{ duration: cfg.speed, repeat: Infinity, ease: "linear" }}
            >
              {Array.from({ length: cfg.count }).map((_, i) => {
                const angle = (i / cfg.count) * 360;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 top-1/2"
                    style={{
                      transform: `translate(-50%, -50%) rotate(${angle}deg) translateX(${radius}px) rotate(${-angle}deg)`,
                    }}
                  >
                    <motion.span
                      className="block -translate-x-1/2 -translate-y-1/2 select-none"
                      animate={{ rotate: -direction }}
                      transition={{ duration: cfg.speed, repeat: Infinity, ease: "linear" }}
                    >
                      <OrbitEffectGlyph
                        kind={cfg.kind}
                        color={cfg.color}
                        secondary={cfg.secondary}
                        size={Math.max(24, size * 0.22)}
                        animated={true}
                      />
                    </motion.span>
                  </div>
                );
              })}
            </motion.div>
          );
        })}
    </div>
  );
}
