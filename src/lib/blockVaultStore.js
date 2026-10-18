/**
 * blockVaultStore.js
 * Persistent store & AI/Voice scheduling engine for the Curriculum Block Vault & Study Planner.
 * Syncs instantaneously with localStorage and asynchronously with Firestore UserSettings.
 */

import { base44 } from "@/api/base44Client";
import { getAiConfig } from "@/api/index";
import { generateText } from "@/lib/ai";

const STORAGE_KEY = "bf_curriculum_blocks_v1";

export const BLOCK_COLORS = [
  { id: "emerald", label: "أخضر زمردي", hex: "#19f08c", bg: "bg-[#19f08c]/12", border: "border-[#19f08c]/35", text: "text-[#19f08c]" },
  { id: "cyan", label: "سماوي طبي", hex: "#38bdf8", bg: "bg-sky-500/12", border: "border-sky-500/35", text: "text-sky-400" },
  { id: "purple", label: "بنفسجي ملكي", hex: "#a855f7", bg: "bg-purple-500/12", border: "border-purple-500/35", text: "text-purple-400" },
  { id: "amber", label: "ذهبي تحذيري", hex: "#f59e0b", bg: "bg-amber-500/12", border: "border-amber-500/35", text: "text-amber-400" },
  { id: "rose", label: "وردي سريري", hex: "#f43f5e", bg: "bg-rose-500/12", border: "border-rose-500/35", text: "text-rose-400" },
];

export const ARABIC_DAYS = [
  { key: 0, ar: "الأحد", en: "Sunday", match: ["احد", "الأحد", "الاحد", "sunday", "sun"] },
  { key: 1, ar: "الإثنين", en: "Monday", match: ["اثنين", "الإثنين", "الاثنين", "اتنين", "monday", "mon"] },
  { key: 2, ar: "الثلاثاء", en: "Tuesday", match: ["ثلاثاء", "الثلاثاء", "تلات", "ثلاث", "tuesday", "tue"] },
  { key: 3, ar: "الأربعاء", en: "Wednesday", match: ["اربعاء", "الأربعاء", "الاربعاء", "اربع", "wednesday", "wed"] },
  { key: 4, ar: "الخميس", en: "Thursday", match: ["خميس", "الخميس", "thursday", "thu"] },
  { key: 5, ar: "الجمعة", en: "Friday", match: ["جمعة", "الجمعة", "جمعه", "الجمعه", "friday", "fri"] },
  { key: 6, ar: "السبت", en: "Saturday", match: ["سبت", "السبت", "saturday", "sat"] },
];

