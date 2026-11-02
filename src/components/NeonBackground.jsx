import React, { memo } from "react";
import { useStudyTheme } from "@/lib/StudyThemeContext";

export const NeonBackground = memo(function NeonBackground() {
  const { isDark } = useStudyTheme();

  if (!isDark) {
    return (
      <div
        className="fixed inset-0 pointer-events-none -z-10 select-none bg-[#f8fafc]"
        aria-hidden="true"
      >
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(16,185,129,0.12),rgba(248,250,252,0.95))]" />
        <div className="absolute inset-0 bg-grid opacity-25 [mask-image:radial-gradient(ellipse_at_center,transparent_20%,black)]" />
      </div>
    );
  }

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
