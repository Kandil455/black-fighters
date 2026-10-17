import React, { useState, useEffect, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from "@/api/base44Client";
import {
  Loader2,
  Trash2,
  ChevronDown,
  Brain,
  RotateCcw,
  Send,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { TheoryQuizIcon } from "@/components/ui/icons";

import QuizGeneratorPanel from "@/components/quiz/QuizGeneratorPanel";
import QuizCard from "@/components/quiz/QuizCard";
import ModernQuizView from "@/components/course/ModernQuizView";
import PullToRefresh from "@/components/PullToRefresh";
import { useLocale } from "@/lib/LocaleContext";
import {
  getMistakeVaultItems,
  clearMistakeVault,
  resolveMistake,
} from "@/lib/mistakeVault";
import { invokeSecureFunction } from "@/lib/secureFunctions";

export default function Quizzes() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const location = useLocation();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [visibleCount, setVisibleCount] = useState(12);
  const [mistakeItems, setMistakeItems] = useState(() => getMistakeVaultItems());
  const [practicingMistakes, setPracticingMistakes] = useState(false);
  const [sendingMistakesToBot, setSendingMistakesToBot] = useState(false);

  const refreshMistakes = useCallback(() => {
    setMistakeItems(getMistakeVaultItems());
  }, []);

  useEffect(() => {
    refreshMistakes();
    const handler = () => refreshMistakes();
    window.addEventListener("bf:mistake-vault-updated", handler);
    return () => window.removeEventListener("bf:mistake-vault-updated", handler);
  }, [refreshMistakes]);

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
    if (
      !confirm(
        isEn
          ? `Are you sure you want to delete "${quiz.title}"?`
          : `متأكد تحذف "${quiz.title}"؟`,
      )
    )
      return;
    await base44.entities.StandaloneQuiz.delete(quiz.id);
    toast.success(isEn ? "Quiz deleted" : "اتحذف الكويز");
    qc.invalidateQueries({ queryKey: ["my-quizzes"] });
  };

  const handleToggleSelect = (quizId) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(quizId)) next.delete(quizId);
      else next.add(quizId);
      return next;
    });
  };

  const handleBulkDelete = async () => {
    if (selectedIds.size === 0) return;
    if (
      !confirm(
        isEn
          ? `Are you sure you want to delete ${selectedIds.size} selected quizzes?`
          : `متأكد تحذف ${selectedIds.size} كويز محدد؟`,
      )
    )
      return;

    const idsToDelete = Array.from(selectedIds);
    setSelectedIds(new Set());
    toast.promise(
      Promise.all(idsToDelete.map((id) => base44.entities.StandaloneQuiz.delete(id))),
      {
        loading: isEn ? "Deleting quizzes..." : "جاري حذف الكويزات...",
        success: () => {
          qc.invalidateQueries({ queryKey: ["my-quizzes"] });
          return isEn
            ? `${idsToDelete.length} quizzes deleted successfully`
            : `تم حذف ${idsToDelete.length} كويز بنجاح`;
        },
        error: isEn ? "Error while deleting" : "حصل خطأ أثناء الحذف",
      },
    );
  };

  const handleSendMistakesToTelegram = async () => {
    if (!mistakeItems.length || sendingMistakesToBot) return;
    setSendingMistakesToBot(true);
    try {
      const res = await invokeSecureFunction("export-to-telegram", {
        title: "بنك الأخطاء الذكي — تدريب مركز",
        type: "quiz",
        questions: mistakeItems.slice(0, 15),
        deliveryMode: "polls",
      });
      if (res?.data?.success) {
        toast.success(
          res.data.message ||
            "تم إرسال أسئلة بنك الأخطاء كاستطلاعات Quiz Polls حية إلى شات التيليجرام! 🎯",
        );
      } else {
        toast.error(res?.data?.message || "اربط حسابك بالبوت أولاً لإرسال بنك الأخطاء 🤖");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "تعذر إرسال الأخطاء للبوت");
    } finally {
      setSendingMistakesToBot(false);
    }
  };

  return (
    <PullToRefresh onRefresh={() => qc.invalidateQueries({ queryKey: ["my-quizzes"] })}>
      <div className="max-w-5xl mx-auto space-y-6 relative" dir={dir}>
        {/* Header */}
        <div className="glass rounded-[1.25rem] p-6 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-[#19f08c]/10 border border-[#19f08c]/30 flex items-center justify-center text-[#19f08c]">
              <TheoryQuizIcon size={26} />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-black text-[#f5f7fa]">
                {isEn ? "Interactive Quizzes & Mistake Vault" : "الكويزات التفاعلية وبنك الأخطاء الذكي"}
              </h1>
              <p className="text-xs sm:text-sm text-[#9aa4b2] mt-0.5">
                {isEn
                  ? "Generate AI quizzes, export live Telegram Quiz Polls, and master your weak points."
                  : "ولّد كويزات ذكية من ملفاتك، أرسلها كاستطلاعات Quiz Polls في تيليجرام، وتدرّب على بنك أخطائك."}
              </p>
            </div>
          </div>
        </div>

        {/* Unified Mistake Vault Section */}
        <div className="glass rounded-[1.25rem] p-5 border border-[#f59e0b]/30 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-[#f59e0b]/15 border border-[#f59e0b]/35 flex items-center justify-center text-[#f59e0b]">
                <Brain className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-black text-[#f5f7fa]">
                    {isEn ? "Unified Mistake Vault" : "بنك الأخطاء الذكي الموحد (Mistake Vault)"}
                  </h2>
                  <span className="text-xs font-mono font-bold text-[#f59e0b]">
                    {mistakeItems.length} {isEn ? "questions" : "سؤال مسجل"}
                  </span>
                </div>
                <p className="text-xs text-[#9aa4b2]">
                  {isEn
                    ? "Automatically collects wrong answers from course quizzes, summary drills, and bot sessions."
                    : "يجمع تلقائياً أي سؤال أخطأت فيه داخل الكورسات أو الملخصات لتعيد التدرب عليه حتى الإتقان."}
                </p>
              </div>
            </div>

            {mistakeItems.length > 0 && (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  size="sm"
                  onClick={() => setPracticingMistakes((v) => !v)}
                  className="gap-1.5 bg-[#19f08c] text-[#03150c] hover:bg-[#19f08c]/90 font-bold rounded-xl"
                >
                  {practicingMistakes ? (
                    <>
                      <X className="w-4 h-4" />
                      {isEn ? "Close Drill" : "إغلاق التدريب"}
                    </>
                  ) : (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      {isEn
                        ? `Practice Mistakes (${mistakeItems.length})`
                        : `ابدأ كويز تصحيح الأخطاء (${mistakeItems.length})`}
                    </>
                  )}
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  disabled={sendingMistakesToBot}
                  onClick={handleSendMistakesToTelegram}
                  className="gap-1.5 border-[#19f08c]/35 text-[#19f08c] hover:bg-[#19f08c]/10 font-bold rounded-xl"
                >
                  {sendingMistakesToBot ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  {isEn ? "Send to Telegram Polls" : "إرسال كـ Quiz Polls للبوت 🤖"}
                </Button>

                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    clearMistakeVault();
                    toast.success("تم تفريغ بنك الأخطاء");
                  }}
                  className="text-xs text-[#9aa4b2] hover:text-[#ef4444]"
                >
                  {isEn ? "Clear All" : "مسح السجل"}
                </Button>
              </div>
            )}
          </div>

          {practicingMistakes && mistakeItems.length > 0 ? (
            <div className="pt-3 border-t border-white/[0.07]">
              <ModernQuizView
                quiz={{ questions: mistakeItems }}
                course={{ id: "mistake_vault", title: "بنك الأخطاء الذكي" }}
              />
            </div>
          ) : mistakeItems.length > 0 ? (
            <div className="grid gap-2.5 sm:grid-cols-2 pt-2">
              {mistakeItems.slice(0, 4).map((item) => (
                <div
                  key={item.id}
                  className="rounded-xl border border-white/[0.07] bg-[#05070a] p-3.5 flex items-start justify-between gap-3"
                >
                  <div className="space-y-1 min-w-0">
                    <div className="text-[11px] text-[#9aa4b2] flex items-center gap-1.5">
                      <span className="text-[#19f08c] font-bold truncate">{item.topic}</span>
                      <span>·</span>
                      <span className="font-mono text-[10px]">
                        تكرر {item.mistakeCount || 1}×
                      </span>
                    </div>
                    <p className="text-xs font-bold text-[#f5f7fa] line-clamp-2">{item.question}</p>
                    <p className="text-[11px] text-[#19f08c] truncate">
                      ✓ الإجابة: {item.options?.[item.correct_index]}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      resolveMistake(item.id);
                      toast.success("تم تعليم السؤال كمتقن ✅");
                    }}
                    className="text-[11px] font-bold text-[#9aa4b2] hover:text-[#19f08c] shrink-0 cursor-pointer"
                    title="إزالة بعد الإتقان"
                  >
                    أتقنته ✓
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-[#9aa4b2]">
              {isEn
                ? "No mistakes recorded yet — any question you miss in quizzes or summary drills will appear here automatically."
                : "سجلك نظيف حالياً! أي سؤال تخطئ فيه أثناء حل الكويزات أو اختبارات الملخص سيظهر هنا تلقائياً لتراجعه."}
            </p>
          )}
        </div>

        <QuizGeneratorPanel />

        <div className="flex items-center justify-between mb-4 relative">
          <h2 className="text-lg font-black text-[#f5f7fa]">
            {isEn ? "My Quizzes" : "كويزاتي المحفوظة"}
          </h2>
          {selectedIds.size > 0 && (
            <Button
              variant="destructive"
              size="sm"
              onClick={handleBulkDelete}
              className="gap-2 font-bold"
            >
              <Trash2 className="w-4 h-4" />
              {isEn ? `Delete Selected (${selectedIds.size})` : `حذف المحددة (${selectedIds.size})`}
            </Button>
          )}
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="w-7 h-7 animate-spin text-[#19f08c]" />
          </div>
        ) : quizzes.length === 0 ? (
          <div className="text-center py-12 text-[#9aa4b2] glass rounded-2xl border border-white/[0.07]">
            {isEn
              ? "No quizzes created yet — start from the generator above 👆"
              : "لسه معملتش كويزات — ولّد أول كويز من اللوحة فوق 👆"}
          </div>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4 relative">
            {visibleQuizzes.map((quiz) => (
              <QuizCard
                key={quiz.id}
                quiz={quiz}
                onDelete={handleDelete}
                isSelected={selectedIds.has(quiz.id)}
                onToggleSelect={handleToggleSelect}
              />
            ))}
          </div>
        )}
        {!isLoading && quizzes.length > visibleCount && (
          <div className="mt-6 flex justify-center">
            <Button
              variant="outline"
              onClick={() => setVisibleCount((count) => count + 12)}
              className="gap-2 font-bold"
            >
              <ChevronDown className="h-4 w-4" />
              {isEn ? "Load more quizzes" : "تحميل كويزات أكثر"}
            </Button>
          </div>
        )}
      </div>
    </PullToRefresh>
  );
}
