import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { AlertCircle, ClipboardType } from "lucide-react";
import { YoutubeIcon } from "@/components/ui/icons";
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
import { backgroundSummaryTracker } from "@/lib/backgroundSummaryTracker";
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
  const [altMode, setAltMode] = useState(null);
  const [fileName, setFileName] = useState("");
  const [statusText, setStatusText] = useState("");
  const [progress, setProgress] = useState(0);
  const [preview, setPreview] = useState(null);
  const [fileUrl, setFileUrl] = useState("");
  const [saving, setSaving] = useState(false);
  const [editingChapters, setEditingChapters] = useState({});
  const [errorMsg, setErrorMsg] = useState("");
  const [pendingInput, setPendingInput] = useState(null);
  const [languageMode] = useState("bilingual");
  const [summaryStyle] = useState("foundational_bilingual");
  const [agentIndex, setAgentIndex] = useState(0);
  const [lastCost, setLastCost] = useState(2);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const abortRef = useRef(false);
  const aiJobRef = useRef(null);

  const resetAll = () => {
    try {
      localStorage.removeItem("bf_create_course_preview_draft");
    } catch {}
    backgroundSummaryTracker.clearJob();
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

  // Auto-restore preview draft or active background summary job on mount
  useEffect(() => {
    const unsub = backgroundSummaryTracker.subscribe((bg) => {
      if (bg.active) {
        setStep(1);
        setFileName(bg.fileName);
        setStatusText(bg.statusText);
        setProgress(bg.progress);
        setAgentIndex(bg.agentIndex || 0);
      } else if (bg.completed && bg.preview?.chapters?.length > 0) {
        setPreview(bg.preview);
        setFileName(bg.fileName || bg.preview.source_file_name || "ملف محفوظ");
        setProgress(100);
        setStep(2);
      }
    });

    try {
      const bgNow = backgroundSummaryTracker.getState();
      if (!bgNow.active) {
        const saved = localStorage.getItem("bf_create_course_preview_draft");
        if (saved) {
          const parsed = JSON.parse(saved);
          if (parsed?.chapters?.length > 0) {
            setPreview(parsed);
            setStep(2);
            setFileName(parsed.source_file_name || "ملف محفوظ");
          }
        }
      }
    } catch {}

    return unsub;
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
    if (profile?.id) return true;
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
    const { language: lang, style, formatOnly, subject } = generation;
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
      const initStatus = "بنقسّم المحتوى في الخلفية... ⚙️";
      setStatusText(initStatus);
      backgroundSummaryTracker.startJob({ fileName: name, statusText: initStatus });

      const chunks = await splitCourseTextAsync(extractedText);
      charge = await chargeSummaryCredits(extractedText, chunks.length);
      setLastCost(charge.cost);
      toast.success(`تم خصم ${charge.cost} كريدت للتلخيص — يستمر في الخلفية حتى لو تنقلت بالموقع ⚡`);

      const startStatus = formatOnly ? `بنسّق نصك بالحرف... ${stats.estimatedPages} صفحة ✍️` : `جاري تحليل ${stats.estimatedPages} صفحة واستخراج المفاهيم... 🔍`;
      setAgentIndex(0);
      setStatusText(startStatus);
      setProgress(5);
      backgroundSummaryTracker.updateJob({ agentIndex: 0, statusText: startStatus, progress: 5 });

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
          maxPages: Math.max(10, Math.min(160, Number(choices.maxPages) || Math.ceil(stats.estimatedPages * 0.75) || 20)),
          colorLevel: "none",
          signal: { get aborted() { return abortRef.current; } },
          onProgress: ({ phase, current = 1, total = 1, round = 1 }) => {
            const ratio = Math.min(1, current / Math.max(1, total));
            let nextAgent = 0;
            let nextStatus = "";
            let nextProgress = 10;
            if (phase === "map" || phase === "map_facts") {
              nextAgent = Math.min(2, Math.floor(ratio * 3));
              nextStatus = `تلخيص الجزء ${current} من ${total}...`;
              nextProgress = 8 + Math.round(ratio * 62);
            } else if (phase === "reduce" || phase === "assemble") {
              nextAgent = 3;
              nextStatus = `دمج وتنظيم الأبواب — الجولة ${round} (${current}/${total})...`;
              nextProgress = 72 + Math.round(ratio * 20);
            } else if (phase === "validate") {
              nextAgent = AGENTS.length;
              nextStatus = "مراجعة التغطية واستكمال المعلومات الناقصة...";
              nextProgress = 95;
            }
            setAgentIndex(nextAgent);
            setStatusText(nextStatus);
            setProgress(nextProgress);
            backgroundSummaryTracker.updateJob({
              agentIndex: nextAgent,
              statusText: nextStatus,
              progress: nextProgress,
            });
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
          source_file_name: name,
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
        backgroundSummaryTracker.completeJob(merged);
        toast.success(isEn ? "Smart Summary Completed! 🎉" : "اكتمل تجهيز الملخص الذكي! 🎉");
        return;
      }

      const results = [];

      for (let i = 0; i < chunks.length; i++) {
        const chunk = chunks[i];
        if (abortRef.current) throw new Error("تم الإلغاء");

        const nextStatus = getProgressMsg(i, chunks.length);
        const pct = i / chunks.length;
        const nextAgent = Math.min(AGENTS.length - 1, Math.floor(pct * AGENTS.length));
        const nextProgress = 5 + Math.round((i / chunks.length) * 85);
        setStatusText(nextStatus);
        setAgentIndex(nextAgent);
        setProgress(nextProgress);
        backgroundSummaryTracker.updateJob({
          agentIndex: nextAgent,
          statusText: nextStatus,
          progress: nextProgress,
        });

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
            if (attempt < 3) await new Promise(r => setTimeout(r, attempt * 1500));
          }
        }
        if (!completed) throw lastErr || new Error(`فشل تلخيص الجزء ${i + 1}`);
      }

      if (!results.length) throw new Error("AI لم يرجع نتيجة — جرب مرة تانية");

      setAgentIndex(AGENTS.length);
      setStatusText(formatOnly ? "بنرتّب التنسيق النهائي... ✨" : "ترتيب الهيكلة النهائية للملخص... ✨");
      setProgress(95);

      const merged = { ...mergeCourseParts(results, name), source_file_name: name };
      await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey: charge.jobKey }).catch(() => {});
      aiJobRef.current = null;
      setPendingInput(null);
      setPreview(merged);
      setProgress(100);
      setStep(2);
      backgroundSummaryTracker.completeJob(merged);

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
      backgroundSummaryTracker.failJob(msg);
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
  };

  const handleYouTubeTranscript = ({ text, title, sourceUrl }) => {
    handleText(text, title, sourceUrl);
  };

  const handleFile = async (file, opts = {}) => {
    if (!file) return false;

    const ext = file.name.split(".").pop()?.toLowerCase();
    if (!SUPPORTED_EXTENSIONS.includes(ext)) {
      toast.error(`نوع الملف .${ext} مش مدعوم`);
      return false;
    }
    if (file.size > MAX_FILE_SIZE) {
      toast.error("الملف أكبر من 50MB — صغّره أو قسّمه");
      return false;
    }

    setFileName(file.name);
    setErrorMsg("");

    // Run auth check and single-pass file extraction concurrently for zero extra latency
    const [canCreate, extractedText] = await Promise.all([
      ensureCanCreate(),
      extractTextFromFile(file, {
        onProgress: ({ current, total, phase }) => {
          opts?.onProgress?.({ current, total, phase });
        },
      }),
    ]);

    if (!canCreate) return false;

    if (!extractedText || extractedText.trim().length < 50) {
      throw new Error("الملف فاضي أو المحتوى مش مقروء — جرب ملف تاني أو الصق النص مباشرة");
    }

    setPendingInput({
      text: extractedText,
      name: file.name,
      sourceUrl: "",
      analysis: analyzeDocument(extractedText, file.name),
    });
    return true;
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

      try {
        const cardCount = await generateReviewCardsFromCourse(course, preview.chapters || []);
        if (cardCount > 0) toast.success(`اتولّد ${cardCount} بطاقة مراجعة تلقائياً 🧠`);
      } catch {}

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
        {/* Step 0: Unified Single Window — Either Upload Input OR Unified Summary Options */}
        {step === 0 && (
          <motion.div key={pendingInput ? "config" : "upload"} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-4">
            {errorMsg && (
              <div className="mb-4 flex items-start gap-3 glass-card rounded-2xl p-4 border border-destructive/30 bg-destructive/5">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />
                <p className="text-sm text-destructive font-medium">{errorMsg}</p>
              </div>
            )}

            {pendingInput ? (
              <AssistantLanguagePopup
                open={true}
                inline={true}
                fileName={pendingInput.name}
                creditCost={calculateSummaryCost(pendingInput.text?.length || 0)}
                analysis={pendingInput.analysis}
                onChangeFile={() => {
                  setPendingInput(null);
                  setFileName("");
                  setErrorMsg("");
                }}
                onConfirm={({ language, style, subjectType, maxPages, includeImages }) => {
                  generateCourseFromText(
                    pendingInput.text,
                    pendingInput.name,
                    pendingInput.sourceUrl,
                    { language, style, subjectType, colorLevel: "none", maxPages, includeImages }
                  );
                }}
              />
            ) : (
              <>
                <PremiumUploadDropzone
                  onFile={handleFile}
                  maxSize={MAX_FILE_SIZE}
                />

                <div className="flex items-center gap-3">
                  <span className="h-px flex-1 bg-border" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                    {isEn ? "or" : "أو"}
                  </span>
                  <span className="h-px flex-1 bg-border" />
                </div>

                <div className="grid gap-2 sm:grid-cols-2">
                  <button
                    type="button"
                    aria-expanded={altMode === "text"}
                    onClick={() => setAltMode(altMode === "text" ? null : "text")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                      altMode === "text" ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <ClipboardType className="h-4 w-4" />
                    {isEn ? "Paste lecture text" : "الصق نص المحاضرة"}
                  </button>
                  <button
                    type="button"
                    aria-expanded={altMode === "youtube"}
                    onClick={() => setAltMode(altMode === "youtube" ? null : "youtube")}
                    className={`flex items-center justify-center gap-2 rounded-2xl border px-4 py-3 text-sm font-bold transition-colors ${
                      altMode === "youtube" ? "border-primary/40 bg-primary/10 text-primary" : "border-border hover:border-primary/30"
                    }`}
                  >
                    <YoutubeIcon size={16} />
                    {isEn ? "Summarise a YouTube lecture" : "لخّص محاضرة من يوتيوب"}
                  </button>
                </div>

                {altMode === "text" && <TextPastePanel onSubmit={handleText} />}
                {altMode === "youtube" && <YouTubeImportPanel onImportTranscript={handleYouTubeTranscript} />}
              </>
            )}
          </motion.div>
        )}

        {/* Step 1: Processing — Unified Loader */}
        {step === 1 && (
          <motion.div key="processing" initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <CourseGenerationLoader
              fileName={fileName}
              statusText={statusText}
              progress={progress}
              onCancel={() => { abortRef.current = true; setStatusText(isEn ? "Stopping process..." : "جاري إيقاف العملية..."); }}
            />
            <AgentPipeline activeIndex={agentIndex} />
          </motion.div>
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
    </div>
  );
}
