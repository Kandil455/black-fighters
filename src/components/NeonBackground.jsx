import React, { memo } from "react";

export const NeonBackground = memo(function NeonBackground() {
  return (
    <div
      className="fixed inset-0 pointer-events-none -z-10 select-none bg-[#05070a]"
      aria-hidden="true"
    >
      <div className="absolute inset-0 bg-radial-emerald" />
      <div className="absolute inset-0 bg-grid opacity-80" />
    </div>
  );
});

export default NeonBackground;
