import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Layers,
  ChevronDown,
  Lock,
  BookOpen,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import {
  LVLogo,
  LVLangSwitch,
  AnimatedNumber,
  LineStream,
  Section,
  GlassCard,
  LVBadge,
  PricingCard,
  LVConfigurator,
  reveal,
  rise,
} from "@/components/ui/linevault";
import LandingAtlasShowcase from "@/components/atlas/LandingAtlasShowcase";
import { BlackFightersAnimated } from "@/components/ui/BlackFightersAnimated";
import { cn } from "@/lib/utils";

const HOW_IT_WORKS_STEPS = [
  {
    num: "01",
    titleAr: "ارفع محاضرتك (PDF أو تسجيل صوتي أو فيديو)",
    titleEn: "Upload Your Lecture (PDF)",
    descAr:
      "ارفع أي ملف PDF أو كتاب حتى 1,000 صفحة، أو ارفع تسجيل المحاضرة الصوتي والفيديو عشان يتفرّغ حرفياً لكل كلمة قالها الدكتور.",
    descEn:
      "Upload any PDF or textbook up to 1,000 pages and get a clean, structured bilingual summary.",
    tag: "PDF + AUDIO + VIDEO",
  },
  {
    num: "02",
    titleAr: "تلخيص مرتب وشرح مبسّط مع مراجعة كل رقم وجرعة",
    titleEn: "Clear Structured Summary & Verified Numbers",
    descAr:
      "المنصة بترتب المحاضرة في عناوين ونقاط واضحة بالعربي مع الحفاظ على المصطلحات الإنجليزية، وبتراجع كل رقم وجرعة طبية مع رقم الصفحة الأصلية.",
    descEn:
      "Organizes your lecture into clean bilingual bullet points while double-checking every dosage and number with exact source page references.",
    tag: "100% VERIFIED",
  },
  {
    num: "03",
    titleAr: "اختبر نفسك بالكويزات ووضع التسميع الذكي",
    titleEn: "Test Yourself with Quizzes & Smart Recall",
    descAr:
      "أخفِ الكلمات والجرعات المهمة جوه الملخص عشان تسمّع لنفسك بضغطة زر، وحل كويزات وامتحانات على المحاضرة عشان تثبت المعلومة قبل الامتحان.",
    descEn:
      "Hide key terms inside your summary for active self-testing, and practice with instant exam-grade quizzes.",
    tag: "QUIZZES & RECALL",
  },
];

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    titleAr: "مراجعة مزدوجة للأرقام والجرعات الطبية",
    titleEn: "Double-Checked Medical Dosages & Numbers",
    descAr:
      "كل رقم وجرعة دوائية بيتراجع مرتين على النص الأصلي للمحاضرة مع كتابة رقم الصفحة عشان تذاكر وانت مطمن من غير أي تأليف.",
    descEn:
      "Every dosage and number is verified against your original lecture pages so you can study with complete confidence.",
    metric: "99.4% دقة",
  },
  {
    icon: Layers,
    titleAr: "تلخيص شامل للمحاضرات والكتب",
    titleEn: "Full Book & Lecture Summaries",
    descAr:
      "سواء معاك مرجع كبير لحد 1,000 صفحة أو تسجيل صوتي لمحاضرة طويلة، المنصة بتلخص وتفرّغ كل فصل وجملة من غير ما تطير أي جزء.",
    descEn:
      "Whether it is a 1,000-page reference book or a 2-hour audio recording, every chapter and sentence is covered.",
    metric: "تغطية شاملة",
  },
  {
    icon: Lock,
    titleAr: "حفظ الرصيد بأمان وتحميل الملخصات للطباعة (PDF)",
    titleEn: "Protected Balance & Print-Ready PDF Downloads",
    descAr:
      "رصيدك محفوظ بالكامل وبيرجع تلقائياً لو حصل أي خطأ في الرفع، وتقدر تحمّل أي ملخص كملف PDF جاهز للطباعة أو المذاكرة بدون إنترنت.",
    descEn:
      "Your credit balance is automatically refunded if any upload fails, and every summary exports cleanly to printable PDF or offline HTML.",
    metric: "ضمان 100%",
  },
];

