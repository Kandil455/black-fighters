import React, { memo } from "react";
import { useStudyTheme } from "@/lib/StudyThemeContext";

export const DynamicStudyBackground = memo(function DynamicStudyBackground() {
  const { currentTheme } = useStudyTheme();

  return (
    <div
      className="fixed inset-0 pointer-events-none z-0 overflow-hidden select-none transition-colors duration-300"
      style={{ backgroundColor: currentTheme?.bgBase || "#000000" }}
    />
  );
});

export default DynamicStudyBackground;
