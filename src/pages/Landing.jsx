import React, { useState, useEffect } from "react";
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
  Play,
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
import PromoVideoModal from "@/components/marketing/PromoVideoModal";
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
      "لا نعتمد على نموذج واحد أبداً؛ النموذج المدقق ينتمي لعائلة مختلفة تماماً لمراجعة كل معلومة ورقم صفحة قبل عرضها لك.",
    descEn:
      "Primary generation and verification never share the same model family—eliminating silent numeric or factual hallucinations.",
    metric: "VERIFIED ACCURACY",
  },
  {
    icon: Layers,
    titleAr: "معمارية التلخيص الهرمي الشامل",
    titleEn: "Hierarchical Multi-Size Architecture",
    descAr:
      "توليد متوازٍ للفصول مع سجل مصطلحات موحد يضمن استخراج كل الفيتشرز والتفاصيل دون اقتطاع أي فقرة في المحاضرات الطويلة.",
    descEn:
      "Parallel chapter synthesis with global glossary locking ensures every feature and concept is captured without truncation.",
    metric: "ZERO OMISSIONS",
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
    nameEn: "Starter Plan",
    badgeAr: "للطلاب",
    badgeEn: "STARTER",
    price: "80",
    descAr: "مثالية لتلخيص محاضرات الأسبوع والكويزات الدورية بتدقيق كامل.",
    descEn: "Ideal for weekly lecture summaries, structured notes, and rapid quizzes.",
    featuresAr: [
      "100 نقطة كريدت شهرياً",
      "تلخيص محاضرات بأحجام (صغير، متوسط، كبير)",
      "اختيار لغة الملخص (Bilingual أو إنجليزي أو عربي)",
      "كويزات تفاعلية وبطاقات مراجعة ذكية",
      "تصدير PDF جاهز للطباعة",
    ],
    featuresEn: [
      "100 monthly AI credits",
      "Small, Medium & Large lecture summaries",
      "Bilingual (EN+AR), English, or Arabic output",
      "Interactive quizzes & smart flashcards",
      "Print-ready PDF export",
    ],
    recommended: false,
  },
  {
    key: "pro",
    nameAr: "باقة برو (Pro)",
    nameEn: "Pro Plan",
    badgeAr: "الأكثر اختياراً",
    badgeEn: "MOST POPULAR",
    price: "150",
    descAr: "القوة الكاملة لتلخيص المحاضرات والمراجع الضخمة واستوديو يوتيوب.",
    descEn: "Full power for dense lectures, reference books, and YouTube AI Studio.",
    featuresAr: [
      "250 نقطة كريدت شهرياً",
      "تلخيص المحاضرات والمراجع الطويلة بدقة شاملة",
      "استوديو تلخيص محاضرات يوتيوب بالذكاء الاصطناعي",
      "خرائط ذهنية تفاعلية وبنك أسئلة شامل",
      "تصدير PDF للطباعة + ملف HTML يعمل بدون إنترنت",
    ],
    featuresEn: [
      "250 monthly AI credits",
      "Comprehensive lecture & textbook pipeline",
      "YouTube AI Lecture Summarizer Studio",
      "Interactive Mind Maps & full question bank",
      "Printable PDF + standalone offline HTML export",
    ],
    recommended: true,
  },
  {
    key: "supreme",
    nameAr: "باقة القمة (Supreme)",
    nameEn: "Supreme Plan",
    badgeAr: "للمراجع المكثفة",
    badgeEn: "MAXIMUM POWER",
    price: "250",
    descAr: "أقصى سعة كريدت للمذاكرة المكثفة والمراجع الكبرى طوال الشهر.",
    descEn: "Maximum credit capacity for heavy academic loads and full textbooks.",
    featuresAr: [
      "500 نقطة كريدت شهرياً",
      "أولوية قصوى على أسرع نماذج التوليد والتدقيق",
      "تلخيص شامل للمحاضرات والكتب بدون حد أقصى للصفحات",
      "جدولة المراجعة المتباعدة الذكية (FSRS v4.5)",
      "دعم فني مباشر ومشاركة غير محدودة للملخصات",
    ],
    featuresEn: [
      "500 monthly AI credits",
      "Priority routing on flagship synthesis models",
      "Full-depth summaries for massive lectures & books",
      "Smart spaced-repetition review scheduler (FSRS v4.5)",
      "Direct priority support & unlimited sharing",
    ],
    recommended: false,
  },
];

