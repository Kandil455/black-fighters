import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, CheckCircle2, Loader2, ArrowLeft, X } from "lucide-react";
import { backgroundSummaryTracker } from "@/lib/backgroundSummaryTracker";
import { useLocale } from "@/lib/LocaleContext";

export default function BackgroundSummaryPill() {
  const location = useLocation();
  const navigate = useNavigate();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [job, setJob] = useState(() => backgroundSummaryTracker.getState());

  useEffect(() => {
    return backgroundSummaryTracker.subscribe(setJob);
  }, []);

  const isOnCreatePage = location.pathname.startsWith("/create-course");
  const shouldShow = (job.active || job.completed) && !isOnCreatePage;

  if (!shouldShow) return null;

  const progressRatio = Math.max(0.05, Math.min(1, (job.progress || 5) / 100));

  return (
    <AnimatePresence>
      <motion.div
        dir={dir}
        initial={{ opacity: 0, y: 24, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 24, scale: 0.95 }}
        className="fixed bottom-20 md:bottom-6 left-4 right-4 sm:left-auto sm:right-6 sm:w-96 z-50 rounded-2xl border border-[#19f08c]/45 bg-[#070a12]/95 p-3.5 shadow-[0_0_32px_rgba(25,240,140,0.28)]"
      >
        <div className="flex items-center gap-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-xl border border-[#19f08c]/40 bg-[#19f08c]/15 text-[#19f08c]">
            {job.completed ? (
              <CheckCircle2 className="w-5 h-5" />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin" />
            )}
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-black text-white truncate">
                {job.completed
                  ? isEn
                    ? "Summary Ready!"
                    : "الملخص الذكي جاهز! 🎉"
                  : isEn
                  ? "Summarizing in background..."
                  : "التلخيص يعمل في الخلفية... ⚡"}
              </p>
              <span className="text-[11px] font-mono font-bold text-[#19f08c]">
                {Math.round(job.progress || 0)}%
              </span>
            </div>
            <p className="text-[11px] text-white/65 truncate mt-0.5">
              {job.fileName} · {job.statusText}
            </p>
          </div>

          {job.completed && (
            <button
              type="button"
              onClick={() => backgroundSummaryTracker.clearJob()}
              className="p-1 text-white/50 hover:text-white cursor-pointer"
              aria-label="Close"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Compositor-only progress bar using scaleX */}
        <div className="mt-2.5 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className="h-full w-full rounded-full bg-[#19f08c] transition-transform duration-300"
            style={{
              transform: `scaleX(${progressRatio})`,
              transformOrigin: dir === "rtl" ? "right" : "left",
            }}
          />
        </div>

        <div className="mt-2.5 flex items-center justify-between">
          <span className="text-[10px] text-emerald-300/80 flex items-center gap-1">
            <Sparkles className="w-3 h-3" />
            {isEn ? "Safe to browse any page" : "تصفح الموقع بحرية دون انقطاع"}
          </span>
          <button
            type="button"
            onClick={() => navigate("/create-course")}
            className="inline-flex items-center gap-1 rounded-lg bg-[#19f08c] px-2.5 py-1 text-[11px] font-black text-[#03150c] hover:bg-[#19f08c]/90 cursor-pointer"
          >
            <span>{job.completed ? (isEn ? "Open Summary" : "افتح الملخص الآن") : (isEn ? "View Progress" : "عرض التقدم")}</span>
            <ArrowLeft className="w-3 h-3 ltr:rotate-180" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
