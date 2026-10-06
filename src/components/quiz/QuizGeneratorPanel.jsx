import React, { useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate, useLocation } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Upload, FileText, Loader2, Sparkles, ClipboardCheck, AlertTriangle, ClipboardPaste, Languages } from "lucide-react";
import { getQuizCost } from "@/lib/creditCosts";
import {
  allocateQuizQuestions,
  buildQuizAnalysisSample,
  buildQuizChunks,
  localAnalyzeQuizSource,
  normalizeQuizResult,
  normalizeQuizSourceAnalysis,
  normalizeUniversalParsedQuiz,
  QUIZ_MAX_QUESTIONS,
  runQuizChunkPool,
  detectLanguage,
  getRecommendedQuizLanguage,
} from "@/lib/quizQuality";
import { tryOfflineExtraction } from "@/lib/offlineExamParser";
import { extractTextFromFile } from "@/lib/fileProcessing";
import { QuizReviewStudio } from "@/components/quiz/QuizReviewStudio";
import CreditCostBadge from "@/components/CreditCostBadge";
import ShimmerButton from "@/components/ui/ShimmerButton";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

const DIFFICULTIES = [
  { id: "easy", labelAr: "سهل", labelEn: "Easy" },
  { id: "mixed", labelAr: "متنوع", labelEn: "Mixed" },
  { id: "hard", labelAr: "صعب", labelEn: "Hard" },
];

const QUIZ_PROFILES = [
  { id: "balanced", label: "Balanced", hintAr: "مراجعة شاملة", hintEn: "Comprehensive" },
  { id: "exam", label: "Exam", hintAr: "شبه الامتحان", hintEn: "Exam Simulation" },
  { id: "concepts", label: "Concepts", hintAr: "فهم عميق", hintEn: "Deep Concepts" },
  { id: "application", label: "Cases", hintAr: "تطبيق وحالات", hintEn: "Clinical Cases" },
  { id: "traps", label: "Traps", hintAr: "أخطاء شائعة", hintEn: "Common Traps" },
];

