import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { base44 } from "@/api/base44Client";
import { Button } from "@/components/ui/button";
import {
  SearchX,
  ArrowRight,
  Sparkles,
  Flame,
  BookOpen,
  Layers,
  Plus,
  Search,
} from "lucide-react";
import CourseSection from "@/components/dashboard/CourseSection";
import PageLoader from "@/components/PageLoader";
import DailyOrderSheet from "@/components/atlas/DailyOrderSheet";
import {
  PageHeader,
  LVCard,
  StatCard,
  EmptyState,
  AnimatedNumber,
  reveal,
} from "@/components/ui/linevault";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { getOfflineSnapshot, setOfflineSnapshot } from "@/lib/offlineDb";
import { playClick } from "@/lib/sounds";

export default function Dashboard() {
  const { profile } = useAuth();
  const { t, locale, dir } = useLocale();
  const isEn = locale === "en";
  const queryClient = useQueryClient();

  const { data: courses, isLoading } = useQuery({
    queryKey: ["courses"],
    queryFn: async () => {
      try {
        const result = await base44.entities.Course.filter({}, "-created_date", 200);
        await setOfflineSnapshot("courses", result).catch(() => {});
        return result;
      } catch {
        const cached = await getOfflineSnapshot("courses").catch(() => null);
        if (cached) return cached;
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const { data: reviewCards } = useQuery({
    queryKey: ["dashboard-review-cards"],
    queryFn: async () => {
      try {
        return await base44.entities.ReviewCard.filter({}, "-created_date", 100);
      } catch {
        return [];
      }
    },
    staleTime: 1000 * 60 * 5,
  });

  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("all");

  const all = courses || [];
  const recentCourse = all[0] || null;

  const subjects = useMemo(
    () => [...new Set(all.map((c) => c.subject).filter(Boolean))],
    [all]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q);
      const matchSubject =
        subject === "الكل" || subject === "all" || c.subject === subject;
      return matchSearch && matchSubject;
    });
  }, [all, search, subject]);

  const totalLessons = all.reduce(
    (sum, c) => sum + (c.chapters?.length || c.total_lessons || 0),
    0
  );

  const realTerritories = useMemo(
    () =>
      all.map((c, idx) => ({
        id: c.id,
        code: `CRS-${String(idx + 1).padStart(2, "0")}`,
        titleAr: c.title || "مقرر دراسي",
        titleEn: c.subject || "Course",
        masteryPercent: Number(c.progress ?? c.mastery_percent ?? 0),
        totalPages: Number(c.total_pages || Math.max(10, (c.chapters?.length || 1) * 12)),
      })),
    [all]
  );

  const realReviewItems = useMemo(
    () =>
      (reviewCards || []).map((card) => ({
        id: card.id,
        conceptId: card.id,
        titleAr: card.front || card.question || "بطاقة مراجعة",
        dueAt: card.next_review_date || card.due_date || new Date().toISOString(),
        stability: Number(card.stability || 2),
        difficulty: Number(card.difficulty || 5),
        isHighRiskMedical: Boolean(card.is_high_risk),
      })),
    [reviewCards]
  );

  const activeDoc = useMemo(() => {
    if (!recentCourse) return null;
    return {
      id: recentCourse.id,
      titleAr: recentCourse.title,
      lastPageRead: Number(recentCourse.last_page_read || 1),
      totalPages: Number(
        recentCourse.total_pages || Math.max(12, (recentCourse.chapters?.length || 1) * 12)
      ),
    };
  }, [recentCourse]);

  const isPro = Boolean(
    profile?.is_pro ||
      profile?.subscription_status === "active" ||
      profile?.subscription_plan === "premium" ||
      profile?.subscription_plan === "starter" ||
      profile?.subscription_plan === "pro" ||
      profile?.subscription_plan === "supreme" ||
      profile?.role === "admin"
  );

  const userName =
    profile?.displayName || profile?.full_name || (isEn ? "Fighter" : "محارب");
  const streakDays = Number(profile?.streak_days || 1);
  const userCredits = Number(profile?.credits ?? 10);

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ["courses"] })}>
      <div className="space-y-6" dir={dir}>
        {/* ─── BLOCK 1: Today Greeting + Streak Badge + Primary Action (V4 Section 5.4) ─── */}
        <motion.div {...reveal(0)}>
          <PageHeader
            badge={
              isEn
                ? `${streakDays} Day Streak · FSRS v4.5 Active`
                : `🔥 ${streakDays} يوم التزام متتالي · محرك FSRS نشط`
            }
            title={isEn ? `Welcome back, ${userName}` : `أهلاً يا ${userName}`}
            description={
              recentCourse
                ? isEn
                  ? `Continue where you left off: ${recentCourse.title}`
                  : `كمّل من مكان ما وقفت: ${recentCourse.title}`
                : isEn
                ? "Upload a lecture PDF or textbook to generate structured summaries and quizzes."
                : "ارفع أول محاضرة PDF أو مرجع لتوليد ملخص منظم وكويزات تدريبية فوراً."
            }
            action={
              recentCourse ? (
                <Button asChild onClick={playClick}>
                  <Link to={`/course/${recentCourse.id}`}>
                    <span>{isEn ? "Continue Studying" : "كمّل من حيث وقفت"}</span>
                    <ArrowRight className="w-4 h-4 rtl:rotate-180" />
                  </Link>
                </Button>
              ) : (
                <Button asChild onClick={playClick}>
                  <Link to="/create">
                    <Plus className="w-4 h-4" />
                    <span>{isEn ? "Upload Lecture" : "ارفع محاضرة"}</span>
                  </Link>
                </Button>
              )
            }
            secondaryAction={
              recentCourse ? (
                <Button asChild variant="secondary" onClick={playClick}>
                  <Link to="/create">
                    <Plus className="w-4 h-4" />
                    <span>{isEn ? "New Summary" : "ملخص جديد"}</span>
                  </Link>
                </Button>
              ) : null
            }
          />
        </motion.div>

        {/* ─── BLOCK 2: Today's Priority Plan («خطة النهارده» — V4 Section 5.4) ─── */}
        <motion.div {...reveal(1)}>
          <DailyOrderSheet
            territories={realTerritories}
            reviewItems={realReviewItems}
            activeDoc={activeDoc}
            examDate={profile?.next_exam_date || null}
          />
        </motion.div>

        {/* ─── BLOCK 3: Quick Stats Row (AnimatedNumber tweening) ─── */}
        <motion.section
          {...reveal(2)}
          aria-label={isEn ? "Quick statistics" : "إحصائية سريعة"}
          className="grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <StatCard
            label={isEn ? "Study Streak" : "أيام الالتزام (Streak)"}
            value={streakDays}
            sublabel={isEn ? "Consecutive days" : "يوم مذاكرة متواصل"}
            icon={Flame}
          />
          <StatCard
            label={isEn ? "My Courses" : "إجمالي المقررات"}
            value={all.length}
            sublabel={isEn ? "Saved in library" : "محفوظة في مكتبتك"}
            icon={BookOpen}
          />
          <StatCard
            label={isEn ? "Study Units" : "الفصول والوحدات"}
            value={totalLessons}
            sublabel={isEn ? "Indexed chapters" : "فصل ووحدة دراسية"}
            icon={Layers}
          />
          <LVCard padding="p-5" className="flex flex-col justify-between gap-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#9aa6b4]">
                {isEn ? "Credit Balance" : "الرصيد والباقة"}
              </span>
              <div className="grid size-9 place-items-center rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
                <Sparkles className="w-4 h-4" />
              </div>
            </div>
            <div className="flex items-end justify-between gap-2">
              <div>
                <div className="text-2xl sm:text-3xl font-semibold font-mono tabular text-[#eef2f6]">
                  <AnimatedNumber value={userCredits} />
                </div>
                <p className="text-xs text-[#6b7785] mt-1">
                  {isPro
                    ? isEn
                      ? "Pro Membership Active"
                      : "باقة برو نشطة"
                    : isEn
                    ? "Free Plan"
                    : "الباقة المجانية"}
                </p>
              </div>
              <Link
                to="/subscriptions"
                onClick={playClick}
                className="px-3 py-1.5 rounded-xl bg-[#19f08c]/10 hover:bg-[#19f08c]/20 border border-[#19f08c]/30 text-xs font-medium text-[#19f08c] transition-colors"
              >
                {isEn ? "Top Up" : "شحن"}
              </Link>
            </div>
          </LVCard>
        </motion.section>

        {/* ─── BLOCK 4: Library & Courses Grid (LineVault course-grid.tsx) ─── */}
        <motion.section
          {...reveal(3)}
          id="courses-list-section"
          className="space-y-4 pt-2"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <h2 className="text-xl font-semibold text-[#eef2f6]">{t("myCourses")}</h2>
              {all.length > 0 && (
                <span className="px-2.5 py-0.5 rounded-full text-xs font-mono tabular bg-white/[0.04] text-[#9aa6b4] border border-[rgb(255_255_255/0.09)]">
                  {filtered.length}
                </span>
              )}
            </div>

            {all.length > 0 && (
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                <div className="relative min-w-[240px]">
                  <Search className="w-4 h-4 text-[#6b7785] absolute top-1/2 -translate-y-1/2 start-3.5 pointer-events-none" />
                  <input
                    type="search"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder={isEn ? "Filter courses..." : "صفِّ المقررات والمحاضرات..."}
                    className="w-full h-10 ps-10 pe-3 rounded-xl bg-white/[0.035] border border-[rgb(255_255_255/0.09)] text-sm text-[#eef2f6] placeholder:text-[#6b7785] focus:outline-none focus:border-[#19f08c]/60"
                  />
                </div>

                {subjects.length > 0 && (
                  <select
                    value={subject}
                    onChange={(e) => setSubject(e.target.value)}
                    className="h-10 px-3.5 rounded-xl bg-[#090c11] border border-[rgb(255_255_255/0.09)] text-sm text-[#eef2f6] focus:outline-none focus:border-[#19f08c]/60"
                  >
                    <option value="all">{isEn ? "All Subjects" : "كل المواد"}</option>
                    {subjects.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
          </div>

          {isLoading ? (
            <PageLoader message={t("loadingCourses")} />
          ) : all.length === 0 ? (
            <EmptyState
              icon={BookOpen}
              title={isEn ? "Your library is empty" : "مكتبتك فاضية… ارفع أول محاضرة وخلّينا نشتغل"}
              description={
                isEn
                  ? "Upload your first lecture PDF, presentation, or document to generate a structured summary and practice quiz."
                  : "ارفع أول محاضرة PDF أو مرجع لتوليد ملخص مشروح من الأساس وكويزات تدريبية فوراً."
              }
              action={
                <Button asChild onClick={playClick}>
                  <Link to="/create">
                    <Plus className="w-4 h-4" />
                    <span>{isEn ? "Upload First Lecture" : "ارفع أول محاضرة"}</span>
                  </Link>
                </Button>
              }
            />
          ) : filtered.length === 0 ? (
            <EmptyState
              icon={SearchX}
              title={t("noMatchingCourses")}
              description={t("noMatchingDesc")}
              action={
                <Button
                  variant="secondary"
                  onClick={() => {
                    setSearch("");
                    setSubject("all");
                  }}
                >
                  {t("resetFilters")}
                </Button>
              }
            />
          ) : (
            <CourseSection title={null} courses={filtered} />
          )}
        </motion.section>
      </div>
    </PullToRefresh>
  );
}
