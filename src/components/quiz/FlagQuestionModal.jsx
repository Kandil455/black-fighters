import React, { useState } from "react";
import { motion } from "framer-motion";
import { Flag, X, AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { base44 } from "@/api/base44Client";
import { useLocale } from "@/lib/LocaleContext";
import { motionTokens } from "@/lib/motionTokens";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export function FlagQuestionModal({
  isOpen,
  onClose,
  question,
  quizId = null,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const flagReasons = [
    { id: "wrong_answer", label: isEn ? "Correct answer specified is scientifically wrong" : "الإجابة الصحيحة المحددة خاطئة علمياً" },
    { id: "unclear_stem", label: isEn ? "Question stem is confusing or vague" : "صياغة السؤال غير واضحة أو مبهمة" },
    { id: "asymmetric_options", label: isEn ? "Options are asymmetrical or give away the answer" : "الخيارات غير متكافئة أو تفضح الإجابة" },
    { id: "typo", label: isEn ? "Typo, grammatical mistake, or poor translation" : "خطأ إملائي أو ترجمة ركيكة" },
    { id: "other", label: isEn ? "Other reason" : "سبب آخر" },
  ];

  const [selectedReason, setSelectedReason] = useState("wrong_answer");
  const [comment, setComment] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = async (e) => {
    e?.preventDefault();
    if (!question) return;

    try {
      setSubmitting(true);
      playClick();
      const me = await base44.auth.me().catch(() => null);

      await base44.entities.FlaggedQuestion?.create({
        user_id: me?.id || "anonymous",
        user_email: me?.email || null,
        quiz_id: quizId || null,
        question_text: question?.question || "",
        options: question?.options || [],
        correct_index: question?.correct_index ?? 0,
        reason: selectedReason,
        comment: comment.trim(),
        created_at: new Date().toISOString(),
        status: "pending_review",
      }).catch(() => {});

      setSubmitted(true);
      playSuccess();
      toast.success(isEn ? "Thank you! Your flag has been submitted for review ✓" : "شكراً لك! تم إرسال البلاغ لمراجعة المشرفين ✓");

      setTimeout(() => {
        setSubmitted(false);
        setComment("");
        onClose();
      }, 1200);
    } catch (err) {
      toast.error(isEn ? "Failed to send report; please try again later" : "فشل إرسال البلاغ؛ يرجى المحاولة لاحقاً");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md" dir={dir}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95 }}
        transition={motionTokens.base}
        className="w-full max-w-lg rounded-3xl bg-[#0b0c16] border border-white/15 p-6 shadow-2xl space-y-4 text-start"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div className="flex items-center gap-2 text-amber-400 font-black text-sm sm:text-base font-heading">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>{isEn ? "Report Question Issue" : "الإبلاغ عن مشكلة في السؤال"}</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/60 hover:text-white"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Question snippet */}
        <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/10 text-xs text-white/80 line-clamp-2 leading-relaxed">
          {question?.question}
        </div>

        {/* Reason options */}
        <div className="space-y-2 pt-1">
          <p className="text-xs font-bold text-white/70">{isEn ? "What is the issue?" : "ما هي المشكلة بالضبط؟"}</p>
          <div className="space-y-1.5">
            {flagReasons.map((r) => (
              <label
                key={r.id}
                onClick={() => setSelectedReason(r.id)}
                className={cn(
                  "flex items-center gap-3 p-3 rounded-2xl border text-xs font-bold cursor-pointer transition-colors",
                  selectedReason === r.id
                    ? "border-amber-500/50 bg-amber-500/10 text-amber-300"
                    : "border-white/10 bg-white/[0.02] text-white/70 hover:bg-white/5"
                )}
              >
                <input
                  type="radio"
                  name="flag_reason"
                  checked={selectedReason === r.id}
                  onChange={() => setSelectedReason(r.id)}
                  className="w-4 h-4 accent-amber-400"
                />
                <span>{r.label}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Comment */}
        <div className="space-y-1.5">
          <p className="text-xs font-bold text-white/70">{isEn ? "Additional Details (Optional)" : "تفاصيل إضافية (اختياري)"}</p>
          <Textarea
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            placeholder={isEn ? "Briefly explain the issue or suggest a correction..." : "اشرح المشكلة باختصار أو اكتب التصحيح المقترح..."}
            rows={2}
            className="bg-white/[0.02] border-white/10 text-xs text-white rounded-xl focus:border-amber-400"
          />
        </div>

        {/* Footer buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-white/10">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="text-xs text-white/60 hover:text-white"
          >
            {isEn ? "Cancel" : "إلغاء"}
          </Button>

          <Button
            type="button"
            onClick={handleSubmit}
            disabled={submitting}
            success={submitted}
            className="h-10 px-5 rounded-xl font-black text-xs bg-amber-500 hover:bg-amber-600 text-black shadow-lg gap-1.5"
          >
            <Flag className="w-3.5 h-3.5" />
            <span>{submitting ? (isEn ? "Submitting..." : "جاري الإرسال...") : submitted ? (isEn ? "Submitted ✓" : "تم الإرسال ✓") : (isEn ? "Submit Report" : "إرسال البلاغ")}</span>
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

export default FlagQuestionModal;
