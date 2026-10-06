import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AlertCircle } from "lucide-react";
import PremiumUploadDropzone from "@/components/course/PremiumUploadDropzone";
import TextPastePanel from "@/components/course/TextPastePanel";
import YouTubeImportPanel from "@/components/course/YouTubeImportPanel";
import CourseGenerationLoader from "@/components/course/CourseGenerationLoader";
import AssistantLanguagePopup from "@/components/course/AssistantLanguagePopup";
import AgentPipeline, { AGENTS } from "@/components/course/AgentPipeline";
import { toast } from "sonner";
import { awardBadge } from "@/lib/gamification";
import { useBadges } from "@/lib/BadgeContext";
import { awardXP } from "@/lib/xpSystem";
import { splitCourseTextAsync, mergeCourseParts, getTextStats, markdownToCourseChapters } from "@/lib/courseChunking";
import { extractTextFromFile } from "@/lib/fileProcessing";
import { calculateSummaryCost } from "@/lib/economyCatalog";
import { analyzeDocument, generateHierarchicalSummary } from "@/lib/summaryPipeline";
import { saveSummaryDocument } from "@/lib/summaryJobs";
import { generateReviewCardsFromCourse } from "@/lib/reviewCardGen";
import { notifySlack, buildCourseSlackMessage } from "@/lib/integrations";
import { useLocale } from "@/lib/LocaleContext";
import CreateCoursePreview from "@/features/theory/create-course/CreateCoursePreview";
import CreateCourseIntro from "@/features/theory/create-course/CreateCourseIntro";
import { buildChunkPrompt, getGenerationOptions, getProgressMsg } from "@/features/theory/create-course/courseGenerationPrompts";
import { generateCourseChunk } from "@/features/theory/create-course/courseGenerationApi";
const COLORS = ["cyan", "purple", "green", "orange", "pink"];
const MAX_FILE_SIZE = 50 * 1024 * 1024;
const SUPPORTED_EXTENSIONS = ["pdf", "pptx", "ppt", "docx", "doc", "txt", "csv", "html", "htm", "md", "rtf", "png", "jpg", "jpeg", "webp", "gif", "bmp", "tif", "tiff"];

