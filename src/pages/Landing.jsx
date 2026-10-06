import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight,
  Boxes,
  Sparkles,
  Download,
  Lock,
  ShieldCheck,
  EyeOff,
  Wallet,
  ChevronDown,
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
import LandingAtlasShowcase from "@/components/atlas/LandingAtlasShowcase";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import { cn } from "@/lib/utils";

const STEPS = [
  {
    key: "s1",
    Icon: Boxes,
    titleAr: "اختر المحاضرة أو المرجع (1 إلى 1,000 صفحة)",
    titleEn: "Select Lecture or Textbook (1 to 1,000 Pages)",
    descAr:
      "من محاضرة 20 صفحة إلى مرجع 1,000 صفحة. يقسم المحرك الهرمي الفصول بدقة مع حذف التكرار وتقدير فوري للتكلفة.",
    descEn:
      "From a 20-page lecture to a 1,000-page reference. Our hierarchical engine splits chapters cleanly and shows an instant quote.",
  },
  {
    key: "s2",
    Icon: Sparkles,
    titleAr: "افهم من الأساس بتدقيق رقمي مزدوج",
    titleEn: "Foundational Bilingual Summary + Dual Verifier",
    descAr:
      "شرح تمهيدي بالعربي الواضح مع إبقاء المصطلح الإنجليزي في مكانه، ومطابقة كل جرعة ورقم طبي عبر عائلة نماذج ثانية.",
    descEn:
      "Clear Arabic foundational intuition with preserved English terminology and cross-family dosage verification.",
  },
  {
    key: "s3",
    Icon: Download,
    titleAr: "حمّل ملخصك أو أرسله إلى تيليجرام",
    titleEn: "Download Offline HTML/PDF or Send to Telegram",
    descAr:
      "فور انتهاء التوليد يصبح الملخص لك: افتحه في القارئ التفاعلي، أو حمّل ملف HTML/PDF مستقل، أو أرسله لبوت تيليجرام.",
    descEn:
      "Once generated, open in the interactive active-recall reader, download standalone HTML/PDF, or push directly to Telegram.",
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
      { labelAr: "قالب «شرح من الأساس»", labelEn: "Foundational Bilingual", valueAr: "مشمول", valueEn: "Included" },
      { labelAr: "بطاقات المراجعة FSRS v4.5", labelEn: "FSRS v4.5 Flashcards", valueAr: "يومي", valueEn: "Daily" },
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
      { labelAr: "المدقق الرقمي المزدوج للجرعات", labelEn: "Cross-Family Dosage Verifier", valueAr: "مفعّل", valueEn: "Active" },
      { labelAr: "تصدير HTML مستقل + طباعة PDF", labelEn: "Offline HTML + Print PDF", valueAr: "غير محدود", valueEn: "Unlimited" },
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
      { labelAr: "محرك الكتب والمراجع الضخمة", labelEn: "Big-Book Engine", valueAr: "2,500 نقطة", valueEn: "2,500 Credits", highlight: true },
      { labelAr: "أولوية قصوى في طابور المعالجة", labelEn: "Priority Queue", valueAr: "فوري", valueEn: "Instant" },
      { labelAr: "مزامنة كاملة مع بوت وتطبيق تيليجرام", labelEn: "Telegram Bot + Mini App", valueAr: "مشمول", valueEn: "Included" },
      { labelAr: "السعر الشهري", labelEn: "Monthly Price", valueAr: "249 ج.م / شهر", valueEn: "249 EGP / mo" },
    ],
  },
];

