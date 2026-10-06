import React from "react";
import { cn } from "@/lib/utils";

export const ShimmerButton = React.forwardRef(
  (
    {
      shimmerColor = "#00f5ff",
      shimmerSize = "0.08em",
      shimmerDuration = "3s",
      borderRadius = "16px",
      background = "rgba(10, 11, 18, 0.95)",
      className,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <button
        style={{
          "--spread": "90deg",
          "--shimmer-color": shimmerColor,
          "--radius": borderRadius,
          "--speed": shimmerDuration,
          "--cut": shimmerSize,
          "--bg": background,
        }}
        className={cn(
          "group relative z-0 flex cursor-pointer items-center justify-center overflow-hidden whitespace-nowrap border border-white/15 px-6 py-3 font-bold text-white [background:var(--bg)] [border-radius:var(--radius)]",
          "transform-gpu transition-colors duration-200 active:scale-[0.98] hover:border-primary/50 shadow-lg",
          className
        )}
        ref={ref}
        {...props}
      >
        {/* spark container */}
        <div
          className={cn(
            "-z-30",
            "absolute inset-0 overflow-visible [container-type:size]"
          )}
        >
          {/* spark slide */}
          <div className="absolute inset-0 h-[100cqh] animate-shimmer-slide [animation-play-state:paused] group-hover:[animation-play-state:running] opacity-0 transition-opacity duration-300 group-hover:opacity-100 [aspect-ratio:1] [border-radius:0] [mask:none]">
            <div className="animate-spin-around [animation-play-state:paused] group-hover:[animation-play-state:running] absolute -inset-full w-auto rotate-0 [background:conic-gradient(from_calc(270deg-(var(--spread)*0.5)),transparent_0,var(--shimmer-color)_calc(var(--spread)*0.5),transparent_var(--spread))] [translate:0_0]" />
          </div>
        </div>

        {/* Content */}
        <span className="relative z-10 flex items-center gap-2">{children}</span>

        {/* Inner highlight */}
        <div
          className={cn(
            "absolute inset-0 size-full",
            "rounded-[inherit] shadow-[inset_0_-4px_8px_rgba(0,245,255,0.15)]",
            "transform-gpu transition-colors duration-300 ease-in-out",
            "group-hover:shadow-[inset_0_-4px_12px_rgba(0,245,255,0.3)]"
          )}
        />

        {/* backdrop */}
        <div
          className={cn(
            "absolute -z-20 [background:var(--bg)] [border-radius:var(--radius)] [inset:var(--cut)]"
          )}
        />
      </button>
    );
  }
);
ShimmerButton.displayName = "ShimmerButton";
export default ShimmerButton;
