import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  ChevronDown,
  Send,
  Check,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
  AnimatedNumber,
  LineStream,
  Section,
  LVLogo,
  LVLangSwitch,
  LVConfigurator,
  AvailabilityBar,
  reveal,
  rise,
} from "@/components/ui/linevault";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

const SUBJECT_CHIPS = [
  { ar: "التشريح", en: "Anatomy" },
  { ar: "الفسيولوجي", en: "Physiology" },
  { ar: "الباثولوجي", en: "Pathology" },
  { ar: "الأدوية", en: "Pharmacology" },
  { ar: "الميكروبيولوجي", en: "Microbiology" },
  { ar: "الباطنة", en: "Internal Medicine" },
  { ar: "الجراحة", en: "Surgery" },
  { ar: "الأطفال", en: "Pediatrics" },
];

const HOW_STEPS = [
  {
    num: "01",
    titleAr: "ارفع المحاضرة",
    titleEn: "Upload the Lecture",
    descAr: "PDF أو سلايدات أو صور، لحد 1000 صفحة في الملف الواحد.",
    descEn: "PDF, slides, or images — up to 1,000 pages in a single file.",
  },
  {
    num: "02",
    titleAr: "الملخص بيتكتب",
    titleEn: "Summary Is Written",
    descAr: "شرح كامل من الأساس، وكل معلومة ليها صفحة مصدر تفتحها.",
    descEn: "Complete foundational explanation with every fact linked to its source page.",
  },
  {
    num: "03",
    titleAr: "ذاكر وراجع",
    titleEn: "Study & Review",
    descAr: "على الموقع أو تيليجرام، مع كويز وبطاقات مراجعة.",
    descEn: "On the web or Telegram, with active-recall quizzes and FSRS flashcards.",
  },
];

const PRICING_TIERS = [
  {
    id: "free",
    nameAr: "الباقة الأساسية (Free)",
    nameEn: "Free Starter",
    ctaAr: "ابدأ مجاناً",
    ctaEn: "Start Free",
    href: "/register",
    recommended: false,
    rows: [
      { labelAr: "تلخيص محاضرات أساسي", labelEn: "Core Lecture Summaries", valueAr: "مشمول", valueEn: "Included" },
      { labelAr: "قالب «قبل ما تقرا»", labelEn: "Foundational Bilingual", valueAr: "مشمول", valueEn: "Included" },
      { labelAr: "بطاقات المراجعة FSRS", labelEn: "FSRS Flashcards", valueAr: "يومي", valueEn: "Daily" },
      { labelAr: "السعر الشهري", labelEn: "Monthly Price", valueAr: "0 ج.م", valueEn: "0 EGP" },
    ],
  },
  {
    id: "pro",
    nameAr: "باقة المحترفين (Pro)",
    nameEn: "Pro Fighter",
    ctaAr: "اشترك في Pro",
    ctaEn: "Choose Pro",
    href: "/subscriptions?plan=pro",
    recommended: true,
    saveAr: "وفّر 25%",
    saveEn: "Save 25%",
    rows: [
      { labelAr: "رصيد الكريدتس الشهري", labelEn: "Monthly AI Credits", valueAr: "900 نقطة", valueEn: "900 Credits", highlight: true },
      { labelAr: "توثيق الصفحة + تدقيق الجرعات", labelEn: "Page Citations + Dosage Verifier", valueAr: "مفعّل", valueEn: "Active" },
      { labelAr: "تصدير HTML + PDF + تيليجرام", labelEn: "HTML + PDF + Telegram Bot", valueAr: "غير محدود", valueEn: "Unlimited" },
      { labelAr: "السعر الشهري", labelEn: "Monthly Price", valueAr: "149 ج.م / شهر", valueEn: "149 EGP / mo" },
    ],
  },
  {
    id: "supreme",
    nameAr: "الباقة القصوى (Supreme)",
    nameEn: "Supreme Max",
    ctaAr: "اختر Supreme",
    ctaEn: "Choose Supreme",
    href: "/subscriptions?plan=supreme",
    recommended: false,
    saveAr: "وفّر 40%",
    saveEn: "Save 40%",
    rows: [
      { labelAr: "محرك المراجع حتى 1000 صفحة", labelEn: "1,000-Page Textbook Engine", valueAr: "2,500 نقطة", valueEn: "2,500 Credits", highlight: true },
      { labelAr: "أولوية قصوى في طابور المعالجة", labelEn: "Priority Queue", valueAr: "فوري", valueEn: "Instant" },
      { labelAr: "مزامنة كاملة مع بوت تيليجرام", labelEn: "Full Telegram Bot Sync", valueAr: "مشمول", valueEn: "Included" },
      { labelAr: "السعر الشهري", labelEn: "Monthly Price", valueAr: "249 ج.م / شهر", valueEn: "249 EGP / mo" },
    ],
  },
];

