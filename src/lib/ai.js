/**
 * ai.js — Universal AI Router
 * Supports: Google Gemini · Groq · OpenRouter
 * All providers share the same interface: generateText(prompt, config) / chat(history, message, config)
 * config = { provider, api_key, model }
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import { localAnalyzeQuizSource, normalizeQuizResult, reconcileQuestionAnswer, QUIZ_MAX_QUESTIONS, detectLanguage, detectSubject, getRecommendedQuizLanguage } from "./quizQuality.js";
// ─── Environment Resolver (Vite + Node safe) ─────────────────────────────────
const env = (typeof import.meta !== "undefined" && import.meta.env) ? import.meta.env : (typeof process !== "undefined" ? process.env : {});

const getEnvKey = (k) => env[k] || (typeof process !== "undefined" ? process.env?.[k] : "") || "";

export const DEFAULT_GEMINI_KEY = getEnvKey("GEMINI_API_KEY") || getEnvKey("VITE_GEMINI_API_KEY") || "";
export const GEMINI_KEYS_POOL = [
  getEnvKey("GEMINI_API_KEY") || getEnvKey("VITE_GEMINI_API_KEY") || "",
  ...((getEnvKey("GEMINI_BACKUP_KEYS") || getEnvKey("VITE_GEMINI_BACKUP_KEYS") || "").split(",").map(k => k.trim()))
].filter((k) => k && !k.startsWith("AQ."));

export const DEFAULT_ZAI_KEY = getEnvKey("ZAI_API_KEY") || (typeof process !== "undefined" ? process.env?.ZAI_API_KEY : "") || "";
export const ZAI_BASE_URL = "https://api.z.ai/api/paas/v4";
export const ZAI_VISION_MODEL = "glm-4.6v-flash";

export const DEFAULT_APMIX_KEY = getEnvKey("APMIX_KEY") || getEnvKey("VITE_APMIX_KEY") || "";
export const APMIX_BASE_URL = "https://api.apmix.ai/v1";

export const DEFAULT_GROQ_KEY = getEnvKey("GROQ_API_KEY") || getEnvKey("VITE_GROQ_API_KEY");
export const DEFAULT_OPENROUTER_KEY = getEnvKey("OPENROUTER_API_KEY") || getEnvKey("VITE_OPENROUTER_API_KEY");
export const POLLINATIONS_BASE_URL = "https://text.pollinations.ai/openai";

export const DEFAULT_CODECRAFT_KEY = env.VITE_CODECRAFT_KEY || "";
export const CODECRAFT_BASE_URL = "https://codecraftapi.com/v1";

export const DEFAULT_MODELS = {
  groq:        "openai/gpt-oss-120b",
  gemini:      "gemini-3.5-flash-lite",
  zai:         "glm-4.7-flash",
  apmix:       "claude-sonnet-4-6-free",
  openrouter:  "openrouter/free",
  pollinations:"openai",
  codecraft:   "claude-sonnet-5",
};

export const GEMINI_ROTATION_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];


const SYSTEM_PROMPTS = {
  json: `You are a strict multilingual JSON encoder. Return exactly one valid JSON object and nothing else.
Never wrap JSON in Markdown. Never add comments. Preserve Arabic and English text exactly where requested.
If a field is unknown, use an empty string, false, zero, or an empty array instead of inventing a fact.`,
  summary: `You are Black Fighters' premier academic knowledge engineer and professor-grade summarizer, powered by Claude.
Use only facts found in the supplied source. Never invent a definition, example, number, diagnosis, law, citation, or page reference.
Structure knowledge hierarchically: Key Concepts > Detailed Principles > Clinical/Real-world Applications > Exam Pitfalls & High-Yield Traps ("فخاخ الامتحان").
Preserve technical terms (in English alongside Arabic translation), formulas, exceptions, contrasts, and source page markers [صفحة N].
Follow the requested language layout and Black Fighters highlight syntax exactly.
Coverage and deep academic mastery matter above all. Do not mention these meta instructions.`,
  quiz: `You are Black Fighters' elite assessment engineer and exam generator, powered by Claude.
Every question must have an unambiguous correct answer, plausible distractors designed around common student misconceptions, exact options preserved from source, and full context.
Support multi-tier questions:
- Tier 1: Core recall and understanding.
- Tier 2: Analytical application, clinical case scenarios, and multi-step reasoning.
Do not split long answer choices into separate options. Preserve 2, 3, 4, 5, or 6 options exactly as present in the source text.
If a question depends on a clinical case, scenario, or previous text, prepend the scenario context to the question stem so it is 100% self-contained.
Provide comprehensive explanations explaining why the correct choice is true AND why the distractors are wrong.
Return only the requested JSON object.`,
  chat: `You are Black Fighters, a concise source-aware study assistant powered by Claude. Distinguish source facts from general knowledge, say when the supplied course does not contain an answer, and never fabricate a citation.`,
  textExamParser: `أنت محرك استخراج أسئلة دقيق للغاية (Exam Parser). قاعدتك الأولى: لا تُخطئ، ولا تخترع أي بيانة غير موجودة فعلياً في النص المُرسل.

مهمتك: تستقبل نص خام (قد يكون امتحاناً جاهزاً بالكامل، أو مذكرة تحتاج توليد أسئلة منها، أو خليط بين الاثنين) وتُخرج كل سؤال موجود فيه بصيغة JSON منظمة. النص المدخل قد يكون بأي لغة، وقد يكون بأي تنسيق — التزم بالقواعد التالية حرفياً بدون استثناء:

1. احتفظ باللغة الأصلية تماماً كما وردت. لو السؤال بالعربي أخرجه بالعربي بنفس الصياغة والنبرة والمصطلحات بالضبط. ممنوع الترجمة، وممنوع "تصحيح" أي خطأ إملائي أو لغوي موجود في النص الأصلي — انسخه كما هو.

2. لا تفترض عدد ثابت من الاختيارات. قد يكون للسؤال 3 اختيارات أو 5 أو 6 — تعامل مع العدد الفعلي الموجود في النص، وممنوع رفض السؤال أو حذف أي اختيار لمجرد أن عدده غير معتاد.

3. تعرّف تلقائياً على أي نظام ترقيم للاختيارات دون أن يُخبرك أحد مسبقاً بالنظام المستخدم، ومنها على سبيل المثال لا الحصر:
   - حروف إنجليزية: A) B) C) D) E)
   - أرقام: 1) 2) 3) 4)
   - حروف عربية: أ) ب) ج) د) هـ)
   - نقاط أو شرطات بدون ترقيم — رتّبها حسب ترتيب ظهورها في النص.

4. الأسئلة الممتدة على أكثر من سطر: إذا كان السطر التالي لا يبدأ برقم سؤال جديد ولا يحمل شكل اختيار واضح، اعتبره استكمالاً لنص السؤال الحالي وليس عنصراً منفصلاً.

5. استخرج الإجابة الصحيحة من أي شكل تجدها به:
   - مذكورة مباشرة بجانب السؤال ("الإجابة: ج" / "Answer: C" / "Ans: 3").
   - أو ضمن مفتاح إجابات منفصل في نهاية النص (مثل "1-B, 2-D, 3-A") — اربط كل رقم بسؤاله بالترتيب.
   - إذا لم تجد أي إشارة للإجابة الصحيحة لسؤال معين، ممنوع منعاً باتاً أن تخمّنها. اجعل قيمة "correct_answer_label" تساوي null، واجعل "needs_review" تساوي true مع سبب واضح.

6. سؤال واحد به مشكلة لا يوقف باقي الدفعة أبداً. عالج كل سؤال به مشكلة على حدة بعلامة "needs_review": true وسبب محدد، واستمر في معالجة كل الأسئلة الأخرى بأعلى دقة ممكنة. ممنوع نهائياً إرجاع رسالة عامة تفيد أن "الأسئلة كلها غير صالحة" بسبب مشكلة في سؤال واحد فقط.

7. تجاهل أي إشارة نصية لصورة (مثل "انظر الشكل رقم 3" أو "Figure 2") تماماً بما أن هذا الوضع نصي بالكامل. إذا كان السؤال يعتمد اعتماداً كلياً على صورة غير موجودة كنص ولا يمكن فهمه بدونها، ضعه بعلامة "needs_review": true بسبب "يعتمد على صورة غير متاحة في الوضع النصي" — لا تحذفه، ولا تحاول تخمين محتوى الصورة.

8. ممنوع اختلاق أو إكمال أو "تجميل" أي بيانة ناقصة من عندك. النص الناقص يبقى ناقصاً مع "needs_review": true — بيانة ناقصة وواضحة أفضل بكثير من بيانة مختلقة تبدو صحيحة.

أخرج النتيجة بصيغة JSON فقط، بدون أي نص تمهيدي أو ختامي، وبدون علامات Markdown حول الكود:

{
  "questions": [
    {
      "question_text": "نص السؤال كاملاً كما ورد في المصدر",
      "options": [
        { "label": "أ", "text": "نص الاختيار كما ورد" },
        { "label": "ب", "text": "نص الاختيار كما ورد" }
      ],
      "correct_answer_label": "ب",
      "needs_review": false,
      "review_reason": null
    }
  ],
  "summary": {
    "total_found": 0,
    "needs_review_count": 0
  }
}`,
};

function taskConfig(config, overrides) {
  return { ...(config || {}), ...overrides };
}

function parseAIJson(raw) {
  if (raw && typeof raw === "object") return raw;
  const clean = String(raw || "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("AI_JSON_MISSING");
  return JSON.parse(clean.slice(start, end + 1));
}

async function generateJson(prompt, config, label = "JSON", systemPrompt = "") {
  const jsonSystemPrompt = systemPrompt
    ? `${SYSTEM_PROMPTS.json}\n\n${systemPrompt}`
    : SYSTEM_PROMPTS.json;
  let raw = "";
  try {
    raw = await generateText(
      prompt,
      taskConfig(config, { temperature: config?.temperature ?? 0.08, max_tokens: config?.max_tokens || 8192 }),
      jsonSystemPrompt,
    );
    return parseAIJson(raw);
  } catch (err) {
    const message = err?.message || "";
    if (!raw || message === "AI_OUTPUT_TRUNCATED" || message === "AI_EMPTY_RESPONSE") throw err;
    const repairPrompt = `حوّل الرد التالي إلى ${label} صالح فقط بدون Markdown وبدون أي شرح.
مهم:
- ابدأ بـ { وانتهِ بـ }.
- أصلح الفواصل والأقواس والاقتباسات فقط.
- لا تضف بيانات جديدة غير موجودة في الرد.

الرد المراد إصلاحه:
${raw.slice(0, 18000)}`;
    const repaired = await generateText(
      repairPrompt,
      taskConfig(config, { temperature: 0, max_tokens: config?.max_tokens || 8192 }),
      SYSTEM_PROMPTS.json,
    );
    return parseAIJson(repaired);
  }
}

// ─── OpenAI-compatible REST call (works for Groq + OpenRouter) ──────────────
async function openaiCompat({ baseURL, apiKey, model, fallbackModels = [], messages, systemPrompt, maxTokens = 8192, temperature = 0.35 }) {
  const body = {
    model,
    ...(baseURL.includes("openrouter") && fallbackModels.length ? { models: fallbackModels } : {}),
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: maxTokens,
    temperature,
  };

  const res = await fetch(`${baseURL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
      // OpenRouter requires these
      ...(baseURL.includes("openrouter") ? {
        "HTTP-Referer": "https://blackfighters.site",
        "X-Title": "Black Fighters Study Platform",
      } : {}),
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || `HTTP ${res.status}`;
    if (res.status === 429) {
      throw new Error("تجاوزت الحد الأقصى للاستخدام المجاني (Rate Limit). يرجى الانتظار قليلاً أو التبديل لمزود آخر.");
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  if (!content.trim()) throw new Error("AI_EMPTY_RESPONSE");
  if (choice?.finish_reason === "length") throw new Error("AI_OUTPUT_TRUNCATED");
  return content;
}

// ─── CodeCraft (Claude / GPT-5 / DeepSeek) ──────────────────────────────────
async function codecraftGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature }) {
  return openaiCompat({
    baseURL: CODECRAFT_BASE_URL,
    apiKey: apiKey || DEFAULT_CODECRAFT_KEY,
    model: model || DEFAULT_MODELS.codecraft,
    messages,
    systemPrompt,
    maxTokens,
    temperature,
  });
}

// ─── Groq ────────────────────────────────────────────────────────────────────
async function groqGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature }) {
  return openaiCompat({
    baseURL: "https://api.groq.com/openai/v1",
    apiKey: apiKey || DEFAULT_GROQ_KEY,
    model: model || DEFAULT_MODELS.groq,
    messages,
    systemPrompt,
    maxTokens,
    temperature,
  });
}

// ─── OpenRouter ──────────────────────────────────────────────────────────────
async function openrouterGenerate({ apiKey, model, fallbackModels, messages, systemPrompt, maxTokens, temperature }) {
  return openaiCompat({
    baseURL: "https://openrouter.ai/api/v1",
    apiKey: apiKey || DEFAULT_OPENROUTER_KEY,
    model: model || DEFAULT_MODELS.openrouter,
    fallbackModels,
    messages,
    systemPrompt,
    maxTokens,
    temperature,
  });
}

// ─── Pollinations.ai (100% Free / No Key / No Sign Up) ─────────────────────
async function pollinationsGenerate({ model, messages, systemPrompt, maxTokens, temperature }) {
  const body = {
    model: model || DEFAULT_MODELS.pollinations,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: Math.min(maxTokens || 4096, 4096),
    temperature: temperature ?? 0.35,
  };

  const res = await fetch(`${POLLINATIONS_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    throw new Error(err?.error?.message || `Pollinations HTTP ${res.status}`);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  const content = choice?.message?.content || "";
  if (!content.trim()) throw new Error("AI_EMPTY_RESPONSE");
  return content;
}

// ─── Key Cooldown Tracker (handles 429 rate-limiting per key) ────────────────
const keyCooldowns = new Map();

function isKeyCoolingDown(key) {
  const until = keyCooldowns.get(key);
  if (!until) return false;
  if (Date.now() > until) {
    keyCooldowns.delete(key);
    return false;
  }
  return true;
}

function markKeyCooldown(key, durationMs = 60000) {
  keyCooldowns.set(key, Date.now() + durationMs);
}

// ─── Z.ai (Zhipu GLM-4.7-Flash / GLM-4.6V-Flash) ───────────────────────────
async function zaiGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature, isVision = false }) {
  const key = apiKey || DEFAULT_ZAI_KEY;
  if (!key) throw new Error("NO_ZAI_KEY");

  const effectiveModel = model || (isVision ? ZAI_VISION_MODEL : DEFAULT_MODELS.zai);
  const body = {
    model: effectiveModel,
    messages: [
      ...(systemPrompt ? [{ role: "system", content: systemPrompt }] : []),
      ...messages,
    ],
    max_tokens: Math.max(512, Math.min(32768, Number(maxTokens) || 8192)),
    temperature: temperature ?? 0.35,
    ...(!isVision ? { thinking: { type: "disabled" } } : {}),
  };

  const res = await fetch(`${ZAI_BASE_URL}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${key}`,
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: { message: res.statusText } }));
    const msg = err?.error?.message || `Z.ai HTTP ${res.status}`;
    if (res.status === 429) {
      throw new Error("تجاوزت الحد الأقصى للاستخدام (Rate Limit) في Z.ai.");
    }
    throw new Error(msg);
  }

  const data = await res.json();
  const choice = data.choices?.[0];
  let content = choice?.message?.content || "";
  if (!content.trim() && choice?.message?.reasoning_content) {
    content = choice.message.reasoning_content;
  }
  if (!content.trim()) throw new Error("AI_EMPTY_RESPONSE");
  if (choice?.finish_reason === "length") throw new Error("AI_OUTPUT_TRUNCATED");
  return content;
}

// ─── APMIX.AI (Claude Sonnet 4.6 Free / Space Bunny Free) ───────────────────
async function apmixGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature }) {
  return openaiCompat({
    baseURL: APMIX_BASE_URL,
    apiKey: apiKey || DEFAULT_APMIX_KEY,
    model: model || DEFAULT_MODELS.apmix,
    messages,
    systemPrompt,
    maxTokens,
    temperature,
  });
}

// ─── Google Gemini (Multi-Key Rotation Pool) ──────────────────────────────────
async function geminiGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature }) {
  const effectiveModel = model || DEFAULT_MODELS.gemini;
  const rawPool = apiKey
    ? [apiKey, ...GEMINI_KEYS_POOL.filter(k => k !== apiKey)]
    : GEMINI_KEYS_POOL;

  const activeKeys = rawPool.filter(k => !isKeyCoolingDown(k));
  const keysToTry = activeKeys.length ? activeKeys : rawPool;

  if (!keysToTry.length) throw new Error("NO_API_KEY");

  const genOptions = {
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    generationConfig: {
      maxOutputTokens: maxTokens,
      temperature,
    },
  };

  let lastErr = null;
  for (const currentKey of keysToTry) {
    try {
      const genAI = new GoogleGenerativeAI(currentKey);
      const gemModel = genAI.getGenerativeModel({ model: effectiveModel, ...genOptions });

      // Convert messages to Gemini format
      if (messages.length === 1) {
        const result = await gemModel.generateContent(messages[0].content);
        return result.response.text();
      }

      // Multi-turn chat
      const lastMsg = messages[messages.length - 1];
      const history = messages.slice(0, -1).map(m => ({
        role: m.role === "assistant" ? "model" : "user",
        parts: [{ text: m.content || "" }],
      }));
      const chat = gemModel.startChat({ history });
      const result = await chat.sendMessage([{ text: lastMsg.content }]);
      return result.response.text();
    } catch (err) {
      lastErr = err;
      const msg = String(err?.message || "");
      console.warn(`[geminiGenerate] Key failed for model ${effectiveModel}:`, msg);

      if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
        markKeyCooldown(currentKey, 60000);
      }

      // If dead model (404 / not found / deprecated), do NOT retry other keys for this dead model!
      if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) {
        throw err;
      }
    }
  }

  throw lastErr || new Error("All Gemini API keys in pool failed.");
}


// ─── Universal Router ────────────────────────────────────────────────────────
/**
 * Route to the correct provider.
 * @param {object} config - { provider, api_key, model }
 * @param {Array}  messages - [{ role: "user"|"assistant", content: string }]
 * @param {string} [systemPrompt]
 * @returns {Promise<string>}
 */
