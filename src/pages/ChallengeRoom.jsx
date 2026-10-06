import React, { useEffect, useState, useRef, useCallback } from "react";
import { useParams } from "react-router-dom";
import { base44 } from "@/api/base44Client";
import { useAuth } from "@/lib/AuthContext";
import NeonBackground from "@/components/NeonBackground";
import PageLoader from "@/components/PageLoader";
import ChallengeLobby from "@/components/challenge/ChallengeLobby";
import ChallengeQuiz from "@/components/challenge/ChallengeQuiz";
import ChallengeResult from "@/components/challenge/ChallengeResult";
import { Button } from "@/components/ui/button";
import { Brain, LogIn, AlertTriangle } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { db } from "@/lib/firebaseDb";
import { doc, getDoc, onSnapshot, updateDoc } from "firebase/firestore";

export default function ChallengeRoom() {
  const { id } = useParams();
  const { isAuthenticated, isLoadingAuth, redirectToLogin } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [challenge, setChallenge] = useState(null);
  const [quiz, setQuiz] = useState(null);
  const [me, setMe] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [starting, setStarting] = useState(false);
  const joinedRef = useRef(false);

  // load + join + subscribe
  useEffect(() => {
    if (!isAuthenticated || !id) return;
    let unsub = null;
    let active = true;

    (async () => {
      try {
        const meData = await base44.auth.me();
        if (!active) return;
        setMe(meData);

        // Fetch challenge document with Firestore direct + base44 fallback + retry
        let ch = null;
        for (let attempt = 0; attempt < 3; attempt++) {
          if (db) {
            try {
              const snap = await getDoc(doc(db, "challenges", id));
              if (snap.exists()) {
                ch = { id: snap.id, ...snap.data() };
                break;
              }
            } catch (err) {
              console.warn("Direct Firestore challenge fetch error:", err);
            }
          }
          try {
            ch = await base44.entities.Challenge.get(id);
            if (ch) break;
            const list = await base44.entities.Challenge.filter({ id });
            if (list?.[0]) { ch = list[0]; break; }
          } catch {}

          // Brief delay before retry in case document was just written
          if (attempt < 2) await new Promise((r) => setTimeout(r, 400));
        }

        if (!active) return;
        if (!ch) {
          setError(true);
          setLoading(false);
          return;
        }

        // Fetch attached quiz questions
        let q = null;
        if (ch.quiz_questions && Array.isArray(ch.quiz_questions) && ch.quiz_questions.length > 0) {
          q = { id: ch.quiz_id, title: ch.quiz_title, questions: ch.quiz_questions };
        } else if (ch.quiz_id) {
          try {
            q = await base44.entities.StandaloneQuiz.get(ch.quiz_id);
            if (!q) {
              const qList = await base44.entities.StandaloneQuiz.filter({ id: ch.quiz_id });
              q = qList?.[0];
            }
            if (!q && db) {
              const snap = await getDoc(doc(db, "standaloneQuizzes", ch.quiz_id));
              if (snap.exists()) q = { id: snap.id, ...snap.data() };
            }
            if (!q) {
              const content = await base44.entities.GeneratedContent.get(ch.quiz_id, "quiz");
              if (content) q = content;
            }
          } catch (quizErr) {
            console.warn("Quiz load error in challenge:", quizErr);
          }
        }
        if (q && active) setQuiz(q);

        // Join if not already a participant and room is waiting
        const isParticipant = (ch.participants || []).some((p) => p.user_id === meData.id);
        if (!isParticipant && ch.status === "waiting" && (ch.participants || []).length < 2 && !joinedRef.current) {
          joinedRef.current = true;
          const updated = [
            ...(ch.participants || []),
            {
              user_id: meData.id,
              user_name: meData.full_name || meData.email || "منافس",
              score: 0,
              total: 0,
              percentage: 0,
              time_spent_seconds: 0,
              finished: false,
            },
          ];
          ch = { ...ch, participants: updated };
          if (db) {
            updateDoc(doc(db, "challenges", id), { participants: updated }).catch(() => {});
          } else {
            base44.entities.Challenge.update(id, { participants: updated }).catch(() => {});
          }
        }

        if (!active) return;
        setChallenge(ch);
        setLoading(false);

        // Real-time Firestore sync
        if (db) {
          unsub = onSnapshot(
            doc(db, "challenges", id),
            (snap) => {
              if (snap.exists() && active) {
                const liveData = { id: snap.id, ...snap.data() };
                setChallenge(liveData);
              }
            },
            (err) => console.warn("Challenge onSnapshot warning:", err.message)
          );
        } else if (typeof base44.entities.Challenge.subscribe === "function") {
          unsub = base44.entities.Challenge.subscribe((ev) => {
            if (ev?.id === id && ev?.data && active) setChallenge(ev.data);
          });
        }
      } catch (e) {
        console.error("ChallengeRoom error:", e);
        if (active) {
          setError(true);
          setLoading(false);
        }
      }
    })();

    return () => {
      active = false;
      if (typeof unsub === "function") unsub();
    };
  }, [id, isAuthenticated]);

  const handleSetTime = useCallback(async (minutes) => {
    setChallenge((c) => (c ? { ...c, time_limit_minutes: minutes } : c));
    if (db) {
      await updateDoc(doc(db, "challenges", id), { time_limit_minutes: minutes }).catch(() => {});
    } else {
      await base44.entities.Challenge.update(id, { time_limit_minutes: minutes });
    }
  }, [id]);

  const handleStart = useCallback(async () => {
    setStarting(true);
    const startData = { status: "active", started_at: new Date().toISOString() };
    setChallenge((c) => (c ? { ...c, ...startData } : c));
    if (db) {
      await updateDoc(doc(db, "challenges", id), startData).catch(() => {});
    } else {
      await base44.entities.Challenge.update(id, startData);
    }
    setStarting(false);
  }, [id]);

  const handleFinish = useCallback(async (arg1, arg2) => {
    let score = 0;
    let total = 1;
    let time_spent_seconds = 0;
    if (typeof arg1 === "object" && arg1 !== null) {
      score = Number(arg1.score) || 0;
      total = Number(arg1.total) || (quiz?.questions?.length || challenge?.quiz_questions?.length || 1);
      time_spent_seconds = Number(arg1.time_spent_seconds) || 0;
    } else {
      score = Number(arg1) || 0;
      time_spent_seconds = Number(arg2) || 0;
      total = quiz?.questions?.length || challenge?.quiz_questions?.length || 1;
    }

    let fresh = null;
    if (db) {
      const snap = await getDoc(doc(db, "challenges", id)).catch(() => null);
      if (snap?.exists()) fresh = { id: snap.id, ...snap.data() };
    }
    if (!fresh) {
      fresh = await base44.entities.Challenge.get(id).catch(() => null);
    }
    if (!fresh && challenge) fresh = challenge;
    if (!fresh) return;

    const safeTotal = Math.max(1, total);
    const participants = (fresh.participants || []).map((p) =>
      p.user_id === me?.id
        ? { ...p, score, total: safeTotal, percentage: Math.round((score / safeTotal) * 100), time_spent_seconds, finished: true }
        : p
    );
    const allDone = participants.length >= 1 && participants.every((p) => p.finished);
    const updateData = { participants, ...(allDone ? { status: "finished" } : {}) };

    setChallenge((c) => (c ? { ...c, ...updateData } : c));
    if (db) {
      await updateDoc(doc(db, "challenges", id), updateData).catch(() => {});
    } else {
      await base44.entities.Challenge.update(id, updateData);
    }
  }, [id, me, challenge, quiz]);

  if (isLoadingAuth) return <PageLoader />;

  if (!isAuthenticated) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4" dir={dir}>
        <NeonBackground />
        <div className="relative z-10 glass-card rounded-3xl p-8 text-center border border-accent/20 max-w-sm">
          <Brain className="w-14 h-14 text-accent mx-auto mb-4" />
          <h1 className="text-xl font-black mb-2">{isEn ? "Challenge Awaiting! ⚔️" : "تحدّي في انتظارك! ⚔️"}</h1>
          <p className="text-muted-foreground text-sm mb-6">{isEn ? "Sign in to enter the challenge room and play." : "سجّل دخولك عشان تدخل الغرفة وتلعب."}</p>
          <Button onClick={() => redirectToLogin(window.location.pathname)} className="w-full h-11 font-bold gap-2">
            <LogIn className="w-4 h-4" /> {isEn ? "Sign in & Enter" : "سجّل دخول وادخل"}
          </Button>
        </div>
      </div>
    );
  }

  if (loading) return <PageLoader message={isEn ? "Entering the room..." : "بندخّلك الغرفة..."} />;

  if (error || !challenge) {
    return (
      <div className="relative min-h-screen flex items-center justify-center px-4" dir={dir}>
        <NeonBackground />
        <div className="relative z-10 glass-card rounded-3xl p-10 text-center border border-destructive/30 max-w-sm">
          <AlertTriangle className="w-12 h-12 text-destructive mx-auto mb-3" />
          <h2 className="text-lg font-black mb-1">{isEn ? "Room Not Found" : "الغرفة مش موجودة"}</h2>
          <p className="text-muted-foreground text-sm">{isEn ? "It might be closed or the link is incorrect." : "يمكن تكون اتقفلت أو اللينك غلط."}</p>
        </div>
      </div>
    );
  }

  const myEntry = (challenge.participants || []).find((p) => p.user_id === me?.id);
  const other = (challenge.participants || []).find((p) => p.user_id !== me?.id);
  const isHost = challenge.host_id === me?.id;

  return (
    <div className="relative min-h-screen px-4 py-8 sm:py-12" dir={dir}>
      <NeonBackground />
      <div className="relative z-10">
        {challenge.status === "finished" ? (
          <ChallengeResult challenge={challenge} myId={me?.id} />
        ) : challenge.status === "active" ? (
          myEntry?.finished ? (
            <div className="text-center py-20 max-w-md mx-auto">
              <div className="glass-card rounded-3xl p-8 border border-accent/20">
                <Brain className="w-12 h-12 text-accent mx-auto mb-3 animate-pulse" />
                <p className="font-black text-lg mb-1">{isEn ? "Finished! 🎯" : "خلّصت! 🎯"}</p>
                <p className="text-sm text-muted-foreground">{isEn ? "Waiting for the opponent to finish to reveal live results." : "في انتظار اللاعب التاني يخلّص عشان تشوفوا النتيجة مع بعض."}</p>
              </div>
            </div>
          ) : (
            <ChallengeQuiz challenge={{ ...challenge, _quiz: quiz || { questions: challenge.quiz_questions || [] } }} onFinish={handleFinish} otherFinished={other?.finished} />
          )
        ) : (
          <ChallengeLobby challenge={challenge} isHost={isHost} onStart={handleStart} onSetTime={handleSetTime} starting={starting} />
        )}
      </div>
    </div>
  );
}