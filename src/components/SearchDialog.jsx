import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { Search, X, BookOpen, FileText } from "lucide-react";
import { useQuery } from "@tanstack/react-query";

export default function SearchDialog({ open, onClose }) {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);

  useEffect(() => {
    if (open) { setQuery(""); setTimeout(() => inputRef.current?.focus(), 100); }
  }, [open]);

  useEffect(() => {
    const handler = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);

  const { data: courses = [] } = useQuery({
    queryKey: ["search-courses"],
    queryFn: async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        const user = await base44.auth.me();
        return base44.entities.Course.filter({ created_by_id: user.id }, "-created_date", 200);
      } catch { return []; }
    },
    enabled: open,
  });

  const { data: lessons = [] } = useQuery({
    queryKey: ["search-lessons"],
    queryFn: async () => {
      try {
        const { base44 } = await import("@/api/base44Client");
        const user = await base44.auth.me();
        return base44.entities.Lesson.filter({ created_by_id: user.id }, "-created_date", 300);
      } catch { return []; }
    },
    enabled: open,
  });

  const results = useMemo(() => {
    if (!query.trim()) return [];
    const q = query.toLowerCase().trim();
    const courseResults = courses
      .filter((c) =>
        c.title?.toLowerCase().includes(q) ||
        c.description?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q)
      )
      .slice(0, 5)
      .map((c) => ({ type: "course", id: c.id, title: c.title, sub: c.category || c.description?.slice(0, 60) }));

    // Search lessons (chapters)
    const lessonResults = lessons
      .filter((l) =>
        l.title?.toLowerCase().includes(q) ||
        l.content?.toLowerCase().includes(q) ||
        l.description?.toLowerCase().includes(q)
      )
      .slice(0, 4)
      .map((l) => {
        const courseTitle = courses.find(c => c.id === l.course_id)?.title || "كورس";
        return {
          type: "chapter",
          id: l.course_id,
          title: l.title,
          sub: `في كورس: ${courseTitle}`,
          snippet: l.content?.slice(0, 80) || "",
        };
      });

    return [...courseResults, ...lessonResults];
  }, [query, courses, lessons]);

  const icons = { course: BookOpen, chapter: FileText };

  if (!open) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 bg-background/80 backdrop-blur-md flex items-start justify-center pt-[15vh] px-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: -20 }}
          className="w-full max-w-2xl glass-card border border-primary/30 neon-glow-cyan rounded-3xl overflow-hidden shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center gap-3 px-5 py-4 border-b border-border">
            <Search className="w-5 h-5 text-primary" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث في كورساتك ومحتواها..."
              className="flex-1 bg-transparent outline-none text-lg font-semibold placeholder:text-muted-foreground"
              dir="auto"
            />
            {query && (
              <button onClick={() => setQuery("")} className="text-muted-foreground hover:text-foreground transition-colors">
                <X className="w-5 h-5" />
              </button>
            )}
            <kbd className="hidden sm:flex items-center gap-1 text-xs text-muted-foreground bg-secondary/50 border border-border rounded-lg px-2 py-1">Esc</kbd>
          </div>

          {query.trim() ? (
            <div className="max-h-80 overflow-y-auto">
              {results.length ? (
                <div className="p-2">
                  {results.map((r, i) => {
                    const Icon = icons[r.type] || BookOpen;
                    return (
                      <Link key={i} to={`/course/${r.id}`} onClick={onClose}>
                        <div className="flex items-start gap-3 px-4 py-3 rounded-2xl hover:bg-primary/10 transition-colors group cursor-pointer">
                          <div className="w-8 h-8 rounded-xl bg-primary/15 border border-primary/25 flex items-center justify-center shrink-0 mt-0.5">
                            <Icon className="w-4 h-4 text-primary" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-sm group-hover:text-primary transition-colors">{r.title}</p>
                            <p className="text-xs text-muted-foreground truncate">{r.sub}</p>
                            {r.snippet && (
                              <p className="text-xs text-muted-foreground mt-1 line-clamp-1 opacity-70">...{r.snippet}...</p>
                            )}
                          </div>
                          <span className="text-[10px] font-bold text-muted-foreground bg-secondary/50 rounded-lg px-2 py-1 shrink-0">
                            {r.type === "course" ? "كورس" : "فصل"}
                          </span>
                        </div>
                      </Link>
                    );
                  })}
                </div>
              ) : (
                <div className="py-12 text-center">
                  <Search className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
                  <p className="text-muted-foreground">مفيش نتائج لـ "{query}"</p>
                </div>
              )}
            </div>
          ) : (
            <div className="p-5">
              <p className="text-sm font-bold text-muted-foreground mb-3">بحث سريع في:</p>
              <div className="flex flex-wrap gap-2">
                {["العناوين", "الفصول", "المحتوى", "المواد", "المستويات"].map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setQuery(tag.replace("المواد", "").replace("المستويات", ""))}
                    className="text-xs font-bold bg-secondary/60 rounded-xl px-3 py-1.5 hover:bg-primary/15 hover:text-primary transition-colors"
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}