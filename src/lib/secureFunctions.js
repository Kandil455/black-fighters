import { auth } from "./firebase";

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

  let response;
  try {
    response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
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
    // Prefer the human-readable message (Arabic guidance) over raw error codes
    // like NO_TELEGRAM_LINKED when the server provides both.
    const errMessage = data.message || data.error || `تعذر تنفيذ العملية (${response.status})`;
    const err = new Error(errMessage);
    err.status = response.status;
    err.code = data.error;
    // 5xx is a server-side fault where a client fallback may legitimately help.
    err.isTransport = response.status >= 500;
    throw err;
  }
  return { data };
}
