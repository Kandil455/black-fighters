import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import { Crown, Medal, Star } from "lucide-react";
import { getLevelInfo } from "@/lib/xpSystem";
import { useLocale } from "@/lib/LocaleContext";
import AnimatedAvatar from "@/components/AnimatedAvatar";

const RANK_STYLE = {
  0: { glow: "neon-glow-cyan",    border: "border-primary/50",                      badge: "bg-primary/15 text-primary",                      icon: Crown, iconColor: "text-primary" },
  1: { glow: "neon-glow-purple",  border: "border-accent/50",                       badge: "bg-accent/15 text-accent",                        icon: Medal, iconColor: "text-accent" },
  2: { glow: "neon-glow-green",   border: "border-[hsl(152,100%,50%)]/50",          badge: "bg-[hsl(152,100%,50%)]/15 text-[hsl(152,100%,50%)]", icon: Medal, iconColor: "text-[hsl(152,100%,50%)]" },
};

/**
 * A ranked row.
 *
 * It previously showed NO avatar at all — rank badge → name → score. That is why
 * students who uploaded a profile photo still appeared as strangers/anonymous
 * silhouettes on the leaderboard.
 */
export default function LeaderboardRow({ rank, name, correct, answered, isMe, xp = 0, avatar = "", isVideo = false, frame = "none" }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const style = RANK_STYLE[rank];
  const Icon = style?.icon;
  const accuracy = answered ? Math.round((correct / answered) * 100) : 0;
  const { current: level } = getLevelInfo(xp);

  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: Math.min(rank, 8) * 0.04 }}
      dir={dir}
      className={cn(
        "glass-card rounded-2xl px-4 py-3.5 flex items-center gap-3 border transition-colors",
        style ? `${style.border} ${style.glow}` : "border-border",
        isMe && !style && "border-primary/40 ring-1 ring-primary/30"
      )}
    >
      {/* Rank badge */}
      <div className={cn("w-9 h-9 rounded-xl flex items-center justify-center font-black shrink-0 text-base", style ? style.badge : "bg-secondary text-muted-foreground")}>
        {Icon ? <Icon className={cn("w-4.5 h-4.5", style.iconColor)} /> : rank + 1}
      </div>

      {/* Avatar — the student's own photo when they uploaded one */}
      <div className="shrink-0">
        <AnimatedAvatar
          src={avatar}
          isVideo={isVideo}
          frame={frame}
          size={40}
          fallback={(name || "?").trim().charAt(0).toUpperCase() || "؟"}
        />
      </div>

      {/* Name & level */}
      <div className="min-w-0 flex-1">
        <p className="font-bold truncate flex items-center gap-2">
          {name}
          {isMe && (
            <span className="text-xs text-primary font-semibold bg-primary/10 px-2 py-0.5 rounded-full">
              {isEn ? "(You)" : "(أنت)"}
            </span>
          )}
        </p>
        <div className="flex items-center gap-2 mt-0.5">
          <span className="text-xs text-muted-foreground">
            {accuracy}% {isEn ? "Accuracy" : "دقة"} · {answered} {isEn ? "questions" : "سؤال"}
          </span>
          {xp > 0 && (
            <span className="flex items-center gap-1 text-[10px] font-bold text-accent bg-accent/10 rounded-full px-2 py-0.5">
              {level.icon} {isEn && level.titleEn ? level.titleEn : level.title}
            </span>
          )}
        </div>
      </div>

      {/* Score */}
      <div className="text-end shrink-0">
        <p className="text-xl font-black text-primary">{correct}</p>
        <p className="text-[10px] text-muted-foreground">{isEn ? "Correct" : "إجابة صح"}</p>
        {xp > 0 && (
          <p className="text-[10px] text-accent flex items-center justify-end gap-0.5 mt-0.5">
            <Star className="w-2.5 h-2.5" />{xp.toLocaleString(isEn ? "en-US" : "ar-EG")} XP
          </p>
        )}
      </div>
    </motion.div>
  );
}
