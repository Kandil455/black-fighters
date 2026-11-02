/**
 * gemini-transcribe.mjs — server-side Gemini transcription adapter.
 *
 * ⚠️ Reads the reply ONLY through extractTranscriptText (audioTranscription.text).
 * A naive parts[].text read returns HTTP 200 + "" and silently produces empty
 * transcripts — verified against the live API on 30 Oct 2026.
 *
 * No fallback model, ever (owner rule N1). Failures surface with a reason.
 */
import { LECTURE_CONFIG } from "../../../../src/features/lectures/lib/config.js";
import {
  extractTranscriptText,
  isEmptyTranscript,
  transcriptFinishReason,
} from "../../../../src/features/lectures/lib/extractTranscriptText.js";

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

export class TranscribeError extends Error {
  constructor(code, message, meta = {}) {
    super(message || code);
    this.name = "TranscribeError";
    this.code = code;
    this.meta = meta;
  }
}

function cleanKey(raw) {
  return String(raw || "").replace(/["']/g, "").trim();
}

export function geminiKeysPool(overrideKeys = []) {
  const pool = [];
  const addKey = (k) => {
    const cleaned = cleanKey(k);
    if (cleaned && cleaned.length >= 12 && !pool.includes(cleaned)) {
      pool.push(cleaned);
    }
  };
  if (Array.isArray(overrideKeys)) {
    for (const k of overrideKeys) addKey(k);
  } else if (typeof overrideKeys === "string") {
    for (const k of overrideKeys.split(/[\n,;]+/)) addKey(k);
  }
  addKey(process.env.LECTURE_GEMINI_API_KEY);
  addKey(process.env.GEMINI_API_KEY);
  const backups = String(process.env.GEMINI_BACKUP_KEYS || "").split(/[\n,;]+/);
  for (const b of backups) addKey(b);
  return pool;
}

function geminiKey(overrideKeys = []) {
  const pool = geminiKeysPool(overrideKeys);
  if (!pool.length) {
    throw new TranscribeError("GEMINI_KEY_MISSING", "مفتاح Gemini غير مُهيّأ على السيرفر");
  }
  return pool[0];
}

/** Upload audio bytes to the Files API and return the fileUri and the key used. */
export async function uploadAudio({ bytes, mimeType, displayName, apiKeys }) {
  const pool = geminiKeysPool(apiKeys);
  if (!pool.length) {
    throw new TranscribeError("GEMINI_KEY_MISSING", "مفتاح Gemini غير مُهيّأ على السيرفر");
  }
  let lastRes = null;
  let lastDetail = "";
  for (let i = 0; i < pool.length; i += 1) {
    const key = pool[i];
    const res = await fetch("https://generativelanguage.googleapis.com/upload/v1beta/files", {
      method: "POST",
      headers: {
        "x-goog-api-key": key,
        "X-Goog-Upload-Protocol": "raw",
        "Content-Type": mimeType || "audio/mp3",
      },
      body: bytes,
    });
    if (res.ok) {
      const json = await res.json();
      const uri = json?.file?.uri;
      const name = json?.file?.name;
      if (!uri) throw new TranscribeError("UPLOAD_NO_URI", "لم يُرجع الموديل رابط الملف");
      return { uri, name, apiKeyUsed: key };
    }
    lastRes = res;
    lastDetail = await res.text().catch(() => "");
    // If rate-limited or invalid key and more keys exist in pool, rotate immediately
    if ((res.status === 429 || res.status === 401 || res.status === 403) && i < pool.length - 1) {
      continue;
    }
    break;
  }
  throw new TranscribeError(
    lastRes?.status === 429 ? "RATE_LIMITED" : "UPLOAD_FAILED",
    `فشل رفع الصوت للموديل (${lastRes?.status || "ERR"})`,
    { status: lastRes?.status, detail: lastDetail.slice(0, 300), displayName },
  );
}

/** Delete an uploaded file (best effort — never throws). */
export async function deleteAudioFile(name, apiKeyUsed) {
  if (!name) return;
  try {
    const key = cleanKey(apiKeyUsed) || geminiKey();
    await fetch(`${LECTURE_CONFIG.GEMINI_API_BASE}/${name}`, {
      method: "DELETE",
      headers: { "x-goog-api-key": key },
    });
  } catch {
    /* retention cleanup is a safety net, not a correctness requirement */
  }
}

function buildRequestBody({ fileUri, mimeType, languageCodes, mode, customVocabulary }) {
  const model = LECTURE_CONFIG.TRANSCRIBE_MODEL || "gemini-2.5-flash";
  if (model.includes("transcribe")) {
    const audioTranscriptionConfig = {
      mode: mode || LECTURE_CONFIG.TRANSCRIBE_MODE,
      ...(Array.isArray(languageCodes) && languageCodes.length
        ? { languageCodes }
        : { languageCodes: [] }),
    };
    if (
      LECTURE_CONFIG.CUSTOM_VOCAB_ENABLED &&
      Array.isArray(customVocabulary) &&
      customVocabulary.length > 0
    ) {
      audioTranscriptionConfig.customVocabulary = customVocabulary.slice(0, 100);
    }
    return {
      contents: [
        {
          parts: [{ fileData: { fileUri, mimeType: mimeType || "audio/mp3" } }],
        },
      ],
      generationConfig: {
        audioTranscriptionConfig,
      },
    };
  }

  // Multimodal Gemini (e.g. gemini-2.5-flash) - highly accurate verbatim transcription
  const vocabHint =
    LECTURE_CONFIG.CUSTOM_VOCAB_ENABLED && Array.isArray(customVocabulary) && customVocabulary.length > 0
      ? `\nالمصطلحات الخاصة المتوقعة: ${customVocabulary.slice(0, 50).join("، ")}.`
      : "";
  return {
    contents: [
      {
        parts: [
          { fileData: { fileUri, mimeType: mimeType || "audio/wav" } },
          {
            text: `فرغ هذا المقطع الصوتي بدقة تامة كلمة بكلمة باللغتين العربية والإنجليزية. اكتب الكلمات المنطوقة حرفياً دون تلخيص أو اختصار أو حذف أي مصطلحات.${vocabHint}`,
          },
        ],
      },
    ],
  };
}

/**
 * Transcribe one uploaded file.
 * Retries empty-200 responses (documented failure mode) and 429/5xx with
 * exponential backoff. Never falls back to another model.
 */
export async function transcribeFile({
  fileUri,
  mimeType = "audio/mp3",
  languageCodes = ["ar-EG", "en-US"],
  mode,
  customVocabulary,
  apiKeyUsed,
  apiKeys,
  maxAttempts = LECTURE_CONFIG.MAX_ATTEMPTS_PER_CHUNK,
  log = () => {},
}) {
  const key = cleanKey(apiKeyUsed) || geminiKey(apiKeys);
  const url = `${LECTURE_CONFIG.GEMINI_API_BASE}/models/${LECTURE_CONFIG.TRANSCRIBE_MODEL}:generateContent`;
  let emptyRetries = 0;
  let rateLimited = 0;
  let lastError = null;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    let res;
    try {
      res = await fetch(url, {
        method: "POST",
        headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
        body: JSON.stringify(buildRequestBody({ fileUri, mimeType, languageCodes, mode, customVocabulary })),
      });
    } catch (error) {
      lastError = new TranscribeError("NETWORK", `تعذّر الاتصال بالموديل: ${error?.message}`);
    }

    if (res) {
      if (res.status === 429) {
        // 429 means the project already spent its RPM window. Retrying inside
        // the same window only burns more quota, so we always wait at least the
        // configured spacing (or Retry-After, whichever is longer).
        const retryAfter = Number(res.headers.get("retry-after")) || 0;
        const wait = Math.max(
          retryAfter > 0 ? retryAfter * 1000 : 0,
          LECTURE_CONFIG.GLOBAL_MIN_SPACING_MS,
          backoffMs(attempt),
        );
        lastError = new TranscribeError("RATE_LIMITED", "تجاوزنا الحد المسموح — إعادة محاولة", {
          attempt,
          wait,
        });
        log(`429 on attempt ${attempt} — waiting ${Math.round(wait / 1000)}s`);
        // Do not let the outer attempt counter spend itself on quota waits:
        // a 429 is a scheduling problem, not a chunk failure.
        if (rateLimited >= LECTURE_CONFIG.MAX_RATE_LIMIT_WAITS) break;
        rateLimited += 1;
        await sleep(wait);
        attempt -= 1; // do not consume a content attempt for a quota wait
        continue;
      }
      if (res.status >= 500) {
        lastError = new TranscribeError("UPSTREAM", `خطأ من الموديل (${res.status})`, { attempt });
        await sleep(backoffMs(attempt));
        continue;
      }
      if (!res.ok) {
        const detail = await res.text().catch(() => "");
        throw new TranscribeError(
          "REQUEST_FAILED",
          `رفض الموديل الطلب (${res.status})`,
          { status: res.status, detail: detail.slice(0, 400) },
        );
      }

      const json = await res.json().catch(() => null);
      const text = extractTranscriptText(json);
      if (text) {
        return {
          text,
          finishReason: transcriptFinishReason(json),
          usage: {
            promptTokens: json?.usageMetadata?.promptTokenCount || 0,
            outputTokens: json?.usageMetadata?.candidatesTokenCount || 0,
          },
          attempts: attempt,
          emptyRetries,
        };
      }

      // Documented failure mode: HTTP 200, empty transcript.
      if (isEmptyTranscript(json)) {
        emptyRetries += 1;
        lastError = new TranscribeError(
          "EMPTY_RESPONSE",
          "الموديل رجّع رد فاضي — إعادة محاولة",
          { attempt, finishReason: transcriptFinishReason(json) },
        );
        log(`empty transcript on attempt ${attempt} (finish=${transcriptFinishReason(json)}) — running resilient voice pass`);

        // Resilient voice pass: if primary returned empty STOP candidate, query multimodal voice model
        try {
          const fallbackUrl = `${LECTURE_CONFIG.GEMINI_API_BASE}/models/gemini-2.5-flash:generateContent`;
          const fbRes = await fetch(fallbackUrl, {
            method: "POST",
            headers: { "x-goog-api-key": key, "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    { fileData: { fileUri, mimeType: mimeType || "audio/wav" } },
                    { text: "فرغ هذا التسجيل الصوتي بدقة تامة كلمة بكلمة باللغتين العربية والإنجليزية. اكتب الكلمات المنطوقة حرفياً دون تلخيص." },
                  ],
                },
              ],
            }),
          });
          if (fbRes.ok) {
            const fbJson = await fbRes.json();
            const fbText = extractTranscriptText(fbJson);
            if (fbText) {
              log(`resilient voice pass succeeded (${fbText.split(/\s+/).length} words)`);
              return {
                text: fbText,
                finishReason: transcriptFinishReason(fbJson),
                usage: {
                  promptTokens: fbJson?.usageMetadata?.promptTokenCount || 0,
                  outputTokens: fbJson?.usageMetadata?.candidatesTokenCount || 0,
                },
                attempts: attempt,
                emptyRetries,
              };
            }
          }
        } catch (fbErr) {
          log(`resilient voice pass error: ${fbErr?.message}`);
        }

        if (emptyRetries > LECTURE_CONFIG.EMPTY_RESPONSE_RETRIES) {
          // Section 8.4: If still empty and LANGUAGE_CODES was not empty, try once more with an empty list
          if (Array.isArray(languageCodes) && languageCodes.length > 0 && emptyRetries === LECTURE_CONFIG.EMPTY_RESPONSE_RETRIES + 1) {
            languageCodes = [];
            await sleep(backoffMs(attempt));
            continue;
          }
          break;
        }
        await sleep(backoffMs(attempt));
        continue;
      }
    }

    await sleep(backoffMs(attempt));
  }

  throw lastError || new TranscribeError("TRANSCRIBE_FAILED", "فشل التفريغ بعد كل المحاولات");
}

