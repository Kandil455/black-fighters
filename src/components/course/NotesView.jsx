import React, { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { entities } from '@/api/index';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, StickyNote, Trash2, Eye, Edit3 } from "lucide-react";
import { FileSaveIcon } from "@/components/ui/icons";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";

export default function NotesView({ courseId, course }) {
  const queryClient = useQueryClient();
  const [savingKey, setSavingKey] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [previewMode, setPreviewMode] = useState({});
  const [deletingKey, setDeletingKey] = useState(null);

  const { data: notes = [] } = useQuery({
    queryKey: ["notes", courseId],
    queryFn: () => entities.CourseNote.filter({ course_id: courseId }, "chapter_index", 100),
  });

  const noteMap = useMemo(() => {
    const map = {};
    notes.forEach((n) => { map[n.chapter_index] = n; });
    return map;
  }, [notes]);

  const valueFor = (index) => drafts[index] ?? noteMap[index]?.content ?? "";
  const isDirty = (index) => drafts[index] !== undefined && drafts[index] !== (noteMap[index]?.content ?? "");

  const save = async (index) => {
    const content = valueFor(index).trim();
    const existing = noteMap[index];
    const queryKey = ["notes", courseId];

    // Optimistic: update the cache immediately so the note shows as saved
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old = []) => {
      if (existing) {
        return old.map((n) => (n.id === existing.id ? { ...n, content } : n));
      }
      if (content) {
        return [...old, { id: `temp-${index}`, course_id: courseId, chapter_index: index, content }];
      }
      return old;
    });
    setDrafts((prev) => { const next = { ...prev }; delete next[index]; return next; });

    setSavingKey(index);
    try {
      if (existing) {
        await entities.CourseNote.update(existing.id, { content });
      } else if (content) {
        await entities.CourseNote.create({ course_id: courseId, chapter_index: index, content });
      }
      await queryClient.invalidateQueries({ queryKey });
      toast.success("الملاحظة اتحفظت وهتظهر في الـ PDF 📝");
    } catch {
      queryClient.setQueryData(queryKey, previous); // rollback
      toast.error("حصل خطأ، جرب تاني");
    } finally {
      setSavingKey(null);
    }
  };

  const deleteNote = async (index) => {
    const existing = noteMap[index];
    if (!existing) return;
    const queryKey = ["notes", courseId];

    // Optimistic removal
    const previous = queryClient.getQueryData(queryKey);
    queryClient.setQueryData(queryKey, (old = []) => old.filter((n) => n.id !== existing.id));
    setDrafts((prev) => { const n = { ...prev }; delete n[index]; return n; });

    setDeletingKey(index);
    try {
      await entities.CourseNote.delete(existing.id);
      await queryClient.invalidateQueries({ queryKey });
      toast.success("اتمسحت الملاحظة");
    } catch {
      queryClient.setQueryData(queryKey, previous); // rollback
      toast.error("حصل خطأ");
    } finally {
      setDeletingKey(null);
    }
  };

  const totalNotes = Object.keys(noteMap).filter((k) => noteMap[k]?.content).length;

  const blocks = [
    { index: -1, title: "ملاحظات عامة على الكورس 📌" },
    ...(course?.chapters || []).map((ch, i) => ({ index: i, title: ch.title || `الفصل ${i + 1}` })),
  ];

  return (
    <div>
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <StickyNote className="w-5 h-5 text-accent" />
          <h2 className="font-extrabold text-lg">ملاحظاتي</h2>
          {totalNotes > 0 && (
            <span className="text-xs bg-accent/15 text-accent border border-accent/25 rounded-full px-2 py-0.5 font-bold">
              {totalNotes} ملاحظة
            </span>
          )}
        </div>
        <p className="text-xs text-muted-foreground">تدعم Markdown: **عريض** `كود` - قائمة</p>
      </div>

      <div className="space-y-4">
        {blocks.map((block) => {
          const hasNote = !!noteMap[block.index]?.content;
          const isPreviewing = previewMode[block.index];
          const content = valueFor(block.index);
          const dirty = isDirty(block.index);

          return (
            <motion.div
              key={block.index}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn(
                "glass-card rounded-3xl p-5 border transition-colors",
                hasNote ? "border-accent/30" : "border-border",
                dirty && "border-primary/40"
              )}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <StickyNote className={cn("w-4 h-4", hasNote ? "text-accent" : "text-muted-foreground")} />
                  <h3 className="font-extrabold text-sm line-clamp-1">{block.title}</h3>
                  {dirty && <span className="text-[10px] text-primary font-bold bg-primary/10 px-2 py-0.5 rounded-full">غير محفوظ</span>}
                </div>
                <div className="flex items-center gap-1">
                  {hasNote && (
                    <button
                      onClick={() => setPreviewMode((p) => ({ ...p, [block.index]: !p[block.index] }))}
                      className="p-1.5 rounded-lg hover:bg-border text-muted-foreground hover:text-foreground transition-colors"
                      title={isPreviewing ? "تعديل" : "معاينة"}
                    >
                      {isPreviewing ? <Edit3 className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                    </button>
                  )}
                  {hasNote && (
                    <button
                      onClick={() => deleteNote(block.index)}
                      disabled={deletingKey === block.index}
                      className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors"
                    >
                      {deletingKey === block.index ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Trash2 className="w-3.5 h-3.5" />}
                    </button>
                  )}
                </div>
              </div>

              <AnimatePresence mode="popLayout" initial={false}>
                {isPreviewing && hasNote ? (
                  <motion.div
                    key="preview"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="prose prose-sm max-w-none text-foreground bg-secondary/30 rounded-xl p-4 min-h-16"
                  >
                    <ReactMarkdown>{content}</ReactMarkdown>
                  </motion.div>
                ) : (
                  <motion.div key="edit" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                    <Textarea
                      value={content}
                      onChange={(e) => setDrafts((prev) => ({ ...prev, [block.index]: e.target.value }))}
                      placeholder={block.index === -1 ? "اكتب ملاحظاتك العامة هنا... (يدعم **Markdown**)" : "ملاحظتك على هذا الفصل..."}
                      className="min-h-28 bg-secondary/40 border-border resize-y mb-3 text-sm"
                      dir="auto"
                    />
                    <div className="flex items-center gap-2">
                      <Button
                        onClick={() => save(block.index)}
                        disabled={savingKey === block.index || !content.trim()}
                        size="sm"
                        className={cn("gap-2 font-bold", dirty ? "neon-glow-cyan" : "")}
                      >
                        {savingKey === block.index ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileSaveIcon size={16} />}
                        حفظ
                      </Button>
                      {content.trim() && (
                        <span className="text-xs text-muted-foreground">{content.trim().split(/\s+/).length} كلمة</span>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}