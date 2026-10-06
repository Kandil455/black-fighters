import React from "react";
import { motion } from "framer-motion";

const IMAGES = [
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/fc54e0acb_image.png",
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/026e38b3f_image.png",
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/c354c8b6a_image.png",
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/c838c9aef_generated_image.png",
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/0706848e7_generated_image.png",
  "https://media.base44.com/images/public/6a2aa7216a5767b90e98bdea/a6a83c5e0_generated_image.png",
];

export default function TojiGallery() {
  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
      {IMAGES.map((src, i) => (
        <motion.div
          key={src}
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ delay: i * 0.08, duration: 0.5 }}
          whileHover={{ y: -6 }}
          className="relative rounded-2xl overflow-hidden border border-primary/25 hover:neon-glow-cyan transition-shadow duration-300 group"
        >
          <img
            src={src}
            alt={`Toji ${i + 1}`}
            className="w-full h-72 object-cover object-top group-hover:scale-105 transition-transform duration-500"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-background/70 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.div>
      ))}
    </div>
  );
}