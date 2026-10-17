import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle } from "@/components/ui/animatedIcons";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import {
  modifyYouTubeLecture,
  saveYouTubeAsCourse,
  saveYouTubeAsQuiz,
} from "@/lib/youtubeService";
import {
  getEstimatedYouTubeCredits,
  parseYouTubeTime,
  STEP_LABELS_AR,
  STEP_LABELS_EN,
} from "@/features/theory/youtube-studio/youtubeStudioConfig";
import { escapeHtml } from "@/features/theory/youtube-studio/bidiMarkdown";
import YouTubeInputStep from "@/features/theory/youtube-studio/YouTubeInputStep";
import YouTubeProgressStep from "@/features/theory/youtube-studio/YouTubeProgressStep";
import YouTubeResultStep from "@/features/theory/youtube-studio/YouTubeResultStep";
import YouTubeChatDrawer from "@/features/theory/youtube-studio/YouTubeChatDrawer";

export default function YouTubeAIStudio() {
  const navigate = useNavigate();
  const { profile, isAdmin } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const stepLabels = isEn ? STEP_LABELS_EN : STEP_LABELS_AR;
  const userCredits = Number(profile?.credits || 0);

  // Inputs
  const [url, setUrl] = useState("");
  const [customTitle, setCustomTitle] = useState("");
  const [startTime, setStartTime] = useState("");
  const [endTime, setEndTime] = useState("");
  const [mode, setMode] = useState("both"); // 'both' | 'summary_only' | 'quiz_only'
  const [quizCount, setQuizCount] = useState(10);
  const [docTheme, setDocTheme] = useState("dark"); // 'dark' | 'light'
  const [isChatDrawerOpen, setIsChatDrawerOpen] = useState(false);

  // Dynamic cost calculation
  const estimatedCredits = React.useMemo(() => {
    return getEstimatedYouTubeCredits({ startTime, endTime, mode, quizCount });
  }, [startTime, endTime, mode, quizCount]);

  // Status
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStep, setProcessStep] = useState(0);
  const [error, setError] = useState("");

  // Results
  const [result, setResult] = useState(null);
  const [activeTab, setActiveTab] = useState("notes"); // 'notes' | 'quiz' | 'chat'

  // Quiz Interaction State
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [showQuizResults, setShowQuizResults] = useState(false);

  // AI Chat Refiner State
  const [chatMessages, setChatMessages] = useState(() => [
    {
      sender: "ai",
      text: isEn
        ? "Hello Doctor! I am your AI clinical assistant. You can ask me to modify the notes, add new comparison tables, or calculate emergency resuscitation dosages!"
        : "مرحباً دكتور! أنا المساعد السريري الذكي. تقدر تطلب مني أعدل في المذكرة، أضيف جداول مقارنة جديدة، أو أحسب جرعات إنعاش فورية!",
    },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [isModifying, setIsModifying] = useState(false);
  const chatEndRef = useRef(null);

  // Persistence status
  const [savingCourse, setSavingCourse] = useState(false);
  const [savingQuiz, setSavingQuiz] = useState(false);
  const [savedCourseId, setSavedCourseId] = useState(null);
  const [savedQuizId, setSavedQuizId] = useState(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  const handleQuickPasteDemo = () => {
    setUrl("https://youtu.be/IKlpGhcWjo0");
    setCustomTitle(
      isEn
        ? "ABCDE Approach in Emergency & Critical Care"
        : "منهجية الـ ABCDE في طوارئ الباطنة والحالات الحرجة"
    );
    setError("");
  };

  const handleSynthesize = async (e) => {
    e?.preventDefault();
    if (!isAdmin && userCredits < estimatedCredits) {
      toast.error(
        isEn
          ? `Your current balance (${userCredits} Credits) is insufficient. This operation requires approx. ${estimatedCredits} Credits. Please recharge.`
          : `رصيدك الحالي (${userCredits} كريدت) غير كافٍ. تتطلب هذه العملية حوالي ${estimatedCredits} كريدت. يرجى شحن الكريدتس.`
      );
      navigate("/subscriptions");
      return;
    }
    if (!url.trim()) {
      setError(isEn ? "Please enter a valid YouTube URL first" : "يرجى إدخال رابط يوتيوب صالح أولاً");
      return;
    }

    setError("");
    setIsProcessing(true);
    setProcessStep(0);

    const stepInterval = setInterval(() => {
      setProcessStep((prev) => (prev < 3 ? prev + 1 : prev));
    }, 4500);

    try {
      const { invokeSecureFunction } = await import("@/lib/secureFunctions");
      const effectiveTitle = customTitle.trim() || (isEn ? "YouTube Lecture" : "محاضرة يوتيوب");
      const s = parseYouTubeTime(startTime);
      const e = parseYouTubeTime(endTime);
      const durationSeconds = e !== null && s !== null && e > s ? e - s : 0;

      const response = await invokeSecureFunction("youtube-ai-job", {
        url: url.trim(),
        title: effectiveTitle,
        mode,
        quizCount: Number(quizCount) || 10,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        durationSeconds,
        jobKey: crypto.randomUUID(),
      });
      const synthData = response.data || {};
      if (!synthData.success) {
        throw new Error(synthData.error || (isEn ? "Lecture synthesis failed" : "فشلت عملية التلخيص"));
      }
      if (synthData.charged > 0) {
        toast.info(
          isEn
            ? `${synthData.charged} credits deducted to process lecture 🧾`
            : `تم خصم ${synthData.charged} كريدت لتشغيل المحاضرة 🧾`
        );
      }

      clearInterval(stepInterval);

      setResult({
        videoId: synthData.videoId,
        url: url.trim(),
        title: effectiveTitle,
        markdown: synthData.markdown,
        quiz: synthData.quiz,
        mode: synthData.mode || mode,
      });

      if (mode === "quiz_only") {
        setActiveTab("quiz");
        toast.success(
          isEn
            ? `Successfully generated ${synthData.quiz?.length || 0} quiz questions! 🎯`
            : `تم توليد ${synthData.quiz?.length || 0} سؤال كويز بنجاح! 🎯`
        );
      } else if (mode === "summary_only") {
        setActiveTab("notes");
        toast.success(
          isEn
            ? "Successfully generated comprehensive clinical notes! 📑"
            : "تم توليد المذكرة السريرية الشاملة بنجاح! 📑"
        );
      } else {
        setActiveTab("notes");
        toast.success(
          isEn
            ? "Successfully generated notes and question bank! 🚀"
            : "تم توليد المذكرة وبنك الأسئلة بنجاح! 🚀"
        );
      }
    } catch (err) {
      clearInterval(stepInterval);
      console.error("Synthesis failed:", err);
      setError(
        err.message ||
          (isEn
            ? "An error occurred while analyzing and synthesizing the lecture"
            : "حدث خطأ أثناء تحليل وتلخيص المحاضرة")
      );
      toast.error(err.message || (isEn ? "Synthesis failed" : "فشلت عملية التلخيص"));
    } finally {
      setIsProcessing(false);
    }
  };

  const executeModification = async (instruction) => {
    if (!instruction.trim() || !result?.markdown || isModifying) return;
    setIsModifying(true);
    try {
      const updatedMarkdown = await modifyYouTubeLecture({
        currentMarkdown: result.markdown,
        promptInstruction: instruction,
      });

      setResult((prev) => ({ ...prev, markdown: updatedMarkdown }));
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: isEn
            ? `Edit applied successfully, Doctor! Notes updated with: "${instruction.slice(0, 40)}..." ✅`
            : `تم تطبيق التعديل بنجاح يا دكتور! تم تحديث المذكرة بالطلب الخاص بك: "${instruction.slice(0, 40)}..." ✅`,
        },
      ]);
      toast.success(isEn ? "Notes updated successfully! ✨" : "تم تحديث المذكرة بنجاح! ✨");
    } catch (err) {
      console.error("Modification failed:", err);
      setChatMessages((prev) => [
        ...prev,
        {
          sender: "ai",
          text: isEn
            ? `Sorry Doctor, an error occurred while applying the edit: ${err.message}`
            : `عذراً دكتور، حدث خطأ أثناء تطبيق التعديل: ${err.message}`,
        },
      ]);
      toast.error(isEn ? "Failed to modify notes" : "فشل تعديل المذكرة");
    } finally {
      setIsModifying(false);
    }
  };

  const handleSendModification = async (e) => {
    e?.preventDefault();
    if (!chatInput.trim() || !result?.markdown || isModifying) return;
    const prompt = chatInput.trim();
    setChatInput("");
    setChatMessages((prev) => [...prev, { sender: "user", text: prompt }]);
    await executeModification(prompt);
  };

  const handleApplyPromptChip = async (prompt) => {
    setChatMessages((prev) => [...prev, { sender: "user", text: prompt }]);
    await executeModification(prompt);
  };

  const handleSaveToCourses = async () => {
    if (!result?.markdown) return;
    setSavingCourse(true);
    try {
      const newCourse = await saveYouTubeAsCourse({
        title: result.title,
        markdown: result.markdown,
        videoId: result.videoId,
        url: result.url,
      });
      setSavedCourseId(newCourse.id);
      toast.success(
        isEn
          ? "Lecture saved as course to your dashboard! 📚"
          : "تم حفظ المحاضرة ككورس في لوحة تحكمك! 📚"
      );
    } catch (err) {
      console.error("Save course error:", err);
      toast.error(isEn ? "Failed to save course to database" : "فشل حفظ الكورس في قاعدة البيانات");
    } finally {
      setSavingCourse(false);
    }
  };

  const handleSaveToQuizzes = async () => {
    if (!result?.quiz?.length) return;
    setSavingQuiz(true);
    try {
      const newQuiz = await saveYouTubeAsQuiz({
        title: result.title,
        questions: result.quiz,
        videoId: result.videoId,
      });
      setSavedQuizId(newQuiz.id);
      toast.success(
        isEn
          ? "Question bank saved to your quizzes list! 🧠"
          : "تم حفظ بنك الأسئلة في قائمة الكويزات! 🧠"
      );
    } catch (err) {
      console.error("Save quiz error:", err);
      toast.error(isEn ? "Failed to save quiz" : "فشل حفظ الكويز");
    } finally {
      setSavingQuiz(false);
    }
  };

  const calculateScore = () => {
    if (!result?.quiz) return { score: 0, total: 0, pct: 0 };
    let correct = 0;
    result.quiz.forEach((q, idx) => {
      const userAns = selectedAnswers[idx];
      const correctAns = String(q.correctAnswer || "A").trim().toUpperCase();
      if (userAns && userAns.toUpperCase().startsWith(correctAns)) {
        correct++;
      }
    });
    return {
      score: correct,
      total: result.quiz.length,
      pct: Math.round((correct / result.quiz.length) * 100),
    };
  };

  const handlePrintMedicalGuide = () => {
    try {
      const guideEl = document.getElementById("printable-medical-guide");
      if (!guideEl) {
        window.print();
        return;
      }

      const printWin = window.open("", "_blank");
      if (!printWin) {
        window.print();
        return;
      }

      const contentHtml = guideEl.innerHTML;
      const title =
        result?.title ||
        customTitle ||
        (isEn ? "Comprehensive Clinical Medical Summary" : "الملخص الطبي السريري الشامل");

      printWin.document.open();
      printWin.document.write(`<!DOCTYPE html>
<html lang="${isEn ? "en" : "ar"}" dir="${isEn ? "ltr" : "rtl"}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)} - ${isEn ? "A4 Print" : "طباعة A4"}</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800;900&family=JetBrains+Mono:wght@500;700;800&family=Plus+Jakarta+Sans:wght@400;600;700;800&display=swap" rel="stylesheet">
  <style>
    @page { size: A4 portrait; margin: 10mm 12mm; }
    *, *::before, *::after { box-sizing: border-box; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
    html, body { margin: 0; padding: 0; background: #ffffff !important; color: #0f172a !important; font-family: 'Cairo', 'Plus Jakarta Sans', -apple-system, sans-serif; font-size: 13.5px; line-height: 1.8; width: 100% !important; max-width: 100% !important; }
    .print-header { display: flex; justify-content: space-between; align-items: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 24px; }
    .print-header h1 { margin: 0 0 4px 0; font-size: 19px; font-weight: 900; color: #0f172a; }
    .print-header p { margin: 0; font-size: 12px; color: #64748b; font-weight: 600; }
    .brand-badge { font-family: 'JetBrains Mono', monospace; font-weight: 900; font-size: 12px; background: #0f172a; color: #ffffff; padding: 4px 10px; border-radius: 6px; letter-spacing: 0.5px; }
    .paired-part-card { page-break-inside: avoid; break-inside: avoid; border: 1.5px solid #cbd5e1; border-radius: 12px; padding: 18px; margin-bottom: 20px; background: #ffffff; }
    .part-header-pill { display: inline-block; background: #0f172a; color: #ffffff; padding: 5px 12px; border-radius: 7px; font-weight: 900; font-size: 13.5px; margin-bottom: 12px; }
    .arabic-walkthrough-pill { display: inline-block; background: #1e293b; color: #ffffff; padding: 4px 10px; border-radius: 6px; font-weight: 800; font-size: 12.5px; margin-bottom: 8px; }
    .bidi-ltr { direction: ltr !important; text-align: left !important; font-family: 'Plus Jakarta Sans', 'JetBrains Mono', sans-serif !important; }
    .bidi-ltr ul, .bidi-ltr ol { padding-left: 22px !important; padding-right: 0 !important; }
    .bidi-rtl { direction: rtl !important; text-align: right !important; font-family: 'Cairo', sans-serif !important; }
    .bidi-rtl ul, .bidi-rtl ol { padding-right: 22px !important; padding-left: 0 !important; }
    table { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 12px; }
    th { background: #f1f5f9; color: #0f172a; font-weight: 800; border: 1px solid #94a3b8; padding: 8px 10px; }
    td { border: 1px solid #cbd5e1; padding: 8px 10px; color: #1e293b; }
    code { font-family: 'JetBrains Mono', monospace; font-size: 12px; background: #f1f5f9; padding: 2px 5px; border-radius: 4px; border: 1px solid #cbd5e1; }
    blockquote { border-right: 4px solid #7c3aed; background: #faf5ff; padding: 10px 14px; margin: 12px 0; border-radius: 6px; }
    strong { color: #000000; font-weight: 800; }
  </style>
</head>
<body>
  <div class="print-header">
    <div>
      <h1>${escapeHtml(title)}</h1>
      <p>${isEn ? "Dual Clinical Medical Summary — Black Fighters Academy" : "الملخص الإكلينيكي الطبي المزدوج — أكاديمية Black Fighters"}</p>
    </div>
    <div class="brand-badge">BLACK FIGHTERS MED</div>
  </div>
  <div class="print-body">${contentHtml}</div>
  <script>
    window.onload = function() { setTimeout(function() { window.print(); }, 400); };
  <\/script>
</body>
</html>`);
      printWin.document.close();
    } catch (err) {
      console.error("Print popup failed, falling back to in-page print:", err);
      window.print();
    }
  };

  return (
    <div
      dir={dir || (isEn ? "ltr" : "rtl")}
      className="max-w-6xl mx-auto p-4 sm:p-6 lg:p-8 space-y-8 text-foreground"
    >
      {/* Header */}
      <div className="bf-hd">
        <div className="flex items-center justify-between flex-wrap gap-4">
          <div>
            <span className="mono">
              {isEn ? "YOUTUBE AI STUDIO" : "ملخص فيديو يوتيوب"}
            </span>
            <h1 className="serif">
              {isEn ? "From video to notes " : "من الفيديو لملخص "}
              <em style={{ color: "var(--sig)" }}>
                {isEn ? "in minutes." : "في دقايق."}
              </em>
            </h1>
            <p style={{ color: "var(--mute)", fontSize: "0.92rem", marginTop: 4 }}>
              {isEn
                ? "Paste the link: you get structured notes and a practice quiz you can study from."
                : "الصق الرابط، اختار الجزء اللي عايزه، وشوف التكلفة قبل التأكيد."}
            </p>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <span className="pill">
              <i></i>
              <span>{userCredits ?? 0} {isEn ? "Credits" : "كريدت"}</span>
            </span>
            <button
              type="button"
              onClick={handleQuickPasteDemo}
              className="btn sm line"
            >
              <PlayCircle className="h-4 w-4" />
              {isEn ? "Try example" : "جرّب مثال"}
            </button>
          </div>
        </div>
      </div>

      {/* Step 1: Input Form */}
      {!result && (
        <YouTubeInputStep
          url={url}
          setUrl={setUrl}
          customTitle={customTitle}
          setCustomTitle={setCustomTitle}
          startTime={startTime}
          setStartTime={setStartTime}
          endTime={endTime}
          setEndTime={setEndTime}
          mode={mode}
          setMode={setMode}
          quizCount={quizCount}
          setQuizCount={setQuizCount}
          isProcessing={isProcessing}
          processStep={processStep}
          stepLabels={stepLabels}
          error={error}
          userCredits={userCredits}
          estimatedCredits={estimatedCredits}
          isAdmin={isAdmin}
          onSubmit={handleSynthesize}
          isEn={isEn}
        />
      )}

      {/* Step 2: Processing Stepper */}
      <YouTubeProgressStep
        isProcessing={isProcessing}
        processStep={processStep}
        stepLabels={stepLabels}
        isEn={isEn}
      />

      {/* Step 3: Result Workspace */}
      <YouTubeResultStep
        result={result}
        onResetResult={() => setResult(null)}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        docTheme={docTheme}
        setDocTheme={setDocTheme}
        savingCourse={savingCourse}
        savedCourseId={savedCourseId}
        onSaveToCourses={handleSaveToCourses}
        savingQuiz={savingQuiz}
        savedQuizId={savedQuizId}
        onSaveToQuizzes={handleSaveToQuizzes}
        onPrintMedicalGuide={handlePrintMedicalGuide}
        onOpenChatDrawer={() => setIsChatDrawerOpen(true)}
        isEn={isEn}
        selectedAnswers={selectedAnswers}
        setSelectedAnswers={setSelectedAnswers}
        showQuizResults={showQuizResults}
        setShowQuizResults={setShowQuizResults}
        calculateScore={calculateScore}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isModifying={isModifying}
        onSendModification={handleSendModification}
        onApplyPromptChip={handleApplyPromptChip}
        chatEndRef={chatEndRef}
      />

      {/* Slide-over Full AI Refiner Drawer */}
      <YouTubeChatDrawer
        isOpen={isChatDrawerOpen && Boolean(result)}
        onClose={() => setIsChatDrawerOpen(false)}
        isEn={isEn}
        dir={dir}
        chatMessages={chatMessages}
        chatInput={chatInput}
        setChatInput={setChatInput}
        isModifying={isModifying}
        onSendMessage={handleSendModification}
        onApplyPrompt={handleApplyPromptChip}
      />
    </div>
  );
}
