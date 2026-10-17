import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Play, Shuffle, Timer } from "lucide-react";

export default function QuizPrep({ quiz, onStart }) {
  const questionCount = quiz?.questions?.length || 0;
  const stats = quiz?.stats || quiz?.quality_stats || {};
  const profile = quiz?.quiz_profile || quiz?.profile;
  const mode = quiz?.quiz_mode || stats.mode;
  const [shuffled, setShuffled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-5 max-w-lg mx-auto"
    >
      <div className="glass rounded-[1.5rem] p-6 md:p-8 border border-[#19f08c]/35 text-center shadow-[0_0_36px_-14px_rgba(25,240,140,0.28)]">
        <div className="mx-auto mb-3 grid size-12 place-items-center rounded-2xl border border-[#19f08c]/35 bg-[#19f08c]/10 text-[#19f08c]">
          <BookOpenCheck className="w-6 h-6" />
        </div>
        <h3 className="text-2xl font-extrabold text-[#f5f7fa] mb-1">
          جاهز لبداية الاختبار؟
        </h3>
        <p className="text-sm text-[#9aa4b2]">
          أمامك{" "}
          <span className="text-[#19f08c] font-mono font-bold tabular">
            {questionCount}
          </span>{" "}
          سؤال مدقق مع التفسير العلمي الفوري لكل إجابة
        </p>
        {(mode || profile || stats.duplicates_removed || stats.invalid_removed) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
            {mode && (
              <span className="rounded-full border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c] px-2.5 py-1 font-mono">
                {mode}
              </span>
            )}
            {profile && (
              <span className="rounded-full border border-white/10 bg-white/[0.04] text-[#f5f7fa] px-2.5 py-1 font-mono">
                {profile}
              </span>
            )}
            {!!stats.duplicates_removed && (
              <span className="rounded-full border border-amber-400/25 bg-amber-400/10 text-amber-300 px-2.5 py-1">
                تم حذف {stats.duplicates_removed} تكرار
              </span>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => setShuffled((s) => !s)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
            shuffled
              ? "border-[#19f08c]/55 text-[#f5f7fa] bg-[#19f08c]/[0.08]"
              : "glass text-[#9aa4b2] hover:border-white/[0.15]"
          }`}
        >
          <Shuffle className="w-5 h-5 shrink-0 text-[#19f08c]" />
          <div className="text-start flex-1">
            <p className="font-bold text-sm text-[#f5f7fa]">ترتيب عشوائي للأسئلة</p>
            <p className="text-xs text-[#9aa4b2]">يخلط الأسئلة في كل محاولة</p>
          </div>
          <span
            className={`w-10 h-6 rounded-full p-1 transition-colors ${
              shuffled ? "bg-[#19f08c]" : "bg-white/10"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-[#05070a] transition-transform ${
                shuffled ? "-translate-x-4" : ""
              }`}
            />
          </span>
        </button>

        <button
          type="button"
          onClick={() => setTimerEnabled((t) => !t)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors cursor-pointer ${
            timerEnabled
              ? "border-[#19f08c]/55 text-[#f5f7fa] bg-[#19f08c]/[0.08]"
              : "glass text-[#9aa4b2] hover:border-white/[0.15]"
          }`}
        >
          <Timer className="w-5 h-5 shrink-0 text-[#19f08c]" />
          <div className="text-start flex-1">
            <p className="font-bold text-sm text-[#f5f7fa]">المؤقّت (45 ثانية للسؤال)</p>
            <p className="text-xs text-[#9aa4b2]">أوقفه إذا أردت الحل بهدوء بدون وقت</p>
          </div>
          <span
            className={`w-10 h-6 rounded-full p-1 transition-colors ${
              timerEnabled ? "bg-[#19f08c]" : "bg-white/10"
            }`}
          >
            <span
              className={`block w-4 h-4 rounded-full bg-[#05070a] transition-transform ${
                timerEnabled ? "-translate-x-4" : ""
              }`}
            />
          </span>
        </button>
      </div>

      <Button
        onClick={() => onStart({ shuffled, timerEnabled })}
        className="w-full h-12 font-bold gap-2 btn-primary-glow bg-[#19f08c] text-[#03150c] hover:bg-[#19f08c]/90 rounded-xl"
      >
        <Play className="w-4 h-4" /> ابدأ الاختبار الآن
      </Button>
    </motion.div>
  );
}
