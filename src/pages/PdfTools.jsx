import React, { useState, useRef } from "react";
import { motion } from "framer-motion";
import { functions } from '@/api/index';
import { Button } from "@/components/ui/button";
import { Scissors, Minimize2, Wand2, Loader2, Download, FileText, Trash2, ScanText, Combine, RotateCw, Image, BookOpen, ArrowUpDown, Hash, Images } from "lucide-react";
import { toast } from "sonner";
import PdfToolCard from "@/components/pdf/PdfToolCard";
import PdfUploadPanel from "@/components/pdf/PdfUploadPanel";
import PdfTextResult from "@/components/pdf/PdfTextResult";
import SummaryTemplateSelector from "@/components/pdf/SummaryTemplateSelector";
import { extractTextFromFile, runPdfOperation, downloadBytes } from "@/lib/fileProcessing";
import { generateHierarchicalSummary } from "@/lib/summaryPipeline";
import { recognizeFile } from "@/lib/ocr";
import { SUMMARY_TEMPLATES, SUBJECT_TYPES } from "@/lib/summaryTemplates";
import { KineticHeading, KineticParagraph } from "@/components/ui/KineticTextReveal";
import { useLocale } from "@/lib/LocaleContext";

const RAW_TOOLS = [
  { id: "summarize", categoryAr: "AI", categoryEn: "AI", labelAr: "تلخيص PDF", labelEn: "PDF Summary", descAr: "ملخص واضح بنقاط وأهم الأفكار", descEn: "Clear bullet points with high-yield concepts", icon: BookOpen, color: "text-primary", border: "border-primary/30", glow: "hover:neon-glow-cyan", uploadHintAr: "اختار PDF أو صورة أو ملف نصي للتلخيص", uploadHintEn: "Select PDF, image, or text file to summarize" },
  { id: "ocr", categoryAr: "AI", categoryEn: "AI", labelAr: "استخراج نص", labelEn: "OCR Text Extraction", descAr: "OCR للنصوص من PDF أو صور أو سكان", descEn: "Extract text from scanned PDFs & images", icon: ScanText, color: "text-[hsl(152,100%,50%)]", border: "border-[hsl(152,100%,50%)]/30", glow: "hover:neon-glow-green", uploadHintAr: "اختار PDF أو صورة لاستخراج النص", uploadHintEn: "Select PDF or image for OCR text extraction" },
  { id: "organize", categoryAr: "AI", categoryEn: "AI", labelAr: "تنظيم وتلوين", labelEn: "Organize & Highlight", descAr: "ينظم المحتوى كملخص مذاكرة جميل", descEn: "Formats content into structured study notes", icon: Wand2, color: "text-[hsl(152,100%,50%)]", border: "border-[hsl(152,100%,50%)]/30", glow: "hover:neon-glow-green", uploadHintAr: "اختار PDF / Word / PPT / TXT / صورة", uploadHintEn: "Select PDF / Word / PPT / TXT / Image" },
  { id: "merge", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "دمج ملفات", labelEn: "Merge PDFs", descAr: "اجمع كذا PDF في ملف واحد", descEn: "Combine multiple PDF files into one", icon: Combine, color: "text-primary", border: "border-primary/30", glow: "hover:neon-glow-cyan", uploadHintAr: "اختار ملفين PDF أو أكثر", uploadHintEn: "Select 2 or more PDF files" },
  { id: "split", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "تقسيم PDF", labelEn: "Split PDF", descAr: "قسّم كل صفحة أو ranges منفصلة", descEn: "Extract individual pages or ranges", icon: FileText, color: "text-accent", border: "border-accent/30", glow: "hover:neon-glow-purple", uploadHintAr: "اختار PDF للتقسيم", uploadHintEn: "Select PDF to split" },
  { id: "extract", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "قص صفحات", labelEn: "Extract Pages", descAr: "استخرج صفحات معينة من الـ PDF", descEn: "Pick and save specific pages", icon: Scissors, color: "text-primary", border: "border-primary/30", glow: "hover:neon-glow-cyan", uploadHintAr: "اختار PDF وحدد الصفحات", uploadHintEn: "Select PDF and specify pages" },
  { id: "remove", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "حذف صفحات", labelEn: "Delete Pages", descAr: "امسح صفحات مش محتاجها", descEn: "Remove unwanted pages from PDF", icon: Trash2, color: "text-destructive", border: "border-destructive/30", glow: "hover:neon-glow-purple", uploadHintAr: "اختار PDF وحدد صفحات الحذف", uploadHintEn: "Select PDF and specify pages to delete" },
  { id: "rotate", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "تدوير صفحات", labelEn: "Rotate Pages", descAr: "لف الصفحات 90 / 180 / 270 درجة", descEn: "Rotate pages 90 / 180 / 270 degrees", icon: RotateCw, color: "text-accent", border: "border-accent/30", glow: "hover:neon-glow-purple", uploadHintAr: "اختار PDF للتدوير", uploadHintEn: "Select PDF to rotate" },
  { id: "reorder", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "ترتيب الصفحات", labelEn: "Reorder Pages", descAr: "غيّر ترتيب كل الصفحات بسهولة", descEn: "Reorganize page order seamlessly", icon: ArrowUpDown, color: "text-primary", border: "border-primary/30", glow: "hover:border-primary/50", uploadHintAr: "اختار PDF واكتب ترتيب الصفحات", uploadHintEn: "Select PDF and set page sequence" },
  { id: "pageNumbers", categoryAr: "تعديل", categoryEn: "Edit", labelAr: "ترقيم الصفحات", labelEn: "Page Numbers", descAr: "أضف أرقام صفحات وتوقيعًا اختياريًا", descEn: "Add headers, page numbers & signature", icon: Hash, color: "text-accent", border: "border-accent/30", glow: "hover:border-accent/50", uploadHintAr: "اختار PDF لإضافة الترقيم", uploadHintEn: "Select PDF to number pages" },
  { id: "compress", categoryAr: "تحويل", categoryEn: "Convert", labelAr: "ضغط PDF", labelEn: "Compress PDF", descAr: "تقليل الحجم بإعادة بناء الملف", descEn: "Reduce file size while preserving quality", icon: Minimize2, color: "text-accent", border: "border-accent/30", glow: "hover:neon-glow-purple", uploadHintAr: "اختار PDF للضغط", uploadHintEn: "Select PDF to compress" },
  { id: "imagePdf", categoryAr: "تحويل", categoryEn: "Convert", labelAr: "صور إلى PDF", labelEn: "Images to PDF", descAr: "حوّل صورة أو أكثر إلى ملف PDF", descEn: "Convert single or multiple images to PDF", icon: Image, color: "text-primary", border: "border-primary/30", glow: "hover:neon-glow-cyan", uploadHintAr: "اختار صور PNG أو JPG أو WEBP", uploadHintEn: "Select PNG, JPG, or WEBP images" },
  { id: "pdfToImages", categoryAr: "تحويل", categoryEn: "Convert", labelAr: "PDF إلى صور", labelEn: "PDF to Images", descAr: "نزّل كل صفحة كصورة JPG واضحة", descEn: "Export every page as a high-res JPG", icon: Images, color: "text-primary", border: "border-primary/30", glow: "hover:border-primary/50", uploadHintAr: "اختار PDF لتحويل صفحاته", uploadHintEn: "Select PDF to extract images" },
];

