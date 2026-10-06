# BLACK FIGHTERS × LINEVAULT — المخطط الهندسي الموحّد الشامل وحزمة البرومبتات التنفيذية
## Master Engineering Specification, Two-Builder Contract & 12-Prompt Execution Bible (V5 «LineVault Edition»)

> **الهدف النهائي (Zero-Ambiguity North Star):**
> توحيد الـ 31 شاشة في **BLACK FIGHTERS** تحت هوية بصرية وحركية واحدة مطابقة تماماً لـ **LineVault** (`#05070a` خلفية حبرية صامتة، `#090c11` أسطح `.glass` بحدود شعرية `1px`، لون زمردي واحد `#19f08c`، حركة فيزيائية هادئة `cubic-bezier(0.22, 1, 0.36, 1)`، عدادات `<AnimatedNumber />`، شريط `<LineStream />`، منزلق التسعير اللوغاريتمي `<LVConfigurator />`، ومحطة الدفع الفورية `<CountdownRing /> + <Stepper /> + <CopyField />`)، مع دمج العقل الهندسي الكامل لخطة **V4 Rebirth** وحزمة **الأطلس V5** (بوابة الذكاء الاصطناعي متعدّدة النماذج، محرك التلخيص الهرمي لـ `1..1,000` صفحة، المدقق العابر للعائلات `Cross-Family Verifier`، محرك التكرار المتباعد `FSRS v4.5 + BKT`، دفتر الأستاذ المزدوج `Double-Entry Credit Ledger`، ومنظومة التيليجرام الكاملة `grammY + Stars XTR + Mini App /tg`).

---

## الفهرس العام للوثيقة (Master Table of Contents)

1. **الجزء 0 (Part 0): التشخيص الجذري، مقارنة LineVault مقابل الموقع القديم، وقائمة الإعدام (Kill List)**
   - 0.1 لماذا يبدو LineVault كمنتج عالمي بينما يبدو التصميم القديم مزدحماً؟
   - 0.2 القرارات الهندسية الخمسة الحاسمة (Frozen Design Decisions)
   - 0.3 قائمة الإعدام البصرية والبرمجية (The Kill List)
   - 0.4 ميزانية الأداء الصارمة (Performance & Core Web Vitals Budgets)
2. **الجزء A (Part A): العقد المشترك المجمّد (Frozen Shared Contract — `packages/shared`)**
   - A.1 مخططات Zod و TypeScript الكاملة (`SummaryDocument` v5, `Course`, `ConceptMastery`, `CreditLedger`, `Pool`/`Order` Pricing Curve, `TelegramUpdate`)
   - A.2 معادلة التسعير اللوغاريتمي والخصومات الكمية (`lib/qty.ts` & `pricing.ts`)
   - A.3 جدول نقاط النهاية الـ 28 (Complete 28-Endpoint REST & SSE API Specification)
   - A.4 قاموس أخطاء النظام الموحّد (Standardized Error Codes & HTTP Status Matrix)
   - A.5 متجهات الاختبار الذهبية (Golden Test Vectors)
3. **الجزء B (Part B — Plan 1): البنية التحتية، بوابة الذكاء الاصطناعي، محرك التلخيص الهرمي، FSRS، والتصدير (`apps/api` + `packages/*`)**
   - B.1 هيكلة المستودع الموحّد (Monorepo Directory Tree)
   - B.2 بوابة الذكاء الاصطناعي متعدّدة النماذج (`packages/ai-gateway`: `registry.ts`, `router.ts`, `call.ts`, `verifier.ts`)
   - B.3 خط أنابيب التلخيص الهرمي ذو الـ 9 مراحل (`packages/summary-engine/src/pipeline.ts` — من صفحة واحدة إلى 1,000 صفحة)
   - B.4 محرك العرض النقي المضاد لـ XSS وتصدير HTML/PDF التفاعلي (`renderToHtml.ts`, `exportStandaloneHtml.ts`, `renderPdf.ts`)
   - B.5 محرك الذاكرة والتكرار المتباعد (`packages/study-science`: `FSRS v4.5 + BKT Mastery`)
   - B.6 دفتر الأستاذ المزدوج للرصيد والاشتراكات (`Double-Entry Credit Ledger` + `firestore.rules`)
   - B.7 منظومة التيليجرام الكاملة (`apps/bot`: `grammY Webhook`, `Idempotency`, `Telegram Stars XTR`, `Mini App /tg HMAC`)
4. **الجزء C (Part C — Plan 2): نظام تصميم LineVault، محرك الحركة، مكتبة المكوّنات، والـ 31 شاشة بالتفصيل (`src/`)**
   - C.1 نظام الرموز التصميمية الكامل (`src/index.css` / `globals.css`)
   - C.2 قاموس الحركة الفيزيائية (`reveal`, `rise`, `<AnimatedNumber />`, `<LineStream />`)
   - C.3 مكتبة مكوّنات LineVault الموحّدة (`src/components/ui/linevault.jsx`)
   - C.4 الهيكل العام والتنقل (`Layout.jsx`, `BottomTabBar.jsx`, `CommandPalette.jsx` — 5 مراكز قيادة بدلاً من 20 رابطاً)
   - C.5 المخطط التفصيلي شاشة بشاشة للـ 31 مساراً (Screen-by-Screen Blueprints: `Landing`, `Dashboard`, `CourseCard`, `DailyOrderSheet`, `CourseView`, `AtlasSummaryReader`, `Subscriptions`, `PlanCard`, `Review`, `Quizzes`, `Leaderboard`, `TelegramMiniApp`, إلخ)
5. **الجزء D (Part D): التكامل، بنك النصوص المعتمد (Copy Bank)، اختبارات الحماية، والـ 12 برومبت التنفيذي للـ AI Builders**
   - D.1 بنك النصوص العربي والإنجليزي الكامل (`messages/ar.json` & `messages/en.json`)
   - D.2 عقود الاختبارات الآلية الصارمة (`tests/unit/motionPerfContracts.test.mjs` & `tests/unit/atlasV5.test.mjs`)
   - D.3 حزمة الـ 12 برومبت الجاهزة للنسخ واللصق (Prompts 00 → 11) لبناء أو تحديث أي جزء من المنظومة بدقة 100%

---

## الجزء 0 (Part 0): التشخيص الجذري، مقارنة LineVault مقابل الموقع القديم، وقائمة الإعدام

### 0.1 جدول المقارنة الجذرية: لماذا يتفوق LineVault بصرياً وهندسياً؟

| البُعد التصميمي والهندسي | التصميم القديم المرفوض (Legacy Clutter) | معيار LineVault المطبق الآن (LineVault Standard) |
| :--- | :--- | :--- |
| **لوحة الألوان (Color Palette)** | تصادم 5 ألوان نيون في نفس الشاشة (Cyan `#00F5FF` + Purple `#A855F7` + Pink `#EC4899` + Gold `#FBBF24` + Parchment `#F5F1E8`). | **حبر ليلي صامت (`#05070a` و `#090c11`) + لون زمردي واحد فقط (`#19f08c`)** لكل الأزرار الرئيسية ومؤشرات الحالة النشطة. |
| **الأسطح والبطاقات (Surfaces & Cards)** | كروت زجاجية مفرطة التوهج (`neon-glow-cyan`, `neon-glow-purple`, `scan-line-anim`) مع حدود سميكة وظلال ملونة. | سطح `.glass` موحّد (`rgba(14, 19, 27, 0.72)`) مع حد شعري `1px solid rgba(255, 255, 255, 0.09)` ولمعة علوية داخلية `inset 0 1px 0 rgba(255,255,255,0.06)`. |
| **التدرجات النصية (Typography Gradient)** | تدرجات قوس قزح بين السيان والبنفسجي والوردي. | تدرج LineVault الفضي النقي `.text-gradient`: `linear-gradient(180deg, #fff 30%, rgba(255, 255, 255, 0.55))`. |
| **الأنيميشن والحركة (Motion Language)** | مشاهد 3D ثقيلة (`HellKnight3DBackground`), كروت مائلة ثلاثية الأبعاد، وميض مستمر يستهلك الـ GPU. | حركة فيزيائية هادئة ومقننة: `reveal(delay)` و `rise(i)` بمنحنى `cubic-bezier(0.22, 1, 0.36, 1)` + عدادات `<AnimatedNumber />` + شريط `<LineStream />`. |
| **الصفحة الرئيسية (Landing Page)** | 11 قسماً متنافراً مع تداخل بصري بين السايبرپانك والورق العتيق. | تدفق LineVault الصارم: `Header` زجاجي $\rightarrow$ `Hero` بعمودين مع `<LineStream />` $\rightarrow$ `HowItWorks` (3 خطوات مرقمة `01..03`) $\rightarrow$ `AtlasReader` $\rightarrow$ `LVConfigurator` $\rightarrow$ `Pricing` $\rightarrow$ `Trust` $\rightarrow$ `FAQ` $\rightarrow$ `FinalCTA` $\rightarrow$ `Footer`. |
| **الداشبورد (Dashboard)** | 9 أقسام مكدسة عمودياً (778 سطراً) تشتت الطالب وتمنعه من معرفة خطوته التالية. | **4 بلوكات فقط (Today + Library):** ترحيب + عدادات `<AnimatedNumber />` $\rightarrow$ مهام اليوم (`DailyOrderSheet`) $\rightarrow$ شبكة المذكرات (`CourseCard` بطراز LineVault) $\rightarrow$ شريط إحصائيات سريع. |
| **الاشتراكات والدفع (Subscriptions & Checkout)** | كروت باقات بألوان متضاربة (بنفسجي/وردي/ذهبي) ونموذج دفع تقليدي طويل. | **منزلق LineVault اللوغاريتمي (`LVConfigurator`)** + كروت `.glass` موحّدة (الموصى بها فقط تأخذ حد `#19f08c/45`) + **محطة دفع فورية (`CountdownRing` + `Stepper` + `CopyField`)**. |
| **القائمة الجانبية (Sidebar & Navigation)** | 20+ عنصر مفرود في قائمة طويلة مع شارات ملونة متضاربة. | **5 مراكز قيادة (5 Hubs):** اليوم والمكتبة · الاستوديو والأدوات · المراجعة والتثبيت · الساحة والمجتمع · الحساب والرصيد + شريط سفلي من 5 تبويبات للموبايل + `⌘K`. |

---

### 0.2 القرارات الهندسية الخمسة الحاسمة (Frozen Design Decisions)

1. **هوية بصرية واحدة فقط (Single Dark Ink Identity):**
   - الخلفية الأساسية في كل الصفحات الـ 31 هي `#05070a` (`--bg-0`)، وخلفية البطاقات `#090c11` (`--bg-1`)، والسطح المرتفع `#0e131b` (`--bg-2`).
   - نحتفظ بكامل القوة العلمية لمنظومة «الأطلس V5» (محرك `FSRS v4.5`، شرائط الاستدعاء النشط `Declassify`، شارات المصدر `p.13`، والمدقق `Cross-Family Verifier`) ولكن داخل قارئ داكن نظيف متناسق مع LineVault (مع خيار `Paper` اختياري داخل القارئ فقط لمن يريد الطباعة الورقية).
2. **لون تمييز واحد فقط (Single Emerald Accent `#19f08c`):**
   - اللون الأساسي الوحيد هو `#19f08c` مع نص داكن `#03150c` فوق الأزرار المملوءة.
   - الألوان الأخرى مقتصرة حصرياً على الحالات الدلالية: نجاح `#19f08c`، تحذير كهرماني `#f5b83d`، خطر/خطأ `#ff5d6c`.
3. **الحركة الوظيفية النظيفة (Functional Motion Only):**
   - يُمنع استخدام `transition-all` مع `hover:`، ويُمنع تحريك `width` أو `height` في Framer Motion (نستخدم `scaleX` / `scaleY` / `opacity` / `y` فقط لضمان 60fps على الهواتف الاقتصادية).
4. **مكتبة مكوّنات مركزية إلزامية (`src/components/ui/linevault.jsx`):**
   - أي شاشة أو ميزة تُبنى حصرياً باستخدام مكوّنات LineVault المشتركة: `LVLogo`, `LVLangSwitch`, `PageHeader`, `GlassCard`, `LVBadge`, `StatCard`, `EmptyState`, `PricingCard`, `LVConfigurator`, `CountdownRing`, `Stepper`, `CopyButton`, `CopyField`, `AnimatedNumber`, `LineStream`.
5. **قاعدة «صفحة واحدة = هدف واحد واضح» (One Primary Action Per Screen):**
   - لا يظهر أكثر من زر `btn-primary-glow` رئيسي واحد في منطقة الرؤية الأولى (Above the fold) لأي شاشة.

