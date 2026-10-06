import React from "react";
import { motion } from "framer-motion";
import { motionTokens, useReducedMotionPreference } from "@/lib/motionTokens";
import { playClick } from "@/lib/sounds";
import { cn } from "@/lib/utils";

export function FlipFlashcard({
  front,
  back,
  isFlipped = false,
  onFlip,
  className,
}) {
  const { prefersReducedMotion } = useReducedMotionPreference();

  const handleClick = () => {
    playClick();
    if (onFlip) onFlip(!isFlipped);
  };

  return (
    <div
      onClick={handleClick}
      className={cn(
        "cursor-pointer select-none w-full min-h-[260px] relative [perspective:1000px]",
        className
      )}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          handleClick();
        }
      }}
      aria-label="اقلب البطاقة"
    >
      <motion.div
        animate={{
          rotateY: prefersReducedMotion ? 0 : isFlipped ? 180 : 0,
          opacity: prefersReducedMotion ? (isFlipped ? 0.95 : 1) : 1,
        }}
        transition={motionTokens.slow}
        className="w-full h-full min-h-[260px] relative [transform-style:preserve-3d] transition-shadow duration-300"
      >
        {/* Front Face */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full p-6 sm:p-8 rounded-3xl border border-white/10 bg-[#0c0d16]/90 backdrop-blur-2xl flex flex-col justify-between [backface-visibility:hidden] shadow-2xl hover:border-primary/40 transition-colors",
            prefersReducedMotion && isFlipped && "hidden"
          )}
        >
          <div className="flex items-center justify-between text-xs text-white/40 font-mono">
            <span className="px-2.5 py-0.5 rounded-full bg-white/5 border border-white/10">سؤال / الوجه</span>
            <span>اضغط للقلب ↻</span>
          </div>

          <div className="my-auto py-4 text-center">
            <p className="text-base sm:text-xl font-bold text-white leading-relaxed font-sans">
              {front}
            </p>
          </div>

          <div className="text-center text-[11px] text-white/30 font-sans">
            انقر في أي مكان لرؤية الإجابة النموذجية
          </div>
        </div>

        {/* Back Face (Rotated 180deg) */}
        <div
          className={cn(
            "absolute inset-0 w-full h-full p-6 sm:p-8 rounded-3xl border border-emerald-500/30 bg-[#071311]/95 backdrop-blur-2xl flex flex-col justify-between [backface-visibility:hidden] [transform:rotateY(180deg)] shadow-2xl",
            prefersReducedMotion && !isFlipped && "hidden",
            prefersReducedMotion && "[transform:none]"
          )}
        >
          <div className="flex items-center justify-between text-xs text-emerald-400 font-mono">
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30">الإجابة / الظهر</span>
            <span className="text-white/40">اضغط للرجوع ↻</span>
          </div>

          <div className="my-auto py-4 text-center">
            <p className="text-base sm:text-lg text-emerald-100/90 leading-relaxed font-sans font-medium">
              {back}
            </p>
          </div>

          <div className="text-center text-[11px] text-emerald-400/50 font-sans">
            تم التحقق من الإجابة الأكاديمية
          </div>
        </div>
      </motion.div>
    </div>
  );
}

export default FlipFlashcard;