// الأنواع المدعومة لكل أداة — شاملة كل أنواع الصور
const ACCEPT = {
  ocr: ".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff",
  summarize: ".pdf,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.txt,.docx,.pptx,.csv,.html,.md",
  organize: ".pdf,.pptx,.docx,.txt,.png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff,.csv,.html,.md",
  imagePdf: ".png,.jpg,.jpeg,.webp,.bmp,.gif,.tif,.tiff",
  default: ".pdf",
};

export default function PdfTools() {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const TOOLS = React.useMemo(() => RAW_TOOLS.map(t => ({
    ...t,
    label: isEn ? t.labelEn : t.labelAr,
    desc: isEn ? t.descEn : t.descAr,
    category: isEn ? t.categoryEn : t.categoryAr,
    uploadHint: isEn ? t.uploadHintEn : t.uploadHintAr,
  })), [isEn]);

  const fileRef = useRef(null);
  const [toolId, setToolId] = useState("summarize");
  const [files, setFiles] = useState([]);
  const [pages, setPages] = useState("");
  const [angle, setAngle] = useState(90);
  const [compressionMode, setCompressionMode] = useState("smallest");
  const [watermark, setWatermark] = useState("");
  const [working, setWorking] = useState(false);
  const [result, setResult] = useState(null);
  const [workProgress, setWorkProgress] = useState(null);
  const abortRef = useRef(null);

  // إعدادات التلخيص
  const [summaryTemplate, setSummaryTemplate] = useState("exam_revision_sheet");
  const [summarySubject, setSummarySubject] = useState("auto");
  const [summaryColorLevel, setSummaryColorLevel] = useState("medium");

  const tool = TOOLS.find((t) => t.id === toolId);
  const multi = toolId === "merge" || toolId === "imagePdf";
  const file = files[0];
  const isAiTool = toolId === "summarize" || toolId === "organize";

  const selectTool = (id) => {
    setToolId(id);
    setFiles([]);
    setPages("");
    setResult(null);
  };

  const downloadText = (text) => {
    const url = URL.createObjectURL(new Blob([text], { type: "text/plain;charset=utf-8" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = toolId === "summarize" ? "pdf-summary.txt" : "extracted-text.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  const run = async () => {
    if (!file) return toast.error("اختار ملف الأول");
    if (toolId === "merge" && files.length < 2) return toast.error("اختار ملفين على الأقل للدمج");
    setWorking(true);
    setResult(null);
    setWorkProgress(null);
    abortRef.current = new AbortController();
    let chargedJob = null;

    try {
      if (toolId === "ocr") {
        const text = await recognizeFile(file, {
          signal: abortRef.current.signal,
          onProgress: (progress, current, total) => setWorkProgress({ phase: "ocr", progress, current, total }),
        });
        setResult({ type: "ocr", text, markdown: false });
        toast.success("النص اتسحب بنجاح!");
      } else if (toolId === "summarize" || toolId === "organize") {
        let text;
        try {
          text = await extractTextFromFile(file, {
            onProgress: ({ current, total }) => setWorkProgress({ phase: "extract", progress: Math.round((current / total) * 100), current, total }),
          });
        } catch (error) {
          if (/صور|scanned|مفيهوش نص|معرفناش نقرأ نص/i.test(error.message)) {
            toast.info("الملف مصوّر أو صورة — بنشغّل OCR تلقائياً");
            text = await recognizeFile(file, {
              signal: abortRef.current.signal,
              onProgress: (progress, current, total) => setWorkProgress({ phase: "ocr", progress, current, total }),
            });
          } else throw error;
        }
        if (!text || text.trim().length < 50) throw new Error("المحتوى قصير جداً أو الملف لا يحتوي على نص مفيد");
        chargedJob = { jobKey: crypto.randomUUID() };
        const charge = await functions.invoke("chargeAiJob", {
          action: "charge", jobKey: chargedJob.jobKey, task: "summary", charCount: text.length,
        });
        chargedJob.cost = charge.data.cost;

        // تحديد القالب والمادة
        const selectedTemplate = toolId === "organize" ? "complete_study_guide" : summaryTemplate;
        const subjectObj = SUBJECT_TYPES.find(s => s.value === summarySubject) || SUBJECT_TYPES[0];
        const templateObj = SUMMARY_TEMPLATES.find(t => t.value === selectedTemplate) || SUMMARY_TEMPLATES[0];

        // بناء التعليمات
        const colorInstruction = summaryColorLevel === "none"
          ? "لا تستخدم ==highlight== أو ألوان. استخدم **Bold** فقط للمفاهيم المهمة."
          : summaryColorLevel === "medium"
          ? "استخدم 2-3 Highlights فقط في كل قسم وبألوان دلالية مختلفة عند توفر أنواع مختلفة: ==cyan:مصطلح إنجليزي أو علمي==، ==green:تعريف أو نتيجة==، ==yellow:حقيقة أساسية==، ==orange:مثال==، ==red:تحذير أو استثناء==. لا تلوّن جملة كاملة أو علامات الترقيم، ولا تجعل لوناً واحداً يسيطر على الصفحة. استخدم **Bold** لبقية المهم."
          : "استخدم ألواناً دلالية منظمة: ==cyan:مصطلح== و==green:تعريف== و==yellow:حقيقة مهمة== و==orange:مثال== و==red:تحذير==. لوّن الكلمات والعبارات القصيرة فقط، ونوّع الألوان حسب المعنى مع ترك مساحات نصية غير ملونة.";

        const generated = await generateHierarchicalSummary({
          text,
          fileName: file.name,
          style: selectedTemplate,
          stylePrompt: `${subjectObj.prompt} ${templateObj.prompt} ${colorInstruction}`,
          maxPages: toolId === "organize" ? 20 : 8,
          colorLevel: summaryColorLevel,
          signal: abortRef.current.signal,
          onProgress: (state) => setWorkProgress(state),
          invoke: async (payload) => {
            const res = await functions.invoke("aiGenerate", {
              ...payload,
              stylePrompt: `${subjectObj.prompt} ${templateObj.prompt} ${colorInstruction}`,
            }, { timeout: 120_000 });
            if (res.data?.error) throw new Error(res.data.error);
            return res.data?.result || { summary_markdown: res.data?.text || "" };
          },
        });
        if (generated.resumed) {
          await functions.invoke("chargeAiJob", { action: "refund", jobKey: chargedJob.jobKey, cost: chargedJob.cost }).catch(() => {});
          toast.info("تم استرجاع النتيجة المحفوظة بدون خصم كريدتس");
        } else {
          await functions.invoke("chargeAiJob", { action: "finalize", jobKey: chargedJob.jobKey }).catch(() => {});
        }
        chargedJob = null;
        setResult({ type: toolId, text: generated.summary, document: generated.document || null, markdown: true, analysis: generated.analysis, coverage: generated.coverage });
        toast.success(toolId === "summarize" ? "الملخص جاهز! 🎉" : "اتنظم بنجاح! 🎉");
      } else {
        if ((toolId === "extract" || toolId === "remove") && !pages.trim()) {
          throw new Error("اكتب أرقام الصفحات (مثلاً: 1-3,5)");
        }
        const outputs = await runPdfOperation({
          operation: toolId, files, pages: pages.trim(), angle, compressionMode, watermark,
          onProgress: ({ current, total }) => setWorkProgress({ phase: toolId, current, total }),
        });
        outputs.forEach((item) => downloadBytes(item.bytes, item.filename, item.type || "application/pdf"));
        if (toolId === "split") toast.success(`اتقسم إلى ${outputs.length} ملفات`);
        else if (toolId === "compress") {
          const outputSize = outputs[0].bytes.length / 1024 / 1024;
          toast.success(`الحجم الجديد ${outputSize.toFixed(2)}MB بدل ${(file.size / 1024 / 1024).toFixed(2)}MB`);
        }
        else toast.success("اتعمل وانتزّل!");
      }
    } catch (err) {
      if (chargedJob) {
        await functions.invoke("chargeAiJob", { action: "refund", jobKey: chargedJob.jobKey, cost: chargedJob.cost }).catch(() => {});
      }
      const msg = err.response?.data?.error || err.message;
      toast.error(msg === "NO_API_KEY" ? "خدمة المعالجة الذكية قيد التحديث المؤقت — يرجى المحاولة بعد قليل" : msg || "حصل خطأ");
    } finally {
      setWorking(false);
      abortRef.current = null;
    }
  };

  return (
    <div dir={dir} className="max-w-7xl mx-auto">
      <div className="mb-8 space-y-1.5">
        <KineticHeading 
          text={isEn ? "PDF & Document Studio 🛠️" : "لوحة أدوات ومستندات PDF 🛠️"} 
          className="text-3xl md:text-4xl font-black heading-display studio-headline-gradient" 
          highlightWords={['PDF', '🛠️', 'Studio']} 
        />
        <KineticParagraph className="text-sm text-muted-foreground">
          {isEn 
            ? "Summarize, OCR, merge, split, compress, and convert documents in one unified studio"
            : "تلخيص، استخراج نص، دمج، تقسيم، ضغط وتحويل ملفات في مكان واحد"}
        </KineticParagraph>
      </div>

      <div className="grid lg:grid-cols-[1.2fr_.8fr] gap-6 items-start">
        <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {TOOLS.map((item, i) => (
            <PdfToolCard key={item.id} tool={item} active={toolId === item.id} index={i} onSelect={selectTool} />
          ))}
        </div>

        <motion.div key={toolId} initial={{ opacity: 0, x: -16 }} animate={{ opacity: 1, x: 0 }} className="glass-card rounded-3xl p-6 border border-primary/30 lg:sticky lg:top-6">
          <div className="flex items-start gap-3 mb-5">
            <tool.icon className={`w-7 h-7 ${tool.color}`} />
            <div>
              <h2 className="text-xl font-black">{tool.label}</h2>
              <p className="text-sm text-muted-foreground">{tool.desc}</p>
            </div>
          </div>

          <PdfUploadPanel
            fileRef={fileRef}
            files={files}
            tool={tool}
            accept={ACCEPT[toolId] || ACCEPT.default}
            multiple={multi}
            pages={pages}
            setPages={setPages}
            angle={angle}
            setAngle={setAngle}
            compressionMode={compressionMode}
            setCompressionMode={setCompressionMode}
            watermark={watermark}
            setWatermark={setWatermark}
            onFiles={setFiles}
          />

          {/* إعدادات التلخيص — تظهر فقط لأدوات الـ AI */}
          {isAiTool && toolId !== "organize" && (
            <SummaryTemplateSelector
              template={summaryTemplate}
              setTemplate={setSummaryTemplate}
              subject={summarySubject}
              setSubject={setSummarySubject}
              colorLevel={summaryColorLevel}
              setColorLevel={setSummaryColorLevel}
            />
          )}

          <Button onClick={run} disabled={working} className="w-full h-12 font-bold gap-2 mt-5">
            {working ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
            {working ? (isEn ? "Processing..." : "شغالين عليه...") : (isEn ? "Execute Tool" : "نفّذ الأداة")}
          </Button>
          {working && workProgress && (
            <div className="mt-4 rounded-2xl border border-primary/20 bg-primary/5 p-3">
              <div className="flex items-center justify-between gap-3 text-xs font-bold">
                <span>
                  {workProgress.phase === "ocr" 
                    ? (isEn ? "OCR reading pages..." : "OCR بيقرأ الصفحات") 
                    : workProgress.phase === "validate" 
                    ? (isEn ? "Validating coverage..." : "مراجعة التغطية واستكمال الناقص") 
                    : workProgress.phase === "reduce" 
                    ? (isEn ? "Merging summary..." : "دمج ومراجعة الملخص") 
                    : workProgress.phase === "map" 
                    ? (isEn ? "Summarizing sections..." : "تلخيص الأجزاء") 
                    : (isEn ? "Extracting text..." : "استخراج النص")}
                </span>
                <span>{workProgress.current && workProgress.total ? `${workProgress.current}/${workProgress.total}` : `${workProgress.progress || 0}%`}</span>
              </div>
              <div className="mt-2 h-1.5 overflow-hidden rounded-full bg-secondary">
                <div className="h-full bg-primary transition-colors" style={{ width: `${workProgress.progress || (workProgress.current / workProgress.total) * 100 || 10}%` }} />
              </div>
              <button onClick={() => abortRef.current?.abort()} className="mt-2 text-xs text-destructive hover:underline">
                {isEn ? "Cancel Operation" : "إلغاء العملية"}
              </button>
            </div>
          )}
        </motion.div>
      </div>

      <PdfTextResult
        title={
          result?.type === "summarize"
            ? (isEn ? "Summary" : "الملخص")
            : result?.type === "organize"
            ? (isEn ? "Structured Content" : "المحتوى المنظم")
            : (isEn ? "Extracted Text" : "النص المستخرج")
        }
        text={result?.text}
        markdown={result?.markdown}
        onDownload={downloadText}
        analysis={result?.analysis}
        coverage={result?.coverage}
      />
    </div>
  );
}
