import React from "react";
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Target, Clock, CheckSquare, BookOpen, Award, TrendingUp, FileText, Flame, Trophy } from "lucide-react";
import StatCard from "@/components/stats/StatCard";
import BadgesGrid from "@/components/stats/BadgesGrid";
import ProgressChart from "@/components/stats/ProgressChart";
import AnimePowerPanel from "@/components/stats/AnimePowerPanel";
import SubjectHoursChart from "@/components/stats/SubjectHoursChart";
import CourseCompletionChart from "@/components/stats/CourseCompletionChart";
import XpLevelCard from "@/components/stats/XpLevelCard";
import SummaryStatsPanel from "@/components/course/SummaryStatsPanel";
import PageLoader from "@/components/PageLoader";
import { useLocale } from "@/lib/LocaleContext";

export default function Stats() {
  const { profile, user } = useAuth();
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
  Object.entries(bySubject).forEach(([sub, arr]) => {
    const avg = arr.reduce((a, b) => a + b, 0) / arr.length;
    if (avg > topAvg) { topAvg = avg; topSubject = sub; }
  });

  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  const xp = profile?.total_xp || 0;
  const streak = profile?.current_streak || 0;
  const longest = profile?.longest_streak || 0;

  return (
    <div dir={dir} className="max-w-5xl mx-auto">
      <h1 className="text-3xl font-black mb-1">{isEn ? "Study Analytics 📈" : "إحصائياتي 📈"}</h1>
      <p className="text-muted-foreground mb-8">
        {isEn ? "All your academic progress and achievements in one place" : "كل إنجازاتك ومجهودك في مكان واحد"}
      </p>

      <XpLevelCard xp={xp} />
      <AnimePowerPanel avgScore={avgScore} totalQuestions={totalQuestions} coursesCount={courses.length} xp={xp} />

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-6">
        <StatCard index={0} icon={Flame} label={isEn ? "Current Streak" : "سلسلة المذاكرة الحالية"} value={`${streak} ${isEn ? "days" : "يوم"}`} color="text-[hsl(152,100%,50%)]" border="border-[hsl(152,100%,50%)]/30" glow="neon-glow-green" />
        <StatCard index={1} icon={Trophy} label={isEn ? "Longest Streak" : "أطول سلسلة"} value={`${longest} ${isEn ? "days" : "يوم"}`} color="text-accent" border="border-accent/30" />
        <StatCard index={2} icon={Target} label={isEn ? "Average Quiz Score" : "متوسط نتيجة الكويزات"} value={`${avgScore}%`} color="text-primary" border="border-primary/30" glow="neon-glow-cyan" />
        <StatCard index={3} icon={CheckSquare} label={isEn ? "Questions Solved" : "أسئلة حليتها"} value={totalQuestions} color="text-accent" border="border-accent/30" />
        <StatCard index={4} icon={Clock} label={isEn ? "Total Study Time" : "وقت المذاكرة"} value={hours > 0 ? (isEn ? `${hours}h ${mins}m` : `${hours}س ${mins}د`) : (isEn ? `${mins}m` : `${mins}د`)} color="text-primary" border="border-primary/30" />
        <StatCard index={5} icon={BookOpen} label={isEn ? "Courses & Summaries" : "عدد الكورسات"} value={courses.length} color="text-[hsl(152,100%,50%)]" border="border-[hsl(152,100%,50%)]/30" />
        <StatCard index={6} icon={TrendingUp} label={isEn ? "Strongest Subject" : "أقوى مادة عندك"} value={topSubject} color="text-accent" border="border-accent/30" />
        <StatCard index={7} icon={Award} label={isEn ? "Total Quizzes" : "عدد الكويزات"} value={results.length} color="text-primary" border="border-primary/30" />
      </div>

      <div className="glass-card rounded-3xl p-7 border border-border mt-8">
        <div className="flex items-center gap-2 mb-5">
          <FileText className="w-5 h-5 text-primary" />
          <h2 className="text-lg font-extrabold">{isEn ? "Summaries & Document Stats 📄" : "إحصائيات التلخيصات 📄"}</h2>
        </div>
        <SummaryStatsPanel />
      </div>

      <div className="grid lg:grid-cols-2 gap-5 mt-8">
        <SubjectHoursChart results={results} />
        <CourseCompletionChart courses={courses} contents={contents} />
      </div>

      <ProgressChart activities={activities} />

      <div className="glass-card rounded-3xl p-7 border border-border mt-8">
        <div className="flex items-center gap-2 mb-5">
          <Award className="w-5 h-5 text-accent" />
          <h2 className="text-lg font-extrabold">{isEn ? "Badges & Mastery" : "الشارات"}</h2>
        </div>
        <BadgesGrid unlocked={profile?.badges || []} />
      </div>
    </div>
  );
}
