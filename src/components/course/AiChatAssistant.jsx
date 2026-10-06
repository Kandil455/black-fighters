import React, { useState, useRef, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, X, Trash2, Loader2, Copy, Check, Mic, Square, Sparkles, Shirt, Gift } from "lucide-react";
import { cn } from "@/lib/utils";
import ChatMarkdown from "@/components/course/ChatMarkdown.jsx";
import { SpeakButton, useSpeechInput } from "@/components/course/VoiceControls.jsx";
import { getSuggestions } from "@/components/course/chatSuggestions";
import MascotSkin from "@/components/course/MascotSkin.jsx";
import MascotSkinStore from "@/components/course/MascotSkinStore.jsx";
import { getSkin } from "@/lib/mascotSkins";
import { canClaimDaily, claimDailyReward } from "@/lib/mascotRewards";
import { buildCourseRetrievalIndex, retrieveCourseContext } from "@/lib/courseRetrieval";
import { parseAgentReply, applySummaryEdit, createQuizFromSummary, SUMMARY_QUIZ_DEFAULT_COUNT } from "@/lib/summaryAgent";
import { AI_SUMMARY_EDIT_COST, AI_QUIZ_FROM_SUMMARY_COST } from "@/lib/creditCosts";
import { bumpCounter } from "@/lib/gamification";
import { toast } from "sonner";

// ── Agent action bar: turns chat into REAL work on the saved summary ──────
function AgentActions({ msg, onDone }) {
  if (!msg.actions?.length) return null;
  if (msg.busy) {
    return (
      <div className="px-3 pb-2 text-xs text-amber-400 font-bold flex items-center gap-1.5">
        <Loader2 className="w-3.5 h-3.5 animate-spin" /> جاري التنفيذ على الملف...
      </div>
    );
  }
  if (msg.done) {
    return (
      <div className="px-3 pb-2 flex flex-wrap items-center gap-2">
        <span className="text-xs text-emerald-400 font-bold flex items-center gap-1.5">
          <Check className="w-3.5 h-3.5" /> {msg.done}
        </span>
        {msg.quizLink && (
          <a href={msg.quizLink}
            className="text-xs font-black px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25 transition-colors">
            🚀 ادخل امتحن الكويز
          </a>
        )}
      </div>
    );
  }
  return (
    <div className="px-3 pb-2 flex flex-wrap gap-2">
      {msg.actions.map((a, i) => {
        const isQuiz = a.kind === "create_quiz";
        const cost = isQuiz ? AI_QUIZ_FROM_SUMMARY_COST : AI_SUMMARY_EDIT_COST;
        const label = isQuiz
          ? `🎯 اعمل كويز ${a.count} أسئلة (${cost} كريدت)`
          : `✒️ عدّل ملف التلخيص (${cost} كريدت)`;
        return (
          <button key={i} onClick={() => onDone(a, msg)}
            className="text-xs font-black px-3 py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary hover:bg-primary/25 transition-colors">
            {label}
          </button>
        );
      })}
    </div>
  );
}

