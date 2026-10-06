import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, RotateCcw, Trophy, Timer, Eye, Download, ChevronLeft, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { base44 } from '@/api/base44Client';
import { recordStudy, recordLeaderboard } from "@/lib/gamification";
import { awardXP } from "@/lib/xpSystem";
import { toast } from "sonner";
import { awardBadge } from "@/lib/gamification";
import QuizPrep from "@/components/course/QuizPrep";
import { useBadges } from "@/lib/BadgeContext";
import { buildQuizPerformance } from "@/lib/quizQuality";

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const QUESTION_TIME = 45; // seconds per question

const LOGO_URL = "/icons/black-fighters-192.png";
const OPTION_LABELS = ["A", "B", "C", "D", "E", "F"];
const difficultyLabel = (value) => ({
  easy: "سهل",
  medium: "متوسط",
  hard: "صعب",
})[value] || "متنوع";

// ── Option colors ─────────────────────────────────────────────────────────────
const getOptionStyle = (i, correct, selected, answered) => {
  if (!answered) return "border-border hover:border-primary/50 hover:bg-primary/5 cursor-pointer";
  if (i === correct) return "border-[hsl(152,100%,50%)] bg-[hsl(152,100%,50%)]/10 text-[hsl(152,100%,50%)]";
  if (i === selected && i !== correct) return "border-destructive bg-destructive/10 text-destructive";
  return "border-border opacity-50";
};

