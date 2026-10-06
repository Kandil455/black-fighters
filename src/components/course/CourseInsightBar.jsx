import React from "react";
import { BookOpen, CheckCircle2, GraduationCap, Globe } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

const langLabel = { ar: "عربي 🇦🇪", en: "English 🇬🇧", mixed: "ثنائي 🌍" };

export default function CourseInsightBar({ course, generatedCount = 0 }) {
  const chaptersCount = course?.chapters?.length || 0;
  const totalWords = (course?.chapters || []).reduce((s, ch) => s + (ch.content?.split(/\s+/).length || 0), 0);
  const readMinutes = Math.max(1, Math.round(totalWords / 200));

  const items = [
    {
      icon: BookOpen, label: "الفصول", value: chaptersCount,
      sub: `${chaptersCount} فصل`,
      color: "text-primary", bg: "bg-primary/10", border: "border-primary/20"
    },
    {
      icon: GraduationCap, label: "المستوى", value: course?.level || "عام",
      sub: course?.subject || "مادة عامة",
      color: "text-accent", bg: "bg-accent/10", border: "border-accent/20"
    },
    {
      icon: Globe, label: "اللغة", value: langLabel[course?.language] || "عربي",
      sub: course?.doc_type === "questions" ? "بنك أسئلة 📋" : "محتوى شرح 📖",
      color: "text-[hsl(152,100%,50%)]", bg: "bg-[hsl(152,100%,50%)]/10", border: "border-[hsl(152,100%,50%)]/20"
    },
    {
      icon: CheckCircle2, label: "المولّد", value: `${generatedCount}/3`,
      sub: readMinutes < 60 ? `~${readMinutes} دقيقة قراءة` : `~${Math.round(readMinutes/60)}س قراءة`,
      color: generatedCount === 3 ? "text-[hsl(152,100%,50%)]" : "text-muted-foreground",
      bg: generatedCount === 3 ? "bg-[hsl(152,100%,50%)]/10" : "bg-secondary/40",
      border: generatedCount === 3 ? "border-[hsl(152,100%,50%)]/20" : "border-border"
    },
  ];

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      {items.map(({ icon: Icon, label, value, sub, color, bg, border }, i) => (
        <motion.div
          key={label}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: i * 0.07 }}
          className={cn("glass-card rounded-2xl border p-4", border)}
        >
          <div className={cn("w-8 h-8 rounded-xl flex items-center justify-center mb-2", bg)}>
            <Icon className={cn("w-4 h-4", color)} />
          </div>
          <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
          <p className={cn("font-extrabold truncate", color)}>{value}</p>
          <p className="text-[10px] text-muted-foreground truncate mt-0.5">{sub}</p>
        </motion.div>
      ))}
    </div>
  );
}
