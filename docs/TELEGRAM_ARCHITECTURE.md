# بوت تيليجرام ⇄ المنصة — المعمارية

> آخر تحديث: بعد إعادة بناء طبقة تيليجرام (أمن + مزامنة ثنائية الاتجاه + درجات حقيقية).

## المبدأ

```
Telegram  ⇄  /api/telegram-webhook  ⇄  telegram-core  ⇄  Firestore  ⇄  المنصة (React)
                                              ⇅
                                  telegram-outbox  →  worker مجدول  →  رسايل للطالب
```

**Firestore هو المصدر الوحيد للحقيقة.** البوت والويب طبقتان فوق نفس البيانات، فمفيش «مزامنة» منفصلة تتعطل.

## الملفات

### الواجهة (functions)
| الملف | الوظيفة |
|---|---|
| `netlify/functions/telegram-webhook.mjs` | نقطة الدخول. **يفشل مغلقاً** (503) لو `TELEGRAM_WEBHOOK_SECRET` مش مضبوط، ويمنع تكرار التحديثات عبر `telegram_processed_updates` |
| `netlify/functions/telegram-link.mjs` | إصدار/فك كود الربط (يتطلب تسجيل دخول) |
| `netlify/functions/telegram-miniapp-auth.mjs` | التحقق من `initData` وإصدار Firebase custom token |
| `netlify/functions/telegram-upload.mjs` | رفع الملفات للسيرفر (التوكن ما بيوصلش للمتصفح أبداً) |
| `netlify/functions/telegram-manifest.mjs` | `GET` قائمة الأوامر لتوليد واجهة المساعدة |
| `netlify/functions/telegram-outbox-worker.mjs` | صرف طابور الرسائل (cron محمي بـ `CRON_SECRET`) |
| `netlify/functions/export-to-telegram.mjs` | تصدير ملخص/كويز للبوت |

### النواة (`netlify/functions/_shared/`)
| الملف | الوظيفة |
|---|---|
| `telegram-engine.mjs` | الموجّه + قدرات الذكاء الاصطناعي + لوحات المفاتيح |
| `telegram-commands.mjs` | **المصدر الواحد** لقائمة الأوامر (help + `setMyCommands` + الويب) |
| `telegram-link.mjs` | أكواد الربط: 8 حروف، استخدام واحد، صلاحية 10 دقايق |
| `telegram-quiz.mjs` | جلسات الكويز + **الدرجات الحقيقية** من `poll_answer` |
| `telegram-outbox.mjs` | طابور الإرسال + backoff + DLQ |
| `telegram-notify.mjs` | ميزانية الإشعارات (2/يوم، ساعات هدوء، opt-out، digest) |
| `telegram-sync.mjs` | العقد بين المنصة والبوت (`notifyUser`, `notifySummaryReady`, …) |
| `telegram-v5.mjs` | أدوات مؤمّنة (dedupe + التحقق من `initData`) |

## مصفوفة المزامنة

| القدرة | بوت → منصة | منصة → بوت |
|---|---|---|
| الكويزات | `poll_answer` → `telegram_quiz_sessions` → `quizAttempts` بدرجة حقيقية + XP على الإجابات الصح | تصدير كويز → `standaloneQuizzes` → `?start=quiz_<id>`؛ نتيجة كويز الويب → `notifyQuizGraded` |
| التلخيصات | ملخص البوت يُخزَّن بنفس شكل المنصة | job خلص → `notifySummaryReady` |
| المراجعة (FSRS) | نتائج المراجعة تتكتب في نفس البطاقات | `notifyReviewDue` (مرة واحدة يوميًا) |
| الاشتراك | Approve/Reject من Alpha | قبول الطلب → `notifyPaymentApproved` |
| الحساب | `/link <code>` و`/unlink` | لوحة الإعدادات: إصدار كود / فصل / تفضيلات |
| Mini App | جلسة حقيقية + كتابة موضع القراءة | روابط `doc_*`, `review_due`, `quiz_*` |

