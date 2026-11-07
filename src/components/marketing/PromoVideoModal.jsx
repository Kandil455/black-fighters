import React, { useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Play, Sparkles, Upload, Crown } from "lucide-react";
import { playClick } from "@/lib/sounds";

/**
 * PromoVideoModal — "فيديو المنصة"
 * Connects the Dashboard platform-video button to the intro assets in /public/videos.
 */
export default function PromoVideoModal({ open, onClose, isEn, onSelectPlan, onTryUpload }) {
  const videoRef = useRef(null);

  // Autoplay when opened, pause on close, lock body scroll while open.
  useEffect(() => {
    if (!open) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const video = videoRef.current;
    if (video) {
      video.currentTime = 0;
      video.play().catch(() => {});
    }
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prevOverflow;
      window.removeEventListener("keydown", onKey);
      if (videoRef.current) videoRef.current.pause();
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
          className="fixed inset-0 z-[90] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={onClose}
          role="dialog"
          aria-modal="true"
          aria-label={isEn ? "Platform intro video" : "فيديو تعريفي بالمنصة"}
        >
          <motion.div
            key="promo-video-card"
            initial={{ opacity: 0, y: 24, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.96 }}
            transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
            className="relative w-full max-w-3xl rounded-2xl border border-[#19f08c]/45 bg-[#070a12] shadow-[0_0_48px_rgba(25,240,140,0.28)] overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3 px-4 sm:px-5 py-3 border-b border-white/[0.08]">
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="grid size-8 shrink-0 place-items-center rounded-lg border border-[#19f08c]/40 bg-[#19f08c]/15 text-[#19f08c]">
                  <Play className="w-4 h-4 fill-current" />
                </span>
                <div className="min-w-0">
                  <p className="text-sm font-black text-white truncate">
                    {isEn ? "Black Fighters Platform Tour" : "جولة سريعة داخل منصة بلاك فايترز ⚡"}
                  </p>
                  <p className="text-[11px] text-[#9aa4b2] truncate">
                    {isEn
                      ? "Watch how summaries, quizzes, and FSRS review work in one place"
                      : "شاهد كيف يعمل التلخيص والكويزات والمراجعة الذكية في مكان واحد"}
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

            <div className="relative bg-black aspect-video">
              <video
                ref={videoRef}
                className="w-full h-full object-contain"
                controls
                playsInline
                preload="metadata"
                poster="/videos/black-fighters-poster.jpg"
              >
                <source src="/videos/black-fighters-intro.webm" type="video/webm" />
                <source src="/videos/black-fighters-intro.mp4" type="video/mp4" />
                {isEn
                  ? "Your browser does not support the video tag."
                  : "متصفحك لا يدعم تشغيل الفيديو."}
              </video>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 px-4 sm:px-5 py-3.5 border-t border-white/[0.08] bg-[#090c11]">
              <p className="flex items-center gap-1.5 text-[11px] text-[#9aa4b2]">
                <Sparkles className="w-3.5 h-3.5 text-[#19f08c] shrink-0" />
                <span>
                  {isEn
                    ? "Upload your first lecture in under a minute"
                    : "ارفع أول محاضرة لك في أقل من دقيقة"}
                </span>
              </p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onClose?.();
                    onSelectPlan?.();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-amber-400/40 bg-amber-400/10 hover:bg-amber-400/20 px-3 py-2 text-xs font-bold text-amber-300 transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Crown className="w-3.5 h-3.5" />
                  <span>{isEn ? "View Plans" : "شوف الباقات"}</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playClick();
                    onClose?.();
                    onTryUpload?.();
                  }}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-[#19f08c] hover:bg-[#3bf59d] px-3.5 py-2 text-xs font-black text-[#03150c] transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>{isEn ? "Upload a Lecture" : "ارفع محاضرة الآن"}</span>
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
