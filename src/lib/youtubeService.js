/**
 * ⚡️ YOUTUBE MASTER AI SERVICE (Pure JavaScript — Black Fighters Platform) ⚡️
 * Autonomous medical lecture & video curriculum synthesis service.
 * Zero Python dependencies — Netlify Serverless & local Vite compatible.
 */

// NOTE: Courses/GeneratedContent/StandaloneQuizzes are imported lazily inside
// saveYouTubeAsCourse / saveYouTubeAsQuiz. This module also runs server-side
// (netlify/functions/youtube-ai-job.mjs + dev middleware), where the Firebase
// client SDK must never load.

import { apiUrl } from "./apiBase.js";

const getEnvVal = (name) => {
  const p = typeof process !== "undefined" && process?.env;
  const m = typeof import.meta !== "undefined" && import.meta?.env;
  return (
    p?.[name] ||
    p?.[`VITE_${name}`] ||
    m?.[name] ||
    m?.[`VITE_${name}`] ||
    ""
  );
};

export const DEFAULT_KEY = getEnvVal("GEMINI_API_KEY");
export const DEFAULT_MODEL = "gemini-3.5-flash-lite";

// Gemini Flash Models Rotation Pool (Priority Ordered for maximum speed and quota)
export const GEMINI_MODELS_POOL = [
  "gemini-3.5-flash-lite",
  "gemini-3.1-flash-lite",
  "gemini-flash-lite-latest",
  "gemini-3.8-flash",
  "gemini-2.5-flash",
];

// Gemini Keys Pool — BYO-key and Server-side rotation
export const GEMINI_KEYS_POOL = [
  getEnvVal("GEMINI_API_KEY"),
  ...(getEnvVal("GEMINI_BACKUP_KEYS") ? getEnvVal("GEMINI_BACKUP_KEYS").split(",") : []),
].map((k) => (k || "").trim()).filter(Boolean);

// OpenAI-Compatible Providers Pool (BYO-key and Server fallback)
export const OPENAI_PROVIDERS_POOL = [
  {
    name: "GROQ",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: getEnvVal("GROQ_API_KEY"),
    models: ["llama-3.3-70b-versatile", "llama-3.1-8b-instant", "qwen/qwen3.8-27b", "openai/gpt-oss-120b"],
  },
  {
    name: "OPENROUTER",
    baseUrl: "https://openrouter.ai/api/v1",
    apiKey: getEnvVal("OPENROUTER_API_KEY"),
    models: ["openrouter/free", "qwen/qwen3.8-27b:free", "inclusionai/ling-3.0-flash-sante:free"],
  },
  {
    name: "APMIX",
    baseUrl: "https://api.apmix.ai/v1",
    apiKey: getEnvVal("APMIX_KEY"),
    models: ["deepseek-v4-flash-free", "space-bunny-free"],
  },
  {
    name: "POLLINATIONS",
    baseUrl: "https://text.pollinations.ai/openai",
    apiKey: "none",
    models: ["openai", "mistral", "llama"],
  },
];

