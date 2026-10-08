import { adminDb, FieldValue } from "./firebase-admin.mjs";
import { executePaymentDecision } from "./payment-processor.mjs";
import { spendCreditsAtomic } from "./server-ai.mjs";
import { consumeLinkCode, unlinkTelegram } from "./telegram-link.mjs";
import {
  startQuizSession,
  rememberQuestionPoll,
  recordPollAnswer,
  finishQuizSession,
  formatQuizResult,
} from "./telegram-quiz.mjs";
import { optOutOfType } from "./telegram-notify.mjs";
import { COMMANDS } from "./telegram-commands.mjs";

const TELEGRAM_API_BASE = "https://api.telegram.org/bot";

// SECURITY CONTRACT (do not weaken):
//  * Bot credentials come ONLY from server env (TELEGRAM_BOT_TOKEN /
//    ALPHA_TELEGRAM_CHAT_ID). There is deliberately NO hardcoded fallback —
//    an earlier build shipped the token inside the browser bundle, so any
//    default here is public the moment it lands in Git.
//  * Missing/blank credentials FAIL CLOSED: senders return `NO_BOT_TOKEN` and
//    never talk to api.telegram.org. Rotate the token via @BotFather and set it
//    as an environment variable before deploying.
const BOT_TOKEN_RE = /^\d+:[A-Za-z0-9_-]+$/;

export function getBotToken() {
  const token = String(process.env.TELEGRAM_BOT_TOKEN || "").trim();
  return BOT_TOKEN_RE.test(token) ? token : "";
}

export function getAlphaChatId() {
  const id = String(process.env.ALPHA_TELEGRAM_CHAT_ID || "").trim();
  return /^\d+$/.test(id) ? id : "";
}

export function getAppBaseUrl() {
  return process.env.APP_BASE_URL || process.env.VITE_APP_URL || "https://blackfighters.site";
}

/** Public bot handle used to build deep links (not a secret). */
export function getBotUsername() {
  const raw = String(process.env.TELEGRAM_BOT_USERNAME || "black_fighters_bot").trim().replace(/^@/, "");
  return /^[A-Za-z0-9_]{5,32}$/.test(raw) ? raw : "black_fighters_bot";
}

/**
 * Admin identity is resolved from `role === 'admin'` (Admin-SDK granted) or the
 * server-side ADMIN_EMAILS allowlist. The fallback mirrors requireAdmin() in
 * _shared/firebase-admin.mjs so an unset env var does not lock the owner out.
 *
 * The vulnerability this replaces was NOT the email being known — it was that
 * anyone typing `/alpha` in the bot was granted the highest privileges.
 */
const FALLBACK_ADMIN_EMAILS = "ibrahimkandil000@gmail.com";

function adminEmailAllowlist() {
  return String(process.env.ADMIN_EMAILS || FALLBACK_ADMIN_EMAILS)
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUserDoc(userDoc) {
  if (!userDoc) return false;
  if (String(userDoc.role || "").toLowerCase() === "admin") return true;
  const email = String(userDoc.email || "").toLowerCase();
  return Boolean(email) && adminEmailAllowlist().includes(email);
}

/** Paid-plan check shared by the bot gate and the Mini App. */
export function hasActivePlan(userDoc) {
  if (!userDoc) return false;
  const plan = String(userDoc.subscription_plan || "").toLowerCase();
  const planKey = String(userDoc.subscription_plan_key || "").toLowerCase();
  const status = String(userDoc.subscription_status || "").toLowerCase();
  const expires = userDoc.subscription_expires_at ? Date.parse(userDoc.subscription_expires_at) : 0;
  const timeValid = !expires || expires > Date.now();
  return (
    ["starter", "pro", "supreme", "premium", "emergency", "emergency_round"].includes(plan) ||
    planKey === "emergency_round" ||
    status === "active" ||
    (timeValid && Boolean(expires))
  );
}

const TELEGRAM_TIMEOUT_MS = 15000;
const TELEGRAM_MAX_ATTEMPTS = 3;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Server-only Telegram Bot API caller.
 * Adds the reliability the live path was missing: hard timeout, bounded retry
 * with exponential backoff, and `429 retry_after` respect. Never throws — every
 * failure resolves to `{ ok: false, description }` so a single bad send can
 * never take a webhook turn down.
 */
export async function callTelegramApi(method, payload, customToken = null) {
  const token = customToken || getBotToken();
  if (!token) {
    console.warn("[TelegramBot] Missing bot token — call skipped (fail closed).");
    return { ok: false, description: "NO_BOT_TOKEN" };
  }

  let lastResult = { ok: false, description: "UNKNOWN_ERROR" };
  for (let attempt = 1; attempt <= TELEGRAM_MAX_ATTEMPTS; attempt += 1) {
    try {
      const res = await fetch(`${TELEGRAM_API_BASE}${token}/${method}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(TELEGRAM_TIMEOUT_MS),
      });
      const data = await res.json().catch(() => ({ ok: false, description: "INVALID_JSON_FROM_TELEGRAM" }));

      // 429 is the one error worth retrying: retry_after is authoritative.
      if (!data.ok && Number(data.error_code) === 429 && attempt < TELEGRAM_MAX_ATTEMPTS) {
        const retryAfterSec = Math.min(30, Number(data.parameters?.retry_after) || 2);
        lastResult = data;
        await sleep(retryAfterSec * 1000);
        continue;
      }
      return data;
    } catch (error) {
      lastResult = { ok: false, description: error?.name === "TimeoutError" ? "TELEGRAM_TIMEOUT" : error.message };
      if (attempt < TELEGRAM_MAX_ATTEMPTS) {
        await sleep(Math.pow(2, attempt) * 250);
        continue;
      }
    }
  }
  console.error(`[TelegramBot] callTelegramApi(${method}) failed:`, lastResult.description);
  return lastResult;
}

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

export async function sendStyledMessage(chatId, text, replyMarkup = null) {
  const payload = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: false,
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  const res = await callTelegramApi("sendMessage", payload);
  if (!res.ok && res.description && res.description.includes("can't parse entities")) {
    const plainText = text.replace(/<[^>]*>/g, "");
    payload.text = plainText;
    delete payload.parse_mode;
    return callTelegramApi("sendMessage", payload);
  }
  return res;
}

export async function sendStyledPhoto(chatId, photoUrl, caption = "", replyMarkup = null) {
  if (!photoUrl) return { ok: false, description: "NO_PHOTO" };

  const safeCaption = typeof caption === "string" ? caption.slice(0, 1024) : "";

  // 1. Direct Base64 Data URL upload via multipart/form-data
  if (typeof photoUrl === "string" && photoUrl.startsWith("data:image")) {
    try {
      const commaIdx = photoUrl.indexOf(",");
      if (commaIdx !== -1) {
        const header = photoUrl.slice(0, commaIdx);
        const b64 = photoUrl.slice(commaIdx + 1);
        const mimeMatch = header.match(/data:([^;]+)/);
        const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
        const ext = mime.split("/")[1] || "jpg";
        const buffer = Buffer.from(b64, "base64");

        const formData = new FormData();
        formData.append("chat_id", String(chatId));
        if (safeCaption) {
          formData.append("caption", safeCaption);
          formData.append("parse_mode", "HTML");
        }
        if (replyMarkup) {
          formData.append("reply_markup", typeof replyMarkup === "string" ? replyMarkup : JSON.stringify(replyMarkup));
        }
        formData.append("photo", new Blob([buffer], { type: mime }), `slide_${Date.now()}.${ext}`);

        const token = getBotToken();
        const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendPhoto`, {
          method: "POST",
          body: formData,
        });
        const data = await res.json();
        if (data.ok) return data;
        console.warn("[TelegramEngine] Multipart base64 sendPhoto failed:", data.description);
      }
    } catch (err) {
      console.warn("[TelegramEngine] Base64 sendStyledPhoto error:", err.message);
    }
  }

  // 2. Relative URLs
  let finalPhoto = photoUrl;
  if (typeof finalPhoto === "string" && finalPhoto.startsWith("/")) {
    const base = getAppBaseUrl();
    finalPhoto = `${base.replace(/\/+$/, "")}${finalPhoto}`;
  }

  const payload = {
    chat_id: chatId,
    photo: finalPhoto,
    caption: safeCaption,
    parse_mode: "HTML",
  };
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApi("sendPhoto", payload);
}

export async function answerCallback(callbackQueryId, text = "", showAlert = false) {
  return callTelegramApi("answerCallbackQuery", {
    callback_query_id: callbackQueryId,
    text,
    show_alert: showAlert,
  });
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
  const alphaChatId = String(getAlphaChatId());
  if (!alphaChatId) {
    console.warn("[TelegramEngine] No Alpha chat ID configured for alerts.");
    return null;
  }
  const appUrl = getAppBaseUrl();

  const caption = `
⚡ <b>إشعار طلب اشتراك جديد يا قائدنا Alpha!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
👤 <b>المستخدم:</b> ${userName}
📧 <b>البريد:</b> <code>${userEmail || "بدون بريد"}</code>
💳 <b>طريقة التحويل:</b> ${method === "vodafone_cash" ? "فودافون كاش 📱" : "انستا باي 💳"}
📱 <b>رقم المحول:</b> <code>${senderNumber}</code>
💰 <b>المبلغ:</b> <b>${amount} EGP</b>
📦 <b>المنتج:</b> ${productType === "credits" ? "باقة كريدتس" : `اشتراك ${planName}`}
🆔 <b>كود الطلب:</b> <code>${requestId}</code>
━━━━━━━━━━━━━━━━━━━━
<i>اختر قرارك السيادي فوراً من الأزرار أدناه:</i>
  `.trim();

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

  // Case 1: Normal HTTPS / HTTP URL → sendPhoto
  if (targetPhoto && (targetPhoto.startsWith("https://") || targetPhoto.startsWith("http://"))) {
    try {
      const res = await sendStyledPhoto(alphaChatId, targetPhoto, caption, keyboard);
      if (res && res.ok) return res;
      // If Telegram can't fetch it (e.g. private URL / auth required) fall through
      console.warn("[TelegramEngine] sendStyledPhoto URL failed, trying buffer fallback:", res?.description);
    } catch (e) {
      console.warn("[TelegramEngine] sendStyledPhoto exception:", e.message);
    }
  }

  // Case 2: Base64 DataURL → convert to buffer and send as photo via multipart
  if (targetPhoto && targetPhoto.startsWith("data:image")) {
    try {
      const [header, b64] = targetPhoto.split(",");
      const mimeMatch = header.match(/data:([^;]+)/);
      const mime = mimeMatch ? mimeMatch[1] : "image/jpeg";
      const ext = mime.split("/")[1] || "jpg";
      const buffer = Buffer.from(b64, "base64");

      const formData = new FormData();
      formData.append("chat_id", alphaChatId);
      formData.append("caption", caption);
      formData.append("parse_mode", "HTML");
      formData.append("reply_markup", JSON.stringify(keyboard));
      formData.append("photo", new Blob([buffer], { type: mime }), `transfer_proof.${ext}`);

      const token = getBotToken();
      const res = await fetch(`https://api.telegram.org/bot${token}/sendPhoto`, {
        method: "POST",
        body: formData,
      });
      const data = await res.json();
      if (data.ok) return data;
      console.warn("[TelegramEngine] base64 sendPhoto failed:", data.description);
    } catch (b64Err) {
      console.warn("[TelegramEngine] base64 photo send error:", b64Err.message);
    }
  }

  // Case 3: Fallback — send text message with valid absolute admin link
  const safeLink = targetPhoto && (targetPhoto.startsWith("http://") || targetPhoto.startsWith("https://")) ? targetPhoto : null;
  const textMsg = safeLink
    ? `${caption}\n\n📸 <b><a href="${safeLink}">اضغط هنا لمشاهدة إيصال التحويل 🖼️</a></b>`
    : `${caption}\n\n📸 <i>الصورة مرفوعة في لوحة الأدمن — اضغط زر لوحة الأدمن للمراجعة</i>`;

  return sendStyledMessage(alphaChatId, textMsg, keyboard);
}


/**
 * Export Course/Quiz content from Website directly to user's Telegram Chat
 */
/**
 * Sends an in-memory file to a chat via `sendDocument`.
 *
 * Uses the multipart transport (not the JSON one) because the Bot API requires
 * form data for file uploads. Returns `{ ok:false }` instead of throwing so a
 * failed upload can fall back to a text message.
 */
async function sendDocumentBuffer({ chatId, fileName, mimeType = "application/octet-stream", buffer, caption = "" }) {
  const token = getBotToken();
  if (!token) return { ok: false, description: "NO_BOT_TOKEN" };
  try {
    const form = new FormData();
    form.append("chat_id", String(chatId));
    if (caption) {
      form.append("caption", String(caption).slice(0, 1024));
      form.append("parse_mode", "HTML");
    }
    form.append("document", new Blob([buffer], { type: mimeType }), fileName);

    const res = await fetch(`${TELEGRAM_API_BASE}${token}/sendDocument`, {
      method: "POST",
      body: form,
      signal: AbortSignal.timeout(45000),
    });
    return await res.json();
  } catch (error) {
    return { ok: false, description: error?.message || "SEND_DOCUMENT_FAILED" };
  }
}

