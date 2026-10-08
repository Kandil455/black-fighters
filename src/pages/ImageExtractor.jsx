import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { 
  Upload, Layers, Settings2, Download, 
  BookOpen, RotateCcw, Play 
} from "lucide-react";
import { PracticalQuizIcon } from "@/components/ui/icons";
import { ImageExtractorUpload } from "@/components/imageExtractor/ImageExtractorUpload";
import { ImageReviewGrid } from "@/components/imageExtractor/ImageReviewGrid";
import { ImageQuizControls } from "@/components/imageExtractor/ImageQuizControls";
import { ImageQuizPlayer } from "@/components/imageExtractor/ImageQuizPlayer";
import { ImageExportPanel } from "@/components/imageExtractor/ImageExportPanel";
import { ImageLibrary } from "@/components/imageExtractor/ImageLibrary";
import { extractImagesFromFile } from "@/lib/imageExtractor";
import { filterImagesHeuristics } from "@/lib/imageFilter";
import { saveExtractionSession, getExtractionSession, getExtractionHistory } from "@/lib/imageExtractorDb";
import { exportImagesToZip, exportToPptx, exportToPdf, exportToQuizJson } from "@/lib/imageExport";
import { practicalQuizJob } from "@/lib/practicalQuizJob";
import { useAuth } from "@/lib/AuthContext";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { openTelegramLinkWithCode } from "@/lib/telegramClient";
import { apiUrl, resolveMediaUrl } from "@/lib/apiBase";

/**
 * Normalize the AI's answer key into the index the quiz players expect.
 * Accepts: numeric index | "0"-style string | option text | "A"-"D" letter.
 * The old `?? 0` fallback silently made every letter/text answer score as
 * option A — users saw 100% wrong scores on AI-generated image quizzes.
 */
function normalizeCorrectIndex(q, options = []) {
  const raw = q?.correctIndex ?? q?.correct_index ?? q?.correct ?? q?.correctOption;
  const asNum = Number(raw);
  if (Number.isInteger(asNum) && asNum >= 0 && asNum < options.length) return asNum;
  const asText = String(raw ?? "").trim();
  if (!asText) return 0;
  const byText = options.findIndex((o) => String(o).trim() === asText);
  if (byText >= 0) return byText;
  if (/^[A-Da-d]$/.test(asText)) {
    const idx = asText.toUpperCase().charCodeAt(0) - 65;
    if (idx < options.length) return idx;
  }
  const lettered = options.findIndex((o) => String(o).trim().startsWith(asText.toUpperCase() + ")"));
  if (lettered >= 0) return lettered;
  return 0;
}

