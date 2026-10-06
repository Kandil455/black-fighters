# ⚔️ الموسوعة الشاملة لمنصة BLACK FIGHTERS التعليمية — التوثيق التقني الكامل

> **الإصدار المعماري:** V3.5 Supreme Edition (Black Fighters / Zeta Platform)
> **الرابط الرسمي:** https://blackfighters.site
> **تطبيق الأندرويد الرسمي:** https://blackfighters.site/downloads/BlackFighters.apk
> **بوت التيليجرام الرسمي:** https://t.me/black_fighters_bot
> **آخر تحديث للوثيقة:** مبنية على الكود الفعلي الحالي للمشروع (للاستخدام قبل التعديل الجذري)

---

## 📌 فهس المحتويات

1. [نظرة عامة وهوية المنصة](#1-نظرة-عامة-وهوية-المنصة)
2. [البنية التقنية والمعمارية](#2-البنية-التقنية-والمعمارية)
3. [محرك الذكاء الاصطناعي المتعدد (Multi-Provider AI Engine)](#3-محرك-الذكاء-الاصطناعي-المتعدد)
4. [منظومة التلخيص الذكي الفائق (Summary Pipeline V2/V3)](#4-منظومة-التلخيص-الذكي-الفائق)
5. [معالجة الملفات واستخراج النصوص (File Processing)](#5-معالجة-الملفات-واستخراج-النصوص)
6. [منظومة الكويزات النظرية والعملية](#6-منظومة-الكويزات-النظرية-والعملية)
7. [استوديو محاضرات يوتيوب (YouTube AI Studio)](#7-استوديو-محاضرات-يوتيوب)
8. [راوند الطوارئ السريري (Emergency Hub)](#8-راوند-الطوارئ-السريري)
9. [أدوات الـ PDF والـ OCR الذكي](#9-أدوات-الـ-pdf-والـ-ocr-الذكي)
10. [التكرار المتباعد والبطاقات الذكية](#10-التكرار-المتباعد-والبطاقات-الذكية)
11. [المساعد الذكي والشات الأكاديمي](#11-المساعد-الذكي-والشات-الأكاديمي)
12. [المجتمع والتحديات الجماعية](#12-المجتمع-والتحديات-الجماعية)
13. [التلعيب والأوسمة ونظام XP](#13-التلعيب-والأوسمة-ونظام-xp)
14. [نظام الكريدت والباقات والدفع](#14-نظام-الكريدت-والباقات-والدفع)
15. [الأمان والحماية الأمنية](#15-الأمان-والحماية-الأمنية)
16. [خريطة الـ 26 صفحة التطبيقية](#16-خريطة-الـ-26-صفحة-التطبيقية)
17. [خريطة الوظائف الخادومية (Serverless API)](#17-خريطة-الوظائف-الخادومية)
18. [خريطة المكونات والمكتبات (Components & Libs)](#18-خريطة-المكونات-والمكتبات)
19. [خريطة هيكل الملفات الكامل](#19-خريطة-هيكل-الملفات-الكامل)
20. [قائمة المفاتيح والمتغيرات البيئية](#20-قائمة-المفاتيح-والمتغيرات-البيئية)

---

## 1. نظرة عامة وهوية المنصة

منصة **Black Fighters** هي منظومة تعليمية وأكاديمية متكاملة مدعومة بالذكاء الاصطناعي المتعدد (Multi-Agent & Multi-Provider AI)، صُممت خصيصاً لطلبة الكليات العملية والطبية (راوندات الطوارئ السريرية، الـ OSCE/OSPE، والمحاضرات الجامعية الكثيفة).

### نقاط البيع الفريدة (USP)
- **تلخيص فائق** بنظام 5 وكلاء (Ultra 5-Agent Orchestrator) + تغطية تلقائية وإصلاح ذاتي.
- **كويزات نظرية (EBE)** و**كويزات عملية (OSCE/OSPE)** بالصور مع استخراج تلقائي من الـ PDF.
- **استوديو يوتيوب** يحوّل أي محاضرة إلى مذكرة ثنائية اللغة + بنك أسئلة.
- **راوند الطوارئ السريري** الحصري (EPNU - جامعة شرق بورسعيد الأهلية).
- **تكرار متباعد** (Spaced Repetition) وبطاقات فلاش ثلاثية الأبعاد.
- **تحديات 1v1 وجماعية** لايف + لوحة متصدرين.
- **تلعيب كامل**: XP، أوسمة متدرجة، متجر مقتنيات (بروفايل/إطارات/بانرات/مدارات/ألقاب/سكنات).
- **ثنائية اللغة الكاملة** (عربي RTL + إنجليزي LTR) مع عزل BiDi تلقائي.
- تعمل على **الويب + أندرويد (APK) + PWA (أوفلاين) + بوت تيليجرام**.

### الهوية البصرية
- شعار: درع/خوذة سبارتان (`/images/knight-logo.png`).
- ألوان: سماوي (`#00f5ff`)، بنفسجي (`#bf5fff`)، أخضر (`#00ff88`)، ذهبي (`#ffd700`).
- خلفية: فارس الجحيم ثلاثي الأبعاد `HellKnight3DBackground`، مدار زحل `SaturnCosmos3D`، النواة العصبية `NeuralCore3D`.

---

## 2. البنية التقنية والمعمارية

### أ. الواجهة الأمامية (Frontend Stack)
| الطبقة | التقنية | الاستخدام |
| :--- | :--- | :--- |
| الإطار الأساسي | React 18 + Vite | تجربة تحميل لحظية + Code-Splitting عبر `lazyWithRetry` |
| التوجيه | React Router DOM v7 (`v7_startTransition`, `v7_relativeSplatPath`) | توجيه الصفحات الـ 26 |
| إدارة الحالة/البيانات | TanStack React Query (`useQuery`/`useQueryClient`) + Base44 SDK | مزامنة Firestore + تخزين محلي IndexedDB |
| التصميم | Tailwind CSS + متغيرات CSS مبرمجة (`@property`) | أنيميشن 120 FPS بدون Layout Thrashing |
| الحركة | Framer Motion + GSAP (مع `ScrollTrigger`) | انتقالات سينمائية وباراللاكس |
| الرسوميات 3D | Three.js + Spline | مشاهد الهبوط والبروفايل |
| UI Primitives | shadcn/ui (`components/ui/*`) | أزرار/كروت/تبويبات/تنبيهات |
| الإشعارات | Sonner (`toast`) | تنبيهات حية `position="bottom-center"` |
| Markdown | react-markdown + remark-gfm + rehype-raw | عرض الملخصات والكويزات |
| التخزين المحلي | localStorage + IndexedDB (`offlineDb.js`) | وضع أوفلاين PWA (Service Worker `public/sw.js`) |

### ب. الخلفية والبنية السحابية
| الخدمة | الاستخدام |
| :--- | :--- |
| Firebase Authentication | تسجيل إيميل + جوجل OAuth (`signInWithRedirect` لدعم Capacitor WebView) |
| Cloud Firestore | البيانات الحية (المستخدمين/الكورسات/الكويزات/الأوسمة/الستريك) |
| Firebase Storage | التخزين السحابي الأول (`directUpload.js`) |
| Supabase Storage | التخزين الهجين الثاني (`upload-media.mjs`/`stream-media.mjs`) |
| Netlify/Vercel Functions | 40+ وظيفة خادومية عبر الموجّه الموحد `api/[...path].mjs` |
| Base44 | كيانات البيانات (Course/GeneratedContent/StandaloneQuiz/ReviewCard/User/Enrollment/StudyActivity...) |

### ج. طبقة الأمان (Security Stack)
- **عزل مفاتيح AI في السيرفر فقط**: لا يوجد أي مفتاح AI في حزمة المتصفح (`VITE_*`). كل الاتصالات تمر عبر `invokeSecureFunction(name, payload)` (`secureFunctions.js`) → `api/<name>` → Netlify Function مع `requireUser` + `Authorization: Bearer <Firebase ID Token>`.
- **CSP** صارمة ضد XSS.
- **securityGuard.js**: حارس مكافحة العبث (يعطل F12/Ctrl+Shift+I/Ctrl+U في الإنتاج، يمنع كليك يمين على عناصر غير الإدخال) + قفل عن بُعد عبر Firestore `system_settings/lockdown` (Emergency Kill Switch).
- **RemoteLockOverlay.jsx**: شاشة تجميد فورية لأي حساب/المنصة عند تفعيل القفل.
- **server-ai.mjs**: سقف استخدام يومي (`AI_DAILY_LIMITS: free=100, premium=1000`) + خصم/استرداد ذري (`spendCreditsAtomic`/`refundCreditsAtomic` باستخدام Firestore Transaction + دفتر أستاذ `creditTransactions`).

### د. ملفات التكوين الأساسية
- `src/lib/firebase.js` / `firebaseConfig.js`: تهيئة Firebase.
- `src/lib/firebaseDb.js` / `firestore.js`: طبقة Firestore.
- `src/lib/apiBase.js`: بناء URL للوظائف (`apiUrl`/`resolveMediaUrl`).
- `src/lib/query-client.js`: إعداد React Query مع `staleTime`/`gcTime`.
- `src/app/AppProviders.jsx` / `AppRoutes.jsx`: مزودو السياق + التوجيه.
- `src/app/lazyWithRetry.js`: تحميل كسول مع إعادة المحاولة.

---

## 3. محرك الذكاء الاصطناعي المتعدد

### أ. مزودو الخدمة المدعومون (`src/lib/ai.js` + `src/lib/models.js`)

**1. CodeCraft API — 31 موديل في 4 طبقات:**
- **Free (8):** Gemini 3.6 Flash، DeepSeek V4 Flash، Gemma 2 2B، Seed 2.1 Turbo، Kimi K2.6، Muse Spark 1.1، Qwen 3.8 27B، GLM 5.2.
- **Starter (6):** Gemini 3.7 Flash، DeepSeek V4 Pro، GPT 5.5، Qwen 3.7 Max، Kimi K3، Seed 2.1 Pro.
- **Pro (8):** Claude Sonnet 5، DeepSeek V4 Pro Max، GPT 5.5 Pro، GPT 5.6 Luna، Grok 4.5، GLM 5.3، Qwen 3.8 Max، Gemini 3.1 Pro.
- **Supreme (9):** Claude Opus 5، Claude Opus 4.8، Claude Opus 4.7، Claude Opus 4.6، GPT 5.6 Sol، GPT 5.6 Terra، Grok 4.6، Claude Fable 5، Claude Mythos Preview.

**2. Google Gemini Pool (تدوير متعدد المفاتيح):**
- `GEMINI_KEYS_POOL`: 3 مفاتيح (أساسي + احتياطيان) للتوزيع على مشاريع مختلفة.
- `GEMINI_ROTATION_POOL`: تدوير بين 5 موديلات (`gemini-3.5-flash-lite` → `gemini-3.1-flash-lite` → `gemini-flash-lite-latest` → `gemini-3.8-flash` → `gemini-2.5-flash`).
- **Cooldown Map** (`keyCooldowns`): عند خطأ `429/RESOURCE_EXHAUSTED` يراح المفتاح 60 ثانية ثم يُستخدم التالي.
- **404 Skip**: إذا مات موديل (404/not found) يُتخطى فوراً لكافة المفاتيح.

**3. Z.ai (Zhipu GLM):**
- نصوص: `glm-4.7-flash` (مع `thinking: { type: "disabled" }` لاستجابة لحظية).
- رؤية: `glm-4.6v-flash` مع `max_tokens >= 2048`.

**4. APMIX.AI:** `claude-sonnet-4-6-free` + `space-bunny-free` (مفتاح مجاني 10M توكنز).

**5. Groq Cloud (LPU Speed):** `openai/gpt-oss-120b`، `qwen/qwen3.8-27b`، `allam-2-7b` (عربي)، `openai/gpt-oss-20b` — تسلسل بدء (fallback chain) مُعرّف في `callAI`.

**6. OpenRouter Gateway:** `openrouter/free` (router تلقائي)، `qwen/qwen3.8-27b:free`، `inclusionai/ling-3.0-flash-sante:free` (طبي) — مع `models` array لعمل failover داخلي في طلب واحد.

**7. Pollinations.ai:** الملاذ الأخير المجاني بدون مفتاح (`openai`/`mistral`/`llama`).

### ب. الراوتر العالمي (`callAI` في `ai.js`)
- كشف تلقائي للمزود من اسم الموديل (`claude-*`/`grok-*`/`gpt-5.*`/`deepseek-v4-pro`/`qwen3.` → CodeCraft).
- **سلسلة تراجع داخل المزود** (`fallbacks` لكل مزود) + **تسلسل تراجع بين المزودين** (Cascade Fallback): Gemini → Z.ai → Groq → APMIX → Pollinations → OpenRouter.
- **إصلاح JSON تلقائي** (`generateJson`): إذا رجع الموديل JSON غير نظيف، يُرسل طلب إصلاح منفصل يعيد الصيغة بدون بيانات جديدة.
- **ترحيل الموديلات الميتة** (`deprecated` map): يحوّل أسماء قديمة لموديلات فعالة (مثال `llama-3.3-70b-versatile` → `openai/gpt-oss-120b`).
- **حدود المدخلات** (في `ai.mjs`): `MAX_PROMPT_CHARS=120,000`، `MAX_HISTORY_ITEMS=40`، `MAX_MEDIA_PARTS=6`، `MAX_MEDIA_B64_CHARS=8,000,000` (~6MB/صورة).

### ج. الـ System Prompts الجاهزة (`SYSTEM_PROMPTS`)
- `json`: مُرمّز JSON متعدد اللغات صارم (ممنوع Markdown/تعليقات).
- `summary`: مهندس تلخيص أكاديمي (هيكل: Key Concepts > Principles > Applications > Exam Pitfalls).
- `quiz`: مهندس أسئلة (إجابة واحدة واضحة + مُشتّتات مبنية على المفاهيم الخاطئة الشائعة + شرح لماذا الصواب صحيح والباقي خطأ).
- `chat`: مساعد دراسي واعي للمصدر (يفرق بين حقائق المصدر والمعرفة العامة).
- `textExamParser`: محرك استخراج أسئلة دقيق (يحتفظ باللغة الأصلية، يتعرف على أي نظام ترقيم A)/أ)/1)/أ)، لا يخمن إجابات ناقصة → `needs_review: true`).

### د. الرؤية متعددة الوسائط (`generateMultimodal`)
- تمرير `mediaParts` (base64) عبر Gemini Vision، ثم تراجع لـ Z.ai `glm-4.6v-flash`.
- عند عدم وجود مفتاح Gemini في المتصفح → يُوجّه للسيرفر عبر `invokeSecureFunction("ai")`.

---

## 4. منظومة التلخيص الذكي الفائق

### أ. تحليل المستند (`analyzeDocument` في `summaryPipeline.js`)
- كشف اللغة (نسبة العربية/الإنجليزية) + الثقة.
- كشف نوع المادة: `medical`/`engineering`/`law`/`business`/`languages`/`humanities`/`auto`.
- حساب الصفحات التقديرية (`words/300`) والأجزاء (`TEXT.length/SUMMARY_CHUNK_SIZE`) والتكلفة (`calculateSummaryCost`).

### ب. الأنماط التسعة للتلخيص (`PROMPTS.summary` في `ai.js`)
1. **ultra_multi_agent** — نظام 5 وكلاء: Alpha (استخراج دقيق)، Beta (منقب رؤى)، Gamma (صائغ أكاديمي: Quick Overview + English Study Notes + **الشرح بالعربي** كنقاط + صناديق اقتباس)، Omega (Quick Cheat Sheet + Summary Conclusion).
2. **bilingual_lecture** — نقاط إنجليزية ثم **الشرح بالعربي:** نقاط منظمة تحت كل قسم.
3. **lecture_exact** — دمج المصطلح الإنجليزي مع ترجمته وشرحه في نفس السطر.
4. **complete** — تغطية 100% بدون اختصار.
5. **equations_only** — المعادلات والقوانين فقط في `code blocks`.
6. **key_points** — نقاط مركّزة (جملة أو اثنتين لكل نقطة).
7. **bilingual_blocks** — كتاب مرجعي ثنائي (مصطلح → شرح عربي تفصيلي).
8. **simple_overview** — شرح مبسط كالأولى.
9. **organized_original** — إعادة تنظيم فقط بدون حذف/إضافة.
10. **compact** — أقصر ملخص (قراءة 5 دقائق).

### ج. معالجة الأجزاء والدمج الهرمي (`courseChunking.js`)
- `splitCourseTextAsync`: تقسيم النص لأجزاء بحجم `SUMMARY_CHUNK_SIZE`.
- `processChunksParallel`: معالجة متوازية بـ `maxConcurrent: 2` مع تقرير تقدم.
- `reduceSummariesHierarchically`: دمج هرمي (map-reduce) — يدمج المسودات في مجموعات ثم يدمج المجموعات لإزالة التكرار مع الحفاظ على التعريفات/القوانين/مراجع الصفحات.

### د. مسار V3 البنيوي (`generateStructuredSummaryV3`)
- **مرحلة map_facts**: استخراج حقائق موثقة (`summary_facts` task) لكل جزء، مع `source_evidence` حرفي + `semantic_type` (term/definition/fact/result/example/warning/formula/statistic) + `importance 1-5`.
- **مرحلة assemble**: دمج الحقائق (`mergeSummaryFacts`) ثم تجميع المستند (`assembleSummaryDocumentFromFacts`) مع محاولات (حتى 5) لتقليص الحقائق عند تجاوز الميزانية.
- **تحقق صارم** (`validateSummaryDocument`): الأخطاء مثل `SUMMARY_WORD_BUDGET_EXCEEDED`/`DUPLICATE_CONTENT_RATIO`.
- **استعادة تلقائية** من IndexedDB (`getOfflineSnapshot`) — الملخص المكتمل يُسترجع بدون خصم كريدت جديد (`resumed: true` → استرداد `chargeAiJob`).

### هـ. فاحص التغطية والإصلاح الذاتي (`buildCoverageReport` + `insertBeforeSummaryConclusion`)
- يقارن المصطلحات المهمة + التعريفات + المعادلات + الأمثلة + مراجع الصفحات بين الملخص والأصل.
- **مؤشر التغطية** (0-100): 50% مصطلحات + 35% عناصر حرجة + 15% صفحات.
- عند `requiresRepair` (score < 78 أو معادلات/تعريفات ناقصة): ينشئ قسم `## Coverage Addendum` ويُدرجه قبل `## Summary Conclusion`.
- **إصلاح البنية** (`requiresStructureRepair`): يعيد تحرير المسودة لفرض Quick Overview مرة واحدة + English Study Notes + **الشرح بالعربي** نقاط + Summary Conclusion.

---

## 5. معالجة الملفات واستخراج النصوص

### أ. الصيغ المدعومة (`fileProcessing.js`)
- نصية: `txt, csv, html, htm, md, rtf`.
- صور: `jpg, jpeg, png, webp, gif, bmp, tif, tiff` (تُرسل لـ OCR).
- مكتبية: `pdf, docx, pptx` (حد أقصى 20MB للقراءة، 50MB في `CreateCourse`).

### ب. استخراج حسب النوع
- **PDF** (`pdfjs-dist` مع `PDF_CMAP_CONFIG` من CDN + `disableFontFace: false` + `cMapUrl` للأحرف العربية والرموز الطبية): يجمع نص الصفحات كـ `[صفحة N]`.
- **DOCX** (`mammoth`): نص خام.
- **PPTX** (`jszip`): يفتح XML للسلايدات ويستخرج `<a:t>`.
- **صور** (`ocr.js`): `recognizeImageFile` (Vision OCR).
- **PDF ممسوح ضوئياً**: كاشف `isGarbledOrCorruptedText` يفحص نسبة الحروف الصالحة مقابل رموز CID التالفة → يُرسل لـ `recognizePdfFile` (OCR كامل).

### ج. Web Worker + حماية الذاكرة
- `fileProcessor.worker.js` + `fileWorkerClient.js`: المعالجة الثقيلة في خيط منفصل (تدريج حي بدون تجميد المتصفح).
- `loadingTask.destroy()` في `finally` — يمنع تراكم 3-4× حجم الملف في الرامات (إصلاح تسريب "1GB بعد التنقل").
- **تنفيذ متوازي** عبر `supportsFileWorker()` مع مسار توافق (`compatibility path`) عند فشل العامل.
- **حد 50,000 حرف** آمن: `resultText.slice(0, 50000)`.

---

## 6. منظومة الكويزات النظرية والعملية

### أ. كويزات النظري EBE (`Quizzes.jsx` + `QuizGeneratorPanel`)
- توليد من كورس مسجل / ملف جديد / نص مُلصق.
- عدد الأسئلة: 5-50+ (حتى 100 في `CourseView`).
- أنواع: MCQ، صح/خطأ، حالات سريرية.
- صعوبة: سهل/متوسط/صعب.
- لغة: إنجليزي/عربي/ثنائي.
- **بروفايلات الكويز (5):** Balanced (مراجعة شاملة)، Exam (شبه امتحان)، Concepts (فهم عميق)، Application (حالات)، Traps (أخطاء شائعة).
- **فاحص جودة الأسئلة** (`quizQuality.js`): تحليل مصدر محلي (`localAnalyzeQuizSource`) + توصية (generate/extract) + تخصيص أسئلة لكل جزء (`allocateQuizQuestions`) + تطبيع النتائج (`normalizeQuizResult`) وإعادة تطابق الإجابة الصحيحة (`reconcileQuestionAnswer`).

### ب. كويزات العملي OSCE/OSPE (`ImageExtractor.jsx`)
خط أنابيب 5 مراحل (5 تبويبات):
1. **Upload**: `extractImagesFromFile` (استخراج الصور المدمجة) → `filterImagesHeuristics` (تحليل بكسلات Canvas API: أبعاد دنيا، خلفيات فارغة، لوجوهات مكررة).
2. **Review**: مراجعة/قبول/استبعاد الصور + تحديث جماعي.
3. **Setup Quiz**: تحديد عدد الأسئلة (حتى 100) والصعوبة واللغة.
4. **Quiz Player**: حل تفاعلي + تصحيح فوري مع شرح.
5. **Export & Save**: ZIP/PPTX/PDF/JSON + حفظ في المنصة (`StandaloneQuiz` `quiz_mode: "practical_osce"`) + تصدير لتيليجرام.

- **توليد في الخلفية** (`practicalQuizJob` + `PracticalQuizBackgroundWidget`): يعمل بموازاة التنقل مع تحديث حي وحفظ IndexedDB.
- **تصنيف سريري ذكي**: يرتّب الصور بأهمية سريرية (ECG/X-ray/CT/MRI/تشريح/أدوية...) قبل توزيع الأسئلة.
- **تحسين صور فوري**: ضغط Canvas (480px، ~20KB WebP/JPEG) + رفع CDN بـ timeout 2 ثانية + كاش في الذاكرة (`optimizedImageCache`).
- **تصحيح الفهرس** (`normalizeCorrectIndex`): يقبل رقم/نص/حرف A-D ويحوله للفهرس الصحيح (إصلاح bug كان يجعل كل إجابة تُحسب A).

### ج. وضعا الحل (`QuizPlayer`/`ModernQuizView`/`QuizReviewStudio`)
- **Study Mode**: التصحيح والشرح فور اختيار الإجابة (بدون مؤقت).
- **Exam Mode**: مؤقت زمني + إخفاء النتيجة حتى التسليم + تقرير أداء.
- **بنك الأخطاء** (`MistakesReview`): يحفظ كل سؤال أخطأ فيه لامتحانه مجدداً.
- **الإبلاغ** (`FlagQuestionModal`) + **المشاركة** (`SharedQuiz.jsx` — صفحة عامة `/s/:id`) + **تصدير PDF** (`quizPdf.js`).

---

## 7. استوديو محاضرات يوتيوب

### المكونات (`YouTubeAIStudio.jsx` + `youtubeService.js` + `youtube-transcript.mjs`)
- **سحب التفريغ النصي**: نص كامل عربي/إنجليزي مع التوقيتات الزمنية.
- **تقطيع زمني**: تحديد `startTime`/`endTime` لمعالجة جزء من الفيديو.
- **مشهد ثنائي اللغة** (`BidiMarkdownViewer`):
  - يفصل كل جزء H2 إلى **English Core Notes (LTR صارم)** + **(الشرح بالعربي): (RTL صارم)**.
  - كشف ذكي للعناصر الإنجليزية/العربية داخل الفقرة العربية (`isEnglishNode` + `unicodeBidi: isolate`).
  - جداول مقارنة ثنائية (إنجليزي أولاً ثم العربي).
- **وضع التشغيل**: `both` (مذكرة + كويز) / `summary_only` / `quiz_only`.
- **شات التعديل الفوري** (`modifyYouTubeLecture`): اطلب تعديل المذكرة/جداول جديدة/حساب جرعات إنعاش.
- **حفظ**: كورس (`saveYouTubeAsCourse`) أو بنك أسئلة (`saveYouTubeAsQuiz`).
- **طباعة A4** (`handlePrintMedicalGuide`): نافذة مستقلة بخامة طباعة كاملة (Cairo/Plus Jakarta/JetBrains Mono + أنماط highlighting).
- **التسعير**: `getEstimatedYouTubeCredits` (ساعة ≈ 20 كريدت، 10 أسئلة ≈ 5 كريدت) — يُخصم ذرياً عبر `youtube-ai-job` مع استرداد عند الفشل.

---

## 8. راوند الطوارئ السريري

### المكونات (`EmergencyHub.jsx` + `emergencyAccess.js` + `emergency-content.mjs` + `EmergencyContentManager`)
- **بوابة مدفوعة** (Paywall): غير المشتركين يرون صفحة شرح + زر اشتراك (99 جنيه/شهر).
- **التحقق من الوصول** (`hasEmergencyAccess`): مشتركو راوند الطوارئ/Supreme/الأدمن.
- **المحتوى (4 تبويبات)**: كافّة/ملفات HTML/ملازم PDF/كويزات الطوارئ — مع بحث فوري وأوسمة (#tags).
- **عرض HTML تفاعلي**: iframe داخل المنصة (`sandbox="allow-same-origin allow-scripts"`) + تحميل مباشر.
- **عرض PDF**: عرض + تحميل مباشر.
- **الكويزات**: رابط مباشر `/q/:quizId`.
- **إدارة المحتوى** (`EmergencyContentManager` في الأدمن): رفع محتوى طوارئ جديد بدون تعديل كود.
- **محتوى سريري معتمد**: بروتوكولات الإنعاش (ABCDE)، أجهزة الصدمات (SCHILLER DEFGARD 5000)، قراءة المونيتور، الأدوية المنقذة.

---

## 9. أدوات الـ PDF والـ OCR الذكي

### أ. عمليات PDF (`runPdfOperation` في `fileProcessing.js` — `pdf-lib`)
`imagePdf` (صور→PDF)، `pdfToImages` (PDF→JPG)، `merge` (دمج)، `split` (تقسيم)، `extract` (استخراج صفحات)، `remove` (حذف صفحات)، `rotate` (تدوير)، `reorder` (إعادة ترتيب)، `pageNumbers` (ترقيم + ووترمارك)، `compress` (ضغط — mode preserve أو rasterize بجودة 0.62/0.45 حتى <3MB).

### ب. الـ OCR (`ocr.js` + `ocrAllowance.js` + `PdfTools.jsx`)
- **Smart Vision OCR**: تحويل المذكرات الممسوحة (موبايل/سكانر) لنصوص رقمية منسقة.
- **قانون الحصص الذكي** (`ocrAllowance.js`): أول 5 صفحات/صور مجاناً + ما زاد بالكريدت + **ميزة الذكاء التكيفي** (إذا رصيدك 1 كريدت والملف يحتاج 3 — يعالج الصفحات التي يغطيها الـ 1 ويتوقف بذكاء).
- تسعيرة OCR: `getImageOcrCost` = 1 كريدت لكل 5 صور (0.2/صورة، حد أدنى 1).

---

## 10. التكرار المتباعد والبطاقات الذكية

### المكونات (`Review.jsx` + `reviewCardGen.js` + `ReviewSession.jsx` + `FlipFlashcard` + `gamification.nextReviewState`)
- **توليد تلقائي**: أي ملخص/محاضرة → بطاقات Front/Back (`generateReviewCardsFromCourse` يعمل تلقائياً بعد حفظ الكورس).
- **جدولة Leitner**: تقييم البطاقة (نسيتها/صعبة/جيدة/سهلة جداً) → `nextReviewState` يحسب الصندوق (1-6) والموعد (1/2/4/7/14/30 يوم).
- **تصميم 3D**: قلب انسيابي + دعم كيبورد (أسهم للتنقل/مسطرة للقلب/أرقام للتقييم).
- **منبهات**: `ReminderDialog` (Google Calendar) + `ReviewReminderDialog` + `ReviewAlerts` بالبطاقات المستحقة.
- **حفظ سحابي**: `ReviewCard` entity مع `due_date` — الاستعلام يفلتر `due_date <= اليوم`.

---

## 11. المساعد الذكي والشات الأكاديمي

### أ. المساعد العائم (`FloatingAssistant` + `SiriOrb` + `AiChatAssistant`)
- كرة طاقة متوهجة (`SiriOrb`) تفتح محادثة من أي صفحة.
- يقرأ سياق الصفحة الحالية (ملخص/كويز/داشبورد).
- **ميزات داخل الشات**: اعملي كويز مختصر / صححلي الإجابات / اشرح إجابة كل سؤال (جداول تفاعلية).
- **صوت** (`VoiceControls`): إملاء + قراءة صوتية.

### ب. شات الكورس بالـ RAG (`AiChatAssistant` + `courseRetrieval.js`)
- بحث دلالي يسترجع الفقرات الأكثر صلة من النص الأصلي ويرفقها للـ AI (مع رقم الصفحة).
- يميز حقائق المصدر عن المعرفة العامة (لا هلوسة في الاقتباسات).
- **`summaryAgentEdit`/`summaryAgentQuiz`**: تعديل حقيقي على ملف التلخيص من الشات (3 كريدت) مع سجل مراجعات (`list-summary-revisions`).
- **مدرب Toji** (`TojiCoach`/`SiriOrb`): رسائل تحفيزية بأسلوب قتالي.

---

## 12. المجتمع والتحديات الجماعية

### أ. الأصدقاء (`Friends.jsx` + `social.js` + `ChatWindow.jsx` + `FriendIdCard` + `FriendRequests`)
- بطاقة هوية لكل طالب + كود صديق فريد.
- بحث + طلبات صداقة + شات فوري خاص (`social-actions.mjs`).

### ب. المجموعات (`Groups.jsx` + `GroupChatWindow` + `CreateGroupDialog` + `GroupQuizSessionModal` + `SyncedQuizBody` + `GroupQuizLeaderboard`)
- مجموعات مذاكرة للدفعة/الشلة.
- **كويز جروب لايف**: القائد يختار كويزاً → الجميع يحل في نفس اللحظة + لوحة نتائج حية.

### ج. غرف التحدي 1v1/Multiplayer (`ChallengeNew` + `ChallengeRoom` + `ChallengeLobby` + `ChallengeQuiz` + `ChallengeResult`)
- إنشاء غرفة + مشاركة الكود + لوبي انتظار حي + اختبار سرعة/دقة + تتويج الفائز بنقاط XP.

### د. لوحة المتصدرين (`Leaderboard.jsx`)
- ترتيب عام حسب XP/المستوى/الأوسمة (+ `recordLeaderboard` يحدّث `quizzes_completed`).

---

## 13. التلعيب والأوسمة ونظام XP

### أ. نظام XP (`xpSystem.js`)
**المكافآت:** create_course=25، complete_quiz=20، perfect_quiz=60، flashcard_session=12، generate_summary=8، daily_streak=35، practice_complete=15، study_session=5، note_created=5، review_card=3، first_login_today=10.

**المستويات (9):** مبتدئ 📖 (0-150) → متعلم 📚 (150-400) → نشيط ⚡ (400-900) → متقدم 🎯 (900-1800) → محترف 🏆 (1800-3500) → خبير 💎 (3500-7000) → نخبة 🔥 (7000-14000) → أسطورة ⭐ (14000-28000) → إله المذاكرة 👑 (28000+).

- **المنح على السيرفر فقط**: `awardProgress(action, units)` → `functions/awardProgress` (ذرّي، مرة واحدة فقط).

### ب. الأوسمة (40+ وسامة — `gamification.js` + `badgeLadderData.js`)
- **تراثية يدوية (16):** first_course/five_courses/ten_courses/quiz_master/quiz_legend/perfect_score/three_perfects/streak_3/7/30/speed_learner/note_taker/night_owl/early_bird/summarizer/flashcard_fan.
- **سلم متدرج بياناتياً**: كل عائلة (`TIER_FAMILIES`) تولد وسامة لكل عتبة (I/II/III...) حسب عدّاد (courses_created، summaries_created، ai_messages...).
- **مكافآت المراحل** (`BADGE_MILESTONE_REWARDS`): تجاوز عدد أوسمة معين يمنح كريدت — يُدفع من السيرفر عبر `economy-actions` (`claimBadgeMilestones`).
- **كشف تلقائي**: `syncBadgeLadder` يعمل عند كل تحميل بروفايل + `recordStudy` يكشف night_owl (12-4ص)/early_bird (5-7ص)/ستريك.

### ج. الستريك (`StreakFlameWidget`)
- عداد يومي متوهج + `dailyLoginReward` (من السيرفر — مرّة واحدة يومياً) + `checkDailyLoginReward`.

### د. متجر المقتنيات (`economyCatalog.js` + `purchase-cosmetic.mjs`)
- **FrameStore** (إطارات نيون/ذهبية/ملتهبة)، **BannerStore** (خلفيات)، **OrbitStore** (جزيئات/أوربتات `OrbitEffectGlyph`)، **TitleStore** (ألقاب)، **MascotSkinStore** (سكنات مجسم 3D `Mascot3DModel`).
- **بروفايل عام 3D** (`PublicProfile` + `Tilt3DCard`): كارت هولوغرامي يتحرك مع الماوس.

---

## 14. نظام الكريدت والباقات والدفع

### أ. تسعير العمليات (`creditCosts.js`)
| العملية | التكلفة |
| :--- | :--- |
| تلخيص ملف/نص | 2 كريدت |
| توليد كويز نظري | 1 كريدت / 5 أسئلة (`quiz_base`) |
| استخراج أسئلة جاهزة | 2 كريدت (`quiz_extract`) |
| كويز عملي OSCE | 0.5 كريدت/سؤال (`getPracticalQuizCost`) |
| تعديل AI على ملف التلخيص | 3 كريدت (`ai_summary_edit`) |
| كويز من الملخص | 1 كريدت/5 أسئلة |
| استخراج الصور + الفلترة | مجاني 100% (`image_extract=0`) |
| OCR للصور | 1 كريدت/5 صور |

### ب. الباقات (`plans.js`)
| الباقة | السعر | الكريدت | المميزات |
| :--- | :--- | :--- | :--- |
| **Free** 🟢 | 0 | 10 + هدية ترحيبية | عمليتان/يوم، محركات مجانية، إحالات (10 كريدت/صديق)، ادعُ 40 واحصل على 100 ج مجاناً |
| **Starter** ⚡ | 49 ج/شهر | 250 | بوت تيليجرام، كويزات EBE/OSPE، ملفات حتى 80 صفحة، بدون قيود يومية |
| **Pro** ⭐ | 89 ج/شهر | 600 | محركات فائقة (Claude Sonnet 5)، ملفات/سلايدات غير محدودة، PDF tools + مستخرج رسوم (الأكثر شعبية) |
| **Supreme** 👑 | 149 ج/شهر | 1,500 | أقصى معالجة، كتب ضخمة/يوتيوب طويل، تحليل معمق، أولوية قصوى + VIP |
| **Emergency Round** 🚨 | 99 ج/شهر | 100 | وصول كامل لراوند الطوارئ (HTML/PDF/كويزات) + بوت تيليجرام + 100 كريدت |

- **خصم سنوي**: شهرين مجاناً (`YEARLY_DISCOUNT = 2/12`).
- **باقات شحن كريدت** (`CREDIT_REFILL_PACKS`): 50/150/400/1000/2500 كريدت بخصومات 0/10/20/30/40%.

### ج. الإحالات (`referralService.js`)
- `creditsPerInvite=10`، `targetInvitesForFreePlan=40`، `freePlanGrantedKey="pro"`، `freePlanRewardValueEGP=100`.

### د. الدفع (`PaymentRequestPanel` + `submit-payment.mjs` + `payment-processor.mjs` + `purchase-cosmetic.mjs`)
- محافظ إلكترونية (فودافون كاش وغيرها) + إيصالات + أكواد شحن (`redeem-code.mjs`/`RedeemCodePanel`) + أكواد تفعيل (`generate-activation-codes.mjs`/`ActivationCodesManager`).
- **معالجة ذرية** (`spendCreditsAtomic`): Firestore Transaction يحدّث الرصيد + يكتب دفتر أستاذ `creditTransactions` (balance_before/after + idempotency_key).

---

## 15. الأمان والحماية الأمنية

### طبقات الحماية
1. **عزل المفاتيح**: AI keys في `process.env` بالسيرفر فقط (`server-ai.mjs`) — لا `VITE_`.
2. **`secureFunctions.js`**: كل طلب يحمل `Authorization: Bearer <Firebase ID Token>` ويتحقق `requireUser`.
3. **`securityGuard.js`**: عطل DevTools (F12/Ctrl+Shift+I/J/C/Ctrl+U) + منع كليك يمين (عدا الإدخال) في الإنتاج.
4. **`RemoteLockOverlay`**: قفل عن بُعد لحظي عبر Firestore `system_settings/lockdown`.
5. **Rate Limiting**: 30 طلب/5 دقائق/مستخدم (`rateLimit` في `ai.mjs`) + سقف يومي (`checkAiDailyQuota`).
6. **حماية المهام الثقيلة**: `requireRecentChargedJob` — المستخدم المجاني يحتاج عملية مدفوعة في آخر 3 ساعات قبل توليد ثقيل.
7. **حدود المدخلات** (`assertPayloadLimits`): 120K حرف/40 رسالة/6 صور/8M base64.
8. **استرداد الكريدت عند الفشل**: `refundCreditsAtomic` يرجع الكريدت لو فشلت العملية المدفوعة.
9. **إصدار الحصص عند الفشل** (`releaseAiDailyQuota`): لا يُعاقب المستخدم على انقطاع السيرفر.

---

## 16. خريطة الـ 26 صفحة التطبيقية

**المسارات في `src/pages/`:**

| # | الصفحة | الملف | الوظيفة |
| :-: | :--- | :--- | :--- |
| 1 | الهبوط | `Landing.jsx` | فارس الجحيم 3D + Marquee مميزات + خطوات 3 (ارفع/حوّل/ذاكر) + تحميل APK |
| 2 | لوحة التحكم | `Dashboard.jsx` | Omnibox أمر + 7 بطاقات أدوات (ملخص/يوتيوب/نظري/عملي/سلايدات/فلاش/مستندات) + ستريك + XP + SmartDailyPlan + ZetaUsageAndReferralHub + فلاتر/بحث |
| 3 | إنشاء كورس | `CreateCourse.jsx` | رفع 14 صيغة (حتى 50MB) + لصق نص + يوتيوب + AssistantLanguagePopup (نمط/لغة/موضوع/تلوين/صفحات) + AgentPipeline + معاينة وحفظ |
| 4 | عرض الكورس | `CourseView.jsx` | 9 تبويبات (محتوى/كويزات/تلخيص/فلاش/ملاحظات/StudyMode/Practice/Share) + 5 بروفايلات كويز + تصدير PDF/Telegram/Google Drive + TojiCoach + AiChatAssistant |
| 5 | راوند الطوارئ | `EmergencyHub.jsx` | بوابة مدفوعة + 4 تبويبات (HTML/PDF/كويزات) + بحث + عرض iframe + حجز |
| 6 | يوتيوب ستوديو | `YouTubeAIStudio.jsx` | URL + تقطيع زمني + وضع (both/summary/quiz) + BidiMarkdownViewer + شات تعديل + طباعة A4 |
| 7 | كويزات النظري | `Quizzes.jsx` | QuizGeneratorPanel + شبكة كويزاتي (حذف فردي/جماعي + تحميل المزيد) |
| 8 | كويزات العملي | `ImageExtractor.jsx` | 5 تبويبات (رفع/مراجعة/إعداد/حل/تصدير+مكتبة) + توليد خلفية + حفظ StandaloneQuiz + تيليجرام |
| 9 | أدوات PDF | `PdfTools.jsx` | 11 عملية PDF + OCR + تفريغ نصي |
| 10 | المراجعة | `Review.jsx` | جلسة فلاش يومية (البطاقات المستحقة) + شاشة إتمام + كشف Leitner |
| 11 | تحدي جديد | `ChallengeNew.jsx` | إعداد غرفة (مادة/عدد أسئلة/وقت لكل سؤال) |
| 12 | غرفة التحدي | `ChallengeRoom.jsx` | لوبي + شاشة منافسة + نتائج |
| 13 | الأصدقاء | `Friends.jsx` | بطاقة ID + بحث + طلبات + شات |
| 14 | المجموعات | `Groups.jsx` | مجموعات مذاكرة + كويز جروب لايف + لوحة نتائج |
| 15 | المتصدرين | `Leaderboard.jsx` | ترتيب XP/مستوى/أوسمة |
| 16 | الإحصائيات | `Stats.jsx` | ProgressChart/CourseCompletionChart/SubjectHoursChart + BadgesGrid + AnimePowerPanel + XpLevelCard |
| 17 | البروفايل | `Profile.jsx` | تعديل + متاجر (إطارات/بانرات/مدارات/ألقاب/سكنات) |
| 18 | بروفايل عام | `PublicProfile.jsx` | كارت 3D Tilt + إحصائيات + أوسمة |
| 19 | الاشتراكات | `Subscriptions.jsx` | 5 باقات + حزم شحن + RedeеmCode + MyPaymentRequests + بوابة دفع مرحلية (فاتورة→تحويل) |
| 20 | الإعدادات | `Settings.jsx` | ThemePicker + LanguageSettings + PerformanceSettings + AvatarPicker + API Key (أدمن) + IntegrationsPanel + DeleteAccount |
| 21 | كويز مشترك | `SharedQuiz.jsx` | صفحة عامة لفتح/حل كويز مشارك |
| 22 | معرض 3D | `ThreeDGallery.jsx` | استعراض مجسمات المشهد التفاعلية |
| 23 | ساحة Toji | `Toji.jsx` | TojiHero + TojiGallery (تحفيز قتالي) |
| 24 | الأدمن | `Admin.jsx` | إدارة مستخدمين (ترقية/قفل/خصائص) + Analytics + ActivationCodes + PaymentRequests + EmergencyContentManager + Funnel/Quality |
| 25-26 | المصادقة | `Login`/`Register`/`ForgotPassword`/`ResetPassword` | إيميل + جوجل + OTP (`OtpVerify`) + استعادة |

---

## 17. خريطة الوظائف الخادومية

**40+ Netlify Function في `netlify/functions/` تُخدّم عبر الموجّه الموحد `api/[...path].mjs`:**

### AI والتوليد
1. `ai.mjs` — البوابة المؤمّنة المركزية (text/vision/chat/generateStudyContent/summaryAgent) مع rate-limit + حصص يومية.
2. `charge-ai-job.mjs` — خصم/استرداد/إغلاق عملية AI (charge/refund/finalize) مع `jobKey` idempotency.
3. `quote-ai-cost.mjs` — حساب التكلفة المسبقة لأي مهمة.
4. `youtube-transcript.mjs` — سحب التفريغ النصي لليوتيوب.
5. `youtube-ai-job.mjs` — مزامنة تلخيص يوتيوب + خصم ذري.

### التلخيص والمستندات
6. `start-summary-job.mjs` — بدء مهمة تلخيص بنيوي.
7. `get-summary-job.mjs` / `update-summary-job.mjs` / `cancel-summary-job.mjs` / `retry-summary-chunk.mjs` — دورة حياة المهمة.
8. `save-summary-document.mjs` / `get-summary-document.mjs` — حفظ/استرجاع مستند V3.
9. `list-summary-revisions.mjs` — سجل مراجعات التعديلات.
10. `save-generated-content.mjs` / `delete-generated-content.mjs` — حفظ/حذف المحتوى المولّد.
11. `search-licensed-images.mjs` — صور علمية مرخصة للملخصات.

### الاقتصاد والدفع
12. `economy-actions.mjs` — إجراءات اقتصادية (claimBadgeMilestones/شراء مقتنيات).
13. `purchase-cosmetic.mjs` — شحن/شراء مقتنيات بروفايل.
14. `redeem-code.mjs` / `generate-activation-codes.mjs` — أكواد شحن/تفعيل.
15. `submit-payment.mjs` / `admin-payment-action.mjs` — إيصالات الدفع وإدارة طلبات الأدمن.
16. `award-progress.mjs` — منح XP/ستريك كريدت (مصدر الحقيقة).

### المحتوى الاجتماعي والطوارئ
17. `social-actions.mjs` — إجراءات الأصدقاء/المجموعات/الشات.
18. `emergency-content.mjs` — CRUD محتوى راوند الطوارئ.
19. `profile-actions.mjs` — تحديث بروفايل المستخدم.

### الوسائط
20. `upload-media.mjs` — رفع صور مضغوطة (Firebase/Supabase).
21. `proxy-media.mjs` / `stream-media.mjs` — بروكسي/بث وسائط آمن.

### التيليجرام
22. `telegram-webhook.mjs` — استقبال أحداث البوت.
23. `export-to-telegram.mjs` — تصدير ملخص/كويز لبوت الطالب (bot-token خارج المتصفح).

### مساعد/إشعارات
24. `notify-signup.mjs` — إشعار تسجيل جديد.
25. `seed-my-quizzes.mjs` / `quizzes-data.js` — بذور البيانات.

### Shared (مستورد داخلي — `netlify/functions/_shared/`)
- `http.mjs` (json/parseBody/handleError)، `firebase-admin.mjs` (adminDb/requireUser)، `server-ai.mjs` (serverAiConfig + checkAiDailyQuota + spendCreditsAtomic/refundCreditsAtomic + releaseAiDailyQuota)، `billing.mjs` (chargeLightUsage)، `summary-agent-core.mjs`، `summary-documents.mjs`، `telegram-engine.mjs`، `media-security.mjs`، `catalog.mjs`، `payment-processor.mjs`.

---

## 18. خريطة المكونات والمكتبات

### مكتبات النطاق `src/lib/` (الأهم)
| المكتبة | الغرض |
| :--- | :--- |
| `ai.js` | الراوتر العالمي + مزودو الخدمة + System Prompts + PROMPTS.summary + إصلاح JSON |
| `models.js` | كتالوج 31 موديل CodeCraft + PROVIDERS + مستويات الوصول |
| `summaryPipeline.js` | تحليل/توليد/دمج هرمي + تغطية + مسار V3 |
| `summaryV3/*` | مخطط/حقائق/نص/تحقق/تجميع مسار V3 |
| `summaryMarkup.js` | تطبيع BiDi/قوائم/ألوان دلالية + إصلاح الفقرات العربية المكتظة |
| `summaryJobs.js` | مهام التلخيص السحابية |
| `fileProcessing.js` | استخراج نصوص/عمليات PDF/تنزيل |
| `ocr.js` / `ocrAllowance.js` | OCR + الحصص الذكية |
| `creditCosts.js` / `economyCatalog.js` / `plans.js` / `paymentInfo.js` | تسعير/اقتصاد/باقات/دفع |
| `secureFunctions.js` | استدعاء آمن للوظائف |
| `securityGuard.js` | حارس مكافحة العبث + القفل عن بُعد |
| `gamification.js` / `xpSystem.js` / `badgeLadderData.js` | أوسمة/XP/سلم |
| `quizQuality.js` | تحليل/تطبيع/مراجعة جودة الأسئلة |
| `imageExtractor.js` / `imageFilter.js` / `imageExport.js` / `practicalQuizJob.js` | استخراج/فلترة/تصدير/وظيفة خلفية |
| `courseChunking.js` / `courseRetrieval.js` | تقسيم أجزاء/بحث دلالي RAG |
| `youtubeService.js` / `youtube-transcript.mjs` | يوتيوب |
| `integrations.js` | Slack + Google Drive |
| `notifications.js` / `analytics.js` / `referralService.js` | إشعارات/تحليلات/إحالات |
| `offlineDb.js` / `blobCache.js` / `storage.js` | أوفلاين/تخزين |
| `LocaleContext.jsx` | ثنائية اللغة |
| `AuthContext` (`src/lib/AuthContext`) | هوية المستخدم |
| `sounds.js` / `soundSynthesizer.js` | مؤثرات صوتية |
| `mascotSkins.js` / `mascotRewards.js` / `avatars.js` / `themes.js` | شخصنة |

### مكتبات النطاق `src/components/` (الأهم)
| المكوّن | الغرض |
| :--- | :--- |
| `course/*` (40+) | كل شيء متعلق بالكورس: ملخصات/كويز/فلاش/ملاحظات/شات/معاينات/تحكم |
| `quiz/*` | QuizGeneratorPanel/QuizCard/QuizPlayer |
| `imageExtractor/*` | ImageExtractorUpload/ImageReviewGrid/ImageQuizControls/ImageQuizPlayer/ImageExportPanel/ImageLibrary |
| `pdf/*` | PdfToolCard/PdfTextResult/PdfUploadPanel/SummaryTemplateSelector |
| `stats/*` | ProgressChart/StatCard/SubjectHoursChart/CourseCompletionChart/BadgesGrid/XpLevelCard/AnimePowerPanel |
| `challenge/*` | ChallengeResult/ChallengeQuiz/ChallengeLobby |
| `review/*` | ReviewSession |
| `settings/*` | Performance/ProviderModelPicker/AvatarPicker/ThemePicker/LanguageSettings/IntegrationsPanel/DeleteAccountCard/SwitchShowcase |
| `admin/*` | AdminAnalytics/AdminFunnelAndQuality/ActivationCodesManager/EmergencyContentManager/PaymentRequestsManager |
| `subscriptions/*` | PlanCard/RedeemCodePanel/MyPaymentRequests |
| `toji/*` | TojiHero/TojiGallery |
| `auth/*` | AuthMascot/OtpVerify/useMascotState |
| `ui/*` (90+) | مكتبات أساسية: HellKnight3DBackground/NeuralCore3D/Spline3DHero/Custom3DIcons/LottieIcons/CinematicTiltCard/MagneticButton/ShimmerButton/CardSpotlight/Marquee/StreakFlameWidget/RemoteLockOverlay... |
| `theme/*` | DynamicStudyBackground/StudyAtmosphereSwitcher |
| `wife/*` | WifeFrame/WifeBanner |

---

## 19. خريطة هيكل الملفات الكامل

```
peak-task-flow-local/
├── src/
│   ├── pages/                    # الـ 26 صفحة (+ mockups/ للتصاميم الأولية)
│   ├── components/               # المكونات (course/quiz/imageExtractor/pdf/stats/challenge/review/settings/admin/subscriptions/toji/auth/ui/theme/wife)
│   ├── lib/                      # 80+ مكتبة منطقية (ai, models, pipeline, gamification, credits, security...)
│   ├── features/theory/          # ميزات مدمجة (create-course/ + youtube-studio/ bidiMarkdown + config)
│   ├── services/telegramBot.js   # منطق البوت
│   ├── workers/fileProcessor.worker.js  # عامل Web Worker لاستخراج النصوص
│   ├── api/                      # base44Client + authService + index.js
│   ├── app/                      # AppProviders + AppRoutes + lazyWithRetry
│   ├── hooks/                    # use-mobile, usePullToRefresh
│   ├── assets/lottie/            # 20+ ملف Lottie (stars/radar/flame/payment/loader/crown/trophy/rocket...)
│   ├── App.jsx                   # نقطة الدخول (initSecurityGuard/initReferralTracking + PWA + OfflineManager + RemoteLockOverlay)
│   └── main.jsx
├── netlify/functions/            # 40+ وظيفة خادومية
│   ├── _shared/                  # http/firebase-admin/server-ai/billing/summary-agent-core/...
│   └── *.mjs
├── api/[...path].mjs            # الموجّه الموحد للوظائف (Vercel)
├── public/
│   ├── sw.js / sw-reset.js       # Service Worker الأوفلاين
│   └── images/knight-logo.png    # الشعار
├── vite.config.js / tailwind.config.js / postcss.config.js / eslint.config.js
└── (package.json غير ظاهر في النتائج)
```

---

## 20. قائمة المفاتيح والمتغيرات البيئية

### مفاتيح السيرفر (`process.env` في Netlify/Vercel)
`GEMINI_API_KEY`, `GEMINI_BACKUP_KEYS`, `ZAI_API_KEY`, `APMIX_KEY`, `GROQ_API_KEY`, `OPENROUTER_API_KEY`, `CODECRAFT_KEY` (اختياري)، `GEMINI_MODEL`, `GEMINI_VISION_MODEL`, `ZAI_MODEL`, `GROQ_MODEL`, `OPENROUTER_MODEL`.

### مفاتيح المتصفح (محمية/غير مستخدمة للـ AI)
`VITE_FUNCTIONS_BASE_URL` (بديل `/.netlify/functions` أو `/api`), `VITE_GEMINI_API_KEY` (احتياط تطوير فقط).

**قاعدة ذهبية:** أي مفتاح AI حقيقي يجب أن يبقى في `process.env` بالسيرفر — لا `VITE_` أبداً في حزمة الإنتاج.

---

> ⚠️ **ملاحظة للمطور قبل التعديل الجذري:** هذه الوثيقة مبنية فوق الكود الفعلي للمشروع الحالي (V3.5). عند بدء التعديلات الكبرى — احتفظ بنسخة من هذه الوثيقة وحدّثها بعد كل تغيير إنشائي، خصوصاً في: `ai.js` (الراوتر)، `summaryPipeline.js` (التغطية)، `creditCosts.js` (التسعير)، `server-ai.mjs` (الخصم الذري)، و`models.js` (31 موديل).

**— النهاية —** 🚀⚔️