const PRICING_PLANS = [
  {
    key: "starter",
    nameAr: "باقة الانطلاق (Starter)",
    nameEn: "Starter Plan",
    badgeAr: "للطلاب",
    badgeEn: "STUDENT",
    price: "99",
    descAr: "مناسبة لتلخيص محاضرات الأسبوع والكويزات السريعة.",
    descEn: "Great for weekly lecture summaries and quick quizzes.",
    featuresAr: [
      "350 نقطة كريدت شهرياً",
      "تلخيص المحاضرات والكتب حتى 300 صفحة",
      "تلخيص منظم بفصول وعناوين",
      "كويزات نظرية وعملي (OSCE / OSPE) بالشرح",
      "تحميل الملخصات PDF جاهزة للطباعة",
    ],
    featuresEn: [
      "350 monthly AI credits",
      "PDF summaries up to 300 pages",
      "Structured summaries with chapters and headings",
      "Theory & Practical (OSCE / OSPE) quizzes",
      "Print-ready PDF downloads",
    ],
    recommended: false,
  },
  {
    key: "pro",
    nameAr: "باقة برو (Pro)",
    nameEn: "Pro Plan",
    badgeAr: "الأكثر اختياراً",
    badgeEn: "MOST POPULAR",
    price: "199",
    descAr: "أفضل باقة للمذاكرة اليومية وتلخيص المراجع الكبيرة.",
    descEn: "Best for daily studying, large reference books, and full lecture recordings.",
    featuresAr: [
      "900 نقطة كريدت شهرياً",
      "تلخيص المراجع والكتب الكبيرة (حتى 1,000 صفحة)",
      "تلخيص وتنظيم المحاضرات مع مذكرة مذاكرة",
      "قارئ الملخصات التفاعلي مع إخفاء الإجابات للتسميع",
      "تحميل PDF للطباعة + ملف يشتغل بدون إنترنت",
    ],
    featuresEn: [
      "900 monthly AI credits",
      "Up to 1,000-page reference book summaries",
      "Full summaries & study notes",
      "Interactive reader with self-testing answer mask",
      "Printable PDF + offline file export",
    ],
    recommended: true,
  },
  {
    key: "supreme",
    nameAr: "باقة القمة (Supreme)",
    nameEn: "Supreme Plan",
    badgeAr: "للمراجع والدفعات",
    badgeEn: "UNLIMITED POWER",
    price: "399",
    descAr: "أكبر رصيد كريدت للمراجع الضخمة ومجموعات الأصدقاء ووضع طوارئ ليلة الامتحان.",
    descEn: "Maximum credit capacity for heavy study loads, study groups, and exam night.",
    featuresAr: [
      "2,500 نقطة كريدت شهرياً",
      "أولوية قصوى في سرعة التلخيص",
      "فتح وضع طوارئ ليلة الامتحان للمراجعة السريعة",
      "جدول مراجعة ذكي يفكرك بالنقاط اللي بتنساها",
      "دعم فني مباشر ومشاركة غير محدودة للملخصات مع زمايلك",
    ],
    featuresEn: [
      "2,500 monthly AI credits",
      "Top priority speed for summaries",
      "Exam-Night rapid revision mode unlocked",
      "Smart review schedule for weak points",
      "Direct support & unlimited summary sharing",
    ],
    recommended: false,
  },
];