export default function ImageExtractor() {
  const navigate = useNavigate();
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [activeTab, setActiveTab] = useState("upload"); // upload | review | quiz_controls | quiz_player | export | library
  const [images, setImages] = useState([]);
  const [fileName, setFileName] = useState("");
  const [sourceType, setSourceType] = useState("pdf");
  const [isProcessing, setIsProcessing] = useState(false);
  const [isGeneratingQuiz, setIsGeneratingQuiz] = useState(false);
  const [progress, setProgress] = useState(null);
  const [quizProgress, setQuizProgress] = useState(null);
  const [isSaved, setIsSaved] = useState(false);
  const [savedQuiz, setSavedQuiz] = useState(null);

  // ── Sync with background practical quiz job & Auto-restore last active session ──
  useEffect(() => {
    const unsub = practicalQuizJob.subscribe((job) => {
      if (job.isRunning) {
        setIsGeneratingQuiz(true);
        setQuizProgress({
          current: job.current,
          total: job.total,
          percent: job.percent,
        });
      } else if (job.isCompleted) {
        setIsGeneratingQuiz(false);
        setQuizProgress(null);
        if (job.images && job.images.length > 0) {
          setImages(job.images);
          setActiveTab("quiz_player");
        }
      } else {
        setIsGeneratingQuiz(false);
        setQuizProgress(null);
      }
    });

    const init = practicalQuizJob.getState();
    if (init.isRunning) {
      setIsGeneratingQuiz(true);
      setQuizProgress({
        current: init.current,
        total: init.total,
        percent: init.percent,
      });
      if (init.images && init.images.length > 0) {
        setImages(init.images);
      }
    } else if (init.isCompleted && init.images?.length > 0) {
      setImages(init.images);
      setActiveTab("quiz_player");
    } else {
      // Auto-restore last active extraction session from IndexedDB if in-memory state is empty
      const isCleared = localStorage.getItem("bf_session_cleared") === "true";
      if (!isCleared) {
        const lastSessionId = localStorage.getItem("bf_last_active_extraction_id");
        const restorePromise = lastSessionId
          ? getExtractionSession(lastSessionId)
          : getExtractionHistory().then(h => (h && h.length > 0 ? getExtractionSession(h[0].id) : null));

        restorePromise.then((session) => {
        if (session && session.images && session.images.length > 0) {
          setImages(session.images);
          setFileName(session.fileName || "ملف مستخرج");
          setSourceType(session.sourceType || "pdf");
          setIsSaved(true);
          const hasQuizzes = session.images.some(img => img.quiz && img.quiz.length > 0);
          if (hasQuizzes) {
            setActiveTab("quiz_player");
          } else {
            setActiveTab("review");
          }
        }
      }).catch((err) => console.warn("[ImageExtractor] auto-restore failed:", err));
      }
    }

    return () => unsub();
  }, []);

  // ── 1. Pipeline: Start Extraction ──────────────────────────────────────────
  const handleStartExtraction = async ({ file, options }) => {
    try {
      localStorage.removeItem("bf_session_cleared");
      setIsProcessing(true);
      setFileName(file.name);
      setSourceType(file.name.split(".").pop()?.toLowerCase() || "pdf");
      setIsSaved(false);

      // Phase 1: Client-side Document Extraction
      setProgress({
        stageLabel: "جاري قراءة واستخراج الصور المدمجة...",
        percent: 15,
        detail: `جاري فحص صفحات ${file.name}`,
      });

      const extracted = await extractImagesFromFile(file, (p) => {
        setProgress({
          stageLabel: "جاري استخراج الصور والنصوص...",
          percent: Math.min(45, Math.round(p.percent * 0.45)),
          detail: `صفحة ${p.currentPage} من ${p.totalPages}`,
        });
      });

      if (!extracted.length) {
        toast.error("لم يتم العثور على أي صور مدمجة في هذا الملف.");
        setIsProcessing(false);
        return;
      }

      // Phase 2: Client-side Heuristic Pixel Analysis (Instant Canvas API)
      setProgress({
        stageLabel: "تطبيق فلاتر الجودة الهيوريستيك (Canvas API)...",
        percent: 55,
        detail: "استبعاد الأبعاد الصغيرة، الخلفيات الفارغة، واللوجوهات المكررة",
        foundCount: extracted.length,
      });

      const heuristicResult = await filterImagesHeuristics(
        extracted,
        {
          minDimension: options.minDimension,
          allowDuplicates: options.allowDuplicates,
        },
        (hp) => {
          setProgress({
            stageLabel: "فحص بكسلات الصور وتوزيع الألوان...",
            percent: 50 + Math.round(hp.percent * 0.45),
            detail: `فحص الصورة ${hp.current} من ${hp.total}`,
            foundCount: extracted.length,
          });
        }
      );

      let finalImages = [
        ...heuristicResult.kept,
        ...heuristicResult.rejected,
      ];

      setProgress({ stageLabel: "اكتمل الاستخراج بنجاح!", percent: 100 });
      setImages(finalImages);

      // Auto-save session immediately to IndexedDB so page reload or update NEVER loses data!
      const newSessionId = `session_${Date.now()}`;
      try {
        await saveExtractionSession({
          id: newSessionId,
          fileName: file.name,
          sourceType: file.name.split(".").pop()?.toLowerCase() || "pdf",
          images: finalImages,
        });
        localStorage.setItem("bf_last_active_extraction_id", newSessionId);
        setIsSaved(true);
      } catch (saveErr) {
        console.warn("[ImageExtractor] initial auto-save error:", saveErr);
      }

      playSuccess();
      toast.success(`تم استخراج ${extracted.length} صورة، وقبول ${heuristicResult.kept.filter(i => i.status === "kept").length} صورة علمية!`);
      setActiveTab("review");
    } catch (err) {
      console.error("[ImageExtractor] Extraction failed:", err);
      toast.error(err?.message || "حدث خطأ أثناء استخراج الصور من الملف.");
    } finally {
      setIsProcessing(false);
      setProgress(null);
    }
  };

  // ── 2. Update Image State & Persist to Active Session ───────────────────────
  const handleUpdateImage = (id, updates) => {
    setImages((prev) => {
      const next = prev.map((img) => (img.id === id ? { ...img, ...updates } : img));
      const activeId = localStorage.getItem("bf_last_active_extraction_id");
      if (activeId) {
        saveExtractionSession({
          id: activeId,
          fileName,
          sourceType,
          images: next,
        }).catch(() => {});
      }
      return next;
    });
  };

  const handleStartNewSession = () => {
    playClick();
    setImages([]);
    setFileName("");
    setIsSaved(false);
    setSavedQuiz(null);
    localStorage.removeItem("bf_last_active_extraction_id");
    localStorage.setItem("bf_session_cleared", "true");
    practicalQuizJob.clearJob();
    setActiveTab("upload");
    toast.info(isEn ? "Started fresh session" : "تم بدء جلسة جديدة جاهزة للرفع ✨");
  };

  const handleBulkUpdateStatus = (status) => {
    playClick();
    setImages((prev) => prev.map((img) => ({ ...img, status })));
    toast.success(`تم تعيين حالة جميع الصور إلى: ${status === "kept" ? "مقبولة" : "مستبعدة"}`);
  };

  // ── 3. Pipeline: Generate AI Quizzes ───────────────────────────────────────
  const handleGenerateQuiz = async ({ totalQuestions = 10, difficulty = "mixed", language = "auto" }) => {
    const keptList = images.filter((img) => img.status !== "rejected");
    if (!keptList.length) {
      toast.error("يرجى قبول صورة واحدة على الأقل لتوليد الكويز.");
      return;
    }

    const targetTotal = Math.max(1, Math.min(100, Number(totalQuestions) || 10));

    // Rank images by clinical importance & context density
    const scoredImages = keptList.map((img) => {
      const text = (img.contextText || "").toLowerCase();
      let score = Math.min(text.length, 300);
      const clinicalKeywords = [
        "ecg", "ekg", "x-ray", "ct", "mri", "ultrasound", "us", "pathology", "histology",
        "syndrome", "triad", "diagnosis", "sign", "symptom", "treatment", "management",
        "emergency", "shock", "fracture", "artery", "nerve", "lesion", "carcinoma", "staging",
        "تشخيص", "أشعة", "رسم قلب", "علاج", "عرض", "علامة", "متلازمة", "طوارئ", "كسر", "شريان", "وريد"
      ];
      clinicalKeywords.forEach((kw) => {
        if (text.includes(kw)) score += 60;
      });
      return { img, score };
    });

    // Sort descending by clinical relevance score
    scoredImages.sort((a, b) => b.score - a.score);

    // Plan distribution of questions
    const allocation = [];
    if (targetTotal <= scoredImages.length) {
      // Pick top targetTotal clinically significant images, 1 question each
      for (let i = 0; i < targetTotal; i++) {
        allocation.push({ img: scoredImages[i].img, count: 1 });
      }
    } else {
      // More questions than images: distribute across top images
      const counts = scoredImages.map(() => 1);
      let remaining = targetTotal - scoredImages.length;
      let idx = 0;
      while (remaining > 0) {
        counts[idx % scoredImages.length] += 1;
        remaining--;
        idx++;
      }
      for (let i = 0; i < scoredImages.length; i++) {
        allocation.push({ img: scoredImages[i].img, count: counts[i] });
      }
    }

    // Delegate to global background manager (runs concurrently, updates widget, auto-saves to IndexedDB)
    practicalQuizJob.startJob({
      images,
      allocation,
      targetTotal,
      difficulty,
      language,
      fileName,
      profile,
    });
  };

  // ── 4. Save to Local IndexedDB Library ─────────────────────────────────────
  const handleSaveToLibrary = async () => {
    const kept = images.filter((img) => img.status !== "rejected");
    if (!kept.length) throw new Error("لا توجد صور مقبولة للحفظ");

    await saveExtractionSession({
      id: `session_${Date.now()}`,
      fileName,
      sourceType,
      images,
    });

    setIsSaved(true);
    toast.success("تم حفظ الحزمة في مكتبتك المحلية بنجاح! 📚");
  };

  // ── High-Speed In-Memory Cache for Session Images ─────────────────────────
  const optimizedImageCache = React.useRef(new Map()).current;

  // ── Helper: Parallel & Lightweight Image Processor (~20KB WebP/JPEG) ──────
  const optimizeAndUploadImage = async (dataUrl) => {
    if (!dataUrl) return "";
    if (dataUrl.startsWith("http://") || dataUrl.startsWith("https://")) return dataUrl;
    if (optimizedImageCache.has(dataUrl)) return optimizedImageCache.get(dataUrl);

    // 1. Fast Client-side Canvas Compression (Max 480px, ~20KB) - instantaneous
    const compressed = await new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        const MAX = 480;
        let { width, height } = img;
        if (width > MAX || height > MAX) {
          if (width > height) {
            height = Math.round((height * MAX) / width);
            width = MAX;
          } else {
            width = Math.round((width * MAX) / height);
            height = MAX;
          }
        }
        const canvas = document.createElement("canvas");
        canvas.width = Math.max(1, width);
        canvas.height = Math.max(1, height);
        const ctx = canvas.getContext("2d", { willReadFrequently: true });
        if (!ctx) return resolve(dataUrl);
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL("image/jpeg", 0.72));
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });

    // 2. Quick non-blocking attempt to CDN with 2s timeout (auth required)
    let finalUrl = compressed;
    try {
      const { auth } = await import("@/lib/firebase");
      const token = auth?.currentUser ? await auth.currentUser.getIdToken() : "";
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 2000);
      const res = await fetch(apiUrl("upload-media"), {
        method: "POST",
        headers: { "Content-Type": "application/json", ...(token ? { Authorization: `Bearer ${token}` } : {}) },
        body: JSON.stringify({
          dataUrl: compressed,
          filename: `quiz_img_${Date.now()}_${Math.random().toString(36).slice(2, 6)}.jpg`,
          mimeType: "image/jpeg",
        }),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);
      if (res.ok) {
        const data = await res.json();
        if (data?.url) finalUrl = resolveMediaUrl(data.url);
      }
    } catch {}

    optimizedImageCache.set(dataUrl, finalUrl);
    return finalUrl;
  };

  // ── 4b. Save Quiz to Cloud Account (StandaloneQuizzes) — High Throughput ──
  const handleSaveToPlatformQuiz = async () => {
    const keptList = images.filter((img) => img.status !== "rejected" && Array.isArray(img.quiz) && img.quiz.length > 0);
    if (!keptList.length) {
      toast.error("لا توجد أسئلة كويز مولدة للحفظ في المنصة");
      return null;
    }

    if (savedQuiz?.id) {
      toast.success("الكويز محفوظ بالفعل في حسابك وبنك الكويزات! 🎯", {
        action: {
          label: "فتح الكويز",
          onClick: () => navigate(`/q/${savedQuiz.id}`),
        },
      });
      return savedQuiz;
    }

    const user = profile || (await base44.auth.me().catch(() => null));
    if (!user) {
      toast.error("سجل دخولك أولاً لحفظ الكويز في حسابك");
      return null;
    }

    const toastId = toast.loading("جاري حفظ الكويز في المنصة بسرعة فائقة... ⚡");

    try {
      // Parallelize image optimization for instant processing
      const uniqueUrls = new Map();
      await Promise.all(
        keptList.map(async (img) => {
          if (!uniqueUrls.has(img.id)) {
            const url = await optimizeAndUploadImage(img.cloudImageUrl || img.thumbnailDataUrl);
            uniqueUrls.set(img.id, url);
            img.cloudImageUrl = url;
          }
        })
      );

      const allQuestions = [];
      keptList.forEach((img) => {
        (img.quiz || []).forEach((q) => {
          const correctIdx = normalizeCorrectIndex(q, q.options);
          allQuestions.push({
            question: q.question,
            options: q.options,
            correct_index: correctIdx,
            correctIndex: correctIdx,
            correct_answer: correctIdx,
            explanation: q.explanation || "",
            image_url: uniqueUrls.get(img.id) || img.thumbnailDataUrl,
            source_page: img.pageOrSlideNumber,
            category: img.aiClassification?.category || "صورة سريرية",
          });
        });
      });

      const cleanTitle = `كويز عملي: ${fileName.replace(/\.[^/.]+$/, "") || "صور سريرية"}`;
      const quiz = await base44.entities.StandaloneQuiz.create({
        title: cleanTitle,
        owner_id: user.id,
        owner_name: user.full_name || user.email || "محارب Zeta",
        questions: allQuestions,
        is_public: true,
        show_explanations: true,
        quiz_mode: "practical_osce",
        quiz_profile: "clinical_ospe",
        source_file: fileName,
        created_date: new Date().toISOString(),
      });

      setSavedQuiz(quiz);

      toast.success("تم حفظ الكويز في حسابك وبنك الكويزات بنجاح! 🎯", {
        id: toastId,
        action: {
          label: "فتح الكويز",
          onClick: () => navigate(`/q/${quiz.id}`),
        },
      });

      return quiz;
    } catch (err) {
      console.error(err);
      toast.error("فشل حفظ الكويز. يرجى المحاولة مرة أخرى.", { id: toastId });
      return null;
    }
  };

  // ── 4c. Export Quiz to Telegram Bot (@black_fighters_bot) ────────────────────
  const handleExportTelegram = async () => {
    const keptList = images.filter((img) => img.status !== "rejected" && Array.isArray(img.quiz) && img.quiz.length > 0);
    if (!keptList.length) {
      toast.error("لا توجد أسئلة كويز مولدة للتصدير إلى التيليجرام");
      return;
    }

    const user = profile || (await base44.auth.me().catch(() => null));
    if (!user) {
      toast.error("سجل دخولك أولاً للتصدير");
      return;
    }

    const toastId = toast.loading("جاري تجهيز وتصدير الكويز للتيليجرام... 🤖");

    try {
      // Parallelize image preparation
      const uniqueUrls = new Map();
      await Promise.all(
        keptList.map(async (img) => {
          if (!uniqueUrls.has(img.id)) {
            const url = await optimizeAndUploadImage(img.cloudImageUrl || img.thumbnailDataUrl);
            uniqueUrls.set(img.id, url);
            img.cloudImageUrl = url;
          }
        })
      );

      const allQuestions = [];
      keptList.forEach((img) => {
        (img.quiz || []).forEach((q) => {
          const correctIdx = normalizeCorrectIndex(q, q.options);
          allQuestions.push({
            question: q.question,
            options: q.options,
            correct_index: correctIdx,
            correctIndex: correctIdx,
            correct_answer: correctIdx,
            explanation: q.explanation || "",
            image_url: uniqueUrls.get(img.id) || img.thumbnailDataUrl,
            source_page: img.pageOrSlideNumber,
            category: img.aiClassification?.category || "صورة سريرية",
          });
        });
      });

      const cleanTitle = `كويز عملي: ${fileName.replace(/\.[^/.]+$/, "") || "صور سريرية"}`;

      // Auto-save to StandaloneQuiz if not already saved
      let currentQuiz = savedQuiz;
      if (!currentQuiz?.id) {
        try {
          currentQuiz = await base44.entities.StandaloneQuiz.create({
            title: cleanTitle,
            owner_id: user.id,
            owner_name: user.full_name || user.email || "محارب Zeta",
            questions: allQuestions,
            is_public: true,
            show_explanations: true,
            quiz_mode: "practical_osce",
            quiz_profile: "clinical_ospe",
            source_file: fileName,
            created_date: new Date().toISOString(),
          });
          setSavedQuiz(currentQuiz);
        } catch (saveErr) {
          console.warn("Auto-save quiz before telegram export failed:", saveErr);
        }
      }

      // Server-side export: bot token + chat-id lookup never touch the client
      const res = await invokeSecureFunction("export-to-telegram", {
        title: cleanTitle,
        type: "quiz",
        questions: allQuestions,
        quizId: currentQuiz?.id,
        onProgress: (current, total) => {
          toast.loading(`جاري تصدير السؤال ${current} من ${total} للبوت... 🤖`, { id: toastId });
        },
      });

      if (res.data?.success) {
        toast.success(res.data.message || "تم تصدير الأسئلة إلى التيليجرام بنجاح! تفقد البوت 🤖", {
          id: toastId,
          action: currentQuiz?.id
            ? {
                label: "فتح البوت",
                onClick: () => window.open(`https://t.me/black_fighters_bot?start=quiz_${currentQuiz.id}`, "_blank"),
              }
            : undefined,
        });
      } else if (res.data?.error === "NO_TELEGRAM_LINKED") {
        toast.error(res.data.message, {
          id: toastId,
          action: {
            label: "ربط البوت",
            onClick: () => { openTelegramLinkWithCode().catch((e) => toast.error(e?.message || "تعذر إنشاء كود الربط")); },
          },
        });
      } else {
        toast.error(res.data?.message || "فشل التصدير للتيليجرام", { id: toastId });
      }
    } catch (err) {
      console.error(err);
      const msg = err?.message || "";
      if (msg.includes("غير مربوط") || msg.includes("NO_TELEGRAM_LINKED")) {
        toast.error(msg, {
          id: toastId,
          action: {
            label: "ربط البوت",
            onClick: () => { openTelegramLinkWithCode().catch((e) => toast.error(e?.message || "تعذر إنشاء كود الربط")); },
          },
        });
      } else {
        toast.error(msg || "فشل التصدير للتيليجرام", { id: toastId });
      }
    }
  };

  // ── 5. Restore from Saved Library ──────────────────────────────────────────
  const handleLoadSession = (session) => {
    playClick();
    localStorage.removeItem("bf_session_cleared");
    setImages(session.images || []);
    setFileName(session.fileName || "حزمة محفوظة");
    setSourceType(session.sourceType || "pdf");
    setIsSaved(true);
    toast.success(`تم استرجاع حزمة: ${session.fileName}`);
    setActiveTab("review");
  };

  // Counts (dynamic and fully reset when session resets)
  const keptCount = images.filter((img) => img.status !== "rejected").length;
  const quizzesCount = images.filter((img) => img.quiz?.length > 0).length;

  return (
    <div className="min-h-screen pb-16 space-y-8" dir={dir}>
      {/* Header + flow steps.
          Was: a glass panel with a badge, a title, a subtitle, a divider and
          SEVEN flat buttons in two groups (plus `backdrop-blur-md` on the whole
          bar), which read as a control room rather than a task. Now: one title,
          and a numbered 3-step flow where later steps stay dimmed until they can
          actually do something. */}
      <header className="space-y-5">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-border bg-[#0E1117] text-primary">
            <PracticalQuizIcon size={26} />
          </div>
          <div className="min-w-0 flex-1">
            <h1 className="text-xl font-black tracking-tight text-foreground sm:text-2xl">
              {isEn ? "Practical quiz (OSCE / OSPE)" : "كويز العملي (أوسكي / أوسبي)"}
            </h1>
            <p className="mt-1 text-[13px] leading-6 text-muted-foreground">
              {isEn
                ? "Upload the lecture, review the extracted figures, then take the quiz."
                : "ارفع المحاضرة، راجع الصور المستخرجة، وبعدين ابدأ الكويز."}
            </p>
          </div>
          <div className="hidden shrink-0 items-center gap-2 sm:flex">
            <button
              type="button"
              onClick={handleStartNewSession}
              title={isEn ? "Start a new session" : "جلسة جديدة"}
              className="inline-flex items-center gap-1.5 rounded-xl border border-border px-3 py-2 text-xs font-bold text-muted-foreground transition-colors hover:border-rose-400/40 hover:text-rose-300"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {isEn ? "New session" : "جلسة جديدة"}
            </button>
          </div>
        </div>

        {/* The flow: 1 upload → 2 review → 3 quiz, with live counts. */}
        <nav aria-label={isEn ? "Quiz steps" : "خطوات الكويز"} className="grid gap-2 sm:grid-cols-3">
          {[
            {
              key: "upload",
              step: "1",
              icon: Upload,
              label: isEn ? "Upload" : "ارفع المحاضرة",
              hint: images.length ? `${images.length} ${isEn ? "images" : "صورة"}` : (isEn ? "PDF, PPTX or images" : "PDF أو PPTX أو صور"),
              enabled: true,
            },
            {
              key: "review",
              step: "2",
              icon: Layers,
              label: isEn ? "Review figures" : "راجع الصور",
              hint: keptCount ? `${keptCount} ${isEn ? "kept" : "مختارة"}` : (isEn ? "nothing extracted yet" : "لسه مفيش صور"),
              enabled: images.length > 0,
            },
            {
              key: "quiz_player",
              step: "3",
              icon: Play,
              label: isEn ? "Take the quiz" : "ابدأ الكويز",
              hint: quizzesCount ? `${quizzesCount} ${isEn ? "questions" : "سؤال"}` : (isEn ? "generate first" : "ولّد الكويز الأول"),
              enabled: quizzesCount > 0,
            },
          ].map((item) => {
            const Icon = item.icon;
            const selected = activeTab === item.key || (item.key === "review" && activeTab === "review");
            return (
              <button
                key={item.key}
                type="button"
                disabled={!item.enabled}
                onClick={() => {
                  playClick();
                  if (item.enabled) setActiveTab(item.key);
                  else if (item.key !== "upload") setActiveTab(images.length ? "quiz_controls" : "upload");
                }}
                className={cn(
                  "flex items-center gap-3 rounded-2xl border px-3.5 py-3 text-start transition-colors",
                  selected
                    ? "border-primary/45 bg-primary/[0.08]"
                    : "border-border bg-[#0E1117] hover:border-primary/30",
                  !item.enabled && "opacity-60",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg font-mono text-[12px] font-black",
                    selected ? "bg-primary text-[#03150c]" : "bg-white/[0.06] text-muted-foreground",
                  )}
                >
                  {item.step}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-1.5 text-[13px] font-bold text-foreground">
                    <Icon className="h-3.5 w-3.5" />
                    {item.label}
                  </span>
                  <span className="mt-0.5 block truncate text-[11px] text-muted-foreground">{item.hint}</span>
                </span>
              </button>
            );
          })}
        </nav>

        {/* Secondary tools — only relevant once there is something to work with. */}
        {images.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {[
              { key: "quiz_controls", icon: Settings2, label: isEn ? "Quiz setup" : "إعداد الكويز" },
              { key: "export", icon: Download, label: isEn ? "Export & save" : "تصدير وحفظ" },
              { key: "library", icon: BookOpen, label: isEn ? "My library" : "مكتبتي" },
            ].map((tool) => {
              const Icon = tool.icon;
              return (
                <button
                  key={tool.key}
                  type="button"
                  onClick={() => { playClick(); setActiveTab(tool.key); }}
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-xl border px-3 py-2 text-xs font-bold transition-colors",
                    activeTab === tool.key
                      ? "border-primary/40 bg-primary/10 text-primary"
                      : "border-border text-muted-foreground hover:text-foreground",
                  )}
                >
                  <Icon className="h-3.5 w-3.5" />
                  {tool.label}
                </button>
              );
            })}
          </div>
        )}
      </header>

      {/* Main Workspace Body - Direct reliable tab rendering without mode='wait' unmounting deadlock */}
      <div className="w-full">
        {activeTab === "upload" && (
          <motion.div
            key="upload"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageExtractorUpload
              onStartExtraction={handleStartExtraction}
              isProcessing={isProcessing}
              progress={progress}
            />
          </motion.div>
        )}

        {activeTab === "review" && (
          <motion.div
            key="review"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageReviewGrid
              images={images}
              fileName={fileName}
              onUpdateImage={handleUpdateImage}
              onProceedToQuiz={() => {
                playClick();
                setActiveTab("quiz_controls");
              }}
              onBulkUpdateStatus={handleBulkUpdateStatus}
            />
          </motion.div>
        )}

        {activeTab === "quiz_controls" && (
          <motion.div
            key="quiz_controls"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageQuizControls
              keptImages={images.filter((img) => img?.status !== "rejected")}
              onGenerateQuiz={handleGenerateQuiz}
              isGenerating={isGeneratingQuiz}
              generationProgress={quizProgress}
              onBackToReview={() => setActiveTab("review")}
            />
          </motion.div>
        )}

        {activeTab === "quiz_player" && (
          <motion.div
            key="quiz_player"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageQuizPlayer
              imagesWithQuizzes={images.filter((img) => img?.status !== "rejected" && img?.quiz?.length > 0)}
              onExportPdf={(p) => exportToPdf(images, fileName, p)}
              onExportPptx={(p) => exportToPptx(images, fileName, p)}
              onExportJson={() => exportToQuizJson(images, fileName)}
              onSaveToPlatformQuiz={handleSaveToPlatformQuiz}
              onExportTelegram={handleExportTelegram}
              onReset={() => setActiveTab("review")}
            />
          </motion.div>
        )}

        {activeTab === "export" && (
          <motion.div
            key="export"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageExportPanel
              images={images}
              fileName={fileName}
              onExportZip={() => exportImagesToZip(images, fileName)}
              onExportPptx={(p) => exportToPptx(images, fileName, p)}
              onExportPdf={(p) => exportToPdf(images, fileName, p)}
              onExportJson={() => exportToQuizJson(images, fileName)}
              onSaveToLibrary={handleSaveToLibrary}
              onSaveToPlatformQuiz={handleSaveToPlatformQuiz}
              onExportTelegram={handleExportTelegram}
              isSaved={isSaved}
            />
          </motion.div>
        )}

        {activeTab === "library" && (
          <motion.div
            key="library"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.15 }}
          >
            <ImageLibrary
              onLoadSession={handleLoadSession}
              onNewExtraction={() => setActiveTab("upload")}
            />
          </motion.div>
        )}
      </div>
    </div>
  );
}
