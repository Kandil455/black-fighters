import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import { Loader2, Trash2, ChevronDown, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { AnimatedTheoryQuiz } from "@/components/ui/AnimatedMicroIcons";

import QuizGeneratorPanel from "@/components/quiz/QuizGeneratorPanel";
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
    <div className="relative max-w-5xl mx-auto overflow-hidden" dir={dir}>
      {/* خلفية متوهّجة متحركة */}
      <motion.div
        aria-hidden
        className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-primary/20 blur-3xl"
        animate={{ scale: [1, 1.3, 1], opacity: [0.25, 0.5, 0.25], x: [0, 30, 0], y: [0, 20, 0] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        aria-hidden
        className="pointer-events-none absolute top-40 -left-20 w-64 h-64 rounded-full bg-accent/20 blur-3xl"
        animate={{ scale: [1, 1.25, 1], opacity: [0.2, 0.45, 0.2], x: [0, -25, 0], y: [0, -20, 0] }}
        transition={{ duration: 9, repeat: Infinity, ease: "easeInOut", delay: 1 }}
      />

      <motion.div
        className="flex items-center gap-3 mb-2 relative"
        initial={{ opacity: 0, y: -24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 16 }}
      >
        <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 border border-indigo-500/30 flex items-center justify-center shadow-lg shadow-indigo-500/10">
          <AnimatedTheoryQuiz size={30} />
        </div>
        <div>
          <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/25 text-[10px] font-mono font-bold tracking-wider mb-1">
            <Sparkles className="w-3 h-3" />
            <span>EBE • END BLOCK EXAM</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black text-foreground studio-headline-gradient heading-display">
            {isEn ? "Theory Quiz Generator (EBE)" : "أنشئ كويز نظري (EBE)"}
          </h1>
          <p className="text-xs sm:text-sm text-muted-foreground font-medium">
            {isEn 
              ? "Generate and extract theory MCQs & exam simulations from text, lecture notes and documents"
              : "امتحانات البلوكات والأسئلة النظرية — توليد واستخراج أسئلة MCQ دقيقة من ملفاتك ومذكراتك لجميع التخصصات"}
          </p>
        </div>
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
