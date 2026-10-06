import React, { useState } from "react";
import { 
  FileText, Presentation, Archive, Code2, 
  CheckCircle2, Download, Loader2, HardDrive,
  Sparkles, Bot, Send
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { playClick, playSuccess } from "@/lib/sounds";
import { useLocale } from "@/lib/LocaleContext";
import { toast } from "sonner";

function ExportProgress({ progress, isEn }) {
  return (
    <div className="space-y-1" aria-live="polite">
      <div className="flex items-center justify-between gap-2 text-[10px] font-bold text-white/70">
        <span>{progress?.detail || "…"}</span>
        <span className="tabular-nums font-mono">{progress?.percent ?? 0}%</span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-black/50 border border-white/10">
        <div
          className="h-full w-full origin-left rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-transform duration-300"
          style={{ transform: `scaleX(${(progress?.percent ?? 0) / 100})` }}
        />
      </div>
    </div>
  );
}

export function ImageExportPanel({
  images = [],
  fileName = "extracted_session",
  onExportZip,
  onExportPptx,
  onExportPdf,
  onExportJson,
  onSaveToLibrary,
  onSaveToPlatformQuiz,
  onExportTelegram,
  onProgress,
  isSaved = false,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [exportingType, setExportingType] = useState(null);
  const [progress, setProgress] = useState(null); // {stage, percent, detail}

  const keptImages = images.filter((img) => img.status !== "rejected");
  const totalQuizzes = keptImages.reduce((sum, img) => sum + (img.quiz?.length || 0), 0);

  const handleAction = async (type, fn) => {
    try {
      playClick();
      setExportingType(type);
      setProgress({ percent: 2, detail: isEn ? "Starting…" : "جاري البدء…" });
      // Exports report {stage, percent, detail} through their 3rd arg;
      // the panel renders it live under the active button.
      await fn((p) => {
        setProgress(p);
        onProgress?.(p);
      });
      playSuccess();
    } catch (err) {
      toast.error(err?.message || "حدث خطأ أثناء التصدير");
    } finally {
      setExportingType(null);
      setProgress(null);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6" dir={dir}>
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-[#0a0b12] border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h3 className="text-xl font-black text-white font-heading flex items-center gap-2">
            <Download className="w-5 h-5 text-primary" />
            <span>{isEn ? "Export & Save Package 📦" : "تصدير وحفظ الحزمة العلمية 📦"}</span>
          </h3>
          <p className="text-xs text-white/60">
            {isEn ? (
              <>You have <strong className="text-emerald-400 font-mono">{keptImages.length} scientific images</strong> and <strong className="text-primary font-mono">{totalQuizzes} interactive quiz questions</strong> ready for download.</>
            ) : (
              <>لديك <strong className="text-emerald-400 font-mono">{keptImages.length} صورة علمية</strong> مع <strong className="text-primary font-mono">{totalQuizzes} سؤال كويز تفاعلي</strong> جاهزة للتحميل والحفظ</>
            )}
          </p>
        </div>

        {/* Save to Local Library Button */}
        <Button
          type="button"
          onClick={() => handleAction("save", onSaveToLibrary)}
          disabled={exportingType === "save" || isSaved}
          className="h-11 px-6 rounded-2xl font-black text-xs bg-emerald-500 hover:bg-emerald-600 text-black shadow-lg gap-2"
        >
          {exportingType === "save" ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : isSaved ? (
            <CheckCircle2 className="w-4 h-4 text-black" />
          ) : (
            <HardDrive className="w-4 h-4" />
          )}
          <span>{isSaved ? (isEn ? "Saved to Library ✓" : "تم الحفظ في مكتبتك المحلية ✓") : (isEn ? "Save to Local Library (IndexedDB)" : "حفظ في مكتبتي المحلية (IndexedDB)")}</span>
        </Button>
      </div>

      {/* Export Options Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Save to Platform Quiz Bank */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-fuchsia-500/25 flex flex-col justify-between space-y-4 hover:border-fuchsia-500/60 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-fuchsia-500/10 border border-fuchsia-500/30 flex items-center justify-center text-fuchsia-400">
              <Sparkles className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "Save to My Quiz Bank (Cloud) 🎯" : "حفظ الكويز في حسابي (بنك الكويزات السحابي) 🎯"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "Save this entire practical quiz to your Black Fighters profile. Solve it anytime, review explanations, or challenge colleagues."
                : "حفظ الكويز العملي كاملاً في حسابك الأكاديمي، لتمتحنه في أي وقت أو تراجعه وتتحدى به زملاءك في غرف التحدي."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("cloudSave", onSaveToPlatformQuiz)}
            disabled={exportingType === "cloudSave" || !totalQuizzes}
            className="w-full h-10 rounded-xl text-xs font-bold border-fuchsia-500/40 text-fuchsia-300 hover:bg-fuchsia-500/15 gap-2"
          >
            {exportingType === "cloudSave" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
            <span>{isEn ? "Save to Platform Quizzes" : "حفظ الكويز بالمنصة 🎯"}</span>
          </Button>
        </div>

        {/* Telegram Bot Interactive Quiz Export */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-[#0088cc]/30 flex flex-col justify-between space-y-4 hover:border-[#0088cc]/60 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-[#0088cc]/10 border border-[#0088cc]/30 flex items-center justify-center text-[#0088cc]">
              <Bot className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "Interactive Telegram Bot Quiz 🤖" : "كويز تفاعلي على بوت التيليجرام (@black_fighters_bot) 🤖"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "Export questions directly into Telegram as native Quiz Polls with 100% verified answers and explanation cards."
                : "تصدير الأسئلة لبوت التيليجرام بنظام Quiz Polls التفاعلي، مع مطابقة الإجابات الصحيحة 100% وإمكانية الحل الفوري!"}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("telegram", onExportTelegram)}
            disabled={exportingType === "telegram" || !totalQuizzes}
            className="w-full h-10 rounded-xl text-xs font-bold border-[#0088cc]/40 text-[#0088cc] hover:bg-[#0088cc]/15 gap-2"
          >
            {exportingType === "telegram" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
            <span>{isEn ? "Export to Telegram Bot 🤖" : "تصدير للبوت (@black_fighters_bot) 🤖"}</span>
          </Button>
        </div>

        {/* PDF Export */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-white/10 flex flex-col justify-between space-y-4 hover:border-red-500/40 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-red-500/10 border border-red-500/30 flex items-center justify-center text-red-400">
              <FileText className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "Complete Study PDF Document" : "مستند PDF دراسي كامل"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "Organized page for each image with explanations, quiz questions, and answer rationales in a print-ready format."
                : "صفحة منظمة لكل صورة مع شروحاتها وأسئلة الكويز وتفسير الإجابات، بتنسيق جاهز للطباعة والمذاكرة الورقية."}
            </p>
          </div>

          {exportingType === "pdf" && <ExportProgress progress={progress} isEn={isEn} />}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("pdf", onExportPdf)}
            disabled={!!exportingType || !keptImages.length}
            className="w-full h-10 rounded-xl text-xs font-bold border-red-500/30 text-red-300 hover:bg-red-500/10 gap-2"
          >
            {exportingType === "pdf" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exportingType === "pdf"
              ? (progress?.percent != null ? `${progress.percent}%` : (isEn ? "Working…" : "جاري التنفيذ…"))
              : (isEn ? "Download PDF Document" : "تحميل ملف PDF")}</span>
          </Button>
        </div>

        {/* PPTX Export */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-white/10 flex flex-col justify-between space-y-4 hover:border-orange-500/40 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Presentation className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "PowerPoint Presentation (PPTX)" : "عرض PowerPoint (PPTX)"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "Organized slides containing high-res images and questions, with original lecture explanations preserved in Speaker Notes."
                : "سلايدات منظمة تحوي الصور عالية الدقة والأسئلة مع حفظ شروحات المحاضرة الأصلية في ملاحظات العارض (Speaker Notes)."}
            </p>
          </div>

          {exportingType === "pptx" && <ExportProgress progress={progress} isEn={isEn} />}
          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("pptx", onExportPptx)}
            disabled={!!exportingType || !keptImages.length}
            className="w-full h-10 rounded-xl text-xs font-bold border-orange-500/30 text-orange-300 hover:bg-orange-500/10 gap-2"
          >
            {exportingType === "pptx" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{exportingType === "pptx"
              ? (progress?.percent != null ? `${progress.percent}%` : (isEn ? "Working…" : "جاري التنفيذ…"))
              : (isEn ? "Download PPTX File" : "تحميل ملف PPTX")}</span>
          </Button>
        </div>

        {/* ZIP Archive Export */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-white/10 flex flex-col justify-between space-y-4 hover:border-emerald-500/40 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 flex items-center justify-center text-emerald-400">
              <Archive className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "Compressed Image Archive (ZIP)" : "أرشيف الصور المضغوط (ZIP)"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "ZIP archive containing all approved images in full resolution, organized by page number, along with metadata.json."
                : "ملف مضغوط يحتوي على جميع الصور العلمية المقبولة بدقتها الكاملة وأسماء مفهرسة حسب الصفحة، مع ملف metadata.json."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("zip", onExportZip)}
            disabled={exportingType === "zip" || !keptImages.length}
            className="w-full h-10 rounded-xl text-xs font-bold border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/10 gap-2"
          >
            {exportingType === "zip" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isEn ? "Download ZIP Archive" : "تحميل أرشيف الصور (ZIP)"}</span>
          </Button>
        </div>

        {/* JSON Quiz Export */}
        <div className="p-5 rounded-2xl bg-[#0a0b12] border border-white/10 flex flex-col justify-between space-y-4 hover:border-cyan-500/40 transition-colors group">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
              <Code2 className="w-5 h-5" />
            </div>
            <h4 className="text-sm font-black text-white font-heading">
              {isEn ? "Standard Quiz Bank (Quiz JSON)" : "بنك الأسئلة الموحد (Quiz JSON)"}
            </h4>
            <p className="text-xs text-white/55 leading-relaxed">
              {isEn
                ? "Standard JSON schema compatible with platform question banks, ready for sharing or importing into study challenge rooms."
                : "تصدير بصيغة JSON قياسية متوافقة مع بنك أسئلة المنصة، لمشاركتها مع زملائك أو استيرادها في غرف التحدي وغرف المذاكرة."}
            </p>
          </div>

          <Button
            type="button"
            variant="outline"
            onClick={() => handleAction("json", onExportJson)}
            disabled={exportingType === "json" || !totalQuizzes}
            className="w-full h-10 rounded-xl text-xs font-bold border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 gap-2"
          >
            {exportingType === "json" ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-3.5 h-3.5" />}
            <span>{isEn ? "Download Quiz JSON" : "تحميل ملف JSON"}</span>
          </Button>
        </div>
      </div>
    </div>
  );
}

export default ImageExportPanel;
