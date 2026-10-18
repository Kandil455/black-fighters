import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  FileText,
  Sparkles,
  Brain,
  CheckCircle2,
  Layers,
  Globe,
  HelpCircle,
  ArrowRight,
  ArrowLeft,
  Table2,
  Zap,
} from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

const WORKFLOW_SCENES = [
  {
    id: "ingest",
    icon: FileText,
    badgeEn: "STAGE 01 · SMART EXTRACTION",
    badgeAr: "المرحلة ٠١ · استخراج ذكي",
    titleEn: "Upload Any Lecture File or Slides",
    titleAr: "ارفع أي محاضرة أو سلايدز أو PDF",
    descEn:
      "The engine scans every page, heading, diagram caption, and table so not a single feature or concept is missed.",
    descAr:
      "يقوم المحرك بمسح كل صفحة وعنوان وجدول وملاحظة في المحاضرة لضمان عدم ضياع أي معلومة أو خاصية.",
  },
  {
    id: "synthesize",
    icon: Layers,
    badgeEn: "STAGE 02 · STRUCTURED SUMMARY",
    badgeAr: "المرحلة ٠٢ · تلخيص منظم",
    titleEn: "Choose Your Size & Summary Language",
    titleAr: "اختر حجم التلخيص ولغة المخرجات",
    descEn:
      "Pick Small, Medium, or Large depth and generate your study guide in Bilingual (EN + AR), pure English, or pure Arabic.",
    descAr:
      "اختر حجم التلخيص (صغير، متوسط، كبير) وحدد لغة الملخص سواء ثنائي اللغة (Bilingual) أو إنجليزي أو عربي.",
  },
  {
    id: "mastery",
    icon: Brain,
    badgeEn: "STAGE 03 · ACTIVE MASTERY",
    badgeAr: "المرحلة ٠٣ · كويزات ومراجعة",
    titleEn: "Instant Quizzes, Flashcards & Mind Maps",
    titleAr: "كويزات تفاعلية وبطاقات مراجعة فورية",
    descEn:
      "Turn your summarized lecture into practice MCQs with detailed explanations and spaced-repetition flashcards in one click.",
    descAr:
      "حوّل ملخص المحاضرة بضغطة زر إلى اختبارات تفاعلية مع تفسير الإجابات وبطاقات مراجعة ذكية لتثبيت المعلومة.",
  },
];

