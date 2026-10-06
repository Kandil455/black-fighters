import React, { useState, useMemo } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Search, ChevronDown, ChevronUp, Table2, Highlighter, FileText, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import StudyContent from "@/components/course/StudyContent";
import { prefersReducedMotion } from "@/lib/webglQuality";

// عدّ المؤشرات داخل قسم: جداول / هايلايت / كلمات مفتاحية
function analyze(content = "") {
  const tables = (content.match(/^\s*\|.*\|\s*$/gm) || []).length > 0 ? (content.split("\n").filter((l) => /^\s*\|/.test(l)).length) : 0;
  const highlights = (content.match(/==[^=]+==/g) || []).length;
  return { tableRows: tables, highlights };
}

function stripMd(text = "") {
  return text
    .replace(/==(?:green|yellow|cyan|orange|red):([^=]+)==/g, "$1")
    .replace(/==([^=]+)==/g, "$1")
    .replace(/[#*`_>|-]/g, " ")
    .toLowerCase();
}

export default function ChapterCardBrowser({ chapters = [], renderEditor }) {
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(0);
  const shouldReduceMotion = useReducedMotion();
  const reduceMotion = Boolean(shouldReduceMotion ?? prefersReducedMotion());

  const filtered = useMemo(() => {
    if (!search.trim()) return chapters.map((ch, i) => ({ ch, i }));
    const q = search.trim().toLowerCase();
    return chapters
      .map((ch, i) => ({ ch, i }))
      .filter(({ ch }) => stripMd(ch.title).includes(q) || stripMd(ch.content).includes(q));
  }, [chapters, search]);

  return (
    <div>
      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="ابحث داخل التلخيص — عنوان أو كلمة..."
          className="pr-10 pl-9 h-11"
          dir="auto"
        />
        {search && (
          <button onClick={() => setSearch("")} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {search && (
        <p className="text-xs text-muted-foreground mb-3 font-bold">
          {filtered.length} نتيجة من {chapters.length} قسم
        </p>
      )}

      <div className="space-y-2.5">
        {filtered.map(({ ch, i }) => {
          const stats = analyze(ch.content || "");
          const isOpen = open === i;
          return (
            <motion.div
              key={i}
              className="glass-card rounded-2xl border border-border/50 overflow-hidden"
            >
              <button
                onClick={() => setOpen(isOpen ? -1 : i)}
                className="w-full flex items-center justify-between gap-3 p-4 text-right hover:bg-secondary/30 transition-colors"
              >
                <div className="flex items-center gap-3 flex-1 min-w-0">
                  <span className="w-7 h-7 rounded-full bg-primary/10 text-primary text-xs font-bold flex items-center justify-center shrink-0">{i + 1}</span>
                  <span className="font-bold text-sm truncate flex-1" dir="auto">{ch.title}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  {stats.tableRows > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[hsl(184,100%,50%)] bg-[hsl(184,100%,50%)]/10 px-2 py-0.5 rounded-full">
                      <Table2 className="w-3 h-3" /> جدول
                    </span>
                  )}
                  {stats.highlights > 0 && (
                    <span className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-yellow-400 bg-yellow-400/10 px-2 py-0.5 rounded-full">
                      <Highlighter className="w-3 h-3" /> {stats.highlights}
                    </span>
                  )}
                  {isOpen ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
                </div>
              </button>
              {reduceMotion ? (
                isOpen && (
                  <div className="px-4 pb-4 border-t border-border/30">
                    {renderEditor ? renderEditor(ch, i) : (
                      <div className="bg-white/5 p-2 rounded-2xl border border-white/10 mt-3">
                        <StudyContent content={ch.content} />
                      </div>
                    )}
                  </div>
                )
              ) : (
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                      className="overflow-hidden"
                    >
                      <div className="px-4 pb-4 border-t border-border/30">
                        {renderEditor ? renderEditor(ch, i) : (
                          <div className="bg-white/5 p-2 rounded-2xl border border-white/10 mt-3">
                            <StudyContent content={ch.content} />
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              )}
            </motion.div>
          );
        })}

        {filtered.length === 0 && (
          <div className="glass-card rounded-2xl p-10 text-center border border-border/50">
            <FileText className="w-10 h-10 text-muted-foreground mx-auto mb-3 opacity-40" />
            <p className="text-muted-foreground text-sm">مفيش نتائج لـ "{search}" — جرب كلمة تانية</p>
          </div>
        )}
      </div>
    </div>
  );
}