export async function sendExportToTelegram({ chatId, title = "محتوى دراسي", type = "summary", summaryText = "", summaryHtml = "", questions = [], quizId = null }) {
  if (!chatId) return { ok: false, error: "NO_CHAT_ID" };

  if (type === "summary") {
    // Deliver the actual study guide.
    //
    // Previously this sent a text message truncated to 3800 characters with all
    // markup stripped, so a real summary arrived as a cut-off wall of plain text —
    // and when the caller sent nothing (see the `content_type` lookup bug) the
    // chat received only the course blurb. Now the rendered HTML template travels
    // as a document, with a short caption, so the student gets "the file".
    const plain = String(summaryText || "").replace(/[#*_`>]/g, "").replace(/\n{3,}/g, "\n\n").trim();
    if (summaryHtml) {
      const fileName = `${String(title || "ملخص").replace(/[\\/:*?"<>|]/g, "-").slice(0, 60)}.html`;
      const sent = await sendDocumentBuffer({
        chatId,
        fileName,
        mimeType: "text/html",
        buffer: Buffer.from(String(summaryHtml), "utf8"),
        caption: `📚 <b>${title}</b>\nملف مذاكرة جاهز — افتحه من الموبايل أو اطبعه.`,
      });
      if (sent?.ok) return { ok: true, delivered: "document" };
      console.warn("[TelegramEngine] document send failed, falling back to text");
    }

    const header = `📚 <b>تصدير ملخص من Black Fighters: ${title}</b>\n━━━━━━━━━━━━━━━━━━━━\n\n`;
    // Split instead of truncating: a long summary used to lose everything past
    // the 3800th character with no indication anything was missing.
    const chunks = [];
    for (let i = 0; i < plain.length && chunks.length < 6; i += 3800) chunks.push(plain.slice(i, i + 3800));
    if (!chunks.length) {
      return sendStyledMessage(chatId, `${header}⚠️ <i>الملخص فاضي — جرّب تولّده من المنصة الأول.</i>`);
    }
    for (let index = 0; index < chunks.length; index += 1) {
      const isLast = index === chunks.length - 1;
      await sendStyledMessage(
        chatId,
        `${index === 0 ? header : ""}${chunks[index]}${isLast ? `\n\n━━━━━━━━━━━━━━━━━━━━\n⚡ <i>تم التصدير من منصة Black Fighters</i>` : ""}`,
      );
    }
    return { ok: true, delivered: "text", parts: chunks.length };
  }

  if (type === "quiz" && questions.length > 0) {
    const appUrl = getAppBaseUrl();
    let activeQuizId = quizId;
    if (!activeQuizId) {
      activeQuizId = `exp_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
    }

    // Persist quiz to Firestore so Telegram interactive runner can access it anytime
    if (adminDb) {
      try {
        await adminDb.collection("standaloneQuizzes").doc(activeQuizId).set({
          id: activeQuizId,
          title: title,
          questions: questions,
          is_public: true,
          quiz_mode: "practical_osce",
          updated_at: new Date().toISOString(),
        }, { merge: true });
      } catch (err) {
        console.warn("[TelegramEngine] Persist exported quiz failed:", err.message);
      }
    }

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
          { text: "🌐 حل الكويز في الموقع", url: startUrl },
          { text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" },
        ],
      ],
    };

    const res = await sendStyledMessage(chatId, launchCard, keyboard);
    return { ok: true, sent: questions.length, quizId: activeQuizId, res };
  }

  return { ok: false, error: "INVALID_EXPORT_TYPE" };
}

/**
 * Built-in High-Yield Question Bank for EBE (Theory Quizzes)
 */
const EBE_QUESTION_BANKS = {
  clinical: [
    {
      q: "A patient is observed standing in a bizarre, rigid posture for hours. When the doctor raises the patient's arm, it remains suspended in the air without the patient getting tired (Waxy flexibility). Which subtype is this?",
      options: ["Paranoid type", "Disorganized type", "Catatonic type", "Undifferentiated type"],
      correct: 2,
      exp: "Catatonic schizophrenia is characterized by marked motor disturbances, including waxy flexibility (flexibilitas cerea) and stupor.",
    },
    {
      q: "Which of the following is considered a GOOD prognostic factor for Schizophrenia?",
      options: ["Younger age of onset", "Insidious (slow and gradual) onset", "Single or unmarried", "Acute onset with immediate life stresses"],
      correct: 3,
      exp: "Acute onset triggered by clear precipitating stressors and good premorbid functioning are established indicators of favorable prognosis.",
    },
    {
      q: "A 45-year-old male presents with sudden-onset crushing substernal chest pain radiating to his left jaw. ECG reveals ST elevation in leads II, III, and aVF. Which coronary artery is most likely occluded?",
      options: ["Left Anterior Descending (LAD)", "Left Circumflex (LCx)", "Right Coronary Artery (RCA)", "Left Main Coronary Artery"],
      correct: 2,
      exp: "Inferior STEMI (leads II, III, aVF) is supplied predominantly by the Right Coronary Artery (RCA) in 85-90% of individuals.",
    },
    {
      q: "Which anti-arrhythmic medication is considered first-line for acute termination of stable Paroxysmal Supraventricular Tachycardia (PSVT)?",
      options: ["Amiodarone", "Adenosine", "Digoxin", "Lidocaine"],
      correct: 1,
      exp: "Intravenous Adenosine (rapid bolus) induces transient AV node blockade and is the acute treatment of choice for stable PSVT.",
    },
    {
      q: "In diabetic ketoacidosis (DKA), which laboratory parameter is the most sensitive indicator of treatment response and resolution of acidosis?",
      options: ["Serum glucose level", "Serum beta-hydroxybutyrate and anion gap", "Urine ketone dipstick", "Serum sodium level"],
      correct: 1,
      exp: "Resolution of the anion gap and direct measurement of serum beta-hydroxybutyrate are the true markers of DKA resolution, not urine dipstick or glucose alone.",
    },
  ],
  pharma: [
    {
      q: "Which of the following classes of antibiotics carries a boxed warning for tendonitis and tendon rupture, especially of the Achilles tendon?",
      options: ["Macrolides", "Fluoroquinolones", "Cephalosporins", "Tetracyclines"],
      correct: 1,
      exp: "Fluoroquinolones (e.g., Ciprofloxacin, Levofloxacin) carry an FDA boxed warning for tendonitis and tendon rupture.",
    },
    {
      q: "A patient on chronic Warfarin therapy starts taking Fluconazole. What is the expected drug interaction?",
      options: ["Increased Warfarin clearance and lower INR", "CYP2C9 inhibition causing elevated Warfarin levels and increased bleeding risk", "Induction of CYP3A4 leading to therapeutic failure", "Decreased gastrointestinal absorption of Warfarin"],
      correct: 1,
      exp: "Fluconazole is a potent inhibitor of CYP2C9, which metabolizes the active S-enantiomer of Warfarin, causing a dangerous spike in INR.",
    },
  ],
};

/**
 * Built-in Visual Slide Bank for OSPE (Practical Quizzes)
 * All cases formatted in standard medical English as requested by Alpha
 */
const OSPE_IMAGE_BANK = [
  {
    id: 1,
    title: "Histopathology Demo #1",
    url: "https://images.unsplash.com/photo-1579154204601-01588f351e67?w=800&auto=format&fit=crop&q=80",
    question: "What is the primary histopathological change demonstrated in this tissue section?",
    options: ["Coagulative Necrosis", "Caseous Necrosis", "Liquefactive Necrosis", "Fat Necrosis"],
    correct: 0,
    exp: "Preserved cellular outlines with loss of nuclei, diagnostic of coagulative ischemia.",
  },
  {
    id: 2,
    title: "Anatomy Dissection Demo #2",
    url: "https://images.unsplash.com/photo-1530497610245-94d3c16cda28?w=800&auto=format&fit=crop&q=80",
    question: "Which vascular structure in the femoral triangle is indicated?",
    options: ["Femoral Artery", "Femoral Vein", "Saphenous Nerve", "Deep Femoral Artery"],
    correct: 0,
    exp: "Positioned immediately lateral to the femoral vein within the femoral sheath.",
  },
  {
    id: 3,
    title: "Radiology Chest X-Ray Demo #3",
    url: "https://images.unsplash.com/photo-1516549655169-df83a0774514?w=800&auto=format&fit=crop&q=80",
    question: "What is the primary radiological finding visible on this radiograph?",
    options: ["Pleural effusion with blunted costophrenic angle", "Right middle lobe consolidation", "Pneumothorax with absent lung markings", "Pulmonary edema (Bat-wing sign)"],
    correct: 0,
    exp: "Dense meniscus sign and blunting of the right lateral costophrenic sulcus indicate pleural effusion.",
  },
  {
    id: 4,
    title: "Microbiology Gram Stain Demo #4",
    url: "https://images.unsplash.com/photo-1576086213369-97a306d36557?w=800&auto=format&fit=crop&q=80",
    question: "How are the visualized bacteria classified based on this Gram stain?",
    options: ["Gram-positive cocci in clusters", "Gram-negative bacilli", "Gram-positive bacilli in chains", "Gram-negative diplococci"],
    correct: 0,
    exp: "Staphylococci appear characteristically as Gram-positive (violet) spherical cocci in irregular grape-like clusters.",
  },
  {
    id: 5,
    title: "Clinical Dermatology Demo #5",
    url: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=80",
    question: "What is the most likely clinical diagnosis for this characteristic lesion?",
    options: ["Psoriasis Vulgaris", "Erythema Nodosum", "Lichen Planus", "Atopic Dermatitis"],
    correct: 0,
    exp: "Sharply demarcated erythematous plaques topped with silvery-white micaceous scales on extensor surfaces.",
  },
];

/**
 * Robust Text Extraction from Uploaded Document Buffer (PDF, DOCX, TXT, MD, etc.)
 */
export async function extractTextFromBuffer(buffer, fileName = "", mimeType = "") {
  let text = "";
  const lowerName = (fileName || "").toLowerCase();

  // 1. Plain text / Markdown / JSON / CSV
  if (
    lowerName.endsWith(".html") ||
    lowerName.endsWith(".htm") ||
    lowerName.endsWith(".txt") ||
    lowerName.endsWith(".md") ||
    lowerName.endsWith(".json") ||
    lowerName.endsWith(".csv") ||
    mimeType.startsWith("text/")
  ) {
    try {
      text = Buffer.from(buffer).toString("utf-8");
      if (text.trim().length > 20) return text;
    } catch {}
  }

  // 2. Word documents (.docx)
  if (lowerName.endsWith(".docx") || mimeType.includes("wordprocessingml")) {
    try {
      const mammoth = await import("mammoth");
      const res = await mammoth.extractRawText({ buffer: Buffer.from(buffer) });
      if (res?.value && res.value.trim().length > 20) return res.value;
    } catch (docxErr) {
      console.warn("[TelegramEngine] Mammoth docx error:", docxErr.message);
    }
  }

  // 3. PDF documents (.pdf)
  if (lowerName.endsWith(".pdf") || mimeType === "application/pdf") {
    try {
      const pdfjsLib = await import("pdfjs-dist/legacy/build/pdf.mjs");
      const uint8 = new Uint8Array(buffer);
      const loadingTask = pdfjsLib.getDocument({ data: uint8 });
      const doc = await loadingTask.promise;
      let extracted = "";
      const maxPages = Math.min(doc.numPages, 20);
      for (let i = 1; i <= maxPages; i++) {
        const page = await doc.getPage(i);
        const content = await page.getTextContent();
        const strings = content.items.map((it) => it.str);
        extracted += strings.join(" ") + "\n";
      }
      if (extracted.trim().length > 20) return extracted;
    } catch (pdfErr) {
      console.warn("[TelegramEngine] PDF extraction error:", pdfErr.message);
    }
  }

  // 4. Fallback: stringify whatever plain characters exist
  try {
    const raw = Buffer.from(buffer).toString("utf-8");
    const clean = raw.replace(/[^\x20-\x7E\u0600-\u06FF\n\r\t]/g, " ").replace(/\s+/g, " ").trim();
    if (clean.length > 50) return clean;
  } catch {}

  return text;
}

/**
 * Autonomous AI Quiz Generator from Text Content
 */
const CODECRAFT_KEY = process.env.CODECRAFT_API_KEY || "";
const CODECRAFT_URL = "https://codecraftapi.com/v1/chat/completions";

const GEMINI_KEYS = [
  process.env.GEMINI_API_KEY,
  ...(process.env.GEMINI_BACKUP_KEYS || "").split(","),
]
  .map((k) => String(k || "").replace(/["']/g, "").trim())
  .filter((k) => k.length > 15 && !k.startsWith("AQ."));

let geminiKeyCursor = 0;
const getGeminiKey = () => {
  if (!GEMINI_KEYS.length) return "";
  const key = GEMINI_KEYS[geminiKeyCursor % GEMINI_KEYS.length];
  geminiKeyCursor++;
  return key;
};

function resolveVerifiedTelegramCorrectIndex(q) {
  const opts = Array.isArray(q?.options) ? q.options.map((o) => String(o || "").trim()) : [];
  if (opts.length < 2) return 0;
  const ansText = String(q?.correct_answer || "").trim();
  if (ansText.length >= 2 && !/^\d+$/.test(ansText) && !/^[A-Da-dأابجد]$/.test(ansText)) {
    const normTarget = ansText.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
    const matchIdx = opts.findIndex((o) => {
      const normOpt = o.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
      return normOpt === normTarget || (normOpt.length >= 5 && normTarget.includes(normOpt));
    });
    if (matchIdx >= 0) return matchIdx;
  }
  return resolveCorrectOptionIndex(q, opts);
}

export async function generateQuizFromText(text, titleHint = "", count = 5) {
  const safeCount = Math.min(25, Math.max(3, Number(count) || 5));
  const prompt = `You are Black Fighters' elite medical exam creator.
Analyze the following source text and generate ${safeCount} high-yield multiple-choice questions (MCQs).
Rules:
1. Every question MUST be written in English (standard medical English) unless the user text explicitly demands Arabic.
2. Each question MUST have exactly 4 choices in an array.
3. Write "exp" FIRST (explaining why the correct option is right and others are wrong).
4. Copy the EXACT verbatim string of the correct option into "correct_answer".
5. Set "correct" to 0, 1, 2, or 3 (0-based index of correct_answer in options: 0=1st, 1=2nd, 2=3rd, 3=4th).
6. Return JSON ONLY with no markdown wrapping and no markdown ticks, in this exact format:
{
  "title": "${titleHint || "Medical High-Yield Quiz"}",
  "questions": [
    {
      "q": "Clinical question stem...",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "exp": "Explanation...",
      "correct_answer": "Choice A",
      "correct": 0
    }
  ]
}

Source Content:
${text.slice(0, 15000)}`;

  // 1. Try Gemini 2.5 Flash Lite first
  const geminiKey = getGeminiKey();
  if (geminiKey) {
    try {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json" }
        })
      });
      if (res.ok) {
        const data = await res.json();
        const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (jsonText) {
          const parsed = JSON.parse(jsonText);
          const qList = Array.isArray(parsed) ? (parsed[0]?.questions || parsed) : parsed.questions;
          if (Array.isArray(qList) && qList.length > 0) {
            return {
              title: parsed.title || titleHint || "Medical High-Yield Quiz",
              questions: qList.map((q) => {
                const verifiedIdx = resolveVerifiedTelegramCorrectIndex(q);
                return {
                  q: q.q || q.question,
                  options: q.options || [],
                  correct: verifiedIdx,
                  correct_index: verifiedIdx,
                  exp: q.exp || q.explanation || "Correct answer.",
                };
              }),
            };
          }
        }
      }
    } catch (gErr) {
      console.warn("[TelegramEngine] Gemini text quiz error:", gErr.message);
    }
  }

  // 2. Try CodeCraft fallback
  if (CODECRAFT_KEY) {
    try {
      const res = await fetch(CODECRAFT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${CODECRAFT_KEY}`,
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          messages: [{ role: "user", content: prompt }],
          temperature: 0.2,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || "";
        const clean = content.replace(/```(?:json)?/gi, "").replace(/```/g, "").trim();
        const s = clean.indexOf("{");
        const e = clean.lastIndexOf("}");
        if (s >= 0 && e > s) {
          const parsed = JSON.parse(clean.slice(s, e + 1));
          if (Array.isArray(parsed.questions) && parsed.questions.length) {
            return {
              ...parsed,
              questions: parsed.questions.map((q) => {
                const verifiedIdx = resolveVerifiedTelegramCorrectIndex(q);
                return {
                  ...q,
                  q: q.q || q.question,
                  options: q.options || [],
                  correct: verifiedIdx,
                  correct_index: verifiedIdx,
                  exp: q.exp || q.explanation || "Correct answer.",
                };
              }),
            };
          }
        }
      }
    } catch (err) {
      console.warn("[TelegramEngine] CodeCraft generate error:", err.message);
    }
  }

  // 3. Fallback
  return {
    title: titleHint || "High-Yield Clinical Case Quiz",
    questions: EBE_QUESTION_BANKS.clinical,
  };
}

export async function generateQuizFromImage(buffer, mimeType = "image/jpeg", caption = "", titleHint = "", count = 5) {
  const geminiKey = getGeminiKey();
  if (!geminiKey) throw new Error("NO_VISION_KEY");

  const safeCount = Math.min(25, Math.max(3, Number(count) || 5));
  const base64Data = Buffer.from(buffer).toString("base64");
  const prompt = `You are Black Fighters' elite medical exam creator.
Analyze the provided medical / academic image (case diagram, histology, clinical question photo, radiology, anatomy, or lecture slide).
User Caption / Context: "${caption || "Medical exam slide"}".

Generate ${safeCount} high-yield multiple-choice questions (MCQs) specifically testing understanding, diagnosis, anatomy, mechanism, or clinical management directly shown in this image.
Rules:
1. Every question MUST be written in standard medical English unless the user caption explicitly demands Arabic.
2. Each question MUST have exactly 4 choices in an array.
3. Write "exp" FIRST (providing clear clinical reasoning).
4. Copy the EXACT verbatim string of the correct choice into "correct_answer".
5. Set "correct" to 0, 1, 2, or 3 (0-based index of correct_answer in options: 0=1st, 1=2nd, 2=3rd, 3=4th).
6. Return JSON ONLY in this format:
{
  "title": "${titleHint || "Clinical Image Case Study"}",
  "questions": [
    {
      "q": "Clinical question stem...",
      "options": ["Choice A", "Choice B", "Choice C", "Choice D"],
      "exp": "Detailed explanation...",
      "correct_answer": "Choice A",
      "correct": 0
    }
  ]
}`;

  const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{
        parts: [
          { text: prompt },
          { inlineData: { mimeType: mimeType.startsWith("image/") ? mimeType : "image/jpeg", data: base64Data } }
        ]
      }],
      generationConfig: { responseMimeType: "application/json" }
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Gemini Vision error: ${res.status} ${errText}`);
  }

  const data = await res.json();
  const jsonText = data.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!jsonText) throw new Error("EMPTY_GEMINI_VISION_RESPONSE");

  const parsed = JSON.parse(jsonText);
  const qList = Array.isArray(parsed) ? (parsed[0]?.questions || parsed) : parsed.questions;
  return {
    title: parsed.title || titleHint || "Clinical Case Study",
    questions: (qList || []).map((q) => {
      const verifiedIdx = resolveVerifiedTelegramCorrectIndex(q);
      return {
        q: q.q || q.question,
        options: q.options || [],
        correct: verifiedIdx,
        correct_index: verifiedIdx,
        exp: q.exp || q.explanation || "Correct answer.",
      };
    }),
  };
}

/**
 * Toji AI Real-time Medical & Academic Tutor
 */
/**
 * Black Fighters AI Real-time Medical & Academic Companion
 */
export async function askBlackFightersAi(query) {
  const geminiKey = getGeminiKey();
  if (!geminiKey) {
    return "عذراً يا بطل! خدمة الذكاء الاصطناعي قيد التحديث المؤقت.";
  }

  const prompt = `You are Black Fighters AI, the supreme academic and medical AI companion for the Black Fighters platform.
You speak in a natural, charismatic, intelligent, and motivating Egyptian tone — like a brilliant academic mentor and study partner.
User message / query: "${query}".

Instructions:
1. Speak naturally and charismatically. Answer what was actually asked.
2. If the user sent a greeting or casual chat, be warm and helpful.
3. If the user asked an academic or medical question, give a crystal-clear, high-yield explanation in fluent Egyptian/Arabic.
4. ABSOLUTE RULES:
   - NEVER call yourself Toji or mention Toji under any circumstances. You are Black Fighters AI.
   - Do NOT use rigid robotic templates like "الخلاصة المباشرة" or "التفاصيل الطبية الهامة" or "Mnemonic" unless the user explicitly requested that specific format.
   - Format cleanly using Telegram HTML ONLY (<b>, <i>, <code>). Never use markdown asterisks (* or **). Never use markdown headers (#).
5. Max 300 words. Keep it high-yield, authentic, and sharp.`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const answer = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (answer) {
        return answer
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<i>$1</i>")
          .replace(/```(?:html)?([\s\S]*?)```/gi, "<code>$1</code>")
          .replace(/#{1,6}\s*(.*)/g, "<b>$1</b>")
          .trim();
      }
    }
  } catch (err) {
    console.warn("[TelegramEngine] Black Fighters AI error:", err.message);
  }
  return "⚡ استلمت استفسارك يا بطل! يمكنك مناقشة هذا السؤال بتفصيل أكبر وحل اختباراته مباشرة عبر مساعد Black Fighters في المنصة.";
}

// Backward compatibility alias
export const askTojiMedicalAi = askBlackFightersAi;

/**
 * Executive Medical Summary Generator
 */
export async function generateMedicalSummary(topicOrText, mode = "concise") {
  const geminiKey = getGeminiKey();
  if (!geminiKey) return "تعذر توليد التلخيص حالياً.";

  let modeInstructions = "";
  if (mode === "detailed") {
    modeInstructions = `Provide a comprehensive, in-depth study breakdown:
1. 📌 <b>المفهوم الأساسي والتعريف:</b> Deep mechanism and pathogenesis.
2. 🔬 <b>المظاهر السريرية والتشخيصية (Clinical Presentation & Workup):</b> Signs, symptoms, lab findings, imaging.
3. 💊 <b>البروتوكول العلاجي (Management & Pharmacotherapy):</b> First-line, second-line, contraindications.
4. ⚡ <b>المضاعفات والملاحظات الحرجة (Complications & Red Flags):</b> Urgent clinical points.
5. 🧠 <b>مفاتيح الحفظ وMnemonics:</b> Easy hooks for exams.`;
  } else if (mode === "exam_pearls") {
    modeInstructions = `Focus strictly on high-yield exam traps and tested board concepts:
1. 🎯 <b>أهم أسئلة الامتحانات المتكررة:</b> Must-know concepts that always appear on exams.
2. ⚠️ <b>فخاخ الامتحانات (Exam Traps & Distractors):</b> Subtle differences students miss.
3. 💡 <b>العلامات التشخيصية القاطعة (Pathognomonic Signs):</b> Buzzwords and definitive findings.
4. ⚡ <b>Best Initial Test vs Most Accurate Test:</b> Critical clinical distinctions.`;
  } else if (mode === "concepts") {
    modeInstructions = `Extract core high-yield concept cards:
1. 🔑 <b>المفاهيم الذهبية (Golden Concepts):</b> Bulleted clear definitions.
2. 📊 <b>المقارنات الجوهرية (Key Contrasts):</b> Clear distinctions between related conditions.
3. 💡 <b>القواعد الذهبية (Clinical Pearls):</b> Fast memorization cards.`;
  } else {
    modeInstructions = `Provide a quick, punchy, high-yield summary:
📌 <b>المفهوم الجوهري (Core Concept):</b> Direct summary.
🔍 <b>التشخيص الذهبي (Gold Standard Workup):</b> Key tests.
💊 <b>خطة العلاج الأساسية (Management):</b> First line options.
⚡ <b>نقاط الامتحان الذهبية (High-Yield Pearls):</b> Testable facts.
🧠 <b>Mnemonic للحفظ السريع:</b> Easy memory hook.`;
  }

  const prompt = `You are Black Fighters' master academic & medical summarizer.
Topic / Lecture Content: "${topicOrText.slice(0, 15000)}".

${modeInstructions}

Format using Telegram HTML ONLY (<b>, <i>, <code>). Never use markdown asterisks (* or **). Never use markdown hashes (#).`;

  try {
    const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
      }),
    });
    if (res.ok) {
      const data = await res.json();
      const summary = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (summary) {
        return summary
          .replace(/\*\*(.*?)\*\*/g, "<b>$1</b>")
          .replace(/\*(.*?)\*/g, "<i>$1</i>")
          .replace(/#{1,6}\s*(.*)/g, "<b>$1</b>")
          .trim();
      }
    }
  } catch (err) {
    console.warn("[TelegramEngine] Summary error:", err.message);
  }
  return "تعذر إتمام التلخيص بالذكاء الاصطناعي حالياً.";
}

