import React, { useState, useMemo } from "react";
import { motion } from "framer-motion";
import { 
  Check, X, Eye, Edit3, Sparkles, Filter, CheckCheck, 
  Layers, AlertTriangle, ScanText, Palette, Loader2, EyeOff, Zap
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { ocrImageWithVisionAI, isGarbledOrCorruptedText } from "@/lib/imageFilter";
import { getImageOcrCost } from "@/lib/creditCosts";
import { calculateOcrAllowance } from "@/lib/ocrAllowance";
import { base44 } from "@/api/base44Client";
import ImageEditorModal from "./ImageEditorModal";

export function ImageReviewGrid({
  images = [],
  onUpdateImage,
  onProceedToQuiz,
  onBulkUpdateStatus,
  fileName = "",
}) {
  const { profile, refreshProfile } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const isMasterAdmin = Boolean(profile?.is_admin) || profile?.role === "admin" || profile?.email === "admin@admin.com" || profile?.email === "ibrahimkandil000@gmail.com";
  const userCredits = profile?.credits ?? 0;

  const freeTrialKey = profile?.id ? `bf_practical_ocr_free_${profile.id}` : "bf_practical_ocr_free_guest";
  const [hasUsedFreeTrial, setHasUsedFreeTrial] = useState(() => {
    if (typeof window === "undefined") return false;
    return Boolean(localStorage.getItem(freeTrialKey));
  });
  const canUseFreeTrial = !isMasterAdmin && !hasUsedFreeTrial;

  const [filterStatus, setFilterStatus] = useState("kept"); // 'kept' | 'rejected' | 'all'
  const [filterCategory, setFilterCategory] = useState("all");
  const [selectedPreviewImage, setSelectedPreviewImage] = useState(null);
  const [editingContextImage, setEditingContextImage] = useState(null);
  const [tempContextText, setTempContextText] = useState("");
  
  // Image Editor Studio Modal State
  const [editingModalImage, setEditingModalImage] = useState(null);

  // AI OCR States
  const [ocrLoadingSet, setOcrLoadingSet] = useState(new Set());
  const [isBatchOcrRunning, setIsBatchOcrRunning] = useState(false);

  const categories = [
    { id: "all", label: isEn ? "All Visuals" : "جميع الصور والأشكال" },
    { id: "diagram", label: isEn ? "Diagrams & Schemes" : "مخططات وأشكال توضيحية" },
    { id: "chart_or_graph", label: isEn ? "Charts & Graphs" : "رسوم بيانية وإحصائية" },
    { id: "table", label: isEn ? "Data Tables" : "جداول وبيانات" },
    { id: "clinical_photo", label: isEn ? "Educational Photos" : "صور توضيحية وتطبيقية" },
    { id: "anatomical_illustration", label: isEn ? "Structures & Diagrams" : "رسومات هيكلية وتوضيحية" },
    { id: "radiology", label: isEn ? "Scans & Specialized Visuals" : "صور تخصصية وفحص" },
    { id: "histology", label: isEn ? "Microscopic & Lab Visuals" : "صور مجهرية ومعملية" },
    { id: "other_scientific", label: isEn ? "Other Visuals" : "صور وأشكال أخرى" },
  ];

  const filteredImages = images.filter((img) => {
    // Status filter
    if (filterStatus === "kept" && img.status === "rejected") return false;
    if (filterStatus === "rejected" && img.status !== "rejected") return false;

    // Category filter
    if (filterCategory !== "all") {
      const cat = img.aiClassification?.category || "other_scientific";
      if (cat !== filterCategory) return false;
    }

    return true;
  });

  const keptImages = useMemo(() => images.filter((img) => img.status !== "rejected"), [images]);
  const keptCount = keptImages.length;
  const rejectedCount = images.filter((img) => img.status === "rejected").length;

  // Identify images with corrupted, unreadable, or missing text
  const corruptedImages = useMemo(() => {
    return keptImages.filter((img) => isGarbledOrCorruptedText(img.contextText));
  }, [keptImages]);

  const batchOcrCost = getImageOcrCost(keptCount);
  const corruptedOcrCost = getImageOcrCost(corruptedImages.length);

  const handleToggleStatus = (img) => {
    playClick();
    const newStatus = img.status === "rejected" ? "kept" : "rejected";
    onUpdateImage(img.id, { status: newStatus });
  };

  const handleOpenEditContext = (img) => {
    playClick();
    setEditingContextImage(img);
    setTempContextText(img.contextText || "");
  };

  const handleSaveContext = () => {
    if (!editingContextImage) return;
    playClick();
    onUpdateImage(editingContextImage.id, { contextText: tempContextText });
    setEditingContextImage(null);
  };

  // Batch & Smart OCR allowance calculations
  const batchAllowance = useMemo(() => {
    return calculateOcrAllowance({
      targetCount: keptCount,
      userCredits,
      isMasterAdmin,
      canUseFreeTrial,
    });
  }, [keptCount, userCredits, isMasterAdmin, canUseFreeTrial]);

  const batchButtonLabel = useMemo(() => {
    if (isMasterAdmin) return isEn ? "AI OCR All (Admin VIP 👑)" : "🔍 قراءة كل الصور (VIP 👑)";
    if (canUseFreeTrial) return isEn ? "AI OCR (1st Free Trial ⭐)" : "🔍 قراءة الصور (تجربة أولى مجانية ⭐)";
    if (userCredits <= 0) return isEn ? `AI OCR All (${batchOcrCost} Cr)` : `🔍 قراءة كل الصور (${batchOcrCost} كريدت)`;
    if (userCredits < batchOcrCost) {
      const affordable = userCredits * 5;
      return isEn 
        ? `AI OCR Budget (${affordable} Slides / ${userCredits} Cr)` 
        : `🔍 قراءة المتاح (${affordable} صور بـ ${userCredits} كريدت)`;
    }
    return isEn ? `AI OCR All (${batchOcrCost} Cr)` : `🔍 قراءة كل الصور (${batchOcrCost} كريدت)`;
  }, [isMasterAdmin, canUseFreeTrial, userCredits, batchOcrCost, isEn]);

  // Run AI Vision OCR on a single image with credit deduction
  const handleRunOcrOnImage = async (img) => {
    if (ocrLoadingSet.has(img.id)) return;
    const cost = 1;
    const isFreeForThis = isMasterAdmin || canUseFreeTrial;

    if (!isFreeForThis && userCredits < cost) {
      toast.error(
        isEn
          ? `Insufficient credits. You need ${cost} credit to transcribe this slide (Balance: ${userCredits}).`
          : `رصيدك غير كافٍ. تحتاج ${cost} كريدت لقراءة الشريحة بالـ AI (رصيدك الحالي: ${userCredits}).`
      );
      return;
    }

    try {
      playClick();
      setOcrLoadingSet((prev) => new Set([...prev, img.id]));
      toast.info(isEn ? "Reading slide text and landmarks via AI Vision..." : "جاري قراءة واستخراج النص والمعالم من الصورة بالـ AI...");
      
      // Deduct credit atomically if not free
      if (!isFreeForThis) {
        try {
          const safeKey = `ocr_${String(img.id || Date.now()).replace(/[^a-zA-Z0-9_-]/g, "")}_${Date.now()}`;
          await base44.functions.invoke("chargeAiJob", {
            action: "charge",
            task: "image_ocr",
            imageCount: 1,
            cost,
            jobKey: safeKey,
            description: `قراءة شريحة علمية بالـ AI (صفحة ${img.pageOrSlideNumber || 1})`,
          });
          refreshProfile?.();
        } catch (chargeErr) {
          console.warn("[OCR Charge Error]:", chargeErr);
        }
      } else if (canUseFreeTrial) {
        try {
          localStorage.setItem(freeTrialKey, "true");
          setHasUsedFreeTrial(true);
        } catch {}
      }

      const ocrText = await ocrImageWithVisionAI(img);
      if (ocrText && ocrText.trim()) {
        onUpdateImage(img.id, { contextText: ocrText.trim() });
        playSuccess();
        toast.success(
          isEn 
            ? `Slide text transcribed successfully! ${!isFreeForThis ? `(-${cost} Credit)` : isMasterAdmin ? "(Admin VIP)" : "(Free Trial ⭐)"} ✨` 
            : `تم استخراج وقراءة نص الشريحة بنجاح! ${!isFreeForThis ? `(-${cost} كريدت)` : isMasterAdmin ? "(Admin VIP)" : "(تجربة مجانية ⭐)"} ✨`
        );
      } else {
        toast.info(isEn ? "No text or labels detected on visual" : "لم يتم رصد نصوص مكتوبة على الصورة");
      }
    } catch (err) {
      console.error("[ImageReviewGrid] OCR Error:", err);
      toast.error(err?.message || (isEn ? "Failed to read text via AI" : "تعذر استخراج النص بالـ AI"));
    } finally {
      setOcrLoadingSet((prev) => {
        const next = new Set(prev);
        next.delete(img.id);
        return next;
      });
    }
  };

  // Batch AI OCR on multiple images with proportional credit deduction & partial stop
  const handleBatchOcrTargets = async (targetImages, label = "") => {
    if (!targetImages.length) {
      toast.info(isEn ? "No images to process" : "لا توجد صور لمعالجتها");
      return;
    }

    const allowance = calculateOcrAllowance({
      targetCount: targetImages.length,
      userCredits,
      isMasterAdmin,
      canUseFreeTrial,
    });

    if (!allowance.isAffordable && allowance.processableCount === 0) {
      toast.error(
        isEn
          ? `Insufficient credits. You need ${allowance.chargedCost} credits to transcribe ${targetImages.length} slides (Balance: ${userCredits}).`
          : `رصيدك غير كافٍ. تحتاج ${allowance.chargedCost} كريدت لقراءة ${targetImages.length} شريحة (رصيدك الحالي: ${userCredits}).`
      );
      return;
    }

    const imagesToProcess = targetImages.slice(0, allowance.processableCount);
    const skippedCount = allowance.remainingUnprocessed;

    setIsBatchOcrRunning(true);
    playClick();

    if (skippedCount > 0) {
      toast.info(
        isEn 
          ? `Processing ${imagesToProcess.length} slides with available budget (${skippedCount} slides held due to credit limit)...` 
          : `رصيدك يكفي لـ ${imagesToProcess.length} صورة فقط. سيتم معالجتها والتوقف عند نفاد الرصيد (متبقي ${skippedCount} صورة)...`
      );
    } else {
      toast.info(
        isEn 
          ? `Reading ${imagesToProcess.length} slides with AI Vision (${allowance.chargedCost > 0 ? `${allowance.chargedCost} Credits` : "Free Trial ⭐"})...` 
          : `جاري قراءة نصوص ${imagesToProcess.length} صورة بالذكاء الاصطناعي (${allowance.chargedCost > 0 ? `${allowance.chargedCost} كريدت` : "تجربة مجانية ⭐"})...`
      );
    }

    // Deduct cost atomically if not superuser / free
    if (allowance.chargedCost > 0 && !isMasterAdmin) {
      try {
        const safeKey = `batch_ocr_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        await base44.functions.invoke("chargeAiJob", {
          action: "charge",
          task: "image_ocr",
          imageCount: imagesToProcess.length,
          cost: allowance.chargedCost,
          jobKey: safeKey,
          description: `قراءة مجمعة لـ ${imagesToProcess.length} شريحة بالـ AI`,
        });
        refreshProfile?.();
      } catch (chargeErr) {
        console.warn("[Batch OCR Charge Error]:", chargeErr);
      }
    }

    if (allowance.isFreeTrial) {
      try {
        localStorage.setItem(freeTrialKey, "true");
        setHasUsedFreeTrial(true);
      } catch {}
    }

    let count = 0;
    let failedCount = 0;
    let lastErrorMsg = "";
    // Process in lightweight batches of 3 for swift parallel execution
    const BATCH_SIZE = 3;
    for (let i = 0; i < imagesToProcess.length; i += BATCH_SIZE) {
      const chunk = imagesToProcess.slice(i, i + BATCH_SIZE);
      await Promise.all(
        chunk.map(async (img) => {
          try {
            const ocrText = await ocrImageWithVisionAI(img);
            if (ocrText && ocrText.trim()) {
              onUpdateImage(img.id, { contextText: ocrText.trim() });
              count++;
            }
          } catch (err) {
            failedCount++;
            lastErrorMsg = err?.message || String(err);
            console.warn(`[Batch OCR] Failed for image ${img.id}:`, err);
          }
        })
      );
    }

    setIsBatchOcrRunning(false);
    if (count > 0) {
      playSuccess();
      if (skippedCount > 0) {
        toast.success(
          isEn 
            ? `Transcribed ${count} slides with available budget! Recharge to transcribe the remaining ${skippedCount} slides 🚀` 
            : `تمت معالجة ${count} صورة بنجاح بالرصيد المتاح! اشحن رصيدك لإكمال الـ ${skippedCount} صورة المتبقية 🚀`
        );
      } else {
        toast.success(
          isEn 
            ? `Extracted text from ${count} slides! ${allowance.chargedCost > 0 ? `(-${allowance.chargedCost} Credits)` : "(Free Trial ⭐)"} 🚀` 
            : `تمت قراءة واستخراج نصوص ${count} صورة بنجاح! ${allowance.chargedCost > 0 ? `(-${allowance.chargedCost} كريدت)` : "(تجربة مجانية ⭐)"} 🚀`
        );
      }
    } else {
      toast.error(
        isEn
          ? `Failed to transcribe slides: ${lastErrorMsg || "No text detected on images"}`
          : `تعذر استخراج النصوص من الصور: ${lastErrorMsg || "لم يتم العثور على نصوص واضحة في الصور"}`
      );
    }
  };

  // Handle saved edits from ImageEditorModal
  const handleSaveEditedImage = (updated) => {
    onUpdateImage(updated.id, {
      thumbnailDataUrl: updated.thumbnailDataUrl,
      imageBlob: updated.imageBlob,
      width: updated.width,
      height: updated.height,
    });
    setEditingModalImage(null);
  };

  return (
    <div className="w-full max-w-7xl mx-auto space-y-5" dir={dir}>
      {/* Top Controls & Filter Bar */}
      <div className="p-5 rounded-2xl bg-[#0a0b12]/90 border border-white/10 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-primary" />
            <h3 className="text-base sm:text-lg font-black text-white font-heading">
              {isEn ? `Review & Confirm Extracted Visuals (${images.length})` : `مراجعة وتأكيد الصور المستخرجة (${images.length})`}
            </h3>
          </div>
          <p className="text-xs text-white/60">
            {fileName && <span className="font-mono text-cyan-400 font-bold">{fileName} • </span>}
            {isEn
              ? "Edit context text, blackout answer spoilers, crop, or read text via Vision AI before generating quizzes."
              : "يمكنك تعتيم الإجابات المكتوبة، قص الصورة، أو استخراج النصوص بالذكاء الاصطناعي قبل التوليد"}
          </p>
        </div>

        {/* Action Hub */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Batch Vision OCR Button with Cost Indicator */}
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => handleBatchOcrTargets(keptImages, "all")}
            disabled={isBatchOcrRunning || keptCount === 0}
            className="text-xs h-9 rounded-xl border-cyan-500/30 bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 gap-1.5 shadow-sm"
            title={isEn ? "Transcribe text from all images using AI Vision" : "استخراج النصوص بدقة من كل الصور بالذكاء الاصطناعي (1 كريدت لكل 5 صور)"}
          >
            {isBatchOcrRunning ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ScanText className="w-3.5 h-3.5 text-cyan-400" />
            )}
            <span>{batchButtonLabel}</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => onBulkUpdateStatus("kept")}
            className="text-xs h-9 rounded-xl border-white/15 bg-white/[0.04] hover:bg-white/10"
          >
            <CheckCheck className="w-3.5 h-3.5 ml-1 text-emerald-400" />
            <span>{isEn ? `Accept All (${images.length})` : `قبول الكل (${images.length})`}</span>
          </Button>

          <Button
            type="button"
            onClick={onProceedToQuiz}
            disabled={keptCount === 0}
            className="text-xs h-9 px-5 rounded-xl font-black bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-95 shadow-lg gap-2"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>{isEn ? `Setup Quiz for Kept (${keptCount})` : `تجهيز الكويز للصور المقبولة (${keptCount})`}</span>
          </Button>
        </div>
      </div>

      {/* Proactive Smart Detection Banner: "تخش في الآخر من الأول" */}
      {corruptedImages.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-gradient-to-r from-amber-500/15 via-cyan-500/10 to-primary/5 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
        >
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-300 shrink-0">
              <Zap className="w-4 h-4 fill-current" />
            </div>
            <div>
              <span className="text-xs font-black text-amber-200 block">
                {isEn
                  ? `Smart Detection: ${corruptedImages.length} slides contain unscanned / scrambled text!`
                  : `اكتشاف ذكي: تم رصد ${corruptedImages.length} شريحة نصوصها مشفرة أو غير واضحة (CID / ممسوحة ضوئياً)!`}
              </span>
              <span className="text-[11px] text-white/70">
                {isEn
                  ? `Fix them instantly with AI Vision OCR so questions anchor strictly to readable text. ${isMasterAdmin ? "Free for Admin." : canUseFreeTrial ? "1st trial is Free (up to 5 slides) ⭐." : `Cost: ${corruptedOcrCost} Credits (1 Cr per 5 slides).`}`
                  : `يمكنك قراءتها وتفريغ مصطلحاتها الآن بالذكاء الاصطناعي لضمان أسئلة امتحانية دقيقة. ${isMasterAdmin ? "مجاناً للآدمن." : canUseFreeTrial ? "تجربتك الأولى مجانية (حتى 5 صور) ⭐." : `التكلفة: ${corruptedOcrCost} كريدت فقط (1 كريدت لكل 5 صور).`}`}
              </span>
            </div>
          </div>

          <Button
            type="button"
            size="sm"
            onClick={() => handleBatchOcrTargets(corruptedImages, "corrupted")}
            disabled={isBatchOcrRunning}
            className="w-full sm:w-auto h-9 px-4 rounded-xl text-xs font-black bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 shrink-0 shadow-md gap-1.5"
          >
            {isBatchOcrRunning ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <ScanText className="w-3.5 h-3.5" />}
            <span>
              {isEn
                ? `Fix ${corruptedImages.length} Slides via AI`
                : `⚡ قراءة الـ ${corruptedImages.length} صورة بالـ AI فوراً`}
            </span>
          </Button>
        </motion.div>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 border-b border-white/10 pb-4">
        {/* Status Filter Buttons */}
        <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10 self-start">
          <button
            type="button"
            onClick={() => setFilterStatus("kept")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
              filterStatus === "kept"
                ? "bg-emerald-500/20 text-emerald-300 border border-emerald-500/30"
                : "text-white/60 hover:text-white"
            )}
          >
            <Check className="w-3.5 h-3.5" />
            <span>{isEn ? `Kept (${keptCount})` : `المقبولة (${keptCount})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("rejected")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
              filterStatus === "rejected"
                ? "bg-red-500/20 text-red-300 border border-red-500/30"
                : "text-white/60 hover:text-white"
            )}
          >
            <X className="w-3.5 h-3.5" />
            <span>{isEn ? `Excluded (${rejectedCount})` : `المستبعدة تلقائياً (${rejectedCount})`}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStatus("all")}
            className={cn(
              "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors",
              filterStatus === "all"
                ? "bg-primary/20 text-cyan-300 border border-primary/30"
                : "text-white/60 hover:text-white"
            )}
          >
            {isEn ? `All (${images.length})` : `الكل (${images.length})`}
          </button>
        </div>

        {/* Category Dropdown Filter */}
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-white/40" />
          <select
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="h-9 px-3 rounded-xl bg-[#090a10] border border-white/15 text-xs text-white focus:outline-none focus:border-primary"
          >
            {categories.map((c) => (
              <option key={c.id} value={c.id} className="bg-[#090a10] text-white">
                {c.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Grid of Image Cards */}
      {filteredImages.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
          <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
          <p className="text-sm text-white/60">
            {isEn ? "No images match the current filter" : "لا توجد صور تطابق الفلتر الحالي"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredImages.map((img) => {
            const isKept = img.status !== "rejected";
            const categoryLabel =
              categories.find((c) => c.id === img.aiClassification?.category)?.label ||
              img.aiClassification?.category ||
              (isEn ? "Scientific" : "علمية");

            const isGarbled = isGarbledOrCorruptedText(img.contextText);
            const isOcrRunning = ocrLoadingSet.has(img.id);

            return (
              <div
                key={img.id}
                className={cn(
                  "relative rounded-2xl overflow-hidden border-2 transition-all duration-200 flex flex-col justify-between bg-[#0a0b12] group",
                  isKept
                    ? "border-white/15 hover:border-primary/50 shadow-lg"
                    : "border-red-500/30 opacity-70 bg-red-950/10"
                )}
              >
                {/* Image Container with Hover Controls */}
                <div className="relative h-48 w-full bg-black/80 overflow-hidden flex items-center justify-center">
                  <img
                    src={img.thumbnailDataUrl}
                    alt="Extracted"
                    className="max-h-full max-w-full object-contain group-hover:scale-102 transition-transform duration-200"
                    loading="lazy"
                  />

                  {/* Top Badges */}
                  <div className="absolute top-2.5 inset-x-2.5 flex items-center justify-between pointer-events-none">
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-black/75 border border-white/20 text-white backdrop-blur-md">
                      {isEn ? `Slide ${img.pageOrSlideNumber}` : `صفحة / سلايد ${img.pageOrSlideNumber}`}
                    </span>

                    {img.aiClassification && (
                      <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-primary/20 text-cyan-300 border border-primary/30 backdrop-blur-md">
                        {categoryLabel}
                      </span>
                    )}
                  </div>

                  {/* Hover Actions Bar (Inspect & Studio Edit) */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2 p-2 backdrop-blur-[2px]">
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setSelectedPreviewImage(img)}
                      className="h-8 px-2.5 rounded-lg bg-white/15 hover:bg-white/25 text-white text-xs font-bold gap-1"
                    >
                      <Eye className="w-3.5 h-3.5 text-primary" />
                      <span>{isEn ? "Inspect" : "تكبير"}</span>
                    </Button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEditingModalImage(img)}
                      className="h-8 px-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-primary text-black text-xs font-black gap-1 shadow-md"
                    >
                      <Palette className="w-3.5 h-3.5" />
                      <span>{isEn ? "Edit / Censor" : "تعديل وتعتيم"}</span>
                    </Button>
                  </div>
                </div>

                {/* Card Info & Actions */}
                <div className="p-3.5 space-y-2.5 flex-1 flex flex-col justify-between border-t border-white/10 bg-[#0c0d15]">
                  {/* Context Snippet & OCR Button */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-[11px] text-white/50 font-mono">
                      <span>{isEn ? "Context & Text:" : "الشرح والنص المستخرج:"}</span>
                      <div className="flex items-center gap-2">
                        {/* Quick AI OCR Button */}
                        <button
                          type="button"
                          onClick={() => handleRunOcrOnImage(img)}
                          disabled={isOcrRunning}
                          className="text-cyan-400 hover:text-cyan-200 flex items-center gap-1 font-sans font-bold hover:underline"
                          title={isEn ? "Extract real text from slide with AI Vision (1 Credit)" : "استخراج النص الدقيق من الصورة بالذكاء الاصطناعي (1 كريدت)"}
                        >
                          {isOcrRunning ? (
                            <Loader2 className="w-3 h-3 animate-spin text-cyan-400" />
                          ) : (
                            <ScanText className="w-3 h-3 text-cyan-400" />
                          )}
                          <span>
                            {isEn 
                              ? (isMasterAdmin ? "AI OCR (VIP)" : canUseFreeTrial ? "AI OCR (Free Trial)" : "AI OCR (1 Cr)") 
                              : (isMasterAdmin ? "قراءة (VIP)" : canUseFreeTrial ? "قراءة (تجربة مجانية)" : "قراءة (1 كريدت)")}
                          </span>
                        </button>

                        <button
                          type="button"
                          onClick={() => handleOpenEditContext(img)}
                          className="text-primary hover:underline flex items-center gap-1"
                          title={isEn ? "Edit or paste custom context" : "تعديل أو لصق شرح مخصص"}
                        >
                          <Edit3 className="w-3 h-3" />
                          <span>{isEn ? "Edit" : "تعديل"}</span>
                        </button>
                      </div>
                    </div>

                    {/* Garbled Text Warning Alert */}
                    {isGarbled && (
                      <div className="px-2 py-1 rounded-md bg-amber-500/10 border border-amber-500/30 flex items-center justify-between text-[10px] text-amber-300">
                        <span>⚠️ {isEn ? "Corrupted / missing text" : "نص غير واضح أو تالف"}</span>
                        <button
                          type="button"
                          onClick={() => handleRunOcrOnImage(img)}
                          className="font-bold underline text-amber-200 hover:text-white"
                        >
                          {isEn ? "Run AI OCR" : "اقرأ بالـ AI 🔍"}
                        </button>
                      </div>
                    )}

                    <p className="text-xs text-white/80 line-clamp-2 leading-relaxed bg-white/[0.03] p-2 rounded-lg border border-white/5 font-sans">
                      {img.contextText || (isEn ? "No text accompanying visual" : "لا يوجد نص مرافق مستخرج")}
                    </p>
                  </div>

                  {/* Rejection Reason (if rejected) */}
                  {!isKept && img.rejectionReason && (
                    <div className="text-[10px] text-red-400 bg-red-500/10 p-1.5 rounded-lg border border-red-500/20">
                      ⚠️ {img.rejectionReason}
                    </div>
                  )}

                  {/* Bottom Action Strip */}
                  <div className="pt-2 border-t border-white/5 flex items-center justify-between gap-1.5">
                    {/* Visual Studio Edit Shortcut */}
                    <button
                      type="button"
                      onClick={() => setEditingModalImage(img)}
                      className="text-[11px] text-cyan-400 hover:text-white flex items-center gap-1 px-2 py-1 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 border border-cyan-500/20 transition-colors font-medium"
                      title={isEn ? "Open image editor to blackout answers or crop" : "فتح استوديو التعتيم والقص وحجب الإجابات"}
                    >
                      <EyeOff className="w-3 h-3" />
                      <span>{isEn ? "Censor / Crop" : "تعتيم وقص"}</span>
                    </button>

                    <Button
                      type="button"
                      size="sm"
                      onClick={() => handleToggleStatus(img)}
                      className={cn(
                        "h-7 px-2.5 rounded-lg text-[11px] font-bold transition-colors",
                        isKept
                          ? "bg-red-500/15 text-red-300 hover:bg-red-500/25 border border-red-500/30"
                          : "bg-emerald-500/20 text-emerald-300 hover:bg-emerald-500/30 border border-emerald-500/30"
                      )}
                    >
                      {isKept ? (
                        <>
                          <X className="w-3 h-3 ml-1" />
                          <span>{isEn ? "Exclude" : "استبعاد"}</span>
                        </>
                      ) : (
                        <>
                          <Check className="w-3 h-3 ml-1" />
                          <span>{isEn ? "Accept" : "قبول"}</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Interactive Visual Studio & Redaction Modal */}
      {editingModalImage && (
        <ImageEditorModal
          isOpen={Boolean(editingModalImage)}
          onClose={() => setEditingModalImage(null)}
          image={editingModalImage}
          onSave={handleSaveEditedImage}
        />
      )}

      {/* Edit Context Text Dialog */}
      <Dialog open={Boolean(editingContextImage)} onOpenChange={(open) => !open && setEditingContextImage(null)}>
        <DialogContent className="max-w-xl bg-[#0a0b12] border-white/20 text-white" dir={dir}>
          <DialogHeader>
            <DialogTitle className="text-lg font-black flex items-center gap-2">
              <Edit3 className="w-5 h-5 text-primary" />
              <span>{isEn ? "Edit Image Context & Notes 📝" : "تعديل الشرح المرفق بالصورة 📝"}</span>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-3 py-3">
            <p className="text-xs text-white/60 leading-relaxed">
              {isEn
                ? "This context is utilized by Vision AI to form accurate quiz questions for this slide. You can paste custom lecture excerpts here:"
                : "هذا الشرح هو الأساس الذي سيعتمد عليه الـ AI لتوليد أسئلة الكويز عن هذه الصورة. يمكنك لصق شرح المحاضر أو ملخصك الخاص هنا:"}
            </p>

            <Textarea
              value={tempContextText}
              onChange={(e) => setTempContextText(e.target.value)}
              rows={6}
              placeholder={isEn ? "Type or paste scientific context notes here..." : "اكتب أو الصق الشرح العلمي لهذه الصورة هنا..."}
              className="bg-black/50 border-white/20 text-xs text-white leading-relaxed focus:border-primary"
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              type="button"
              variant="outline"
              onClick={() => setEditingContextImage(null)}
              className="text-xs border-white/15 bg-white/5"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>
            <Button
              type="button"
              onClick={handleSaveContext}
              className="text-xs font-black bg-primary text-black hover:opacity-90"
            >
              {isEn ? "Save Context ✓" : "حفظ الشرح ✓"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Fullscreen Image Preview Dialog */}
      <Dialog open={Boolean(selectedPreviewImage)} onOpenChange={(open) => !open && setSelectedPreviewImage(null)}>
        <DialogContent className="max-w-3xl bg-[#090a10] border-white/20 text-white p-4" dir={dir}>
          {selectedPreviewImage && (
            <div className="space-y-4">
              <div className="flex items-center justify-between border-b border-white/10 pb-3">
                <span className="font-bold text-sm">
                  {isEn ? `Preview • Slide ${selectedPreviewImage.pageOrSlideNumber}` : `معاينة الصورة • صفحة / سلايد ${selectedPreviewImage.pageOrSlideNumber}`}
                </span>
                <div className="flex items-center gap-2">
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => {
                      const img = selectedPreviewImage;
                      setSelectedPreviewImage(null);
                      setEditingModalImage(img);
                    }}
                    className="h-7 px-2.5 rounded-lg bg-gradient-to-r from-cyan-400 to-primary text-black text-xs font-black gap-1"
                  >
                    <Palette className="w-3 h-3" />
                    <span>{isEn ? "Edit in Studio" : "تعديل في الاستوديو"}</span>
                  </Button>
                  <span className="text-xs font-mono text-cyan-400 font-bold">
                    {selectedPreviewImage.width}×{selectedPreviewImage.height}px
                  </span>
                </div>
              </div>

              <div className="max-h-[60vh] overflow-auto flex items-center justify-center bg-black/60 rounded-2xl p-2">
                <img
                  src={selectedPreviewImage.thumbnailDataUrl}
                  alt="Full preview"
                  className="max-h-[55vh] max-w-full object-contain rounded-xl"
                />
              </div>

              <div className="p-3 bg-white/[0.03] rounded-xl border border-white/10 space-y-1">
                <span className="text-xs font-bold text-white/50 block">
                  {isEn ? "Accompanying Context:" : "الشرح المرافق:"}
                </span>
                <p className="text-xs text-white/90 leading-relaxed max-h-24 overflow-y-auto">
                  {selectedPreviewImage.contextText || (isEn ? "No accompanying text" : "لا يوجد شرح مرافق")}
                </p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

export default ImageReviewGrid;