const TRUST_ITEMS = [
  {
    key: "t1",
    Icon: Lock,
    titleAr: "خصوصية كاملة لمحاضراتك",
    titleEn: "Encryption & Privacy at Rest",
    descAr:
      "ملخصاتك ومذكراتك مربوطة بحسابك فقط. ألغينا النشر العام نهائياً واستبدلناه بتصدير مشفر وملفات HTML مستقلة.",
    descEn:
      "Your lectures stay strictly private to your account. Public link leaks are permanently disabled.",
  },
  {
    key: "t2",
    Icon: ShieldCheck,
    titleAr: "تدقيق مزدوج للأرقام والجرعات",
    titleEn: "Cross-Family Verification",
    descAr:
      "كل جرعة دوائية أو قيمة معملية تُراجع تلقائياً عبر نموذج ذكاء اصطناعي من عائلة مختلفة قبل اعتماد الملخص.",
    descEn:
      "Every clinical dosage and lab value is cross-checked by a second model family against the source page.",
  },
  {
    key: "t3",
    Icon: EyeOff,
    titleAr: "بلا تشتيت ولا حشو بصري",
    titleEn: "No Trackers, Zero Clutter",
    descAr:
      "واجهة مركزة مصممة للقراءة الطويلة لساعات بدون إرهاق بصري، مع دعم كامل لاختصارات الكيبورد.",
    descEn:
      "Focused terminal-grade interface built for multi-hour study sessions with full keyboard navigation.",
  },
  {
    key: "t4",
    Icon: Wallet,
    titleAr: "دفتر رصيد مزدوج القيد",
    titleEn: "Double-Entry Credit Protection",
    descAr:
      "لا يُخصم رصيدك أبداً إذا تعثر أي فصل أثناء المعالجة؛ يُحجز الرصيد مؤقتاً ويُرد تلقائياً عند أي خطأ.",
    descEn:
      "Credits are reserved before generation and automatically refunded if any chapter fails.",
  },
];

const FAQ_ITEMS = [
  {
    qAr: "كيف يتعامل النظام مع الكتب والمراجع الكبيرة (300–1000 صفحة)؟",
    qEn: "How does the platform handle 300–1000 page textbooks?",
    aAr: "يتم تقسيم الملف تلقائياً إلى فصول (25–40 صفحة) مع تداخل صفحتين بين كل فصل وآخر، وقفل المصطلحات في قاموس موحد، ثم تجميع الملخص في ملف مفهرس بالكامل بدون اقتطاع أي فقرة.",
    aEn: "Large PDFs are partitioned into 25–40 page chapters with a 2-page overlap and a locked glossary registry so nothing in the middle is ever truncated.",
  },
  {
    qAr: "ما هو قالب «شرح من الأساس» (Foundational Bilingual)؟",
    qEn: "What is the Foundational Bilingual summary template?",
    aAr: "بدلاً من السرد الجاف الذي يفترض حفظك المسبق، يبدأ كل قسم بصندوق تمهيدي يشرح الفكرة الأساسية بالعربي الواضح مع إبقاء المصطلحات الطبية والعلمية الإنجليزية في مكانها.",
    aEn: "Every concept starts with a clear Arabic prerequisite bridge while keeping exact English medical and scientific terms inline.",
  },
  {
    qAr: "كيف أضمن دقة الجرعات والأرقام الطبية في الملخص؟",
    qEn: "How are medical dosages and numbers verified?",
    aAr: "يمر كل ملخص عبر مدقق مستقل من عائلة نماذج ثانية (Cross-Family Verifier) يطابق كل رقم وجرعة مع الصفحة الأصلية في المحاضرة.",
    aEn: "Every summary passes through a Cross-Family Verifier that checks all numbers, units, and dosages against the source PDF page.",
  },
  {
    qAr: "هل أستطيع قراءة الملخصات بدون إنترنت أو طباعتها؟",
    qEn: "Can I read summaries offline or print them?",
    aAr: "نعم، بضغطة واحدة يمكنك تحميل الملخص كملف HTML مستقل يعمل بدون إنترنت وبنفس تنسيق القارئ، أو طباعته بصيغة A4 PDF.",
    aEn: "Yes, export any summary as a single-file offline HTML reader or print-ready A4 PDF.",
  },
  {
    qAr: "كيف يعمل التكامل مع تيليجرام؟",
    qEn: "How does the Telegram integration work?",
    aAr: "يمكنك ربط حسابك ببوت تيليجرام وفتح تطبيق القارئ المصغر (/tg) لمراجعة بطاقات FSRS المستحقة واستلام ملفاتك مباشرة داخل تيليجرام.",
    aEn: "Link your account to our Telegram bot and open the /tg Mini App to review due FSRS cards and receive exported files directly.",
  },
];

