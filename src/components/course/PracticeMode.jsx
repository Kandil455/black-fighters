import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, RotateCcw, Target, ArrowRight, Timer } from "lucide-react";
import { cn } from "@/lib/utils";

const QUESTION_TIME = 30;

export default function PracticeMode({ quiz }) {
  const allQuestions = quiz?.questions || [];
  const [questions] = useState(() => [...allQuestions].sort(() => Math.random() - 0.5).slice(0, Math.min(10, allQuestions.length)));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [started, setStarted] = useState(false);

  const q = questions[current];

  useEffect(() => {
    if (!started || done || answered) return;
    if (timeLeft <= 0) { setAnswered(true); setSelected(-1); return; }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, started, done, answered]);

  const answer = (i) => {
    if (answered || !started) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.correct_index) setScore((s) => s + 1);
  };

  const next = () => {
    if (current + 1 >= questions.length) { setDone(true); return; }
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
    setTimeLeft(QUESTION_TIME);
  };

  const reset = () => {
    setCurrent(0); setSelected(null); setAnswered(false);
    setScore(0); setDone(false); setTimeLeft(QUESTION_TIME); setStarted(false);
  };

  if (!questions.length) return <p className="text-muted-foreground text-center py-8">لازم تولّد كويز الأول</p>;

  if (!started) {
    return (
      <div className="text-center py-8">
        <Target className="w-14 h-14 text-primary mx-auto mb-4 opacity-80" />
        <h3 className="text-xl font-extrabold mb-2">وضع التدريب 🎯</h3>
        <p className="text-muted-foreground mb-2">{questions.length} سؤال عشوائي — بدون تسجيل نتيجة</p>
        <p className="text-sm text-muted-foreground mb-6">مناسب للمراجعة السريعة قبل الامتحان</p>
        <Button onClick={() => setStarted(true)} className="gap-2 font-bold neon-glow-cyan">
          <Target className="w-4 h-4" /> ابدأ التدريب
        </Button>
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="text-center py-8">
        <div className="text-5xl mb-4">{pct >= 80 ? "🏆" : pct >= 60 ? "💪" : "📖"}</div>
        <h3 className="text-2xl font-extrabold mb-2">{score} / {questions.length}</h3>
        <p className="text-4xl font-black text-primary mb-4">{pct}%</p>
        <p className="text-muted-foreground mb-6">
          {pct >= 80 ? "ممتاز! أنت جاهز للامتحان 🔥" : pct >= 60 ? "كويس، بس فضل استذاكر أكتر" : "راجع الكورس تاني وحاول من جديد"}
        </p>
        <Button onClick={reset} className="gap-2 font-bold">
          <RotateCcw className="w-4 h-4" /> تدريب جديد
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4 text-sm">
        <span className="font-bold text-muted-foreground">{current + 1} / {questions.length}</span>
        <div className="flex items-center gap-2">
          <Timer className="w-4 h-4 text-accent" />
          <span className={cn("font-black tabular-nums", timeLeft <= 10 ? "text-destructive animate-pulse" : "text-foreground")}>
            {timeLeft}s
          </span>
        </div>
        <span className="font-bold text-[hsl(152,100%,50%)]">✓ {score}</span>
      </div>

      <div className="w-full bg-secondary rounded-full h-1.5 mb-6 overflow-hidden">
        <div className="h-full bg-primary transition-colors duration-300" style={{ width: `${((current) / questions.length) * 100}%` }} />
      </div>

      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 20 }}>
          <p className="font-extrabold text-lg mb-6 leading-relaxed">{q.question}</p>
          <div className="grid gap-3 mb-6">
            {q.options.map((opt, i) => {
              const isCorrect = i === q.correct_index;
              const isSel = i === selected;
              return (
                <button
                  key={i}
                  onClick={() => answer(i)}
                  disabled={answered}
                  className={cn(
                    "text-start glass-card rounded-2xl px-5 py-4 text-sm font-semibold border transition-colors",
                    !answered && "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer",
                    answered && isCorrect && "border-[hsl(152,100%,50%)] bg-[hsl(152,100%,50%)]/10 neon-glow-green",
                    answered && isSel && !isCorrect && "border-destructive bg-destructive/10",
                    answered && !isSel && !isCorrect && "opacity-50"
                  )}
                >
                  <span className="flex items-center justify-between gap-2">
                    <span>{opt}</span>
                    {answered && isCorrect && <CheckCircle2 className="w-5 h-5 text-[hsl(152,100%,50%)] shrink-0" />}
                    {answered && isSel && !isCorrect && <XCircle className="w-5 h-5 text-destructive shrink-0" />}
                  </span>
                </button>
              );
            })}
          </div>

          {answered && q.explanation && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="glass-card rounded-2xl p-4 border border-primary/20 text-sm mb-4 text-muted-foreground">
              💡 {q.explanation}
            </motion.div>
          )}

          {answered && (
            <Button onClick={next} className="w-full gap-2 font-bold">
              {current + 1 >= questions.length ? "شوف النتيجة" : "التالي"} <ArrowRight className="w-4 h-4" />
            </Button>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
