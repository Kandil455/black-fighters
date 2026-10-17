import React, { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import PullToRefresh from "@/components/PullToRefresh";
import { base44 } from "@/api/base44Client";
import PageLoader from "@/components/PageLoader";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { getOfflineSnapshot, setOfflineSnapshot } from "@/lib/offlineDb";
import { playClick } from "@/lib/sounds";
import { toast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

export default function Dashboard() {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
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

  const [search, setSearch] = useState("");
  const [activeFilter, setActiveFilter] = useState("all");
  const [claimedReward, setClaimedReward] = useState(false);
  const [completedTaskIds, setCompletedTaskIds] = useState(() => new Set([1]));

  const all = courses || [];
  const recentCourse = all[0] || null;
  const recentProgress = Number(recentCourse?.progress ?? recentCourse?.mastery_percent ?? 64);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return all.filter((c) => {
      const matchSearch =
        !q ||
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.subject?.toLowerCase().includes(q);

      const prog = Number(c.progress ?? c.mastery_percent ?? 0);
      let matchFilter = true;
      if (activeFilter === "done") matchFilter = prog >= 100;
      else if (activeFilter === "prog") matchFilter = prog > 0 && prog < 100;
      else if (activeFilter === "new") matchFilter = prog === 0;

      return matchSearch && matchFilter;
    });
  }, [all, search, activeFilter]);

  const userName =
    profile?.displayName || profile?.full_name || (isEn ? "Fighter" : "أحمد");
  const streakDays = Number(profile?.streak_days || 6);

  const dayNamesAr = ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"];
  const dayNamesEn = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  const todayDayName = isEn ? dayNamesEn[new Date().getDay()] : dayNamesAr[new Date().getDay()];

  const defaultTasks = [
    {
      id: 1,
      label: isEn ? "Review 8 cards in FSRS" : "مراجعة 8 بطاقات في FSRS",
      due: isEn ? "Before 9 PM" : "قبل 9م",
    },
    {
      id: 2,
      label: recentCourse ? (isEn ? `Unit Quiz: ${recentCourse.title}` : `كويز: ${recentCourse.title}`) : (isEn ? "Daily practice quiz" : "كويز الوحدة 3"),
      due: isEn ? "Today" : "اليوم",
    },
    {
      id: 3,
      label: isEn ? "Lecture summary review" : "ملخص محاضرة الأربعاء",
      due: isEn ? "Tomorrow" : "بكرة",
    },
  ];

  const handleClaimReward = async () => {
    if (claimedReward) return;
    playClick();
    setClaimedReward(true);
    try {
      if (profile?.id) {
        await base44.entities.User.update(profile.id, {
          credits: Number(profile?.credits ?? 10) + 2,
        });
      }
    } catch {}
    toast({
      title: isEn ? "Daily reward claimed! +2 Credits" : "أضفنا 2 كريدت لرصيدك!",
      variant: "default",
    });
  };

  const toggleTask = (taskId) => {
    playClick();
    setCompletedTaskIds((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  };

  const filterTabs = [
    { id: "all", label: isEn ? "All" : "الكل" },
    { id: "prog", label: isEn ? "In Progress" : "جارية" },
    { id: "done", label: isEn ? "Completed" : "خلصت" },
    { id: "new", label: isEn ? "New" : "جديدة" },
  ];

  return (
    <PullToRefresh onRefresh={() => queryClient.invalidateQueries({ queryKey: ["courses"] })}>
      <div className="space-y-8" dir={dir}>
        {/* ─── EDITORIAL HEADER (Matches s-home) ─── */}
        <div className="bf-hd">
          <span className="mono">
            {isEn ? `Today · ${todayDayName}` : `اليوم · ${todayDayName}`}
          </span>
          <h1 className="serif">
            {isEn ? `Good morning, ${userName}. ` : `صباح الخير، ${userName}. `}
            <em style={{ color: "var(--sig)" }}>
              {isEn ? `${defaultTasks.length} tasks today.` : `${defaultTasks.length} مهام النهارده.`}
            </em>
          </h1>
        </div>

        {/* ─── TWO-COLUMN PRIORITY GRID ─── */}
        <div className="two">
          <div style={{ display: "grid", gap: 18 }}>
            {/* CONTINUE WHERE YOU LEFT OFF CARD */}
            <div className="card">
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span className="mono">
                  {isEn ? "Continue where you left off" : "كمّل من حيث وقفت"}
                </span>
                <span className="mono">{recentProgress}%</span>
              </div>
              <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
                {recentCourse ? recentCourse.title : (isEn ? "No active course yet" : "مقدمة في الاقتصاد الجزئي · الوحدة 3")}
              </h2>
              <div className="bar">
                <i style={{ width: `${recentProgress}%` }}></i>
              </div>
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {recentCourse ? (
                  <>
                    <Link
                      to={`/course/${recentCourse.id}`}
                      onClick={playClick}
                      className="btn sm"
                    >
                      {isEn ? "Continue Lesson" : "كمّل الدرس"}
                    </Link>
                    <Link
                      to="/review"
                      onClick={playClick}
                      className="btn sm line"
                    >
                      {isEn ? "Review Cards" : "راجع البطاقات"}
                    </Link>
                  </>
                ) : (
                  <Link
                    to="/create"
                    onClick={playClick}
                    className="btn sm"
                  >
                    {isEn ? "Upload Lecture" : "ارفع محاضرة"}
                  </Link>
                )}
              </div>
            </div>

            {/* DAILY REWARD CARD */}
            <div className="card" style={{ gridTemplateColumns: "1fr auto", alignItems: "center" }}>
              <div>
                <b>{isEn ? "Today's Reward" : "مكافأة النهارده"}</b>
                <div className="mono" style={{ marginTop: 4 }}>
                  +2 {isEn ? "Credits · Once per day" : "كريدت · مرة في اليوم"}
                </div>
              </div>
              <button
                type="button"
                className="btn sm"
                disabled={claimedReward}
                onClick={handleClaimReward}
              >
                {claimedReward ? (isEn ? "Claimed" : "اتاخدت") : (isEn ? "Claim" : "خدها")}
              </button>
            </div>

            {/* DAILY TASKS CHECKLIST CARD */}
            <div className="card" style={{ gap: 0 }}>
              {defaultTasks.map((task, idx) => {
                const isDone = completedTaskIds.has(task.id);
                return (
                  <div
                    key={task.id}
                    onClick={() => toggleTask(task.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "12px 0",
                      borderTop: idx === 0 ? "0" : "1px solid var(--line)",
                      cursor: "pointer",
                      width: "100%",
                      textAlign: "start",
                    }}
                  >
                    <span
                      style={{
                        width: 24,
                        height: 24,
                        border: "1.5px solid var(--line)",
                        display: "grid",
                        placeItems: "center",
                        flex: "none",
                        background: isDone ? "var(--sig)" : "transparent",
                        borderColor: isDone ? "var(--sig)" : "var(--line)",
                        color: isDone ? "var(--sigink)" : "transparent",
                        fontSize: "0.8rem",
                        transition: "all 0.3s",
                      }}
                    >
                      ✓
                    </span>
                    <span
                      style={{
                        flex: 1,
                        textDecoration: isDone ? "line-through" : "none",
                        color: isDone ? "var(--mute)" : "inherit",
                      }}
                    >
                      {task.label}
                    </span>
                    <span className="mono">{task.due}</span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* RIGHT COLUMN: STREAK & STATS */}
          <div className="card">
            <h2 style={{ fontSize: "1.05rem", fontWeight: 700 }}>
              {isEn ? "Streak & Stats" : "ستريك وإحصائيات"}
            </h2>
            <div className="big">{streakDays}</div>
            <span className="mono">{isEn ? "Consecutive days" : "يوم متواصل"}</span>
            <div className="bar">
              <i style={{ width: `${Math.min(100, Math.round((streakDays / 7) * 100))}%` }}></i>
            </div>
            <span className="mono">
              {Number(profile?.xp || 1240).toLocaleString()} XP · {all.length} {isEn ? "Courses" : "كورسات"}
            </span>

            <div style={{ display: "grid", gap: 8, marginTop: 12 }}>
              <Link to="/create" onClick={playClick} className="btn sm">
                {isEn ? "Upload Lecture" : "ارفع محاضرة جديدة"}
              </Link>
              <Link to="/review" onClick={playClick} className="btn sm line">
                {isEn ? "Smart Spaced Review" : "المراجعة الذكية"}
              </Link>
              <Link to="/stats" onClick={playClick} className="btn sm line">
                {isEn ? "Mastery Map" : "خريطة الإتقان"}
              </Link>
            </div>
          </div>
        </div>

        {/* ─── MY COURSES SECTION (Matches s-courses) ─── */}
        <div style={{ display: "grid", gap: 14, paddingTop: 16 }}>
          <div className="bf-hd">
            <span className="mono">{isEn ? "COURSES" : "كورساتي"}</span>
            <h1 className="serif">
              {isEn ? "All your " : "كل "}
              <em style={{ color: "var(--sig)" }}>{isEn ? "subjects" : "مادة"}</em>
              {isEn ? " in one place." : " في مكان واحد."}
            </h1>
          </div>

          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
              {filterTabs.map((f) => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setActiveFilter(f.id)}
                  className={cn("tag", activeFilter === f.id && "on")}
                >
                  {f.label}
                </button>
              ))}
            </div>

            <div style={{ marginInlineStart: "auto", minWidth: 220, flex: "none" }}>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder={isEn ? "Search courses..." : "ابحث في الكورسات..."}
                style={{
                  width: "100%",
                  minHeight: 38,
                  padding: "0 14px",
                  border: "1px solid var(--line)",
                  background: "var(--paper)",
                  borderRadius: 99,
                  fontSize: "0.85rem",
                  outline: "none",
                  color: "var(--ink)",
                }}
              />
            </div>
          </div>

          {isLoading ? (
            <PageLoader />
          ) : filtered.length === 0 ? (
            <div className="card" style={{ textAlign: "center", padding: "40px 20px" }}>
              <span className="mono">{isEn ? "No courses found" : "لا توجد كورسات مطابقة"}</span>
              <p style={{ color: "var(--mute)", marginTop: 6 }}>
                {isEn
                  ? "Upload a PDF lecture or slides to generate study materials."
                  : "ارفع أول محاضرة PDF أو سلايدات لتوليد الملخصات والكويزات."}
              </p>
              <div style={{ marginTop: 14 }}>
                <Link to="/create" className="btn sm">
                  {isEn ? "Upload Lecture" : "ارفع محاضرة"}
                </Link>
              </div>
            </div>
          ) : (
            <div className="grid-c">
              {filtered.map((course) => {
                const prog = Number(course.progress ?? course.mastery_percent ?? 0);
                const chapters = course.chapters?.length || course.total_lessons || 1;
                return (
                  <Link
                    key={course.id}
                    to={`/course/${course.id}`}
                    onClick={playClick}
                    className="course-card-editorial"
                  >
                    <div className="course-cov">
                      <span className="serif" style={{ fontSize: "1.3rem" }}>
                        {course.title}
                      </span>
                    </div>
                    <div style={{ padding: "0 16px 16px", display: "grid", gap: 10 }}>
                      <span className="mono">
                        {chapters} {isEn ? "Units / Chapters" : "وحدة دراسية"}
                      </span>
                      <div className="bar">
                        <i style={{ width: `${prog}%` }}></i>
                      </div>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <span className="mono">{prog}%</span>
                        <span className="tag">{isEn ? "Open" : "افتح"}</span>
                      </div>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </PullToRefresh>
  );
}