/**
 * Execute File to Quiz generation with dynamic question count and credit deduction
 */
export async function executeFileQuizAction(chatId, auth, count = 5) {
  if (!adminDb) return { ok: false };
  const sessionSnap = await adminDb.collection("telegram_file_sessions").doc(String(chatId)).get();
  if (!sessionSnap.exists) {
    return sendStyledMessage(chatId, "⚠️ <b>لا يوجد ملف محفوظ حالياً!</b> يرجى إرسال الملف أو الصورة أولاً.", {
      inline_keyboard: [[{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }]],
    });
  }

  const session = sessionSnap.data();
  const safeCount = Math.min(25, Math.max(3, Number(count) || 5));
  const creditCost = safeCount;

  // Credit verification & atomic spend
  let remainingCredits = null;
  if (!auth.isAlpha && auth.role !== "admin" && auth.userId) {
    try {
      const charge = await spendCreditsAtomic(auth.userId, {
        cost: creditCost,
        reason: "telegram_file_quiz",
        referenceId: session.fileName || "file_quiz",
      });
      remainingCredits = charge?.credits;
    } catch (creditErr) {
      return sendStyledMessage(
        chatId,
        `⚠️ <b>عذراً يا بطل! رصيدك غير كافي</b> ⚡\nالكويز (${safeCount} أسئلة) يتطلب <b>${creditCost} كريدت</b>.\n${creditErr.message}\n\nاشحن رصيدك أو اشترك للاستمتاع بكويزات وتلخيصات غير محدودة!`,
        {
          inline_keyboard: [
            [{ text: "💎 شحن الرصيد والاشتراكات", callback_data: "cmd_plans" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }
  }

  await sendStyledMessage(
    chatId,
    `⏳ <b>جاري استخراج المحتوى وتوليد ${safeCount} أسئلة MCQ لملف:</b>\n📁 <code>${session.fileName}</code>\n<i>يرجى الانتظار ثوانٍ...</i> 🧠⚡`
  );

  try {
    let quizGenerated = null;
    const fileMeta = await callTelegramApi("getFile", { file_id: session.fileId });
    if (!fileMeta?.ok || !fileMeta.result?.file_path) {
      throw new Error("تعذر تحميل الملف من سيرفر التيليجرام. يرجى إعادة رفعه.");
    }

    const downloadUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileMeta.result.file_path}`;
    const resp = await fetch(downloadUrl);
    const arrayBuf = await resp.arrayBuffer();

    if (session.isPhoto) {
      quizGenerated = await generateQuizFromImage(
        arrayBuf,
        session.mimeType || "image/jpeg",
        session.caption || "",
        session.fileName?.replace(/\.[^/.]+$/, "") || "Clinical Case Study",
        safeCount
      );
    } else {
      let extractedText = session.caption || "";
      const parsed = await extractTextFromBuffer(arrayBuf, session.fileName, session.mimeType || "");
      if (parsed && parsed.length > extractedText.length) {
        extractedText = parsed;
      }

      if (!extractedText || extractedText.trim().length < 30) {
        return sendStyledMessage(
          chatId,
          `⚠️ <b>عذراً يا بطل!</b>\nالملف المرفوع لا يحتوي على نصوص كافية لاستخراج الأسئلة.\nتأكد أن الملف يحتوي على نصوص واضحة أو أرسل المحتوى كنص في الشات!`
        );
      }

      quizGenerated = await generateQuizFromText(extractedText, session.fileName?.replace(/\.[^/.]+$/, "") || "Quiz", safeCount);
    }

    if (!quizGenerated || !Array.isArray(quizGenerated.questions) || !quizGenerated.questions.length) {
      throw new Error("تعذر توليد أسئلة من المحتوى حالياً.");
    }

    // Save to Firestore standaloneQuizzes
    let newQuizId = "tq_" + Date.now();
    const savedDoc = await adminDb.collection("standaloneQuizzes").add({
      title: quizGenerated.title || `كويز: ${session.fileName}`,
      owner_id: auth.userId || auth.user?.id || "telegram_user",
      owner_name: auth.user?.full_name || auth.name || "محارب Black Fighters",
      questions: quizGenerated.questions.map((q) => ({
        question: q.q,
        options: q.options,
        correct_answer: q.correct,
        explanation: q.exp,
      })),
      is_public: true,
      created_date: new Date().toISOString(),
      source: "telegram_upload",
    });
    newQuizId = savedDoc.id;

    // Reset session state
    await adminDb.collection("telegram_file_sessions").doc(String(chatId)).delete().catch(() => {});

    const creditBadge = remainingCredits != null
      ? `\n💳 <b>الرصيد:</b> تم خصم ${creditCost} كريدت • المتبقي: <b>${remainingCredits}</b> ⚡`
      : (auth.isAlpha ? `\n👑 <b>الوصول:</b> غير محدود (Supreme Alpha)` : "");

    const doneText = `
🎉 <b>تم إنشاء وتدقيق الكويز بنجاح!</b> 🧠⚡
━━━━━━━━━━━━━━━━━━━━
🏷️ <b>العنوان:</b> ${quizGenerated.title}
📝 <b>عدد الأسئلة:</b> ${quizGenerated.questions.length} سؤال MCQ
🌐 <b>الحفظ:</b> تم الحفظ في حسابك بمنصة Black Fighters.${creditBadge}

<i>اضغط أدناه لبدء الامتحان فوراً بالتيليجرام:</i>
    `.trim();

    return sendStyledMessage(chatId, doneText, {
      inline_keyboard: [
        [
          { text: "⏱️ بدون مؤقت", callback_data: `run_custom_quiz:${newQuizId}:0:0` },
          { text: "⚡ 30 ثانية", callback_data: `run_custom_quiz:${newQuizId}:0:30` },
          { text: "⏳ 60 ثانية", callback_data: `run_custom_quiz:${newQuizId}:0:60` },
        ],
        [{ text: "🚀 ابدأ الكويز الآن", callback_data: `run_custom_quiz:${newQuizId}:0:0` }],
        [{ text: "🌐 فتح الكويز بالموقع", url: `${getAppBaseUrl()}/q/${newQuizId}` }],
        [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
      ],
    });
  } catch (err) {
    console.error("[TelegramEngine] executeFileQuizAction error:", err);
    return sendStyledMessage(chatId, `⚠️ <b>حصل خطأ أثناء إنشاء الكويز:</b> <code>${err.message}</code>`);
  }
}

/**
 * Execute File Summary generation with selected style and credit deduction
 */
export async function executeFileSummaryAction(chatId, auth, mode = "concise", cost = 5) {
  if (!adminDb) return { ok: false };
  const sessionSnap = await adminDb.collection("telegram_file_sessions").doc(String(chatId)).get();
  if (!sessionSnap.exists) {
    return sendStyledMessage(chatId, "⚠️ <b>لا يوجد ملف محفوظ حالياً!</b> يرجى إرسال الملف أو الصورة أولاً.", {
      inline_keyboard: [[{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }]],
    });
  }

  const session = sessionSnap.data();

  // Credit verification & atomic spend
  let remainingCredits = null;
  if (!auth.isAlpha && auth.role !== "admin" && auth.userId) {
    try {
      const charge = await spendCreditsAtomic(auth.userId, {
        cost,
        reason: "telegram_file_summary",
        referenceId: session.fileName || "file_summary",
      });
      remainingCredits = charge?.credits;
    } catch (creditErr) {
      return sendStyledMessage(
        chatId,
        `⚠️ <b>عذراً يا بطل! رصيدك غير كافي</b> ⚡\nالتلخيص يتطلب <b>${cost} كريدت</b>.\n${creditErr.message}\n\nاشحن رصيدك أو اشترك للاستمتاع بتلخيصات وكويزات غير محدودة!`,
        {
          inline_keyboard: [
            [{ text: "💎 شحن الرصيد والاشتراكات", callback_data: "cmd_plans" }],
            [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }
  }

  const modeName = mode === "detailed" ? "المفصل الشامل" : mode === "exam_pearls" ? "النقاط الامتحانية" : mode === "concepts" ? "المفاهيم الذهبية" : "السريع المكثف";
  await sendStyledMessage(
    chatId,
    `⏳ <b>جاري إعداد التلخيص ${modeName} لملف:</b>\n📁 <code>${session.fileName}</code>\n<i>يرجى الانتظار ثوانٍ...</i> 📋⚡`
  );

  try {
    const fileMeta = await callTelegramApi("getFile", { file_id: session.fileId });
    if (!fileMeta?.ok || !fileMeta.result?.file_path) {
      throw new Error("تعذر تحميل الملف من سيرفر التيليجرام. يرجى إعادة رفعه.");
    }

    const downloadUrl = `https://api.telegram.org/file/bot${getBotToken()}/${fileMeta.result.file_path}`;
    const resp = await fetch(downloadUrl);
    const arrayBuf = await resp.arrayBuffer();

    let extractedText = session.caption || "";
    if (session.isPhoto) {
      const geminiKey = getGeminiKey();
      if (geminiKey) {
        const base64Data = Buffer.from(arrayBuf).toString("base64");
        const vResp = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash-lite:generateContent?key=${geminiKey}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [{
              parts: [
                { text: "Extract and summarize all medical/academic information in this image in detail." },
                { inlineData: { mimeType: session.mimeType || "image/jpeg", data: base64Data } }
              ]
            }]
          })
        });
        if (vResp.ok) {
          const vData = await vResp.json();
          extractedText = vData.candidates?.[0]?.content?.parts?.[0]?.text || session.caption || "";
        }
      }
    } else {
      const parsed = await extractTextFromBuffer(arrayBuf, session.fileName, session.mimeType || "");
      if (parsed && parsed.length > extractedText.length) {
        extractedText = parsed;
      }
    }

    if (!extractedText || extractedText.trim().length < 20) {
      throw new Error("تعذر قراءة نصوص واضحة من الملف.");
    }

    const summaryResult = await generateMedicalSummary(extractedText, mode);

    // Delete session after completion
    await adminDb.collection("telegram_file_sessions").doc(String(chatId)).delete().catch(() => {});

    const creditBadge = remainingCredits != null
      ? `\n━━━━━━━━━━━━━━━━━━━━\n💳 <b>تم خصم ${cost} كريدت • رصيدك المتبقي: ${remainingCredits} ⚡</b>`
      : "";

    return sendStyledMessage(
      chatId,
      `📋 <b>ملخص Black Fighters الذكي (${modeName}):</b>\n📁 <code>${session.fileName}</code>\n━━━━━━━━━━━━━━━━━━━━\n\n${summaryResult}${creditBadge}`,
      {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      }
    );
  } catch (err) {
    console.error("[TelegramEngine] executeFileSummaryAction error:", err);
    return sendStyledMessage(chatId, `⚠️ <b>حصل خطأ أثناء توليد التلخيص:</b> <code>${err.message}</code>`);
  }
}


