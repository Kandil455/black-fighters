import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BADGES } from "@/lib/gamification";

export default function BadgesGrid({ unlocked = [] }) {
  const owned = new Set(unlocked);
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
      {Object.entries(BADGES).map(([key, b], i) => {
        const has = owned.has(key);
        return (
          <motion.div
            key={key}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={cn(
              "glass-card rounded-2xl p-5 text-center border transition-colors",
              has ? "border-accent/40 neon-glow-purple" : "border-border opacity-40 grayscale"
            )}
          >
            <div className="text-4xl mb-2">{b.icon}</div>
            <p className="font-bold text-sm mb-1">{b.title}</p>
            <p className="text-xs text-muted-foreground">{b.desc}</p>
          </motion.div>
        );
      })}
    </div>
  );
}