## نموذج البيانات (Firestore)

| المسار | الاستخدام | الوصول |
|---|---|---|
| `users.telegram_chat_id` / `telegram_id` | هوية الربط | **سيرفر فقط** (محمية في القواعد) |
| `users.telegram_notifications` | تفضيلات الطالب | يكتبها صاحب الحساب |
| `telegram_link_codes/{code}` | كود ربط مؤقت | سيرفر فقط |
| `telegram_outbox/{id}` | طابور الرسائل | سيرفر فقط |
| `telegram_notify_state/{uid}` | ميزانية الإشعارات | سيرفر فقط |
| `telegram_quiz_sessions/{chatId}` | جلسة الكويز والإجابات | سيرفر فقط |
| `telegram_processed_updates/{id}` | منع التكرار | سيرفر فقط |
| `quizAttempts` | الدرجات (ويب + بوت) | نفس الشكل من الجهتين |

## النشر (خطوات مطلوبة منك)

1. **ألغِ التوكن القديم** من [@BotFather](https://t.me/BotFather) وولّد واحد جديد.
   كان مكتوب صراحة في كود الواجهة (`src/lib/directUpload.js`) وشُحن لكل زائر.
2. اضبط متغيّرات البيئة على الاستضافة (Vercel/Netlify):

   ```
   TELEGRAM_BOT_TOKEN=...           # إلزامي
   TELEGRAM_WEBHOOK_SECRET=...      # إلزامي — من غيره الـwebhook يرفض كل حاجة (503)
   ALPHA_TELEGRAM_CHAT_ID=...       # شات الأدمن لتنبيهات الدفع
   TELEGRAM_BOT_USERNAME=black_fighters_bot
   APP_BASE_URL=https://blackfighters.site
   CRON_SECRET=...                  # لحماية مشغّل الطابور
   ADMIN_EMAILS=owner@example.com
   ```
3. سجّل الـwebhook وقائمة الأوامر:

   ```bash
   node scripts/telegram-setup.mjs          # setWebhook + setMyCommands + menu button
   node scripts/telegram-setup.mjs --info   # تحقق من الحالة
   ```

   السكربت يسجّل `allowed_updates: ["message", "callback_query", "poll_answer"]` — **`poll_answer` إلزامي** وإلا البوت مش هيعرف إجابة الطالب أصلاً.
4. انشر قواعد Firestore: `firebase deploy --only firestore:rules`.
5. جدولة العامل: نادِ `POST /api/telegram-outbox-worker` بـ`Authorization: Bearer $CRON_SECRET` كل 5 دقايق (Vercel Cron).

## مفاتيح الأمان (ما ينفعش تترجع)

- ❌ توكن أو chat id في أي كود واجهة — `tests/unit/telegramSecurity.test.mjs` بيفشل لو رجع.
- ❌ `/alpha` أو `/omega` أو الربط بالإيميل — أي حد كان يقدر ياخد صلاحيات الأدمن.
- ❌ `/start link_<uid>` — الـuid ظاهر في `/u/:id` فكان أي حد يقدر يربط حسابه بحساب غيره.
- ❌ `percentage: 100` وهمية — الدرجات لازم تيجي من `poll_answer`.
- ❌ `optout:` أو أمر معلن من غير معالج — `tests/unit/telegramCommands.test.mjs` بيفشل.

## وسائط كبيرة (حد معروف)

الرفع المباشر بيمر من السيرفر بحد ~3.5MB (سقف جسم الطلب على الاستضافة. الملفات الأكبر محتاجة واحدة من:
- Firebase Storage (القواعد موجودة في `storage.rules`، والمشروع فيه `VITE_FIREBASE_STORAGE_BUCKET`)، أو
- رفع مجزأ (chunked) عبر endpoint جديد.

المسار القديم (المتصفح → تيليجرام مباشرة بتوكن مكشوف) اتشال لأنه كان بيسرّب التوكن.
