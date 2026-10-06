import React, { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { invokeSecureFunction } from '@/lib/secureFunctions';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { useLocale } from "@/lib/LocaleContext";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowRight, BookOpen, Brain, FileText, Layers, Sparkles, Loader2, Trash2, StickyNote, Download, CalendarPlus, BellPlus, Target, Share2, Coins, Send, Swords } from "lucide-react";
import { toast } from "sonner";
import QuizView from "@/components/course/QuizView";
import EditableStudySheet from "@/components/course/EditableStudySheet";
import FlashcardsView from "@/components/course/FlashcardsView";
import SummaryView from "@/components/course/SummaryView";
import SummaryGenerationControls from "@/components/course/SummaryGenerationControls";
import LanguageDialog from "@/components/course/LanguageDialog";
import NotesView from "@/components/course/NotesView";
import ReminderDialog from "@/components/course/ReminderDialog";
import CourseInsightBar from "@/components/course/CourseInsightBar";
import ReviewReminderDialog from "@/components/course/ReviewReminderDialog";
import TojiCoach from "@/components/course/TojiCoach";
import { awardXP } from "@/lib/xpSystem";
import AiChatAssistant from "@/components/course/AiChatAssistant";
import PracticeMode from "@/components/course/PracticeMode";
import StudyMode from "@/components/course/StudyMode";
import CourseShareCard from "@/components/course/CourseShareCard";
import { GraduationCap } from "lucide-react";
import { AnimatedGoogleDrive } from "@/components/ui/AnimatedMicroIcons";
import { saveIntegrationSettings, requestDriveToken, uploadTextToDrive, courseToMarkdown } from "@/lib/integrations";
import { getOfflineSnapshot, setOfflineSnapshot } from "@/lib/offlineDb";
import { getSummaryTemplate } from "@/lib/summaryTemplates";
import { generateHierarchicalSummary } from "@/lib/summaryPipeline";
import {
  allocateQuizQuestions,
  buildQuizAnalysisSample,
  buildQuizChunks,
  localAnalyzeQuizSource,
  normalizeQuizResult,
  normalizeQuizSourceAnalysis,
  QUIZ_MAX_QUESTIONS,
} from "@/lib/quizQuality";

const QUIZ_PROFILES = [
  { id: "balanced", label: "Balanced", hint: "مراجعة شاملة" },
  { id: "exam", label: "Exam", hint: "شبه الامتحان" },
  { id: "concepts", label: "Concepts", hint: "فهم عميق" },
  { id: "application", label: "Cases", hint: "تطبيق وحالات" },
  { id: "traps", label: "Traps", hint: "أخطاء شائعة" },
];

