import React from "react";
import { motion } from "framer-motion";
import { Crown, Clock, CheckCircle2, Loader2 } from "lucide-react";
import AnimatedAvatar from "@/components/AnimatedAvatar";

const MEDALS = ["🥇", "🥈", "🥉"];

export default function GroupQuizLeaderboard({ participants = [], myId, live = false }) {
  const ranked = [...participants].sort((a, b) => {
    if (b.percentage !== a.percentage) return (b.percentage || 0) - (a.percentage || 0);
    return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
  });

  return (
    <div className="space-y-2">
      {ranked.map((p, i) => {
        const mine = p.user_id === myId;
        return (
          <motion.div key={p.user_id} layout
            initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className={`flex items-center gap-3 p-3 rounded-2xl border ${mine ? "bg-primary/10 border-primary/30" : "bg-secondary/40 border-border"}`}>
            <span className="w-7 text-center text-lg font-black shrink-0">{MEDALS[i] || `${i + 1}`}</span>
            <AnimatedAvatar animate={false} src={p.avatar} size={36} fallback="🎓" />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm truncate">{p.user_name}{mine && " (أنت)"}</p>
              {p.finished ? (
                <p className="text-xs text-muted-foreground flex items-center gap-2">
                  <span>{p.score}/{p.total}</span>
                  <span className="flex items-center gap-0.5"><Clock className="w-3 h-3" /> {p.time_spent_seconds}ث</span>
                </p>
              ) : (
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  {live ? <><Loader2 className="w-3 h-3 animate-spin" /> بيحلّ...</> : "لسه"}
                </p>
              )}
            </div>
            {p.finished
              ? <span className="font-black text-primary text-sm shrink-0">{p.percentage}%</span>
              : <CheckCircle2 className="w-4 h-4 text-muted-foreground/40 shrink-0" />}
            {i === 0 && p.finished && <Crown className="w-4 h-4 text-yellow-400 shrink-0" />}
          </motion.div>
        );
      })}
    </div>
  );
}