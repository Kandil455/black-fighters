# نقل بوت Telegram إلى @black_fighters_bot

تم تغيير جميع روابط الواجهة والنصوص والـAndroid والبوت إلى `@black_fighters_bot`، كما أصبح رابط المنصة الافتراضي `https://blackfighters.site`.

إذا كان هذا الحساب بوتاً جديداً (وليس مجرد تغيير username للبوت نفسه)، نفّذ الإعدادات التالية في بيئة الاستضافة قبل النشر:

1. غيّر `TELEGRAM_BOT_TOKEN` إلى token الذي أعطاه BotFather للبوت `@black_fighters_bot`.
2. اضبط `APP_BASE_URL=https://blackfighters.site`.
3. أنشئ/حدّث `TELEGRAM_WEBHOOK_SECRET` بقيمة عشوائية قوية.
4. سجّل الـwebhook الجديد عند Telegram باستخدام رابط الاستضافة الفعلي:

```text
https://api.telegram.org/bot<TOKEN>/setWebhook?url=https://blackfighters.site/api/telegram-webhook&secret_token=<SECRET>
```

5. اختبر من Telegram: `/start` ثم افتح رابط ربط الحساب من صفحة Profile، وتأكد أن عملية التصدير تصل للبوت الجديد.

لا تضع token أو secret في Git أو في ملفات الواجهة `VITE_*`.