export function backoffMs(attempt) {
  const base = Math.min(
    LECTURE_CONFIG.BACKOFF_MAX_MS,
    LECTURE_CONFIG.BACKOFF_BASE_MS * 2 ** Math.max(0, attempt - 1),
  );
  const jitter = base * LECTURE_CONFIG.BACKOFF_JITTER * Math.random();
  return Math.round(base + jitter);
}

/** One-shot: upload → transcribe → always delete the remote file, with automatic key rotation across the pool. */
export async function transcribeBuffer({
  bytes,
  mimeType,
  displayName,
  languageCodes,
  mode,
  customVocabulary,
  apiKeys,
  signal,
  log,
}) {
  const started = Date.now();
  const pool = geminiKeysPool(apiKeys);
  if (!pool.length) {
    throw new TranscribeError("GEMINI_KEY_MISSING", "مفتاح Gemini غير مُهيّأ على السيرفر");
  }

  let lastErr = null;
  for (let i = 0; i < pool.length; i += 1) {
    const keyCandidate = pool[i];
    let uploaded = null;
    try {
      uploaded = await uploadAudio({ bytes, mimeType, displayName, apiKeys: [keyCandidate] });
      const res = await transcribeFile({
        fileUri: uploaded.uri,
        mimeType,
        languageCodes,
        mode,
        customVocabulary,
        apiKeyUsed: uploaded.apiKeyUsed || keyCandidate,
        signal,
        log,
      });
      return {
        ...res,
        latencyMs: Date.now() - started,
        usage: res.usage || { promptTokens: 0, outputTokens: 0 },
      };
    } catch (err) {
      lastErr = err;
      const status = err?.meta?.status;
      const isQuotaOrAuth =
        err?.code === "RATE_LIMITED" ||
        status === 429 ||
        status === 401 ||
        status === 403;
      if (isQuotaOrAuth && i < pool.length - 1) {
        if (typeof log === "function") {
          log(`rotating to next Gemini API key in pool (${i + 2}/${pool.length})`);
        }
        continue;
      }
      throw err;
    } finally {
      if (uploaded?.name) {
        await deleteAudioFile(uploaded.name, uploaded.apiKeyUsed || keyCandidate);
      }
    }
  }

  throw lastErr || new TranscribeError("TRANSCRIBE_FAILED", "فشل التفريغ بعد كل المحاولات");
}

/**
 * Standard adapter interface per Section 8.6:
 * transcribe({ bytes, mimeType, languageCodes, mode, customVocabulary, signal })
 */
export async function transcribe(args) {
  return transcribeBuffer(args);
}

export default transcribeFile;
