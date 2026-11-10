import { auth } from "./firebase";
import { getUserGeminiKeySync, getUserGeminiModeSync } from "./integrations";

function defaultFunctionsBase() {
  const viteEnv = import.meta.env || {};
  if (viteEnv.VITE_FUNCTIONS_BASE_URL) return viteEnv.VITE_FUNCTIONS_BASE_URL;
  if (typeof window !== "undefined" && /\.netlify\.app$/i.test(window.location.hostname)) return "/.netlify/functions";
  return "/api";
}

const FUNCTIONS_BASE = defaultFunctionsBase().replace(/\/$/, "");

export async function invokeSecureFunction(name, payload = {}) {
  const user = auth?.currentUser;
  if (!user) throw new Error("سجّل دخولك أولاً");
  const token = await user.getIdToken();

  const userGeminiKey = String(payload?.user_gemini_key || getUserGeminiKeySync() || "").trim();
  const userGeminiMode = String(payload?.ai_key_preference || getUserGeminiModeSync() || "auto_fallback").trim();

  const headers = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
  if (userGeminiKey) {
    headers["X-User-Gemini-Key"] = userGeminiKey;
  }
  if (userGeminiMode) {
    headers["X-User-Gemini-Mode"] = userGeminiMode;
  }

  const enrichedPayload =
    payload && typeof payload === "object" && !Array.isArray(payload)
      ? {
          ...payload,
          ...(userGeminiKey && !payload.user_gemini_key ? { user_gemini_key: userGeminiKey } : {}),
          ...(userGeminiMode && !payload.ai_key_preference ? { ai_key_preference: userGeminiMode } : {}),
        }
      : payload;

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: "POST",
      headers,
      body: JSON.stringify(enrichedPayload),
    });
  } catch (networkError) {
    // Mark transport failures so callers can tell "the server is unreachable"
    // (safe to fall back) from "the server said no" (not safe to fall back).
    const err = new Error(networkError?.message || "تعذر الوصول للسيرفر");
    err.isTransport = true;
    throw err;
  }

  const rawText = await response.text();
  let data = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { error: rawText };
  }

  if (!response.ok) {
    if (response.status === 504) {
      const err = new Error("استغرقت معالجة الفيديو وقتاً طويلاً على السيرفر. حاول تحديد مقطع زمني أقصر.");
      err.status = 504;
      throw err;
    }
    const errMessage = data.message || data.error || `تعذر تنفيذ العملية (${response.status})`;
    const err = new Error(errMessage);
    err.status = response.status;
    err.code = data.error;
    err.isTransport = response.status >= 500;
    throw err;
  }
  return { data };
}