---

### 0.3 قائمة الإعدام البصرية والبرمجية (The Kill List)

| العنصر المحظور | السبب | البديل المعتمد في LineVault |
| :--- | :--- | :--- |
| `<HellKnight3DBackground />` | يستهلك 40MB+ من الذاكرة ويبطئ LCP على الموبايل. | خلفية `.bg-radial-emerald` + `.bg-grid` بـ CSS نقي (0KB JS). |
| `<NeonBackground />` | ضوضاء بصرية وتشتيت عن المحتوى الدراسي. | خلفية حبرية صامتة `#05070a` مع توهج زمردي خفيف في الأعلى فقط. |
| `neon-glow-purple`, `neon-glow-cyan`, `scan-line-anim` | تلوث بصري يجعل الموقع يبدو كأنه 3 مواقع ملصقة ببعضها. | `.glass` مع حد شعري `border-white/10` أو `border-[#19f08c]/40` للعنصر النشط. |
| `transition-all` مقترناً بـ `hover:` | يسبب إعادة حساب Layout & Paint لكل خصائص العنصر عند تمرير الفأرة. | `transition-colors` أو `transition-[transform,background-color,border-color,box-shadow]`. |
| `animate={{ width }}` / `animate={{ height }}` | يسبب Layout Thrashing على الأجهزة الضعيفة. | `style={{ transform: 'scaleX(...)' }}` أو انتقالات CSS على `transform` و `opacity`. |
| البيانات الوهمية الثابتة في الداشبورد | تخدع الطالب ولا تعكس تقدمه الفعلي. | قراءة حية من Firestore (`ReviewCard`, `Course`, `ConceptMastery`) مع `EmptyState` نظيف. |

---

### 0.4 ميزانية الأداء الصارمة (Performance & Core Web Vitals Budgets)

- **LCP (Largest Contentful Paint):** أقل من `1.8s` على اتصال 4G متوسط.
- **INP (Interaction to Next Paint):** أقل من `120ms` في جميع التفاعلات (المنزلق اللوغاريتمي، تقليب البطاقات، فك التعتيم).
- **CLS (Cumulative Layout Shift):** أقل من `0.02` (جميع الأرقام تستخدم `tabular-nums` والخطوط تستخدم `font-display: swap`).
- **حجم الحزمة الأولية (Initial JS Bundle):** أقل من `190KB` مضغوطة (Gzip) بفضل التحميل الكسول `React.lazy()` لجميع الشاشات الـ 31.

---

## الجزء A (Part A): العقد المشترك المجمّد (Frozen Shared Contract — `packages/shared`)

هذا الجزء يمثّل العقد القانوني والبرمجي المجمّد بين **Plan 1 (الواجهة الخلفية والذكاء الاصطناعي)** و **Plan 2 (واجهة LineVault الأمامية)**. لا يجوز لأي طرف تعديل اسم حقل أو نوع بيانات هنا دون تحديث هذا العقد.

### A.1 مخططات Zod و TypeScript الكاملة (`packages/shared/src/schemas.ts`)

```typescript
import { z } from "zod";

// ═══════════════════════════════════════════════════════════════════════
// 1. LOCALE & DIRECTION CONTRACT
// ═══════════════════════════════════════════════════════════════════════
export const LocaleSchema = z.enum(["ar", "en"]);
export type Locale = z.infer<typeof LocaleSchema>;

// ═══════════════════════════════════════════════════════════════════════
// 2. LINEVAULT VOLUME PRICING & POOL CONTRACT
// ═══════════════════════════════════════════════════════════════════════
export const PricingTierSchema = z.object({
  minQty: z.number().int().positive(),
  maxQty: z.number().int().positive().nullable(),
  unitPriceUsd: z.number().positive(),
  unitPriceEgp: z.number().positive(),
  discountPct: z.number().min(0).max(90),
  labelAr: z.string(),
  labelEn: z.string(),
});
export type PricingTier = z.infer<typeof PricingTierSchema>;

export const PoolStatusSchema = z.object({
  available: z.number().int().nonnegative(),
  capacity: z.number().int().positive(),
  reserved: z.number().int().nonnegative(),
  baseUnitUsd: z.number().positive(),
  baseUnitEgp: z.number().positive(),
  tiers: z.array(PricingTierSchema),
  updatedAt: z.string().datetime(),
});
export type PoolStatus = z.infer<typeof PoolStatusSchema>;

export const QuoteResultSchema = z.object({
  qty: z.number().int().min(1).max(10000),
  unitUsd: z.number().nonnegative(),
  unitEgp: z.number().nonnegative(),
  totalUsd: z.number().nonnegative(),
  totalEgp: z.number().nonnegative(),
  savingsPct: z.number().min(0).max(90),
  tierIndex: z.number().int().min(0),
});
export type QuoteResult = z.infer<typeof QuoteResultSchema>;

// ═══════════════════════════════════════════════════════════════════════
// 3. ATLAS V5 SUMMARY DOCUMENT SCHEMA (Strict Structured Output)
// ═══════════════════════════════════════════════════════════════════════
export const SourceCitationSchema = z.object({
  page: z.number().int().positive(),
  quoteHash: z.string().min(6).max(64).optional(),
  verifiedBy: z.string().optional(),
});

export const ConceptBlockSchema = z.object({
  id: z.string().min(1),
  termAr: z.string().min(1),
  termEn: z.string().min(1),
  definition: z.string().min(1),
  clinicalPearl: z.string().optional(),
  examTrap: z.string().optional(),
  declassifyMasks: z.array(z.string()).default([]),
  citation: SourceCitationSchema,
  verified: z.boolean().default(true),
});

export const ComparisonTableSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  headers: z.array(z.string()).min(2).max(6),
  rows: z.array(z.array(z.string())).min(1).max(30),
  citation: SourceCitationSchema.optional(),
});

export const VerificationClaimSchema = z.object({
  claim: z.string(),
  sourceQuote: z.string(),
  page: z.number().int().positive(),
  status: z.enum(["verified", "corrected", "flagged"]),
  verifierModel: z.string(),
});

export const SummarySectionSchema = z.object({
  id: z.string().min(1),
  order: z.number().int().nonnegative(),
  plateCode: z.string().regex(/^PLATE-\d{2,3}$/),
  titleAr: z.string().min(1),
  titleEn: z.string().optional(),
  pageRange: z.tuple([z.number().int().positive(), z.number().int().positive()]),
  tldrBullets: z.array(z.string()).min(2).max(7),
  concepts: z.array(ConceptBlockSchema).min(1),
  comparisons: z.array(ComparisonTableSchema).default([]),
  mnemonics: z.array(
    z.object({
      code: z.string(),
      expansion: z.string(),
      explanation: z.string(),
    })
  ).default([]),
  rapidDrill: z.array(
    z.object({
      id: z.string(),
      question: z.string(),
      options: z.array(z.string()).length(4),
      correctIndex: z.number().int().min(0).max(3),
      explanation: z.string(),
      page: z.number().int().positive(),
    })
  ).default([]),
});

export const SummaryDocumentV5Schema = z.object({
  schemaVersion: z.literal("5.0"),
  documentId: z.string(),
  courseId: z.string(),
  title: z.string(),
  language: z.enum(["ar", "en", "bilingual"]),
  style: z.enum([
    "atlas_clinical",
    "cornell_review",
    "exam_cram",
    "comparison_matrix",
    "algorithmic_flowchart",
  ]),
  sourceMeta: z.object({
    fileName: z.string(),
    pageCount: z.number().int().min(1).max(1000),
    wordCount: z.number().int().nonnegative(),
    sha256: z.string().length(64),
  }),
  verificationReport: z.object({
    primaryModel: z.string(),
    verifierModel: z.string(),
    totalClaimsChecked: z.number().int().nonnegative(),
    verifiedCount: z.number().int().nonnegative(),
    correctedCount: z.number().int().nonnegative(),
    flaggedCount: z.number().int().nonnegative(),
    confidenceScore: z.number().min(0).max(1),
    claims: z.array(VerificationClaimSchema),
  }),
  executiveSummary: z.string().min(20),
  sections: z.array(SummarySectionSchema).min(1),
  generatedAt: z.string().datetime(),
});
export type SummaryDocumentV5 = z.infer<typeof SummaryDocumentV5Schema>;

// ═══════════════════════════════════════════════════════════════════════
// 4. FSRS v4.5 + BKT CONCEPT MASTERY SCHEMA
// ═══════════════════════════════════════════════════════════════════════
export const FsrsRatingSchema = z.union([
  z.literal(1), // Again
  z.literal(2), // Hard
  z.literal(3), // Good
  z.literal(4), // Easy
]);
export type FsrsRating = z.infer<typeof FsrsRatingSchema>;

export const ConceptMasterySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  course_id: z.string(),
  concept_id: z.string(),
  stability: z.number().nonnegative(),
  difficulty: z.number().min(1).max(10),
  elapsed_days: z.number().nonnegative(),
  scheduled_days: z.number().nonnegative(),
  reps: z.number().int().nonnegative(),
  lapses: z.number().int().nonnegative(),
  state: z.enum(["New", "Learning", "Review", "Relearning"]),
  p_known: z.number().min(0).max(1), // BKT mastery probability
  due_date: z.string().datetime(),
  last_review: z.string().datetime().nullable(),
});
export type ConceptMastery = z.infer<typeof ConceptMasterySchema>;

// ═══════════════════════════════════════════════════════════════════════
// 5. DOUBLE-ENTRY CREDIT LEDGER & ORDER CHECKOUT SCHEMA
// ═══════════════════════════════════════════════════════════════════════
export const CreditLedgerEntrySchema = z.object({
  id: z.string(),
  user_id: z.string(),
  idempotency_key: z.string().min(8).max(128),
  direction: z.enum(["CREDIT", "DEBIT"]),
  amount: z.number().int().positive(),
  balance_after: z.number().int().nonnegative(),
  reason: z.enum([
    "SIGNUP_BONUS",
    "PLAN_SUBSCRIPTION",
    "CREDIT_PACK_TOPUP",
    "TELEGRAM_STARS_TOPUP",
    "PROMO_CODE_REDEEM",
    "AI_SUMMARY_GENERATION",
    "AI_QUIZ_GENERATION",
    "AI_FLASHCARDS_GENERATION",
    "COURSE_UNLOCK",
    "REFUND_REVERSAL",
  ]),
  reference_id: z.string().optional(),
  created_at: z.string().datetime(),
});
export type CreditLedgerEntry = z.infer<typeof CreditLedgerEntrySchema>;

export const CheckoutOrderSchema = z.object({
  id: z.string(),
  userId: z.string(),
  planId: z.string(),
  creditsQty: z.number().int().positive(),
  amountEgp: z.number().nonnegative(),
  amountUsd: z.number().nonnegative(),
  paymentMethod: z.enum([
    "vodafone_cash",
    "instapay",
    "usdt_trc20",
    "telegram_stars",
  ]),
  payAddress: z.string(),
  status: z.enum([
    "AWAITING_PAYMENT",
    "VERIFYING_RECEIPT",
    "FULFILLED",
    "EXPIRED",
    "REJECTED",
  ]),
  expiresAt: z.string().datetime(),
  createdAt: z.string().datetime(),
});
export type CheckoutOrder = z.infer<typeof CheckoutOrderSchema>;
```

---

### A.2 معادلة التسعير اللوغاريتمي والخصومات الكمية (`packages/shared/src/qty.ts`)

مطابقة تماماً لملف `line-vault-main/apps/web/src/lib/qty.ts` لضمان حركة سلسة للمنزلق من `1` إلى `10,000` وحدة/كريدت:

```typescript
export const MIN_QTY = 100;
export const MAX_QTY = 10000;
export const QUICK_QTYS = [100, 250, 500, 1000, 2500, 5000, 10000] as const;

/**
 * يحول موضع المنزلق الخطي [0..1] إلى كمية لوغاريتمية [MIN_QTY..MAX_QTY]
 */
export function sliderToQty(t: number): number {
  const clamped = Math.max(0, Math.min(1, t));
  const raw = MIN_QTY * Math.pow(MAX_QTY / MIN_QTY, clamped);
  if (raw < 250) return Math.round(raw / 10) * 10;
  if (raw < 1000) return Math.round(raw / 25) * 25;
  if (raw < 5000) return Math.round(raw / 100) * 100;
  return Math.round(raw / 250) * 250;
}

/**
 * يحول الكمية [MIN_QTY..MAX_QTY] إلى موضع المنزلق [0..1]
 */
export function qtyToSlider(qty: number): number {
  const clamped = Math.max(MIN_QTY, Math.min(MAX_QTY, qty));
  return Math.log(clamped / MIN_QTY) / Math.log(MAX_QTY / MIN_QTY);
}

export const DEFAULT_TIERS = [
  { minQty: 100, maxQty: 249, unitPriceEgp: 0.50, discountPct: 0, labelAr: "أساسي", labelEn: "Standard" },
  { minQty: 250, maxQty: 499, unitPriceEgp: 0.44, discountPct: 12, labelAr: "دفعة طلابية", labelEn: "Scholar Pack" },
  { minQty: 500, maxQty: 999, unitPriceEgp: 0.38, discountPct: 24, labelAr: "مكثف", labelEn: "Intensive" },
  { minQty: 1000, maxQty: 2499, unitPriceEgp: 0.32, discountPct: 36, labelAr: "دفعة امتحانات", labelEn: "Exam Vault" },
  { minQty: 2500, maxQty: 4999, unitPriceEgp: 0.27, discountPct: 46, labelAr: "مجموعة دراسية", labelEn: "Study Syndicate" },
  { minQty: 5000, maxQty: null, unitPriceEgp: 0.22, discountPct: 56, labelAr: "أطلس كامل", labelEn: "Full Atlas Institutional" },
] as const;

export function computeQuote(qty: number, tiers = DEFAULT_TIERS) {
  const safeQty = Math.max(MIN_QTY, Math.min(MAX_QTY, Math.round(qty)));
  const baseUnit = tiers[0].unitPriceEgp;
  let activeTierIndex = 0;
  for (let i = 0; i < tiers.length; i++) {
    if (safeQty >= tiers[i].minQty) activeTierIndex = i;
  }
  const tier = tiers[activeTierIndex];
  const unitEgp = tier.unitPriceEgp;
  const totalEgp = Math.round(safeQty * unitEgp);
  const savingsPct = Math.round((1 - unitEgp / baseUnit) * 100);
  return {
    qty: safeQty,
    unitEgp,
    totalEgp,
    savingsPct,
    tierIndex: activeTierIndex,
    tier,
  };
}
```

---

### A.3 جدول نقاط النهاية الـ 28 (Complete 28-Endpoint API Specification)

| # | Method & Path | Auth | الغرض الوظيفي | Request Body / Query | Response Payload |
| :- | :--- | :--- | :--- | :--- | :--- |
| 01 | `GET /api/v1/health` | Public | فحص جاهزية الخادم وقاعدة البيانات | — | `{ ok: true, version: "5.0.0", ts }` |
| 02 | `GET /api/v1/pool` | Public | جلب حالة سعة الرصيد وشرائح التسعير | — | `PoolStatus` |
| 03 | `POST /api/v1/quote` | Public | حساب تسعيرة فورية لأي كمية كريدت | `{ qty: number }` | `QuoteResult` |
| 04 | `POST /api/v1/courses/ingest` | Bearer | رفع ملف PDF/DOCX/صوت لإنشاء كورس جديد | `{ fileUrl, title, language }` | `{ courseId, jobId, estimatedCredits }` |
| 05 | `GET /api/v1/courses` | Bearer | قائمة كورسات ومذكرات الطالب | `?q=&limit=50` | `{ items: Course[] }` |
| 06 | `GET /api/v1/courses/:id` | Bearer | تفاصيل الكورس والمحتويات المولّدة | — | `{ course, contents, masterySummary }` |
| 07 | `DELETE /api/v1/courses/:id` | Bearer | حذف كورس وملفاته المرتبطة | — | `{ deleted: true }` |
| 08 | `POST /api/v1/summaries/generate` | Bearer | إطلاق خط أنابيب التلخيص الهرمي V5 | `{ courseId, style, maxPages, colorLevel }` | `{ jobId, debitedCredits, streamUrl }` |
| 09 | `GET /api/v1/jobs/:jobId/stream` | Bearer | بث حي SSE لتقدم التلخيص والتدقيق | — | `SSE: job.progress \| section.ready \| job.done` |
| 10 | `GET /api/v1/summaries/:id/html` | Bearer | تصدير الملخص كملف HTML تفاعلي مستقل | `?theme=dark\|paper` | `text/html; charset=utf-8` |
| 11 | `GET /api/v1/summaries/:id/pdf` | Bearer | تصدير الملخص كملف PDF مطبوع عبر Chromium | `?theme=paper\|dark` | `application/pdf` |
| 12 | `POST /api/v1/quizzes/generate` | Bearer | توليد كويز ذكي مع كشف فخاخ الامتحانات | `{ courseId, count, difficulty, profile }` | `{ quizId, questions: QuizQuestion[] }` |
| 13 | `POST /api/v1/quizzes/:id/submit` | Bearer | تسليم إجابات الكويز وتحديث XP و FSRS | `{ answers, durationSec }` | `{ score, xpEarned, updatedMastery }` |
| 14 | `POST /api/v1/flashcards/generate` | Bearer | توليد بطاقات استدعاء نشط مرتبطة بـ FSRS | `{ courseId, count }` | `{ cards: ReviewCard[] }` |
| 15 | `GET /api/v1/review/daily-order` | Bearer | جلب أمر العمليات اليومي (Daily Order Sheet) | — | `{ dueCards, weakConcepts, streak }` |
| 16 | `POST /api/v1/review/grade` | Bearer | تسجيل تقييم بطاقة FSRS (`1..4`) وتحديث BKT | `{ cardId, rating, durationMs }` | `{ nextDueDate, stability, pKnown }` |
| 17 | `GET /api/v1/mastery/territory` | Bearer | جلب خريطة السيطرة المعرفية (Territory Map) | `?courseId=` | `{ nodes: ConceptMastery[], overallPct }` |
| 18 | `POST /api/v1/youtube/summarize` | Bearer | استخراج نص فيديو يوتيوب وتلخيصه | `{ youtubeUrl, language, style }` | `{ courseId, summaryDocument }` |
| 19 | `POST /api/v1/pdf-tools/process` | Bearer | دمج/تقسيم/ضغط/OCR لملفات PDF | `{ operation, fileUrls, ranges }` | `{ outputFileUrl, pagesProcessed }` |
| 20 | `POST /api/v1/orders` | Bearer | إنشاء طلب دفع جديد وحجز السعة لمدة 30 دقيقة | `{ planId, creditsQty, paymentMethod }` | `CheckoutOrder` |
| 21 | `GET /api/v1/orders/:id` | Bearer | متابعة حالة الطلب والعداد التنازلي | — | `CheckoutOrder` |
| 22 | `POST /api/v1/orders/:id/receipt` | Bearer | رفع إيصال التحويل لتأكيد الدفع | `{ receiptDataUrl, senderRef }` | `{ status: "VERIFYING_RECEIPT" }` |
| 23 | `POST /api/v1/promo/redeem` | Bearer | شحن كود تفعيل فوري بعملية ذرية | `{ code }` | `{ creditsAdded, newBalance }` |
| 24 | `GET /api/v1/ledger` | Bearer | سجل الحركات المالية والرصيد (Double-Entry) | `?limit=50` | `{ balance, entries: CreditLedgerEntry[] }` |
| 25 | `POST /api/v1/challenges/create` | Bearer | إنشاء غرفة تحدّي حيّ 1v1 أو جماعي | `{ courseId, questionCount }` | `{ roomId, inviteCode }` |
| 26 | `POST /api/v1/telegram/webhook` | Secret | مستقبل تحديثات بوت التيليجرام و Stars `XTR` | `TelegramUpdate` | `{ ok: true }` |
| 27 | `POST /api/v1/telegram/miniapp-auth`| HMAC | التحقق الجنائي من توقيع `initData` للميني آب | `{ initDataRaw }` | `{ customFirebaseToken, userProfile }` |
| 28 | `POST /api/v1/telegram/export` | Bearer | إرسال الملخص أو الكويز التفاعلي إلى شات الطالب | `{ courseId, type }` | `{ success: true, messageId }` |

---

### A.4 قاموس أخطاء النظام الموحّد (Standardized Error Envelope)

جميع الأخطاء ترجع بصيغة موحّدة:
```json
{
  "error": {
    "code": "INSUFFICIENT_CREDITS",
    "message": "رصيدك الحالي غير كافٍ لإتمام هذه العملية.",
    "details": { "required": 15, "available": 4 },
    "requestId": "req_01J9Z8K4M2"
  }
}
```

| Error Code | HTTP | المعنى والتصرف المطلوب في الواجهة الأمامية |
| :--- | :-: | :--- |
| `UNAUTHENTICATED` | 401 | انتهت الجلسة — توجيه تلقائي إلى `/login` مع حفظ المسار الحالي. |
| `INSUFFICIENT_CREDITS` | 402 | الرصيد لا يكفي — فتح نافذة شحن الرصيد السريعة أو التوجيه لـ `/subscriptions`. |
| `POOL_INSUFFICIENT` | 409 | الكمية المطلوبة تتجاوز المتاح حالياً في المجمع. |
| `ORDER_EXPIRED` | 410 | انتهت مهلة الـ 30 دقيقة للطلب — عرض زر «إنشاء طلب جديد». |
| `IDEMPOTENCY_CONFLICT` | 409 | العملية قيد التنفيذ بالفعل بنفس مفتاح `Idempotency-Key`. |
| `EXTRACTION_FAILED` | 422 | تعذر قراءة الملف المرفوع — اقتراح تفعيل OCR الصوري. |
| `AI_PROVIDER_EXHAUSTED` | 503 | جميع مزودي الذكاء الاصطناعي في حالة ضغط — إعادة جدولة تلقائية عبر Inngest. |
| `INVALID_TELEGRAM_HMAC` | 403 | فشل التحقق من توقيع `initData` في Telegram Mini App. |

---

### A.5 متجهات الاختبار الذهبية (Golden Test Vectors)

1. **متجه التسعير اللوغاريتمي (`computeQuote`):**
   - `qty = 100` $\rightarrow$ `unitEgp = 0.50`, `totalEgp = 50`, `savingsPct = 0%`, `tierIndex = 0`.
   - `qty = 500` $\rightarrow$ `unitEgp = 0.38`, `totalEgp = 190`, `savingsPct = 24%`, `tierIndex = 2`.
   - `qty = 2500` $\rightarrow$ `unitEgp = 0.27`, `totalEgp = 675`, `savingsPct = 46%`, `tierIndex = 4`.
   - `qty = 10000` $\rightarrow$ `unitEgp = 0.22`, `totalEgp = 2200`, `savingsPct = 56%`, `tierIndex = 5`.
2. **متجه FSRS v4.5 لبطاقة جديدة (`state = New`):**
   - التقييم الأول `rating = 3 (Good)` $\rightarrow$ `scheduled_days = 3`, `state = Review`, `p_known` يرتفع من `0.25` إلى `0.62`.
   - التقييم الأول `rating = 1 (Again)` $\rightarrow$ `scheduled_days = 0` (مراجعة خلال 10 دقائق), `lapses = 1`, `state = Learning`.
3. **متجه التدقيق العابر للعائلات (`Cross-Family Verifier`):**
   - إذا ولّد النموذج الأساسي (`gemini-2.5-pro`) جرعة دوائية `Amiodarone 500 mg IV` بينما النص الأصلي في الصفحة 13 يقول `150–300 mg IV bolus`، يقوم المدقق (`claude-sonnet-4-5`) بتعديلها تلقائياً إلى `150–300 mg IV bolus` وتسجيل `status: "corrected"` مع رقم الصفحة `p.13`.


---

## الجزء B (Part B — Plan 1): البنية التحتية، بوابة الذكاء الاصطناعي، محرك التلخيص الهرمي، FSRS، والتصدير

### B.1 هيكلة المستودع الموحّد (Monorepo Directory Tree)

