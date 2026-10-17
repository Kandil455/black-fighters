import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { db } from "@/lib/firebaseDb";
import {
  collection, query as fsQuery, where, orderBy, limit as fsLimit,
  onSnapshot, getDocs,
} from "firebase/firestore";
import { ArrowRight, Loader2, Bot, Users } from "@/components/ui/animatedIcons";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { toast } from "sonner";

const AI_TRIGGER = /^(@ai|@blackfighters|@bf|@توجي|@toji)\b/i;

// شات جماعي للجروب بتصميم Editorial
export default function GroupChatWindow({ me, group, onBack, onOpenQuiz, onJoinSession }) {
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [liveSession, setLiveSession] = useState(null);
  const scrollRef = useRef(null);

  const mapDocs = (snap) =>
    snap.docs.map((d) => {
      const data = d.data() || {};
      const ts = data.created_at?.toMillis?.()
        ?? (typeof data.created_at?.seconds === "number" ? data.created_at.seconds * 1000 : 0);
      return { id: d.id, ts, ...data };
    });

  const load = useCallback(async () => {
    if (!db) return;
    try {
      const snap = await getDocs(fsQuery(
        collection(db, "groupMessages"),
        where("group_id", "==", group.id),
        orderBy("created_at", "asc"),
        fsLimit(200),
      ));
      setMessages(mapDocs(snap));
    } catch {
      const msgs = await base44.entities.GroupMessage.filter({ group_id: group.id }, "created_date", 200);
      setMessages(msgs || []);
    }
  }, [group.id]);

  const loadSession = useCallback(async () => {
    const sessions = await base44.entities.GroupQuizSession.filter({ group_id: group.id, status: "waiting" }, "-created_date", 1);
    setLiveSession(sessions?.[0] || null);
  }, [group.id]);

  useEffect(() => { load(); loadSession(); }, [load, loadSession]);

  useEffect(() => {
    if (!db) return;
    let poll = null;
    const startPoll = () => { if (!poll) poll = setInterval(load, 4000); };
    const stopPoll = () => { if (poll) { clearInterval(poll); poll = null; } };
    const unsub = onSnapshot(
      fsQuery(
        collection(db, "groupMessages"),
        where("group_id", "==", group.id),
        fsLimit(50),
      ),
      () => load(),
      () => startPoll(),
    );
    let unsubS = null;
    try {
      unsubS = onSnapshot(
        fsQuery(
          collection(db, "groupQuizSessions"),
          where("group_id", "==", group.id),
          where("status", "==", "waiting"),
          fsLimit(1),
        ),
        () => loadSession(),
        () => startPoll(),
      );
    } catch { unsubS = null; }
    const pollS = setInterval(loadSession, 6000);
    return () => { unsub?.(); unsubS?.(); stopPoll(); clearInterval(pollS); };
  }, [group.id, load, loadSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const history = messages.slice(-8).map((m) => ({ is_ai: m.is_ai, content: m.content }));
      await invokeSecureFunction("social-actions", {
        action: "sendGroupMessage",
        groupId: group.id,
        content,
        history,
      });
    } catch (err) {
      toast.error(err?.message || "مقدرتش تبعت الرسالة");
    } finally {
      setSending(false);
      load();
    }
  };

  return (
    <div className="card h-[75vh] flex flex-col p-4">
      {/* Editorial Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[var(--line)]">
        <div className="flex items-center gap-3">
          <button onClick={onBack} className="lg:hidden p-1 hover:bg-[var(--paper)] rounded">
            <ArrowRight className="w-5 h-5" animated={false} />
          </button>
          <span className="av me">{group.emoji || group.name?.[0] || "📚"}</span>
          <div>
            <b className="text-base block">{group.name}</b>
            <span className="mono text-[0.7rem] block">
              شات · {group.member_ids?.length || 0} أعضاء
            </span>
          </div>
        </div>

        <button onClick={onOpenQuiz} className="btn sm line">
          🎯 كويز جماعي
        </button>
      </div>

      {/* Live quiz banner */}
      {liveSession && (
        <button
          onClick={() => onJoinSession?.(liveSession.id)}
          className="flex items-center justify-between p-3 my-2 border border-[var(--sig)] bg-[color-mix(in_srgb,var(--sig)_10%,var(--paper2))] text-start"
        >
          <div>
            <b className="text-sm block" style={{ color: "var(--sig)" }}>
              🎯 كويز جماعي شغّال: {liveSession.quiz_title}
            </b>
            <span className="mono text-[0.7rem] block">
              {liveSession.participants?.length || 0} منضمّين
            </span>
          </div>
          <span className="btn sm">انضم</span>
        </button>
      )}

      {/* Messages Stream */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-3 chat scrollbar-none">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center" style={{ color: "var(--mute)" }}>
            <Users className="w-10 h-10 mb-2 opacity-30" animated={false} />
            <p className="text-sm">ابدأوا النقاش وتبادلوا الأسئلة 💬</p>
            <span className="mono text-[0.7rem] mt-1">
              اكتب @توجي لسؤال المساعد الذكي
            </span>
          </div>
        ) : (
          messages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <div
                key={m.id}
                className={`msg ${mine ? "me" : ""}`}
                style={{
                  alignSelf: mine ? "flex-end" : "flex-start",
                  maxWidth: "80%",
                }}
              >
                {!mine && (
                  <div className="flex items-center gap-1.5 mb-1">
                    {m.is_ai ? (
                      <Bot className="w-3.5 h-3.5" style={{ color: "var(--sig)" }} animated={false} />
                    ) : (
                      <AnimatedAvatar src={m.sender_avatar} size={18} fallback="🎓" />
                    )}
                    <b style={{ color: "var(--sig)", fontSize: "0.8rem" }}>
                      {m.sender_name}
                    </b>
                  </div>
                )}
                <div className="text-sm whitespace-pre-wrap">{m.content}</div>
              </div>
            );
          })
        )}
        {sending && AI_TRIGGER.test(text) && (
          <div className="msg" style={{ alignSelf: "flex-start" }}>
            <Loader2 className="w-4 h-4 animate-spin" style={{ color: "var(--sig)" }} animated={false} />
          </div>
        )}
      </div>

      {/* Composer */}
      <div className="comp mt-2">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="اكتب رسالة للجروب... (@توجي للمساعد)"
          disabled={sending}
        />
        <button
          onClick={send}
          disabled={!text.trim() || sending}
          className="btn sm"
        >
          {sending ? <Loader2 className="w-4 h-4 animate-spin" animated={false} /> : "ابعت"}
        </button>
      </div>

      {/* Quick Actions */}
      <div className="flex gap-2 flex-wrap pt-2">
        <button onClick={onOpenQuiz} className="btn sm line">
          ابدأ تحدي لايف
        </button>
        <button
          onClick={() => {
            navigator.clipboard?.writeText?.(window.location.href);
            toast.success("اتنسخ رابط الجروب!");
          }}
          className="btn sm line"
        >
          انسخ رابط الجروب
        </button>
      </div>
    </div>
  );
}