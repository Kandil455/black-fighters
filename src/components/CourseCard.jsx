import React, { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  BookOpen,
  Layers,
  Trash2,
  FolderInput,
  MoreVertical,
  Sparkles,
  Check,
  Coins,
  Folder,
  Tag,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
} from "@/components/ui/dropdown-menu";
import {
  SummaryNoteIcon,
  TheoryQuizIcon,
  BookIcon,
} from "@/components/ui/icons";
import { getSubjectMeta, SUBJECT_META } from "@/components/dashboard/subjectClassifier";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

export default function CourseCard({
  course,
  index = 0,
  onDelete,
  folders = [],
  onMoveToFolder,
  onChangeSubject,
  onPurchase,
  isAdmin = false,
  isOwned = true,
  canAfford = true,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [purchasing, setPurchasing] = useState(false);

  const hasSummary = !!course.summary || !!course.summary_v3;
  const quizCount = course.quiz?.length || 0;
  const flashcardsCount = course.flashcards?.length || 0;
  const price = Number(course.price_credits || 0);
  const isPaid = price > 0 && !isOwned && !isAdmin;

  const subject = getSubjectMeta(course);
  const SubjectIcon = subject.icon || BookOpen;
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const completionParts = [hasSummary, quizCount > 0, flashcardsCount > 0];
  const completionPct = Math.round(
    (completionParts.filter(Boolean).length / 3) * 100
  );

  const handlePurchaseClick = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (purchasing || !onPurchase) return;
    setPurchasing(true);
    try {
      await onPurchase(course);
    } finally {
      setPurchasing(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{
        duration: 0.28,
        delay: Math.min(index * 0.03, 0.18),
        ease: [0.22, 1, 0.36, 1],
      }}
      className="h-full"
    >
      <div className="group relative h-full flex flex-col justify-between rounded-[1.25rem] glass p-5 hover:border-[#19f08c]/45 transition-colors duration-200">
        <div>
          {/* Top Row: Subject Meta + Actions Dropdown */}
          <div className="flex items-start justify-between gap-2 mb-3.5">
            <div className="flex items-center gap-2 min-w-0 flex-wrap">
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
                <SubjectIcon className="w-3.5 h-3.5 shrink-0" />
                <span className="truncate max-w-[130px]">
                  {isEn ? subject.labelEn || subject.label : subject.label}
                </span>
              </span>

              {course.folder && (
                <span className="inline-flex items-center gap-1 text-[11px] text-[#9aa4b2]">
                  <Folder className="w-3 h-3 text-[#19f08c]" />
                  <span className="truncate max-w-[90px]">{course.folder}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0">
              {course.status === "processing" && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-[#f5b83d]/15 text-[#f5b83d] border border-[#f5b83d]/30">
                  {isEn ? "Processing..." : "قيد التجهيز..."}
                </span>
              )}

              {(onDelete || onMoveToFolder || onChangeSubject) && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      onClick={(e) => e.stopPropagation()}
                      className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#f5f7fa] hover:bg-white/[0.06] transition-colors cursor-pointer"
                      aria-label={isEn ? "Course options" : "خيارات المقرر"}
                    >
                      <MoreVertical className="w-4 h-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent
                    align="end"
                    className="w-48 bg-[#090c11] text-[#f5f7fa] border border-white/10 rounded-xl shadow-2xl p-1"
                  >
                    {onMoveToFolder && folders.length > 0 && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs rounded-lg gap-2 cursor-pointer">
                          <FolderInput className="w-3.5 h-3.5 text-[#19f08c]" />
                          <span>{isEn ? "Move to folder" : "نقل إلى مجلد"}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-[#090c11] border border-white/10 rounded-xl p-1">
                          <DropdownMenuItem
                            onClick={() => onMoveToFolder(course.id, "")}
                            className="text-xs rounded-lg cursor-pointer"
                          >
                            {isEn ? "No folder" : "بدون مجلد"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          {folders.map((f) => (
                            <DropdownMenuItem
                              key={f}
                              onClick={() => onMoveToFolder(course.id, f)}
                              className="text-xs rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span className="truncate">{f}</span>
                              {course.folder === f && (
                                <Check className="w-3.5 h-3.5 text-[#19f08c]" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {onChangeSubject && (
                      <DropdownMenuSub>
                        <DropdownMenuSubTrigger className="text-xs rounded-lg gap-2 cursor-pointer">
                          <Tag className="w-3.5 h-3.5 text-[#19f08c]" />
                          <span>{isEn ? "Change subject" : "تغيير التخصص"}</span>
                        </DropdownMenuSubTrigger>
                        <DropdownMenuSubContent className="bg-[#090c11] border border-white/10 rounded-xl p-1 max-h-60 overflow-y-auto">
                          {Object.entries(SUBJECT_META).map(([key, meta]) => (
                            <DropdownMenuItem
                              key={key}
                              onClick={() => onChangeSubject(course.id, key)}
                              className="text-xs rounded-lg cursor-pointer flex items-center justify-between"
                            >
                              <span>{isEn ? meta.labelEn || meta.label : meta.label}</span>
                              {course.subject_override === key && (
                                <Check className="w-3.5 h-3.5 text-[#19f08c]" />
                              )}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuSubContent>
                      </DropdownMenuSub>
                    )}

                    {onDelete && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            onDelete(course.id, e);
                          }}
                          className="text-xs rounded-lg text-[#ff5d6c] focus:text-[#ff5d6c] focus:bg-[#ff5d6c]/10 gap-2 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          <span>{isEn ? "Delete course" : "حذف المقرر"}</span>
                        </DropdownMenuItem>
                      </>
                    )}
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>

          {/* Course Title */}
          <Link to={`/course/${course.id}`} className="block group/link">
            <h3 className="text-base font-bold text-[#f5f7fa] group-hover/link:text-[#19f08c] transition-colors line-clamp-2 leading-snug mb-2">
              {course.title || (isEn ? "Untitled Lecture" : "محاضرة بدون عنوان")}
            </h3>
          </Link>

          {/* Unboxed CourseMeta Stats */}
          <div className="flex flex-wrap items-center gap-2 text-xs text-[#9aa4b2] mt-3">
            <span
              className={cn(
                "inline-flex items-center gap-1",
                hasSummary ? "text-[#19f08c] font-semibold" : "text-[#646e7d]"
              )}
            >
              <SummaryNoteIcon size={13} animated={false} />
              <span>
                {hasSummary
                  ? isEn
                    ? "Verified Summary"
                    : "ملخص مدقق"
                  : isEn
                  ? "No Summary"
                  : "بدون ملخص"}
              </span>
            </span>

            <span aria-hidden="true">·</span>

            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono tabular",
                quizCount > 0 ? "text-[#f5f7fa]" : "text-[#646e7d]"
              )}
            >
              <TheoryQuizIcon size={13} animated={false} />
              <span>
                {quizCount} {isEn ? "Q" : "سؤال"}
              </span>
            </span>

            <span aria-hidden="true">·</span>

            <span
              className={cn(
                "inline-flex items-center gap-1 font-mono tabular",
                flashcardsCount > 0 ? "text-[#f5f7fa]" : "text-[#646e7d]"
              )}
            >
              <BookIcon size={13} animated={false} />
              <span>
                {flashcardsCount} {isEn ? "Cards" : "بطاقة"}
              </span>
            </span>
          </div>
        </div>

        {/* Bottom Progress & Action Bar */}
        <div className="mt-5 pt-3.5 border-t border-white/[0.08] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0 flex-1">
            <div className="h-1.5 flex-1 max-w-[90px] rounded-full bg-white/[0.07] overflow-hidden">
              <div
                className={cn(
                  "h-full rounded-full bg-[#19f08c] transition-transform duration-300 origin-left rtl:origin-right",
                  completionPct === 100
                    ? "scale-x-100"
                    : completionPct >= 66
                    ? "scale-x-75"
                    : completionPct >= 33
                    ? "scale-x-50"
                    : "scale-x-10"
                )}
              />
            </div>
            <span className="text-[11px] font-mono tabular text-[#9aa4b2]">
              {completionPct}%
            </span>
          </div>

          {isPaid ? (
            <button
              type="button"
              onClick={handlePurchaseClick}
              disabled={purchasing || !canAfford}
              className="btn-primary-glow inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50 cursor-pointer"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>
                {purchasing
                  ? isEn
                    ? "Unlocking..."
                    : "جاري الفتح..."
                  : `${price} ${isEn ? "Cr" : "نقطة"}`}
              </span>
            </button>
          ) : (
            <Link
              to={`/course/${course.id}`}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#19f08c]/12 hover:bg-[#19f08c] text-[#19f08c] hover:text-[#03150c] border border-[#19f08c]/35 text-xs font-bold transition-colors whitespace-nowrap"
            >
              <span>{isEn ? "Open Atlas" : "فتح المقرر"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>
    </motion.div>
  );
}