export default function LandingAtlasShowcase({ locale: propLocale }) {
  const { locale: ctxLocale, dir } = useLocale();
  const locale = propLocale || ctxLocale || "en";
  const isAr = locale === "ar";
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  const [activeScene, setActiveScene] = useState(0);
  const [paused, setPaused] = useState(false);
  const [selectedQuizOpt, setSelectedQuizOpt] = useState(1);

  useEffect(() => {
    if (paused) return;
    const timer = setInterval(() => {
      setActiveScene((prev) => (prev + 1) % WORKFLOW_SCENES.length);
    }, 4800);
    return () => clearInterval(timer);
  }, [paused]);

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      className="space-y-8"
    >
      {/* Top Interactive Stage Switcher + Animated Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Left / Start Column: 3 Interactive Stage Selector Cards */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-3.5">
          {WORKFLOW_SCENES.map((scene, idx) => {
            const Icon = scene.icon;
            const active = activeScene === idx;
            return (
              <button
                key={scene.id}
                type="button"
                onClick={() => {
                  setActiveScene(idx);
                  setPaused(true);
                }}
                className={`w-full text-start rounded-2xl p-4 sm:p-5 border transition-colors duration-200 cursor-pointer relative overflow-hidden ${
                  active
                    ? "border-[#19f08c]/55 bg-[#19f08c]/[0.08] shadow-[0_0_30px_-10px_rgba(25,240,140,0.3)]"
                    : "border-white/[0.08] bg-[#0b0f17]/80 hover:border-white/20 hover:bg-white/[0.03]"
                }`}
              >
                {active && (
                  <motion.div
                    layoutId="showcase-active-bar"
                    className="absolute inset-y-0 start-0 w-1 bg-[#19f08c]"
                  />
                )}
                <div className="flex items-start gap-3.5">
                  <div
                    className={`grid size-10 shrink-0 place-items-center rounded-xl border transition-colors ${
                      active
                        ? "border-[#19f08c]/50 bg-[#19f08c]/20 text-[#19f08c]"
                        : "border-white/10 bg-white/[0.04] text-[#9aa4b2]"
                    }`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span
                      dir="ltr"
                      className="text-[10px] font-mono uppercase tracking-wider text-[#19f08c] block mb-1"
                    >
                      {isAr ? scene.badgeAr : scene.badgeEn}
                    </span>
                    <h4 className="text-sm sm:text-base font-bold text-[#f5f7fa]">
                      {isAr ? scene.titleAr : scene.titleEn}
                    </h4>
                    <p className="text-xs text-[#9aa4b2] mt-1 leading-relaxed">
                      {isAr ? scene.descAr : scene.descEn}
                    </p>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Right / End Column: Live Animated Stage Visualizer */}
        <div className="lg:col-span-7 rounded-3xl border border-white/10 bg-[#080b11] p-5 sm:p-7 relative overflow-hidden flex flex-col justify-between min-h-[380px]">
          <div className="pointer-events-none absolute -top-24 -right-24 w-72 h-72 rounded-full bg-[#19f08c]/10 blur-3xl" />

          {/* Top Window Bar */}
          <div className="flex items-center justify-between gap-3 pb-4 mb-5 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <span className="size-2.5 rounded-full bg-[#19f08c]" />
              <span className="size-2.5 rounded-full bg-white/20" />
              <span className="size-2.5 rounded-full bg-white/10" />
              <span className="ms-2 text-xs font-mono text-[#9aa4b2]">
                {isAr
                  ? "محرك التلخيص الذكي · معاينة حية"
                  : "Black Fighters Studio · Live Engine"}
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              {[0, 1, 2].map((i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setActiveScene(i);
                    setPaused(true);
                  }}
                  aria-label={`Scene ${i + 1}`}
                  className={`h-1.5 rounded-full transition-colors cursor-pointer ${
                    activeScene === i
                      ? "w-6 bg-[#19f08c]"
                      : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Animated Scene Body */}
          <div className="flex-1 flex flex-col justify-center">
            <AnimatePresence mode="wait">
              {activeScene === 0 && (
                <motion.div
                  key="scene-ingest"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-4"
                >
                  {/* Animated Document Scanner Card */}
                  <div className="relative rounded-2xl border border-[#19f08c]/30 bg-[#05070a]/90 p-4 overflow-hidden">
                    <motion.div
                      animate={{ y: ["0%", "260%", "0%"] }}
                      transition={{ duration: 3.2, repeat: Infinity, ease: "easeInOut" }}
                      className="pointer-events-none absolute inset-x-0 top-0 h-8 bg-gradient-to-b from-[#19f08c]/20 to-transparent border-t border-[#19f08c]/60"
                    />
                    <div className="flex items-center justify-between gap-3 mb-3">
                      <div className="flex items-center gap-2.5">
                        <div className="grid size-9 place-items-center rounded-xl bg-[#19f08c]/15 text-[#19f08c] font-mono text-xs font-bold">
                          PDF
                        </div>
                        <div>
                          <p className="text-xs sm:text-sm font-bold text-[#f5f7fa]">
                            {isAr
                              ? "محاضرة_البيولوجيا_الجزيئية.pdf"
                              : "Molecular_Biology_Lecture_04.pdf"}
                          </p>
                          <p className="text-[11px] text-[#9aa4b2]">
                            {isAr
                              ? "جاري تحليل العناوين والخصائص والجداول..."
                              : "Scanning headings, key features, and tables..."}
                          </p>
                        </div>
                      </div>
                      <span className="rounded-lg bg-[#19f08c]/15 border border-[#19f08c]/35 px-2.5 py-1 font-mono text-[11px] font-bold text-[#19f08c]">
                        100% PARSED
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 pt-2">
                      {[
                        {
                          labelEn: "Core Concepts",
                          labelAr: "المفاهيم الأساسية",
                          val: "18",
                        },
                        {
                          labelEn: "Key Features",
                          labelAr: "الفيتشرز والنقاط",
                          val: "42",
                        },
                        {
                          labelEn: "Comparison Tables",
                          labelAr: "جداول المقارنة",
                          val: "6",
                        },
                      ].map((stat, i) => (
                        <div
                          key={i}
                          className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-2.5 text-center"
                        >
                          <div className="font-mono text-base sm:text-lg font-bold text-[#19f08c]">
                            {stat.val}
                          </div>
                          <div className="text-[10px] text-[#9aa4b2] mt-0.5">
                            {isAr ? stat.labelAr : stat.labelEn}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Extracted Structure Pills */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#19f08c] shrink-0" />
                      <span className="text-xs text-[#f5f7fa]">
                        {isAr
                          ? "استخراج جميع التعريفات والقوانين بدون حذف"
                          : "Every definition, formula & rule preserved"}
                      </span>
                    </div>
                    <div className="rounded-xl border border-white/[0.07] bg-white/[0.02] p-3 flex items-center gap-2.5">
                      <CheckCircle2 className="w-4 h-4 text-[#19f08c] shrink-0" />
                      <span className="text-xs text-[#f5f7fa]">
                        {isAr
                          ? "ترتيب تلقائي للأبواب والنقاط الفرعية"
                          : "Automatic chapter & bullet hierarchy"}
                      </span>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScene === 1 && (
                <motion.div
                  key="scene-synthesize"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-[#19f08c]/15 border border-[#19f08c]/35 px-2.5 py-1 text-xs font-bold text-[#19f08c]">
                      <Globe className="w-3.5 h-3.5" />
                      {isAr
                        ? "ثنائي اللغة (Bilingual) · إنجليزي · عربي"
                        : "Bilingual (EN + AR) · English · Arabic"}
                    </span>
                    <span className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.05] border border-white/10 px-2.5 py-1 text-xs font-mono text-[#f5f7fa]">
                      <Sparkles className="w-3.5 h-3.5 text-[#19f08c]" />
                      {isAr
                        ? "صغير · متوسط · كبير"
                        : "Small · Medium · Large"}
                    </span>
                  </div>

                  {/* Structured Summary Preview Box */}
                  <div className="rounded-2xl border border-white/10 bg-[#05070a]/90 p-4 space-y-3">
                    <div className="border-b border-white/[0.07] pb-2.5">
                      <span className="text-[10px] font-mono uppercase tracking-wider text-[#19f08c]">
                        {isAr ? "نموذج مخرجات منظمة" : "STRUCTURED OUTPUT SAMPLE"}
                      </span>
                      <h5 className="text-sm font-bold text-[#f5f7fa] mt-0.5">
                        {isAr
                          ? "آلية نقل الإشارة الخلوية (Signal Transduction)"
                          : "Signal Transduction & Receptor Activation"}
                      </h5>
                    </div>

                    <div className="space-y-2 text-xs text-[#9aa4b2]">
                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5">
                        <span className="font-bold text-[#f5f7fa] block mb-0.5">
                          {isAr
                            ? "• Receptor Dimerization (ازدواج المستقبل):"
                            : "• Receptor Dimerization & Phosphorylation:"}
                        </span>
                        <span>
                          {isAr
                            ? "ارتباط الجزيء الإشاري يحفز ازدواج المستقبل وتنشيط نطاق الكيناز الداخلي لبدء مسار الإشارة."
                            : "Ligand binding induces conformational dimerization and cross-phosphorylation of cytosolic tyrosine domains."}
                        </span>
                      </div>

                      <div className="rounded-xl bg-white/[0.03] border border-white/[0.06] p-2.5 flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <Table2 className="w-4 h-4 text-[#19f08c] shrink-0" />
                          <span className="font-semibold text-[#f5f7fa]">
                            {isAr
                              ? "جدول مقارنة شامل لكل الخصائص والفروقات"
                              : "Organized Comparison Table of All Features"}
                          </span>
                        </div>
                        <span className="text-[10px] font-mono text-[#19f08c] shrink-0">
                          READY
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              )}

              {activeScene === 2 && (
                <motion.div
                  key="scene-mastery"
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -12 }}
                  transition={{ duration: 0.25 }}
                  className="space-y-3.5"
                >
                  <div className="rounded-2xl border border-white/10 bg-[#05070a]/90 p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#19f08c]">
                        <HelpCircle className="w-4 h-4" />
                        {isAr ? "سؤال تطبيقي ذكي من المحاضرة" : "Interactive Lecture Quiz"}
                      </span>
                      <span className="text-[11px] font-mono text-[#9aa4b2]">
                        MCQ · INSTANT FEEDBACK
                      </span>
                    </div>

                    <p className="text-xs sm:text-sm font-bold text-[#f5f7fa]">
                      {isAr
                        ? "أي من النطاقات التالية مسؤول مباشرةً عن فسفرة بروتينات الإشارة داخل الخلية؟"
                        : "Which domain is directly responsible for phosphorylating downstream signaling proteins?"}
                    </p>

                    <div className="space-y-2">
                      {[
                        {
                          en: "A. Extracellular ligand-binding domain",
                          ar: "أ. النطاق الخارجي لارتباط الجزيء الإشاري",
                          correct: false,
                        },
                        {
                          en: "B. Intracellular Tyrosine Kinase catalytic domain",
                          ar: "ب. النطاق التحفيزي الداخلي لإنزيم التيروزين كيناز",
                          correct: true,
                        },
                        {
                          en: "C. Hydrophobic lipid bilayer anchor",
                          ar: "ج. الحلزون الكاره للماء العابر للغشاء",
                          correct: false,
                        },
                      ].map((opt, idx) => {
                        const isPicked = selectedQuizOpt === idx;
                        return (
                          <button
                            key={idx}
                            type="button"
                            onClick={() => {
                              setSelectedQuizOpt(idx);
                              setPaused(true);
                            }}
                            className={`w-full text-start rounded-xl px-3.5 py-2.5 text-xs font-medium border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                              isPicked && opt.correct
                                ? "border-[#19f08c]/60 bg-[#19f08c]/15 text-[#19f08c] font-bold"
                                : isPicked
                                ? "border-amber-400/50 bg-amber-400/10 text-amber-200"
                                : "border-white/[0.07] bg-white/[0.02] text-[#9aa4b2] hover:text-[#f5f7fa]"
                            }`}
                          >
                            <span>{isAr ? opt.ar : opt.en}</span>
                            {isPicked && opt.correct && (
                              <CheckCircle2 className="w-4 h-4 text-[#19f08c] shrink-0" />
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Bottom Bar inside Visualizer */}
          <div className="mt-5 pt-4 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#9aa4b2]">
              <Zap className="w-4 h-4 text-[#19f08c]" />
              <span>
                {isAr
                  ? "كل ملف يتحول لملخص منظم وكويز وبطاقات مراجعة في ثوانٍ"
                  : "Every lecture becomes a structured summary, quiz, and flashcard deck"}
              </span>
            </div>
            <Link
              to="/create"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#19f08c] hover:underline"
            >
              <span>{isAr ? "جرّب على محاضرتك الآن" : "Try with your lecture"}</span>
              <ArrowIcon className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
