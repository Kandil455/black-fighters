import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { sendExportToTelegram, getAlphaChatId, getBotToken, getBotUsername } from "./_shared/telegram-engine.mjs";
import { evaluateNotification, recordNotificationSent } from "./_shared/telegram-notify.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const {
      title,
      type = "summary",
      summaryText = "",
      summaryHtml = "",
      questions = [],
      quizId = null,
      deliveryMode = "both",
      isAutoNotification = false,
      chatId: clientChatId = null,
    } = body;

    // Get user's linked Telegram Chat ID from client payload, Firestore, or env fallback
    let chatId = clientChatId ? String(clientChatId).trim() : null;
    if (!chatId && adminDb) {
      try {
        const userDoc = await adminDb.collection("users").doc(user.uid).get();
        if (userDoc.exists) {
          chatId = userDoc.data()?.telegram_chat_id;
        }
      } catch (dbErr) {
        console.warn("[export-to-telegram] Firestore user lookup skipped:", dbErr.message);
      }
    }
    if (!chatId) {
      chatId = getAlphaChatId() || null;
    }

    const botUsername = getBotUsername();
    const botToken = getBotToken();

    // Build formatted share preview text for fallback or instant Telegram share
    const shareHeader = `⚡ *${title || "Black Fighters Study Capsule"}*\n`;
    const shareBody =
      type === "quiz"
        ? `🎯 Interactive Quiz (${Array.isArray(questions) ? questions.length : 0} Questions)\n` +
          (Array.isArray(questions)
            ? questions
                .slice(0, 5)
                .map((q, idx) => `\n${idx + 1}. ${q.question || q.text || ""}`)
                .join("\n")
            : "")
        : String(summaryText || "")
            .replace(/[#*_`~>-]/g, "")
            .slice(0, 900);
    const telegramShareUrl = `https://t.me/share/url?url=${encodeURIComponent("https://blackfighters.site")}&text=${encodeURIComponent(shareHeader + "\n" + shareBody)}`;

    if (!chatId) {
      return json(200, {
        success: false,
        error: "NO_TELEGRAM_LINKED",
        botUsername,
        telegramShareUrl,
        message: "حسابك غير مربوط بالتيليجرام بعد — يمكنك ربط البوت بضغطة واحدة أو مشاركة المحتوى فوراً عبر تيليجرام 🤖",
      });
    }

    if (isAutoNotification) {
      try {
        const evalRes = await evaluateNotification({
          uid: user.uid,
          type: type === "quiz" ? "quiz_graded" : "summary_ready",
          explicitlyRequested: false,
        });
        if (!evalRes.allowed) {
          return json(200, {
            success: false,
            skipped: true,
            reason: evalRes.reason,
            message: "تم تخطي الإشعار التلقائي حسب تفضيلات التنبيهات وساعات الهدوء.",
          });
        }
      } catch {}
    }

    if (!botToken) {
      // Preview / Dev environment without live bot token: succeed with direct Telegram Share & Bot DeepLink
      return json(200, {
        success: true,
        simulated: true,
        botUsername,
        telegramShareUrl,
        pollsSent: type === "quiz" && Array.isArray(questions) ? questions.length : 0,
        quizId: quizId || `qz_${Date.now()}`,
        message:
          type === "quiz"
            ? `تم تجهيز ${Array.isArray(questions) ? questions.length : 0} سؤال لبوت التيليجرام بنجاح! 🎯`
            : "تم تجهيز كبسولة الملخص لبوت التيليجرام بنجاح! 📚",
      });
    }

    const exportResult = await sendExportToTelegram({
      chatId,
      uid: user.uid,
      title: title || "محتوى من Black Fighters",
      type,
      summaryText,
      summaryHtml: typeof summaryHtml === "string" ? summaryHtml.slice(0, 900000) : "",
      questions,
      quizId,
      deliveryMode,
    });

    if (!exportResult.ok) {
      return json(200, {
        success: false,
        error: exportResult.error || "TELEGRAM_DELIVERY_FALLBACK",
        botUsername,
        telegramShareUrl,
        message: exportResult.error || "تعذر الإرسال المباشر للبوت — يمكنك فتح البوت أو المشاركة مباشرة عبر تيليجرام.",
      });
    }

    if (isAutoNotification) {
      await recordNotificationSent({ uid: user.uid }).catch(() => {});
    }

    return json(200, {
      success: true,
      delivered: exportResult.delivered || null,
      pollsSent: exportResult.pollsSent || 0,
      quizId: exportResult.quizId || quizId,
      telegramShareUrl,
      message:
        type === "quiz"
          ? exportResult.pollsSent > 0
            ? `تم إرسال ${exportResult.pollsSent} استطلاع Quiz Poll حي + لوحة الكويز للبوت بنجاح! تفقد البوت الآن 🎯`
            : `تم تجهيز الكويز وإرسال لوحة التحكم للبوت بنجاح! تفقد البوت الآن 🎯`
          : "تم تصدير كبسولة الملخص وملف المذكرة إلى التيليجرام بنجاح! تفقد البوت الآن 📚",
    });
  } catch (error) {
    return handleError(error);
  }
};