export default function QuizView({ quiz, course }) {
  const { showBadges } = useBadges();
  const allQuestions = quiz?.questions || [];
  const [questions, setQuestions] = useState(allQuestions);
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [wrong, setWrong] = useState([]);
  const [totalSeconds, setTotalSeconds] = useState(0);
  const [showReview, setShowReview] = useState(false);
  const [timeLeft, setTimeLeft] = useState(QUESTION_TIME);
  const [started, setStarted] = useState(false);
  const [timerActive, setTimerActive] = useState(true);
  const totalTimerRef = useRef(null);

  // Total time counter
  useEffect(() => {
    if (!started || done) return;
    totalTimerRef.current = setInterval(() => setTotalSeconds(s => s + 1), 1000);
    return () => clearInterval(totalTimerRef.current);
  }, [started, done]);

  // Per-question countdown
  useEffect(() => {
    if (!started || done || answered || !timerActive) return;
    if (timeLeft <= 0) {
      // Time's up — auto-wrong
      setAnswered(true);
      setSelected(-1);
      setWrong(w => [...w, { ...questions[current], your_answer: -1, timed_out: true }]);
      return;
    }
    const t = setTimeout(() => setTimeLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, done, started, timerActive, current]);

  const q = questions[current];
  const timerPct = (timeLeft / QUESTION_TIME) * 100;
  const timerColor = timeLeft <= 10 ? "destructive" : timeLeft <= 20 ? "yellow" : "primary";

  const answer = useCallback((i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    if (i === q.correct_index) setScore(s => s + 1);
    else setWrong(w => [...w, { ...q, your_answer: i }]);
  }, [answered, q]);

  const next = useCallback(async () => {
    if (current < questions.length - 1) {
      setCurrent(c => c + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(QUESTION_TIME);
    } else {
      setDone(true);
      clearInterval(totalTimerRef.current);
      // Confetti on good score
      const pct = Math.round((score + (selected === q.correct_index ? 1 : 0)) / questions.length * 100);
      if (pct >= 70) {
        confetti({ particleCount: 120, spread: 80, origin: { y: 0.6 }, colors: ['#00ff88', '#00cfff', '#a855f7'] });
      }
      // Save result
      if (course) {
        try {
          const finalScore = score + (selected === q?.correct_index ? 1 : 0);
          const userMe = await base44.auth.me();
          await base44.entities.QuizResult.create({
            user_id: userMe?.id,
            quiz_id: course.id,
            course_id: course.id,
            score: finalScore,
            percentage: Math.round((finalScore / questions.length) * 100),
            passed: Math.round((finalScore / questions.length) * 100) >= 60,
            time_spent_seconds: totalSeconds,
          });
          const { newBadges = [] } = await recordStudy({ minutes: Math.round(totalSeconds / 60), questions: questions.length });
          const lbBadge = await recordLeaderboard({ correct: finalScore, answered: questions.length });
          const isPerfect = finalScore === questions.length && questions.length >= 3;
          const { levelUp, newLevelInfo } = await awardXP(isPerfect ? "perfect_quiz" : "complete_quiz");
          if (levelUp) toast.success(`🎉 ارتقيت لمستوى ${newLevelInfo?.current?.icon} ${newLevelInfo?.current?.title}!`);

          // اجمع كل الأوسمة الجديدة واعرضها بمودال احتفالي خرافي
          const unlocked = [...newBadges];
          if (lbBadge) unlocked.push(lbBadge);
          if (finalScore === questions.length && questions.length >= 3) {
            if (await awardBadge("perfect_score")) unlocked.push("perfect_score");
          }
          if (unlocked.length) showBadges(unlocked);
        } catch {}
      }
    }
  }, [current, questions, score, selected, q, course, totalSeconds]);

  const retry = () => {
    setQuestions(wrong.length ? wrong : allQuestions);
    setCurrent(0); setSelected(null); setAnswered(false);
    setScore(0); setDone(false); setWrong([]);
    setTotalSeconds(0); setTimeLeft(QUESTION_TIME);
  };

  const retryAll = () => {
    setQuestions([...allQuestions].sort(() => Math.random() - 0.5));
    setCurrent(0); setSelected(null); setAnswered(false);
    setScore(0); setDone(false); setWrong([]);
    setTotalSeconds(0); setTimeLeft(QUESTION_TIME);
  };

  const downloadResults = () => {
    const lines = [`كويز: ${course?.title || "Quiz"}`, `النتيجة: ${score}/${questions.length} (${Math.round(score/questions.length*100)}%)`, `الوقت: ${fmtTime(totalSeconds)}`, "", "═══ الأسئلة ═══", ""];
    questions.forEach((q, i) => {
      const your = wrong.find(w => w.question === q.question);
      const correct = !your;
      lines.push(`${i+1}. ${q.question}`);
      q.options?.forEach((opt, oi) => {
        const mark = oi === q.correct_index ? "✅" : (your?.your_answer === oi ? "❌" : "  ");
        lines.push(`   ${mark} ${opt}`);
      });
      if (q.explanation) lines.push(`   💡 ${q.explanation}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `quiz-${course?.title || "results"}.txt`; a.click();
  };

  // ── QuizPrep screen ────────────────────────────────────────────────────────
  if (!started) {
    return (
      <QuizPrep
        quiz={quiz}
        onStart={({ shuffled, timerEnabled }) => {
          setQuestions(shuffled ? [...allQuestions].sort(() => Math.random() - 0.5) : allQuestions);
          setTimerActive(timerEnabled);
          setStarted(true);
        }}
      />
    );
  }

  // ── Results screen ─────────────────────────────────────────────────────────
  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade = pct >= 90 ? "ممتاز 🏆" : pct >= 75 ? "جيد جداً ⭐" : pct >= 60 ? "جيد 👍" : pct >= 50 ? "مقبول 📚" : "يحتاج مراجعة 💪";
    const answers = questions.map((q) => {
      const w = wrong.find((item) => item.question === q.question);
      return w ? w.your_answer : q.correct_index;
    });
    const performance = buildQuizPerformance(questions, answers);

    return (
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="max-w-lg mx-auto">
        <div className="glass-card rounded-3xl p-8 border border-primary/20 text-center mb-6">
          <img src={LOGO_URL} alt="" className="w-16 h-16 rounded-2xl mx-auto mb-4" />
          <h2 className="text-3xl font-black mb-1">{grade}</h2>
          <p className="text-5xl font-black text-primary my-4">{pct}%</p>
          <p className="text-muted-foreground text-sm mb-2">{score} صح من {questions.length} سؤال</p>
          <p className="text-muted-foreground text-sm">⏱ {fmtTime(totalSeconds)}</p>
        </div>

        <div className="flex gap-3 flex-wrap justify-center mb-6">
          {wrong.length > 0 && (
            <Button onClick={retry} variant="outline" className="gap-2">
              <RotateCcw className="w-4 h-4" /> الأسئلة الغلط ({wrong.length})
            </Button>
          )}
          <Button onClick={retryAll} variant="outline" className="gap-2">
            <Zap className="w-4 h-4" /> كل الأسئلة
          </Button>
          <Button onClick={downloadResults} variant="outline" className="gap-2">
            <Download className="w-4 h-4" /> تحميل النتيجة
          </Button>
          <Button onClick={() => setShowReview(!showReview)} variant="outline" className="gap-2">
            <Eye className="w-4 h-4" /> {showReview ? "إخفاء" : "مراجعة الإجابات"}
          </Button>
        </div>

        {!!performance.weakTopics.length && (
          <div className="glass-card rounded-3xl p-5 border border-yellow-400/25 mb-6 text-start">
            <h3 className="font-black text-yellow-300 mb-3">خطة مراجعة سريعة</h3>
            <div className="space-y-2">
              {performance.weakTopics.map((topic) => (
                <div key={topic.key} className="rounded-2xl border border-border bg-secondary/30 p-3">
                  <div className="flex items-center justify-between gap-3 mb-1">
                    <span className="font-bold text-sm">{topic.key}</span>
                    <span className="text-xs text-muted-foreground">{topic.correct}/{topic.total} صح</span>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div className="h-full bg-yellow-400" style={{ width: `${topic.percentage}%` }} />
                  </div>
                  {topic.examples?.[0] && <p className="text-xs text-muted-foreground mt-2 line-clamp-2">راجع: {topic.examples[0]}</p>}
                </div>
              ))}
            </div>
          </div>
        )}

        {showReview && (
          <div className="space-y-4">
            {questions.map((q, i) => {
              const w = wrong.find(x => x.question === q.question);
              const isCorrect = !w;
              return (
                <div key={i} className={`glass-card rounded-2xl p-4 border ${isCorrect ? "border-[hsl(152,100%,50%)]/30" : "border-destructive/30"}`}>
                  <p className="font-semibold text-sm mb-3">{i+1}. {q.question}</p>
                  <div className="space-y-1.5">
                    {q.options?.map((opt, oi) => (
                      <div key={oi} className={`text-xs px-3 py-1.5 rounded-lg flex items-center gap-2 ${oi === q.correct_index ? "bg-[hsl(152,100%,50%)]/10 text-[hsl(152,100%,50%)] font-semibold" : w?.your_answer === oi ? "bg-destructive/10 text-destructive" : "text-muted-foreground"}`}>
                        {oi === q.correct_index ? "✅" : w?.your_answer === oi ? "❌" : "○"} {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 pt-3 border-t border-border/50 flex items-start gap-2">
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">{q.explanation}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </motion.div>
    );
  }

  // ── Question screen ────────────────────────────────────────────────────────
  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm font-bold text-muted-foreground">{current + 1} / {questions.length}</span>
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-primary">{score} ✓</span>
          {timerActive && (
            <div className={cn("flex items-center gap-1 text-sm font-bold tabular-nums px-3 py-1 rounded-full border",
              timeLeft <= 10 ? "text-destructive border-destructive/50 bg-destructive/10 animate-pulse" :
              timeLeft <= 20 ? "text-yellow-400 border-yellow-400/50 bg-yellow-400/10" :
              "text-primary border-primary/30 bg-primary/5"
            )}>
              <Timer className="w-3.5 h-3.5" />
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={(current / questions.length) * 100} className="h-1 mb-6" />

      {/* Timer bar */}
      {timerActive && (
        <div className="h-0.5 rounded-full bg-border mb-6 overflow-hidden">
          <motion.div
            className={cn("h-full rounded-full transition-colors",
              timeLeft <= 10 ? "bg-destructive" : timeLeft <= 20 ? "bg-yellow-400" : "bg-primary"
            )}
            style={{ transformOrigin: "left" }}
            animate={{ scaleX: timerPct / 100 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Question */}
      <AnimatePresence mode="wait">
        <motion.div key={current} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
          <div className="glass-card rounded-3xl p-6 border border-border/50 mb-4">
            {(q?.topic || q?.difficulty || q?.source_ref) && (
              <div className="flex flex-wrap gap-2 mb-4 text-[11px] font-bold">
                {q?.topic && <span className="rounded-full border border-primary/25 bg-primary/10 text-primary px-2.5 py-1">{q.topic}</span>}
                {q?.difficulty && <span className="rounded-full border border-accent/25 bg-accent/10 text-accent px-2.5 py-1">{difficultyLabel(q.difficulty)}</span>}
                {q?.source_ref && <span className="rounded-full border border-border bg-secondary/60 text-muted-foreground px-2.5 py-1">{q.source_ref}</span>}
              </div>
            )}
            <p className="text-lg font-bold leading-relaxed">{q?.question}</p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q?.options?.map((opt, i) => (
              <motion.button
                key={i}
                whileHover={!answered ? { scale: 1.01 } : {}}
                whileTap={!answered ? { scale: 0.99 } : {}}
                onClick={() => answer(i)}
                disabled={answered}
                className={cn(
                  "w-full text-right px-4 py-3.5 rounded-2xl border-2 font-medium text-sm transition-colors",
                  getOptionStyle(i, q.correct_index, selected, answered)
                )}
              >
                <span className="inline-flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full border border-current flex items-center justify-center text-xs font-bold shrink-0">
                    {OPTION_LABELS[i] || i + 1}
                  </span>
                  {opt}
                  {answered && i === q.correct_index && <CheckCircle2 className="w-4 h-4 ms-auto text-[hsl(152,100%,50%)]" />}
                  {answered && i === selected && i !== q.correct_index && <XCircle className="w-4 h-4 ms-auto text-destructive" />}
                </span>
              </motion.button>
            ))}
          </div>

          {/* Explanation */}
          <AnimatePresence>
            {answered && q?.explanation && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                className="mt-4 glass-card rounded-2xl p-4 border border-primary/20 bg-primary/5">
                <p className="text-sm"><span className="font-bold text-primary">💡 التفسير: </span>{q.explanation}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer result + Always-show correct answer */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`rounded-2xl p-4 border mt-2 ${
                  selected === q.correct_index
                    ? "border-[hsl(152,100%,50%)]/40 bg-[hsl(152,100%,50%)]/8"
                    : "border-destructive/40 bg-destructive/8"
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  {selected === q.correct_index
                    ? <CheckCircle2 className="w-4 h-4 text-[hsl(152,100%,50%)] shrink-0" />
                    : <XCircle className="w-4 h-4 text-destructive shrink-0" />}
                  <span className={`text-sm font-bold ${selected === q.correct_index ? "text-[hsl(152,100%,50%)]" : "text-destructive"}`}>
                    {selected === q.correct_index ? "صح! 🎉" : selected === -1 ? "انتهى الوقت ⏰" : "غلط ❌"}
                  </span>
                </div>
                {selected !== q.correct_index && (
                  <p className="text-xs text-muted-foreground">
                    الإجابة الصحيحة: <span className="font-semibold text-foreground">{q.options?.[q.correct_index]}</span>
                  </p>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Next button */}
          {answered && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-4 flex justify-end">
              <Button onClick={next} className="gap-2 font-bold">
                {current < questions.length - 1 ? (
                  <><span>التالي</span><ChevronLeft className="w-4 h-4" /></>
                ) : (
                  <><Trophy className="w-4 h-4" /><span>النتيجة</span></>
                )}
              </Button>
            </motion.div>
          )}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
