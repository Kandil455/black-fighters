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
  const response = await fetch(`${FUNCTIONS_BASE}/${name}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify(payload),
  });
  const rawText = await response.text();
  let data = {};
  try {
    data = JSON.parse(rawText);
  } catch {
    data = { error: rawText };
  }
  if (!response.ok) {
    if (response.status === 504) {
      throw new Error("استغرقت معالجة الفيديو وقتاً طويلاً على السيرفر. حاول تحديد مقطع زمني أقصر.");
    }
    // Prefer the human-readable message (Arabic guidance) over raw error codes
    // like NO_TELEGRAM_LINKED when the server provides both.
    const errMessage = data.message || data.error || `تعذر تنفيذ العملية (${response.status})`;
    throw new Error(errMessage);
  }
  return { data };
}