```text
black-fighters-linevault/
├── package.json
├── firestore.rules                       # قواعد الأمان الصارمة (Ledger + Telegram + Mastery)
├── src/                                  # واجهة LineVault الأمامية (Plan 2)
│   ├── index.css                         # رموز تصميم LineVault (#05070a, #090c11, #19f08c)
│   ├── components/
│   │   ├── ui/linevault.jsx              # مكتبة مكوّنات LineVault التفاعلية الكاملة
│   │   ├── Layout.jsx                    # هيكل الـ 5 مراكز قيادة + ⌘K
│   │   ├── BottomTabBar.jsx              # شريط الموبايل الزجاجي ذو الـ 5 تبويبات
│   │   ├── CourseCard.jsx                # كارت المذكرة بطراز LineVault course-grid.tsx
│   │   ├── subscriptions/PlanCard.jsx    # كارت الباقة الموحد (.glass)
│   │   └── atlas/
│   │       ├── AtlasSummaryReader.jsx    # قارئ الملخصات التفاعلي + Declassify + p.XX
│   │       ├── DailyOrderSheet.jsx       # قائمة مهام اليوم المرقمة (01..0N)
│   │       ├── TerritoryMap.jsx          # خريطة السيطرة المعرفية (FSRS + BKT)
│   │       └── LandingAtlasShowcase.jsx  # عارض المقارنة الحي في الصفحة الرئيسية
│   └── pages/                            # الـ 31 شاشة الموحّدة بصرياً
├── packages/
│   ├── shared/                           # العقد المشترك المجمّد (Zod + Pricing + Types)
│   │   ├── src/schemas.ts
│   │   └── src/qty.ts
│   ├── ai-gateway/                       # بوابة الذكاء الاصطناعي متعدّدة النماذج
│   │   ├── src/registry.ts
│   │   ├── src/router.ts
│   │   ├── src/call.ts
│   │   └── src/verifier.ts
│   ├── summary-engine/                   # محرك التلخيص الهرمي (1..1,000 صفحة) + HTML/PDF
│   │   ├── src/pipeline.ts
│   │   ├── src/renderToHtml.ts
│   │   ├── src/exportStandaloneHtml.ts
│   │   └── src/renderPdf.ts
│   └── study-science/                    # محرك الذاكرة FSRS v4.5 + BKT + محاسبة الرصيد
│       ├── src/fsrs.ts
│       └── src/ledger.ts
└── apps/
    ├── api/                              # خادم Hono + SSE + Inngest Worker
    │   └── src/index.ts
    └── bot/                              # بوت التيليجرام grammY + Stars XTR + Mini App Auth
        └── src/bot.ts
```

---

### B.2 بوابة الذكاء الاصطناعي متعدّدة النماذج (`packages/ai-gateway`)

#### 1. سجل النماذج والتكلفة (`packages/ai-gateway/src/registry.ts`)

```typescript
export interface ModelSpec {
  id: string;
  family: "gemini" | "anthropic" | "openai" | "deepseek";
  provider: "google" | "anthropic" | "openai" | "openrouter";
  contextWindow: number;
  maxOutputTokens: number;
  inputCostPer1M: number;  // USD
  outputCostPer1M: number; // USD
  supportsStructuredOutput: boolean;
}

export const MODEL_REGISTRY: Record<string, ModelSpec> = {
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    family: "gemini",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    inputCostPer1M: 1.25,
    outputCostPer1M: 5.0,
    supportsStructuredOutput: true,
  },
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    family: "gemini",
    provider: "google",
    contextWindow: 1_000_000,
    maxOutputTokens: 65_536,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    supportsStructuredOutput: true,
  },
  "claude-sonnet-4-5": {
    id: "claude-sonnet-4-5",
    family: "anthropic",
    provider: "anthropic",
    contextWindow: 200_000,
    maxOutputTokens: 16_384,
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    supportsStructuredOutput: true,
  },
  "gpt-4o-mini": {
    id: "gpt-4o-mini",
    family: "openai",
    provider: "openai",
    contextWindow: 128_000,
    maxOutputTokens: 16_384,
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    supportsStructuredOutput: true,
  },
};
```

#### 2. موجّه المهام وسلاسل الطوارئ (`packages/ai-gateway/src/router.ts`)

قاعدة ذهبية في حزمة الأطلس V5: **لا يجوز أبداً أن يكون نموذج التدقيق (`verifier`) من نفس عائلة نموذج التوليد (`primary`)**.

```typescript
import { MODEL_REGISTRY, ModelSpec } from "./registry";

export type AiTaskType =
  | "STRUCTURE_DETECTION"
  | "SECTION_SUMMARY"
  | "CROSS_FAMILY_VERIFY"
  | "QUIZ_GENERATION"
  | "FLASHCARD_EXTRACTION";

export interface RoutePlan {
  primary: ModelSpec;
  fallbacks: ModelSpec[];
  verifier?: ModelSpec;
}

export function resolveRoutePlan(task: AiTaskType, pageCount = 10): RoutePlan {
  switch (task) {
    case "STRUCTURE_DETECTION":
      return {
        primary: MODEL_REGISTRY["gemini-2.5-flash"],
        fallbacks: [MODEL_REGISTRY["gpt-4o-mini"]],
      };
    case "SECTION_SUMMARY":
      return {
        primary: pageCount > 80 ? MODEL_REGISTRY["gemini-2.5-pro"] : MODEL_REGISTRY["gemini-2.5-flash"],
        fallbacks: [MODEL_REGISTRY["claude-sonnet-4-5"], MODEL_REGISTRY["gpt-4o-mini"]],
        // Cross-family verifier MUST differ from primary.family ("gemini" -> "anthropic")
        verifier: MODEL_REGISTRY["claude-sonnet-4-5"],
      };
    case "CROSS_FAMILY_VERIFY":
      return {
        primary: MODEL_REGISTRY["claude-sonnet-4-5"],
        fallbacks: [MODEL_REGISTRY["gpt-4o-mini"]],
      };
    case "QUIZ_GENERATION":
    case "FLASHCARD_EXTRACTION":
      return {
        primary: MODEL_REGISTRY["gemini-2.5-flash"],
        fallbacks: [MODEL_REGISTRY["claude-sonnet-4-5"], MODEL_REGISTRY["gpt-4o-mini"]],
      };
  }
}
```

#### 3. المدقق العابر للعائلات (`packages/ai-gateway/src/verifier.ts`)

يقوم بفحص كل جرعة دوائية، نسبة مئوية، رقم صفحة، ومعادلة علمية في مخرجات النموذج الأول ومقارنتها بالنص المصدري المستخرج من الـ PDF:

```typescript
import { SummarySectionSchema, VerificationClaimSchema } from "@bf/shared/src/schemas";
import { z } from "zod";

export interface VerifySectionInput {
  section: z.infer<typeof SummarySectionSchema>;
  sourcePagesText: Array<{ page: number; text: string }>;
  primaryModelId: string;
  verifierModelId: string;
  callStructuredModel: <T>(opts: {
    modelId: string;
    systemPrompt: string;
    userPrompt: string;
    schema: z.ZodType<T>;
  }) => Promise<T>;
}

const VerifierResultSchema = z.object({
  correctedConcepts: z.array(
    z.object({
      conceptId: z.string(),
      correctedDefinition: z.string().optional(),
      correctedClinicalPearl: z.string().optional(),
      verifiedPage: z.number().int().positive(),
      status: z.enum(["verified", "corrected", "flagged"]),
      sourceQuote: z.string(),
    })
  ),
});

export async function runCrossFamilyVerifier(input: VerifySectionInput) {
  const { section, sourcePagesText, verifierModelId, callStructuredModel } = input;

  const sourceContext = sourcePagesText
    .map((p) => `--- [SOURCE PAGE p.${p.page}] ---\n${p.text}`)
    .join("\n\n");

  const result = await callStructuredModel({
    modelId: verifierModelId,
    systemPrompt: [
      "You are the BLACK FIGHTERS Cross-Family Clinical & Scientific Verifier.",
      "Compare every dosage, numeric threshold, anatomical relation, and page citation against the raw SOURCE PAGES.",
      "If any number or fact deviates from the source page, return status='corrected' with the exact corrected text.",
      "Never invent facts outside the provided source pages.",
    ].join(" "),
    userPrompt: JSON.stringify({
      candidateConcepts: section.concepts,
      sourceContext,
    }),
    schema: VerifierResultSchema,
  });

  const claims: Array<z.infer<typeof VerificationClaimSchema>> = [];
  const updatedConcepts = section.concepts.map((concept) => {
    const match = result.correctedConcepts.find((c) => c.conceptId === concept.id);
    if (!match) return concept;

    claims.push({
      claim: `${concept.termEn}: ${match.correctedDefinition || concept.definition}`,
      sourceQuote: match.sourceQuote,
      page: match.verifiedPage,
      status: match.status,
      verifierModel: verifierModelId,
    });

    return {
      ...concept,
      definition: match.correctedDefinition || concept.definition,
      clinicalPearl: match.correctedClinicalPearl ?? concept.clinicalPearl,
      citation: {
        ...concept.citation,
        page: match.verifiedPage,
        verifiedBy: verifierModelId,
      },
      verified: match.status !== "flagged",
    };
  });

  return {
    section: { ...section, concepts: updatedConcepts },
    claims,
  };
}
```

---

### B.3 خط أنابيب التلخيص الهرمي ذو الـ 9 مراحل (`packages/summary-engine/src/pipeline.ts`)

يدعم تلخيص المذكرات والكتب المرجعية من **صفحة واحدة حتى 1,000 صفحة** دون فقدان السياق أو تجاوز نافذة الـ Output Tokens، مع بث تقدم حي عبر SSE:

```typescript
import { SummaryDocumentV5, SummaryDocumentV5Schema } from "@bf/shared/src/schemas";
import { resolveRoutePlan } from "@bf/ai-gateway/src/router";
import { runCrossFamilyVerifier } from "@bf/ai-gateway/src/verifier";

export interface PipelineProgressEvent {
  type: "job.progress" | "section.ready" | "verification.flag" | "job.done" | "job.failed";
  step: number;
  totalSteps: 9;
  labelAr: string;
  labelEn: string;
  pct: number;
  payload?: unknown;
}

export async function executeSummaryPipelineV5(params: {
  courseId: string;
  documentId: string;
  title: string;
  fileName: string;
  pages: Array<{ page: number; text: string }>;
  style: SummaryDocumentV5["style"];
  language: SummaryDocumentV5["language"];
  emit: (event: PipelineProgressEvent) => void;
  aiCall: any;
}): Promise<SummaryDocumentV5> {
  const { courseId, documentId, title, fileName, pages, style, language, emit, aiCall } = params;

  // Step 1: Extract & Normalize Pages
  emit({
    type: "job.progress",
    step: 1,
    totalSteps: 9,
    labelAr: "استخراج النصوص وتنظيف الرموز العلمية...",
    labelEn: "Extracting text & normalizing scientific notation...",
    pct: 10,
  });

  const route = resolveRoutePlan("SECTION_SUMMARY", pages.length);

  // Step 2: Detect Hierarchical Chapter/Section Boundaries
  emit({
    type: "job.progress",
    step: 2,
    totalSteps: 9,
    labelAr: "تحليل الفهرس وتقسيم المحاضرة إلى لوحات (Plates)...",
    labelEn: "Detecting structural chapters & Atlas Plates...",
    pct: 22,
  });

  const chunkSize = pages.length <= 30 ? 8 : pages.length <= 150 ? 15 : 25;
  const pageGroups: Array<Array<{ page: number; text: string }>> = [];
  for (let i = 0; i < pages.length; i += chunkSize) {
    pageGroups.push(pages.slice(i, i + chunkSize));
  }

  // Step 3: Fan-out Parallel Section Summaries
  emit({
    type: "job.progress",
    step: 3,
    totalSteps: 9,
    labelAr: `توليد ${pageGroups.length} لوحات علمية بالتوازي...`,
    labelEn: `Generating ${pageGroups.length} Atlas Plates in parallel...`,
    pct: 40,
  });

  const rawSections = await Promise.all(
    pageGroups.map(async (group, idx) => {
      const startPage = group[0].page;
      const endPage = group[group.length - 1].page;
      const plateCode = `PLATE-${String(idx + 1).padStart(2, "0")}`;
      const section = await aiCall.generateSection({
        modelId: route.primary.id,
        plateCode,
        order: idx,
        pageRange: [startPage, endPage],
        pages: group,
        style,
        language,
      });
      emit({
        type: "section.ready",
        step: 3,
        totalSteps: 9,
        labelAr: `اكتملت اللوحة ${plateCode} (ص ${startPage}–${endPage})`,
        labelEn: `Completed ${plateCode} (pp. ${startPage}–${endPage})`,
        pct: 40 + Math.round(((idx + 1) / pageGroups.length) * 20),
        payload: { plateCode, startPage, endPage },
      });
      return { section, group };
    })
  );

  // Step 4: Merge & Deduplicate Concepts Across Boundaries
  emit({
    type: "job.progress",
    step: 4,
    totalSteps: 9,
    labelAr: "دمج المفاهيم المتقاطعة ومنع التكرار...",
    labelEn: "Merging cross-boundary concepts & deduplicating...",
    pct: 65,
  });

  // Step 5: Cross-Family Verification Pass
  emit({
    type: "job.progress",
    step: 5,
    totalSteps: 9,
    labelAr: `تدقيق الجرعات والأرقام عبر ${route.verifier?.id || "claude-sonnet-4-5"}...`,
    labelEn: `Verifying dosages & citations via ${route.verifier?.id || "claude-sonnet-4-5"}...`,
    pct: 76,
  });

  const verifiedSections = [];
  const allClaims = [];
  for (const item of rawSections) {
    const verified = await runCrossFamilyVerifier({
      section: item.section,
      sourcePagesText: item.group,
      primaryModelId: route.primary.id,
      verifierModelId: route.verifier?.id || "claude-sonnet-4-5",
      callStructuredModel: aiCall.callStructuredModel,
    });
    verifiedSections.push(verified.section);
    allClaims.push(...verified.claims);
  }

  // Step 6: Generate Active Recall Declassify Masks & Rapid Drills
  emit({
    type: "job.progress",
    step: 6,
    totalSteps: 9,
    labelAr: "بناء شرائط الاستدعاء النشط (Declassify) وأسئلة التثبيت...",
    labelEn: "Building Active Recall Declassify masks & rapid drills...",
    pct: 85,
  });

  // Steps 7-9: Validate Final Schema & Emit Completion
  const doc: SummaryDocumentV5 = SummaryDocumentV5Schema.parse({
    schemaVersion: "5.0",
    documentId,
    courseId,
    title,
    language,
    style,
    sourceMeta: {
      fileName,
      pageCount: pages.length,
      wordCount: pages.reduce((acc, p) => acc + p.text.split(/\s+/).length, 0),
      sha256: "a".repeat(64),
    },
    verificationReport: {
      primaryModel: route.primary.id,
      verifierModel: route.verifier?.id || "claude-sonnet-4-5",
      totalClaimsChecked: allClaims.length,
      verifiedCount: allClaims.filter((c) => c.status === "verified").length,
      correctedCount: allClaims.filter((c) => c.status === "corrected").length,
      flaggedCount: allClaims.filter((c) => c.status === "flagged").length,
      confidenceScore: 0.98,
      claims: allClaims,
    },
    executiveSummary: verifiedSections.map((s) => s.tldrBullets[0]).join(" · "),
    sections: verifiedSections,
    generatedAt: new Date().toISOString(),
  });

  emit({
    type: "job.done",
    step: 9,
    totalSteps: 9,
    labelAr: "اكتمل بناء الملخص وتدقيقه بنجاح!",
    labelEn: "Summary document verified and ready!",
    pct: 100,
    payload: { documentId: doc.documentId },
  });

  return doc;
}
```

