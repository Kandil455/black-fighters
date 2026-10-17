import React from "react";
import { BookOpen, FolderKanban, Flame, Zap, Brain, Clock } from "lucide-react";
import { motion } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { getLevelInfo } from "@/lib/xpSystem";
import { AnimatedNumber } from "@/components/ui/linevault";
import { useLocale } from "@/lib/LocaleContext";

function StatCard({
  label,
  value,
  numericValue,
  numericSuffix = "",
  numericPrefix = "",
  sub,
  subNumericValue,
  subPrefix = "",
  subSuffix = "",
  icon: Icon,
  color,
  glow,
  border,
  delay = 0,
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.42, delay, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card rounded-2xl p-4 border ${border} ${glow} flex flex-col gap-1 transition-colors hover:border-primary/40`}
    >
      <div className="flex items-center justify-between">
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <Icon className={`w-4 h-4 ${color}`} />
      </div>
      <p className={`text-2xl font-black font-mono tabular-nums tracking-tight ${color}`}>
        {typeof numericValue === "number" ? (
          <AnimatedNumber
            value={numericValue}
            prefix={numericPrefix}
            suffix={numericSuffix}
          />
        ) : (
          value
        )}
      </p>
      {typeof subNumericValue === "number" ? (
        <p className="text-xs text-muted-foreground font-mono tabular-nums">
          <AnimatedNumber
            value={subNumericValue}
            prefix={subPrefix}
            suffix={subSuffix}
          />
        </p>
      ) : (
        sub && <p className="text-xs text-muted-foreground">{sub}</p>
      )}
    </motion.div>
  );
}

export default function DashboardStats({ courses = [] }) {
  const { profile } = useAuth();
  const { locale } = useLocale();
  const isEn = locale === "en";

  const { data: quizResults = [] } = useQuery({
    queryKey: ["dash-quiz-results"],
    queryFn: async () => {
      try {
        return base44.entities.QuizResult.filter({}, "-created_date", 200);
      } catch {
        return [];
      }
    },
  });

  const subjects = new Set(courses.map((c) => c.category).filter(Boolean)).size;
  const chapters = courses.reduce((s, c) => s + (c.total_lessons || 0), 0);
  const streak = Number(profile?.current_streak || 0);
  const longestStreak = Number(profile?.longest_streak || 0);
  const totalXP = Number(profile?.total_xp || 0);
  const levelInfo = getLevelInfo(totalXP);
  const avgScore = quizResults.length
    ? Math.round(
        quizResults.reduce((s, r) => s + (r.percentage || 0), 0) /
          quizResults.length
      )
    : null;
  const totalMinutes = Number(profile?.total_minutes_studied || 0);
  const hours = Math.floor(totalMinutes / 60);

  const stats = [
    {
      label: isEn ? "Courses" : "الكورسات",
      numericValue: courses.length,
      icon: BookOpen,
      color: "text-primary",
      glow: "neon-glow-cyan",
      border: "border-primary/20",
      subNumericValue: chapters,
      subSuffix: isEn ? " chapters" : " فصل",
      delay: 0,
    },
    {
      label: isEn ? "Study Streak" : "سلسلة المذاكرة",
      numericValue: streak,
      numericSuffix: " 🔥",
      icon: Flame,
      color:
        streak >= 7
          ? "text-orange-400"
          : streak >= 3
          ? "text-yellow-400"
          : "text-muted-foreground",
      glow: streak >= 3 ? "neon-glow-purple" : "",
      border: streak >= 3 ? "border-orange-400/20" : "border-border/30",
      subNumericValue: streak > 0 ? longestStreak : undefined,
      subPrefix: streak > 0 ? (isEn ? "Best: " : "أطول: ") : "",
      subSuffix: streak > 0 ? (isEn ? " days" : " يوم") : "",
      sub:
        streak === 0
          ? isEn
            ? "Start today!"
            : "ابدأ النهارده!"
          : undefined,
      delay: 0.05,
    },
    {
      label: isEn ? "Rank Level" : "المستوى",
      value: `${levelInfo.current.icon} ${levelInfo.current.title}`,
      icon: Zap,
      color: "text-accent",
      glow: "neon-glow-purple",
      border: "border-accent/20",
      subNumericValue: totalXP,
      subSuffix: " XP",
      delay: 0.1,
    },
    {
      label: isEn ? "Quizzes" : "الكويزات",
      numericValue: quizResults.length,
      icon: Brain,
      color: "text-[hsl(152,100%,50%)]",
      glow: "",
      border: "border-[hsl(152,100%,50%)]/20",
      subNumericValue: avgScore !== null ? avgScore : undefined,
      subPrefix: avgScore !== null ? (isEn ? "Avg " : "متوسط ") : "",
      subSuffix: avgScore !== null ? "%" : "",
      sub:
        avgScore === null
          ? isEn
            ? "Take first quiz!"
            : "ابدأ أول كويز!"
          : undefined,
      delay: 0.15,
    },
    {
      label: isEn ? "Subjects" : "المواد",
      numericValue: subjects,
      icon: FolderKanban,
      color: "text-primary",
      glow: "",
      border: "border-primary/20",
      sub: isEn ? "Specialties" : "مادة مختلفة",
      delay: 0.2,
    },
    {
      label: isEn ? "Study Time" : "وقت المذاكرة",
      numericValue: hours > 0 ? hours : totalMinutes,
      numericSuffix: hours > 0 ? "h" : "m",
      icon: Clock,
      color: "text-yellow-400",
      glow: "",
      border: "border-yellow-400/20",
      sub: isEn ? "Total time" : "إجمالي",
      delay: 0.25,
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
      {stats.map((s) => (
        <StatCard key={s.label} {...s} />
      ))}
    </div>
  );
}