function MsgBubble({ msg, skinId, onAction }) {
  const [copied, setCopied] = useState(false);
  const isAI = msg.role === "assistant";

  const copy = () => {
    navigator.clipboard.writeText(msg.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.97 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ type: "spring", stiffness: 380, damping: 28 }}
      className={cn("flex gap-2 group", isAI ? "flex-row" : "flex-row-reverse")}
    >
      {isAI && (
        <div className="shrink-0 mt-1"><MascotSkin skinId={skinId} size={30} showFx={false} /></div>
      )}
      <div className={cn(
        "relative max-w-[85%] px-4 py-2.5 rounded-2xl",
        isAI
          ? "bg-secondary/60 text-foreground rounded-tl-sm border border-border/40"
          : "bg-primary/20 text-foreground rounded-tr-sm border border-primary/30"
      )}>
        {msg.loading ? (
          <div className="flex items-center gap-1.5 py-1">
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:0ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:150ms]" />
            <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce [animation-delay:300ms]" />
          </div>
        ) : isAI ? (
          <>
            <ChatMarkdown content={msg.content} />
            {Array.isArray(msg.sources) && msg.sources.length > 0 && (
              <div className="mt-3 pt-2 border-t border-border/40" aria-label="مراجع الرد">
                <p className="text-[10px] font-bold text-muted-foreground mb-1.5">المراجع المستخدمة</p>
                <div className="flex flex-wrap gap-1.5">
                  {msg.sources.map((source) => (
                    <span
                      key={`${source.id}-${source.label}`}
                      title={source.label}
                      className="max-w-full truncate rounded-full border border-primary/25 bg-primary/10 px-2 py-1 text-[10px] text-primary"
                    >
                      [{source.id}] {source.label}
                    </span>
                  ))}
                </div>
              </div>
            )}
            <AgentActions msg={msg} onDone={onAction} />
          </>
        ) : (
          <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
        )}

        {isAI && !msg.loading && (
          <div className="absolute -top-2 left-2 flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity bg-card/90 backdrop-blur rounded-full px-1 py-0.5 border border-border/40">
            <SpeakButton text={msg.content} />
            <button onClick={copy} className="p-1 rounded text-muted-foreground hover:text-foreground">
              {copied ? <Check className="w-3 h-3 text-primary" /> : <Copy className="w-3 h-3" />}
            </button>
          </div>
        )}
      </div>
    </motion.div>
  );
}

const WELCOME = (title) => ({
  role: "assistant",
  content: `أهلاً! أنا **Black Fighters**، مساعدك الذكي لكورس **"${title || "الكورس"}"**. بفهرس الكورس كاملًا محليًا وبجيب لك أنسب الأقسام مع مراجعها. اسألني عن أي نقطة في المحتوى 🎓`,
});

