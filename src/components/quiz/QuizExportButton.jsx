import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, FileCheck2, FileQuestion, Loader2, Bot } from "lucide-react";
import { toast } from "sonner";
import { exportQuizPdf } from "@/lib/quizPdf";

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

  const handleOpenTelegram = (e) => {
    e.stopPropagation();
    if (!quiz?.id) {
      toast.error("الكويز غير متاح للربط بالتيليجرام");
      return;
    }
    const url = `https://t.me/black_fighters_bot?start=quiz_${quiz.id}`;
    window.open(url, "_blank");
    toast.success("🚀 تم فتح الكويز على بوت التيليجرام (@black_fighters_bot)!");
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
        <DropdownMenuItem onClick={handleOpenTelegram} className="gap-2 cursor-pointer bg-primary/10 text-primary focus:bg-primary/20">
          <Bot className="w-4 h-4 text-primary animate-pulse" />
          <div>
            <p className="font-bold text-sm">امتحان الكويز على التليجرام 🤖</p>
            <p className="text-[11px] text-muted-foreground">تشغيل تفاعلي على @black_fighters_bot</p>
          </div>
        </DropdownMenuItem>
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