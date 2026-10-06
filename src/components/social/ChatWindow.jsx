import React, { useState, useEffect, useRef, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { db } from "@/lib/firebaseDb";
import {
  collection, query as fsQuery, where, orderBy, limit as fsLimit,
  onSnapshot, getDocs,
} from "firebase/firestore";
import { Link } from "react-router-dom";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Send, ArrowRight, ArrowLeft, Loader2, Bot, Sparkles, Target, X, GraduationCap } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { threadKey, aiThreadKey } from "@/lib/social";
import { invokeSecureFunction } from "@/lib/secureFunctions";
import { useLocale } from "@/lib/LocaleContext";

// Chat window: works for friends or for AI tutor (if peer.isAi = true)
//
// DELIVERY CONTRACT (the "بعتله كلمة ما وصلتش" bug): realtime must be
// THREAD-SCOPED. The old subscription attached a collection-wide onSnapshot
// to ALL directMessages — under participant-scoped security rules Firestore
// rejects the whole listener (permission-denied per unrelated docs), the
// error was swallowed into a console.warn, and the recipient simply never
// heard anything live. A thread-filtered listener only touches docs both
// parties may read, so it is allowed. A 4s poll and a push notification
// back it up so a message can no longer silently vanish.
export default function ChatWindow({ me, peer, onBack }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const isAi = !!peer?.isAi;
  const tk = isAi ? aiThreadKey(me.id) : threadKey(me.id, peer.id);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [quizPanel, setQuizPanel] = useState(false);
  const [myQuizzes, setMyQuizzes] = useState(null); // null = not loaded yet
  const scrollRef = useRef(null);
  const lastSeenRef = useRef(Date.now());

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
      // Thread-scoped read — matches the security rules shape (a participant
      // on every fetched doc), unlike the old whole-collection fetches.
      const snap = await getDocs(fsQuery(
        collection(db, "directMessages"),
        where("thread_key", "==", tk),
        orderBy("created_at", "asc"),
        fsLimit(200),
      ));
      setMessages(mapDocs(snap));
    } catch {
      // Composite index (thread_key + created_at) may not exist yet —
      // fall back to the entity layer's in-memory sort.
      const msgs = await base44.entities.DirectMessage.filter({ thread_key: tk }, "created_date", 200);
      setMessages(msgs || []);
    }
  }, [tk]);

  useEffect(() => { load(); }, [load]);

  // Realtime subscription — thread-scoped (see DELIVERY CONTRACT above).
  useEffect(() => {
    if (!db || isAi) return; // AI replies arrive via the send() round-trip
    let poll = null;
    const startPoll = () => {
      if (poll) return;
      poll = setInterval(load, 4000);
    };
    const unsub = onSnapshot(
      fsQuery(
        collection(db, "directMessages"),
        where("thread_key", "==", tk),
        fsLimit(50),
      ),
      (snap) => {
        const docs = mapDocs(snap);
        if (docs.length) {
          setMessages((prev) => {
            const byId = new Map(prev.map((m) => [m.id, m]));
            docs.forEach((m) => byId.set(m.id, m));
            return [...byId.values()].sort((a, b) => (a.ts || 0) - (b.ts || 0));
          });
          // Recipient-side nudge for genuinely-new remote messages only
          // (skip the initial history dump + my own echoes).
          const fresh = docs.filter(
            (m) => m.sender_id !== me.id
              && (m.ts || 0) > lastSeenRef.current
              && (m.ts || 0) >= Date.now() - 20000,
          );
          if (fresh.length) {
            const m = fresh[fresh.length - 1];
            pushNotification(me.id, {
              type: "social",
              title: peer?.name || "رسالة جديدة",
              body: m.content?.slice(0, 80) || "",
              icon: "message-circle",
              link: "/friends",
            }).catch(() => {});
          }
        }
        lastSeenRef.current = Date.now();
      },
      // Rules/index hiccup must NOT kill delivery silently — drop to polling.
      () => startPoll(),
    );
    return () => { unsub?.(); if (poll) clearInterval(poll); };
  }, [tk, isAi, me.id, peer?.name, load]);

  // Poll fallback even when the listener looks healthy — cheap (1 doc query
  // per 4s on an open window only) and it defeats every rules/index edge.
  useEffect(() => {
    if (isAi) return;
    const poll = setInterval(load, 4000);
    return () => clearInterval(poll);
  }, [isAi, load]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  // Quiz suggestion chips (non-AI threads): my last 5 shareable quizzes.
  useEffect(() => {
    if (isAi || !quizPanel || myQuizzes) return;
    base44.entities.StandaloneQuiz.filter({ user_id: me.id }, "-created_date", 5)
      .then((list) => setMyQuizzes(list || []))
      .catch(() => setMyQuizzes([]));
  }, [isAi, quizPanel, myQuizzes, me.id]);

  // Server-authoritative sends: friendship checks, content caps, anti-flood
  // and the recipient notification all happen on the server now.
  const send = async () => {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setText("");
    try {
      const history = isAi
        ? messages.slice(-10).map((m) => ({ is_ai: m.is_ai, content: m.content }))
        : undefined;
      const res = await invokeSecureFunction("social-actions", {
        action: "sendDirectMessage",
        receiverId: isAi ? "ai" : peer.id,
        content,
        history,
      });
      if (isAi && res?.data?.aiReply) {
        // The server already stored the AI reply; nothing else to do —
        // the poll/subscription below will render it.
      }
    } catch (err) {
      toast.error(err?.message || (isEn ? "Could not send the message" : "مقدرتش تبعت الرسالة"));
    } finally {
      setSending(false);
      load();
    }
  };

  const sendQuiz = async (quiz) => {
    setQuizPanel(false);
    try {
      await invokeSecureFunction("social-actions", {
        action: "sendDirectMessage",
        receiverId: peer.id,
        quizId: quiz.id,
      });
      toast.success(isEn ? "Quiz sent 🎯" : "اتبعت الكويز 🎯");
      load();
    } catch (err) {
      toast.error(err?.message || (isEn ? "Could not send the quiz" : "مقدرتش أبعت الكويز"));
    }
  };

  const BackIcon = isEn ? ArrowLeft : ArrowRight;

  return (
    <div className="flex flex-col h-[70vh] glass-card rounded-2xl border border-border/50 overflow-hidden" dir={dir}>
      {/* Header */}
      <div className="flex items-center gap-3 p-3 border-b border-border/50 bg-secondary/30">
        <button onClick={onBack} className="md:hidden w-9 h-9 rounded-lg hover:bg-secondary flex items-center justify-center">
          <BackIcon className="w-5 h-5" />
        </button>
        {isAi ? (
          <div className="w-10 h-10 rounded-full bg-accent/20 border border-accent/40 flex items-center justify-center">
            <Bot className="w-5 h-5 text-accent" />
          </div>
        ) : (
          <AnimatedAvatar src={peer.avatar_url} frame={peer.profile_frame} size={40} fallback="🎓" />
        )}
        <div>
          <p className="font-bold text-sm flex items-center gap-1">
            {isAi ? (isEn ? "Black Fighters AI" : "بلاك فايترز AI") : peer.name}
            {isAi && <Sparkles className="w-3.5 h-3.5 text-accent" />}
          </p>
          <p className="text-xs text-muted-foreground">
            {isAi ? (isEn ? "Smart AI Study Assistant" : "مساعدك الدراسي الذكي") : (isEn ? "Online" : "متصل")}
          </p>
        </div>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 space-y-3 scrollbar-none">
        {messages.length === 0 && (
          <div className="h-full flex flex-col items-center justify-center text-center text-muted-foreground">
            {isAi ? <Bot className="w-12 h-12 mb-2 text-accent/50" /> : <Send className="w-10 h-10 mb-2 opacity-40" />}
            <p className="text-sm">
              {isAi 
                ? (isEn ? "Ask Black Fighters AI anything about your study materials 🧠" : "اسأل بلاك فايترز AI أي حاجة في مذاكرتك 🧠") 
                : (isEn ? "Start the conversation 👋" : "ابدأ المحادثة 👋")}
            </p>
          </div>
        )}
        <AnimatePresence initial={false}>
          {messages.map((m) => {
            const mine = m.sender_id === me.id;
            const quizLink = m.is_quiz
              ? (m.content?.match(/\/q\/[A-Za-z0-9]+/)?.[0] || (m.quiz_id ? `/q/${m.quiz_id}` : null))
              : null;
            const quizTitle = m.content?.split("\n")?.[0] || "";
            // Per-user avatars: my bubbles carry MY avatar, theirs carry the
            // sender's own (falls back to the thread peer's current one).
            const avatarSrc = mine ? (me.avatar_url || "") : (m.sender_avatar || peer.avatar_url || "");
            return (
              <motion.div
                key={m.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex items-end gap-2 ${mine ? "justify-end" : "justify-start"}`}
              >
                {!mine && (
                  <AnimatedAvatar
                    src={avatarSrc}
                    frame={mine ? me.profile_frame : peer.profile_frame}
                    size={26}
                    fallback="🎓"
                  />
                )}
                {mine && (
                  <AnimatedAvatar src={avatarSrc} frame={me.profile_frame} size={26} fallback="🎓" />
                )}
                <div
                  className={`max-w-[78%] rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-wrap ${
                    mine
                      ? "bg-primary text-primary-foreground rounded-br-sm"
                      : m.is_ai
                      ? "bg-accent/15 border border-accent/30 rounded-bl-sm"
                      : "bg-secondary rounded-bl-sm"
                  }`}
                >
                  {quizLink ? (
                    <div className="space-y-2">
                      <p className="font-bold flex items-center gap-1.5">
                        <Target className="w-4 h-4 shrink-0" />
                        {quizTitle}
                      </p>
                      <Link
                        to={quizLink}
                        className="flex items-center justify-center gap-1.5 rounded-xl bg-primary text-primary-foreground text-xs font-bold px-3 py-2 hover:opacity-90 transition-opacity"
                      >
                        <GraduationCap className="w-4 h-4" />
                        {isEn ? "Start the quiz" : "ابدأ الكويز"}
                      </Link>
                    </div>
                  ) : (
                    m.content
                  )}
                </div>
              </motion.div>
            );
          })}
        </AnimatePresence>
        {isAi && sending && (
          <div className="flex justify-start">
            <div className="bg-accent/15 border border-accent/30 rounded-2xl rounded-bl-sm px-4 py-3">
              <Loader2 className="w-4 h-4 animate-spin text-accent" />
            </div>
          </div>
        )}
      </div>

      {/* Quiz suggestions — the "suggest he can send a quiz" affordance */}
      {!isAi && quizPanel && (
        <div className="border-t border-border/50 bg-secondary/20 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold text-muted-foreground">
              {isEn ? "Your latest quizzes — tap to send" : "آخر كويزاتك — اضغط للإرسال"}
            </p>
            <button onClick={() => setQuizPanel(false)} className="w-7 h-7 rounded-lg hover:bg-secondary flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>
          {myQuizzes === null ? (
            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
          ) : myQuizzes.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              {isEn ? "No quizzes yet — generate one from any summary" : "مفيش كويزات — اعمل واحد من أي ملخص"}
            </p>
          ) : (
            myQuizzes.map((q) => (
              <button
                key={q.id}
                onClick={() => sendQuiz(q)}
                className="w-full text-start rounded-xl border border-border/60 bg-background/60 px-3 py-2 text-xs font-bold hover:border-accent/50 transition-colors flex items-center gap-2"
              >
                <Target className="w-3.5 h-3.5 text-accent shrink-0" />
                <span className="truncate">{q.title || (isEn ? "Untitled quiz" : "كويز")}</span>
              </button>
            ))
          )}
        </div>
      )}

      {/* Input */}
      <div className="p-3 border-t border-border/50 flex items-center gap-2">
        {!isAi && (
          <Button
            onClick={() => setQuizPanel((v) => !v)}
            disabled={sending}
            size="icon"
            variant="secondary"
            className="shrink-0 rounded-xl"
            title={isEn ? "Send a quiz" : "ابعت كويز"}
          >
            <Target className="w-4 h-4" />
          </Button>
        )}
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && (e.preventDefault(), send())}
          placeholder={isEn ? "Type a message..." : "اكتب رسالة..."}
          disabled={sending}
        />
        <Button onClick={send} disabled={!text.trim() || sending} size="icon" className="shrink-0 rounded-xl">
          {sending && !isAi ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
        </Button>
      </div>
    </div>
  );
}
