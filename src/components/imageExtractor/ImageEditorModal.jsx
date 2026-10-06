import React, { useState, useRef, useEffect, useCallback } from "react";
import { 
  Crop, EyeOff, Maximize2, RotateCcw,
  Undo2, Check, Sparkles, AlertCircle
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useLocale } from "@/lib/LocaleContext";
import { playClick, playSuccess } from "@/lib/sounds";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

/**
 * ImageEditorModal
 * Professional in-browser image studio tailored for OSCE/OSPE practicals:
 * 1. Blackout / Censor Tool: Drag black boxes to redact answers, labels, and text.
 * 2. Crop Tool: Drag bounding box to crop out unwanted margins or watermarks.
 * 3. Resize / Scale Tool: Scale down or up smoothly for fast loading and crisp rendering.
 * 4. Full Undo / Redo & Reset to Original.
 */
export function ImageEditorModal({
  isOpen,
  onClose,
  image,
  onSave,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [activeTool, setActiveTool] = useState("censor"); // 'censor' | 'crop' | 'resize'
  const [censorStyle, setCensorStyle] = useState("solid"); // 'solid' | 'blur'
  const [scalePercent, setScalePercent] = useState(100);
  const [customWidth, setCustomWidth] = useState(0);
  const [customHeight, setCustomHeight] = useState(0);

  const canvasRef = useRef(null);
  const originalImageRef = useRef(null);
  const historyStack = useRef([]);
  const [canUndo, setCanUndo] = useState(false);

  // Mouse / Touch drag state
  const isDragging = useRef(false);
  const dragStart = useRef({ x: 0, y: 0 });
  const [selectionRect, setSelectionRect] = useState(null); // { x, y, width, height } in canvas coords

  // Push current canvas state to undo stack
  const pushHistory = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    historyStack.current.push({
      imageData,
      width: canvas.width,
      height: canvas.height,
    });
    setCanUndo(true);
  }, []);

  // Initialize canvas when modal opens
  useEffect(() => {
    if (!isOpen || !image) return;

    historyStack.current = [];
    setCanUndo(false);
    setSelectionRect(null);
    setScalePercent(100);

    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      originalImageRef.current = img;
      const canvas = canvasRef.current;
      if (!canvas) return;
      canvas.width = img.naturalWidth || img.width;
      canvas.height = img.naturalHeight || img.height;
      setCustomWidth(canvas.width);
      setCustomHeight(canvas.height);

      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        pushHistory();
      }
    };
    img.src = image.thumbnailDataUrl;
  }, [isOpen, image, pushHistory]);

  // Convert mouse/touch event into canvas pixel coordinates
  const getCanvasCoords = (e) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;

    return {
      x: Math.round((clientX - rect.left) * scaleX),
      y: Math.round((clientY - rect.top) * scaleY),
    };
  };

  const handlePointerDown = (e) => {
    if (activeTool === "resize") return;
    isDragging.current = true;
    const coords = getCanvasCoords(e);
    dragStart.current = coords;
    setSelectionRect({ x: coords.x, y: coords.y, width: 0, height: 0 });
  };

  const handlePointerMove = (e) => {
    if (!isDragging.current) return;
    const coords = getCanvasCoords(e);
    const startX = dragStart.current.x;
    const startY = dragStart.current.y;

    const x = Math.min(startX, coords.x);
    const y = Math.min(startY, coords.y);
    const width = Math.abs(coords.x - startX);
    const height = Math.abs(coords.y - startY);

    setSelectionRect({ x, y, width, height });
  };

  const handlePointerUp = () => {
    if (!isDragging.current) return;
    isDragging.current = false;

    if (!selectionRect || selectionRect.width < 4 || selectionRect.height < 4) {
      setSelectionRect(null);
      return;
    }

    // If tool is censor, apply black box immediately upon drag release!
    if (activeTool === "censor") {
      applyCensorBox(selectionRect);
      setSelectionRect(null);
    }
  };

  // Apply blackout / censor box directly to canvas
  const applyCensorBox = (rect) => {
    const canvas = canvasRef.current;
    if (!canvas || !rect) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();

    if (censorStyle === "solid") {
      ctx.fillStyle = "#000000";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
    } else {
      // Dark pixelated blur effect
      ctx.save();
      ctx.fillStyle = "rgba(10, 10, 15, 0.96)";
      ctx.fillRect(rect.x, rect.y, rect.width, rect.height);
      ctx.strokeStyle = "#000000";
      ctx.lineWidth = 1;
      ctx.strokeRect(rect.x, rect.y, rect.width, rect.height);
      ctx.restore();
    }

    playClick();
    toast.success(isEn ? "Redacted text / answer area ✓" : "تم تعتيم وحجب المنطقة بنجاح ✓");
  };

  // Apply cropping to selection
  const handleApplyCrop = () => {
    if (!selectionRect || selectionRect.width < 10 || selectionRect.height < 10) {
      toast.error(isEn ? "Please drag a crop area first" : "يرجى تحديد مساحة القص أولاً بالسحب");
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    pushHistory();

    const croppedData = ctx.getImageData(
      selectionRect.x,
      selectionRect.y,
      selectionRect.width,
      selectionRect.height
    );

    canvas.width = selectionRect.width;
    canvas.height = selectionRect.height;
    setCustomWidth(selectionRect.width);
    setCustomHeight(selectionRect.height);

    ctx.putImageData(croppedData, 0, 0);
    setSelectionRect(null);
    playClick();
    toast.success(isEn ? "Cropped image successfully ✂️" : "تم قص الصورة بنجاح ✂️");
  };

  // Apply resizing
  const handleApplyResize = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const currentW = canvas.width;
    const currentH = canvas.height;

    let targetW = Math.max(50, Math.min(4000, Number(customWidth) || currentW));
    let targetH = Math.max(50, Math.min(4000, Number(customHeight) || currentH));

    if (scalePercent !== 100) {
      targetW = Math.round((currentW * scalePercent) / 100);
      targetH = Math.round((currentH * scalePercent) / 100);
    }

    if (targetW === currentW && targetH === currentH) {
      toast.info(isEn ? "Dimensions unchanged" : "الأبعاد مطابقة بالفعل");
      return;
    }

    pushHistory();

    // Create temp offscreen canvas with current drawing
    const tempCanvas = document.createElement("canvas");
    tempCanvas.width = currentW;
    tempCanvas.height = currentH;
    const tempCtx = tempCanvas.getContext("2d");
    tempCtx.drawImage(canvas, 0, 0);

    // Resize main canvas
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = "high";
    ctx.drawImage(tempCanvas, 0, 0, targetW, targetH);

    setCustomWidth(targetW);
    setCustomHeight(targetH);
    setScalePercent(100);
    playClick();
    toast.success(isEn ? `Resized to ${targetW}×${targetH}px` : `تم تغيير الأبعاد إلى ${targetW}×${targetH} بكسل 📐`);
  };

  // Undo last operation
  const handleUndo = () => {
    if (historyStack.current.length <= 1) return;
    playClick();

    // Remove current state
    historyStack.current.pop();
    // Retrieve previous state
    const previous = historyStack.current[historyStack.current.length - 1];
    if (!previous) return;

    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.width = previous.width;
    canvas.height = previous.height;
    setCustomWidth(previous.width);
    setCustomHeight(previous.height);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.putImageData(previous.imageData, 0, 0);
    }

    setCanUndo(historyStack.current.length > 1);
    setSelectionRect(null);
  };

  // Reset to original image
  const handleResetToOriginal = () => {
    if (!originalImageRef.current) return;
    playClick();
    const img = originalImageRef.current;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = img.naturalWidth || img.width;
    canvas.height = img.naturalHeight || img.height;
    setCustomWidth(canvas.width);
    setCustomHeight(canvas.height);
    setScalePercent(100);

    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(img, 0, 0);
      historyStack.current = [];
      pushHistory();
    }
    setSelectionRect(null);
    toast.info(isEn ? "Reset to original image" : "تمت استعادة الصورة الأصلية كما هي 🔄");
  };

  // Save changes and return to parent
  const handleSaveAndApply = () => {
    const canvas = canvasRef.current;
    if (!canvas || !image) return;

    const updatedDataUrl = canvas.toDataURL("image/jpeg", 0.9);
    canvas.toBlob(
      (blob) => {
        playSuccess();
        onSave({
          id: image.id,
          thumbnailDataUrl: updatedDataUrl,
          imageBlob: blob,
          width: canvas.width,
          height: canvas.height,
        });
        toast.success(isEn ? "Changes applied to visual ✓" : "تم حفظ وتطبيق التعديل على الصورة بنجاح! 🎯");
        onClose();
      },
      "image/jpeg",
      0.9
    );
  };

  if (!isOpen || !image) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent 
        className="max-w-5xl w-[95vw] h-[92vh] max-h-[92vh] bg-[#08090e] border-white/15 text-white p-0 flex flex-col overflow-hidden" 
        dir={dir}
      >
        {/* Header */}
        <DialogHeader className="p-4 sm:px-6 border-b border-white/10 flex flex-row items-center justify-between shrink-0 bg-[#0c0d15]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 border border-primary/30 flex items-center justify-center text-primary">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-white flex items-center gap-2">
                <span>{isEn ? "Visual Studio • Edit & Redact" : "محرر واستوديو تعديل الصورة وتعتيم الإجابات"}</span>
                <span className="text-xs font-mono font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-full border border-cyan-500/20">
                  {image.pageOrSlideNumber ? (isEn ? `Slide ${image.pageOrSlideNumber}` : `سلايد ${image.pageOrSlideNumber}`) : "Image"}
                </span>
              </DialogTitle>
              <p className="text-[11px] text-white/50">
                {isEn 
                  ? "Blackout answer text, crop margins, or resize before generating quizzes." 
                  : "غطِّ الإجابات والنصوص المكشوفة بشريط أسود، أو قص أطراف الصورة، أو صغّر حجمها"}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleUndo}
              disabled={!canUndo}
              className="text-xs h-8 px-2.5 border-white/15 bg-white/5 hover:bg-white/10 gap-1"
              title={isEn ? "Undo" : "تراجع"}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? "Undo" : "تراجع"}</span>
            </Button>

            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleResetToOriginal}
              className="text-xs h-8 px-2.5 border-white/15 bg-white/5 hover:bg-white/10 text-rose-300 gap-1"
              title={isEn ? "Reset" : "إعادة الأصل"}
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">{isEn ? "Reset" : "الأصل"}</span>
            </Button>
          </div>
        </DialogHeader>

        {/* Toolbar */}
        <div className="p-3 bg-[#0d0e17] border-b border-white/10 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Main Tool Selector */}
          <div className="flex items-center gap-1.5 p-1 rounded-xl bg-white/[0.04] border border-white/10">
            <button
              type="button"
              onClick={() => { playClick(); setActiveTool("censor"); setSelectionRect(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
                activeTool === "censor"
                  ? "bg-primary text-black font-black shadow-md"
                  : "text-white/70 hover:text-white"
              )}
            >
              <EyeOff className="w-3.5 h-3.5" />
              <span>{isEn ? "Blackout / Redact Answers" : "🕶️ تعتيم وتغطية الإجابات"}</span>
            </button>

            <button
              type="button"
              onClick={() => { playClick(); setActiveTool("crop"); setSelectionRect(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
                activeTool === "crop"
                  ? "bg-primary text-black font-black shadow-md"
                  : "text-white/70 hover:text-white"
              )}
            >
              <Crop className="w-3.5 h-3.5" />
              <span>{isEn ? "Crop Tool" : "✂️ قص الصورة"}</span>
            </button>

            <button
              type="button"
              onClick={() => { playClick(); setActiveTool("resize"); setSelectionRect(null); }}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5",
                activeTool === "resize"
                  ? "bg-primary text-black font-black shadow-md"
                  : "text-white/70 hover:text-white"
              )}
            >
              <Maximize2 className="w-3.5 h-3.5" />
              <span>{isEn ? "Resize / Scale" : "📐 تغيير الحجم"}</span>
            </button>
          </div>

          {/* Subtool Options */}
          {activeTool === "censor" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-white/50 text-[11px] hidden md:inline">
                {isEn ? "Style:" : "نوع التعتيم:"}
              </span>
              <button
                type="button"
                onClick={() => setCensorStyle("solid")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                  censorStyle === "solid"
                    ? "bg-black border-primary text-primary"
                    : "bg-white/5 border-white/10 text-white/60"
                )}
              >
                ⬛ {isEn ? "Solid Black (Recommended)" : "أسود مصمت (امتحاني)"}
              </button>
              <button
                type="button"
                onClick={() => setCensorStyle("blur")}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[11px] font-bold border transition-colors",
                  censorStyle === "blur"
                    ? "bg-black border-primary text-primary"
                    : "bg-white/5 border-white/10 text-white/60"
                )}
              >
                🌫️ {isEn ? "Dark Blur" : "تمويه مظلم"}
              </button>
              <span className="text-[11px] text-emerald-400/90 font-medium mr-2">
                {isEn ? "👈 Drag over text to hide it" : "👈 اسحب بالفأرة فوق أي نص لتغطيته فوراً"}
              </span>
            </div>
          )}

          {activeTool === "crop" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-white/60">
                {isEn ? "Drag box on image, then:" : "اسحب لتحديد منطقة القص ثم اضغط:"}
              </span>
              <Button
                type="button"
                size="sm"
                onClick={handleApplyCrop}
                disabled={!selectionRect}
                className="h-8 px-3 rounded-lg text-xs font-black bg-emerald-500 hover:bg-emerald-400 text-slate-950 gap-1.5"
              >
                <Crop className="w-3 h-3" />
                <span>{isEn ? "Apply Crop ✂️" : "تنفيذ القص ✂️"}</span>
              </Button>
            </div>
          )}

          {activeTool === "resize" && (
            <div className="flex items-center gap-2 text-xs">
              <span className="text-[11px] text-white/60">{isEn ? "Scale:" : "النسبة:"}</span>
              {[75, 50, 33].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => { setScalePercent(pct); }}
                  className={cn(
                    "px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold border transition-colors",
                    scalePercent === pct
                      ? "bg-primary text-black border-primary"
                      : "bg-white/5 border-white/10 text-white/70"
                  )}
                >
                  {pct}%
                </button>
              ))}
              <Button
                type="button"
                size="sm"
                onClick={handleApplyResize}
                className="h-8 px-3 rounded-lg text-xs font-black bg-cyan-400 hover:bg-cyan-300 text-black gap-1.5"
              >
                <span>{isEn ? "Apply Scale 📐" : "تطبيق التصغير 📐"}</span>
              </Button>
            </div>
          )}
        </div>

        {/* Canvas Workspace Viewport */}
        <div className="flex-1 bg-[#05060a] relative overflow-auto flex items-center justify-center p-4 select-none touch-none">
          <div className="relative shadow-2xl border border-white/20 rounded-xl overflow-hidden bg-black max-w-full max-h-full">
            <canvas
              ref={canvasRef}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              className={cn(
                "block max-h-[62vh] max-w-full w-auto h-auto object-contain",
                activeTool === "censor" && "cursor-crosshair",
                activeTool === "crop" && "cursor-crosshair",
                activeTool === "resize" && "cursor-default"
              )}
            />

            {/* Interactive Drag Selection Overlay Box */}
            {selectionRect && (
              <div
                style={{
                  position: "absolute",
                  left: `${(selectionRect.x / (canvasRef.current?.width || 1)) * 100}%`,
                  top: `${(selectionRect.y / (canvasRef.current?.height || 1)) * 100}%`,
                  width: `${(selectionRect.width / (canvasRef.current?.width || 1)) * 100}%`,
                  height: `${(selectionRect.height / (canvasRef.current?.height || 1)) * 100}%`,
                  pointerEvents: "none",
                }}
                className={cn(
                  "border-2 transition-all",
                  activeTool === "censor"
                    ? "bg-black/80 border-cyan-400 shadow-[0_0_15px_rgba(0,245,255,0.4)]"
                    : "border-emerald-400 bg-emerald-500/20 dashed"
                )}
              >
                <span className="absolute -top-5 left-0 text-[10px] font-mono font-bold bg-black/90 text-cyan-300 px-1.5 py-0.2 rounded border border-cyan-500/30">
                  {activeTool === "censor" ? "Blackout Area" : "Crop Area"}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 px-6 bg-[#0c0d15] border-t border-white/10 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3 text-xs text-white/50 font-mono">
            <span>
              {canvasRef.current ? `${canvasRef.current.width} × ${canvasRef.current.height} px` : ""}
            </span>
            <span className="hidden sm:inline">•</span>
            <span className="text-[11px] text-amber-300/80 hidden sm:inline flex items-center gap-1">
              <AlertCircle className="w-3 h-3 inline" />
              {isEn 
                ? "Redacted areas are permanently stamped when saving." 
                : "المناطق المعتمة تُدمج بشكل نهائي داخل الصورة دون المساس بباقي المعالم"}
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onClose}
              className="text-xs h-9 px-4 border-white/15 bg-white/5 hover:bg-white/10"
            >
              {isEn ? "Cancel" : "إلغاء"}
            </Button>

            <Button
              type="button"
              size="sm"
              onClick={handleSaveAndApply}
              className="text-xs h-9 px-6 rounded-xl font-black bg-gradient-to-r from-cyan-400 to-primary text-black hover:opacity-95 shadow-lg gap-2"
            >
              <Check className="w-4 h-4 stroke-[3]" />
              <span>{isEn ? "Save & Apply Changes ✓" : "حفظ وتطبيق التعديل ✓"}</span>
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default ImageEditorModal;
