import React from "react";
import { Link } from "react-router-dom";
import { ArrowRight, BookOpen, Clock, Coins, Brain, FileText, Zap } from "lucide-react";
import { cn } from "@/lib/utils";
import { SmartFileIcon } from "@/components/ui/FileTypeIcons";
import { LVBadge } from "@/components/ui/linevault";
import { useLocale } from "@/lib/LocaleContext";

function ContentBadge({ icon: Icon, label, available }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full border font-medium tabular transition-colors duration-150",
        available
          ? "border-[#19f08c]/30 text-[#19f08c] bg-[#19f08c]/10"
          : "border-[rgb(255_255_255/0.09)] text-[#6b7785] bg-white/[0.02]"
      )}
    >
      {/* animated={false}: repeated grid context — preserves compositor idle budget */}
      <Icon size={13} animated={false} /> {label}
    </span>
  );
}

/**
 * Port of LineVault's CourseCard (components/course-grid.tsx)
 * .glass rounded-[1.25rem] + [unicode-bidi:plaintext] + CourseMeta badges + Emerald CTA
 */
export default function CourseCard({ course, contents = [] }) {
  const { t, locale } = useLocale();
  const isEn = locale === "en";
  const hasQuiz = contents.some((x) => x.course_id === course.id && x.type === "quiz");
  const hasSummary = contents.some((x) => x.course_id === course.id && x.type === "summary");
  const hasFlash = contents.some((x) => x.course_id === course.id && x.type === "flashcards");
  const generatedCount = [hasQuiz, hasSummary, hasFlash].filter(Boolean).length;

  const date = new Date(course.created_date || Date.now());
  const daysAgo = Math.floor((Date.now() - date.getTime()) / 86400000);
  const dateLabel =
    daysAgo === 0
      ? t("today")
      : daysAgo === 1
      ? t("yesterday")
      : locale === "ar"
      ? `${daysAgo} يوم`
      : `${daysAgo}d ago`;

  const chapterCount = course.chapters?.length || 0;

  return (
    <div className="glass h-full rounded-[1.25rem] transition-colors duration-200 hover:border-[rgb(255_255_255/0.16)] overflow-hidden flex flex-col group">
      <Link
        to={`/course/${course.id}`}
        className="flex flex-col h-full p-6 gap-4 select-none relative z-10"
      >
        {/* Top row */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-3 min-w-0 flex-1">
            <div className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0 border border-[#19f08c]/30 bg-[#19f08c]/10">
              <SmartFileIcon filename={course.title || course.doc_type || "pdf"} size={24} />
            </div>
            <div className="min-w-0 flex-1">
              <h3
                dir="auto"
                className="text-lg font-semibold tracking-tight leading-snug line-clamp-2 text-[#eef2f6] group-hover:text-[#19f08c] transition-colors duration-150 [unicode-bidi:plaintext]"
              >
                {course.title}
              </h3>
              <p
                dir="auto"
                className="mt-1.5 text-sm leading-relaxed text-[#9aa6b4] line-clamp-2 [unicode-bidi:plaintext]"
              >
                {course.description || t("defaultCourseDesc")}
              </p>
            </div>
          </div>
        </div>

        {/* CourseMeta Badges (1:1 LineVault CourseMeta) */}
        <ul className="flex flex-wrap gap-2">
          <li>
            <LVBadge>
              <BookOpen className="size-3.5" aria-hidden="true" />
              <span>
                {chapterCount}{" "}
                {chapterCount === 1 ? t("chapter") : t("chapters")}
              </span>
            </LVBadge>
          </li>
          {course.subject && (
            <li>
              <LVBadge variant="accent">{course.subject}</LVBadge>
            </li>
          )}
          {Number(course.price_credits || 0) > 0 && (
            <li>
              <LVBadge variant="warning" mono>
                <Coins className="size-3" /> {course.price_credits}
              </LVBadge>
            </li>
          )}
        </ul>

        {/* Content availability badges */}
        <div className="flex gap-1.5 flex-wrap">
          <ContentBadge icon={FileText} label={t("summaryBadge")} available={hasSummary} />
          <ContentBadge icon={Brain} label={t("quizBadge")} available={hasQuiz} />
          <ContentBadge icon={Zap} label={t("flashcardsBadge")} available={hasFlash} />
        </div>

        {/* Footer (1:1 LineVault course-grid.tsx footer) */}
        <div className="mt-auto pt-3 border-t border-[rgb(255_255_255/0.09)] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 text-xs text-[#9aa6b4] tabular">
            <Clock className="w-3.5 h-3.5 text-[#6b7785]" />
            <span>{dateLabel}</span>
            <span className="inline-flex items-center gap-1 ms-1">
              {[0, 1, 2].map((i) => (
                <i
                  key={i}
                  className={cn(
                    "w-1.5 h-1.5 rounded-full",
                    i < generatedCount ? "bg-[#19f08c]" : "bg-white/15"
                  )}
                />
              ))}
            </span>
          </div>

          <span className="inline-flex items-center gap-1.5 rounded-xl bg-[#19f08c] px-3.5 py-2 text-xs font-medium text-[#03150c] shadow-glow transition-colors group-hover:brightness-105">
            <span>{isEn ? "Open Course" : "عرض المقرر"}</span>
            <ArrowRight className="size-3.5 rtl:rotate-180" />
          </span>
        </div>
      </Link>
    </div>
  );
}
