import React from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { X, Check, ArrowRight, PartyPopper } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

const difficultyLabel = (value, isEn) => {
  const dict = {
    easy: isEn ? "Easy" : "سهل",
    medium: isEn ? "Medium" : "متوسط",
    hard: isEn ? "Hard" : "صعب",
  };
  return dict[value] || (isEn ? "Mixed" : "متنوع");
};

const isPredominantlyLatin = (text = "") => {
  const s = String(text || "");
  const latin = (s.match(/[A-Za-z]/g) || []).length;
  const arabic = (s.match(/[\u0600-\u06FF]/g) || []).length;
  return latin > arabic * 2 && latin >= 3;
};

export default function MistakesReview({ questions, answers, onBack }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const mistakes = questions
    .map((q, i) => ({ q, i, picked: answers[i] }))
    .filter(({ q, picked }) => picked !== (q.correct_index ?? q.correct));

  if (mistakes.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-card rounded-3xl p-10 text-center border border-green-500/30 neon-glow-green max-w-lg mx-auto"
        dir={dir}
      >
        <PartyPopper className="w-14 h-14 text-green-400 mx-auto mb-4" />
        <h2 className="text-2xl font-black mb-2">{isEn ? "No Mistakes! 🎉" : "مفيش أخطاء! 🎉"}</h2>
        <p className="text-muted-foreground mb-6">{isEn ? "You answered every question correctly — Flawless!" : "جاوبت كل الأسئلة صح — احترافي!"}</p>
        <Button onClick={onBack} variant="outline" className="gap-2 font-bold">
          <ArrowRight className={isEn ? "w-4 h-4 rotate-180" : "w-4 h-4"} /> {isEn ? "Back" : "رجوع"}
        </Button>
      </motion.div>
    );
  }

  return (
    <div className="max-w-2xl mx-auto" dir={dir}>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-black">{isEn ? "Mistakes Review" : "مراجعة أخطائك"}</h2>
          <p className="text-sm text-muted-foreground">
            {isEn 
              ? `${mistakes.length} ${mistakes.length === 1 ? "question" : "questions"} to reinforce`
              : `${mistakes.length} سؤال محتاج تراجعه`}
          </p>
        </div>
        <Button onClick={onBack} variant="outline" size="sm" className="gap-1.5 font-bold">
          <ArrowRight className={isEn ? "w-4 h-4 rotate-180" : "w-4 h-4"} /> {isEn ? "Back" : "رجوع"}
        </Button>
      </div>

      <div className="space-y-4">
        {mistakes.map(({ q, i, picked }, idx) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: idx * 0.06 }}
            className="glass-card rounded-2xl p-5 border border-border"
          >
            <div className="flex items-start gap-2 mb-4">
              <span className="w-6 h-6 rounded-full bg-destructive/15 text-destructive text-xs font-black flex items-center justify-center shrink-0 mt-0.5">{i + 1}</span>
              <div className="flex-1">
                {(q.topic || q.difficulty || q.source_ref) && (
                  <div className="mb-2 flex flex-wrap gap-2 text-[11px] font-bold">
                    {q.topic && <span className="rounded-full border border-primary/25 bg-primary/10 text-primary px-2.5 py-1">{q.topic}</span>}
                    {q.difficulty && <span className="rounded-full border border-accent/25 bg-accent/10 text-accent px-2.5 py-1">{difficultyLabel(q.difficulty, isEn)}</span>}
                    {q.source_ref && <span className="rounded-full border border-border bg-secondary/60 text-muted-foreground px-2.5 py-1">{q.source_ref}</span>}
                  </div>
                )}
                <h3
                  dir={isPredominantlyLatin(q.question) ? "ltr" : "auto"}
                  className={cn("font-bold leading-relaxed", isPredominantlyLatin(q.question) ? "text-left" : "text-start")}
                >
                  {q.question}
                </h3>
              </div>
            </div>

            <div className="space-y-2">
              {q.options.map((opt, oi) => {
                const isCorrect = oi === (q.correct_index ?? q.correct);
                const isPicked = oi === picked;
                return (
                  <div
                    key={oi}
                    className={cn(
                      "rounded-xl border px-3.5 py-2.5 text-sm font-semibold flex items-center justify-between gap-2",
                      isCorrect && "border-green-500/50 bg-green-500/10 text-green-400",
                      isPicked && !isCorrect && "border-destructive/50 bg-destructive/10 text-destructive",
                      !isCorrect && !isPicked && "border-border opacity-60"
                    )}
                  >
                    <span dir={isPredominantlyLatin(opt) ? "ltr" : "auto"}>{opt}</span>
                    {isCorrect && <span className="flex items-center gap-1 text-[11px] shrink-0"><Check className="w-3.5 h-3.5" /> {isEn ? "Correct" : "الصح"}</span>}
                    {isPicked && !isCorrect && <span className="flex items-center gap-1 text-[11px] shrink-0"><X className="w-3.5 h-3.5" /> {isEn ? "Your Answer" : "إجابتك"}</span>}
                  </div>
                );
              })}
            </div>

            {q.explanation && (
              <div className="mt-3 p-3 rounded-xl bg-secondary/40 border border-border text-sm leading-relaxed">
                <div className="font-bold text-primary mb-1">{isEn ? "Explanation:" : "الشرح:"}</div>
                <p
                  dir={isPredominantlyLatin(q.explanation) ? "ltr" : "auto"}
                  className={cn(isPredominantlyLatin(q.explanation) ? "text-left" : "text-start")}
                >
                  {q.explanation}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
