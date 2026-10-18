/**
 * ai.js — Universal AI Router
 * Supports: Google Gemini · Groq · OpenRouter
 * All providers share the same interface: generateText(prompt, config) / chat(history, message, config)
 * config = { provider, api_key, model }
 */

import { GoogleGenerativeAI } from "@google/generative-ai";
import {
  localAnalyzeQuizSource,
  normalizeQuizResult,
  reconcileQuestionAnswer,
  matchTextAgainstOptions,
  verifyAndPrepareQuizQuestions,
  QUIZ_MAX_QUESTIONS,
  detectLanguage,
  detectSubject,
  getRecommendedQuizLanguage,
} from "./quizQuality.js";
import {
  buildArtifactKey,
  getCachedArtifact,
  setCachedArtifact,
  prepareHybridQuizPlan,
  commitHybridQuizQuestions,
} from "./smartCache.js";
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
export const DEFAULT_DEEPSEEK_KEY = getEnvKey("DEEPSEEK_API_KEY") || getEnvKey("VITE_DEEPSEEK_API_KEY") || "";
export const DEEPSEEK_BASE_URL = "https://api.deepseek.com/v1";
export const DEFAULT_OPENROUTER_KEY = getEnvKey("OPENROUTER_API_KEY") || getEnvKey("VITE_OPENROUTER_API_KEY");
export const POLLINATIONS_BASE_URL = "https://text.pollinations.ai/openai";

export const DEFAULT_CODECRAFT_KEY = env.VITE_CODECRAFT_KEY || "";
export const CODECRAFT_BASE_URL = "https://codecraftapi.com/v1";

