import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileCheck2, FileQuestion, Loader2, Bot, Send } from "lucide-react";
import { toast } from "sonner";
import { exportQuizPdf } from "@/lib/quizPdf";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { openTelegramLinkWithCode } from "@/lib/telegramClient";

export default function QuizExportButton({ quiz, variant = "icon", className = "" }) {
  const [busy, setBusy] = useState(false);

  const handleExport = async (withAnswers) => {
    if (!quiz?.questions?.length) {
      toast.error("الكويز مفيهوش أسئلة للتصدير");
      return;
    }
    setBusy(true);
    const t = toast.loading(withAnswers ? "بنجهّز PDF بالإجابات..." : "بنجهّز PDF بالأسئلة...");
    try {
      await exportQuizPdf(quiz, { withAnswers });
      toast.success("تم تحميل الـ PDF ✅", { id: t });
    } catch (e) {
      toast.error("حصل خطأ في التصدير", { id: t });
    } finally {
      setBusy(false);
    }
  };

  const handleSendToTelegram = async (e) => {
    e.stopPropagation();
    if (!quiz?.questions?.length) {
      toast.error("الكويز مفيهوش أسئلة لإرسالها للتيليجرام");
      return;
    }
    setBusy(true);
    const t = toast.loading("بنبعت الكويز واستطلاعات Quiz Polls لبوت التيليجرام... 🤖");
    try {
      const res = await invokeSecureFunction("export-to-telegram", {
        title: quiz.title || "كويز Black Fighters",
        type: "quiz",
        questions: quiz.questions,
        quizId: quiz.id || null,
        deliveryMode: "both",
      });
      if (res.data?.success) {
        toast.success(res.data.message || "تم إرسال الكويز للتيليجرام بنجاح! 🎯", { id: t });
      } else if (res.data?.error === "NO_TELEGRAM_LINKED") {
        toast.error(res.data.message || "حسابك غير مربوط بالتيليجرام", {
          id: t,
          action: {
            label: "ربط البوت",
            onClick: () => openTelegramLinkWithCode().catch((err) => toast.error(err?.message || "تعذر إنشاء كود الربط")),
          },
        });
      } else {
        toast.error(res.data?.message || "فشل إرسال الكويز للتيليجرام", { id: t });
      }
    } catch (err) {
      const msg = err?.response?.data?.message || err?.message || "";
      if (msg.includes("غير مربوط") || msg.includes("NO_TELEGRAM_LINKED")) {
        toast.error("حسابك غير مربوط بالتيليجرام! اربطه الأول 🤖", {
          id: t,
          action: {
            label: "ربط البوت",
            onClick: () => openTelegramLinkWithCode().catch((e2) => toast.error(e2?.message || "تعذر إنشاء كود الربط")),
          },
        });
      } else {
        toast.error(msg || "حصل خطأ في التصدير للتيليجرام", { id: t });
      }
    } finally {
      setBusy(false);
    }
  };

  const handleOpenTelegram = (e) => {
    e.stopPropagation();
    if (!quiz?.id) {
      toast.error("الكويز غير متاح للربط بالتيليجرام");
      return;
    }
    const url = `https://t.me/Black_Fighters_FREE_bot?start=quiz_${quiz.id}`;
    window.open(url, "_blank");
    toast.success("🚀 تم فتح الكويز على بوت التيليجرام (@Black_Fighters_FREE_bot)!");
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        {variant === "icon" ? (
          <Button size="icon" variant="ghost" className={`h-8 w-8 text-muted-foreground hover:text-accent ${className}`}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
          </Button>
        ) : (
          <Button variant="outline" className={`gap-2 font-bold ${className}`} disabled={busy}>
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            تصدير
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" onClick={(e) => e.stopPropagation()}>
        <DropdownMenuItem onClick={handleSendToTelegram} className="gap-2 cursor-pointer bg-primary/10 text-primary focus:bg-primary/20">
          <Send className="w-4 h-4 text-primary" />
          <div>
            <p className="font-bold text-sm">إرسال الكويز للتيليجرام 🤖</p>
            <p className="text-[11px] text-muted-foreground">إرسال استطلاعات Quiz Polls للشات</p>
          </div>
        </DropdownMenuItem>
        {quiz?.id && (
          <DropdownMenuItem onClick={handleOpenTelegram} className="gap-2 cursor-pointer">
            <Bot className="w-4 h-4 text-emerald-400" />
            <div>
              <p className="font-bold text-sm">فتح الكويز في البوت مباشر 🚀</p>
              <p className="text-[11px] text-muted-foreground">تشغيل على @Black_Fighters_FREE_bot</p>
            </div>
          </DropdownMenuItem>
        )}
        <DropdownMenuItem onClick={() => handleExport(false)} className="gap-2 cursor-pointer">
          <FileQuestion className="w-4 h-4 text-accent" />
          <div>
            <p className="font-bold text-sm">تصدير PDF (أسئلة فقط)</p>
            <p className="text-[11px] text-muted-foreground">بدون إجابات — للامتحان</p>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleExport(true)} className="gap-2 cursor-pointer">
          <FileCheck2 className="w-4 h-4 text-green-500" />
          <div>
            <p className="font-bold text-sm">تصدير PDF (أسئلة + إجابات)</p>
            <p className="text-[11px] text-muted-foreground">مع الحل والشرح</p>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
