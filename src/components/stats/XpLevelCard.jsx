import React from "react";
import { motion } from "framer-motion";
import { getLevelInfo } from "@/lib/xpSystem";
import { Star, Zap } from "lucide-react";

export default function XpLevelCard({ xp = 0 }) {
  const { current, next, progress } = getLevelInfo(xp);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="anime-panel glass-card rounded-3xl border border-primary/30 neon-glow-cyan p-6 mb-6 overflow-hidden"
    >
      <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full bg-primary/10 blur-3xl" />
      <div className="relative flex items-center gap-5">
        <div className="relative shrink-0">
          <div className="w-20 h-20 rounded-2xl bg-gradient-to-br from-primary/30 to-accent/30 border border-primary/40 flex items-center justify-center text-4xl neon-glow-cyan">
            {current.icon}
          </div>
          <div className="absolute -bottom-1 -right-1 bg-accent text-white text-xs font-black px-2 py-0.5 rounded-full border border-background">
            Lv.{current.level}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <Star className="w-4 h-4 text-primary" />
            <span className="font-black text-lg">{current.title}</span>
          </div>
          <div className="flex items-center gap-2 mb-3">
            <Zap className="w-3.5 h-3.5 text-accent" />
            <span className="text-sm text-muted-foreground">{(xp || 0).toLocaleString()} XP</span>
            {next && <span className="text-xs text-muted-foreground">/ {(next.minXP || 0).toLocaleString()} للمستوى التالي</span>}
          </div>
          <div className="w-full bg-secondary rounded-full h-3 overflow-hidden">
            <motion.div
              initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
              animate={{ clipPath: `inset(0% ${100 - progress}% 0% 0%)` }}
              transition={{ duration: 1, ease: "easeOut" }}
              className="h-full rounded-full bg-gradient-to-r from-primary via-accent to-[hsl(152,100%,50%)]"
            />
          </div>
          {next && (
            <p className="text-xs text-muted-foreground mt-1.5">
              {progress}% نحو {next.icon} {next.title}
            </p>
          )}
        </div>
      </div>
    </motion.div>
  );
}