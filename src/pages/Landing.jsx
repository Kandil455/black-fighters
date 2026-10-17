import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  Layers,
  Cpu,
  ChevronDown,
  Lock,
  CheckCircle2,
  Zap,
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
import { cn } from "@/lib/utils";

const HOW_IT_WORKS_STEPS = [
  {
    num: "01",
    titleAr: "ارفع المحاضرة أو المرجع (من صفحة إلى 1,000 صفحة)",
    titleEn: "Ingest Lecture or Reference (1 to 1,000 Pages)",
    descAr:
      "يحلل المحرك الهرمي الفهرس ويقسم الملف إلى لوحات علمية (Plates) متوازية مع قفل المصطلحات الطبية والعلمية عبر الفصول.",
    descEn:
      "Our hierarchical pipeline detects structural boundaries and partitions lectures into parallel Atlas Plates with locked terminology.",
    tag: "MAP-REDUCE ENGINE",
  },
  {
    num: "02",
    titleAr: "تدقيق عابر للعائلات يمنع الهلوسة الرقمية",
    titleEn: "Cross-Family Dosage & Citation Verification",
    descAr:
      "كل جرعة دوائية ورقم ونسبة مئوية يمر عبر نموذج مدقق من عائلة مختلفة لمطابقته بالنص الأصلي وتوثيق رقم الصفحة (✓ p.13).",
    descEn:
      "Every dosage, threshold, and claim is cross-checked by a second model family against raw PDF pages with exact page citations.",
    tag: "CROSS-FAMILY VERIFIER",
  },
  {
    num: "03",
    titleAr: "ذاكر بالاستدعاء النشط وخوارزمية FSRS v4.5",
    titleEn: "Master with Declassify Recall & FSRS v4.5",
    descAr:
      "أخفِ الأرقام والمصطلحات الحرجة بضغطة زر لتسميعها لنفسك، ودع محرك الذاكرة يجدول مراجعاتك تلقائياً قبل أن تنساها.",
    descEn:
      "Mask high-yield terms inline for active self-testing while FSRS v4.5 + BKT schedules your daily review queue automatically.",
    tag: "FSRS v4.5 + BKT",
  },
];

const TRUST_PILLARS = [
  {
    icon: ShieldCheck,
    titleAr: "تدقيق مزدوج ضد الهلوسة (Cross-Family Verifier)",
    titleEn: "Cross-Family Hallucination Guard",
    descAr:
      "لا نعتمد على نموذج واحد أبداً؛ النموذج المدقق ينتمي لعائلة مختلفة تماماً لمراجعة كل جرعة ورقم صفحة قبل عرضها لك.",
    descEn:
      "Primary generation and verification never share the same model family—eliminating silent dosage or numeric hallucinations.",
    metric: "99.4% VERIFIED",
  },
  {
    icon: Layers,
    titleAr: "معمارية التلخيص الهرمي (1..1,000 صفحة)",
    titleEn: "1,000-Page Hierarchical Architecture",
    descAr:
      "توليد متوازٍ للفصول مع سجل مصطلحات موحد (Glossary Lock) يضمن عدم اقتطاع أي فقرة في منتصف المحاضرات الطويلة.",
    descEn:
      "Parallel plate synthesis with global glossary locking ensures zero middle-of-book truncation across massive PDFs.",
    metric: ">= 95% COVERAGE",
  },
  {
    icon: Lock,
    titleAr: "دفتر رصيد ذري وتصدير HTML/PDF يعمل بدون إنترنت",
    titleEn: "Atomic Credit Vault & Offline Export",
    descAr:
      "كل عملية مسجلة بقيد مزدوج آمن مع استرجاع تلقائي للرصيد لو فشل التوليد، وتصدير ملفات HTML تفاعلية وPDF جاهزة للطباعة.",
    descEn:
      "Double-entry atomic credit ledger with automatic refund on failure, plus standalone offline HTML and print-ready PDF exports.",
    metric: "100% ATOMIC LEDGER",
  },
];

