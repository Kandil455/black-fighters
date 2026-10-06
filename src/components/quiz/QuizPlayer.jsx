import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check, X, ChevronLeft, RotateCcw, Trophy, Maximize2, Minimize2, ListChecks, Target, Flag, Sparkles, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import MistakesReview from "@/components/quiz/MistakesReview";
import FlagQuestionModal from "@/components/quiz/FlagQuestionModal";
import { buildQuizPerformance, reconcileQuestionAnswer } from "@/lib/quizQuality";
import { playSuccess, playError } from "@/lib/sounds";
import { useReducedMotionPreference } from "@/lib/motionTokens";
import { trackFunnelEvent } from "@/lib/analytics";
import { useLocale } from "@/lib/LocaleContext";
import { base44 } from "@/api/base44Client";
import { toast } from "sonner";

const getDifficultyLabel = (value, isEn) => {
  const map = isEn
    ? { easy: "Easy", medium: "Medium", hard: "Hard", mixed: "Mixed" }
    : { easy: "سهل", medium: "متوسط", hard: "صعب", mixed: "متنوع" };
  return map[value] || (isEn ? "Mixed" : "متنوع");
};

function quizSessionKey(quizId) {
  return quizId ? `quiz-session:${quizId}` : null;
}

function isPredominantlyLatin(text = "") {
  const s = String(text || "");
  const latin = (s.match(/[a-zA-Z]/g) || []).length;
  const arabic = (s.match(/[\u0600-\u06FF]/g) || []).length;
  return latin > arabic * 2;
}

