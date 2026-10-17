import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Trash2, ChevronDown, FileText } from "@/components/ui/animatedIcons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

import QuizGeneratorPanel from "@/components/quiz/QuizGeneratorPanel";
import TxtQuizDropzone from "@/components/quiz/TxtQuizDropzone";
import QuizCard from "@/components/quiz/QuizCard";
import PullToRefresh from "@/components/PullToRefresh";
import { useLocale } from "@/lib/LocaleContext";

export default function Quizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const [txtOpen, setTxtOpen] = useState(false);

  // If practical mode was requested via query param, redirect immediately to dedicated practical page
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.get("mode") === "practical") {
      navigate("/practical", { replace: true });
    }
  }, [location.search, navigate]);

  const { data: quizzes = [], isLoading } = useQuery({
    queryKey: ["my-quizzes"],
    queryFn: async () => {
      const me = await base44.auth.me();
      return base44.entities.StandaloneQuiz.filter({ owner_id: me.id }, "-created_date", 50);
    },
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    refetchOnWindowFocus: false,
  });

  const visibleQuizzes = quizzes.slice(0, visibleCount);

  const handleDelete = async (quiz) => {
    if (!confirm(isEn ? `Are you sure you want to delete "${quiz.title}"?` : `متأكد تحذف "${quiz.title}"؟`)) return;
    await base44.entities.StandaloneQuiz.delete(quiz.id);
    toast.success(isEn ? "Quiz deleted" : "اتحذف الكويز");
    qc.invalidateQueries({ queryKey: ["my-quizzes"] });
  };

  const handleToggleSelect = (quizId) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(quizId)) next.delete(quizId);
      else next.add(quizId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (!confirm(isEn ? `Are you sure you want to delete ${selectedIds.size} quizzes?` : `متأكد تحذف ${selectedIds.size} كويز؟`)) return;
    try {
      const promises = Array.from(selectedIds).map(id => base44.entities.StandaloneQuiz.delete(id));
      await Promise.all(promises);
      toast.success(isEn ? "Deleted successfully" : "تم الحذف بنجاح");
      setSelectedIds(new Set());
      qc.invalidateQueries({ queryKey: ["my-quizzes"] });
    } catch (err) {
      toast.error(isEn ? "Failed to delete" : "حصل مشكلة في الحذف");
    }
  };

  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["my-quizzes"] })}>
    <div className="max-w-5xl mx-auto space-y-6" dir={dir}>
      <div className="bf-hd">
        <span className="mono">
          {isEn ? "THEORY QUIZ ENGINE" : "إنشاء كويز نظري"}
        </span>
        <h1 className="serif">
          {isEn ? "Quizzes from your " : "كويز من "}
          <em style={{ color: "var(--sig)" }}>
            {isEn ? "Materials." : "مادتك."}
          </em>
        </h1>
        <p style={{ color: "var(--mute)", fontSize: "0.92rem" }}>
          {isEn 
            ? "Generate and practice exam MCQs extracted with precision from your notes and lectures."
            : "اختار المصدر ونوع الأسئلة، والكويز يتولد من محتوى الملف مش من معلومات عامة."}
        </p>
      </div>

      {/* ── TXT-to-Quiz Express Lane ─────────────────────────── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, type: "spring", stiffness: 220, damping: 22 }}
        style={{
          border: "1.5px solid var(--line)",
          borderRadius: 14,
          background: "var(--paper2)",
          overflow: "hidden",
        }}
      >
        {/* header toggle */}
        <button
          type="button"
          onClick={() => setTxtOpen((v) => !v)}
          style={{
            width: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "1rem 1.25rem",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            textAlign: "start",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: ".7rem" }}>
            <span style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              width: 34, height: 34,
              borderRadius: 8,
              background: "color-mix(in srgb, var(--sig) 12%, transparent)",
              color: "var(--sig)",
            }}>
              <FileText style={{ width: 18, height: 18 }} />
            </span>
            <div style={{ textAlign: "start" }}>
              <p style={{ fontWeight: 900, fontSize: ".95rem", color: "var(--ink)", margin: 0, lineHeight: 1.2 }}>
                {isEn ? "TXT → Quiz (Instant)" : "TXT → كويز فوري"}
              </p>
              <p style={{ fontSize: ".75rem", color: "var(--mute)", margin: 0 }}>
                {isEn
                  ? "Drop any .txt file — questions extracted in seconds, 0 credits if Q&A format"
                  : "حط أي ملف .txt — أسئلة في ثواني، مجاني لو كان بنك أسئلة"}
              </p>
            </div>
          </div>
          <ChevronDown
            style={{
              width: 18, height: 18,
              color: "var(--mute)",
              transform: txtOpen ? "rotate(180deg)" : "rotate(0deg)",
              transition: "transform .25s",
              flexShrink: 0,
            }}
          />
        </button>

        {/* expandable body */}
        <AnimatePresence initial={false}>
          {txtOpen && (
            <motion.div
              key="txt-body"
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.28, ease: "easeInOut" }}
              style={{ overflow: "hidden" }}
            >
              <div style={{ padding: "0 1.25rem 1.25rem" }}>
                <TxtQuizDropzone />
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <motion.div
        className="mt-6 mb-10 relative"
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ delay: 0.12, type: "spring", stiffness: 180, damping: 18 }}
      >
        <QuizGeneratorPanel />
      </motion.div>

      <div className="flex items-center justify-between mb-4 relative">
        <motion.h2
          className="text-lg font-black"
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.2 }}
        >
          {isEn ? "My Quizzes" : "كويزاتي"}
        </motion.h2>
        {selectedIds.size > 0 && (
          <Button variant="destructive" size="sm" onClick={handleBulkDelete} className="gap-2 font-bold animate-in fade-in zoom-in duration-200">
            <Trash2 className="w-4 h-4" />
            {isEn ? `Delete Selected (${selectedIds.size})` : `حذف المحددة (${selectedIds.size})`}
          </Button>
        )}
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12"><Loader2 className="w-7 h-7 animate-spin text-primary" /></div>
      ) : quizzes.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-12 text-muted-foreground glass-card rounded-2xl border border-border relative"
        >
          {isEn ? "No quizzes created yet — start from above 👆" : "لسه معملتش كويزات — ابدأ من فوق 👆"}
        </motion.div>
      ) : (
        <motion.div
          className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 relative"
          variants={{ hidden: {}, show: { transition: { staggerChildren: 0.09, delayChildren: 0.25 } } }}
          initial="hidden"
          animate="show"
        >
          {visibleQuizzes.map((quiz) => (
            <QuizCard 
              key={quiz.id} 
              quiz={quiz} 
              onDelete={handleDelete}
              isSelected={selectedIds.has(quiz.id)}
              onToggleSelect={handleToggleSelect}
            />
          ))}
        </motion.div>
      )}
      {!isLoading && quizzes.length > visibleCount && (
        <div className="mt-6 flex justify-center">
          <Button variant="outline" onClick={() => setVisibleCount((count) => count + 12)} className="gap-2 font-bold">
            <ChevronDown className="h-4 w-4" />
            {isEn ? "Load more quizzes" : "تحميل كويزات أكثر"}
          </Button>
        </div>
      )}
    </div>
    </PullToRefresh>
  );
}
