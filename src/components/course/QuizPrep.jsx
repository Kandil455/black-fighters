import React, { useState } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, Play, Shuffle, Timer } from "lucide-react";

// Quick setup screen shown BEFORE the quiz starts.
export default function QuizPrep({ quiz, onStart }) {
  const questionCount = quiz?.questions?.length || 0;
  const stats = quiz?.stats || quiz?.quality_stats || {};
  const profile = quiz?.quiz_profile || quiz?.profile;
  const mode = quiz?.quiz_mode || stats.mode;
  const [shuffled, setShuffled] = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 max-w-lg mx-auto">
      <div className="glass-card neon-glow-cyan rounded-3xl p-6 md:p-8 border border-primary/30 text-center">
        <BookOpenCheck className="w-10 h-10 text-primary mx-auto mb-3" />
        <h3 className="text-2xl font-extrabold mb-1">جاهز للكويز؟</h3>
        <p className="text-muted-foreground">
          فيه <span className="text-primary font-bold">{questionCount}</span> سؤال مستنّيك — ركّز ومتغلطش في ولا نمرة 💪
        </p>
        {(mode || profile || stats.duplicates_removed || stats.invalid_removed) && (
          <div className="mt-4 flex flex-wrap justify-center gap-2 text-[11px] font-bold">
            {mode && <span className="rounded-full border border-primary/25 bg-primary/10 text-primary px-2.5 py-1">{mode}</span>}
            {profile && <span className="rounded-full border border-accent/25 bg-accent/10 text-accent px-2.5 py-1">{profile}</span>}
            {!!stats.duplicates_removed && <span className="rounded-full border border-yellow-400/25 bg-yellow-400/10 text-yellow-300 px-2.5 py-1">تم حذف {stats.duplicates_removed} تكرار</span>}
            {!!stats.invalid_removed && <span className="rounded-full border border-destructive/25 bg-destructive/10 text-destructive px-2.5 py-1">تم تجاهل {stats.invalid_removed} سؤال غير صالح</span>}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setShuffled((s) => !s)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors ${shuffled ? "border-accent text-accent bg-accent/5" : "border-border text-muted-foreground hover:border-accent/40"}`}
        >
          <Shuffle className="w-5 h-5 shrink-0" />
          <div className="text-start flex-1">
            <p className="font-bold text-sm">ترتيب عشوائي للأسئلة</p>
            <p className="text-xs opacity-70">يخلط الأسئلة في كل مرة</p>
          </div>
          <span className={`w-10 h-6 rounded-full p-1 transition-colors ${shuffled ? "bg-accent" : "bg-border"}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${shuffled ? "-translate-x-4" : ""}`} />
          </span>
        </button>

        <button
          onClick={() => setTimerEnabled((t) => !t)}
          className={`w-full flex items-center gap-3 p-4 rounded-2xl border transition-colors ${timerEnabled ? "border-primary text-primary bg-primary/5" : "border-border text-muted-foreground hover:border-primary/40"}`}
        >
          <Timer className="w-5 h-5 shrink-0" />
          <div className="text-start flex-1">
            <p className="font-bold text-sm">المؤقّت (45 ثانية للسؤال)</p>
            <p className="text-xs opacity-70">قفله لو عايز تحل على راحتك</p>
          </div>
          <span className={`w-10 h-6 rounded-full p-1 transition-colors ${timerEnabled ? "bg-primary" : "bg-border"}`}>
            <span className={`block w-4 h-4 rounded-full bg-white transition-transform ${timerEnabled ? "-translate-x-4" : ""}`} />
          </span>
        </button>
      </div>

      <Button onClick={() => onStart({ shuffled, timerEnabled })} className="w-full h-12 font-bold gap-2">
        <Play className="w-4 h-4" /> يلا نبدأ الحل
      </Button>
    </motion.div>
  );
}
