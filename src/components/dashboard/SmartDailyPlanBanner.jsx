import React, { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { 
  Zap, Sparkles, CheckCircle2, X, ChevronRight
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Button } from "@/components/ui/button";
import FlipFlashcard from "@/components/ui/FlipFlashcard";
import StreakFlameWidget from "@/components/ui/StreakFlameWidget";
import { motionTokens, useReducedMotionPreference } from "@/lib/motionTokens";
import { playClick, playSuccess, playLevelUp, playStreak } from "@/lib/sounds";
import { trackFunnelEvent } from "@/lib/analytics";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function SmartDailyPlanBanner() {
  const { profile } = useAuth();
  const { t, locale, dir } = useLocale();
  const isEn = locale === "en";
  const { prefersReducedMotion } = useReducedMotionPreference();
  const [sessionActive, setSessionActive] = useState(false);
  const [sessionCompleted, setSessionCompleted] = useState(false);

  // 1. Fetch Due SRS Cards
  const { data: cards = [] } = useQuery({
    queryKey: ["dailyPlanCards"],
    queryFn: async () => {
      const all = await base44.entities.Flashcard?.filter({}, "-created_date", 20).catch(() => []);
      return all.slice(0, 8); // Top 8 cards for daily session
    },
    staleTime: 1000 * 60 * 10,
  });

  // 2. Fetch Weakest Topic from Quiz Attempts
  const { data: weakTopic = "المفاهيم الأساسية" } = useQuery({
    queryKey: ["dailyPlanWeakTopic"],
    queryFn: async () => {
      const attempts = await base44.entities.QuizAttempt?.filter({}, "-created_date", 10).catch(() => []);
      if (!attempts.length) return "المفاهيم الأساسية";
      return attempts[0]?.topic || "أهم النقاط";
    },
    staleTime: 1000 * 60 * 15,
  });

  // Sample questions on weak topic for Phase 2
  const sessionQuestions = useMemo(() => [
    {
      question: "ما هو التأثير الرئيسي للـ Beta-1 receptors في عضلة القلب؟",
      options: ["زيادة معدل وقوة انقباض القلب", "توسيع القصبات الهوائية", "تضييق الأوعية الدموية المحيطية", "تثبيط إفراز الرينين"],
      correct_index: 0,
      explanation: "مستقبلات Beta-1 قلبية في الأساس وتحفز معدل النبض وقوة الانقباض (Inotropic & Chronotropic)."
    },
    {
      question: "أي من الأدوية التالية يعتبر الاختيار الأول في علاج ارتفاع ضغط الدم لمرضى السكري؟",
      options: ["مدرات البول الثيازيدية", "مثبطات ACE / ARBs لحماية الكلى", "حاصرات بيتا غير الانتقائية", "موسعات الأوعية المباشرة"],
      correct_index: 1,
      explanation: "مثبطات ACE / ARBs توفر حماية كلوية استثنائية (Renoprotective effect) لمرضى السكري."
    }
  ], []);

  // State inside active session
  const [currentCardIdx, setCurrentCardIdx] = useState(0);
  const [isCardFlipped, setIsCardFlipped] = useState(false);
  const [phase, setPhase] = useState("cards"); // 'cards' | 'quiz' | 'celebration'
  const [currentQIdx, setCurrentQIdx] = useState(0);
  const [selectedAns, setSelectedAns] = useState(null);
  const [qAnswered, setQAnswered] = useState(false);
  const [sessionScore, setSessionScore] = useState(0);

  const totalCards = cards.length > 0 ? cards.length : 3;

  const startSession = () => {
    playClick();
    setSessionActive(true);
    setPhase("cards");
    setCurrentCardIdx(0);
    setCurrentQIdx(0);
    setSelectedAns(null);
    setQAnswered(false);
    setSessionScore(0);
  };

  const handleNextCard = () => {
    setIsCardFlipped(false);
    if (currentCardIdx + 1 >= (cards.length || 3)) {
      setPhase("quiz");
      playSuccess();
      toast.success("أحسنت! أتممت مراجعة الفلاش كاردز، الآن مرحلة الأسئلة السريعة ⚡");
    } else {
      setCurrentCardIdx((c) => c + 1);
    }
  };

  const handleSelectQuizAns = (idx) => {
    if (qAnswered) return;
    setSelectedAns(idx);
    setQAnswered(true);
    const isCorrect = idx === sessionQuestions[currentQIdx]?.correct_index;
    if (isCorrect) {
      setSessionScore((s) => s + 1);
      playSuccess();
    }
  };

  const handleNextQuestion = () => {
    if (currentQIdx + 1 >= sessionQuestions.length) {
      setPhase("celebration");
      setSessionCompleted(true);
      playLevelUp();
      playStreak();
      trackFunnelEvent("srs_review_done", { score: sessionScore + 1 });
    } else {
      setCurrentQIdx((q) => q + 1);
      setSelectedAns(null);
      setQAnswered(false);
    }
  };

  return (
    <>
      {/* 1. Main Prominent Dashboard Banner */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={motionTokens.slow}
        className="relative overflow-hidden rounded-3xl p-6 sm:p-7 border-2 border-primary/40 bg-gradient-to-r from-[#0a1628]/90 via-[#07131a]/95 to-[#0e0e1a]/90 backdrop-blur-2xl shadow-[0_10px_35px_rgba(0,245,255,0.14)] select-none"
        dir={dir}
      >
        {/* Glow ambient background */}
        <div className="absolute top-0 right-0 w-80 h-80 bg-primary/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-cyan-400/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-2 max-w-xl">
            <div className="flex items-center gap-2.5">
              <span className="px-3 py-1 rounded-full bg-primary/20 border border-primary/40 text-cyan-300 text-[11px] font-mono font-black tracking-wider flex items-center gap-1.5 shadow-sm">
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>{t("dailyFocusBadge")}</span>
              </span>
              <StreakFlameWidget streak={profile?.streak_days || 1} size="sm" />
            </div>

            <h2 className="text-xl sm:text-2xl font-black text-white font-heading tracking-tight leading-snug">
              {t("dailyFocusTitle")}
            </h2>

            <p className="text-xs sm:text-sm text-white/70 leading-relaxed font-sans">
              {locale === "ar" ? (
                <>مجهزين لك في دقائق معدودة: <strong className="text-cyan-300">{cards.length || 3} كروت مراجعة</strong> + تثبيت سريع لموضوع <strong className="text-amber-300">{weakTopic}</strong> عشان المعلومة تثبت في دماغك وتواصل الستريك.</>
              ) : (
                <>Ready in a few minutes: <strong className="text-cyan-300">{cards.length || 3} review cards</strong> + a quick refresher on <strong className="text-amber-300">{weakTopic}</strong> to keep your streak going.</>
              )}
            </p>
          </div>

          {/* Action Trigger with breathing neon glow */}
          <div className="shrink-0 w-full sm:w-auto">
            <Button
              type="button"
              size="lg"
              onClick={startSession}
              className="w-full sm:w-auto h-12 px-8 rounded-2xl font-black text-sm bg-gradient-to-r from-cyan-400 via-primary to-blue-500 text-black btn-lift gap-2.5"
              style={{
                /* Static neon halo (paint-once). The old hover:shadow +
                   hover:scale over transition-[color,background-color,border-color,box-shadow,transform] repainted the whole banner
                   card on every hover flip and delayed the glow — the §7
                   recipe is transform-only motion + static glow. */
                filter: "drop-shadow(0 0 14px rgba(0,245,255,0.35))",
              }}
            >
              <Zap className="w-5 h-5 fill-current" />
              <span>{t("startFocusSession")}</span>
            </Button>
          </div>
        </div>
      </motion.div>

      {/* 2. Immersive Full-Screen Distraction-Free Focus Room */}
      <AnimatePresence>
        {sessionActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={motionTokens.slow}
            className="fixed inset-0 z-[200] bg-[#05060b] overflow-y-auto p-4 sm:p-8 flex flex-col justify-between"
            dir={dir}
          >
            {/* Top Bar */}
            <div className="max-w-4xl w-full mx-auto flex items-center justify-between border-b border-white/10 pb-4">
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-bold text-sm">
                  ⚡
                </span>
                <div>
                  <h3 className="text-sm sm:text-base font-black text-white font-heading">
                    {isEn ? "Deep Focus Mode • Daily Study Session" : "وضع التركيز الكامل • جلسة المذاكرة اليومية"}
                  </h3>
                  <p className="text-[11px] text-white/50">
                    {phase === "cards" && (isEn ? `Flashcards Review (${currentCardIdx + 1}/${cards.length || 3})` : `مراجعة الفلاش كاردز (${currentCardIdx + 1}/${cards.length || 3})`)}
                    {phase === "quiz" && (isEn ? `Practice Questions (${currentQIdx + 1}/${sessionQuestions.length})` : `الأسئلة التطبيقية (${currentQIdx + 1}/${sessionQuestions.length})`)}
                    {phase === "celebration" && (isEn ? "Session Completed! 🏆" : "اكتملت الجلسة بنجاح! 🏆")}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setSessionActive(false)}
                className="w-9 h-9 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white transition-colors"
                title={isEn ? "Exit session" : "إنهاء الجلسة والرجوع"}
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Main Stage Content */}
            <div className="max-w-2xl w-full mx-auto my-auto py-8">
              {/* PHASE 1: FLASHCARDS */}
              {phase === "cards" && (
                <div className="space-y-6 text-center">
                  <FlipFlashcard
                    front={cards[currentCardIdx]?.front || (isEn ? "What is the primary function of mitochondria in animal cells?" : "ما هي وظيفة الميتوكوندريا في الخلية الحيوانية؟")}
                    back={cards[currentCardIdx]?.back || (isEn ? "ATP energy production via cellular respiration and the Krebs cycle." : "إنتاج طاقة الخلية (ATP) من خلال التنفس الخلوي ودورة كريبس.")}
                    isFlipped={isCardFlipped}
                    onFlip={setIsCardFlipped}
                  />

                  <div className="flex items-center justify-center gap-4 pt-4">
                    <Button
                      type="button"
                      size="lg"
                      onClick={handleNextCard}
                      className="h-12 px-8 rounded-2xl font-black text-xs sm:text-sm bg-primary text-black hover:bg-primary/90 shadow-xl gap-2"
                    >
                      <span>
                        {currentCardIdx + 1 >= (cards.length || 3)
                          ? (isEn ? "Proceed to Questions ⚡" : "الانتقال للأسئلة ⚡")
                          : (isEn ? "Next Card" : "البطاقة التالية")}
                      </span>
                      <ChevronRight className={cn("w-4 h-4", !isEn && "rotate-180")} />
                    </Button>
                  </div>
                </div>
              )}

              {/* PHASE 2: RAPID WEAK TOPIC QUIZ */}
              {phase === "quiz" && (
                <div className="space-y-6">
                  <div className="p-6 rounded-3xl bg-white/[0.03] border border-white/15 space-y-4 shadow-2xl">
                    <span className="px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold font-mono">
                      {isEn ? `Quick check on: ${weakTopic}` : `تطبيق سريع على: ${weakTopic}`}
                    </span>

                    <h4 className="text-base sm:text-lg font-bold text-white leading-relaxed">
                      {sessionQuestions[currentQIdx]?.question}
                    </h4>

                    <div className="space-y-2.5 pt-2">
                      {sessionQuestions[currentQIdx]?.options.map((opt, optIdx) => {
                        const isCorrect = optIdx === sessionQuestions[currentQIdx]?.correct_index;
                        const isChosen = optIdx === selectedAns;

                        return (
                          <button
                            key={optIdx}
                            type="button"
                            disabled={qAnswered}
                            onClick={() => handleSelectQuizAns(optIdx)}
                            className={cn(
                              "w-full text-start p-4 rounded-2xl border text-xs sm:text-sm font-bold transition-colors flex items-center justify-between gap-3",
                              !qAnswered && "border-white/10 bg-white/[0.02] hover:bg-white/[0.06] hover:border-primary/40",
                              qAnswered && isCorrect && "border-emerald-500/60 bg-emerald-500/15 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.25)]",
                              qAnswered && isChosen && !isCorrect && "border-red-500/60 bg-red-500/15 text-red-300"
                            )}
                          >
                            <span>{opt}</span>
                            {qAnswered && isCorrect && <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>

                    {qAnswered && (
                      <div className="p-3.5 rounded-2xl bg-white/5 border border-white/10 text-xs text-white/80 leading-relaxed animate-in fade-in">
                        <strong className="text-primary">{isEn ? "Academic Explanation: " : "الشرح الأكاديمي: "}</strong>
                        {sessionQuestions[currentQIdx]?.explanation}
                      </div>
                    )}
                  </div>

                  {qAnswered && (
                    <div className="flex justify-center pt-2">
                      <Button
                        type="button"
                        size="lg"
                        onClick={handleNextQuestion}
                        className="h-12 px-8 rounded-2xl font-black text-xs sm:text-sm bg-gradient-to-r from-cyan-400 to-primary text-black shadow-xl gap-2"
                      >
                        <span>
                          {currentQIdx + 1 >= sessionQuestions.length
                            ? (isEn ? "View Results & Celebrate 🏆" : "عرض النتيجة والاحتفال 🏆")
                            : (isEn ? "Next Question" : "السؤال التالي")}
                        </span>
                        <ChevronRight className={cn("w-4 h-4", !isEn && "rotate-180")} />
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {/* PHASE 3: CELEBRATION SUMMARY */}
              {phase === "celebration" && (
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  transition={motionTokens.celebration}
                  className="text-center p-8 sm:p-12 rounded-3xl bg-[#081216]/95 border-2 border-emerald-500/40 shadow-[0_0_60px_rgba(16,185,129,0.2)] space-y-6"
                >
                  <div className="w-20 h-20 rounded-full bg-emerald-500/20 border border-emerald-500/50 flex items-center justify-center mx-auto text-emerald-400 text-3xl shadow-xl">
                    🔥
                  </div>

                  <div className="space-y-2">
                    <h3 className="text-2xl sm:text-3xl font-black text-white font-heading">
                      {isEn ? "Great Job! Today's Review Done 🎯" : "عاش! خلصت مراجعة النهاردة 🎯"}
                    </h3>
                    <p className="text-xs sm:text-sm text-white/70 max-w-md mx-auto leading-relaxed">
                      {isEn
                        ? "You reviewed your flashcards and key practice questions. Keep up the daily momentum!"
                        : "راجعت بطاقاتك وحليت الأسئلة السريعة بنجاح. استمرارك كل يوم هو اللي بيعمل الفرق الحقيقي!"}
                    </p>
                  </div>

                  <div className="inline-flex items-center gap-3 p-4 rounded-2xl bg-white/5 border border-white/10">
                    <StreakFlameWidget streak={(profile?.streak_days || 1) + 1} size="lg" />
                  </div>

                  <div>
                    <Button
                      type="button"
                      size="lg"
                      onClick={() => setSessionActive(false)}
                      className="h-12 px-8 rounded-2xl font-black text-xs sm:text-sm bg-emerald-400 hover:bg-emerald-500 text-black shadow-xl"
                    >
                      {isEn ? "Back to Dashboard ✓" : "الرجوع للوحة التحكم ✓"}
                    </Button>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Bottom Footer Quote */}
            <div className="max-w-4xl w-full mx-auto text-center text-xs text-white/30 font-mono pt-4 border-t border-white/5">
              {isEn
                ? "Smart Study Platform • Daily consistency makes the real difference"
                : "منصة المذاكرة الذكية • الاستمرارية اليومية بتعمل الفرق الحقيقي"}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default SmartDailyPlanBanner;
