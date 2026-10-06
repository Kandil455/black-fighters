import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  CheckCircle2, XCircle, HelpCircle, ArrowRight, ArrowLeft, 
  RotateCcw, Sparkles, Eye, Trophy, Download, Bot, Loader2
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";
import { playClick, playSuccess } from "@/lib/sounds";
import { base44 } from "@/api/base44Client";
import { reconcileQuestionAnswer } from "@/lib/quizQuality";
import { toast } from "sonner";

export function ImageQuizPlayer({
  imagesWithQuizzes = [],
  onExportPdf,
  onExportPptx,
  onExportJson,
  onSaveToPlatformQuiz,
  onExportTelegram,
  onReset,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [exporting, setExporting] = useState(""); // "pdf" | "pptx" | "json"
  const [exportPct, setExportPct] = useState(0);
  const [auditedOverrides, setAuditedOverrides] = useState({});
  const [auditing, setAuditing] = useState(false);

  const runExport = async (key, fn) => {
    if (!fn || exporting) return;
    setExporting(key);
    setExportPct(0);
    try {
      await fn((p) => setExportPct(p?.percent ?? 0));
    } finally {
      setExporting("");
      setExportPct(0);
    }
  };

  // Flatten all questions with their corresponding parent image & auto-reconcile
  const allItems = [];
  imagesWithQuizzes.forEach((img) => {
    if (Array.isArray(img.quiz)) {
      img.quiz.forEach((q, qIdx) => {
        const flatIdx = allItems.length;
        const reconciled = reconcileQuestionAnswer({
          ...q,
          correct_index: q.correctIndex ?? q.correct_index ?? 0,
        });
        const override = auditedOverrides[flatIdx];
        const finalCorrect = override?.correctIndex ?? reconciled.correct_index ?? q.correctIndex ?? 0;
        allItems.push({
          ...q,
          ...override,
          correctIndex: finalCorrect,
          correct_index: finalCorrect,
          explanation: override?.explanation || reconciled.explanation || q.explanation,
          parentImage: img,
          questionIndex: qIdx,
        });
      });
    }
  });

  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedAnswers, setSelectedAnswers] = useState({}); // { [index]: optionIndex }
  const [showExplanation, setShowExplanation] = useState({});
  const [isFinished, setIsFinished] = useState(false);
  const [previewZoom, setPreviewZoom] = useState(false);

  const handleAuditWithAI = async () => {
    if (!allItems.length || auditing) return;
    playClick();
    setAuditing(true);
    const toastId = toast.loading(
      isEn
        ? `Multi-Agent AI is auditing ${allItems.length} practical questions... 🧠⚡`
        : `جاري فحص وتصحيح الـ ${allItems.length} سؤال عملي بالـ AI... 🧠⚡`
    );
    try {
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_audit",
        questions: allItems.map((item) => ({
          question: item.question,
          options: item.options,
          correct_index: item.correctIndex,
          explanation: item.explanation,
        })),
      });
      const result = res?.data?.result || res?.data;
      const auditedList = Array.isArray(result?.questions) ? result.questions : [];
      let fixed = 0;
      const nextOverrides = { ...auditedOverrides };
      auditedList.forEach((aq, idx) => {
        const cIdx = aq.correct_index ?? aq.correct ?? allItems[idx]?.correctIndex ?? 0;
        if (cIdx !== allItems[idx]?.correctIndex) fixed++;
        nextOverrides[idx] = {
          correctIndex: cIdx,
          explanation: aq.explanation || allItems[idx]?.explanation,
        };
        if (allItems[idx]?.parentImage?.quiz?.[allItems[idx].questionIndex]) {
          allItems[idx].parentImage.quiz[allItems[idx].questionIndex].correctIndex = cIdx;
          allItems[idx].parentImage.quiz[allItems[idx].questionIndex].correct_index = cIdx;
          if (aq.explanation) {
            allItems[idx].parentImage.quiz[allItems[idx].questionIndex].explanation = aq.explanation;
          }
        }
      });
      setAuditedOverrides(nextOverrides);
      toast.dismiss(toastId);
      playSuccess();
      toast.success(
        fixed > 0
          ? (isEn ? `AI Audit fixed ${fixed} question(s)! 🧠✅` : `تم فحص الكويز العملي وتصحيح إجابات ${fixed} سؤال! 🧠✅`)
          : (isEn ? "All answers verified 100% accurate! ✅⚡" : "تم فحص جميع الأسئلة — كل الإجابات صحيحة 100%! ✅⚡")
      );
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || (isEn ? "AI Audit failed" : "حدث خطأ أثناء الفحص بالـ AI"));
    } finally {
      setAuditing(false);
    }
  };

  if (!allItems.length) {
    return (
      <div className="p-12 text-center rounded-3xl bg-[#0a0b12] border border-white/10 space-y-4 max-w-xl mx-auto" dir={dir}>
        <HelpCircle className="w-12 h-12 text-primary mx-auto" />
        <h3 className="text-lg font-black text-white">
          {isEn ? "No Generated Quiz Questions Yet" : "لا توجد أسئلة كويز مولدة بعد"}
        </h3>
        <p className="text-xs text-white/60">
          {isEn
            ? 'Please review visual items, accept appropriate slides, and click "Generate Quiz" to start testing.'
            : 'يرجى مراجعة الصور وقبول المناسب منها ثم الضغط على "توليد الكويز" لبدء الاختبار التفاعلي.'}
        </p>
      </div>
    );
  }

  const currentItem = allItems[currentIndex];
  const totalQuestions = allItems.length;
  const currentAnswer = selectedAnswers[currentIndex];
  const isAnswered = currentAnswer !== undefined;
  const isCorrect = isAnswered && currentAnswer === currentItem.correctIndex;

  const handleSelectOption = (optIdx) => {
    if (isAnswered) return;
    playClick();
    setSelectedAnswers((prev) => ({ ...prev, [currentIndex]: optIdx }));
    setShowExplanation((prev) => ({ ...prev, [currentIndex]: true }));

    if (optIdx === currentItem.correctIndex) {
      playSuccess();
    }
  };

  const handleNext = () => {
    playClick();
    if (currentIndex < totalQuestions - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setIsFinished(true);
    }
  };

  const handlePrev = () => {
    playClick();
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    }
  };

  // Calculate final score
  const correctCount = Object.entries(selectedAnswers).filter(([idx, optIdx]) => {
    const item = allItems[Number(idx)];
    return item && optIdx === item.correctIndex;
  }).length;
  const percentage = Math.round((correctCount / totalQuestions) * 100);

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" dir={dir}>
      {!isFinished ? (
        <div className="space-y-6">
          {/* Header & Progress Indicator */}
          <div className="p-4 rounded-2xl bg-[#0a0b12] border border-white/10 flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <span className="w-8 h-8 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center font-mono font-black text-primary text-xs">
                {currentIndex + 1}
              </span>
              <div>
                <span className="text-xs font-bold text-white block">
                  {isEn ? `Question ${currentIndex + 1} of ${totalQuestions}` : `السؤال ${currentIndex + 1} من ${totalQuestions}`}
                </span>
                <span className="text-[10px] text-white/50 font-mono">
                  {isEn ? `Page / Slide ${currentItem.parentImage.pageOrSlideNumber}` : `صفحة / سلايد ${currentItem.parentImage.pageOrSlideNumber}`}
                </span>
              </div>
            </div>

            {/* Questions Quick Navigation Dots */}
            <div className="hidden sm:flex items-center gap-1 max-w-[300px] overflow-x-auto py-1">
              {allItems.map((_, i) => {
                const ans = selectedAnswers[i];
                const answered = ans !== undefined;
                const correct = answered && ans === allItems[i].correctIndex;
                return (
                  <button
                    key={i}
                    type="button"
                    onClick={() => setCurrentIndex(i)}
                    className={cn(
                      "w-6 h-6 rounded-lg text-[10px] font-mono font-bold transition-colors shrink-0",
                      i === currentIndex
                        ? "ring-2 ring-primary scale-110"
                        : "",
                      answered
                        ? correct
                          ? "bg-emerald-500 text-black font-black"
                          : "bg-red-500 text-white"
                        : "bg-white/10 text-white/60 hover:bg-white/20"
                    )}
                  >
                    {i + 1}
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={handleAuditWithAI}
                disabled={auditing}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-purple-500/15 border border-purple-500/35 text-purple-300 text-xs font-bold hover:bg-purple-500/25 transition-colors disabled:opacity-50"
              >
                {auditing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5 text-purple-400" />}
                <span>{isEn ? "AI Review 🧠" : "مراجعة بالـ AI 🧠"}</span>
              </button>
              <span className="text-xs font-mono font-bold text-cyan-400">
                {isEn ? `Accuracy: ${correctCount}/${Object.keys(selectedAnswers).length}` : `دقة الإجابات: ${correctCount}/${Object.keys(selectedAnswers).length}`}
              </span>
            </div>
          </div>

          {/* Main Question + Image Layout */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left/Top: Image Preview */}
            <div className="lg:col-span-5 space-y-3">
              <div
                role="button"
                tabIndex={0}
                aria-label={isEn ? "Zoom image" : "تكبير الصورة"}
                onClick={() => setPreviewZoom(true)}
                onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setPreviewZoom(true))}
                className="relative h-72 sm:h-80 w-full bg-black/80 rounded-3xl border border-white/15 overflow-hidden flex items-center justify-center p-2 group shadow-xl cursor-zoom-in select-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <img
                  src={currentItem.parentImage.thumbnailDataUrl}
                  alt="Scientific Content"
                  draggable={false}
                  className="max-h-full max-w-full object-contain rounded-xl transition-transform duration-300 group-hover:scale-[1.02]"
                />

                <span
                  className={`pointer-events-none absolute bottom-3 ${isEn ? 'right-3' : 'left-3'} px-3 py-1.5 rounded-xl bg-black/75 border border-white/20 text-xs font-bold text-white flex items-center gap-1.5 backdrop-blur-md transition-opacity group-hover:opacity-100 sm:opacity-90`}
                >
                  <Eye className="w-3.5 h-3.5 text-primary" />
                  <span>{isEn ? "Zoom Image" : "تكبير الصورة"}</span>
                </span>
              </div>

              {currentItem.parentImage.contextText && (
                <div className="p-3 bg-white/[0.02] rounded-2xl border border-white/5 text-[11px] text-white/60 leading-relaxed max-h-24 overflow-y-auto">
                  <strong className="text-white/80 block mb-0.5 font-mono">
                    {isEn ? "Lecture Context:" : "سياق الصورة من المحاضرة:"}
                  </strong>
                  {currentItem.parentImage.contextText}
                </div>
              )}
            </div>

            {/* Right: Question Stem and Choices */}
            <div className="lg:col-span-7 space-y-4">
              <div className="p-6 rounded-3xl bg-[#0a0b12] border border-white/15 shadow-xl space-y-5">
                {/* Question Stem */}
                <h4
                  className="text-base sm:text-lg font-bold text-white leading-relaxed font-heading"
                  dir={/[a-zA-Z]/.test(currentItem.question) ? "ltr" : "rtl"}
                >
                  {currentItem.question}
                </h4>

                {/* Choices List */}
                <div className="space-y-2.5">
                  {currentItem.options.map((opt, optIdx) => {
                    const isPicked = currentAnswer === optIdx;
                    const isTargetCorrect = optIdx === currentItem.correctIndex;

                    let btnStyle = "border-white/15 bg-white/[0.04] text-white hover:bg-white/[0.08]";
                    if (isAnswered) {
                      if (isTargetCorrect) {
                        btnStyle = "border-emerald-500 bg-emerald-500/20 text-emerald-300 font-bold shadow-[0_0_20px_rgba(0,255,136,0.2)]";
                      } else if (isPicked) {
                        btnStyle = "border-red-500 bg-red-500/20 text-red-300 font-bold";
                      } else {
                        btnStyle = "border-white/10 bg-white/[0.02] text-white/40";
                      }
                    }

                    return (
                      <button
                        key={optIdx}
                        type="button"
                        onClick={() => handleSelectOption(optIdx)}
                        disabled={isAnswered}
                        className={cn(
                          "w-full p-4 rounded-2xl border-2 text-start flex items-center justify-between transition-colors duration-200 text-xs sm:text-sm leading-relaxed",
                          btnStyle
                        )}
                      >
                        <div
                          className="flex items-center gap-3 min-w-0"
                          dir={/[a-zA-Z]/.test(opt) ? "ltr" : "auto"}
                        >
                          <span className="w-6 h-6 rounded-lg bg-white/10 flex items-center justify-center font-mono font-bold text-xs shrink-0">
                            {String.fromCharCode(65 + optIdx)}
                          </span>
                          <span
                            dir={/[a-zA-Z]/.test(opt) ? "ltr" : "auto"}
                            className="break-words font-medium"
                          >
                            {opt}
                          </span>
                        </div>

                        {isAnswered && (
                          <div className={`shrink-0 ${isEn ? 'ml-2' : 'mr-2'}`}>
                            {isTargetCorrect ? (
                              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                            ) : isPicked ? (
                              <XCircle className="w-5 h-5 text-red-400" />
                            ) : null}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Explanation Box */}
                <AnimatePresence>
                  {isAnswered && currentItem.explanation && (
                    <motion.div
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="p-4 rounded-2xl bg-primary/10 border border-primary/25 space-y-1 text-xs text-white/90"
                    >
                      <div className="flex items-center gap-1.5 font-bold text-primary font-mono">
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>{isEn ? "Scientific Figure Explanation:" : "التفسير العلمي للشكل:"}</span>
                      </div>
                      <p
                        className="leading-relaxed text-[11px] sm:text-xs"
                        dir={/[a-zA-Z]/.test(currentItem.explanation) ? "ltr" : "rtl"}
                      >
                        {currentItem.explanation}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Navigation Buttons */}
                <div className="pt-3 border-t border-white/10 flex items-center justify-between">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={currentIndex === 0}
                    onClick={handlePrev}
                    className="text-xs h-10 px-4 rounded-xl border-white/15 bg-white/5 gap-1"
                  >
                    {isEn ? <ArrowLeft className="w-3.5 h-3.5" /> : <ArrowRight className="w-3.5 h-3.5" />}
                    <span>{isEn ? "Previous" : "السابق"}</span>
                  </Button>

                  <Button
                    type="button"
                    disabled={!isAnswered}
                    onClick={handleNext}
                    className="text-xs h-10 px-6 rounded-xl font-black bg-primary text-black hover:opacity-90 shadow-lg gap-1.5"
                  >
                    <span>{currentIndex === totalQuestions - 1 ? (isEn ? "Finish & View Score" : "إنهاء الكويز واستعراض النتيجة") : (isEn ? "Next" : "التالي")}</span>
                    {isEn ? <ArrowRight className="w-3.5 h-3.5" /> : <ArrowLeft className="w-3.5 h-3.5" />}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      ) : (
        /* Results Screen */
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="p-8 sm:p-12 rounded-3xl bg-[#0a0b12] border border-white/15 text-center space-y-6 max-w-2xl mx-auto shadow-2xl"
        >
          <div className="w-20 h-20 rounded-3xl bg-gradient-to-tr from-amber-400/20 to-primary/20 border border-amber-400/40 mx-auto flex items-center justify-center shadow-xl">
            <Trophy className="w-10 h-10 text-amber-400" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl sm:text-3xl font-black text-white font-heading">
              {percentage >= 80 
                ? (isEn ? "Outstanding Performance! 👑🔥" : "أداء استثنائي يا بطل! 👑🔥") 
                : percentage >= 50 
                ? (isEn ? "Great job, keep pushing! ⚡" : "نتيجة ممتازة، واصل التقدم! ⚡") 
                : (isEn ? "Good start, review explanations! 📚" : "بداية جيدة، راجع الشروحات! 📚")}
            </h3>
            <p className="text-xs sm:text-sm text-white/60">
              {isEn ? (
                <>You answered <strong className="text-emerald-400 font-mono">{correctCount}</strong> out of <strong className="text-white font-mono">{totalQuestions}</strong> questions correctly.</>
              ) : (
                <>أجبت بشكل صحيح على <strong className="text-emerald-400 font-mono">{correctCount}</strong> من أصل <strong className="text-white font-mono">{totalQuestions}</strong> سؤال متعلق بالصور العلمية المستخرجة.</>
              )}
            </p>
          </div>

          <div className="py-4 px-6 rounded-2xl bg-white/[0.03] border border-white/10 inline-flex items-center gap-6 font-mono">
            <div>
              <span className="text-[10px] text-white/50 block">{isEn ? "Score" : "النسبة المئوية"}</span>
              <span className="text-2xl font-black text-primary">{percentage}%</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="text-[10px] text-white/50 block">{isEn ? "Correct" : "الأسئلة الصحيحة"}</span>
              <span className="text-2xl font-black text-emerald-400">{correctCount}</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div>
              <span className="text-[10px] text-white/50 block">{isEn ? "Incorrect" : "الأسئلة الخاطئة"}</span>
              <span className="text-2xl font-black text-red-400">{totalQuestions - correctCount}</span>
            </div>
          </div>

          {/* Action Hub & Export Buttons */}
          <div className="flex flex-wrap items-center justify-center gap-3 pt-4 border-t border-white/10">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setSelectedAnswers({});
                setShowExplanation({});
                setCurrentIndex(0);
                setIsFinished(false);
              }}
              className="h-11 px-5 rounded-xl text-xs font-bold border-white/15 bg-white/5 gap-2"
            >
              <RotateCcw className="w-4 h-4" />
              <span>{isEn ? "Retake Quiz" : "إعادة حل الكويز"}</span>
            </Button>

            {onSaveToPlatformQuiz && (
              <Button
                type="button"
                onClick={onSaveToPlatformQuiz}
                className="h-11 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white gap-2 shadow-lg hover:opacity-95"
              >
                <Sparkles className="w-4 h-4" />
                <span>{isEn ? "Save to My Quizzes" : "حفظ الكويز بحسابي 🎯"}</span>
              </Button>
            )}

            {onExportTelegram && (
              <Button
                type="button"
                onClick={onExportTelegram}
                className="h-11 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-[#0088cc] to-sky-500 text-white gap-2 shadow-lg hover:opacity-95"
              >
                <Bot className="w-4 h-4" />
                <span>{isEn ? "Export to Telegram" : "تصدير للتيليجرام 🤖"}</span>
              </Button>
            )}

            <Button
              type="button"
              onClick={() => runExport("pdf", onExportPdf)}
              disabled={!!exporting}
              className="h-11 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-red-500 to-rose-600 text-white gap-2 shadow-lg hover:opacity-95 disabled:opacity-60"
            >
              {exporting === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{exporting === "pdf"
                ? (exportPct ? `PDF ${exportPct}%` : (isEn ? "Preparing PDF…" : "جاري تجهيز الـ PDF…"))
                : (isEn ? "Export PDF" : "تصدير PDF")}</span>
            </Button>

            <Button
              type="button"
              onClick={() => runExport("pptx", onExportPptx)}
              disabled={!!exporting}
              className="h-11 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-orange-500 to-amber-600 text-white gap-2 shadow-lg hover:opacity-95 disabled:opacity-60"
            >
              {exporting === "pptx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              <span>{exporting === "pptx"
                ? (exportPct ? `PPTX ${exportPct}%` : (isEn ? "Preparing PPTX…" : "جاري تجهيز الـ PPTX…"))
                : (isEn ? "Export PPTX" : "تصدير PPTX")}</span>
            </Button>

            <Button
              type="button"
              onClick={() => runExport("json", onExportJson)}
              disabled={!!exporting}
              className="h-11 px-5 rounded-xl text-xs font-black bg-gradient-to-r from-cyan-400 to-primary text-black gap-2 shadow-lg hover:opacity-95 disabled:opacity-60"
            >
              <Download className="w-4 h-4" />
              <span>{isEn ? "Export JSON" : "تصدير Quiz JSON"}</span>
            </Button>
          </div>
        </motion.div>
      )}

      {/* Image Zoom Modal */}
      {previewZoom && (
        <div
          className="fixed inset-0 z-[99999] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
          onClick={() => setPreviewZoom(false)}
        >
          <div className="max-w-4xl max-h-[90vh] overflow-auto">
            <img
              src={currentItem.parentImage.thumbnailDataUrl}
              alt="Zoomed"
              className="max-h-[85vh] max-w-full object-contain rounded-2xl border border-white/20"
            />
          </div>
        </div>
      )}
    </div>
  );
}

export default ImageQuizPlayer;
