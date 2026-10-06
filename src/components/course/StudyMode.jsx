import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { BookOpenCheck, ChevronRight, ChevronLeft, Lightbulb, GraduationCap, Eye, EyeOff } from "lucide-react";
import { cn } from "@/lib/utils";

// وضع المذاكرة: استعراض الأسئلة مع الإجابة الصحيحة وشرحها مباشرة — بدون مؤقت ولا درجات.
export default function StudyMode({ quiz }) {
  const questions = quiz?.questions || [];
  const [current, setCurrent] = useState(0);
  const [showAll, setShowAll] = useState(false);

  if (!questions.length) {
    return <p className="text-muted-foreground text-center py-8">لازم تولّد كويز الأول 📝</p>;
  }

  const q = questions[current];

  const go = (dir) => {
    setCurrent((c) => Math.min(Math.max(c + dir, 0), questions.length - 1));
  };

  return (
    <div className="max-w-2xl mx-auto">
      {/* Header */}
      <div className="glass-card neon-glow-cyan rounded-3xl p-5 border border-primary/30 mb-5 text-center">
        <GraduationCap className="w-9 h-9 text-primary mx-auto mb-2" />
        <h3 className="text-xl font-extrabold mb-1">وضع المذاكرة 📖</h3>
        <p className="text-sm text-muted-foreground">راجع الأسئلة وإجاباتها وشرحها على راحتك — ركّز على الفهم قبل الامتحان</p>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 gap-2 font-bold"
        >
          {showAll ? <><EyeOff className="w-4 h-4" /> عرض سؤال بسؤال</> : <><Eye className="w-4 h-4" /> اعرض كل الأسئلة</>}
        </Button>
      </div>

      {showAll ? (
        <div className="space-y-4">
          {questions.map((qq, idx) => (
            <StudyCard key={idx} q={qq} index={idx} />
          ))}
        </div>
      ) : (
        <>
          <div className="flex items-center justify-between mb-3 text-sm">
            <span className="font-bold text-muted-foreground">سؤال {current + 1} من {questions.length}</span>
            <span className="font-bold text-primary">{Math.round(((current + 1) / questions.length) * 100)}%</span>
          </div>
          <div className="w-full bg-secondary rounded-full h-1.5 mb-6 overflow-hidden">
            <motion.div
              className="h-full w-full bg-primary origin-left"
              animate={{ scaleX: (current + 1) / questions.length }}
              transition={{ duration: 0.3 }}
            />
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={current}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 20 }}
            >
              <StudyCard q={q} index={current} />
            </motion.div>
          </AnimatePresence>

          <div className="flex items-center justify-between mt-6 gap-3">
            <Button variant="outline" onClick={() => go(-1)} disabled={current === 0} className="gap-2 font-bold flex-1">
              <ChevronRight className="w-4 h-4" /> السابق
            </Button>
            <Button onClick={() => go(1)} disabled={current === questions.length - 1} className="gap-2 font-bold flex-1">
              التالي <ChevronLeft className="w-4 h-4" />
            </Button>
          </div>
        </>
      )}
    </div>
  );
}

function StudyCard({ q, index }) {
  return (
    <div className="glass-card rounded-3xl p-5 border border-border/60">
      <div className="flex items-start gap-3 mb-4">
        <span className="w-7 h-7 rounded-full bg-primary/15 text-primary text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{index + 1}</span>
        <p className="font-extrabold text-base leading-relaxed flex-1">{q.question}</p>
      </div>

      <div className="grid gap-2.5 mb-4">
        {q.options?.map((opt, i) => {
          const isCorrect = i === q.correct_index;
          return (
            <div
              key={i}
              className={cn(
                "flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold border",
                isCorrect
                  ? "border-[hsl(152,100%,50%)] bg-[hsl(152,100%,50%)]/10 text-foreground neon-glow-green"
                  : "border-border/50 text-muted-foreground"
              )}
            >
              {isCorrect && <BookOpenCheck className="w-4 h-4 text-[hsl(152,100%,50%)] shrink-0" />}
              <span>{opt}</span>
              {isCorrect && <span className="text-[10px] font-black text-[hsl(152,100%,50%)] mr-auto">الإجابة الصحيحة ✓</span>}
            </div>
          );
        })}
      </div>

      {q.explanation && (
        <div className="flex items-start gap-2.5 glass-card rounded-2xl p-4 border border-accent/25 bg-accent/5">
          <Lightbulb className="w-4 h-4 text-accent shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-black text-accent mb-1">الشرح</p>
            <p className="text-sm text-muted-foreground leading-relaxed">{q.explanation}</p>
          </div>
        </div>
      )}
    </div>
  );
}