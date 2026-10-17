import React, { useEffect, useState } from "react";
import { AlertTriangle } from "@/components/ui/animatedIcons";
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

  const progress = Math.round(((idx + 1) / cards.length) * 100);

  const rateIntervals = [
    { rating: FSRS_RATINGS.AGAIN, labelAr: "تاني", labelEn: "Again", subAr: "10 د", subEn: "10m", shortcut: "1" },
    { rating: FSRS_RATINGS.HARD, labelAr: "صعب", labelEn: "Hard", subAr: "يوم", subEn: "1d", shortcut: "2" },
    { rating: FSRS_RATINGS.GOOD, labelAr: "جيد", labelEn: "Good", subAr: "3 أيام", subEn: "3d", shortcut: "3" },
    { rating: FSRS_RATINGS.EASY, labelAr: "سهل", labelEn: "Easy", subAr: "أسبوع", subEn: "7d", shortcut: "4" },
  ];

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={dir}>
      <div className="bf-hd">
        <span className="mono">
          {card.course_title || (isEn ? "REVIEW · FSRS v4.5" : "المراجعة · FSRS")}
        </span>
        <h1 className="serif">
          {isEn ? "Review at the " : "راجع "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "Right Moment." : "في الميعاد."}</em>
        </h1>
        <p style={{ color: "var(--mute)", fontSize: "0.92rem" }}>
          {isEn
            ? "Cards return right before you are likely to forget. Rate your recall honestly."
            : "البطاقة بترجع في الوقت اللي تقريباً هتنساها فيه. قيّم نفسك بصدق."}
        </p>
      </div>

      {leechAlert && (
        <div className="card" style={{ borderColor: "var(--sig)", background: "color-mix(in srgb, var(--sig) 8%, var(--paper2))" }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            <AlertTriangle className="w-5 h-5 text-[var(--sig)] shrink-0" />
            <span style={{ fontSize: "0.85rem" }}>{leechAlert}</span>
          </div>
        </div>
      )}

      <div className="two">
        <div style={{ display: "grid", gap: 14 }}>
          {/* FLIP CARD */}
          <div
            className={cn("flip", flipped && "on")}
            onClick={() => setFlipped((f) => !f)}
            role="button"
            tabIndex={0}
            aria-label={isEn ? "Flip Card" : "اقلب البطاقة"}
          >
            <div className="flip-i">
              <div className="face">
                <div>
                  <span className="mono">{isEn ? "QUESTION" : "السؤال"}</span>
                  <br />
                  <b style={{ fontSize: "1.25rem", lineHeight: 1.6, display: "block", marginTop: 8 }}>
                    {card.front}
                  </b>
                  <span className="mono" style={{ display: "block", marginTop: 16 }}>
                    {isEn ? "Press Space or click to flip" : "اضغط للمسافة أو انقر للقلب"}
                  </span>
                </div>
              </div>
              <div className="face b">
                <div>
                  <span className="mono">{isEn ? "ANSWER" : "الإجابة"}</span>
                  <br />
                  <div style={{ fontSize: "1.1rem", lineHeight: 1.7, marginTop: 8 }}>
                    {card.back}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* RATING BUTTONS */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 8,
            }}
          >
            {rateIntervals.map((btn) => (
              <button
                key={btn.shortcut}
                type="button"
                onClick={() => {
                  if (!flipped) setFlipped(true);
                  else grade(btn);
                }}
                className="opt"
                style={{
                  display: "grid",
                  gap: 2,
                  padding: "12px 4px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  minHeight: 64,
                  textAlign: "center",
                  justifyItems: "center",
                  borderRadius: 4,
                  cursor: "pointer",
                }}
              >
                <b style={{ fontSize: "0.95rem" }}>{isEn ? btn.labelEn : btn.labelAr}</b>
                <small className="mono" style={{ fontSize: "0.7rem", color: "var(--mute)" }}>
                  {isEn ? btn.subEn : btn.subAr}
                </small>
              </button>
            ))}
          </div>
        </div>

        {/* RIGHT CARD: SESSION PROGRESS */}
        <div className="card">
          <span className="mono">{isEn ? "SESSION PROGRESS" : "تقدم الجلسة"}</span>
          <div className="big">
            {idx + 1} / {cards.length}
          </div>
          <div className="bar">
            <i style={{ width: `${progress}%` }}></i>
          </div>
          <div className="mono" style={{ display: "grid", gap: 4 }}>
            <span>
              {isEn ? `Box ${card.box || 1}` : `صندوق ${card.box || 1}`} · {correctCount} {isEn ? "correct" : "إجابة صحيحة"}
            </span>
            {card.stability ? (
              <span>
                {isEn ? `Stability: ${Number(card.stability).toFixed(1)} days` : `معدل الثبات: ${Number(card.stability).toFixed(1)} يوم`}
              </span>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}