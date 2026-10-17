import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { Target, Clock, CheckSquare, BookOpen, Award, TrendingUp, FileText, Flame, Trophy } from "@/components/ui/animatedIcons";
import StatCard from "@/components/stats/StatCard";
import BadgesGrid from "@/components/stats/BadgesGrid";
import ProgressChart from "@/components/stats/ProgressChart";
import SubjectHoursChart from "@/components/stats/SubjectHoursChart";
import CourseCompletionChart from "@/components/stats/CourseCompletionChart";
import SummaryStatsPanel from "@/components/course/SummaryStatsPanel";
import PageLoader from "@/components/PageLoader";
import { useLocale } from "@/lib/LocaleContext";

export default function Stats() {
  const { profile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const { data, isLoading } = useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const settled = await Promise.allSettled([
        base44.entities.QuizResult.filter({}, "-created_date", 500),
        base44.entities.StudyActivity.filter({}, "-created_date", 500),
        base44.entities.Course.filter({}, "-created_date", 500),
        base44.entities.GeneratedContent.filter({}, "-created_date", 500),
      ]);
      const [results, activities, courses, contents] = settled.map((item) =>
        item.status === "fulfilled" && Array.isArray(item.value) ? item.value : []
      );
      return { results, activities, courses, contents };
    },
  });

  if (isLoading) {
    return <PageLoader message={isEn ? "Loading analytics..." : "جاري تحميل الإحصائيات..."} />;
  }

  const {
    results = [],
    activities = [],
    courses = [],
    contents = [],
  } = data || {};
  const totalQuestions = activities.reduce((s, a) => s + (a.questions_answered || 0), 0);
  const totalMinutes = activities.reduce((s, a) => s + (a.minutes || 0), 0);
  const avgScore = results.length ? Math.round(results.reduce((s, r) => s + (r.percentage || 0), 0) / results.length) : 0;

  const bySubject = {};
  results.forEach((r) => {
    if (!r.subject) return;
    (bySubject[r.subject] = bySubject[r.subject] || []).push(r.percentage || 0);
  });
  let topSubject = "—";
  let topAvg = -1;
  const subjectList = [];
  Object.entries(bySubject).forEach(([sub, arr]) => {
    const avg = Math.round(arr.reduce((a, b) => a + b, 0) / arr.length);
    subjectList.push({ name: sub, pct: avg });
    if (avg > topAvg) { topAvg = avg; topSubject = sub; }
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const streak = profile?.current_streak || 0;
  const longest = profile?.longest_streak || 0;

  return (
    <div dir={dir} className="max-w-5xl mx-auto pb-12">
      {/* Editorial Header */}
      <div className="hd mb-6">
        <span className="mono">{isEn ? "Mastery Map" : "خريطة الإتقان"}</span>
        <h1 className="serif">
          {isEn ? "Where are you " : "فين "}
          <em style={{ color: "var(--sig)" }}>{isEn ? "strong?" : "أنت قوي؟"}</em>
        </h1>
        <p style={{ color: "var(--mute)" }}>
          {isEn ? "All your academic progress and topic strengths in one place" : "كل إنجازاتك ومستوى إتقانك للمواد في مكان واحد"}
        </p>
      </div>

      {/* Two Column Mastery & Weekly View */}
      <div className="two mb-6">
        {/* Topic Mastery Progress Bars */}
        <div className="card">
          <h2 className="text-base font-bold">{isEn ? "Mastery by Topic" : "الإتقان حسب الموضوع"}</h2>
          <div style={{ display: "grid", gap: 14 }}>
            {subjectList.length === 0 ? (
              <div className="py-6 text-center" style={{ color: "var(--mute)" }}>
                <p className="text-sm">{isEn ? "Solve quizzes to see your mastery map" : "حل كويزات عشان تظهر خريطة إتقانك هنا"}</p>
              </div>
            ) : (
              subjectList.slice(0, 6).map((sub) => (
                <div key={sub.name}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className="text-sm">{sub.name}</span>
                    <span className="mono text-xs">{sub.pct}%</span>
                  </div>
                  <div className="bar">
                    <i style={{ width: `${Math.min(100, Math.max(0, sub.pct))}%` }} />
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Weekly & Hours Overview */}
        <div className="card">
          <h2 className="text-base font-bold">{isEn ? "This Week" : "الأسبوع ده"}</h2>
          <div>
            <span className="mono">{isEn ? "TOTAL STUDY TIME" : "وقت المذاكرة"}</span>
            <div className="big my-1" style={{ fontSize: "2.8rem" }}>
              {hours > 0 ? (isEn ? `${hours}h ${mins}m` : `${hours}س ${mins}د`) : (isEn ? `${mins}m` : `${mins}د`)}
            </div>
            <span className="mono text-xs">
              {totalQuestions} {isEn ? "questions answered" : "سؤال تم حلّه"} · {results.length} {isEn ? "quizzes" : "كويز"}
            </span>
          </div>

          <div className="pt-3 border-t border-[var(--line)]">
            <div className="flex justify-between items-center py-2">
              <span className="text-sm">{isEn ? "Current Streak" : "سلسلة المذاكرة الحالية"}</span>
              <span className="tag on">{streak} {isEn ? "days" : "أيام"}</span>
            </div>
            <div className="flex justify-between items-center py-2 border-t border-[var(--line)]">
              <span className="text-sm">{isEn ? "Average Score" : "متوسط النتائج"}</span>
              <span className="mono font-bold text-sm" style={{ color: "var(--sig)" }}>{avgScore}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Grid of Key Stats */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatCard icon={Flame} label={isEn ? "Current Streak" : "الستريك الحالي"} value={`${streak} ${isEn ? "days" : "يوم"}`} />
        <StatCard icon={Trophy} label={isEn ? "Longest Streak" : "أطول ستريك"} value={`${longest} ${isEn ? "days" : "يوم"}`} />
        <StatCard icon={Target} label={isEn ? "Average Score" : "متوسط الكويزات"} value={`${avgScore}%`} />
        <StatCard icon={CheckSquare} label={isEn ? "Questions Solved" : "أسئلة تم حلها"} value={totalQuestions} />
        <StatCard icon={Clock} label={isEn ? "Study Time" : "وقت المذاكرة"} value={hours > 0 ? (isEn ? `${hours}h` : `${hours}س`) : `${mins}د`} />
        <StatCard icon={BookOpen} label={isEn ? "Total Courses" : "عدد الكورسات"} value={courses.length} />
        <StatCard icon={TrendingUp} label={isEn ? "Top Subject" : "أقوى مادة"} value={topSubject} />
        <StatCard icon={Award} label={isEn ? "Completed Quizzes" : "كويزات مكتملة"} value={results.length} />
      </div>

      {/* Summaries & Document Stats */}
      <div className="card mb-6">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--line)]">
          <FileText className="w-4 h-4" style={{ color: "var(--sig)" }} animated={false} />
          <h2 className="text-base font-bold">{isEn ? "Summaries & Documents" : "إحصائيات التلخيصات"}</h2>
        </div>
        <SummaryStatsPanel />
      </div>

      {/* Charts */}
      <div className="two mb-6">
        <div className="card">
          <SubjectHoursChart results={results} />
        </div>
        <div className="card">
          <CourseCompletionChart courses={courses} contents={contents} />
        </div>
      </div>

      <div className="card mb-6">
        <ProgressChart activities={activities} />
      </div>

      {/* Badges Grid */}
      <div className="card">
        <div className="flex items-center gap-2 pb-3 border-b border-[var(--line)]">
          <Award className="w-4 h-4" style={{ color: "var(--sig)" }} animated={false} />
          <h2 className="text-base font-bold">{isEn ? "Badges & Mastery" : "الشارات والأوسمة"}</h2>
        </div>
        <BadgesGrid unlocked={profile?.badges || []} />
      </div>
    </div>
  );
}
