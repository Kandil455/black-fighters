import React from "react";
import { motion } from "framer-motion";

const ORB_IMG = "https://media.base44.com/images/public/6a2f88a30d0d038c254fefe6/cf4b5f520_generated_image.png";

/**
 * موجة سيري متدرّجة — نفس شكل الصورة المختارة، مع دوران ونبض خفيف.
 * active=true يخليها تتحرك أسرع وتتوهّج أكتر.
 */
export default function SiriOrb({ active = false, className = "w-full h-full" }) {
  return (
    <div className={`relative rounded-full ${className}`} style={{ aspectRatio: "1 / 1" }}>
      {/* توهّج خلفي */}
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{
          background:
            "radial-gradient(circle, rgba(34,238,238,0.55), rgba(124,77,255,0.35) 55%, transparent 75%)",
          filter: "blur(8px)",
        }}
        animate={{ scale: active ? [1, 1.18, 1] : [1, 1.08, 1], opacity: [0.6, 0.9, 0.6] }}
        transition={{ duration: active ? 2 : 3.5, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* الكرة نفسها — بتلف ببطء */}
      <motion.img
        src={ORB_IMG}
        alt="مساعد"
        draggable={false}
        className="relative w-full h-full rounded-full object-cover select-none"
        style={{ boxShadow: "inset 0 0 18px rgba(255,255,255,0.25)" }}
        animate={{ rotate: 360 }}
        transition={{ duration: active ? 9 : 18, repeat: Infinity, ease: "linear" }}
      />
      {/* لمعة علوية ثابتة */}
      <span
        className="pointer-events-none absolute rounded-full"
        style={{
          top: "12%",
          left: "16%",
          width: "40%",
          height: "30%",
          background: "radial-gradient(circle at 50% 50%, rgba(255,255,255,0.7), transparent 70%)",
          filter: "blur(3px)",
        }}
      />
    </div>
  );
}