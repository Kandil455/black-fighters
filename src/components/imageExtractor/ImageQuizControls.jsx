import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Sparkles, Zap, ShieldAlert, 
  Loader2, ArrowLeft, ArrowRight, Coins, Languages 
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { getImageExtractCost } from "@/lib/creditCosts";
import { playClick } from "@/lib/sounds";
import { detectLanguage, getRecommendedQuizLanguage } from "@/lib/quizQuality";
import { cn } from "@/lib/utils";

export function ImageQuizControls({
  keptImages = [],
  onGenerateQuiz,
  isGenerating,
  generationProgress,
  onBackToReview,
}) {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [totalQuestions, setTotalQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [quizLanguage, setQuizLanguage] = useState("auto"); // auto | en | ar
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  const { detectedLang, recommendedLang, isBilingual } = useMemo(() => {
    const list = Array.isArray(keptImages) ? keptImages : [];
    const combined = list.map(img => `${img?.contextText || ""} ${img?.sourceFileName || ""}`).join(" ");
    const lang = detectLanguage(combined);
    const rec = getRecommendedQuizLanguage(combined);
    return {
      detectedLang: lang || "en",
      recommendedLang: rec || "en",
      isBilingual: lang === "mixed",
    };
  }, [keptImages]);

  const imageCount = Array.isArray(keptImages) ? keptImages.length : 0;
  // Cost scales strictly with total questions (1 credit per 5 questions)
  const estimatedCredits = getImageExtractCost({
    questionCount: totalQuestions,
    withQuiz: true,
  });
  const userCredits = profile?.credits ?? 0;
  const isSuperUser = Boolean(profile?.is_pro) || Boolean(profile?.is_admin) || profile?.role === "admin" || profile?.email === "admin@admin.com";
  const hasEnoughCredits = userCredits >= estimatedCredits || isSuperUser;

  const handleOpenConfirm = () => {
    playClick();
    setShowConfirmModal(true);
  };

  const handleConfirmStart = () => {
    setShowConfirmModal(false);
    playClick();
    const effectiveLang = quizLanguage === "auto" ? recommendedLang : quizLanguage;
    onGenerateQuiz({
      totalQuestions: Math.max(1, Math.min(100, Number(totalQuestions) || 10)),
      difficulty,
      language: effectiveLang,
    });
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" dir={dir}>
      {/* Header & Back Button */}
      <div className="flex items-center justify-between border-b border-white/10 pb-4">
        <div className="space-y-1">
          <h3 className="text-xl sm:text-2xl font-black text-white font-heading flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-primary" />
            <span>{isEn ? "Interactive Quiz Settings 🎯" : "إعدادات توليد الكويز التفاعلي 🎯"}</span>
          </h3>
          <p className="text-xs text-white/60">
            {isEn
              ? "Multiple-choice questions (MCQ) will be generated and tightly coupled with each approved slide & context."
              : "سيتم توليد أسئلة اختيار من متعدد (MCQ) مرتبطة بدقة بكل صورة مقبولة والشرح المحيط بها"}
          </p>
        </div>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={onBackToReview}
          disabled={isGenerating}
          className="text-xs border-white/15 bg-white/5 hover:bg-white/10 gap-1.5"
        >
          {isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
          <span>{isEn ? "Back to Review" : "العودة لمراجعة الصور"}</span>
        </Button>
      </div>

      {/* Main Settings Card */}
      <div className="p-6 rounded-3xl bg-[#0a0b12] border border-white/15 space-y-6 shadow-xl">
        {/* Selected Images Summary */}
        <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary font-mono font-bold">
              {imageCount}
            </div>
            <div>
              <span className="text-xs font-bold text-white block">
                {isEn ? "Approved Slides for Generation" : "الصور المقبولة المحددة للتوليد"}
              </span>
              <span className="text-[11px] text-white/50">
                {isEn
                  ? "Each visual will receive specialized questions with model answer keys & scientific explanations."
                  : "كل صورة سيتم إنشاء أسئلة MCQ خاصة بها مع خيارات نموذجية وتفسير علمي"}
              </span>
            </div>
          </div>

          <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-full border border-emerald-500/20">
            {isEn ? "Ready for generation ✓" : "جاهز للتوليد ✓"}
          </span>
        </div>

        {/* Options Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Total Questions for Quiz */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-white block">
                {isEn ? "Total OSCE Quiz Questions:" : "إجمالي عدد أسئلة الكويز العملي:"}
              </label>
              <span className="text-xs font-mono font-bold text-primary">
                {totalQuestions} {isEn ? "Questions" : "سؤال"}
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-1.5">
              {[5, 10, 15, 20, 30, 50, 75, 100].map((count) => (
                <button
                  key={count}
                  type="button"
                  onClick={() => setTotalQuestions(count)}
                  disabled={isGenerating}
                  className={cn(
                    "px-3 py-1.5 rounded-xl text-xs font-bold font-mono transition-colors border",
                    Number(totalQuestions) === count
                      ? "bg-primary text-black border-primary font-black shadow-md"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  )}
                >
                  {count}
                </button>
              ))}
              <div className="flex items-center gap-1.5 mr-auto sm:mr-0">
                <Input
                  type="number"
                  min={1}
                  max={100}
                  value={totalQuestions}
                  onChange={(e) => setTotalQuestions(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
                  disabled={isGenerating}
                  className="w-20 h-8 bg-white/[0.03] border-white/20 text-white font-mono font-bold text-xs rounded-lg"
                />
                <span className="text-[10px] text-white/50">{isEn ? "Qs" : "سؤال"}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/50 leading-relaxed">
              {isEn
                ? `AI will prioritize the most clinically critical visuals among the ${imageCount} approved slides, linking each question directly to visible findings.`
                : `يقوم الذكاء الاصطناعي بتحليل الـ ${imageCount} صورة واختيار الصور الأكثر أهمية عيادياً وامتحانياً (كالأشعة والباثولوجي ورسم القلب) وربط كل سؤال بما تظهره الصورة بدقة.`}
            </p>
          </div>

          {/* Difficulty Level */}
          <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-2">
            <label className="text-xs font-bold text-white block">
              {isEn ? "Difficulty level:" : "درجة صعوبة الأسئلة:"}
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: "easy", label: isEn ? "Easy" : "سهل ومباشر" },
                { id: "mixed", label: isEn ? "Mixed" : "متنوع (شامل)" },
                { id: "hard", label: isEn ? "Advanced" : "تفكيري وتحليلي" },
              ].map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setDifficulty(d.id)}
                  disabled={isGenerating}
                  className={cn(
                    "py-2 rounded-xl text-xs font-bold transition-colors border",
                    difficulty === d.id
                      ? "bg-primary text-black border-primary font-black shadow-md"
                      : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                  )}
                >
                  {d.label}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-white/40">
              {isEn
                ? "Questions assess anatomical recognition, landmark localization, and core concepts."
                : "الأسئلة تشمل تشخيص الصورة، وتحديد المعالم، والمفاهيم العلمية المرتبطة"}
            </p>
          </div>
        </div>

        {/* Quiz Language Selector */}
        <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/10 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Languages className="w-4 h-4 text-primary" />
              <label className="text-xs font-bold text-white block">
                {isEn ? "OSCE Quiz Language:" : "لغة كويز الأوسكي / العملي:"}
              </label>
            </div>
            <span className="text-[11px] font-mono font-bold text-primary bg-primary/10 px-2.5 py-0.5 rounded-full border border-primary/20">
              {quizLanguage === "auto" 
                ? (recommendedLang === "en" ? (isEn ? "Auto (English 🇬🇧)" : "تلقائي (English 🇬🇧)") : (isEn ? "Auto (Arabic 🇪🇬)" : "تلقائي (عربي 🇪🇬)"))
                : quizLanguage === "en" ? "English 🇬🇧" : "العربية 🇪🇬"}
            </span>
          </div>

          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "auto", labelAr: "⚡ تلقائي ذكي", labelEn: "⚡ Smart Auto", hintAr: recommendedLang === "en" ? "مقترح: English" : "مقترح: عربي", hintEn: recommendedLang === "en" ? "Rec: English" : "Rec: Arabic" },
              { id: "en", labelAr: "English 🇬🇧", labelEn: "English 🇬🇧", hintAr: "طب وعلمي 100%", hintEn: "100% Medical" },
              { id: "ar", labelAr: "العربية 🇪🇬", labelEn: "Arabic 🇪🇬", hintAr: "كليات نظرية", hintEn: "Humanities" },
            ].map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => setQuizLanguage(item.id)}
                disabled={isGenerating}
                className={cn(
                  "py-2 px-2 rounded-xl text-xs font-bold transition-colors border flex flex-col items-center justify-center gap-0.5",
                  quizLanguage === item.id
                    ? "bg-primary text-black border-primary font-black shadow-md"
                    : "bg-white/5 text-white/70 border-white/10 hover:bg-white/10"
                )}
              >
                <span>{isEn ? item.labelEn : item.labelAr}</span>
                <span className={cn("text-[9px] opacity-75 font-normal", quizLanguage === item.id ? "text-black/80" : "text-white/40")}>
                  {isEn ? item.hintEn : item.hintAr}
                </span>
              </button>
            ))}
          </div>

          {/* Smart Bilingual Notification */}
          {isBilingual && (
            <motion.div
              initial={{ opacity: 0, y: -4 }}
              animate={{ opacity: 1, y: 0 }}
              className="p-3 rounded-xl bg-primary/10 border border-primary/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
            >
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-primary shrink-0" />
                <span className="text-[11px] text-white/90 font-medium">
                  {isEn
                    ? "Bilingual medical slides detected: English is set by default to match OSCE exams."
                    : "تم رصد شرائح ومصطلحات طبية: تم ضبط الكويز على English 🇬🇧 تلقائياً لمطابقة امتحانات العملي والأوسكي."}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setQuizLanguage(quizLanguage === "ar" ? "en" : "ar")}
                className="text-[11px] underline text-primary hover:text-white shrink-0 font-bold"
              >
                {quizLanguage === "ar" ? "التحويل إلى English 🇬🇧" : "التحويل إلى العربية 🇪🇬"}
              </button>
            </motion.div>
          )}
        </div>

        {/* Cost Estimation & Confirmation Box */}
        <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-amber-500/10 via-primary/5 to-transparent border border-amber-500/20 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="text-xs font-black text-white">
                {isEn ? "Credit calculation before execution:" : "حساب التكلفة التناسبية قبل التنفيذ:"}
              </span>
            </div>
            <p className="text-xs text-white/70">
              {isEn ? (
                <>Total cost: <strong className="text-amber-300 font-mono">{estimatedCredits} Credits</strong> ({totalQuestions} questions across {imageCount} visuals • 0.5 Cr / question) • Current balance: <strong className="text-primary font-mono">{userCredits} Credits</strong></>
              ) : (
                <>التكلفة الإجمالية: <strong className="text-amber-300 font-mono">{estimatedCredits} كريدت</strong> ({totalQuestions} سؤال عبر {imageCount} صورة • سؤالين بـ 1 كريدت) • رصيدك الحالي: <strong className="text-primary font-mono">{userCredits} كريدت</strong></>
              )}
            </p>
          </div>

          <Button
            type="button"
            onClick={handleOpenConfirm}
            disabled={isGenerating || imageCount === 0 || !hasEnoughCredits}
            className="w-full sm:w-auto h-12 px-7 rounded-2xl font-black text-xs text-black bg-gradient-to-r from-cyan-400 to-primary hover:opacity-95 shadow-xl gap-2 shrink-0"
          >
            {isGenerating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{isEn ? "Generating quizzes..." : "جاري توليد الكويزات..."}</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>{isEn ? `Confirm & Generate (${estimatedCredits} Credits) 🚀` : `تأكيد وبدء التوليد (${estimatedCredits} كريدت) 🚀`}</span>
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Generation Progress Indicator */}
      {isGenerating && generationProgress && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-5 rounded-2xl bg-[#090a10] border border-primary/30 shadow-[0_0_30px_rgba(0,245,255,0.15)] space-y-3"
        >
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-white font-bold flex items-center gap-2">
              <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />
              <span>
                {isEn
                  ? `Generating questions for visual ${generationProgress.current} of ${generationProgress.total}...`
                  : `جاري توليد أسئلة الصورة ${generationProgress.current} من ${generationProgress.total}...`}
              </span>
            </span>
            <span className="text-primary font-bold">{generationProgress.percent}%</span>
          </div>

          <div className="h-2 w-full bg-white/10 rounded-full overflow-hidden">
            <motion.div
              className="h-full bg-gradient-to-r from-cyan-400 to-primary"
              initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
              animate={{ clipPath: `inset(0% ${100 - generationProgress.percent}% 0% 0%)` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        </motion.div>
      )}

      {/* Explicit Confirmation Dialog before deducting credits */}
      <Dialog open={showConfirmModal} onOpenChange={setShowConfirmModal}>
        <DialogContent className="max-w-md bg-[#0a0b12] border-white/20 text-white" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-base font-black flex items-center gap-2 text-amber-400">
              <ShieldAlert className="w-5 h-5" />
              <span>{isEn ? "Confirm Credit Deduction ⚡" : "تأكيد استهلاك الكريدت ⚡"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-2 text-xs text-white/80 leading-relaxed">
            <p>
              {isEn ? (
                <>You are about to generate <strong className="text-white">{totalQuestions} practical questions</strong> across <strong className="text-white">{imageCount} approved visuals</strong> (0.5 Credits per question).</>
              ) : (
                <>أنت على وشك توليد <strong className="text-white">{totalQuestions} سؤال عملي</strong> مستندة على <strong className="text-white">{imageCount} صورة علمية</strong> (سؤالين بـ 1 كريدت / 2.5 كريدت لكل 5 أسئلة).</>
              )}
            </p>
            <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10 space-y-1.5 font-mono">
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Generation cost:" : "تكلفة التوليد:"}</span>
                <span className="text-amber-400 font-bold">{estimatedCredits} {isEn ? "Credits" : "كريدت"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-white/60">{isEn ? "Remaining balance after:" : "رصيدك المتبقي بعد العملية:"}</span>
                <span className="text-emerald-400 font-bold">{userCredits - estimatedCredits} {isEn ? "Credits" : "كريدت"}</span>
              </div>
            </div>
            <p className="text-[11px] text-white/50">
              {isEn ? "No credits are deducted if the generation fails for any reason." : "لا يتم خصم أي كريدت إذا فشلت العملية لأي سبب."}
            </p>
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowConfirmModal(false)}
              className="text-xs border-white/15 bg-white/5"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="button"
              onClick={handleConfirmStart}
              className="text-xs font-black bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-90"
            >
              موافق، ابدأ التوليد فوراً ✓
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageQuizControls;
