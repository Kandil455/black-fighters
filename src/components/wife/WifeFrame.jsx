import React from "react";
import { motion } from "framer-motion";
import { Heart } from "lucide-react";

/**
 * إطار بروفايل بريميوم حصري لدور "زوجتي" — حلقة نيون وردية دوّارة + قلوب على المدار + توهّج نابض.
 * children = صورة/أفاتار المستخدم.
 */
export default function WifeFrame({ children, size = 96 }) {
  const heartCount = 8;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      {/* Pulsing glow */}
      <motion.div
        className="absolute inset-0 rounded-full"
        style={{ background: "radial-gradient(circle, rgba(255,95,180,0.5), transparent 70%)" }}
        animate={{ scale: [1, 1.25, 1], opacity: [0.6, 0.3, 0.6] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Rotating gradient ring */}
      <motion.div
        className="absolute -inset-1 rounded-full p-[3px]"
        style={{
          background: "conic-gradient(from 0deg,#ff5fb4,#c850ff,#ffe28a,#ff9ad4,#ff5fb4)",
        }}
        animate={{ rotate: 360 }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      >
        <div className="w-full h-full rounded-full bg-card" />
      </motion.div>

      {/* Orbiting hearts */}
      <motion.div
        className="absolute inset-0"
        animate={{ rotate: 360 }}
        transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
      >
        {Array.from({ length: heartCount }).map((_, i) => {
          const angle = (i / heartCount) * 360;
          return (
            <div
              key={i}
              className="absolute left-1/2 top-1/2"
              style={{ transform: `rotate(${angle}deg) translateY(-${size / 2 + 6}px)` }}
            >
              <Heart className="w-3 h-3 text-pink-400 fill-pink-400 drop-shadow-[0_0_4px_rgba(255,95,180,0.9)]" />
            </div>
          );
        })}
      </motion.div>

      {/* Avatar content */}
      <div className="absolute inset-[5px] rounded-full overflow-hidden bg-secondary flex items-center justify-center">
        {children}
      </div>
    </div>
  );
}