/**
 * NeonBackground.jsx
 * LineVault Unified Flat Dark Background (#07090D)
 * Replaces the legacy animated aurora orb / grid background with a calm, solid surface.
 */
import React, { memo } from "react";

export const NeonBackground = memo(function NeonBackground() {
  return (
    <div
      className="fixed inset-0 bg-[#05070a] pointer-events-none -z-10 select-none"
      aria-hidden="true"
    />
  );
});

export default NeonBackground;
