import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import {
  FolderKanban,
  Plus,
  Mic,
  MicOff,
  Sparkles,
  Calendar,
  CheckCircle2,
  Circle,
  Clock,
  Flame,
  Download,
  RefreshCw,
  Trash2,
  BookOpen,
  Brain,
  Layers,
  ExternalLink,
  ListPlus,
  CheckCheck,
} from "lucide-react";
import {
  PageHeader,
  StatCard,
  GlassCard,
  LVBadge,
} from "@/components/ui/linevault";
import {
  BLOCK_COLORS,
  loadBlocksLocal,
  saveBlocksLocalAndCloud,
  syncBlocksFromCloud,
  computeBlockStats,
  createBlock,
  syncBlockWithCourses,
  generateSmartBlockSchedule,
} from "@/lib/blockVaultStore";
import { exportBlockPlannerPdf } from "@/lib/plannerPdf";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function StudyPlanner() {
  const { user } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [blocks, setBlocks] = useState(() => loadBlocksLocal());
  const [activeBlockId, setActiveBlockId] = useState(() => {
    const initial = loadBlocksLocal();
    return initial[0]?.id || "";
  });
  const [activeSubTab, setActiveSubTab] = useState("vault"); // "vault" | "schedule"
  const [lectureFilter, setLectureFilter] = useState("all"); // "all" | "unsolved" | "solved" | "studying" | "review_needed"

  // New Block Modal / Drawer State
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newBlockName, setNewBlockName] = useState("");
  const [newBlockColor, setNewBlockColor] = useState("emerald");
  const [newBlockExamDate, setNewBlockExamDate] = useState(
    () => new Date(Date.now() + 12 * 86400000).toISOString().slice(0, 10)
  );
  const [newBlockDailyHours, setNewBlockDailyHours] = useState(4);
  const [newBlockLectureCount, setNewBlockLectureCount] = useState(12);
  const [newBlockCustomTitles, setNewBlockCustomTitles] = useState("");
  const [importAllUploaded, setImportAllUploaded] = useState(false);
  const [selectedImportFolder, setSelectedImportFolder] = useState("all");

  // Add Lecture to Active Block State
  const [showAddLecturesBox, setShowAddLecturesBox] = useState(false);
  const [addLecturesText, setAddLecturesText] = useState("");
  const [addLecturesCount, setAddLecturesCount] = useState(0);

  // Voice & AI Prompt Studio State
  const [voicePrompt, setVoicePrompt] = useState("");
  const [isRecording, setIsRecording] = useState(false);
  const [voiceLang, setVoiceLang] = useState("ar-EG");
  const [isGeneratingSchedule, setIsGeneratingSchedule] = useState(false);
  const [isExportingPdf, setIsExportingPdf] = useState(false);
  const recognitionRef = useRef(null);

  // Fetch user's uploaded courses to auto-link and import
  const { data: courses = [] } = useQuery({
    queryKey: ["courses", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const list = await base44.entities.Course.filter(
        { created_by: user.email },
        "-created_date",
        100
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: !!user?.id,
    staleTime: 30_000,
  });

  // Cloud sync on mount
  useEffect(() => {
    syncBlocksFromCloud().then((synced) => {
      if (Array.isArray(synced) && synced.length > 0) {
        setBlocks(synced);
        setActiveBlockId((prev) => prev || synced[0].id);
      }
    });
  }, []);

  // Auto-create a default starter block from uploaded courses if user has courses and 0 blocks
  useEffect(() => {
    if (blocks.length === 0 && courses.length > 0) {
      const autoBlock = createBlock({
        name: isEn ? "Current Semester Block" : "بلوك المنهج الحالي",
        color: "emerald",
        examDate: new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
        dailyHours: 4,
        importedCourses: courses,
      });
      const next = [autoBlock];
      setBlocks(next);
      setActiveBlockId(autoBlock.id);
      saveBlocksLocalAndCloud(next);
    }
  }, [courses, blocks.length, isEn]);

  const updateBlocks = (updater) => {
    setBlocks((prev) => {
      const next = typeof updater === "function" ? updater(prev) : updater;
      saveBlocksLocalAndCloud(next);
      return next;
    });
  };

  const activeBlock = useMemo(
    () => blocks.find((b) => b.id === activeBlockId) || blocks[0] || null,
    [blocks, activeBlockId]
  );

  // Global stats across all blocks
  const globalStats = useMemo(() => {
    let totalLectures = 0;
    let solvedLectures = 0;
    let totalUnsolved = 0;
    blocks.forEach((b) => {
      const s = computeBlockStats(b);
      totalLectures += s.total;
      solvedLectures += s.solved;
      totalUnsolved += s.remainingToSolve;
    });
    const overallPct =
      totalLectures > 0 ? Math.round((solvedLectures / totalLectures) * 100) : 0;
    return {
      blocksCount: blocks.length,
      totalLectures,
      solvedLectures,
      totalUnsolved,
      overallPct,
    };
  }, [blocks]);

  const activeStats = useMemo(
    () => (activeBlock ? computeBlockStats(activeBlock) : null),
    [activeBlock]
  );

  const courseFolders = useMemo(() => {
    const s = new Set();
    courses.forEach((c) => {
      if (c.folder && c.folder.trim()) s.add(c.folder.trim());
    });
    return Array.from(s);
  }, [courses]);

  // ── Web Speech API Voice Recognition ───────────────────────────────────────
  const handleToggleVoiceRecording = () => {
    playClick();
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecording(false);
      return;
    }

    const SpeechRecognition =
      typeof window !== "undefined" &&
      (window.SpeechRecognition || window.webkitSpeechRecognition);

    if (!SpeechRecognition) {
      toast.error(
        isEn
          ? "Voice recognition is not supported in this browser. Type your request below!"
          : "المتصفح الحالي لا يدعم التسجيل الصوتي المباشر، يمكنك كتابة طلبك في الصندوق مباشرة!"
      );
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = voiceLang;
      recognition.continuous = true;
      recognition.interimResults = true;

      const baseText = voicePrompt ? voicePrompt.trim() + " " : "";

      recognition.onresult = (event) => {
        let transcript = "";
        for (let i = 0; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        setVoicePrompt(baseText + transcript);
      };

      recognition.onerror = (e) => {
        console.warn("[SpeechRecognition] error:", e);
        setIsRecording(false);
      };

      recognition.onend = () => {
        setIsRecording(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
      setIsRecording(true);
      toast.info(
        isEn
          ? "🎙️ Listening... Speak your study plan naturally!"
          : "🎙️ الميكروفون شغال.. اتكلم براحتك بالعامية المصرية وقول عايز تنظم محاضراتك إزاي!"
      );
    } catch (err) {
      console.error(err);
      setIsRecording(false);
      toast.error("تعذر تشغيل الميكروفون. تأكد من صلاحيات الصوت في المتصفح.");
    }
  };

  useEffect(() => {
    return () => {
      try {
        recognitionRef.current?.stop();
      } catch {}
    };
  }, []);

  // ── Create New Block ───────────────────────────────────────────────────────
  const handleCreateBlock = (e) => {
    e.preventDefault();
    playClick();
    const name = newBlockName.trim() || (isEn ? "New Study Block" : "بلوك دراسي جديد");
    const customList = newBlockCustomTitles
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);

    const toImport = importAllUploaded
      ? courses.filter((c) =>
          selectedImportFolder === "all" ? true : c.folder === selectedImportFolder
        )
      : [];

    const created = createBlock({
      name,
      color: newBlockColor,
      examDate: newBlockExamDate,
      dailyHours: newBlockDailyHours,
      lectureCount: customList.length > 0 ? customList.length : newBlockLectureCount,
      lectureTitles: customList,
      importedCourses: toImport,
    });

    updateBlocks((prev) => [created, ...prev]);
    setActiveBlockId(created.id);
    setShowCreateModal(false);
    setNewBlockName("");
    setNewBlockCustomTitles("");
    playSuccess();
    toast.success(
      isEn
        ? `Created "${created.name}" with ${created.lectures.length} lectures!`
        : `تم إنشاء "${created.name}" بنجاح ويحتوي على ${created.lectures.length} محاضرة! 🎯`
    );
  };

  // ── Delete Active Block ────────────────────────────────────────────────────
  const handleDeleteBlock = (blockId) => {
    playClick();
    updateBlocks((prev) => {
      const next = prev.filter((b) => b.id !== blockId);
      if (activeBlockId === blockId) {
        setActiveBlockId(next[0]?.id || "");
      }
      return next;
    });
    toast.success(isEn ? "Block deleted" : "تم حذف البلوك من الحافظة");
  };

  // ── Sync Active Block with Uploaded Courses ────────────────────────────────
  const handleSyncWithUploaded = () => {
    if (!activeBlock) return;
    playClick();
    updateBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== activeBlock.id) return b;
        const synced = syncBlockWithCourses(b, courses);
        // Also import any uploaded course not yet in this block if user has 0 lectures
        if (synced.lectures.length === 0 && courses.length > 0) {
          const fresh = createBlock({
            name: b.name,
            color: b.color,
            examDate: b.examDate,
            dailyHours: b.dailyHours,
            importedCourses: courses,
          });
          return { ...b, lectures: fresh.lectures };
        }
        return synced;
      })
    );
    playSuccess();
    toast.success(
      isEn
        ? "Synced lecture statuses with your uploaded platform courses!"
        : "تمت مزامنة حالة المحاضرات والكويزات مع ملفاتك المرفوعة في المنصة! ⚡"
    );
  };

  // ── Add Lectures to Active Block ───────────────────────────────────────────
  const handleAddLecturesToActive = (e) => {
    e.preventDefault();
    if (!activeBlock) return;
    playClick();

    const lines = addLecturesText
      .split("\n")
      .map((s) => s.trim())
      .filter(Boolean);
    const countToAdd = Number(addLecturesCount) || 0;

    if (lines.length === 0 && countToAdd <= 0) {
      toast.error(isEn ? "Enter lecture names or count to add" : "اكتب أسماء المحاضرات أو عددها لإضافتها");
      return;
    }

    updateBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== activeBlock.id) return b;
        const nextLectures = [...(b.lectures || [])];
        lines.forEach((title) => {
          const num = nextLectures.length + 1;
          nextLectures.push({
            id: `lec_${Date.now()}_${num}_${Math.random().toString(36).slice(2, 6)}`,
            number: num,
            title,
            linkedCourseId: null,
            status: "unsolved",
            summaryDone: false,
            theoryQuizDone: false,
            osceDone: false,
            quizScore: null,
            difficulty: "medium",
            notes: "",
          });
        });

        for (let i = 0; i < countToAdd; i++) {
          const num = nextLectures.length + 1;
          nextLectures.push({
            id: `lec_${Date.now()}_${num}_${Math.random().toString(36).slice(2, 6)}`,
            number: num,
            title: isEn ? `Lecture ${num} — ${b.name}` : `المحاضرة ${num} — ${b.name}`,
            linkedCourseId: null,
            status: "unsolved",
            summaryDone: false,
            theoryQuizDone: false,
            osceDone: false,
            quizScore: null,
            difficulty: "medium",
            notes: "",
          });
        }

        return { ...b, lectures: nextLectures, updatedAt: new Date().toISOString() };
      })
    );

    setAddLecturesText("");
    setAddLecturesCount(0);
    setShowAddLecturesBox(false);
    playSuccess();
    toast.success(isEn ? "Lectures added to block!" : "تمت إضافة المحاضرات للبلوك بنجاح! 📚");
  };

  // ── Update Single Lecture in Active Block ──────────────────────────────────
  const handleUpdateLecture = (lectureId, patch) => {
    if (!activeBlock) return;
    playClick();
    updateBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== activeBlock.id) return b;
        const nextLectures = (b.lectures || []).map((lec) => {
          if (lec.id !== lectureId) return lec;
          const updated = { ...lec, ...patch };
          // Auto-promote status when pillars are toggled
          if (
            patch.summaryDone !== undefined ||
            patch.theoryQuizDone !== undefined ||
            patch.osceDone !== undefined
          ) {
            if (updated.summaryDone && updated.theoryQuizDone) {
              updated.status = "solved";
            } else if (updated.summaryDone || updated.theoryQuizDone || updated.osceDone) {
              if (updated.status === "unsolved") updated.status = "studying";
            }
          }
          if (patch.status === "solved") {
            updated.summaryDone = true;
            updated.theoryQuizDone = true;
          }
          return updated;
        });
        return { ...b, lectures: nextLectures, updatedAt: new Date().toISOString() };
      })
    );
  };

  const handleDeleteLecture = (lectureId) => {
    if (!activeBlock) return;
    playClick();
    updateBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== activeBlock.id) return b;
        const filtered = (b.lectures || [])
          .filter((l) => l.id !== lectureId)
          .map((l, idx) => ({ ...l, number: idx + 1 }));
        return { ...b, lectures: filtered, updatedAt: new Date().toISOString() };
      })
    );
  };

  // ── Generate AI & Voice Schedule ───────────────────────────────────────────
  const handleGenerateSchedule = async (customPromptOverride = null) => {
    const promptToUse = customPromptOverride !== null ? customPromptOverride : voicePrompt;
    let targetBlock = activeBlock;

    // If user has no block yet, create one automatically from their voice prompt!
    if (!targetBlock) {
      targetBlock = createBlock({
        name: isEn ? "Smart AI Study Block" : "بلوك المذاكرة الذكي",
        color: "emerald",
        lectureCount: 12,
      });
    }

    setIsGeneratingSchedule(true);
    if (isRecording) {
      try {
        recognitionRef.current?.stop();
      } catch {}
      setIsRecording(false);
    }

    const toastId = toast.loading(
      isEn
        ? "Building your personalized AI study schedule..."
        : "جاري تحليل طلبك وبناء جدول المذاكرة الذكي بالـ AI... 🧠⚡"
    );

    try {
      const updatedBlock = await generateSmartBlockSchedule({
        block: targetBlock,
        voiceOrTextPrompt: promptToUse,
        isEn,
      });

      updateBlocks((prev) => {
        const exists = prev.some((b) => b.id === updatedBlock.id);
        return exists
          ? prev.map((b) => (b.id === updatedBlock.id ? updatedBlock : b))
          : [updatedBlock, ...prev];
      });
      setActiveBlockId(updatedBlock.id);
      setActiveSubTab("schedule");
      playSuccess();
      toast.success(
        isEn
          ? "Smart schedule generated! Ready to study or export as PDF."
          : "تم إنشاء جدول المذاكرة الذكي بنجاح! جاهز للمتابعة أو التحميل كـ PDF 🎯",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error(err?.message || "حدث خطأ أثناء توليد الجدول", { id: toastId });
    } finally {
      setIsGeneratingSchedule(false);
    }
  };

  // ── Toggle Task Completion inside Schedule ─────────────────────────────────
  const handleToggleScheduleTask = (dayId, taskId) => {
    if (!activeBlock) return;
    playClick();
    updateBlocks((prev) =>
      prev.map((b) => {
        if (b.id !== activeBlock.id) return b;
        let completedLectureId = null;
        let completedTaskType = null;

        const nextSchedule = (b.schedule || []).map((day) => {
          if (day.id !== dayId) return day;
          const nextTasks = (day.tasks || []).map((t) => {
            if (t.id !== taskId) return t;
            const nextDone = !t.done;
            if (nextDone && t.lectureId) {
              completedLectureId = t.lectureId;
              completedTaskType = t.type;
            }
            return { ...t, done: nextDone };
          });
          return { ...day, tasks: nextTasks };
        });

        // Automatically reflect task completion on the linked lecture in the Block Vault!
        let nextLectures = b.lectures || [];
        if (completedLectureId) {
          nextLectures = nextLectures.map((lec) => {
            if (lec.id !== completedLectureId) return lec;
            const summaryDone = completedTaskType === "study" ? true : lec.summaryDone;
            const theoryQuizDone = completedTaskType === "quiz" ? true : lec.theoryQuizDone;
            const osceDone = completedTaskType === "osce" ? true : lec.osceDone;
            const status =
              summaryDone && theoryQuizDone
                ? "solved"
                : summaryDone || theoryQuizDone || osceDone
                ? "studying"
                : lec.status;
            return { ...lec, summaryDone, theoryQuizDone, osceDone, status };
          });
        }

        return {
          ...b,
          schedule: nextSchedule,
          lectures: nextLectures,
          updatedAt: new Date().toISOString(),
        };
      })
    );
  };

  // ── Export Block & Schedule to Printable PDF ───────────────────────────────
  const handleExportPdf = async () => {
    if (!activeBlock || isExportingPdf) return;
    playClick();
    setIsExportingPdf(true);
    const toastId = toast.loading(
      isEn
        ? "Preparing printable A4 PDF report..."
        : "جاري تجهيز ملف الـ PDF المنسق للطباعة... 🖨️"
    );
    try {
      await exportBlockPlannerPdf(activeBlock, { isEn });
      playSuccess();
      toast.success(
        isEn
          ? "PDF downloaded successfully!"
          : "تم تنزيل جدول المذاكرة وتقرير التقدم بصيغة PDF بنجاح! 📄✅",
        { id: toastId }
      );
    } catch (err) {
      console.error(err);
      toast.error("تعذر تصدير ملف الـ PDF", { id: toastId });
    } finally {
      setIsExportingPdf(false);
    }
  };

  const filteredLectures = useMemo(() => {
    const list = activeBlock?.lectures || [];
    if (lectureFilter === "all") return list;
    return list.filter((l) => (l.status || "unsolved") === lectureFilter);
  }, [activeBlock, lectureFilter]);

  const VOICE_PRESETS = isEn
    ? [
        "I have 14 lectures in this block and my exam is in 10 days, studying 4 hours daily except Friday off, schedule them with quizzes & OSCE",
        "Reschedule all remaining unsolved lectures over the next 7 days with intensive quiz practice",
        "Organize a 5-day emergency crash schedule focusing on unsolved lectures and OSCE stations",
      ]
    : [
        "عندي ١٤ محاضرة في البلوك وامتحاني بعد ١٠ أيام، بذاكر ٤ ساعات في اليوم ما عدا الجمعة أجازة، رتبهملي مع حل كويزات وأوسكي",
        "رتبلي المحاضرات اللي لسه متحلوش بس على ٧ أيام مع مراجعة شاملة وحل كويزات",
        "اعمل لي جدول طوارئ مكثف في ٥ أيام يخلص المحاضرات المتبقية مع تدريب أوسكي يومي",
      ];

  return (
    <div className="space-y-8 pb-16" dir={dir}>
      {/* Page Header */}
      <PageHeader
        eyebrow={
          isEn
            ? "CURRICULUM BLOCK VAULT & AI VOICE PLANNER"
            : "حافظة البلوكات والمنهج · منظم الجداول الذكي بالـ AI والصوت"
        }
        title={
          isEn
            ? "Block Vault & Smart Study Planner"
            : "حافظة البلوكات وجدول المذاكرة الذكي"
        }
        subtitle={
          isEn
            ? "Collect all your block lectures in one place, track what you solved vs. what remains, build schedules by voice or AI, and export print-ready PDFs."
            : "جمّع كل محاضرات البلوك أو المنهج في مكان واحد، اعرف اللي حليته واللي فاضلك، نظّم جدولك بصوتك بالعامية المصرية أو بالـ AI، ونزّله PDF جاهز للطباعة."
        }
        actions={
          <div className="flex flex-wrap items-center gap-2.5">
            {activeBlock && (
              <button
                type="button"
                onClick={handleExportPdf}
                disabled={isExportingPdf}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[#19f08c]/40 bg-[#19f08c]/12 hover:bg-[#19f08c]/20 text-xs sm:text-sm font-bold text-[#19f08c] transition cursor-pointer whitespace-nowrap"
              >
                <Download className="w-4 h-4" />
                <span>
                  {isExportingPdf
                    ? isEn
                      ? "Exporting PDF..."
                      : "جاري التصدير..."
                    : isEn
                    ? "Download PDF Schedule"
                    : "تحميل الجدول والتقدم PDF"}
                </span>
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                playClick();
                setShowCreateModal(true);
              }}
              className="btn-primary-glow inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? "New Block / Subject" : "إنشاء بلوك / مادة جديدة"}</span>
            </button>
          </div>
        }
      />

      {/* Global Curriculum Overview Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
        <StatCard
          label={isEn ? "Active Blocks" : "البلوكات والمواد"}
          numericValue={globalStats.blocksCount}
          sub={isEn ? "In your curriculum vault" : "في حافظة منهجك"}
          icon={FolderKanban}
          accent="emerald"
        />
        <StatCard
          label={isEn ? "Solved Lectures" : "محاضرات تم حلها"}
          value={`${globalStats.solvedLectures} / ${globalStats.totalLectures}`}
          sub={isEn ? "Summary + Quiz completed" : "مكتملة المذاكرة والحل"}
          icon={CheckCircle2}
          accent="emerald"
        />
        <StatCard
          label={isEn ? "Remaining Unsolved" : "متبقية للحل"}
          numericValue={globalStats.totalUnsolved}
          sub={
            activeStats?.requiredDailyPace
              ? isEn
                ? `Need ~${activeStats.requiredDailyPace} lec/day`
                : `مطلوب ${activeStats.requiredDailyPace} محاضرة/يوم`
              : isEn
              ? "Ready to schedule"
              : "جاهزة للجدولة الذكية"
          }
          icon={Flame}
          accent="amber"
        />
        <StatCard
          label={isEn ? "Curriculum Mastery" : "نسبة إنجاز المنهج"}
          value={`${activeStats ? activeStats.progressPct : globalStats.overallPct}%`}
          sub={
            activeStats?.daysUntilExam !== null && activeStats?.daysUntilExam !== undefined
              ? isEn
                ? `${activeStats.daysUntilExam} days until block exam`
                : `باقي ${activeStats.daysUntilExam} يوم على امتحان البلوك`
              : isEn
              ? "Track your progress"
              : "تتبع مستمر للإنجاز"
          }
          icon={Calendar}
          accent="sky"
        />
      </div>

      {/* AI & Voice Schedule Command Studio */}
      <GlassCard variant="highlight" className="p-5 sm:p-6 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3.5">
            <div
              className={cn(
                "w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 border transition-all",
                isRecording
                  ? "bg-rose-500/20 border-rose-500 text-rose-400 animate-pulse"
                  : "bg-[#19f08c]/15 border-[#19f08c]/40 text-[#19f08c]"
              )}
            >
              {isRecording ? <Mic className="w-5 h-5" /> : <Sparkles className="w-5 h-5" />}
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-base sm:text-lg font-black text-[#f5f7fa]">
                  {isEn
                    ? "AI & Voice Study Schedule Organizer"
                    : "منظم الجداول الذكي بالصوت والذكاء الاصطناعي 🎙️⚡"}
                </h2>
                <LVBadge variant="emerald">
                  {isEn ? "Egyptian Arabic & English Voice" : "يدعم العامية المصرية والعربية والإنجليزية"}
                </LVBadge>
              </div>
              <p className="text-xs text-[#9aa4b2] mt-0.5">
                {isEn
                  ? "Record your voice or type how many lectures you have, exam date, and daily hours — AI will organize your unsolved lectures automatically."
                  : "اضغط على الميكروفون وقول بالعامية عندك كام محاضرة وامتحانك امتى وبتذاكر كام ساعة، والـ AI هيرتبلك المحاضرات اللي لسه متحلتش في جدول جاهز!"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setVoiceLang((l) => (l === "ar-EG" ? "en-US" : "ar-EG"))}
              className="px-2.5 py-2 rounded-xl bg-[#090c11] border border-white/10 text-[11px] font-mono font-bold text-[#9aa4b2] hover:text-white cursor-pointer"
              title="لغة التسجيل الصوتي"
            >
              {voiceLang === "ar-EG" ? "🇪🇬 عربي / مصري" : "🇺🇸 English"}
            </button>
            <button
              type="button"
              onClick={handleToggleVoiceRecording}
              className={cn(
                "inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black transition cursor-pointer",
                isRecording
                  ? "bg-rose-500 text-white shadow-lg shadow-rose-500/25"
                  : "bg-[#0e131b] hover:bg-white/[0.06] text-[#f5f7fa] border border-[#19f08c]/40"
              )}
            >
              {isRecording ? (
                <>
                  <MicOff className="w-4 h-4 animate-bounce" />
                  <span>{isEn ? "Stop Recording" : "إيقاف التسجيل"}</span>
                </>
              ) : (
                <>
                  <Mic className="w-4 h-4 text-[#19f08c]" />
                  <span>{isEn ? "Speak by Voice" : "سجّل بصوتك 🎙️"}</span>
                </>
              )}
            </button>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            value={voicePrompt}
            onChange={(e) => setVoicePrompt(e.target.value)}
            placeholder={
              isEn
                ? 'e.g. "I have 14 lectures and exam in 10 days, 4 hours/day, Friday off..."'
                : 'مثال: "عندي ١٤ محاضرة في البلوك وامتحاني بعد ١٠ أيام، بذاكر ٤ ساعات يومياً والجمعة أجازة..."'
            }
            className="flex-1 h-11 rounded-xl bg-[#090c11] border border-white/15 px-4 text-xs sm:text-sm text-[#f5f7fa] placeholder:text-[#646e7d] focus:outline-none focus:border-[#19f08c]"
          />
          <button
            type="button"
            disabled={isGeneratingSchedule}
            onClick={() => handleGenerateSchedule()}
            className="btn-primary-glow h-11 px-5 rounded-xl text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shrink-0 cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isGeneratingSchedule
                ? isEn
                  ? "Organizing..."
                  : "جاري التنظيم..."
                : isEn
                ? "Generate AI Schedule"
                : "تنظيم الجدول بالـ AI ⚡"}
            </span>
          </button>
        </div>

        {/* Preset Quick Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[11px] font-bold text-[#9aa4b2] me-1">
            {isEn ? "Try saying:" : "أمثلة سريعة:"}
          </span>
          {VOICE_PRESETS.map((preset, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                playClick();
                setVoicePrompt(preset);
              }}
              className="text-start px-2.5 py-1 rounded-lg bg-[#090c11]/90 hover:bg-white/[0.05] border border-white/10 hover:border-[#19f08c]/35 text-[11px] text-[#9aa4b2] hover:text-[#f5f7fa] transition cursor-pointer"
            >
              "{preset}"
            </button>
          ))}
        </div>
      </GlassCard>

      {/* Create Block Modal */}
      {showCreateModal && (
        <GlassCard className="p-5 sm:p-6 border-[#19f08c]/40 space-y-5">
          <div className="flex items-center justify-between border-b border-white/10 pb-3">
            <h3 className="text-base sm:text-lg font-black text-[#f5f7fa]">
              {isEn ? "Create New Curriculum Block" : "إنشاء بلوك دراسي / منهج جديد في الحافظة"}
            </h3>
            <button
              type="button"
              onClick={() => setShowCreateModal(false)}
              className="text-xs font-bold text-[#9aa4b2] hover:text-white px-2.5 py-1 rounded-lg bg-white/5"
            >
              {isEn ? "Close" : "إغلاق ✕"}
            </button>
          </div>

          <form onSubmit={handleCreateBlock} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-[#9aa4b2] mb-1.5">
                  {isEn ? "Block / Subject Name" : "اسم البلوك أو المادة"}
                </label>
                <input
                  type="text"
                  required
                  value={newBlockName}
                  onChange={(e) => setNewBlockName(e.target.value)}
                  placeholder={isEn ? "e.g. Cardiovascular Block" : "مثال: بلوك الكارديو / البطنة / الفسيولوجي"}
                  className="w-full h-10 rounded-xl bg-[#090c11] border border-white/15 px-3.5 text-xs sm:text-sm text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-[#9aa4b2] mb-1.5">
                  {isEn ? "Exam Date" : "تاريخ امتحان البلوك"}
                </label>
                <input
                  type="date"
                  value={newBlockExamDate}
                  onChange={(e) => setNewBlockExamDate(e.target.value)}
                  className="w-full h-10 rounded-xl bg-[#090c11] border border-white/15 px-3.5 text-xs sm:text-sm text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs font-bold text-[#9aa4b2] mb-1.5">
                    {isEn ? "Total Lectures" : "عدد المحاضرات"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={100}
                    value={newBlockLectureCount}
                    onChange={(e) => setNewBlockLectureCount(Number(e.target.value))}
                    className="w-full h-10 rounded-xl bg-[#090c11] border border-white/15 px-3 text-xs sm:text-sm text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-[#9aa4b2] mb-1.5">
                    {isEn ? "Hours / Day" : "ساعات المذاكرة/يوم"}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={16}
                    value={newBlockDailyHours}
                    onChange={(e) => setNewBlockDailyHours(Number(e.target.value))}
                    className="w-full h-10 rounded-xl bg-[#090c11] border border-white/15 px-3 text-xs sm:text-sm text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                  />
                </div>
              </div>
            </div>

            {/* Color Picker & Course Import */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#9aa4b2]">
                  {isEn ? "Block Color:" : "لون البلوك:"}
                </span>
                {BLOCK_COLORS.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => setNewBlockColor(c.id)}
                    className={cn(
                      "w-6 h-6 rounded-full border-2 transition cursor-pointer",
                      newBlockColor === c.id ? "scale-125 border-white" : "border-transparent opacity-70"
                    )}
                    style={{ backgroundColor: c.hex }}
                    title={c.label}
                  />
                ))}
              </div>

              {courses.length > 0 && (
                <div className="flex flex-wrap items-center gap-3">
                  <label className="inline-flex items-center gap-2 text-xs font-bold text-[#f5f7fa] cursor-pointer">
                    <input
                      type="checkbox"
                      checked={importAllUploaded}
                      onChange={(e) => setImportAllUploaded(e.target.checked)}
                      className="rounded border-white/20 accent-[#19f08c]"
                    />
                    <span>
                      {isEn
                        ? `Import from my uploaded platform lectures (${courses.length})`
                        : `ضم محاضراتي المرفوعة في المنصة تلقائياً (${courses.length} محاضرة)`}
                    </span>
                  </label>

                  {importAllUploaded && courseFolders.length > 0 && (
                    <select
                      value={selectedImportFolder}
                      onChange={(e) => setSelectedImportFolder(e.target.value)}
                      className="h-8 rounded-lg bg-[#090c11] border border-white/15 px-2.5 text-xs text-[#f5f7fa]"
                    >
                      <option value="all">{isEn ? "All Folders" : "كل المجلدات"}</option>
                      {courseFolders.map((f) => (
                        <option key={f} value={f}>
                          {f}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              )}
            </div>

            <div>
              <label className="block text-xs font-bold text-[#9aa4b2] mb-1.5">
                {isEn
                  ? "Optional: Paste specific lecture titles (one per line)"
                  : "اختياري: اكتب أو الصق أسماء محاضرات البلوك (كل محاضرة في سطر — أو اتركه فارغاً لترقيمها تلقائياً)"}
              </label>
              <textarea
                rows={3}
                value={newBlockCustomTitles}
                onChange={(e) => setNewBlockCustomTitles(e.target.value)}
                placeholder={
                  isEn
                    ? "Lecture 1: Introduction to Cardiology\nLecture 2: Arrhythmias & ECG..."
                    : "المحاضرة 1: مقدمة الفسيولوجي\nالمحاضرة 2: تخطيط القلب ECG..."
                }
                className="w-full rounded-xl bg-[#090c11] border border-white/15 p-3 text-xs text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
              />
            </div>

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 rounded-xl bg-white/5 text-xs font-bold text-[#9aa4b2]"
              >
                {isEn ? "Cancel" : "إلغاء"}
              </button>
              <button
                type="submit"
                className="btn-primary-glow px-5 py-2 rounded-xl text-xs font-black cursor-pointer"
              >
                {isEn ? "Create Block Vault" : "حفظ وإنشاء البلوك ✨"}
              </button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Blocks Horizontal Selector Tabs */}
      {blocks.length > 0 && (
        <div className="flex items-center gap-2.5 overflow-x-auto scrollbar-none pb-1">
          {blocks.map((b) => {
            const st = computeBlockStats(b);
            const isSelected = activeBlock?.id === b.id;
            const colorMeta = BLOCK_COLORS.find((c) => c.id === b.color) || BLOCK_COLORS[0];
            return (
              <button
                key={b.id}
                type="button"
                onClick={() => {
                  playClick();
                  setActiveBlockId(b.id);
                }}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-2xl border text-start transition shrink-0 cursor-pointer",
                  isSelected
                    ? `${colorMeta.bg} ${colorMeta.border} text-white`
                    : "bg-[#090c11] border-white/10 text-[#9aa4b2] hover:text-white hover:border-white/20"
                )}
              >
                <span
                  className="w-3 h-3 rounded-full shrink-0"
                  style={{ backgroundColor: colorMeta.hex }}
                />
                <div>
                  <div className="text-xs sm:text-sm font-black leading-tight">{b.name}</div>
                  <div className="text-[11px] opacity-80 font-mono mt-0.5">
                    {st.solved}/{st.total} {isEn ? "solved" : "محلولة"} • {st.progressPct}%
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* Active Block Workspace */}
      {activeBlock && activeStats ? (
        <div className="space-y-6">
          {/* Active Block Progress Banner */}
          <GlassCard className="p-5 sm:p-6 space-y-4">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="space-y-1">
                <div className="flex items-center gap-2.5 flex-wrap">
                  <h2 className="text-lg sm:text-xl font-black text-[#f5f7fa]">
                    {activeBlock.name}
                  </h2>
                  <LVBadge variant="emerald">
                    {activeStats.progressPct}% {isEn ? "Complete" : "مكتمل"}
                  </LVBadge>
                  {activeStats.daysUntilExam !== null && (
                    <span className="px-2.5 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                      {isEn
                        ? `Exam: ${activeBlock.examDate} (${activeStats.daysUntilExam}d left)`
                        : `الامتحان: ${activeBlock.examDate} (باقي ${activeStats.daysUntilExam} يوم)`}
                    </span>
                  )}
                </div>
                {activeBlock.aiCoachNote && (
                  <p className="text-xs text-[#19f08c] font-semibold">
                    💡 {activeBlock.aiCoachNote}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {courses.length > 0 && (
                  <button
                    type="button"
                    onClick={handleSyncWithUploaded}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e131b] hover:bg-white/[0.06] border border-white/10 text-xs font-bold text-[#f5f7fa] cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5 text-[#19f08c]" />
                    <span>{isEn ? "Sync Uploaded Lectures" : "مزامنة مع محاضراتي المرفوعة"}</span>
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setShowAddLecturesBox((v) => !v);
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#0e131b] hover:bg-white/[0.06] border border-white/10 text-xs font-bold text-[#f5f7fa] cursor-pointer"
                >
                  <ListPlus className="w-3.5 h-3.5 text-[#19f08c]" />
                  <span>{isEn ? "Add Lectures" : "إضافة محاضرات للبلوك"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleDeleteBlock(activeBlock.id)}
                  className="inline-flex items-center gap-1 px-2.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/25 text-xs font-bold text-rose-300 cursor-pointer"
                  title={isEn ? "Delete block" : "حذف البلوك"}
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Interactive Completion Bar */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-[#9aa4b2]">
                  {isEn
                    ? `Solved ${activeStats.solved} of ${activeStats.total} lectures (${activeStats.remainingToSolve} remaining)`
                    : `تم حل وإنجاز ${activeStats.solved} من أصل ${activeStats.total} محاضرة (متبقي ${activeStats.remainingToSolve} لم تُحل)`}
                </span>
                <span className="font-mono text-[#19f08c]">{activeStats.progressPct}%</span>
              </div>
              <div className="h-3 w-full rounded-full bg-[#05070a] border border-white/10 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-[#19f08c] to-emerald-400 transition-all duration-500 rounded-full"
                  style={{ width: `${activeStats.progressPct}%` }}
                />
              </div>
            </div>

            {/* Add Lectures Inline Drawer */}
            {showAddLecturesBox && (
              <form
                onSubmit={handleAddLecturesToActive}
                className="p-4 rounded-2xl bg-[#090c11] border border-white/10 space-y-3"
              >
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-[#9aa4b2] mb-1">
                      {isEn
                        ? "Lecture titles (one per line)"
                        : "اكتب أسماء المحاضرات المراد إضافتها (كل محاضرة في سطر)"}
                    </label>
                    <textarea
                      rows={2}
                      value={addLecturesText}
                      onChange={(e) => setAddLecturesText(e.target.value)}
                      placeholder={
                        isEn
                          ? "Lecture 13: Heart Failure\nLecture 14: Valvular Diseases"
                          : "المحاضرة 13: فشل عضلة القلب\nالمحاضرة 14: أمراض الصمامات"
                      }
                      className="w-full rounded-xl bg-[#0e131b] border border-white/15 p-2.5 text-xs text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                    />
                  </div>
                  <div className="flex flex-col justify-between">
                    <div>
                      <label className="block text-xs font-bold text-[#9aa4b2] mb-1">
                        {isEn ? "Or add numbered lectures by count:" : "أو أضف عدداً مرقماً تلقائياً:"}
                      </label>
                      <input
                        type="number"
                        min={0}
                        max={60}
                        value={addLecturesCount}
                        onChange={(e) => setAddLecturesCount(Number(e.target.value))}
                        className="w-full h-9 rounded-xl bg-[#0e131b] border border-white/15 px-3 text-xs text-[#f5f7fa]"
                      />
                    </div>
                    <div className="flex justify-end gap-2 mt-2">
                      <button
                        type="button"
                        onClick={() => setShowAddLecturesBox(false)}
                        className="px-3 py-1.5 rounded-lg bg-white/5 text-xs text-[#9aa4b2]"
                      >
                        {isEn ? "Cancel" : "إلغاء"}
                      </button>
                      <button
                        type="submit"
                        className="btn-primary-glow px-4 py-1.5 rounded-lg text-xs font-black cursor-pointer"
                      >
                        {isEn ? "Add Now" : "إضافة الآن +"}
                      </button>
                    </div>
                  </div>
                </div>
              </form>
            )}

            {/* Sub-navigation: Block Lectures Vault vs Smart Daily Schedule */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-white/[0.08]">
              <div className="inline-flex rounded-xl bg-[#090c11] border border-white/10 p-1">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setActiveSubTab("vault");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer",
                    activeSubTab === "vault"
                      ? "bg-[#19f08c] text-[#03150c]"
                      : "text-[#9aa4b2] hover:text-white"
                  )}
                >
                  {isEn
                    ? `1. Block Lectures & Progress (${activeBlock.lectures?.length || 0})`
                    : `١. محاضرات البلوك وتتبع الحل (${activeBlock.lectures?.length || 0})`}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    setActiveSubTab("schedule");
                  }}
                  className={cn(
                    "px-4 py-2 rounded-lg text-xs font-black transition cursor-pointer",
                    activeSubTab === "schedule"
                      ? "bg-[#19f08c] text-[#03150c]"
                      : "text-[#9aa4b2] hover:text-white"
                  )}
                >
                  {isEn
                    ? `2. Smart Daily Schedule (${activeBlock.schedule?.length || 0}d)`
                    : `٢. جدول المذاكرة الذكي (${activeBlock.schedule?.length || 0} يوم)`}
                </button>
              </div>

              {activeSubTab === "vault" ? (
                <div className="flex flex-wrap items-center gap-1.5">
                  {[
                    { id: "all", label: isEn ? "All" : "الكل", count: activeStats.total },
                    { id: "unsolved", label: isEn ? "Unsolved ⭕" : "لم يُحل ⭕", count: activeStats.unsolved },
                    { id: "studying", label: isEn ? "Studying ⏳" : "قيد المذاكرة ⏳", count: activeStats.studying },
                    { id: "solved", label: isEn ? "Solved ✅" : "تم الحل ✅", count: activeStats.solved },
                    { id: "review_needed", label: isEn ? "Review 🔥" : "للمراجعة 🔥", count: activeStats.reviewNeeded },
                  ].map((f) => (
                    <button
                      key={f.id}
                      type="button"
                      onClick={() => setLectureFilter(f.id)}
                      className={cn(
                        "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition cursor-pointer",
                        lectureFilter === f.id
                          ? "bg-[#19f08c]/15 text-[#19f08c] border-[#19f08c]/40"
                          : "bg-[#090c11] text-[#9aa4b2] border-white/10 hover:text-white"
                      )}
                    >
                      {f.label} ({f.count})
                    </button>
                  ))}
                </div>
              ) : (
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      handleGenerateSchedule(
                        isEn
                          ? "Reschedule remaining unsolved lectures across available days before exam"
                          : "أعد جدولة المحاضرات غير المحلولة المتبقية على الأيام المتاحة قبل الامتحان"
                      )
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-xs font-bold text-amber-300 cursor-pointer"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>
                      {isEn ? "Auto-Reschedule Unsolved" : "إعادة جدولة غير المحلول تلقائياً"}
                    </span>
                  </button>
                </div>
              )}
            </div>
          </GlassCard>

          {/* TAB 1: Block Lectures & Progress Tracker */}
          {activeSubTab === "vault" && (
            <div className="space-y-3">
              {filteredLectures.length === 0 ? (
                <GlassCard className="p-8 text-center space-y-3">
                  <BookOpen className="w-10 h-10 text-[#19f08c] mx-auto" />
                  <h3 className="text-base font-bold text-white">
                    {isEn ? "No lectures in this filter" : "لا توجد محاضرات في هذا التصنيف حالياً"}
                  </h3>
                  <p className="text-xs text-[#9aa4b2]">
                    {isEn
                      ? "Add lectures using the button above or sync with your uploaded platform lectures."
                      : "اضغط على (إضافة محاضرات للبلوك) بالأعلى أو قم بالمزامنة مع محاضراتك المرفوعة."}
                  </p>
                </GlassCard>
              ) : (
                filteredLectures.map((lec, idx) => {
                  const isSolved = lec.status === "solved";
                  const isReview = lec.status === "review_needed";
                  const isStudying = lec.status === "studying";

                  return (
                    <GlassCard
                      key={lec.id}
                      className={cn(
                        "p-4 transition-colors",
                        isSolved
                          ? "border-emerald-500/35 bg-emerald-500/[0.04]"
                          : isReview
                          ? "border-amber-500/35 bg-amber-500/[0.04]"
                          : ""
                      )}
                    >
                      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3.5">
                        {/* Left/Right: Number + Title + Linked Course */}
                        <div className="flex items-start gap-3 min-w-0 flex-1">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateLecture(lec.id, {
                                status: isSolved ? "unsolved" : "solved",
                              })
                            }
                            title={isEn ? "Toggle solved status" : "تبديل حالة الحل"}
                            className={cn(
                              "w-8 h-8 rounded-xl flex items-center justify-center font-mono text-xs font-black shrink-0 border transition cursor-pointer",
                              isSolved
                                ? "bg-[#19f08c] text-[#03150c] border-[#19f08c]"
                                : "bg-[#090c11] text-[#9aa4b2] border-white/15 hover:border-[#19f08c]"
                            )}
                          >
                            {isSolved ? <CheckCircle2 className="w-4 h-4" /> : lec.number || idx + 1}
                          </button>

                          <div className="min-w-0 flex-1">
                            <input
                              type="text"
                              value={lec.title}
                              onChange={(e) =>
                                handleUpdateLecture(lec.id, { title: e.target.value })
                              }
                              className={cn(
                                "w-full bg-transparent text-sm sm:text-base font-bold focus:outline-none focus:border-b focus:border-[#19f08c]",
                                isSolved ? "text-emerald-300" : "text-[#f5f7fa]"
                              )}
                            />
                            <div className="flex flex-wrap items-center gap-2 mt-1">
                              {lec.linkedCourseId ? (
                                <Link
                                  to={`/course/${lec.linkedCourseId}`}
                                  className="inline-flex items-center gap-1 text-[11px] font-bold text-[#19f08c] hover:underline"
                                >
                                  <ExternalLink className="w-3 h-3" />
                                  <span>{isEn ? "Open Lecture Atlas & Quiz" : "فتح ملخص وكويز المحاضرة"}</span>
                                </Link>
                              ) : (
                                <Link
                                  to="/create"
                                  className="inline-flex items-center gap-1 text-[11px] text-[#9aa4b2] hover:text-[#19f08c]"
                                >
                                  <BookOpen className="w-3 h-3" />
                                  <span>{isEn ? "Upload file for this lecture" : "رفع ملف هذه المحاضرة"}</span>
                                </Link>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Middle: 3 Mastery Checkboxes (Summary / Theory Quiz / OSCE) */}
                        <div className="flex flex-wrap items-center gap-2">
                          {[
                            {
                              key: "summaryDone",
                              label: isEn ? "Summary" : "الملخص",
                              icon: BookOpen,
                              val: Boolean(lec.summaryDone),
                            },
                            {
                              key: "theoryQuizDone",
                              label: isEn ? "Theory Quiz" : "كويز نظري",
                              icon: Brain,
                              val: Boolean(lec.theoryQuizDone),
                            },
                            {
                              key: "osceDone",
                              label: isEn ? "OSCE / Practical" : "الأوسكي/العملي",
                              icon: Layers,
                              val: Boolean(lec.osceDone),
                            },
                          ].map((pillar) => {
                            const PIcon = pillar.icon;
                            return (
                              <button
                                key={pillar.key}
                                type="button"
                                onClick={() =>
                                  handleUpdateLecture(lec.id, { [pillar.key]: !pillar.val })
                                }
                                className={cn(
                                  "inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border text-xs font-bold transition cursor-pointer",
                                  pillar.val
                                    ? "bg-[#19f08c]/15 border-[#19f08c]/45 text-[#19f08c]"
                                    : "bg-[#090c11] border-white/10 text-[#9aa4b2] hover:text-white"
                                )}
                              >
                                <PIcon className="w-3.5 h-3.5" />
                                <span>{pillar.label}</span>
                                {pillar.val ? (
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                ) : (
                                  <Circle className="w-3.5 h-3.5 opacity-40" />
                                )}
                              </button>
                            );
                          })}
                        </div>

                        {/* Right: Status Selector + Quiz Score + Delete */}
                        <div className="flex items-center gap-2 shrink-0">
                          <div className="flex items-center gap-1 bg-[#090c11] border border-white/10 rounded-xl px-2 py-1">
                            <span className="text-[10px] text-[#9aa4b2]">
                              {isEn ? "Score:" : "الدرجة:"}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={100}
                              placeholder="%"
                              value={lec.quizScore ?? ""}
                              onChange={(e) =>
                                handleUpdateLecture(lec.id, {
                                  quizScore: e.target.value === "" ? null : Number(e.target.value),
                                })
                              }
                              className="w-11 bg-transparent text-center font-mono text-xs font-bold text-[#19f08c] focus:outline-none"
                            />
                          </div>

                          <select
                            value={lec.status || "unsolved"}
                            onChange={(e) =>
                              handleUpdateLecture(lec.id, { status: e.target.value })
                            }
                            className={cn(
                              "h-8 rounded-xl px-2.5 text-xs font-bold border focus:outline-none cursor-pointer",
                              isSolved
                                ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-300"
                                : isStudying
                                ? "bg-sky-500/15 border-sky-500/40 text-sky-300"
                                : isReview
                                ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                                : "bg-[#090c11] border-white/15 text-[#9aa4b2]"
                            )}
                          >
                            <option value="unsolved">{isEn ? "Unsolved ⭕" : "لم يُحل ⭕"}</option>
                            <option value="studying">{isEn ? "Studying ⏳" : "قيد المذاكرة ⏳"}</option>
                            <option value="solved">{isEn ? "Solved ✅" : "تم الحل ✅"}</option>
                            <option value="review_needed">{isEn ? "Needs Review 🔥" : "يحتاج مراجعة 🔥"}</option>
                          </select>

                          <button
                            type="button"
                            onClick={() => handleDeleteLecture(lec.id)}
                            className="p-1.5 rounded-lg text-[#646e7d] hover:text-rose-400 transition cursor-pointer"
                            title={isEn ? "Remove lecture" : "حذف المحاضرة"}
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    </GlassCard>
                  );
                })
              )}
            </div>
          )}

          {/* TAB 2: Smart Daily Study Schedule */}
          {activeSubTab === "schedule" && (
            <div className="space-y-4">
              {(!activeBlock.schedule || activeBlock.schedule.length === 0) ? (
                <GlassCard className="p-10 text-center space-y-4">
                  <Calendar className="w-12 h-12 text-[#19f08c] mx-auto" />
                  <h3 className="text-lg font-black text-white">
                    {isEn
                      ? "Ready to Generate Your Smart Schedule"
                      : "جدول المذاكرة الذكي جاهز للتوليد الآن!"}
                  </h3>
                  <p className="text-xs text-[#9aa4b2] max-w-md mx-auto">
                    {isEn
                      ? "Click the button below or use the Voice Command Studio above to distribute your lectures across the days before your exam."
                      : "اضغط على الزر بالأسفل أو استخدم الميكروفون بالأعلى ليقوم الذكاء الاصطناعي بتوزيع محاضرات البلوك غير المحلولة على الأيام المتاحة قبل الامتحان."}
                  </p>
                  <button
                    type="button"
                    onClick={() => handleGenerateSchedule()}
                    className="btn-primary-glow inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-black cursor-pointer"
                  >
                    <Sparkles className="w-4 h-4" />
                    <span>
                      {isEn
                        ? "Generate Smart Schedule Now ⚡"
                        : "توليد جدول المذاكرة الذكي الآن ⚡"}
                    </span>
                  </button>
                </GlassCard>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {activeBlock.schedule.map((day) => {
                    const dayTotal = day.tasks?.length || 0;
                    const dayDone = (day.tasks || []).filter((t) => t.done).length;
                    const allDayDone = dayTotal > 0 && dayDone === dayTotal;

                    return (
                      <GlassCard
                        key={day.id}
                        className={cn(
                          "p-5 space-y-3.5 flex flex-col justify-between",
                          allDayDone
                            ? "border-emerald-500/40 bg-emerald-500/[0.04]"
                            : day.isOffDay
                            ? "border-white/5 opacity-85"
                            : ""
                        )}
                      >
                        <div className="space-y-3">
                          <div className="flex items-center justify-between border-b border-white/[0.08] pb-2.5">
                            <div className="flex items-center gap-2.5">
                              <span
                                className={cn(
                                  "w-8 h-8 rounded-xl font-mono text-xs font-black flex items-center justify-center",
                                  allDayDone
                                    ? "bg-[#19f08c] text-[#03150c]"
                                    : "bg-white/10 text-white"
                                )}
                              >
                                {day.dayNumber}
                              </span>
                              <div>
                                <div className="text-xs sm:text-sm font-black text-white">
                                  {day.dayName} •{" "}
                                  <span className="font-mono text-xs text-[#9aa4b2]">
                                    {day.date}
                                  </span>
                                </div>
                                <div className="text-[11px] font-bold text-[#19f08c] line-clamp-1">
                                  {day.focusTitle}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <span className="px-2.5 py-1 rounded-lg bg-[#090c11] border border-white/10 text-[11px] font-mono text-[#9aa4b2] inline-flex items-center gap-1">
                                <Clock className="w-3 h-3 text-[#19f08c]" />
                                {day.estimatedHours || 4}h
                              </span>
                            </div>
                          </div>

                          <div className="space-y-2">
                            {(day.tasks || []).map((task) => (
                              <button
                                key={task.id}
                                type="button"
                                onClick={() => handleToggleScheduleTask(day.id, task.id)}
                                className={cn(
                                  "w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-start transition cursor-pointer",
                                  task.done
                                    ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-300"
                                    : "bg-[#090c11]/80 border-white/[0.07] hover:border-[#19f08c]/35 text-[#f5f7fa]"
                                )}
                              >
                                {task.done ? (
                                  <CheckCircle2 className="w-4 h-4 text-[#19f08c] shrink-0 mt-0.5" />
                                ) : (
                                  <Circle className="w-4 h-4 text-[#646e7d] shrink-0 mt-0.5" />
                                )}
                                <span
                                  className={cn(
                                    "text-xs font-semibold leading-relaxed flex-1",
                                    task.done && "line-through opacity-75"
                                  )}
                                >
                                  {task.title}
                                </span>
                              </button>
                            ))}
                          </div>
                        </div>

                        <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-[11px] text-[#9aa4b2]">
                          <span>
                            {isEn
                              ? `${dayDone}/${dayTotal} tasks completed`
                              : `تم إنجاز ${dayDone} من ${dayTotal} مهام`}
                          </span>
                          {allDayDone && (
                            <span className="text-[#19f08c] font-bold inline-flex items-center gap-1">
                              <CheckCheck className="w-3.5 h-3.5" />
                              {isEn ? "Day Complete!" : "اكتمل اليوم!"}
                            </span>
                          )}
                        </div>
                      </GlassCard>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      ) : (
        <GlassCard className="p-10 text-center space-y-4">
          <FolderKanban className="w-12 h-12 text-[#19f08c] mx-auto" />
          <h3 className="text-lg font-black text-white">
            {isEn
              ? "Start Your First Curriculum Block Vault"
              : "ابدأ بتجميع أول بلوك دراسي أو مادة في حافظتك"}
          </h3>
          <p className="text-xs text-[#9aa4b2] max-w-md mx-auto">
            {isEn
              ? "Create a block for your current subject, add your lecture count or import uploaded files, and let AI organize your study schedule."
              : "أنشئ بلوك لمادتك الحالية، حدد عدد المحاضرات أو استورد محاضراتك المرفوعة، ودع الذكاء الاصطناعي ينظم جدولك بالصوت ويصدره لك PDF."}
          </p>
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="btn-primary-glow inline-flex items-center gap-2 px-6 py-3 rounded-xl text-xs sm:text-sm font-black cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>{isEn ? "Create First Block" : "إنشاء أول بلوك دراسي الآن"}</span>
          </button>
        </GlassCard>
      )}
    </div>
  );
}