const PRICING_PLANS = [
  {
    key: "starter",
    nameAr: "باقة الانطلاق (Starter)",
    nameEn: "Starter Vault",
    badgeAr: "للطلاب",
    badgeEn: "SCHOLAR",
    price: "99",
    descAr: "مثالية لتلخيص محاضرات الأسبوع والكويزات الدورية بتدقيق كامل.",
    descEn: "Ideal for weekly lecture summaries, verified notes, and rapid quizzes.",
    featuresAr: [
      "350 نقطة كريدت شهرياً",
      "تلخيص المحاضرات والكتب حتى 300 صفحة",
      "المدقق الرقمي المزدوج للجرعات (Cross-Family Verifier)",
      "كويزات نظرية وعملي (OSCE / OSPE)",
      "تصدير PDF جاهز للطباعة",
    ],
    featuresEn: [
      "350 monthly AI credits",
      "Hierarchical PDF summaries up to 300 pages",
      "Cross-Family dosage & citation verifier",
      "Theory & Practical (OSCE / OSPE) quizzes",
      "Print-ready PDF export",
    ],
    recommended: false,
  },
  {
    key: "pro",
    nameAr: "باقة برو (Pro Atlas)",
    nameEn: "Pro Atlas",
    badgeAr: "الأكثر اختياراً",
    badgeEn: "RECOMMENDED",
    price: "199",
    descAr: "القوة الكاملة لقارئ الأطلس V5، تلخيص الكتب الضخمة، واستوديو يوتيوب.",
    descEn: "Full Atlas V5 reader power, massive reference books, and YouTube AI Studio.",
    featuresAr: [
      "900 نقطة كريدت شهرياً",
      "تلخيص المراجع الضخمة (من 1 حتى 1,000 صفحة)",
      "قارئ الأطلس V5 مع شرائط التسميع التفاعلي (Declassify)",
      "استوديو تلخيص محاضرات يوتيوب بالذكاء الاصطناعي",
      "تصدير PDF للطباعة + ملف HTML تفاعلي يعمل بدون إنترنت",
    ],
    featuresEn: [
      "900 monthly AI credits",
      "1 to 1,000-page reference book pipeline",
      "Atlas V5 Reader with interactive Declassify bars",
      "YouTube AI Lecture Summarizer Studio",
      "Printable PDF + standalone offline HTML export",
    ],
    recommended: true,
  },
  {
    key: "supreme",
    nameAr: "باقة القمة (Supreme Vault)",
    nameEn: "Supreme Vault",
    badgeAr: "للمراجع الكبرى",
    badgeEn: "INSTITUTIONAL",
    price: "399",
    descAr: "أقصى سعة كريدت للدفعات الطبية والمجموعات الدراسية ووضع طوارئ الامتحانات.",
    descEn: "Maximum credit capacity for medical syndicates and exam-night triage.",
    featuresAr: [
      "2,500 نقطة كريدت شهرياً",
      "أولوية قصوى على أسرع نماذج التوليد والتدقيق",
      "فتح راوند الطوارئ ليلة الامتحان (Exam Night Triage)",
      "خريطة السيطرة المعرفية الكاملة (FSRS v4.5 + BKT)",
      "دعم فني مباشر ومشاركة غير محدودة للمذكرات",
    ],
    featuresEn: [
      "2,500 monthly AI credits",
      "Priority routing on flagship synthesis & verifier models",
      "Exam-Night Emergency Triage Mode unlocked",
      "Full Territory Mastery Map (FSRS v4.5 + BKT)",
      "Direct priority support & unlimited sharing",
    ],
    recommended: false,
  },
];

