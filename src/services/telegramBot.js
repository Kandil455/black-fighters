/**
 * telegramBot.js — Black Fighters Telegram Bot Core Service
 * Realm: Zeta | Crafted for Alpha
 */

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// SECURITY: the bot token is a SERVER-ONLY secret. It must never be bundled
// into client JavaScript (a hardcoded fallback here leaked the token to every
// visitor). Client code may only talk to Telegram through the server functions
// (export-to-telegram / telegram-webhook / submit-payment).

export function getBotToken() {
  const token = (
    (typeof process !== "undefined" && process.env?.TELEGRAM_BOT_TOKEN) ||
    (typeof import.meta !== "undefined" && import.meta.env?.TELEGRAM_BOT_TOKEN) ||
    ""
  );
  return token && /^\d+:[A-Za-z0-9_-]+$/.test(token.trim()) ? token.trim() : "";
}

export function getAlphaChatId() {
  const id = (
    (typeof process !== "undefined" && process.env?.ALPHA_TELEGRAM_CHAT_ID) ||
    (typeof import.meta !== "undefined" && import.meta.env?.ALPHA_TELEGRAM_CHAT_ID) ||
    ""
  );
  return id && /^\d+$/.test(id.trim()) ? id.trim() : "";
}

export function getAppBaseUrl() {
  return (
    (typeof process !== "undefined" && process.env?.APP_BASE_URL) ||
    (typeof import.meta !== "undefined" && import.meta.env?.VITE_APP_URL) ||
    "https://blackfighters.site"
  );
}

/**
 * Low-level Telegram API invoker
 */
export async function callTelegramApi(method, payload, customToken = null) {
  const token = customToken || getBotToken();
  if (!token) {
    console.warn("[TelegramBot] Missing bot token.");
    return { ok: false, description: "NO_BOT_TOKEN" };
  }

  try {
    const res = await fetch(`${TELEGRAM_API_BASE}${token}/${method}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    return await res.json();
  } catch (error) {
    console.error(`[TelegramBot] callTelegramApi(${method}) error:`, error);
    return { ok: false, description: error.message };
  }
}

/**
 * Send aesthetic formatted message with inline keyboard
 */
export async function sendStyledMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApi("sendMessage", payload);
}

/**
 * Send photo with caption and inline keyboard
 */
export async function sendStyledPhoto(chatId, photoUrl, caption, replyMarkup = null) {
  const token = getBotToken();
  if (!token) {
    console.warn("[TelegramBot] Missing bot token.");
    return { ok: false, description: "NO_BOT_TOKEN" };
  }

  // 1. Direct high-speed multipart/form-data upload for Base64 DataURLs (bypasses serverless overhead)
  if (photoUrl && typeof photoUrl === "string" && photoUrl.startsWith("data:image")) {
    try {
      const match = photoUrl.match(/^data:([^;]+);base64,(.+)$/);
      if (match) {
        const mimeType = match[1];
        const base64Data = match[2];
        const byteCharacters = atob(base64Data);
        const byteNumbers = new Array(byteCharacters.length);
        for (let i = 0; i < byteCharacters.length; i++) {
          byteNumbers[i] = byteCharacters.charCodeAt(i);
        }
        const byteArray = new Uint8Array(byteNumbers);
        const blob = new Blob([byteArray], { type: mimeType });

        const formData = new FormData();
        formData.append("chat_id", chatId);
        formData.append("photo", blob, `question_${Date.now()}.jpg`);
        if (caption) {
          formData.append("caption", caption);
          formData.append("parse_mode", "HTML");
        }
        if (replyMarkup) {
          formData.append("reply_markup", typeof replyMarkup === "string" ? replyMarkup : JSON.stringify(replyMarkup));
        }

        const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendPhoto`, {
          method: "POST",
          body: formData,
        });
        return await res.json();
      }
    } catch (err) {
      console.warn("[TelegramBot] Direct FormData photo send failed, attempting URL fallback:", err.message);
    }
  }

  // 2. Prepend base URL for relative paths (/api/stream-media...)
  let finalPhoto = photoUrl;
  if (finalPhoto && typeof finalPhoto === "string" && finalPhoto.startsWith("/")) {
    const base = getAppBaseUrl();
    finalPhoto = `${base.replace(/\/+$/, "")}${finalPhoto}`;
  }

  const payload = {
    chat_id: chatId,
    photo: finalPhoto,
    caption,
    parse_mode: "HTML",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApi("sendPhoto", payload, token);
}