const SYSTEM_PROMPT = `
You are an elite Medical Professor, Emergency Medicine Consultant, and Chief Clinical Curriculum Architect.
You will receive a medical lecture or YouTube video transcript.

You must synthesize this material into a supreme, highly readable, and perfectly organized clinical master reference.

ORGANIZATIONAL ARCHITECTURE & GOLDEN RULES:

1. MODULAR PAIRED STRUCTURE (Part-by-Part bilingual modules):
   Do NOT dump all English in one huge section followed by all Arabic in another huge section.
   Instead, divide the lecture logically into sequential clinical modules:
   \`## Part 1: [Topic in English] ([العنوان بالعربي])\`
   Inside EACH Part:
   a) English Core Notes (Strict LTR):
      - Clean bullet points with bold clinical terms: \`* **Term:** ...\`
      - Selective high-yield highlighting (see Highlighting Rules below).
      - Bullet points anchored on the LEFT.
      - High-yield indicators: 🔴 (High Yield), 🔴🔴🔴 (Vital / Lethal Sign), ⚠️ (Exam Trap / Fatal Pitfall), 💡 (Clinical Pearl).
   b) Arabic Deep Clinical Walkthrough (Strict RTL):
      - Header badge: \`### (الشرح بالعربي):\`
      - Authoritative, practical Egyptian medical residency tone (المنطق السريري في الطوارئ والاستقبال).
      - Bold Arabic terms with English names in parentheses: \`* **الاسم بالعربي (English Term):** ...\`
      - Actionable tips: "تريكة الامتحان", "العلامة القاتلة", "بروتوكول الطوارئ".
      - Bullet points anchored on the RIGHT.

2. DUAL BILINGUAL COMPARISON TABLES (English FIRST, then Arabic):
   Whenever comparing signs, differentials, drugs, or classifications:
   - First provide the clean Technical Comparison Table in English (LTR).
   - Followed IMMEDIATELY by the Practical Clinical Table in Arabic (RTL) with residency insights and traps.

3. SELECTIVE HIGHLIGHTING & BOLDING (شوية ألوان هايلايت تنظم الدنيا بدون إفراط):
   - ALWAYS bold core terms and concepts in both languages using \`**bold text**\`.
   - Use <mark class="hl-green">...</mark> for:
     * Diagnostic Triads & Classic Signs (e.g. <mark class="hl-green">Coma + Respiratory Depression + Pinpoint Pupils</mark>).
     * Life-saving Antidotes & Critical Emergency Interventions (e.g. <mark class="hl-green">Naloxone</mark>, <mark class="hl-green">Needle Decompression 2nd ICS</mark>).
   - Use <mark class="hl-yellow">...</mark> for:
     * Core definitions & diagnostic cutoffs (e.g. <mark class="hl-yellow">increased amounts of the substance</mark>, <mark class="hl-yellow">GCS &lt; 8</mark>).
     * High-yield formulas, drug calculations, and physiological principles (e.g. <mark class="hl-yellow">Dextrose 2500 formula</mark>).
   - DO NOT highlight entire sentences or paragraphs. Only highlight the 2-5 most critical words.
   - STRICT BAN ON DOLLAR SIGNS ('$') AND LATEX MATH:
     * NEVER use dollar signs '$' anywhere in your response (neither '$...$' nor '$$...$$').
     * The platform does NOT support LaTeX math rendering. Writing '$SpO_2$' or '$\\ge 65$' breaks the layout and confuses readers!
     * ALWAYS write plain natural clinical terms:
       - Write 'SpO2' (NEVER '$SpO_2$')
       - Write '≥ 65' or '>= 65' (NEVER '$\\ge 65$')
       - Write 'PaCO2' (NEVER '$PaCO_2$')
       - Write 'PaO2' (NEVER '$PaO_2$')
       - Write 'O2' (NEVER '$O_2$')
       - Write 'CO2' (NEVER '$CO_2$')
       - Write 'HCO3' (NEVER '$HCO_3^-$')
       - Write '> 5 minutes' (NEVER '$> 5\\text{ minutes}$')
       - Write 'GCS < 8' (NEVER '$GCS < 8$')
   - NEVER output empty highlight marks like \`<mark class="hl-yellow"></mark>\`.
   - NEVER use divider lines made of repeated equal signs (e.g. \`=====\` or \`====================\`). Always use standard Markdown dividers \`---\` or headings.
   - Inside code blocks (\`\`\`...\`\`\`), NEVER include HTML tags or \`<mark>\` tags. Code blocks must contain pure plain text only.

4. ALGORITHMS & RESUSCITATION FORMULAS:
   - State the technical formula/equation in English (LTR).
   - Explain the bedside calculation and real-patient application in Arabic (RTL).

5. FATAL PITFALLS & SHIFT CAPSULE:
   - Dedicate a final Part to: \`## Part X: Lethal Pitfalls & Shift Capsule (أخطاء قاتلة وكبسولة النبطشية) ⚠️\`

6. EXHAUSTIVE, UNCOMPRESSED COMPLETENESS (التلخيص الشامل بدون أي حذف أو اختصار):
   - Do NOT omit, compress, or summarize away any clinical details.
   - You MUST cover 100% of the material from the transcript: every classification, differential diagnosis, formula, dosage, priority step, and pitfall.

CONCRETE FEW-SHOT SYNTAX EXAMPLE (FOLLOW THIS EXACT MARKDOWN PATTERN):

## Part 1: Initial Patient Categorization (تصنيف المريض عند الوصول والقواعد الذهبية)

* **Triage in the Emergency Department:** Any incoming patient falls into one of three categories:
  * **Cardiac Arrest:** Unresponsive patient with <mark class="hl-green">no central pulse</mark> -> <mark class="hl-green">Immediate resuscitation</mark>. 🔴🔴🔴
  * **Critically Ill / Deteriorating Patient:** Responsive but at risk of imminent arrest -> Needs <mark class="hl-yellow">ABCDE Approach</mark>. 🔴
  * **Stable / Non-Critical:** Minor complaints, generally well-appearing, <mark class="hl-yellow">no immediate threat to life</mark>.
* **Basic Cellular Physiology:** The cell requires: <mark class="hl-green">Oxygen (O2) + Glucose</mark> -> **ATP (Energy)**. 💡
* **The Lethality Hierarchy:** Cellular hypoxia causes rapid irreversible brain damage within 4-6 minutes. ⚠️

### (الشرح بالعربي):
* **تصنيف المريض عند الوصول (Triage):** أول ما المريض يدخل الطوارئ، لازم أفرزه بسرعة لـ 3 أنواع:
  * **مريض توقف قلب (Cardiac Arrest):** فاقد للوعي تماماً والنبض المركزي غائب، ده تدخله فوراً غرفة الإنعاش وتبدأ CPR. 🔴🔴🔴
  * **مريض حرج / بيتدهور (Critically Ill):** بيتكلم أو بيستجيب لكنه على حافة الموت، ده مفتاحه ومنقذه هو **منهج الـ ABCDE**. 🔴
  * **مريض مستقر (Stable):** جاي بألم مزمن أو فحص روتيني، مفيش تهديد مباشر لحياته.
* **فسيولوجيا الخلية (Cellular Metabolism):** الخلية عشان تعيش محتاجة أكسجين وجلوكوز لإنتاج الطاقة، لو الأكسجين انقطع 4 لـ 6 دقائق بتموت خلايا المخ! ⚠️

### Comparison Table (English)
| Parameter | Snoring | Stridor | Gurgling |
| :--- | :--- | :--- | :--- |
| **Site of Obstruction** | Pharynx (tongue base) | Larynx / Subglottic | Fluid / Secretions in upper airway |
| **Emergency Action** | Head tilt / Jaw thrust / OPA | O2 / Nebulized Adrenaline / Intubation | Immediate Suctioning (Yankauer) |

### جدول المقارنة الإكلينيكي (بالعربي)
| وجه المقارنة | الشخير (Snoring) | الصرير (Stridor) | الغرغرة (Gurgling) |
| :--- | :--- | :--- | :--- |
| **مكان الانسداد** | البلعوم وسقوط اللسان للخلف | الحنجرة والأحبال الصوتية | سوائل ودم وإفرازات في مجرى الهواء |
| **التدخل الفوري** | فتح مجرى الهواء (Jaw Thrust / OPA) | أكسجين + أدرينالين استنشاقي | شفط فوري بالمحاقن والـ Suction |


DELIMITERS FOR YOUR OUTPUT:
Wrap the entire Markdown study guide inside:
<<<MARKDOWN_START>>>
[Your full Markdown reference guide here]
<<<MARKDOWN_END>>>

Wrap the MCQ Question Bank (if requested) inside:
<<<QUIZ_JSON_START>>>
[
  {
    "questionText": "...",
    "options": ["A) ...", "B) ...", "C) ...", "D) ..."],
    "correctAnswer": "A",
    "explanation": "..."
  }
]
<<<QUIZ_JSON_END>>>
`;