const FAQ_ITEMS = [
  {
    qAr: "كيف تضمن المنصة عدم ضياع أي معلومة أو خاصية (Feature) في المحاضرة؟",
    qEn: "How does Black Fighters ensure zero omitted features in my lecture?",
    aAr: "يقوم محرك التحليل باستخراج جميع التعريفات، الخصائص (Features)، القوانين، والجداول من كل فقرة في المحاضرة أولاً، ثم يبني الملخص بالحجم الذي تختاره (صغير، متوسط، أو كبير شامل) مع مراجعة آلية للتأكد من شمول كل النقاط.",
    aEn: "Our pipeline extracts all definitions, features, mechanisms, formulas, and tables from every section of your lecture first, then structures your summary in your chosen size (Small, Medium, or Large) with automated verification.",
  },
  {
    qAr: "هل أستطيع تحديد لغة التلخيص بشكل مستقل عن لغة الموقع؟",
    qEn: "Can I choose the summary output language independently of the site language?",
    aAr: "نعم بالتأكيد. يمكنك تصفح الموقع بالإنجليزية أو العربية، وعند رفع أي محاضرة تحدد أنت لغة التلخيص الناتج: ثنائي اللغة (Bilingual يحفظ المصطلحات الإنجليزية مع شرح عربي واضح)، أو إنجليزي بالكامل، أو عربي بالكامل.",
    aEn: "Yes. Regardless of whether you browse the platform in English or Arabic, you explicitly choose the output language for every summary: Bilingual (English technical terms + Arabic explanation), 100% English, or 100% Arabic.",
  },
  {
    qAr: "كيف يعمل منزلق الكريدت والخصم الكمي؟",
    qEn: "How does the credit configurator and volume discount work?",
    aAr: "يمكنك اختيار أي باقة شهرية أو شحن أي كمية كريدت إضافية عبر المنزلق التفاعلي. كلما زادت الكمية انخفض سعر النقطة تلقائياً، والرصيد الإضافي المشحون لا ينتهي.",
    aEn: "You can subscribe to a monthly plan or dial any custom credit volume using the interactive slider. As volume increases, unit cost drops automatically, and top-up credits never expire.",
  },
  {
    qAr: "ما هي وسائل الدفع المتاحة وكيف يتم التفعيل؟",
    qEn: "What payment methods are supported and how fast is activation?",
    aAr: "ندعم فودافون كاش، إنستاباي (InstaPay)، عملة USDT TRC20، ونجوم تيليجرام. اختر باقتك من الصفحة الرئيسية وسيتم تحويلك مباشرة لإتمام التفعيل الفوري.",
    aEn: "We support Vodafone Cash, InstaPay, USDT TRC20, and Telegram Stars. Select your plan and complete activation directly in the checkout terminal.",
  },
];

