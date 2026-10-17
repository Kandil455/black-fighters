import {
  getBotUsername,
  getBotToken,
  getAppBaseUrl,
  callTelegramApi,
  sendStyledMessage,
} from "./_shared/telegram-engine.mjs";
import { COMMANDS, NOTIFICATION_TYPES, telegramMenuCommands } from "./_shared/telegram-commands.mjs";
import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";

/**
 * GET / POST /api/telegram-manifest
 *
 * - GET: Public machine-readable manifest of bot commands, notification types,
 *        and non-secret connection status.
 * - POST: Authenticated bot management, live diagnostics, command menu sync,
 *         instant test notification, and interactive command simulator.
 */

function buildCommandSimulation(commandInput = "/start", topicInput = "", userProfile = {}) {
  const cleanCmd = String(commandInput || "/start").trim().split(/\s+/)[0].toLowerCase();
  const argText = String(topicInput || commandInput.replace(/^\S+\s*/, "")).trim();
  const appUrl = getAppBaseUrl();
  const userName = userProfile?.full_name || userProfile?.display_name || "محارب Black Fighters";

  switch (cleanCmd) {
    case "/start":
    case "/menu":
      return {
        title: "القائمة الرئيسية لبوت Black Fighters",
        html: [
          `⚡ <b>أهلاً بك يا ${userName} في مركز قيادة Black Fighters!</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          "🤖 <b>البوت متزامن بالكامل مع حسابك في المنصة:</b>",
          "• 📚 إرسال وتلخيص المحاضرات والملفات مباشرة من الشات",
          "• 🎯 كويزات نظري (EBE) وعملي بالصور (OSPE) بنظام Quiz Polls",
          "• 🧠 بطاقات تسميع ذاتي (FSRS) وتنبيهات المراجعة اليومية",
          "• 🏆 مزامنة فورية لنقاط الـ XP والـ Streak وبنك الأخطاء",
          "━━━━━━━━━━━━━━━━━━━━",
          "<i>اختر من الأزرار الذكية بالأسفل أو اكتب الأمر مباشرة:</i>",
        ].join("\n"),
        buttons: [
          [
            { text: "📱 فتح التطبيق المصغر (Mini App)", url: `${appUrl}/tg` },
            { text: "📚 تلخيص ذكي (/summary)", callback_data: "cmd_summary" },
          ],
          [
            { text: "🎯 كويز نظري (/quiz)", callback_data: "cmd_ebe" },
            { text: "🔬 كويز عملي (/ospe)", callback_data: "cmd_ospe" },
          ],
          [
            { text: "🎙️ اختبار شفوي (/grill_me)", callback_data: "cmd_grill" },
            { text: "📅 خطة مذاكرة (/plan)", callback_data: "cmd_plan" },
          ],
        ],
      };

    case "/summary":
    case "/تلخيص": {
      const subject = argText || "Acute Coronary Syndrome & ECG Localization";
      return {
        title: `ملخص ذكي فوري: ${subject}`,
        html: [
          `📚 <b>كبسولة الملخص الذكي: ${subject}</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          "🟢 <b>المفهوم الأساسي (Core Concept):</b>",
          `• يعتمد التشخيص السريع في <b>${subject}</b> على الربط بين الأعراض السريرية وتغيرات الـ ECG والإنزيمات القلبية خلال أول ١٠ دقائق.`,
          "",
          "📊 <b>جدول المقارنة السريع (High-Yield Localization):</b>",
          "• <code>Leads II, III, aVF</code> ← <b>Inferior Wall</b> (Right Coronary Artery - RCA)",
          "• <code>Leads V1–V4</code> ← <b>Anteroseptal Wall</b> (LAD Artery)",
          "• <code>Leads I, aVL, V5–V6</code> ← <b>Lateral Wall</b> (Left Circumflex - LCx)",
          "",
          "⚠️ <b>تنبيه امتحانات (Exam Trap):</b>",
          "• تجنب إعطاء Nitrates في حالة <b>Right Ventricular Infarction</b> لأنها تسبب هبوطاً حاداً في الضغط (Preload dependent).",
          "━━━━━━━━━━━━━━━━━━━━",
          "📎 <i>يمكنك تصدير المذكرة الكاملة كملف HTML للطباعة أو بدء كويز فوري على هذا الملخص.</i>",
        ].join("\n"),
        buttons: [
          [
            { text: "🎯 اختبرني في هذا الملخص (3 أسئلة)", callback_data: "cmd_ebe" },
            { text: "📱 فتح في القارئ التفاعلي", url: `${appUrl}/tg` },
          ],
        ],
      };
    }

    case "/quiz":
    case "/ebe":
      return {
        title: "كويز نظري تفاعلي (EBE Quiz Poll)",
        html: [
          "🎯 <b>سؤال كويز نظري (EBE High-Yield):</b>",
          "━━━━━━━━━━━━━━━━━━━━",
          "<b>A 45-year-old male presents with crushing substernal chest pain. ECG shows ST elevation in leads II, III, and aVF. Which coronary artery is occluded?</b>",
          "",
          "A) Left Anterior Descending (LAD)",
          "B) Left Circumflex (LCx)",
          "C) <b>Right Coronary Artery (RCA)</b> ✅",
          "D) Left Main Coronary Artery",
          "━━━━━━━━━━━━━━━━━━━━",
          "💡 <b>التفسير العلمي:</b> Inferior STEMI (leads II, III, aVF) is supplied by the Right Coronary Artery (RCA) in ~85% of patients. (+20 XP)",
        ].join("\n"),
        buttons: [
          [
            { text: "⚡ إرسال كـ Quiz Poll في الشات", callback_data: "cmd_ebe" },
            { text: "🌐 فتح بنك الكويزات", url: `${appUrl}/quizzes` },
          ],
        ],
      };

    case "/ospe":
      return {
        title: "كويز عملي وسلايدات سريرية (OSPE Station)",
        html: [
          "🔬 <b>محطة الاختبار العملي (OSPE Visual Station):</b>",
          "━━━━━━━━━━━━━━━━━━━━",
          "📌 <b>الشريحة:</b> Histopathology & Radiology Station",
          "❓ <b>السؤال:</b> What is the primary radiological finding visible on a chest radiograph with blunted right costophrenic angle and meniscus sign?",
          "✅ <b>الإجابة النموذجية:</b> Pleural Effusion",
          "💡 <b>الشرح:</b> Blunting of the costophrenic angle with a concave upper border (meniscus sign) is classic for fluid accumulation in the pleural space.",
        ].join("\n"),
        buttons: [
          [
            { text: "🔬 بدء محطة OSPE كاملة", callback_data: "cmd_ospe" },
            { text: "📱 فتح الميني آب", url: `${appUrl}/tg` },
          ],
        ],
      };

    case "/grill-me":
    case "/grill_me":
    case "/شفوي": {
      const subject = argText || "Pharmacology & Clinical Medicine";
      return {
        title: `لجنة اختبار شفوي سريعة: ${subject}`,
        html: [
          `🎙️ <b>لجنة الاختبار الشفوي الذكي (Oral Grill): ${subject}</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          "👨‍⚕️ <b>سؤال الممتحن الأول:</b>",
          "«لو مريض ماشي على Warfarin وبدأ ياخد Fluconazole، إيه التفاعل الدوائي المتوقع وإزاي هتابعه؟»",
          "",
          "✅ <b>النقاط المطلوبة في إجابتك:</b>",
          "1. تثبيط إنزيم <code>CYP2C9</code> المسؤول عن تكسير الـ S-isomer النشط للوارفارين.",
          "2. ارتفاع خطير في الـ <code>INR</code> وزيادة احتمالية النزيف.",
          "3. تقليل جرعة الوارفارين ومتابعة الـ INR عن قرب.",
        ].join("\n"),
        buttons: [
          [
            { text: "🔥 سؤال شفوي أصعب", callback_data: "cmd_grill" },
            { text: "📱 فتح وضع الاستدعاء النشط", url: `${appUrl}/tg` },
          ],
        ],
      };
    }

    case "/plan":
    case "/خطة": {
      const subject = argText || "مراجعة المنهج قبل الامتحان";
      return {
        title: `خطة مذاكرة ذكية: ${subject}`,
        html: [
          `📅 <b>خطة المذاكرة التفاعلية: ${subject}</b>`,
          "━━━━━━━━━━━━━━━━━━━━",
          "⏱️ <b>الفترة الأولى (٤٥ دقيقة):</b> قراءة البطاقات الذكية والجداول المقارنة في الملخص.",
          "🧠 <b>الفترة الثانية (٢٥ دقيقة):</b> تفعيل وضع التسميع الذاتي (إخفاء المصطلحات) وتقييم FSRS.",
          "🎯 <b>الفترة الثالثة (٢٠ دقيقة):</b> حل ٢٠ سؤال كويز نظري ومراجعة الأخطاء في بنك الأخطاء.",
          "━━━━━━━━━━━━━━━━━━━━",
          "🔔 <i>سيقوم البوت بتذكيرك بموعد المراجعة القادمة تلقائياً.</i>",
        ].join("\n"),
        buttons: [
          [
            { text: "🚀 بدء الجلسة الأولى الآن", url: `${appUrl}/dashboard` },
          ],
        ],
      };
    }

    default:
      return {
        title: "دليل أوامر بوت Black Fighters",
        html: [
          "🤖 <b>قائمة الأوامر المتاحة في البوت:</b>",
          "━━━━━━━━━━━━━━━━━━━━",
          ...COMMANDS.filter((c) => c.scope === "student").map(
            (c) => `• <code>${c.command}</code> — ${c.descriptionAr}`,
          ),
        ].join("\n"),
        buttons: [
          [{ text: "📱 فتح التطبيق المصغر", url: `${appUrl}/tg` }],
        ],
      };
  }
}

export const handler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return json(200, { ok: true });
  }

  const botUsername = getBotUsername();
  const token = getBotToken();
  const webhookSecretConfigured = Boolean(String(process.env.TELEGRAM_WEBHOOK_SECRET || "").trim());
  const appBaseUrl = getAppBaseUrl();

  if (event.httpMethod === "GET") {
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": "public, max-age=60",
      },
      body: JSON.stringify({
        ok: true,
        botUsername,
        botUrl: `https://t.me/${botUsername}`,
        miniAppPath: "/tg",
        miniAppUrl: `${appBaseUrl.replace(/\/+$/, "")}/tg`,
        botConfigured: Boolean(token),
        webhookSecretConfigured,
        commands: COMMANDS,
        notificationTypes: NOTIFICATION_TYPES,
      }),
    };
  }

  if (event.httpMethod !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const { action = "diagnostics" } = body;

    let userDoc = null;
    if (adminDb && user?.uid) {
      const snap = await adminDb.collection("users").doc(user.uid).get();
      if (snap.exists) userDoc = snap.data();
    }
    const chatId = userDoc?.telegram_chat_id || null;

    if (action === "diagnostics") {
      let botInfo = null;
      let webhookInfo = null;
      if (token) {
        const [meRes, whRes] = await Promise.all([
          callTelegramApi("getMe", {}),
          callTelegramApi("getWebhookInfo", {}),
        ]);
        if (meRes?.ok) botInfo = meRes.result;
        if (whRes?.ok) webhookInfo = whRes.result;
      }
      return json(200, {
        ok: true,
        botUsername: botInfo?.username || botUsername,
        botUrl: `https://t.me/${botInfo?.username || botUsername}`,
        botConfigured: Boolean(token),
        webhookSecretConfigured,
        linked: Boolean(chatId),
        chatId: chatId ? `***${String(chatId).slice(-4)}` : null,
        botInfo: botInfo
          ? { id: botInfo.id, first_name: botInfo.first_name, username: botInfo.username }
          : null,
        webhookInfo: webhookInfo
          ? {
              url: webhookInfo.url || "",
              has_custom_certificate: Boolean(webhookInfo.has_custom_certificate),
              pending_update_count: Number(webhookInfo.pending_update_count || 0),
              last_error_message: webhookInfo.last_error_message || null,
            }
          : null,
      });
    }

    if (action === "sync_commands") {
      const menu = telegramMenuCommands();
      if (!token) {
        return json(200, {
          ok: true,
          synced: false,
          localPreview: true,
          commandsCount: menu.length,
          message: "تم التحقق من قائمة الأوامر محلياً (١٤ أمر جاهز) — أضف TELEGRAM_BOT_TOKEN في البيئة لنشرها على خوادم تيليجرام.",
        });
      }
      const res = await callTelegramApi("setMyCommands", { commands: menu });
      return json(200, {
        ok: Boolean(res?.ok),
        synced: Boolean(res?.ok),
        commandsCount: menu.length,
        message: res?.ok
          ? `تم تحديث قائمة أوامر البوت (${menu.length} أمر) في تيليجرام بنجاح ✅`
          : `تعذر تحديث الأوامر: ${res?.description || "خطأ غير معروف"}`,
      });
    }

    if (action === "test_notification") {
      const noteType = body.notificationType || "summary_ready";
      const sampleMessages = {
        summary_ready: `📚 <b>تنبيه فوري من Black Fighters!</b>\n━━━━━━━━━━━━━━━━━━━━\n✨ الملخص الذكي الجديد جاهز الآن للمذاكرة بنظام البطاقات والجداول والتسميع الذاتي.\n\n⚡ <i>اضغط بالأسفل لفتح الملخص أو بدء كويز سريع عليه:</i>`,
        review_due: `🧠 <b>موعد المراجعة المتباعدة (FSRS)!</b>\n━━━━━━━━━━━━━━━━━━━━\nلديك بطاقات ومصطلحات مستحقة للمراجعة اليوم لتثبيتها في الذاكرة طويلة المدى قبل نسيانها.`,
        quiz_graded: `🏆 <b>تقرير أداء الكويز الذكي!</b>\n━━━━━━━━━━━━━━━━━━━━\nتم تحديث نقاط الخبرة (XP) وإضافة الأسئلة التي تحتاج لمراجعة إلى <b>بنك الأخطاء الذكي</b>.`,
        streak: `🔥 <b>حافظ على سلسلة أيام المذاكرة (Streak)!</b>\n━━━━━━━━━━━━━━━━━━━━\nأكمل مهمة واحدة اليوم (ملخص أو ٥ أسئلة كويز) للحفاظ على الـ Streak الخاص بك ورفع ترتيبك في لوحة المتصدرين!`,
      };
      const text = sampleMessages[noteType] || sampleMessages.summary_ready;
      const keyboard = {
        inline_keyboard: [
          [
            { text: "📱 فتح الميني آب", url: `${appBaseUrl.replace(/\/+$/, "")}/tg` },
            { text: "🌐 فتح المنصة", url: `${appBaseUrl.replace(/\/+$/, "")}/dashboard` },
          ],
        ],
      };

      if (chatId && token) {
        const sent = await sendStyledMessage(chatId, text, keyboard);
        return json(200, {
          ok: true,
          deliveredToTelegram: Boolean(sent?.ok),
          previewHtml: text,
          message: sent?.ok
            ? "تم إرسال التنبيه التجريبي إلى شات التيليجرام الخاص بك بنجاح! 🤖"
            : "تم توليد معاينة التنبيه (تأكد من فتح البوت والضغط على Start)",
        });
      }

      return json(200, {
        ok: true,
        deliveredToTelegram: false,
        previewHtml: text,
        message: chatId
          ? "تم تجهيز معاينة التنبيه الفوري بنجاح ✨"
          : "تم عرض معاينة التنبيه الفوري (اربط حسابك بالبوت لاستقباله مباشرة في تيليجرام) ✨",
      });
    }

    if (action === "simulate_command") {
      const simulation = buildCommandSimulation(body.command || "/start", body.topic || "", userDoc || {});
      let deliveredToTelegram = false;

      if (body.sendToChat && chatId && token) {
        const keyboard = simulation.buttons?.length ? { inline_keyboard: simulation.buttons } : null;
        const sent = await sendStyledMessage(chatId, simulation.html, keyboard);
        deliveredToTelegram = Boolean(sent?.ok);
      }

      return json(200, {
        ok: true,
        simulation,
        deliveredToTelegram,
        message: deliveredToTelegram
          ? "تم تنفيذ الأمر وإرسال الرد إلى شات التيليجرام الخاص بك! ⚡"
          : "تم تنفيذ محاكاة الأمر وعرض رد البوت الفوري ✨",
      });
    }

    return json(400, { ok: false, error: "UNKNOWN_ACTION" });
  } catch (error) {
    return handleError(error);
  }
};