export default function QuizGeneratorPanel() {
  const navigate = useNavigate();
  const location = useLocation();
  const queryMode = new URLSearchParams(location.search).get("mode");
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const fileRef = useRef(null);
  const [mode, setMode] = useState("text"); // text | file
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [numQuestions, setNumQuestions] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [quizProfile, setQuizProfile] = useState("balanced");
  const [quizLanguage, setQuizLanguage] = useState("auto"); // auto | en | ar
  const [showExplanations, setShowExplanations] = useState(true);
  const [sourceMode, setSourceMode] = useState("auto");
  const [sourceAnalysis, setSourceAnalysis] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [loading, setLoading] = useState(false);
  const [fileProgress, setFileProgress] = useState(null);
  const [generationProgress, setGenerationProgress] = useState(null);
  const cancelRequestedRef = useRef(false);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewQuestions, setReviewQuestions] = useState([]);
  const [reviewSourceType, setReviewSourceType] = useState("ai_generated");
  const [skipReview, setSkipReview] = useState(false);

  const offlineExam = useMemo(() => {
    if (!text || text.trim().length < 50) return null;
    const res = tryOfflineExtraction(text);
    return res.success && res.questions.length >= 2 ? res : null;
  }, [text]);

  const quickAnalysis = useMemo(() => {
    if (!text || text.trim().length < 80) return null;
    return localAnalyzeQuizSource(text);
  }, [text]);

  const { detectedLang, recommendedLang, isBilingual } = useMemo(() => {
    if (!text || text.trim().length < 30) {
      return { detectedLang: "ar", recommendedLang: "ar", isBilingual: false };
    }
    const detected = detectLanguage(text);
    const recommended = getRecommendedQuizLanguage(text);
    return {
      detectedLang: detected,
      recommendedLang: recommended,
      isBilingual: detected === "mixed",
    };
  }, [text]);
  const analysisForUi = sourceAnalysis || quickAnalysis;
  const effectiveMode = sourceMode === "auto" ? (analysisForUi?.recommendation || "generate") : sourceMode;
  const targetQuestionCount = effectiveMode === "extract"
    ? Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(analysisForUi?.question_count || analysisForUi?.recommended_count || numQuestions) || 10))
    : Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(numQuestions) || 10));
  const quizCost = getQuizCost(targetQuestionCount, false);

  const analyzeSource = async (value) => {
    const fallback = localAnalyzeQuizSource(value);
    setAnalyzing(true);
    try {
      const response = await base44.functions.invoke("generateStudyContent", {
        task: "quiz_source_analysis",
        text: buildQuizAnalysisSample(value),
      });
      const remote = response?.data?.result || response?.data;
      const analysis = normalizeQuizSourceAnalysis(remote, fallback);
      setSourceAnalysis(analysis);
      return analysis;
    } catch (error) {
      console.warn("[quiz] AI source analysis unavailable; using local analysis", error);
      setSourceAnalysis(fallback);
      return fallback;
    } finally {
      setAnalyzing(false);
    }
  };

  const handleFile = async (file) => {
    if (!file) return;
    setFileName(file.name);
    setSourceAnalysis(null);
    setFileProgress({ current: 0, total: 100, phase: "extract" });
    setLoading(true);
    try {
      const extracted = await extractTextFromFile(file, {
        onProgress: (progress) => setFileProgress(progress),
      });
      setText(extracted);
      if (!title) setTitle(file.name.replace(/\.[^.]+$/, ""));
      await analyzeSource(extracted);
      toast.success("تم استخراج النص وتحليل نوع المحتوى");
    } catch (err) {
      toast.error(err.message || "معرفناش نقرأ الملف");
      setFileName("");
    } finally {
      setLoading(false);
      setFileProgress(null);
    }
  };

  const handleGenerate = async () => {
    if (!text || text.trim().length < 30) return toast.error("المحتوى قليل جداً");
    if (!title.trim()) return toast.error("اكتب عنوان للكويز");
    setLoading(true);
    setGenerationProgress(null);
    cancelRequestedRef.current = false;
    let chargedJob = null;
    try {
      const me = await base44.auth.me();
      const rawAnalysis = sourceMode === "auto"
        ? (sourceAnalysis || await analyzeSource(text))
        : { ...(sourceAnalysis || localAnalyzeQuizSource(text)), recommendation: sourceMode };
      const analysis = normalizeQuizSourceAnalysis(rawAnalysis, localAnalyzeQuizSource(text));
      if (sourceMode !== "auto") analysis.recommendation = sourceMode;
      const selectedMode = analysis.recommendation || "generate";
      const requestedQuestions = selectedMode === "extract"
        ? Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(analysis.question_count || analysis.recommended_count || targetQuestionCount) || targetQuestionCount))
        : targetQuestionCount;
      const jobKey = crypto.randomUUID();
      const charge = await base44.functions.invoke("chargeAiJob", {
        action: "charge",
        jobKey,
        task: "quiz",
        questionCount: requestedQuestions,
      });
      chargedJob = { jobKey, cost: charge.data.cost };
      const actualRequestedQs = requestedQuestions;
      const chunkBuild = buildQuizChunks(text, { mode: selectedMode, targetQuestions: actualRequestedQs });
      const questionPlan = allocateQuizQuestions(actualRequestedQs, chunkBuild.chunks);
      const chunkTasks = chunkBuild.chunks
        .map((chunk, index) => ({
          ...chunk,
          questionCount: selectedMode === "extract"
            ? Math.max(1, Math.min(40, localAnalyzeQuizSource(chunk.text).question_count || questionPlan[index] || 1))
            : (questionPlan[index] || 0),
        }))
        .filter((chunk) => chunk.questionCount > 0);
      if (!chunkTasks.length) throw new Error("NO_QUESTIONS");
      setGenerationProgress({ completed: 0, total: chunkTasks.length, label: chunkTasks[0].label });
      const effectiveLanguage = quizLanguage === "auto" ? recommendedLang : quizLanguage;

      const pool = await runQuizChunkPool(chunkTasks, async (chunk) => {
        const res = await base44.functions.invoke("generateStudyContent", {
          task: "quiz",
          text: chunk.text,
          numQuestions: chunk.questionCount,
          difficulty,
          quizProfile,
          withExplanation: showExplanations,
          quizMode: selectedMode,
          sourceAnalysis: { ...analysis, question_count: chunk.questionCount },
          language: effectiveLanguage,
        });
        return normalizeQuizResult(res?.data?.result, {
          desiredCount: chunk.questionCount,
          mode: selectedMode,
          sourceAnalysis: { ...analysis, question_count: chunk.questionCount },
          difficulty,
          requireExplanation: showExplanations,
          sourceText: chunk.text,
          defaultSourceRef: chunk.sourceRef,
        });
      }, {
        concurrency: 2,
        retries: 1,
        shouldCancel: () => cancelRequestedRef.current,
        onProgress: ({ completed, total, index }) => setGenerationProgress({
          completed,
          total,
          label: chunkTasks[Math.min(index + 1, chunkTasks.length - 1)]?.label || "",
        }),
      });
      if (pool.cancelled) throw new Error("QUIZ_CANCELLED");

      const allQuestions = pool.values.flatMap((result) => result?.questions || []);
      const failedChunks = pool.failures.length;
      const totalStats = pool.values.reduce((total, result) => {
        if (!total) return { ...result.stats };
        total.requested += result.stats?.requested || 0;
        total.returned += result.stats?.returned || 0;
        total.accepted += result.stats?.accepted || 0;
        total.invalid_removed += result.stats?.invalid_removed || 0;
        total.duplicates_removed += result.stats?.duplicates_removed || 0;
        return total;
      }, null);

      const finalQuality = normalizeQuizResult({ questions: allQuestions }, {
        desiredCount: actualRequestedQs,
        mode: selectedMode,
        sourceAnalysis: analysis,
        difficulty,
        requireExplanation: showExplanations,
        sourceText: text,
      });
      const questions = finalQuality.questions;
      if (!questions.length) throw new Error("NO_QUESTIONS");
      const qualityStats = {
        ...finalQuality.stats,
        chunk_attempts: chunkTasks.length,
        chunk_failures: failedChunks,
        source_chunks: chunkBuild.sourceChunkCount,
        source_sampled: chunkBuild.sampled,
        first_pass_stats: totalStats,
        evidence_coverage_rate: finalQuality.stats.evidence_coverage_rate,
        needs_review: finalQuality.stats.needs_review,
      };

      if (chargedJob) {
        await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey }).catch(() => {});
      }

      // P1.1 Governing rule: Pass through QuizReviewStudio before publishing
      if (!skipReview) {
        setReviewQuestions(questions);
        setReviewSourceType(selectedMode === "extract" ? "ai_extracted" : "ai_generated");
        setReviewOpen(true);
        toast.success(`تم إنشاء وتدقيق ${questions.length} سؤال · جاري فتح استوديو المراجعة`);
        return;
      }

      const quiz = await base44.entities.StandaloneQuiz.create({
        title: title.trim(),
        owner_id: me.id,
        owner_name: me.full_name || me.email,
        questions,
        is_public: true,
        show_explanations: showExplanations,
        quiz_mode: selectedMode,
        quiz_profile: quizProfile,
        source_analysis: analysis,
        quality_stats: qualityStats,
      });
      toast.success(
        qualityStats.needs_review
          ? `تم إنشاء ${questions.length} سؤال · ${qualityStats.needs_review} يحتاج مراجعة`
          : `تم إنشاء ${questions.length} سؤال · جودة ${qualityStats.quality_score}%`,
      );
      navigate(`/q/${quiz.id}`);
    } catch (err) {
      if (chargedJob) await base44.functions.invoke("chargeAiJob", { action: "refund", ...chargedJob }).catch(() => {});
      const code = err?.response?.data?.error || err.message || "";
      if (/QUIZ_CANCELLED/i.test(code)) toast.info("تم إلغاء الكويز واسترداد الكريدتس");
      else if (/QUOTA|429|RATE.?LIMIT/i.test(code)) toast.error("الـ AI وصل للحد الأقصى دلوقتي، جرب بعد شوية");
      else if (/INSUFFICIENT_CREDITS/i.test(code)) toast.error("رصيد الكريدتس لا يكفي للكويز ده");
      else if (/NO_QUESTIONS/i.test(code)) toast.error("معرفناش نولّد أسئلة — جرب محتوى أوضح");
      else toast.error("حصل خطأ في توليد الكويز");
    } finally {
      setLoading(false);
      setGenerationProgress(null);
      cancelRequestedRef.current = false;
    }
  };

  const handleRunUniversalParser = async () => {
    if (!text || text.trim().length < 25) return toast.error("المحتوى قليل جداً للاستخراج؛ الصق نصاً كافياً أو ارفع ملفاً");
    setLoading(true);
    setGenerationProgress({ completed: 0, total: 1, label: "جاري تحليل النص واستخراج الأسئلة بالبارسر الخارق..." });
    try {
      const response = await base44.functions.invoke("generateStudyContent", {
        task: "text_exam_parser",
        text: text.slice(0, 35000),
      });
      const remote = response?.data?.result || response?.data;
      const parsed = normalizeUniversalParsedQuiz(remote, text);
      if (!parsed.questions.length) {
        throw new Error("لم يتم العثور على أسئلة نصية واضحة في النص");
      }
      setReviewQuestions(parsed.questions);
      setReviewSourceType("universal_text_parser");
      setReviewOpen(true);
      toast.success(`تم استخراج ${parsed.questions.length} سؤال بنجاح!`);
    } catch (err) {
      toast.error(err.message || "فشل استخراج الأسئلة بالبارسر");
    } finally {
      setLoading(false);
      setGenerationProgress(null);
    }
  };

  const handleSaveFromStudio = async (publishedData) => {
    try {
      setLoading(true);
      const me = await base44.auth.me().catch(() => ({}));
      const quiz = await base44.entities.StandaloneQuiz.create({
        title: publishedData.title || title.trim(),
        owner_id: me?.id,
        owner_name: me?.full_name || me?.email || "طالب",
        questions: publishedData.questions,
        is_public: true,
        show_explanations: showExplanations,
        quiz_mode: effectiveMode,
        quiz_profile: quizProfile,
        source_type: publishedData.sourceType,
        created_at: new Date().toISOString(),
      });
      toast.success(`تم اعتماد ونشر الكويز بنجاح (${publishedData.questions.length} سؤال) ✓`);
      navigate(`/q/${quiz.id}`);
    } catch (err) {
      toast.error("فشل حفظ الكويز في قاعدة البيانات");
    } finally {
      setLoading(false);
    }
  };

  if (reviewOpen) {
    return (
      <QuizReviewStudio
        initialQuestions={reviewQuestions}
        quizTitle={title}
        sourceText={text}
        sourceType={reviewSourceType}
        onCancel={() => setReviewOpen(false)}
        isSaving={loading}
        onSaveAndPublish={handleSaveFromStudio}
      />
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-3xl p-6 sm:p-8 bg-[#090a10] border border-white/15 shadow-2xl relative overflow-hidden"
    >
      {/* ─── EBE Header ─── */}
      <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-5 border-b border-white/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-white font-heading">
                {isEn ? "Theory Quiz Generator" : "أنشئ كويز نظري"}
              </h2>
              <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-[10px] font-mono font-bold tracking-wider">
                EBE • MCQs
              </span>
            </div>
            <p className="text-xs text-white/60 mt-0.5">
              {isEn 
                ? "Text MCQs, lecture notes & final block exams for all disciplines (zero images)"
                : "توليد كويزات نصية متعددة الخيارات من المحاضرات والملخصات لجميع التخصصات"}
            </p>
          </div>
        </div>
        {/* Cost lives with the header — the user reads what it costs BEFORE
            configuring anything, not as a floating pill above the button. */}
        <div className="shrink-0">
          <CreditCostBadge cost={quizCost} label={isEn ? "Quiz Cost" : "تكلفة العملية"} variant="pill" />
        </div>
      </div>

      {/* Quiz Title */}
      <div className="mb-5">
        <label className="text-xs font-bold text-white/70 mb-2 block">
          {isEn ? "Quiz Title (Optional)" : "عنوان الكويز (اختياري)"}
        </label>
        <Input
          placeholder={isEn ? "Quiz title (e.g. Pharmacology Exam Review)" : "عنوان الكويز (مثلاً: مراجعة الفصل الثالث)"}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="h-12 text-base font-bold bg-[#0d0f17] border-white/20 focus:border-cyan-400 text-white placeholder:text-white/35 rounded-xl"
          dir="auto"
        />
      </div>

      {/* P0.1 Offline Exam Detected Banner (0 credits, 100% free) */}
      {offlineExam && (
        <div className="mb-5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="space-y-1">
            <span className="text-xs font-black text-emerald-400 flex items-center gap-1.5 font-heading">
              <Sparkles className="w-4 h-4 text-emerald-400" />
              {isEn ? `Ready-made questions detected (${offlineExam.questions.length} questions) ⚡` : `تم رصد بنك أسئلة جاهز (${offlineExam.questions.length} سؤال) ⚡`}
            </span>
            <p className="text-[11px] text-white/70 leading-relaxed">
              {isEn 
                ? "Parsed 100% locally. You can review and approve immediately for 0 credits (Free)."
                : "تم استخراج الأسئلة والإجابات بنجاح محلياً. يمكنك مراجعتها واعتمادها فوراً بـ 0 كريدت (مجاناً 100%)."}
            </p>
          </div>
          <Button
            type="button"
            size="sm"
            onClick={() => {
              setReviewQuestions(offlineExam.questions);
              setReviewSourceType("offline_parser");
              setReviewOpen(true);
            }}
            className="text-xs font-black bg-emerald-400 hover:bg-emerald-500 text-black shrink-0 px-4 py-2 rounded-xl shadow-md gap-1.5"
          >
            <ClipboardCheck className="w-3.5 h-3.5" />
            <span>{isEn ? "Review & Publish (0 Credits) ✓" : "مراجعة واعتماد الأسئلة (0 كريدت) ✓"}</span>
          </Button>
        </div>
      )}

      {/* Sub-tabs: Paste text vs Upload file */}
      <div className="grid grid-cols-2 gap-2 mb-5 p-1.5 bg-[#0d0f17] rounded-2xl border border-white/10">
        <button
          type="button"
          onClick={() => setMode("text")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            mode === "text"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <ClipboardPaste className="w-4 h-4" />
          <span>{isEn ? "Paste Text" : "الصق نص المحاضرة"}</span>
        </button>
        <button
          type="button"
          onClick={() => setMode("file")}
          className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-colors ${
            mode === "file"
              ? "bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm"
              : "text-white/60 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <Upload className="w-4 h-4" />
          <span>{isEn ? "Upload Document" : "ارفع ملف (PDF / Word)"}</span>
        </button>
      </div>

      {mode === "file" ? (
        <div
          role="button"
          tabIndex={0}
          onClick={() => fileRef.current?.click()}
          onKeyDown={(event) => {
            if (event.key === "Enter" || event.key === " ") {
              event.preventDefault();
              fileRef.current?.click();
            }
          }}
          onDragOver={(e) => { e.preventDefault(); }}
          onDrop={(e) => { e.preventDefault(); handleFile(e.dataTransfer.files?.[0]); }}
          className="border-2 border-dashed border-white/20 hover:border-cyan-400 bg-white/[0.02] hover:bg-cyan-500/[0.03] rounded-2xl p-8 text-center cursor-pointer transition-colors mb-5"
        >
          {fileName ? (
            <div>
              <div className="flex items-center justify-center gap-2 text-cyan-400 font-bold text-base">
                <FileText className="w-5 h-5" /> {fileName}
              </div>
              {fileProgress && (
                <p className="mt-2 text-xs text-white/60" aria-live="polite">
                  {fileProgress.phase === "ocr" ? (isEn ? "OCR reading text..." : "جاري قراءة النص...") : (isEn ? "Extracting document text..." : "جاري استخراج النص...")}
                  {Number.isFinite(Number(fileProgress.current)) && Number.isFinite(Number(fileProgress.total))
                    ? ` ${Math.round((Number(fileProgress.current) / Math.max(1, Number(fileProgress.total))) * 100)}%`
                    : ""}
                </p>
              )}
              <span className="inline-block mt-3 text-xs text-cyan-400/80 underline font-semibold">
                {isEn ? "Click to change file" : "اضغط لاختيار ملف آخر"}
              </span>
            </div>
          ) : (
            <>
              <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center mx-auto mb-3">
                <Upload className="w-6 h-6" />
              </div>
              <p className="font-bold text-white text-base">
                {isEn ? "Drag & drop file or click to browse" : "اسحب الملف هنا أو اضغط للاختيار"}
              </p>
              <p className="text-xs text-white/50 mt-1">
                {isEn ? "PDF • Word (DOCX) • TXT • PowerPoint" : "يدعم ملفات PDF، Word، TXT، وعروض البوربوينت"}
              </p>
            </>
          )}
          <input
            ref={fileRef}
            type="file"
            accept=".pdf,.pptx,.docx,.txt,.csv,.html,.md"
            className="hidden"
            onChange={(event) => {
              const file = event.target.files?.[0];
              event.target.value = "";
              handleFile(file);
            }}
          />
        </div>
      ) : (
        <Textarea
          placeholder={isEn ? "Paste lecture notes, study text, or existing questions here..." : "الصق نص المحاضرة، الملخص، أو حتى أسئلتك الجاهزة مع إجاباتها وسيقوم الذكاء الاصطناعي بتحويلها لكويز منظم..."}
          value={text}
          onChange={(e) => { setText(e.target.value); setSourceAnalysis(null); }}
          className="min-h-[160px] mb-5 text-sm leading-relaxed bg-[#0d0f17] border-white/20 focus:border-cyan-400 text-white placeholder:text-white/35 rounded-xl"
          dir="auto"
        />
      )}

      {/* Source Processing Mode */}
      <div className="mb-5 p-4 rounded-2xl bg-[#0d0f17] border border-white/10">
        <div className="flex items-start gap-2.5 mb-3">
          <ClipboardCheck className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-bold text-white">
              {isEn ? "Source Processing Mode" : "طريقة معالجة المحتوى"}
            </p>
            <p className="text-xs text-white/50">
              {isEn ? "AI automatically distinguishes between pre-made questions, study notes, and mixed content" : "Black Fighters يميّز تلقائياً بين بنك أسئلة جاهز، شرح دراسي، أو محتوى مختلط"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: "auto", labelAr: "⚡ ذكي تلقائي", labelEn: "⚡ Smart Auto" }, 
            { id: "extract", labelAr: "📑 استخراج فقط", labelEn: "📑 Extract Only" }, 
            { id: "hybrid", labelAr: "🔄 استخراج + توليد", labelEn: "🔄 Hybrid" }, 
            { id: "generate", labelAr: "🎯 توليد جديد", labelEn: "🎯 Generate" }
          ].map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setSourceMode(item.id)}
              className={`min-h-10 rounded-xl text-xs font-bold border transition-colors ${
                sourceMode === item.id
                  ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm"
                  : "bg-white/[0.03] text-white/70 border-white/10 hover:border-white/20 hover:text-white"
              }`}
            >
              {isEn ? item.labelEn : item.labelAr}
            </button>
          ))}
        </div>
        {sourceMode === "auto" && (analyzing || analysisForUi) && (
          <p className="mt-2.5 text-xs text-cyan-400/80 font-medium">
            {analyzing 
              ? (isEn ? "Analyzing content structure..." : "جاري فحص بنية المحتوى...") 
              : `${isEn ? "Decision" : "القرار"}: ${analysisForUi.recommendation === "extract" ? (isEn ? "Extract existing questions" : "استخراج الأسئلة الجاهزة الموجودة في الملف") : analysisForUi.recommendation === "hybrid" ? (isEn ? "Extract + augment" : "استخراج الأسئلة الموجودة وتوليد المزيد") : (isEn ? "Generate questions from study text" : "توليد بنك أسئلة جديد من الشرح")} — ${analysisForUi.question_count || 0} ${isEn ? "questions found" : "سؤال مرصود"}`}
          </p>
        )}
      </div>

      {/* تحذير: أسئلة بدون إجابات */}
      {analysisForUi && !analysisForUi.has_answers && (analysisForUi.source_type === "question_bank" || effectiveMode === "extract") && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-5 p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-start gap-2.5"
        >
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-amber-300">
              {isEn ? "Unanswered questions detected — AI will solve them! 🧠" : "أسئلة بدون إجابات — الذكاء الاصطناعي هيحلّها! 🧠"}
            </p>
            <p className="text-xs text-amber-300/80 mt-0.5">
              {isEn 
                ? "Your document contains questions without answer keys. AI will accurately determine and explain the correct answers."
                : "المحتوى فيه أسئلة بدون إجابات مكتوبة. الـ AI هيستخدم معلوماته الأكاديمية ليحدد الإجابة الصحيحة لكل سؤال ويشرحها."}
            </p>
          </div>
        </motion.div>
      )}

      {/* Quiz Language Selector */}
      <div className="mb-5 p-4 rounded-2xl bg-[#0d0f17] border border-white/10 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Languages className="w-5 h-5 text-cyan-400 shrink-0" />
            <div>
              <p className="text-sm font-bold text-white">
                {isEn ? "Quiz Language" : "لغة الأسئلة والكويز"}
              </p>
              <p className="text-xs text-white/50">
                {isEn
                  ? "Medical and scientific curricula default to English; Arabic for humanities"
                  : "كليات الطب والعلوم تدرس بالإنجليزي؛ الكليات النظرية بالعربي"}
              </p>
            </div>
          </div>
          <span className="text-[11px] font-mono font-bold text-cyan-300 bg-cyan-500/10 px-2.5 py-1 rounded-full border border-cyan-500/20">
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
              className={`rounded-xl border p-2.5 text-center transition-colors ${
                quizLanguage === item.id
                  ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300 shadow-sm"
                  : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20"
              }`}
            >
              <span className="block text-xs font-black">{isEn ? item.labelEn : item.labelAr}</span>
              <span className="block text-[10px] opacity-75 mt-0.5">{isEn ? item.hintEn : item.hintAr}</span>
            </button>
          ))}
        </div>

        {/* Smart Bilingual / Medical Recommendation Banner */}
        {isBilingual && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-3 rounded-xl bg-cyan-500/10 border border-cyan-500/25 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400 shrink-0" />
              <span className="text-xs text-cyan-200">
                {isEn
                  ? "Bilingual / Medical content detected — English is selected by default for medical student accuracy."
                  : "تم رصد محتوى ثنائي اللغة / طبي — تم اختيار الإنجليزية (English 🇬🇧) افتراضياً لأن دراسة وامتحانات الطب بالإنجليزية."}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setQuizLanguage(quizLanguage === "ar" ? "en" : "ar")}
              className="text-[11px] underline text-cyan-300 hover:text-white shrink-0 font-bold"
            >
              {quizLanguage === "ar" ? "التبديل إلى English 🇬🇧" : "التبديل إلى العربية 🇪🇬"}
            </button>
          </motion.div>
        )}
      </div>

      {/* Options — تختفي في وضع الاستخراج */}
      <AnimatePresence initial={false}>
        {effectiveMode !== "extract" && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="grid sm:grid-cols-2 gap-4 mb-5">
              {/* Question Count */}
              <div className="p-4 rounded-2xl bg-[#0d0f17] border border-white/10">
                <div className="flex items-center justify-between mb-2">
                  <label className="text-xs font-bold text-white/80 block">
                    {isEn ? "Number of Questions" : "عدد الأسئلة"}
                  </label>
                  <span className="text-xs font-mono font-bold text-cyan-400">
                    {numQuestions} {isEn ? "questions" : "سؤال"}
                  </span>
                </div>
                {/* Quick Chips */}
                <div className="flex flex-wrap gap-1.5 mb-2.5">
                  {[5, 10, 15, 20, 30, 50, 75, 100].map((count) => (
                    <button
                      key={count}
                      type="button"
                      onClick={() => setNumQuestions(count)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-mono font-bold transition-colors border ${
                        Number(numQuestions) === count
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm"
                          : "bg-white/[0.04] text-white/60 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {count}
                    </button>
                  ))}
                </div>
                <Input
                  type="number"
                  min={3}
                  max={100}
                  value={numQuestions}
                  onChange={(e) => setNumQuestions(e.target.value)}
                  className="h-10 bg-[#08090d] border-white/20 text-white font-mono font-bold rounded-lg"
                />
              </div>

              {/* Difficulty */}
              <div className="p-4 rounded-2xl bg-[#0d0f17] border border-white/10">
                <label className="text-xs font-bold text-white/80 mb-2 block">
                  {isEn ? "Difficulty Level" : "مستوى الصعوبة"}
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDifficulty(d.id)}
                      className={`py-2.5 rounded-xl text-xs font-bold transition-colors border ${
                        difficulty === d.id
                          ? "bg-cyan-500/20 text-cyan-300 border-cyan-400/50 shadow-sm"
                          : "bg-white/[0.04] text-white/60 border-white/10 hover:text-white hover:border-white/20"
                      }`}
                    >
                      {isEn ? d.labelEn : d.labelAr}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Quiz Profile / Focus */}
            <div className="mb-5 p-4 rounded-2xl bg-[#0d0f17] border border-white/10">
              <label className="text-xs font-bold text-white/80 mb-2.5 block">
                {isEn ? "Quiz Style / Focus" : "نمط الاختبار والتركيز"}
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {[
                  { id: "balanced", labelAr: "امتحان شامل", labelEn: "Balanced", hintAr: "مزيج متوازن", hintEn: "Balanced Mix" },
                  { id: "exam", labelAr: "محاكاة الفاينال", labelEn: "Exam Sim", hintAr: "أسئلة مصيرية", hintEn: "Standard Final" },
                  { id: "concepts", labelAr: "مفاهيم وشرح", labelEn: "Concepts", hintAr: "فهم عميق", hintEn: "Deep Theory" },
                  { id: "application", labelAr: "حالات وتطبيق", labelEn: "Applied Cases", hintAr: "تطبيق عملي", hintEn: "Case Studies" },
                  { id: "traps", labelAr: "فخاخ وأخطاء", labelEn: "Pitfalls", hintAr: "نقاط الخداع", hintEn: "Trick Questions" },
                ].map((profile) => (
                  <button
                    key={profile.id}
                    type="button"
                    onClick={() => setQuizProfile(profile.id)}
                    className={`rounded-xl border p-2.5 text-center transition-colors ${
                      quizProfile === profile.id
                        ? "border-cyan-400/50 bg-cyan-500/15 text-cyan-300 shadow-sm"
                        : "border-white/10 bg-white/[0.03] text-white/60 hover:text-white hover:border-white/20"
                    }`}
                  >
                    <span className="block text-xs font-black">{isEn ? profile.labelEn : profile.labelAr}</span>
                    <span className="block text-[10px] opacity-75 mt-0.5">{isEn ? profile.hintEn : profile.hintAr}</span>
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="space-y-2.5 mb-6">
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0d0f17] border border-white/10">
          <div>
            <p className="text-sm font-bold text-white">
              {isEn ? "Review questions in Studio before saving" : "مراجعة الأسئلة في الاستوديو قبل الحفظ"}
            </p>
            <p className="text-xs text-white/50">
              {isEn ? "Audit distractors and edit questions before saving to your quiz bank" : "فحص تكافؤ الخيارات وتعديل أي سؤال قبل إضافته للبنك"}
            </p>
          </div>
          <Switch checked={!skipReview} onCheckedChange={(val) => setSkipReview(!val)} />
        </div>

        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-[#0d0f17] border border-white/10">
          <div>
            <p className="text-sm font-bold text-white">
              {isEn ? "Show explanation after answering" : "إظهار الشرح والتفسير بعد الإجابة"}
            </p>
            <p className="text-xs text-white/50">
              {isEn ? "Clarifies rationale for correct and incorrect choices" : "توضيح سبب صحة أو خطأ كل خيار للتعلم السريع"}
            </p>
          </div>
          <Switch checked={showExplanations} onCheckedChange={setShowExplanations} />
        </div>
      </div>

      {generationProgress && (
        <div className="mb-4 rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-3.5" aria-live="polite">
          <div className="mb-2 flex items-center justify-between gap-3 text-xs font-bold text-cyan-300">
            <span>{generationProgress.label || (isEn ? "Analyzing source..." : "جاري تحليل المصدر...")}</span>
            <span className="tabular-nums font-mono">{generationProgress.completed}/{generationProgress.total}</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-black/50 border border-white/10">
            <div
              className="h-full rounded-full bg-cyan-400 transition-[width] duration-300 shadow-[0_0_10px_rgba(6,182,212,0.5)]"
              style={{ width: `${Math.round((generationProgress.completed / Math.max(1, generationProgress.total)) * 100)}%` }}
            />
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        {(sourceMode === "extract" || analysisForUi?.recommendation === "extract" || text.length > 50) && (
          <ShimmerButton
            type="button"
            onClick={handleRunUniversalParser}
            disabled={loading}
            shimmerColor="#00f5ff"
            borderRadius="14px"
            className="flex-1 h-12 font-black text-xs sm:text-sm border-cyan-400/40 text-cyan-300 gap-2 shadow-[0_0_25px_rgba(0,245,255,0.2)] hover:border-cyan-400"
          >
            <Sparkles className="w-4 h-4 text-cyan-400 shrink-0 animate-pulse" />
            <span>{isEn ? "Universal Text Parser (Ultra-accurate ⚡)" : "البارسر الخارق للنصوص (استخراج فائق الدقة ⚡)"}</span>
          </ShimmerButton>
        )}

        <Button
          onClick={handleGenerate}
          disabled={loading}
          className="flex-1 h-12 font-black text-sm sm:text-base gap-2 bg-cyan-500 hover:bg-cyan-400 text-black shadow-[0_0_20px_rgba(6,182,212,0.3)] transition-colors rounded-xl"
        >
          {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
          {loading ? (isEn ? "AI is crafting your quiz..." : "Black Fighters بيجهّز الكويز...") : (isEn ? `Generate Quiz (${quizCost} Credits)` : `توليد الكويز (${quizCost} كريدت)`)}
        </Button>
      </div>
      {generationProgress && (
        <Button
          type="button"
          variant="outline"
          onClick={() => { cancelRequestedRef.current = true; }}
          className="mt-2 w-full"
        >
          {isEn ? "Cancel & Refund Credits" : "إلغاء واسترداد الكريدتس"}
        </Button>
      )}
    </motion.div>
  );
}