const FAQ_ITEMS = [
  {
    qAr: "كيف يمنع Black Fighters الهلوسة في الجرعات والأرقام الطبية؟",
    qEn: "How does Black Fighters prevent dosage and numeric hallucinations?",
    aAr: "نطبق معمارية المدقق العابر للعائلات (Cross-Family Verifier): النموذج الذي يولّد الملخص لا يُسمح له بتدقيق نفسه، بل يراجع مخرجاته نموذج ثانٍ من عائلة مختلفة تماماً ويطابق كل رقم وجرعة بالنص الأصلي المستخرج من الصفحة مع إرفاق شارة الصفحة (✓ p.13).",
    aEn: "We enforce Cross-Family Verification: the primary generator model never verifies its own output. A second model from a distinct model family cross-checks every dosage and number against the raw PDF page and attaches a verified page badge.",
  },
  {
    qAr: "هل أستطيع رفع كتاب أو مرجع كامل من 500 أو 1,000 صفحة؟",
    qEn: "Can I upload a 500 or 1,000-page reference book?",
    aAr: "نعم. خط أنابيب التلخيص الهرمي ذو الـ 9 مراحل يقسم المرجع إلى فصول ولوحات علمية (Plates) متوازية مع سجل مصطلحات موحد (Glossary Registry) يمنع ضياع أي تفاصيل في منتصف الكتاب.",
    aEn: "Yes. Our 9-stage hierarchical pipeline partitions books into parallel chapters and Atlas Plates with a locked Glossary Registry, ensuring >= 95% structural coverage without middle-of-book truncation.",
  },
  {
    qAr: "كيف يعمل منزلق الكريدت اللوغاريتمي والخصم الكمي؟",
    qEn: "How does the logarithmic credit configurator work?",
    aAr: "يمكنك اختيار أي كمية كريدت من 100 حتى 10,000 نقطة عبر المنزلق التفاعلي. كلما زادت الكمية انتقلت تلقائياً إلى شريحة خصم أعلى يصل توفيرها إلى 56%، والرصيد المشحون لا ينتهي أبداً.",
    aEn: "Dial any credit volume between 100 and 10,000 credits. As volume increases, unit cost drops automatically across 6 tiers (up to 56% off), and top-up credits never expire.",
  },
  {
    qAr: "ما هي وسائل الدفع المتاحة وكيف يتم التفعيل؟",
    qEn: "What payment methods are supported and how fast is activation?",
    aAr: "ندعم فودافون كاش، إنستاباي (InstaPay)، عملة USDT TRC20، ونجوم تيليجرام (Telegram Stars). تُحجز التسعيرة لمدة 15 دقيقة في محطة الدفع الفورية ويُضاف الرصيد لدفتر حسابك فور التأكيد.",
    aEn: "We support Vodafone Cash, InstaPay, USDT TRC20, and Telegram Stars. Your quote is locked for 15 minutes in the live checkout terminal and credited atomically upon verification.",
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
              {isAr ? "كيف تعمل المنصة" : "How it works"}
            </a>
            <a
              href="#atlas-reader"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "قارئ الأطلس V5" : "Atlas V5 Reader"}
            </a>
            <a
              href="#configurator"
              className="hover:text-[#f5f7fa] transition-colors whitespace-nowrap shrink-0"
            >
              {isAr ? "حاسبة الرصيد" : "Credit Vault"}
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
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Column 1: Copy + CTAs + 3 AnimatedNumber Counters */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div {...reveal(0)}>
                <span className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#19f08c]">
                  <span className="pulse-dot" />
                  <span>VERIFIED ACADEMIC ENGINE · V5 ATLAS × LINEVAULT</span>
                </span>
              </motion.div>

              <motion.h1
                {...reveal(0.08)}
                className="font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight leading-[1.15]"
              >
                <span className="block text-gradient">
                  {isAr
                    ? "حوّل أضخم المحاضرات والكتب"
                    : "Turn 1,000-page lectures into"}
                </span>
                <span className="block text-gradient-emerald mt-1.5">
                  {isAr
                    ? "إلى أطلس علمي مدقق في ثوانٍ."
                    : "a cross-verified clinical atlas."}
                </span>
              </motion.h1>

              <motion.p
                {...reveal(0.16)}
                className="max-w-2xl text-sm sm:text-base lg:text-lg text-[#9aa4b2] leading-relaxed"
              >
                {isAr
                  ? "من صفحة واحدة حتى 1,000 صفحة — تلخيص هرمي متعدد النماذج، تدقيق عابر للعائلات يمنع الهلوسة الرقمية، وشرائط استدعاء نشط مرتبطة بخوارزمية FSRS v4.5 في مساحة عمل LineVault الهادئة."
                  : "Hierarchical multi-model summarization, cross-family dosage verification, and FSRS v4.5 spaced repetition in a calm LineVault workspace."}
              </motion.p>

              <motion.div
                {...reveal(0.24)}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <Link
                  to={primaryRoute}
                  className="btn-primary-glow inline-flex h-12 items-center gap-2.5 rounded-xl px-6 text-sm sm:text-base font-bold whitespace-nowrap"
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
                    {isAr ? "جرّب قارئ الأطلس الحيّ" : "Explore Live Atlas Reader"}
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
                    {isAr ? "سعة التلخيص الهرمي" : "Max Book Capacity"}
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
                    {isAr ? "دقة مطابقة الجرعات" : "Dosage Verification"}
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
                    {isAr ? "خصم المنزلق الكمي" : "Volume Tier Savings"}
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
        eyebrow={isAr ? "هندسة التلخيص والتدقيق" : "PIPELINE ARCHITECTURE"}
        title={
          isAr
            ? "ثلاث خطوات تحول الفوضى إلى أطلس مدقق"
            : "Three stages from raw PDF to verified mastery"
        }
        subtitle={
          isAr
            ? "صممنا كل مرحلة لتعالج نقاط الضعف في أدوات الذكاء الاصطناعي التقليدية والمذكرات اليدوية."
            : "Engineered to eliminate truncation, numeric hallucinations, and passive reading."
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
                  <span>STAGE {step.num}</span>
                  <span className="text-[#19f08c]">VERIFIED · READY</span>
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      </Section>

      {/* 4. Live Interactive Atlas Reader Showcase */}
      <Section
        id="atlas-reader"
        eyebrow={isAr ? "قارئ الأطلس التفاعلي V5" : "ATLAS V5 INTERACTIVE READER"}
        title={
          isAr
            ? "جرّب بنفسك: شرح تأسيسي واستدعاء نشط داخل الملخص"
            : "Experience live Active Recall and verified citations"
        }
        subtitle={
          isAr
            ? "فعّل وضع التسميع الذاتي (Declassify) لإخفاء المعلومات والجرعات الحرجة واختبر ذاكرتك قبل الامتحان."
            : "Toggle Declassify mode below to mask critical mechanisms and dosages, then click to reveal."
        }
      >
        <LandingAtlasShowcase locale={locale} />
      </Section>

      {/* 5. Logarithmic Volume Credit Configurator */}
      <Section
        id="configurator"
        eyebrow={
          isAr ? "حاسبة الرصيد والخصم الكمي" : "VOLUME CREDIT CONFIGURATOR"
        }
        title={
          isAr
            ? "اختر كمية الكريدت بدقة — خصم فوري حتى 56%"
            : "Dial your exact credit volume — up to 56% off"
        }
        subtitle={
          isAr
            ? "اسحب المنزلق اللوغاريتمي أو اختر شريحة جاهزة. كلما زادت الكمية انخفض سعر الوحدة تلقائياً."
            : "Drag the logarithmic slider or pick a preset tier. Unit cost drops automatically at every threshold."
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
            ? "باقات واضحة مصممة لكل حجم مذاكرة"
            : "Transparent plans scaled to your academic load"
        }
        subtitle={
          isAr
            ? "اشترك في باقة شهرية أو اشحن رصيداً إضافياً لا ينتهي في أي وقت عبر فودافون كاش أو إنستاباي أو تيليجرام."
            : "Choose a monthly vault plan or top up non-expiring credits anytime via InstaPay, Vodafone Cash, or Telegram Stars."
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
                  isAr ? "اختر هذه الباقة" : "Select Plan"
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
        eyebrow={isAr ? "الضمان الهندسي والعلمي" : "ARCHITECTURAL GUARANTEES"}
        title={
          isAr
            ? "لماذا يثق طلاب الطب والعلوم في Black Fighters؟"
            : "Built for zero-compromise academic reliability"
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
                        dir="ltr"
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
            ? "كل ما تحتاج معرفته قبل البدء"
            : "Everything you need to know"
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
            <div className="inline-flex items-center gap-2 font-mono text-xs uppercase tracking-[0.14em] text-[#19f08c]">
              <span className="pulse-dot" />
              <span>READY FOR EXAM MASTERY</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-extrabold tracking-tight text-gradient max-w-2xl mx-auto">
              {isAr
                ? "ابدأ الآن وحوّل محاضرتك القادمة إلى أطلس علمي مدقق"
                : "Transform your next lecture into a cross-verified clinical atlas"}
            </h2>
            <p className="text-sm sm:text-base text-[#9aa4b2] max-w-xl mx-auto">
              {isAr
                ? "انضم لآلاف الطلاب واحصل على هدية كريدت مجانية فور تسجيل حسابك لتجربة القارئ الذكي والكويزات."
                : "Create your account in seconds and receive free starter credits to test the Atlas V5 pipeline."}
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
                  {isAr ? "استعرض الباقات والرصيد" : "View Pricing & Vault"}
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
                ? "أطلس المذاكرة العلمي المدقق · V5 LINEVAULT"
                : "CROSS-VERIFIED ACADEMIC ATLAS · V5"
            }
          />
          <div className="flex flex-wrap items-center gap-6 text-xs text-[#9aa4b2]">
            <Link to="/privacy" className="hover:text-[#f5f7fa] transition-colors">
              {isAr ? "سياسة الخصوصية" : "Privacy Policy"}
            </Link>
            <Link to="/terms" className="hover:text-[#f5f7fa] transition-colors">
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
