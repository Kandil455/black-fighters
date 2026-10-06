import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { db } from "@/lib/firebaseDb";
import {
  collection, query as fsQuery, where, orderBy, limit as fsLimit,
  onSnapshot, getDocs,
} from "firebase/firestore";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowRight, Loader2, Bot, Users } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { toast } from "sonner";

const AI_TRIGGER = /^(@ai|@blackfighters|@bf|@توجي|@toji)\b/i;

// شات جماعي للجروب — لو الرسالة بتبدأ بـ @ai أو @blackfighters، مساعد Black Fighters يرد
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

  // Group-scoped reads — the security rules only allow members to read docs of
  // their own groups, so queries MUST be filtered by group_id (a whole-
  // collection listener is permission-denied, same contract as ChatWindow).
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
      // Composite index may not exist yet — fall back to the entity layer's
      // in-memory sort (created_date aliases created_at there).
      const msgs = await base44.entities.GroupMessage.filter({ group_id: group.id }, "created_date", 200);
      setMessages(msgs || []);
    }
  }, [group.id]);

  const loadSession = useCallback(async () => {
    const sessions = await base44.entities.GroupQuizSession.filter({ group_id: group.id, status: "waiting" }, "-created_date", 1);
    setLiveSession(sessions?.[0] || null);
  }, [group.id]);

  useEffect(() => { load(); loadSession(); }, [load, loadSession]);

  // Realtime: group-scoped listener + 4s poll as delivery backstop
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
      () => startPoll(), // listener refused → poll keeps delivery alive
    );
    // Also group-scoped: whole-collection listeners are denied by the rules
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
    const pollS = setInterval(loadSession, 6000); // backstop for the session banner
    return () => { unsub?.(); unsubS?.(); stopPoll(); clearInterval(pollS); };
  }, [group.id, load, loadSession]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Server-authoritative sends: membership checks, content caps, anti-flood,
  // and the @ai reply are all enforced on the server.
  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const history = messages.slice(-8).map((m) => ({ is_ai: m.is_ai, content: m.content }));
      const res = await invokeSecureFunction("social-actions", {
        action: "sendGroupMessage",
        groupId: group.id,
        content,
        history,
      });
      if (res?.data?.aiReply) {
        // The server already stored the AI reply; the subscription/poll renders it.
      }
    } catch (err) {
      toast.error(err?.message || "مقدرتش تبعت الرسالة");
    } finally {
      setSending(false);
      load();
    }
  };

  return (
    <div className="flex flex-col h-[70vh] glass-card rounded-2xl border border-border/50 overflow-hidden">
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-secondary/30">
        <button onClick={onBack} className="lg:hidden w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center">
          <ArrowRight className="w-5 h-5" />
        </button>
        <div className="w-10 h-10 rounded-xl bg-primary/15 border border-primary/30 flex items-center justify-center text-xl shrink-0">
          {group.emoji || "📚"}
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm truncate">{group.name}</p>
          <p className="text-xs text-muted-foreground flex items-center gap-1">
            <Users className="w-3 h-3" /> {group.member_ids?.length || 0} أعضاء
          </p>
        </div>
        <Button onClick={onOpenQuiz} size="sm" variant="outline" className="gap-1.5 font-bold shrink-0">
          🎯 كويز جماعي
        </Button>
      </div>

      {/* Live quiz banner */}
      {liveSession && (
        <motion.button
          initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          onClick={() => onJoinSession?.(liveSession.id)}
          className="flex items-center gap-3 px-4 py-2.5 bg-accent/15 border-b border-accent/30 hover:bg-accent/25 transition-colors text-right">
          <span className="text-lg shrink-0">🎯</span>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-sm text-accent truncate">كويز جماعي شغّال: {liveSession.quiz_title}</p>
            <p className="text-xs text-muted-foreground">اضغط للانضمام · {liveSession.participants?.length || 0} منضمّين</p>
          </div>
          <span className="text-xs font-bold bg-accent/20 text-accent px-3 py-1 rounded-full shrink-0">انضم</span>
        </motion.button>
      )}

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            <Users className="w-12 h-12 mb-2 opacity-30" />
            <p className="text-sm">ابدأوا النقاش وتبادلوا الأسئلة 💬</p>
            <p className="text-xs mt-1">اكتب <span className="text-accent font-bold">@توجي</span> عشان تسأل المساعد الذكي</p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender_id === me.id;
            return (
              <motion.div key={m.id} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className={`flex gap-2 ${mine ? "justify-end" : "justify-start"}`}>
                {!mine && (
                  m.is_ai ? (
                    <div className="w-8 h-8 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center shrink-0 self-end">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                  ) : (
                    <AnimatedAvatar src={m.sender_avatar} size={32} fallback="🎓" className="self-end" />
                  )
                )}
                <div className={`max-w-[72%] ${mine ? "items-end" : "items-start"} flex flex-col`}>
                  {!mine && <span className={`text-[11px] mb-0.5 px-1 font-bold ${m.is_ai ? "text-accent" : "text-muted-foreground"}`}>{m.sender_name}</span>}
                  <div className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    mine ? "bg-primary text-primary-foreground rounded-br-sm"
                    : m.is_ai ? "bg-accent/15 border border-accent/30 rounded-bl-sm"
                    : "bg-secondary rounded-bl-sm"
                  }`}>
                    {m.content}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {sending && AI_TRIGGER.test(text) && (
          <div className="flex justify-start"><div className="bg-accent/15 border border-accent/30 rounded-2xl px-4 py-3"><Loader2 className="w-4 h-4 animate-spin text-accent" /></div></div>
        )}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-border/50 flex items-center gap-2">
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder="اكتب رسالة... (@توجي للمساعد)"
          disabled={sending}
        />
        <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="shrink-0 rounded-xl">
          {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}