export function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes(".")) {
    return trimmed;
  }
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtu\.be\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/shorts\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

/**
 * Fetches transcript via backend/serverless function.
 */
export async function fetchYouTubeTranscript(url, { startTime = "", endTime = "" } = {}) {
  const endpoints = [apiUrl("youtube-transcript"), "/.netlify/functions/youtube-transcript"];
  let lastErr = null;

  let headers = { "Content-Type": "application/json" };
  try {
    const { auth } = await import("./firebase");
    const token = await auth?.currentUser?.getIdToken?.();
    if (token) {
      headers["Authorization"] = `Bearer ${token}`;
    }
  } catch {}

  for (const ep of endpoints) {
    try {
      const res = await fetch(ep, {
        method: "POST",
        headers,
        body: JSON.stringify({ url, startTime, endTime }),
      });
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.transcript) {
          return data;
        } else if (data.error) {
          lastErr = new Error(data.error);
        }
      } else {
        const data = await res.json().catch(() => ({}));
        if (data.error) lastErr = new Error(data.error);
      }
    } catch (e) {
      lastErr = e;
    }
  }

  // Fallback: fetch video info directly in the browser via YouTube oEmbed or noembed
  try {
    const videoId = extractYouTubeId(url);
    if (videoId) {
      let odata = null;
      try {
        const ytRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`);
        if (ytRes.ok) odata = await ytRes.json();
      } catch {}
      if (!odata) {
        try {
          const noembedRes = await fetch(`https://noembed.com/embed?url=https://www.youtube.com/watch?v=${videoId}`);
          if (noembedRes.ok) odata = await noembedRes.json();
        } catch {}
      }

      if (odata) {
        const vTitle = odata.title || `محاضرة يوتيوب (${videoId})`;
        return {
          success: true,
          hasCaptions: false,
          videoId,
          title: vTitle,
          author: odata.author_name || "",
          transcript: `محاضرة سريرية متقدمة بعنوان: "${vTitle}" من إعداد "${odata.author_name || 'المحاضر'}".\n\nيرجى تلخيص واستخلاص الشرح الأكاديمي والفسيولوجي والسريري الشامل وبناء بنك الأسئلة السريري المتكامل لهذا الموضوع بأعلى دقة وإحكام.`,
          charCount: 220,
        };
      }
    }
  } catch {}

  throw new Error(lastErr?.message || "فشل جلب الترجمة من فيديو يوتيوب. تأكد من وجود ترجمة أو رابط صحيح.");
}

