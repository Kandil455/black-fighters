import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle } from "lucide-react";
import { motionTokens, useReducedMotionPreference } from "@/lib/motionTokens";
import { cn } from "@/lib/utils";
import { AnimatedFlame } from "@/components/ui/AnimatedMicroIcons";

export function StreakFlameWidget({
  streak = 0,
  isNearBreak = false,
  className,
  size = "default", // 'sm' | 'default' | 'lg'
}) {
  const { prefersReducedMotion } = useReducedMotionPreference();
  const [displayCount, setDisplayCount] = useState(streak);
  const [celebrating, setCelebrating] = useState(false);

  // Smooth count-up animation when streak changes
  useEffect(() => {
    if (streak !== displayCount) {
      setCelebrating(true);
      const timer = setTimeout(() => {
        setDisplayCount(streak);
      }, 150);
      const celebrationTimer = setTimeout(() => {
        setCelebrating(false);
      }, 1200);
      return () => {
        clearTimeout(timer);
        clearTimeout(celebrationTimer);
      };
    }
  }, [streak, displayCount]);

  const sizeClasses = {
    sm: "h-8 px-2.5 gap-1.5 text-xs",
    default: "h-10 px-3.5 gap-2 text-sm",
    lg: "h-12 px-5 gap-2.5 text-base font-black",
  };

  const flameSizes = {
    sm: "w-4 h-4",
    default: "w-5 h-5",
    lg: "w-6 h-6",
  };

  return (
    <div
      className={cn(
        "relative inline-flex items-center rounded-2xl border backdrop-blur-xl select-none font-mono font-bold transition-colors shadow-lg",
        isNearBreak
          ? "bg-amber-500/10 border-amber-500/30 text-amber-300 shadow-amber-500/10"
          : "bg-orange-500/10 border-orange-500/30 text-orange-400 shadow-orange-500/15",
        sizeClasses[size] || sizeClasses.default,
        className
      )}
    >
      <AnimatedFlame
          size={size === "lg" ? 24 : size === "sm" ? 16 : 20}
          className="shrink-0"
        />

      {/* Numerical Counter */}
      <span className="tabular-nums tracking-tight">
        {displayCount}
      </span>

      {/* Days label */}
      <span className="text-[11px] opacity-75 font-sans font-medium">
        {displayCount === 1 ? "يوم" : "أيام"}
      </span>

      {/* Warning indicator if streak is expiring */}
      {isNearBreak && (
        <span
          className="inline-flex items-center text-[10px] text-amber-300/90 font-sans mr-1 animate-pulse"
          title="الشعلة مهددة بالانطفاء! ذاكر قبل نهاية اليوم"
        >
          <AlertCircle className="w-3 h-3 text-amber-400 ml-0.5" />
          <span>موشكة</span>
        </span>
      )}
    </div>
  );
}

export default StreakFlameWidget;
