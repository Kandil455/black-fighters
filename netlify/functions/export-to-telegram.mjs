import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { sendExportToTelegram } from "./_shared/telegram-engine.mjs";
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
    } = body;

    // Get user's linked Telegram Chat ID from Firestore
    let chatId = null;
    if (adminDb) {
      const userDoc = await adminDb.collection("users").doc(user.uid).get();
      if (userDoc.exists) {
        chatId = userDoc.data()?.telegram_chat_id;
      }
    }

    if (!chatId) {
      return json(400, {
        error: "NO_TELEGRAM_LINKED",
        message: "حسابك غير مربوط بالتيليجرام! اضغط على زرار فتح البوت وربط الحساب الأول 🤖",
      });
    }

    if (isAutoNotification) {
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
      throw new Error(exportResult.error || "فشل إرسال المحتوى للتيليجرام");
    }

    if (isAutoNotification) {
      await recordNotificationSent({ uid: user.uid });
    }

    return json(200, {
      success: true,
      delivered: exportResult.delivered || null,
      pollsSent: exportResult.pollsSent || 0,
      quizId: exportResult.quizId || quizId,
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
