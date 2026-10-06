import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Download, FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadSummaryPdf } from "@/lib/summaryPdf";
import StudyContent from "@/components/course/StudyContent";
import { useLocale } from "@/lib/LocaleContext";

export default function PdfTextResult({ title, text, markdown, onDownload, analysis, coverage }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [exporting, setExporting] = useState(false);
  if (!text) return null;

  const exportPdf = async () => {
    setExporting(true);
    try {
      const size = await downloadSummaryPdf({ title, markdown: text });
      toast.success(isEn ? `PDF downloaded (${(size / 1024 / 1024).toFixed(2)}MB)` : `تم تنزيل PDF بحجم ${(size / 1024 / 1024).toFixed(2)}MB`);
    } catch (error) {
      toast.error(error.message || (isEn ? "Failed to export PDF" : "فشل تصدير PDF"));
    } finally {
      setExporting(false);
    }
  };

  return (
    <div className="glass-card neon-glow-green rounded-3xl p-7 border border-[hsl(152,100%,50%)]/30 mt-8" dir={dir}>
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <h3 className="font-extrabold text-lg text-[hsl(152,100%,50%)]">{title}</h3>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => { navigator.clipboard.writeText(text); toast.success(isEn ? "Copied to clipboard!" : "اتنسخ!"); }}>
            <Copy className="w-3.5 h-3.5" /> {isEn ? "Copy" : "نسخ"}
          </Button>
          <Button variant="outline" size="sm" className="gap-1.5" onClick={() => onDownload(text)}>
            <Download className="w-3.5 h-3.5" /> {isEn ? "Download TXT" : "تنزيل TXT"}
          </Button>
          {markdown && (
            <Button variant="outline" size="sm" className="gap-1.5" onClick={exportPdf} disabled={exporting}>
              {exporting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileDown className="w-3.5 h-3.5" />}
              {isEn ? "Export PDF" : "PDF خفيف"}
            </Button>
          )}
        </div>
      </div>
      {(analysis || coverage) && (
        <div className="mb-5 grid grid-cols-2 sm:grid-cols-4 gap-2">
          {analysis && <>
            <Stat label={isEn ? "Est. Pages" : "صفحات تقديرية"} value={analysis.estimatedPages} />
            <Stat label={isEn ? "Processed Chunks" : "أجزاء معالجة"} value={analysis.estimatedChunks} />
            <Stat label={isEn ? "Language" : "لغة"} value={analysis.language === "bilingual" ? (isEn ? "Bilingual" : "ثنائي") : analysis.language.toUpperCase()} />
          </>}
          {coverage && <Stat label={isEn ? "Concept Coverage" : "تغطية المفاهيم"} value={`${coverage.score}%`} warn={coverage.score < 70} />}
          {coverage?.definitionCount > 0 && <Stat label={isEn ? "Missing Defs" : "تعريفات لم تُغطَّ"} value={coverage.missingDefinitions?.length || 0} warn={coverage.missingDefinitions?.length > 0} />}
          {coverage?.formulaCount > 0 && <Stat label={isEn ? "Missing Formulas" : "قوانين لم تُغطَّ"} value={coverage.missingFormulas?.length || 0} warn={coverage.missingFormulas?.length > 0} />}
          {coverage?.sourcePages > 0 && <Stat label={isEn ? "Cited Pages" : "صفحات بمراجع"} value={`${coverage.citedPages}/${coverage.sourcePages}`} warn={!coverage.citedPages} />}
        </div>
      )}
      {markdown ? (
        /<\/?[a-z][\s\S]*>/i.test(text) ? (
          <div className="prose prose-invert max-w-none prose-headings:text-primary prose-strong:text-accent max-h-[32rem] overflow-y-auto" dangerouslySetInnerHTML={{ __html: text }} />
        ) : (
          <StudyContent content={text} />
        )
      ) : (
        <pre className="whitespace-pre-wrap text-sm leading-relaxed font-body max-h-[28rem] overflow-y-auto">{text}</pre>
      )}
    </div>
  );
}

function Stat({ label, value, warn }) {
  return (
    <div className="rounded-xl border border-border bg-secondary/25 p-2.5 text-center">
      <p className={`font-black ${warn ? "text-yellow-400" : "text-foreground"}`}>{value}</p>
      <p className="text-[10px] text-muted-foreground">{label}</p>
    </div>
  );
}