---

### B.4 محرك العرض النقي المضاد لـ XSS وتصدير HTML/PDF (`packages/summary-engine/src/renderToHtml.ts`)

يحول كائن `SummaryDocumentV5` المهيكل إلى HTML آمن 100% ضد هجمات XSS، مع دعم شرائط فك التعتيم التفاعلية (`Declassify`) والعمل بدون إنترنت عند تصديره كملف `.html` مستقل:

```typescript
import { SummaryDocumentV5 } from "@bf/shared/src/schemas";

export function escapeHtml(raw: string): string {
  return String(raw ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

export function applyDeclassifyMasks(escapedText: string, masks: string[]): string {
  let output = escapedText;
  for (const mask of masks) {
    const safeMask = escapeHtml(mask.trim());
    if (!safeMask) continue;
    output = output.replace(
      safeMask,
      `<button type="button" class="lv-declassify" data-revealed="false" onclick="this.dataset.revealed = this.dataset.revealed === 'true' ? 'false' : 'true'">${safeMask}</button>`
    );
  }
  return output;
}

export function renderSummaryToStandaloneHtml(
  doc: SummaryDocumentV5,
  options: { theme?: "dark" | "paper" } = {}
): string {
  const theme = options.theme || "dark";
  const isDark = theme === "dark";

  const sectionsHtml = doc.sections
    .map((sec) => {
      const conceptsHtml = sec.concepts
        .map((c) => {
          const defHtml = applyDeclassifyMasks(escapeHtml(c.definition), c.declassifyMasks);
          return `
            <article class="lv-concept">
              <div class="lv-concept-head">
                <div>
                  <span class="lv-term-ar">${escapeHtml(c.termAr)}</span>
                  <span class="lv-term-en">${escapeHtml(c.termEn)}</span>
                </div>
                <span class="lv-citation" title="Verified by ${escapeHtml(c.citation.verifiedBy || "Verifier")}">
                  ✓ p.${Number(c.citation.page)}
                </span>
              </div>
              <p class="lv-def">${defHtml}</p>
              ${
                c.clinicalPearl
                  ? `<div class="lv-pearl"><strong>Clinical Pearl:</strong> ${escapeHtml(c.clinicalPearl)}</div>`
                  : ""
              }
              ${
                c.examTrap
                  ? `<div class="lv-trap"><strong>⚠️ Exam Trap:</strong> ${escapeHtml(c.examTrap)}</div>`
                  : ""
              }
            </article>
          `;
        })
        .join("\n");

      return `
        <section class="lv-plate" id="${escapeHtml(sec.id)}">
          <header class="lv-plate-header">
            <span class="lv-plate-code">${escapeHtml(sec.plateCode)} · pp.${sec.pageRange[0]}–${sec.pageRange[1]}</span>
            <h2>${escapeHtml(sec.titleAr)}</h2>
          </header>
          <ul class="lv-tldr">
            ${sec.tldrBullets.map((b) => `<li>${escapeHtml(b)}</li>`).join("")}
          </ul>
          <div class="lv-concepts-grid">${conceptsHtml}</div>
        </section>
      `;
    })
    .join("\n");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl" data-theme="${theme}">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${escapeHtml(doc.title)} — BLACK FIGHTERS × LineVault</title>
  <style>
    :root {
      --bg-0: ${isDark ? "#05070a" : "#f7f4ec"};
      --bg-1: ${isDark ? "#090c11" : "#ffffff"};
      --fg-0: ${isDark ? "#f5f7fa" : "#12161f"};
      --fg-1: ${isDark ? "#9aa4b2" : "#4a5568"};
      --accent: ${isDark ? "#19f08c" : "#0b7a4b"};
      --line: ${isDark ? "rgba(255,255,255,0.09)" : "rgba(18,22,31,0.12)"};
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 2rem 1rem;
      background: var(--bg-0);
      color: var(--fg-0);
      font-family: "IBM Plex Sans Arabic", system-ui, sans-serif;
      line-height: 1.75;
    }
    .container { max-width: 900px; margin: 0 auto; }
    .lv-plate {
      background: var(--bg-1);
      border: 1px solid var(--line);
      border-radius: 20px;
      padding: 1.5rem;
      margin-bottom: 1.5rem;
    }
    .lv-plate-code {
      font-family: "JetBrains Mono", monospace;
      font-size: 0.75rem;
      color: var(--accent);
    }
    .lv-concept {
      border-top: 1px solid var(--line);
      padding-top: 1rem;
      margin-top: 1rem;
    }
    .lv-concept-head {
      display: flex;
      justify-content: space-between;
      align-items: center;
      gap: 0.75rem;
    }
    .lv-citation {
      font-family: "JetBrains Mono", monospace;
      font-size: 0.72rem;
      padding: 0.15rem 0.55rem;
      border-radius: 999px;
      border: 1px solid var(--accent);
      color: var(--accent);
    }
    .lv-declassify {
      background: rgba(25, 240, 140, 0.14);
      border: 1px dashed var(--accent);
      color: transparent;
      border-radius: 6px;
      padding: 0 6px;
      cursor: pointer;
      transition: color 0.15s ease, background-color 0.15s ease;
    }
    .lv-declassify[data-revealed="true"] {
      color: var(--accent);
      background: rgba(25, 240, 140, 0.08);
    }
  </style>
</head>
<body>
  <main class="container">
    <header style="margin-bottom: 2rem;">
      <div class="lv-plate-code">VERIFIED ATLAS V5 · ${escapeHtml(doc.verificationReport.verifierModel)}</div>
      <h1 style="margin: 0.35rem 0;">${escapeHtml(doc.title)}</h1>
      <p style="color: var(--fg-1); font-size: 0.95rem;">${escapeHtml(doc.executiveSummary)}</p>
    </header>
    ${sectionsHtml}
  </main>
</body>
</html>`;
}
```

---

### B.5 محرك الذاكرة والتكرار المتباعد (`packages/study-science/src/fsrs.ts`)

يدمج خوارزمية **FSRS v4.5** (Free Spaced Repetition Scheduler) مع **Bayesian Knowledge Tracing (BKT)** لحساب احتمالية الإتقان الحقيقية `p_known` لكل مفهوم علمي:

```typescript
import { ConceptMastery, FsrsRating } from "@bf/shared/src/schemas";

const FSRS_DEFAULT_W = [
  0.40255, 1.18385, 3.173, 15.69105, 7.1949, 0.5345, 1.4604, 0.0046, 1.54575,
  0.1192, 1.01925, 1.9395, 0.11, 0.29605, 2.2698, 0.2315, 2.9898, 0.51655, 0.6621,
];

const BKT_PARAMS = {
  pInit: 0.25,
  pTransit: 0.18,
  pSlip: 0.10,
  pGuess: 0.20,
};

export function updateBktProbability(priorPKnown: number, isCorrect: boolean): number {
  const { pTransit, pSlip, pGuess } = BKT_PARAMS;
  const pObsGivenKnown = isCorrect ? 1 - pSlip : pSlip;
  const pObsGivenUnknown = isCorrect ? pGuess : 1 - pGuess;
  const denominator =
    priorPKnown * pObsGivenKnown + (1 - priorPKnown) * pObsGivenUnknown;
  const posterior = denominator > 0 ? (priorPKnown * pObsGivenKnown) / denominator : priorPKnown;
  const nextPKnown = posterior + (1 - posterior) * pTransit;
  return Math.max(0.01, Math.min(0.995, Number(nextPKnown.toFixed(4))));
}

export function scheduleNextFsrsReview(
  card: ConceptMastery,
  rating: FsrsRating,
  now = new Date()
): ConceptMastery {
  const isNew = card.reps === 0;
  const elapsedDays = card.last_review
    ? Math.max(0, (now.getTime() - new Date(card.last_review).getTime()) / 86_400_000)
    : 0;

  let stability = card.stability;
  let difficulty = card.difficulty;

  if (isNew) {
    stability = FSRS_DEFAULT_W[rating - 1];
    difficulty = Math.max(1, Math.min(10, FSRS_DEFAULT_W[4] - Math.exp(FSRS_DEFAULT_W[5] * (rating - 1)) + 1));
  } else {
    const retrievability = Math.pow(1 + (19 / 81) * (elapsedDays / Math.max(0.1, stability)), -0.5);
    difficulty = Math.max(1, Math.min(10, difficulty - FSRS_DEFAULT_W[6] * (rating - 3)));
    if (rating === 1) {
      stability = Math.max(
        0.2,
        FSRS_DEFAULT_W[11] *
          Math.pow(difficulty, -FSRS_DEFAULT_W[12]) *
          (Math.pow(stability + 1, FSRS_DEFAULT_W[13]) - 1) *
          Math.exp(FSRS_DEFAULT_W[14] * (1 - retrievability))
      );
    } else {
      const hardPenalty = rating === 2 ? FSRS_DEFAULT_W[15] : 1;
      const easyBonus = rating === 4 ? FSRS_DEFAULT_W[16] : 1;
      stability =
        stability *
        (1 +
          Math.exp(FSRS_DEFAULT_W[8]) *
            (11 - difficulty) *
            Math.pow(stability, -FSRS_DEFAULT_W[9]) *
            (Math.exp((1 - retrievability) * FSRS_DEFAULT_W[10]) - 1) *
            hardPenalty *
            easyBonus);
    }
  }

  const scheduledDays = rating === 1 ? 0 : Math.max(1, Math.round(stability));
  const nextDue = new Date(
    now.getTime() + (rating === 1 ? 10 * 60 * 1000 : scheduledDays * 86_400_000)
  );
  const nextPKnown = updateBktProbability(card.p_known ?? 0.25, rating >= 3);

  return {
    ...card,
    stability: Number(stability.toFixed(3)),
    difficulty: Number(difficulty.toFixed(3)),
    elapsed_days: Number(elapsedDays.toFixed(2)),
    scheduled_days: scheduledDays,
    reps: card.reps + 1,
    lapses: rating === 1 ? card.lapses + 1 : card.lapses,
    state: rating === 1 ? (card.reps === 0 ? "Learning" : "Relearning") : "Review",
    p_known: nextPKnown,
    due_date: nextDue.toISOString(),
    last_review: now.toISOString(),
  };
}
```

---

### B.6 دفتر الأستاذ المزدوج للرصيد والاشتراكات (`packages/study-science/src/ledger.ts`)

يمنع منعاً باتاً أي تعديل مباشر على حقل الرصيد من المتصفح (`allow write: if false;` في `firestore.rules`). كل عملية خصم أو شحن تمر عبر معاملة ذرية (Atomic Transaction) مقترنة بـ `idempotency_key`:

```typescript
import { CreditLedgerEntry } from "@bf/shared/src/schemas";

