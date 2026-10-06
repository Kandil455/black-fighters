import React from "react";
import { cn } from "@/lib/utils";

export const Spotlight = ({ className, fill = "#00f5ff" }) => {
  return (
    <div
      className={cn(
        "pointer-events-none absolute z-[0] w-[600px] h-[600px] rounded-full blur-[100px] opacity-25 animate-spotlight",
        className
      )}
      style={{
        background: `radial-gradient(ellipse at center, ${fill} 0%, ${fill}33 45%, transparent 70%)`,
        transform: "translate3d(0,0,0)",
        /* no permanent willChange — WebKit pins RAM for promoted layers
           (review warning #2); the CSS animation is compositor-driven anyway */
      }}
    />
  );
};
