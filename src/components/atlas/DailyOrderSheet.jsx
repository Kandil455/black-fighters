import React, { useState } from "react";
import { Link } from "react-router-dom";
import {
  CheckCircle2,
  Circle,
  Clock,
  FileText,
  Brain,
  Layers,
  Plus,
  Sparkles,
  Target,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { GlassCard, LVBadge, AnimatedNumber } from "@/components/ui/linevault";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

const KIND_META = {
  summary: {
    icon: FileText,
    labelAr: "قراءة الأطلس",
    labelEn: "Atlas Summary",
  },
  quiz: {
    icon: Brain,
    labelAr: "كويز تطبيقي",
    labelEn: "Practice Quiz",
  },
  flashcards: {
    icon: Layers,
    labelAr: "استدعاء نشط FSRS",
    labelEn: "FSRS Recall",
  },
  custom: {
    icon: Sparkles,
    labelAr: "هدف مذاكرة",
    labelEn: "Study Goal",
  },
};

export default function DailyOrderSheet({
  courses = [],
  dueCardsCount = 0,
  initialItems = [],
  onCompleteItem,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [completedIds, setCompletedIds] = useState(() => {
    try {
      const saved = localStorage.getItem("bf_daily_plan_done_v5");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [customTasks, setCustomTasks] = useState(() => {
    try {
      const saved = localStorage.getItem("bf_daily_custom_tasks_v5");
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [newTaskText, setNewTaskText] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const generatedItems = React.useMemo(() => {
    if (initialItems && initialItems.length > 0) return initialItems;

    const list = [];

    if (dueCardsCount > 0) {
      list.push({
        id: "fsrs-due-today",
        courseId: null,
        href: "/review",
        title: isEn
          ? `Review ${dueCardsCount} due FSRS memory cards`
          : `مراجعة ${dueCardsCount} بطاقة مستحقة في الذاكرة المتباعدة (FSRS)`,
        kind: "flashcards",
        estimatedMinutes: Math.max(5, Math.min(25, Math.ceil(dueCardsCount * 0.8))),
        priority: "HIGH-YIELD",
      });
    }

    const activeCourses = courses.slice(0, 3);
    activeCourses.forEach((course, idx) => {
      const hasSummary = Boolean(course.summary || course.summary_v3);
      const hasQuiz = Array.isArray(course.quiz) && course.quiz.length > 0;

      if (idx === 0) {
        list.push({
          id: `study-summary-${course.id}`,
          courseId: course.id,
          href: `/course/${course.id}`,
          title: isEn
            ? `Read verified Atlas summary: ${course.title}`
            : `قراءة لوحات الملخص المدقق: ${course.title}`,
          kind: "summary",
          estimatedMinutes: 15,
          priority: hasSummary ? "READY" : "GENERATE",
        });
      } else if (idx === 1) {
        list.push({
          id: `study-quiz-${course.id}`,
          courseId: course.id,
          href: `/course/${course.id}?tab=quiz`,
          title: isEn
            ? `Solve 10 exam questions on: ${course.title}`
            : `حل كويز تدريبي وتثبيت النقاط الامتحانية: ${course.title}`,
          kind: "quiz",
          estimatedMinutes: 12,
          priority: hasQuiz ? "QUIZ" : "PRACTICE",
        });
      } else {
        list.push({
          id: `study-cards-${course.id}`,
          courseId: course.id,
          href: `/course/${course.id}?tab=flashcards`,
          title: isEn
            ? `Active recall session: ${course.title}`
            : `جلسة تسميع ذاتي للبطاقات الذكية: ${course.title}`,
          kind: "flashcards",
          estimatedMinutes: 10,
          priority: "RECALL",
        });
      }
    });

    return [...customTasks, ...list];
  }, [courses, dueCardsCount, initialItems, customTasks, isEn]);

  const toggleItem = (id) => {
    setCompletedIds((prev) => {
      const exists = prev.includes(id);
      const next = exists ? prev.filter((x) => x !== id) : [...prev, id];
      try {
        localStorage.setItem("bf_daily_plan_done_v5", JSON.stringify(next));
      } catch {}
      if (!exists && onCompleteItem) onCompleteItem(id);
      return next;
    });
  };

  const handleAddCustomTask = (e) => {
    e.preventDefault();
    const trimmed = newTaskText.trim();
    if (!trimmed) return;
    const item = {
      id: `custom-${Date.now()}`,
      courseId: null,
      href: null,
      title: trimmed,
      kind: "custom",
      estimatedMinutes: 15,
      priority: "GOAL",
    };
    const next = [item, ...customTasks];
    setCustomTasks(next);
    try {
      localStorage.setItem("bf_daily_custom_tasks_v5", JSON.stringify(next));
    } catch {}
    setNewTaskText("");
    setAddingTask(false);
  };

  const completedCount = generatedItems.filter((i) =>
    completedIds.includes(i.id)
  ).length;
  const totalCount = generatedItems.length;
  const progressPct =
    totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <GlassCard className="p-5 sm:p-6 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-[#19f08c]/12 border border-[#19f08c]/35 flex items-center justify-center text-[#19f08c] shrink-0">
            <Target className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h2 className="text-base sm:text-lg font-bold text-[#f5f7fa]">
                {isEn ? "Daily Study Order Sheet" : "أمر العمليات وخطة مذاكرة اليوم"}
              </h2>
              <LVBadge variant="emerald">
                <AnimatedNumber value={progressPct} suffix="%" />{" "}
                {isEn ? "DONE" : "مكتمل"}
              </LVBadge>
            </div>
            <p className="text-xs text-[#9aa4b2] mt-0.5">
              {isEn
                ? "Prioritized study queue generated from your active courses & FSRS memory schedule"
                : "مهام مرتبة تلقائياً من مقرراتك الحالية وجدول الذاكرة المتباعدة FSRS v4.5"}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto shrink-0">
          <Link
            to="/planner"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#19f08c]/12 hover:bg-[#19f08c]/20 text-[#19f08c] border border-[#19f08c]/35 text-xs font-bold transition-colors cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isEn ? "AI Voice Planner & PDF" : "جدول البلوك بالصوت و PDF"}</span>
          </Link>
          <button
            type="button"
            onClick={() => setAddingTask((v) => !v)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e131b] hover:bg-white/[0.05] text-[#f5f7fa] border border-white/10 hover:border-[#19f08c]/40 text-xs font-semibold transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-[#19f08c]" />
            <span>{isEn ? "Add Task" : "إضافة مهمة"}</span>
          </button>
        </div>
      </div>

      {addingTask && (
        <form onSubmit={handleAddCustomTask} className="flex items-center gap-2">
          <input
            type="text"
            value={newTaskText}
            onChange={(e) => setNewTaskText(e.target.value)}
            placeholder={
              isEn
                ? "e.g. Finish Chapter 3 Cardiology notes..."
                : "مثال: مراجعة الفصل الثالث فسيولوجيا وحل ٢٠ سؤال..."
            }
            className="flex-1 h-10 rounded-xl bg-[#0e131b] border border-white/10 px-3.5 text-xs sm:text-sm text-[#f5f7fa] placeholder:text-[#646e7d] focus:outline-none focus:border-[#19f08c]/60"
            autoFocus
          />
          <button
            type="submit"
            className="btn-primary-glow h-10 px-4 rounded-xl text-xs font-bold shrink-0 cursor-pointer"
          >
            {isEn ? "Save" : "إضافة"}
          </button>
        </form>
      )}

      {generatedItems.length === 0 ? (
        <div className="rounded-xl bg-[#05070a]/70 border border-white/[0.07] p-6 text-center space-y-3">
          <p className="text-sm font-semibold text-[#f5f7fa]">
            {isEn
              ? "Your study queue is ready for your first lecture"
              : "خطة المذاكرة جاهزة لاستقبال أول محاضرة لك"}
          </p>
          <p className="text-xs text-[#9aa4b2] max-w-md mx-auto">
            {isEn
              ? "Upload a lecture PDF or add a custom study goal to generate your daily action plan."
              : "ارفع ملف محاضرتك الآن ليقوم النظام بتوليد ملخص الأطلس والكويز وجدول المراجعة اليومي تلقائياً."}
          </p>
          <div className="pt-1">
            <Link
              to="/create"
              className="btn-primary-glow inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-bold"
            >
              <Plus className="w-4 h-4" />
              <span>{isEn ? "Upload First Lecture" : "ارفع أول محاضرة الآن"}</span>
            </Link>
          </div>
        </div>
      ) : (
        <div className="divide-y divide-white/[0.07] rounded-xl border border-white/[0.08] bg-[#05070a]/60 overflow-hidden">
          {generatedItems.map((item, idx) => {
            const isDone = completedIds.includes(item.id);
            const meta = KIND_META[item.kind] || KIND_META.summary;
            const KindIcon = meta.icon;
            const indexLabel = String(idx + 1).padStart(2, "0");

            return (
              <div
                key={item.id || idx}
                className={cn(
                  "flex items-center justify-between gap-3 px-3.5 py-3 transition-colors",
                  isDone
                    ? "bg-white/[0.01] opacity-60"
                    : "hover:bg-white/[0.03]"
                )}
              >
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <button
                    type="button"
                    onClick={() => toggleItem(item.id)}
                    aria-label={isDone ? "إلغاء الإكمال" : "تحديد كمكتمل"}
                    className="text-[#9aa4b2] hover:text-[#19f08c] transition-colors shrink-0 cursor-pointer"
                  >
                    {isDone ? (
                      <CheckCircle2 className="w-5 h-5 text-[#19f08c]" />
                    ) : (
                      <Circle className="w-5 h-5" />
                    )}
                  </button>

                  <span
                    className="font-mono text-xs font-bold text-[#19f08c] tabular shrink-0"
                    dir="ltr"
                  >
                    {indexLabel}
                  </span>

                  <div className="min-w-0 flex-1">
                    <p
                      className={cn(
                        "text-xs sm:text-sm font-semibold text-[#f5f7fa] truncate",
                        isDone && "line-through text-[#646e7d]"
                      )}
                    >
                      {item.title}
                    </p>
                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-[#9aa4b2]">
                      <span className="inline-flex items-center gap-1 text-[#19f08c]">
                        <KindIcon className="w-3 h-3" />
                        <span>{isEn ? meta.labelEn : meta.labelAr}</span>
                      </span>
                      <span aria-hidden="true">·</span>
                      <span className="inline-flex items-center gap-1 font-mono tabular">
                        <Clock className="w-3 h-3" />
                        <span>
                          {item.estimatedMinutes || 15} {isEn ? "m" : "د"}
                        </span>
                      </span>
                    </div>
                  </div>
                </div>

                {item.href && (
                  <Link
                    to={item.href}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#19f08c]/12 hover:bg-[#19f08c] text-[#19f08c] hover:text-[#03150c] border border-[#19f08c]/35 text-xs font-bold transition-colors whitespace-nowrap"
                  >
                    <span>{isEn ? "Start" : "ابدأ"}</span>
                    <ArrowIcon className="w-3.5 h-3.5" />
                  </Link>
                )}
              </div>
            );
          })}
        </div>
      )}
    </GlassCard>
  );
}