/**
 * Answer callback query (stops spinner on button)
 */
export async function answerCallback(callbackQueryId, text = "", showAlert = false) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
}

/**
 * Universal option index resolver for multi-platform quiz sync
 */
export function resolveCorrectOptionIndex(q, rawOptions = []) {
  if (!q) return 0;
  const options = Array.isArray(rawOptions)
    ? rawOptions.map((opt) => (typeof opt === "object" ? opt.text || opt.label : String(opt)))
    : [];

  // 1. Direct numeric index fields
  const numericCandidates = [q.correct_index, q.correctIndex, q.correct, q.correct_answer, q.correctOption, q.answer];
  for (const candidate of numericCandidates) {
    if (typeof candidate === "number" && !isNaN(candidate) && candidate >= 0 && (options.length === 0 || candidate < options.length)) {
      return candidate;
    }
    if (typeof candidate === "string" && /^\d+$/.test(candidate.trim())) {
      const parsed = parseInt(candidate.trim(), 10);
      if (parsed >= 0 && (options.length === 0 || parsed < options.length)) {
        return parsed;
      }
    }
  }

  // 2. Letter representation e.g. "A", "B", "C", "D"
  const letterCandidates = [q.correct_answer, q.correct_letter, q.answer, q.correctOption];
  for (const val of letterCandidates) {
    if (typeof val === "string") {
      const trimmed = val.trim().toUpperCase();
      if (/^[A-J]$/.test(trimmed)) {
        const idx = trimmed.charCodeAt(0) - 65;
        if (idx >= 0 && (options.length === 0 || idx < options.length)) return idx;
      }
    }
  }

  // 3. String matching option text
  if (options.length > 0) {
    for (const val of [q.correct_answer, q.answer]) {
      if (typeof val === "string" && val.trim()) {
        const target = val.trim().toLowerCase();
        const idx = options.findIndex((opt) => {
          const optStr = String(opt).trim().toLowerCase();
          return optStr === target || optStr.includes(target) || target.includes(optStr);
        });
        if (idx >= 0) return idx;
      }
    }
  }

  return 0;
}

/**
 * Send native Telegram Quiz Poll
 */
export async function sendNativeQuizPoll(chatId, { question, options, correctOptionId, explanation, replyMarkup, openPeriod }) {
  const payload = {
    chat_id: chatId,
    question: String(question || "سؤال").slice(0, 300),
    options: (options || ["A", "B", "C", "D"]).slice(0, 10).map((opt) => String(opt).slice(0, 100)),
    type: "quiz",
    correct_option_id: typeof correctOptionId === "number" ? correctOptionId : 0,
    is_anonymous: false,
    explanation: String(explanation || "إجابة صحيحة وممتازة!").slice(0, 200),
  };
  const timer = Number(openPeriod);
  if (timer >= 5 && timer <= 600) {
    payload.open_period = timer;
  }
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApi("sendPoll", payload);
}

/**
 * High-fidelity quiz and summary export to Telegram
 */
