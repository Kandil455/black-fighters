import React from "react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

/**
 * Official Black Fighters Spartan Helmet Brand Icon
 */
export function IIIAKIcon({ size = 32, className = "" }) {
  return (
    <div
      style={{ width: size, height: size }}
      className={cn("relative shrink-0 flex items-center justify-center select-none rounded-xl overflow-hidden", className)}
    >
      <img
        src="/icons/black-fighters-192.png"
        alt="Black Fighters"
        className="w-full h-full object-contain filter drop-shadow-[0_0_8px_rgba(0,242,254,0.5)]"
      />
    </div>
  );
}

// Backwards compatibility alias
export const BFIcon = IIIAKIcon;
export const BlackFightersIcon = IIIAKIcon;

export function BrandLogo({ size = 32, showSubtext = true, linkTo = "/dashboard", className = "" }) {
  const content = (
    <div className={cn("flex items-center gap-3 group select-none", className)}>
      <div className="transition-transform duration-300 group-hover:scale-110">
        <IIIAKIcon size={size} />
      </div>
      <div>
        <span
          className="text-sm sm:text-base font-black text-foreground block tracking-wider font-heading uppercase"
          dir="ltr"
        >
          Black Fighters
        </span>
        {showSubtext && (
          <span className="caption-mono block text-[8px] tracking-[0.25em] text-cyan-400 font-bold">
            STUDY PLATFORM
          </span>
        )}
      </div>
    </div>
  );

  if (linkTo) {
    return <Link to={linkTo}>{content}</Link>;
  }

  return content;
}

export default BrandLogo;