export default function Landing() {
  const { isAuthenticated } = useAuth();
  const { locale, dir } = useLocale();
  const navigate = useNavigate();
  const isAr = locale === "ar";
  const [openFaq, setOpenFaq] = useState(0);
  const [promoOpen, setPromoOpen] = useState(false);

  // Auto-open the cinematic promo showcase for new visitors
  useEffect(() => {
    try {
      const seen = localStorage.getItem("bf_promo_showcase_seen_v1");
      if (!seen) {
        const timer = setTimeout(() => {
          setPromoOpen(true);
        }, 650);
        return () => clearTimeout(timer);
      }
    } catch {}
  }, []);

  const handleClosePromo = () => {
    setPromoOpen(false);
    try {
      localStorage.setItem("bf_promo_showcase_seen_v1", "true");
    } catch {}
  };

  const primaryRoute = isAuthenticated ? "/dashboard" : "/register";
  const ArrowIcon = dir === "rtl" ? ArrowLeft : ArrowRight;

  return (
    <div
      dir={dir}
      className="min-h-screen bg-[#05070a] text-[#f5f7fa] relative overflow-x-hidden selection:bg-[#19f08c]/20"
    >
      {/* Ambient Backdrop */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-[#05070a]"
      >
        <div className="absolute inset-0 bg-radial-emerald" />
        <div className="absolute inset-0 bg-grid opacity-80" />
      </div>

      {/* 1. Sticky Glass Header */}
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
              {isAr ? "خطوات التلخيص والمذاكرة" : "Smart Workflow"}
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

          <div className="flex items-center gap-2.5 shrink-0">
            <button
              type="button"
              onClick={() => setPromoOpen(true)}
              className="hidden sm:inline-flex items-center gap-1.5 rounded-xl border border-blue-500/40 bg-blue-500/15 hover:bg-blue-500/25 px-3 py-2 text-xs font-extrabold text-blue-300 transition cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-current text-blue-400" />
              <span>{isAr ? "فيديو المنصة" : "Platform Video"}</span>
            </button>
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

      {/* 2. Two-Column Black Fighters Hero */}
      <section className="relative pt-12 pb-20 sm:pt-20 sm:pb-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <div className="grid gap-10 lg:grid-cols-12 lg:items-center">
            {/* Column 1: Copy + CTAs + 3 AnimatedNumber Counters */}
            <div className="lg:col-span-7 space-y-6">
              <motion.div {...reveal(0)} className="flex items-center gap-3.5">
                <div className="grid size-12 shrink-0 place-items-center rounded-2xl border border-[#19f08c]/40 bg-[#19f08c]/10">
                  <BlackFightersAnimated size={38} variant="emerald" />
                </div>
                <span className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5 font-mono text-[11px] font-semibold uppercase tracking-[0.14em] text-[#19f08c]">
                  <span className="pulse-dot" />
                  <span>
                    {isAr
                      ? "منصة التلخيص والمذاكرة الذكية · BLACK FIGHTERS"
                      : "SMART LECTURE & EXAM PLATFORM · BLACK FIGHTERS"}
                  </span>
                </span>
              </motion.div>

              <motion.h1
                {...reveal(0.08)}
                className="font-display text-3xl sm:text-5xl lg:text-[3.35rem] font-extrabold tracking-tight leading-[1.15]"
              >
                <span className="block text-gradient">
                  {isAr
                    ? "ارفع محاضرتك واختر حجم التلخيص"
                    : "Upload your lecture & choose your summary size"}
                </span>
                <span className="block text-gradient-emerald mt-1.5">
                  {isAr
                    ? "كل المهم والفيتشرز بطريقة منظمة."
                    : "every key feature organized with zero omissions."}
                </span>
              </motion.h1>

              <motion.p
                {...reveal(0.16)}
                className="max-w-2xl text-sm sm:text-base lg:text-lg text-[#9aa4b2] leading-relaxed"
              >
                {isAr
                  ? "سواء كانت محاضرتك قصيرة مليئة بالتفاصيل أو مرجعاً كبيراً — اختر بضغطة واحدة حجم التلخيص (صغير، متوسط، أو كبير) وحدد لغة الملخص (ثنائي اللغة، إنجليزي، أو عربي) مع كويزات تفاعلية وبطاقات مراجعة."
                  : "Whether your lecture is concise and dense or a comprehensive textbook — choose your summary size (Small, Medium, or Large) and output language (Bilingual, English, or Arabic) with instant quizzes and flashcards."}
              </motion.p>

              <motion.div
                {...reveal(0.24)}
                className="flex flex-wrap items-center gap-3.5 pt-2"
              >
                <Link
                  to={isAuthenticated ? "/create" : "/register"}
                  className="btn-primary-glow inline-flex h-12 items-center gap-2.5 rounded-xl px-6 text-sm sm:text-base font-bold whitespace-nowrap"
                >
                  <span>
                    {isAr ? "ارفع محاضرتك الآن مجاناً" : "Upload Lecture Free"}
                  </span>
                  <ArrowIcon className="w-4 h-4" />
                </Link>
                <button
                  type="button"
                  onClick={() => setPromoOpen(true)}
                  className="inline-flex h-12 items-center gap-2.5 rounded-xl border border-blue-500/45 bg-gradient-to-r from-blue-600/25 to-emerald-500/20 px-5 text-sm font-extrabold text-white hover:from-blue-600/40 hover:to-emerald-500/30 shadow-[0_0_25px_rgba(37,99,235,0.28)] transition cursor-pointer whitespace-nowrap"
                >
                  <span className="w-7 h-7 rounded-lg bg-blue-500 flex items-center justify-center text-white shadow">
                    <Play className="w-3.5 h-3.5 fill-current" />
                  </span>
                  <span>
                    {isAr ? "شاهد فيديو المنصة التفاعلي" : "Watch Platform Film (0:40)"}
                  </span>
                </button>
                <a
                  href="#pricing"
                  className="glass inline-flex h-12 items-center gap-2 rounded-xl px-4 text-sm font-semibold text-[#f5f7fa] hover:border-[#19f08c]/40 hover:bg-white/[0.05] transition-colors whitespace-nowrap"
                >
                  <BookOpen className="w-4 h-4 text-[#19f08c]" />
                  <span>
                    {isAr ? "باقات الاشتراك" : "View Plans"}
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
                    className="font-mono text-xl sm:text-2xl font-bold text-[#19f08c] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={3} suffix={isAr ? " أحجام" : " Sizes"} />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "صغير · متوسط · كبير" : "Small · Medium · Large"}
                  </p>
                </div>

                <div className="glass rounded-2xl p-3.5 sm:p-4">
                  <div
                    className="font-mono text-xl sm:text-2xl font-bold text-[#f5f7fa] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={3} suffix={isAr ? " أنظمة لغة" : " Languages"} />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "ثنائي اللغة · EN · عربي" : "Bilingual · English · Arabic"}
                  </p>
                </div>

                <div className="glass rounded-2xl p-3.5 sm:p-4">
                  <div
                    className="font-mono text-xl sm:text-2xl font-bold text-[#f5f7fa] tabular"
                    dir="ltr"
                  >
                    <AnimatedNumber value={1000} suffix="p" />
                  </div>
                  <p className="text-[11px] sm:text-xs text-[#9aa4b2] mt-1">
                    {isAr ? "سعة تلخيص المحاضرات والكتب" : "Max Lecture & Book Capacity"}
                  </p>
                </div>
              </motion.div>
            </div>

            {/* Column 2: Interactive Lecture & Summary Size Showcase */}
            <motion.div {...reveal(0.2)} className="lg:col-span-5">
              <LineStream locale={locale} />
            </motion.div>
          </div>
        </div>
      </section>

      {/* 3. HowItWorks (01..03 Glass Cards) */}
      <Section
        id="how-it-works"
        eyebrow={isAr ? "خطوات بسيطة وسريعة" : "STREAMLINED WORKFLOW"}
        title={
          isAr
            ? "ثلاث خطوات تحول محاضرتك إلى ملخص متكامل"
            : "Three steps from lecture file to complete mastery"
        }
        subtitle={
          isAr
            ? "ارفع ملفك، اختر حجم ولغة التلخيص، وابدأ المذاكرة وحل الأسئلة فوراً."
            : "Upload your file, pick your summary size and output language, and start studying immediately."
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

      {/* 4. Live Interactive Workflow Showcase */}
      <Section
        id="atlas-reader"
        eyebrow={isAr ? "معاينة ذكية حية" : "INTERACTIVE AI ENGINE"}
        title={
          isAr
            ? "استكشف كيف ينظم الذكاء الاصطناعي محاضرتك"
            : "See how our AI structures every lecture detail"
        }
        subtitle={
          isAr
            ? "تنقّل بين المراحل الثلاث لمشاهدة كيف يتم استخراج الفيتشرز وتنسيق الجداول وتوليد الأسئلة التفاعلية."
            : "Switch between the three live stages below to see extraction, multi-language synthesis, and instant quizzes in action."
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
          onSelectCustomPack={(pack) =>
            navigate(`/subscriptions?credits=${pack?.credits || ""}`)
          }
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
            ? "اختر باقتك الشهرية وسيتم توجيهك مباشرة لتأكيدها، أو اشحن رصيداً إضافياً لا ينتهي في أي وقت."
            : "Select your monthly plan to proceed directly to checkout, or top up non-expiring credits anytime."
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
                to={`/subscriptions?plan=${plan.key}`}
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

      {/* 10. Quiet Black Fighters Footer */}
      <footer className="border-t border-white/[0.07] bg-[#05070a] py-10">
        <div className="mx-auto max-w-6xl px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-6">
          <LVLogo
            to="/"
            label="Black Fighters"
            showSubtitle
            subtitle={
              isAr
                ? "منصة التلخيص والمذاكرة الذكية · BLACK FIGHTERS"
                : "SMART LECTURE & EXAM PLATFORM · BLACK FIGHTERS"
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

      <PromoVideoModal
        open={promoOpen}
        onClose={handleClosePromo}
        isEn={!isAr}
        onSelectPlan={() => {
          const pricingEl = document.getElementById("pricing");
          if (pricingEl) {
            pricingEl.scrollIntoView({ behavior: "smooth", block: "start" });
          } else {
            navigate("/subscriptions");
          }
        }}
        onTryUpload={() => {
          window.scrollTo({ top: 0, behavior: "smooth" });
        }}
      />
    </div>
  );
}