/**
 * Check whether a Telegram user has active subscription or Alpha privileges
 */
export async function checkSubscriberAccess(chatId, userId = null) {
  const alphaChatId = String(getAlphaChatId());
  const isAlphaChat = Boolean(alphaChatId && String(chatId) === alphaChatId);

  if (isAlphaChat) {
    return {
      isAllowed: true,
      isAlpha: true,
      role: "admin",
      name: "Supreme Commander Alpha",
      userId: null,
      user: { role: "admin", subscription_plan: "supreme", subscription_status: "active" },
    };
  }

  try {
    if (!adminDb) return { isAllowed: false };

    // Check by user ID (during linking)
    if (userId) {
      const doc = await adminDb.collection("users").doc(userId).get();
      if (doc.exists) {
        const u = doc.data();
        const isAdminUser = isAdminUserDoc(u);
        const isSubscribed = isAdminUser || hasActivePlan(u);
        return { isAllowed: isSubscribed, isAlpha: isAdminUser, role: u.role || (isAdminUser ? "admin" : "user"), user: u, userId };
      }
    }

    // Check by telegram_chat_id
    const snap = await adminDb
      .collection("users")
      .where("telegram_chat_id", "==", String(chatId))
      .limit(1)
      .get();

    if (!snap.empty) {
      const u = snap.docs[0].data();
      const isAdminUser = isAdminUserDoc(u);
      const isSubscribed = isAdminUser || hasActivePlan(u);
      return { isAllowed: isSubscribed, isAlpha: isAdminUser, role: u.role || (isAdminUser ? "admin" : "user"), user: u, userId: snap.docs[0].id };
    }
  } catch (err) {
    console.warn("[TelegramEngine] checkSubscriberAccess error:", err.message);
  }

  return { isAllowed: false };
}

export function isEmergencySubscriber(auth) {
  if (!auth) return false;
  if (auth.isAlpha || auth.role === "admin") return true;
  const u = auth.user || {};

  // 1. Independent Emergency Round Add-on flag
  if (u.has_emergency_round === true) {
    const exp = u.emergency_expires_at ? Date.parse(u.emergency_expires_at) : 0;
    if (!exp || exp > Date.now()) return true;
  }

  // 2. Dedicated plan key
  const planKey = String(u.subscription_plan_key || "").toLowerCase();
  const planStatus = String(u.subscription_status || "").toLowerCase();
  const expires = u.subscription_expires_at ? Date.parse(u.subscription_expires_at) : 0;
  const isTimeValid = !expires || expires > Date.now();
  return planKey === "emergency_round" && (planStatus === "active" || isTimeValid);
}

/**
 * Send Gatekeeper Access Denied Message
 */
export async function sendGatekeeperNotice(chatId) {
  const text = `
🌟 <b>حسابك الحالي: الخطة المجانية (Free Tier)</b> ⚡
━━━━━━━━━━━━━━━━━━━━
أهلاً بك يا بطل في بوت <b>Black Fighters</b> الأكاديمي 🤖

⚠️ ميزات البوت التفاعلية المتقدمة تتطلب باقة نشطة:
• 🧠 حل وامتحان كويزات النظري (EBE) بنظام Telegram Quizzes التفاعلي
• 🔬 لوحة تحكم وامتحانات العملي والصور (OSPE)
• ⚡ تسجيل نتائجك ونقاط الـ XP تلقائياً في حسابك بالموقع
• 🤖 توليد كويزات فورية من أي ملف PDF ترفعه للبوت
• 🔄 مزامنة واستقبال الكويزات المصدرة من المنصة

💡 <b>لتفعيل باقتك والترقية:</b>
اشترك الآن عبر المنصة أو تواصل مع خدمة العملاء للمساعدة والتفعيل الفوري!
  `.trim();

  return sendStyledMessage(chatId, text, {
    inline_keyboard: [
      [{ text: "💎 تفعيل الاشتراك وترقية الحساب", url: `${getAppBaseUrl()}/subscriptions` }],
      [{ text: "💬 خدمة العملاء (واتساب مباشر)", url: "https://wa.me/201009275685?text=%D9%85%D8%B1%D8%AD%D8%A8%D8%A7%D9%8B%D8%8C%20%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%AA%D9%81%D8%B9%D9%8A%D9%84%20%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D8%A8%D9%88%D8%AA%20Black%20Fighters" }],
      [{ text: "🌐 زيارة منصة Black Fighters", url: `${getAppBaseUrl()}` }],
    ],
  });
}

/**
 * Send Native Telegram Quiz Poll
 */
export async function sendNativeQuizPoll(chatId, { question, options, correctOptionId, explanation, replyMarkup, openPeriod }) {
  const payload = {
    chat_id: chatId,
    question: question.slice(0, 300),
    options: options.slice(0, 10).map((opt) => String(opt).slice(0, 100)),
    type: "quiz",
    correct_option_id: correctOptionId,
    is_anonymous: false,
    explanation: (explanation || "إجابة صحيحة وممتازة!").slice(0, 200),
  };
  const timer = Number(openPeriod);
  if (timer >= 5 && timer <= 600) {
    payload.open_period = timer;
  }
  if (replyMarkup) payload.reply_markup = replyMarkup;
  return callTelegramApi("sendPoll", payload);
}

/**
 * Render OSPE Visual Dashboard Grid (matching Screenshot 2)
 */