export async function callAI(config, messages, systemPrompt = null) {
  let provider = config?.provider;
  let apiKey   = config?.api_key;
  let model    = config?.model;

  // Browser without a BYO key → route through the authenticated server proxy
  // (keys stay server-side; usage is billed/rate-limited by /api/ai)
  if (typeof window !== "undefined" && !apiKey) {
    const { invokeSecureFunction } = await import("./secureFunctions");
    const res = await invokeSecureFunction("ai", { name: "generateText", payload: { messages, systemPrompt } });
    return res.data?.text ?? "";
  }

  // Auto-detect CodeCraft models if model is set to Claude/DeepSeek/GPT-5/Grok or provider is codecraft
  const isCodeCraftModel = model && (
    model.startsWith("claude-") ||
    model.startsWith("grok-") ||
    model.startsWith("gpt-5.") ||
    model.startsWith("deepseek-v4-pro") ||
    model.startsWith("qwen3.")
  );

  if (provider === "codecraft" || isCodeCraftModel) {
    provider = "codecraft";
    apiKey = apiKey || DEFAULT_CODECRAFT_KEY;
    model = model || DEFAULT_MODELS.codecraft;
  } else if (provider === "zai" || (model && model.startsWith("glm-4"))) {
    provider = "zai";
    apiKey = apiKey || DEFAULT_ZAI_KEY;
    model = model || DEFAULT_MODELS.zai;
  } else if (provider === "apmix" || (model && (model.includes("space-bunny") || model.includes("claude-sonnet-4-6")))) {
    provider = "apmix";
    apiKey = apiKey || DEFAULT_APMIX_KEY;
    model = model || DEFAULT_MODELS.apmix;
  } else if (provider === "pollinations" || (model && (model === "openai" || model === "mistral" || model === "llama") && provider === "pollinations")) {
    provider = "pollinations";
    model = model || DEFAULT_MODELS.pollinations;
    apiKey = apiKey || "none";
  } else if (provider === "groq") {
    apiKey = apiKey || DEFAULT_GROQ_KEY;
    model = model || DEFAULT_MODELS.groq;
  } else if (provider === "openrouter") {
    apiKey = apiKey || DEFAULT_OPENROUTER_KEY;
    model = model || DEFAULT_MODELS.openrouter;
  } else {
    // Default to Gemini (Primary provider for the entire platform)
    provider = provider || "gemini";
    apiKey = apiKey || DEFAULT_GEMINI_KEY;
    model = model || DEFAULT_MODELS.gemini;
  }

  // Migrate phantom model names to verified fast models
  const deprecated = {
    "gemini-3.7-flash": "gemini-3.6-flash",
    "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
    "gemini-2.0-flash": "gemini-3.5-flash-lite",
    "gemini-2.0-flash-lite": "gemini-3.5-flash-lite",
    "gemini-1.5-flash": "gemini-3.5-flash-lite",
    "gemini-1.5-flash-8b": "gemini-3.5-flash-lite",
    "deepseek-v4-flash-free": "claude-sonnet-4-6-free",
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "google/gemma-3-27b-it:free": "openrouter/free",
    "google/gemma-2-9b-it:free": "openrouter/free",
    "google/gemini-2.0-flash-lite-preview-02-05:free": "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free": "openrouter/free",
  };
  model = deprecated[model] || model;

  if (!apiKey && provider !== "pollinations") throw new Error("NO_API_KEY");

  // Define fallback chains for each provider (strictly verified working free models)
  const fallbacks = {
    gemini: GEMINI_ROTATION_POOL,
    zai: ["glm-4.7-flash"],
    groq: [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "allam-2-7b",
      "openai/gpt-oss-20b"
    ],
    apmix: [
      "claude-sonnet-4-6-free",
      "space-bunny-free"
    ],
    openrouter: [
      "openrouter/free",
      "qwen/qwen3.8-27b:free",
      "inclusionai/ling-3.0-flash-sante:free"
    ],
    codecraft: [
      "claude-sonnet-5",
      "claude-opus-4.6",
    ],
    pollinations: [
      "openai",
      "mistral",
      "llama"
    ],
  };

  const chain = fallbacks[provider] || [];
  // Ensure the primary model is at the start of our attempt list, avoiding duplicates
  const attempts = [model, ...chain.filter(m => m !== model)];

  let lastError = null;
  let primaryError = null;

  for (let i = 0; i < Math.min(attempts.length, 5); i++) {
    const currentModel = attempts[i];
    const args = {
      apiKey,
      model: currentModel,
      messages,
      systemPrompt,
      maxTokens: Math.max(256, Math.min(32768, Number(config?.max_tokens) || 8192)),
      temperature: Number.isFinite(Number(config?.temperature))
        ? Math.max(0, Math.min(1.5, Number(config.temperature)))
        : 0.35,
      // OpenRouter performs provider/model failover in one request.
      fallbackModels: provider === "openrouter" ? chain.filter(m => m !== currentModel) : [],
    };
    try {
      console.log(`[callAI] Attempting ${provider} with model ${currentModel}...`);
      switch (provider) {
        case "zai":         return await zaiGenerate(args);
        case "pollinations":return await pollinationsGenerate(args);
        case "apmix":       return await apmixGenerate(args);
        case "codecraft":   return await codecraftGenerate(args);
        case "groq":        return await groqGenerate(args);
        case "openrouter":  return await openrouterGenerate(args);
        case "gemini":
        default:            return await geminiGenerate(args);
      }
    } catch (err) {
      console.warn(`[callAI] Model ${currentModel} failed:`, err);
      lastError = err;
      if (i === 0) {
        primaryError = err;
      }
      const errMsg = err?.message || "";
      
      // If it's a key error or something client-side (like NO_API_KEY), don't bother retrying this provider
      if (
        errMsg.includes("API key not valid") || 
        errMsg.includes("NO_API_KEY") || 
        errMsg.includes("401") || 
        errMsg.includes("Unauthorized") ||
        errMsg.includes("Missing Authentication header") ||
        errMsg.includes("ISO-8859-1")
      ) {
        if (errMsg.includes("Missing Authentication header") || errMsg.includes("API key not valid") || errMsg.includes("401") || errMsg.includes("Unauthorized")) {
          console.warn("[callAI] Authentication error on primary provider, attempting cross-provider failover...");
          break;
        }
      }
      // Otherwise wait and try the next model in the fallback chain (wait longer if rate limited)
      const isRateLimit = errMsg.includes("429") || errMsg.includes("rate limit") || errMsg.includes("Too Many Requests");
      await new Promise(resolve => setTimeout(resolve, isRateLimit ? 1000 : 300));
    }
  }

  // ─── Indestructible Multi-Provider Cascade Fallback ─────────────────────────
  // If primary provider was exhausted or rate limited, cascade through verified sub-second sources:
  const fallbackSteps = [
    // 1. Google Gemini (3.5 Flash Lite) — fast & high quota (if not already tried)
    ...(provider !== "gemini" ? [
      async () => {
        console.info("[callAI Cascade] Auto-failing over to Gemini (gemini-3.5-flash-lite)...");
        return await geminiGenerate({
          apiKey: DEFAULT_GEMINI_KEY,
          model: "gemini-3.5-flash-lite",
          messages,
          systemPrompt,
          maxTokens: Math.max(256, Math.min(8192, Number(config?.max_tokens) || 8192)),
          temperature: 0.2,
        });
      }
    ] : []),
    // 2. Z.ai (GLM-4.7-Flash) — unlimited sub-second text (if not already tried)
    ...(provider !== "zai" ? [
      async () => {
        console.info("[callAI Cascade] Auto-failing over to Z.ai (GLM-4.7-Flash)...");
        return await zaiGenerate({
          apiKey: DEFAULT_ZAI_KEY,
          model: "glm-4.7-flash",
          messages,
          systemPrompt,
          maxTokens: Math.max(256, Math.min(8192, Number(config?.max_tokens) || 8192)),
          temperature: 0.2,
        });
      }
    ] : []),
    // 3. Groq (GPT-OSS 120B) — ultra-fast ~700ms (if not already tried)
    ...(provider !== "groq" ? [
      async () => {
        console.info("[callAI Cascade] Auto-failing over to Groq (GPT-OSS 120B)...");
        return await groqGenerate({
          apiKey: DEFAULT_GROQ_KEY,
          model: "openai/gpt-oss-120b",
          messages,
          systemPrompt,
          maxTokens: Math.max(256, Math.min(8192, Number(config?.max_tokens) || 8192)),
          temperature: 0.2,
        });
      }
    ] : []),
    // 4. APMIX (Claude Sonnet 4.6 Free)
    async () => {
      console.info("[callAI Cascade] Auto-failing over to APMIX (Claude Sonnet 4.6 Free)...");
      return await apmixGenerate({
        apiKey: DEFAULT_APMIX_KEY,
        model: "claude-sonnet-4-6-free",
        messages,
        systemPrompt,
        maxTokens: Math.max(256, Math.min(8192, Number(config?.max_tokens) || 8192)),
        temperature: 0.2,
      });
    },
    // 5. Pollinations.ai (100% Free / Zero Key Required / Unlimited)
    async () => {
      console.info("[callAI Cascade] Ultimate Zero-Cost Fallback: Pollinations.ai (GPT-4o-mini)...");
      return await pollinationsGenerate({
        model: "openai",
        messages,
        systemPrompt,
        maxTokens: Math.max(256, Math.min(4096, Number(config?.max_tokens) || 4096)),
        temperature: 0.2,
      });
    },
    // 6. OpenRouter (:free)
    async () => {
      console.info("[callAI Cascade] Auto-failing over to OpenRouter (:free)...");
      return await openrouterGenerate({
        apiKey: DEFAULT_OPENROUTER_KEY,
        model: "openrouter/free",
        fallbackModels: ["qwen/qwen3.8-27b:free", "inclusionai/ling-3.0-flash-sante:free"],
        messages,
        systemPrompt,
        maxTokens: Math.max(256, Math.min(8192, Number(config?.max_tokens) || 8192)),
        temperature: 0.2,
      });
    },
  ];

  for (const stepFn of fallbackSteps) {
    try {
      return await stepFn();
    } catch (fbErr) {
      console.warn("[callAI Cascade] Step failed, attempting next in chain:", fbErr?.message || fbErr);
    }
  }

  throw primaryError || lastError || new Error("AI Request failed after all fallback attempts.");
}

