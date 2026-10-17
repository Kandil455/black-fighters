import React from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Crown, Medal, Star, Flame, Target, CheckCircle2 } from "lucide-react";
import { getLevelInfo } from "@/lib/xpSystem";
import { useLocale } from "@/lib/LocaleContext";
import AnimatedAvatar from "@/components/AnimatedAvatar";

const RANK_STYLE = {
  0: {
    glow: "neon-glow-cyan",
    border: "border-[#fbbf24]/60 bg-gradient-to-r from-[#fbbf24]/10 via-transparent to-transparent",
    badge: "bg-[#fbbf24]/20 text-[#fbbf24] border border-[#fbbf24]/40",
    icon: Crown,
    iconColor: "text-[#fbbf24]",
    rewardAr: "جائزة المركز ١: 500 كريدت + تنين ذهبي",
    rewardEn: "Rank #1 Prize: 500 Cr + Gold Dragon",
  },
  1: {
    glow: "neon-glow-purple",
    border: "border-accent/50 bg-gradient-to-r from-accent/10 via-transparent to-transparent",
    badge: "bg-accent/15 text-accent border border-accent/35",
    icon: Medal,
    iconColor: "text-accent",
    rewardAr: "جائزة المركز ٢: 250 كريدت + تنين قرمزي",
    rewardEn: "Rank #2 Prize: 250 Cr + Crimson Dragon",
  },
  2: {
    glow: "neon-glow-green",
    border: "border-[#19f08c]/50 bg-gradient-to-r from-[#19f08c]/10 via-transparent to-transparent",
    badge: "bg-[#19f08c]/15 text-[#19f08c] border border-[#19f08c]/35",
    icon: Medal,
    iconColor: "text-[#19f08c]",
    rewardAr: "جائزة المركز ٣: 100 كريدت + تنين الزمرد",
    rewardEn: "Rank #3 Prize: 100 Cr + Emerald Dragon",
  },
};

export default function LeaderboardRow({
  userId,
  rank,
  name,
  correct,
  answered,
  isMe,
  xp = 0,
  streak = 0,
  masteryScore = 0,
  avatar = "",
  isVideo = false,
  frame = "none",
}) {
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const style = RANK_STYLE[rank];
  const Icon = style?.icon;
  const accuracy = answered ? Math.min(100, Math.round((correct / answered) * 100)) : 0;
  const { current: level } = getLevelInfo(xp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank, 8) * 0.04 }}
      dir={dir}
      onClick={() => userId && navigate(`/profile/${userId}`)}
      className={cn(
        "glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border transition-colors cursor-pointer hover:border-[#19f08c]/45",
        style ? `${style.border} ${style.glow}` : "border-border",
        isMe && !style && "border-primary/40 ring-1 ring-primary/30"
      )}
    >
      {/* Rank badge */}
      <div
        className={cn(
          "w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 text-base font-mono",
          style ? style.badge : "bg-secondary text-muted-foreground"
        )}
      >
        {Icon ? <Icon className={cn("w-4.5 h-4.5", style.iconColor)} /> : rank + 1}
      </div>

      {/* Avatar */}
      <div className="shrink-0">
        <AnimatedAvatar
          src={avatar}
          isVideo={isVideo}
          frame={frame !== "none" ? frame : rank === 0 ? "spartanApex" : rank === 1 ? "blazingAura" : rank === 2 ? "emeraldGlow" : "none"}
          size={44}
          fallback={(name || "?").trim().charAt(0).toUpperCase() || "؟"}
          animate={rank < 3}
        />
      </div>

      {/* Name, accuracy, streak & level */}
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-1.5">
          <p className="font-bold truncate text-sm sm:text-base">{name}</p>
          {isMe && (
            <span className="text-[10px] text-[#19f08c] font-bold bg-[#19f08c]/12 border border-[#19f08c]/30 px-2 py-0.5 rounded-full">
              {isEn ? "You" : "أنت"}
            </span>
          )}
          {xp > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
              {level.icon} {isEn && level.titleEn ? level.titleEn : level.title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-1 text-[11px] text-muted-foreground">
          <span className="inline-flex items-center gap-1 font-mono text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-md">
            <Target className="w-3 h-3" />
            {accuracy}% {isEn ? "Acc" : "دقة"}
          </span>
          <span className="inline-flex items-center gap-1 font-mono">
            <CheckCircle2 className="w-3 h-3 text-sky-400" />
            {correct}/{answered} {isEn ? "solved" : "إجابة صح"}
          </span>
          {streak > 0 && (
            <span className="inline-flex items-center gap-0.5 font-mono text-orange-300 bg-orange-500/10 px-1.5 py-0.5 rounded-md">
              <Flame className="w-3 h-3" /> {streak}d
            </span>
          )}
        </div>

        {style && (
          <p className="mt-1 text-[10px] font-bold text-amber-300/90">
            🎁 {isEn ? style.rewardEn : style.rewardAr}
          </p>
        )}
      </div>

      {/* Mastery Score & XP */}
      <div className="text-end shrink-0">
        <p className="text-lg sm:text-xl font-black font-mono tabular-nums text-[#19f08c]">
          {(masteryScore || xp || correct).toLocaleString("en-US")}
        </p>
        <p className="text-[10px] text-muted-foreground font-bold">
          {isEn ? "Mastery Pts" : "نقطة تفوق"}
        </p>
        <p className="text-[10px] text-amber-300 flex items-center justify-end gap-0.5 mt-0.5 font-mono tabular-nums">
          <Star className="w-2.5 h-2.5 fill-current" />
          {xp.toLocaleString("en-US")} XP
        </p>
      </div>
    </motion.div>
  );
}