export async function sendOspeDashboard(chatId, excludedIds = []) {
  const total = OSPE_IMAGE_BANK.length;
  const excludedCount = excludedIds.length;
  const activeCount = total - excludedCount;

  // Build grid of numbers (5 per row)
  const rows = [];
  let currentRow = [];
  for (let i = 1; i <= total; i++) {
    const isExcluded = excludedIds.includes(i);
    const text = isExcluded ? `${i} ❌` : `${i} ✔️`;
    currentRow.push({ text, callback_data: `ospe_toggle:${i}:${excludedIds.join(",")}` });
    if (currentRow.length === 5 || i === total) {
      rows.push(currentRow);
      currentRow = [];
    }
  }

  rows.push([
    { text: "🚀 ابدأ كويز الصور المختارة", callback_data: `ospe_start:${excludedIds.join(",")}` },
  ]);
  rows.push([
    { text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" },
  ]);

  const caption = `
🎛️ <b>لوحة تحكم الـ OSPE:</b>
━━━━━━━━━━━━━━━━━━━━
تم اختيار <b>${activeCount} صورة</b>، واستبعاد <b>${excludedCount} صورة</b>.
اضغط على الرقم لتبديل الحالة 👇
  `.trim();

  return sendStyledMessage(chatId, caption, { inline_keyboard: rows });
}

/**
 * Shared copy for a successful account link (student vs admin).
 */
function buildLinkWelcome(userObj, isAdminUser, chatId) {
  if (isAdminUser) {
    return {
      text: `
👑 <b>أهلاً بك يا قائدنا ومولانا Alpha في غرفة القيادة السيادية!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
تم ربط وتوثيق حساب التيليجرام الخاص بك (ID: <code>${chatId}</code>) بحساب الإدارة الأعلى للمنصة! 🦾
البوت الأكاديمي <code>@black_fighters_bot</code> تحت سيطرتك الكاملة الآن.
      `.trim(),
      keyboard: {
        inline_keyboard: [
          [{ text: "🚨 Emergency (جامعة شرق بورسعيد الأهلية)", callback_data: "cmd_emergency" }],
          [
            { text: "📚 كويزات النظري (EBE)", callback_data: "cmd_ebe_menu" },
            { text: "🔬 كويزات العملي (OSPE)", callback_data: "cmd_ospe_menu" },
          ],
          [{ text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" }],
          [
            { text: "🌐 فتح لوحة الأدمن بالموقع", web_app: { url: `${getAppBaseUrl()}/admin` } },
            { text: "👤 ملفي الأكاديمي", callback_data: "cmd_profile" },
          ],
        ],
      },
    };
  }

  return {
    text: `
🎉 <b>تم ربط حسابك في Black Fighters بنجاح يا ${userObj.full_name || "بطل"}!</b> 👑
━━━━━━━━━━━━━━━━━━━━
أهلاً بك في البوت الأكاديمي الحصري 🤖
الآن يمكنك خوض جميع كويزاتك (EBE و OSPE) وتوليد كويزات من أي ملف ترفعه مباشرة هنا! ⚡

<i>اختر ما تريد البدء به الآن:</i>
    `.trim(),
    keyboard: {
      inline_keyboard: [
        [{ text: "🚨 Emergency (جامعة شرق بورسعيد الأهلية)", callback_data: "cmd_emergency" }],
        [
          { text: "📚 كويزات النظري (EBE)", callback_data: "cmd_ebe_menu" },
          { text: "🔬 كويزات العملي (OSPE)", callback_data: "cmd_ospe_menu" },
        ],
        [
          { text: "👤 ملفي ورصيدي", callback_data: "cmd_profile" },
          { text: "🌐 فتح التطبيق بالكامل", web_app: { url: getAppBaseUrl() } },
        ],
      ],
    },
  };
}

/**
 * Redeems a platform-issued link code for this chat.
 *
 * This is the ONLY way an account gets linked from the bot side. Deep links
 * carry a short-lived single-use code, never a uid or an email, so a leaked or
 * guessed identifier can no longer attach somebody else's account to an
 * attacker's Telegram chat.
 */
async function handleLinkCommand(chatId, rawCode, tgFrom = {}) {
  const result = await consumeLinkCode(rawCode, chatId, tgFrom);
  if (!result.ok) {
    const hint =
      result.error === "INVALID_CODE"
        ? "الكود غير صحيح."
        : result.error === "CODE_EXPIRED"
          ? "الكود انتهت صلاحيته (10 دقايق)."
          : result.error === "CODE_ALREADY_USED"
            ? "الكود مستخدم من قبل."
            : "تعذر إتمام الربط حاليًا.";
    return sendStyledMessage(
      chatId,
      `⛔ <b>${hint}</b>\n━━━━━━━━━━━━━━━━━━━━\nروح لصفحة الإعدادات في المنصة، اضغط «ربط تيليجرام» وخد كود جديد:\n${getAppBaseUrl()}/settings`,
    );
  }

  const userObj = result.user || {};
  const isAdminUser = isAdminUserDoc(userObj);
  const welcome = buildLinkWelcome(userObj, isAdminUser, chatId);
  return sendStyledMessage(chatId, welcome.text, welcome.keyboard);
}

/**
 * Main Webhook Dispatcher
 */
export async function processTelegramWebhookUpdate(update) {
  if (!update) return { ok: true };

  // 0. Poll answers — the ONLY source of a student's real quiz answer.
  //    Without this branch every bot quiz was graded 100% by construction.
  if (update.poll_answer) {
    const pa = update.poll_answer;
    // Telegram sends the answering USER id and the poll id — never the chat id.
    // Quiz sessions are keyed by chat id; in a private bot chat that id IS the
    // user id, which is the only place the quiz flow runs. Group polls are
    // deliberately not attributed (Telegram gives us no chat context), so they
    // simply do not affect any session.
    const sessionKey = pa.user?.id ? String(pa.user.id) : null;
    const outcome = await recordPollAnswer({
      chatId: sessionKey,
      pollId: pa.poll_id,
      optionIds: pa.option_ids || [],
      telegramUserId: pa.user?.id,
    });
    return { ok: true, poll_answer: outcome };
  }

  // 1. Handle Callback Queries (Button Taps)
  if (update.callback_query) {
    const cb = update.callback_query;
    const chatId = cb.message?.chat?.id;
    const data = cb.data || "";

    // ── Alpha Sovereign Decisions (Payment Approvals) ──
    if (data.startsWith("alpha_approve_") || data.startsWith("alpha_reject:")) {
      const alphaChatId = String(getAlphaChatId());
      if (String(chatId) !== alphaChatId) {
        await answerCallback(cb.id, "⛔ غير مصرح لك بهذا الإجراء!");
        return { ok: false };
      }

      await answerCallback(cb.id, "⚡ جارٍ تنفيذ أمرك يا Alpha...");
      const isReject = data.startsWith("alpha_reject:");
      const mode = data.startsWith("alpha_approve_code") ? "code" : "direct";
      const requestId = data.split(":")[1];

      try {
        const res = await executePaymentDecision({
          requestId,
          action: isReject ? "reject" : "approve",
          deliveryMode: mode,
          adminNote: "معتمد سيادياً من تليجرام بواسطة Alpha",
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
            `❌ <b>تم تنفيذ أمر الرفض يا Alpha:</b>\nتم رفض الطلب <code>${requestId}</code> للطالب <b>${res.userName || "مستخدم"}</b> بنجاح!`
          );
        }

        if (mode === "code") {
          return sendStyledMessage(
            chatId,
            `👑 <b>تم تنفيذ أمرك وتوليد الكود يا Alpha:</b>\n🎫 <b>كود التفعيل:</b> <code>${res.code}</code>\n👤 <b>للطالب:</b> ${res.userName}\n📦 <b>الباقة:</b> ${res.productName}\n💰 <b>المبلغ:</b> ${res.amount} EGP`
          );
        }

        return sendStyledMessage(
          chatId,
          `👑 <b>تم تنفيذ أمرك والتفعيل المباشر يا Alpha!</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\n👤 <b>المستخدم:</b> ${res.userName}\n📦 <b>الاشتراك:</b> ${res.productName}\n⚡ <b>الرصيد المشحون:</b> +${res.addedCredits} كريدت\n💰 <b>المبلغ:</b> ${res.amount} EGP`
        );
      } catch (err) {
        return sendStyledMessage(chatId, `⚠️ <b>حصل خطأ أثناء تنفيذ الأمر:</b> <code>${err.message}</code>`);
      }
    }

    // ── Check Subscriber Access for all interactive actions ──
    const auth = await checkSubscriberAccess(chatId);
    if (!auth.isAllowed) {
      await answerCallback(cb.id, "⛔ هذا البوت مخصص للمشتركين فقط!");
      return sendGatekeeperNotice(chatId);
    }

    // ── Main Menu Actions ──
    if (data === "cmd_menu") {
      await answerCallback(cb.id);
      const menuRows = [
        [
          { text: "🚨 Emergency (راوند الطوارئ - EPNU)", callback_data: "cmd_emergency" },
        ],
        [
          { text: "📚 كويزات النظري (EBE)", callback_data: "cmd_ebe_menu" },
          { text: "🔬 كويزات العملي (OSPE)", callback_data: "cmd_ospe_menu" },
        ],
        [
          { text: "👤 ملفي ورصيدي", callback_data: "cmd_profile" },
          { text: "💎 باقات الاشتراك", callback_data: "cmd_plans" },
        ],
      ];

      if (auth.isAlpha) {
        menuRows.push([
          { text: "📊 إحصائيات المنصة الحية (Alpha)", callback_data: "cmd_alpha_stats" },
        ]);
      }

      menuRows.push([
        { text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" }
      ]);

      menuRows.push([
        { text: "🌐 فتح تطبيق المنصة الكامل", web_app: { url: getAppBaseUrl() } },
      ]);

      return sendStyledMessage(
        chatId,
        `⚔️ <b>القائمة الرئيسية لمنصة Black Fighters الأكاديمية:</b>\nاختر مجالك وامتحن كويزاتك فوراً 👇`,
        { inline_keyboard: menuRows }
      );
    }

    if (data === "cmd_alpha_stats") {
      await answerCallback(cb.id);
      if (!auth.isAlpha) return { ok: false };
      let userCount = 0;
      let pendingCount = 0;
      let emergencyCount = 0;
      try {
        if (adminDb) {
          const [uSnap, pSnap, eSnap] = await Promise.all([
            adminDb.collection("users").count().get(),
            adminDb.collection("paymentRequests").where("status", "==", "pending").count().get(),
            adminDb.collection("emergencyContent").count().get(),
          ]);
          userCount = uSnap.data().count;
          pendingCount = pSnap.data().count;
          emergencyCount = eSnap.data().count;
        }
      } catch (e) {
        console.warn("[TelegramEngine] cmd_alpha_stats error:", e.message);
      }
      return sendStyledMessage(
        chatId,
        `📊 <b>إحصائيات المنصة الحية يا Alpha:</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\n👥 <b>إجمالي المستخدمين:</b> ${userCount}\n⏳ <b>طلبات الدفع المعلقة:</b> ${pendingCount}\n🚨 <b>ملفات وكويزات الطوارئ:</b> ${emergencyCount}\n🌐 <b>رابط السيرفر:</b> <code>${getAppBaseUrl()}</code>`,
        {
          inline_keyboard: [
            [{ text: "🔄 تحديث الإحصائيات", callback_data: "cmd_alpha_stats" }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    // ── Emergency Hub for East Port Said National University (EPNU) ──
    if (data === "cmd_emergency" || data === "epnu_menu") {
      await answerCallback(cb.id);

      if (!isEmergencySubscriber(auth)) {
        return sendStyledMessage(
          chatId,
          `🚨 <b>قسم راوند الطوارئ (Emergency Round) مخصص للمشتركين فقط!</b> 🔒\n━━━━━━━━━━━━━━━━━━━━\nهذا القسم مخصص حصرياً للمشتركين في باقة راوند الطوارئ المستقلة (99 ج).\nيحتوي على ملازم ليلة الامتحان المكثفة، ملفات الـ HTML التفاعلية، وكويزات الطوارئ الخاصة بالقائد Alpha.\n\n💰 <b>سعر الاشتراك:</b> 99 جنيه مصري فقط.\n\nاضغط أدناه للاشتراك وتفعيل وصولك الفوري 👇`,
          {
            inline_keyboard: [
              [{ text: "💳 اشترك في باقة الطوارئ (99 ج)", web_app: { url: `${getAppBaseUrl()}/subscriptions` } }],
              [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
            ],
          }
        );
      }

      const isAlphaUser = auth.isAlpha;
      const emergencyWelcome = `
🚨 <b>قسم الطوارئ الأكاديمي — جامعة شرق بورسعيد الأهلية (EPNU)</b> ⚡
━━━━━━━━━━━━━━━━━━━━
مرحباً بكم يا أبطال راوند الطوارئ! 🎓🏛️
هذا القسم مُخصص ومُعد بإشراف القائد <b>Alpha</b> حصرياً:
• 📄 شروحات وملازم تفاعلية بصيغة HTML مخصصة للعرض السريع.
• 📥 ملفات وملازم الطوارئ وليالي الامتحان بصيغة PDF.
• ⚡ بنك أسئلة وكويزات تدريبية متوقعة للامتحانات.

<i>اختر القسم المطلوب لتصفحه والتدريب عليه فوراً:</i>
      `.trim();

      const buttons = [
        [{ text: "📝 كويزات شرق بورسعيد الأهلية ⚡", callback_data: "epnu_quizzes" }],
        [{ text: "📂 ملفات وملازم الطوارئ (HTML & PDF) 📥", callback_data: "epnu_files" }],
        [{ text: "🌐 تصفح راوند الطوارئ بالمنصة 📱", web_app: { url: `${getAppBaseUrl()}/emergency` } }],
        [{ text: "💡 طلب كويز أو ملخص لمقرر معين ✍️", callback_data: "epnu_request" }],
      ];

      if (isAlphaUser) {
        buttons.push([
          { text: "👑 لوحة رفع الكويزات والملفات (Alpha)", callback_data: "epnu_admin_info" },
        ]);
      }

      buttons.push([{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }]);

      return sendStyledMessage(chatId, emergencyWelcome, { inline_keyboard: buttons });
    }

    if (data === "epnu_quizzes") {
      await answerCallback(cb.id);

      if (!isEmergencySubscriber(auth)) {
        return sendGatekeeperNotice(chatId);
      }

      let quizzes = [];
      try {
        if (adminDb) {
          // Check emergencyContent for quizzes first
          const snapEm = await adminDb.collection("emergencyContent")
            .where("contentType", "==", "quiz")
            .where("isActive", "==", true)
            .limit(6)
            .get();
          if (!snapEm.empty) {
            quizzes.push(...snapEm.docs.map((d) => ({ id: d.id, ...d.data() })));
          }

          // Then check standaloneQuizzes tagged epnu/emergency
          const snapStd = await adminDb.collection("standaloneQuizzes")
            .where("tags", "array-contains-any", ["epnu", "شرق بورسعيد", "emergency", "طوارئ"])
            .limit(6)
            .get();
          if (!snapStd.empty) {
            quizzes.push(...snapStd.docs.map((d) => ({ id: d.id, ...d.data() })));
          }
        }
      } catch (err) {
        console.warn("[TelegramEngine] fetch epnu quizzes error:", err.message);
      }

      const quizButtons = quizzes.length > 0
        ? quizzes.slice(0, 8).map((q) => ([{ text: `📝 ${q.title || "كويز EPNU"}`, callback_data: `run_custom_quiz:${q.quizId || q.id}:0` }]))
        : [
            [{ text: "🧠 كويز طوارئ إكلينيكي (EPNU)", callback_data: "start_ebe:clinical:0" }],
            [{ text: "💊 كويز فارماكولوجي مكثف (EPNU)", callback_data: "start_ebe:pharma:0" }],
            [{ text: "🔬 كويز تشخيصي OSPE (EPNU)", callback_data: "ospe_next:0:" }],
          ];

      quizButtons.push([{ text: "🔙 رجوع لقسم Emergency", callback_data: "cmd_emergency" }]);

      const quizText = `
🎯 <b>كويزات واختبارات راوند الطوارئ (EPNU):</b> ⚡
━━━━━━━━━━━━━━━━━━━━
${quizzes.length > 0 ? `تم العثور على ${quizzes.length} كويز مرفوع خصيصاً لطلاب راوند الطوارئ:` : "يتم إعداد ورفع الكويزات بانتظام بواسطة القائد Alpha. إليك الكويزات التدريبية المتاحة الآن:"}
      `.trim();

      return sendStyledMessage(chatId, quizText, { inline_keyboard: quizButtons });
    }

    if (data === "epnu_files") {
      await answerCallback(cb.id);

      if (!isEmergencySubscriber(auth)) {
        return sendGatekeeperNotice(chatId);
      }

      let files = [];
      try {
        if (adminDb) {
          const snap = await adminDb.collection("emergencyContent")
            .where("isActive", "==", true)
            .limit(12)
            .get();
          if (!snap.empty) {
            files = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
          }
        }
      } catch (err) {
        console.warn("[TelegramEngine] fetch emergencyContent files error:", err.message);
      }

      const fileButtons = [];
      const fileLines = [];

      if (files.length > 0) {
        files.forEach((f, i) => {
          const typeIcon = f.contentType === "html" ? "📄 HTML:" : "📥 PDF:";
          if (f.contentType === "pdf" && f.fileUrl) {
            fileLines.push(`${i + 1}. ${typeIcon} <a href="${f.fileUrl}">${f.title}</a>`);
          } else {
            fileLines.push(`${i + 1}. ${typeIcon} <b>${f.title}</b>`);
          }
        });
      }

      const fileText = `
📂 <b>مكتبة ملفات وملازم راوند الطوارئ — جامعة شرق بورسعيد الأهلية:</b> 📚
━━━━━━━━━━━━━━━━━━━━
هنا يرفع Alpha ملازم وملخصات المقررات وليالي الامتحان بصيغة HTML و PDF.

${fileLines.length > 0 ? fileLines.join("\n") : "• <i>المكتبة قيد التغذية المستمرة بأحدث ملازم وملخصات الطوارئ.</i>"}

🔗 <i>يمكنك تصفح وقراءة كافة ملفات الـ HTML والـ PDF التفاعلية عبر صفحة راوند الطوارئ بالمنصة:</i>
      `.trim();

      fileButtons.push([
        { text: "🌐 فتح راوند الطوارئ بالمنصة (HTML & PDF)", web_app: { url: `${getAppBaseUrl()}/emergency` } },
      ]);
      fileButtons.push([{ text: "🔙 رجوع لقسم Emergency", callback_data: "cmd_emergency" }]);

      return sendStyledMessage(chatId, fileText, { inline_keyboard: fileButtons });
    }

    if (data === "epnu_request") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `✍️ <b>طلب كويز أو ملخص خاص لجامعة شرق بورسعيد الأهلية:</b>\n━━━━━━━━━━━━━━━━━━━━\nأي طالب في جامعة شرق بورسعيد الأهلية يحتاج تلخيصاً لمحاضرة، أو كويز على شابتر معين، أرسل الملف أو اسم المقرر هنا مباشرة وسيقوم الذكاء الاصطناعي وبإشراف Alpha بإعداده ورفعه لكم فوراً! ⚡\n\n<i>أو يمكنك إرسال أي ملف PDF أو سلايدات أو صورة للمحادثة هنا وسيتم تحويلها لكويز فوراً!</i>`,
        {
          inline_keyboard: [
            [{ text: "🔙 رجوع لقسم Emergency", callback_data: "cmd_emergency" }],
          ],
        }
      );
    }

    if (data === "epnu_admin_info") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `👑 <b>تعليمات الرفع لقسم جامعة شرق بورسعيد الأهلية (خاص بالقائد Alpha):</b>\n━━━━━━━━━━━━━━━━━━━━\n• لرفع كويز خاص بالجامعة: قم بإنشاء الكويز على المنصة وضَع في عنوانه أو وسومه (EPNU أو شرق بورسعيد) أو اضغط 'تصدير للتيليجرام'.\n• لرفع ملف ملخصات مباشر: أرسل أي ملف PDF أو مستند هنا وسيقوم النظام بتسجيله وتوليد بنك أسئلة تلقائي لطلاب الجامعة! ⚡`,
        {
          inline_keyboard: [
            [{ text: "🌐 فتح لوحة الأدمن بالموقع", web_app: { url: `${getAppBaseUrl()}/admin` } }],
            [{ text: "🔙 رجوع لقسم Emergency", callback_data: "cmd_emergency" }],
          ],
        }
      );
    }

    // ── Interactive File & Quiz Actions ──
    if (data === "file_action:quiz") {
      await answerCallback(cb.id);
      if (adminDb) {
        await adminDb.collection("telegram_file_sessions").doc(String(chatId)).update({ status: "waiting_quiz_count" }).catch(() => {});
      }
      const txt = `
🎯 <b>عايز الكويز يكون كام سؤال يا وحش؟</b>

اختر عدد الأسئلة المناسب من الأزرار، أو اكتب أي رقم تريده مباشرة في الشات (مثلاً: 8): ✍️
      `.trim();
      return sendStyledMessage(chatId, txt, {
        inline_keyboard: [
          [
            { text: "⚡ 5 أسئلة (5 كريدت)", callback_data: "file_quiz_count:5" },
            { text: "🎯 10 أسئلة (10 كريدت)", callback_data: "file_quiz_count:10" },
          ],
          [
            { text: "🧠 15 سؤال (15 كريدت)", callback_data: "file_quiz_count:15" },
            { text: "🔥 20 سؤال (20 كريدت)", callback_data: "file_quiz_count:20" },
          ],
          [{ text: "🔙 رجوع", callback_data: "file_action:back" }],
        ],
      });
    }

    if (data === "file_action:summary") {
      await answerCallback(cb.id);
      if (adminDb) {
        await adminDb.collection("telegram_file_sessions").doc(String(chatId)).update({ status: "waiting_summary_type" }).catch(() => {});
      }
      const txt = `
📑 <b>اختر أسلوب التلخيص المطلوب لملفك:</b>
      `.trim();
      return sendStyledMessage(chatId, txt, {
        inline_keyboard: [
          [{ text: "⚡ ملخص سريع ومكثف (5 كريدت)", callback_data: "file_summary_type:concise" }],
          [{ text: "🔬 شرح وتفصيل شامل (10 كريدت)", callback_data: "file_summary_type:detailed" }],
          [{ text: "🎯 نقاط امتحانية وأسئلة سابقة (10 كريدت)", callback_data: "file_summary_type:exam_pearls" }],
          [{ text: "🔙 رجوع", callback_data: "file_action:back" }],
        ],
      });
    }

    if (data === "file_action:concepts") {
      await answerCallback(cb.id);
      return executeFileSummaryAction(chatId, auth, "concepts", 5);
    }

    if (data === "file_action:back") {
      await answerCallback(cb.id);
      if (adminDb) {
        await adminDb.collection("telegram_file_sessions").doc(String(chatId)).update({ status: "waiting_action" }).catch(() => {});
      }
      return sendStyledMessage(chatId, "⚡ <b>تحب أعملك إيه في الملف؟ اختر من الأزرار:</b>", {
        inline_keyboard: [
          [{ text: "📝 كويز وأسئلة تدريبية", callback_data: "file_action:quiz" }],
          [{ text: "📋 تلخيص ذكي وشامل", callback_data: "file_action:summary" }],
          [{ text: "💡 استخراج أهم النقاط والمفاهيم", callback_data: "file_action:concepts" }],
          [{ text: "🔙 إلغاء", callback_data: "cmd_menu" }],
        ],
      });
    }

    if (data.startsWith("file_quiz_count:")) {
      await answerCallback(cb.id);
      const count = parseInt(data.split(":")[1], 10) || 5;
      return executeFileQuizAction(chatId, auth, count);
    }

    if (data.startsWith("file_summary_type:")) {
      await answerCallback(cb.id);
      const mode = data.split(":")[1] || "concise";
      const cost = mode === "concise" ? 5 : 10;
      return executeFileSummaryAction(chatId, auth, mode, cost);
    }

    // ── EBE Theory Quiz Menu ──
    if (data === "cmd_ebe_menu" || data === "cmd_quiz") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `📚 <b>اختر مادة كويز الـ EBE (نظري):</b>\nالأسئلة هتظهرلك فوراً بنظام Telegram Polls التفاعلي مع تصحيح لحظي! ⚡`,
        {
          inline_keyboard: [
            [{ text: "🧠 كويز طب إكلينيكي (Clinical Medicine)", callback_data: "start_ebe:clinical:0" }],
            [{ text: "💊 كويز فارماكولوجي (Pharmacology)", callback_data: "start_ebe:pharma:0" }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    // ── Start EBE Question (matching Screenshot 1) ──
    if (data.startsWith("start_ebe:")) {
      await answerCallback(cb.id);
      const [, subject, idxStr] = data.split(":");
      const index = parseInt(idxStr, 10) || 0;
      const bank = EBE_QUESTION_BANKS[subject] || EBE_QUESTION_BANKS.clinical;
      const q = bank[index];

      if (!q) {
        return sendStyledMessage(
          chatId,
          `🏆 <b>أحسنت يا بطل! أنهيت كويز الـ EBE بنجاح!</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\nتم تسجيل النقاط والـ XP في حسابك الأكاديمي.\nيمكنك خوض امتحان آخر في أي وقت!`,
          {
            inline_keyboard: [
              [{ text: "🔄 إعادة الامتحان", callback_data: `start_ebe:${subject}:0` }],
              [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
            ],
          }
        );
      }

      return sendNativeQuizPoll(chatId, {
        question: `Q${index + 1}/${bank.length}: ${q.q}`,
        options: q.options,
        correctOptionId: q.correct,
        explanation: q.exp,
        replyMarkup: {
          inline_keyboard: [
            index + 1 < bank.length
              ? [{ text: "➡️ السؤال التالي", callback_data: `start_ebe:${subject}:${index + 1}` }]
              : [{ text: "🏁 إنهاء ورؤية النتيجة", callback_data: `start_ebe:${subject}:${bank.length}` }],
            [
              { text: "⏸️ إيقاف مؤقت", callback_data: "cmd_menu" },
              { text: "⏹️ إنهاء ونتائج", callback_data: "cmd_menu" },
            ],
          ],
        },
      });
    }

    // ── OSPE Practical Dashboard (matching Screenshot 2) ──
    if (data === "cmd_ospe_menu") {
      await answerCallback(cb.id);
      return sendOspeDashboard(chatId, []);
    }

    // ── OSPE Toggle Image Number ──
    if (data.startsWith("ospe_toggle:")) {
      await answerCallback(cb.id);
      const [, numStr, listStr = ""] = data.split(":");
      const num = parseInt(numStr, 10);
      let excluded = listStr ? listStr.split(",").map(Number).filter(Boolean) : [];

      if (excluded.includes(num)) {
        excluded = excluded.filter((n) => n !== num);
      } else {
        excluded.push(num);
      }

      return sendOspeDashboard(chatId, excluded);
    }

    // ── Start OSPE Quiz ──
    if (data.startsWith("ospe_start")) {
      await answerCallback(cb.id);
      const parts = data.split(":");
      const excluded = parts[1] ? parts[1].split(",").map(Number).filter(Boolean) : [];
      const activeSlides = OSPE_IMAGE_BANK.filter((s) => !excluded.includes(s.id));

      if (!activeSlides.length) {
        return sendStyledMessage(chatId, "⚠️ لقد استبعدت جميع الصور! اختر صورة واحدة على الأقل للبدء.", {
          inline_keyboard: [[{ text: "🎛️ فتح لوحة التحكم", callback_data: "cmd_ospe_menu" }]],
        });
      }

      const first = activeSlides[0];
      // Send photo first
      await sendStyledPhoto(
        chatId,
        first.url,
        `🔬 <b>Clinical Case Slide [Demo Benchmark / تجريبي]:</b>\n<i>Examine the clinical image carefully, then answer the question below:</i>`
      );
      // Then send the native quiz poll
      return sendNativeQuizPoll(chatId, {
        question: first.question,
        options: first.options,
        correctOptionId: first.correct,
        explanation: first.exp,
        replyMarkup: {
          inline_keyboard: [
            activeSlides.length > 1
              ? [{ text: "➡️ Case التالية", callback_data: `ospe_next:1:${excluded.join(",")}` }]
              : [{ text: "🏁 إنهاء اختبار الـ OSPE", callback_data: "cmd_menu" }],
            [{ text: "🔙 رجوع للوحة التحكم", callback_data: "cmd_ospe_menu" }],
          ],
        },
      });
    }

    // ── OSPE Next Slide ──
    if (data.startsWith("ospe_next:")) {
      await answerCallback(cb.id);
      const [, currentIdxStr, listStr = ""] = data.split(":");
      const currentIdx = parseInt(currentIdxStr, 10);
      const excluded = listStr ? listStr.split(",").map(Number).filter(Boolean) : [];
      const activeSlides = OSPE_IMAGE_BANK.filter((s) => !excluded.includes(s.id));
      const slide = activeSlides[currentIdx];

      if (!slide) {
        return sendStyledMessage(
          chatId,
          `🏆 <b>مبروك! أنهيت بنك شرائح الـ OSPE بنجاح!</b> 🎯\n━━━━━━━━━━━━━━━━━━━━\nتمت مراجعة جميع الصور التشخيصية وتسجيل تقدمك في لوحة الشرف!`,
          {
            inline_keyboard: [
              [{ text: "🎛️ فتح لوحة تحكم OSPE مجدداً", callback_data: "cmd_ospe_menu" }],
              [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
            ],
          }
        );
      }

      await sendStyledPhoto(
        chatId,
        slide.url,
        `🔬 <b>Clinical Case Slide [Demo Benchmark / تجريبي]:</b>\n<i>Examine the clinical image carefully, then answer the question below:</i>`
      );
      return sendNativeQuizPoll(chatId, {
        question: slide.question,
        options: slide.options,
        correctOptionId: slide.correct,
        explanation: slide.exp,
        replyMarkup: {
          inline_keyboard: [
            currentIdx + 1 < activeSlides.length
              ? [{ text: "➡️ Case التالية", callback_data: `ospe_next:${currentIdx + 1}:${excluded.join(",")}` }]
              : [{ text: "🏁 إنهاء اختبار الـ OSPE", callback_data: "cmd_menu" }],
            [{ text: "🔙 رجوع للوحة التحكم", callback_data: "cmd_ospe_menu" }],
          ],
        },
      });
    }

    // ── Run Custom Quiz (Exported from Web or Generated from File) ──
    if (data.startsWith("run_custom_quiz:")) {
      await answerCallback(cb.id);
      const [, quizId, idxStr, timerStr] = data.split(":");
      const index = parseInt(idxStr, 10) || 0;
      const timerSec = timerStr ? parseInt(timerStr, 10) : 0;
      const timerParam = timerSec > 0 ? `:${timerSec}` : ":0";

      let quiz = null;
      try {
        if (adminDb) {
          const doc = await adminDb.collection("standaloneQuizzes").doc(quizId).get();
          if (doc.exists) quiz = doc.data();
          else {
            const qSnap = await adminDb.collection("standaloneQuizzes").where("id", "==", quizId).limit(1).get();
            if (!qSnap.empty) quiz = qSnap.docs[0].data();
            else {
              const quizDoc = await adminDb.collection("quizzes").doc(quizId).get();
              if (quizDoc.exists) quiz = quizDoc.data();
            }
          }
        }
      } catch (err) {
        console.warn("[TelegramEngine] fetch quiz error:", err.message);
      }

      if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
        return sendStyledMessage(chatId, "⚠️ <b>عذراً!</b> تعذر العثور على أسئلة هذا الكويز في قاعدة البيانات.");
      }

      const questions = quiz.questions;

      // Start a fresh session on question 0 so `poll_answer` updates have
      // somewhere to land (previously there was no session at all, which is why
      // every attempt was recorded as a perfect score).
      if (index === 0) {
        await startQuizSession({
          chatId,
          uid: auth.userId,
          quizId,
          total: questions.length,
          userName: auth.user?.full_name || auth.name || "Student",
        });
      }

      if (index >= questions.length) {
        // Finish: read the answers Telegram reported and persist the TRUE score.
        const result = await finishQuizSession({ chatId, quizTitle: quiz.title || "الكويز" });
        const total = result?.total || questions.length;
        const correct = result?.correct ?? 0;
        const percentage = result?.percentage ?? 0;
        const earnedXp = result?.earnedXp ?? 0;

        return sendStyledMessage(
          chatId,
          result
            ? formatQuizResult({
                correct,
                total,
                percentage,
                unanswered: result.unanswered,
                earnedXp,
                quizTitle: quiz.title || "الكويز",
              })
            : `⚠️ <b>مفيش جلسة كويز نشطة</b> — ابدأ الكويز من الأول.`,
          {
            inline_keyboard: [
              [{ text: "🔄 إعادة الامتحان", callback_data: `run_custom_quiz:${quizId}:0${timerParam}` }],
              [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
            ],
          }
        );
      }

      const q = questions[index];
      const stem = q.question || q.q || `Question ${index + 1}`;
      const rawOptions = Array.isArray(q.options) ? q.options : ["A", "B", "C", "D"];
      const options = rawOptions.map((opt) => (typeof opt === "object" ? opt.text || opt.label : String(opt)));
      const correctId = resolveCorrectOptionIndex(q, options);
      const exp = q.explanation || q.exp || "إجابة صحيحة وممتازة!";
      const imgUrl = q.image_url || q.image || q.thumbnailDataUrl || q.photo || q.slideUrl || q.img || null;

      if (imgUrl) {
        await sendStyledPhoto(chatId, imgUrl, `🔬 <b>شريحة السؤال (${index + 1}/${questions.length}):</b>`);
        await new Promise((r) => setTimeout(r, 150));
      }

      const sentPoll = await sendNativeQuizPoll(chatId, {
        question: `Q${index + 1}/${questions.length}: ${stem}`.slice(0, 300),
        options: options.slice(0, 10),
        correctOptionId: correctId >= 0 && correctId < options.length ? correctId : 0,
        explanation: exp,
        openPeriod: timerSec > 0 ? timerSec : null,
        replyMarkup: {
          inline_keyboard: [
            index + 1 < questions.length
              ? [{ text: "➡️ السؤال التالي", callback_data: `run_custom_quiz:${quizId}:${index + 1}${timerParam}` }]
              : [{ text: "🏁 إنهاء ورؤية النتيجة", callback_data: `run_custom_quiz:${quizId}:${questions.length}${timerParam}` }],
            [
              { text: "🔄 إعادة السؤال", callback_data: `run_custom_quiz:${quizId}:${index}${timerParam}` },
              { text: "⏹️ إنهاء الكويز", callback_data: "cmd_menu" },
            ],
          ],
        },
      });

      // Map Telegram's poll id → this question so the incoming `poll_answer`
      // update can be attributed to the right question and answer key.
      await rememberQuestionPoll({
        chatId,
        index,
        pollId: sentPoll?.result?.poll?.id,
        correctOptionId: correctId >= 0 && correctId < options.length ? correctId : 0,
        total: questions.length,
      });

      return sentPoll;
    }

    // ── Notification opt-out (the button the notification budget emits) ──
    // `optout:<type>` was produced for months with NO handler, so tapping
    // "🔕 mute this" silently did nothing.
    if (data.startsWith("optout:")) {
      const type = data.slice("optout:".length);
      await answerCallback(cb.id, "تمام ✅");
      if (!auth?.userId) {
        return sendStyledMessage(
          chatId,
          `ℹ️ اربط حسابك الأول عشان نحفظ تفضيلاتك:\n${getAppBaseUrl()}/settings`,
        );
      }
      await optOutOfType({ uid: auth.userId, type });
      return sendStyledMessage(
        chatId,
        `🔕 <b>تمام — مش حنبعتلك تنبيهات «${type}» تاني.</b>\nتقدر ترجّعها في أي وقت من إعدادات المنصة 👇`,
        { inline_keyboard: [[{ text: "⚙️ إعدادات التنبيهات", url: `${getAppBaseUrl()}/settings` }]] },
      );
    }

    // ── Profile and Plans Info ──
    if (data === "cmd_profile") {
      await answerCallback(cb.id);
      const user = auth.user || {};
      return sendStyledMessage(
        chatId,
        `👤 <b>بيانات المحارب الأكاديمية:</b>\n━━━━━━━━━━━━━━━━━━━━\n• <b>الاسم:</b> ${user.full_name || auth.name || "محارب"}\n• <b>الرتبة:</b> ${user.subscription_plan === "premium" ? "VIP Premium 👑" : "Elite Fighter ⚔️"}\n• <b>رصيد الكريدتس:</b> ${user.credits ?? 10} ⚡\n• <b>الـ XP:</b> ${user.xp || 2450} XP 🏆`,
        {
          inline_keyboard: [
            [{ text: "🌐 فتح ملفي الشخصي في المنصة", web_app: { url: `${getAppBaseUrl()}/profile` } }],
            [{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    if (data === "cmd_plans") {
      await answerCallback(cb.id);
      return sendStyledMessage(
        chatId,
        `💎 <b>باقات واشتراكات Black Fighters الرسمية:</b>\n━━━━━━━━━━━━━━━━━━━━\n• <b>Starter:</b> 29 EGP (250K توكن + وصول البوت الذكي)\n• <b>Pro ⭐:</b> 59 EGP (Claude Sonnet 5 + كويزات وتلخيص غير محدود)\n• <b>Supreme Alpha 👑:</b> 99 EGP (كافة الـ 31 موديل + أولوية قصوى ودعم VIP)\n• <b>🚨 راوند الطوارئ (Emergency Round):</b> 99 EGP (ملازم HTML + كويزات شرق بورسعيد الأهلية EPNU)`,
        {
          inline_keyboard: [
            [{ text: "🚀 ترقية حسابي في التطبيق", web_app: { url: `${getAppBaseUrl()}/subscriptions` } }],
            [{ text: "💬 خدمة العملاء (واتساب)", url: "https://wa.me/201009275685?text=%D8%A3%D8%B1%D9%8A%D8%AF%20%D8%A7%D9%84%D8%A7%D8%B4%D8%AA%D8%B1%D8%A7%D9%83%20%D9%81%D9%8A%20Black%20Fighters" }],
            [{ text: "🔙 رجوع", callback_data: "cmd_menu" }],
          ],
        }
      );
    }

    await answerCallback(cb.id);
    return { ok: true };
  }

  // 2. Handle Messages (Text, Documents, Photos)
  if (update.message) {
    const msg = update.message;
    const chatId = msg.chat?.id;
    const text = (msg.text || "").trim();

    // ── Account Linking via deep link (`/start link_<code>`) ──
    // The payload is a short-lived single-use CODE, never a uid and never an
    // email. See _shared/telegram-link.mjs for the vulnerability this replaces.
    if (text.startsWith("/start link_")) {
      const code = text.replace("/start link_", "").trim();
      return handleLinkCommand(chatId, code, msg.from || {});
    }

    // ── Unlink (`/unlink`) ──
    if (text === "/unlink" || text === "/فصل") {
      const access = await checkSubscriberAccess(chatId);
      if (access.isAllowed && access.userId) {
        await unlinkTelegram(access.userId);
        return sendStyledMessage(
          chatId,
          "✅ <b>تم فصل حساب التيليجرام عن المنصة.</b>\nتقدر تعيد الربط في أي وقت من إعدادات المنصة.",
          { inline_keyboard: [[{ text: "🌐 فتح الإعدادات", url: `${getAppBaseUrl()}/settings` }]] },
        );
      }
      return sendStyledMessage(
        chatId,
        `ℹ️ حسابك مش مربوط بالمنصة حاليًا.\nاربطه من: ${getAppBaseUrl()}/settings`,
      );
    }

    // ── Direct link command (`/link <code>` / `/bind <code>`) ──
    if (text.startsWith("/link") || text.startsWith("/bind")) {
      const code = text.replace(/^\/(?:link|bind)\s*/i, "").trim();
      if (!code) {
        return sendStyledMessage(
          chatId,
          `💡 <b>طريقة ربط حسابك:</b>\n━━━━━━━━━━━━━━━━━━━━\nافتح المنصة ← الإعدادات ← «ربط تيليجرام»، وخد كود الربط (8 حروف) وابعته هنا:\n<code>/link ABC123XY</code>`,
          { inline_keyboard: [[{ text: "🌐 فتح الإعدادات", url: `${getAppBaseUrl()}/settings` }]] },
        );
      }
      return handleLinkCommand(chatId, code, msg.from || {});
    }

    // ── Handle Launching Quiz Exported from Web (`/start quiz_<quizId>`) ──
    if (text.startsWith("/start quiz_")) {
      const quizId = text.replace("/start quiz_", "").trim();
      const auth = await checkSubscriberAccess(chatId);
      if (!auth.isAllowed) {
        return sendGatekeeperNotice(chatId);
      }

      let quiz = null;
      try {
        if (adminDb) {
          const doc = await adminDb.collection("standaloneQuizzes").doc(quizId).get();
          if (doc.exists) quiz = doc.data();
          else {
            const qSnap = await adminDb.collection("standaloneQuizzes").where("id", "==", quizId).limit(1).get();
            if (!qSnap.empty) quiz = qSnap.docs[0].data();
          }
        }
      } catch (e) {
        console.warn("[TelegramEngine] Load quiz error:", e.message);
      }

      if (!quiz || !Array.isArray(quiz.questions) || !quiz.questions.length) {
        return sendStyledMessage(
          chatId,
          "⚠️ <b>عذراً!</b> لم يتم العثور على هذا الكويز في قاعدة البيانات أو أنه لا يحتوي على أسئلة بعد.",
          { inline_keyboard: [[{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }]] }
        );
      }

      const welcomeQuiz = `
📚 <b>كويز مستورد من منصة Black Fighters:</b> ⚡
━━━━━━━━━━━━━━━━━━━━
🏷️ <b>العنوان:</b> ${quiz.title || "كويز طبي"}
📝 <b>عدد الأسئلة:</b> ${quiz.questions.length} سؤال
👤 <b>المنشئ:</b> ${quiz.owner_name || "مستخدم"}

<i>اضغط أدناه لبدء الامتحان فوراً بنظام Telegram Polls التفاعلي:</i>
      `.trim();

      return sendStyledMessage(chatId, welcomeQuiz, {
        inline_keyboard: [
          [
            { text: "⏱️ بدون مؤقت", callback_data: `run_custom_quiz:${quizId}:0:0` },
            { text: "⚡ 30 ثانية", callback_data: `run_custom_quiz:${quizId}:0:30` },
            { text: "⏳ 60 ثانية", callback_data: `run_custom_quiz:${quizId}:0:60` },
          ],
          [{ text: "🚀 ابدأ الامتحان الآن", callback_data: `run_custom_quiz:${quizId}:0:0` }],
          [{ text: "🌐 فتح الكويز بالموقع", url: `${getAppBaseUrl()}/q/${quizId}` }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── Handle Document / File / Image Upload -> Interactive AI Flow ──
    if (msg.document || (msg.photo && msg.photo.length > 0)) {
      const auth = await checkSubscriberAccess(chatId);
      if (!auth.isAllowed) {
        return sendGatekeeperNotice(chatId);
      }

      const fileDoc = msg.document;
      const fileName = fileDoc?.file_name || (msg.photo ? "Clinical_Case.jpg" : "Medical_Lecture.pdf");
      const fileId = fileDoc?.file_id || (msg.photo ? msg.photo[msg.photo.length - 1].file_id : "");
      const isPhoto = Boolean(msg.photo && msg.photo.length > 0) || /\.(jpe?g|png|webp)$/i.test(fileName) || (fileDoc?.mime_type || "").startsWith("image/");
      const mimeType = fileDoc?.mime_type || (isPhoto ? "image/jpeg" : "application/pdf");

      if (adminDb && fileId) {
        await adminDb.collection("telegram_file_sessions").doc(String(chatId)).set({
          chatId: String(chatId),
          fileId,
          fileName,
          mimeType,
          isPhoto,
          caption: msg.caption || "",
          status: "waiting_action",
          userId: auth.userId || null,
          updatedAt: Date.now(),
        });
      }

      const promptText = `
⚡ <b>استلمت ملفك الأكاديمي يا بطل!</b>
📁 <code>${fileName}</code>

تحب أعملك بيه إيه دلوقتي؟ اختر من الأزرار: 👇
      `.trim();

      return sendStyledMessage(chatId, promptText, {
        inline_keyboard: [
          [{ text: "📝 كويز وأسئلة تدريبية", callback_data: "file_action:quiz" }],
          [{ text: "📋 تلخيص ذكي وشامل", callback_data: "file_action:summary" }],
          [{ text: "💡 استخراج أهم النقاط والمفاهيم", callback_data: "file_action:concepts" }],
          [{ text: "🔙 إلغاء", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── Verify Subscriber Status for all other text inputs ──
    const auth = await checkSubscriberAccess(chatId);

    // ── If Alpha, show Supreme Sovereign Command Panel ──
    if (auth.isAlpha) {
      if (text === "/stats") {
        let userCount = 0;
        let pendingCount = 0;
        let emergencyCount = 0;
        try {
          if (adminDb) {
            const [uSnap, pSnap, eSnap] = await Promise.all([
              adminDb.collection("users").count().get(),
              adminDb.collection("paymentRequests").where("status", "==", "pending").count().get(),
              adminDb.collection("emergencyContent").count().get(),
            ]);
            userCount = uSnap.data().count;
            pendingCount = pSnap.data().count;
            emergencyCount = eSnap.data().count;
          }
        } catch (e) {
          console.warn("[TelegramEngine] /stats error:", e.message);
        }
        return sendStyledMessage(
          chatId,
          `📊 <b>إحصائيات المنصة الحية يا Alpha:</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\n👥 <b>المستخدمين:</b> ${userCount}\n⏳ <b>طلبات الدفع المعلقة:</b> ${pendingCount}\n🚨 <b>ملفات وكويزات الطوارئ:</b> ${emergencyCount}\n🌐 <b>رابط السيرفر:</b> <code>${getAppBaseUrl()}</code>`
        );
      }
    }

    const isMenuCommand = /^(?:\/start|\/menu|\/main|\/home|menu|home|القائمة|القائمة الرئيسية|القائمه الرئيسيه|العودة للقائمة الرئيسية|العوده للقائمه الرئيسيه|🔙|🔙\s*القائمة الرئيسية|رجوع|🔙\s*رجوع)$/i.test(text.trim());

    // ── If Alpha, show Supreme Sovereign Command Panel ──
    if (auth.isAlpha) {
      if (text === "/stats") {
        let userCount = 0;
        let pendingCount = 0;
        let emergencyCount = 0;
        try {
          if (adminDb) {
            const [uSnap, pSnap, eSnap] = await Promise.all([
              adminDb.collection("users").count().get(),
              adminDb.collection("paymentRequests").where("status", "==", "pending").count().get(),
              adminDb.collection("emergencyContent").count().get(),
            ]);
            userCount = uSnap.data().count;
            pendingCount = pSnap.data().count;
            emergencyCount = eSnap.data().count;
          }
        } catch (e) {
          console.warn("[TelegramEngine] /stats error:", e.message);
        }
        return sendStyledMessage(
          chatId,
          `📊 <b>إحصائيات المنصة الحية يا Alpha:</b> ⚡\n━━━━━━━━━━━━━━━━━━━━\n👥 <b>المستخدمين:</b> ${userCount}\n⏳ <b>طلبات الدفع المعلقة:</b> ${pendingCount}\n🚨 <b>ملفات وكويزات الطوارئ:</b> ${emergencyCount}\n🌐 <b>رابط السيرفر:</b> <code>${getAppBaseUrl()}</code>`
        );
      }

      if (isMenuCommand || text.startsWith("/admin")) {
        const welcome = `
👑 <b>أهلاً بك يا قائدنا ومولانا Alpha في غرفة القيادة السيادية!</b> ⚡
━━━━━━━━━━━━━━━━━━━━
البوت الأكاديمي <code>@black_fighters_bot</code> متصل بالسيرفر المركزي وقاعدة بيانات Firestore بنجاح.

<b>تحكمك المباشر:</b>
• استقبال إشعارات الدفع والتحويل لحظة بلحظة مع خيارات التفعيل المباشر
• مراقبة كويزات الطلاب وامتحانات الـ EBE و الـ OSPE
• رفع أي ملف أو مستند مباشرة لتوليد كويز طبي كامل منه
• تصفح وإدارة راوند الطوارئ (HTML / PDF / كويزات)
• كتابة <code>/stats</code> لجلب إحصائيات سريعة
        `.trim();

        return sendStyledMessage(chatId, welcome, {
          inline_keyboard: [
            [
              { text: "🚨 راوند الطوارئ (EPNU)", callback_data: "cmd_emergency" },
              { text: "📊 إحصائيات سريعة", callback_data: "cmd_alpha_stats" },
            ],
            [
              { text: "📚 كويزات النظري (EBE)", callback_data: "cmd_ebe_menu" },
              { text: "🔬 كويزات العملي (OSPE)", callback_data: "cmd_ospe_menu" },
            ],
            [
              { text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" },
            ],
            [
              { text: "🌐 فتح لوحة الأدمن بالموقع", web_app: { url: `${getAppBaseUrl()}/admin` } },
            ],
          ],
        });
      }
    }

    // ── If Unauthorized / Unsubscribed User, Block Access ──
    if (!auth.isAllowed) {
      return sendGatekeeperNotice(chatId);
    }

    // ── Authorized Student Standard Commands ──
    if (isMenuCommand) {
      const studentWelcome = `
⚔️ <b>أهلاً بك في منصة Black Fighters الأكاديمية!</b> ⚔️
━━━━━━━━━━━━━━━━━━━━
مرحباً بك يا <b>${auth.user?.full_name || "محارب"}</b> في بوتك الأكاديمي الذكي.
امتحن كويزات النظري والعملي، أو ارفع أي ملف (PDF/DOCX) ليعمل منه كويز فوراً! 🚀
      `.trim();

      return sendStyledMessage(chatId, studentWelcome, {
        inline_keyboard: [
          [
            { text: "🚨 Emergency (جامعة شرق بورسعيد الأهلية)", callback_data: "cmd_emergency" },
          ],
          [
            { text: "📚 كويزات النظري (EBE)", callback_data: "cmd_ebe_menu" },
            { text: "🔬 كويزات العملي (OSPE)", callback_data: "cmd_ospe_menu" },
          ],
          [
            { text: "👤 ملفي ورصيدي", callback_data: "cmd_profile" },
            { text: "💎 باقات الاشتراك", callback_data: "cmd_plans" },
          ],
          [
            { text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" },
          ],
          [
            { text: "🌐 فتح تطبيق المنصة الكامل", web_app: { url: getAppBaseUrl() } },
          ],
        ],
      });
    }

    if (text.startsWith("/emergency") || text.toLowerCase() === "emergency" || text.includes("طوارئ") || text.includes("شرق بورسعيد")) {
      const isAlphaUser = auth.isAlpha;
      const emergencyWelcome = `
🚨 <b>قسم الطوارئ الأكاديمي — جامعة شرق بورسعيد الأهلية (EPNU)</b> ⚡
━━━━━━━━━━━━━━━━━━━━
مرحباً بكم يا أبطال جامعة شرق بورسعيد الأهلية! 🎓🏛️
هذا القسم مُخصص ومُعد بإشراف القائد <b>Alpha</b> حصرياً لرفع:
• 📑 ملخصات وملازم الطوارئ وليالي الامتحان.
• 🎯 بنك أسئلة وتجميعات امتحانات سابقة وكويزات متوقعة للجامعة.
• ⚡ كويزات تدريبية فورية مخصصة لمقرراتكم الدراسية.

<i>اختر القسم المطلوب لتصفحه والتدريب عليه فوراً:</i>
      `.trim();

      const buttons = [
        [{ text: "📝 كويزات شرق بورسعيد الأهلية ⚡", callback_data: "epnu_quizzes" }],
        [{ text: "📂 ملفات وملازم الطوارئ (PDF) 📥", callback_data: "epnu_files" }],
        [{ text: "💡 طلب كويز أو ملخص لمقرر معين ✍️", callback_data: "epnu_request" }],
      ];

      if (isAlphaUser) {
        buttons.push([
          { text: "👑 لوحة رفع الكويزات والملفات (Alpha)", callback_data: "epnu_admin_info" },
        ]);
      }

      buttons.push([{ text: "🔙 رجوع للقائمة الرئيسية", callback_data: "cmd_menu" }]);

      return sendStyledMessage(chatId, emergencyWelcome, { inline_keyboard: buttons });
    }

    if (text.startsWith("/quiz") || text.startsWith("/ebe")) {
      return sendStyledMessage(chatId, "📚 اختر مادة الكويز للبدء:", {
        inline_keyboard: [
          [{ text: "🧠 كويز طب إكلينيكي (Clinical Medicine)", callback_data: "start_ebe:clinical:0" }],
          [{ text: "💊 كويز فارماكولوجي (Pharmacology)", callback_data: "start_ebe:pharma:0" }],
        ],
      });
    }

    if (text.startsWith("/ospe")) {
      return sendOspeDashboard(chatId, []);
    }

    if (text.startsWith("/app") || text.startsWith("/apk")) {
      const apkText = `
📱 <b>تحميل تطبيق الأندرويد (APK)</b>
━━━━━━━━━━━━━━━━━━━━
للحصول على أفضل تجربة لـ Black Fighters، حمّل تطبيق الأندرويد المخصص:

<b>تعليمات التثبيت:</b>
1. اضغط على رابط التحميل أو الزر بالأسفل.
2. قم بالموافقة على تثبيت التطبيقات من مصادر غير معروفة إذا طلب منك.
3. افتح التطبيق وسجل دخولك وابدأ المذاكرة! 🚀
      `.trim();
      return sendStyledMessage(chatId, apkText, {
        inline_keyboard: [
          [{ text: "⬇️ تحميل التطبيق المباشر (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── Handle Long Text / Notes Pasted by Student -> Generate Quiz ──
    if (text.length > 80 && (text.includes("quiz") || text.includes("كويز") || text.includes("سؤال") || text.includes("exam") || text.split("\n").length >= 3)) {
      await sendStyledMessage(chatId, "⚡ <b>استلمت ملاحظاتك الأكاديمية!</b>\n<i>جاري تحليل النص وتوليد كويز طبي فوري...</i> ⏳");
      try {
        const quizGenerated = await generateQuizFromText(text, "كويز من الملاحظات");
        let newQuizId = "tq_" + Date.now();
        if (adminDb) {
          const savedDoc = await adminDb.collection("standaloneQuizzes").add({
            title: quizGenerated.title || "كويز من الملاحظات",
            owner_id: auth.userId || auth.user?.id || "telegram_user",
            owner_name: auth.user?.full_name || auth.name || "محارب Black Fighters",
            questions: quizGenerated.questions.map((q) => ({
              question: q.q,
              options: q.options,
              correct_answer: q.correct,
              explanation: q.exp,
            })),
            is_public: true,
            created_date: new Date().toISOString(),
            source: "telegram_text",
          });
          newQuizId = savedDoc.id;
        }

        return sendStyledMessage(
          chatId,
          `🎉 <b>تم إنشاء وتدقيق ${quizGenerated.questions.length} سؤال بنجاح!</b> 🧠⚡\nاضغط أدناه لبدء الامتحان فوراً:`,
          {
            inline_keyboard: [
              [
                { text: "⏱️ بدون مؤقت", callback_data: `run_custom_quiz:${newQuizId}:0:0` },
                { text: "⚡ 30 ثانية", callback_data: `run_custom_quiz:${newQuizId}:0:30` },
                { text: "⏳ 60 ثانية", callback_data: `run_custom_quiz:${newQuizId}:0:60` },
              ],
              [{ text: "🚀 ابدأ الكويز الآن", callback_data: `run_custom_quiz:${newQuizId}:0:0` }],
              [{ text: "🌐 فتح الكويز بالموقع", url: `${getAppBaseUrl()}/q/${newQuizId}` }],
              [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
            ],
          }
        );
      } catch (err) {
        console.warn("[TelegramEngine] Generate from text error:", err.message);
      }
    }

    // ── /summary / /تلخيص Command ──
    if (text.startsWith("/summary") || text.startsWith("/summarize") || text.startsWith("/تلخيص")) {
      const topic = text.replace(/^\/(?:summary|summarize|تلخيص)\s*/i, "").trim();
      if (!topic) {
        return sendStyledMessage(
          chatId,
          "💡 <b>طريقة التلخيص الطبي:</b>\nاكتب الموضوع بعد الأمر، مثلاً:\n<code>/summary Acute Appendicitis</code>\nأو أرسل أي ملف (PDF/DOCX/HTML) ليتم تلخيصه وتحويله لكويز فوراً! ⚡"
        );
      }
      await sendStyledMessage(chatId, `⏳ <b>جاري إعداد التلخيص الطبي الذكي لموضوع:</b> <code>${topic}</code>...`);
      const summaryResult = await generateMedicalSummary(topic);
      return sendStyledMessage(chatId, summaryResult, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── Check if User is replying with Question Count for a Waiting File ──
    const matchNum = text.match(/^(\d+)$/) || text.match(/(\d+)\s*(?:سؤال|أسئلة|questions?)?/i);
    if (adminDb && matchNum) {
      const sessionDoc = await adminDb.collection("telegram_file_sessions").doc(String(chatId)).get().catch(() => null);
      if (sessionDoc?.exists && sessionDoc.data().status === "waiting_quiz_count") {
        const count = parseInt(matchNum[1], 10);
        if (count >= 3 && count <= 30) {
          return executeFileQuizAction(chatId, auth, count);
        }
      }
    }

    // ── /browser / /بحث Command ──
    if (text.startsWith("/browser") || text.startsWith("/بحث") || text.startsWith("/search")) {
      const query = text.replace(/^\/(?:browser|بحث|search)\s*/i, "").trim();
      if (!query) {
        return sendStyledMessage(
          chatId,
          "🌐 <b>مستعرض ومحرك البحث الأكاديمي (Black Fighters Browser):</b>\nاكتب الموضوع أو السؤال الطبي بعد الأمر للبحث في أحدث المراجع والإرشادات السريرية، مثلاً:\n<code>/browser Sepsis resuscitation bundle guidelines</code>\n<code>/browser أحدث بروتوكولات علاج ارتفاع ضغط الدم</code> ⚡"
        );
      }
      await sendStyledMessage(chatId, `🌐 <i>جاري تصفح أحدث المراجع والإرشادات السريرية حول:</i> <code>${query}</code>... ⏳`);
      const browserPrompt = `أنت محرك بحث ومستعرض أكاديمي متقدم (Black Fighters Academic Browser) لطلاب الطب والعلوم الصحية.
الموضوع المطلوب البحث عنه واستعراضه:
${query}

المطلوب:
1. استعراض أحدث الإرشادات السريرية (Clinical Guidelines) المعتمدة دولياً.
2. تلخيص أهم الحقائق والنقاط الجوهرية (Key Evidence & High-Yield Pearls).
3. الخطوات العلاجية والتشخيصية العملية.
4. إشارة للمصادر الموثوقة (UpToDate, Medscape, PubMed, AHA/ESC/WHO).

اكتب الرد بأسلوب مصري أكاديمي احترافي وجذاب، مدعماً بالإيموجيات والتقسيمات الواضحة والخطوات المرتبة بدون حشو.`;
      const result = await askBlackFightersAi(browserPrompt);
      return sendStyledMessage(chatId, `🌐 <b>نتائج البحث الأكاديمي والاستعراض:</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /plan / /خطة Command ──
    if (text.startsWith("/plan") || text.startsWith("/خطة") || text.startsWith("/جدول")) {
      const subject = text.replace(/^\/(?:plan|خطة|جدول)\s*/i, "").trim();
      if (!subject) {
        return sendStyledMessage(
          chatId,
          "📅 <b>مخطط المذاكرة الذكي (Smart Study Planner):</b>\nاكتب المادة والوقت المتبقي للامتحان بعد الأمر، مثلاً:\n<code>/plan باطنة طوارئ - باقي 5 أيام</code>\n<code>/plan فارما - 3 شباتر في أسبوع</code> ⚡"
        );
      }
      await sendStyledMessage(chatId, `📅 <i>جاري بناء خطة وجدول دراسي تكتيكي مكثف لـ:</i> <code>${subject}</code>... ⏳`);
      const planPrompt = `أنت خبير التخطيط الأكاديمي واستراتيجيات الامتحانات لمنصة Black Fighters.
المادة والهدف المطلوب تنظيم خطة له:
${subject}

المطلوب: بناء خطة مذاكرة محكمة ومكثفة بنظام الكتل الزمنية (Time-Boxing & Pomodoro):
1. 🎯 المستهدف اليومي وتوزيع الشباتر والمواضيع حسب الأهمية الامتحانية (High-Yield Topics).
2. ⏰ جدول زمني مقترح بالساعات وفترات الراحة.
3. 📝 محطات المراجعة السريعة وحل الكويزات.
4. 💡 نصيحة ذهبية للإنتاجية وتجنب التسويف.

اكتب الرد باللهجة الأكاديمية المشجعة لـ Black Fighters مع إيموجيات تحفيزية وتقسيمات سهلة القراءة.`;
      const result = await askBlackFightersAi(planPrompt);
      return sendStyledMessage(chatId, `📅 <b>خطة المذاكرة التكتيكية المقترحة:</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /grill-me / /grill_me / /شفوي Command ──
    if (text.startsWith("/grill-me") || text.startsWith("/grill_me") || text.startsWith("/شفوي") || text.startsWith("/اختبرني")) {
      const topic = text.replace(/^\/(?:grill-me|grill_me|شفوي|اختبرني)\s*/i, "").trim();
      if (!topic) {
        return sendStyledMessage(
          chatId,
          "🔥 <b>محاكي الامتحان الشفوي الحارق (Grill-Me Oral Exam):</b>\nاكتب موضوع الامتحان الشفوي بعد الأمر، مثلاً:\n<code>/grill-me Acute Coronary Syndrome</code>\n<code>/grill-me Shock types and management</code>\nوسأقوم بتمثيل دور أستاذ ورئيس قسم ممتحن يزنقك بأسئلة عيادية واقعية ويقيم إجابتك! 💀⚡"
        );
      }
      await sendStyledMessage(chatId, `🔥 <i>جاري استدعاء الممتحن الأكاديمي لتحضير سؤال شفوي ناري في:</i> <code>${topic}</code>... ⏳`);
      const grillPrompt = `أنت أستاذ طب ورئيس قسم ممتحن في امتحان شفوي سريري حقيقي (Viva / Oral Exam) لمنصة Black Fighters.
الموضوع: ${topic}

المطلوب:
1. تقمص شخصية الممتحن القوي المحترم الذي يختبر التفكير السريري وسرعة البديهة.
2. اطرح سيناريو مريض واقعي في الاستقبال أو العيادة مرتبط بالموضوع.
3. وجه سؤالين محددين جداً للطالب (مثلاً: ما هو القرار الفوري؟ ولماذا استبعدت كذا؟).
4. اطلب منه كتابة إجابته مباشرة للرد عليه وتقييمه من 10 وإعطائه التغذية الراجعة!

اكتب التحدي بأسلوب شيق وحماسي.`;
      const result = await askBlackFightersAi(grillPrompt);
      return sendStyledMessage(chatId, `🔥 <b>امتحانك الشفوي التفاعلي (Grill-Me):</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}\n\n💬 <i>اكتب إجابتك الآن مباشرة في الشات وسيقوم المساعد بتقييمها ومنحك درجتك فوراً!</i>`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /teamwork-preview / /teamwork_preview Command ──
    if (text.startsWith("/teamwork-preview") || text.startsWith("/teamwork_preview") || text.startsWith("/فريق")) {
      const topic = text.replace(/^\/(?:teamwork-preview|teamwork_preview|فريق)\s*/i, "").trim();
      if (!topic) {
        return sendStyledMessage(
          chatId,
          "👥 <b>غرفة استشارات الفريق متعدد الوكلاء (Multi-Agent Teamwork):</b>\nاكتب الموضوع أو الكيس المعقدة بعد الأمر، مثلاً:\n<code>/teamwork-preview Diabetic Ketoacidosis with Hypokalemia</code> ⚡"
        );
      }
      await sendStyledMessage(chatId, `👥 <i>جاري انعقاد جلسة عمل الفريق متعدد الوكلاء حول:</i> <code>${topic}</code>... ⏳`);
      const teamPrompt = `أنت تدير غرفة استشارات طبية متعددة الوكلاء (Multi-Agent Consultation) في Black Fighters لتحليل موضوع:
${topic}

المطلوب: اعرض حواراً استشارياً منظماً بين 4 خبراء متخصصين:
1. 👨‍🏫 **البروفيسور الأكاديمي (The Pathophysiologist)**: يفكك الآلية الحيوية والفسيولوجية العميقة.
2. 🩺 **الطبيب المقيم السريري (The ER Clinician)**: يحدد خطة التعامل الفوري والدقيق وبروتوكول العلاج.
3. 🎯 **خبير لجان الامتحانات (The Exam Strategist)**: يكشف فخاخ الأسئلة والمقارنات الشهيرة في لجان الامتحانات (High-Yield Traps).
4. 🔍 **المراجع النقدي (The Peer Reviewer)**: يراجع الأخطاء القاتلة وموانع الاستعمال (Contraindications & Red Flags).

كل خبير يقدم ملخصه المركز في فقرة قصيرة ذات فائدة قصوى.`;
      const result = await askBlackFightersAi(teamPrompt);
      return sendStyledMessage(chatId, `👥 <b>جلسة استشارات الفريق الأكاديمي:</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /goal / /هدف Command ──
    if (text.startsWith("/goal") || text.startsWith("/هدف")) {
      const goalText = text.replace(/^\/(?:goal|هدف)\s*/i, "").trim();
      if (!goalText) {
        return sendStyledMessage(
          chatId,
          "🎯 <b>متتبع الأهداف الدراسية (Goal Tracker):</b>\nاكتب هدفك التعليمي بعد الأمر لتثبيته وبناء خطة قياس، مثلاً:\n<code>/goal إنهاء راوند الطوارئ وحل 200 كويز خلال 4 أيام</code> ⚡"
        );
      }
      await sendStyledMessage(chatId, `🎯 <i>جاري تسجيل وبرمجة هدفك الدراسي:</i> <code>${goalText}</code>... ⏳`);
      const goalPrompt = `أنت موجه الأهداف ومسؤول المتابعة الأكاديمية (Accountability Coach) في Black Fighters.
الهدف الدراسي للوحش:
${goalText}

المطلوب:
1. صياغة الهدف بصيغة SMART دقيقة ومحددة.
2. تفكيك الهدف إلى 3 أو 4 مراحل إنجاز (Milestones) بأرقام ومخرجات واضحة.
3. تحديد متطلبات الإنجاز من كويزات وتلخيصات.
4. رسالة تحفيزية نارية بأسلوب Black Fighters لدخول المود فوراً.`;
      const result = await askBlackFightersAi(goalPrompt);
      return sendStyledMessage(chatId, `🎯 <b>ميثاق ومراحل تحقيق الهدف:</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /boost / /تعميق Command ──
    if (text.startsWith("/boost") || text.startsWith("/تعميق") || text.startsWith("/تحليل")) {
      const topic = text.replace(/^\/(?:boost|تعميق|تحليل)\s*/i, "").trim();
      if (!topic) {
        return sendStyledMessage(
          chatId,
          "🚀 <b>وضع التفكير العميق والحسم (Black Fighters Boost Mode):</b>\nاكتب السؤال المعقد أو الكيس الصعبة أو المفهوم الغامض بعد الأمر:\n<code>/boost عيان عنده ضيق تنفس وأشعة الصدر سليمة، تفكيك التشخيص التفريقي</code> ⚡"
        );
      }
      await sendStyledMessage(chatId, `🚀 <i>تفعيل وضع التفكير الفائق (Deep Reasoning Boost) لفك طلاسم:</i> <code>${topic}</code>... ⏳`);
      const boostPrompt = `أنت في وضع التفكير الفائق والتحليل المعمق (Deep Reasoning Boost Engine) في Black Fighters.
المسألة أو الحالة الصعبة:
${topic}

المطلوب: تحليل استدلالي متعدد الطبقات (Chain of Thought):
1. 🔬 تفكيك المعطيات والأدلة الخفية (Hidden Clinical Clues).
2. 🚫 استبعاد الفرضيات الخاطئة والمشتتات وتوضيح سبب استبعادها.
3. 🧬 الرابط الميكانيكي الجوهري (Underlying Pathological Mechanism).
4. 🏆 الخلاصة الحاسمة واللؤلؤة الامتحانية (Exam Gold Pearl).

التحليل يجب أن يكون بمستوى استشاري فائق الوضوح والدقة.`;
      const result = await askBlackFightersAi(boostPrompt);
      return sendStyledMessage(chatId, `🚀 <b>نتائج التفكير العميق والتحليل الفائق (Boost):</b>\n━━━━━━━━━━━━━━━━━━━━\n${result}`, {
        inline_keyboard: [
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── /help / /مساعدة Command ──
    if (text.startsWith("/help") || text.startsWith("/commands") || text === "مساعدة") {
      // Rendered from COMMANDS (_shared/telegram-commands.mjs) so the help text can
      // advertise a command the dispatcher doesn't implement — `/profile` and
      // `/plans` were listed here for months with no text handler behind them.
      const studentCommands = COMMANDS.filter((c) => c.scope === "student");
      const commandLines = studentCommands
        .map((c) => `• <code>${c.command}</code> — ${c.descriptionAr}`)
        .join("\n");

      const helpText = `
⚔️ <b>دليل أوامر وقدرات بوت Black Fighters الأكاديمي:</b> ⚔️
━━━━━━━━━━━━━━━━━━━━
🤖 <b>القدرات الذكية الخارقة:</b>
• <b>إرسال أي سؤال أكاديمي أو طبي:</b> يجيبك مساعد Black Fighters الذكي بالتحليل والنقاط الامتحانية 🧠
• <b>رفع أي ملف (PDF / DOCX / HTML):</b> استخراج المحتوى وعمل كويز أو تلخيص فوري بالعدد اللي تحدده 📂
• <b>إرسال أي صورة (سلايد، كيس، رسمة، شيت):</b> تحليل بالرؤية الحاسوبية وتوليد أسئلة وتلخيص 📸

⚡ <b>الأوامر:</b>
${commandLines}

💡 <b>معلومة:</b> ملفك ورصيدك وباقاتك كلها في زر واحد جوه القائمة الرئيسية، والمحتوى اللي بيتم إنشاؤه هنا بيظهر تلقائيًا على المنصة.
      `.trim();
      return sendStyledMessage(chatId, helpText, {
        inline_keyboard: [
          [{ text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" }],
          [{ text: "🌐 فتح تطبيق المنصة الكامل", web_app: { url: getAppBaseUrl() } }],
          [{ text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" }],
        ],
      });
    }

    // ── Natural Greeting Detection (Charismatic Egyptian Black Fighters AI) ──
    const GREETING_REGEX = /^(هاي|هاي\s*يا.*|هالو|hello|hi|hey|سلام|السلام عليكم|ازيك|ازيكوا|شغال|مساء الخير|صباح الخير|يا هلا|يا غالي|يا وحش|يا بطل|مين معايا|مين انت)\b/i;
    if (GREETING_REGEX.test(text.trim())) {
      const greetingText = `
يا مرحب بيك يا بطل في <b>Black Fighters AI</b>! ⚔️🔥
أنا رفيقك ومساعدك الأكاديمي والذكي هنا.

معاك في كل خطوة في مذاكرتك:
• 📝 <b>كويزات ذكية:</b> ابعتلي أي ملف (PDF / DOCX / HTML) أو صورة وهطلعلك كويز متدقق بالعدد اللي تختاره!
• 📋 <b>تلخيص محاضرات:</b> لخص أي درس بنقاط امتحانية مركزة.
• 🧠 <b>مساعد طبي ودراسي:</b> اسألني في أي مفهوم أو كيس وهشرحهولك بأعلى دقة.

قولي، بتذاكر إيه النهارده أو حابب نشتغل على إيه سوا؟ ⚡
      `.trim();

      return sendStyledMessage(chatId, greetingText, {
        inline_keyboard: [
          [
            { text: "🚨 Emergency (راوند الطوارئ - EPNU)", callback_data: "cmd_emergency" },
            { text: "📚 كويزات EBE", callback_data: "cmd_ebe_menu" },
          ],
          [
            { text: "👤 ملفي ورصيدي", callback_data: "cmd_profile" },
            { text: "💎 باقات الاشتراك", callback_data: "cmd_plans" },
          ],
          [
            { text: "📱 تحميل تطبيق الأندرويد (APK)", url: "https://blackfighters.site/downloads/BlackFighters.apk" },
          ],
        ],
      });
    }

    // Default conversational AI answer powered by Black Fighters AI
    if (text) {
      await sendStyledMessage(chatId, "🧠 <i>جاري تحليل استفسارك بواسطة Black Fighters AI...</i> ⏳");
      const answer = await askBlackFightersAi(text);
      return sendStyledMessage(
        chatId,
        answer,
        {
          inline_keyboard: [
            [
              { text: "📚 بدء كويز EBE", callback_data: "cmd_ebe_menu" },
              { text: "🔬 بدء كويز OSPE", callback_data: "cmd_ospe_menu" },
            ],
            [
              { text: "🌐 فتح تطبيق المنصة", web_app: { url: getAppBaseUrl() } },
              { text: "🔙 القائمة الرئيسية", callback_data: "cmd_menu" },
            ],
          ],
        }
      );
    }
  }

  return { ok: true };
}
