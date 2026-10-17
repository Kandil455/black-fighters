import React, { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import {
  CheckCircle2,
  XCircle,
  RotateCcw,
  Trophy,
  Timer,
  Eye,
  Download,
  ChevronLeft,
  Zap,
  BookOpen,
  Send,
  Brain,
  Trash2,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";
import confetti from "canvas-confetti";
import { base44 } from "@/api/base44Client";
import { recordStudy, recordLeaderboard, awardBadge } from "@/lib/gamification";
import { awardXP } from "@/lib/xpSystem";
import { toast } from "sonner";
import QuizPrep from "@/components/course/QuizPrep";
import { useBadges } from "@/lib/BadgeContext";
import { buildQuizPerformance } from "@/lib/quizQuality";
import {
  getMistakeVaultItems,
  recordMistake,
  resolveMistake,
} from "@/lib/mistakeVault";
import { invokeSecureFunction } from "@/lib/secureFunctions";

const fmtTime = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
const QUESTION_TIME = 45;
const LOGO_URL = "/icons/black-fighters-192.png";

const difficultyLabel = (value) =>
  ({
    easy: "سهل",
    medium: "متوسط",
    hard: "صعب",
  })[value] || "متنوع";

const getOptionStyle = (i, correct, selected, answered) => {
  if (!answered)
    return "border-white/[0.08] bg-white/[0.025] hover:border-[#19f08c]/50 hover:bg-[#19f08c]/[0.06] cursor-pointer text-[#f5f7fa]";
  if (i === correct)
    return "border-[#19f08c] bg-[#19f08c]/12 text-[#19f08c] font-bold shadow-[0_0_24px_-10px_rgba(25,240,140,0.3)]";
  if (i === selected && i !== correct)
    return "border-[#ef4444] bg-[#ef4444]/12 text-[#ef4444] font-bold shadow-sm";
  return "border-white/[0.06] bg-white/[0.015] text-[#9aa4b2] opacity-65";
};

export default function ModernQuizView({ quiz, course, onJumpToSummary }) {
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
  const [isMistakeRecoveryMode, setIsMistakeRecoveryMode] = useState(false);
  const [sendingSinglePoll, setSendingSinglePoll] = useState(false);
  const [vaultItems, setVaultItems] = useState(() =>
    getMistakeVaultItems({ courseId: course?.id || null }),
  );
  const totalTimerRef = useRef(null);

  const refreshVault = useCallback(() => {
    const courseMistakes = getMistakeVaultItems({ courseId: course?.id || null });
    setVaultItems(courseMistakes.length > 0 ? courseMistakes : getMistakeVaultItems());
  }, [course?.id]);

  useEffect(() => {
    refreshVault();
    const handler = () => refreshVault();
    window.addEventListener("bf:mistake-vault-updated", handler);
    return () => window.removeEventListener("bf:mistake-vault-updated", handler);
  }, [refreshVault]);

  useEffect(() => {
    if (!started || done) return;
    totalTimerRef.current = setInterval(() => setTotalSeconds((s) => s + 1), 1000);
    return () => clearInterval(totalTimerRef.current);
  }, [started, done]);

  useEffect(() => {
    if (!started || done || answered || !timerActive) return;
    if (timeLeft <= 0) {
      const currentQ = questions[current];
      setAnswered(true);
      setSelected(-1);
      setWrong((w) => [
        ...w,
        { ...currentQ, your_answer: -1, timed_out: true },
      ]);
      if (currentQ) {
        recordMistake({
          question: currentQ.question,
          options: currentQ.options,
          correctIndex: currentQ.correct_index,
          chosenIndex: -1,
          explanation: currentQ.explanation,
          topic: currentQ.topic,
          sourceRef: currentQ.source_ref,
          courseId: course?.id || "",
          courseTitle: course?.title || "كويز تفاعلي",
          via: "web_timeout",
        });
      }
      return;
    }
    const t = setTimeout(() => setTimeLeft((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [timeLeft, answered, done, started, timerActive, current, questions, course]);

  const q = questions[current];
  const timerPct = (timeLeft / QUESTION_TIME) * 100;

  const answer = useCallback(
    (i) => {
      if (answered) return;
      setSelected(i);
      setAnswered(true);
      if (i === q.correct_index) {
        setScore((s) => s + 1);
        if (isMistakeRecoveryMode) {
          resolveMistake(q.id || q.question);
          toast.success("أحسنت! تمت إزالة هذا السؤال من بنك الأخطاء بعد إتقانه ✅");
        }
      } else {
        setWrong((w) => [...w, { ...q, your_answer: i }]);
        recordMistake({
          question: q.question,
          options: q.options,
          correctIndex: q.correct_index,
          chosenIndex: i,
          explanation: q.explanation,
          topic: q.topic,
          sourceRef: q.source_ref,
          courseId: course?.id || "",
          courseTitle: course?.title || "كويز تفاعلي",
          via: "web_quiz",
        });
      }
    },
    [answered, q, isMistakeRecoveryMode, course]
  );

  const handleSendQuestionPollToTelegram = async (questionObj) => {
    if (!questionObj || sendingSinglePoll) return;
    setSendingSinglePoll(true);
    try {
      const res = await invokeSecureFunction("export-to-telegram", {
        title: `${course?.title || "كويز"} — سؤال تدريبي`,
        type: "quiz",
        questions: [questionObj],
        deliveryMode: "polls",
      });
      if (res?.data?.success) {
        toast.success("تم إرسال السؤال كاستطلاع Quiz Poll حي في شات التيليجرام! 🎯");
      } else {
        toast.error(res?.data?.message || "اربط حسابك بالبوت أولاً لإرسال استطلاعات الكويز 🤖");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "تعذر إرسال السؤال للبوت");
    } finally {
      setSendingSinglePoll(false);
    }
  };

  const next = useCallback(async () => {
    if (current < questions.length - 1) {
      setCurrent((c) => c + 1);
      setSelected(null);
      setAnswered(false);
      setTimeLeft(QUESTION_TIME);
    } else {
      setDone(true);
      clearInterval(totalTimerRef.current);
      const pct = Math.round(
        ((score + (selected === q.correct_index ? 1 : 0)) / questions.length) * 100
      );
      if (pct >= 70) {
        confetti({
          particleCount: 100,
          spread: 75,
          origin: { y: 0.6 },
          colors: ["#19f08c", "#10B981", "#F59E0B"],
        });
      }
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
          const { newBadges = [] } = await recordStudy({
            minutes: Math.round(totalSeconds / 60),
            questions: questions.length,
          });
          const lbBadge = await recordLeaderboard({
            correct: finalScore,
            answered: questions.length,
          });
          const isPerfect = finalScore === questions.length && questions.length >= 3;
          const { levelUp, newLevelInfo } = await awardXP(
            isPerfect ? "perfect_quiz" : "complete_quiz"
          );
          if (levelUp)
            toast.success(
              `🎉 ارتقيت لمستوى ${newLevelInfo?.current?.icon} ${newLevelInfo?.current?.title}!`
            );

          const unlocked = [...newBadges];
          if (lbBadge) unlocked.push(lbBadge);
          if (isPerfect) {
            if (await awardBadge("perfect_score")) unlocked.push("perfect_score");
          }
          if (unlocked.length) showBadges(unlocked);
        } catch {}
      }
    }
  }, [current, questions, score, selected, q, course, totalSeconds, showBadges]);

  const retry = () => {
    setQuestions(wrong.length ? wrong : allQuestions);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setWrong([]);
    setTotalSeconds(0);
    setTimeLeft(QUESTION_TIME);
  };

  const retryAll = () => {
    setIsMistakeRecoveryMode(false);
    setQuestions([...allQuestions].sort(() => Math.random() - 0.5));
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setWrong([]);
    setTotalSeconds(0);
    setTimeLeft(QUESTION_TIME);
  };

  const startMistakeRecovery = () => {
    if (!vaultItems.length) return;
    setIsMistakeRecoveryMode(true);
    setQuestions(vaultItems);
    setCurrent(0);
    setSelected(null);
    setAnswered(false);
    setScore(0);
    setDone(false);
    setWrong([]);
    setTotalSeconds(0);
    setTimeLeft(QUESTION_TIME);
    setTimerActive(false);
    setStarted(true);
  };

  const downloadResults = () => {
    const lines = [
      `كويز: ${course?.title || "Quiz"}`,
      `النتيجة: ${score}/${questions.length} (${Math.round((score / questions.length) * 100)}%)`,
      `الوقت: ${fmtTime(totalSeconds)}`,
      "",
      "═══ الأسئلة ═══",
      "",
    ];
    questions.forEach((q, i) => {
      const your = wrong.find((w) => w.question === q.question);
      lines.push(`${i + 1}. ${q.question}`);
      q.options?.forEach((opt, oi) => {
        const mark =
          oi === q.correct_index ? "✅" : your?.your_answer === oi ? "❌" : "  ";
        lines.push(`   ${mark} ${opt}`);
      });
      if (q.explanation) lines.push(`   💡 ${q.explanation}`);
      lines.push("");
    });
    const blob = new Blob([lines.join("\n")], { type: "text/plain;charset=utf-8" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `quiz-${course?.title || "results"}.txt`;
    a.click();
  };

  if (!started) {
    return (
      <div className="space-y-4">
        {/* Mistake Vault Banner if student has recorded mistakes */}
        {vaultItems.length > 0 && (
          <div className="glass rounded-[1.25rem] p-5 border border-[#f59e0b]/35 flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/35 flex items-center justify-center text-[#f59e0b] shrink-0">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-black text-[#f5f7fa]">
                    بنك الأخطاء الذكي الموحد (Mistake Vault)
                  </h4>
                  <span className="text-xs font-mono font-bold text-[#f59e0b]">
                    {vaultItems.length} سؤال للمراجعة
                  </span>
                </div>
                <p className="text-xs text-[#9aa4b2] mt-0.5">
                  يجمع الأسئلة التي أخطأت فيها في الكويزات أو اختبارات الملخص — أجب عنها بشكل صحيح لإزالتها وكسب XP إضافي.
                </p>
              </div>
            </div>
            <Button
              onClick={startMistakeRecovery}
              className="gap-2 bg-[#f59e0b] text-[#05070a] hover:bg-[#f59e0b]/90 font-bold rounded-xl"
            >
              <RotateCcw className="w-4 h-4" />
              تدرّب على أخطائك الآن ({vaultItems.length})
            </Button>
          </div>
        )}

        <QuizPrep
          quiz={quiz}
          onStart={({ shuffled, timerEnabled }) => {
            setIsMistakeRecoveryMode(false);
            setQuestions(
              shuffled ? [...allQuestions].sort(() => Math.random() - 0.5) : allQuestions
            );
            setTimerActive(timerEnabled);
            setStarted(true);
          }}
        />
      </div>
    );
  }

  if (done) {
    const pct = Math.round((score / questions.length) * 100);
    const grade =
      pct >= 90
        ? "ممتاز 🏆"
        : pct >= 75
        ? "جيد جداً ⭐"
        : pct >= 60
        ? "جيد 👍"
        : pct >= 50
        ? "مقبول 📚"
        : "يحتاج مراجعة 💪";
    const answers = questions.map((q) => {
      const w = wrong.find((item) => item.question === q.question);
      return w ? w.your_answer : q.correct_index;
    });
    const performance = buildQuizPerformance(questions, answers);

    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        className="max-w-xl mx-auto"
      >
        <div className="glass rounded-3xl p-8 sm:p-10 border border-[#19f08c]/30 text-center mb-6 shadow-md">
          <img src={LOGO_URL} alt="" className="w-14 h-14 rounded-2xl mx-auto mb-4 border border-border" />
          <h2 className="text-3xl font-extrabold text-foreground mb-2">{grade}</h2>
          <p className="text-5xl font-black text-[#19f08c] my-3 tabular-nums font-mono">{pct}%</p>
          <p className="text-muted-foreground text-sm mb-1">
            {score} إجابة صحيحة من أصل {questions.length} سؤال
          </p>
          <p className="text-muted-foreground text-xs font-mono tabular-nums">⏱ {fmtTime(totalSeconds)}</p>
        </div>

        <div className="flex gap-2.5 flex-wrap justify-center mb-6">
          {wrong.length > 0 && (
            <Button onClick={retry} variant="outline" className="gap-2 rounded-xl">
              <RotateCcw className="w-4 h-4" /> إعادة الأسئلة الخطأ ({wrong.length})
            </Button>
          )}
          {vaultItems.length > 0 && (
            <Button
              onClick={startMistakeRecovery}
              variant="outline"
              className="gap-2 rounded-xl border-[#f59e0b]/40 text-[#f59e0b] hover:bg-[#f59e0b]/10"
            >
              <Brain className="w-4 h-4" /> بنك الأخطاء ({vaultItems.length})
            </Button>
          )}
          <Button onClick={retryAll} variant="outline" className="gap-2 rounded-xl">
            <Zap className="w-4 h-4" /> إعادة كل الأسئلة
          </Button>
          <Button onClick={downloadResults} variant="outline" className="gap-2 rounded-xl">
            <Download className="w-4 h-4" /> تحميل النتيجة
          </Button>
          <Button
            onClick={() => setShowReview(!showReview)}
            variant="outline"
            className="gap-2 rounded-xl"
          >
            <Eye className="w-4 h-4" /> {showReview ? "إخفاء المراجعة" : "مراجعة الإجابات"}
          </Button>
        </div>

        {!!performance.weakTopics.length && (
          <div className="rounded-2xl p-5 bg-card border border-amber-500/30 mb-6 text-start shadow-xs">
            <h3 className="font-bold text-amber-600 dark:text-amber-400 mb-3 text-sm">
              خطة المراجعة السريعة للأجزاء الأضعف
            </h3>
            <div className="space-y-2.5">
              {performance.weakTopics.map((topic) => (
                <div
                  key={topic.key}
                  className="rounded-xl border border-border bg-secondary/30 p-3"
                >
                  <div className="flex items-center justify-between gap-3 mb-1.5">
                    <span className="font-bold text-xs text-foreground">{topic.key}</span>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-muted-foreground tabular-nums">
                        {topic.correct}/{topic.total} صح
                      </span>
                      {onJumpToSummary && (
                        <button
                          type="button"
                          onClick={() => onJumpToSummary(topic.key)}
                          className="text-[11px] font-bold text-[#19f08c] hover:underline cursor-pointer"
                        >
                          افتح في الملخص ←
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="h-1.5 rounded-full bg-border overflow-hidden">
                    <div
                      className="h-full bg-amber-500"
                      style={{ width: `${topic.percentage}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {showReview && (
          <div className="space-y-3">
            {questions.map((q, i) => {
              const w = wrong.find((x) => x.question === q.question);
              const isCorrect = !w;
              return (
                <div
                  key={i}
                  className={cn(
                    "rounded-2xl p-4 bg-card border",
                    isCorrect ? "border-emerald-500/30" : "border-destructive/30"
                  )}
                >
                  <p className="font-bold text-sm text-foreground mb-3">
                    {i + 1}. {q.question}
                  </p>
                  <div className="space-y-1.5">
                    {q.options?.map((opt, oi) => (
                      <div
                        key={oi}
                        className={cn(
                          "text-xs px-3 py-2 rounded-lg flex items-center gap-2",
                          oi === q.correct_index
                            ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-500/25"
                            : w?.your_answer === oi
                            ? "bg-destructive/10 text-destructive font-semibold border border-destructive/25"
                            : "text-muted-foreground"
                        )}
                      >
                        {oi === q.correct_index ? "✅" : w?.your_answer === oi ? "❌" : "○"} {opt}
                      </div>
                    ))}
                  </div>
                  {q.explanation && (
                    <div className="mt-3 pt-2.5 border-t border-border flex items-start gap-2">
                      <span className="text-sm shrink-0">💡</span>
                      <p className="text-xs text-muted-foreground leading-relaxed">
                        {q.explanation}
                      </p>
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

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-xs sm:text-sm font-mono font-bold text-muted-foreground tabular-nums">
            سؤال {current + 1} من {questions.length}
          </span>
          {isMistakeRecoveryMode && (
            <span className="text-xs font-bold text-[#f59e0b]">
              · وضع تصحيح الأخطاء 🧠
            </span>
          )}
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => handleSendQuestionPollToTelegram(q)}
            disabled={sendingSinglePoll}
            className="rounded-lg border border-white/[0.1] bg-[#05070a] px-2.5 py-1 text-[11px] font-bold text-[#9aa4b2] hover:border-[#19f08c]/40 hover:text-[#19f08c] transition-colors cursor-pointer inline-flex items-center gap-1"
            title="إرسال هذا السؤال كـ Quiz Poll في تيليجرام"
          >
            {sendingSinglePoll ? (
              <Loader2 className="w-3 h-3 animate-spin" />
            ) : (
              <Send className="w-3 h-3" />
            )}
            <span>Quiz Poll</span>
          </button>

          <span className="rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 text-xs font-mono font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
            {score} ✓
          </span>
          {timerActive && (
            <div
              className={cn(
                "flex items-center gap-1.5 text-xs font-mono font-bold tabular-nums px-3 py-1 rounded-full border",
                timeLeft <= 10
                  ? "text-destructive border-destructive/50 bg-destructive/10 animate-pulse"
                  : timeLeft <= 20
                  ? "text-amber-600 dark:text-amber-400 border-amber-500/40 bg-amber-500/10"
                  : "text-primary border-primary/30 bg-primary/10"
              )}
            >
              <Timer className="w-3.5 h-3.5" />
              {fmtTime(timeLeft)}
            </div>
          )}
        </div>
      </div>

      {/* Progress bar */}
      <Progress value={(current / questions.length) * 100} className="h-1.5 mb-4" />

      {/* Timer bar */}
      {timerActive && (
        <div className="h-1 rounded-full bg-secondary mb-5 overflow-hidden">
          <motion.div
            className={cn(
              "h-full rounded-full transition-colors",
              timeLeft <= 10
                ? "bg-destructive"
                : timeLeft <= 20
                ? "bg-amber-500"
                : "bg-primary"
            )}
            style={{ transformOrigin: "left" }}
            animate={{ scaleX: timerPct / 100 }}
            transition={{ duration: 0.3 }}
          />
        </div>
      )}

      {/* Question Card */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 16 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -16 }}
          transition={{ duration: 0.2 }}
        >
          <div className="glass rounded-2xl p-6 sm:p-7 border border-white/[0.08] mb-5">
            {(q?.topic || q?.difficulty || q?.source_ref) && (
              <div className="flex flex-wrap items-center gap-2 mb-3 text-xs text-[#9aa4b2]">
                {q?.topic && <span className="text-[#19f08c] font-bold">{q.topic}</span>}
                {q?.topic && q?.difficulty && <span aria-hidden="true">·</span>}
                {q?.difficulty && <span>{difficultyLabel(q.difficulty)}</span>}
                {q?.source_ref && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="font-mono text-[11px]">{q.source_ref}</span>
                  </>
                )}
              </div>
            )}
            <p dir="auto" className="text-lg sm:text-xl font-bold text-foreground leading-relaxed">
              {q?.question}
            </p>
          </div>

          {/* Options */}
          <div className="space-y-3">
            {q?.options?.map((opt, i) => {
              const isSelected = selected === i;
              const isCorrect = i === q.correct_index;

              let Icon = null;
              if (answered && isCorrect)
                Icon = <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />;
              else if (answered && isSelected && !isCorrect)
                Icon = <XCircle className="w-5 h-5 text-rose-500 shrink-0" />;

              return (
                <motion.button
                  key={i}
                  whileTap={!answered ? { scale: 0.99 } : {}}
                  onClick={() => answer(i)}
                  disabled={answered}
                  className={cn(
                    "w-full text-start p-4 rounded-xl border transition-all duration-200 flex items-center justify-between gap-3 group",
                    getOptionStyle(i, q.correct_index, selected, answered)
                  )}
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span
                      className={cn(
                        "w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-sm shrink-0 transition-colors",
                        answered
                          ? isCorrect
                            ? "bg-emerald-500/20 text-emerald-700 dark:text-emerald-300"
                            : isSelected
                            ? "bg-rose-500/20 text-rose-700 dark:text-rose-300"
                            : "bg-secondary text-muted-foreground"
                          : "bg-secondary text-foreground group-hover:bg-primary/15 group-hover:text-primary"
                      )}
                    >
                      {String.fromCharCode(65 + i)}
                    </span>
                    <span dir="auto" className="text-sm sm:text-base font-semibold leading-relaxed">
                      {opt}
                    </span>
                  </div>
                  {Icon}
                </motion.button>
              );
            })}
          </div>

          {/* Explanation & Linkback to Summary Section */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-4 rounded-xl p-4 border border-[#19f08c]/25 bg-[#19f08c]/[0.06] text-foreground space-y-2.5"
              >
                {q?.explanation ? (
                  <p dir="auto" className="text-xs sm:text-sm leading-relaxed">
                    <span className="font-bold text-[#19f08c]">💡 التفسير العلمي التفصيلي: </span>
                    {q.explanation}
                  </p>
                ) : (
                  <p dir="auto" className="text-xs sm:text-sm leading-relaxed">
                    <span className="font-bold text-[#19f08c]">💡 الإجابة المعتمدة: </span>
                    الاختيار الصحيح هو ({q?.options?.[q?.correct_index]}) بناءً على محتوى المحاضرة.
                  </p>
                )}

                {selected !== q?.correct_index && selected >= 0 && (
                  <p className="text-xs text-[#9aa4b2]">
                    ⚠️ تم حفظ هذا السؤال تلقائياً في <strong className="text-[#f59e0b]">بنك الأخطاء الذكي</strong> لإعادة التدرب عليه لاحقاً.
                  </p>
                )}

                {onJumpToSummary && (
                  <div className="pt-1 flex items-center justify-between gap-2 border-t border-white/[0.07]">
                    <span className="text-[11px] text-[#9aa4b2]">
                      مرتبط بجزئية: <strong className="text-[#f5f7fa]">{q?.topic || "الملخص الذكي"}</strong>
                    </span>
                    <button
                      type="button"
                      onClick={() => onJumpToSummary(q?.topic || "")}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-[#19f08c] hover:underline cursor-pointer"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>الانتقال لفقرة الشرح في الملخص ←</span>
                    </button>
                  </div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Answer status */}
          <AnimatePresence>
            {answered && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={cn(
                  "rounded-xl p-3.5 border mt-3 flex items-center justify-between gap-3",
                  selected === q.correct_index
                    ? "border-emerald-500/35 bg-emerald-500/10"
                    : "border-destructive/35 bg-destructive/10"
                )}
              >
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    {selected === q.correct_index ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                    ) : (
                      <XCircle className="w-4 h-4 text-destructive shrink-0" />
                    )}
                    <span
                      className={cn(
                        "text-xs sm:text-sm font-bold",
                        selected === q.correct_index
                          ? "text-emerald-700 dark:text-emerald-300"
                          : "text-destructive"
                      )}
                    >
                      {selected === q.correct_index
                        ? "إجابة صحيحة! أحسنت 🎉"
                        : selected === -1
                        ? "انتهى الوقت المحدد ⏰"
                        : "إجابة غير صحيحة ❌"}
                    </span>
                  </div>
                  {selected !== q.correct_index && (
                    <p className="text-xs text-muted-foreground ps-6">
                      الإجابة الصحيحة:{" "}
                      <span className="font-bold text-foreground">
                        {q.options?.[q.correct_index]}
                      </span>
                    </p>
                  )}
                </div>

                <Button onClick={next} size="sm" className="gap-1.5 font-bold rounded-xl shrink-0">
                  {current < questions.length - 1 ? (
                    <>
                      <span>السؤال التالي</span>
                      <ChevronLeft className="w-4 h-4" />
                    </>
                  ) : (
                    <>
                      <Trophy className="w-4 h-4" />
                      <span>عرض النتيجة</span>
                    </>
                  )}
                </Button>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
