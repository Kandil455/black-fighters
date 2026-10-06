import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import { Send, Loader2, Sparkles, Plus, BrainCircuit, FileCog, Trophy, LayoutDashboard, X, Bot } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

export default function AssistantChat({ onClose }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const quickLinks = [
    { to: "/dashboard", label: isEn ? "Dashboard" : "الرئيسية", icon: LayoutDashboard },
    { to: "/create", label: isEn ? "New Summary" : "أنشئ تلخيص", icon: Plus },
    { to: "/quizzes", label: isEn ? "Quizzes" : "كويزات", icon: Sparkles },
    { to: "/review", label: isEn ? "Review" : "مراجعة", icon: BrainCircuit },
    { to: "/tools", label: isEn ? "PDF Studio" : "أدوات PDF", icon: FileCog },
    { to: "/leaderboard", label: isEn ? "Leaderboard" : "المتصدرين", icon: Trophy },
  ];

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isEn
        ? "Hello! I am Black Fighters, your AI study assistant 🌟 Ask me about your study materials, plans, or questions!"
        : "أهلاً! أنا Black Fighters، مساعد المنصة الذكي 🌟 اسألني عن دراستك أو خطتك، وسأساعدك فوراً.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("aiChat", { message: text, history: next });
      const reply = res?.data?.reply || (isEn ? "I'm with you. How would you like to continue your study plan?" : "أنا معك، كيف تحب أن نواصل خطتك الدراسية؟");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: isEn
            ? "I am ready to help! You can ask me to summarize any concept or explain any question."
            : "أنا جاهز لمساعدتك! يمكنك سؤالي عن تلخيص أي مفهوم أو شرح سؤال.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      dir={dir}
      initial={{ opacity: 0, y: 30, scale: 0.92 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 30, scale: 0.92 }}
      transition={{ type: "spring", stiffness: 220, damping: 22 }}
      className="w-[min(94vw,22rem)] h-[min(28rem,calc(100dvh-8rem-env(safe-area-inset-bottom)))] min-h-[20rem] ios-glass-dock border border-primary/35 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.75)] flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 p-3.5 border-b border-white/10 bg-primary/10">
        <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-primary to-accent flex items-center justify-center shadow-[0_0_15px_rgba(0,245,255,0.4)]">
          <Bot className="w-5 h-5 text-black stroke-[2.5]" />
        </div>
        <div className="leading-tight">
          <p className="font-black text-sm neon-text-gradient">Black Fighters Neural AI</p>
          <p className="text-[11px] text-muted-foreground">
            {loading
              ? (isEn ? "Thinking & generating..." : "جاري التفكير والتوليد...")
              : (isEn ? "Online & ready to assist" : "متصل وجاهز للمساعدة")}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={isEn ? "Close" : "إغلاق"}
          className="ms-auto w-8 h-8 rounded-xl flex items-center justify-center text-muted-foreground hover:text-foreground hover:bg-white/10 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3 scrollbar-none">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-start" : "justify-end")}>
            <div
              className={cn(
                "max-w-[85%] rounded-2xl px-4 py-2.5 text-xs sm:text-sm leading-relaxed whitespace-pre-wrap shadow-sm",
                m.role === "user"
                  ? "bg-primary text-black font-bold rounded-tr-sm"
                  : "bg-white/[0.06] border border-white/10 text-foreground rounded-tl-sm backdrop-blur-md"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex justify-end">
            <div className="bg-white/[0.06] border border-white/10 rounded-2xl rounded-tl-sm px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-primary" />
            </div>
          </div>
        )}
      </div>

      {/* Quick links */}
      <div className="px-3 pb-2 flex gap-1.5 overflow-x-auto scrollbar-none">
        {quickLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="shrink-0 flex items-center gap-1.5 rounded-xl bg-white/[0.04] hover:bg-primary/15 border border-white/10 hover:border-primary/30 px-2.5 py-1 text-[11px] font-bold text-muted-foreground hover:text-primary transition-colors active:scale-95"
          >
            <Icon className="w-3 h-3 text-primary" /> {label}
          </Link>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/10 flex items-center gap-2 bg-background/50">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={isEn ? "Type your question here..." : "اكتب استفسارك هنا..."}
          className="flex-1 h-10 rounded-xl bg-white/[0.04] border border-white/10 px-3.5 text-xs text-foreground placeholder:text-muted-foreground/60 focus-visible:outline-none focus-visible:border-primary/50"
        />
        <button
          onClick={send}
          disabled={loading || !input.trim()}
          className="w-10 h-10 shrink-0 rounded-xl bg-primary text-black font-bold flex items-center justify-center disabled:opacity-40 hover:bg-primary/90 transition-colors active:scale-95 shadow-[0_0_15px_rgba(0,245,255,0.3)]"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>
    </motion.div>
  );
}
