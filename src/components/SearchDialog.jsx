import React, { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Search, BookOpen, Brain, FileText, Layers, ArrowLeft, Sparkles, Loader2 } from "lucide-react";

const SEARCH_INDEX_TTL_MS = 2 * 60 * 1000;
const searchIndexCache = new Map();

function normalizeSearchText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي");
}

function parseContentText(item) {
  if (!item?.content) return "";
  try {
    const parsed = JSON.parse(item.content);
    const parts = [];
    if (typeof parsed.summary_markdown === "string") parts.push(parsed.summary_markdown);
    if (Array.isArray(parsed.questions)) {
      for (const question of parsed.questions.slice(0, 30)) {
        if (question?.question) parts.push(question.question);
      }
    }
    if (Array.isArray(parsed.cards)) {
      for (const card of parsed.cards.slice(0, 30)) {
        if (card?.front) parts.push(card.front);
        if (card?.back) parts.push(card.back);
      }
    }
    return parts.join(" ");
  } catch {
    return String(item.content).slice(0, 1200);
  }
}

export default function SearchDialog({ open, onClose }) {
  const { profile } = useAuth();
  const { isEn } = useLocale();
  const navigate = useNavigate();
  const [q, setQ] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [data, setData] = useState({ courses: [], contents: [], quizzes: [] });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(q), 120);
    return () => clearTimeout(timer);
  }, [q]);

  useEffect(() => {
    if (!open || !profile?.id) return;
    const cacheKey = `${profile.id}:${profile.email || ""}`;
    const cached = searchIndexCache.get(cacheKey);
    if (cached && Date.now() - cached.createdAt < SEARCH_INDEX_TTL_MS) {
      setData(cached.data);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    Promise.all([
      base44.entities.Course.filter({ created_by_id: profile.id }, "-created_date", 60).catch(() => []),
      base44.entities.GeneratedContent.list("-created_date", 80).catch(() => []),
      base44.entities.SharedQuiz.filter({ created_by: profile.email }, "-created_date", 40).catch(() => []),
    ]).then(([courses, contents, quizzes]) => {
      if (cancelled) return;
      const myCourseIds = new Set(courses.map((c) => c.id));
      const courseTitleById = new Map(courses.map((c) => [c.id, c.title || "كورس"]));
      const nextData = {
        courses: courses.map((c) => ({
          ...c,
          _searchText: normalizeSearchText(
            `${c.title || ""} ${c.description || ""} ${(c.chapters || []).map((ch) => `${ch.title || ""} ${(ch.content || "").slice(0, 400)}`).join(" ")}`
          ),
        })),
        contents: contents
          .filter((ct) => myCourseIds.has(ct.course_id))
          .map((ct) => ({
            ...ct,
            courseTitle: courseTitleById.get(ct.course_id) || "كورس",
            _searchText: normalizeSearchText(`${ct.title || ""} ${ct.content_type || ""} ${parseContentText(ct)}`),
          })),
        quizzes: quizzes.map((qz) => ({
          ...qz,
          _searchText: normalizeSearchText(`${qz.title || ""} ${qz.subject || ""} ${qz.description || ""}`),
        })),
      };
      searchIndexCache.set(cacheKey, { createdAt: Date.now(), data: nextData });
      setData(nextData);
      setLoading(false);
    });
    return () => { cancelled = true; };
  }, [open, profile?.id, profile?.email]);

  useEffect(() => {
    const onKey = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        if (open) onClose();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const results = useMemo(() => {
    const term = normalizeSearchText(debouncedQuery.trim());
    if (!term) {
      return {
        courses: data.courses.slice(0, 5),
        contents: [],
        quizzes: data.quizzes.slice(0, 3),
      };
    }
    const courses = data.courses.filter((c) => c._searchText?.includes(term)).slice(0, 6);
    const contents = data.contents.filter((ct) => ct._searchText?.includes(term)).slice(0, 6);
    const quizzes = data.quizzes.filter((qz) => qz._searchText?.includes(term)).slice(0, 5);
    return { courses, contents, quizzes };
  }, [debouncedQuery, data]);

  const go = (path) => {
    onClose();
    setQ("");
    navigate(path);
  };

  const total = results.courses.length + results.contents.length + results.quizzes.length;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent
        className="max-w-xl p-0 rounded-2xl border border-border bg-popover text-popover-foreground overflow-hidden gap-0 shadow-2xl"
        dir={isEn ? "ltr" : "rtl"}
      >
        <DialogTitle className="sr-only">
          {isEn ? "Search Notes & Quizzes" : "بحث في المذكرات والكويزات"}
        </DialogTitle>
        <DialogDescription className="sr-only">
          {isEn ? "Type to search lectures, summaries, and quizzes" : "اكتب للبحث السريع داخل محاضراتك وتلخيصاتك وكويزاتك"}
        </DialogDescription>
        <div className="flex items-center gap-3 px-4 py-3.5 border-b border-border bg-secondary/40">
          <Search className="size-4 text-primary shrink-0" />
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={
              isEn
                ? "Search courses, summaries, quizzes, flashcards..."
                : "ابحث في الكورسات، الملخصات، الكويزات، الفلاش كاردز..."
            }
            className="flex-1 bg-transparent outline-none text-sm text-foreground placeholder:text-muted-foreground"
          />
          {loading && <Loader2 className="size-4 animate-spin text-muted-foreground" />}
          <kbd className="hidden sm:inline-block text-[10px] font-mono px-1.5 py-0.5 rounded bg-secondary text-muted-foreground border border-border">
            ESC
          </kbd>
        </div>

        <div className="max-h-[65vh] overflow-y-auto p-3 space-y-4">
          {total === 0 && !loading && (
            <div className="text-center py-10 text-muted-foreground text-sm">
              <Sparkles className="size-8 mx-auto mb-2 opacity-30" />
              {q
                ? isEn
                  ? "No matching results"
                  : "لا توجد نتائج مطابقة"
                : isEn
                ? "Start typing to search your library"
                : "ابدأ بالكتابة للبحث في كل محتواك"}
            </div>
          )}

          {results.courses.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                {q
                  ? isEn
                    ? "Courses"
                    : "الكورسات"
                  : isEn
                  ? "Recent Courses"
                  : "أحدث الكورسات"}
              </p>
              <div className="space-y-1">
                {results.courses.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => go(`/course/${c.id}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/70 transition-colors text-start group cursor-pointer"
                  >
                    <div className="size-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                      <BookOpen className="size-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {c.title}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {c.chapters?.length || 0} {isEn ? "chapters" : "فصل"}
                      </p>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {results.contents.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                {isEn ? "Generated Content" : "محتوى مولّد"}
              </p>
              <div className="space-y-1">
                {results.contents.map((ct) => {
                  const Icon =
                    ct.content_type === "quiz"
                      ? Brain
                      : ct.content_type === "flashcards"
                      ? Layers
                      : FileText;
                  const label =
                    ct.content_type === "quiz"
                      ? isEn
                        ? "Quiz"
                        : "كويز"
                      : ct.content_type === "flashcards"
                      ? isEn
                        ? "Flashcards"
                        : "بطاقات"
                      : isEn
                      ? "Summary"
                      : "ملخص";
                  return (
                    <button
                      key={ct.id}
                      onClick={() => go(`/course/${ct.course_id}`)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/70 transition-colors text-start group cursor-pointer"
                    >
                      <div className="size-8 rounded-lg bg-primary/10 border border-primary/25 flex items-center justify-center shrink-0">
                        <Icon className="size-4 text-primary" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground truncate">
                          {label} — {ct.courseTitle || (isEn ? "Course" : "كورس")}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {isEn ? "Inside course" : "داخل الكورس"}
                        </p>
                      </div>
                      <ArrowLeft className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-0 ltr:rotate-180" />
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {results.quizzes.length > 0 && (
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground px-2 mb-1.5">
                {isEn ? "Shared Quizzes" : "الكويزات المشتركة"}
              </p>
              <div className="space-y-1">
                {results.quizzes.map((qz) => (
                  <button
                    key={qz.id}
                    onClick={() => go(`/shared-quiz/${qz.share_code}`)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-secondary/70 transition-colors text-start group cursor-pointer"
                  >
                    <div className="size-8 rounded-lg bg-amber-500/10 border border-amber-500/25 flex items-center justify-center shrink-0">
                      <Brain className="size-4 text-amber-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{qz.title}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {qz.subject || ""} · {qz.questions?.length || 0} {isEn ? "Q" : "سؤال"}
                      </p>
                    </div>
                    <ArrowLeft className="size-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity rtl:rotate-0 ltr:rotate-180" />
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}