export default function CourseView() {
  const { id } = useParams(); // route param
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const quizProfiles = [
    { id: "balanced", label: isEn ? "Balanced" : "Balanced", hint: isEn ? "Comprehensive review" : "مراجعة شاملة" },
    { id: "exam", label: isEn ? "Exam" : "Exam", hint: isEn ? "Exam-like questions" : "شبه الامتحان" },
    { id: "concepts", label: isEn ? "Concepts" : "Concepts", hint: isEn ? "Deep understanding" : "فهم عميق" },
    { id: "application", label: isEn ? "Cases" : "Cases", hint: isEn ? "Clinical & real cases" : "تطبيق وحالات" },
    { id: "traps", label: isEn ? "Traps" : "Traps", hint: isEn ? "Common traps & tricks" : "أخطاء شائعة" },
  ];

  const [generating, setGenerating] = useState(null);
  const [langDialog, setLangDialog] = useState(null); // pending task type
  const [quizCount, setQuizCount] = useState(10);
  const [difficulty, setDifficulty] = useState("mixed");
  const [quizProfile, setQuizProfile] = useState("balanced");
  const [showExplanations, setShowExplanations] = useState(true);
  const [summaryStyle, setSummaryStyle] = useState("bilingual_lecture");
  const [summaryMaxPages, setSummaryMaxPages] = useState(30);
  const [summaryColorLevel, setSummaryColorLevel] = useState("medium");
  const [purchasing, setPurchasing] = useState(false);
  const [savingDrive, setSavingDrive] = useState(false);
  const [reminderOpen, setReminderOpen] = useState(false);
  const [reviewReminderOpen, setReviewReminderOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [exportingTelegram, setExportingTelegram] = useState(false);

  const { data: course, isLoading } = useQuery({
    queryKey: ["course", id],
    queryFn: async () => {
      try {
        const result = await base44.entities.Course.get(id);
        if (result) await setOfflineSnapshot(`course:${id}`, result).catch(() => {});
        return result;
      } catch (error) {
        const cached = await getOfflineSnapshot(`course:${id}`).catch(() => null);
        if (cached) return cached;
        throw error;
      }
    },
  });

  const { data: contents } = useQuery({
    queryKey: ["contents", id],
    queryFn: async () => {
      try {
        const result = await base44.entities.GeneratedContent.filter({ course_id: id });
        await setOfflineSnapshot(`contents:${id}`, result).catch(() => {});
        return result;
      } catch (error) {
        const cached = await getOfflineSnapshot(`contents:${id}`).catch(() => null);
        if (cached) return cached;
        throw error;
      }
    },
    initialData: [],
  });

  // Summary agent edited the file in the chat → refetch so every tab shows it
  useEffect(() => {
    const handler = (e) => {
      if (e.detail?.courseId === id) queryClient.invalidateQueries({ queryKey: ["contents", id] });
    };
    window.addEventListener("iiiak:summary-updated", handler);
    return () => window.removeEventListener("iiiak:summary-updated", handler);
  }, [id, queryClient]);

  const { data: enrollments = [] } = useQuery({
    queryKey: ["course-enrollment", id, profile?.id],
    queryFn: () => base44.entities.Enrollment.filter({ course_id: id, user_id: profile.id }, "-created_date", 1),
    enabled: !!profile?.id && !!id,
    initialData: [],
  });

  const getContent = (type) => contents.find((c) => c.content_type === type);
  const getContentData = (type) => {
    const c = getContent(type);
    if (!c) return null;
    try { return typeof c.content === "string" ? JSON.parse(c.content) : c.content; }
    catch { return null; }
  };

  const courseText = () =>
    ((course?.chapters || [])).map((ch) => `# ${ch.title || ""}\n${ch.content || ""}`).join("\n\n");

  const generate = async (type, language) => {
    if (!language) {
      if (course.language === "mixed") {
        setLangDialog(type);
        return;
      }
      language = course.language || "ar";
    }
    setLangDialog(null);

    setGenerating(type);
    let chargedJob = null;

    try {
      const text = courseText();
      const { splitCourseTextAsync, processChunksParallel, reduceSummariesHierarchically, SUMMARY_CHUNK_SIZE } = await import('@/lib/courseChunking');
      // Keep every request comfortably below small/free-model context limits.
      const CHUNK_SIZE = type === "summary" ? SUMMARY_CHUNK_SIZE : 14000;
      let chunks = text.length > CHUNK_SIZE ? await splitCourseTextAsync(text, CHUNK_SIZE) : [text];
      let quizSourceAnalysis = null;
      let quizMode = "generate";
      let requestedQuizCount = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(quizCount) || 10));
      if (type === "quiz") {
        const localAnalysis = localAnalyzeQuizSource(text);
        quizSourceAnalysis = localAnalysis;
        try {
          const analysisRes = await base44.functions.invoke("generateStudyContent", {
            task: "quiz_source_analysis",
            text: buildQuizAnalysisSample(text),
          });
          const aiAnalysis = analysisRes?.data?.result || analysisRes?.data;
          quizSourceAnalysis = normalizeQuizSourceAnalysis(aiAnalysis, localAnalysis);
        } catch {
          // Local analysis is good enough as a fallback and keeps generation available offline-ish.
        }
        quizMode = quizSourceAnalysis?.recommendation || "generate";
        if (quizMode === "extract") {
          requestedQuizCount = Math.max(3, Math.min(
            QUIZ_MAX_QUESTIONS,
            Number(quizSourceAnalysis.recommended_count || quizSourceAnalysis.question_count || requestedQuizCount) || requestedQuizCount
          ));
        }
        const quizChunks = buildQuizChunks(text, {
          mode: quizMode,
          targetQuestions: requestedQuizCount,
          maxChars: CHUNK_SIZE,
        });
        chunks = quizChunks.chunks.map((chunk) => chunk.text);
      }
      let quizQuestionPlan = type === "quiz" ? allocateQuizQuestions(requestedQuizCount, chunks) : [];
      if (type === "quiz") {
        const activeChunks = chunks.map((chunk, index) => ({
          chunk,
          questions: quizMode === "extract"
            ? Math.max(1, Math.min(40, localAnalyzeQuizSource(chunk).question_count || quizQuestionPlan[index] || 1))
            : Math.max(0, Number(quizQuestionPlan[index]) || 0),
        })).filter((item) => item.questions > 0);
        chunks = activeChunks.map((item) => item.chunk);
        quizQuestionPlan = activeChunks.map((item) => item.questions);
      }
      chargedJob = { jobKey: crypto.randomUUID() };
      const charge = await base44.functions.invoke("chargeAiJob", {
        action: "charge",
        jobKey: chargedJob.jobKey,
        task: type,
        charCount: text.length,
        questionCount: type === "quiz" ? requestedQuizCount : quizCount,
        totalChunks: chunks.length,
      });
      chargedJob.cost = charge.data.cost;

      // تحديد تعليمات التلوين بناءً على المستوى المختار
      const colorInstruction = summaryColorLevel === "none"
          ? "لا تستخدم ==highlight== أو ألوان. استخدم **Bold** فقط للمفاهيم المهمة."
          : summaryColorLevel === "medium"
          ? "استخدم 2-3 Highlights فقط في كل قسم، وبألوان دلالية مختلفة عند توفر أنواع مختلفة: ==cyan:مصطلح علمي==، ==green:تعريف أو نتيجة==، ==yellow:حقيقة أساسية==، ==orange:مثال==، ==red:تحذير أو استثناء==. لا تلوّن جملة كاملة ولا علامات الترقيم، ولا تجعل لوناً واحداً يسيطر على الصفحة. استخدم **Bold** بدون لون لبقية المهم."
          : "استخدم ألواناً دلالية منظمة: cyan للمصطلح وgreen للتعريف وyellow للحقيقة وorange للمثال وred للتحذير. لوّن الكلمات أو العبارات القصيرة فقط، ونوّع الألوان حسب المعنى مع ترك نص عادي كافٍ.";
      const stylePrompt = `${getSummaryTemplate(summaryStyle).prompt}\n${colorInstruction}`;
      const callAI = async (chunkText, chunkIdx, pageBudget) => {
        const plannedQuestions = type === "quiz"
          ? Math.max(0, Number(quizQuestionPlan[chunkIdx]) || 0)
          : Math.max(5, Math.round(quizCount / chunks.length));
        if (type === "quiz" && plannedQuestions <= 0) return { questions: [] };
        const res = await base44.functions.invoke("generateStudyContent", {
          task: type,
          text: chunkText,
          language,
          numQuestions: plannedQuestions,
          difficulty,
          withExplanation: showExplanations,
          quizProfile: type === "quiz" ? quizProfile : undefined,
          summaryStyle: type === "summary" ? summaryStyle : undefined,
          summaryMaxPages: type === "summary" ? (pageBudget || summaryMaxPages) : undefined,
          chunkIndex: chunkIdx,
          totalChunks: chunks.length,
          stylePrompt: type === "summary" ? stylePrompt : undefined,
          quizMode: type === "quiz" ? quizMode : undefined,
          sourceAnalysis: type === "quiz" ? quizSourceAnalysis : undefined,
        });
        if (res.data?.error) throw new Error(res.data.error);
        return res.data?.result;
      };

      let finalResult;
      let reusedCachedSummary = false;
      if (type === "summary") {
        const generated = await generateHierarchicalSummary({
          text,
          courseId: id,
          fileName: course.title || "course-summary",
          language,
          style: summaryStyle,
          stylePrompt,
          maxPages: summaryMaxPages,
          colorLevel: summaryColorLevel,
          onProgress: ({ phase, current = 1, total = 1, round = 1 }) => {
            setGenerating(`${phase}_${current}_${total}_${round}`);
          },
          invoke: async (payload) => {
            const response = await base44.functions.invoke("generateStudyContent", payload, { timeout: 120_000 });
            if (response.data?.error) throw new Error(response.data.error);
            return response.data?.result || response.data;
          },
        });
        reusedCachedSummary = !!generated.resumed;
        finalResult = {
          summary_markdown: generated.summary,
          summary_document_v3: generated.document || null,
          facts: generated.facts || [],
          coverage: generated.coverage,
          summary_job_id: generated.jobId || "",
          model_actual: generated.modelActual || [],
          pipeline_version: generated.pipelineVersion || "summary-v2",
        };
      } else if (chunks.length === 1) {
        finalResult = await callAI(chunks[0], 0);
      } else {
        // Multi-chunk: parallel processing with progress toasts
        toast.info(`الملف كبير — بيتقسم ${chunks.length} أجزاء ⚙️`);
        const perPartPages = type === "summary"
          ? Math.max(2, Math.ceil(summaryMaxPages / chunks.length))
          : undefined;
        const results = await processChunksParallel(
          chunks,
          (chunk, index) => callAI(chunk, index, perPartPages),
          {
            maxConcurrent: 2,
            onProgress: ({ idx, total }) => {
              setGenerating(`${type}_${idx + 1}_${total}`);
            },
          }
        );

        // Merge results by type
        if (type === "summary") {
          const sourceSummaries = results.map((r, index) => {
            const body = r?.summary_markdown?.trim();
            if (!body) throw new Error(`الجزء ${index + 1} رجع فاضي`);
            return body;
          });
          const consolidated = await reduceSummariesHierarchically(
            sourceSummaries,
            async (groupText, { index, total }) => {
              setGenerating(`summary_${index + 1}_${total}`);
              const res = await base44.functions.invoke("generateStudyContent", {
                task: "summary",
                text: `ادمج المسودات التالية في ملخص واحد متماسك. احذف التكرار، حافظ على كل القوانين والتعريفات والمعلومات المهمة، ولا تذكر أنها أجزاء أو مسودات.\n\n${groupText}`,
                language,
                summaryStyle,
                summaryMaxPages: Math.max(4, Math.ceil(summaryMaxPages / Math.max(1, total))),
                stylePrompt,
                chunkIndex: index,
                totalChunks: total,
              });
              if (res.data?.error) throw new Error(res.data.error);
              const body = res.data?.result?.summary_markdown?.trim();
              if (!body) throw new Error("فشل دمج أجزاء الملخص");
              return body;
            },
            { onProgress: ({ idx, total }) => setGenerating(`summary_${idx + 1}_${total}`) }
          );
          finalResult = {
            summary_markdown: consolidated,
          };
        } else if (type === "quiz") {
          const merged = { questions: [] };
          for (const r of results) {
            if (r?.questions) merged.questions.push(...r.questions);
          }
          finalResult = merged;
        } else if (type === "flashcards") {
          const merged = { cards: [] };
          for (const r of results) {
            if (r?.cards) merged.cards.push(...r.cards);
          }
          finalResult = merged;
        } else {
          finalResult = results.filter(Boolean);
        }
      }

      if (!finalResult) throw new Error("AI لم يرجع نتيجة");
      if (type === "quiz") {
        finalResult = normalizeQuizResult(finalResult, {
          desiredCount: requestedQuizCount,
          mode: quizMode,
          sourceAnalysis: quizSourceAnalysis,
          difficulty,
          requireExplanation: showExplanations,
          sourceText: text,
        });
        finalResult.quiz_mode = quizMode;
        finalResult.quiz_profile = quizProfile;
        finalResult.source_analysis = quizSourceAnalysis;
        if (!finalResult.questions?.length) throw new Error("NO_QUESTIONS");
      }

      // Save existing content of this type (replace), then create new
      const existing = contents.find(c => c.content_type === type);
      if (existing) await base44.entities.GeneratedContent.delete(existing.id);
      await base44.entities.GeneratedContent.create({
        course_id: id,
        content_type: type,
        title: type,
        content: JSON.stringify(finalResult),
        metadata: {
          language,
          ...(type === "quiz" ? {
            quiz_mode: quizMode,
            quiz_profile: quizProfile,
            source_analysis: quizSourceAnalysis,
            quality_stats: finalResult.stats,
          } : {}),
        },
      });

      queryClient.invalidateQueries({ queryKey: ["contents", id] });
      // Badge ladder: count generated content toward tiered badges
      try {
        const { bumpCounter } = await import("@/lib/gamification");
        if (type === "summary") await bumpCounter("summaries_created", 1);
      } catch {}
      if (reusedCachedSummary) {
        await base44.functions.invoke("chargeAiJob", { action: "refund", jobKey: chargedJob.jobKey, cost: chargedJob.cost }).catch(() => {});
        toast.info("تم استرجاع الملخص المحفوظ بدون خصم كريدتس");
      } else {
        await base44.functions.invoke("chargeAiJob", { action: "finalize", jobKey: chargedJob.jobKey }).catch(() => {});
      }
      chargedJob = null;
      toast.success(
        chunks.length > 1
          ? `اتولّد من ${chunks.length} أجزاء بنجاح! ✨`
          : "اتولّد بنجاح! ✨"
      );

      const xpAction = type === "summary" ? "generate_summary"
        : type === "flashcards" ? "generate_flashcards" : null;
      if (xpAction) {
        try { await awardXP(xpAction); } catch {}
      }

    } catch (err) {
      if (chargedJob) {
        await base44.functions.invoke("chargeAiJob", { action: "refund", jobKey: chargedJob.jobKey, cost: chargedJob.cost }).catch(() => {});
      }
      const msg = err?.message || "";
      const friendlyMsg =
        msg === "NO_API_KEY" ? "خدمة التوليد الذكي قيد الصيانة المؤقتة"
        : msg === "AI_QUOTA_EXCEEDED" ? "الضغط عالي على الخادم حالياً — جرب ثانية بعد دقيقة"
        : msg === "AI_MODEL_UNAVAILABLE" ? "محرك المعالجة قيد التحديث"
        : msg || "حصل خطأ غير متوقع";
      toast.error(friendlyMsg);
    } finally {
      setGenerating(null);
    }
  };

  const generateAll = async () => {
    await generate("summary", "ar");
    await generate("quiz", "ar");
    await generate("flashcards", "ar");
  };

  const deleteCourse = async () => {
    if (!confirm(isEn ? "Are you sure you want to delete this lecture note?" : "متأكد إنك عايز تمسح المذكرة دي؟")) return;
    await base44.entities.Course.delete(id);
    window.location.href = "/dashboard";
  };

  const saveToDrive = async () => {
    setSavingDrive(true);
    try {
      const token = await requestDriveToken();
      if (token) {
        await saveIntegrationSettings({ gdrive_connected: true });
      }
      const file = await uploadTextToDrive(token, {
        name: `${course.title || (isEn ? "Summary Black Fighters" : "ملخص Black Fighters")}.md`,
        content: courseToMarkdown(course),
      });
      toast.success(isEn ? "Summary saved to Google Drive ☁️" : "اتحفظ الملخص على Google Drive ☁️");
      if (file.webViewLink) window.open(file.webViewLink, "_blank");
    } catch (err) {
      toast.error(err.message || (isEn ? "Error saving to Drive" : "حصل خطأ في الحفظ على Drive"));
    } finally {
      setSavingDrive(false);
    }
  };

  const buyCourse = async () => {
    setPurchasing(true);
    try {
      const res = await base44.functions.invoke("purchaseCourse", { course_id: id, cost: priceCredits });
      if (res.data?.error) throw new Error(res.data.error);
      await queryClient.invalidateQueries({ queryKey: ["course-enrollment", id, profile?.id] });
      toast.success(isEn ? "Course purchased and credits deducted ✅" : "تم شراء الكورس وخصم الكريدتس ✅");
    } catch (err) {
      toast.error(err?.response?.data?.error || err.message || (isEn ? "Failed to purchase course" : "لم يتم شراء الكورس"));
    } finally {
      setPurchasing(false);
    }
  };

  const exportPdf = async () => {
    setExporting(true);
    const escapeHtml = (value = "") => value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
    const inline = (value = "") => escapeHtml(value)
      .replace(/==(green|yellow|cyan|orange|red):([^=]+)==/g, '<mark class="hl-$1">$2</mark>')
      .replace(/==([^=]+)==/g, '<mark class="hl-yellow">$1</mark>')
      .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
    const markdownToHtml = (value = "") => {
      const lines = value.split("\n");
      let html = "";
      let inList = false;
      lines.forEach((line) => {
        const trimmed = line.trim();
        if (!trimmed) { if (inList) { html += "</ul>"; inList = false; } return; }
        if (trimmed.startsWith("## ")) { if (inList) { html += "</ul>"; inList = false; } html += `<h2><span class="section-title">${inline(trimmed.slice(3))}</span></h2>`; return; }
        if (trimmed.startsWith("### ")) { if (inList) { html += "</ul>"; inList = false; } html += `<h3><span class="section-title small">${inline(trimmed.slice(4))}</span></h3>`; return; }
        if (trimmed.startsWith(">")) { if (inList) { html += "</ul>"; inList = false; } html += `<blockquote>${inline(trimmed.replace(/^>\s?/, ""))}</blockquote>`; return; }
        if (/^[-•]\s+/.test(trimmed)) { if (!inList) { html += "<ul>"; inList = true; } html += `<li>${inline(trimmed.replace(/^[-•]\s+/, ""))}</li>`; return; }
        if (inList) { html += "</ul>"; inList = false; }
        html += `<p>${inline(trimmed)}</p>`;
      });
      if (inList) html += "</ul>";
      return html;
    };
    const notes = await base44.entities.CourseNote.filter({ course_id: id });
    const notesFor = (index) => notes.filter((n) => n.chapter_index === index && n.content).map((n) => `<blockquote><strong>ملاحظتي:</strong><br/>${inline(n.content).replace(/\n/g, "<br/>")}</blockquote>`).join("");
    const content = (course.chapters || []).map((ch, i) => `<h2><span class="section-title">Part ${i + 1}: ${inline(ch.title)}</span></h2>${markdownToHtml(ch.content)}${notesFor(i)}`).join("") + notesFor(-1);
    const logoUrl = "/icons/black-fighters-192.png";
    const styles = `body{margin:0;background:#fff;color:#111;font-family:Arial,'Tahoma','Cairo',sans-serif;line-height:1.75}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}.page{position:relative;width:794px;max-width:100%;min-height:1123px;margin:0 auto;padding:58px 64px;box-sizing:border-box;background:#fff;color:#111}.print-watermark{position:fixed;left:50%;top:50%;transform:translate(-50%,-50%);width:260px;height:260px;object-fit:cover;opacity:.035;z-index:0}.header,.page h2,.page h3,.page p,.page ul,.page blockquote,.page code{position:relative;z-index:1}.header{display:flex;align-items:center;justify-content:space-between;margin-bottom:34px;border-bottom:1px solid #eee;padding-bottom:14px}.brand{font-size:13px;color:#777;text-align:center}.brand img{width:72px;height:42px;object-fit:cover;display:block;margin-bottom:4px}h1{font-size:28px;line-height:1.25;margin:0 0 8px;font-weight:800;color:#111}.sub{font-size:13px;color:#666;margin:0}h2{margin:24px 0 12px;font-size:18px;line-height:1.45}h3{margin:20px 0 10px;font-size:15px}.section-title{display:inline-block;background:#242424;color:#fff;border-radius:3px;padding:2px 6px;font-weight:800}.section-title.small{font-size:.92em}p{margin:8px 0}ul{margin:8px 0 16px;padding-inline-start:26px}li{margin:4px 0}strong{font-weight:900;color:#000}mark{border-radius:4px;padding:1px 5px;font-weight:900;color:#000;box-decoration-break:clone;-webkit-box-decoration-break:clone}.hl-yellow{background:#fff05a}.hl-green{background:#58f59b}.hl-cyan{background:#54f4ea}.hl-orange{background:#ffc078}.hl-red{background:#ff4d4d;color:#000}blockquote{margin:14px 0;padding:10px 14px;border-right:4px solid #ff4d4d;background:#fff7d6;font-weight:700}code{background:#f1f1f1;border-radius:3px;padding:1px 4px;color:#111}@media print{.page{width:auto;min-height:auto;margin:0;padding:42px 52px}.print-watermark{position:fixed}}`;
    const win = window.open("", "_blank");
    win.document.write(`<!doctype html><html lang="ar" dir="auto"><head><meta charset="utf-8"><title>${escapeHtml(course.title || "Black Fighters")}</title><style>${styles}</style></head><body><img class="print-watermark" src="${logoUrl}"/><main class="page"><section class="header"><div><h1>${inline(course.title || "Black Fighters")}</h1><p class="sub">${inline(course.description || "محتوى عربي + English keywords")}</p></div><div class="brand"><img src="${logoUrl}"/>Black Fighters</div></section>${content}</main><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`);
    win.document.close();
    setTimeout(() => setExporting(false), 600);
  };

  if (isLoading) {
    return (
      <div className="max-w-4xl mx-auto space-y-4">
        <Skeleton className="h-32 rounded-3xl" />
        <Skeleton className="h-64 rounded-3xl" />
      </div>
    );
  }

  if (!course) return <p className="text-center text-muted-foreground py-20">{isEn ? "Course not found" : "الكورس مش موجود"}</p>;

  const priceCredits = Number(course.price_credits || 0);
  const isOwnerOrAdmin = course.created_by_id === profile?.id || profile?.role === "admin";
  const isEnrolled = enrollments.length > 0;
  const needsPurchase = priceCredits > 0 && !isOwnerOrAdmin && !isEnrolled;
  const userCredits = Number(profile?.credits || 0);
  const hasEnoughCredits = userCredits >= priceCredits;

  if (needsPurchase) {
    return (
      <div className="max-w-4xl mx-auto" dir={dir}>
        <Link to="/dashboard" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-primary mb-6 transition-colors">
          <ArrowRight className={isEn ? "w-4 h-4 rotate-180" : "w-4 h-4"} /> {isEn ? "Back to Courses" : "رجوع للكورسات"}
        </Link>
        <div className="glass-card rounded-3xl p-8 border border-yellow-400/30 text-center">
          <Coins className="w-14 h-14 text-yellow-400 mx-auto mb-4" />
          <h1 className="text-2xl font-black mb-2">{course.title}</h1>
          <p className="text-muted-foreground mb-5">{isEn ? "This course requires purchase before accessing content." : "هذا الكورس يحتاج شراء قبل فتح المحتوى."}</p>
          <div className="flex flex-wrap items-center justify-center gap-3 mb-6">
            <div className="inline-flex items-center gap-2 rounded-2xl bg-yellow-400/10 text-yellow-400 px-4 py-2 font-black border border-yellow-400/20">
              <Coins className="w-4 h-4" /> {priceCredits} {isEn ? "Credits Required" : "كريدت مطلوب"}
            </div>
            <div className="inline-flex items-center gap-2 rounded-2xl bg-primary/10 text-primary px-4 py-2 font-bold border border-primary/20">
              {isEn ? `Your balance: ${userCredits} Credits` : `رصيدك الحالي: ${userCredits} كريدت`}
            </div>
          </div>
          {!hasEnoughCredits && (
            <p className="text-xs text-destructive font-bold mb-4">
              {isEn ? "⚠️ Your credits are insufficient. Upgrade or recharge to unlock." : "⚠️ رصيدك الحالي غير كافٍ لفتح هذا الكورس. اشحن رصيدك أو رقّي حسابك."}
            </p>
          )}
          <Button onClick={buyCourse} disabled={purchasing || !hasEnoughCredits} className="w-full sm:w-auto gap-2 font-bold">
            {purchasing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Coins className="w-4 h-4" />}
            {purchasing ? (isEn ? "Purchasing..." : "جاري الشراء...") : (isEn ? `Unlock Course (${priceCredits} Credits)` : `فتح الكورس وخصم (${priceCredits} كريدت)`)}
          </Button>
        </div>
      </div>
    );
  }

  const GenButton = ({ type, label, icon: Icon }) => {
    const isThisGenerating = generating === type || generating?.startsWith(type + "_");
    // Parse chunk progress: "summary_2_5" => "2/5"
    const chunkMatch = generating?.match(new RegExp(`^${type}_(\\d+)_(\\d+)$`));
    const chunkLabel = chunkMatch ? ` (${chunkMatch[1]}/${chunkMatch[2]})` : "";
    return (
      <Button
        onClick={() => generate(type)}
        disabled={!!generating}
        variant="outline"
        className="gap-2 border-[#19f08c]/35 hover:border-[#19f08c] hover:bg-[#19f08c]/10"
      >
        {isThisGenerating
          ? <Loader2 className="w-4 h-4 animate-spin" />
          : <Icon className="w-4 h-4 text-[#19f08c]" />}
        {isThisGenerating
          ? (isEn ? `Generating${chunkLabel}...` : `جاري التوليد${chunkLabel}...`)
          : getContent(type)
            ? (isEn ? `Regenerate ${label}` : `إعادة توليد ${label}`)
            : (isEn ? `Generate ${label}` : `توليد ${label}`)}
      </Button>
    );
  };

  const exportToTelegramBot = async (customType = null) => {
    setExportingTelegram(true);
    try {
      const summaryItem = contents.find((c) => c.type === "summary");
      const quizItem = contents.find((c) => c.type === "quiz");
      const activeType = customType || (quizItem ? "quiz" : "summary");

      let questions = [];
      if (activeType === "quiz" && quizItem) {
        try {
          const parsed = JSON.parse(quizItem.content);
          questions = Array.isArray(parsed) ? parsed : parsed.questions || [];
        } catch {}
      }

      // Server-side export: bot token + chat-id lookup never touch the client
      const res = await invokeSecureFunction("export-to-telegram", {
        title: course?.title || "ملخص دراسي",
        type: activeType,
        summaryText: summaryItem?.content || course?.description || "",
        questions,
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم التصدير إلى التيليجرام بنجاح! تفقد البوت 🤖");
      } else if (res.data?.error === "NO_TELEGRAM_LINKED") {
        toast.error(res.data.message, {
          action: {
            label: "ربط البوت",
            onClick: () => window.open(`https://t.me/black_fighters_bot?start=link_${profile?.id || "me"}`, "_blank"),
          },
        });
      } else {
        toast.error(res.data?.message || "فشل التصدير للتيليجرام");
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message;
      if (msg && (msg.includes("غير مربوط") || msg.includes("NO_TELEGRAM_LINKED"))) {
        toast.error(msg, {
          action: {
            label: "ربط البوت",
            onClick: () => window.open(`https://t.me/black_fighters_bot?start=link_${profile?.id || "me"}`, "_blank"),
          },
        });
      } else {
        toast.error(msg || "حصل خطأ في التصدير للتيليجرام");
      }
    } finally {
      setExportingTelegram(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6" dir={dir}>
      <Link to="/dashboard" className="inline-flex items-center gap-2 text-xs font-semibold text-white/55 hover:text-[#19f08c] mb-2 transition-colors font-mono uppercase tracking-wider">
        <ArrowRight className={isEn ? "w-4 h-4 rotate-180" : "w-4 h-4"} /> {isEn ? "Back to Lectures & Notes" : "رجوع للمحاضرات والمذكرات"}
      </Link>

      <div className="relative glass rounded-3xl p-6 sm:p-8 border border-white/10 mb-6 overflow-hidden">
        <div className="relative z-10 flex items-start justify-between gap-4">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-3xl font-bold text-gradient">{course.title}</h1>
            <p className="text-xs sm:text-sm text-white/60 max-w-xl">{course.description}</p>
            <Button onClick={generateAll} disabled={!!generating} size="sm" className="mt-4 gap-2 font-bold btn-primary-glow h-10 px-5 rounded-full">
              {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              {isEn ? "Generate All Content (All AI)" : "توليد المحتوى بالكامل (All AI)"}
            </Button>
          </div>
          <div className="flex flex-col gap-1 shrink-0">
            <div className="flex items-center gap-1">
              <button onClick={() => setReviewReminderOpen(true)} className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={isEn ? "Review Alert" : "تنبيه مراجعة"}>
                <BellPlus className="w-4 h-4" />
              </button>
              <button onClick={() => setReminderOpen(true)} className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors" title={isEn ? "Google Calendar Reminder" : "تذكير Google Calendar"}>
                <CalendarPlus className="w-4 h-4" />
              </button>
              <button
                onClick={saveToDrive}
                disabled={savingDrive}
                className="p-2 rounded-xl text-muted-foreground hover:text-[#4285F4] hover:bg-[#4285F4]/10 transition-colors disabled:opacity-50"
                title={isEn ? "Save to Google Drive" : "حفظ على Google Drive"}
              >
                {savingDrive ? <Loader2 className="w-4 h-4 animate-spin text-[#4285F4]" /> : <AnimatedGoogleDrive size={18} />}
              </button>
              <button
                onClick={() => exportToTelegramBot()}
                disabled={exportingTelegram}
                className="p-2 rounded-xl text-muted-foreground hover:text-[#0088cc] hover:bg-[#0088cc]/10 transition-colors disabled:opacity-50"
                title={isEn ? "Export to Telegram Bot 🤖" : "تصدير إلى التيليجرام 🤖"}
              >
                {exportingTelegram ? <Loader2 className="w-4 h-4 animate-spin text-[#0088cc]" /> : <Send className="w-4 h-4 text-[#0088cc]" />}
              </button>
              <button
                onClick={exportPdf}
                disabled={exporting}
                className="p-2 rounded-xl text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors disabled:opacity-50"
                title={isEn ? "Export PDF" : "تصدير PDF"}
              >
                {exporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              </button>
              <button onClick={deleteCourse} className="p-2 rounded-xl text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors" title={isEn ? "Delete Course" : "حذف المذكرة"}>
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      <TojiCoach course={course} generatedCount={contents.filter((c) => ["quiz", "summary", "flashcards"].includes(c.type)).length} />
      <CourseInsightBar course={course} generatedCount={contents.filter((c) => ["quiz", "summary", "flashcards"].includes(c.type)).length} />

      <Tabs defaultValue="content" dir={dir}>
        <TabsList className="glass border border-white/10 w-full justify-start h-auto p-1.5 flex-wrap rounded-2xl">
          <TabsTrigger value="content" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><BookOpen className="w-4 h-4" /> {isEn ? "Study Content" : "المحتوى الدراسي"}</TabsTrigger>
          <TabsTrigger value="quiz" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><Brain className="w-4 h-4" /> {isEn ? "Quizzes" : "الكويزات"}</TabsTrigger>
          <TabsTrigger value="summary" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><FileText className="w-4 h-4" /> {isEn ? "Summaries" : "التلخيصات"}</TabsTrigger>
          <TabsTrigger value="flashcards" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><Layers className="w-4 h-4" /> {isEn ? "Flashcards" : "البطاقات التعليمية"}</TabsTrigger>
          <TabsTrigger value="notes" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><StickyNote className="w-4 h-4" /> {isEn ? "Notes" : "الملاحظات"}</TabsTrigger>
          <TabsTrigger value="study" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><GraduationCap className="w-4 h-4" /> {isEn ? "Study Mode" : "وضع المذاكرة"}</TabsTrigger>
          <TabsTrigger value="practice" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><Target className="w-4 h-4" /> {isEn ? "Practice" : "تدريب"}</TabsTrigger>
          <TabsTrigger value="share" className="gap-2 data-[state=active]:bg-primary/15 data-[state=active]:text-primary"><Share2 className="w-4 h-4" /> {isEn ? "Share" : "مشاركة"}</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="mt-6">
          <EditableStudySheet course={course} />
        </TabsContent>

        <TabsContent value="quiz" className="mt-6">
          {getContent("quiz") ? (
            <div>
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <Button
                  onClick={() => navigate(`/challenge/new/${id}`)}
                  size="sm"
                  className="gap-2 font-bold rounded-full btn-primary-glow"
                >
                  <Swords className="w-4 h-4" />
                  {isEn ? "Start Live Challenge ⚔️" : "بدء تحدّي مباشر ⚔️"}
                </Button>
                <Button
                  onClick={() => exportToTelegramBot("quiz")}
                  disabled={exportingTelegram}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#0088cc]/40 text-[#0088cc] hover:bg-[#0088cc]/10 font-bold rounded-xl"
                >
                  {exportingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isEn ? "Export Quiz to Telegram" : "تصدير الكويز للتيليجرام 🤖"}
                </Button>
              </div>
              <QuizControls isEn={isEn} quizProfiles={quizProfiles} quizCount={quizCount} setQuizCount={setQuizCount} difficulty={difficulty} setDifficulty={setDifficulty} quizProfile={quizProfile} setQuizProfile={setQuizProfile} showExplanations={showExplanations} setShowExplanations={setShowExplanations} action={<GenButton type="quiz" label={isEn ? "New Quiz" : "كويز جديد"} icon={Sparkles} />} />
              <QuizView quiz={getContentData("quiz")} course={course} />
            </div>
          ) : (
            <EmptyGen label={isEn ? "Interactive Quiz" : "كويز تفاعلي"} desc={isEn ? "Multiple-choice questions — or paste your questions and answers" : "أسئلة اختيار متعدد — أو الصق أسئلتك بإجاباتها"} button={
              <QuizControls isEn={isEn} quizProfiles={quizProfiles} quizCount={quizCount} setQuizCount={setQuizCount} difficulty={difficulty} setDifficulty={setDifficulty} quizProfile={quizProfile} setQuizProfile={setQuizProfile} showExplanations={showExplanations} setShowExplanations={setShowExplanations} action={<GenButton type="quiz" label={isEn ? "Quiz" : "الكويز"} icon={Brain} />} />
            } />
          )}
        </TabsContent>

        <TabsContent value="summary" className="mt-6">
          {getContent("summary") ? (
            <div>
              <div className="flex justify-between items-center mb-3 flex-wrap gap-2">
                <div />
                <Button
                  onClick={() => exportToTelegramBot("summary")}
                  disabled={exportingTelegram}
                  variant="outline"
                  size="sm"
                  className="gap-2 border-[#0088cc]/40 text-[#0088cc] hover:bg-[#0088cc]/10 font-bold rounded-xl"
                >
                  {exportingTelegram ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                  {isEn ? "Export Summary to Telegram" : "تصدير الملخص للتيليجرام 🤖"}
                </Button>
              </div>
              <SummaryGenerationControls summaryStyle={summaryStyle} setSummaryStyle={setSummaryStyle} maxPages={summaryMaxPages} setMaxPages={setSummaryMaxPages} colorLevel={summaryColorLevel} setColorLevel={setSummaryColorLevel} textLength={courseText().length} action={<GenButton type="summary" label={isEn ? "New Summary" : "ملخص جديد"} icon={Sparkles} />} />
              <SummaryView summary={getContentData("summary")} course={course} />
            </div>
          ) : (
            <EmptyGen label={isEn ? "Comprehensive Summary" : "ملخص شامل"} desc={isEn ? "Choose template and depth before generating" : "اختار الشكل والحجم قبل التوليد"} button={<SummaryGenerationControls summaryStyle={summaryStyle} setSummaryStyle={setSummaryStyle} maxPages={summaryMaxPages} setMaxPages={setSummaryMaxPages} colorLevel={summaryColorLevel} setColorLevel={setSummaryColorLevel} textLength={courseText().length} action={<GenButton type="summary" label={isEn ? "Summary" : "الملخص"} icon={FileText} />} />} />
          )}
        </TabsContent>

        <TabsContent value="flashcards" className="mt-6">
          {getContent("flashcards") ? (
            <div>
              <div className="flex justify-end mb-4"><GenButton type="flashcards" label={isEn ? "New Flashcards" : "بطاقات جديدة"} icon={Sparkles} /></div>
              <FlashcardsView flashcards={getContentData("flashcards")} course={course} />
            </div>
          ) : (
            <EmptyGen label={isEn ? "Recall Flashcards" : "بطاقات تذكر"} desc={isEn ? "Interactive flashcards for fast spaced repetition" : "Flashcards تفاعلية للمذاكرة السريعة"} button={<GenButton type="flashcards" label={isEn ? "Flashcards" : "البطاقات"} icon={Layers} />} />
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-6">
          <NotesView courseId={id} course={course} />
        </TabsContent>

        <TabsContent value="study" className="mt-6">
          {getContent("quiz") ? (
            <StudyMode quiz={getContentData("quiz")} />
          ) : (
            <div className="text-center py-12">
              <GraduationCap className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">{isEn ? "Generate a quiz first from the Quizzes tab to review questions with explanations without stress or timers" : "ولّد كويز الأول من تاب الكويزات عشان تذاكر الأسئلة وشرحها بدون ضغط ولا مؤقت"}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="practice" className="mt-6">
          {getContent("quiz") ? (
            <PracticeMode quiz={getContentData("quiz")} />
          ) : (
            <div className="text-center py-12">
              <Target className="w-12 h-12 text-muted-foreground mx-auto mb-3 opacity-40" />
              <p className="text-muted-foreground">{isEn ? "Generate a quiz first from the Quizzes tab to enable practice mode" : "ولّد كويز الأول من تاب الكويزات عشان تقدر تستخدم وضع التدريب"}</p>
            </div>
          )}
        </TabsContent>

        <TabsContent value="share" className="mt-6">
          <CourseShareCard course={course} />
        </TabsContent>
      </Tabs>

      <LanguageDialog open={!!langDialog} onSelect={(lang) => generate(langDialog, lang)} onClose={() => setLangDialog(null)} />
      <ReminderDialog open={reminderOpen} onClose={() => setReminderOpen(false)} courseTitle={course.title} />
      <ReviewReminderDialog open={reviewReminderOpen} onClose={() => setReviewReminderOpen(false)} course={course} />
      <AiChatAssistant course={course} />
    </div>
  );
}

function QuizControls({ isEn = false, quizProfiles, quizCount, setQuizCount, difficulty, setDifficulty, quizProfile, setQuizProfile, showExplanations, setShowExplanations, action }) {
  const counts = [5, 10, 20, 50, 100];
  const profiles = quizProfiles || [
    { id: "balanced", label: isEn ? "Balanced" : "Balanced", hint: isEn ? "Comprehensive review" : "مراجعة شاملة" },
    { id: "exam", label: isEn ? "Exam" : "Exam", hint: isEn ? "Exam-like questions" : "شبه الامتحان" },
    { id: "concepts", label: isEn ? "Concepts" : "Concepts", hint: isEn ? "Deep understanding" : "فهم عميق" },
    { id: "application", label: isEn ? "Cases" : "Cases", hint: isEn ? "Clinical cases" : "تطبيق وحالات" },
    { id: "traps", label: isEn ? "Traps" : "Traps", hint: isEn ? "Common traps" : "أخطاء شائعة" },
  ];
  return (
    <div className="glass rounded-2xl p-4 border border-white/10 mb-4 space-y-4">
      <div className="flex items-start gap-2 rounded-xl bg-[#19f08c]/5 border border-[#19f08c]/20 p-3">
        <span className="text-base">💡</span>
        <p className="text-xs text-white/65 leading-relaxed">
          {isEn
            ? "Black Fighters automatically analyzes content: extracts existing question banks, generates new questions from explanations, and eliminates duplicates."
            : "Black Fighters يحلل المحتوى تلقائياً: لو لقى بنك أسئلة هيستخرجها، ولو المحتوى شرح هيولّد أسئلة جديدة، ولو مختلط هيعمل الاتنين مع حذف التكرار."}
        </p>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">{isEn ? "Number of Questions — up to 100" : "عدد الأسئلة — لحد 100 سؤال"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {counts.map((n) => (
            <button key={n} onClick={() => setQuizCount(n)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${quizCount === n ? "border-[#19f08c] text-[#19f08c] bg-[#19f08c]/10" : "border-white/10 text-white/60"}`}>{n}</button>
          ))}
          <input
            type="number"
            min="1"
            max="100"
            value={quizCount}
            onChange={(e) => setQuizCount(Math.max(1, Math.min(100, Number(e.target.value) || 1)))}
            className="w-24 bg-[#05070a] border border-white/10 rounded-xl px-3 py-2 text-sm font-bold"
          />
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">{isEn ? "Difficulty Level" : "مستوى الصعوبة"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            ["easy", isEn ? "Easy 😌" : "سهل 😌"],
            ["mixed", isEn ? "Mixed ⚖️" : "متنوع ⚖️"],
            ["hard", isEn ? "Hard 🔥" : "صعب 🔥"]
          ].map(([v, l]) => (
            <button key={v} onClick={() => setDifficulty(v)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${difficulty === v ? "border-[#19f08c] text-[#19f08c] bg-[#19f08c]/10" : "border-white/10 text-white/60"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">{isEn ? "Quiz Profile" : "نوع الكويز"}</p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          {profiles.map((profile) => (
            <button
              key={profile.id}
              onClick={() => setQuizProfile(profile.id)}
              className={`rounded-xl border px-2 py-2 text-center transition-colors ${quizProfile === profile.id ? "border-[#19f08c] bg-[#19f08c]/10 text-[#19f08c]" : "border-white/10 bg-white/[0.02] text-white/60"}`}
            >
              <span className="block text-xs font-bold">{profile.label}</span>
              <span className="block text-[10px] opacity-75">{profile.hint}</span>
            </button>
          ))}
        </div>
      </div>
      <div>
        <p className="text-sm font-semibold mb-2">{isEn ? "Answer Explanations" : "شرح الإجابات"}</p>
        <div className="flex flex-wrap items-center gap-2">
          {[
            [true, isEn ? "Show explanations after answering ✅" : "اعرض الشرح بعد الإجابة ✅"],
            [false, isEn ? "Without explanations ✋" : "بدون شرح ✋"]
          ].map(([v, l]) => (
            <button key={String(v)} onClick={() => setShowExplanations(v)} className={`px-4 py-2 rounded-xl text-sm font-bold border transition-colors ${showExplanations === v ? "border-[#19f08c] text-[#19f08c] bg-[#19f08c]/10" : "border-white/10 text-white/60"}`}>{l}</button>
          ))}
        </div>
      </div>
      <div className="flex justify-end">{action}</div>
    </div>
  );
}

function EmptyGen({ label, desc, button }) {
  return (
    <div className="glass rounded-3xl p-14 text-center border border-white/10">
      <Sparkles className="w-12 h-12 text-[#19f08c] mx-auto mb-4 opacity-80" />
      <h3 className="text-xl font-bold mb-2 text-white">{label}</h3>
      <p className="text-white/60 mb-6">{desc}</p>
      {button}
    </div>
  );
}
