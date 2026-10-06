import React from "react";
import { motion } from "framer-motion";
import { Flame } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const VIDEO_URL = "https://media.base44.com/videos/public/6a2aa7216a5767b90e98bdea/d803c9476_generated_video.mp4";

export default function TojiHero() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.6 }}
      className="relative rounded-3xl overflow-hidden border border-accent/30 neon-glow-purple mb-8"
      dir={dir}
    >
      <video
        src={VIDEO_URL}
        autoPlay
        loop
        muted
        playsInline
        className="w-full h-[340px] md:h-[460px] object-cover"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div className={`absolute bottom-0 ${isEn ? 'left-0 text-left' : 'right-0 text-right'} p-6 md:p-10`}>
        <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass-card border border-accent/40 text-sm text-accent font-semibold mb-4">
          <Flame className="w-4 h-4" /> {isEn ? "Black Fighters Energy" : "طاقة Black Fighters"}
        </span>
        <h1 className="text-3xl md:text-5xl font-black neon-text-gradient mb-3">
          {isEn ? "Enter Challenge Mode" : "ادخل في وضع التحدّي"}
        </h1>
        <p className={`text-muted-foreground max-w-md ${isEn ? 'mr-auto' : 'ml-auto'}`}>
          {isEn
            ? "Channel pure strength, focus deeply, and break all your limits — like a true Black Fighter."
            : "استلهم القوة، ذاكر بتركيز، واكسر حدودك — كمحارب Black Fighters حقيقي."}
        </p>
      </div>
    </motion.div>
  );
}