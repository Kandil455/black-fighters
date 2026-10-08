/**
 * NeonBackground.jsx
 * Clinical Light paper surface — calm cool off-white (no neon/aurora).
 */
import React, { memo } from "react";

export const NeonBackground = memo(function NeonBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 select-none"
      style={{
        background:
          "radial-gradient(120% 80% at 100% 0%, rgba(43,138,158,0.06), transparent 55%), linear-gradient(180deg, #F8FAFB 0%, #F3F6F8 100%)",
      }}
      aria-hidden="true"
    />
  );
});

export default NeonBackground;
