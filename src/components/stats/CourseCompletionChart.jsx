import React from "react";
import { motion } from "framer-motion";
import { RadialBarChart, RadialBar, ResponsiveContainer, PolarAngleAxis } from "recharts";
import { Target } from "lucide-react";

function buildCourseProgress(courses = [], contents = []) {
  const generatedByCourse = contents.reduce((acc, item) => {
    const itemType = item.type || item.content_type;
    if (!["summary", "quiz", "flashcards"].includes(itemType)) return acc;
    acc[item.course_id] = acc[item.course_id] || new Set();
    acc[item.course_id].add(itemType);
    return acc;
  }, {});

  return courses.slice(0, 6).map((course) => {
    const generated = generatedByCourse[course.id]?.size || 0;
    return {
      id: course.id,
      title: course.title,
      subject: course.subject || "غير مصنف",
      percent: Math.round((generated / 3) * 100),
    };
  });
}

export default function CourseCompletionChart({ courses, contents }) {
  const data = buildCourseProgress(courses, contents);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.06 }} className="glass-card rounded-3xl p-6 border border-accent/30 neon-glow-purple">
      <div className="flex items-center gap-2 mb-5">
        <Target className="w-5 h-5 text-accent" />
        <h2 className="font-extrabold">مستوى إنجاز الكورسات</h2>
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        {data.map((course) => (
          <div key={course.id} className="rounded-2xl border border-border bg-background/35 p-4 flex items-center gap-4">
            <div className="relative w-20 h-20 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <RadialBarChart innerRadius="72%" outerRadius="100%" data={[course]} startAngle={90} endAngle={-270}>
                  <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                  <RadialBar dataKey="percent" fill="hsl(270 100% 68%)" cornerRadius={10} background={{ fill: "hsl(240 15% 16%)" }} />
                </RadialBarChart>
              </ResponsiveContainer>
              <span className="absolute inset-0 flex items-center justify-center text-sm font-black text-accent">{course.percent}%</span>
            </div>
            <div className="min-w-0">
              <p className="font-extrabold line-clamp-1">{course.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{course.subject}</p>
              <p className="text-xs text-primary font-bold mt-2">ملخص + كويز + بطاقات</p>
            </div>
          </div>
        ))}
      </div>
    </motion.div>
  );
}