import React, { useState, useRef, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { base44 } from "@/api/base44Client";
import {
  Send,
  Loader2,
  Sparkles,
  Plus,
  BrainCircuit,
  FileCog,
  LayoutDashboard,
  X,
  Bot,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

export default function AssistantChat({ onClose }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const quickLinks = [
    { to: "/dashboard", label: isEn ? "Dashboard" : "الرئيسية", icon: LayoutDashboard },
    { to: "/create", label: isEn ? "Upload Lecture" : "تلخيص جديد", icon: Plus },
    { to: "/quizzes", label: isEn ? "Quizzes" : "كويزات", icon: Sparkles },
    { to: "/review", label: isEn ? "FSRS Review" : "مراجعة ذكية", icon: BrainCircuit },
    { to: "/tools", label: isEn ? "PDF Tools" : "أدوات PDF", icon: FileCog },
  ];

  const promptSuggestions = isEn
    ? [
        "Build a 2-hour study plan for today",
        "How do I summarize a long PDF?",
        "Explain spaced repetition (FSRS v4.5)",
      ]
    : [
        "اعمل لي خطة مذاكرة ساعتين النهارده",
        "إزاي ألخص محاضرة كبيرة بسرعة؟",
        "اشرح لي نظام المراجعة المتباعدة FSRS v4.5",
      ];

  const [messages, setMessages] = useState([
    {
      role: "assistant",
      content: isEn
        ? "Welcome! I am your Black Fighters AI academic assistant. Ask me to explain any scientific concept, organize your daily study order, or guide you through the platform."
        : "أهلاً بك يا بطل! أنا مساعد Black Fighters الذكي. اسألني عن شرح أي مفهوم علمي، أو تنظيم جدول مذاكرتك اليومي، أو أي أداة داخل المنصة.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, loading]);

  const sendText = async (rawText) => {
    const text = (rawText ?? input).trim();
    if (!text || loading) return;
    const next = [...messages, { role: "user", content: text }];
    setMessages(next);
    if (!rawText) setInput("");
    setLoading(true);
    try {
      const res = await base44.functions.invoke("aiChat", { message: text, history: next });
      const reply =
        res?.data?.reply ||
        (isEn
          ? "I'm here to help! Upload a lecture from 'Upload Lecture' or start a quick FSRS review session to lock in today's concepts."
          : "أنا معك! يمكنك رفع محاضرتك من قسم «رفع محاضرة جديدة» لتحويلها لأطلس ملخص وكويز تدريبي، أو البدء بجلسة مراجعة FSRS السريعة.");
      setMessages((m) => [...m, { role: "assistant", content: reply }]);
    } catch {
      setMessages((m) => [
        ...m,
        {
          role: "assistant",
          content: isEn
            ? "To get the best results: 1) Upload your lecture PDF in 'Upload Lecture' to generate verified Atlas Plates, 2) Test yourself with a 10-question quiz, and 3) Lock in memory with FSRS flashcards."
            : "لتحقيق أعلى استفادة الآن:\n1. ارفع ملف المحاضرة من «رفع محاضرة جديدة» لتوليد لوحات الأطلس المدققة.\n2. اختبر فهمك بكويز سريع بعد القراءة.\n3. ثبّت المعلومات في الذاكرة طويلة المدى عبر «المراجعة الذكية FSRS».",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div
      dir={dir}
      initial={{ opacity: 0, y: 16, scale: 0.96 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: 16, scale: 0.96 }}
      transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
      className="w-[min(92vw,23.5rem)] h-[min(31rem,calc(100dvh-8.5rem-env(safe-area-inset-bottom)))] min-h-[21rem] glass-strong text-[#f5f7fa] rounded-2xl flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3.5 border-b border-white/[0.08] bg-[#090c11]">
        <div className="w-9 h-9 rounded-xl bg-[#19f08c]/15 border border-[#19f08c]/40 text-[#19f08c] flex items-center justify-center shrink-0">
          <Bot className="w-5 h-5" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <p className="font-bold text-sm text-[#f5f7fa] truncate">
              {isEn ? "Black Fighters AI" : "مساعد Black Fighters الذكي"}
            </p>
            <span className="pulse-dot" />
          </div>
          <p className="text-[11px] text-[#9aa4b2] truncate">
            {loading
              ? isEn
                ? "Synthesizing answer..."
                : "جاري تجهيز الإجابة..."
              : isEn
              ? "Black Fighters Academic Copilot"
              : "مساعدك الأكاديمي الفوري"}
          </p>
        </div>
        <button
          type="button"
          onClick={onClose}
          aria-label={isEn ? "Close" : "إغلاق"}
          className="w-8 h-8 rounded-lg flex items-center justify-center text-[#9aa4b2] hover:text-[#f5f7fa] hover:bg-white/[0.05] transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto overscroll-contain p-3.5 space-y-3 bg-[#05070a]/75"
      >
        {messages.map((m, i) => (
          <div
            key={i}
            className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}
          >
            <div
              className={cn(
                "max-w-[86%] rounded-2xl px-3.5 py-2.5 text-xs sm:text-[13px] leading-relaxed whitespace-pre-wrap",
                m.role === "user"
                  ? "bg-[#19f08c] text-[#03150c] font-bold rounded-ee-sm"
                  : "glass text-[#f5f7fa] rounded-es-sm"
              )}
            >
              {m.content}
            </div>
          </div>
        ))}

        {messages.length === 1 && !loading && (
          <div className="pt-1 space-y-1.5">
            <p className="text-[11px] font-medium text-[#9aa4b2] px-1">
              {isEn ? "Quick questions:" : "أسئلة سريعة مقترحة:"}
            </p>
            <div className="flex flex-col gap-1.5">
              {promptSuggestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendText(prompt)}
                  className="text-start text-xs px-3 py-2 rounded-xl bg-[#0e131b] hover:bg-white/[0.05] border border-white/10 hover:border-[#19f08c]/40 text-[#f5f7fa] transition-colors cursor-pointer"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && (
          <div className="flex justify-start">
            <div className="glass rounded-2xl rounded-es-sm px-4 py-2.5">
              <Loader2 className="w-4 h-4 animate-spin text-[#19f08c]" />
            </div>
          </div>
        )}
      </div>

      {/* Quick navigation links */}
      <div className="px-3 py-2 border-t border-white/[0.08] bg-[#090c11] flex gap-1.5 overflow-x-auto scrollbar-none">
        {quickLinks.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onClose}
            className="shrink-0 inline-flex items-center gap-1.5 rounded-lg bg-[#0e131b] hover:bg-[#19f08c]/12 border border-white/10 hover:border-[#19f08c]/35 px-2.5 py-1.5 text-[11px] font-semibold text-[#f5f7fa] hover:text-[#19f08c] transition-colors whitespace-nowrap"
          >
            <Icon className="w-3.5 h-3.5 text-[#19f08c] shrink-0" />
            <span>{label}</span>
          </Link>
        ))}
      </div>

      {/* Input */}
      <div className="p-3 border-t border-white/[0.08] flex items-center gap-2 bg-[#090c11]">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && sendText()}
          placeholder={isEn ? "Ask a study question..." : "اكتب سؤالك أو استفسارك هنا..."}
          className="flex-1 h-10 rounded-xl bg-[#0e131b] border border-white/10 px-3.5 text-xs text-[#f5f7fa] placeholder:text-[#646e7d] focus-visible:outline-none focus-visible:border-[#19f08c]/60"
        />
        <button
          type="button"
          onClick={() => sendText()}
          disabled={loading || !input.trim()}
          aria-label={isEn ? "Send" : "إرسال"}
          className="btn-primary-glow w-10 h-10 shrink-0 rounded-xl font-bold flex items-center justify-center disabled:opacity-40 cursor-pointer"
        >
          <Send className="w-4 h-4 rtl:-scale-x-100" />
        </button>
      </div>
    </motion.div>
  );
}