export default function CreateCourse() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { showBadges } = useBadges();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [step, setStep] = useState(0);
  const [fileName, setFileName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [openChapter, setOpenChapter] = useState(0);
  const [editingChapters, setEditingChapters] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingInput, setPendingInput] = useState(null);
  const [languageMode, setLanguageMode] = useState("bilingual");
  const [summaryStyle, setSummaryStyle] = useState("foundational_bilingual");
  const [popupOpen, setPopupOpen] = useState(false);
  const [agentIndex, setAgentIndex] = useState(0);
  const [lastCost, setLastCost] = useState(2);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const abortRef = useRef(false);
  const aiJobRef = useRef(null);

  const resetAll = () => {
    try {
      localStorage.removeItem("bf_create_course_preview_draft");
    } catch {}
    setStep(0);
    setProgress(0);
    setStatusText("");
    setPreview(null);
    setSavedCourseId(null);
    setFileName("");
    setFileUrl("");
    setPendingInput(null);
    setSaving(false);
    toast.info(isEn ? "Ready for a new summary" : "جاهز لإنشاء تلخيص جديد ✨");
  };

  // Auto-restore preview draft on mount if available
  useEffect(() => {
    try {
      const saved = localStorage.getItem("bf_create_course_preview_draft");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.chapters?.length > 0) {
          setPreview(parsed);
          setStep(2);
          setFileName(parsed.source_file_name || "ملف محفوظ");
        }
      }
    } catch {}
  }, []);

  // Sync preview changes to localStorage so refresh never loses generated summary
  useEffect(() => {
    if (preview) {
      try {
        localStorage.setItem("bf_create_course_preview_draft", JSON.stringify(preview));
      } catch {}
    }
  }, [preview]);

  const ensureCanCreate = async () => {
    const user = await base44.auth.me();
    return !!user;
  };

  const chargeSummaryCredits = async (text, totalChunks) => {
    const jobKey = aiJobRef.current || crypto.randomUUID();
    aiJobRef.current = jobKey;
    const res = await base44.functions.invoke("chargeAiJob", {
      action: "charge",
      jobKey,
      task: "summary",
      charCount: text.length,
      totalChunks,
    });
    return { jobKey, cost: res.data.cost };
  };

  const refundSummaryCredits = async (charge) => {
    if (!charge) return;
    await base44.functions.invoke("chargeAiJob", { action: "refund", jobKey: charge.jobKey, cost: charge.cost });
  };

  const generateCourseFromText = async (extractedText, name, sourceUrl = "", choices = {}) => {
    const generation = getGenerationOptions(choices, languageMode, summaryStyle);
    const { language: lang, style, colorLevel, formatOnly, subject } = generation;
    setFileName(name);
    setFileUrl(sourceUrl);
    setErrorMsg("");
    abortRef.current = false;

    let charge = null;
    try {
      setStep(1);
      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("المحتوى قليل جداً — زوّد النص أو جرب ملف تاني");
      }

      const stats = getTextStats(extractedText);
      setStatusText("بنقسّم المحتوى في الخلفية... ⚙️");
      const chunks = await splitCourseTextAsync(extractedText);
      charge = await chargeSummaryCredits(extractedText, chunks.length);
      setLastCost(charge.cost);
      toast.success(`تم خصم ${charge.cost} كريدت للتلخيص`);

      setAgentIndex(0);
      setStatusText(formatOnly ? `بنسّق نصك بالحرف... ${stats.estimatedPages} صفحة ✍️` : `وكيل التلخيص بيحلل ${stats.estimatedPages} صفحة... 🔍`);
      setProgress(5);

      if (!formatOnly) {
        const practicalRule = choices.includeImages
          ? "\n- [وضع المذاكرة العملي والـ OSCE]: اشرح المخططات، الرسوم التوضيحية، والبيانات البصرية بدقة شديدة مع توضيح خطوات القراءة والتطبيق العملي."
          : "";
        const fullStylePrompt = `${subject.prompt}\n${generation.styleRule}\n${generation.contentFormatRule}${practicalRule}`;
        const summaryResult = await generateHierarchicalSummary({
          text: extractedText,
          fileName: name,
          language: lang,
          style,
          stylePrompt: fullStylePrompt,
          maxPages: Math.max(4, Math.min(120, Number(choices.maxPages) || Math.ceil(stats.estimatedPages * 0.25) || 12)),
          colorLevel,
          signal: { get aborted() { return abortRef.current; } },
          onProgress: ({ phase, current = 1, total = 1, round = 1 }) => {
            const ratio = Math.min(1, current / Math.max(1, total));
            if (phase === "map" || phase === "map_facts") {
              setAgentIndex(Math.min(2, Math.floor(ratio * 3)));
              setStatusText(`تلخيص الجزء ${current} من ${total}...`);
              setProgress(8 + Math.round(ratio * 62));
            } else if (phase === "reduce") {
              setAgentIndex(3);
              setStatusText(`دمج هرمي — الجولة ${round} (${current}/${total})...`);
              setProgress(72 + Math.round(ratio * 20));
            } else if (phase === "validate") {
              setAgentIndex(AGENTS.length);
              setStatusText("مراجعة التغطية واستكمال المعلومات الناقصة...");
              setProgress(95);
            }
          },
          invoke: async (payload) => {
            const response = await base44.functions.invoke("generateStudyContent", payload, { timeout: 120_000 });
            if (response.data?.error) throw new Error(response.data.error);
            return response.data?.result || response.data;
          },
        });

        const cleanTitle = String(name || "ملخص جديد").replace(/\.[^.]+$/, "");
        const merged = {
          title: cleanTitle,
          description: `ملخص ${subject.label} منظم ومراجع آلياً`,
          language: lang,
          subject: subject.label,
          level: "عام",
          doc_type: "summary",
          chapters: markdownToCourseChapters(summaryResult.summary, cleanTitle),
          summary_coverage: summaryResult.coverage,
          summary_fingerprint: summaryResult.fingerprint,
          summary_markdown: summaryResult.summary,
          summary_document_v3: summaryResult.document || null,
          summary_job_id: summaryResult.jobId || "",
          summary_model_actual: summaryResult.modelActual || [],
        };

        if (summaryResult.resumed) {
          await refundSummaryCredits(charge);
          setLastCost(0);
          toast.info("تم استرجاع الملخص المحفوظ بدون خصم كريدتس");
        } else {
          await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey: charge.jobKey }).catch(() => {});
        }
        aiJobRef.current = null;
        setAgentIndex(AGENTS.length);
        setStatusText("تمت مراجعة الملخص وتغطيته");
        setPendingInput(null);
        setPreview(merged);
        setProgress(100);
        setStep(2);
        return;
      }

      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (abortRef.current) throw new Error("تم الإلغاء");

        setStatusText(getProgressMsg(i, chunks.length));
        const pct = i / chunks.length;
        setAgentIndex(Math.min(AGENTS.length - 1, Math.floor(pct * AGENTS.length)));
        setProgress(5 + Math.round((i / chunks.length) * 85));

        let lastErr;
        let completed = false;
        for (let attempt = 1; attempt <= 3; attempt++) {
          try {
            const prompt = buildChunkPrompt({ chunk, index: i, total: chunks.length, options: generation });
            const result = await generateCourseChunk(base44, prompt);
            if (result?.title || result?.chapters?.length) {
              results.push(result);
              completed = true;
              break;
            }
            throw new Error("الـ AI رجع نتيجة فارغة");
          } catch (err) {
            lastErr = err;
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 2000));
          }
        }
        if (!completed) throw lastErr || new Error(`فشل تلخيص الجزء ${i + 1}`);
      }

      if (!results.length) throw new Error("AI لم يرجع نتيجة — جرب مرة تانية");

      setAgentIndex(AGENTS.length);
      setStatusText(formatOnly ? "بنرتّب التنسيق النهائي... ✨" : "وكيل التنظيم بيرتّب الملخص النهائي... ✨");
      setProgress(95);

      const merged = mergeCourseParts(results, name);
      await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey: charge.jobKey }).catch(() => {});
      aiJobRef.current = null;
      setPendingInput(null);
      setPreview(merged);
      setProgress(100);
      setStep(2);

    } catch (err) {
      const raw = err.message || "";
      let msg;
      if (raw.includes("NO_API_KEY")) msg = "عذراً، محرك الذكاء الاصطناعي مشغول حالياً — يرجى المحاولة لاحقاً ⚙️";
      else if (/quota|rate.?limit|exceeded|429/i.test(raw)) msg = "الحصة خلصت 😅 — جرب بعد دقيقة";
      else if (/model.*not.*found|No endpoints/i.test(raw)) msg = "الموديل مش متاح — غيّره من الإعدادات";
      else if (raw.includes("المحتوى قليل")) msg = raw;
      else msg = raw || "حصل خطأ — جرب تاني";

      await refundSummaryCredits(charge);
      aiJobRef.current = null;
      setErrorMsg(msg);
      setStep(0);
      toast.error(msg);
    }
  };

  const handleText = async (text, customName = "", sourceUrl = "") => {
    if (!(await ensureCanCreate())) return;
    if (!text || text.trim().length < 50) {
      toast.error("النص قليل جداً — الصق محتوى أطول");
      return;
    }
    const name = customName || "نص مكتوب مباشر";
    setErrorMsg("");
    setFileName(name);
    setPendingInput({ text, name, sourceUrl: sourceUrl || "", analysis: analyzeDocument(text, name) });
    setPopupOpen(true);
  };

  const handleYouTubeTranscript = ({ text, title, sourceUrl }) => {
    handleText(text, title, sourceUrl);
  };

  const handleFile = async (file) => {
    if (!file) return;
    if (!(await ensureCanCreate())) return;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      toast.error(`نوع الملف .${ext} مش مدعوم`);
      return;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("الملف أكبر من 50MB — صغّره أو قسّمه");
      return;
    }

    setFileName(file.name);
    setStep(1);
    setProgress(3);

    try {
      setStatusText("بيقرأ الملف... 📄");
      const extractedText = await extractTextFromFile(file, {
        onProgress: ({ current, total, phase }) => setStatusText(
          phase === "ocr" ? `OCR بيقرأ الصورة... ${current}%` : `بيقرأ صفحة ${current} من ${total}... 📄`
        ),
      });

      if (!extractedText || extractedText.trim().length < 50) {
        throw new Error("الملف فاضي أو المحتوى مش مقروء — جرب ملف تاني أو الصق النص مباشرة");
      }

      setStep(0);
      setProgress(0);
      setStatusText("");
      setPendingInput({ text: extractedText, name: file.name, sourceUrl: "", analysis: analyzeDocument(extractedText, file.name) });
      setPopupOpen(true);
    } catch (err) {
      toast.error(err.message || "حصل خطأ في قراءة الملف");
      setStep(0);
      setProgress(0);
    }
  };

  const saveCourse = async () => {
    if (saving) return;
    if (savedCourseId) {
      navigate(`/course/${savedCourseId}`);
      return;
    }
    setSaving(true);
    try {
      const courseCost = Number(lastCost || (summaryStyle === "ultra_multi_agent" ? 12 : 2));
      const course = await base44.entities.Course.create({
        title: preview.title,
        description: preview.description,
        language: preview.language || "ar",
        subject: preview.subject || "",
        level: preview.level || "عام",
        doc_type: preview.doc_type || "summary",
        chapters: preview.chapters,
        summary_coverage: preview.summary_coverage || null,
        summary_fingerprint: preview.summary_fingerprint || "",
        price_credits: courseCost,
        credit_cost: courseCost,
        source_file_url: fileUrl,
        source_file_name: fileName,
        color: COLORS[Math.floor(Math.random() * COLORS.length)],
      });

      setSavedCourseId(course.id);
      // Badge ladder: count the course toward the tiered badges
      try { const { bumpCounter } = await import("@/lib/gamification"); await bumpCounter("courses_created", 1); } catch {}
      try {
        localStorage.removeItem("bf_create_course_preview_draft");
      } catch {}

      if (preview.summary_document_v3) {
        try {
          await saveSummaryDocument({
            courseId: course.id,
            document: preview.summary_document_v3,
            baseRevision: 0,
            reason: "initial_generation",
            renderedMarkdown: preview.summary_markdown || "",
          });
        } catch (e) {
          console.warn("saveSummaryDocument error:", e);
        }
      }
      if (preview.summary_markdown) {
        try {
          await base44.entities.GeneratedContent.create({
            course_id: course.id,
            content_type: "summary",
            language: preview.language || "ar",
            content: JSON.stringify({ summary_markdown: preview.summary_markdown, coverage: preview.summary_coverage }),
          });
        } catch (e) {
          console.warn("GeneratedContent save error:", e);
        }
      }

      try {
        const user = await base44.auth.me();
        const courses = await base44.entities.Course.filter({ created_by_id: user.id });
        const unlocked = [];
        if (courses.length === 1 && await awardBadge("first_course")) unlocked.push("first_course");
        if (courses.length === 5 && await awardBadge("five_courses")) unlocked.push("five_courses");
        if (courses.length === 10 && await awardBadge("ten_courses")) unlocked.push("ten_courses");
        if (unlocked.length) showBadges(unlocked);
        const { levelUp, newLevelInfo } = await awardXP("create_course");
        if (levelUp) toast.success(`🎉 ارتقيت لمستوى ${newLevelInfo?.current?.icon} ${newLevelInfo?.current?.title}!`);
      } catch {}

      // تحويل التلخيص تلقائياً لبطاقات مراجعة
      try {
        const cardCount = await generateReviewCardsFromCourse(course, preview.chapters || []);
        if (cardCount > 0) toast.success(`اتولّد ${cardCount} بطاقة مراجعة تلقائياً 🧠`);
      } catch {}

      // إشعار Slack تلقائي بالملخص الجديد (لو المستخدم رابط Webhook)
      try {
        const sent = await notifySlack(buildCourseSlackMessage({ ...preview, ...course }));
        if (sent) toast.success("اتبعت إشعار على Slack 💬");
      } catch {}

      toast.success(isEn ? "Summary saved successfully! 🎉" : "الملخص اتحفظ بنجاح! 🎉");
      navigate(`/course/${course.id}`);
    } catch (err) {
      console.error("Save course error:", err);
      toast.error(isEn ? "Error saving summary — try again" : "حصل خطأ في الحفظ — جرب تاني");
      setSaving(false);
    }
  };

  return (
    <div dir={dir} className="max-w-3xl mx-auto space-y-8">
      <CreateCourseIntro isEn={isEn} step={step} pendingTextLength={pendingInput?.text?.length} />

      <AnimatePresence mode="wait">
        {/* Step 0: Upload */}
        {step === 0 && (
          <motion.div key="upload" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            {errorMsg && (
              <div className="mb-4 flex items-start gap-3 glass-card rounded-2xl p-4 border border-destructive/30 bg-destructive/5">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive font-medium">{errorMsg}</p>
              </div>
            )}

            <PremiumUploadDropzone onFile={handleFile} maxSize={MAX_FILE_SIZE} />
            <TextPastePanel onSubmit={handleText} />
            <YouTubeImportPanel onImportTranscript={handleYouTubeTranscript} />
          </motion.div>
        )}

        {/* Step 1: Processing — EPIC LOADER */}
        {step === 1 && (
          <div>
            <CourseGenerationLoader
              fileName={fileName}
              statusText={statusText}
              progress={progress}
              onCancel={() => { abortRef.current = true; setStatusText(isEn ? "Stopping process..." : "جاري إيقاف العملية..."); }}
            />
            <AgentPipeline activeIndex={agentIndex} />
          </div>
        )}

        {step === 2 && preview && (
          <CreateCoursePreview
            preview={preview}
            isEn={isEn}
            lastCost={lastCost}
            saving={saving}
            savedCourseId={savedCourseId}
            editingChapters={editingChapters}
            onSave={saveCourse}
            onReset={resetAll}
            onOpenSaved={() => navigate(`/course/${savedCourseId}`)}
            onPreviewChange={setPreview}
            onEditingChaptersChange={setEditingChapters}
          />
        )}
      </AnimatePresence>

      <AssistantLanguagePopup
        open={popupOpen}
        fileName={pendingInput?.name}
        creditCost={calculateSummaryCost(pendingInput?.text?.length || 0)}
        analysis={pendingInput?.analysis}
        onClose={() => setPopupOpen(false)}
        onConfirm={({ language, style, subjectType, colorLevel, maxPages, includeImages }) => {
          setPopupOpen(false);
          if (pendingInput) {
            generateCourseFromText(
              pendingInput.text,
              pendingInput.name,
              pendingInput.sourceUrl,
              { language, style, subjectType, colorLevel, maxPages, includeImages }
            );
          }
        }}
      />
    </div>
  );
}
