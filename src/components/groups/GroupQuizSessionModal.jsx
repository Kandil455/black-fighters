import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { db } from "@/lib/firebaseDb";
import { doc, onSnapshot } from "firebase/firestore";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Play, Users, Clock, Trophy } from "lucide-react";
import { motion } from "framer-motion";
import GroupQuizLeaderboard from "@/components/groups/GroupQuizLeaderboard";
import SyncedQuizBody from "@/components/groups/SyncedQuizBody";
import { useLocale } from "@/lib/LocaleContext";

export default function GroupQuizSessionModal({ open, onClose, me, sessionId }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [session, setSession] = useState(null);
  const joinedRef = useRef(false);

  const refresh = useCallback(async () => {
    const list = await base44.entities.GroupQuizSession.filter({ id: sessionId });
    if (list?.[0]) setSession(list[0]);
  }, [sessionId]);

  // join + subscribe
  useEffect(() => {
    if (!open || !sessionId) return;
    let unsub = null;
    let poll = null;
    // Doc-scoped listener — whole-collection subscriptions are denied by the
    // membership rules (a member may read only their groups' sessions).
    try {
      unsub = onSnapshot(doc(db, "groupQuizSessions", sessionId), (snap) => {
        if (snap.exists()) setSession({ id: snap.id, ...snap.data() });
      });
    } catch { unsub = null; }
    poll = setInterval(refresh, 5000); // delivery backstop
    (async () => {
      const list = await base44.entities.GroupQuizSession.filter({ id: sessionId });
      let s = list?.[0];
      if (!s) return;
      const isIn = (s.participants || []).some((p) => p.user_id === me.id);
      if (!isIn && s.status === "waiting" && !joinedRef.current) {
        joinedRef.current = true;
        const participants = [...(s.participants || []), { user_id: me.id, user_name: me.full_name, avatar: me.avatar_url || "", score: 0, total: 0, percentage: 0, time_spent_seconds: 0, finished: false }];
        s = await base44.entities.GroupQuizSession.update(sessionId, { participants });
      }
      setSession(s);
    })();
    return () => { unsub?.(); if (poll) clearInterval(poll); joinedRef.current = false; };
  }, [open, sessionId, me.id, me.full_name, me.avatar_url, refresh]);

  const start = async () => {
    await base44.entities.GroupQuizSession.update(sessionId, { status: "active", started_at: new Date().toISOString() });
  };

  const handleFinish = async ({ score, total, time_spent_seconds }) => {
    const fresh = (await base44.entities.GroupQuizSession.filter({ id: sessionId }))[0];
    const participants = (fresh.participants || []).map((p) =>
      p.user_id === me.id
        ? { ...p, score, total, percentage: total ? Math.round((score / total) * 100) : 0, time_spent_seconds, finished: true }
        : p
    );
    const allDone = participants.length > 0 && participants.every((p) => p.finished);
    await base44.entities.GroupQuizSession.update(sessionId, { participants, ...(allDone ? { status: "finished" } : {}) });
  };

  if (!session) {
    return (
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent dir={dir} className="max-w-lg"><div className="py-16 text-center"><Loader2 className="w-7 h-7 animate-spin text-primary mx-auto" /></div></DialogContent>
      </Dialog>
    );
  }

  const isHost = session.host_id === me.id;
  const myEntry = (session.participants || []).find((p) => p.user_id === me.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent dir={dir} className="max-w-lg max-h-[90vh] overflow-y-auto scrollbar-none">
        {session.status === "waiting" && (
          <div className="text-center py-2">
            <motion.div animate={{ rotate: [0, -8, 8, 0] }} transition={{ duration: 2, repeat: Infinity }}
              className="w-14 h-14 rounded-2xl bg-accent/15 border border-accent/30 flex items-center justify-center mx-auto mb-3">
              <Trophy className="w-7 h-7 text-accent" />
            </motion.div>
            <h2 className="text-xl font-black mb-1">{session.quiz_title}</h2>
            <p className="text-sm text-muted-foreground mb-1 flex items-center justify-center gap-1.5">
              <Clock className="w-3.5 h-3.5" /> 
              {isEn 
                ? `${session.time_limit_minutes} min · ${session.questions.length} questions` 
                : `${session.time_limit_minutes} دقيقة · ${session.questions.length} سؤال`}
            </p>
            <p className="text-xs text-muted-foreground mb-5 flex items-center justify-center gap-1.5">
              <Users className="w-3.5 h-3.5" /> 
              {isEn 
                ? `${session.participants?.length || 0} joined` 
                : `${session.participants?.length || 0} منضمّين`}
            </p>

            <div className="flex flex-wrap gap-2 justify-center mb-6">
              {(session.participants || []).map((p) => (
                <span key={p.user_id} className="flex items-center gap-2 bg-secondary/50 rounded-full px-3 py-1 border border-border text-sm font-bold">
                  {p.user_name}{p.user_id === session.host_id && " 👑"}
                </span>
              ))}
            </div>

            {isHost ? (
              <Button onClick={start} disabled={(session.participants?.length || 0) < 2} className="w-full h-12 font-black gap-2 neon-glow-purple">
                <Play className="w-5 h-5" />
                {(session.participants?.length || 0) < 2 
                  ? (isEn ? "Waiting for members to join" : "محتاج عضو تاني ينضم") 
                  : (isEn ? "Start Quiz Now!" : "ابدأ الكويز!")}
              </Button>
            ) : (
              <p className="text-sm text-muted-foreground flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" /> 
                {isEn ? "Waiting for host to start..." : "في انتظار صاحب الجروب يبدأ..."}
              </p>
            )}
          </div>
        )}

        {session.status === "active" && (
          myEntry?.finished ? (
            <div>
              <h3 className="font-black text-center mb-4 flex items-center justify-center gap-2">
                <Trophy className="w-5 h-5 text-accent" /> {isEn ? "Live Leaderboard" : "الترتيب اللحظي"}
              </h3>
              <GroupQuizLeaderboard participants={session.participants} myId={me.id} live />
              <p className="text-xs text-muted-foreground text-center mt-4">
                {isEn ? "Waiting for remaining members to finish..." : "في انتظار باقي الأعضاء يخلّصوا..."}
              </p>
            </div>
          ) : (
            <SyncedQuizBody
              questions={session.questions}
              startedAt={new Date(session.started_at).getTime()}
              totalSeconds={(session.time_limit_minutes || 10) * 60}
              onFinish={handleFinish}
            />
          )
        )}

        {session.status === "finished" && (
          <div>
            <div className="text-center mb-4">
              <Trophy className="w-12 h-12 text-yellow-400 mx-auto mb-2" />
              <h2 className="text-xl font-black">{isEn ? "Final Results 🏆" : "النتايج النهائية 🏆"}</h2>
            </div>
            <GroupQuizLeaderboard participants={session.participants} myId={me.id} />
            <Button onClick={onClose} variant="outline" className="w-full mt-5 font-bold">
              {isEn ? "Close" : "إغلاق"}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}