const FAQ_ITEMS = [
  {
    qAr: "إزاي الموقع بيلخص ملفات لحد 1000 صفحة من غير ما يطير نص الكلام؟",
    qEn: "How does the platform summarize up to 1,000 pages without skipping content?",
    aAr: "الملف بيتقسم فصول منظمة مع قاموس مصطلحات ثابت، وكل فقرة في الملخص بتفضل مربوطة برقم صفحتها الأصلية في الـ PDF.",
    aEn: "Large PDFs are partitioned into chapters with a locked glossary, and every paragraph remains linked to its source PDF page.",
  },
  {
    qAr: "يعني إيه «قبل ما تقرا» جوه الملخص؟",
    qEn: "What is the 'Before You Read' box inside each summary?",
    aAr: "قبل ما يدخل في تفاصيل الأدوية أو الفسيولوجي، بيبدأ بصندوق يمهد الفكرة الأساسية من الصفر بالعربي البسيط مع المصطلح الإنجليزي في مكانه.",
    aEn: "Each section starts with a foundational prerequisite bridge in clear Arabic while preserving exact English medical terminology inline.",
  },
  {
    qAr: "إزاي بكمل مذاكرة من تيليجرام؟",
    qEn: "How do I continue studying from Telegram?",
    aAr: "أول ما الملخص يخلص، البوت بيبعتلك إشعار تقدر منه تفتح القارئ، تستلم الـ PDF، أو تحل الكويز وبطاقات المراجعة مباشرة.",
    aEn: "Once your summary is ready, the Telegram bot lets you open the reader, download the PDF, or answer quizzes and flashcards right away.",
  },
  {
    qAr: "لو عملية التلخيص وقفت لأي سبب، الكريدتس بتروح عليا؟",
    qEn: "Are my credits safe if a generation job fails?",
    aAr: "لا نهائياً. الرصيد بيتحجز مؤقتاً بس، ولو حصل أي خطأ بيرجع لحسابك تلقائياً 100%.",
    aEn: "Never. Credits are reserved in a double-entry ledger and automatically refunded 100% if any chapter fails.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const { locale, dir, setLocale } = useLocale();
  const navigate = useNavigate();
  const isAr = locale !== "en";

  const [cardFlipped, setCardFlipped] = useState(false);
  const [declassified, setDeclassified] = useState({
    d1: false,
    d2: false,
    d3: false,
  });
  const [selectedQuizOption, setSelectedQuizOption] = useState(null);
  const [openFaq, setOpenFaq] = useState(0);

  const primaryHref = user ? "/dashboard" : "/register";
  const loginHref = user ? "/dashboard" : "/login";

  const navLinks = [
    { href: "#summary", label: isAr ? "المكتبة" : "Library" },
    { href: "#study-now", label: isAr ? "الكورسات" : "Study Now" },
    { href: "#how", label: isAr ? "إزاي بيشتغل" : "How it works" },
    { href: "#pricing", label: isAr ? "الأسعار" : "Pricing" },
    { href: "#faq", label: isAr ? "الأسئلة" : "FAQ" },
  ];

  const toggleDeclassify = (key) => {
    setDeclassified((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div dir={dir || "rtl"} className="min-h-screen bg-[#07080C] text-[#F2F3F5]">
      <div className="mx-auto max-w-[1280px] px-5 sm:px-11">
        {/* ─── HEADER (1:1 Black Fighters الأطلس – نسخة نضيفة داكنة) ─── */}
        <header className="flex h-[84px] items-center justify-between gap-4 border-b border-[#151922]">
          <LVLogo to="/" label="Black Fighters" />

          <nav
            aria-label={isAr ? "التنقل الرئيسي" : "Primary Navigation"}
            className="hidden md:flex items-center gap-8 text-[16px] text-[#9AA0AE]"
          >
            {navLinks.map((l) => (
              <a
                key={l.href}
                href={l.href}
                className="transition-colors hover:text-[#F2F3F5]"
              >
                {l.label}
              </a>
            ))}
          </nav>

          <div className="flex items-center gap-3">
            <LVLangSwitch locale={locale} onChange={setLocale} />
            <Button asChild className="h-[46px] px-6 text-[15px] rounded-[10px]">
              <Link to={loginHref}>
                {user
                  ? isAr
                    ? "لوحة التحكم"
                    : "Dashboard"
                  : isAr
                  ? "سجّل دخولك"
                  : "Sign In"}
              </Link>
            </Button>
          </div>
        </header>

        {/* ─── HERO SECTION (1:1 Black Fighters الأطلس – نسخة نضيفة داكنة) ─── */}
        <section className="grid items-center gap-14 pt-[72px] pb-16 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <motion.div {...reveal(0)}>
              <span className="bf-pill">
                <span className="bf-pulse-dot w-[7px] h-[7px] rounded-full bg-[#3DDC97]" />
                <span>
                  {isAr ? "مكتبة بتتحدث أول بأول" : "Live Updated Study Library"}
                </span>
              </span>
            </motion.div>

            <motion.h1
              {...reveal(1)}
              className="mt-7 text-5xl sm:text-6xl lg:text-[74px] font-bold leading-[1.12] tracking-[-0.015em] text-[#F2F3F5]"
            >
              {isAr ? "ذاكر من ملخص" : "Study from a summary"}
              <br />
              <span className="bf-hero-gradient">
                {isAr ? "مكتوب من الأول للآخر." : "written from the ground up."}
              </span>
            </motion.h1>

            <motion.p
              {...reveal(2)}
              className="mt-7 max-w-[560px] text-[20px] leading-[1.9] text-[#9AA0AE]"
            >
              {isAr
                ? "ارفع المحاضرة وخد ملخص HTML مرتب يشرح كل مصطلح من الأساس، وكل معلومة فيه مربوطة بصفحتها الأصلية. وتكمل من موبايلك على تيليجرام."
                : "Upload your lecture and get a structured HTML summary that explains every term from scratch, linked to its source page — and continue on Telegram."}
            </motion.p>

            <motion.div
              {...reveal(3)}
              className="mt-9 flex flex-wrap items-center gap-3.5"
            >
              <Button asChild size="lg">
                <Link to={primaryHref}>
                  {isAr ? "ارفع محاضرة" : "Upload Lecture"}
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="#how">
                  {isAr ? "شوف إزاي بيشتغل" : "See How It Works"}
                </a>
              </Button>
            </motion.div>

            <motion.div
              {...reveal(4)}
              className="mt-12 pt-7 border-t border-[#151922] flex flex-wrap gap-10"
            >
              <div>
                <div className="text-[14px] text-[#8A91A0]">
                  {isAr ? "ملخصات جاهزة اليوم" : "Summaries Ready Today"}
                </div>
                <div className="mt-1.5 font-mono text-[44px] font-medium text-[#F2F3F5] leading-none">
                  <AnimatedNumber value={214} />
                </div>
              </div>
              <div>
                <div className="text-[14px] text-[#8A91A0]">
                  {isAr ? "أكبر ملف اتلخص" : "Largest Book Summarized"}
                </div>
                <div className="mt-1.5 font-mono text-[44px] font-medium text-[#F2F3F5] leading-none">
                  1000
                  <span className="text-[18px] text-[#8A91A0] ms-1 font-sans">
                    {isAr ? "ص" : "p"}
                  </span>
                </div>
              </div>
            </motion.div>
          </div>

          <motion.div {...reveal(2)}>
            <LineStream locale={locale} ctaHref={primaryHref} />
          </motion.div>
        </section>

        {/* ─── SUBJECT MARQUEE STRIP (1:1 نسخة نضيفة داكنة) ─── */}
        <div className="overflow-hidden border-y border-[#151922] mb-14 bf-marquee-mask">
          <div className="bf-marquee-track">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                aria-hidden={dup === 1 ? "true" : undefined}
                className="flex gap-3.5 py-[18px] px-[7px]"
              >
                {SUBJECT_CHIPS.map((chip, idx) => (
                  <span key={idx} className="bf-chip">
                    <i className="w-1.5 h-1.5 rounded-full bg-[#3DDC97] inline-block" />
                    <span>{isAr ? chip.ar : chip.en}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="pb-24">
        {/* ─── SECTION 1: SUMMARY + TELEGRAM BOT (1:1 نسخة نضيفة داكنة) ─── */}
        <Section
          id="summary"
          eyebrow="SUMMARY"
          title={
            isAr
              ? "ملخص بيشرح، مش نقط مضغوطة"
              : "A Summary That Explains, Not Compressed Bullet Points"
          }
          subtitle={
            isAr
              ? "كل قسم بيبدأ بشرح المفاهيم اللي قبله من الصفر، وبعدين المحتوى نفسه، وتبعته لتيليجرام بضغطة."
              : "Every section starts by explaining prerequisite concepts from scratch, followed by the core content — and sends to Telegram in one click."
          }
          className="pt-6"
        >
          <div className="grid gap-6 lg:grid-cols-[1.35fr_1fr] items-start">
            {/* Summary Reader Card */}
            <motion.div {...rise(0)} className="bf-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[13px] text-[#9AA0AE]">
                  {isAr ? "CARDIOLOGY · الفصل 4" : "CARDIOLOGY · CHAPTER 4"}
                </span>
                <span className="bf-pill border-[#262A34] bg-[#11151C] text-[#9AA0AE] py-1.5 px-3.5 text-xs">
                  {isAr ? "المصدر: ص 14" : "Source: p. 14"}
                </span>
              </div>

              <h3
                dir="ltr"
                className="mt-4 font-mono text-3xl sm:text-[38px] font-medium text-[#F2F3F5] text-end"
              >
                Beta-blockers
              </h3>

              <div className="mt-5 p-[18px_20px] rounded-[14px] bg-[#0A0D13] border border-[#1E222B]">
                <div className="bf-k mb-1.5">
                  {isAr ? "قبل ما تقرا" : "BEFORE YOU READ"}
                </div>
                <div className="text-[#B7BCC8] leading-[1.9] text-[17px]">
                  {isAr
                    ? "المستقبل (receptor) بروتين على سطح الخلية. لما مادة معينة تلزق فيه بتدّي الخلية أمر تنفذه."
                    : "A receptor is a protein on the cell surface. When a specific messenger binds to it, it instructs the cell to act."}
                </div>
              </div>

              <p className="mt-5 text-[19px] leading-[2] text-[#E4E6EB]">
                {isAr ? (
                  <>
                    حاصرات بيتا (<span className="bf-hl">Beta-blockers</span>) بتمنع
                    مستقبلات بيتا الأدرينالية، فبتقلل{" "}
                    <span className="bf-hl">معدل ضربات القلب</span> وقوة انقباضه.
                  </>
                ) : (
                  <>
                    <span className="bf-hl">Beta-blockers</span> competitively block
                    beta-adrenergic receptors, reducing{" "}
                    <span className="bf-hl">heart rate</span> and myocardial contractility.
                  </>
                )}
              </p>

              <div className="mt-5 grid sm:grid-cols-2 gap-3">
                <div className="rounded-xl border border-[#1E222B] bg-[#0A0D13] p-4">
                  <div className="font-mono text-[14px] text-[#F2F3F5]">
                    Propranolol
                  </div>
                  <div className="text-[#9AA0AE] text-[14px] mt-1">
                    {isAr ? "غير انتقائي (β1 و β2)" : "Non-selective (β1 & β2)"}
                  </div>
                </div>
                <div className="rounded-xl border border-[#1E222B] bg-[#0A0D13] p-4">
                  <div className="font-mono text-[14px] text-[#F2F3F5]">
                    Metoprolol
                  </div>
                  <div className="text-[#9AA0AE] text-[14px] mt-1">
                    {isAr ? "انتقائي لـ β1" : "Selective β1 blocker"}
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Telegram Bot Card */}
            <motion.div {...rise(1)} className="bf-card p-[22px]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#1E222B]">
                <span className="w-[42px] h-[42px] rounded-full bg-[#2AABEE] inline-flex items-center justify-center text-white shrink-0">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-semibold text-[#F2F3F5]">
                    Black Fighters Bot
                  </div>
                  <div className="text-[13px] text-[#8A91A0]">
                    {isAr ? "بوت" : "Bot"}
                  </div>
                </div>
              </div>

              <div className="mt-[18px] p-[16px_18px] rounded-2xl bg-[#15181F] text-[17px] leading-[1.8] text-[#F2F3F5]">
                {isAr ? "ملخصك جاهز" : "Your summary is ready"}
                <br />
                <span className="text-[#9AA0AE] text-[15px]">
                  {isAr ? "Cardiology · الفصل 4" : "Cardiology · Chapter 4"}
                </span>
              </div>

              <div className="grid gap-2 mt-2.5">
                <Link to={primaryHref} className="bf-tb">
                  {isAr ? "افتح القارئ" : "Open Reader"}
                </Link>
                <Link to={primaryHref} className="bf-tb">
                  {isAr ? "ابعتلي PDF" : "Send me PDF"}
                </Link>
                <Link to={primaryHref} className="bf-tb">
                  {isAr ? "جاوب كويز" : "Take Quiz"}
                </Link>
              </div>
            </motion.div>
          </div>
        </Section>

        {/* ─── SECTION 2: STUDY NOW (FLASHCARD + DECLASSIFY + QUIZ — 1:1 نسخة نضيفة داكنة) ─── */}
        <Section
          id="study-now"
          eyebrow="STUDY NOW"
          title={
            isAr
              ? "ذاكر دلوقتي، من غير ما تسيب الصفحة"
              : "Study Right Now, Without Leaving the Page"
          }
        >
          {/* 6-Day Streak Row */}
          <div className="flex items-center gap-4 flex-wrap mb-7">
            <span className="font-semibold text-[#F2F3F5]">
              {isAr ? "سلسلة 6 أيام" : "6-Day Streak"}
            </span>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((d) => (
                <i key={d} className="bf-day-circle">
                  <Check className="w-4 h-4 stroke-[3]" />
                </i>
              ))}
              <i className="w-8 h-8 rounded-full border border-dashed border-[#3A4050] inline-block" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr_1fr]">
            {/* 1) Interactive 3D Flip Flashcard */}
            <motion.div {...rise(0)} className="bf-card bf-card-hover p-6">
              <div className="flex justify-between items-center">
                <span className="bf-k">FLASHCARD</span>
                <span className="font-mono text-[13px] text-[#8A91A0]">
                  3 / 38
                </span>
              </div>

              <div className="bf-flip-scene mt-3.5">
                <div
                  role="button"
                  tabIndex={0}
                  data-flipped={cardFlipped ? "true" : "false"}
                  onClick={() => setCardFlipped((f) => !f)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setCardFlipped((f) => !f);
                    }
                  }}
                  className="bf-flip-inner"
                >
                  <span className="bf-flip-front">
                    <span className="text-[19px] leading-[1.8] font-semibold text-[#F2F3F5]">
                      {isAr
                        ? "إيه الفرق بين Beta-blockers الانتقائية وغير الانتقائية؟"
                        : "What is the difference between selective and non-selective Beta-blockers?"}
                    </span>
                    <span className="mt-3 text-[#8A91A0] text-[14px]">
                      {isAr ? "اضغط عشان تقلب البطاقة" : "Click to flip card"}
                    </span>
                  </span>
                  <span className="bf-flip-back">
                    <span className="text-[17px] leading-[1.9] text-[#C9F5E1]">
                      {isAr
                        ? "الانتقائية (زي Metoprolol) بتستهدف β1 في القلب. غير الانتقائية (زي Propranolol) بتحجب β1 وβ2، فممكن تضيّق القصبات."
                        : "Selective blockers (e.g. Metoprolol) target cardiac β1. Non-selective blockers (e.g. Propranolol) block β1 and β2, which may cause bronchospasm."}
                    </span>
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-2 mt-3.5">
                {[
                  { ar: "صعب", en: "Hard" },
                  { ar: "تمام", en: "Good" },
                  { ar: "سهل", en: "Easy" },
                ].map((btn, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setCardFlipped((f) => !f)}
                    className="h-[46px] rounded-[10px] border border-[#262A34] bg-[#0A0D13] text-[#F2F3F5] font-medium text-[15px] hover:border-[#3DDC97] hover:bg-[#0C2219] transition-colors cursor-pointer"
                  >
                    {isAr ? btn.ar : btn.en}
                  </button>
                ))}
              </div>
            </motion.div>

            {/* 2) Interactive Declassify Card */}
            <motion.div {...rise(1)} className="bf-card bf-card-hover p-6 flex flex-col justify-between">
              <div>
                <span className="bf-k">DECLASSIFY</span>
                <p className="mt-3.5 text-[20px] leading-[2.4] text-[#F2F3F5]">
                  {isAr ? "حاصرات بيتا بتمنع مستقبلات " : "Beta-blockers inhibit "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d1")}
                    className={cn(
                      "inline-block rounded-[7px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d1
                        ? "bg-[#3DDC97]/15 text-[#7CF0BC]"
                        : "bg-[#2A2F3A] text-transparent select-none"
                    )}
                  >
                    {isAr ? "بيتا الأدرينالية" : "beta-adrenergic receptors"}
                  </button>
                  {isAr ? "، فبتقلل " : ", reducing "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d2")}
                    className={cn(
                      "inline-block rounded-[7px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d2
                        ? "bg-[#3DDC97]/15 text-[#7CF0BC]"
                        : "bg-[#2A2F3A] text-transparent select-none"
                    )}
                  >
                    {isAr ? "معدل ضربات القلب" : "heart rate"}
                  </button>
                  {isAr ? " و" : " and "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d3")}
                    className={cn(
                      "inline-block rounded-[7px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d3
                        ? "bg-[#3DDC97]/15 text-[#7CF0BC]"
                        : "bg-[#2A2F3A] text-transparent select-none"
                    )}
                  >
                    {isAr ? "قوة الانقباض" : "contractility"}
                  </button>
                  .
                </p>
              </div>
              <div className="mt-3.5 text-[#8A91A0] text-[14px]">
                {isAr
                  ? "اضغط على الشريط عشان تكشفه."
                  : "Click any redacted bar to reveal it."}
              </div>
            </motion.div>

            {/* 3) Interactive Quiz Card */}
            <motion.div {...rise(2)} className="bf-card bf-card-hover p-6">
              <span className="bf-k">
                {isAr ? "QUIZ · 1 من 15" : "QUIZ · 1 OF 15"}
              </span>
              <div className="mt-3 text-[19px] leading-[1.7] font-semibold text-[#F2F3F5]">
                {isAr
                  ? "أي دواء من دول انتقائي لمستقبلات β1؟"
                  : "Which of these drugs is selective for β1 receptors?"}
              </div>

              <div className="grid gap-2.5 mt-[18px]">
                {[
                  { id: "o1", label: "Propranolol", ok: false },
                  { id: "o2", label: "Carvedilol", ok: false },
                  { id: "o3", label: "Metoprolol", ok: true },
                ].map((opt) => {
                  const chosen = selectedQuizOption === opt.id;
                  return (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setSelectedQuizOption(opt.id)}
                      className={cn(
                        "flex justify-between items-center min-h-[54px] px-[18px] rounded-xl border transition-colors cursor-pointer text-start",
                        !chosen &&
                          "border-[#262A34] bg-[#0A0D13] text-[#F2F3F5] hover:border-[#3A4050]",
                        chosen &&
                          opt.ok &&
                          "border-[#3DDC97] bg-[#0C2219] text-[#7CF0BC]",
                        chosen &&
                          !opt.ok &&
                          "border-[#E5484D] bg-[#2A1214] text-[#FF9A9D]"
                      )}
                    >
                      <span className="font-mono">{opt.label}</span>
                      {chosen && (
                        <span className="text-sm font-semibold">
                          {opt.ok
                            ? isAr
                              ? "صح"
                              : "Correct"
                            : isAr
                            ? "غلط"
                            : "Wrong"}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {selectedQuizOption === "o3" && (
                <div className="mt-3.5 p-[14px_16px] rounded-xl bg-[#0C2219] text-[#9DF2CE] text-[15px] leading-[1.8]">
                  {isAr
                    ? "صح. Metoprolol انتقائي لـ β1، فتأثيره على القصبات أقل من غير الانتقائي."
                    : "Correct. Metoprolol is β1-selective, making it safer on bronchial smooth muscle."}
                </div>
              )}

              {(selectedQuizOption === "o1" || selectedQuizOption === "o2") && (
                <div className="mt-3.5 p-[14px_16px] rounded-xl bg-[#2A1214] text-[#FFB4B7] text-[15px] leading-[1.8]">
                  {isAr
                    ? "غلط. Propranolol وCarvedilol غير انتقائيين، يعني بيحجبوا β1 وβ2."
                    : "Wrong. Propranolol and Carvedilol are non-selective (blocking both β1 and β2)."}
                </div>
              )}
            </motion.div>
          </div>
        </Section>

        {/* ─── SECTION 3: HOW IT WORKS (1:1 نسخة نضيفة داكنة) ─── */}
        <Section
          id="how"
          eyebrow="HOW IT WORKS"
          title={isAr ? "ارفع، لخّص، ذاكر" : "Upload, Summarize, Study"}
        >
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_STEPS.map((s, i) => (
              <motion.div key={s.num} {...rise(i)} className="bf-card p-7">
                <div className="font-mono text-[14px] text-[#3DDC97]">
                  {s.num}
                </div>
                <div className="mt-3.5 text-[22px] font-semibold text-[#F2F3F5]">
                  {isAr ? s.titleAr : s.titleEn}
                </div>
                <div className="mt-2.5 text-[#9AA0AE] leading-[1.8] text-[16px]">
                  {isAr ? s.descAr : s.descEn}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ─── SECTION 4: INTERACTIVE CREDIT CONFIGURATOR & TIMER ─── */}
        <Section
          id="configurator"
          eyebrow="CREDITS CONFIGURATOR"
          title={
            isAr
              ? "أعدّ كمية الكريدتس على قد مذاكرتك"
              : "Configure the Exact Credit Volume You Need"
          }
          subtitle={
            isAr
              ? "السعر بيقل تلقائياً كل ما تزود الكمية، والرصيد المخصص مش بينتهي بانتهاء الشهر."
              : "Unit price drops automatically as your volume grows. Custom credits never expire."
          }
        >
          <motion.div {...rise(0)}>
            <LVConfigurator
              locale={locale}
              onSelectCustomPack={() => navigate("/subscriptions")}
            />
          </motion.div>
        </Section>

        {/* ─── SECTION 5: PRICING PLANS ─── */}
        <Section
          id="pricing"
          eyebrow="PRICING"
          title={
            isAr
              ? "أو اختر باقة فصلية جاهزة"
              : "Or Pick a Ready Semester Plan"
          }
          subtitle={
            isAr
              ? "كل الباقات محمية بدفتر القيد المزدوج: لا يُخصم رصيدك أبداً عند أي خطأ."
              : "All plans are protected by our double-entry ledger: failed jobs auto-refund 100%."
          }
        >
          <div className="grid gap-5 md:grid-cols-3">
            {PRICING_TIERS.map((plan, i) => (
              <motion.div key={plan.id} {...rise(i)}>
                <GlassCard
                  accent={plan.recommended}
                  className="flex h-full flex-col p-6"
                >
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="text-lg font-semibold text-[#F2F3F5]">
                      {isAr ? plan.nameAr : plan.nameEn}
                    </h3>
                    {(plan.saveAr || plan.saveEn) && (
                      <span className="bf-pill py-1 px-3 text-xs">
                        {isAr ? plan.saveAr : plan.saveEn}
                      </span>
                    )}
                  </div>

                  <div className="mt-4">
                    <AvailabilityBar
                      available={plan.id === "free" ? 10 : plan.id === "pro" ? 900 : 2500}
                      max={2500}
                      sharePct={plan.id === "free" ? 28 : plan.id === "pro" ? 72 : 100}
                      label={isAr ? "سعة الباقة" : "Available now"}
                      availableSuffix={isAr ? "نقطة" : "credits"}
                    />
                  </div>

                  <ul className="my-5 flex-1 divide-y divide-[#1E222B] text-sm">
                    {plan.rows.map((row, rIdx) => (
                      <li
                        key={rIdx}
                        className={cn(
                          "flex items-center justify-between gap-3 py-2.5",
                          row.highlight &&
                            "-mx-3 rounded-lg bg-[#0C2219] px-3 text-[#7CF0BC]"
                        )}
                      >
                        <span className="text-[#9AA0AE]">
                          {isAr ? row.labelAr : row.labelEn}
                        </span>
                        <span className="font-mono tabular text-[#F2F3F5]">
                          {isAr ? row.valueAr : row.valueEn}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={plan.recommended ? "default" : "outline"}
                  >
                    <Link to={plan.href}>
                      <span>{isAr ? plan.ctaAr : plan.ctaEn}</span>
                      <ArrowRight className="rtl:rotate-180" />
                    </Link>
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* ─── SECTION 6: FAQ ─── */}
        <Section
          id="faq"
          eyebrow="FAQ"
          title={
            isAr ? "أسئلتك، بإجابات واضحة" : "Your Questions, Answered Clearly"
          }
        >
          <div className="space-y-3 max-w-3xl">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div key={idx} className="bf-card overflow-hidden">
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="group flex w-full items-center justify-between gap-4 px-6 py-4 text-start font-semibold text-[#F2F3F5] hover:text-[#3DDC97] transition-colors cursor-pointer"
                  >
                    <span>{isAr ? item.qAr : item.qEn}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[#9AA0AE] transition-transform duration-200",
                        isOpen && "rotate-180 text-[#3DDC97]"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-[15px] leading-[1.8] text-[#9AA0AE]">
                      {isAr ? item.aAr : item.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>
      </main>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[#151922] bg-[#07080C]">
        <div className="mx-auto flex flex-col sm:flex-row max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-11 py-8 text-sm text-[#8A91A0]">
          <LVLogo to="/" label="Black Fighters" />
          <div className="flex flex-wrap items-center gap-6">
            <a href="#summary" className="hover:text-[#F2F3F5]">
              {isAr ? "المكتبة" : "Library"}
            </a>
            <a href="#study-now" className="hover:text-[#F2F3F5]">
              {isAr ? "ذاكر دلوقتي" : "Study Now"}
            </a>
            <a href="#pricing" className="hover:text-[#F2F3F5]">
              {isAr ? "الأسعار" : "Pricing"}
            </a>
            <Link to="/subscriptions" className="hover:text-[#F2F3F5]">
              {isAr ? "الاشتراكات" : "Subscriptions"}
            </Link>
            <Link to="/help" className="hover:text-[#F2F3F5]">
              {isAr ? "المساعدة" : "Help"}
            </Link>
          </div>
          <div>
            © {new Date().getFullYear()} Black Fighters
          </div>
        </div>
      </footer>
    </div>
  );
}