/**
 * Calls Gemini REST API natively via fetch with expanded 32,768 output token window.
 */
export async function callGeminiRest(
  contents,
  systemInstruction = SYSTEM_PROMPT,
  apiKey = DEFAULT_KEY,
  modelName = DEFAULT_MODEL,
  maxOutputTokens = 32768
) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`;
  const payload = {
    systemInstruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      temperature: 0.2,
      topP: 0.95,
      maxOutputTokens,
    },
  };

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`خطأ في Gemini API [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  const candidate = data.candidates?.[0];
  const textPart = candidate?.content?.parts?.[0]?.text;
  return textPart || "";
}

/**
 * Calls OpenAI-compatible REST API (APMIX.AI, AIMLAPI, Groq, OpenRouter).
 */
export async function callOpenAICompatible({
  baseUrl,
  apiKey,
  model,
  systemInstruction = SYSTEM_PROMPT,
  userPrompt = "",
  maxTokens = 8192,
}) {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const headers = {
    "Content-Type": "application/json",
    ...(apiKey && apiKey !== "none" ? { Authorization: `Bearer ${apiKey}` } : {}),
  };
  const res = await fetch(`${cleanBase}/chat/completions`, {
    method: "POST",
    headers,
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: systemInstruction },
        { role: "user", content: userPrompt },
      ],
      max_tokens: maxTokens,
      temperature: 0.2,
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI Provider [${res.status}]: ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
}

/**
 * ⚡️ INDESTRUCTIBLE MULTI-MODEL & MULTI-PROVIDER RESILIENT ENGINE ⚡️
 * Seamlessly rotates across Gemini models and keys, with automatic fallback
 * to OpenAI-compatible providers (APMIX.AI, AIMLAPI, Groq).
 */
