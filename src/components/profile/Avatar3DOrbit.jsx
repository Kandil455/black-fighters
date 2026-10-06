import React from "react";
import { motion } from "framer-motion";
import { usePerformanceMode } from "@/lib/PerformanceContext";
import { ORBIT_EFFECTS } from "@/lib/avatars";
import OrbitEffectGlyph from "@/components/profile/OrbitEffectGlyph";

/**
 * أفاتار/شخصية 3D متحركة تدور حوالين البروفايل.
 * نماذج بسيطة بتأثير عمق (طبقات + توهّج + دوران مداري).
 */
export const ORBIT_MODELS = { none: null, ...ORBIT_EFFECTS };

export default function Avatar3DOrbit({ model = "none", size = 140, children }) {
  const { isPowerSaver } = usePerformanceMode();
  const models = (Array.isArray(model) ? model : model && model !== "none" ? [model] : []).slice(0, 5);

  return (
    <div className="relative" style={{ width: size, height: size, perspective: 600, overflow: "visible" }}>
      {/* المحتوى (الأفاتار) */}
      <div className="absolute inset-0 z-10">{children}</div>

      {/* حلقة خارجية حقيقية؛ لا تستخدم translateZ حتى لا تدخل العناصر في منتصف الصورة. */}
      {!isPowerSaver && models.map((modelKey, layerIndex) => {
        const cfg = ORBIT_EFFECTS[modelKey];
        if (!cfg) return null;
        const radius = size / 2 + Math.max(18, size * (0.14 + layerIndex * 0.07));
        const direction = layerIndex % 2 ? -360 : 360;
        return (
          <motion.div key={modelKey} className="absolute inset-0 z-20 pointer-events-none"
            animate={{ rotate: direction }} transition={{ duration: cfg.speed, repeat: Infinity, ease: "linear" }}>
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
                  animate={{ rotate: -direction, y: [-3, 3, -3], scale: [0.9, 1.12, 0.9] }}
                  transition={{ rotate: { duration: cfg.speed, repeat: Infinity, ease: "linear" }, y: { duration: 2.2, repeat: Infinity }, scale: { duration: 2.2, repeat: Infinity } }}
                >
                  <OrbitEffectGlyph kind={cfg.kind} color={cfg.color} size={size * 0.19} />
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
