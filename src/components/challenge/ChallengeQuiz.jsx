import React, { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronLeft, ChevronRight, Clock, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

function fmt(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function ChallengeQuiz({ challenge, onFinish, otherFinished }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const questions = challenge._quiz?.questions || (Array.isArray(challenge._quiz) ? challenge._quiz : []) || challenge.quiz_questions || [];
  const startedAt = challenge.started_at ? new Date(challenge.started_at).getTime() : Date.now();
  const totalSeconds = (challenge.time_limit_minutes || 10) * 60;

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef([]);
  const finishedRef = useRef(false);

  // shared countdown based on started_at
  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);
      if (left <= 0 && !finishedRef.current) finish();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, totalSeconds]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    const spent = Math.min(totalSeconds, Math.floor((Date.now() - startedAt) / 1000));
    onFinish({
      score,
      total: questions.length || 1,
      time_spent_seconds: spent,
      answers: answersRef.current,
    });
  };

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const q = questions[current];
    const isCorrect = idx === q.correct_index;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    answersRef.current.push({ question_index: current, selected: idx, correct: isCorrect });
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      finish();
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
  };

  if (submitting) {
    return (
      <div className="text-center py-20" dir={dir}>
        <Loader2 className="w-10 h-10 animate-spin text-accent mx-auto mb-4" />
        <p className="font-bold">{isEn ? "You're done! 🎯" : "خلّصت! 🎯"}</p>
        <p className="text-sm text-muted-foreground mt-1">
          {otherFinished
            ? (isEn ? "Calculating results..." : "بنحسب النتيجة...")
            : (isEn ? "Waiting for the other player to finish..." : "في انتظار اللاعب التاني يخلّص...")}
        </p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="text-center py-20 max-w-md mx-auto" dir={dir}>
        <div className="glass-card rounded-3xl p-8 border border-destructive/20">
          <p className="font-bold text-lg mb-2">{isEn ? "No questions found in this quiz" : "لم يتم العثور على أسئلة لهذا الكويز"}</p>
          <Button onClick={() => window.history.back()} className="mt-4 font-bold">
            {isEn ? "Go Back" : "رجوع"}
          </Button>
        </div>
      </div>
    );
  }

  const lowTime = remaining <= 30;
  const q = questions[current] || {};

  return (
    <div dir={dir} className="max-w-2xl mx-auto">
      {/* Timer bar */}
      <div className="flex items-center justify-between mb-3">
        <div className={cn("flex items-center gap-1.5 font-black text-lg px-3 py-1.5 rounded-xl border", lowTime ? "text-destructive border-destructive/40 bg-destructive/10 animate-pulse" : "text-primary border-primary/30 bg-primary/5")}>
          <Clock className="w-5 h-5" /> {fmt(remaining)}
        </div>
        <span className="text-sm font-bold text-muted-foreground">
          {isEn ? `Question ${current + 1}/${questions.length}` : `سؤال ${current + 1}/${questions.length}`}
        </span>
      </div>
      <div className="h-2 bg-secondary rounded-full mb-6 overflow-hidden">
        <motion.div className="h-full bg-gradient-to-l from-accent to-primary" animate={{ clipPath: `inset(0% ${100 - (remaining / totalSeconds) * 100}% 0% 0%)` }} transition={{ duration: 1, ease: "linear" }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 40, scale: 0.97 }}
          animate={{ opacity: 1, x: 0, scale: 1 }}
          exit={{ opacity: 0, x: -40, scale: 0.97 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="glass-card rounded-3xl p-6 sm:p-8 border border-border"
        >
          <h3 className="text-lg sm:text-xl font-bold mb-6 leading-relaxed">{q.question}</h3>
          <div className="space-y-3">
            {(q.options || []).map((opt, i) => {
              const isCorrect = i === q.correct_index;
              const isSelected = i === selected;
              return (
                <motion.button
                  key={i}
                  onClick={() => handleSelect(i)}
                  disabled={answered}
                  whileHover={!answered ? { scale: 1.015 } : {}}
                  whileTap={!answered ? { scale: 0.98 } : {}}
                  className={cn(
                    "w-full text-start rounded-2xl border font-semibold px-4 py-3.5 text-sm transition-colors flex items-center justify-between gap-3",
                    !answered && "border-border hover:border-accent/40 hover:bg-accent/5",
                    answered && isCorrect && "border-green-500/60 bg-green-500/10 text-green-400 neon-glow-green",
                    answered && isSelected && !isCorrect && "border-destructive/60 bg-destructive/10 text-destructive",
                    answered && !isCorrect && !isSelected && "border-border opacity-50"
                  )}
                >
                  <span>{opt}</span>
                  {answered && isCorrect && <Check className="w-5 h-5 shrink-0" />}
                  {answered && isSelected && !isCorrect && <X className="w-5 h-5 shrink-0" />}
                </motion.button>
              );
            })}
          </div>

          {answered && (
            <Button onClick={handleNext} className="w-full mt-6 h-11 font-bold gap-2">
              {current + 1 >= questions.length ? (isEn ? "Finish" : "إنهاء") : (isEn ? "Next" : "التالي")}
              {isEn ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}