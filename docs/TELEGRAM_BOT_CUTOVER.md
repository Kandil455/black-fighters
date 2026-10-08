# نقل بوت Telegram إلى @black_fighters_bot

> ⚠️ **هذا الملف اتحدّث.** طريقة الإعداد اليدوي القديمة (لصق رابط `setWebhook` من غير `allowed_updates`) بقت خطأ، لأنها كانت بتسجّل الـwebhook **من غير `poll_answer`** — يعني البوت ماكانش بيعرف إجابة الطالب أصلاً وكل الدرجات كانت 100% وهمية.
>
> **الإعداد الكامل دلوقتي في [TELEGRAM_ARCHITECTURE.md](./TELEGRAM_ARCHITECTURE.md).**

## الملخص السريع

1. **ألغِ التوكن القديم من [@BotFather](https://t.me/BotFather)** — كان مكتوب صراحة في كود الواجهة وشُحن لكل زائر.
2. اضبط في بيئة الاستضافة:
   - `TELEGRAM_BOT_TOKEN` (إلزامي)
   - `TELEGRAM_WEBHOOK_SECRET` (إلزامي — **من غيره الـwebhook بيرفض كل التحديثات بـ503** ، فشل مغلق)
   - `ALPHA_TELEGRAM_CHAT_ID`, `TELEGRAM_BOT_USERNAME`, `APP_BASE_URL`, `CRON_SECRET`
3. سجّل الـwebhook وقائمة الأوامر بالأمر:

   ```bash
   node scripts/telegram-setup.mjs
   ```

   (بيسجّل `setWebhook` + `allowed_updates` شاملة `poll_answer` + `setMyCommands` + زر الـMini App)

4. **ربط الحساب بقى بكود مش بالـuid:** الطالب يفتح الإعدادات → «ربط تيليجرام» → ياخد كود 8 حروف → يبعته للبوت `/link <CODE>`. الرابط القديم `?start=link_<uid>` اتشال لأنه كان بيسمح لأي حد يربط حسابه بحساب غيره.
5. انشر القواعد: `firebase deploy --only firestore:rules`

لا تضع token أو secret في Git ولا في أي متغيّر `VITE_*`.
