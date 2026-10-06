import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2, CheckCircle2, ChevronRight } from "lucide-react";
import { practicalQuizJob } from "@/lib/practicalQuizJob";

export default function PracticalQuizBackgroundWidget() {
  const [job, setJob] = useState(practicalQuizJob.getState());
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    return practicalQuizJob.subscribe((next) => setJob(next));
  }, []);

  const isPracticalPage = location.pathname === "/practical";

  if (!job.isRunning && !job.isCompleted) return null;
  // If user is already on practical page and it's done, hide widget
  if (isPracticalPage && job.isCompleted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 20, scale: 0.95 }}
        onClick={() => navigate("/practical")}
        className="fixed top-18 sm:top-5 left-1/2 -translate-x-1/2 z-[55] max-w-sm w-[92vw] sm:w-auto cursor-pointer select-none"
      >
        <div className={`p-2.5 px-4 rounded-2xl border shadow-2xl backdrop-blur-2xl flex items-center justify-between gap-3 transition-colors ${
          job.isCompleted
            ? "bg-emerald-950/80 border-emerald-500/40 text-emerald-300 shadow-[0_0_25px_rgba(16,185,129,0.3)]"
            : "bg-[#090b14]/90 border-cyan-500/40 text-white shadow-[0_0_25px_rgba(0,245,255,0.25)]"
        }`}>
          <div className="flex items-center gap-2.5 min-w-0">
            {job.isCompleted ? (
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            ) : (
              <Loader2 className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
            )}
            <div className="min-w-0">
              <span className="text-xs font-black block truncate">
                {job.isCompleted
                  ? "اكتمل الكويز العملي بنجاح! 🎯"
                  : `جاري توليد الكويز العملي بالخلفية (${job.current}/${job.total})`}
              </span>
              {!job.isCompleted && (
                <div className="flex items-center gap-2 mt-0.5">
                  <div className="w-24 h-1 bg-white/10 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-primary transition-colors duration-300"
                      style={{ width: `${job.percent}%` }}
                    />
                  </div>
                  <span className="text-[10px] font-mono text-cyan-400 font-bold">{job.percent}%</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 shrink-0">
            <span>{job.isCompleted ? "حل الكويز" : "عرض"}</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