export const DEFAULT_MODELS = {
  groq:        "openai/gpt-oss-120b",
  deepseek:    "DeepSeek-V4.1-Flash-1017",
  gemini:      "gemini-3.5-flash-lite",
  zai:         "glm-4.7-flash",
  apmix:       "DeepSeek-V4.1-Flash-1017",
  openrouter:  "openrouter/free",
  pollinations:"openai",
  codecraft:   "DeepSeek-V4.1-Flash-1017",
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
  quiz: `You are Black Fighters' elite assessment engineer and exam generator.
Every question must have an unambiguous correct answer, plausible distractors designed around common student misconceptions, exact options preserved from source, and full context.
Support multi-tier questions:
- Tier 1: Core recall and understanding.
- Tier 2: Analytical application, clinical case scenarios, and multi-step reasoning.
Do not split long answer choices into separate options. Preserve 2, 3, 4, 5, or 6 options exactly as present in the source text.
If a question depends on a clinical case, scenario, or previous text, prepend the scenario context to the question stem so it is 100% self-contained.
CRITICAL ANSWER-EXPLANATION CONSISTENCY RULE:
1. Always generate "explanation" BEFORE "correct_answer" and "correct_index".
2. Begin "explanation" by explicitly naming the winning option verbatim: e.g. "Correct answer: [exact option text] — ..." (in English) or "الإجابة الصحيحة: [نص الخيار الصحيح حرفياً] — ..." (in Arabic), then explain why it is right and why the other choices are wrong.
3. Copy the EXACT verbatim text of that winning option into "correct_answer".
4. Set "correct_index" to the 0-based position of that option in the "options" array (0 = 1st option, 1 = 2nd option, 2 = 3rd option, 3 = 4th option). Verify that options[correct_index] === correct_answer!
Return only the requested JSON object.`,
  chat: `You are Black Fighters, a concise source-aware study assistant powered by Claude. Distinguish source facts from general knowledge, say when the supplied course does not contain an answer, and never fabricate a citation.`,
  textExamParser: `أنت محرك استخراج وحل أسئلة امتحانات دقيق للغاية (Exam Parser & Solver). قاعدتك الأولى: الدقة العلمية التامة وعدم الخطأ في تحديد الإجابة الصحيحة أبداً.

مهمتك: تستقبل نص خام (قد يكون امتحاناً جاهزاً بمفتاح إجابة، أو أسئلة بدون إجابات، أو خليطاً بين الاثنين) وتُخرج كل سؤال موجود فيه بصيغة JSON منظمة. التزم بالقواعد التالية حرفياً بدون استثناء:

1. احتفظ باللغة الأصلية تماماً كما وردت في السؤال والاختيارات. لو السؤال بالإنجليزية أخرجه بالإنجليزية، ولو بالعربية أخرجه بالعربية بنفس الصياغة والمصطلحات بالضبط بدون ترجمة.

2. لا تفترض عدد ثابت من الاختيارات. قد يكون للسؤال 2 أو 3 أو 4 أو 5 أو 6 اختيارات — احتفظ بجميع الاختيارات كما وردت بدون حذف أو دمج.

3. تعرّف تلقائياً على أي نظام ترقيم للاختيارات:
   - حروف إنجليزية: A) B) C) D) E)
   - أرقام: 1) 2) 3) 4)
   - حروف عربية: أ) ب) ج) د) هـ)
   - نقاط أو شرطات بدون ترقيم — رتّبها حسب ترتيب ظهورها في النص.

4. الأسئلة الممتدة على أكثر من سطر أو المعتمدة على حالة إكلينيكية (Case Scenario): ادمج السطور التكميلية أو نص الحالة في بداية السؤال ليصبح كاملاً ومفهوماً.

5. تحديد الإجابة الصحيحة ومطابقتها الصارمة مع الشرح (أهم قاعدة على الإطلاق):
   - إذا كانت الإجابة الصحيحة مذكورة في النص (بجانب السؤال أو بعلامة صح/نجمة أو في مفتاح إجابات بنهاية الملف)، التزم بها حرفياً.
   - إذا لم تكن الإجابة مذكورة في النص، قم بحل السؤال علمياً وأكاديمياً بدقة 100% وحدد الخيار الصحيح.
   - اكتب حقل "explanation" أولاً، وابدأه دائماً بذكر نص الخيار الصحيح صراحةً:
     • في الأسئلة العربية: "الإجابة الصحيحة: [انسخ نص الخيار الصحيح حرفياً] — لأن..."
     • في الأسئلة الإنجليزية: "Correct answer: [exact verbatim text of the winning option] — because..."
   - انسخ نص الخيار الصحيح حرفياً في حقل "correct_answer".
   - ضع رمز الخيار الصحيح في "correct_answer_label" (مثل "A" أو "B" أو "أ" أو "ب")، ورقمه الصفري في "correct_index" (حيث 0 = الاختيار الأول، 1 = الاختيار الثاني، 2 = الثالث، 3 = الرابع).
   - تأكد 100% أن الخيار المشروح في "explanation" هو نفسه المكتوب في "correct_answer" وهو نفسه الموجود في options[correct_index].

6. إذا كان السؤال يعتمد اعتماداً كلياً على صورة غير موجودة ولا يمكن حله نصياً، ضع "needs_review": true مع توضيح السبب في "review_reason".

أخرج النتيجة بصيغة JSON فقط بدون أي نص إضافي:

{
  "questions": [
    {
      "question_text": "نص السؤال كاملاً كما ورد في المصدر",
      "options": [
        { "label": "A", "text": "نص الاختيار الأول بدون الرمز" },
        { "label": "B", "text": "نص الاختيار الثاني بدون الرمز" }
      ],
      "explanation": "الإجابة الصحيحة: نص الاختيار الثاني بدون الرمز — التفسير العلمي المختصر...",
      "correct_answer": "نص الاختيار الثاني بدون الرمز",
      "correct_answer_label": "B",
      "correct_index": 1,
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

// ─── DeepSeek / Multimodal Flash Engine (DeepSeek-V4.1-Flash-1017 + V3/R1) ──
async function deepseekGenerate({ apiKey, model, messages, systemPrompt, maxTokens, temperature }) {
  const effectiveKey = apiKey || DEFAULT_DEEPSEEK_KEY || DEFAULT_CODECRAFT_KEY || DEFAULT_APMIX_KEY;
  const requestedModel = model || DEFAULT_MODELS.deepseek;
  const cappedTokens = Math.min(Number(maxTokens) || 8192, 8192);

  // Determine ordered endpoint candidates so keys from DeepSeek, CodeCraft, or APMIX all work seamlessly
  const endpoints = String(effectiveKey).startsWith("apx_")
    ? [APMIX_BASE_URL, CODECRAFT_BASE_URL, DEEPSEEK_BASE_URL]
    : [DEEPSEEK_BASE_URL, CODECRAFT_BASE_URL, APMIX_BASE_URL];

  const modelCandidates = [
    requestedModel,
    ...(requestedModel.toLowerCase() === "deepseek-v4.1-flash-1017"
      ? ["DeepSeek-V4.1-Flash-1017", "deepseek-v4.1-flash-1017", "deepseek-chat"]
      : ["DeepSeek-V4.1-Flash-1017", "deepseek-chat"]),
  ].filter((v, i, a) => v && a.indexOf(v) === i);

  let lastErr = null;
  for (const baseURL of endpoints) {
    for (const candidateModel of modelCandidates) {
      try {
        return await openaiCompat({
          baseURL,
          apiKey: effectiveKey,
          model: candidateModel,
          messages,
          systemPrompt,
          maxTokens: cappedTokens,
          temperature,
        });
      } catch (err) {
        lastErr = err;
        const msg = String(err?.message || "");
        // If auth failed on this host (401/403), break inner loop and try next compatible host
        if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized") || msg.includes("invalid") || msg.includes("Authentication")) {
          break;
        }
      }
    }
  }
  throw lastErr || new Error("DeepSeek generation failed");
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

  // Auto-detect DeepSeek models (including DeepSeek-V4.1-Flash-1017) vs CodeCraft models
  const lowerModel = String(model || "").toLowerCase();
  const isDeepSeekModel = model && (
    lowerModel === "deepseek-v4.1-flash-1017" ||
    lowerModel === "deepseek-chat" ||
    lowerModel === "deepseek-reasoner"
  );
  const isCodeCraftModel = model && !isDeepSeekModel && (
    model.startsWith("claude-") ||
    model.startsWith("grok-") ||
    model.startsWith("gpt-5.") ||
    model.startsWith("deepseek-v4-pro") ||
    model.startsWith("qwen3.")
  );

  if (provider === "deepseek" || (isDeepSeekModel && provider !== "codecraft" && provider !== "apmix")) {
    provider = "deepseek";
    apiKey = apiKey || DEFAULT_DEEPSEEK_KEY || DEFAULT_CODECRAFT_KEY || DEFAULT_APMIX_KEY;
    model = model || DEFAULT_MODELS.deepseek;
  } else if (provider === "codecraft" || isCodeCraftModel) {
    provider = "codecraft";
    apiKey = apiKey || DEFAULT_CODECRAFT_KEY || DEFAULT_DEEPSEEK_KEY;
    model = model || DEFAULT_MODELS.codecraft;
  } else if (provider === "zai" || (model && model.startsWith("glm-4"))) {
    provider = "zai";
    apiKey = apiKey || DEFAULT_ZAI_KEY;
    model = model || DEFAULT_MODELS.zai;
  } else if (provider === "apmix" || (model && (model.includes("space-bunny") || model.includes("claude-sonnet-4-6")))) {
    provider = "apmix";
    apiKey = apiKey || DEFAULT_APMIX_KEY || DEFAULT_DEEPSEEK_KEY;
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
  } else if (DEFAULT_DEEPSEEK_KEY) {
    provider = "deepseek";
    apiKey = DEFAULT_DEEPSEEK_KEY;
    model = model || "DeepSeek-V4.1-Flash-1017";
  } else {
    // Default to Gemini
    provider = provider || "gemini";
    apiKey = apiKey || DEFAULT_GEMINI_KEY;
    model = model || DEFAULT_MODELS.gemini;
  }

  // Migrate legacy model names to verified fast models
  const deprecated = {
    "gemini-3.7-flash": "gemini-3.6-flash",
    "gemini-2.5-flash-lite": "gemini-3.5-flash-lite",
    "gemini-2.0-flash": "gemini-3.5-flash-lite",
    "gemini-2.0-flash-lite": "gemini-3.5-flash-lite",
    "gemini-1.5-flash": "gemini-3.5-flash-lite",
    "gemini-1.5-flash-8b": "gemini-3.5-flash-lite",
    "deepseek-v4-flash-0731": "DeepSeek-V4.1-Flash-1017",
    "deepseek-v4-flash-free": "DeepSeek-V4.1-Flash-1017",
    "deepseek-v4.1-flash-1017": "DeepSeek-V4.1-Flash-1017",
    "llama-3.3-70b-versatile": "openai/gpt-oss-120b",
    "google/gemma-3-27b-it:free": "openrouter/free",
    "google/gemma-2-9b-it:free": "openrouter/free",
    "google/gemini-2.0-flash-lite-preview-02-05:free": "openrouter/free",
    "meta-llama/llama-3.3-70b-instruct:free": "openrouter/free",
  };
  model = deprecated[model] || model;

  if (!apiKey && provider !== "pollinations") throw new Error("NO_API_KEY");

  // Define fallback chains for each provider
  const fallbacks = {
    gemini: GEMINI_ROTATION_POOL,
    deepseek: ["DeepSeek-V4.1-Flash-1017", "deepseek-chat", "deepseek-reasoner"],
    zai: ["glm-4.7-flash"],
    groq: [
      "openai/gpt-oss-120b",
      "qwen/qwen3.8-27b",
      "allam-2-7b",
      "openai/gpt-oss-20b"
    ],
    apmix: [
      "DeepSeek-V4.1-Flash-1017",
      "claude-sonnet-4-6-free",
      "space-bunny-free"
    ],
    openrouter: [
      "openrouter/free",
      "qwen/qwen3.8-27b:free",
      "inclusionai/ling-3.0-flash-sante:free"
    ],
    codecraft: [
      "DeepSeek-V4.1-Flash-1017",
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
        case "deepseek":    return await deepseekGenerate(args);
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
 * Multimodal vision generation — supports DeepSeek-V4.1-Flash-1017 (OpenAI-compatible image_url),
 * CodeCraft, APMIX, OpenRouter, Google Gemini Vision, Z.ai glm-4.6v-flash, and Pollinations Vision.
 * @param {string} prompt
 * @param {Array<{ inlineData: { data: string, mimeType: string } }>} mediaParts
 * @param {object} config
 * @param {string} [systemPrompt]
 */
export async function generateMultimodal(prompt, mediaParts, config = {}, systemPrompt = null) {
  let effectiveConfig = { ...(config || {}) };

  // In browser, if config was passed without api_key/provider, resolve active user/admin AI config
  if (typeof window !== "undefined" && !effectiveConfig.api_key) {
    try {
      const { getAiConfig } = await import("@/api/index");
      const loaded = await getAiConfig();
      if (loaded?.api_key) {
        effectiveConfig = {
          ...loaded,
          ...effectiveConfig,
          api_key: effectiveConfig.api_key || loaded.api_key,
          provider: effectiveConfig.provider || loaded.provider,
          model: effectiveConfig.model || loaded.model,
        };
      }
    } catch {}
  }

  const visionMessages = [
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

  const maxTokens = Math.max(1024, Math.min(8192, Number(effectiveConfig?.max_tokens) || 4096));
  const temperature = effectiveConfig?.temperature ?? 0.15;
  let lastError = null;

  // ── 1. Primary Vision Engine: DeepSeek-V4.1-Flash-1017 (DeepSeek / CodeCraft / APMIX / OpenRouter) ──
  const activeProvider = String(effectiveConfig?.provider || "").toLowerCase();
  const activeModel = String(effectiveConfig?.model || "");
  const isDeepSeekOrOpenAIVision =
    activeProvider === "deepseek" ||
    activeProvider === "codecraft" ||
    activeProvider === "apmix" ||
    activeProvider === "openrouter" ||
    activeModel.toLowerCase().includes("deepseek-v4") ||
    Boolean(DEFAULT_DEEPSEEK_KEY || DEFAULT_CODECRAFT_KEY || DEFAULT_APMIX_KEY);

  const cleanKey = (k) => String(k || "").replace(/^["']|["']$/g, "").trim();
  const candidateOpenAIKey = cleanKey(
    (activeProvider !== "gemini" ? effectiveConfig?.api_key : "") ||
    DEFAULT_DEEPSEEK_KEY ||
    DEFAULT_CODECRAFT_KEY ||
    DEFAULT_APMIX_KEY ||
    DEFAULT_OPENROUTER_KEY
  );

  if (isDeepSeekOrOpenAIVision && candidateOpenAIKey && candidateOpenAIKey !== "none") {
    const orderedEndpoints =
      activeProvider === "codecraft"
        ? [CODECRAFT_BASE_URL, DEEPSEEK_BASE_URL, APMIX_BASE_URL]
        : activeProvider === "apmix" || candidateOpenAIKey.startsWith("apx_")
        ? [APMIX_BASE_URL, CODECRAFT_BASE_URL, DEEPSEEK_BASE_URL]
        : activeProvider === "openrouter" || candidateOpenAIKey.startsWith("sk-or-")
        ? ["https://openrouter.ai/api/v1"]
        : [DEEPSEEK_BASE_URL, CODECRAFT_BASE_URL, APMIX_BASE_URL];

    const visionModelsToTry = [
      "DeepSeek-V4.1-Flash-1017",
      "deepseek-v4.1-flash-1017",
      ...(activeModel && !activeModel.includes("gemini") ? [activeModel] : []),
    ].filter((v, i, a) => v && a.indexOf(v) === i);

    for (const baseURL of orderedEndpoints) {
      for (const visionModel of visionModelsToTry) {
        try {
          console.info(`[generateMultimodal] Analyzing image with ${visionModel} via ${baseURL}...`);
          const text = await openaiCompat({
            baseURL,
            apiKey: candidateOpenAIKey,
            model: visionModel,
            messages: visionMessages,
            systemPrompt,
            maxTokens,
            temperature,
          });
          if (text && text.trim().length > 0) return text;
        } catch (err) {
          lastError = err;
          const msg = String(err?.message || "");
          console.warn(`[generateMultimodal] ${visionModel} on ${baseURL} failed:`, msg);
          if (msg.includes("401") || msg.includes("403") || msg.includes("Unauthorized")) {
            break; // Try next endpoint
          }
        }
      }
    }
  }

  // ── 2. Google Gemini Vision (if a valid Gemini key is available) ──
  const isCandidateGeminiKey = (k) => {
    if (!k || typeof k !== "string") return false;
    const clean = k.replace(/^["']|["']$/g, "").trim();
    if (clean.length < 15) return false;
    if (
      clean.startsWith("sk-") ||
      clean.startsWith("gsk_") ||
      clean.startsWith("sk-or-") ||
      clean.startsWith("apx_") ||
      clean === "none" ||
      clean === "BF_SERVER_MANAGED_GEMINI_KEY"
    ) return false;
    return true;
  };

  const cleanConfigKey = isCandidateGeminiKey(effectiveConfig?.api_key)
    ? effectiveConfig.api_key.replace(/^["']|["']$/g, "").trim()
    : "";
  const validPoolKeys = (GEMINI_KEYS_POOL || []).filter(isCandidateGeminiKey);

  const keysToTry = cleanConfigKey
    ? [cleanConfigKey, ...validPoolKeys.filter(k => k !== cleanConfigKey)]
    : [...validPoolKeys];

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

  if (keysToTry.length > 0) {
    const genOptions = {
      ...(systemPrompt ? { systemInstruction: systemPrompt } : {}),
      generationConfig: {
        maxOutputTokens: maxTokens,
        temperature,
      },
    };

    const geminiModelsToTry = [
      "gemini-3.5-flash-lite",
      "gemini-flash-lite-latest",
      "gemini-3.8-flash",
    ];

    const activeKeys = keysToTry.filter(k => !isKeyCoolingDown(k));
    const effectiveKeys = activeKeys.length ? activeKeys : keysToTry;

    for (const modelName of geminiModelsToTry) {
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
          console.warn(`[generateMultimodal] Gemini key with model ${modelName} failed:`, msg);
          if (msg.includes("429") || msg.includes("quota") || msg.includes("RESOURCE_EXHAUSTED")) {
            markKeyCooldown(currentKey, 60000);
          }
          if (msg.includes("404") || msg.includes("not found") || msg.includes("no longer available")) {
            break;
          }
        }
      }
    }
  }

  // ── 3. Browser without any local vision key → try authenticated server proxy ──
  if (typeof window !== "undefined" && !candidateOpenAIKey && keysToTry.length === 0) {
    try {
      const { invokeSecureFunction } = await import("./secureFunctions");
      const res = await invokeSecureFunction("ai", {
        name: "generateText",
        payload: { prompt, systemPrompt, mediaParts },
      });
      if (res?.data?.text) return res.data.text;
    } catch (proxyErr) {
      lastError = proxyErr;
    }
  }

  // ── 4. Fallback to Z.ai glm-4.6v-flash (Vision) ──
  if (DEFAULT_ZAI_KEY && DEFAULT_ZAI_KEY !== "BF_SERVER_MANAGED_ZAI_KEY") {
    try {
      console.info("[generateMultimodal] Falling back to Z.ai glm-4.6v-flash...");
      return await zaiGenerate({
        apiKey: DEFAULT_ZAI_KEY,
        model: ZAI_VISION_MODEL,
        messages: visionMessages,
        systemPrompt,
        maxTokens,
        temperature,
        isVision: true,
      });
    } catch (zaiErr) {
      console.warn("[generateMultimodal] Z.ai vision fallback failed:", zaiErr.message);
    }
  }

  // ── 5. Ultimate Zero-Key Vision Fallback: Pollinations OpenAI Multimodal ──
  try {
    console.info("[generateMultimodal] Falling back to Pollinations OpenAI Vision...");
    return await pollinationsGenerate({
      model: "openai",
      messages: visionMessages,
      systemPrompt,
      maxTokens: Math.min(maxTokens, 4096),
      temperature,
    });
  } catch (pollErr) {
    console.warn("[generateMultimodal] Pollinations vision fallback failed:", pollErr.message);
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

    if (provider === "deepseek") {
      const r1 = await fetch("https://api.deepseek.com/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      }).catch(() => ({ ok: false }));
      if (r1.ok) return true;
      // Also allow CodeCraft / APMIX keys that serve DeepSeek-V4.1-Flash-1017
      const r2 = await fetch("https://codecraftapi.com/v1/chat/completions", {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
        body: JSON.stringify({ model: "DeepSeek-V4.1-Flash-1017", messages: [{ role: "user", content: "ping" }], max_tokens: 5 }),
      }).catch(() => ({ ok: false }));
      if (r2.ok) return true;
      const r3 = await fetch("https://api.apmix.ai/v1/models", {
        headers: { "Authorization": `Bearer ${apiKey}` }
      }).catch(() => ({ ok: false }));
      if (r3.ok) return true;
      throw new Error("مفتاح DeepSeek غير صالح");
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
    const targetSections = Math.max(6, Math.min(45, Math.round(Number(maxPages || 16) * 0.85)));
    const sizeHint = `الحد الأقصى المستهدف لهذا الجزء نحو ${chunkPageBudget} صفحة من أصل ${maxPages} صفحة للملخص كله. غطِّ جميع تفاصيل الجزء بالكامل بدون اختصار يخل بالمعنى، ولا تكرر عنوان الملف أو مقدمة عامة في كل جزء.`;
    const structureHint = (style === "bilingual_lecture" || style === "ultra_multi_agent" || style === "foundational_bilingual")
      ? `استهدف نحو ${targetSections} أقسام منطقية مفصلة في النسخة النهائية حسب كثافة المصدر وطوله. ممنوع نهائياً كتابة باراجرافات مصمتة؛ يجب عرض كل الشرح في نقاط منظمة متدرجة (\`- \`) وجداول مقارنة. بعد كل قسم ضع مرجع [صفحة N] إن كان موجوداً في المصدر، ولا تخترع رقم صفحة.`
      : "ممنوع كتابة باراجرافات سردية طويلة؛ نظم كل المعلومات في نقاط تفصيلية مرتبة (\`- \`) وجداول مقارنة، وحافظ على مراجع [صفحة N] داخل القسم الذي استُخرجت منه إن كانت موجودة في المصدر.";

    const styleInstructions = {
      ultra_multi_agent: `
أنت تمثّل نظام الـ 5 وكلاء الفائق (Ultra 5-Agent Academic Orchestrator) لصناعة مذكرات جامعية وسريرية شاملة تغني عن المصدر:
- [Agent Alpha - المستخرج الشامل]: استخرج كل حقيقة، تعريف، آلية، خطوة، رقم، نسبة، جرعة، معادلة، وتصنيف وارد في النص بدون ترك أي فقرة.
- [Agent Beta - منقب الرؤى]: استخلص القواعد الذهبية ونقاط الامتحان والتحذيرات السريرية.
- [Agent Gamma - الصائغ الأكاديمي]:
  1. ابدأ بـ ## Quick Overview على هيئة نقاط مركزة (\`- \`).
  2. لكل قسم: عنوان رئيسي بـ ##
  3. نقاط المذاكرة الإنجليزية (English Study Notes) أولاً كـ bullet points مفصلة تبدأ من اليسار بـ \`- \`.
  4. يعقبها مباشرة عنوان **الشرح بالعربي:**.
  5. ⚠️ **قاعدة حاسمة وممنوع مخالفتها إطلاقاً**: الشرح بالعربي يُمنع منعاً باتاً كتابته كفقرة سردية أو باراجراف مصمت! بل يجب صياغته حصراً كـ **نقاط منظمة متدرجة** تبدأ بـ \`- \` تشرح كل فكرة ومصطلح وآلية وتفصيلة خطوة بخطوة.
  6. استخدم صناديق الاقتباس الذكية:
     - > ⚠️ تحذير إكلينيكي: للأخطاء الشائعة وموانع الاستخدام والمخاطر.
     - > 🛡️ قاعدة ذهبية: للقواعد الأساسية وبروتوكولات العلاج والخطوات.
     - > 💡 حيلة للحفظ / نقطة امتحان: للمفاتيح الامتحانية وأسئلة MCQ.
  7. المعادلات والأرقام توضع في كود مستقل: \`BP = CO x SVR\`
- [Agent Omega - المنسق النهائي]:
  - أضف قبل النهاية ## Quick Cheat Sheet (شيت تلخيص سريع لأهم الأرقام والمقارنات).
  - اختم بـ ## Summary Conclusion على هيئة نقاط مركزة.`,
      bilingual_lecture: `
أنت خبير تلخيص محاضرات جامعية ثنائية اللغة على أعلى مستوى أكاديمي، هدفك تقديم ملخص شامل ووافٍ يغطي 100% من معلومات المحاضرة بدون أي إخلال:
- ابدأ بـ ## Quick Overview في نقاط سريعة (\`- \`).
- أنشئ أقساماً منطقية تغطي كل عنوان وفقرة في المصدر (كلما كبرت المحاضرة زاد عدد الأقسام والنقاط التفصيلية). داخل كل قسم:
  1. عنوان القسم بـ ## ثم النقاط العلمية بالإنجليزية (English Study Points) كـ bullet points مفصلة وشاملة تبدأ بـ \`- \`.
  2. يعقبها مباشرة عنوان **الشرح بالعربي:**.
  3. ⚠️ **قاعدة حاسمة وممنوع مخالفتها**: الشرح بالعربي يُمنع منعاً باتاً كتابته كفقرة سردية أو باراجراف مصمت! بل يجب دائماً كتابته على هيئة **نقاط منظمة متدرجة** (تبدأ بـ \`- \`) تشرح كل فكرة ومصطلح وآلية وأرقام بالتفصيل المريح للعين.
- استخدم الصناديق عند وجود تحذير سريري (> ⚠️ تحذير: ...) أو قاعدة (> 🛡️ قاعدة: ...).
- اختم بـ ## Summary Conclusion في نقاط مركزة تربط الأفكار.
- لا تخلط العربي والإنجليزي عشوائياً في السطر نفسه ولا تحذف أي معلومة مذاكرة مهمة.`,
      lecture_exact: `
أنت تلخّص محاضرة دراسية شاملة وظيفتك ناقل أمين + شارح تفصيلي في نقاط منظمة.
القواعد:
- احتفظ بكل الكلمات والمصطلحات التقنية (English) كما هي.
- ادمج المصطلح الإنجليزي مع الترجمة العربية في نفس السطر. مثال: المصطلح العربي (==cyan: English Term ==): الشرح التفصيلي.
- نظّم الملخص تحت عناوين ## H2 تمثّل المحاور الكبرى، وعناوين ### H3 للموضوعات الفرعية.
- **قاعدة صارمة**: ممنوع كتابة باراجرافات مصمتة؛ استخدم bullet points (\`- \`) لكل معلومة وتفصيلة، واستخدم **Bold** للمصطلحات، واحتفظ بـ ==yellow:highlight== للتعريفات المحورية فقط.
- لو فيه معادلات أو أرقام: استخدم code blocks \`كود\`.
- لا تحذف أي معلومة أو تفصيلة أو مثال، ولا تختصر الشرح على حساب الفهم.`,

      complete: `
أنت تعيد صياغة المحتوى في مذكرة دراسية شاملة 100% ومنظّمة بالكامل في نقاط وجداول:
القواعد:
- نظّم تحت عناوين واضحة H2 وH3.
- لا تحذف أي معلومة أو تفصيلة أو رقم من المحتوى الأصلي.
- ممنوع كتابة فقرات سردية طويلة (باراجرافات)؛ استخدم bullet points (\`- \`) منظّمة ومفصلة لكل نقطة.
- استخدم ==yellow:مصطلح== للمصطلحات الأساسية.
- اذكر كل مثال وكل تعريف وكل آلية وكل قاعدة بالتفصيل.
- المعادلات في code blocks.`,

      equations_only: `
مهمتك: استخراج المعادلات والقوانين والأرقام المهمة فقط.
الأسلوب:
- لكل معادلة: ضعها في \`code block\` مع شرح متغيراتها في نقاط تحتها.
- رتّبها تحت عناوين ## حسب الموضوع.
- إذا لم يوجد في المقطع أي معادلات، اكتب: "لا توجد معادلات في هذا الجزء".`,

      key_points: `
أهم نقاط المحتوى في شكل bullet points شاملة ومنظمة:
- كل نقطة تشرح الفكرة أو القاعدة أو الرقم بوضوح تام في سطر أو سطرين.
- نظّمها تحت عناوين ## للمحاور الكبرى.
- استخدم ==yellow:مصطلح== للكلمات الأساسية فقط.
- ركّز على: التعريفات + الآليات + القواعد + الأرقام + الاستثناءات + الأمثلة الرئيسية.`,

      bilingual_blocks: `
اعمل كتاباً مرجعياً ثنائي اللغة منظم في نقاط:
- كل بلوك = مصطلح أو مفهوم إنجليزي → تحته شرح عربي تفصيلي على هيئة نقاط (\`- \`).
- الشكل:
  ### مصطلح (English Term)
  - [النقطة الأولى من الشرح العربي التفصيلي]
  - [النقطة الثانية والأمثلة أو الآلية]
- لا تختصر الشرح العربي — الطالب يفهم من الشرح وحده.
- نظّم تحت عناوين ## حسب الموضوعات.`,

      simple_overview: `
اشرح المحتوى كأنك بتشرح لطالب في أول مرة يسمع الموضوع:
- لغة عربية سلسة وواضحة، مع شرح كل مصطلح تقني.
- ابدأ بـ "الفكرة الكبيرة" في نقاط سريعة.
- نظّم الشرح بالكامل في نقاط مرتبة (\`- \`) تحت عناوين واضحة H2 بدون باراجرافات طويلة.`,

      organized_original: `
أعد تنظيم المحتوى الأصلي بالكامل تحت عناوين منطقية واضحة:
- لا تحذف أي معلومة ولا تضف معلومة من خارج النص.
- حوّل الفقرات الطويلة إلى bullet points (\`- \`) منظمة تحت ## عناوين و### عناوين فرعية.
- المعادلات في code blocks.`,

      compact: `
ملخص مكثف وعالي التركيز للمذاكرة السريعة:
- كل موضوع في نقاط مركزة تشمل التعريف والأرقام والقاعدة الامتحانية.
- نظّم تحت عناوين واضحة.`,
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

  summaryFacts: (text, language, templateId, chunkIndex, totalChunks) => `استخرج المعرفة الأكاديمية من جزء المصدر التالي كحقائق علمية شاملة ومفصلة وعالية العائد الامتحاني (Comprehensive Grounded Study Facts).
هذه مرحلة استخراج تفصيلي شامل (Deep Atomic Fact Extraction) لبناء مذكرة دراسية كاملة تغني الطالب عن المصدر.
القالب المستهدف: ${templateId}. اللغة المطلوبة: ${language}. الجزء: ${chunkIndex + 1}/${totalChunks}.

قواعد الاستخراج الشامل الصارمة:
- غطِّ كل فقرة وكل محور في هذا الجزء بدون ترك أي تعريف أو آلية عمل (Mechanism) أو خطوة أو سبب أو عرض سريري أو تشخيص أو علاج أو رقم/جرعة أو قانون أو مقارنة أو استثناء.
- كل عنصر يمثل نقطة علمية متكاملة قابلة للمذاكرة والاختبار وموجودة في المصدر.
- source_evidence اقتباس قصير مطابق حرفياً للمصدر يثبت الحقيقة.
- source_page رقم الصفحة من علامة [صفحة N] أو [Page N] فقط، وإلا null.
- formula تُنسخ حرفياً بدون أي تحريف (مع وحدات القياس إن وجدت)، وإلا تكون سلسلة فارغة.
- importance من 1 إلى 5 (5 = نقطة امتحانية حاسمة أو تعريف أساسي أو جرعة/رقم خطير).
- semantic_type واحد من: term|definition|fact|result|example|warning|formula|statistic.
- key_term المصطلح العلمي المحوري الموجود داخل statement_en أو statement_ar.
- statement_en: صياغة أكاديمية إنجليزية واضحة ومفصلة للنقطة العلمية (وليس مجرد كلمتين).
- statement_ar: صياغة عربية دقيقة وواضحة للنقطة العلمية مع المصطلح.
- explanation_ar: شرح عربي تفصيلي وافٍ يفسر الآلية ("كيف ولماذا؟") والتفاصيل والأرقام المرتبطة بالنقطة بحيث يفهمها الطالب بالكامل.
- explanation_en: شرح إنجليزي تفصيلي وافٍ للنقطة والآلية.
- لا تضع رموز Markdown أو علامات ألوان داخل الحقول؛ محرك العرض سيتولى التنسيق البصري كقوائم نقطية وجداول.
- استخرج ما بين 18 إلى 40 حقيقة مفصلة من هذا الجزء (حسب كثافة النص) مرتبة حسب تسلسل المصدر لتغطية كل تفاصيل المحاضرة بالكامل.

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
          return `You are an elite academic professor and meticulous exam solver. Extract all exam questions from the following text into high-quality structured JSON.
CRITICAL RULES:
1. STRICT LANGUAGE MANDATE: All questions, options, and explanations MUST BE 100% IN ENGLISH. Do NOT translate to Arabic.
2. These questions lack an answer key in the text. Solve each question with 100% scientific/clinical accuracy.
3. Extract ALL questions without exception.
4. Preserve the exact number of options per question (2, 3, 4, 5, or 6 options) without prefixes like "A)" or "B)". Never split long options into multiple fragments.
5. If a question depends on a scenario or clinical case, prepend the scenario to the question stem.
6. MANDATORY ANSWER-EXPLANATION LOCK (Prevents index mismatch):
   - Write "explanation" FIRST, starting with: "Correct answer: <exact verbatim option text> — <scientific rationale explaining why it is right and why other options are wrong>".
   - Copy that EXACT verbatim option text into "correct_answer".
   - Set "correct_index" to its 0-based position in "options" (0=1st option, 1=2nd option, 2=3rd option, 3=4th option). Double-check that options[correct_index] === correct_answer!

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"Correct answer: <exact winning option text> — ...","correct_answer":"<exact winning option text>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"","knowledge_based":true,"answer_confidence":0.95,"needs_review":false}]}

Text:
${text}`;
        }
        return `أنت خبير أكاديمي محترف ومستخرج وحلّال امتحانات دقيق. المهمة: استخرج جميع الأسئلة الموجودة في النص التالي وحلّها بدقة علمية 100%.
مهم جداً:
1. هذه الأسئلة ليس لها مفتاح إجابة مكتوب في النص. استخدم معرفتك الأكاديمية والطبية لتحديد الإجابة الصحيحة لكل سؤال بدقة قاطعة وشرحها بالتفصيل.
2. استخرج جميع الأسئلة بلا استثناء (مهما كان عددها: 15، 29، 30، إلخ).
3. حافظ على عدد الاختيارات لكل سؤال كما جاء في النص (سواء 2 أو 3 أو 4 أو 5 أو 6 اختيارات) وبدون رموز الترقيم البادئة (مثل أ) أو A)). لا تحذف الخيار الخامس (E/هـ).
4. ممنوع منعاً باتاً تقسيم الاختيار الطويل إلى خيارين مفصولين. كل خيار يجب أن يمثل إجابة واحدة كاملة كما كتبت في النص الأصل.
5. إذا كان السؤال تكميلياً أو يعتمد على حالة/سيناريو سابق: أضف نص الحالة/السيناريو في بداية السؤال ليصبح قائماً بذاته ومفهوماً 100%.
6. **قاعدة القفل الصارم بين الشرح والإجابة (لمنع أي تعارض بين الشرح والاختيار)**:
   - اكتب الشرح ("explanation") أولاً، وابدأه دائماً بعبارة: "الإجابة الصحيحة: <انسخ نص الخيار الصحيح حرفياً> — لأن..." مع توضيح سبب صحة هذا الخيار وسبب استبعاد الباقي.
   - انسخ نفس نص الخيار الصحيح حرفياً في حقل "correct_answer".
   - حدد رقمه الصفري في "correct_index" (حيث 0 هو الخيار الأول، 1 هو الثاني، 2 هو الثالث، 3 هو الرابع). وتأكد أن options[correct_index] يطابق تماماً "correct_answer"!

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"الإجابة الصحيحة: <نص الخيار الصحيح حرفياً> — ...","correct_answer":"<نص الخيار الصحيح حرفياً>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"صفحة/عنوان إن وجد","source_evidence":"","knowledge_based":true,"answer_confidence":0.95,"needs_review":false}]}
النص:
${text}`;
      }
      // أسئلة معها إجابات — استخرجها مباشرة
      if (language === "en") {
        return `You are an elite academic professor and meticulous exam parser. Extract all exam questions from the following text into structured JSON:
CRITICAL RULES:
1. STRICT LANGUAGE MANDATE: All questions, options, and explanations MUST BE 100% IN ENGLISH. Do NOT translate to Arabic.
2. Extract all questions present in the text without exception.
3. Use the answer key or markings indicated in the text. If any question is missing a marking, solve it accurately.
4. Preserve the exact number of options per question (2, 3, 4, 5, or 6 options) without prefixes like "A)" or "B)".
5. If a question depends on a clinical case or previous context, prepend the scenario to the question stem.
6. MANDATORY ANSWER-EXPLANATION LOCK:
   - Write "explanation" FIRST, starting with: "Correct answer: <exact verbatim option text> — <rationale>".
   - Copy the EXACT verbatim text of the winning option into "correct_answer".
   - Set "correct_index" to its 0-based index (0=1st, 1=2nd, 2=3rd, 3=4th). Verify options[correct_index] === correct_answer!

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"Correct answer: <exact winning option text> — ...","correct_answer":"<exact winning option text>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"short quote confirming answer","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

Text:
${text}`;
      }
      return `أنت مستخرج امتحانات دقيق وفاخر. استخرج جميع الأسئلة الموجودة في النص التالي وحولها لـ JSON:
قواعد صارمة للاستخراج:
1. استخرج جميع الأسئلة الموجودة في النص بلا استثناء (حتّى لو كان النص يحتوي 15 أو 29 أو 30 أو أكتر).
2. استخدم مفتاح الإجابة أو العلامات الموضحة بالمرجع (مثل الإجابة الصحيحة أو Bold/Checkmarks)، وإذا كان هناك سؤال غير محلول في النص فقم بحله علمياً بدقة 100%.
3. حافظ على عدد الخيارات لكل سؤال بالظبط كما في النص (سواء 2، 3، 4، 5، أو 6 خيارات) بدون رموز الترقيم البادئة. لا تحذف الخيار الخامس (E/هـ).
4. ممنوع منعاً باتاً تقسيم الإجابة الطويلة إلى خيارين مفصولين؛ الخيار الواضح يظل خياراً واحداً كاملاً.
5. إذا كان السؤال تكميلياً أو يعتمد على حالة/قصة أو سؤال سابق: ادمج نص الحالة في بداية رأس السؤال ليكون مفهوماً وقائماً بذاته.
6. **قاعدة القفل الصارم بين الشرح والإجابة**:
   - اكتب الشرح ("explanation") أولاً، وابدأه دائماً بعبارة: "الإجابة الصحيحة: <انسخ نص الخيار الصحيح حرفياً> — ..."
   - انسخ نص الإجابة الصحيحة حرفياً في "correct_answer".
   - ضع رقمها الصفري في "correct_index" (0 للأول، 1 للثاني، 2 للثالث، 3 للرابع). وتأكد أن options[correct_index] يطابق "correct_answer"!

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"الإجابة الصحيحة: <نص الخيار الصحيح حرفياً> — ...","correct_answer":"<نص الخيار الصحيح حرفياً>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"صفحة/عنوان إن وجد","source_evidence":"عبارة قصيرة تثبت الإجابة","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}
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
Explanations: ${withExplanation ? "Include a high-yield academic explanation for each question explaining why the correct choice is right and others are ruled out." : "Still include a brief explanation starting with 'Correct answer: <exact option text>'."}
QUALITY & INDEXING RULES:
- Exactly 4 options per question (without "A)" or "B)" prefixes), and exactly ONE unambiguous correct answer.
- Distractor Symmetry Rule: All 4 options must be similar in length, professional phrasing, and plausibility (within 2-3 words). Never make the correct answer significantly longer or more detailed than distractors.
- Plausible Distractors: Must reflect real diagnostic alternatives and common misconceptions.
- Distribute correct_index evenly across 0, 1, 2, and 3.
- MANDATORY ANSWER-EXPLANATION LOCK:
  1. Write "explanation" FIRST, and ALWAYS start it with: "Correct answer: <exact verbatim text of winning option> — <rationale>".
  2. Copy the EXACT verbatim string of the winning option into "correct_answer".
  3. Set "correct_index" to its 0-based index (0=1st option, 1=2nd option, 2=3rd option, 3=4th option). Verify that options[correct_index] === correct_answer!

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"Correct answer: <exact winning option text> — ...","correct_answer":"<exact winning option text>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

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
الشرح: ${withExplanation ? "أضف شرحاً مفيداً لكل سؤال" : "أضف شرحاً مختصراً يبدأ بذكر الخيار الصحيح"}
قواعد الجودة:
- 4 خيارات لكل سؤال (بدون حروف ترقيم بادئة مثل أ) أو ب))، وإجابة واحدة صحيحة فقط.
- **قاعدة تماثل وتكافؤ الخيارات (Distractor Symmetry Rule - صارمة جداً)**: يجب أن تكون جميع الخيارات الـ 4 متقاربة جداً في الطول وعدد الكلمات والأسلوب اللغوي (فارق أقصاه 2 إلى 3 كلمات فقط). ممنوع منعاً باتاً كتابة إجابة صحيحة طويلة ومفصلة بينما الخيارات الخاطئة قصيرة وواضحة الخطأ، حتى لا تنكشف الإجابة بالنظر.
- المشتتات الخاطئة (Distractors) يجب أن تكون مقنعة ومنطقية علمياً ومكتوبة بنفس درجة العمق والاحترافية.
- وزع الأسئلة: فهم مباشر + تطبيق + مقارنة/تمييز + أخطاء شائعة.
- لا تستخدم "كل ما سبق" أو "لا شيء مما سبق" إلا لو ضروري جداً.
- لا تكرر نفس الفكرة بألفاظ مختلفة.
- أضف source_ref من رقم الصفحة أو عنوان الفصل إذا كان واضحاً.
- أضف source_evidence كعبارة قصيرة موجودة فعلاً في المصدر وتثبت الإجابة؛ لا تخترع اقتباساً.
- ضع knowledge_based=false وanswer_confidence بين 0 و1 وneeds_review=true فقط عند نقص الدليل أو الشك.
- وزع correct_index على 0 و1 و2 و3؛ لا تجعل معظم الإجابات في نفس الموضع.
- **قاعدة القفل الصارم بين الشرح والإجابة (لمنع اختيار إجابة مخالفة للشرح)**:
  1. اكتب الشرح ("explanation") أولاً، وابدأه دائماً بعبارة: "الإجابة الصحيحة: <انسخ نص الخيار الصحيح حرفياً> — ..." ثم اشرح السبب العلمي.
  2. انسخ نص الإجابة الصحيحة حرفياً في حقل "correct_answer".
  3. ضع رقمها الصفري في "correct_index" (حيث 0=الخيار الأول، 1=الثاني، 2=الثالث، 3=الرابع). وتأكد أن options[correct_index] يطابق "correct_answer"!
