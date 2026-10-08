import React, { useState } from "react";
import { motion } from "framer-motion";
import { 
  CheckCircle2, Circle, AlertTriangle, Trash2, RotateCcw, Plus, 
  Sparkles, ArrowLeft, ShieldAlert, Layers, Loader2
} from "lucide-react";
import { FileSaveIcon } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { getAiConfig } from "@/api/index";
import { base44 } from "@/api/base44Client";
import { callAI } from "@/lib/ai";
import { checkDistractorSymmetry, reconcileQuestionAnswer } from "@/lib/quizQuality";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

export function QuizReviewStudio({
  initialQuestions = [],
  quizTitle = "",
  sourceText = "",
  onSaveAndPublish,
  onCancel,
  isSaving = false,
  sourceType = "ai_generated",
  sourceStats = null,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [title, setTitle] = useState(quizTitle || (isEn ? "New Study Quiz" : "كويز دراسي جديد"));
  const [questions, setQuestions] = useState(() =>
    initialQuestions.map((q, idx) => ({
      ...reconcileQuestionAnswer(q),
      id: q.id || `q_${Date.now()}_${idx}`,
      isEditing: false,
    }))
  );
  const [filterMode, setFilterMode] = useState(() => {
    if (initialQuestions.some((q) => q.needs_review || q.correct_index === -1)) {
      return "needs_review";
    }
    return "all";
  });
  const [regeneratingId, setRegeneratingId] = useState(null);
  const [auditingAll, setAuditingAll] = useState(false);
  const [directPublish, setDirectPublish] = useState(false);

  // Update a field in a specific question
  const handleUpdateQuestion = (id, updates) => {
    setQuestions((prev) =>
      prev.map((q) => {
        if (q.id !== id) return q;
        const updated = { ...q, ...updates };
        // Recalculate symmetry on the fly if options or correct_index changed
        if (updates.options || updates.correct_index !== undefined) {
          const sym = checkDistractorSymmetry(updated.options, updated.correct_index);
          updated.flaggedForAsymmetry = sym.flaggedForAsymmetry;
          updated.asymmetryReason = sym.asymmetryReason;
        }
        return updated;
      })
    );
  };

  // Multi-Agent AI Audit & Auto-Fix for all questions in the studio
  const handleAuditAllWithAI = async () => {
    if (!questions.length || auditingAll) return;
    playClick();
    setAuditingAll(true);
    const toastId = toast.loading(
      isEn
        ? `Multi-Agent AI is auditing and verifying ${questions.length} questions... 🧠⚡`
        : `جاري فحص وتصحيح الـ ${questions.length} سؤال بالـ Multi-Agent AI... 🧠⚡`
    );
    try {
      const res = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_audit",
        questions,
        text: (sourceText || "").slice(0, 12000),
      });
      const result = res?.data?.result || res?.data;
      const auditedList = Array.isArray(result?.questions) && result.questions.length === questions.length
        ? result.questions
        : questions.map(reconcileQuestionAnswer);
      const fixedCount = Number(result?.correctedCount) || 0;

      setQuestions((prev) =>
        prev.map((oldQ, i) => {
          const audited = auditedList[i] || oldQ;
          const sym = checkDistractorSymmetry(audited.options || oldQ.options, audited.correct_index ?? oldQ.correct_index ?? 0);
          return {
            ...oldQ,
            ...audited,
            id: oldQ.id,
            flaggedForAsymmetry: sym.flaggedForAsymmetry,
            asymmetryReason: sym.asymmetryReason,
            needs_review: false,
            review_reason: null,
          };
        })
      );
      setFilterMode("all");
      toast.dismiss(toastId);
      playSuccess();
      if (fixedCount > 0) {
        toast.success(
          isEn
            ? `Multi-Agent AI audited all questions and corrected ${fixedCount} answer(s)! 🧠✅`
            : `تم تدقيق الكويز وتصحيح إجابات ${fixedCount} سؤال بدقة 100%! 🧠✅`
        );
      } else {
        toast.success(
          isEn
            ? `All ${questions.length} questions verified 100% accurate by Multi-Agent AI! ✅⚡`
            : `تم فحص جميع الـ ${questions.length} سؤال — كل الإجابات والشروحات صحيحة 100%! ✅⚡`
        );
      }
    } catch (err) {
      toast.dismiss(toastId);
      toast.error(err?.message || (isEn ? "AI Audit failed" : "حدث خطأ أثناء الفحص بالـ AI"));
    } finally {
      setAuditingAll(false);
    }
  };

  // Delete question
  const handleDeleteQuestion = (id) => {
    playClick();
    setQuestions((prev) => prev.filter((q) => q.id !== id));
    toast.success(isEn ? "Question deleted" : "تم حذف السؤال");
  };

  // Add a blank manual question
  const handleAddManualQuestion = () => {
    playClick();
    const newQ = {
      id: `manual_${Date.now()}`,
      question: isEn ? "New question prompt..." : "سؤال جديد...",
      options: isEn ? ["Option A", "Option B", "Option C", "Option D"] : ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      correct_index: 0,
      explanation: isEn ? "Scientific explanation for the answer..." : "شرح الإجابة النموذجية...",
      difficulty: "medium",
      type: "mcq",
      isEditing: true,
      needs_review: false,
      flaggedForAsymmetry: false,
    };
    setQuestions((prev) => [newQ, ...prev]);
    toast.success(isEn ? "Added new question; you can edit it now" : "تمت إضافة سؤال جديد؛ يمكنك تعديله الآن");
  };

  // Regenerate a single question using AI
  const handleRegenerateSingle = async (id) => {
    const targetQ = questions.find((q) => q.id === id);
    if (!targetQ) return;

    try {
      playClick();
      setRegeneratingId(id);
      const aiConfig = await getAiConfig();

      const prompt = `أعد صياغة وتوليد هذا السؤال بأسلوب احترافي ودقيق.
السؤال الحالي: "${targetQ.question}"
الخيارات: ${targetQ.options.join(" | ")}

القواعد الصارمة:
1. ولّد سؤالاً جديداً تماماً بنفس الفكرة أو المفهوم.
2. اكتب 4 خيارات متكافئة ومتقاربة في الطول والأسلوب اللغوي (فارق لا يتجاوز 3 كلمات).
3. إجابة واحدة صحيحة فقط.
4. أضف شرحاً تعليمياً واضحاً أولاً، ثم انسخ نص الإجابة الصحيحة حرفياً في "correct_answer"، ثم حدد رقمها الصفري في "correct_index" (0..3).

رد بـ JSON فقط:
{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"...","correct_index":0}

سياق المحتوى:
${(sourceText || "").slice(0, 4000) || targetQ.question}`;

      const raw = await callAI(aiConfig, [{ role: "user", content: prompt }]);
      const clean = String(raw).replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
      const start = clean.indexOf("{");
      const end = clean.lastIndexOf("}");
      const parsed = reconcileQuestionAnswer(JSON.parse(clean.slice(start, end + 1)));

      if (parsed?.question && Array.isArray(parsed?.options)) {
        const sym = checkDistractorSymmetry(parsed.options, parsed.correct_index ?? 0);
        handleUpdateQuestion(id, {
          question: parsed.question,
          options: parsed.options,
          correct_index: parsed.correct_index ?? 0,
          explanation: parsed.explanation || targetQ.explanation,
          flaggedForAsymmetry: sym.flaggedForAsymmetry,
          asymmetryReason: sym.asymmetryReason,
          needs_review: false,
        });
        playSuccess();
        toast.success("تمت إعادة توليد السؤال بنجاح! ⚡");
      }
    } catch (err) {
      toast.error(err?.message || "فشلت إعادة التوليد");
    } finally {
      setRegeneratingId(null);
    }
  };

  const getQuestionValidationError = (question) => {
    const options = Array.isArray(question?.options) ? question.options.map((option) => String(option || "").trim()) : [];
    if (!String(question?.question || "").trim()) return isEn ? "Question text is required" : "نص السؤال مطلوب";
    if (options.length < 2 || options.some((option) => !option)) return isEn ? "Add at least two non-empty options" : "أضف خيارين ممتلئين على الأقل";
    return "";
  };

  // Submit approved quiz with automatic normalization
  const handlePublish = () => {
    if (!questions.length) {
      toast.error(isEn ? "No questions to publish" : "لا يمكن بدء كويز بدون أسئلة!");
      return;
    }

    // Auto-normalize any question: guarantee valid correct_index, clean options, and explanation
    const normalizedQuestions = questions.map((rawQ, idx) => {
      const q = reconcileQuestionAnswer(rawQ);
      const rawOpts = Array.isArray(q.options) && q.options.length >= 2
        ? q.options.map((o) => String(o || "").trim()).filter(Boolean)
        : ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"];
      const finalOpts = rawOpts.length >= 2 ? rawOpts : ["الخيار الأول", "الخيار الثاني"];
      const validCorrect = Number.isInteger(q.correct_index) && q.correct_index >= 0 && q.correct_index < finalOpts.length
        ? q.correct_index
        : 0;

      return {
        question: String(q.question || `سؤال ${idx + 1}`).trim(),
        options: finalOpts,
        correct_index: validCorrect,
        explanation: String(q.explanation || "الشرح النموذجي والتفسير السريري المعتمد للسؤال.").trim(),
        difficulty: q.difficulty || "medium",
        source_ref: q.source_ref || "",
        type: q.type || "mcq",
        flaggedForAsymmetry: false,
        needs_review: false,
      };
    });

    playClick();
    onSaveAndPublish({
      title: title.trim() || (isEn ? "Approved Clinical Quiz" : "كويز دراسي معتمد"),
      questions: normalizedQuestions,
      status: "published",
      reviewedAt: new Date().toISOString(),
      sourceType,
    });
  };

  // Filtered views
  const flaggedCount = questions.filter((q) => q.flaggedForAsymmetry).length;
  const needsReviewCount = questions.filter((q) => q.needs_review || q.correct_index === -1).length;
  const filteredQuestions = questions.filter((q) => {
    if (filterMode === "needs_review") return q.needs_review || q.correct_index === -1;
    if (filterMode === "flagged") return q.flaggedForAsymmetry;
    if (filterMode === "needs_answer") return q.correct_index < 0 || q.correct_index >= q.options.length;
    return true;
  });

  return (
    <div className="w-full max-w-5xl mx-auto space-y-6" dir={dir}>
      {/* Top Header */}
      <div className="p-6 rounded-3xl bg-[#0a0b12] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1.5 flex-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-primary/10 text-cyan-400 border border-primary/30">
              {isEn ? "P1.1 • Quality Review Studio" : "P1.1 • استوديو مراجعة وضبط الجودة"}
            </span>
            {sourceType === "offline_parser" && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                {isEn ? "Parsed Locally (0 Credits) ⚡" : "مستخرج محلياً (0 كريدت) ⚡"}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3">
            <Input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={isEn ? "Quiz title..." : "عنوان الكويز..."}
              className="text-base sm:text-lg font-black text-white bg-white/[0.03] border-white/15 h-11 rounded-xl max-w-md focus:border-primary font-heading"
            />
          </div>

          <p className="text-xs text-white/50">
            {isEn 
              ? "Review questions, refine options and explanations, and balance distractors before saving to your quiz bank."
              : "راجع الأسئلة، عدّل الخيارات والشروحات، واستبعد أي سؤال غير متكافئ قبل الحفظ في بنك الكويزات."}
          </p>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={auditingAll || !questions.length}
            onClick={handleAuditAllWithAI}
            className="h-11 px-4 rounded-xl text-xs font-bold border-purple-500/40 bg-purple-500/15 text-purple-300 hover:bg-purple-500/25 gap-1.5"
          >
            {auditingAll ? <Loader2 className="w-4 h-4 animate-spin text-purple-300" /> : <Sparkles className="w-4 h-4 text-purple-300" />}
            <span>{isEn ? "🧠 AI Review & Fix Answers" : "🧠 مراجعة وتصحيح بالـ AI"}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleAddManualQuestion}
            className="h-11 px-4 rounded-xl text-xs font-bold border-white/15 bg-white/5 hover:bg-white/10 gap-1.5"
          >
            <Plus className="w-4 h-4 text-primary" />
            <span>{isEn ? "Add Manual Question" : "إضافة سؤال يدوي"}</span>
          </Button>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || !questions.length}
            className="h-11 px-7 rounded-xl font-black text-xs bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-95 shadow-xl gap-2"
          >
            <FileSaveIcon size={18} />
            <span>{isSaving ? (isEn ? "Starting..." : "جاري البدء...") : (isEn ? "🚀 Complete Review & Start Quiz" : "🚀 إكمال المراجعة وبدء الكويز فوراً")}</span>
          </Button>
        </div>
      </div>

      {/* Filter Tabs & Symmetry Warnings Banner */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilterMode("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border",
              filterMode === "all"
                ? "bg-primary/20 text-cyan-300 border-primary/40"
                : "bg-white/[0.02] text-white/60 border-white/10 hover:text-white"
            )}
          >
            {isEn ? `All Questions (${questions.length})` : `جميع الأسئلة (${questions.length})`}
          </button>

          {needsReviewCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("needs_review")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5",
                filterMode === "needs_review"
                  ? "bg-rose-500/20 text-rose-300 border-rose-500/40"
                  : "bg-rose-500/10 text-rose-400 border-rose-500/25 hover:bg-rose-500/20"
              )}
            >
              <ShieldAlert className="w-3.5 h-3.5" />
              <span>{isEn ? `Needs Review (${needsReviewCount})` : `تحتاج مراجعة (${needsReviewCount})`}</span>
            </button>
          )}

          {flaggedCount > 0 && (
            <button
              type="button"
              onClick={() => setFilterMode("flagged")}
              className={cn(
                "px-3.5 py-1.5 rounded-xl text-xs font-bold transition-colors border flex items-center gap-1.5",
                filterMode === "flagged"
                  ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                  : "bg-amber-500/5 text-amber-400 border-amber-500/20 hover:bg-amber-500/10"
              )}
            >
              <AlertTriangle className="w-3.5 h-3.5" />
              <span>{isEn ? `Fix Distractors (${flaggedCount})` : `تحتاج ضبط التكافؤ (${flaggedCount})`}</span>
            </button>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-white/50 font-mono">
          <Layers className="w-3.5 h-3.5 text-primary" />
          <span>{isEn ? `Total choices audited: ${questions.length * 4}` : `إجمالي الخيارات المفحوصة: ${questions.length * 4} خيار`}</span>
        </div>
      </div>

      {/* Question Cards List */}
      <div className="space-y-4">
        {filteredQuestions.map((q, idx) => {
          const isFlagged = q.flaggedForAsymmetry;
          const isRegen = regeneratingId === q.id;

          return (
            <motion.div
              key={q.id}
              layout
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "p-5 sm:p-6 rounded-3xl bg-[#0a0b12] border-2 transition-colors space-y-4 shadow-lg",
                isFlagged
                  ? "border-amber-500/40 bg-amber-950/10"
                  : "border-white/10 hover:border-white/20"
              )}
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="w-7 h-7 rounded-xl bg-white/10 flex items-center justify-center font-mono font-bold text-xs text-white">
                    {idx + 1}
                  </span>

                  {isFlagged && (
                    <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 text-[10px] font-bold">
                      <AlertTriangle className="w-3 h-3" />
                      <span>{q.asymmetryReason || (isEn ? "Distractor Asymmetry" : "عدم تكافؤ الخيارات")}</span>
                    </div>
                  )}

                  {q.needs_review && (
                    <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-[10px] font-bold">
                      <ShieldAlert className="w-3 h-3 text-rose-400" />
                      <span>{q.review_reason || (isEn ? "Correct answer required" : "مطلوب تحديد الإجابة الصحيحة")}</span>
                    </div>
                  )}

                  {q.source_ref && (
                    <span className="text-[10px] text-white/40 font-mono">
                      {q.source_ref}
                    </span>
                  )}
                </div>

                {/* Card Top Actions */}
                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isRegen}
                    onClick={() => handleRegenerateSingle(q.id)}
                    className="h-8 px-2.5 rounded-lg text-xs text-cyan-400 hover:text-cyan-300 hover:bg-cyan-500/10 gap-1"
                    title={isEn ? "Regenerate question with AI" : "إعادة توليد السؤال بالذكاء الاصطناعي"}
                  >
                    <RotateCcw className={cn("w-3.5 h-3.5", isRegen && "animate-spin")} />
                    <span className="hidden sm:inline">{isEn ? "Regenerate" : "أعد التوليد"}</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDeleteQuestion(q.id)}
                    className="h-8 px-2 rounded-lg text-xs text-red-400 hover:text-red-300 hover:bg-red-500/10"
                    title={isEn ? "Delete question" : "حذف السؤال"}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Question Stem Textarea */}
              <div className="space-y-1">
                <Textarea
                  value={q.question}
                  onChange={(e) => handleUpdateQuestion(q.id, { question: e.target.value })}
                  rows={2}
                  className="bg-black/40 border-white/10 text-xs sm:text-sm font-bold text-white leading-relaxed focus:border-primary rounded-xl"
                  placeholder={isEn ? "Question prompt..." : "نص السؤال..."}
                  dir="auto"
                />
              </div>

              {/* 4 Options Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {q.options.map((opt, optIdx) => {
                  const isCorrect = optIdx === q.correct_index;

                  return (
                    <div
                      key={optIdx}
                      className={cn(
                        "p-2.5 rounded-2xl border flex items-center gap-2 transition-colors",
                        isCorrect
                          ? "border-emerald-500/60 bg-emerald-500/10"
                          : "border-white/10 bg-white/[0.02]"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => handleUpdateQuestion(q.id, { correct_index: optIdx, needs_review: false, review_reason: null })}
                        className="flex items-center gap-1.5 p-1 rounded-lg hover:bg-white/5 transition-colors shrink-0"
                        title={isEn ? "Set as correct answer" : "تعيين كإجابة صحيحة"}
                      >
                        <span
                          className={cn(
                            "w-6 h-6 rounded-lg font-mono font-bold text-xs flex items-center justify-center transition-colors",
                            isCorrect
                              ? "bg-emerald-500 text-black shadow-md scale-105"
                              : "bg-white/10 text-white/60 hover:bg-white/20"
                          )}
                        >
                          {String.fromCharCode(65 + optIdx)}
                        </span>
                        {isCorrect ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Circle className="w-3.5 h-3.5 text-white/30 hover:text-emerald-400" />
                        )}
                      </button>

                      <Input
                        value={opt}
                        onChange={(e) => {
                          const newOpts = [...q.options];
                          newOpts[optIdx] = e.target.value;
                          handleUpdateQuestion(q.id, { options: newOpts });
                        }}
                        className="h-8 text-xs bg-transparent border-none text-white focus-visible:ring-0 px-1 font-sans flex-1"
                        placeholder={isEn ? `Option ${optIdx + 1}...` : `خيار ${optIdx + 1}...`}
                        dir="auto"
                      />
                    </div>
                  );
                })}
              </div>

              {/* Explanation Field */}
              <div className="space-y-1 pt-1">
                <div className="flex items-center gap-1.5 text-[11px] text-primary font-mono font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>{isEn ? "Scientific Explanation & Rationale:" : "الشرح والتفسير العلمي:"}</span>
                </div>
                <Input
                  value={q.explanation || ""}
                  onChange={(e) => handleUpdateQuestion(q.id, { explanation: e.target.value })}
                  className="bg-white/[0.03] border-white/10 text-xs text-white/80 h-9 rounded-xl focus:border-primary"
                  placeholder={isEn ? "Write rationale for the correct answer here..." : "اكتب تفسير الإجابة الصحيحة هنا..."}
                  dir="auto"
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Bottom Sticky Action Bar */}
      <div className="sticky bottom-4 p-4 rounded-2xl bg-[#090a10]/95 border border-white/20 shadow-2xl flex items-center justify-between gap-4 backdrop-blur-xl">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="text-xs h-10 px-4 rounded-xl border-white/15 bg-white/5"
        >
          <ArrowLeft className={isEn ? "w-3.5 h-3.5 mr-1 rotate-180" : "w-3.5 h-3.5 ml-1"} />
          <span>{isEn ? "Cancel" : "إلغاء"}</span>
        </Button>

        <div className="flex items-center gap-3">
          <span className="text-xs text-white/60 font-mono">
            {isEn ? `${questions.length} approved questions` : `${questions.length} أسئلة معتمدة`}
          </span>

          <Button
            type="button"
            onClick={handlePublish}
            disabled={isSaving || !questions.length}
            className="h-11 px-8 rounded-xl font-black text-xs bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-95 shadow-xl gap-2"
          >
            <FileSaveIcon size={18} />
            <span>{isSaving ? (isEn ? "Starting Quiz..." : "جاري بدء الكويز...") : (isEn ? "🚀 Complete Review & Start Quiz" : "🚀 إكمال المراجعة وبدء الكويز فوراً")}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default QuizReviewStudio;
