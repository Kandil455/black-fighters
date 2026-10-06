import React from "react";
import { cn } from "@/lib/utils";

export function Marquee({
  className,
  reverse = false,
  pauseOnHover = true,
  children,
  vertical = false,
  repeat = 4,
  duration = "28s",
  ...props
}) {
  return (
    <div
      {...props}
      style={{
        "--duration": duration,
      }}
      className={cn(
        "group flex overflow-hidden p-2 [--gap:1rem] [gap:var(--gap)] select-none",
        {
          "flex-row": !vertical,
          "flex-col": vertical,
        },
        className
      )}
    >
      {Array.from({ length: repeat }).map((_, i) => (
        <div
          key={i}
          className={cn("flex shrink-0 justify-around [gap:var(--gap)]", {
            "animate-marquee flex-row": !vertical,
            "animate-marquee-vertical flex-col": vertical,
            "group-hover:[animation-play-state:paused]": pauseOnHover,
            "[animation-direction:reverse]": reverse,
          })}
        >
          {children}
        </div>
      ))}
    </div>
  );
}
export default Marquee;
