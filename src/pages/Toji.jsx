import React from "react";
import { motion } from "framer-motion";
import { useLocale } from "@/lib/LocaleContext";
import TojiHero from "@/components/toji/TojiHero";
import TojiGallery from "@/components/toji/TojiGallery";

export default function Toji() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  return (
    <div className="max-w-6xl mx-auto" dir={dir}>
      <TojiHero />
      <motion.h2
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="text-2xl font-extrabold mb-5 flex items-center gap-2"
      >
        <span className="neon-text-gradient">{isEn ? "Gallery" : "المعرض"}</span>
      </motion.h2>
      <TojiGallery />
    </div>
  );
}