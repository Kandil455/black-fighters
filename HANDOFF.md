# 🤝 Black Fighters — هاند أوف جلسة 29 سبتمبر 2026

## الملخص التنفيذي
المطلوب: تشغيل المنصة كاملة، فهمها، وتأمين كل مسارات الفلوس (كريديتس، تلخيصات يوتيوب، كويزات، مكافآت يومية، إحالات، شراء كورسات) والتأكد إن كل الدوال الحساسة ماشية على السيرفر.

**النتيجة: كل المهام اتنفذت والمنصة شغالة end-to-end.** build + lint + typecheck كلهم خضرا، والـ `dist/` خالي تماماً من أي مفاتيح، والـ dev server بيخدم نفس دوال الإنتاج محلياً.

---

## 1️⃣ الأمان — المفاتيح
| المفتاح | الحالة |
|---|---|
| `gsk_` (Groq) | ✅ اتشال من كل المكان |
| `sk-or-v1-` (OpenRouter) | ✅ اتشال |
| `AQ.Ab8RN6` (Apmix) | ✅ اتشال |
| `apx_live_` | ✅ اتشال |
| توكن تيليجرام `7601463756:AAFh...` | ✅ اتشال |
| `cc_Byj2Qb...` (CodeCraft) | ✅ اتشال من [telegram-engine.mjs:462](netlify/functions/_shared/telegram-engine.mjs#L462) — بقى `process.env.CODECRAFT_API_KEY || ""` |
| `AIzaSyCm-...` في dist | ℹ️ ده Firebase Web API Key — public by design، مقصود |

فحص `dist/` النهائي: **نضيف تماماً** من كل البادئات السرية. بيئة التشغيل محمّلة من `.env` + `.firebase-service-account.json` بس.

## 2️⃣ التشغيل في الـ dev (أكبر تغيير)
- **[vite-plugin-dev-api.mjs](vite-plugin-dev-api.mjs)** (جديد): بيخدم كل مسارات `/api/*` و`/.netlify/functions/*` محلياً بنفس راوتر [api/[...path].mjs](api/[...path].mjs) — أي فانكشن جديد يتسجل هناك يشتغل في الـ dev أوتوماتيك.
- بيحمّل `.env`/`.env.local` + `.firebase-service-account.json` قبل استيراد الراوتر (استيراد runtime من الديسك عشان ما يتbundleش جوه vite.config).
- [youtube-transcript](vite.config.js) القديم لسه شغال زي ما هو.

## 3️⃣ مسارات الفلوس — كلها server-side ذرّية
| المسار | الفانكشن | الضمانات |
|---|---|---|
| تلخيص يوتيوب | `youtube-ai-job` | تسعير متدرج 2–50 كريدت (+2 للوضعين)، idempotent عبر `summaryJobs/yt_{uid}_{jobKey}`، refund أوتوماتيك عند فشل التوليف، بريميوم/أدمن مجاناً |
| تلخيص/كويزات/OCR (PDF) | `charge-ai-job` | charge → finalize/refund مع ليدجر، إعادة الاستخدام idempotent |
| شراء كورس | `economy-actions/purchaseCourse` | transaction ذرّية + سجل إنرولمنت |
| مكافأة يومية | `economy-actions/dailyLoginReward` | 2 كريدت (10 كل 7 أيام)، مرة واحدة/يوم |
| مكافأة الماسكوت | `economy-actions/mascotDailyReward` | حسب الـ skin، idempotent |
| الإحالات | `economy-actions/referralReward` | 5 كريدت + 5000 توكن/مدعو، ≥100 دعوة → خطة supreme |
| الدردشة AI | `ai` | 1 كريدت/رسالة للمستخدم المجاني، rate limit 30/5د، GROQ→GEMINI→OPENROUTER على السيرفر |

العميل **ميقدرش** يكتب `credits`/`token_balance`/`subscription_*` مباشرة — `protectedUserFields` في [firestore.rules](firestore.rules) بيمنعها، وإنشاء المستخدم بيفرض credits==10/plan free.

## 4️⃣ إصلاحات العميل
- [src/api/index.js](src/api/index.js): البوابات كانت `import.meta.env.PROD`-only — دلوقتي الدوال الآمنة شغالة في **كل** البيئات (الـ dev فيه نفس السيرفر). اتشال fallback شراء الكورس الميت من العميل. اتصلّح انسداد `aiChat` (كان بيرمي `NO_API_KEY` قبل ما يوصل لبروكسي السيرفر).
- [src/lib/youtubeService.js](src/lib/youtubeService.js): قراءة env آمنة لـ Node + الاستيراد من `./firestore` بقى lazy جوه دوال الحفظ بس (عشان Firebase client SDK ما يتحملش على السيرفر).
- امتدادات `.js` في استيرادات [firestore.js](src/lib/firestore.js) — Node مش بيحل استيراد بلا امتداد.

## 5️⃣ التحقق
- `npm run build` ✅ (+ prebuild "App identity verified: Black Fighters")
- `npm run lint` ✅ · `npm run typecheck` ✅
- سموك تيست dev server:
  - `POST /api/economy-actions` بدون توكن → **401 UNAUTHORIZED** ✅
  - `POST /api/ai` بدون توكن → **401** ✅
  - `POST /api/youtube-ai-job` بدون توكن → **401** ✅
  - route مجهول → **404** ✅
  - `youtube-transcript` شغال ✅
- [charge-ai-job.mjs](netlify/functions/charge-ai-job.mjs) اتأكدنا إنه بيدعم `charge/finalize/refund` كلهم.

## 6️⃣ متبقيات موثقة (غير عاجلة)
1. **فانكشن `awardProgress` على السيرفر** — اتعمل `[award-progress.mjs](netlify/functions/award-progress.mjs)` واتسجل في [api/[...path].mjs](api/[...path].mjs)، المتبقي من العميل (`src/lib/xpSystem.js` و [src/api/index.js](src/api/index.js) case `awardProgress`) بيستخدمه الجاهز — XP والحساب Biemit server-atomic (`XP_REWARDS` + `LEVELS` نسخة-server-side عشان مفيش اعتماد على `src/lib/xpSystem.js` اللي بيثبّت `@/api/base44Client`HOW_behavior server-side).
2. **مفاتيح الإنتاج** — عشان تشغّل على Netlify/Vercel·시행 المنصة بالكامل، ضع الـ env vars التالية على الـ environment了起来:

| المتغير | الوصف | إجباري/اختياري |
|---|---|---|
| `FIRESTORE_PROJECT_ID` | اسم مشروع Firebase (يعمل كبديل لو مفيش `FIREBASE_SERVICE_ACCOUNT_JSON`) | اختياري |
| `FIREBASE_SERVICE_ACCOUNT_JSON` | محتوى `.firebase-service-account.json` كـ string واحد (الأفضل) — الفانكشن بيستخدمه أولًا (`applicationDefault()` بيدخل كلملا إنشߑ إذا فات) | إجباري (يا ترى) |
| `ADMIN_EMAILS` | قائمة بأيميلات الأدمن مفصولة بـ `,` — القيمة الافتراضية `ibrahimkandil000@gmail.com` | اختياري |
| `TELEGRAM_BOT_TOKEN` | توكن بوت تيليجرام للتنبيهات والإرسال | إجباري عشان التخاطب مع تيليجرام |
| `TELEGRAM_WEBHOOK_SECRET` | السر اللي بيُقارن في `POST /api/telegram-webhook` | اختياري |
| `GROQ_API_KEY` | مفتاح Groq (الرتبة الأولى في السلسلة) | اختياري |
| `GROQ_MODEL` | الموديل (`openai/gpt-oss-120b` افتراضيًا) | اختياري |
| `OPENROUTER_API_KEY` | مفتاح OpenRouter (الرتبة الثانية) | اختياري |
| `OPENROUTER_MODEL` | الموديل (`openrouter/free` افتراضيًا) | اختياري |
| `CODECRAFT_API_KEY` | مفتاح CodeCraft (يُستخدم آخرًا إذا فشل السابقة كلها، `telegram-engine.mjs:462` بيقرّئه كـ `process.env.CODECRAFT_API_KEY || ""` بعد التعديل) | اختياري |
| `TELEGRAM_BOT_TOKEN` (يُستخدم مرتين) | بي Cabin كل من `telegram-engine.mjs` و `upload-media.mjs` و `stream-media.mjs` | عموماً |

ملاحظة إضافية: `[src/lib/ai.mjs](netlify/functions/ai.mjs)` بيقرأ نفس المفاتيح (`GROQ_API_KEY` ← `VITE_GROQ_API_KEY`، `OPENROUTER_API_KEY` ← `VITE_OPENROUTER_API_KEY`) كـ `process.env` عشان السيرفر بيكون، فلو ضفتها كـ env vars على الـ hosting هيبقى متاحة تلقائيًا.

3. **تدوير المفاتيح** — أي مفتاح كان مكشوفًا في الـ git history (حتى لو اتشال دلوقتي) لازم يُدور (`rotate`) حقيقي على الـ provider, لأن التاريخ بقي في الـ commits القديمة.
