import React, { useEffect } from "react";
import { Medal, Clock, RotateCcw, Home } from "@/components/ui/animatedIcons";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";

function fmtTime(s = 0) {
  const m = Math.floor(s / 60);
  const sec = s % 60;
  return `${m}:${String(sec).padStart(2, "0")}`;
}

export default function ChallengeResult({ challenge, myId }) {
  const navigate = useNavigate();
  const players = [...(challenge.participants || [])].sort((a, b) => {
    if (b.percentage !== a.percentage) return b.percentage - a.percentage;
    return (a.time_spent_seconds || 0) - (b.time_spent_seconds || 0);
  });
  const winner = players[0];
  const iWon = winner?.user_id === myId;
  const isTie = players.length === 2 && players[0]?.percentage === players[1]?.percentage && players[0]?.time_spent_seconds === players[1]?.time_spent_seconds;

  useEffect(() => {
    if (iWon && !isTie) {
      confetti({ particleCount: 140, spread: 80, origin: { y: 0.6 } });
    }
  }, [iWon, isTie]);

  return (
    <div className="max-w-2xl mx-auto pb-12">
      {/* Editorial Header */}
      <div className="hd text-center mb-8">
        <span className="mono">نتائج التحدي</span>
        <h1 className="serif">
          {isTie ? "تعادل " : iWon ? "مبروك! " : "خسرت "}
          <em style={{ color: "var(--sig)" }}>{isTie ? "مشترك." : iWon ? "كسبت الجولة." : "الجولة."}</em>
        </h1>
        <p className="mx-auto" style={{ color: "var(--mute)" }}>
          {challenge.quiz_title}
        </p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {players.map((p, rank) => {
          const isMe = p.user_id === myId;
          const isWinner = rank === 0 && !isTie;
          return (
            <div
              key={p.user_id}
              className="card text-center relative overflow-hidden"
              style={{
                borderColor: isWinner ? "var(--sig)" : "var(--line)",
                backgroundColor: isWinner ? "color-mix(in srgb, var(--sig) 5%, var(--paper2))" : "var(--paper2)",
              }}
            >
              {isWinner && (
                <div
                  className="absolute top-0 left-0 right-0 mono text-[11px] font-bold py-1"
                  style={{ background: "var(--sig)", color: "var(--sigink)" }}
                >
                  👑 الفائز الأول
                </div>
              )}
              <div className="flex justify-center mt-2">
                <span className={`av ${isWinner ? "me" : ""}`} style={{ width: 56, height: 56, fontSize: "1.2rem" }}>
                  {(p.user_name || "?")[0].toUpperCase()}
                </span>
              </div>
              <h3 className="font-bold text-base mb-1 flex items-center justify-center gap-1.5">
                {p.user_name} {isMe && <span className="tag on text-[10px]">أنت</span>}
              </h3>
              <div className="big my-1" style={{ fontSize: "3.5rem" }}>
                {p.percentage}%
              </div>
              <div className="flex items-center justify-center gap-4 text-xs" style={{ color: "var(--mute)" }}>
                <span className="flex items-center gap-1"><Medal className="w-3.5 h-3.5" animated={false} /> {p.score}/{p.total}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" animated={false} /> {fmtTime(p.time_spent_seconds)}</span>
              </div>
            </div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <button onClick={() => navigate("/quizzes")} className="btn sm line">
          <Home className="w-4 h-4" animated={false} /> الكويزات
        </button>
        <button onClick={() => navigate(`/challenge/new/${challenge.quiz_id}`)} className="btn sm">
          <RotateCcw className="w-4 h-4" animated={false} /> تحدّي تاني
        </button>
      </div>
    </div>
  );
}