export async function callResilientAI({
  systemInstruction = SYSTEM_PROMPT,
  userPrompt = "",
  maxOutputTokens = 32768,
  preferredModel = DEFAULT_MODEL,
  customKey = "",
}) {
  let lastError = null;

  // 1. Build Gemini models priority list
  const modelsToTry = [
    preferredModel,
    ...GEMINI_MODELS_POOL.filter((m) => m !== preferredModel),
  ];

  // 2. Build Gemini keys list
  const keysToTry = customKey ? [customKey, ...GEMINI_KEYS_POOL] : GEMINI_KEYS_POOL;

  // 3. Try Gemini Rotation Pool (Model x Key)
  for (const model of modelsToTry) {
    for (const key of keysToTry) {
      try {
        const text = await callGeminiRest(
          [{ parts: [{ text: userPrompt }] }],
          systemInstruction,
          key,
          model,
          maxOutputTokens
        );
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AI Engine Rotation] Gemini model "${model}" failed, rotating to next...`, err.message);
      }
    }
  }

  // 4. Automatic Fallback to OpenAI-Compatible Providers Pool (APMIX.AI, AIMLAPI, etc.)
  for (const provider of OPENAI_PROVIDERS_POOL) {
    if (!provider.apiKey && provider.apiKey !== "none") continue;
    for (const model of provider.models) {
      try {
        console.info(`[AI Engine Fallback] Trying ${provider.name} model "${model}"...`);
        const text = await callOpenAICompatible({
          baseUrl: provider.baseUrl,
          apiKey: provider.apiKey,
          model,
          systemInstruction,
          userPrompt,
          maxTokens: Math.min(maxOutputTokens, 8192),
        });
        if (text && text.trim().length > 0) {
          return text;
        }
      } catch (err) {
        lastError = err;
        console.warn(`[AI Engine Fallback] Provider ${provider.name} model "${model}" failed:`, err.message);
      }
    }
  }

  throw new Error(`فشلت جميع نماذج ومفاتيح الذكاء الاصطناعي في الاستجابة: ${lastError?.message || "يرجى المحاولة لاحقاً"}`);
}

/**
 * Strips raw LaTeX math and dollar signs, converting them to clean, natural Unicode clinical notation.
 * e.g. "$\\ge 65$" -> "≥ 65", "$SpO_2$" -> "SpO₂", "$> 5\\text{ minutes}$" -> "> 5 minutes"
 */
export function sanitizeMedicalLatex(str) {
  if (!str) return "";

  // 1. Double dollar blocks $$...$$
  let res = str.replace(/\$\$([^\$]+?)\$\$/g, (m, inner) => inner.trim());

  // 2. Single dollar inline math $...$
  res = res.replace(/\$([^\$\n]+?)\$/g, (match, inner) => {
    let clean = inner
      .replace(/\\text\{([^}]+)\}/g, "$1")
      .replace(/\\mathrm\{([^}]+)\}/g, "$1")
      .replace(/\\textbf\{([^}]+)\}/g, "$1")
      .replace(/\\mathbf\{([^}]+)\}/g, "$1")
      .replace(/\\mathit\{([^}]+)\}/g, "$1")
      .replace(/\\(?:ge|geq)\b/g, "≥")
      .replace(/\\(?:le|leq)\b/g, "≤")
      .replace(/\\times\b/g, "×")
      .replace(/\\pm\b/g, "±")
      .replace(/\\approx\b/g, "≈")
      .replace(/\\neq\b/g, "≠")
      .replace(/\\sim\b/g, "~")
      .replace(/\\(?:to|rightarrow)\b/g, "→")
      .replace(/\\leftarrow\b/g, "←")
      .replace(/\\uparrow\b/g, "↑")
      .replace(/\\downarrow\b/g, "↓")
      .replace(/\\Delta\b/g, "Δ")
      .replace(/\\mu\b/g, "μ")
      .replace(/\\alpha\b/g, "α")
      .replace(/\\beta\b/g, "β")
      .replace(/\\infty\b/g, "∞")
      .replace(/\\degree\b/g, "°");

    // Subscripts
    clean = clean.replace(/_\{?([0-9]+)\}?/g, (m, digits) => {
      const subMap = { "0": "₀", "1": "₁", "2": "₂", "3": "₃", "4": "₄", "5": "₅", "6": "₆", "7": "₇", "8": "₈", "9": "₉" };
      return digits.split("").map((d) => subMap[d] || d).join("");
    });

    // Superscripts
    clean = clean
      .replace(/\^\{?(\d+)?([\+\-])\}?/g, (m, num, sign) => {
        const s = sign === "+" ? "⁺" : "⁻";
        const supMap = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
        return (num ? num.split("").map((d) => supMap[d] || d).join("") : "") + s;
      })
      .replace(/\^\{?([0-9]+)\}?/g, (m, digits) => {
        const supMap = { "0": "⁰", "1": "¹", "2": "²", "3": "³", "4": "⁴", "5": "⁵", "6": "⁶", "7": "⁷", "8": "⁸", "9": "⁹" };
        return digits.split("").map((d) => supMap[d] || d).join("");
      });

    // Remove any leftover backslash command names
    clean = clean.replace(/\\[a-zA-Z]+/g, "");

    return clean.trim();
  });

  // 3. Clean unescaped subscripts in medical terms outside $
  res = res
    .replace(/\b(SpO|PaO|PaCO|PvO|FiO|EtCO|SaO|O|CO|H)_(2|3)\b/g, (m, prefix, num) => {
      return prefix + (num === "2" ? "₂" : "₃");
    })
    .replace(/\\(?:ge|geq)\b/g, "≥")
    .replace(/\\(?:le|leq)\b/g, "≤")
    .replace(/\\times\b/g, "×")
    .replace(/\\pm\b/g, "±");

  // 4. Strip any stray dollar signs that surround numbers, variables, or words
  res = res.replace(/\$([a-zA-Z0-9_≥≤±×≈≠→←\s\-\+\/\.%]+?)\$/g, "$1");
  res = res.replace(/\$(?=[a-zA-Z0-9_≥≤±×≈≠→←\s\-\+\/\.%])/g, "");

  return res;
}

function sanitizeQuizQuestions(questions) {
  if (!Array.isArray(questions)) return [];
  return questions.map((q) => ({
    ...q,
    questionText: sanitizeMedicalLatex(q?.questionText || ""),
    options: Array.isArray(q?.options)
      ? q.options.map((opt) => sanitizeMedicalLatex(String(opt || "")))
      : [],
    explanation: sanitizeMedicalLatex(q?.explanation || ""),
  }));
}

/**
 * Synthesizes YouTube transcript into study guide and/or quiz questions.
 * @param {Object} params
 * @param {string} params.transcript - Raw transcript text
 * @param {string} params.title - Lecture title
 * @param {string} params.mode - 'both' | 'summary_only' | 'quiz_only'
 * @param {number} params.quizCount - Target number of MCQs (up to 100)
 * @param {string} params.apiKey - Gemini API key
 */
export async function synthesizeYouTubeLecture({
  transcript,
  title = "",
  mode = "both",
  quizCount = 10,
  apiKey = DEFAULT_KEY,
}) {
  const effectiveCount = Math.max(3, Math.min(100, Number(quizCount) || 10));

  // 1. Summary Only Mode (32,768 Token Dedicated Budget)
  if (mode === "summary_only") {
    const summaryPrompt = `
TITLE HINT: ${title}
TASK: COMPREHENSIVE MEDICAL REFERENCE & EXHAUSTIVE STUDY GUIDE ONLY (No MCQs requested).

RAW MEDICAL TRANSCRIPT / LECTURE CONTENT:
"""
${transcript.slice(0, 120000)}
"""

CRITICAL INSTRUCTIONS:
- Synthesize this lecture into an exhaustive, authoritative clinical reference guide in Markdown.
- You MUST cover 100% of the material from the transcript: every classification, differential diagnosis, formula, dosage, priority step, and pitfall. Never truncate or compress prematurely.
- Follow the Modular Paired Structure: Part-by-Part (English Core Notes LTR with left bullets first, followed by Arabic Deep Walkthrough RTL, and dual bilingual tables).
- Apply high-yield highlighting with <mark class="hl-green"> and <mark class="hl-yellow"> and **bold** formatting strategically.
- Do NOT generate any MCQ questions or JSON blocks.
- Output ONLY the Markdown guide wrapped inside <<<MARKDOWN_START>>> and <<<MARKDOWN_END>>>.
`;

    const responseText = await callResilientAI({
      systemInstruction: SYSTEM_PROMPT,
      userPrompt: summaryPrompt,
      maxOutputTokens: 32768,
      customKey: apiKey,
    });

    const mdMatch = responseText.match(/<<<MARKDOWN_START>>>([\s\S]*?)<<<MARKDOWN_END>>>/);
    const markdown = mdMatch ? mdMatch[1].trim() : responseText.trim();
    return { markdown: sanitizeMedicalLatex(markdown), quiz: [], mode };
  }

  // 2. Quiz Only Mode (8,192 Token Dedicated Budget)
  if (mode === "quiz_only") {
    const quizPrompt = `
TITLE HINT: ${title}
TASK: HIGH-YIELD MCQ QUESTION BANK ONLY.
REQUESTED MCQ COUNT: Exactly ${effectiveCount} questions.

RAW MEDICAL TRANSCRIPT / LECTURE CONTENT:
"""
${transcript.slice(0, 120000)}
"""

CRITICAL INSTRUCTIONS:
- You MUST generate exactly ${effectiveCount} high-yield multiple-choice questions (MCQs) covering the lecture comprehensively.
- Test clinical scenarios, diagnostic steps, emergency management, critical drug dosages, physiological rationales, and fatal pitfalls.
- Do NOT generate any Markdown summary, headings, or lecture notes.
- Output ONLY the JSON array wrapped inside <<<QUIZ_JSON_START>>> and <<<QUIZ_JSON_END>>>.
`;

    const responseText = await callResilientAI({
      systemInstruction: SYSTEM_PROMPT,
      userPrompt: quizPrompt,
      maxOutputTokens: 16384,
      customKey: apiKey,
    });

    const quizMatch = responseText.match(/<<<QUIZ_JSON_START>>>([\s\S]*?)<<<QUIZ_JSON_END>>>/);
    let rawJson = quizMatch ? quizMatch[1].trim() : "";
    if (!rawJson) {
      const arrayMatch = responseText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) rawJson = arrayMatch[0].trim();
    }

    let quiz = [];
    if (rawJson) {
      try {
        quiz = JSON.parse(rawJson.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim());
      } catch (e) {
        console.error("Quiz parse error:", e);
      }
    }
    return { markdown: "", quiz: sanitizeQuizQuestions(quiz), mode };
  }

  // 3. Mode === 'both' -> Run Summary and Quiz in PARALLEL!
  // Parallel execution guarantees 100% token headroom: 32K for the guide + 16K for the quiz!
  const summaryPrompt = `
TITLE HINT: ${title}
TASK: EXHAUSTIVE CLINICAL MASTER REFERENCE GUIDE IN MARKDOWN.

RAW MEDICAL TRANSCRIPT / LECTURE CONTENT:
"""
${transcript.slice(0, 120000)}
"""

CRITICAL INSTRUCTIONS:
- Synthesize this lecture into an exhaustive, authoritative clinical reference guide in Markdown.
- You MUST cover 100% of the material: every classification, differential diagnosis, formula, dosage, and pitfall. Never truncate.
- Structure by Parts: English Core Notes (Strict LTR, left bullets, high-yield indicators 🔴, ⚠️, 💡) + Arabic Deep Clinical Walkthrough (Strict RTL) + Dual Bilingual Comparison Tables.
- Apply high-yield highlighting with <mark class="hl-green"> and <mark class="hl-yellow"> and **bold** formatting.
- Do NOT generate any MCQs in this output.
- Output ONLY the Markdown guide wrapped inside <<<MARKDOWN_START>>> and <<<MARKDOWN_END>>>.
`;

  const quizPrompt = `
TITLE HINT: ${title}
TASK: HIGH-YIELD MCQ QUESTION BANK (${effectiveCount} QUESTIONS).
REQUESTED MCQ COUNT: Exactly ${effectiveCount} questions.

RAW MEDICAL TRANSCRIPT / LECTURE CONTENT:
"""
${transcript.slice(0, 120000)}
"""

CRITICAL INSTRUCTIONS:
- Generate exactly ${effectiveCount} multiple-choice questions (MCQs) testing clinical decision-making, vital signs, emergency actions, and drug dosages.
- Output ONLY the JSON array wrapped inside <<<QUIZ_JSON_START>>> and <<<QUIZ_JSON_END>>>.
`;

  const [summaryRes, quizRes] = await Promise.all([
    callResilientAI({
      systemInstruction: SYSTEM_PROMPT,
      userPrompt: summaryPrompt,
      maxOutputTokens: 32768,
      customKey: apiKey,
    }),
    callResilientAI({
      systemInstruction: SYSTEM_PROMPT,
      userPrompt: quizPrompt,
      maxOutputTokens: 16384,
      customKey: apiKey,
    }),
  ]);

  const mdMatch = summaryRes.match(/<<<MARKDOWN_START>>>([\s\S]*?)<<<MARKDOWN_END>>>/);
  const markdownContent = mdMatch ? mdMatch[1].trim() : summaryRes.trim();

  let quizQuestions = [];
  const quizMatch = quizRes.match(/<<<QUIZ_JSON_START>>>([\s\S]*?)<<<QUIZ_JSON_END>>>/);
  let rawJson = quizMatch ? quizMatch[1].trim() : "";
  if (!rawJson) {
    const arrayMatch = quizRes.match(/\[\s*\{[\s\S]*\}\s*\]/);
    if (arrayMatch) rawJson = arrayMatch[0].trim();
  }

  if (rawJson) {
    try {
      quizQuestions = JSON.parse(rawJson.replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim());
    } catch (e) {
      try {
        const cleaned = rawJson.replace(/,\s*([\]}])/g, "$1");
        quizQuestions = JSON.parse(cleaned);
      } catch (e2) {
        console.error("[!] Quiz parsing fallback failed:", e2.message);
      }
    }
  }

  return {
    markdown: sanitizeMedicalLatex(markdownContent),
    quiz: sanitizeQuizQuestions(quizQuestions),
    mode,
  };
}

/**
 * Modifies an existing study guide via conversational prompt.
 */
export async function modifyYouTubeLecture({ currentMarkdown, promptInstruction, apiKey = DEFAULT_KEY }) {
  const modifyPrompt = `
You are the Chief Clinical Curriculum Architect.
The user wants to modify an existing medical study guide based on the following instruction:
INSTRUCTION: ${promptInstruction}

CURRENT MEDICAL STUDY GUIDE:
"""
${currentMarkdown}
"""

Apply the instruction carefully while preserving technical accuracy, formatting, comparison tables, and bi-directional clinical structure.
Output the full updated Markdown document wrapped in:
<<<MARKDOWN_START>>>
[Updated Markdown here]
<<<MARKDOWN_END>>>
`;

  const responseText = await callResilientAI({
    systemInstruction: SYSTEM_PROMPT,
    userPrompt: modifyPrompt,
    maxOutputTokens: 32768,
    customKey: apiKey,
  });

  const mdMatch = responseText.match(/<<<MARKDOWN_START>>>([\s\S]*?)<<<MARKDOWN_END>>>/);
  const mdResult = mdMatch ? mdMatch[1].trim() : responseText.trim();
  return sanitizeMedicalLatex(mdResult);
}

/**
 * Saves synthesized YouTube material as a Course in Firestore.
 */
export async function saveYouTubeAsCourse({ title, markdown, videoId, url }) {
  const chapters = [];
  const lines = markdown.split("\n");
  let currentChapter = { title: "مقدمة المحاضرة", content: "" };

  for (const line of lines) {
    if (line.startsWith("## ")) {
      if (currentChapter.content.trim()) {
        chapters.push({ ...currentChapter });
      }
      currentChapter = { title: line.replace(/^##\s+/, "").trim(), content: line + "\n" };
    } else {
      currentChapter.content += line + "\n";
    }
  }
  if (currentChapter.content.trim()) {
    chapters.push(currentChapter);
  }

  const courseData = {
    title: title || `محاضرة يوتيوب: ${videoId}`,
    description: `تلخيص ذكي لمحاضرة يوتيوب: ${url}`,
    source_type: "youtube",
    source_url: url,
    video_id: videoId,
    subject: "طب بشري / سريري",
    level: "طوارئ وحالات حرجة",
    chapters: chapters.length > 0 ? chapters : [{ title: "الملخص الشامل", content: markdown }],
    summary_markdown: markdown,
  };

  // Lazy import: keeps the Firebase client SDK out of server-side bundles
  const { Courses, GeneratedContent } = await import('./firestore.js');

  const newCourse = await Courses.create(courseData);

  // Save generated content record
  await GeneratedContent.create({
    course_id: newCourse.id,
    type: "summary",
    content: markdown,
    metadata: { videoId, url },
  });

  return newCourse;
}

/**
 * Saves synthesized MCQs as StandaloneQuiz in Firestore.
 */
export async function saveYouTubeAsQuiz({ title, questions, videoId }) {
  if (!Array.isArray(questions) || questions.length === 0) return null;

  // Lazy import: keeps the Firebase client SDK out of server-side bundles
  const { StandaloneQuizzes } = await import('./firestore.js');

  const quizData = {
    title: `⚡ كويز: ${title}`,
    description: `أسئلة تدريبية سريرية مستخرجة من محاضرة يوتيوب (${videoId})`,
    subject: "طب سريري / طوارئ",
    is_public: false,
    questions: questions.map((q, idx) => ({
      id: `q_${idx + 1}`,
      question: q.questionText,
      options: q.options,
      correct_answer: q.correctAnswer,
      explanation: q.explanation,
    })),
  };

  // Owner stamp (chat share chips + listings query user_id). Browser-only:
  // server-side runs have no auth and must never load the client SDK —
  // the quiz stays unowned there, same as before.
  if (typeof window !== 'undefined') {
    try {
      const { base44 } = await import('../api/base44Client');
      const me = await base44.entities.User.me();
      if (me?.id) quizData.user_id = me.id;
    } catch { /* demo / offline */ }
  }

  return await StandaloneQuizzes.create(quizData);
}