رد بـ JSON فقط بدون أي نص:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"الإجابة الصحيحة: <نص الخيار الصحيح حرفياً> — ...","correct_answer":"<نص الخيار الصحيح حرفياً>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}
المحتوى:\n${text}`;
  },

  quizTopUp: (text, missingCount, existingQuestions, difficulty, withExplanation, language, quizProfile) => {
    if (language === "en") {
      return `Complete the exam after the quality auditor rejected some questions from the first pass.
Synthesize exactly ${missingCount} brand new, unique questions distinct from the list below.
CRITICAL LANGUAGE MANDATE: 100% English. Do NOT output any Arabic words.
Difficulty: ${difficulty}. Profile: ${quizProfile}.
Each question must have 4 options, 1 correct answer, and distractor symmetry.
Do NOT use 'all of the above' or 'none of the above'. Distribute correct_index evenly across 0, 1, 2, 3.
Write "explanation" FIRST starting with "Correct answer: <exact winning option text> — ...", then copy the exact winning option into "correct_answer", and set 0-based "correct_index" (0..3).

Existing questions that must NOT be repeated:
${existingQuestions.map((q, idx) => `${idx + 1}. ${q}`).join("\n") || "None"}

Return STRICT JSON only:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"Correct answer: <exact winning option text> — ...","correct_answer":"<exact winning option text>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

