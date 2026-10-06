import React from "react";
import Lottie from "lottie-react";
import toggleAnimation from "@/assets/lottie/toggle-switch.json";
import { cn } from "@/lib/utils";

export default function LottieSwitch({
  isChecked,
  disabled,
  handleToggle,
  className,
  forwardedRef,
  ...props
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={isChecked}
      disabled={disabled}
      onClick={() => handleToggle(!isChecked)}
      className={cn(
        "relative inline-flex items-center justify-center p-0 select-none cursor-pointer focus-visible:outline-none disabled:opacity-40 disabled:cursor-not-allowed transition-transform active:scale-95",
        className
      )}
      ref={forwardedRef}
      {...props}
    >
      <div className="w-12 h-12 flex items-center justify-center pointer-events-none">
        <Lottie
          animationData={toggleAnimation}
          loop={false}
          autoplay={false}
          renderer="canvas"
          initialSegment={isChecked ? [5, 25] : [54, 74]}
          className="w-full h-full"
        />
      </div>
    </button>
  );
}
