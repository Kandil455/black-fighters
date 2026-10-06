import React from "react";
import { Crown, Sparkles, Zap, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import { getLevelInfo } from "@/lib/xpSystem";

const RANK_COLORS = {
  "S-Rank": { glow: "shadow-[0_0_30px_rgba(0,245,255,0.3)]", text: "text-primary", border: "border-primary/50" },
  "A-Rank": { glow: "shadow-[0_0_30px_rgba(191,95,255,0.3)]", text: "text-accent", border: "border-accent/50" },
  "B-Rank": { glow: "shadow-[0_0_30px_rgba(0,255,136,0.3)]", text: "text-[hsl(152,100%,50%)]", border: "border-[hsl(152,100%,50%)]/50" },
  "Starter": { glow: "", text: "text-muted-foreground", border: "border-white/10" },
};

export default function AnimePowerPanel({ avgScore, totalQuestions, coursesCount, xp = 0 }) {
  const power = Math.min(99999, Math.round(avgScore * 12 + totalQuestions * 1.5 + coursesCount * 80 + xp * 0.5));
  const rank = power >= 5000 ? "S-Rank" : power >= 2000 ? "A-Rank" : power >= 500 ? "B-Rank" : "Starter";
  const rankStyle = RANK_COLORS[rank];
  const { current: level, progress: lvlProgress } = getLevelInfo(xp);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`ios-glass-card relative overflow-hidden rounded-3xl border ${rankStyle.border} p-6 mb-6 ${rankStyle.glow}`}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,hsl(270_100%_68%/.15),transparent_35%),radial-gradient(circle_at_80%_10%,hsl(184_100%_50%/.10),transparent_35%)] pointer-events-none" />

      <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-5">
        {/* Left: rank & level */}
        <div className="flex items-center gap-4">
          <div className="relative shrink-0">
            <div className="w-20 h-20 rounded-2xl bg-gradient-to-tr from-accent/20 via-primary/20 to-transparent border border-white/20 backdrop-blur-xl flex items-center justify-center shadow-inner">
              <Trophy className="w-10 h-10 text-accent animate-pulse" />
            </div>
            <div className="absolute -bottom-1 -right-1 bg-accent text-black text-[10px] font-black px-2.5 py-0.5 rounded-full border border-background shadow-md">
              {level.icon} {level.title}
            </div>
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 text-xs font-black text-accent mb-1">
              <Crown className="w-4 h-4" /> مستوى القوة والذكاء
            </div>
            <h2 className={`text-3xl font-black ${rankStyle.text} font-heading`}>{rank}</h2>
            <div className="flex items-center gap-2 mt-1.5">
              <div className="w-32 bg-white/10 rounded-full h-2 overflow-hidden">
                <motion.div 
                  initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
                  animate={{ clipPath: `inset(0% ${100 - lvlProgress}% 0% 0%)` }}
                  className="h-full bg-gradient-to-r from-primary to-accent rounded-full" 
                />
              </div>
              <span className="text-[11px] font-bold text-muted-foreground">{lvlProgress}%</span>
            </div>
            <p className="text-xs text-muted-foreground font-medium mt-1">{xp.toLocaleString()} XP مكتسب</p>
          </div>
        </div>

        {/* Right: power & stats */}
        <div className="flex items-center gap-3">
          <div className="text-center rounded-2xl border border-primary/30 bg-white/[0.03] px-5 py-3.5 shadow-inner">
            <Zap className="w-5 h-5 text-primary mx-auto mb-1" />
            <p className="text-3xl font-black font-heading text-foreground">{power.toLocaleString()}</p>
            <p className="text-[11px] text-muted-foreground font-bold">قوة المذاكرة</p>
          </div>
          <div className="space-y-2">
            <div className="text-center rounded-xl border border-accent/25 bg-white/[0.02] px-4 py-2">
              <p className="text-base font-black text-accent">{avgScore}%</p>
              <p className="text-[10px] text-muted-foreground">متوسط الكويزات</p>
            </div>
            <div className="text-center rounded-xl border border-[hsl(152,100%,50%)]/25 bg-white/[0.02] px-4 py-2">
              <p className="text-base font-black text-[hsl(152,100%,50%)]">{totalQuestions}</p>
              <p className="text-[10px] text-muted-foreground">أسئلة حُليت</p>
            </div>
          </div>
          <Sparkles className="hidden lg:block w-8 h-8 text-primary animate-pulse" />
        </div>
      </div>
    </motion.div>
  );
}
