import React from "react";
import { cn } from "@/lib/utils";

export function CreditCoin3D({ size = 18, className = "", alt = "كريدت", ...props }) {
  return (
    <img
      src="/icons/credit-coin-3d.png"
      width={size}
      height={size}
      alt={alt}
      className={cn(
        "inline-block object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(245,158,11,0.35)] transition-transform group-hover:scale-110",
        className
      )}
      style={{ width: size, height: size }}
      loading="eager"
      {...props}
    />
  );
}

export function FileSave3D({ size = 18, className = "", alt = "حفظ الملف", ...props }) {
  return (
    <img
      src="/icons/file-save-3d.png"
      width={size}
      height={size}
      alt={alt}
      className={cn(
        "inline-block object-contain shrink-0 drop-shadow-[0_2px_8px_rgba(0,140,255,0.35)] transition-transform group-hover:scale-110",
        className
      )}
      style={{ width: size, height: size }}
      loading="eager"
      {...props}
    />
  );
}

export default {
  CreditCoin3D,
  FileSave3D,
};