Source:
${text}`;
    }

    return `
أكمل الكويز بعد أن رفض فاحص الجودة بعض أسئلة المحاولة الأولى.
ولّد بالضبط ${missingCount} سؤالاً جديداً مختلفاً عن قائمة الأسئلة الموجودة أدناه.
اللغة: عربي مع إبقاء المصطلحات التقنية الإنجليزية بين قوسين.
المستوى: ${difficulty}. النمط: ${quizProfile}.
كل سؤال يجب أن يحتوي 4 خيارات مختلفة وإجابة واحدة صحيحة ومعلومة source_evidence قصيرة موجودة في المصدر.
قاعدة تماثل الخيارات: يجب أن تكون جميع الخيارات الـ 4 متقاربة في الطول والأسلوب اللغوي (فارق لا يتجاوز 3 كلمات)، وتجنب جعل الإجابة الصحيحة أطول من المشتتات الخاطئة.
لا تستخدم كل ما سبق أو لا شيء مما سبق. وزّع correct_index بين 0 و1 و2 و3.
اكتب الشرح ("explanation") أولاً بادئاً بـ "الإجابة الصحيحة: <نص الخيار الصحيح حرفياً> — ..."، ثم انسخ نص الخيار الصحيح حرفياً في "correct_answer"، ثم حدد "correct_index" الصفري (0..3).

