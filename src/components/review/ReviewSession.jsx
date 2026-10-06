import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { RotateCw, Flame, BrainCircuit, AlertTriangle } from "lucide-react";
import { base44 } from '@/api/base44Client';
import { nextReviewState, recordStudy } from "@/lib/gamification";
import { awardProgress } from "@/lib/xpSystem";
import { scheduleFsrsReview, FSRS_RATINGS } from "@/lib/summaryV5/fsrsEngine";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

const FSRS_DIFFICULTY_BUTTONS = [
  { rating: FSRS_RATINGS.AGAIN, key: false,    shortcut: "1", labelAr: "١ · نسيت (Again)", labelEn: "1 · Again", emoji: "😵", cls: "border-destructive/50 text-destructive hover:bg-destructive/10" },
  { rating: FSRS_RATINGS.HARD,  key: "hard",   shortcut: "2", labelAr: "٢ · صعبة (Hard)",  labelEn: "2 · Hard",  emoji: "😅", cls: "border-amber-500/50 text-amber-400 hover:bg-amber-500/10" },
  { rating: FSRS_RATINGS.GOOD,  key: "medium", shortcut: "3", labelAr: "٣ · كويس (Good)",  labelEn: "3 · Good",  emoji: "🙂", cls: "border-accent/50 text-accent hover:bg-accent/10" },
  { rating: FSRS_RATINGS.EASY,  key: true,     shortcut: "4", labelAr: "٤ · سهلة (Easy)",  labelEn: "4 · Easy",  emoji: "🔥", cls: "border-[hsl(152,100%,50%)]/50 text-[hsl(152,100%,50%)] hover:bg-[hsl(152,100%,50%)]/10" },
];

