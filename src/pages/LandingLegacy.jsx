import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ChevronDown,
  Send,
  Check,
  User,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  GlassCard,
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
    { href: "#home", label: isAr ? "الرئيسية" : "Home", active: true },
    { href: "#summary", label: isAr ? "المميزات" : "Features" },
    { href: "#study-now", label: isAr ? "الملخصات" : "Summaries" },
    { href: "#pricing", label: isAr ? "الأسعار" : "Pricing" },
    { href: "#faq", label: isAr ? "عنا" : "About" },
    { href: "#how", label: isAr ? "المدونة" : "Blog" },
  ];

  const toggleDeclassify = (key) => {
    setDeclassified((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div dir={dir || "rtl"} className="min-h-screen bg-[#F6F8FA] text-[#0B1F33]">
      {/* ─── CLINICAL LIGHT HERO (first viewport) ─── */}
      <div id="home" className="relative min-h-[100dvh] overflow-hidden">
        {/* Expressed as utilities (not inline styles) so the repo's design-token
            contract holds and the theme cannot drift per-element. */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-[url('/backgrounds/clinical-textbook-hero.jpg')]"
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute inset-0",
            dir === "ltr"
              ? "bg-[linear-gradient(90deg,rgba(246,248,250,0.92)_0%,rgba(246,248,250,0.78)_42%,rgba(246,248,250,0.28)_72%,rgba(246,248,250,0.08)_100%)]"
              : "bg-[linear-gradient(270deg,rgba(246,248,250,0.94)_0%,rgba(246,248,250,0.82)_38%,rgba(246,248,250,0.35)_68%,rgba(246,248,250,0.1)_100%)]",
          )}
          aria-hidden="true"
        />

        <div className="relative z-10 mx-auto flex min-h-[100dvh] max-w-[1280px] flex-col px-5 sm:px-11">
          <header className="flex h-[84px] items-center justify-between gap-4">
            <LVLogo to="/" label="Black Fighters" />

            <nav
              aria-label={isAr ? "التنقل الرئيسي" : "Primary Navigation"}
              className="hidden lg:flex items-center gap-7"
            >
              {navLinks.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  data-active={l.active ? "true" : undefined}
                  className="bf-nav-link"
                >
                  {l.label}
                </a>
              ))}
            </nav>

            <div className="flex items-center gap-3">
              <LVLangSwitch locale={locale} onChange={setLocale} />
              <Link
                to={loginHref}
                className="inline-flex items-center gap-2 text-[15px] font-medium text-[#0B1F33] hover:text-[#2B8A9E] transition-colors"
              >
                <User className="w-4 h-4 stroke-[1.5]" />
                <span>
                  {user
                    ? isAr
                      ? "لوحة التحكم"
                      : "Dashboard"
                    : isAr
                    ? "تسجيل الدخول"
                    : "Login"}
                </span>
              </Link>
            </div>
          </header>

          <section className="flex flex-1 items-center py-10 lg:py-16">
            <div className="max-w-[560px]">
              <motion.div
                {...reveal(0)}
                className="mb-5 h-[3px] w-10 rounded-full bg-[#2B8A9E]"
                aria-hidden="true"
              />

              <motion.h1
                {...reveal(1)}
                className="text-[clamp(2rem,4.2vw,3.35rem)] font-extrabold leading-[1.28] tracking-[-0.02em] text-[#0B1F33]"
              >
                {isAr ? (
                  <>
                    تستذكر بذكاء من{" "}
                    <span className="text-[#2B8A9E]">ملخصات طبية مكتملة</span>
                  </>
                ) : (
                  <>
                    Study smarter from{" "}
                    <span className="text-[#2B8A9E]">complete medical summaries</span>
                  </>
                )}
              </motion.h1>

              <motion.p
                {...reveal(2)}
                className="mt-6 max-w-[480px] text-[17px] leading-[1.85] text-[#5A6B7D]"
              >
                {isAr
                  ? "ملخصات موثوقة ومنظّمة من المراجع الطبية الأساسية — توفّر وقتك وتركّز على الفهم."
                  : "Trusted, organized summaries from core medical references — save time and focus on understanding."}
              </motion.p>

              <motion.div {...reveal(3)} className="mt-9">
                <Link to={primaryHref} className="bf-clinical-cta">
                  <span className="bf-clinical-cta__label">
                    {isAr ? "استكشف الملخصات" : "Explore Summaries"}
                  </span>
                  <span className="bf-clinical-cta__sep" aria-hidden="true" />
                  <span className="bf-clinical-cta__icon" aria-hidden="true">
                    <ArrowLeft className={cn("w-5 h-5", !isAr && "rotate-180")} />
                  </span>
                </Link>
              </motion.div>
            </div>
          </section>
        </div>
      </div>

      <div className="mx-auto max-w-[1280px] px-5 sm:px-11">
        <div className="overflow-hidden border-y border-[#D5DEE7] mb-14 bf-marquee-mask">
          <div className="bf-marquee-track">
            {[0, 1].map((dup) => (
              <div
                key={dup}
                aria-hidden={dup === 1 ? "true" : undefined}
                className="flex gap-3.5 py-[18px] px-[7px]"
              >
                {SUBJECT_CHIPS.map((chip, idx) => (
                  <span key={idx} className="bf-chip">
                    <i className="w-1.5 h-1.5 rounded-full bg-[#2B8A9E] inline-block" />
                    <span>{isAr ? chip.ar : chip.en}</span>
                  </span>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>

      <main className="pb-24">
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
            <motion.div {...rise(0)} className="bf-card p-6 sm:p-8">
              <div className="flex items-center justify-between gap-3">
                <span className="font-mono text-[13px] text-[#5A6B7D]">
                  {isAr ? "CARDIOLOGY · الفصل 4" : "CARDIOLOGY · CHAPTER 4"}
                </span>
                <span className="bf-pill border-[#C5D9E0] bg-[#E6F3F6] text-[#2B8A9E] py-1.5 px-3.5 text-xs">
                  {isAr ? "المصدر: ص 14" : "Source: p. 14"}
                </span>
              </div>

              <h3
                dir="ltr"
                className="mt-4 font-mono text-3xl sm:text-[38px] font-medium text-[#0B1F33] text-end"
              >
                Beta-blockers
              </h3>

              <div className="mt-5 p-[18px_20px] rounded-[10px] bg-[#EEF2F5] border border-[#D5DEE7]">
                <div className="bf-k mb-1.5">
                  {isAr ? "قبل ما تقرا" : "BEFORE YOU READ"}
                </div>
                <div className="text-[#5A6B7D] leading-[1.9] text-[17px]">
                  {isAr
                    ? "المستقبل (receptor) بروتين على سطح الخلية. لما مادة معينة تلزق فيه بتدّي الخلية أمر تنفذه."
                    : "A receptor is a protein on the cell surface. When a specific messenger binds to it, it instructs the cell to act."}
                </div>
              </div>

              <p className="mt-5 text-[19px] leading-[2] text-[#0B1F33]">
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
                <div className="rounded-[10px] border border-[#D5DEE7] bg-[#F6F8FA] p-4">
                  <div className="font-mono text-[14px] text-[#0B1F33]">
                    Propranolol
                  </div>
                  <div className="text-[#5A6B7D] text-[14px] mt-1">
                    {isAr ? "غير انتقائي (β1 و β2)" : "Non-selective (β1 & β2)"}
                  </div>
                </div>
                <div className="rounded-[10px] border border-[#D5DEE7] bg-[#F6F8FA] p-4">
                  <div className="font-mono text-[14px] text-[#0B1F33]">
                    Metoprolol
                  </div>
                  <div className="text-[#5A6B7D] text-[14px] mt-1">
                    {isAr ? "انتقائي لـ β1" : "Selective β1 blocker"}
                  </div>
                </div>
              </div>
            </motion.div>

            <motion.div {...rise(1)} className="bf-card p-[22px]">
              <div className="flex items-center gap-3 pb-4 border-b border-[#D5DEE7]">
                <span className="w-[42px] h-[42px] rounded-full bg-[#2AABEE] inline-flex items-center justify-center text-white shrink-0">
                  <Send className="w-5 h-5" />
                </span>
                <div>
                  <div className="font-semibold text-[#0B1F33]">
                    Black Fighters Bot
                  </div>
                  <div className="text-[13px] text-[#5A6B7D]">
                    {isAr ? "بوت" : "Bot"}
                  </div>
                </div>
              </div>

              <div className="mt-[18px] p-[16px_18px] rounded-[10px] bg-[#EEF2F5] text-[17px] leading-[1.8] text-[#0B1F33]">
                {isAr ? "ملخصك جاهز" : "Your summary is ready"}
                <br />
                <span className="text-[#5A6B7D] text-[15px]">
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

        <Section
          id="study-now"
          eyebrow="STUDY NOW"
          title={
            isAr
              ? "ذاكر دلوقتي، من غير ما تسيب الصفحة"
              : "Study Right Now, Without Leaving the Page"
          }
        >
          <div className="flex items-center gap-4 flex-wrap mb-7">
            <span className="font-semibold text-[#0B1F33]">
              {isAr ? "سلسلة 6 أيام" : "6-Day Streak"}
            </span>
            <div className="flex gap-2">
              {[0, 1, 2, 3, 4, 5].map((d) => (
                <i key={d} className="bf-day-circle">
                  <Check className="w-4 h-4 stroke-[3]" />
                </i>
              ))}
              <i className="w-8 h-8 rounded-full border border-dashed border-[#B8CBD6] inline-block" />
            </div>
          </div>

          <div className="grid gap-5 lg:grid-cols-[1fr_1.05fr_1fr]">
            <motion.div {...rise(0)} className="bf-card bf-card-hover p-6">
              <div className="flex justify-between items-center">
                <span className="bf-k">FLASHCARD</span>
                <span className="font-mono text-[13px] text-[#5A6B7D]">
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
                    <span className="text-[19px] leading-[1.8] font-semibold text-[#0B1F33]">
                      {isAr
                        ? "إيه الفرق بين Beta-blockers الانتقائية وغير الانتقائية؟"
                        : "What is the difference between selective and non-selective Beta-blockers?"}
                    </span>
                    <span className="mt-3 text-[#5A6B7D] text-[14px]">
                      {isAr ? "اضغط عشان تقلب البطاقة" : "Click to flip card"}
                    </span>
                  </span>
                  <span className="bf-flip-back">
                    <span className="text-[17px] leading-[1.9] text-[#0B1F33]">
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
                    className="h-[46px] rounded-md border border-[#D5DEE7] bg-[#F6F8FA] text-[#0B1F33] font-medium text-[15px] hover:border-[#2B8A9E] hover:bg-[#E6F3F6] transition-colors cursor-pointer"
                  >
                    {isAr ? btn.ar : btn.en}
                  </button>
                ))}
              </div>
            </motion.div>

            <motion.div {...rise(1)} className="bf-card bf-card-hover p-6 flex flex-col justify-between">
              <div>
                <span className="bf-k">DECLASSIFY</span>
                <p className="mt-3.5 text-[20px] leading-[2.4] text-[#0B1F33]">
                  {isAr ? "حاصرات بيتا بتمنع مستقبلات " : "Beta-blockers inhibit "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d1")}
                    className={cn(
                      "inline-block rounded-[6px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d1
                        ? "bg-[#E6F3F6] text-[#1A6A7C]"
                        : "bg-[#D5DEE7] text-transparent select-none"
                    )}
                  >
                    {isAr ? "بيتا الأدرينالية" : "beta-adrenergic receptors"}
                  </button>
                  {isAr ? "، فبتقلل " : ", reducing "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d2")}
                    className={cn(
                      "inline-block rounded-[6px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d2
                        ? "bg-[#E6F3F6] text-[#1A6A7C]"
                        : "bg-[#D5DEE7] text-transparent select-none"
                    )}
                  >
                    {isAr ? "معدل ضربات القلب" : "heart rate"}
                  </button>
                  {isAr ? " و" : " and "}
                  <button
                    type="button"
                    onClick={() => toggleDeclassify("d3")}
                    className={cn(
                      "inline-block rounded-[6px] px-2.5 mx-0.5 font-medium transition-colors duration-300 cursor-pointer",
                      declassified.d3
                        ? "bg-[#E6F3F6] text-[#1A6A7C]"
                        : "bg-[#D5DEE7] text-transparent select-none"
                    )}
                  >
                    {isAr ? "قوة الانقباض" : "contractility"}
                  </button>
                  .
                </p>
              </div>
              <div className="mt-3.5 text-[#5A6B7D] text-[14px]">
                {isAr
                  ? "اضغط على الشريط عشان تكشفه."
                  : "Click any redacted bar to reveal it."}
              </div>
            </motion.div>

            <motion.div {...rise(2)} className="bf-card bf-card-hover p-6">
              <span className="bf-k">
                {isAr ? "QUIZ · 1 من 15" : "QUIZ · 1 OF 15"}
              </span>
              <div className="mt-3 text-[19px] leading-[1.7] font-semibold text-[#0B1F33]">
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
                        "flex justify-between items-center min-h-[54px] px-[18px] rounded-md border transition-colors cursor-pointer text-start",
                        !chosen &&
                          "border-[#D5DEE7] bg-[#F6F8FA] text-[#0B1F33] hover:border-[#B8CBD6]",
                        chosen &&
                          opt.ok &&
                          "border-[#2B8A9E] bg-[#E6F3F6] text-[#1A6A7C]",
                        chosen &&
                          !opt.ok &&
                          "border-[#E5484D] bg-[#FCECEF] text-[#B42318]"
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
                <div className="mt-3.5 p-[14px_16px] rounded-md bg-[#E6F3F6] text-[#1A6A7C] text-[15px] leading-[1.8]">
                  {isAr
                    ? "صح. Metoprolol انتقائي لـ β1، فتأثيره على القصبات أقل من غير الانتقائي."
                    : "Correct. Metoprolol is β1-selective, making it safer on bronchial smooth muscle."}
                </div>
              )}

              {(selectedQuizOption === "o1" || selectedQuizOption === "o2") && (
                <div className="mt-3.5 p-[14px_16px] rounded-md bg-[#FCECEF] text-[#B42318] text-[15px] leading-[1.8]">
                  {isAr
                    ? "غلط. Propranolol وCarvedilol غير انتقائيين، يعني بيحجبوا β1 وβ2."
                    : "Wrong. Propranolol and Carvedilol are non-selective (blocking both β1 and β2)."}
                </div>
              )}
            </motion.div>
          </div>
        </Section>

        <Section
          id="how"
          eyebrow="HOW IT WORKS"
          title={isAr ? "ارفع، لخّص، ذاكر" : "Upload, Summarize, Study"}
        >
          <div className="grid gap-5 md:grid-cols-3">
            {HOW_STEPS.map((s, i) => (
              <motion.div key={s.num} {...rise(i)} className="bf-card p-7">
                <div className="font-mono text-[14px] text-[#2B8A9E]">
                  {s.num}
                </div>
                <div className="mt-3.5 text-[22px] font-semibold text-[#0B1F33]">
                  {isAr ? s.titleAr : s.titleEn}
                </div>
                <div className="mt-2.5 text-[#5A6B7D] leading-[1.8] text-[16px]">
                  {isAr ? s.descAr : s.descEn}
                </div>
              </motion.div>
            ))}
          </div>
        </Section>

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
                    <h3 className="text-lg font-semibold text-[#0B1F33]">
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

                  <ul className="my-5 flex-1 divide-y divide-[#D5DEE7] text-sm">
                    {plan.rows.map((row, rIdx) => (
                      <li
                        key={rIdx}
                        className={cn(
                          "flex items-center justify-between gap-3 py-2.5",
                          row.highlight &&
                            "-mx-3 rounded-md bg-[#E6F3F6] px-3 text-[#1A6A7C]"
                        )}
                      >
                        <span className="text-[#5A6B7D]">
                          {isAr ? row.labelAr : row.labelEn}
                        </span>
                        <span className="font-mono tabular text-[#0B1F33]">
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
                    </Link>
                  </Button>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Section>

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
                    className="group flex w-full items-center justify-between gap-4 px-6 py-4 text-start font-semibold text-[#0B1F33] hover:text-[#2B8A9E] transition-colors cursor-pointer"
                  >
                    <span>{isAr ? item.qAr : item.qEn}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[#5A6B7D] transition-transform duration-200",
                        isOpen && "rotate-180 text-[#2B8A9E]"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-6 pb-5 text-[15px] leading-[1.8] text-[#5A6B7D]">
                      {isAr ? item.aAr : item.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

      </main>

      <footer className="border-t border-[#D5DEE7] bg-white">
        <div className="mx-auto flex flex-col sm:flex-row max-w-[1280px] items-center justify-between gap-4 px-5 sm:px-11 py-8 text-sm text-[#5A6B7D]">
          <LVLogo to="/" label="Black Fighters" />
          <div className="flex flex-wrap items-center gap-6">
            <a href="#summary" className="hover:text-[#0B1F33]">
              {isAr ? "المكتبة" : "Library"}
            </a>
            <a href="#study-now" className="hover:text-[#0B1F33]">
              {isAr ? "ذاكر دلوقتي" : "Study Now"}
            </a>
            <a href="#pricing" className="hover:text-[#0B1F33]">
              {isAr ? "الأسعار" : "Pricing"}
            </a>
            <Link to="/subscriptions" className="hover:text-[#0B1F33]">
              {isAr ? "الاشتراكات" : "Subscriptions"}
            </Link>
            <Link to="/help" className="hover:text-[#0B1F33]">
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