const FAQ_ITEMS = [
  {
    qAr: "إزاي المنصة بتضمن إن الأرقام والجرعات الطبية مفيهاش غلط؟",
    qEn: "How does Black Fighters make sure dosages and numbers are accurate?",
    aAr: "المنصة بتراجع كل ملخص مرتين وتطابق كل رقم وجرعة طبية بالنص الأصلي الموجود في ملف المحاضرة، وبتكتبلك رقم الصفحة جنب المعلومة عشان ترجعلها في ثانية.",
    aEn: "Every summary is double-checked against your original lecture file, and exact page numbers are attached to key facts and dosages.",
  },
  {
    qAr: "هل أقدر أرفع تسجيل صوتي لمحاضرة أو كتاب كبير 500 صفحة؟",
    qEn: "Can I upload a long audio lecture or a 500-page book?",
    aAr: "طبعاً! تقدر ترفع تسجيل المحاضرة الصوتي أو الفيديو عشان يتفرّغ حرفياً لكل كلمة قالها الدكتور (عربي وإنجليزي) ويتنظم في مذكرة جاهزة، وتقدر كمان ترفع كتب PDF لحد 1,000 صفحة تتلخص فصل بفصل.",
    aEn: "Yes! Upload PDF books up to 1,000 pages and get a bilingual summary chapter by chapter, plus study notes and practice quizzes.",
  },
  {
    qAr: "إزاي حاسبة الكريدت والخصم بتشتغل؟",
    qEn: "How does the credit calculator and volume discount work?",
    aAr: "تقدر تختار أي كمية كريدت محتاجها من 100 لحد 10,000 نقطة. كل ما تزود الكمية سعر النقطة بيقل تلقائياً بخصم يوصل لـ 56%، والرصيد اللي بتشحنه بيفضل معاك ومش بينتهي.",
    aEn: "Pick any credit amount between 100 and 10,000 credits. Larger amounts automatically unlock up to 56% off, and your top-up credits never expire.",
  },
  {
    qAr: "إيه طرق الدفع المتاحة وإمتى الرصيد بيشتغل؟",
    qEn: "What payment methods are available and how fast is activation?",
    aAr: "تقدر تدفع بسهولة عن طريق فودافون كاش أو إنستاباي (InstaPay) أو USDT أو نجوم تيليجرام، والرصيد بيتضاف لحسابك فور تأكيد العملية.",
    aEn: "We support Vodafone Cash, InstaPay, USDT TRC20, and Telegram Stars. Credits are added to your account right after confirmation.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { locale, dir } = useLocale();
  const navigate = useNavigate();
  const isAr = locale === "ar";
  const [openFaq, setOpenFaq] = useState(0);

  const primaryRoute = isAuthenticated ? "/dashboard" : "/register";
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#05070a] text-[#f5f7fa] relative overflow-x-hidden selection:bg-[#19f08c]/20"
    >
      {/* Silent LineVault Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070a]"
      >
        <div className="absolute inset-0 bg-radial-emerald" />
        <div className="absolute inset-0 bg-grid opacity-80" />
      </div>

      {/* 1. Sticky Glass Header (3-Zone Contract) */}
      <header className="sticky top-0 z-40 border-b border-white/[0.07] bg-[#05070a]/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
          <LVLogo to="/" label="Black Fighters" />

          <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-[#9aa4b2]">
            <a
              href="#how-it-works"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "إزاي بتشتغل" : "How it works"}
            </a>
            <a
              href="#atlas-reader"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "جرب الملخص التفاعلي" : "Interactive Reader"}
            </a>
            <a
              href="#configurator"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "حاسبة الرصيد" : "Credit Calculator"}
            </a>
            <a
              href="#pricing"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "الباقات" : "Pricing"}
            </a>
            <a
              href="#faq"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "الأسئلة الشائعة" : "FAQ"}
            </a>
          </nav>

          <div className="flex items-center gap-3 shrink-0">
            <LVLangSwitch />
            {!isAuthenticated && (
              <Link
                to="/login"
                className="hidden sm:inline-flex items-center px-3 py-2 text-xs font-semibold text-[#9aa4b2] hover:text-[#f5f7fa] transition-colors whitespace-nowrap"
              >
                {isAr ? "دخول" : "Sign In"}
              </Link>
            )}
            <Link
              to={primaryRoute}
              className="btn-primary-glow inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs sm:text-sm font-bold whitespace-nowrap shrink-0"
            >
              <span>
                {isAuthenticated
                  ? isAr
                    ? "لوحة التحكم"
                    : "Open Dashboard"
                  : isAr
                  ? "ابدأ المذاكرة الآن"
                  : "Start Studying"}
              </span>
              <ArrowIcon className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </header>

      {/* 2. Two-Column LineVault Hero */}
      <section className="relative overflow-hidden pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="bf-aurora-layer" aria-hidden="true" />
        <div className="bf-lab-grid" aria-hidden="true" />
        <div className="relative z-10 mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Column 1: Copy + CTAs + 3 AnimatedNumber Counters */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div {...reveal(0)} className="flex items-center gap-3.5">
                <div className="bf-float-soft grid size-12 shrink-0 place-items-center rounded-2xl border border-[#19f08c]/40 bg-[#19f08c]/10">
                  <BlackFightersAnimated size={38} variant="emerald" />
                </div>
                <span className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-xs font-semibold text-[#19f08c]">
                  <span className="pulse-dot" />
                  <span>
                    {isAr
                      ? "منصة المذاكرة الذكية · تلخيص PDF وكويزات"
                      : "SMART STUDY PLATFORM · PDF, AUDIO & QUIZZES"}
                  </span>
                </span>
              </motion.div>

              <motion.h1
                {...reveal(0.08)}
                className="font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight leading-[1.15]"
              >
                <span className="block text-gradient">
                  {isAr
                    ? "حوّل محاضراتك وكتبك الكبيرة"
                    : "Turn lectures and large textbooks into"}
                </span>
                <span className="block text-gradient-emerald mt-1.5">
                  {isAr
                    ? "لملخصات واضحة وكويزات في ثواني."
                    : "clear summaries and quizzes in seconds."}
                </span>
              </motion.h1>

              <motion.p
                {...reveal(0.16)}
                className="max-w-2xl text-sm sm:text-base lg:text-lg text-[#9aa4b2] leading-relaxed"
              >
                {isAr
                  ? "ارفع ملف الـ PDF (من صفحة لحد 1,000 صفحة) أو ارفع تسجيل المحاضرة الصوتي والفيديو — وهتاخد ملخص مرتب بالعربي مع حفظ المصطلحات الإنجليزية، مراجعة دقيقة لكل الأرقام والجرعات، وكويزات تختبر بيها نفسك قبل الامتحان."
                  : "Upload PDFs up to 1,000 pages — get clean bilingual summaries, verified dosages and page numbers, and instant practice quizzes."}
              </motion.p>

              <motion.div
                {...reveal(0.24)}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <Link
                  to={primaryRoute}
                  className="btn-primary-glow bf-sheen inline-flex h-12 items-center gap-2.5 rounded-xl px-6 text-sm sm:text-base font-bold whitespace-nowrap"
                >
                  <span>
                    {isAr ? "ارفع محاضرتك الآن مجاناً" : "Upload Lecture Free"}
                  </span>
                  <ArrowIcon className="w-4 h-4" />
                </Link>
                <a
                  href="#atlas-reader"
                  className="glass inline-flex h-12 items-center gap-2 rounded-xl px-5 text-sm font-semibold text-[#f5f7fa] hover:border-[#19f08c]/40 hover:bg-white/[0.05] transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4 text-[#19f08c]" />
                  <span>
                    {isAr ? "شوف شكل الملخص بنفسك" : "Preview Live Summary"}
                  </span>
                </a>
              </motion.div>

              {/* 3 AnimatedNumber Counters */}
              <motion.div
                {...reveal(0.32)}
                className="grid grid-cols-3 gap-3 sm:gap-4 pt-4 border-t border-white/[0.08]"
              >
                <div className="glass rounded-2xl p-3.5 sm:p-4">
                  <div
                    className="font-mono text-xl sm:text-2xl font-bold text-[#f5f7fa] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={1000} suffix="p" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "أقصى حجم للكتب والملفات" : "Max Book Capacity"}
                  </p>
                </div>

                <div className="glass rounded-2xl p-3.5 sm:p-4">
                  <div
                    className="font-mono text-xl sm:text-2xl font-bold text-[#19f08c] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={99.4} decimals={1} suffix="%" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "دقة الأرقام والجرعات" : "Dosage Accuracy"}
                  </p>
                </div>

                <div className="glass rounded-2xl p-3.5 sm:p-4">
                  <div
                    className="font-mono text-xl sm:text-2xl font-bold text-[#f5f7fa] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={56} prefix="-" suffix="%" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "خصم على باقات الرصيد" : "Volume Savings"}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Column 2: Live LineStream Terminal */}
            <motion.div {...reveal(0.2)} className="lg:col-span-5">
              <LineStream locale={locale} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. HowItWorks (01..03 Glass Cards) */}
      <Section
        id="how-it-works"
        eyebrow={isAr ? "خطوات بسيطة وسريعة" : "HOW IT WORKS"}
        title={
          isAr
            ? "3 خطوات تحوّل أي محاضرة صعبة لمذكرة جاهزة للامتحان"
            : "Three simple steps from raw lecture to exam readiness"
        }
        subtitle={
          isAr
            ? "صممنا المنصة عشان توفر وقتك وتخليك تفهم وتحفظ من أول مرة من غير تعقيد."
            : "Built to save you hours of manual note-taking and help you retain every detail."
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          {HOW_IT_WORKS_STEPS.map((step, i) => (
            <motion.div key={step.num} {...rise(i)}>
              <GlassCard className="h-full flex flex-col justify-between p-6 sm:p-7 hover:border-[#19f08c]/40 transition-colors">
                <div>
                  <div className="flex items-center justify-between gap-3 mb-5">
                    <span
                      className="font-mono text-2xl font-bold text-[#19f08c] tabular"
                      dir="ltr"
                    >
                      {step.num}
                    </span>
                    <LVBadge variant="emerald">{step.tag}</LVBadge>
                  </div>
                  <h3 className="font-display text-lg font-bold text-[#f5f7fa] mb-2.5">
                    {isAr ? step.titleAr : step.titleEn}
                  </h3>
                  <p className="text-xs sm:text-sm text-[#9aa4b2] leading-relaxed">
                    {isAr ? step.descAr : step.descEn}
                  </p>
                </div>
                <div className="mt-6 pt-4 border-t border-white/[0.07] flex items-center justify-between text-[11px] font-mono text-[#646e7d]">
                  <span>{isAr ? `الخطوة ${step.num}` : `STEP ${step.num}`}</span>
                  <span className="text-[#19f08c]">{isAr ? "جاهز فوراً" : "READY"}</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 4. Live Interactive Atlas Reader Showcase */}
      <Section
        id="atlas-reader"
        eyebrow={isAr ? "قارئ الملخصات التفاعلي" : "INTERACTIVE SUMMARY READER"}
        title={
          isAr
            ? "جرّب بنفسك: شرح مبسّط وتسميع تفاعلي جوه الملخص"
            : "Experience simple explanations and interactive self-testing"
        }
        subtitle={
          isAr
            ? "اضغط على زرار إخفاء المعلومات عشان تختبر ذاكرتك في الجرعات والمصطلحات المهمة قبل الامتحان."
            : "Click the button below to hide key terms and dosages, then tap each item to test your memory."
        }
      >
        <LandingAtlasShowcase locale={locale} />
      </Section>

      {/* 5. Logarithmic Volume Credit Configurator */}
      <Section
        id="configurator"
        eyebrow={
          isAr ? "حاسبة الرصيد والخصم الفوري" : "CREDIT CALCULATOR"
        }
        title={
          isAr
            ? "اختار كمية الرصيد اللي تناسبك — بخصم يوصل لـ 56%"
            : "Choose the exact credit amount you need — up to 56% off"
        }
        subtitle={
          isAr
            ? "حرّك المؤشر أو اختار باقة سريعة، وكل ما تزود الكمية سعر النقطة بيقل تلقائياً والرصيد مش بينتهي."
            : "Move the slider or pick a quick pack. Larger amounts automatically reduce the price per credit."
        }
      >
        <LVConfigurator
          locale={locale}
          onSelectCustomPack={() => navigate("/subscriptions")}
        />
      </Section>

      {/* 6. Pricing Plans */}
      <Section
        id="pricing"
        eyebrow={isAr ? "الباقات الشهرية" : "MONTHLY PLANS"}
        title={
          isAr
            ? "باقات واضحة تناسب كل طالب"
            : "Simple plans for every study load"
        }
        subtitle={
          isAr
            ? "اشترك في باقة شهرية أو اشحن رصيد إضافي مش بينتهي في أي وقت عن طريق فودافون كاش أو إنستاباي أو تيليجرام."
            : "Subscribe to a monthly plan or top up non-expiring credits anytime via InstaPay, Vodafone Cash, or Telegram."
        }
      >
        <div className="grid gap-6 lg:grid-cols-3">
          {PRICING_PLANS.map((plan, i) => (
            <motion.div key={plan.key} {...rise(i)}>
              <PricingCard
                name={isAr ? plan.nameAr : plan.nameEn}
                badge={isAr ? plan.badgeAr : plan.badgeEn}
                price={plan.price}
                currency={isAr ? "ج.م" : "EGP"}
                period={isAr ? "/ شهرياً" : "/ month"}
                description={isAr ? plan.descAr : plan.descEn}
                features={isAr ? plan.featuresAr : plan.featuresEn}
                ctaLabel={
                  isAr ? "اشترك في الباقة" : "Select Plan"
                }
                to="/subscriptions"
                recommended={plan.recommended}
                className="h-full"
              />
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 7. Trust & Verification Guarantee */}
      <Section
        id="trust"
        eyebrow={isAr ? "مميزات المنصة" : "WHY BLACK FIGHTERS"}
        title={
          isAr
            ? "ليه آلاف الطلاب في الكليات العملية بيعتمدوا على Black Fighters؟"
            : "Why thousands of students rely on Black Fighters"
        }
      >
        <div className="grid gap-6 md:grid-cols-3">
          {TRUST_PILLARS.map((pillar, i) => {
            const Icon = pillar.icon;
            return (
              <motion.div key={i} {...rise(i)}>
                <GlassCard className="h-full p-6 sm:p-7 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center justify-between gap-3 mb-4">
                      <div className="grid size-11 place-items-center rounded-xl border border-[#19f08c]/35 bg-[#19f08c]/12 text-[#19f08c]">
                        <Icon className="size-5" />
                      </div>
                      <span
                        className="font-mono text-xs font-semibold text-[#19f08c]"
                      >
                        {pillar.metric}
                      </span>
                    </div>
                    <h3 className="font-display text-base sm:text-lg font-bold text-[#f5f7fa] mb-2">
                      {isAr ? pillar.titleAr : pillar.titleEn}
                    </h3>
                    <p className="text-xs sm:text-sm text-[#9aa4b2] leading-relaxed">
                      {isAr ? pillar.descAr : pillar.descEn}
                    </p>
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      </Section>

      {/* 8. FAQ Section */}
      <Section
        id="faq"
        eyebrow={isAr ? "الأسئلة الشائعة" : "FREQUENTLY ASKED QUESTIONS"}
        title={
          isAr
            ? "إجابات واضحة لكل أسئلتك"
            : "Clear answers to common questions"
        }
      >
        <div className="mx-auto max-w-3xl space-y-3">
          {FAQ_ITEMS.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <GlassCard key={idx} padding="p-0" className="overflow-hidden">
                <button
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  className="w-full flex items-center justify-between gap-4 px-5 py-4 text-start cursor-pointer hover:bg-white/[0.02] transition-colors"
                >
                  <span className="font-display text-sm sm:text-base font-semibold text-[#f5f7fa]">
                    {isAr ? item.qAr : item.qEn}
                  </span>
                  <ChevronDown
                    className={cn(
                      "w-4 h-4 shrink-0 text-[#19f08c] transition-transform duration-200",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>
                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-5 pb-4 text-xs sm:text-sm text-[#9aa4b2] leading-relaxed border-t border-white/[0.06] pt-3"
                    >
                      {isAr ? item.aAr : item.aEn}
                    </motion.div>
                  )}
                </AnimatePresence>
              </GlassCard>
            );
          })}
        </div>
      </Section>

      {/* 9. Final CTA */}
      <section className="py-16 sm:py-24">
        <div className="mx-auto max-w-5xl px-4 sm:px-6">
          <GlassCard
            variant="highlight"
            className="p-8 sm:p-12 text-center space-y-6 relative overflow-hidden"
          >
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#19f08c]">
              <span className="pulse-dot" />
              <span>{isAr ? "جاهز تبدأ مذاكرتك صح؟" : "READY TO STUDY SMARTER?"}</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-gradient max-w-2xl mx-auto">
              {isAr
                ? "ابدأ دلوقتي وحوّل محاضرتك الجاية لملخص واضح وكويزات"
                : "Transform your next lecture into a clear summary and quizzes"}
            </h2>
            <p className="text-sm sm:text-base text-[#9aa4b2] max-w-xl mx-auto">
              {isAr
                ? "سجّل حسابك في ثواني وخد رصيد هدية مجاني تجرب بيه تلخيص المحاضرات والكويزات."
                : "Create your account in seconds and get free starter credits to summarize lectures and practice quizzes."}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center gap-4">
              <Link
                to={primaryRoute}
                className="btn-primary-glow inline-flex h-12 items-center gap-2.5 rounded-xl px-7 text-sm sm:text-base font-bold"
              >
                <span>
                  {isAr ? "ابدأ المذاكرة مجاناً" : "Get Started Free"}
                </span>
                <ArrowIcon className="w-4 h-4" />
              </Link>
              <Link
                to="/subscriptions"
                className="glass inline-flex h-12 items-center gap-2 rounded-xl px-6 text-sm font-semibold text-[#f5f7fa] hover:border-[#19f08c]/40 transition-colors"
              >
                <span>
                  {isAr ? "شوف الباقات والأسعار" : "View Pricing & Plans"}
                </span>
              </Link>
            </div>
          </GlassCard>
        </div>
      </section>

      {/* 10. Quiet LineVault Footer */}
      <footer className="border-t border-white/[0.07] bg-[#05070a] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <LVLogo
            to="/"
            label="Black Fighters"
            showSubtitle
            subtitle={
              isAr
                ? "منصة المذاكرة الذكية · تلخيص المحاضرات والكويزات"
                : "SMART ACADEMIC STUDY PLATFORM"
            }
          />
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#9aa4b2]">
            <Link to="/help#privacy-security" className="hover:text-[#f5f7fa] transition-colors">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <Link to="/help#credits-byok" className="hover:text-[#f5f7fa] transition-colors">
              {isAr ? "شروط الاستخدام" : "Terms of Service"}
            </Link>
            <Link to="/help" className="hover:text-[#f5f7fa] transition-colors">
              {isAr ? "مركز المساعدة" : "Help Center"}
            </Link>
            <span className="font-mono text-[#646e7d]" dir="ltr">
              © {new Date().getFullYear()} BLACK FIGHTERS
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