function makeId(prefix = "blk") {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`;
}

/**
 * Convert Arabic-Indic digits (٠١٢٣٤٥٦٧٨٩) to standard digits
 */
export function normalizeDigits(str = "") {
  return String(str)
    .replace(/[٠-٩]/g, (d) => String(d.charCodeAt(0) - 0x0660))
    .replace(/[۰-۹]/g, (d) => String(d.charCodeAt(0) - 0x06f0));
}

/**
 * Load all blocks from localStorage
 */
export function loadBlocksLocal() {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Save blocks to localStorage and sync to Firestore UserSettings in background
 */
export function saveBlocksLocalAndCloud(blocks = []) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(blocks));
  } catch (err) {
    console.warn("[blockVaultStore] localStorage write error:", err);
  }

  // Non-blocking cloud sync
  base44.entities.UserSettings.upsert({
    curriculum_blocks_v1: blocks,
    curriculum_blocks_updated_at: new Date().toISOString(),
  }).catch(() => {});
}

/**
 * Fetch blocks from cloud if local is empty or older
 */
export async function syncBlocksFromCloud() {
  const local = loadBlocksLocal();
  try {
    const settings = await base44.entities.UserSettings.get().catch(() => null);
    const cloudBlocks = settings?.curriculum_blocks_v1;
    if (Array.isArray(cloudBlocks) && cloudBlocks.length > 0 && local.length === 0) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(cloudBlocks));
      return cloudBlocks;
    }
  } catch {}
  return local;
}

/**
 * Calculate comprehensive completion metrics for a block
 */
export function computeBlockStats(block) {
  const lectures = Array.isArray(block?.lectures) ? block.lectures : [];
  const total = lectures.length;
  const solved = lectures.filter((l) => l.status === "solved").length;
  const studying = lectures.filter((l) => l.status === "studying").length;
  const reviewNeeded = lectures.filter((l) => l.status === "review_needed").length;
  const unsolved = lectures.filter((l) => !l.status || l.status === "unsolved").length;

  // Weighted progress: solved = 100%, review_needed = 75%, studying = 45%
  const weightedSum = lectures.reduce((acc, l) => {
    if (l.status === "solved") return acc + 1;
    if (l.status === "review_needed") return acc + 0.75;
    if (l.status === "studying") return acc + 0.45;
    const pillars = (l.summaryDone ? 0.35 : 0) + (l.theoryQuizDone ? 0.35 : 0) + (l.osceDone ? 0.3 : 0);
    return acc + pillars;
  }, 0);

  const progressPct = total > 0 ? Math.min(100, Math.round((weightedSum / total) * 100)) : 0;

  let daysUntilExam = null;
  if (block?.examDate) {
    const examMs = new Date(block.examDate).setHours(23, 59, 59, 999);
    const nowMs = Date.now();
    if (Number.isFinite(examMs)) {
      daysUntilExam = Math.max(0, Math.ceil((examMs - nowMs) / 86400000));
    }
  }

  const remainingToSolve = Math.max(0, total - solved);
  const requiredDailyPace =
    daysUntilExam && daysUntilExam > 0
      ? Number((remainingToSolve / daysUntilExam).toFixed(1))
      : remainingToSolve > 0
      ? Number((remainingToSolve / 7).toFixed(1))
      : 0;

  // Schedule completion stats
  const scheduleDays = Array.isArray(block?.schedule) ? block.schedule : [];
  let totalTasks = 0;
  let completedTasks = 0;
  scheduleDays.forEach((day) => {
    (day.tasks || []).forEach((t) => {
      totalTasks++;
      if (t.done) completedTasks++;
    });
  });

  const schedulePct = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  return {
    total,
    solved,
    studying,
    reviewNeeded,
    unsolved,
    remainingToSolve,
    progressPct,
    daysUntilExam,
    requiredDailyPace,
    totalTasks,
    completedTasks,
    schedulePct,
  };
}

/**
 * Create a new Block object with initial lectures (from count, custom names, or uploaded courses)
 */
export function createBlock({
  name,
  color = "emerald",
  examDate = "",
  dailyHours = 4,
  offDays = [5], // Default Friday off
  lectureCount = 0,
  lectureTitles = [],
  importedCourses = [],
}) {
  const lectures = [];

  // 1. Add imported platform courses first
  importedCourses.forEach((course, idx) => {
    const hasSummary = Boolean(course.summary || course.summary_v3);
    const hasQuiz = Array.isArray(course.quiz) && course.quiz.length > 0;
    const isSolved = hasSummary && hasQuiz;
    lectures.push({
      id: makeId("lec"),
      number: lectures.length + 1,
      title: course.title || `محاضرة ${idx + 1}`,
      linkedCourseId: course.id,
      folder: course.folder || "",
      status: isSolved ? "solved" : hasSummary || hasQuiz ? "studying" : "unsolved",
      summaryDone: hasSummary,
      theoryQuizDone: hasQuiz,
      osceDone: false,
      quizScore: null,
      difficulty: "medium",
      notes: "",
    });
  });

  // 2. Add explicit custom lecture titles
  lectureTitles
    .map((t) => t.trim())
    .filter(Boolean)
    .forEach((title) => {
      lectures.push({
        id: makeId("lec"),
        number: lectures.length + 1,
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

  // 3. If numeric lectureCount is specified beyond what was added, scaffold remaining lectures
  const targetCount = Math.max(0, Math.min(120, Number(lectureCount) || 0));
  while (lectures.length < targetCount) {
    const num = lectures.length + 1;
    lectures.push({
      id: makeId("lec"),
      number: num,
      title: `المحاضرة ${num} — ${name || "البلوك"}`,
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

  return {
    id: makeId("block"),
    name: (name || "بلوك دراسي جديد").trim(),
    color,
    examDate: examDate || new Date(Date.now() + 14 * 86400000).toISOString().slice(0, 10),
    dailyHours: Number(dailyHours) || 4,
    offDays: Array.isArray(offDays) ? offDays : [5],
    lectures,
    schedule: [],
    lastVoicePrompt: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Sync a block's lectures with the user's uploaded platform courses
 * Automatically links matching titles and updates summaryDone / theoryQuizDone flags
 */
export function syncBlockWithCourses(block, uploadedCourses = []) {
  if (!block || !Array.isArray(uploadedCourses) || uploadedCourses.length === 0) return block;

  const updatedLectures = (block.lectures || []).map((lec) => {
    const matchedCourse = uploadedCourses.find(
      (c) =>
        (lec.linkedCourseId && c.id === lec.linkedCourseId) ||
        (c.title && lec.title && c.title.trim().toLowerCase() === lec.title.trim().toLowerCase())
    );
    if (!matchedCourse) return lec;

    const hasSummary = Boolean(matchedCourse.summary || matchedCourse.summary_v3);
    const hasQuiz = Array.isArray(matchedCourse.quiz) && matchedCourse.quiz.length > 0;
    const summaryDone = lec.summaryDone || hasSummary;
    const theoryQuizDone = lec.theoryQuizDone || hasQuiz;

    let nextStatus = lec.status;
    if (nextStatus === "unsolved" && summaryDone && theoryQuizDone) {
      nextStatus = "solved";
    } else if (nextStatus === "unsolved" && (summaryDone || theoryQuizDone)) {
      nextStatus = "studying";
    }

    return {
      ...lec,
      linkedCourseId: matchedCourse.id,
      summaryDone,
      theoryQuizDone,
      status: nextStatus,
    };
  });

  return {
    ...block,
    lectures: updatedLectures,
    updatedAt: new Date().toISOString(),
  };
}

/**
 * Parse natural Arabic / Egyptian / English voice or text prompt to extract scheduling parameters
 */
export function parseNaturalScheduleIntent(rawText = "", currentBlock = null) {
  const normalized = normalizeDigits(rawText).toLowerCase();

  // Extract lecture count if user mentions "14 محاضرة" or "14 lectures"
  const lecMatch = normalized.match(/(\d+)\s*(?:محاضره|محاضرة|محاضرات|درس|دروس|شابتر|فصل|lecture|lectures|topics)/i);
  const extractedLectureCount = lecMatch ? Math.min(100, Math.max(1, Number(lecMatch[1]))) : null;

  // Extract days count if user mentions "في 10 أيام" / "بعد 10 ايام" / "in 10 days"
  const daysMatch = normalized.match(/(?:في|خلال|بعد|على|لمدة|in|within|for)\s*(\d+)\s*(?:يوم|أيام|ايام|days|day)/i)
    || normalized.match(/(\d+)\s*(?:يوم|أيام|ايام|days)\b/i);
  let extractedDays = daysMatch ? Math.min(90, Math.max(1, Number(daysMatch[1]))) : null;

  if (!extractedDays && (/اسبوعين|أسبوعين|two weeks/i.test(normalized))) {
    extractedDays = 14;
  } else if (!extractedDays && (/اسبوع|أسبوع|week/i.test(normalized))) {
    extractedDays = 7;
  }

  // Extract daily study hours ("4 ساعات", "4 hours")
  const hoursMatch = normalized.match(/(\d+(?:\.\d+)?)\s*(?:ساعة|ساعه|ساعات|hr|hrs|hour|hours)/i);
  const extractedHours = hoursMatch ? Math.min(16, Math.max(1, Number(hoursMatch[1]))) : null;

  // Extract off days (e.g. "ما عدا الجمعة", "الجمعة اجازة", "Friday off")
  const offDays = [];
  if (/اجاز|أجاز|راحه|راحة|ما\s*عدا|بدون|off|rest|except/i.test(normalized)) {
    ARABIC_DAYS.forEach((d) => {
      if (d.match.some((kw) => normalized.includes(kw))) {
        offDays.push(d.key);
      }
    });
  }

  // Check if user wants OSCE / practical focus or revision days
  const includeOsce = /اوسكي|أوسكي|عملي|صور|osce|ospe|practical/i.test(normalized);
  const includeReview = /مراجع|تثبيت|امتحان|شامل|review|revision/i.test(normalized);
  const focusUnsolvedOnly = /المتبقي|اللي فاضل|غير المحلول|مش محلول|لسه|unsolved|remaining/i.test(normalized);

  return {
    lectureCount: extractedLectureCount,
    daysCount: extractedDays,
    dailyHours: extractedHours || currentBlock?.dailyHours || 4,
    offDays: offDays.length > 0 ? offDays : (currentBlock?.offDays || []),
    includeOsce,
    includeReview: includeReview || true,
    focusUnsolvedOnly,
  };
}

/**
 * Deterministic smart schedule builder (instant, zero-latency, & fallback if AI is offline)
 * Prioritizes unsolved and review_needed lectures, respects off-days, and adds quiz/OSCE & revision blocks.
 */
export function buildDeterministicSchedule(block, intent = {}, isEn = false) {
  const allLectures = Array.isArray(block?.lectures) ? block.lectures : [];
  const targetLectures = intent.focusUnsolvedOnly
    ? allLectures.filter((l) => l.status !== "solved")
    : [
        // Prioritize unsolved and review_needed first, then studying, then solved for final review
        ...allLectures.filter((l) => !l.status || l.status === "unsolved"),
        ...allLectures.filter((l) => l.status === "review_needed"),
        ...allLectures.filter((l) => l.status === "studying"),
        ...allLectures.filter((l) => l.status === "solved"),
      ];

  const effectiveLectures = targetLectures.length > 0 ? targetLectures : allLectures;

  // Determine number of calendar days
  let totalCalendarDays = intent.daysCount;
  if (!totalCalendarDays && block?.examDate) {
    const diff = Math.ceil((new Date(block.examDate).getTime() - Date.now()) / 86400000);
    if (Number.isFinite(diff) && diff >= 1 && diff <= 90) {
      totalCalendarDays = diff;
    }
  }
  if (!totalCalendarDays) {
    totalCalendarDays = Math.max(5, Math.min(21, Math.ceil((effectiveLectures.length || 6) / 1.5) + 2));
  }

  const offDaysSet = new Set(Array.isArray(intent.offDays) ? intent.offDays : (block?.offDays || []));
  const dailyHours = Number(intent.dailyHours || block?.dailyHours || 4);

  // Build calendar dates starting today
  const calendarDays = [];
  const startDate = new Date();
  for (let i = 0; i < totalCalendarDays; i++) {
    const d = new Date(startDate.getTime() + i * 86400000);
    const dateStr = d.toISOString().slice(0, 10);
    const dayOfWeek = d.getDay();
    const dayMeta = ARABIC_DAYS.find((x) => x.key === dayOfWeek) || ARABIC_DAYS[0];
    const isOffDay = offDaysSet.has(dayOfWeek) && totalCalendarDays > 2;
    calendarDays.push({
      dayNumber: i + 1,
      date: dateStr,
      dayOfWeek,
      dayNameAr: dayMeta.ar,
      dayNameEn: dayMeta.en,
      isOffDay,
    });
  }

  const activeStudyDays = calendarDays.filter((d) => !d.isOffDay);
  if (activeStudyDays.length === 0 && calendarDays.length > 0) {
    calendarDays[0].isOffDay = false;
    activeStudyDays.push(calendarDays[0]);
  }

  // Reserve last 1-2 active days for comprehensive revision + OSCE mock if we have >= 5 active days
  const revisionDaysCount = activeStudyDays.length >= 7 ? 2 : activeStudyDays.length >= 4 ? 1 : 0;
  const lectureStudyDaysCount = Math.max(1, activeStudyDays.length - revisionDaysCount);

  // Distribute lectures across lectureStudyDaysCount
  const buckets = Array.from({ length: lectureStudyDaysCount }, () => []);
  effectiveLectures.forEach((lec, idx) => {
    const bucketIdx = Math.min(
      lectureStudyDaysCount - 1,
      Math.floor((idx * lectureStudyDaysCount) / Math.max(1, effectiveLectures.length))
    );
    buckets[bucketIdx].push(lec);
  });

  let activeIdx = 0;
  const schedule = calendarDays.map((cal) => {
    if (cal.isOffDay) {
      return {
        id: makeId("day"),
        dayNumber: cal.dayNumber,
        date: cal.date,
        dayName: isEn ? cal.dayNameEn : cal.dayNameAr,
        isOffDay: true,
        focusTitle: isEn ? "Rest & Light FSRS Recall Day 🌿" : "يوم راحة واستشفاء ذهني + مراجعة خفيفة 🌿",
        estimatedHours: 1,
        tasks: [
          {
            id: makeId("tsk"),
            title: isEn
              ? "Light 20-minute FSRS spaced repetition flashcard review"
              : "مراجعة سريعة لمدة ٢٠ دقيقة لبطاقات الذاكرة المتباعدة (FSRS)",
            type: "review",
            lectureId: null,
            done: false,
          },
        ],
      };
    }

    const currentActiveIdx = activeIdx++;
    if (currentActiveIdx < lectureStudyDaysCount) {
      const assigned = buckets[currentActiveIdx] || [];
      const tasks = [];

      assigned.forEach((lec) => {
        const isSolvedAlready = lec.status === "solved";
        tasks.push({
          id: makeId("tsk"),
          title: isSolvedAlready
            ? (isEn ? `Quick Atlas Review: ${lec.title}` : `مراجعة سريعة لملخص الأطلس: ${lec.title}`)
            : (isEn ? `Deep Study & Summary: ${lec.title}` : `مذاكرة بعمق وقراءة الملخص: ${lec.title}`),
          type: "study",
          lectureId: lec.id,
          linkedCourseId: lec.linkedCourseId || null,
          done: false,
        });
        tasks.push({
          id: makeId("tsk"),
          title: isEn
            ? `Solve Theory Quiz & Mistake Check: ${lec.title}`
            : `حل كويز نظري وتصحيح الأخطاء: ${lec.title}`,
          type: "quiz",
          lectureId: lec.id,
          linkedCourseId: lec.linkedCourseId || null,
          done: false,
        });
      });

      if (intent.includeOsce || currentActiveIdx % 2 === 1) {
        tasks.push({
          id: makeId("tsk"),
          title: isEn
            ? "Practical OSCE / Image Station Drill (10 Stations)"
            : "تدريب عملي وأوسكي (OSCE) على صور المحاضرات (١٠ محطات)",
          type: "osce",
          lectureId: assigned[0]?.id || null,
          done: false,
        });
      }

      if (tasks.length === 0) {
        tasks.push({
          id: makeId("tsk"),
          title: isEn ? "Consolidate block notes & solve 15 mixed MCQs" : "تثبيت ملاحظات البلوك وحل ١٥ سؤال مجمع",
          type: "review",
          lectureId: null,
          done: false,
        });
      }

      const focusNames = assigned.map((l) => l.title).join(" + ");
      return {
        id: makeId("day"),
        dayNumber: cal.dayNumber,
        date: cal.date,
        dayName: isEn ? cal.dayNameEn : cal.dayNameAr,
        isOffDay: false,
        focusTitle: focusNames || (isEn ? `Day ${cal.dayNumber} Study Plan` : `خطة مذاكرة اليوم ${cal.dayNumber}`),
        estimatedHours: dailyHours,
        tasks,
      };
    }

    // Final Revision & Mock Exam Day
    return {
      id: makeId("day"),
      dayNumber: cal.dayNumber,
      date: cal.date,
      dayName: isEn ? cal.dayNameEn : cal.dayNameAr,
      isOffDay: false,
      focusTitle: isEn
        ? "Comprehensive Block Revision & Full OSCE + Theory Mock Exam 🔥"
        : "مراجعة شاملة للبلوك + امتحان مجمع (نظري وأوسكي) 🔥",
      estimatedHours: dailyHours,
      tasks: [
        {
          id: makeId("tsk"),
          title: isEn
            ? "Review all high-yield exam pitfalls & flagged questions across the block"
            : "مراجعة فخاخ الامتحان والأسئلة الصعبة في جميع محاضرات البلوك",
          type: "review",
          lectureId: null,
          done: false,
        },
        {
          id: makeId("tsk"),
          title: isEn
            ? "Full-length Theory Quiz Simulation (40 MCQs)"
            : "حل كويز شامل محاكي لامتحان البلوك (٤٠ سؤال نظري)",
          type: "quiz",
          lectureId: null,
          done: false,
        },
        {
          id: makeId("tsk"),
          title: isEn
            ? "Full OSCE Practical Stations Revision"
            : "مراجعة شاملة لجميع صور ومحطات الأوسكي (OSCE) الخاصة بالبلوك",
          type: "osce",
          lectureId: null,
          done: false,
        },
      ],
    };
  });

  return schedule;
}

/**
 * Generate an AI-optimized study schedule from voice/text prompt + block state
 * Uses DeepSeek / active AI provider, with automatic deterministic fallback.
 */
export async function generateSmartBlockSchedule({ block, voiceOrTextPrompt = "", isEn = false }) {
  const intent = parseNaturalScheduleIntent(voiceOrTextPrompt, block);

  // If the user mentioned a specific lecture count in their voice command and the block currently has fewer lectures, expand automatically!
  let updatedBlock = { ...block };
  if (intent.lectureCount && intent.lectureCount > (updatedBlock.lectures?.length || 0)) {
    const nextLectures = [...(updatedBlock.lectures || [])];
    while (nextLectures.length < intent.lectureCount) {
      const n = nextLectures.length + 1;
      nextLectures.push({
        id: makeId("lec"),
        number: n,
        title: isEn ? `Lecture ${n} — ${updatedBlock.name}` : `المحاضرة ${n} — ${updatedBlock.name}`,
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
    updatedBlock.lectures = nextLectures;
  }

  if (intent.daysCount) {
    updatedBlock.examDate = new Date(Date.now() + intent.daysCount * 86400000).toISOString().slice(0, 10);
  }
  if (intent.dailyHours) {
    updatedBlock.dailyHours = intent.dailyHours;
  }
  if (intent.offDays?.length) {
    updatedBlock.offDays = intent.offDays;
  }

  // First build deterministic baseline schedule so we have exact dates and structure
  const baselineSchedule = buildDeterministicSchedule(updatedBlock, intent, isEn);

  // If user gave a rich custom voice/text command, let AI refine the daily focus titles and custom tasks
  if (voiceOrTextPrompt && voiceOrTextPrompt.trim().length > 8) {
    try {
      const aiConfig = await getAiConfig();
      const unsolvedList = (updatedBlock.lectures || [])
        .filter((l) => l.status !== "solved")
        .map((l) => `${l.number}. ${l.title} (${l.status === "review_needed" ? "تحتاج مراجعة" : "غير محلولة"})`)
        .join("\n");
      const solvedCount = (updatedBlock.lectures || []).filter((l) => l.status === "solved").length;

      const prompt = `أنت خبير تخطيط أكاديمي وطبي في منصة Black Fighters.
الطالب يطلب تنظيم جدول مذاكرة لبلوك "${updatedBlock.name}".
طلب الطالب الصوتي/النصي: "${voiceOrTextPrompt}"
عدد المحاضرات الكلي: ${updatedBlock.lectures?.length || 0} (تم إنجاز وحل: ${solvedCount} محاضرة).
المحاضرات المتبقية/غير المحلولة:
${unsolvedList || "جميع المحاضرات جاهزة للمراجعة"}
عدد أيام الجدول: ${baselineSchedule.length} يوم.

أرجع JSON فقط يحتوي على رسالة تشجيعية قصيرة بالعامية المصرية الراقية (aiCoachNote) ومصفوفة تحسينات للأيام (dayTips) بالشكل التالي:
{
  "aiCoachNote": "نصيحة سريعة ومحفزة للطالب بناءً على طلبه الصوتي",
  "dayEnhancements": [
    {
      "dayNumber": 1,
      "focusTitle": "عنوان تركيز اليوم",
      "extraTask": "مهمة إضافية مخصصة حسب طلب الطالب (أو نص فارغ)"
    }
  ]
}`;

      const raw = await generateText(prompt, { ...aiConfig, max_tokens: 1200, temperature: 0.25 });
      const start = raw.indexOf("{");
      const end = raw.lastIndexOf("}");
      if (start >= 0 && end > start) {
        const parsed = JSON.parse(raw.slice(start, end + 1));
        if (parsed.aiCoachNote) {
          updatedBlock.aiCoachNote = parsed.aiCoachNote;
        }
        if (Array.isArray(parsed.dayEnhancements)) {
          parsed.dayEnhancements.forEach((enh) => {
            const targetDay = baselineSchedule.find((d) => d.dayNumber === Number(enh.dayNumber));
            if (targetDay && !targetDay.isOffDay) {
              if (enh.focusTitle && enh.focusTitle.trim().length > 4) {
                targetDay.focusTitle = enh.focusTitle.trim();
              }
              if (enh.extraTask && enh.extraTask.trim().length > 4) {
                targetDay.tasks.push({
                  id: makeId("tsk"),
                  title: enh.extraTask.trim(),
                  type: "custom",
                  lectureId: null,
                  done: false,
                });
              }
            }
          });
        }
      }
    } catch (aiErr) {
      console.warn("[generateSmartBlockSchedule] AI refinement skipped, using deterministic schedule:", aiErr?.message);
    }
  }

  if (!updatedBlock.aiCoachNote) {
    const stats = computeBlockStats(updatedBlock);
    updatedBlock.aiCoachNote = isEn
      ? `Smart plan ready! Focus on the ${stats.remainingToSolve} remaining lectures at ${stats.requiredDailyPace} lectures/day.`
      : `جدولك الذكي جاهز يا بطل! ركزنا على الـ ${stats.remainingToSolve} محاضرة اللي لسه متحلوش بمعدل ${stats.requiredDailyPace} محاضرة في اليوم مع تدريبات الكويز والأوسكي.`;
  }

  updatedBlock.schedule = baselineSchedule;
  updatedBlock.lastVoicePrompt = voiceOrTextPrompt || updatedBlock.lastVoicePrompt || "";
  updatedBlock.updatedAt = new Date().toISOString();

  return updatedBlock;
}
