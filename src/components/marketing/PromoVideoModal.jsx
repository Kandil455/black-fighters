import React, { useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play } from "lucide-react";
import PlatformVideoTour from "./PlatformVideoTour";

/**
 * PromoVideoModal — "فيديو المنصة"
 * Interactive HTML Platform Tour + MP4 fallback + Standalone HTML download.
 */
export default function PromoVideoModal({ open, onClose, isEn, onSelectPlan, onTryUpload }) {
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="promo-video-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/85 backdrop-blur-md p-2 sm:p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? "Platform tour and video" : "فيديو ودليل المنصة"}
        >
          <motion.div
            key="promo-video-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-4xl max-h-[92vh] flex flex-col rounded-2xl border border-[#19f08c]/45 bg-[#070a12] shadow-[0_0_48px_rgba(25,240,140,0.28)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08] bg-[#090c11]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#19f08c]/40 bg-[#19f08c]/15 text-[#19f08c]">
                  <Play className="w-4 h-4 fill-current" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {isEn ? "Black Fighters Platform Video & Tour" : "فيديو المنصة — جولة تفاعلية شاملة ⚡"}
                  </p>
                  <p className="text-[11px] text-[#9aa4b2] truncate">
                    {isEn
                      ? "Interactive HTML tour & video of transcription, summaries, quizzes, and FSRS"
                      : "عرض توضيحي كامل لتفريغ المحاضرات والتلخيص الأكاديمي والكويزات وبوت التليجرام"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                aria-label={isEn ? "Close" : "إغلاق"}
                className="shrink-0 w-8 h-8 rounded-lg grid place-items-center text-[#9aa4b2] hover:text-white bg-white/[0.04] border border-white/10 transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Tour & Video Content */}
            <div className="overflow-y-auto flex-1">
              <PlatformVideoTour
                onClose={onClose}
                onTryUpload={onTryUpload}
                onSelectPlan={onSelectPlan}
              />
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
