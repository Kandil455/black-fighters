import React, { useEffect } from "react";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Trophy, Medal, Clock, RotateCcw, Home } from "lucide-react";
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
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-2xl mx-auto"
    >
      <div className="text-center mb-8">
        <motion.div
          initial={{ scale: 0, rotate: -30 }}
          animate={{ scale: 1, rotate: 0 }}
          transition={{ type: "spring", stiffness: 160, delay: 0.1 }}
        >
          <Trophy className="w-16 h-16 mx-auto text-yellow-400 mb-3" />
        </motion.div>
        <h1 className="text-3xl font-black neon-text-gradient mb-1">
          {isTie ? "تعادل! 🤝" : iWon ? "مبروك! كسبت 🏆" : "خسرت الجولة 💪"}
        </h1>
        <p className="text-muted-foreground text-sm">{challenge.quiz_title}</p>
      </div>

      <div className="grid sm:grid-cols-2 gap-4 mb-8">
        {players.map((p, rank) => {
          const isMe = p.user_id === myId;
          const isWinner = rank === 0 && !isTie;
          return (
            <motion.div
              key={p.user_id}
              initial={{ opacity: 0, x: rank === 0 ? -30 : 30 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.2 + rank * 0.1 }}
              className={`glass-card rounded-3xl p-6 border text-center relative overflow-hidden ${
                isWinner ? "border-yellow-400/50 neon-glow-cyan" : "border-border"
              }`}
            >
              {isWinner && (
                <div className="absolute top-0 left-0 right-0 bg-yellow-400/15 text-yellow-400 text-[11px] font-black py-1">
                  👑 الفائز
                </div>
              )}
              <div className={`w-16 h-16 rounded-full mx-auto mb-3 flex items-center justify-center text-2xl font-black text-white ${isWinner ? "bg-gradient-to-br from-yellow-400 to-orange-500" : "bg-gradient-to-br from-primary to-accent"} ${isWinner ? "mt-4" : ""}`}>
                {(p.user_name || "?")[0].toUpperCase()}
              </div>
              <h3 className="font-black text-lg mb-1 flex items-center justify-center gap-1.5">
                {p.user_name} {isMe && <span className="text-[10px] bg-primary/15 text-primary px-1.5 py-0.5 rounded">أنت</span>}
              </h3>
              <div className="text-4xl font-black mb-2" style={{ color: isWinner ? "#facc15" : undefined }}>
                {p.percentage}%
              </div>
              <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Medal className="w-3.5 h-3.5" /> {p.score}/{p.total}</span>
                <span className="flex items-center gap-1"><Clock className="w-3.5 h-3.5" /> {fmtTime(p.time_spent_seconds)}</span>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="flex gap-3 justify-center">
        <Button variant="outline" onClick={() => navigate("/quizzes")} className="gap-2 font-bold">
          <Home className="w-4 h-4" /> الكويزات
        </Button>
        <Button onClick={() => navigate(`/challenge/new/${challenge.quiz_id}`)} className="gap-2 font-bold neon-glow-purple">
          <RotateCcw className="w-4 h-4" /> تحدّي تاني
        </Button>
      </div>
    </motion.div>
  );
}