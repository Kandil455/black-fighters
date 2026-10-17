import React, { useState, useEffect, useRef } from "react";
import { useLocale } from "@/lib/LocaleContext";
import { Check, X, Loader2 } from "@/components/ui/animatedIcons";

function fmt(s) {
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, "0")}`;
}

export default function ChallengeQuiz({ challenge, onFinish, otherFinished }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const questions = challenge._quiz?.questions || (Array.isArray(challenge._quiz) ? challenge._quiz : []) || challenge.quiz_questions || [];
  const startedAt = challenge.started_at ? new Date(challenge.started_at).getTime() : Date.now();
  const totalSeconds = (challenge.time_limit_minutes || 10) * 60;

  const [current, setCurrent] = useState(0);
  const [selected, setSelected] = useState(null);
  const [answered, setAnswered] = useState(false);
  const [score, setScore] = useState(0);
  const [remaining, setRemaining] = useState(totalSeconds);
  const [submitting, setSubmitting] = useState(false);
  const answersRef = useRef([]);
  const finishedRef = useRef(false);

  useEffect(() => {
    const tick = () => {
      const elapsed = Math.floor((Date.now() - startedAt) / 1000);
      const left = Math.max(0, totalSeconds - elapsed);
      setRemaining(left);
      if (left <= 0 && !finishedRef.current) finish();
    };
    tick();
    const iv = setInterval(tick, 1000);
    return () => clearInterval(iv);
  }, [startedAt, totalSeconds]);

  const finish = () => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    setSubmitting(true);
    const spent = Math.min(totalSeconds, Math.floor((Date.now() - startedAt) / 1000));
    onFinish({
      score,
      total: questions.length || 1,
      time_spent_seconds: spent,
      answers: answersRef.current,
    });
  };

  const handleSelect = (idx) => {
    if (answered) return;
    setSelected(idx);
    setAnswered(true);
    const q = questions[current];
    const isCorrect = idx === q.correct_index;
    const newScore = isCorrect ? score + 1 : score;
    if (isCorrect) setScore(newScore);
    answersRef.current.push({ question_index: current, selected: idx, correct: isCorrect });
  };

  const handleNext = () => {
    if (current + 1 >= questions.length) {
      finish();
      return;
    }
    setCurrent((c) => c + 1);
    setSelected(null);
    setAnswered(false);
  };

  if (submitting) {
    return (
      <div className="card text-center py-20 max-w-md mx-auto" dir={dir}>
        <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4" style={{ color: "var(--sig)" }} animated={false} />
        <h2 className="serif text-2xl font-normal">{isEn ? "You're done! 🎯" : "خلّصت! 🎯"}</h2>
        <p className="text-sm mt-1" style={{ color: "var(--mute)" }}>
          {otherFinished
            ? (isEn ? "Calculating results..." : "بنحسب النتيجة...")
            : (isEn ? "Waiting for the other player to finish..." : "في انتظار اللاعب التاني يخلّص...")}
        </p>
      </div>
    );
  }

  if (!questions || questions.length === 0) {
    return (
      <div className="card text-center py-16 max-w-md mx-auto" dir={dir}>
        <span className="mono mb-2">تنبيه</span>
        <p className="font-bold text-lg mb-4">{isEn ? "No questions found in this quiz" : "لم يتم العثور على أسئلة لهذا الكويز"}</p>
        <button onClick={() => window.history.back()} className="btn sm">
          {isEn ? "Go Back" : "رجوع"}
        </button>
      </div>
    );
  }

  const q = questions[current] || {};
  const progressPct = totalSeconds > 0 ? (remaining / totalSeconds) * 100 : 100;

  return (
    <div dir={dir} className="max-w-2xl mx-auto space-y-4">
      {/* Editorial Header & Timer */}
      <div className="hd text-center">
        <span className="mono">
          {isEn ? `Question ${current + 1} of ${questions.length}` : `سؤال ${current + 1} من ${questions.length}`}
        </span>
        <div className="timer">{fmt(remaining)}</div>
        <div className="bar my-2">
          <i style={{ width: `${progressPct}%` }} />
        </div>
      </div>

      {/* Question Card */}
      <div className="card">
        <b className="text-lg leading-relaxed block">{q.question}</b>

        <div style={{ display: "grid", gap: 8 }} className="mt-3">
          {(q.options || []).map((opt, i) => {
            const isCorrect = i === q.correct_index;
            const isSelected = i === selected;
            let optClass = "opt";
            if (answered) {
              if (isCorrect) optClass += " ok";
              else if (isSelected && !isCorrect) optClass += " bad";
            }

            return (
              <button
                key={i}
                type="button"
                onClick={() => handleSelect(i)}
                disabled={answered}
                className={optClass}
                style={{ opacity: answered && !isCorrect && !isSelected ? 0.45 : 1 }}
              >
                <span className="grow text-start">{opt}</span>
                {answered && isCorrect && <Check className="w-4 h-4 shrink-0" style={{ color: "var(--ok)" }} animated={false} />}
                {answered && isSelected && !isCorrect && <X className="w-4 h-4 shrink-0" style={{ color: "var(--bad)" }} animated={false} />}
              </button>
            );
          })}
        </div>

        {answered && (
          <button onClick={handleNext} className="btn w-full mt-4">
            {current + 1 >= questions.length ? (isEn ? "Finish" : "إنهاء") : (isEn ? "Next" : "التالي")}
          </button>
        )}
      </div>
    </div>
  );
}