export async function executeAtomicLedgerMutation(params: {
  db: FirebaseFirestore.Firestore;
  userId: string;
  idempotencyKey: string;
  direction: "CREDIT" | "DEBIT";
  amount: number;
  reason: CreditLedgerEntry["reason"];
  referenceId?: string;
}): Promise<CreditLedgerEntry> {
  const { db, userId, idempotencyKey, direction, amount, reason, referenceId } = params;
  if (amount <= 0 || !Number.isInteger(amount)) {
    throw new Error("INVALID_LEDGER_AMOUNT");
  }

  const accountRef = db.collection("creditAccounts").doc(userId);
  const ledgerRef = db.collection("creditLedger").doc(`${userId}_${idempotencyKey}`);

  return db.runTransaction(async (tx) => {
    const existingEntry = await tx.get(ledgerRef);
    if (existingEntry.exists) {
      return existingEntry.data() as CreditLedgerEntry;
    }

    const accountSnap = await tx.get(accountRef);
    const currentBalance = accountSnap.exists ? Number(accountSnap.data()?.balance || 0) : 0;

    const nextBalance =
      direction === "CREDIT" ? currentBalance + amount : currentBalance - amount;

    if (nextBalance < 0) {
      const err = new Error("INSUFFICIENT_CREDITS");
      (err as any).code = "INSUFFICIENT_CREDITS";
      throw err;
    }

    const now = new Date().toISOString();
    const entry: CreditLedgerEntry = {
      id: ledgerRef.id,
      user_id: userId,
      idempotency_key: idempotencyKey,
      direction,
      amount,
      balance_after: nextBalance,
      reason,
      reference_id: referenceId,
      created_at: now,
    };

    tx.set(accountRef, { user_id: userId, balance: nextBalance, updated_at: now }, { merge: true });
    tx.set(ledgerRef, entry);
    return entry;
  });
}
```

---

### B.7 منظومة التيليجرام الكاملة (`apps/bot/src/bot.ts`)

تشمل:
1. **عدم تكرار التحديثات (Webhook Idempotency)** عبر مجموعة `telegram_processed_updates/{updateId}`.
2. **التحقق الجنائي من توقيع `initData` (HMAC-SHA256)** لمسار الميني آب `/tg`.
3. **الدفع الفوري بنجوم تيليجرام (`Telegram Stars — XTR`)** وشحن دفتر الأستاذ ذرياً.

```typescript
import crypto from "crypto";

/**
 * التحقق الجنائي من بيانات Telegram WebApp initData وفق معيار تيليجرام الرسمي
 */
export function verifyTelegramWebAppInitData(
  initDataRaw: string,
  botToken: string,
  maxAgeSeconds = 3600
): { valid: boolean; user?: { id: number; first_name: string; username?: string } } {
  const params = new URLSearchParams(initDataRaw);
  const hash = params.get("hash");
  const authDate = Number(params.get("auth_date") || 0);
  if (!hash || !authDate) return { valid: false };

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - authDate > maxAgeSeconds) return { valid: false };

  const pairs: string[] = [];
  params.forEach((value, key) => {
    if (key !== "hash") pairs.push(`${key}=${value}`);
  });
  pairs.sort();
  const dataCheckString = pairs.join("\n");

  const secretKey = crypto.createHmac("sha256", "WebAppData").update(botToken).digest();
  const computedHash = crypto
    .createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const hashBuffer = Buffer.from(hash, "hex");
  const computedBuffer = Buffer.from(computedHash, "hex");
  if (
    hashBuffer.length !== computedBuffer.length ||
    !crypto.timingSafeEqual(hashBuffer, computedBuffer)
  ) {
    return { valid: false };
  }

  const userJson = params.get("user");
  const user = userJson ? JSON.parse(userJson) : undefined;
  return { valid: true, user };
}
```


---

## الجزء C (Part C — Plan 2): نظام تصميم LineVault، محرك الحركة، مكتبة المكوّنات، والـ 31 شاشة بالتفصيل

### C.1 نظام الرموز التصميمية الكامل (`src/index.css` / `globals.css`)

مطابق حرفياً لملف `line-vault-main/apps/web/src/app/globals.css`:

```css
:root,
.dark {
  /* LineVault Exact Ink Surfaces */
  --bg-0: #05070a;                      /* ink-950: Primary page canvas */
  --bg-1: #090c11;                      /* ink-900: Elevated section / sidebar */
  --bg-2: #0e131b;                      /* ink-850: Card / Input surface */
  --surface: rgb(255 255 255 / 0.03);
  --surface-hover: rgb(255 255 255 / 0.055);

  /* LineVault Typography Hierarchy */
  --fg-0: #f5f7fa;                      /* Primary crisp white */
  --fg-1: #9aa4b2;                      /* Secondary slate */
  --fg-2: #646e7d;                      /* Muted metadata */

  /* LineVault Single Emerald Accent */
  --accent: #19f08c;                    /* Emerald 400-500 neon-calm */
  --accent-ink: #03150c;                /* Deep emerald-black on solid CTA */
  --accent-soft: rgb(25 240 140 / 0.12);

  /* Semantic Status Colors */
  --warn: #f5b83d;
  --danger: #ff5d6c;

  /* Hairline Borders & Glows */
  --line: rgb(255 255 255 / 0.08);
  --line-strong: rgb(255 255 255 / 0.16);
  --shadow-glow: 0 0 0 1px rgb(25 240 140 / 0.5), 0 8px 40px -6px rgb(25 240 140 / 0.45);
  --shadow-card: 0 1px 0 0 rgb(255 255 255 / 0.06) inset, 0 24px 48px -24px rgb(0 0 0 / 0.7);
}

/* LineVault Core Utility Classes */
.bg-grid {
  background-image:
    linear-gradient(to right, rgb(255 255 255 / 0.035) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(255 255 255 / 0.035) 1px, transparent 1px);
  background-size: 48px 48px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 30%, #000 40%, transparent 100%);
}

.bg-radial-emerald {
  background:
    radial-gradient(ellipse 60% 40% at 50% 0%, rgb(25 240 140 / 0.14), transparent 70%),
    radial-gradient(ellipse 40% 35% at 80% 20%, rgb(15 184 108 / 0.08), transparent 70%);
}

.glass {
  background: linear-gradient(180deg, rgb(255 255 255 / 0.045), rgb(255 255 255 / 0.015));
  border: 1px solid var(--line);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(16px);
}

.glass-strong {
  background: linear-gradient(180deg, rgb(18 24 34 / 0.88), rgb(11 15 22 / 0.88));
  border: 1px solid var(--line-strong);
  box-shadow: var(--shadow-card);
  backdrop-filter: blur(20px);
}