export default function AiChatAssistant({ course }) {
  const { profile, refreshProfile } = useAuth();
  const [open, setOpen] = useState(false);
  const [storeOpen, setStoreOpen] = useState(false);
  const [messages, setMessages] = useState([WELCOME(course?.title)]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [convId, setConvId] = useState(null);
  const bottomRef = useRef(null);
  const inputRef = useRef(null);
  const courseIndexRef = useRef({ course: null, chapters: null, index: null });

  const skinId = profile?.active_mascot_skin || "default";
  const skin = getSkin(skinId);
  const rewardAvailable = canClaimDaily(profile);

  const { listening, start, stop, supported: micSupported } = useSpeechInput((text) => setInput(text));

  // استلام المكافأة اليومية تلقائياً عند فتح المساعد (مرة في اليوم)
  useEffect(() => {
    if (!open || !rewardAvailable) return;
    (async () => {
      const got = await claimDailyReward();
      if (got > 0) {
        await refreshProfile();
        toast.success(`+${got} كريدت مكافأة يومية من ${skin.name} 🎁`);
      }
    })();
     
  }, [open, rewardAvailable]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  // تحميل آخر محادثة محفوظة لهذا الكورس
  useEffect(() => {
    if (!open || !profile?.id || !course?.id || convId) return;
    (async () => {
      try {
        const list = await base44.entities.AssistantConversation.filter(
          { user_id: profile.id, course_id: course.id }, "-updated_date", 1
        );
        if (list[0]?.messages?.length) {
          setConvId(list[0].id);
          setMessages(list[0].messages);
        }
      } catch {}
    })();
  }, [open, profile?.id, course?.id, convId]);

  // حفظ المحادثة (debounced خفيف عبر الاستدعاء بعد كل رد مكتمل)
  const persist = useCallback(async (msgs) => {
    if (!profile?.id || !course?.id) return;
    const clean = msgs.filter((m) => !m.loading).map((m) => ({
      role: m.role,
      content: m.content,
      ...(Array.isArray(m.sources) && m.sources.length
        ? { sources: m.sources.map(({ id, label, chapterTitle, sectionTitle, pages }) => ({ id, label, chapterTitle, sectionTitle, pages })) }
        : {}),
    }));
    if (clean.length < 2) return;
    try {
      if (convId) {
        await base44.entities.AssistantConversation.update(convId, { messages: clean });
      } else {
        const created = await base44.entities.AssistantConversation.create({
          user_id: profile.id,
          course_id: course.id,
          course_title: course.title,
          title: clean.find((m) => m.role === "user")?.content?.slice(0, 40) || "محادثة",
          messages: clean,
        });
        setConvId(created.id);
      }
    } catch {}
  }, [convId, profile?.id, course?.id, course?.title]);

  const getCourseIndex = useCallback(() => {
    if (courseIndexRef.current.course === course && courseIndexRef.current.chapters === course?.chapters) {
      return courseIndexRef.current.index;
    }
    const index = buildCourseRetrievalIndex(course);
    courseIndexRef.current = { course, chapters: course?.chapters, index };
    return index;
  }, [course]);

  const send = async (text) => {
    const q = (text || input).trim();
    if (!q || loading) return;
    setInput("");
    if (listening) stop();
    setLoading(true);

    const loadingId = Date.now();
    const withUser = [...messages, { role: "user", content: q }];
    setMessages([...withUser, { role: "assistant", content: "", loading: true, id: loadingId }]);

    try {
      // دع React يرسم حالة التحميل أولاً؛ فهرسة الملفات الضخمة لا تؤخر فتح صفحة الكورس.
      await new Promise((resolve) => window.requestAnimationFrame(resolve));
      const courseIndex = getCourseIndex();
      const priorQuestions = messages
        .filter((message) => message.role === "user")
        .slice(-2)
        .map((message) => message.content)
        .join("\n");
      const retrievalQuery = `${priorQuestions}\n${q}`.trim();
      const retrieval = retrieveCourseContext(courseIndex, retrievalQuery, {
        maxChunks: 7,
        maxChars: 16000,
      });
      const history = messages.slice(-6)
        .map((m) => `${m.role === "user" ? "الطالب" : "Black Fighters"}: ${String(m.content || "").slice(0, 1800)}`)
        .join("\n");

      const prompt = `أنت Black Fighters، مساعد ذكاء اصطناعي متخصص لكورس "${course?.title}". تم فهرسة كل محتوى الكورس محلياً، والمقاطع التالية هي الأعلى صلة بسؤال الطالب من بين ${retrieval.indexedChunks} مقطعاً تغطي ${retrieval.sourceCharacterCount} حرفاً.

قواعد إلزامية:
- اعتمد على المقاطع المسترجعة فقط، ولا تخترع معلومة أو رقم صفحة غير موجودين فيها.
- ضع مرجعاً بصيغة [مصدر 1] بعد كل معلومة أساسية. استخدم أرقام المصادر كما هي بالضبط.
- لو الإجابة غير موجودة في المقاطع قل بوضوح إن المصدر الحالي لا يكفي، واقترح سؤالاً أدق بدل التخمين.
- "الملف" و"المحتوى" و"الدرس" تعني محتوى هذا الكورس.
- نفّذ الشرح والتلخيص والتبسيط والتنسيق والكويز مباشرة على المقاطع ذات الصلة.
- عند طلب تعديل الكورس كله، ابدأ بالأقسام المسترجعة ووضّح أنك تستطيع المتابعة قسمًا قسمًا؛ لا تدّع أن الرد القصير يحتوي ملفاً ضخماً كاملاً.
- استخدم Markdown منظمًا: عناوين ونقاط و**bold** وجداول عند الحاجة، والرد بالعربية الواضحة مع إبقاء المصطلحات الإنجليزية المهمة.
- عند طلب تعديل الملف نفسه: اشرح باختصار ما ستعدّله، ثم أضف في نهاية الرد بلوك تحكم بهذا الشكل بالضبط:
  <<<APPLY_SUMMARY_EDIT>>>
  { "instruction": "وصف دقيق بالعربية للتعديل المطلوب على ملف التلخيص" }
  <<<END_APPLY_SUMMARY_EDIT>>>
- عند طلب كويز جاهز يدخل عليه الطالب يمتحن: اشرح باختصار، ثم أضف بلوك:
  <<<CREATE_SUMMARY_QUIZ>>>
  { "count": 5 }
  <<<END_CREATE_SUMMARY_QUIZ>>>
- الأزرار تظهر للطالب بعد ردك وهو يضغط عليها مقابل كريدتات — فلا تنفذ بنفسك بل اشرح فقط وأضف البلوك المناسب.
- اسمك في الرد هو Black Fighters فقط.

المقاطع المسترجعة من الكورس:
${retrieval.context || "لا توجد مقاطع نصية قابلة للبحث في هذا الكورس."}

${history ? `سياق المحادثة:\n${history}\n` : ""}
الطالب: ${q}
Black Fighters:`;

      const res = await base44.functions.invoke("courseAssistant", { prompt });
      const raw = res?.data?.reply;
      if (!raw) throw new Error(res?.data?.error || "رد فاضي");

      // Agent layer: split machine action blocks from the user-visible text
      const { actions, visible } = parseAgentReply(raw);
      if (actions.some((a) => a.kind === "create_quiz")) bumpCounter("ai_quizzes", 0); // registered intent

      const final = [...withUser, { role: "assistant", content: visible || raw, actions, sources: retrieval.sources }];
      setMessages(final);
      persist(final.filter(({ actions: _a, busy: _b, done: _c, quizLink: _d, ...rest }) => rest));
    } catch (err) {
      setMessages((prev) => prev.map((m) =>
        m.id === loadingId ? { role: "assistant", content: "❌ حصل خطأ في الاتصال — جرب تاني" } : m
      ));
    } finally {
      setLoading(false);
    }
  };

  // ── Agent executor: server pays credits, does REAL work on the saved file ──
  // The server charges atomically and refunds on failure — the client never
  // touches balances. Client-side pre-check is only a friendly early warning.
  const runAction = async (action, msg) => {
    if (msg.busy || msg.done) return;
    const isQuiz = action.kind === "create_quiz";
    const cost = isQuiz ? AI_QUIZ_FROM_SUMMARY_COST : AI_SUMMARY_EDIT_COST;

    const mark = (patch) => setMessages((prev) =>
      prev.map((m) => (m.id === msg.id ? { ...m, ...patch } : m))
    );
    mark({ busy: true });

    try {
      if (isQuiz) {
        const { quiz, link, cost: serverCost } = await createQuizFromSummary({
          course,
          count: action.count || SUMMARY_QUIZ_DEFAULT_COUNT,
        });
        await bumpCounter("ai_quizzes", 1);
        mark({ busy: false, done: `اتعمل كويز ${quiz.questionCount || action.count} أسئلة — ${serverCost ?? cost} كريدت`, quizLink: link });
        toast.success("الكويز جاهز 🎯");
      } else {
        const result = await applySummaryEdit({
          course,
          instruction: action.instruction,
        });
        await bumpCounter("summary_edits", 1);
        mark({ busy: false, done: `الملف اتعدّل فعلاً — ${result.cost ?? cost} كريدت` });
        toast.success("ملف التلخيص اتحدث لكل المعنيين ✒️");
        window.dispatchEvent(new CustomEvent("iiiak:summary-updated", { detail: { courseId: course.id } }));
      }
      await refreshProfile();
    } catch (err) {
      mark({ busy: false });
      toast.error(err?.message || "فشل تنفيذ العملية");
    }
  };

  const clear = async () => {
    const fresh = [WELCOME(course?.title)];
    setMessages(fresh);
    if (convId) {
      try { await base44.entities.AssistantConversation.delete(convId); } catch {}
      setConvId(null);
    }
  };

  const lastAssistant = [...messages].reverse().find((m) => m.role === "assistant" && !m.loading);
  const suggestions = getSuggestions(lastAssistant?.content);

  return (
    <>
      <AnimatePresence>
        {!open && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setOpen(true)}
            aria-label="فتح مساعد Black Fighters للكورس"
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-6 left-3 md:left-6 z-50 w-16 h-16 rounded-full flex items-center justify-center"
          >
            <MascotSkin skinId={skinId} size={64} state={open ? "active" : "idle"} />
            {rewardAvailable && (
              <span className="absolute -top-0.5 -right-0.5 w-4 h-4 bg-[hsl(152,100%,50%)] rounded-full border-2 border-background animate-pulse z-10" />
            )}
          </motion.button>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: 20 }}
            transition={{ type: "spring", stiffness: 300, damping: 26 }}
            className="fixed bottom-[calc(5.25rem+env(safe-area-inset-bottom))] md:bottom-6 left-2 sm:left-4 md:left-6 z-50 w-[calc(100vw-1rem)] sm:w-[380px] h-[calc(100dvh-7rem-env(safe-area-inset-bottom))] max-h-[560px] min-h-[22rem] md:h-[560px] md:max-h-[82vh] glass-card neon-glow-cyan rounded-3xl border border-primary/30 shadow-2xl flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative flex items-center gap-3 px-4 py-3 border-b border-border/50 bg-gradient-to-l from-primary/10 to-accent/10 overflow-hidden">
              <div className="anime-panel absolute inset-0 pointer-events-none" />
              <div className="relative"><MascotSkin skinId={skinId} size={38} showFx={false} /></div>
              <div className="relative flex-1 min-w-0">
                <p className="font-bold text-sm flex items-center gap-1">Black Fighters <Sparkles className="w-3 h-3 text-primary" /></p>
                <p className="text-xs text-muted-foreground truncate">{skin.name} · {course?.title}</p>
              </div>
              <button onClick={() => setStoreOpen(true)} className="relative text-muted-foreground hover:text-accent p-1.5 rounded-lg hover:bg-secondary transition-colors" title="متجر الأشكال">
                <Shirt className="w-4 h-4" />
              </button>
              <button onClick={clear} className="relative text-muted-foreground hover:text-destructive p-1.5 rounded-lg hover:bg-secondary transition-colors" title="محادثة جديدة">
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="relative text-muted-foreground hover:text-foreground p-1.5 rounded-lg hover:bg-secondary transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active skin perks strip */}
            {(skin.dailyCredits > 0 || skin.discountPct > 0) && (
              <div className="flex items-center gap-3 px-4 py-1.5 text-[11px] border-b border-border/40 bg-secondary/30">
                {skin.dailyCredits > 0 && (
                  <span className="flex items-center gap-1 text-[hsl(152,100%,50%)] font-semibold">
                    <Gift className="w-3 h-3" /> +{skin.dailyCredits}/يوم
                  </span>
                )}
                {skin.discountPct > 0 && (
                  <span className="flex items-center gap-1 text-cyan-300 font-semibold">
                    <Sparkles className="w-3 h-3" /> خصم {skin.discountPct}%
                  </span>
                )}
                <button onClick={() => setStoreOpen(true)} className="ms-auto text-accent hover:underline font-semibold">المتجر ←</button>
              </div>
            )}

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 scroll-smooth scrollbar-none">
              {messages.map((m, i) => <MsgBubble key={m.id || i} msg={m} skinId={skinId} onAction={runAction} />)}
              <div ref={bottomRef} />
            </div>

            {/* Smart contextual quick prompts */}
            {!loading && (
              <div className="px-3 pb-1.5 flex gap-1.5 overflow-x-auto scrollbar-none">
                {suggestions.map((p) => (
                  <button key={p} onClick={() => send(p)}
                    className="shrink-0 text-xs px-3 py-1.5 rounded-full bg-primary/10 border border-primary/25 hover:bg-primary/20 hover:border-primary/40 transition-colors font-medium whitespace-nowrap">
                    {p}
                  </button>
                ))}
              </div>
            )}

            {/* Input */}
            <div className="p-3 border-t border-border/50 flex items-end gap-2">
              {micSupported && (
                <Button
                  size="icon"
                  variant={listening ? "default" : "outline"}
                  onClick={() => (listening ? stop() : start())}
                  className={cn("shrink-0 rounded-xl h-[38px] w-[38px]", listening && "animate-pulse")}
                  title={listening ? "إيقاف التسجيل" : "إدخال صوتي"}
                >
                  {listening ? <Square className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                </Button>
              )}
              <Textarea
                ref={inputRef}
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); }
                }}
                placeholder={listening ? "بسمعك..." : "اكتب سؤالك..."}
                rows={1}
                className="resize-none text-sm rounded-xl min-h-[38px] max-h-[100px]"
              />
              <Button
                size="icon"
                onClick={() => send()}
                disabled={!input.trim() || loading}
                className="shrink-0 rounded-xl h-[38px] w-[38px]"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <MascotSkinStore open={storeOpen} onClose={() => setStoreOpen(false)} />
    </>
  );
}
