import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import {
  Brain,
  Share2,
  Trash2,
  Users,
  Check,
  Swords,
  CheckSquare,
  Square,
  Play,
  Send,
  Loader2,
} from "lucide-react";
import { toast } from "sonner";
import QuizExportButton from "@/components/quiz/QuizExportButton";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { openTelegramLinkWithCode } from "@/lib/telegramClient";
import { cn } from "@/lib/utils";

export default function QuizCard({ quiz, onDelete, isSelected, onToggleSelect }) {
  const navigate = useNavigate();
  const [copied, setCopied] = useState(false);
  const [sendingTelegram, setSendingTelegram] = useState(false);

  const handleShare = async (e) => {
    e.stopPropagation();
    const url = `${window.location.origin}/q/${quiz.id}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      toast.success("اتنسخ لينك الكويز ✅ ابعته لأي حد");
      setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("معرفناش ننسخ اللينك");
    }
  };

  const handleSendToTelegram = async (e) => {
    e.stopPropagation();
    if (sendingTelegram) return;
    setSendingTelegram(true);
    try {
      const res = await invokeSecureFunction("export-to-telegram", {
        title: quiz.title || "كويز تفاعلي",
        type: "quiz",
        questions: quiz.questions || [],
        quizId: quiz.id,
        deliveryMode: "both",
      });
      if (res?.data?.success) {
        toast.success(res.data.message || "تم إرسال الكويز واستطلاعات Quiz Polls إلى تيليجرام! 🤖");
      } else if (res?.data?.error === "NO_TELEGRAM_LINKED") {
        toast.error(res.data.message, {
          action: {
            label: "ربط البوت",
            onClick: () => {
              openTelegramLinkWithCode().catch((err) =>
                toast.error(err?.message || "تعذر إنشاء كود الربط"),
              );
            },
          },
        });
      } else {
        toast.error(res?.data?.message || "تعذر إرسال الكويز للبوت");
      }
    } catch (err) {
      toast.error(err?.response?.data?.message || err?.message || "حصل خطأ في إرسال الكويز للبوت");
    } finally {
      setSendingTelegram(false);
    }
  };

  return (
    <div
      onClick={() => navigate(`/q/${quiz.id}`)}
      className={cn(
        "relative glass rounded-[1.25rem] p-5 border transition-colors cursor-pointer group overflow-hidden",
        isSelected
          ? "border-[#ef4444]/80 bg-[#ef4444]/5"
          : "border-white/[0.07] hover:border-[#19f08c]/45",
      )}
    >
      <div className="flex items-start justify-between mb-3 relative">
        <div className="flex items-center gap-2">
          {onToggleSelect && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                onToggleSelect(quiz.id);
              }}
              className="text-[#9aa4b2] hover:text-[#ef4444] transition-colors z-10 p-1 cursor-pointer"
            >
              {isSelected ? (
                <CheckSquare className="w-5 h-5 text-[#ef4444]" />
              ) : (
                <Square className="w-5 h-5" />
              )}
            </div>
          )}
          <div className="w-11 h-11 rounded-xl bg-[#19f08c]/10 border border-[#19f08c]/25 flex items-center justify-center text-[#19f08c]">
            <Brain className="w-5 h-5" />
          </div>
        </div>
        <div className="flex items-center gap-1">
          <Button
            size="icon"
            variant="ghost"
            disabled={sendingTelegram}
            className="h-8 w-8 text-[#19f08c] hover:text-[#19f08c] hover:bg-[#19f08c]/10"
            title="إرسال الكويز كاستطلاعات Quiz Polls إلى تيليجرام"
            onClick={handleSendToTelegram}
          >
            {sendingTelegram ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
          <QuizExportButton quiz={quiz} />
          <Button
            size="icon"
            variant="ghost"
            className="h-8 w-8 text-[#9aa4b2] hover:text-[#19f08c]"
            onClick={handleShare}
          >
            {copied ? <Check className="w-4 h-4 text-[#19f08c]" /> : <Share2 className="w-4 h-4" />}
          </Button>
          {onDelete && (
            <Button
              size="icon"
              variant="ghost"
              className="h-8 w-8 text-[#9aa4b2] hover:text-[#ef4444]"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(quiz);
              }}
            >
              <Trash2 className="w-4 h-4" />
            </Button>
          )}
        </div>
      </div>

      <h3 className="font-extrabold text-base text-[#f5f7fa] mb-1 line-clamp-1">{quiz.title}</h3>
      <div className="flex items-center gap-2 text-xs text-[#9aa4b2] mb-3 font-mono tabular-nums">
        <span>{quiz.questions?.length || 0} سؤال</span>
        <span aria-hidden="true">·</span>
        <span className="flex items-center gap-1">
          <Users className="w-3 h-3" /> {quiz.attempts_count || 0} محاولة
        </span>
      </div>

      <Button
        size="sm"
        className="w-full mb-2 gap-1.5 font-black text-xs bg-[#19f08c] text-[#03150c] hover:bg-[#19f08c]/90 rounded-xl"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/q/${quiz.id}`);
        }}
      >
        <Play className="w-3.5 h-3.5 fill-current" /> ابدأ الحل
      </Button>
      <Button
        size="sm"
        variant="outline"
        className="w-full gap-1.5 font-bold text-xs border-white/[0.1] text-[#f5f7fa] hover:border-[#19f08c]/40 hover:text-[#19f08c] rounded-xl"
        onClick={(e) => {
          e.stopPropagation();
          navigate(`/challenge/new/${quiz.id}`);
        }}
      >
        <Swords className="w-3.5 h-3.5" /> ابدأ تحدّي
      </Button>
    </div>
  );
}