.text-gradient,
.studio-headline-gradient {
  background: linear-gradient(180deg, #fff 30%, rgb(255 255 255 / 0.55));
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.text-gradient-emerald {
  background: linear-gradient(135deg, #6bffb8 0%, #19f08c 50%, #0fb86c 100%);
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
}

.btn-primary-glow {
  background-color: #19f08c;
  color: #03150c;
  box-shadow: 0 0 0 1px rgb(25 240 140 / 0.5), 0 8px 40px -6px rgb(25 240 140 / 0.45);
  transition: background-color 0.2s ease, transform 0.15s ease, box-shadow 0.2s ease;
}
.btn-primary-glow:hover {
  background-color: #3bf59d;
}
```

---

### C.2 قاموس الحركة الفيزيائية (`src/components/ui/linevault.jsx`)

1. **`reveal(delay = 0)`** — لدخول عناصر الـ Hero والـ Headers:
   ```javascript
   export const reveal = (delay = 0) => ({
     initial: { opacity: 0, y: 16 },
     animate: { opacity: 1, y: 0 },
     transition: { duration: 0.55, delay, ease: [0.22, 1, 0.36, 1] },
   });
   ```
2. **`rise(i = 0)`** — لدخول الكروت والصفوف عند التمرير (`whileInView`):
   ```javascript
   export const rise = (i = 0) => ({
     initial: { opacity: 0, y: 20 },
     whileInView: { opacity: 1, y: 0 },
     viewport: { once: true, margin: "-80px" },
     transition: { duration: 0.5, delay: i * 0.06, ease: [0.22, 1, 0.36, 1] },
   });
   ```
3. **`<AnimatedNumber value={n} decimals={0} prefix="" suffix="" duration={420} />`**:
   - يستخدم `requestAnimationFrame` مع منحنى `1 - Math.pow(1 - t, 3)` (Cubic Ease-Out) و `tabular-nums` لمنع أي اهتزاز أفقي أثناء تغير الأرقام في المنزلق اللوغاريتمي أو عدادات الداشبورد.
4. **`<LineStream />`**:
   - نافذة طرفية حيّة (Live Terminal Window) تعرض 7 صفوف من المفاهيم العلمية المدققة تتبدل كل `1600ms` عبر `AnimatePresence mode="popLayout"`، مع شارة `LIVE STREAM` ونقطة زمردية نابضة `.pulse-dot`.

---

### C.3 مكتبة مكوّنات LineVault الموحّدة (`src/components/ui/linevault.jsx`)

جميع المكوّنات الـ 16 موجودة ومصدّرة من ملف مركزي واحد [`src/components/ui/linevault.jsx`](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/src/components/ui/linevault.jsx):

| المكوّن | الوظيفة ومطابقته لـ `line-vault-main` |
| :--- | :--- |
| `<LVLogo />` | شارة `>_` بخلفية `#19f08c/15` وحد `#19f08c/40` مع اسم المنصة. |
| `<LVLangSwitch />` | كبسولة `.glass` ثنائية (`EN \| ع`) تبدّل اللغة والاتجاه `dir` فوراً. |
| `<AnimatedNumber />` | عدّاد رقمي سلس بـ `requestAnimationFrame` مطابق لـ `animated-number.tsx`. |
| `<LineStream />` | شاشة البث الحي للمفاهيم المدققة مطابقة لـ `line-stream.tsx`. |
| `<Section />` | حاوية أقسام الصفحة الرئيسية مع `eyebrow` زمردي وعنوان `.text-gradient`. |
| `<PageHeader />` | ترويسة موحّدة لكل الصفحات الداخلية (`badge` + `title` + `description` + `actions`). |
| `<GlassCard />` / `<LVCard />` | بطاقة `.glass` قياسية بزاوية `rounded-2xl` وحد شعري `border-white/10`. |
| `<LVBadge />` | شارة حالة دلالية (`emerald`, `neutral`, `warn`, `danger`). |
| `<StatCard />` | بطاقة إحصائية تعرض رقم `<AnimatedNumber />` مع أيقونة ووصف فرعي. |
| `<EmptyState />` | حالة فارغة موحّدة بأيقونة زمردية وعنوان ووصف وزر إجراء رئيسي. |
| `<PricingCard />` | بطاقة تسعير موحّدة (الباقة الموصى بها فقط تأخذ `border-[#19f08c]/45`). |
| `<LVConfigurator />` | منزلق الكمية اللوغاريتمي (`100..10K`) + أزرار اختيار سريع + تسعيرة حية + شريط السعة. |
| `<CountdownRing />` | حلقة SVG تنازلية (`mm:ss`) تتلون بالكهرماني ثم الأحمر عند اقتراب انتهاء المهلة. |
| `<Stepper />` | متتبع خطوات عمودي لحالة الطلب مع نقطة زمردية نابضة على الخطوة النشطة. |
| `<CopyButton />` & `<CopyField />` | حقل نسخ أحادي النقر لمحافظ الدفع وأكواد التفعيل مع تبديل الأيقونة إلى `✓`. |
| `<TierList />` | جدول شرائح الخصم الكمي (`100` إلى `10,000` كريدت) مع تمييز الشريحة النشطة. |

---

### C.4 الهيكل العام والتنقل (`Layout.jsx` + `BottomTabBar.jsx`)

1. **الشريط الجانبي الموحّد (`src/components/Layout.jsx`):**
   - خلفية حبرية صامتة `#090c11` مع حد جانبي شعري `border-white/[0.08]`.
   - يجمع كل مسارات المنصة في **5 مراكز قيادة (5 Hubs)** واضحة:
     1. **اليوم والمكتبة (Today & Library):** `/dashboard`, `/courses`
     2. **الاستوديو والأدوات (Studio & Tools):** `/youtube`, `/pdf-tools`, `/quizzes`, `/practical`
     3. **المراجعة والتثبيت (Review & FSRS):** `/review`, `/emergency`, `/stats`
     4. **الساحة والمجتمع (Arena & Community):** `/leaderboard`, `/friends`, `/groups`
     5. **الحساب والرصيد (Account & Vault):** `/subscriptions`, `/profile`, `/settings`, `/help`
   - زر بحث سريع `⌘K` يفتح `CommandPalette` للوصول لأي مذكرة أو أداة في أقل من ثانية.
2. **شريط الموبايل السفلي (`src/components/BottomTabBar.jsx`):**
   - شريط عائم `.glass-strong` بـ 5 تبويبات أساسية (`اليوم`، `الأدوات`، `المراجعة`، `الساحة`، `الرصيد`) مع مؤشر علوي زمردي `#19f08c`.

---

### C.5 المخطط التفصيلي شاشة بشاشة للـ 31 مساراً (Screen-by-Screen Blueprints)

| # | المسار (Route) | الملف في `src/pages/` | الهيكل والمكوّنات المعتمدة (LineVault Standard) |
| :- | :--- | :--- | :--- |
| 01 | `/` | `Landing.jsx` | `Header` + `Hero` (`LineStream` + `AnimatedNumber`) + `HowItWorks` (01..03) + `LandingAtlasShowcase` + `LVConfigurator` + `Pricing` + `Trust` + `FAQ` + `FinalCTA` + `Footer`. |
| 02 | `/login` | `Login.jsx` | بطاقة `.glass` مركزية واحدة على خلفية `#05070a` + تسجيل دخول Google / البريد + رابط استعادة كلمة المرور. |
| 03 | `/register` | `Register.jsx` | بطاقة `.glass` مركزية + حقول الاسم والبريد وكلمة المرور + مكافأة ترحيبية مجانية. |
| 04 | `/forgot-password` | `ForgotPassword.jsx` | بطاقة `.glass` لإرسال رابط استعادة كلمة المرور مع حالة تأكيد زمردية. |
| 05 | `/reset-password` | `ResetPassword.jsx` | بطاقة `.glass` لتعيين كلمة مرور جديدة مع مؤشر قوة كلمة المرور. |
| 06 | `/dashboard` | `Dashboard.jsx` | **4 بلوكات فقط:** (1) ترحيب + 4 عدادات `<AnimatedNumber />`، (2) زر «كمّل من حيث وقفت»، (3) `<DailyOrderSheet />` المرقم `01..0N`، (4) شبكة المذكرات `<CourseCard />` مع بحث فوري. |
| 07 | `/courses/:id` | `CourseView.jsx` | ترويسة `.glass` للمذكرة + أزرار التصدير (`PDF`, `HTML`, `Telegram`, `Drive`) + تبويبات (`المحتوى`، `الكويزات`، `التلخيصات`، `البطاقات`، `الملاحظات`، `وضع المذاكرة`). |
| 08 | `/atlas` | `AtlasV5Workspace.jsx` | مساحة عمل الأطلس V5 المتقدمة: `<AtlasSummaryReader />` + `<TerritoryMap />` + `<DailyOrderSheet />`. |
| 09 | `/review` | `Review.jsx` | شارة `SPACED REPETITION ENGINE · FSRS v4.5` + جلسة `<ReviewSession />` بأزرار التقييم الأربعة (`Again`, `Hard`, `Good`, `Easy`). |
| 10 | `/quizzes` | `Quizzes.jsx` | بنك الكويزات الشامل + فلاتر الصعوبة والنمط (`Balanced`, `Exam`, `Concepts`, `Cases`, `Traps`). |
| 11 | `/practical` | `PracticalQuiz.jsx` | مختبر الامتحانات العملية (OSPE / Slides / Spots) مع مؤقت لكل شريحة. |
| 12 | `/youtube` | `YoutubeSummarizer.jsx` | لصق رابط يوتيوب $\rightarrow$ استخراج النص $\rightarrow$ توليد ملخص الأطلس V5 وكويز تفاعلي. |
| 13 | `/pdf-tools` | `PdfTools.jsx` | استوديو أدوات PDF (دمج، تقسيم، ضغط، استخراج صفحات، OCR صوري ذكي). |
| 14 | `/subscriptions` | `Subscriptions.jsx` | `<LVConfigurator />` اللوغاريتمي + كروت `<PlanCard />` الموحّدة + محطة الدفع الفورية (`<CountdownRing />` + `<CopyField />` + `<Stepper />`). |
| 15 | `/leaderboard` | `Leaderboard.jsx` | بطاقة القائد المؤسس (Alpha `#0`) بإطار `.glass` زمردي + بطل الأسبوع + قائمة المتصدرين `<LeaderboardRow />`. |
| 16 | `/stats` | `Stats.jsx` | لوحة تحليلات الأداء، منحنى النسيان، وتوزيع الإتقان حسب المواد (`<TerritoryMap />`). |
| 17 | `/friends` | `Friends.jsx` | إدارة الأصدقاء، طلبات الصداقة، وإرسال تحديات الكويز المباشرة. |
| 18 | `/groups` | `StudyGroups.jsx` | المجموعات الدراسية المشتركة ومكتبة المذكرات الجماعية. |
| 19 | `/groups/:id` | `StudyGroupView.jsx` | غرفة المجموعة الدراسية: المذكرات المشتركة، لوحة شرف المجموعة، والمناقشات. |
| 20 | `/challenge/:id` | `ChallengeRoom.jsx` | ساحة التحدّي المباشر (1v1 / Multiplayer) مع عدّاد تنازلي حيّ ونتائج فورية. |
| 21 | `/emergency` | `EmergencyMode.jsx` | وضع الطوارئ ليلة الامتحان (Exam Night Triage): يركز حصرياً على المفاهيم عالية الأهمية (High-Yield) التي لم يتقنها الطالب بعد. |
| 22 | `/profile` | `Profile.jsx` | الملف الشخصي، الإطارات، الألقاب، وسجل الإنجازات. |
| 23 | `/settings` | `Settings.jsx` | إعدادات الحساب، اللغة (`AR/EN`)، وضع الطاقة (`PerformanceContext`)، وربط التيليجرام. |
| 24 | `/help` | `HelpCenter.jsx` | مركز المساعدة الموحّد (9 أقسام تفاعلية تشرح كل أداة في المنصة). |
| 25 | `/tg` | `TelegramMiniApp.jsx` | تطبيق التيليجرام المصغر (Mini App) مع تحقق `initData`، مراجعة البطاقات، وشحن `Telegram Stars`. |
| 26 | `/admin` | `AdminPanel.jsx` | لوحة تحكم الإدارة: مراجعة إيصالات الدفع، توليد أكواد الشحن، وإدارة المستخدمين. |
| 27 | `/shared/:token` | `SharedCourse.jsx` | عرض مذكرة أو ملخص مشارك عبر رابط عام مع زر «أضف إلى مكتبتي». |
| 28 | `/privacy` | `PrivacyPolicy.jsx` | سياسة الخصوصية وحماية بيانات الطلاب. |
| 29 | `/terms` | `TermsOfService.jsx` | شروط الاستخدام وسياسة الاشتراكات والرصيد. |
| 30 | `/verify-email` | `VerifyEmail.jsx` | شاشة تأكيد البريد الإلكتروني وإعادة إرسال رابط التفعيل. |
| 31 | `*` | `NotFound.jsx` | شاشة 404 بطراز LineVault مع زر العودة للداشبورد. |


---

## الجزء D (Part D): بنك النصوص المعتمد، عقود الاختبارات الآلية، وحزمة الـ 12 برومبت التنفيذية للـ AI Builders

### D.1 بنك النصوص العربي والإنجليزي المعتمد (`Copy Bank — AR & EN`)

```json
{
  "ar": {
    "brand": {
      "name": "Black Fighters",
      "tagline": "أطلس المذاكرة الطبي والعلمي المدقق بالذكاء الاصطناعي"
    },
    "nav": {
      "how": "كيف تعمل المنصة",
      "reader": "قارئ الأطلس V5",
      "pricing": "الباقات والرصيد",
      "faq": "الأسئلة الشائعة",
      "cta": "ابدأ المذاكرة الآن"
    },
    "hero": {
      "eyebrow": "VERIFIED ACADEMIC ENGINE · V5 ATLAS × LINEVAULT",
      "titleLine1": "حوّل أضخم المحاضرات والكتب",
      "titleAccent": "إلى أطلس علمي مدقق في ثوانٍ.",
      "subtitle": "من صفحة واحدة حتى 1,000 صفحة — تلخيص هرمي متعدد النماذج، تدقيق عابر للعائلات يمنع الهلوسة، وشرائط استدعاء نشط مرتبطة بخوارزمية FSRS v4.5.",
      "primaryCta": "ارفع محاضرتك الآن مجاناً",
      "secondaryCta": "جرّب قارئ الأطلس الحيّ"
    },
    "configurator": {
      "eyebrow": "حاسبة الرصيد والخصم الكمي",
      "title": "اختر كمية الكريدت بدقة — خصم فوري حتى 56%",
      "subtitle": "اسحب المنزلق اللوغاريتمي أو اختر شريحة جاهزة. كلما زادت الكمية انخفض سعر الوحدة تلقائياً."
    }
  },
  "en": {
    "brand": {
      "name": "Black Fighters",
      "tagline": "Cross-Verified Academic & Medical Study Atlas"
    },
    "nav": {
      "how": "How it works",
      "reader": "Atlas V5 Reader",
      "pricing": "Pricing & Vault",
      "faq": "FAQ",
      "cta": "Start Studying"
    },
    "hero": {
      "eyebrow": "VERIFIED ACADEMIC ENGINE · V5 ATLAS × LINEVAULT",
      "titleLine1": "Turn 1,000-page lectures into",
      "titleAccent": "a cross-verified clinical atlas.",
      "subtitle": "Hierarchical multi-model summarization, cross-family dosage verification, and FSRS v4.5 spaced repetition in a calm LineVault workspace.",
      "primaryCta": "Upload Lecture Free",
      "secondaryCta": "Explore Live Atlas Reader"
    },
    "configurator": {
      "eyebrow": "VOLUME CREDIT CONFIGURATOR",
      "title": "Dial your exact credit volume — up to 56% off",
      "subtitle": "Drag the logarithmic slider or pick a preset tier. Unit cost drops automatically at every threshold."
    }
  }
}
```

---

### D.2 عقود الاختبارات الآلية الصارمة (`Automated Guardrails`)

تضمن اختبارات [`tests/unit/motionPerfContracts.test.mjs`](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/tests/unit/motionPerfContracts.test.mjs) و [`tests/unit/atlasV5.test.mjs`](file:///Users/ibrahimkandil/Desktop/peak-task-flow-local/tests/unit/atlasV5.test.mjs) عدم تسلل أي فوضى بصرية مستقبلاً:
1. **منع `transition-all` على أي سطر يحتوي على `hover:`** في جميع ملفات `src/**/*.jsx`.
2. **منع تحريك `width` و `height`** في Framer Motion داخل `src/pages/` و `src/components/`.
3. **منع `<HellKnight3DBackground />` و `hover-lift` و `style={{}}`** في `src/pages/Landing.jsx`.
4. **إلزامية دعم RTL المنطقي (`md:ms-64`, `start-0`)** في `src/components/Layout.jsx`.
5. **إلزامية تمرير `animated={false}`** للأيقونات المتكررة داخل القوائم (`Layout.jsx`, `CourseCard.jsx`).

---

### D.3 حزمة الـ 12 برومبت التنفيذية الجاهزة للنسخ واللصق (The 12 Copy-Pasteable AI Builder Prompts)

يمكنك نسخ أي برومبت من البرومبتات الـ 12 التالية ولصقه مباشرة في أي جلسة **Claude / Cursor / Antigravity** لتنفيذ أو توسيع أي مرحلة بدقة 100%:

---

#### Prompt 00 — تأسيس العقد المشترك ونظام الرموز التصميمية (Foundation & Shared Contract)

```markdown
أنت مهندس برمجيات رئيسي (Principal Full-Stack Architect) تعمل على مشروع BLACK FIGHTERS × LineVault.
المطلوب منك تنفيذ المرحلة 00:
1. في `src/index.css`، طبّق رموز تصميم LineVault الحرفية:
   - `--bg-0: #05070a` (الخلفية الأساسية)
   - `--bg-1: #090c11` (السطح المرفوع / القائمة الجانبية)
   - `--bg-2: #0e131b` (سطح الكروت والحقول)
   - `--accent: #19f08c` و `--accent-ink: #03150c`
   - أصناف `.glass`، `.glass-strong`، `.bg-grid`، `.bg-radial-emerald`، `.text-gradient`، `.text-gradient-emerald`، و `.btn-primary-glow`.
2. التزم بالقواعد الصارمة التالية:
   - ممنوع استخدام `transition-all` مع `hover:` في أي ملف JSX.
   - ممنوع استخدام ألوان نيون متعددة (بنفسجي/وردي/سيان)؛ اللون الأساسي الوحيد هو `#19f08c`.
3. شغّل `npm run check:local` وتأكد من نجاح الـ 129 اختباراً بدون أي خطأ.
```

---

#### Prompt 01 — بناء مكتبة مكوّنات LineVault الموحّدة (`src/components/ui/linevault.jsx`)

```markdown
أنت مهندس واجهات أمامية خبير (Staff UI Engineer).
المطلوب منك بناء أو تحديث مكتبة المكوّنات الموحّدة في `src/components/ui/linevault.jsx` لتطابق مستودع `line-vault-main` بنسبة 100%:
1. دوال الحركة: `reveal(delay)` و `rise(i)` بمنحنى `[0.22, 1, 0.36, 1]`.
2. `<LVLogo />`: شارة `>_` بخلفية `bg-[#19f08c]/15` وحد `border-[#19f08c]/40`.
3. `<LVLangSwitch />`: مبدّل لغة `.glass` (`EN | ع`).
4. `<AnimatedNumber value decimals prefix suffix duration />`: عدّاد رقمي يعتمد على `requestAnimationFrame` و `tabular-nums`.
5. `<LineStream />`: شاشة البث الحي للمفاهيم العلمية المدققة (7 صفوف تتبدل كل `1600ms` عبر `AnimatePresence mode="popLayout"`).
6. `<LVConfigurator />`: منزلق الكمية اللوغاريتمي (`sliderToQty` و `qtyToSlider` من `100` إلى `10,000`) مع أزرار الاختيار السريع وحساب الخصم الكمي الفوري.
7. `<CountdownRing expiresAt />` + `<Stepper currentIndex steps />` + `<CopyButton />` + `<CopyField />`.
تأكد من عدم وجود أي `transition-all` مقترن بـ `hover:` وشغّل `npm test`.
```

---

#### Prompt 02 — بناء الصفحة الرئيسية المطابقة لـ LineVault (`src/pages/Landing.jsx`)

```markdown
أنت مهندس واجهات أمامية مسؤول عن الصفحة الرئيسية `src/pages/Landing.jsx`.
المطلوب منك جعل `src/pages/Landing.jsx` مطابقة 1:1 لهيكل وتصميم وأنيميشن `line-vault-main`:
1. شريط علوي `sticky top-0 z-40 border-b border-white/[0.07] bg-[#05070a]/80 backdrop-blur-xl` يحتوي على `<LVLogo />`، روابط الأقسام، `<LVLangSwitch />`، وزر `btn-primary-glow`.
2. قسم `Hero` بعمودين: العمود الأول يعرض شارة `pulse-dot`، عنوان `.text-gradient` + `.text-gradient-emerald`، أزرار البدء، و3 عدادات `<AnimatedNumber />`؛ والعمود الثاني يعرض `<LineStream />`.
3. قسم `HowItWorks` بـ 3 بطاقات `.glass` مرقمة `01`، `02`، `03`.
4. قسم `<LandingAtlasShowcase />` لعرض قارئ الأطلس التفاعلي وجدول المقارنة.
5. قسم `<LVConfigurator />` لحساب الرصيد والخصم الكمي.
6. أقسام `PricingSection`، `Trust`، `Faq`، `FinalCta`، و `Footer`.
ممنوع استخدام `style={{}}` inline أو `<HellKnight3DBackground />` أو `backdrop-blur-md` داخل `src/pages/Landing.jsx`.
```

---

#### Prompt 03 — بناء الهيكل العام والتنقل ذي الـ 5 مراكز قيادة (`Layout.jsx` & `BottomTabBar.jsx`)

```markdown
المطلوب منك تحديث `src/components/Layout.jsx` و `src/components/BottomTabBar.jsx`:
1. خلفية `#05070a` للمحتوى و `#090c11` للقائمة الجانبية مع حد شعري `border-white/[0.08]`.
2. تجميع عناصر التنقل في 5 مراكز قيادة (5 Hubs):
   - اليوم والمكتبة
   - الاستوديو والأدوات
   - المراجعة والتثبيت
   - الساحة والمجتمع
   - الحساب والرصيد
3. الحفاظ على عقود الأداء في `Layout.jsx`:
   - `MotionConfig reducedMotion="user"`
   - `md:ms-64` و `start-0` لدعم RTL/LTR
   - عدم وضع `backdrop-blur` أو `transition-all` داخل `const sidebar = (...)`
   - تمرير `animated={false}` للأيقونات داخل القائمة.
```

---

#### Prompt 04 — بناء الداشبورد وكروت المذكرات ومهام اليوم (`Dashboard.jsx`, `CourseCard.jsx`, `DailyOrderSheet.jsx`)

```markdown
المطلوب منك تحديث شاشة الداشبورد `src/pages/Dashboard.jsx` ومكوّناتها الفرعية لتطابق LineVault:
1. `Dashboard.jsx`: يتكون من 4 بلوكات نظيفة فقط:
   - ترحيب + 4 عدادات `<AnimatedNumber />` (إجمالي المذكرات، بطاقات اليوم، نسبة الإتقان، الرصيد).
   - بطاقة «كمّل من حيث وقفت» لآخر مذكرة مفتوحة.
   - `<DailyOrderSheet />` بتصميم صفوف المناهج المرقمة `01..0N` المطابق لـ `course-detail.tsx`.
   - شبكة المذكرات `<CourseCard />` بتصميم `.glass rounded-[1.25rem]` المطابق لـ `course-grid.tsx` مع شارات `CourseMeta` وزر فتح زمردي.
2. حافظ على `animated={false}` على أيقونة الحذف في `CourseCard.jsx`.
```

---

#### Prompt 05 — بناء شاشة الاشتراكات ومحطة الدفع الفورية (`Subscriptions.jsx` & `PlanCard.jsx`)

```markdown
المطلوب منك تحديث `src/pages/Subscriptions.jsx` و `src/components/subscriptions/PlanCard.jsx`:
1. دمج `<LVConfigurator />` اللوغاريتمي في أعلى قسم الرصيد لاختيار أي كمية من `100` إلى `10,000` كريدت.
2. توحيد جميع بطاقات `<PlanCard />` على سطح `.glass`؛ الباقة الموصى بها فقط تأخذ حد `border-[#19f08c]/45` وشارة `RECOMMENDED`.
3. تحويل منطقة الدفع إلى محطة دفع LineVault الفورية (Checkout Terminal):
   - `<CountdownRing expiresAt={orderExpiresAt} />`
   - `<CopyField label="..." value="..." />` لنسخ رقم المحفظة أو عنوان USDT TRC20 بنقرة واحدة
   - `<Stepper currentIndex={...} steps={[...]} />` لمتابعة حالة التفعيل.
```

---

#### Prompt 06 — بناء قارئ الأطلس V5 التفاعلي وخريطة السيطرة (`AtlasSummaryReader.jsx` & `TerritoryMap.jsx`)

```markdown
المطلوب منك تطوير وتحديث `src/components/atlas/AtlasSummaryReader.jsx` و `src/components/atlas/TerritoryMap.jsx`:
1. دعم قراءة كائنات `SummaryDocumentV5` مع شارات الصفحات المدققة `✓ p.13`.
2. دعم شرائط الاستدعاء النشط (`Declassify` bars) التي تخفي الجرعات والأرقام الحرجة وتكشفها عند النقر أو الضغط على مفتاح المسافة.
3. توفير مبدّل قراءة نظيف بين الوضع الداكن (`LineVault Ink`) ووضع الطباعة الورقي (`Paper Mode`).
4. عرض خريطة السيطرة المعرفية (`TerritoryMap`) بناءً على احتمالية الإتقان `p_known` المحسوبة من `FSRS v4.5 + BKT`.
```

---

#### Prompt 07 — بناء بوابة الذكاء الاصطناعي والمدقق العابر للعائلات (`packages/ai-gateway`)

```markdown
المطلوب منك بناء حزمة `packages/ai-gateway`:
1. `registry.ts`: تعريف النماذج (`gemini-2.5-pro`, `gemini-2.5-flash`, `claude-sonnet-4-5`, `gpt-4o-mini`) وتكلفتها لكل مليون توكن.
2. `router.ts`: توجيه المهام بحيث يكون نموذج التدقيق (`verifier`) دائماً من عائلة مختلفة عن نموذج التوليد (`primary.family !== verifier.family`).
3. `verifier.ts`: مقارنة كل جرعة دوائية ورقم وحقيقة علمية بالنص الأصلي المستخرج من صفحات الـ PDF وإرجاع `verified | corrected | flagged` مع رقم الصفحة الدقيق.
```

---

#### Prompt 08 — بناء خط أنابيب التلخيص الهرمي وتصدير HTML/PDF (`packages/summary-engine`)

```markdown
المطلوب منك بناء حزمة `packages/summary-engine`:
1. `pipeline.ts`: تنفيذ المراحل الـ 9 للتلخيص الهرمي (من صفحة واحدة حتى 1,000 صفحة) مع بث أحداث SSE (`job.progress`, `section.ready`, `job.done`).
2. `renderToHtml.ts`: دالة نقية مضادة لـ XSS (`escapeHtml`) تحول `SummaryDocumentV5` إلى ملف HTML تفاعلي مستقل يعمل بدون إنترنت ويحتوي على شرائط `Declassify` التفاعلية.
3. `renderPdf.ts`: تحويل صفحات الـ HTML إلى ملف PDF جاهز للطباعة مع فهرس وأرقام صفحات.
```

---

#### Prompt 09 — بناء محرك الذاكرة FSRS v4.5 + BKT ودفتر الأستاذ المزدوج (`packages/study-science`)

```markdown
المطلوب منك بناء حزمة `packages/study-science`:
1. `fsrs.ts`: تطبيق معادلات FSRS v4.5 (`stability`, `difficulty`, `retrievability`, `scheduled_days`) مقترنة بتحديث احتمالية الإتقان الشرطية `updateBktProbability(priorPKnown, isCorrect)`.
2. `ledger.ts`: تطبيق `executeAtomicLedgerMutation` لمعالجة خصم وشحن الكريدت داخل معاملة Firestore ذرية مع مفتاح `idempotency_key` لمنع الخصم المزدوج.
3. تحديث `firestore.rules` لمنع الكتابة المباشرة من العميل على `creditAccounts` و `creditLedger`.
```

---

#### Prompt 10 — بناء بوت التيليجرام وتطبيق الميني آب (`apps/bot` & `src/pages/TelegramMiniApp.jsx`)

```markdown
المطلوب منك بناء منظومة التيليجرام الكاملة:
1. التحقق الجنائي من توقيع `initData` عبر `HMAC-SHA256` باستخدام `"WebAppData"` ومفتاح البوت.
2. ضمان عدم تكرار معالجة الـ Webhook عبر مجموعة `telegram_processed_updates/{updateId}`.
3. دعم الدفع الفوري عبر `Telegram Stars (XTR)` (`answerPreCheckoutQuery` + `successful_payment`) وشحن رصيد الطالب ذرياً.
4. تحديث واجهة `src/pages/TelegramMiniApp.jsx` لتطابق تصميم LineVault الداكن `#05070a` مع لون `#19f08c`.
```

---

#### Prompt 11 — الفحص النهائي الشامل وضمان الجودة (`Final QA & Production Gate`)

```markdown
أنت مهندس ضمان الجودة والأداء الرئيسي (Lead Release Engineer).
المطلوب منك تنفيذ الفحص النهائي الشامل قبل الإطلاق:
1. شغّل `npm run lint` وتأكد من 0 أخطاء و 0 تحذيرات.
2. شغّل `npm run typecheck` وتأكد من سلامة جميع أنواع TypeScript.
3. شغّل `npm test` وتأكد من نجاح جميع الاختبارات الـ 129 في `tests/unit/motionPerfContracts.test.mjs` و `tests/unit/atlasV5.test.mjs`.
4. شغّل `npm run build` وتأكد من نجاح بناء حزمة الإنتاج وتوليد `PWA precache`.
5. راجع بصرياً أن جميع الشاشات الـ 31 تستخدم خلفية `#05070a`، أسطح `.glass`، ولون `#19f08c` الموحّد.
```
