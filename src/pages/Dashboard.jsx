import React, { useState, useMemo } from "react";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import {
  Plus,
  BookOpen,
  Flame,
  Sparkles,
  Search,
  FolderPlus,
  Folder,
  X,
  ArrowLeft,
  ArrowRight,
  Layers,
  Coins,
  CheckCircle2,
  Play,
} from "lucide-react";
import CourseCard from "@/components/CourseCard";
import CourseSection from "@/components/dashboard/CourseSection";
import DailyOrderSheet from "@/components/atlas/DailyOrderSheet";
import {
  PageHeader,
  StatCard,
  GlassCard,
  EmptyState,
  LVBadge,
} from "@/components/ui/linevault";
import { groupCoursesBySubject } from "@/components/dashboard/subjectClassifier";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { user, profile, isAdmin, refreshProfile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const queryClient = useQueryClient();
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFolder, setSelectedFolder] = useState("all");
  const [selectedSubject, setSelectedSubject] = useState("all");
  const [viewMode, setViewMode] = useState("grid");
  const [newFolderName, setNewFolderName] = useState("");
  const [showFolderInput, setShowFolderInput] = useState(false);

  const { data: courses = [], isLoading: loadingCourses } = useQuery({
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

  const { data: reviewCards = [] } = useQuery({
    queryKey: ["reviewCards", user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      const list = await base44.entities.ReviewCard.filter(
        { user_id: user.id },
        "-due_date",
        200
      );
      return Array.isArray(list) ? list : [];
    },
    enabled: !!user?.id,
    staleTime: 60_000,
  });

  const dueCardsCount = useMemo(() => {
    const now = Date.now();
    return reviewCards.filter((c) => {
      if (!c.due_date) return true;
      return new Date(c.due_date).getTime() <= now;
    }).length;
  }, [reviewCards]);

  const masteryPct = useMemo(() => {
    if (courses.length === 0) return 0;
    const totalParts = courses.length * 3;
    const doneParts = courses.reduce((acc, c) => {
      return (
        acc +
        (c.summary || c.summary_v3 ? 1 : 0) +
        (c.quiz?.length > 0 ? 1 : 0) +
        (c.flashcards?.length > 0 ? 1 : 0)
      );
    }, 0);
    return Math.round((doneParts / totalParts) * 100);
  }, [courses]);

  const folders = useMemo(() => {
    const set = new Set();
    courses.forEach((c) => {
      if (c.folder && typeof c.folder === "string" && c.folder.trim()) {
        set.add(c.folder.trim());
      }
    });
    try {
      const saved = JSON.parse(localStorage.getItem("bf_folders") || "[]");
      saved.forEach((f) => set.add(f));
    } catch {}
    return Array.from(set);
  }, [courses]);

  const filteredCourses = useMemo(() => {
    return courses.filter((c) => {
      if (selectedFolder !== "all") {
        if (selectedFolder === "unfiled" && c.folder) return false;
        if (selectedFolder !== "unfiled" && c.folder !== selectedFolder)
          return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const titleMatch = (c.title || "").toLowerCase().includes(q);
        const folderMatch = (c.folder || "").toLowerCase().includes(q);
        if (!titleMatch && !folderMatch) return false;
      }
      return true;
    });
  }, [courses, selectedFolder, searchQuery]);

  const subjectGroups = useMemo(
    () => groupCoursesBySubject(filteredCourses),
    [filteredCourses]
  );

  const displayedCourses = useMemo(() => {
    if (selectedSubject === "all") return filteredCourses;
    const group = subjectGroups.find((g) => g.key === selectedSubject);
    return group ? group.courses : [];
  }, [filteredCourses, selectedSubject, subjectGroups]);

  const latestCourse = courses[0] || null;

  const handleCreateFolder = (e) => {
    e.preventDefault();
    const trimmed = newFolderName.trim();
    if (!trimmed) return;
    try {
      const saved = JSON.parse(localStorage.getItem("bf_folders") || "[]");
      if (!saved.includes(trimmed)) {
        localStorage.setItem("bf_folders", JSON.stringify([...saved, trimmed]));
      }
    } catch {}
    setSelectedFolder(trimmed);
    setNewFolderName("");
    setShowFolderInput(false);
    toast.success(isEn ? "Folder created" : "تم إنشاء المجلد بنجاح");
  };

  const handleDeleteCourse = async (courseId) => {
    try {
      await base44.entities.Course.delete(courseId);
      queryClient.invalidateQueries({ queryKey: ["courses", user?.id] });
      toast.success(isEn ? "Course deleted" : "تم حذف المقرر");
    } catch {
      toast.error(isEn ? "Failed to delete course" : "تعذر حذف المقرر");
    }
  };

  const handleMoveToFolder = async (courseId, folderName) => {
    try {
      await base44.entities.Course.update(courseId, { folder: folderName });
      queryClient.invalidateQueries({ queryKey: ["courses", user?.id] });
      toast.success(isEn ? "Moved to folder" : "تم نقل المقرر للمجلد");
    } catch {
      toast.error(isEn ? "Failed to move course" : "تعذر نقل المقرر");
    }
  };

  const handleChangeSubject = async (courseId, subjectKey) => {
    try {
      await base44.entities.Course.update(courseId, {
        subject_override: subjectKey,
      });
      queryClient.invalidateQueries({ queryKey: ["courses", user?.id] });
      toast.success(isEn ? "Subject updated" : "تم تحديث التخصص");
    } catch {
      toast.error(isEn ? "Failed to update subject" : "تعذر تحديث التخصص");
    }
  };

  const handlePurchaseCourse = async (course) => {
    try {
      await base44.functions.invoke("economy-actions", {
        action: "purchaseCourse",
        courseId: course.id,
      });
      await refreshProfile?.();
      queryClient.invalidateQueries({ queryKey: ["courses", user?.id] });
      toast.success(isEn ? "Course unlocked!" : "تم فتح المقرر بنجاح!");
    } catch (err) {
      toast.error(
        err?.message || (isEn ? "Could not unlock course" : "تعذر فتح المقرر")
      );
    }
  };

  const firstName =
    (profile?.displayName || profile?.full_name || user?.email || "")
      .split(" ")[0]
      .split("@")[0] || (isEn ? "Doctor" : "يا دكتور");

  return (
    <div className="space-y-8" dir={dir}>
      {/* BLOCK 1: Welcome Header + 4 AnimatedNumber StatCards */}
      <div className="space-y-5">
        <PageHeader
          eyebrow={
            isEn
              ? "LINEVAULT ACADEMIC COMMAND CENTER"
              : "مركز القيادة الأكاديمي · LINEVAULT V5"
          }
          title={
            isEn
              ? `Welcome back, ${firstName}`
              : `أهلاً بك، ${firstName}`
          }
          subtitle={
            isEn
              ? "Track your daily study order, review due FSRS cards, and manage your verified lecture library."
              : "تابع خطة مذاكرتك اليومية، راجع بطاقات الذاكرة المتباعدة، وافتح ملخصاتك المدققة."
          }
          actions={
            <Link
              to="/create"
              className="btn-primary-glow inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>
                {isEn ? "Upload New Lecture" : "رفع محاضرة جديدة"}
              </span>
            </Link>
          }
        />

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          <StatCard
            label={isEn ? "Total Lectures" : "إجمالي المذكرات"}
            numericValue={courses.length}
            sub={isEn ? "In your personal vault" : "في مكتبتك الخاصة"}
            icon={BookOpen}
            accent="emerald"
          />
          <StatCard
            label={isEn ? "Due Today (FSRS)" : "بطاقات مستحقة اليوم"}
            numericValue={dueCardsCount}
            sub={
              dueCardsCount > 0
                ? isEn
                  ? "Ready for active recall"
                  : "جاهزة للتسميع الآن"
                : isEn
                ? "All caught up!"
                : "أنجزت مراجعات اليوم"
            }
            icon={Layers}
            accent="amber"
          />
          <StatCard
            label={isEn ? "Mastery Rate" : "نسبة الإتقان"}
            value={`${masteryPct}%`}
            sub={`${profile?.streak_days || 1} ${
              isEn ? "day study streak" : "يوم استمرارية"
            }`}
            icon={Flame}
            accent="emerald"
          />
          <StatCard
            label={isEn ? "Vault Credits" : "رصيد الكريدت"}
            numericValue={Number(profile?.credits ?? 10)}
            sub={`${Number(profile?.xp || 0).toLocaleString()} XP`}
            icon={Coins}
            accent="sky"
          />
        </div>
      </div>

      {/* BLOCK 2: Resume Where You Left Off Spotlight */}
      {latestCourse && (
        <GlassCard
          variant="highlight"
          className="p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-start gap-3.5 min-w-0">
            <div className="grid size-11 shrink-0 place-items-center rounded-xl bg-[#19f08c]/15 border border-[#19f08c]/40 text-[#19f08c]">
              <Play className="w-5 h-5 fill-current" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="font-mono text-[11px] uppercase tracking-wider text-[#19f08c] font-semibold">
                  {isEn ? "CONTINUE WHERE YOU LEFT OFF" : "كمّل من حيث وقفت"}
                </span>
                <LVBadge variant="emerald">
                  {latestCourse.summary || latestCourse.summary_v3
                    ? isEn
                      ? "Atlas Ready"
                      : "الملخص جاهز"
                    : isEn
                    ? "In Progress"
                    : "قيد المذاكرة"}
                </LVBadge>
              </div>
              <h3 className="font-display text-base sm:text-lg font-bold text-[#f5f7fa] truncate mt-1">
                {latestCourse.title}
              </h3>
              <p className="text-xs text-[#9aa4b2] mt-0.5">
                {isEn
                  ? `${latestCourse.quiz?.length || 0} quiz questions · ${
                      latestCourse.flashcards?.length || 0
                    } flashcards`
                  : `${latestCourse.quiz?.length || 0} سؤال كويز · ${
                      latestCourse.flashcards?.length || 0
                    } بطاقة مراجعة`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <Link
              to={`/course/${latestCourse.id}`}
              className="btn-primary-glow inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap"
            >
              <span>{isEn ? "Resume Studying" : "استئناف المذاكرة"}</span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </GlassCard>
      )}

      {/* BLOCK 3: DailyOrderSheet (01..0N Numbered Study Queue) */}
      <DailyOrderSheet
        courses={courses}
        dueCardsCount={dueCardsCount}
      />

      {/* BLOCK 4: Course Library Grid & Instant Filters */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-[#f5f7fa]">
              {isEn ? "My Lecture & Atlas Library" : "مكتبة المقررات والملخصات"}
            </h2>
            <p className="text-xs text-[#9aa4b2]">
              {isEn
                ? `${filteredCourses.length} lectures in your library`
                : `${filteredCourses.length} محاضرة ومقرر في مكتبتك`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-64">
              <Search className="w-4 h-4 text-[#9aa4b2] absolute start-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={
                  isEn ? "Search lectures..." : "ابحث في محاضراتك..."
                }
                className="w-full h-9 rounded-xl bg-[#090c11] border border-white/10 ps-9 pe-8 text-xs text-[#f5f7fa] placeholder:text-[#646e7d] focus:outline-none focus:border-[#19f08c]/60"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute end-2.5 top-1/2 -translate-y-1/2 text-[#9aa4b2] hover:text-[#f5f7fa]"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="inline-flex rounded-xl border border-white/10 bg-[#090c11] p-0.5 text-xs">
              <button
                type="button"
                onClick={() => setViewMode("grid")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                  viewMode === "grid"
                    ? "bg-[#19f08c] text-[#03150c] font-bold"
                    : "text-[#9aa4b2] hover:text-[#f5f7fa]"
                )}
              >
                {isEn ? "All" : "شبكة"}
              </button>
              <button
                type="button"
                onClick={() => setViewMode("subjects")}
                className={cn(
                  "px-2.5 py-1 rounded-lg font-medium transition-colors cursor-pointer",
                  viewMode === "subjects"
                    ? "bg-[#19f08c] text-[#03150c] font-bold"
                    : "text-[#9aa4b2] hover:text-[#f5f7fa]"
                )}
              >
                {isEn ? "By Subject" : "حسب المادة"}
              </button>
            </div>
          </div>
        </div>

        {/* Folder & Subject Filter Bar */}
        <div className="flex items-center gap-2 overflow-x-auto scrollbar-none pb-1">
          <button
            type="button"
            onClick={() => {
              setSelectedFolder("all");
              setSelectedSubject("all");
            }}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border cursor-pointer",
              selectedFolder === "all" && selectedSubject === "all"
                ? "bg-[#19f08c] text-[#03150c] border-[#19f08c] font-bold"
                : "bg-[#090c11] text-[#9aa4b2] border-white/10 hover:text-[#f5f7fa]"
            )}
          >
            {isEn ? "All Lectures" : "كل المقررات"} ({courses.length})
          </button>

          {subjectGroups.map((group) => (
            <button
              key={group.key}
              type="button"
              onClick={() => {
                setSelectedSubject(
                  selectedSubject === group.key ? "all" : group.key
                );
              }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border inline-flex items-center gap-1.5 cursor-pointer",
                selectedSubject === group.key
                  ? "bg-[#19f08c]/15 text-[#19f08c] border-[#19f08c]/40 font-semibold"
                  : "bg-[#090c11] text-[#9aa4b2] border-white/10 hover:text-[#f5f7fa]"
              )}
            >
              <span>{isEn ? group.meta.labelEn || group.meta.label : group.meta.label}</span>
              <span className="text-[10px] font-mono opacity-75">
                {group.courses.length}
              </span>
            </button>
          ))}

          {folders.map((folder) => (
            <button
              key={folder}
              type="button"
              onClick={() =>
                setSelectedFolder(selectedFolder === folder ? "all" : folder)
              }
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition-colors border inline-flex items-center gap-1.5 cursor-pointer",
                selectedFolder === folder
                  ? "bg-[#19f08c]/15 text-[#19f08c] border-[#19f08c]/40 font-semibold"
                  : "bg-[#090c11] text-[#9aa4b2] border-white/10 hover:text-[#f5f7fa]"
              )}
            >
              <Folder className="w-3 h-3 text-[#19f08c]" />
              <span>{folder}</span>
            </button>
          ))}

          {showFolderInput ? (
            <form
              onSubmit={handleCreateFolder}
              className="inline-flex items-center gap-1.5 shrink-0"
            >
              <input
                type="text"
                value={newFolderName}
                onChange={(e) => setNewFolderName(e.target.value)}
                placeholder={isEn ? "Folder name..." : "اسم المجلد..."}
                className="h-8 w-32 rounded-lg bg-[#090c11] border border-white/15 px-2.5 text-xs text-[#f5f7fa] focus:outline-none focus:border-[#19f08c]"
                autoFocus
              />
              <button
                type="submit"
                className="h-8 px-2.5 rounded-lg bg-[#19f08c] text-[#03150c] text-xs font-bold"
              >
                {isEn ? "Add" : "حفظ"}
              </button>
              <button
                type="button"
                onClick={() => setShowFolderInput(false)}
                className="h-8 px-2 rounded-lg bg-[#0e131b] text-[#9aa4b2] text-xs"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => setShowFolderInput(true)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap bg-[#090c11] hover:bg-white/[0.04] text-[#9aa4b2] hover:text-[#f5f7fa] border border-dashed border-white/15 inline-flex items-center gap-1 cursor-pointer"
            >
              <FolderPlus className="w-3.5 h-3.5 text-[#19f08c]" />
              <span>{isEn ? "New Folder" : "مجلد جديد"}</span>
            </button>
          )}
        </div>

        {/* Course Cards Grid */}
        {loadingCourses ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-44 rounded-[1.25rem] glass animate-pulse"
              />
            ))}
          </div>
        ) : displayedCourses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title={
              searchQuery
                ? isEn
                  ? "No matching lectures found"
                  : "لا توجد مقررات مطابقة لبحثك"
                : isEn
                ? "Your study vault is empty"
                : "لا توجد محاضرات في مكتبتك حتى الآن"
            }
            description={
              isEn
                ? "Upload a PDF, Word file, or lecture slides to generate smart color-coded summaries, comparison tables, and practice quizzes."
                : "ارفع ملف محاضرتك (PDF أو صور أو ملف نصي) لتحويله فوراً إلى أطلس ملخص مدقق، جداول مقارنة، وكويزات تفاعلية."
            }
            action={
              <Link
                to="/create"
                className="btn-primary-glow inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold"
              >
                <Plus className="w-4 h-4" />
                <span>
                  {isEn ? "Upload First Lecture" : "ارفع أول محاضرة الآن"}
                </span>
              </Link>
            }
          />
        ) : viewMode === "subjects" && selectedSubject === "all" ? (
          <div className="space-y-6">
            {subjectGroups.map((group) => (
              <CourseSection
                key={group.key}
                subject={group.meta}
                courses={group.courses}
                onDelete={handleDeleteCourse}
                folders={folders}
                onMoveToFolder={handleMoveToFolder}
                onChangeSubject={handleChangeSubject}
                onPurchase={handlePurchaseCourse}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {displayedCourses.map((course, idx) => (
              <CourseCard
                key={course.id}
                course={course}
                index={idx}
                onDelete={handleDeleteCourse}
                folders={folders}
                onMoveToFolder={handleMoveToFolder}
                onChangeSubject={handleChangeSubject}
                onPurchase={handlePurchaseCourse}
                isAdmin={isAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