export default function Landing() {
  const { user } = useAuth();
  const { locale, dir, setLocale } = useLocale();
  const navigate = useNavigate();
  const isAr = locale === "ar";
  const [openFaq, setOpenFaq] = useState(0);

  const primaryHref = user ? "/dashboard" : "/register";

  const navLinks = [
    { href: "/subscriptions", label: isAr ? "المتجر والرصيد" : "Store", isRoute: true },
    { href: primaryHref, label: isAr ? "الكورسات" : "Courses", isRoute: true },
    { href: "#how", label: isAr ? "كيف يعمل" : "How it works" },
    { href: "#pricing", label: isAr ? "الأسعار" : "Pricing" },
    { href: "#faq", label: isAr ? "الأسئلة الشائعة" : "FAQ" },
  ];

  return (
    <div dir={dir} className="min-h-screen text-[#eef2f6]">
      {/* Sticky Header (1:1 joyful-heisenberg layout/header.tsx) */}
      <header className="sticky top-0 z-50 border-b border-[rgb(255_255_255/0.09)] bg-[#05070a]/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-3 px-4 sm:px-6">
          <LVLogo to="/" label="BLACK FIGHTERS" />

          <nav
            aria-label={isAr ? "التنقل الرئيسي" : "Primary Navigation"}
            className="hidden items-center gap-1 md:flex"
          >
            {navLinks.map((l) =>
              l.isRoute ? (
                <Link
                  key={l.href}
                  to={l.href}
                  className="rounded-lg px-3 py-2 text-sm text-[#9aa6b4] transition-colors hover:text-[#eef2f6]"
                >
                  {l.label}
                </Link>
              ) : (
                <a
                  key={l.href}
                  href={l.href}
                  className="rounded-lg px-3 py-2 text-sm text-[#9aa6b4] transition-colors hover:text-[#eef2f6]"
                >
                  {l.label}
                </a>
              )
            )}
          </nav>

          <div className="flex items-center gap-2">
            <LVLangSwitch locale={locale} onChange={setLocale} />

            <Button asChild size="sm" className="hidden sm:inline-flex">
              <Link to={user ? "/dashboard" : "/subscriptions"}>
                {user
                  ? isAr
                    ? "لوحة التحكم"
                    : "Dashboard"
                  : isAr
                  ? "اشحن رصيدك"
                  : "Buy Credits"}
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile sub-nav (1:1 joyful-heisenberg layout/header.tsx) */}
        <nav
          aria-label={isAr ? "التنقل الرئيسي" : "Primary Navigation"}
          className="flex gap-1 overflow-x-auto border-t border-[rgb(255_255_255/0.09)] px-3 py-1.5 md:hidden scrollbar-none"
        >
          {navLinks.map((l) =>
            l.isRoute ? (
              <Link
                key={l.href}
                to={l.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-[#9aa6b4] hover:text-[#eef2f6]"
              >
                {l.label}
              </Link>
            ) : (
              <a
                key={l.href}
                href={l.href}
                className="shrink-0 rounded-lg px-3 py-1.5 text-sm text-[#9aa6b4] hover:text-[#eef2f6]"
              >
                {l.label}
              </a>
            )
          )}
        </nav>
      </header>

      <main className="pb-24">
        {/* 1) HERO SECTION (1:1 joyful-heisenberg hero.tsx + LineStream) */}
        <section className="mx-auto grid max-w-6xl items-center gap-12 px-4 pb-8 pt-14 sm:px-6 sm:pt-20 lg:grid-cols-[1.1fr_0.9fr]">
          <div>
            <motion.p
              {...reveal(0)}
              className="mb-5 inline-flex items-center gap-2 rounded-full border border-[#19f08c]/25 bg-[#19f08c]/10 px-3 py-1 text-xs font-medium text-[#19f08c]"
            >
              <span
                className="size-1.5 rounded-full bg-[#19f08c]"
                aria-hidden="true"
              />
              {isAr
                ? "مخزون مباشر · تلخيص وتدقيق بالذكاء الاصطناعي"
                : "Live inventory · AI + FSRS v4.5"}
            </motion.p>

            <motion.h1
              {...reveal(1)}
              className="text-balance text-5xl font-semibold leading-[1.05] tracking-tight sm:text-6xl lg:text-7xl"
            >
              <span className="text-gradient">
                {isAr ? "اسحب بالضبط" : "Pull the exact"}
              </span>{" "}
              <span className="bg-gradient-to-r from-amber-400 via-orange-500 to-rose-500 bg-clip-text font-extrabold text-transparent drop-shadow-[0_0_24px_rgba(245,158,11,0.35)]">
                {isAr ? "الملخصات والكويزات" : "Study Packs"}
              </span>{" "}
              <span className="text-gradient">
                {isAr ? "التي تحتاجها." : "you need."}
              </span>
            </motion.h1>

            <motion.p
              {...reveal(2)}
              className="mt-6 max-w-xl text-pretty text-lg leading-relaxed text-[#9aa6b4]"
            >
              {isAr
                ? "اختر الباقة أو المقرر، حدّد الكمية والعمق، واستلم ملخصاتك المدققة وكويزاتك خلال دقائق — مخصصة لحسابك وحدك."
                : "Pick a study pool, choose your credit volume, and generate verified bilingual summaries and FSRS quizzes in minutes."}
            </motion.p>

            <motion.div
              {...reveal(3)}
              className="mt-9 flex flex-wrap items-center gap-3"
            >
              <Button asChild size="lg">
                <Link to={primaryHref}>
                  <span>
                    {user
                      ? isAr
                        ? "افتح لوحة التحكم"
                        : "Open Dashboard"
                      : isAr
                      ? "تصفح الباقات والرصيد"
                      : "Browse the store"}
                  </span>
                  <ArrowRight className="rtl:rotate-180" />
                </Link>
              </Button>

              <Button asChild variant="secondary" size="lg">
                <a href="#how">{isAr ? "كيف يعمل" : "How it works"}</a>
              </Button>
            </motion.div>

            <motion.div
              {...reveal(4)}
              className="mt-12 border-t border-[rgb(255_255_255/0.09)] pt-6"
            >
              <p className="text-sm text-[#9aa6b4]">
                {isAr
                  ? "الملخصات والأسئلة الجاهزة في المخزون الآن"
                  : "Study packs & verified clinical lines in stock right now"}
              </p>
              <div
                className="mt-1 font-mono text-4xl font-medium tabular text-[#eef2f6] sm:text-5xl"
                aria-live="polite"
              >
                <AnimatedNumber value={192} />
              </div>
            </motion.div>
          </div>

          <motion.div {...reveal(2)}>
            <LineStream
              locale={locale}
              label={
                isAr
                  ? "مخزون الباقات والكريدتس المباشر"
                  : "Live Study & Credits Inventory"
              }
            />
          </motion.div>
        </section>

        {/* 2) HOW IT WORKS (1:1 LineVault HowItWorks in landing-sections.tsx) */}
        <Section
          id="how"
          title={
            isAr ? "ثلاث خطوات. بدون تشتيت." : "Three steps. Zero clutter."
          }
          subtitle={
            isAr
              ? "من ملف الـ 500 صفحة إلى ملخص مشروح من الأساس وجدول مراجعة جاهز في دقائق."
              : "From a 500-page PDF to a foundational summary and active recall schedule in minutes."
          }
        >
          <ol className="grid gap-5 md:grid-cols-3">
            {STEPS.map(({ key, Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <motion.li key={key} {...rise(i)}>
                <GlassCard className="h-full p-6">
                  <div className="mb-6 flex items-center justify-between">
                    <span className="grid size-11 place-items-center rounded-xl border border-[#19f08c]/30 bg-[#19f08c]/10 text-[#19f08c]">
                      <Icon className="size-5" aria-hidden="true" />
                    </span>
                    <span className="font-mono text-sm text-[#6b7785]">
                      0{i + 1}
                    </span>
                  </div>
                  <h3 className="text-xl font-semibold text-[#eef2f6]">
                    {isAr ? titleAr : titleEn}
                  </h3>
                  <p className="mt-2 leading-relaxed text-[#9aa6b4]">
                    {isAr ? descAr : descEn}
                  </p>
                </GlassCard>
              </motion.li>
            ))}
          </ol>
        </Section>

        {/* 3) LIVE READER PREVIEW & ARCHITECTURE COMPARISON */}
        <Section
          id="reader"
          title={
            isAr
              ? "قارئ تفاعلي مصمم للفهم والاستدعاء النشط"
              : "Interactive Reader Built for Comprehension & Active Recall"
          }
          subtitle={
            isAr
              ? "جرب بنفسك إخفاء المصطلحات والجرعات لاختبار ذاكرتك قبل كشفها."
              : "Test yourself by toggling active recall redaction directly inside the summary."
          }
        >
          <motion.div {...rise(0)}>
            <LandingAtlasShowcase locale={locale} />
          </motion.div>
        </Section>

        {/* 4) INTERACTIVE LINEVAULT CONFIGURATOR SECTION */}
        <Section
          id="configurator"
          title={
            isAr
              ? "أعدّ كمية الكريدتس التي تحتاجها بالضبط"
              : "Configure the Exact Credit Volume You Need"
          }
          subtitle={
            isAr
              ? "ينخفض سعر النقطة تلقائياً كلما زادت الكمية. الرصيد المخصص لا ينتهي أبداً."
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

        {/* 5) PRICING SECTION (1:1 LineVault PricingSection + PoolGrid in landing-sections.tsx) */}
        <Section
          id="pricing"
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
                    <h3 className="text-lg font-semibold text-[#eef2f6]">
                      {isAr ? plan.nameAr : plan.nameEn}
                    </h3>
                    {(plan.saveAr || plan.saveEn) && (
                      <span className="rounded-full bg-[#19f08c]/10 border border-[#19f08c]/30 px-2.5 py-0.5 text-xs font-medium text-[#19f08c]">
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

                  <ul className="my-5 flex-1 divide-y divide-[rgb(255_255_255/0.09)] text-sm">
                    {plan.rows.map((row, rIdx) => (
                      <li
                        key={rIdx}
                        className={cn(
                          "flex items-center justify-between gap-3 py-2.5",
                          row.highlight &&
                            "-mx-3 rounded-lg bg-[#19f08c]/[0.08] px-3"
                        )}
                      >
                        <span className="text-[#9aa6b4]">
                          {isAr ? row.labelAr : row.labelEn}
                        </span>
                        <span className="font-mono tabular text-[#eef2f6]">
                          {isAr ? row.valueAr : row.valueEn}
                        </span>
                      </li>
                    ))}
                  </ul>

                  <Button
                    asChild
                    variant={plan.recommended ? "default" : "secondary"}
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

        {/* 6) TRUST SECTION (1:1 LineVault Trust in landing-sections.tsx) */}
        <Section
          id="trust"
          title={
            isAr
              ? "الأمان والخصوصية بالتصميم"
              : "Precision & Privacy by Design"
          }
          subtitle={
            isAr
              ? "نحتفظ بأقل قدر ممكن من البيانات ونحمي دقة كل رقم طبي."
              : "Engineered to guarantee clinical accuracy, credit safety, and strict document privacy."
          }
        >
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {TRUST_ITEMS.map(({ key, Icon, titleAr, titleEn, descAr, descEn }, i) => (
              <motion.div key={key} {...rise(i)}>
                <GlassCard className="h-full p-6">
                  <Icon
                    className="mb-4 size-6 text-[#19f08c]"
                    aria-hidden="true"
                  />
                  <h3 className="font-semibold text-[#eef2f6]">
                    {isAr ? titleAr : titleEn}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#9aa6b4]">
                    {isAr ? descAr : descEn}
                  </p>
                </GlassCard>
              </motion.div>
            ))}
          </div>
        </Section>

        {/* 7) FAQ SECTION (1:1 LineVault Faq in landing-sections.tsx) */}
        <Section
          id="faq"
          title={
            isAr ? "أسئلتك، بإجابات واضحة" : "Your Questions, Answered Clearly"
          }
          className="max-w-3xl"
        >
          <div className="space-y-3">
            {FAQ_ITEMS.map((item, idx) => {
              const isOpen = openFaq === idx;
              return (
                <div
                  key={idx}
                  className="glass rounded-2xl overflow-hidden"
                >
                  <button
                    type="button"
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                    className="group flex w-full items-center justify-between gap-4 px-5 py-4 text-start font-medium text-[#eef2f6] hover:text-[#19f08c] transition-colors"
                  >
                    <span>{isAr ? item.qAr : item.qEn}</span>
                    <ChevronDown
                      className={cn(
                        "size-4 shrink-0 text-[#9aa6b4] transition-transform duration-200",
                        isOpen && "rotate-180 text-[#19f08c]"
                      )}
                    />
                  </button>
                  {isOpen && (
                    <div className="px-5 pb-5 text-sm leading-relaxed text-[#9aa6b4]">
                      {isAr ? item.aAr : item.aEn}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Section>

        {/* 8) FINAL CTA (1:1 LineVault FinalCta in landing-sections.tsx) */}
        <section className="mx-auto max-w-6xl px-4 pt-24 sm:px-6">
          <div className="glass relative overflow-hidden rounded-[2rem] px-6 py-16 text-center">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(40rem_16rem_at_50%_0%,rgb(25_240_140/0.14),transparent)]"
            />
            <h2 className="relative text-gradient text-balance text-3xl font-semibold tracking-tight sm:text-5xl">
              {isAr
                ? "جاهزون متى كنت جاهزاً."
                : "Ready whenever your next lecture is."}
            </h2>
            <p className="relative mx-auto mt-4 max-w-md text-[#9aa6b4]">
              {isAr
                ? "تغطية شاملة، أسعار صادقة، وتسليم خلال دقائق."
                : "Complete coverage, honest volume pricing, and delivery in minutes."}
            </p>
            <Button asChild size="lg" className="relative mt-8">
              <Link to={primaryHref}>
                <span>
                  {user
                    ? isAr
                      ? "افتح لوحة التحكم"
                      : "Open Dashboard"
                    : isAr
                    ? "ابدأ مجاناً الآن"
                    : "Start Free Now"}
                </span>
                <ArrowRight className="rtl:rotate-180" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      {/* Footer (1:1 LineVault footer.tsx) */}
      <footer className="mt-24 border-t border-[rgb(255_255_255/0.09)]">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
          <div className="space-y-4">
            <LVLogo to="/" label="BLACK FIGHTERS" />
            <p className="max-w-xs text-sm text-[#9aa6b4]">
              {isAr
                ? "تلخيص المحاضرات والمراجع الضخمة بتدقيق رقمي مزدوج وجدولة FSRS v4.5."
                : "Hierarchical lecture summaries with cross-family verification and FSRS v4.5."}
            </p>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-[#eef2f6]">
              {isAr ? "المنصة" : "Platform"}
            </h2>
            <div className="flex flex-col gap-2.5 text-sm text-[#9aa6b4] [&_a:hover]:text-[#eef2f6]">
              <a href="#how">{isAr ? "كيف يعمل" : "How It Works"}</a>
              <a href="#reader">{isAr ? "القارئ الذكي" : "Smart Reader"}</a>
              <a href="#configurator">{isAr ? "حاسبة الرصيد" : "Configurator"}</a>
              <a href="#pricing">{isAr ? "الأسعار" : "Pricing"}</a>
              <Link to="/help">{isAr ? "مركز المساعدة" : "Help Center"}</Link>
            </div>
          </div>

          <div>
            <h2 className="mb-3 text-sm font-medium text-[#eef2f6]">
              {isAr ? "الحساب" : "Account"}
            </h2>
            <div className="flex flex-col gap-2.5 text-sm text-[#9aa6b4] [&_a:hover]:text-[#eef2f6]">
              <Link to="/login">{isAr ? "تسجيل الدخول" : "Sign In"}</Link>
              <Link to="/register">{isAr ? "إنشاء حساب" : "Create Account"}</Link>
              <Link to="/subscriptions">{isAr ? "الاشتراكات" : "Subscriptions"}</Link>
              <Link to="/tg">{isAr ? "تطبيق تيليجرام (/tg)" : "Telegram Mini App"}</Link>
            </div>
          </div>
        </div>
        <div className="border-t border-[rgb(255_255_255/0.09)] py-6 text-center text-xs text-[#6b7785]">
          © {new Date().getFullYear()} BLACK FIGHTERS.{" "}
          {isAr ? "جميع الحقوق محفوظة." : "All rights reserved."}
        </div>
      </footer>
    </div>
  );
}