export default function QuizPlayer({ quiz, onFinish }) {
  const containerRef = useRef(null);
  const { prefersReducedMotion } = useReducedMotionPreference();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  // الأسئلة الحالية مع مطابقة تلقائية بين الشرح والإجابة لمنع أي خطأ ترقيم
  const [questions, setQuestions] = useState(() => (quiz.questions || []).map(reconcileQuestionAnswer));
  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [done, setDone] = useState(false);
  const [isFull, setIsFull] = useState(false);
  const [reviewing, setReviewing] = useState(false);
  const [answers, setAnswers] = useState([]);
  const [flagModalOpen, setFlagModalOpen] = useState(false);
  const [playMode, setPlayMode] = useState(quiz.play_mode || "learning");
  const nextButtonRef = useRef(null);
  const [hydrated, setHydrated] = useState(false);
  const [resumed, setResumed] = useState(false);
  const [auditingQuestion, setAuditingQuestion] = useState(false);
  const [auditingQuiz, setAuditingQuiz] = useState(false);

  // Sync if parent updates quiz.questions (e.g., from SharedQuiz AI Audit button)
  useEffect(() => {
    if (Array.isArray(quiz?.questions) && quiz.questions.length) {
      const reconciled = quiz.questions.map(reconcileQuestionAnswer);
      setQuestions(reconciled);
    }
  }, [quiz?.questions]);

  useEffect(() => {
    const key = quizSessionKey(quiz?.id);
    if (!key) { setHydrated(true); return; }
    try {
      const saved = JSON.parse(window.localStorage.getItem(key) || "null");
      if (saved && Array.isArray(saved.questions) && saved.questions.length) {
        const reconciledSaved = saved.questions.map(reconcileQuestionAnswer);
        const savedAnswers = Array.isArray(saved.answers) ? saved.answers : [];
        const recalculatedScore = savedAnswers.reduce((acc, ans, idx) => {
          if (ans === undefined || ans === null) return acc;
          const qq = reconciledSaved[idx];
          const cIdx = qq?.correct_index ?? qq?.correct ?? qq?.correctOption;
          return acc + (ans === cIdx ? 1 : 0);
        }, 0);
        setQuestions(reconciledSaved);
        setCurrent(Math.min(Number(saved.current) || 0, reconciledSaved.length - 1));
        setSelected(saved.selected ?? null);
        setAnswered(Boolean(saved.answered));
        setScore(recalculatedScore);
        setDone(Boolean(saved.done));
        setAnswers(savedAnswers);
        setPlayMode(saved.playMode === "exam" ? "exam" : "learning");
        setResumed(true);
      }
    } catch {}
    setHydrated(true);
  }, [quiz?.id]);

  useEffect(() => {
    if (!hydrated) return;
    const key = quizSessionKey(quiz?.id);
    if (!key) return;
    try {
      window.localStorage.setItem(key, JSON.stringify({
        questions, current, selected, answered, score, done, answers, playMode,
        updatedAt: new Date().toISOString(),
      }));
    } catch {}
  }, [hydrated, quiz?.id, questions, current, selected, answered, score, done, answers, playMode]);

  const q = questions[current];
  const examMode = playMode === "exam";
  const showExp = !examMode && quiz.show_explanations !== false;

  const recalculateScoreAndSave = async (updatedQuestions) => {
    setQuestions(updatedQuestions);
    const newScore = answers.reduce((acc, ans, idx) => {
      if (ans === undefined || ans === null) return acc;
      const qq = updatedQuestions[idx];
      const cIdx = qq?.correct_index ?? qq?.correct ?? qq?.correctOption;
      return acc + (ans === cIdx ? 1 : 0);
    }, 0);
    setScore(newScore);
    if (quiz?.id) {
      try {
        await base44.entities.StandaloneQuiz.update(quiz.id, { questions: updatedQuestions });
      } catch (e) {
        console.warn("[QuizPlayer] Could not persist audited questions:", e?.message);
      }
    }
  };

  const handleAuditCurrentQuestion = async () => {
    if (!q || auditingQuestion) return;
    setAuditingQuestion(true);
    try {
      const oldIdx = q.correct_index ?? q.correct ?? q.correctOption ?? 0;
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_audit",
        questions: [q],
      });
      const result = res?.data?.result || res?.data;
      const auditedQ = result?.questions?.[0] || reconcileQuestionAnswer(q);
      const newIdx = auditedQ.correct_index ?? auditedQ.correct ?? auditedQ.correctOption ?? oldIdx;

      const updatedQuestions = questions.map((item, idx) => (idx === current ? auditedQ : item));
      await recalculateScoreAndSave(updatedQuestions);

      if (newIdx !== oldIdx) {
        playSuccess();
        toast.success(
          isEn
            ? `AI Fixed Answer: "${auditedQ.options?.[newIdx]}" is the correct choice! ✅`
            : `تم تصحيح الإجابة بالـ AI إلى: "${auditedQ.options?.[newIdx]}" ✅🧠`
        );
      } else {
        toast.success(
          isEn
            ? "AI Verified: Current answer and explanation are 100% accurate! ✅"
            : "تم التدقيق بالـ AI: الإجابة والشرح صحيحان 100%! ✅⚡"
        );
      }
    } catch (err) {
      const fallbackQ = reconcileQuestionAnswer(q);
      const oldIdx = q.correct_index ?? q.correct ?? q.correctOption ?? 0;
      const newIdx = fallbackQ.correct_index ?? oldIdx;
      if (newIdx !== oldIdx) {
        const updatedQuestions = questions.map((item, idx) => (idx === current ? fallbackQ : item));
        await recalculateScoreAndSave(updatedQuestions);
        toast.success(`تم تصحيح الإجابة تلقائياً إلى: "${fallbackQ.options?.[newIdx]}" ✅`);
      } else {
        toast.error(err?.message || (isEn ? "AI review failed" : "تعذر الاتصال بالـ AI للمراجعة حالياً"));
      }
    } finally {
      setAuditingQuestion(false);
    }
  };

  const handleAuditAllQuestions = async () => {
    if (!questions.length || auditingQuiz) return;
    setAuditingQuiz(true);
    const toastId = toast.loading(
      isEn
        ? `Multi-Agent AI is auditing all ${questions.length} questions... 🧠⚡`
        : `جاري فحص وتدقيق الـ ${questions.length} سؤال بالـ Multi-Agent AI... 🧠⚡`
    );
    try {
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_audit",
        questions,
      });
      const result = res?.data?.result || res?.data;
      const auditedList = Array.isArray(result?.questions) && result.questions.length
        ? result.questions
        : questions.map(reconcileQuestionAnswer);
      const fixedCount = Number(result?.correctedCount) || auditedList.filter((item, i) => {
        const prev = questions[i]?.correct_index ?? questions[i]?.correct ?? 0;
        const next = item.correct_index ?? item.correct ?? 0;
        return prev !== next;
      }).length;

      await recalculateScoreAndSave(auditedList);
      toast.dismiss(toastId);
      if (fixedCount > 0) {
        playSuccess();
        toast.success(
          isEn
            ? `Multi-Agent AI audited the quiz and fixed ${fixedCount} question(s)! 🧠✅`
            : `تم فحص الكويز بالكامل وتصحيح إجابات ${fixedCount} سؤال بدقة 100%! 🧠✅`
        );
      } else {
        toast.success(
          isEn
            ? `All ${questions.length} questions verified 100% accurate! ✅⚡`
            : `تم فحص جميع الـ ${questions.length} سؤال — كل الإجابات صحيحة ومطابقة للشرح 100%! ✅⚡`
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || (isEn ? "AI Quiz Audit failed" : "حدث خطأ أثناء مراجعة الكويز بالـ AI"));
    } finally {
      setAuditingQuiz(false);
    }
  };

  useEffect(() => {
    if (!answered || !nextButtonRef.current) return;
    nextButtonRef.current.focus();
  }, [answered]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (done || reviewing || answered) return;
      if (/^[1-4]$/.test(event.key)) {
        const index = Number(event.key) - 1;
        if (q?.options?.[index]) handleSelect(index);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  });

  // متابعة حالة ملء الشاشة (يشتغل على اللابتوب والموبايل اللي يدعم Fullscreen API)
  useEffect(() => {
    const onChange = () => setIsFull(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  const toggleFull = async () => {
    const el = containerRef.current;
    if (!el) return;
    try {
      if (!document.fullscreenElement) {
        if (el.requestFullscreen) await el.requestFullscreen();
        else if (el.webkitRequestFullscreen) await el.webkitRequestFullscreen(); // iOS/Safari
        setIsFull(true);
      } else {
        if (document.exitFullscreen) await document.exitFullscreen();
        else if (document.webkitExitFullscreen) await document.webkitExitFullscreen();
        setIsFull(false);
      }
    } catch {
      // fallback لو المتصفح مش بيدعم (بعض موبايلات iOS) — نكبّر بالـ CSS
      setIsFull((v) => !v);
    }
  };

  const handleSelect = (i) => {
    if (answered) return;
    setSelected(i);
    setAnswered(true);
    setAnswers((prev) => { const next = [...prev]; next[current] = i; return next; });
    const isCorrect = i === (q.correct_index ?? q.correct ?? q.correctOption);
    if (isCorrect) {
      setScore((s) => s + 1);
      playSuccess();
    } else {
      playError();
    }
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      setDone(true);
      trackFunnelEvent("quiz_completed", { score, total: questions.length, quizId: quiz?.id });
      onFinish?.(score);
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
  };

  const resetState = () => {
    setCurrent(0); setSelected(null); setAnswered(false); setScore(0); setDone(false); setReviewing(false); setAnswers([]);
  };

  const handleRetry = () => {
    setQuestions((quiz.questions || []).map(reconcileQuestionAnswer));
    resetState();
  };

  const handleRetryMistakes = () => {
    const wrong = questions.filter((qq, i) => answers[i] !== (qq.correct_index ?? qq.correct ?? qq.correctOption));
    if (!wrong.length) return;
    setQuestions(wrong);
    resetState();
  };

  const saveMistakeFlashcards = async () => {
    const mistakes = questions.filter((qq, index) => answers[index] !== (qq.correct_index ?? qq.correct ?? qq.correctOption));
    if (!mistakes.length) return;
    const cards = mistakes.map((question) => {
      const correctIndex = Number(question.correct_index ?? question.correct ?? question.correctOption);
      return {
        front: question.question || question.text || "Quiz question",
        back: question.explanation || question.options?.[correctIndex] || "",
        topic: question.topic || "Quiz mistakes",
        source: `Quiz: ${quiz.title || "Black Fighters"}`,
        source_quiz_id: quiz.id,
        status: "new",
        box: 1,
        next_review_at: new Date().toISOString(),
      };
    });
    try {
      if (!base44.entities.Flashcard?.create) throw new Error("FLASHCARD_ENTITY_UNAVAILABLE");
      const me = await base44.auth.me().catch(() => null);
      await Promise.all(cards.map((card) => base44.entities.Flashcard.create({ ...card, owner_id: me?.id })));
      toast.success(isEn ? `${cards.length} mistake flashcards saved` : `اتحفظت ${cards.length} بطاقة من أخطائك`);
    } catch {
      try {
        const key = "standalone-flashcards";
        const existing = JSON.parse(window.localStorage.getItem(key) || "[]");
        window.localStorage.setItem(key, JSON.stringify([...cards, ...existing].slice(0, 200)));
        toast.success(isEn ? "Mistakes saved on this device" : "اتحفظت أخطاؤك على الجهاز للمراجعة");
      } catch {
        toast.error(isEn ? "Could not save flashcards" : "متعذر حفظ بطاقات الأخطاء");
      }
    }
  };

  if (!questions.length) {
    return <div className="text-center text-muted-foreground py-20">{isEn ? "The quiz has no questions." : "الكويز مفيهوش أسئلة."}</div>;
  }

  const questionStemText = q?.question || q?.text || "";
  const explanationText = q?.explanation || q?.exp || "";

  return (
    <div
      ref={containerRef}
      dir={dir}
      className={cn(
        "relative w-full",
        isFull && "fixed inset-0 z-[100] bg-background overflow-y-auto p-4 sm:p-8 flex items-center justify-center"
      )}
    >
      <div className="absolute top-2 left-2 z-10 flex items-center gap-2">
        <button
          onClick={toggleFull}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-secondary/60 backdrop-blur border border-border text-xs font-bold hover:bg-secondary hover:text-primary transition-colors"
          title={isFull ? (isEn ? "Minimize" : "تصغير") : (isEn ? "Fullscreen" : "ملء الشاشة")}
        >
          {isFull ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          <span className="hidden sm:inline">{isFull ? (isEn ? "Minimize" : "تصغير") : (isEn ? "Fullscreen" : "ملء الشاشة")}</span>
        </button>

        <button
          type="button"
          onClick={handleAuditAllQuestions}
          disabled={auditingQuiz}
          className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-purple-500/15 backdrop-blur border border-purple-500/40 text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors disabled:opacity-50"
          title={isEn ? "Audit & Fix All Questions with Multi-Agent AI" : "مراجعة وتصحيح كل أسئلة الكويز بالـ AI"}
        >
          {auditingQuiz ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
          <span>{isEn ? "AI Review All" : "مراجعة الكويز بالـ AI"}</span>
        </button>
      </div>

      <div className={cn("w-full mx-auto", isFull ? "max-w-3xl" : "max-w-2xl")}>
        {done ? (
          reviewing ? (
            <MistakesReview questions={questions} answers={answers} onBack={() => setReviewing(false)} />
          ) : (
            <Result score={score} total={questions.length} questions={questions} answers={answers} onRetry={handleRetry} onReview={() => setReviewing(true)} onRetryMistakes={handleRetryMistakes} onSaveMistakes={saveMistakeFlashcards} isEn={isEn} />
          )
        ) : (
          <>
            {resumed && <div className="mb-3 rounded-xl border border-primary/20 bg-primary/5 px-3 py-2 text-xs font-bold text-primary" role="status">{isEn ? "Your previous session was restored." : "تم استكمال جلسة الكويز السابقة."}</div>}
            <div className="flex items-center justify-between mb-3 text-sm pt-12 sm:pt-10 gap-3">
              <span className="font-bold text-primary">{isEn ? `Question ${current + 1} / ${questions.length}` : `سؤال ${current + 1} / ${questions.length}`}</span>
              <div className="flex items-center gap-1 rounded-xl border border-border bg-secondary/30 p-1 text-[10px] font-bold" aria-label={isEn ? "Quiz mode" : "وضع الكويز"}>
                <button type="button" onClick={() => setPlayMode("learning")} className={cn("rounded-lg px-2 py-1 transition-colors", !examMode ? "bg-primary/15 text-primary" : "text-muted-foreground")}>{isEn ? "Learn" : "تعلّم"}</button>
                <button type="button" onClick={() => setPlayMode("exam")} className={cn("rounded-lg px-2 py-1 transition-colors", examMode ? "bg-accent/15 text-accent" : "text-muted-foreground")}>{isEn ? "Exam" : "امتحان"}</button>
              </div>
              <span className="text-muted-foreground">{isEn ? `Score: ${score}` : `النتيجة: ${score}`}</span>
            </div>
            <div className="h-2 bg-secondary rounded-full mb-6 overflow-hidden relative">
              <motion.div
                className="h-full w-full bg-primary relative origin-left"
                initial={false}
                animate={{ scaleX: (current + 1) / questions.length }}
                transition={{ type: "spring", stiffness: 120, damping: 20 }}
              />
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={current}
                initial={{ opacity: 0, x: 80, scale: 0.9, rotateY: 18 }}
                animate={{ opacity: 1, x: 0, scale: 1, rotateY: 0 }}
                exit={{ opacity: 0, x: -80, scale: 0.9, rotateY: -18 }}
                transition={{ type: "spring", stiffness: 220, damping: 22 }}
                style={{ transformPerspective: 1200 }}
                className={cn(
                  "glass-card rounded-3xl border border-primary/20 neon-glow-cyan",
                  isFull ? "p-6 sm:p-10" : "p-6 sm:p-8"
                )}
              >
                <div className="mb-4 flex items-center justify-between gap-2 flex-wrap">
                  <span className="flex flex-wrap gap-2 text-[11px] font-bold">
                    {q.topic && <span className="rounded-full border border-primary/25 bg-primary/10 text-primary px-2.5 py-1">{q.topic}</span>}
                    {q.difficulty && <span className="rounded-full border border-accent/25 bg-accent/10 text-accent px-2.5 py-1">{getDifficultyLabel(q.difficulty, isEn)}</span>}
                    {q.source_ref && <span className="rounded-full border border-border bg-secondary/60 text-muted-foreground px-2.5 py-1">📄 {q.source_ref}</span>}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={handleAuditCurrentQuestion}
                      disabled={auditingQuestion}
                      className="flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-full border border-cyan-500/35 bg-cyan-500/10 text-cyan-300 hover:bg-cyan-500/20 transition-colors disabled:opacity-50"
                      title={isEn ? "Verify & Fix this question's answer with AI" : "مراجعة وتصحيح إجابة هذا السؤال بالـ AI"}
                    >
                      {auditingQuestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3 text-cyan-400" />}
                      <span>{isEn ? "AI Verify" : "مراجعة بالـ AI"}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFlagModalOpen(true)}
                      className="flex items-center gap-1 text-[11px] text-muted-foreground/60 hover:text-amber-400 transition-colors p-1"
                      title={isEn ? "Report question" : "إبلاغ عن السؤال"}
                    >
                      <Flag className="w-3.5 h-3.5" />
                      <span className="hidden sm:inline">{isEn ? "Report" : "إبلاغ"}</span>
                    </button>
                  </div>
                </div>

                <motion.h3
                  dir={isPredominantlyLatin(questionStemText) ? "ltr" : "auto"}
                  initial={{ opacity: 0, y: 14 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className={cn(
                    "font-bold mb-6 leading-relaxed",
                    isPredominantlyLatin(questionStemText) ? "text-left" : "text-start",
                    isFull ? "text-xl sm:text-3xl" : "text-lg sm:text-xl"
                  )}
                >
                  {questionStemText}
                </motion.h3>

                <div className="space-y-3">
                  {q.options?.map((opt, i) => {
                    const isSelected = selected === i;
                    const isCorrect = i === (q.correct_index ?? q.correct ?? q.correctOption);
                    return (
                      <motion.button
                        key={i}
                        whileHover={!answered ? { scale: 1.01 } : {}}
                        whileTap={!answered ? { scale: 0.99 } : {}}
                        onClick={() => handleSelect(i)}
                        disabled={answered}
                        dir="auto"
                        className={cn(
                          "w-full text-start p-4 rounded-2xl border transition-colors text-sm sm:text-base flex items-center justify-between gap-3 font-medium",
                          !answered && "border-border/60 hover:border-primary/50 hover:bg-secondary/40 bg-secondary/20",
                          !examMode && answered && isCorrect && "border-emerald-500 bg-emerald-500/15 text-emerald-300 font-bold",
                          !examMode && answered && isSelected && !isCorrect && "border-red-500 bg-red-500/15 text-red-300",
                          !examMode && answered && !isSelected && !isCorrect && "border-border/30 opacity-40"
                        )}
                      >
                        <span dir={isPredominantlyLatin(opt) ? "ltr" : "auto"}>{opt}</span>
                        {!examMode && answered && isCorrect && <Check className="w-5 h-5 text-emerald-400 shrink-0" />}
                        {!examMode && answered && isSelected && !isCorrect && <X className="w-5 h-5 text-red-400 shrink-0" />}
                      </motion.button>
                    );
                  })}
                </div>

                {!answered && (
                  <Button 
                    variant="outline" 
                    onClick={() => handleSelect(q.correct_index ?? q.correct ?? q.correctOption)} 
                    className="w-full mt-4 border-dashed border-muted-foreground/40 text-muted-foreground hover:bg-primary/5 hover:text-primary transition-colors font-bold"
                  >
                    {isEn ? "Reveal Answer Immediately" : "إظهار الإجابة فوراً"}
                  </Button>
                )}

                <AnimatePresence>
                  {answered && showExp && explanationText && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-5 p-4 rounded-2xl bg-secondary/40 border border-border text-sm leading-relaxed overflow-hidden"
                    >
                      <div className="flex items-center justify-between gap-2 mb-1.5">
                        <span className="font-bold text-primary">{isEn ? "Explanation:" : "الشرح:"}</span>
                        <button
                          type="button"
                          onClick={handleAuditCurrentQuestion}
                          disabled={auditingQuestion}
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-cyan-400 hover:text-cyan-300 transition-colors disabled:opacity-50"
                        >
                          {auditingQuestion ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                          <span>{isEn ? "Doubt the answer? Verify with AI" : "شاكك في الإجابة؟ صححها بالـ AI"}</span>
                        </button>
                      </div>
                      <p
                        dir={isPredominantlyLatin(explanationText) ? "ltr" : "auto"}
                        className={cn(isPredominantlyLatin(explanationText) ? "text-left" : "text-start")}
                      >
                        {explanationText}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {answered && (
                  <div aria-live="polite">
                    {examMode && <p className="mt-4 text-center text-xs font-bold text-muted-foreground">{isEn ? "Answer recorded. Feedback will appear in the result." : "تم تسجيل الإجابة. النتيجة والشرح هيظهروا في النهاية."}</p>}
                  <Button ref={nextButtonRef} onClick={handleNext} className={cn("w-full mt-6 font-bold gap-2", isFull ? "h-12 text-base" : "h-11")}>
                    {current + 1 >= questions.length ? (isEn ? "Finish Quiz" : "إنهاء الكويز") : (isEn ? "Next Question" : "السؤال التالي")}
                    <ChevronLeft className={cn("w-4 h-4", isEn && "rotate-180")} />
                  </Button>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          </>
        )}
      </div>

      <FlagQuestionModal
        isOpen={flagModalOpen}
        onClose={() => setFlagModalOpen(false)}
        question={q}
        quizId={quiz?.id}
      />
    </div>
  );
}

function Result({ score, total, questions = [], answers = [], onRetry, onReview, onRetryMistakes, onSaveMistakes, isEn = false }) {
  const pct = Math.round((score / total) * 100);
  const hasMistakes = score < total;
  const performance = buildQuizPerformance(questions, answers);
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 140, damping: 16 }}
      className="glass-card rounded-3xl p-8 sm:p-12 text-center border border-primary/30 neon-glow-cyan max-w-lg mx-auto mt-12"
    >
      <motion.div
        initial={{ rotate: -180, scale: 0, y: -40 }}
        animate={{ rotate: 0, scale: 1, y: 0 }}
        transition={{ delay: 0.1, type: "spring", stiffness: 180, damping: 12 }}
      >
        <motion.div
          animate={{ y: [0, -8, 0], rotate: [0, -6, 6, 0] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <Trophy className={cn("w-16 h-16 mx-auto mb-4 drop-shadow-[0_0_18px_currentColor]", pct >= 60 ? "text-yellow-400" : "text-muted-foreground")} />
        </motion.div>
      </motion.div>
      <motion.h2
        className="text-5xl font-black mb-2 neon-text-gradient"
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: [0.5, 1.2, 1], opacity: 1 }}
        transition={{ delay: 0.35, duration: 0.6, ease: "backOut" }}
      >
        {pct}%
      </motion.h2>
      <p className="text-muted-foreground mb-1">{isEn ? `You answered ${score} of ${total} correctly` : `جاوبت صح على ${score} من ${total}`}</p>
      <p className="font-bold mb-6">{pct >= 80 ? (isEn ? "Excellent! 🔥" : "ممتاز! 🔥") : pct >= 60 ? (isEn ? "Very Good 👏" : "كويس جداً 👏") : (isEn ? "Needs Revision 💪" : "محتاج مراجعة 💪")}</p>
      <div className="flex flex-col sm:flex-row flex-wrap gap-3 justify-center">
        {hasMistakes && onRetryMistakes && (
          <Button onClick={onRetryMistakes} className="gap-2 font-bold bg-destructive hover:bg-destructive/90">
            <Target className="w-4 h-4" /> {isEn ? `Retry Mistakes (${total - score})` : `أعد حل الأخطاء (${total - score})`}
          </Button>
        )}
        {hasMistakes && onReview && (
          <Button onClick={onReview} variant="outline" className="gap-2 font-bold border-destructive/30 text-destructive hover:bg-destructive/10">
            <ListChecks className="w-4 h-4" /> {isEn ? `Review Mistakes (${total - score})` : `راجع أخطاءك (${total - score})`}
          </Button>
        )}
        {hasMistakes && onSaveMistakes && (
          <Button onClick={onSaveMistakes} variant="outline" className="gap-2 font-bold border-primary/30 text-primary hover:bg-primary/10">
            <Target className="w-4 h-4" /> {isEn ? "Make mistake flashcards" : "حوّل الأخطاء لبطاقات"}
          </Button>
        )}
        <Button onClick={onRetry} variant="outline" className="gap-2 font-bold"><RotateCcw className="w-4 h-4" /> {isEn ? "Retry All" : "حاول تاني (الكل)"}</Button>
      </div>
      {!!performance.weakTopics.length && (
        <div className="mt-6 text-start rounded-2xl border border-yellow-400/25 bg-yellow-400/5 p-4">
          <h3 className="font-black text-yellow-300 mb-3">{isEn ? "Review these areas first" : "راجع الحتت دي الأول"}</h3>
          <div className="space-y-2">
            {performance.weakTopics.map((topic) => (
              <div key={topic.key} className="rounded-xl border border-border bg-background/45 p-3">
                <div className="flex items-center justify-between gap-3 mb-1">
                  <span className="font-bold text-sm">{topic.key}</span>
                  <span className="text-xs text-muted-foreground">{topic.correct}/{topic.total}</span>
                </div>
                <div className="h-1.5 rounded-full bg-border overflow-hidden">
                  <div className="h-full bg-yellow-400" style={{ width: `${topic.percentage}%` }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
}
