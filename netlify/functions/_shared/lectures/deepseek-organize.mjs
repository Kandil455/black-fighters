/**
 * deepseek-organize.mjs — server-side adapter for the DeepSeek organizer.
 *
 * The owner's existing integration routes through CodeCraft's OpenAI-compatible
 * endpoint (src/lib/ai.js). We reuse the same base URL but with a SERVER key —
 * the browser-bundled VITE_ key must never be used for this feature (plan §0.4).
 */
import { LECTURE_CONFIG } from "../../../../src/features/lectures/lib/config.js";
import { geminiKeysPool } from "./gemini-transcribe.mjs";

export class OrganizeError extends Error {
  constructor(code, message, meta = {}) {
    super(message || code);
    this.name = "OrganizeError";
    this.code = code;
    this.meta = meta;
  }
}

function cleanKey(raw) {
  return String(raw || "").replace(/["']/g, "").trim();
}

export function organizerKeysPool(overrideKeys = []) {
  const pool = [];
  const addKey = (k) => {
    const cleaned = cleanKey(k);
    if (cleaned && cleaned.length >= 10 && !pool.includes(cleaned)) {
      pool.push(cleaned);
    }
  };
  if (Array.isArray(overrideKeys)) {
    for (const k of overrideKeys) addKey(k);
  } else if (typeof overrideKeys === "string") {
    for (const k of overrideKeys.split(/[\n,;]+/)) addKey(k);
  }
  addKey(process.env.CODECRAFT_KEY);
  addKey(process.env.DEEPSEEK_API_KEY);
  return pool;
}

function codecraftKey(overrideKeys = []) {
  const pool = organizerKeysPool(overrideKeys);
  return pool[0] || geminiKeysPool()[0] || null;
}

/**
 * Call the organizer model once (with automatic rotation across configured keys,
 * plus automatic Gemini 10-key pool fallback if CodeCraft/DeepSeek is unavailable).
 * Returns the raw assistant text (expected to be JSON).
 * @param {{system:string, user:string, model?:string, baseUrl?:string, apiKeys?:string[]}} args
 */
export async function callOrganizeModel({ system, user, model, baseUrl, apiKeys } = {}) {
  const pool = organizerKeysPool(apiKeys);
  const endpointBase = String(baseUrl || LECTURE_CONFIG.CODECRAFT_BASE_URL || "").replace(/\/+$/, "");
  let lastRes = null;
  let lastDetail = "";

  for (let i = 0; i < pool.length; i += 1) {
    const key = pool[i];
    try {
      const res = await fetch(`${endpointBase}/chat/completions`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${key}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: model || LECTURE_CONFIG.ORGANIZE_MODEL,
          temperature: 0.1,
          max_tokens: 4_000,
          response_format: { type: "json_object" },
          messages: [
            { role: "system", content: system },
            { role: "user", content: user },
          ],
        }),
      });

      if (res.ok) {
        const json = await res.json().catch(() => null);
        const content = json?.choices?.[0]?.message?.content;
        if (typeof content === "string" && content.trim()) {
          return content;
        }
      }

      lastRes = res;
      lastDetail = await res.text().catch(() => "");
      if ((res.status === 429 || res.status === 401 || res.status === 403) && i < pool.length - 1) {
        continue;
      }
    } catch (err) {
      lastDetail = err?.message || "";
    }
    break;
  }

  // Fallback to Gemini 10-key pool for 24/7 zero-downtime lecture organization & study notes
  const gemPool = geminiKeysPool();
  for (let i = 0; i < gemPool.length; i += 1) {
    const gKey = gemPool[i];
    try {
      const gRes = await fetch(
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent",
        {
          method: "POST",
          headers: {
            "x-goog-api-key": gKey,
            "User-Agent": "aistudio-build",
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: "user", parts: [{ text: user }] }],
            generationConfig: {
              temperature: 0.1,
              maxOutputTokens: 4096,
              responseMimeType: "application/json",
            },
          }),
        },
      );
      if (gRes.ok) {
        const gJson = await gRes.json().catch(() => null);
        const gText = (gJson?.candidates?.[0]?.content?.parts || [])
          .map((p) => p?.text || "")
          .join("")
          .trim();
        if (gText) return gText;
      }
      if ((gRes.status === 429 || gRes.status === 401 || gRes.status === 403) && i < gemPool.length - 1) {
        continue;
      }
    } catch {
      continue;
    }
  }

  throw new OrganizeError(
    lastRes?.status === 429 ? "RATE_LIMITED" : "ORGANIZE_FAILED",
    `فشل تنظيم النص (${lastRes?.status || "ERR"})`,
    { status: lastRes?.status, detail: lastDetail.slice(0, 300) },
  );
}

/** DeepSeek availability (used to decide whether to offer the AI buttons). */
export function organizeModelAvailable(overrideKeys = []) {
  return Boolean(codecraftKey(overrideKeys));
}

export default callOrganizeModel;