export async function sendExportToTelegram({ chatId, title = "محتوى دراسي", type = "summary", summaryText = "", questions = [], quizId = null, onProgress = null }) {
  if (!chatId) return { ok: false, error: "NO_CHAT_ID" };

  if (type === "summary") {
    const header = `📚 <b>تصدير ملخص من Black Fighters: ${title}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    const cleanText = String(summaryText).replace(/<[^>]*>?/gm, "").slice(0, 3800);
    const fullMsg = `${header}${cleanText}\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ <i>تم التصدير من منصة Black Fighters بنجاح</i>`;
    return sendStyledMessage(chatId, fullMsg);
  }

  if (type === "quiz" && questions.length > 0) {
    const appUrl = getAppBaseUrl();
    const activeQuizId = quizId || `exp_${Date.now()}`;
    const startUrl = `${appUrl}/q/${activeQuizId}`;

    const launchCard = `
🎯 <b>تم تجهيز كويز الـ OSCE بنجاح يا محارب!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
📌 <b>العنوان:</b> ${title}
📝 <b>عدد الأسئلة:</b> <b>${questions.length} سؤال</b>
🔬 <b>النظام:</b> سلايدات سريرية + أسئلة Quiz تفاعلية 🩻
━━━━━━━━━━━━━━━━━━━━
⏱️ <b>اختر نظام المؤقت وابدأ الحل فوراً:</b>
    `.trim();

    const keyboard = {
      inline_keyboard: [
        [
          { text: "⏱️ بدون مؤقت", callback_data: `run_custom_quiz:${activeQuizId}:0:0` },
          { text: "⚡ 30 ثانية", callback_data: `run_custom_quiz:${activeQuizId}:0:30` },
          { text: "⏳ 60 ثانية", callback_data: `run_custom_quiz:${activeQuizId}:0:60` },
        ],
        [
          { text: "🚀 ابدأ الكويز الآن (بدون مؤقت)", callback_data: `run_custom_quiz:${activeQuizId}:0:0` },
        ],
        [
          { text: "🌐 حل الكويز بالموقع", url: startUrl },
          { text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" },
        ],
      ],
    };

    if (typeof onProgress === "function") {
      try { onProgress(questions.length, questions.length); } catch {}
    }

    const res = await sendStyledMessage(chatId, launchCard, keyboard);
    return { ok: true, sent: questions.length, quizId: activeQuizId, res };
  }

  return { ok: false, error: "INVALID_EXPORT_TYPE" };
}

/**
 * Build Sovereign Main Menu Inline Keyboard
 */
export function buildMainMenuKeyboard(webAppUrl = null) {
  const appUrl = webAppUrl || getAppBaseUrl();
  return {
    inline_keyboard: [
      [
        {
          text: "🚀 فتح التطبيق بالكامل (Mini App)",
          web_app: { url: appUrl },
        },
      ],
      [
        { text: "🚨 Emergency (جامعة شرق بورسعيد الأهلية)", callback_data: "cmd_emergency" },
      ],
      [
        { text: "⚡ كويز سريع وتحدي", callback_data: "cmd_quiz" },
        { text: "🧠 ملخص ذكي (AI)", callback_data: "cmd_summary" },
      ],
      [
        { text: "👤 بروفايلي ورصيدي", callback_data: "cmd_profile" },
        { text: "💎 خطط الاشتراكات", callback_data: "cmd_plans" },
      ],
      [
        { text: "💬 تحدث مع توجي AI", callback_data: "cmd_toji" },
        { text: "👑 لوحة الشرف (Leaderboard)", callback_data: "cmd_leaderboard" },
      ],
    ],
  };
}

/**
 * Send Instant Payment Alert to Alpha's Telegram
 */
export async function sendPaymentAlertToAlpha({
  requestId,
  userName = "مستخدم جديد",
  userEmail = "",
  method = "vodafone_cash",
  amount = 0,
  productType = "subscription",
  planName = "Plus",
  senderNumber = "",
  screenshotUrl = "",
}) {
  const alphaChatId = getAlphaChatId();
  if (!alphaChatId) {
    console.warn("[TelegramBot] No Alpha chat ID configured for alerts.");
    return null;
  }

  const caption = `
⚡ <b>إشعار دفع جديد يا قائدنا Alpha!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
👤 <b>المستخدم:</b> ${userName} (${userEmail || "بدون بريد"})
💳 <b>طريقة التحويل:</b> ${method.toUpperCase()}
📱 <b>رقم المحول:</b> <code>${senderNumber}</code>
💰 <b>المبلغ:</b> <b>${amount} EGP</b>
📦 <b>المنتج:</b> ${productType === "credits" ? "باقة كريدتس" : `اشتراك ${planName}`}
🆔 <b>كود الطلب:</b> <code>${requestId}</code>
━━━━━━━━━━━━━━━━━━━━
<i>اختر قرارك السيادي فوراً من الأزرار أدناه:</i>
  `.trim();

  const appUrl = getAppBaseUrl();
  const keyboard = {
    inline_keyboard: [
      [
        { text: "✅ تفعيل مباشر (Direct)", callback_data: `alpha_approve_direct:${requestId}` },
        { text: "🎫 توليد كود تفعيل (Code)", callback_data: `alpha_approve_code:${requestId}` },
      ],
      [
        { text: "❌ رفض وحذف الطلب", callback_data: `alpha_reject:${requestId}` },
      ],
      [
        { text: "🌐 فتح لوحة الأدمن", url: `${appUrl}/admin` },
      ],
    ],
  };

  // Resolve normalized photo URL or DataURL
  let targetPhoto = screenshotUrl;
  if (targetPhoto && typeof targetPhoto === "string" && targetPhoto.startsWith("/")) {
    targetPhoto = `${appUrl.replace(/\/+$/, "")}${targetPhoto}`;
  }

  // 1. Try sending as photo (handles HTTP/HTTPS and data:image via sendStyledPhoto)
  if (targetPhoto && (targetPhoto.startsWith("http://") || targetPhoto.startsWith("https://") || targetPhoto.startsWith("data:image"))) {
    try {
      const res = await sendStyledPhoto(alphaChatId, targetPhoto, caption, keyboard);
      if (res && res.ok) return res;
      console.warn("[TelegramBot] sendStyledPhoto was not ok, falling back to message:", res?.description);
    } catch (e) {
      console.warn("[TelegramBot] sendStyledPhoto failed:", e.message);
    }
  }

  // 2. Always deliver structured text alert with sovereign approval buttons as fallback
  const safeLink = targetPhoto && (targetPhoto.startsWith("http://") || targetPhoto.startsWith("https://")) ? targetPhoto : null;
  const textWithNote = safeLink
    ? `${caption}\n\n📸 <b><a href="${safeLink}">اضغط هنا لمشاهدة إيصال التحويل 🖼️</a></b>`
    : `${caption}\n\n📸 <i>إيصال التحويل مرفوع في لوحة الأدمن — اضغط الزر أدناه للمراجعة المباشرة</i>`;

  return sendStyledMessage(alphaChatId, textWithNote, keyboard);
}

/**
 * Handle incoming Telegram webhook updates
 */
export async function handleTelegramUpdate(update, paymentProcessor = null) {
  if (!update) return { ok: true };

  // Handle Callback Queries (Button Clicks)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const data = cb.data || "";

    // Alpha Sovereign Payment Decision Handling
    if (data.startsWith("alpha_approve_") || data.startsWith("alpha_reject:")) {
      await answerCallback(cb.id, "⚡ جارٍ تنفيذ أمرك يا Alpha...");
      const isReject = data.startsWith("alpha_reject:");
      const mode = data.startsWith("alpha_approve_code") ? "code" : "direct";
      const requestId = data.split(":")[1];

      try {
        if (paymentProcessor) {
          const res = await paymentProcessor({
            requestId,
            action: isReject ? "reject" : "approve",
            deliveryMode: mode,
            adminNote: "معتمد سيادياً عبر بوت التيليجرام بواسطة Alpha",
            reviewerId: "alpha_telegram",
          });

          if (res.alreadyHandled) {
            return sendStyledMessage(
              chatId,
              `⚠️ <b>تنبيه يا Alpha:</b>\nالطلب <code>${requestId}</code> تم التعامل معه مسبقاً وحالته: <b>${res.status}</b>.`
            );
          }

          if (isReject) {
            return sendStyledMessage(
              chatId,
              `❌ <b>تم تنفيذ أمر الرفض يا Alpha:</b>\nتم رفض الطلب <code>${requestId}</code> للطالب <b>${res.userName || "مستخدم"}</b> وحفظ الرفض في قاعدة البيانات فوراً!`
            );
          }

          if (mode === "code") {
            return sendStyledMessage(
              chatId,
              `👑 <b>تم تنفيذ أمرك يا Alpha بنجاح:</b>\n🎫 <b>كود التفعيل المتولد:</b> <code>${res.code}</code>\n👤 <b>للطالب:</b> ${res.userName}\n📦 <b>الباقة:</b> ${res.productName}\n💰 <b>المبلغ:</b> ${res.amount} EGP\n<i>الكود تسجل في حسابه ويقدر يفعله الآن!</i>`
            );
          }

          return sendStyledMessage(
            chatId,
            `👑 <b>تم تنفيذ أمرك والتفعيل المباشر يا Alpha!</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>المستخدم:</b> ${res.userName}\n📦 <b>الاشتراك:</b> ${res.productName}\n⚡ <b>الرصيد المشحون:</b> +${res.addedCredits} كريدت\n💰 <b>المبلغ:</b> ${res.amount} EGP\n<i>حساب الطالب اترقى وشغال فوراً!</i>`
          );
        }

        return sendStyledMessage(
          chatId,
          `👑 <b>أمرك نافذ يا Alpha:</b>\nتم استلام الطلب <code>${requestId}</code> بالإجراء: <b>${isReject ? "الرفض ❌" : `القبول (${mode}) ✅`}</b>`
        );
      } catch (err) {
        return sendStyledMessage(
          chatId,
          `⚠️ <b>حصل خطأ أثناء تنفيذ الأمر يا Alpha:</b>\n<code>${err.message}</code>`
        );
      }
    }

    // Student Menu Actions
    if (data === "cmd_quiz") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `🎯 <b>اختر كويز التحدي الآن:</b>\nحل الأسئلة واربح نقاط XP تتسجل في حسابك فوراً!`,
        {
          inline_keyboard: [
            [{ text: "⚡ كويز فارماكولوجي (Pharm)", callback_data: "start_quiz_pharm" }],
            [{ text: "🧬 كويز باثولوجي (Patho)", callback_data: "start_quiz_patho" }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (data === "cmd_plans") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `💎 <b>باقات واشتراكات Black Fighters:</b>\n\n• <b>Starter:</b> 150 EGP / شهر (100 كويز + تلخيص الذكاء الاصطناعي)\n• <b>Plus 👑:</b> 250 EGP / شهر (كويزات غير محدودة + بنك أسئلة الكليات)\n• <b>Pro 🚀:</b> 400 EGP / شهر (جميع المميزات + بوت الأسئلة الخاص)\n\nللترقية يمكنك فتح التطبيق أو التحويل على فودافون كاش مباشرة!`,
        {
          inline_keyboard: [
            [{ text: "🚀 ترقية حسابي في التطبيق", web_app: { url: `${getAppBaseUrl()}/subscriptions` } }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (data === "cmd_profile") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `👤 <b>بيانات المحارب الأكاديمية:</b>\n\n• <b>المعرف:</b> @${cb.from?.username || "Warrior"}\n• <b>الرتبة الحالية:</b> Elite Fighter ⚔️\n• <b>رصيد الكريدتس:</b> 4 كريدت مجانية 🪙\n• <b>الـ XP:</b> 1250 XP ⚡\n\nاضغط على الزر أدناه لتصفح ملفك الشخصي بالكامل:`,
        {
          inline_keyboard: [
            [{ text: "فتح ملفي الشخصي 🛡️", web_app: { url: `${getAppBaseUrl()}/profile` } }],
            [{ text: "🔙 رجوع", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (data === "cmd_emergency") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `🚨 <b>قسم الطوارئ الأكاديمي — جامعة شرق بورسعيد الأهلية (EPNU)</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\nمرحباً بكم يا أبطال جامعة شرق بورسعيد الأهلية! 🎓🏛️\nهذا القسم مُخصص ومُعد بإشراف القائد <b>Alpha</b> حصرياً لرفع:\n• 📑 ملخصات وملازم الطوارئ وليالي الامتحان.\n• 🎯 بنك أسئلة وتجميعات امتحانات سابقة وكويزات متوقعة للجامعة.\n• ⚡ كويزات تدريبية فورية مخصصة لمقرراتكم الدراسية.`,
        {
          inline_keyboard: [
            [{ text: "🧠 بدء كويز تدريبي لطوارئ EPNU", callback_data: "cmd_quiz" }],
            [{ text: "📂 فتح بنك التلخيص والملخصات بالمنصة", web_app: { url: `${getAppBaseUrl()}/summary` } }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (data === "cmd_menu") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `⚔️ <b>القائمة الرئيسية لمنصة Black Fighters:</b>`,
        buildMainMenuKeyboard()
      );
    }

    await answerCallback(cb.id);
    return { ok: true };
  }

  // Handle Text Messages
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || "").trim();

    if (text.startsWith("/emergency") || text.toLowerCase() === "emergency" || text.includes("طوارئ") || text.includes("شرق بورسعيد")) {
      return sendStyledMessage(
        chatId,
        `🚨 <b>قسم الطوارئ الأكاديمي — جامعة شرق بورسعيد الأهلية (EPNU)</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\nمرحباً بكم يا أبطال جامعة شرق بورسعيد الأهلية! 🎓🏛️\nهذا القسم مُخصص ومُعد بإشراف القائد <b>Alpha</b> حصرياً لمقرراتكم وملفاتكم وكويزاتكم! ⚡`,
        {
          inline_keyboard: [
            [{ text: "🧠 بدء كويز تدريبي لطوارئ EPNU", callback_data: "cmd_quiz" }],
            [{ text: "📂 فتح بنك التلخيص والملخصات بالمنصة", web_app: { url: `${getAppBaseUrl()}/summary` } }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (text.startsWith("/start")) {
      const welcome = `
⚔️ <b>أهلاً بك في منصة Black Fighters الرسمية!</b> ⚔️
━━━━━━━━━━━━━━━━━━━━
أقوى مساعد أكاديمي مدعوم بالذكاء الاصطناعي في مجرة زيتا:
• 🎯 حل ومراجعة الكويزات الذكية
• 📚 تلخيص المحاضرات والـ PDF المعقدة
• 🏆 منافسة زملائك على صدارة الكلية
• ⚡ شات فوري مع مساعد توجي الأكاديمي

<i>اختر ما تريده من الأزرار أدناه للبدء فوراً:</i>
      `.trim();
      return sendStyledMessage(chatId, welcome, buildMainMenuKeyboard());
    }

    if (text.startsWith("/quiz")) {
      return sendStyledMessage(
        chatId,
        `⚡ <b>كويز فوري:</b>\nاختر مجالك للبدء:`,
        {
          inline_keyboard: [
            [{ text: "🚀 فتح بنك الكويزات الكامل", web_app: { url: `${getAppBaseUrl()}/quizzes` } }],
          ],
        }
      );
    }

    // Default AI Response for questions
    if (text) {
      const reply = `
🧠 <b>Black Fighters AI استلم سؤالك:</b>
"<i>${text}</i>"

💡 للمزيد من الشرح العميق وحل المسائل المعقدة، افتح التطبيق مباشرة وتحدث مع المساعد بحرية كاملة:
      `.trim();
      return sendStyledMessage(chatId, reply, {
        inline_keyboard: [
          [{ text: "💬 فتح شات Black Fighters AI", web_app: { url: `${getAppBaseUrl()}/dashboard` } }],
        ],
      });
    }
  }

  return { ok: true };
}
