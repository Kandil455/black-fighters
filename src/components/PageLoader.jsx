import React from "react";
import { LottieLoader } from "@/components/ui/LottieIcons";

export default function PageLoader({ message = "جاري التحميل..." }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-background"
      role="status"
      aria-live="polite"
      style={{ backgroundColor: "#07080c" }}
    >
      {/* Ambient glow */}
      <div
        className="absolute w-80 h-80 rounded-full pointer-events-none"
        style={{
          background: "radial-gradient(ellipse at center, rgba(0,245,255,0.07) 0%, transparent 70%)",
          top: "50%", left: "50%",
          transform: "translate(-50%, -50%)",
        }}
      />

      <div className="relative z-10 flex flex-col items-center gap-4">
        {/* Lottie loader */}
        <div
          className="relative flex items-center justify-center"
          style={{
            width: 88, height: 88,
            borderRadius: 26,
            background: "linear-gradient(135deg, rgba(0,245,255,0.12), rgba(191,95,255,0.08))",
            border: "1px solid rgba(0,245,255,0.25)",
            boxShadow: "0 0 32px rgba(0,245,255,0.2)",
          }}
        >
          <LottieLoader className="w-14 h-14" />
        </div>

        <div className="text-center">
          <p
            className="text-base font-black studio-headline-gradient"
            style={{
              fontFamily: "var(--font-heading)",
              letterSpacing: "0.12em",
            }}
          >
            Black Fighters
          </p>
          <p className="mt-1 text-xs text-muted-foreground">{message}</p>
        </div>
      </div>
    </div>
  );
}
