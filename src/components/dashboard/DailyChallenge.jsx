import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { Zap, CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

function dailyPick(arr) {
  if (!arr.length) return null;
  const todayStr = new Date().toISOString().split("T")[0];
  const seed = todayStr.split("-").reduce((a, b) => a + parseInt(b, 10), 0);
  return arr[seed % arr.length];
}

export default function DailyChallenge() {
  const [q, setQ] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const questions = await base44.entities.Question.filter({}, "-created_date", 50);
        const valid = questions.filter((x) => x.options?.length >= 2);
        if (valid.length) {
          const picked = dailyPick(valid);
          setQ({
            question: picked.question_text,
            options: picked.options,
            correct_index: picked.correct_option_index,
            explanation: picked.explanation,
          });
        }
      } catch {}
    })();
  }, []);

  if (!q) return null;

  return (
    <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="glass-card neon-glow-purple rounded-3xl p-6 border border-accent/30 mb-8">
      <div className="flex items-center gap-2 mb-3">
        <Zap className="w-5 h-5 text-accent" />
        <h2 className="font-extrabold text-lg">تحدّي اليوم ⚡</h2>
      </div>
      <p className="font-bold mb-4">{q.question}</p>
      <div className="grid sm:grid-cols-2 gap-2.5">
        {q.options.map((opt, i) => {
          const isCorrect = i === q.correct_index;
          const isSel = i === selected;
          return (
            <button
              key={i}
              onClick={() => selected === null && setSelected(i)}
              disabled={selected !== null}
              className={cn(
                "text-start glass-card rounded-xl px-4 py-3 text-sm border transition-colors",
                selected === null && "border-border hover:border-accent/50",
                selected !== null && isCorrect && "border-[hsl(152,100%,50%)] neon-glow-green",
                selected !== null && isSel && !isCorrect && "border-destructive",
                selected !== null && !isSel && !isCorrect && "opacity-50 border-border"
              )}
            >
              <span className="flex items-center justify-between gap-2">
                {opt}
                {selected !== null && isCorrect && <CheckCircle2 className="w-4 h-4 text-[hsl(152,100%,50%)] shrink-0" />}
                {selected !== null && isSel && !isCorrect && <XCircle className="w-4 h-4 text-destructive shrink-0" />}
              </span>
            </button>
          );
        })}
      </div>
      {selected !== null && q.explanation && (
        <p className="text-xs text-muted-foreground glass-card rounded-xl p-3 mt-3">{q.explanation}</p>
      )}
    </motion.div>
  );
}