الأسئلة الموجودة التي يمنع تكرارها أو إعادة صياغتها:
${existingQuestions.map((question, index) => `${index + 1}. ${question}`).join("\n") || "لا يوجد"}

رد بـ JSON فقط:
{"questions":[{"question":"...","options":["...","...","...","..."],"explanation":"الإجابة الصحيحة: <نص الخيار الصحيح حرفياً> — ...","correct_answer":"<نص الخيار الصحيح حرفياً>","correct_index":0,"difficulty":"easy|medium|hard","topic":"...","source_ref":"...","source_evidence":"...","knowledge_based":false,"answer_confidence":0.95,"needs_review":false}]}

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
    `أنت خبير تصميم بطاقات استرجاع نشط وتكرار متباعد (Active Recall & FSRS Flashcards). أنشئ بطاقات مراجعة عالية الكفاءة من المحتوى التالي.
قواعد البطاقات:
- كل بطاقة تركز على مفهوم ذري واحد، تعريف حاسم، آلية، رقم/جرعة، أو تفريق امتحاني (Minimum Information Principle).
- الوجه الأمامي (front): سؤال محفز للذاكرة أو حالة مختصرة أو مصطلح محوري.
- الوجه الخلفي (back): الإجابة الدقيقة والمركزة مع الكلمة المفتاحية والتفسير السريع.
- اللغة المطلوبة: ${language === "ar" ? "عربي واضح مع إبقاء المصطلحات العلمية الإنجليزية بين قوسين" : "English"}.
رد بـ JSON فقط:
{"cards":[{"front":"...","back":"..."}]}
المحتوى:
${text}`,

  chat: (message, history, courseContext) => {
    const historyText = (history || [])
      .filter(m => m.content && !m.content.startsWith("أهلاً"))
      .slice(-8)
      .map(m => `${m.role === "user" ? "الطالب" : "المساعد"}: ${m.content}`)
      .join("\n");
    return `أنت Black Fighters، المرشد الأكاديمي الذكي للمنصة. مهمتك مساعدة الطالب على الفهم العميق، تبسيط الآليات المعقدة، حل الأسئلة خطوة بخطوة، وتنبيهه على فخاخ الامتحانات.
- قدّم إجابات دقيقة ومنظمة باستخدام Markdown (عناوين، نقاط، جداول مقارنة عند الحاجة، و**Bold** للمصطلحات المهمة).
- اعتمد على مقاطع الكورس المرجعية إن توفرت، ولا تخترع أرقاماً أو جرعات خارج المرجع.
- اسمك هو Black Fighters دائماً.
${courseContext ? `\nمقاطع الكورس المسترجعة محلياً (المرجع الأساسي):\n${courseContext}\n` : ""}
${historyText ? `سياق المحادثة السابقة:\n${historyText}\n` : ""}
سؤال الطالب: ${message}
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

        // Match by exact/normalized text first (strip optional "0: " prefix)
        const cleanAnsText = String(audit?.correct_answer || "")
          .replace(/^\s*\d+\s*[:.)\-]\s*/, "")
          .trim();

        let verifiedIdx = cleanAnsText.length >= 1
          ? matchTextAgainstOptions(cleanAnsText, opts)
          : -1;

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
    sourceAnalysis = null, stylePrompt = "", quizProfile = "balanced", bypassCache = false } = payload;

  if (task === "quiz_audit") {
    return await auditQuizQuestionsWithAI(payload.questions || [], config, text || "");
  }

  if (task === "summary_facts") {
    const artifactKey = buildArtifactKey({ task: "summary_facts", language, summaryStyle, summaryMaxPages, chunkIndex, totalChunks });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached && Array.isArray(cached.facts) && cached.facts.length > 0) {
        return { ...cached, _cacheHit: true };
      }
    }
    const parsed = await generateJson(
      PROMPTS.summaryFacts(text, language, summaryStyle, chunkIndex, totalChunks),
      taskConfig(config, { temperature: 0.05, max_tokens: 10_000 }),
      "summary facts JSON",
      SYSTEM_PROMPTS.summary,
    );
    const result = {
      facts: Array.isArray(parsed?.facts) ? parsed.facts : [],
      model_actual: config?.model || "",
      chunk_index: chunkIndex,
    };
    if (result.facts.length > 0 && text) {
      await setCachedArtifact(text, artifactKey, result, { meta: { task: "summary_facts", language } });
    }
    return result;
  }

  if (task === "quiz_source_analysis") {
    const artifactKey = buildArtifactKey({ task: "quiz_source_analysis", language: "auto" });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached && cached.source_type) {
        return { ...cached, _cacheHit: true };
      }
    }
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
      const analysisOut = {
        ...fallback,
        ...parsed,
        source_type: sourceType,
        recommendation,
        question_count: Math.max(0, Number(parsed?.question_count ?? fallback.question_count) || 0),
        recommended_count: Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(parsed?.recommended_count ?? fallback.recommended_count) || 10)),
        confidence: Math.max(0, Math.min(1, Number(parsed?.confidence ?? fallback.confidence) || fallback.confidence)),
      };
      if (text) await setCachedArtifact(text, artifactKey, analysisOut, { meta: { task: "quiz_source_analysis" } });
      return analysisOut;
    } catch {
      return fallback;
    }
  }

  if (task === "summary") {
    const artifactKey = buildArtifactKey({ task: "summary", language, summaryStyle, summaryMaxPages, chunkIndex, totalChunks });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached?.summary_markdown) {
        return { ...cached, _cacheHit: true };
      }
    }
    const prompt = PROMPTS.summary(text, summaryStyle, summaryMaxPages, language, chunkIndex, totalChunks, stylePrompt);
    const raw = await generateText(
      prompt,
      taskConfig(config, { temperature: 0.2, max_tokens: 12288 }),
      SYSTEM_PROMPTS.summary,
    );
    const out = { summary_markdown: raw };
    if (raw && text) {
      await setCachedArtifact(text, artifactKey, out, { meta: { task: "summary", language, summaryStyle } });
    }
    return out;
  }

  if (task === "text_exam_parser" || (task === "quiz" && (quizMode === "text_parser" || extractMode === "text_parser"))) {
    const artifactKey = buildArtifactKey({ task: "text_exam_parser", language });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached && Array.isArray(cached.questions) && cached.questions.length > 0) {
        return {
          ...cached,
          questions: cached.questions.map((q) => reconcileQuestionAnswer(q)),
          _cacheHit: true,
        };
      }
    }
    const prompt = PROMPTS.textExamParser(text);
    const parserConfig = taskConfig(config, { temperature: 0.05, max_tokens: 16384 });
    const parsed = await generateJson(prompt, parserConfig, "universal text exam JSON", SYSTEM_PROMPTS.textExamParser);
    if (Array.isArray(parsed?.questions)) {
      parsed.questions = parsed.questions.map((q) => reconcileQuestionAnswer(q));
    }
    if (parsed?.questions?.length > 0 && text) {
      await setCachedArtifact(text, artifactKey, parsed, { meta: { task: "text_exam_parser" } });
    }
    return parsed;
  }

  if (task === "quiz") {
    // Smart language determination if not explicitly specified as "en" or "ar"
    let effectiveLanguage = language;
    if (!effectiveLanguage || effectiveLanguage === "auto" || effectiveLanguage === "mixed" || effectiveLanguage === "bilingual") {
      effectiveLanguage = getRecommendedQuizLanguage(text);
    }

    const desiredCount = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(numQuestions) || 10));
    const mode = quizMode || extractMode || "generate";

    // ─── Hybrid Smart Batch Cache Engine for Quizzes ───
    // Pulls ~50% from the shared lecture question bank and generates ~50% fresh questions!
    const hybridRatio = mode === "extract" ? 0.9 : 0.5;
    const hybridPlan = (!bypassCache && text)
      ? await prepareHybridQuizPlan({
          text,
          language: effectiveLanguage,
          desiredCount,
          difficulty,
          hybridRatio,
        })
      : { cachedSlice: [], missingCount: desiredCount, existingStems: [], fullBank: [], isHybridHit: false };

    const aiTargetCount = Math.max(0, hybridPlan.missingCount);

    // If the cache already covers 100% (e.g. exact extraction mode with full bank)
    if (aiTargetCount === 0 && hybridPlan.cachedSlice.length >= desiredCount) {
      const cachedNormalized = normalizeQuizResult(
        { questions: hybridPlan.cachedSlice.slice(0, desiredCount) },
        {
          desiredCount,
          mode,
          sourceAnalysis,
          difficulty,
          requireExplanation: withExplanation,
          sourceText: text,
        }
      );
      cachedNormalized.stats = {
        ...(cachedNormalized.stats || {}),
        cache_hit_questions: cachedNormalized.questions.length,
        newly_generated_questions: 0,
        smart_cache_hit: true,
      };
      return cachedNormalized;
    }

    const hasAnswers = sourceAnalysis?.has_answers ?? null;
    const basePrompt = PROMPTS.quiz(
      text,
      aiTargetCount,
      difficulty,
      withExplanation,
      effectiveLanguage,
      mode,
      hasAnswers,
      quizProfile
    );
    // Instruct AI not to repeat questions already in the batch cache bank
    const exclusionNote = hybridPlan.existingStems.length > 0
      ? effectiveLanguage === "en"
        ? `\n\nIMPORTANT SMART CACHE RULE: Do NOT repeat or paraphrase any of these ${hybridPlan.existingStems.length} previously cached questions:\n${hybridPlan.existingStems.slice(0, 25).map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n`
        : `\n\nقاعدة الكاش الذكي: يمنع تكرار أو إعادة صياغة أي من الأسئلة التالية المحفوظة مسبقاً في بنك المحاضرة:\n${hybridPlan.existingStems.slice(0, 25).map((s, idx) => `${idx + 1}. ${s}`).join("\n")}\n`
      : "";
    const prompt = basePrompt + exclusionNote;

    const quizConfig = taskConfig(config, { temperature: 0.15, max_tokens: 12288 });
    let firstPass = { questions: [], stats: {} };

    try {
      const parsed = await generateJson(prompt, quizConfig, "quiz JSON", SYSTEM_PROMPTS.quiz);
      firstPass = normalizeQuizResult(parsed, {
        desiredCount: aiTargetCount,
        mode,
        sourceAnalysis,
        difficulty,
        requireExplanation: withExplanation,
        sourceText: text,
      });
    } catch (aiErr) {
      // Resilient fallback: if AI provider is rate-limited/down and we have cached questions in the bank, serve them!
      if (hybridPlan.fullBank.length >= 2) {
        console.warn("[quiz] AI call failed, serving from Smart Batch Cache Question Bank:", aiErr?.message);
        const fallbackResult = normalizeQuizResult(
          { questions: hybridPlan.fullBank.slice(0, desiredCount) },
          {
            desiredCount,
            mode,
            sourceAnalysis,
            difficulty,
            requireExplanation: withExplanation,
            sourceText: text,
          }
        );
        fallbackResult.stats = {
          ...(fallbackResult.stats || {}),
          cache_hit_questions: fallbackResult.questions.length,
          newly_generated_questions: 0,
          smart_cache_fallback: true,
        };
        return fallbackResult;
      }
      throw aiErr;
    }

    let newlyGeneratedResult = firstPass;
    if (mode !== "extract" && firstPass.questions.length < aiTargetCount) {
      const missingCount = aiTargetCount - firstPass.questions.length;
      const topUpPrompt = PROMPTS.quizTopUp(
        text,
        missingCount,
        [...hybridPlan.existingStems.slice(0, 15), ...firstPass.questions.map((question) => question.question)],
        difficulty,
        withExplanation,
        effectiveLanguage,
        quizProfile,
      );
      try {
        const topUp = await generateJson(topUpPrompt, quizConfig, "quiz top-up JSON", SYSTEM_PROMPTS.quiz);
        const completed = normalizeQuizResult({ questions: [...firstPass.questions, ...(topUp?.questions || [])] }, {
          desiredCount: aiTargetCount,
          mode,
          sourceAnalysis,
          difficulty,
          requireExplanation: withExplanation,
          sourceText: text,
        });
        completed.stats.first_pass_accepted = firstPass.questions.length;
        completed.stats.top_up_requested = missingCount;
        newlyGeneratedResult = completed;
      } catch (error) {
        console.warn("[quiz] Quality top-up failed; returning the valid first-pass questions", error);
        firstPass.stats.top_up_requested = missingCount;
        firstPass.stats.top_up_failed = true;
        newlyGeneratedResult = firstPass;
      }
    }

    // Multi-Agent Verification Pass on newly generated questions (cached questions are already audited!)
    if (payload.autoAudit !== false && newlyGeneratedResult.questions.length > 0) {
      try {
        const audited = await auditQuizQuestionsWithAI(newlyGeneratedResult.questions, config, text);
        if (Array.isArray(audited?.questions) && audited.questions.length === newlyGeneratedResult.questions.length) {
          newlyGeneratedResult.questions = audited.questions;
          newlyGeneratedResult.stats = {
            ...(newlyGeneratedResult.stats || {}),
            multi_agent_audited: true,
            multi_agent_corrections: audited.correctedCount || 0,
            needs_review: audited.questions.filter((q) => q.needs_review).length,
          };
        }
      } catch (auditErr) {
        console.warn("[quiz] Multi-agent auto-audit skipped:", auditErr?.message);
      }
    }

    // Commit new questions to the shared Question Bank and blend with cached slice
    const committed = text
      ? await commitHybridQuizQuestions({
          textOrHash: hybridPlan.contentHash || text,
          language: effectiveLanguage,
          cachedSlice: hybridPlan.cachedSlice,
          newQuestions: newlyGeneratedResult.questions,
          desiredCount,
          isAlreadyHashed: Boolean(hybridPlan.contentHash),
        })
      : {
          questions: newlyGeneratedResult.questions,
          bankSize: newlyGeneratedResult.questions.length,
          cachedUsedCount: 0,
          newlyGeneratedCount: newlyGeneratedResult.questions.length,
        };

    const finalHybrid = normalizeQuizResult(
      { questions: committed.questions },
      {
        desiredCount,
        mode,
        sourceAnalysis,
        difficulty,
        requireExplanation: withExplanation,
        sourceText: text,
      }
    );

    finalHybrid.stats = {
      ...(newlyGeneratedResult.stats || {}),
      ...(finalHybrid.stats || {}),
      cache_hit_questions: committed.cachedUsedCount,
      newly_generated_questions: committed.newlyGeneratedCount,
      total_bank_size: committed.bankSize,
      smart_cache_hit: committed.cachedUsedCount > 0,
    };

    return finalHybrid;
  }

  if (task === "flashcards") {
    const artifactKey = buildArtifactKey({ task: "flashcards", language });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached && Array.isArray(cached.cards) && cached.cards.length > 0) {
        return { ...cached, _cacheHit: true };
      }
    }
    const prompt = PROMPTS.flashcards(text, language);
    const out = await generateJson(prompt, taskConfig(config, { temperature: 0.14 }), "flashcards JSON");
    if (out?.cards?.length > 0 && text) {
      await setCachedArtifact(text, artifactKey, out, { meta: { task: "flashcards", language } });
    }
    return out;
  }

  if (task === "generic_summary" || task === "organize") {
    const artifactKey = buildArtifactKey({ task, language });
    if (!bypassCache && text) {
      const cached = await getCachedArtifact(text, artifactKey);
      if (cached?.summary_markdown) {
        return { ...cached, _cacheHit: true };
      }
    }
    const prompt = PROMPTS.summary(text, task === "organize" ? "complete_study_guide" : "exam_revision_sheet", 10, language);
    const raw = await generateText(
      prompt,
      taskConfig(config, { temperature: 0.18, max_tokens: 12288 }),
      SYSTEM_PROMPTS.summary,
    );
    const out = { text: raw, summary_markdown: raw };
    if (raw && text) {
      await setCachedArtifact(text, artifactKey, out, { meta: { task, language } });
    }
    return out;
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
