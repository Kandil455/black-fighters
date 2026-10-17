import React, { useEffect, useState } from "react";
import { Trash2, RotateCw, ArrowLeft, ArrowRight, Check, RotateCcw, Loader2, Sparkles } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

/**
 * Interactive Visual PDF Page Thumbnail Studio
 * Renders actual page thumbnails from the uploaded PDF so students can click to
 * delete, extract, rotate, or reorder pages visually without memorizing page numbers.
 */
export default function PdfVisualPageGrid({
  file,
  toolId,
  pages,
  setPages,
  angle = 90,
  setAngle,
}) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const [thumbnails, setThumbnails] = useState([]);
  const [totalPages, setTotalPages] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedSet, setSelectedSet] = useState(() => new Set());
  const [orderList, setOrderList] = useState([]);
  const [pageAngles, setPageAngles] = useState({});

  useEffect(() => {
    if (!file || !file.name?.toLowerCase().endsWith(".pdf")) {
      setThumbnails([]);
      setTotalPages(0);
      setSelectedSet(new Set());
      setOrderList([]);
      setPageAngles({});
      return;
    }

    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const pdfjsLib = await import("pdfjs-dist");
        const { ensurePdfWorker } = await import("@/lib/pdfWorkerSetup.js");
        ensurePdfWorker(pdfjsLib);

        const buffer = await file.arrayBuffer();
        const loadingTask = pdfjsLib.getDocument({
          data: new Uint8Array(buffer),
          disableWorker: true,
          isEvalSupported: false,
        });

        try {
          const pdf = await loadingTask.promise;
          if (cancelled) return;
          const count = pdf.numPages;
          setTotalPages(count);

          const initialOrder = Array.from({ length: count }, (_, i) => i + 1);
          setOrderList(initialOrder);
          setSelectedSet(new Set());
          setPageAngles({});
          if (toolId === "reorder") {
            setPages(initialOrder.join(","));
          } else {
            setPages("");
          }

          const maxPreviewPages = Math.min(count, 36);
          const rendered = [];

          for (let pageNum = 1; pageNum <= maxPreviewPages; pageNum++) {
            if (cancelled) break;
            const page = await pdf.getPage(pageNum);
            const viewport = page.getViewport({ scale: 0.34 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.max(1, Math.ceil(viewport.width));
            canvas.height = Math.max(1, Math.ceil(viewport.height));
            const ctx = canvas.getContext("2d", { alpha: false });
            await page.render({
              canvasContext: ctx,
              viewport,
              background: "white",
            }).promise;
            const dataUrl = canvas.toDataURL("image/jpeg", 0.72);
            canvas.width = 1;
            canvas.height = 1;
            page.cleanup();
            rendered.push({ pageNum, dataUrl });
            if (pageNum % 6 === 0) {
              setThumbnails([...rendered]);
              await new Promise((r) => setTimeout(r, 0));
            }
          }
          if (!cancelled) {
            setThumbnails(rendered);
          }
        } finally {
          await loadingTask.destroy().catch(() => {});
        }
      } catch (err) {
        console.warn("Visual PDF preview fallback:", err);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [file, toolId]);

  const syncSelectedToPages = (nextSet) => {
    const sorted = [...nextSet].sort((a, b) => a - b);
    setPages(sorted.join(","));
  };

  const togglePageSelection = (pageNum) => {
    if (toolId === "reorder") return;
    const next = new Set(selectedSet);
    if (next.has(pageNum)) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedSet(next);
    syncSelectedToPages(next);
  };

  const handleRotatePageClick = (e, pageNum) => {
    e.stopPropagation();
    const currentDeg = pageAngles[pageNum] || 0;
    const nextDeg = (currentDeg + (angle || 90)) % 360;
    setPageAngles((prev) => ({ ...prev, [pageNum]: nextDeg }));

    const next = new Set(selectedSet);
    if (nextDeg === 0) {
      next.delete(pageNum);
    } else {
      next.add(pageNum);
    }
    setSelectedSet(next);
    syncSelectedToPages(next);
  };

  const movePageInOrder = (index, direction) => {
    const targetIdx = index + direction;
    if (targetIdx < 0 || targetIdx >= orderList.length) return;
    const next = [...orderList];
    const temp = next[index];
    next[index] = next[targetIdx];
    next[targetIdx] = temp;
    setOrderList(next);
    setPages(next.join(","));
  };

  const resetAll = () => {
    setSelectedSet(new Set());
    setPageAngles({});
    const initialOrder = Array.from({ length: totalPages }, (_, i) => i + 1);
    setOrderList(initialOrder);
    setPages(toolId === "reorder" ? initialOrder.join(",") : "");
  };

  if (!file || !file.name?.toLowerCase().endsWith(".pdf")) return null;

  const isRemove = toolId === "remove";
  const isExtract = toolId === "extract" || toolId === "split";
  const isRotate = toolId === "rotate";
  const isReorder = toolId === "reorder";

  if (!isRemove && !isExtract && !isRotate && !isReorder) return null;

  const displayPages = isReorder
    ? orderList.map((num) => thumbnails.find((t) => t.pageNum === num) || { pageNum: num, dataUrl: null })
    : thumbnails;

  return (
    <div dir={dir} className="rounded-2xl border border-[#19f08c]/30 bg-[#070a12]/90 p-3.5 space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2.5">
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#19f08c]" />
          <span className="text-xs font-black text-white">
            {isRemove
              ? isEn
                ? "Click pages to delete them"
                : "اضغط على أي صفحة لحذفها فوراً"
              : isRotate
              ? isEn
                ? "Click pages to rotate them live"
                : "اضغط على أي صفحة لتدويرها أمامك"
              : isReorder
              ? isEn
                ? "Use arrows to reorder pages"
                : "حرّك الصفحات بالأسهم لتغيير ترتيبها"
              : isEn
              ? "Click pages to extract/keep"
              : "اضغط على الصفحات المطلوب قصها واستخراجها"}
          </span>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-[#19f08c] bg-[#19f08c]/10 border border-[#19f08c]/30 px-2 py-0.5 rounded-full">
            {totalPages} {isEn ? "Pages" : "صفحة"} · {isEn ? "Free" : "مجاناً"}
          </span>
          {(selectedSet.size > 0 || isReorder) && (
            <button
              type="button"
              onClick={resetAll}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-amber-300 hover:underline cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              {isEn ? "Reset" : "إعادة ضبط"}
            </button>
          )}
        </div>
      </div>

      {loading && thumbnails.length === 0 ? (
        <div className="flex items-center justify-center gap-2 py-8 text-xs text-muted-foreground">
          <Loader2 className="w-4 h-4 animate-spin text-[#19f08c]" />
          <span>{isEn ? "Rendering visual page thumbnails..." : "جاري رسم مصغرات الصفحات للمعاينة..."}</span>
        </div>
      ) : (
        <div className="grid grid-cols-3 sm:grid-cols-4 gap-2.5 max-h-72 overflow-y-auto p-1">
          {displayPages.map((item, idx) => {
            const isSelected = selectedSet.has(item.pageNum);
            const visualRotation = isRotate
              ? isSelected
                ? pageAngles[item.pageNum] || angle || 90
                : 0
              : 0;

            return (
              <div
                key={`${item.pageNum}-${idx}`}
                onClick={() => (isRotate ? handleRotatePageClick({ stopPropagation: () => {} }, item.pageNum) : togglePageSelection(item.pageNum))}
                className={cn(
                  "group relative rounded-xl border p-1.5 cursor-pointer select-none transition-colors",
                  isRemove && isSelected
                    ? "border-rose-500 bg-rose-500/20"
                    : isSelected
                    ? "border-[#19f08c] bg-[#19f08c]/15"
                    : "border-white/10 bg-white/[0.03] hover:border-white/30"
                )}
              >
                {/* Page Number Pill */}
                <div className="flex items-center justify-between mb-1 px-0.5">
                  <span className="text-[10px] font-mono font-bold text-white/80">
                    #{item.pageNum}
                  </span>
                  {isRemove && (
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-md transition-colors",
                        isSelected ? "bg-rose-500 text-white" : "bg-white/10 text-white/60 group-hover:bg-rose-500/30 group-hover:text-rose-200"
                      )}
                    >
                      <Trash2 className="w-3 h-3" />
                    </span>
                  )}
                  {isExtract && (
                    <span
                      className={cn(
                        "grid size-5 place-items-center rounded-md transition-colors",
                        isSelected ? "bg-[#19f08c] text-[#03150c]" : "bg-white/10 text-white/60"
                      )}
                    >
                      <Check className="w-3 h-3" />
                    </span>
                  )}
                  {isRotate && (
                    <button
                      type="button"
                      onClick={(e) => handleRotatePageClick(e, item.pageNum)}
                      className={cn(
                        "grid size-5 place-items-center rounded-md transition-colors",
                        isSelected ? "bg-purple-500 text-white" : "bg-white/10 text-white/70 hover:bg-purple-500/30"
                      )}
                    >
                      <RotateCw className="w-3 h-3" />
                    </button>
                  )}
                </div>

                {/* Page Thumbnail Image */}
                <div className="relative aspect-[3/4] w-full overflow-hidden rounded-lg bg-white grid place-items-center">
                  {item.dataUrl ? (
                    <img
                      src={item.dataUrl}
                      alt={`Page ${item.pageNum}`}
                      style={{ transform: `rotate(${visualRotation}deg)` }}
                      className="h-full w-full object-contain transition-transform duration-200"
                    />
                  ) : (
                    <span className="text-xs font-mono font-bold text-slate-700">
                      P.{item.pageNum}
                    </span>
                  )}

                  {/* Deleted Overlay */}
                  {isRemove && isSelected && (
                    <div className="absolute inset-0 bg-rose-950/75 grid place-items-center">
                      <span className="rounded-full bg-rose-500 px-2 py-0.5 text-[9px] font-black text-white">
                        {isEn ? "DELETE" : "حذف"}
                      </span>
                    </div>
                  )}

                  {/* Rotation Angle Badge */}
                  {isRotate && visualRotation > 0 && (
                    <div className="absolute bottom-1 right-1 rounded bg-purple-600 px-1.5 py-0.5 text-[9px] font-mono font-bold text-white">
                      {visualRotation}°
                    </div>
                  )}
                </div>

                {/* Reorder Controls */}
                {isReorder && (
                  <div className="mt-1.5 flex items-center justify-between gap-1">
                    <button
                      type="button"
                      disabled={idx === 0}
                      onClick={(e) => {
                        e.stopPropagation();
                        movePageInOrder(idx, -1);
                      }}
                      className="flex-1 grid place-items-center rounded bg-white/10 py-1 text-white/80 hover:bg-[#19f08c]/25 disabled:opacity-30"
                    >
                      <ArrowRight className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                    </button>
                    <span className="text-[9px] font-mono text-emerald-300">
                      {idx + 1}
                    </span>
                    <button
                      type="button"
                      disabled={idx === displayPages.length - 1}
                      onClick={(e) => {
                        e.stopPropagation();
                        movePageInOrder(idx, 1);
                      }}
                      className="flex-1 grid place-items-center rounded bg-white/10 py-1 text-white/80 hover:bg-[#19f08c]/25 disabled:opacity-30"
                    >
                      <ArrowLeft className="w-3 h-3 rtl:rotate-0 ltr:rotate-180" />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
