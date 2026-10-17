import React from "react";
import { motion } from "framer-motion";
import CourseCard from "@/components/CourseCard";
import { GlassCard } from "@/components/ui/linevault";
import { BookOpen } from "lucide-react";

const containerVariants = {
  hidden: {},
  show: {
    transition: { staggerChildren: 0.04, delayChildren: 0.02 },
  },
};

export default function CourseSection({
  title,
  subtitle,
  icon,
  subject,
  courses,
  badge,
  emptyText,
  currentUserId,
  isAdmin = false,
  onChanged,
  onDelete,
  folders,
  onMoveToFolder,
  onChangeSubject,
  onPurchase,
  selectMode = false,
  selectedIds = new Set(),
  onToggleSelect,
}) {
  const effectiveTitle = title || subject?.label || subject?.labelEn || "المقررات";
  const EffectiveIcon = icon || subject?.icon || BookOpen;

  if (!courses || courses.length === 0) {
    if (!emptyText) return null;
    return (
      <div className="space-y-3">
        <Header title={effectiveTitle} subtitle={subtitle} Icon={EffectiveIcon} count={0} badge={badge} />
        <GlassCard variant="subtle" className="p-8 text-center text-muted-foreground text-sm">
          {emptyText}
        </GlassCard>
      </div>
    );
  }

  return (
    <section className="space-y-4">
      <Header
        title={effectiveTitle}
        subtitle={subtitle}
        Icon={EffectiveIcon}
        count={courses.length}
        badge={badge}
      />
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        {courses.map((course, i) => (
          <CourseCard
            key={course.id}
            course={course}
            index={i}
            canManage={isAdmin || course.created_by_id === currentUserId}
            onChanged={onChanged}
            onDelete={onDelete}
            folders={folders}
            onMoveToFolder={onMoveToFolder}
            onChangeSubject={onChangeSubject}
            onPurchase={onPurchase}
            isAdmin={isAdmin}
            selectMode={selectMode}
            selected={selectedIds.has(course.id)}
            onToggleSelect={onToggleSelect}
          />
        ))}
      </motion.div>
    </section>
  );
}

function Header({ title, subtitle, Icon = BookOpen, count, badge }) {
  return (
    <div className="flex items-center justify-between flex-wrap gap-2">
      <div className="flex items-center gap-3">
        <div className="grid size-10 place-items-center rounded-xl border border-primary/25 bg-primary/10 text-primary">
          <Icon className="size-4" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h2 className="font-display text-base sm:text-lg font-bold tracking-tight text-foreground">
              {title}
            </h2>
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded-full bg-secondary text-muted-foreground border border-border tabular">
              {count}
            </span>
            {badge && (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/25">
                {badge}
              </span>
            )}
          </div>
          {subtitle && <p className="text-xs text-muted-foreground">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
