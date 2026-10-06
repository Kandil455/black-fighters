import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { sendExportToTelegram } from "./_shared/telegram-engine.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const { title, type = "summary", summaryText = "", questions = [], quizId = null } = body;

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

    const exportResult = await sendExportToTelegram({
      chatId,
      title: title || "محتوى من Black Fighters",
      type,
      summaryText,
      questions,
      quizId,
    });

    if (!exportResult.ok) {
      throw new Error(exportResult.error || "فشل إرسال المحتوى للتيليجرام");
    }

    return json(200, {
      success: true,
      message: type === "quiz"
        ? `تم تجهيز كويز الـ OSCE وإرسال لوحة التحكم للبوت بنجاح! تفقد البوت الآن 🎯`
        : "تم تصدير الملخص إلى التيليجرام بنجاح! تفقد البوت الآن 📚",
    });
  } catch (error) {
    return handleError(error);
  }
};
