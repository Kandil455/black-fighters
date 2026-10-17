import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";
import { BlackFightersAnimated } from "@/components/ui/BlackFightersAnimated";

/**
 * BrandLogo — Unified Black Fighters brand mark using BlackFightersAnimated
 * (3D Spin on mount + continuous Glow Pulse).
 */
const SIZES = {
  sm: { box: "h-9 w-9 rounded-xl", crest: 26, title: "text-sm", tag: "text-[9px]" },
  md: { box: "h-10 w-10 rounded-xl", crest: 30, title: "text-base", tag: "text-[10px]" },
  lg: { box: "h-12 w-12 rounded-2xl", crest: 36, title: "text-lg", tag: "text-[10.5px]" },
  xl: { box: "h-16 w-16 rounded-2xl", crest: 50, title: "text-2xl", tag: "text-xs" },
};

export function BrandLogo({
  size = "md",
  to,
  showText = true,
  subtitle,
  className,
  textClassName,
}) {
  const s = SIZES[size] || SIZES.md;

  const content = (
    <span className={cn("inline-flex items-center gap-2.5 select-none group", className)}>
      <span
        className={cn(
          "relative inline-flex shrink-0 items-center justify-center border border-[#19f08c]/40 bg-[#070B12] shadow-[0_0_24px_-6px_rgba(25,240,140,0.45)] transition-colors duration-200 group-hover:border-[#19f08c]/75",
          s.box
        )}
      >
        <BlackFightersAnimated size={s.crest} variant="emerald" />
      </span>

      {showText && (
        <span className={cn("leading-tight", textClassName)}>
          <span className={cn("block font-black tracking-tight text-foreground", s.title)}>
            Black Fighters
          </span>
          {subtitle !== false && (
            <span
              className={cn(
                "block font-semibold uppercase tracking-[0.16em] text-[#19f08c]",
                s.tag
              )}
            >
              {subtitle || "AI Study Platform"}
            </span>
          )}
        </span>
      )}
    </span>
  );

  if (to) {
    return (
      <Link to={to} className="inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }
  return content;
}

export default BrandLogo;