export default function ReviewSession({ cards, onDone }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [idx, setIdx] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [reviewed, setReviewed] = useState(0);
  const [correctCount, setCorrectCount] = useState(0);
  const [leechAlert, setLeechAlert] = useState(null);

  const card = cards[idx];

  const grade = async (btn) => {
    if (!card) return;
    const isCorrect = btn.rating >= FSRS_RATINGS.GOOD;
    const fsrsUpdated = scheduleFsrsReview(
      {
        ...card,
        stability: card.stability || (card.box ? card.box * 1.5 : 0),
        difficulty: card.difficulty || 5,
        reps: card.reps || 0,
        lapses: card.lapses || 0,
      },
      btn.rating
    );

    if (fsrsUpdated.isLeech) {
      setLeechAlert(fsrsUpdated.leechAdviceAr);
    } else {
      setLeechAlert(null);
    }

    const legacyState = nextReviewState(card, isCorrect);
    if (btn.rating === FSRS_RATINGS.HARD) {
      legacyState.box = Math.max(1, card.box || 1);
    }
    const nextDueIso = new Date(fsrsUpdated.dueAt).toISOString().split("T")[0];

    try {
      if (card.id && !String(card.id).startsWith("atlas_demo_")) {
        await base44.entities.ReviewCard.update(card.id, {
          ...legacyState,
          due_date: nextDueIso,
          stability: fsrsUpdated.stability,
          difficulty: fsrsUpdated.difficulty,
          reps: fsrsUpdated.reps,
          lapses: fsrsUpdated.lapses,
          is_leech: fsrsUpdated.isLeech,
        });
      }
    } catch {}

    if (isCorrect) setCorrectCount((c) => c + 1);
    setReviewed((r) => r + 1);
    if (idx + 1 >= cards.length) {
      try {
        await recordStudy({ minutes: Math.max(1, Math.round(cards.length * 0.5)), questions: cards.length });
        await awardProgress('review_card', cards.length);
      } catch {}
      onDone(reviewed + 1);
    } else {
      setIdx((i) => i + 1);
      setFlipped(false);
    }
  };

  // Keyboard shortcuts: Space to flip, 1/2/3/4 to grade (V4 Section 5.9 & V5 1.4)
  useEffect(() => {
    const onKeyDown = (e) => {
      if (['INPUT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
      if (e.code === "Space" && !flipped) {
        e.preventDefault();
        setFlipped(true);
        return;
      }
      if (flipped && ["1", "2", "3", "4"].includes(e.key)) {
        e.preventDefault();
        const targetBtn = FSRS_DIFFICULTY_BUTTONS.find((b) => b.shortcut === e.key);
        if (targetBtn) grade(targetBtn);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [flipped, idx, card]);

  if (!card) return null;

  const progress = (idx / cards.length) * 100;

  return (
    <div className="max-w-xl mx-auto" dir={dir}>
      {/* Header */}
      <div className="flex items-center justify-between mb-3 text-sm">
        <span className="text-muted-foreground font-mono">{idx + 1} / {cards.length} · FSRS v4.5</span>
        <span className="text-primary font-bold truncate max-w-[200px]">{card.course_title || "أطلس المراجعة"}</span>
        <div className="flex items-center gap-1 text-[hsl(152,100%,50%)] font-bold text-sm">
          <Flame className="w-4 h-4" /> {correctCount}
        </div>
      </div>

      {/* Progress bar */}
      <div className="h-2 bg-secondary rounded-full mb-6 overflow-hidden">
        <motion.div
          className="h-full rounded-full bg-gradient-to-l from-primary via-accent to-[hsl(152,100%,50%)]"
          animate={{ clipPath: `inset(0% ${100 - progress}% 0% 0%)` }}
          transition={{ duration: 0.3 }}
        />
      </div>

      {/* Leech remediation banner if lapses >= 5 */}
      {leechAlert && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl border border-amber-500/40 bg-amber-500/10 p-3 text-xs text-amber-200">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>{leechAlert}</span>
        </div>
      )}

      {/* Box & Stability indicator */}
      <div className="flex items-center justify-center gap-1.5 mb-4">
        {[1,2,3,4,5].map((box) => (
          <div key={box} className={cn("w-6 h-1.5 rounded-full transition-colors", (card.box || 1) >= box ? "bg-primary" : "bg-secondary")} />
        ))}
        <span className="text-xs text-muted-foreground mx-1 font-mono">
          {isEn ? `Box ${card.box || 1}` : `صندوق ${card.box || 1}`}
          {card.stability ? ` · S=${Number(card.stability).toFixed(1)}d` : ""}
        </span>
      </div>

      {/* Card flip */}
      <div style={{ perspective: 1200 }} className="mb-6">
        <motion.div
          onClick={() => setFlipped((f) => !f)}
          animate={{ rotateY: flipped ? 180 : 0 }}
          transition={{ duration: 0.32, ease: "easeOut" }}
          style={{ transformStyle: "preserve-3d" }}
          className="relative w-full h-64 cursor-pointer"
        >
          {/* Front */}
          <div style={{ backfaceVisibility: "hidden" }} className="absolute inset-0 glass-card neon-glow-cyan rounded-3xl border border-primary/30 flex flex-col items-center justify-center p-8 text-center">
            <BrainCircuit className="w-6 h-6 text-primary mb-3 opacity-60" />
            <p className="text-xl font-bold leading-relaxed">{card.front}</p>
            <p className="text-xs text-muted-foreground mt-4 flex items-center gap-1">
              <RotateCw className="w-3 h-3" /> {isEn ? "Tap or press Space to flip" : "اضغط أو مسطرة المسافة (Space) لقلب البطاقة"}
            </p>
          </div>
          {/* Back */}
          <div style={{ backfaceVisibility: "hidden", transform: "rotateY(180deg)" }} className="absolute inset-0 glass-card neon-glow-purple rounded-3xl border border-accent/30 flex items-center justify-center p-8 text-center">
            <p className="text-lg leading-relaxed">{card.back}</p>
          </div>
        </motion.div>
      </div>

      {/* Actions */}
      <AnimatePresence mode="wait">
        {!flipped ? (
          <motion.div key="flip" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <Button onClick={() => setFlipped(true)} variant="outline" className="w-full gap-2 h-12">
              <RotateCw className="w-4 h-4" /> {isEn ? "Flip Card (Space)" : "اقلب البطاقة (Space)"}
            </Button>
          </motion.div>
        ) : (
          <motion.div key="grade" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="grid grid-cols-2 sm:grid-cols-4 gap-2">
            {FSRS_DIFFICULTY_BUTTONS.map((btn) => (
              <Button key={btn.shortcut} onClick={() => grade(btn)} variant="outline" className={cn("h-12 flex-col gap-0.5 text-xs font-bold", btn.cls)}>
                <span className="text-lg">{btn.emoji}</span>
                {isEn ? btn.labelEn : btn.labelAr}
              </Button>
            ))}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}