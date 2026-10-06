import React, { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { 
  Filter, Flag, CheckCircle2, ArrowDown, 
  Trash2, User
} from "lucide-react";
import { base44 } from "@/api/base44Client";
import { fetchFunnelMetrics } from "@/lib/analytics";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

export function AdminFunnelView() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const { data: steps = [], isLoading } = useQuery({
    queryKey: ["adminFunnelMetrics"],
    queryFn: fetchFunnelMetrics,
  });

  return (
    <div className="space-y-6" dir={dir}>
      <div className="glass-card rounded-3xl p-6 border border-primary/20 shadow-xl space-y-2">
        <div className="flex items-center gap-2 text-primary font-black text-lg">
          <Filter className="w-5 h-5" />
          <span>{isEn ? "User Retention Funnel" : "مسار تحويل المستخدمين (User Retention Funnel)"}</span>
        </div>
        <p className="text-xs text-muted-foreground leading-relaxed">
          {isEn 
            ? "Visualizes student progression between signup, creating first course, quiz completion, and daily reviews."
            : "يوضح أين يسقط الطلاب بين خطوة التسجيل وإنشاء أول كورس وإكمال أول كويز والمراجعة اليومية."}
        </p>
      </div>

      <div className="space-y-3">
        {steps.map((step, idx) => {
          const widthPct = Math.max(15, step.rate);

          return (
            <div key={step.id} className="relative">
              <div className="glass-card rounded-2xl p-4 border border-white/10 hover:border-primary/30 transition-colors space-y-2">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-2.5">
                    <span className="w-7 h-7 rounded-xl bg-primary/10 border border-primary/25 flex items-center justify-center font-mono font-bold text-xs text-primary">
                      {idx + 1}
                    </span>
                    <span className="text-sm font-bold text-white">{step.label}</span>
                  </div>

                  <div className="flex items-center gap-3 text-xs font-mono">
                    <span className="text-white/60">{step.count} طالب</span>
                    <span className="px-2 py-0.5 rounded-full bg-primary/15 text-primary font-bold border border-primary/30">
                      {step.rate}%
                    </span>
                  </div>
                </div>

                {/* Visual Progress Bar */}
                <div className="h-3 rounded-full bg-secondary/50 overflow-hidden relative">
                  <motion.div
                    initial={{ clipPath: "inset(0% 100% 0% 0%)" }}
                    animate={{ clipPath: `inset(0% ${100 - widthPct}% 0% 0%)` }}
                    transition={{ duration: 0.8, delay: idx * 0.1, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary"
                  />
                </div>
              </div>

              {idx < steps.length - 1 && (
                <div className="flex justify-center my-1 opacity-40">
                  <ArrowDown className="w-3.5 h-3.5 text-primary" />
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function AdminFlaggedQuestionsView() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState("pending_review");

  const { data: reports = [], isLoading, refetch } = useQuery({
    queryKey: ["adminFlaggedQuestions"],
    queryFn: async () => {
      return base44.entities.FlaggedQuestion?.filter({}, "-created_at", 100).catch(() => []);
    },
  });

  const updateStatus = async (id, status) => {
    try {
      await base44.entities.FlaggedQuestion.update(id, { status });
      toast.success(isEn ? "Status updated" : "تم تحديث الحالة");
      refetch();
    } catch {
      toast.error(isEn ? "Failed to update" : "فشل التحديث");
    }
  };

  const deleteReport = async (id) => {
    try {
      await base44.entities.FlaggedQuestion.delete(id);
      toast.success(isEn ? "Report deleted" : "تم حذف البلاغ");
      refetch();
    } catch {
      toast.error(isEn ? "Failed to delete" : "فشل الحذف");
    }
  };

  const filtered = reports.filter((r) => (filter === "all" ? true : r.status === filter));

  return (
    <div className="space-y-6" dir={dir}>
      <div className="glass-card rounded-3xl p-6 border border-amber-500/20 shadow-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-amber-400 font-black text-lg">
            <Flag className="w-5 h-5" />
            <span>{isEn ? `Question Quality Reports (${reports.length})` : `بلاغات جودة الأسئلة (${reports.length})`}</span>
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            {isEn 
              ? "Review student reports on inaccurate questions or questionable answers."
              : "مراجعة ملاحظات الطلاب على الأسئلة غير الدقيقة أو الإجابات المشكوك بصحتها."}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setFilter("pending_review")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors",
              filter === "pending_review"
                ? "bg-amber-500/20 text-amber-300 border-amber-500/40"
                : "bg-white/5 text-white/60 border-white/10"
            )}
          >
            قيد المراجعة
          </button>
          <button
            type="button"
            onClick={() => setFilter("all")}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors",
              filter === "all"
                ? "bg-primary/20 text-cyan-300 border-primary/40"
                : "bg-white/5 text-white/60 border-white/10"
            )}
          >
            الكل ({reports.length})
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground glass-card rounded-3xl border border-white/10">
          <CheckCircle2 className="w-10 h-10 mx-auto mb-2 text-emerald-400 opacity-60" />
          <p className="font-bold text-sm">لا توجد بلاغات معلقة حالياً!</p>
          <p className="text-xs opacity-60">جميع أسئلة الطلاب نظيفة أو تم اعتمادها.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filtered.map((r) => (
            <div
              key={r.id}
              className="glass-card rounded-3xl p-5 sm:p-6 border border-white/10 space-y-3 shadow-lg"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 border border-amber-500/30 text-amber-300">
                    {r.reason}
                  </span>
                  {r.user_email && (
                    <span className="text-xs text-white/50 font-mono flex items-center gap-1">
                      <User className="w-3 h-3" />
                      {r.user_email}
                    </span>
                  )}
                  <span className="text-[10px] text-white/30 font-mono">
                    {r.created_at ? new Date(r.created_at).toLocaleDateString("ar-EG") : ""}
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  {r.status !== "resolved" && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateStatus(r.id, "resolved")}
                      className="h-8 text-xs font-bold border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5 ml-1" />
                      تم الحل
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => deleteReport(r.id)}
                    className="h-8 text-xs text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-white/[0.02] border border-white/10 text-xs sm:text-sm font-bold text-white leading-relaxed">
                {r.question_text}
              </div>

              {r.comment && (
                <div className="text-xs text-white/70 bg-secondary/30 p-2.5 rounded-xl border border-white/5">
                  <strong className="text-amber-400">ملاحظة الطالب: </strong>
                  {r.comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
