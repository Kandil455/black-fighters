import React from "react";
import { IIIAKIcon, BrandLogo } from "@/components/ui/BrandLogo";

export function BrandMark({ className = "", size = 28 }) {
  return <IIIAKIcon size={size} className={className} />;
}

export { IIIAKIcon, BrandLogo };
export default BrandMark;