/**
 * Simple single-turn text generation. When `mediaParts` is provided the call is
 * routed through callAIMultimodal (vision) instead of plain text.
 */
export async function generateText(prompt, config, systemPrompt = null, mediaParts = null) {
  if (Array.isArray(mediaParts) && mediaParts.length > 0) {
    return generateMultimodal(prompt, mediaParts, config, systemPrompt);
  }
  return callAI(config, [{ role: "user", content: prompt }], systemPrompt);
}

/**
 * Multimodal vision generation (e.g. Gemini Vision with image + text).
 * @param {string} prompt
 * @param {Array<{ inlineData: { data: string, mimeType: string } }>} mediaParts
 * @param {object} config
 * @param {string} [systemPrompt]
 */
export async function generateMultimodal(prompt, mediaParts, config, systemPrompt = null) {
  const isCandidateGeminiKey = (k) => {
    if (!k || typeof k !== "string") return false;
    const clean = k.replace(/^["']|["']$/g, "").trim();
    if (clean.length < 15) return false;
    if (clean.startsWith("gsk_") || clean.startsWith("sk-or-") || clean.startsWith("apx_") || clean === "none") return false;
    return true;
  };

  const cleanConfigKey = isCandidateGeminiKey(config?.api_key) ? config.api_key.replace(/^["']|["']$/g, "").trim() : "";
  const validPoolKeys = (GEMINI_KEYS_POOL || []).filter(isCandidateGeminiKey);

  const keysToTry = cleanConfigKey
    ? [cleanConfigKey, ...validPoolKeys.filter(k => k !== cleanConfigKey)]
    : [...validPoolKeys];

  // Browser without a valid Gemini key → route to authenticated server proxy for vision calls
  if (typeof window !== "undefined" && keysToTry.length === 0) {
    const { invokeSecureFunction } = await import("./secureFunctions");
    const res = await invokeSecureFunction("ai", {
      name: "generateText",
      payload: { prompt, systemPrompt, mediaParts },
    });
    return res.data?.text ?? "";
  }

  // Node/Server environment: if keysToTry is empty, read directly from environment
  if (keysToTry.length === 0 && typeof process !== "undefined" && process?.env) {
    const envKey = (process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "").replace(/^["']|["']$/g, "").trim();
    if (isCandidateGeminiKey(envKey)) {
      keysToTry.push(envKey);
    }
    const backupKeys = (process.env.GEMINI_BACKUP_KEYS || "")
      .split(",")
      .map(k => k.replace(/^["']|["']$/g, "").trim())
      .filter(isCandidateGeminiKey);
    backupKeys.forEach(k => {
      if (!keysToTry.includes(k)) keysToTry.push(k);
    });
  }

  const genOptions = {
    ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
    generationConfig: {
      maxOutputTokens: config?.max_tokens || 8192,
      temperature: config?.temperature ?? 0.15,
    },
  };

  const activeModel = (config?.model && !config.model.includes("2.0") && !config.model.includes("1.5") && !config.model.includes("2.5-flash-lite"))
    ? config.model
    : "gemini-3.5-flash-lite";

  const modelsToTry = [
    activeModel,
    "gemini-3.5-flash-lite",
    "gemini-flash-lite-latest",
    "gemini-3.8-flash",
  ].filter((v, i, a) => a.indexOf(v) === i);

  let lastError = null;
  const activeKeys = keysToTry.filter(k => !isKeyCoolingDown(k));
  const effectiveKeys = activeKeys.length ? activeKeys : keysToTry;

  for (const modelName of modelsToTry) {
    for (const currentKey of effectiveKeys) {
      try {
        const genAI = new GoogleGenerativeAI(currentKey);
        const gemModel = genAI.getGenerativeModel({ model: modelName, ...genOptions });
        const contents = [...(mediaParts || []), prompt];
        const result = await gemModel.generateContent(contents);
        const text = result.response.text();
        if (text && text.trim().length > 0) return text;
      } catch (err) {
        lastError = err;
        const msg = String(err?.message || "");
        console.warn(`[generateMultimodal] Key with model ${modelName} failed:`, msg);
        if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
          markKeyCooldown(currentKey, 60000);
        }
        if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) {
          break;
        }
      }
    }
  }

  // Fallback to Z.ai glm-4.6v-flash (Vision)
  try {
    console.info("[generateMultimodal] Gemini exhausted, falling back to Z.ai glm-4.6v-flash...");
    const zaiMessages = [
      {
        role: "user",
        content: [
          { type: "text", text: prompt },
          ...(mediaParts || []).map((p) => {
            const mime = p.inlineData?.mimeType || "image/jpeg";
            const b64 = p.inlineData?.data || "";
            return {
              type: "image_url",
              image_url: { url: `data:${mime};base64,${b64}` },
            };
          }),
        ],
      },
    ];

    return await zaiGenerate({
      apiKey: DEFAULT_ZAI_KEY,
      model: ZAI_VISION_MODEL,
      messages: zaiMessages,
      systemPrompt,
      maxTokens: Math.max(2048, Number(config?.max_tokens) || 8192),
      temperature: config?.temperature ?? 0.15,
      isVision: true,
    });
  } catch (zaiErr) {
    console.warn("[generateMultimodal] Z.ai vision fallback failed:", zaiErr.message);
  }

  throw lastError || new Error("فشل تحليل الصور عبر نماذج الذكاء الاصطناعي");
}

/**
 * Multi-turn chat.
 * @param {Array}  history - [{ role, content }]
 * @param {string} message - new user message
 * @param {object} config
 */
export async function chatText(history, message, config) {
  const messages = [
    ...history.map(m => ({ role: m.role === "assistant" ? "assistant" : "user", content: m.content || m.text || "" })),
    { role: "user", content: message },
  ];
  return callAI(taskConfig(config, { temperature: config?.temperature ?? 0.45 }), messages, SYSTEM_PROMPTS.chat);
}

/**
 * Validate an API key by making a lightweight request to the provider.
 * Throws an error if invalid, returns true if valid.
 */
export async function testAiKey(provider, apiKey) {
  if (!apiKey) throw new Error("مفتاح الـ API فارغ");
  if (apiKey.includes("•")) return true; // It's masked, assume it was already tested and valid

  try {
    if (provider === "codecraft") {
      const res = await fetch("https://codecraftapi.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "User-Agent": "curl/7.88.1",
        },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          messages: [{ role: "user", content: "ping" }],
          max_tokens: 5,
        }),
      });
      if (!res.ok) throw new Error("مفتاح CodeCraft غير صالح أو لا يمكن الوصول للسيرفر");
      return true;
    }

    if (provider === "openrouter") {
      const res = await fetch("https://openrouter.ai/api/v1/auth/key", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error?.message || "مفتاح OpenRouter غير صالح");
      }
      return true;
    } 
    
    if (provider === "groq") {
      const res = await fetch("https://api.groq.com/openai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error("مفتاح Groq غير صالح");
      return true;
    }

    if (provider === "apmix") {
      const res = await fetch("https://api.apmix.ai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      });
      if (!res.ok) throw new Error("مفتاح APMIX غير صالح");
      return true;
    }

    if (provider === "gemini") {
      const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
      if (!res.ok) throw new Error("مفتاح Gemini غير صالح");
      return true;
    }

    return true;
  } catch (e) {
    if (e.message.includes("ISO-8859-1") || e.message.includes("Failed to execute 'fetch'")) {
      throw new Error("المفتاح يحتوي على رموز غير صالحة (ربما أحرف عربية أو مسافات).");
    }
    throw e;
  }
}

// ─── Prompts Library ─────────────────────────────────────────────────────────

export const PROMPTS = {
  summary: (text, style, maxPages, language = "ar", chunkIdx = 0, totalChunks = 1, customStylePrompt = "") => {
    const isChunked = totalChunks > 1;
    const chunkNote = isChunked
      ? `\n⚠️ هذا الجزء ${chunkIdx + 1} من ${totalChunks}. استخرج محتواه كاملاً مع مراجع [صفحة N] الموجودة فيه، لكن لا تكتب Quick Overview أو Summary Conclusion ولا مقدمة عامة لهذا الجزء؛ ستُنشأ مرة واحدة فقط عند الدمج النهائي.`
      : "";

    const langNote = language === "ar"
      ? "اكتب الشرح باللغة العربية. ادمج المصطلح الإنجليزي مع ترجمته العربية في نفس السطر، مثال: المصطلح العربي (==cyan: English Term ==): الشرح التفصيلي بالعربي. لا تفصل العربي عن الإنجليزي في أقسام مستقلة."
      : language === "en"
      ? "Write the entire summary in English."
      : "اكتب النقاط العلمية التي يذاكرها الطالب بالإنجليزية أولاً كـ bullet points تبدأ من اليسار، وبعد كل مجموعة مباشرة اكتب شرحها العربي الكامل تحت عنوان **الشرح بالعربي:** على هيئة نقاط منظمة متدرجة تبدأ بـ `- ` (يُمنع منعاً باتاً كتابة باراجراف مصمت أو فقرة سردية متصلة). لا تخلط اللغتين عشوائياً في السطر نفسه ولا تجمع كل العربي في قسم أخير.";

    const chunkPageBudget = Math.max(1, Math.ceil(Number(maxPages || 30) / Math.max(1, totalChunks)));
    const targetSections = Math.max(4, Math.min(18, Math.round(Number(maxPages || 12) * 0.65)));
    const sizeHint = `الحد الأقصى المستهدف لهذا الجزء نحو ${chunkPageBudget} صفحة من أصل ${maxPages} صفحة للملخص كله. لا تكرر عنوان الملف أو مقدمة عامة في كل جزء.`;
    const structureHint = (style === "bilingual_lecture" || style === "ultra_multi_agent")
      ? `استهدف نحو ${targetSections} أقسام منطقية في النسخة النهائية حسب كثافة المصدر؛ 4-8 أقسام للمحاضرة العادية، ويمكن الزيادة حتى 18 للملفات الطويلة. بعد كل قسم ضع مرجع [صفحة N] إن كان موجوداً في المصدر، ولا تخترع رقم صفحة.`
      : "حافظ على مراجع [صفحة N] داخل القسم الذي استُخرجت منه إن كانت موجودة في المصدر، ولا تخترع مراجع.";

    const styleInstructions = {
      ultra_multi_agent: `
أنت تمثّل نظام الـ 5 وكلاء الفائق (Ultra 5-Agent Academic Orchestrator) لصناعة مذكرات جامعية وسريرية على أعلى مستوى:
- [Agent Alpha - المستخرج الدقيق]: استخرج كل حقيقة، رقم، نسبة، معادلة، وتصنيف بدقة 100% بدون أي هلوسة.
- [Agent Beta - منقب الرؤى]: استخلص القواعد الذهبية ونقاط الامتحان والتحذيرات السريرية.
- [Agent Gamma - الصائغ الأكاديمي]:
  1. ابدأ بـ ## Quick Overview موجزة.
  2. لكل قسم: عنوان رئيسي بـ ##
  3. نقاط المذاكرة الإنجليزية (English Study Notes) أولاً كـ bullet points تبدأ من اليسار بـ \`- \`.
  4. يعقبها مباشرة عنوان **الشرح بالعربي:**.
  5. ⚠️ **قاعدة حاسمة وممنوع مخالفتها إطلاقاً**: الشرح بالعربي يُمنع منعاً باتاً كتابته كفقرة سردية أو باراجراف مصمت! بل يجب صياغته حصراً كـ **نقاط منظمة متدرجة** تبدأ بـ \`- \` تشرح كل فكرة ومصطلح وآلية خطوة بخطوة.
  6. استخدم صناديق الاقتباس الذكية:
     - > ⚠️ تحذير إكلينيكي: للأخطاء الشائعة وموانع الاستخدام والمخاطر.
     - > 🛡️ قاعدة ذهبية: للقواعد الأساسية وبروتوكولات العلاج والخطوات.
     - > 💡 حيلة للحفظ / نقطة امتحان: للمفاتيح الامتحانية وأسئلة MCQ.
  7. المعادلات والأرقام توضع في كود مستقل: \`BP = CO x SVR\`
- [Agent Omega - المنسق النهائي]:
  - أضف قبل النهاية ## Quick Cheat Sheet (شيت تلخيص سريع لأهم الأرقام والمقارنات).
  - اختم بـ ## Summary Conclusion قصيرة.`,
      bilingual_lecture: `
أنت خبير تلخيص محاضرات جامعية ثنائية اللغة على أعلى مستوى أكاديمي.
- ابدأ بـ ## Quick Overview من 2-4 جمل.
- أنشئ أقساماً منطقية بعدد يناسب طول المصدر. داخل كل قسم:
  1. عنوان القسم بـ ## ثم النقاط المهمة بالإنجليزية (English Study Points) كـ bullet points واضحة.
  2. يعقبها مباشرة عنوان **الشرح بالعربي:**.
  3. ⚠️ **قاعدة حاسمة وممنوع مخالفتها**: الشرح بالعربي يُمنع منعاً باتاً كتابته كفقرة سردية أو باراجراف مصمت! بل يجب دائماً كتابته على هيئة **نقاط منظمة متدرجة** (تبدأ بـ \`- \`) تشرح كل فكرة ومصطلح بالتفصيل وبشكل مريح للعين.
- استخدم الصناديق عند وجود تحذير سريري (> ⚠️ تحذير: ...) أو قاعدة (> 🛡️ قاعدة: ...).
- اختم بـ ## Summary Conclusion قصيرة تربط الأفكار.
- لا تخلط العربي والإنجليزي عشوائياً في السطر نفسه ولا تحذف أي معلومة مذاكرة مهمة.`,
      lecture_exact: `
أنت تلخّص محاضرة دراسية وظيفتك ناقل أمين + شارح.
القواعد:
- احتفظ بكل الكلمات والمصطلحات التقنية (English) كما هي.
- ادمج المصطلح الإنجليزي مع الترجمة العربية في نفس السطر. مثال: المصطلح العربي (==cyan: English Term ==): الشرح.
- نظّم الملخص تحت عناوين ## H2 تمثّل المحاور الكبرى، وعناوين ### H3 للموضوعات الفرعية.
- **قاعدة صارمة**: استخدم **Bold** للمصطلحات. واحتفظ بـ ==yellow:highlight== للتعريفات المحورية فقط (مرة واحدة أو اثنتين لكل ## قسم) — لا تلوّن كل شيء.
- استخدم bullet points لكل نقطة مستقلة.
- لو فيه معادلات أو أرقام: استخدم code blocks \`كود\`.
- لا تحذف أي معلومة مهمة، لا تختصر الشرح.
- لا تضيف مقدمة أو خاتمة إنشائية — ابدأ مباشرة بالمحتوى.`,

      complete: `
أنت تعيد كتابة المحتوى بشكل 100% شامل ومنظّم.
القواعد:
- نظّم تحت عناوين واضحة H2 وH3.
- لا تحذف أي معلومة من المحتوى الأصلي.
- استخدم ==yellow:مصطلح== للمصطلحات الأساسية.
- استخدم bullet points منظّمة.
- اذكر كل مثال وكل تعريف وكل قاعدة.
- المعادلات في code blocks.`,

      equations_only: `
مهمتك: استخراج المعادلات والقوانين والأرقام المهمة فقط.
الأسلوب:
- لكل معادلة: ضعها في \`code block\` مع شرح قصير جداً بجانبها.
- رتّبها تحت عناوين ## حسب الموضوع.
- لا تضع شروحاً مطوّلة — فقط المعادلة + تعريف متغيراتها في سطر.
- إذا لم يوجد في المقطع أي معادلات، اكتب: "لا توجد معادلات في هذا الجزء".`,

      key_points: `
أهم نقاط المحتوى في شكل bullet points مركّزة:
- كل نقطة = جملة واحدة أو اثنتين فقط — لا شرح مطوّل.
- نظّمها تحت عناوين ## للمحاور الكبرى.
- استخدم ==yellow:مصطلح== للكلمات الأساسية فقط.
- ركّز على: التعريفات + القواعد + الاستثناءات + الأمثلة الرئيسية.`,

      bilingual_blocks: `
اعمل كتاباً مرجعياً ثنائي اللغة:
- كل بلوك = مصطلح أو مفهوم إنجليزي → تحته شرح عربي تفصيلي.
- الشكل:
  ### مصطلح (English Term)
  [الشرح العربي التفصيلي هنا]
- لا تختصر الشرح العربي — الطالب يفهم من الشرح وحده.
- نظّم تحت عناوين ## حسب الموضوعات.`,

      simple_overview: `
اشرح المحتوى كأنك بتشرح لطالب في أول مرة يسمع الموضوع:
- لغة عربية بسيطة جداً، لا مصطلحات تقنية بدون شرح.
- ابدأ بـ "الفكرة الكبيرة" في جملتين.
- استخدم أمثلة من الحياة اليومية إذا أمكن.
- نظّم تحت عناوين واضحة H2.
- أسلوب محادثة وليس أكاديمي.`,

      organized_original: `
أعد تنظيم المحتوى الأصلي تحت عناوين منطقية واضحة:
- لا تحذف كلمة ولا تضيف معلومة جديدة.
- فقط إعادة ترتيب وتنظيم تحت ## عناوين و### عناوين فرعية.
- استخدم bullet points للقوائم.
- المعادلات في code blocks.`,

      compact: `
أقصر ملخص ممكن للمذاكرة السريعة جداً:
- كل موضوع = 2-3 نقاط فقط.
- استخدم رموز وأختصارات مفهومة.
- نظّم تحت عناوين مختصرة.
- لا شروحات — فقط المعلومة الجوهرية.
- الهدف: قراءة كل الملخص في 5 دقائق.`,
    };

    const stylePrompt = customStylePrompt?.trim() || styleInstructions[style] || styleInstructions.lecture_exact;

    return `${stylePrompt}

${langNote}
${sizeHint}
${structureHint}
${chunkNote}

─────────────────────
المحتوى المراد تلخيصه:

${text}
─────────────────────

الملخص (ابدأ من هنا):`;
  },

  summaryFacts: (text, language, templateId, chunkIndex, totalChunks) => `استخرج المعرفة الأكاديمية من جزء المصدر التالي كحقائق موثقة فقط.
هذه مرحلة استخراج وليست مرحلة تنسيق أو كتابة ملخص نهائي.
القالب المستهدف: ${templateId}. اللغة المطلوبة: ${language}. الجزء: ${chunkIndex + 1}/${totalChunks}.

قواعد صارمة:
- كل عنصر يجب أن يمثل حقيقة واحدة مهمة قابلة للمذاكرة وموجودة فعلاً في المصدر.
- source_evidence اقتباس قصير مطابق حرفياً للمصدر. إذا لم تجد دليلاً مطابقاً لا تُخرج الحقيقة.
- source_page رقم الصفحة من علامة [صفحة N] أو [Page N] فقط، وإلا null.
- formula تُنسخ حرفياً بدون تغيير، وإلا تكون سلسلة فارغة.
- importance من 1 إلى 5. semantic_type واحد من term|definition|fact|result|example|warning|formula|statistic.
- key_term عبارة قصيرة موجودة داخل statement_en أو statement_ar.
- في الوضع bilingual: statement_en نقطة إنجليزية دقيقة وexplanation_ar شرح عربي فصيح واضح لنفس الحقيقة.
- لا تضع Markdown أو علامات ألوان؛ التطبيق سيتولى التنسيق.
- أخرج بحد أقصى 28 حقيقة مرتبة حسب تسلسل المصدر، ولا تكرر نفس الفكرة.

رد JSON فقط:
{"facts":[{"statement_en":"","statement_ar":"","explanation_en":"","explanation_ar":"","key_term":"","semantic_type":"fact","importance":3,"formula":"","question":"","answer":"","section_title_en":"","section_title_ar":"","source_heading":"","source_page":null,"source_evidence":"exact source quote"}]}

المصدر:
${text}`,

  quizSourceAnalysis: (text) => `حلل نوع المحتوى التالي بغرض إنشاء كويز. أرجع JSON فقط بهذا الشكل:
{"source_type":"question_bank|study_material|mixed","has_answers":true,"question_count":0,"recommended_count":10,"dominant_language":"ar|en|mixed","subject":"medical|math|law|history|general","confidence":0.0,"recommendation":"extract|generate|hybrid","reason":"short reason"}
القواعد:
- question_bank = النص يحتوي أسئلة صريحة/اختيارات/مفتاح إجابة.
- study_material = شرح أو محاضرة بدون أسئلة جاهزة.
- mixed = شرح طويل ومعه بعض الأسئلة.
- لا تجب عن الأسئلة ولا تولد أسئلة هنا.
المحتوى:\n${text.slice(0, 22000)}`,

  quiz: (text, numQ, difficulty, withExplanation, language, quizMode, hasAnswers, quizProfile = "balanced") => {
    if (quizMode === true || quizMode === "extract") {
      if (hasAnswers === false) {
        // أسئلة بدون إجابات — الـ AI يحلّها من معلوماته
        if (language === "en") {
          return `You are an elite academic professor and meticulous exam parser. Extract all exam questions from the following text into high-quality structured JSON.
CRITICAL RULES:
1. STRICT LANGUAGE MANDATE: All questions, options, and explanations MUST BE 100% IN ENGLISH. Do NOT translate to Arabic.
2. These questions lack an answer key in the text. Use your deep medical/academic domain knowledge to solve them accurately and explain the rationale in detail.
3. Extract ALL questions without exception.
4. Preserve the exact number of options per question (2, 3, 4, 5, or 6 options). Never split long options into multiple fragments.
5. If a question depends on a scenario or clinical case, prepend the scenario to the question stem.
6. Provide a comprehensive clinical/academic explanation FIRST, then copy the EXACT verbatim text of the correct option into "correct_answer", and set "correct_index" to its 0-based index (0=first option, 1=second option, 2=third option, 3=fourth option).

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"exact verbatim text of the winning option","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"","knowledge_based":true,"answer_confidence":0.95,"needs_review":false}]}

Text:
${text}`;
        }
        return `أنت خبير أكاديمي محترف ومستخرج امتحانات دقيق. المهمة: استخرج جميع الأسئلة الموجودة في النص التالي وحوّلها لكويز متمتع بأعلى درجات الجودة.
مهم جداً:
1. هذه الأسئلة ليس لها مفتاح إجابة مكتوب في النص. استخدم معرفتك الأكاديمية لتحديد الإجابة الصحيحة لكل سؤال بدقة وشرحها بالتفصيل.
2. استخرج جميع الأسئلة بلا استثناء (مهما كان عددها: 15، 29، 30، إلخ).
3. حافظ على عدد الاختيارات لكل سؤال كما جاء في النص (سواء 2 أو 3 أو 4 أو 5 أو 6 اختيارات، مثل A/B/C/D/E). لا تحذف الخيار الخامس (E/هـ).
4. ممنوع منعاً باتاً تقسيم الاختيار الطويل إلى خيارين مفصولين. كل خيار يجب أن يمثل إجابة واحدة كاملة كما كتبت في النص الأصل.
5. إذا كان السؤال تكميلياً أو يعتمد على حالة/سيناريو سابق (مثلاً: "تكملة للسؤال السابق..." أو "بناءً على حالة المريض..."): أضف نص الحالة/السيناريو في بداية السؤال ليصبح قائماً بذاته ومفهوماً 100%.
6. اكتب الشرح الأكاديمي (explanation) أولاً، ثم انسخ نص الإجابة الصحيحة حرفياً في حقل "correct_answer"، ثم حدد رقمها الصفري في "correct_index" (حيث 0 هو الخيار الأول، 1 هو الثاني، 2 هو الثالث، 3 هو الرابع).

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"نص الخيار الصحيح حرفياً","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"صفحة/عنوان إن وجد","source_evidence":"","knowledge_based":true,"answer_confidence":0.9,"needs_review":false}]}
النص:
${text}`;
      }
      // أسئلة معها إجابات — استخرجها مباشرة
      if (language === "en") {
        return `You are an elite academic professor and meticulous exam parser. Extract all exam questions from the following text into structured JSON:
CRITICAL RULES:
1. STRICT LANGUAGE MANDATE: All questions, options, and explanations MUST BE 100% IN ENGLISH. Do NOT translate to Arabic.
2. Extract all questions present in the text without exception.
3. Use the answer key or markings indicated in the text.
4. Preserve the exact number of options per question (2, 3, 4, 5, or 6 options).
5. If a question depends on a clinical case or previous context, prepend the scenario to the question stem.
6. Write the explanation FIRST, then copy the EXACT verbatim text of the correct option into "correct_answer", and set "correct_index" to its 0-based index (0=1st, 1=2nd, 2=3rd, 3=4th).

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"exact verbatim text of the winning option","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"short quote confirming answer","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

Text:
${text}`;
      }
      return `أنت مستخرج امتحانات دقيق وفاخر. استخرج جميع الأسئلة الموجودة في النص التالي وحولها لـ JSON:
قواعد صارمة للاستخراج:
1. استخرج جميع الأسئلة الموجودة في النص بلا استثناء (حتّى لو كان النص يحتوي 15 أو 29 أو 30 أو أكتر).
2. استخدم مفتاح الإجابة أو العلامات الموضحة بالمرجع (مثل الإجابة الصحيحة أو Bold/Checkmarks).
3. حافظ على عدد الخيارات لكل سؤال بالظبط كما في النص (سواء 2، 3، 4، 5، أو 6 خيارات). لا تحذف الخيار الخامس (E/هـ).
4. ممنوع منعاً باتاً تقسيم الإجابة الطويلة إلى خيارين مفصولين؛ الخيار الواضح يظل خياراً واحداً كاملاً.
5. إذا كان السؤال تكميلياً أو يعتمد على حالة/قصة أو سؤال سابق: ادمج نص الحالة في بداية رأس السؤال ليكون مفهوماً وقائماً بذاته.
6. اكتب الشرح (explanation) أولاً، ثم انسخ نص الإجابة الصحيحة حرفياً في "correct_answer"، ثم ضع رقمها الصفري في "correct_index" (0 للأول، 1 للثاني، 2 للثالث، 3 للرابع).

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"نص الخيار الصحيح حرفياً","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"صفحة/عنوان إن وجد","source_evidence":"عبارة قصيرة تثبت الإجابة","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}
النص:\n${text}`;
    }

    if (language === "en") {
      const diffMapEn = { easy: "Easy and direct recall", mixed: "Balanced (mix of recall, comprehension, and analytical)", hard: "Advanced analytical and clinical decision making" };
      const profileMapEn = {
        balanced: "Balanced: Comprehensive review covering definitions, mechanisms, applications, and differential diagnosis.",
        exam: "Exam mode: Standard final exam questions, precise, discriminatory, and testing subtle details.",
        concepts: "Concept mastery: Deep conceptual understanding, underlying mechanisms, and core physiology/pathology.",
        application: "Application/cases: Clinical vignette style cases, patient presentations, and diagnostic decision-making.",
        traps: "Mistake traps: Classic diagnostic pitfalls, high-yield traps, and easily confused presentations.",
      };
      const hybridRuleEn = quizMode === "hybrid"
        ? `Hybrid source: Extract existing questions without repetition first, then synthesize new high-yield questions until reaching ${numQ}.`
        : `Synthesize exactly ${numQ} high-yield exam questions from the material.`;

      return `You are an elite academic professor and expert medical/scientific exam generator. ${hybridRuleEn}
Difficulty: ${diffMapEn[difficulty] || "Balanced"}
Quiz Profile: ${profileMapEn[quizProfile] || profileMapEn.balanced}
STRICT LANGUAGE REQUIREMENT: All questions, options, and explanations MUST BE 100% IN ENGLISH. Do NOT output any Arabic words, because the student is studying and testing entirely in English.
Explanations: ${withExplanation ? "Include a high-yield academic explanation for each question explaining why the correct choice is right and others are ruled out." : "Without explanation."}
QUALITY & INDEXING RULES:
- Exactly 4 options per question, exactly ONE unambiguous correct answer.
- Distractor Symmetry Rule: All 4 options must be similar in length, professional phrasing, and plausibility (within 2-3 words). Never make the correct answer significantly longer or more detailed than distractors.
- Plausible Distractors: Must reflect real diagnostic alternatives and common misconceptions.
- Distribute correct_index evenly across 0, 1, 2, and 3.
- CRITICAL ZERO-BASED VERIFICATION: Write "explanation" FIRST, then copy the EXACT verbatim string of the winning option into "correct_answer", and finally set "correct_index" to its 0-based index (0=1st option, 1=2nd option, 2=3rd option, 3=4th option). Verify that options[correct_index] === correct_answer!

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"exact verbatim text of the winning option","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

Source Content:
${text}`;
    }

    const diffMap = { easy: "سهل ومباشر", mixed: "متنوع (سهل ومتوسط وصعب)", hard: "تفكيري وتحليلي" };
    const profileMap = {
      balanced: "Balanced: مزيج مراجعة شامل يغطي التعريفات، الفهم، التطبيق، والمقارنات.",
      exam: "Exam mode: أسئلة شبه الامتحانات، دقيقة، وتقيس التفاصيل المهمة والتمييز بين الاختيارات.",
      concepts: "Concept mastery: ركز على الفهم العميق، التعريفات، العلاقات بين الأفكار، ولماذا/كيف.",
      application: "Application/cases: حوّل المعلومات لمواقف عملية أو حالات قصيرة عندما يناسب المنهج.",
      traps: "Mistake traps: ركز على الأخطاء الشائعة والفروق المتشابهة بدون أسئلة خادعة ظالمة.",
    };
    const hybridRule = quizMode === "hybrid"
      ? `المصدر مختلط: استخرج أولاً الأسئلة الجاهزة بدون تكرار، ثم أكمل بأسئلة جديدة من الشرح حتى يصبح الإجمالي ${numQ}.`
      : `المصدر مادة شرح: ولّد بالضبط ${numQ} سؤالاً جديداً.`;
    return `أنت مصمم امتحانات ذكي. ${hybridRule}
المستوى: ${diffMap[difficulty] || "متنوع"}
نوع الكويز: ${profileMap[quizProfile] || profileMap.balanced}
اللغة: عربي واضح مع بقاء المصطلحات والأسماء الطبية والتقنية الإنجليزية بين قوسين
الشرح: ${withExplanation ? "أضف شرحاً مفيداً لكل سؤال" : "بدون شرح"}
قواعد الجودة:
- 4 خيارات لكل سؤال، وإجابة واحدة صحيحة فقط.
- **قاعدة تماثل وتكافؤ الخيارات (Distractor Symmetry Rule - صارمة جداً)**: يجب أن تكون جميع الخيارات الـ 4 متقاربة جداً في الطول وعدد الكلمات والأسلوب اللغوي (فارق أقصاه 2 إلى 3 كلمات فقط). ممنوع منعاً باتاً كتابة إجابة صحيحة طويلة ومفصلة بينما الخيارات الخاطئة قصيرة وواضحة الخطأ، حتى لا تنكشف الإجابة بالنظر.
- المشتتات الخاطئة (Distractors) يجب أن تكون مقنعة ومنطقية علمياً ومكتوبة بنفس درجة العمق والاحترافية.
- وزع الأسئلة: فهم مباشر + تطبيق + مقارنة/تمييز + أخطاء شائعة.
- لا تستخدم "كل ما سبق" أو "لا شيء مما سبق" إلا لو ضروري جداً.
- لا تكرر نفس الفكرة بألفاظ مختلفة.
- أضف source_ref من رقم الصفحة أو عنوان الفصل إذا كان واضحاً.
- أضف source_evidence كعبارة قصيرة موجودة فعلاً في المصدر وتثبت الإجابة؛ لا تخترع اقتباساً.
- ضع knowledge_based=false وanswer_confidence بين 0 و1 وneeds_review=true فقط عند نقص الدليل أو الشك.
- وزع correct_index على 0 و1 و2 و3؛ لا تجعل معظم الإجابات في نفس الموضع.
- **قاعدة المطابقة الصارمة للإجابة الصحيحة**: اكتب الشرح (explanation) أولاً، ثم انسخ نص الإجابة الصحيحة حرفياً في حقل "correct_answer"، ثم ضع رقمها الصفري في "correct_index" (حيث 0=الخيار الأول، 1=الثاني، 2=الثالث، 3=الرابع).
رد بـ JSON فقط بدون أي نص:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"نص الخيار الصحيح حرفياً","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.9,"needs_review":false}]}
المحتوى:\n${text}`;
  },

  quizTopUp: (text, missingCount, existingQuestions, difficulty, withExplanation, language, quizProfile) => {
    if (language === "en") {
      return `Complete the exam after the quality auditor rejected some questions from the first pass.
Synthesize exactly ${missingCount} brand new, unique questions distinct from the list below.
CRITICAL LANGUAGE MANDATE: 100% English. Do NOT output any Arabic words.
Difficulty: ${difficulty}. Profile: ${quizProfile}.
${withExplanation ? "Write a clear academic rationale for each answer." : "Set explanation to empty string."}
Each question must have 4 options, 1 correct answer, and distractor symmetry.
Do NOT use 'all of the above' or 'none of the above'. Distribute correct_index evenly across 0, 1, 2, 3.
Write "explanation" FIRST, then copy the exact winning option into "correct_answer", and set 0-based "correct_index" (0..3).

Existing questions that must NOT be repeated:
${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n") || "None"}

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"exact verbatim text of winning option","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

Source:
${text}`;
    }

    return `
أكمل الكويز بعد أن رفض فاحص الجودة بعض أسئلة المحاولة الأولى.
ولّد بالضبط ${missingCount} سؤالاً جديداً مختلفاً عن قائمة الأسئلة الموجودة أدناه.
اللغة: عربي مع إبقاء المصطلحات التقنية الإنجليزية بين قوسين.
المستوى: ${difficulty}. النمط: ${quizProfile}.
${withExplanation ? "اكتب تفسيراً أكاديمياً واضحاً لكل إجابة." : "ضع explanation كسلسلة فارغة."}
كل سؤال يجب أن يحتوي 4 خيارات مختلفة وإجابة واحدة صحيحة ومعلومة source_evidence قصيرة موجودة في المصدر.
قاعدة تماثل الخيارات: يجب أن تكون جميع الخيارات الـ 4 متقاربة في الطول والأسلوب اللغوي (فارق لا يتجاوز 3 كلمات)، وتجنب جعل الإجابة الصحيحة أطول من المشتتات الخاطئة.
لا تستخدم كل ما سبق أو لا شيء مما سبق. وزّع correct_index بين 0 و1 و2 و3.
اكتب الشرح (explanation) أولاً، ثم انسخ نص الخيار الصحيح حرفياً في "correct_answer"، ثم حدد "correct_index" الصفري (0..3).

الأسئلة الموجودة التي يمنع تكرارها أو إعادة صياغتها:
${existingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n") || "لا يوجد"}

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"...","correct_answer":"نص الخيار الصحيح حرفياً","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.9,"needs_review":false}]}

المصدر:
${text}`;
  },

  quizAudit: (questionsPayload, sourceText = "") => `You are Black Fighters' Chief Medical & Academic Verification Agent (Multi-Agent Quiz Auditor).
Your mission is to audit each multiple-choice question (MCQ) with 100% scientific, clinical, and logical precision.

CRITICAL VERIFICATION PROTOCOL FOR EVERY QUESTION:
1. Read the question stem ("q") and all choices ("options", explicitly prefixed with their 0-based index "0: ...", "1: ...", "2: ...", "3: ...").
2. Read the current explanation ("exp") and current_index.
3. Independently determine WHICH option is scientifically/medically/factually correct.
4. Watch out for common AI generation bugs:
   - 1-based vs 0-based index shift (e.g., marking index 2 when the 2nd option at index 1 is the actual answer!).
   - Contradiction between the explanation and current_index (e.g., the explanation proves Option 1 is right and rules out Option 2, yet current_index is set to 2!).
   - Scientifically wrong answer selection.
5. For every question, output:
   - "i": exact question index from input
   - "reasoning": 1 concise sentence verifying the true scientific/clinical answer
   - "correct_answer": exact verbatim text of the winning option (WITHOUT the "0: " prefix)
   - "correct_index": exact 0-based integer (0, 1, 2, or 3) corresponding to that option
   - "explanation": if the existing explanation ("exp") is accurate and clear, keep it; if it is missing, weak, or contradicts the true answer, write a sharp, high-yield explanation in the SAME language as the question.
   - "fixed": true if correct_index was changed, false otherwise.

Return STRICT JSON only:
{"audits":[{"i":0,"reasoning":"...","correct_answer":"...","correct_index":1,"explanation":"...","fixed":true}]}
${sourceText ? `\nReference Material (if applicable):\n${String(sourceText).slice(0, 10000)}\n` : ""}
Questions to Audit:
${JSON.stringify(questionsPayload)}`,

  textExamParser: (text) => `استخرج جميع الأسئلة الموجودة في النص التالي وحوّلها لـ JSON وفقاً لتعليمات النظام بدون أي ترجمة أو اختلاق.

النص المراد استخراج امتحانه:
${text}`,

  flashcards: (text, language) =>
    `أنشئ بطاقات مراجعة (flashcards) من المحتوى التالي.
Language: ${language === "ar" ? "عربي" : "English"}
رد بـ JSON فقط:
{"cards":[{"front":"...","back":"..."}]}
المحتوى:\n${text}`,

  chat: (message, history, courseContext) => {
    const historyText = (history || [])
      .filter(m => m.content && !m.content.startsWith("أهلاً"))
      .slice(-8)
      .map(m => `${m.role === "user" ? "الطالب" : "المساعد"}: ${m.content}`)
      .join("\n");
    return `أنت Black Fighters، المساعد الدراسي الذكي للمنصة. ردودك عربية مفيدة ومنظمة بـ Markdown، واسمك Black Fighters فقط.
${courseContext ? `\nمقاطع الكورس المسترجعة محلياً (للمرجعية):\n${courseContext}\n` : ""}
${historyText ? `سياق المحادثة:\n${historyText}\n` : ""}
الطالب: ${message}
Black Fighters:`;
  },
};

/**
 * Multi-Agent Quiz Auditor & Auto-Corrector
 * Combines deterministic explanation/answer reconciliation with an independent AI Critic pass.
 */
export async function auditQuizQuestionsWithAI(rawQuestions = [], config = {}, sourceText = "") {
  if (!Array.isArray(rawQuestions) || !rawQuestions.length) {
    return { questions: [], correctedCount: 0, corrections: [], totalAudited: 0 };
  }

  // Stage 1: Deterministic pre-reconciliation
  const workingQuestions = rawQuestions.map((q) => reconcileQuestionAnswer({ ...q }));
  const corrections = [];

  workingQuestions.forEach((q, idx) => {
    const origIdx = rawQuestions[idx]?.correct_index ?? rawQuestions[idx]?.correct ?? rawQuestions[idx]?.correctOption ?? 0;
    if (q.correct_index !== origIdx) {
      corrections.push({
        questionIndex: idx,
        oldIndex: origIdx,
        newIndex: q.correct_index,
        oldOption: rawQuestions[idx]?.options?.[origIdx] || "",
        newOption: q.options?.[q.correct_index] || "",
        method: "explanation_reconciler",
      });
    }
  });

  // Stage 2: Independent AI Critic Verification in fast batches of 15
  const BATCH_SIZE = 15;
  const auditConfig = taskConfig(config, { temperature: 0.05, max_tokens: 8192 });

  for (let start = 0; start < workingQuestions.length; start += BATCH_SIZE) {
    const slice = workingQuestions.slice(start, start + BATCH_SIZE);
    const payloadForAi = slice.map((q, localIdx) => {
      const opts = Array.isArray(q.options) ? q.options : [];
      return {
        i: start + localIdx,
        q: String(q.question || q.q || q.text || "").slice(0, 600),
        options: opts.map((opt, oIdx) => `${oIdx}: ${String(opt || "").slice(0, 220)}`),
        current_index: Number(q.correct_index ?? q.correct ?? q.correctOption ?? 0),
        exp: String(q.explanation || q.exp || "").slice(0, 500),
      };
    });

    try {
      const parsed = await generateJson(
        PROMPTS.quizAudit(payloadForAi, sourceText),
        auditConfig,
        "quiz multi-agent audit JSON",
        SYSTEM_PROMPTS.quiz
      );
      const audits = Array.isArray(parsed?.audits) ? parsed.audits : (Array.isArray(parsed) ? parsed : []);

      for (const audit of audits) {
        const qIdx = Number(audit?.i ?? audit?.index);
        if (!Number.isInteger(qIdx) || qIdx < 0 || qIdx >= workingQuestions.length) continue;
        const target = workingQuestions[qIdx];
        const opts = Array.isArray(target.options) ? target.options : [];
        if (opts.length < 2) continue;

        // Match by exact text first (strip optional "0: " prefix)
        const cleanAnsText = String(audit?.correct_answer || "")
          .replace(/^\s*\d+\s*[:.)\-]\s*/, "")
          .trim();

        let verifiedIdx = -1;
        if (cleanAnsText.length >= 2) {
          const normTarget = cleanAnsText.toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
          verifiedIdx = opts.findIndex((o) => {
            const normOpt = String(o || "").toLowerCase().replace(/[^a-z0-9\u0600-\u06FF]+/g, " ").trim();
            return normOpt === normTarget || (normOpt.length >= 5 && normTarget.includes(normOpt)) || (normTarget.length >= 5 && normOpt.includes(normTarget));
          });
        }

        if (verifiedIdx < 0 && Number.isInteger(Number(audit?.correct_index))) {
          const numIdx = Number(audit.correct_index);
          if (numIdx >= 0 && numIdx < opts.length) verifiedIdx = numIdx;
        }

        const updatedExplanation = String(audit?.explanation || target.explanation || target.exp || "").trim();
        const candidateQuestion = reconcileQuestionAnswer({
          ...target,
          correct_answer_text: cleanAnsText || undefined,
          correct_index: verifiedIdx >= 0 ? verifiedIdx : (target.correct_index ?? 0),
          explanation: updatedExplanation || target.explanation,
        });

        const finalIdx = candidateQuestion.correct_index;
        const origIdx = rawQuestions[qIdx]?.correct_index ?? rawQuestions[qIdx]?.correct ?? rawQuestions[qIdx]?.correctOption ?? 0;

        if (finalIdx >= 0 && finalIdx < opts.length) {
          const existingCorrection = corrections.findIndex((c) => c.questionIndex === qIdx);
          if (finalIdx !== origIdx) {
            const corrEntry = {
              questionIndex: qIdx,
              oldIndex: origIdx,
              newIndex: finalIdx,
              oldOption: opts[origIdx] || "",
              newOption: opts[finalIdx] || "",
              reasoning: String(audit?.reasoning || "").trim(),
              method: "multi_agent_ai",
            };
            if (existingCorrection >= 0) corrections[existingCorrection] = corrEntry;
            else corrections.push(corrEntry);
          } else if (existingCorrection >= 0) {
            corrections.splice(existingCorrection, 1);
          }

          workingQuestions[qIdx] = {
            ...target,
            correct_index: finalIdx,
            correct: finalIdx,
            correctOption: finalIdx,
            correct_answer: opts[finalIdx],
            explanation: updatedExplanation || target.explanation,
            needs_review: false,
            ai_audited: true,
          };
        }
      }
    } catch (auditErr) {
      console.warn("[QuizAuditAgent] AI batch audit warning (falling back to deterministic reconciliation):", auditErr?.message);
    }
  }

  return {
    questions: workingQuestions,
    correctedCount: corrections.length,
    corrections,
    totalAudited: workingQuestions.length,
  };
}

// ─── High-level study content generator ──────────────────────────────────────

export async function runGenerateStudyContent(payload, config) {
  const { task, text, language = "ar", numQuestions = 10, difficulty = "mixed",
    withExplanation = true, summaryStyle = "complete_study_guide", summaryMaxPages = 30,
    chunkIndex = 0, totalChunks = 1, extractMode = false, quizMode = null,
    sourceAnalysis = null, stylePrompt = "", quizProfile = "balanced" } = payload;

  if (task === "quiz_audit") {
    return await auditQuizQuestionsWithAI(payload.questions || [], config, text || "");
  }

  if (task === "summary_facts") {
    const parsed = await generateJson(
      PROMPTS.summaryFacts(text, language, summaryStyle, chunkIndex, totalChunks),
      taskConfig(config, { temperature: 0.05, max_tokens: 10_000 }),
      "summary facts JSON",
      SYSTEM_PROMPTS.summary,
    );
    return {
      facts: Array.isArray(parsed?.facts) ? parsed.facts : [],
      model_actual: config?.model || "",
      chunk_index: chunkIndex,
    };
  }

  if (task === "quiz_source_analysis") {
    const fallback = localAnalyzeQuizSource(text);
    try {
      const parsed = await generateJson(
        PROMPTS.quizSourceAnalysis(text),
        taskConfig(config, { temperature: 0.05, max_tokens: 1400 }),
        "quiz source analysis JSON",
        SYSTEM_PROMPTS.quiz,
      );
      const recommendation = ["extract", "generate", "hybrid"].includes(parsed?.recommendation)
        ? parsed.recommendation
        : fallback.recommendation;
      const sourceType = ["question_bank", "study_material", "mixed"].includes(parsed?.source_type)
        ? parsed.source_type
        : fallback.source_type;
      return {
        ...fallback,
        ...parsed,
        source_type: sourceType,
        recommendation,
        question_count: Math.max(0, Number(parsed?.question_count ?? fallback.question_count) || 0),
        recommended_count: Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(parsed?.recommended_count ?? fallback.recommended_count) || 10)),
        confidence: Math.max(0, Math.min(1, Number(parsed?.confidence ?? fallback.confidence) || fallback.confidence)),
      };
    } catch {
      return fallback;
    }
  }

  if (task === "summary") {
    const prompt = PROMPTS.summary(text, summaryStyle, summaryMaxPages, language, chunkIndex, totalChunks, stylePrompt);
    const raw = await generateText(
      prompt,
      taskConfig(config, { temperature: 0.2, max_tokens: 12288 }),
      SYSTEM_PROMPTS.summary,
    );
    return { summary_markdown: raw };
  }

  if (task === "text_exam_parser" || (task === "quiz" && (quizMode === "text_parser" || extractMode === "text_parser"))) {
    const prompt = PROMPTS.textExamParser(text);
    const parserConfig = taskConfig(config, { temperature: 0.05, max_tokens: 16384 });
    const parsed = await generateJson(prompt, parserConfig, "universal text exam JSON", SYSTEM_PROMPTS.textExamParser);
    return parsed;
  }

  if (task === "quiz") {
    // Smart language determination if not explicitly specified as "en" or "ar"
    let effectiveLanguage = language;
    if (!effectiveLanguage || effectiveLanguage === "auto" || effectiveLanguage === "mixed" || effectiveLanguage === "bilingual") {
      effectiveLanguage = getRecommendedQuizLanguage(text);
    }

    // تحديد ما إذا كانت الأسئلة تحتوي على إجابات أم لا
    const hasAnswers = sourceAnalysis?.has_answers ?? null;
    const prompt = PROMPTS.quiz(text, numQuestions, difficulty, withExplanation, effectiveLanguage, quizMode || extractMode, hasAnswers, quizProfile);
    const desiredCount = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(numQuestions) || 10));
    const mode = quizMode || extractMode || "generate";
    const quizConfig = taskConfig(config, { temperature: 0.12, max_tokens: 12288 });
    const parsed = await generateJson(prompt, quizConfig, "quiz JSON", SYSTEM_PROMPTS.quiz);
    const firstPass = normalizeQuizResult(parsed, {
      desiredCount,
      mode,
      sourceAnalysis,
      difficulty,
      requireExplanation: withExplanation,
      sourceText: text,
    });

    let finalResult = firstPass;
    if (mode !== "extract" && firstPass.questions.length < desiredCount) {
      const missingCount = desiredCount - firstPass.questions.length;
      const topUpPrompt = PROMPTS.quizTopUp(
        text,
        missingCount,
        firstPass.questions.map((question) => question.question),
        difficulty,
        withExplanation,
        effectiveLanguage,
        quizProfile,
      );
      try {
        const topUp = await generateJson(topUpPrompt, quizConfig, "quiz top-up JSON", SYSTEM_PROMPTS.quiz);
        const completed = normalizeQuizResult({ questions: [...firstPass.questions, ...(topUp?.questions || [])] }, {
          desiredCount,
          mode,
          sourceAnalysis,
          difficulty,
          requireExplanation: withExplanation,
          sourceText: text,
        });
        completed.stats.first_pass_accepted = firstPass.questions.length;
        completed.stats.top_up_requested = missingCount;
        finalResult = completed;
      } catch (error) {
        console.warn("[quiz] Quality top-up failed; returning the valid first-pass questions", error);
        firstPass.stats.top_up_requested = missingCount;
        firstPass.stats.top_up_failed = true;
        finalResult = firstPass;
      }
    }

    // Multi-Agent Verification Pass: Automatically verify and fix any questionable answers
    if (payload.autoAudit !== false && finalResult.questions.length > 0) {
      try {
        const audited = await auditQuizQuestionsWithAI(finalResult.questions, config, text);
        if (Array.isArray(audited?.questions) && audited.questions.length === finalResult.questions.length) {
          finalResult.questions = audited.questions;
          finalResult.stats = {
            ...(finalResult.stats || {}),
            multi_agent_audited: true,
            multi_agent_corrections: audited.correctedCount || 0,
            needs_review: audited.questions.filter((q) => q.needs_review).length,
          };
        }
      } catch (auditErr) {
        console.warn("[quiz] Multi-agent auto-audit skipped:", auditErr?.message);
      }
    }

    return finalResult;
  }

  if (task === "flashcards") {
    const prompt = PROMPTS.flashcards(text, language);
    return generateJson(prompt, taskConfig(config, { temperature: 0.14 }), "flashcards JSON");
  }

  if (task === "generic_summary" || task === "organize") {
    const prompt = PROMPTS.summary(text, task === "organize" ? "complete_study_guide" : "exam_revision_sheet", 10, language);
    const raw = await generateText(
      prompt,
      taskConfig(config, { temperature: 0.18, max_tokens: 12288 }),
      SYSTEM_PROMPTS.summary,
    );
    return { text: raw, summary_markdown: raw };
  }

  throw new Error(`Unknown task: ${task}`);
}

export async function runAiChat(message, history, config, courseContext = "") {
  const prompt = PROMPTS.chat(message, history || [], courseContext);
  return generateText(prompt, taskConfig(config, { temperature: 0.45, max_tokens: config?.max_tokens || 1500 }), SYSTEM_PROMPTS.chat);
}

// ─── Legacy compat (for old imports that use generateContent / chatContent) ──
export async function generateContent(prompt, apiKey, modelName = DEFAULT_MODELS.gemini, _sys = null) {
  return generateText(prompt, { provider: "gemini", api_key: apiKey, model: modelName });
}

export async function chatContent(history, message, apiKey, modelName = DEFAULT_MODELS.gemini) {
  return chatText(history, message, { provider: "gemini", api_key: apiKey, model: modelName });
}
