import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Swords, Copy, Check, Users, Clock, Play, Loader2, Send } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

const TIME_OPTIONS = [5, 10, 15, 20];

export default function ChallengeLobby({ challenge, isHost, onStart, onSetTime, starting }) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const [copied, setCopied] = useState(false);
  const participants = challenge.participants || [];
  const url = `${window.location.origin}/challenge/${challenge.id}`;

  const copyLink = async () => {
    await navigator.clipboard.writeText(url);
    setCopied(true);
    toast.success(isEn ? "Room link copied ✅ Send it to your classmate!" : "اتنسخ لينك الغرفة ✅ ابعته لصاحبك");
    setTimeout(() => setCopied(false), 2000);
  };

  const shareToTelegram = () => {
    const shareText = isEn
      ? `⚔️ Join my 1v1 Live Quiz Challenge on Black Fighters: "${challenge.quiz_title || "Quiz"}"!`
      : `⚔️ اتحداك في غرفة كويز حي 1v1 على منصة Black Fighters: «${challenge.quiz_title || "كويز"}»!`;
    const tgShareUrl = `https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(shareText)}`;
    window.open(tgShareUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="glass-card rounded-3xl p-6 sm:p-10 border border-accent/30 neon-glow-purple max-w-xl mx-auto text-center"
    >
      <motion.div
        animate={{ rotate: [0, -10, 10, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        className="w-16 h-16 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-4"
      >
        <Swords className="w-8 h-8 text-accent" />
      </motion.div>

      <h1 className="text-2xl font-black mb-1">{isEn ? "1v1 Challenge Arena ⚔️" : "غرفة التحدّي ⚔️"}</h1>
      <p className="text-muted-foreground text-sm mb-6">{challenge.quiz_title}</p>

      {/* Share link */}
      <div className="flex flex-wrap items-center gap-2 bg-secondary/40 rounded-2xl p-2 mb-6 border border-border">
        <span className="flex-1 text-xs text-muted-foreground truncate px-2 text-start font-mono" dir="ltr">{url}</span>
        <Button size="sm" onClick={copyLink} className="gap-1.5 font-bold shrink-0">
          {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
          {copied ? (isEn ? "Copied" : "اتنسخ") : (isEn ? "Copy Link" : "انسخ")}
        </Button>
        <Button size="sm" variant="outline" onClick={shareToTelegram} className="gap-1.5 font-bold shrink-0 border-primary/40 text-primary hover:bg-primary/10">
          <Send className="w-3.5 h-3.5" />
          {isEn ? "Telegram" : "تيليجرام"}
        </Button>
      </div>

      {/* Time selector (host only) */}
      {isHost && (
        <div className="mb-6">
          <p className="text-xs font-bold text-muted-foreground mb-2 flex items-center justify-center gap-1.5">
            <Clock className="w-3.5 h-3.5" /> {isEn ? "Time Limit" : "الوقت المحدد"}
          </p>
          <div className="flex gap-2 justify-center">
            {TIME_OPTIONS.map((m) => (
              <button
                key={m}
                onClick={() => onSetTime(m)}
                className={`px-4 py-2 rounded-xl text-sm font-bold transition-colors cursor-pointer ${
                  challenge.time_limit_minutes === m
                    ? "bg-accent/15 text-accent border border-accent/40"
                    : "bg-secondary/40 text-muted-foreground border border-transparent"
                }`}
              >
                {m} {isEn ? "min" : "د"}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Participants */}
      <div className="mb-6">
        <p className="text-xs font-bold text-muted-foreground mb-3 flex items-center justify-center gap-1.5">
          <Users className="w-3.5 h-3.5" /> {isEn ? `Players (${participants.length}/2)` : `اللاعبين (${participants.length}/2)`}
        </p>
        <div className="flex flex-wrap gap-2 justify-center">
          {participants.map((p, i) => (
            <motion.div
              key={p.user_id}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              className="flex items-center gap-2 bg-secondary/50 rounded-full pl-4 pr-2 py-1.5 border border-border"
            >
              <span className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-xs font-black text-white">
                {(p.user_name || "?")[0].toUpperCase()}
              </span>
              <span className="text-sm font-bold">{p.user_name}</span>
              {i === 0 && <span className="text-[10px]">👑</span>}
            </motion.div>
          ))}
          {participants.length < 2 && (
            <div className="flex items-center gap-2 bg-secondary/20 rounded-full px-4 py-1.5 border border-dashed border-border text-muted-foreground text-sm">
              <Loader2 className="w-3.5 h-3.5 animate-spin" /> {isEn ? "Waiting for challenger..." : "في انتظار لاعب..."}
            </div>
          )}
        </div>
      </div>

      {isHost ? (
        <Button
          onClick={onStart}
          disabled={starting}
          className="w-full h-12 font-black gap-2 neon-glow-purple"
        >
          {starting ? <Loader2 className="w-5 h-5 animate-spin" /> : <Play className="w-5 h-5" />}
          {participants.length < 2
            ? isEn
              ? "Start Challenge Now ⚔️ (or share link with friend)"
              : "ابدأ التحدّي الآن ⚔️ (أو انسخ اللينك وابعته لصاحبك)"
            : isEn
            ? "Start 1v1 Battle! ⚔️"
            : "ابدأ التحدّي! ⚔️"}
        </Button>
      ) : (
        <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> {isEn ? "Waiting for host to start..." : "في انتظار صاحب الغرفة يبدأ..."}
        </p>
      )}
    </motion.div>
  );
}