/**
 * netlify/functions/_shared/lectures/mock-adapter.mjs — Deterministic mock adapter
 * for gemini-3.5-transcribe with failure-injection support (Section 8.6 & Section 19).
 *
 * Supports failure modes:
 *   • 'empty'       — HTTP 200 with empty text
 *   • 'empty_twice' — HTTP 200 empty on attempts 1 & 2, succeeds on attempt 3
 *   • '429'         — HTTP 429 with Retry-After
 *   • '500'         — HTTP 500
 *   • '401'         — HTTP 401 unauthorized (account-level error)
 *   • '400_thinking'— HTTP 400 "Thinking is not enabled"
 *   • '400_bad'     — HTTP 400 bad request
 *   • 'timeout'     — Abort/Timeout error
 *   • 'truncated'   — finishReason: 'MAX_TOKENS'
 *   • 'loop'        — repetition loop (>8 repeats of a 6-word phrase)
 */

const SAMPLE_CHUNKS = [
  "السلام عليكم يا دكاترة النهاردة هنتكلم عن الـ Myocardial infarction بالتفصيل. أول حاجة لازم نعرف التعريف: الـ Myocardial infarction هو ischemic necrosis في عضلة القلب بسبب انسداد في الـ coronary artery. لو عيان جالك الطوارئ بـ crushing chest pain بيسمّع في الدراع الشمال، أول حاجة تطلبها فورًا هي ECG في خلال 10 دقايق.",
  "تاني نقطة مهمة جدًا في الـ management هي الجرعات. بندي علاج MI بالـ aspirin 300 mg chewable فورًا في الطوارئ. خلي بالك من السؤال ده عشان بيجي في الامتحان كل سنة: الـ Troponin I هو الـ most sensitive and specific cardiac biomarker. إزيك يا أحمد عامل إيه، الصوت واضح في المدرج ورا يا شباب؟",
  "لما نيجي نقارن بين STEMI و NSTEMI هنلاقي إن الـ STEMI فيه ST elevation في الـ ECG وانسداد كامل، بينما الـ NSTEMI بيكون انسداد جزئي. في الالتهاب السيتوكينات زي IL-6/TNF-α بيزيدوا بشكل ملحوظ. وكمان الـ pH بتاع الدم 7.4 طبيعي، ولو قل عن 7.35 يبقى acidosis. الجرعة في الأطفال 5 mg/kg كل 8 ساعات.",
];

export function createMockGeminiAdapter({ scenario = "normal", chunkBehaviors = {} } = {}) {
  const attemptCounts = new Map();

  async function transcribe({
    chunkIndex = 0,
    bytes,
    mimeType = "audio/mp3",
    languageCodes = ["ar-EG", "en-US"],
    mode = "VERBATIM",
    customVocabulary = [],
    signal,
  } = {}) {
    if (signal?.aborted) {
      const err = new Error("ABORTED");
      err.status = 0;
      throw err;
    }

    const prevAttempts = attemptCounts.get(chunkIndex) || 0;
    const attempt = prevAttempts + 1;
    attemptCounts.set(chunkIndex, attempt);

    const behavior = chunkBehaviors[chunkIndex] || scenario;

    if (behavior === "401") {
      const err = new Error("API key invalid");
      err.status = 401;
      throw err;
    }

    if (behavior === "429" || (behavior === "429_once" && attempt === 1)) {
      const err = new Error("Quota exceeded");
      err.status = 429;
      err.retryAfterSec = 1;
      throw err;
    }

    if (behavior === "500" || (behavior === "500_once" && attempt === 1)) {
      const err = new Error("Internal Server Error");
      err.status = 500;
      throw err;
    }

    if (behavior === "400_thinking" && attempt === 1) {
      const err = new Error("Thinking is not enabled for this model");
      err.status = 400;
      throw err;
    }

    if (behavior === "400_bad") {
      const err = new Error("Invalid argument");
      err.status = 400;
      throw err;
    }

    if (behavior === "timeout") {
      const err = new Error("Request timeout");
      err.status = 504;
      throw err;
    }

    if (behavior === "empty" || (behavior === "empty_twice" && attempt <= 2)) {
      return {
        text: "",
        finishReason: "STOP",
        usage: { promptTokens: 180, outputTokens: 0 },
        latencyMs: 45,
      };
    }

    if (behavior === "truncated") {
      return {
        text: SAMPLE_CHUNKS[chunkIndex % SAMPLE_CHUNKS.length],
        finishReason: "MAX_TOKENS",
        usage: { promptTokens: 200, outputTokens: 32768 },
        latencyMs: 120,
      };
    }

    if (behavior === "loop") {
      const repeated = Array.from(
        { length: 10 },
        () => "المريض عنده ألم شديد في الصدر",
      ).join(" ");
      return {
        text: repeated,
        finishReason: "STOP",
        usage: { promptTokens: 200, outputTokens: 60 },
        latencyMs: 90,
      };
    }

    const baseText = SAMPLE_CHUNKS[chunkIndex % SAMPLE_CHUNKS.length];
    return {
      text: baseText,
      finishReason: "STOP",
      usage: { promptTokens: 194, outputTokens: 48 },
      latencyMs: 80,
      mode,
      languageCodes,
      customVocabularyCount: Array.isArray(customVocabulary) ? customVocabulary.length : 0,
      byteLength: bytes?.byteLength || bytes?.length || 0,
      mimeType,
    };
  }

  return {
    transcribe,
    getAttempts: (idx) => attemptCounts.get(idx) || 0,
    reset: () => attemptCounts.clear(),
  };
}

export default createMockGeminiAdapter;
