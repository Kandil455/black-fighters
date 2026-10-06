export const QUIZ_MAX_QUESTIONS = 1000;
export const QUIZ_ANALYSIS_SAMPLE_CHARS = 50_000;
export const QUIZ_CHUNK_MAX_CHARS = 12_000;

const ARABIC_DIACRITICS = /[\u064B-\u065F\u0670]/g;
const OPTION_LETTERS = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
  "أ": 0, "ا": 0, "ب": 1, "ج": 2, "د": 3, "هـ": 4, "ه": 4, "و": 5,
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5,
};

export function cleanQuizText(value = "") {
  return String(value)
    .replace(/\r\n/g, "\n")
    .replace(/[ \t]+/g, " ")
    .replace(/\n{4,}/g, "\n\n\n")
    .trim();
}

function compact(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^[-*•\s]*(?:(?:س(?:ؤال)?|q(?:uestion)?|question)\s*\d*\s*[\).:-]?|\d+\s*[\).:-])\s*/i, "")
    .trim();
}

function compactOption(value = "") {
  return String(value)
    .replace(/\s+/g, " ")
    .replace(/^\s*(?:\(?[A-Fa-f]\)?|(?:أ|ا|ب|ج|د|هـ?|ه|و))\s*[\).:\-]\s*/i, "")
    .trim();
}

function normalizedStem(value = "") {
  return compact(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[أإآ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\b(the|a|an|and|or|of|to|in|on|for|with|is|are|was|were)\b/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 180);
}

function coerceBoolean(value, fallback = false) {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value !== 0;
  const normalized = String(value ?? "").trim().toLowerCase();
  if (["true", "yes", "1", "نعم", "موجود"].includes(normalized)) return true;
  if (["false", "no", "0", "لا", "غير موجود"].includes(normalized)) return false;
  return fallback;
}

function stemSimilarity(first, second) {
  if (!first || !second) return 0;
  if (first === second) return 1;
  if (first.length > 22 && second.length > 22 && (first.includes(second) || second.includes(first))) return 0.95;
  const left = new Set(first.split(" ").filter((token) => token.length > 2));
  const right = new Set(second.split(" ").filter((token) => token.length > 2));
  if (!left.size || !right.size) return 0;
  const intersection = [...left].filter((token) => right.has(token)).length;
  const union = new Set([...left, ...right]).size;
  return union ? intersection / union : 0;
}

export function detectLanguage(text = "") {
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const total = arabic + latin;
  if (total === 0) return "ar";
  if (latin > arabic * 1.5) return "en";
  if (arabic > latin * 1.5) return "ar";
  return "mixed";
}

export function detectSubject(text = "") {
  const lower = text.toLowerCase();
  if (/anatomy|physiology|pathology|disease|clinical|patient|nerve|ear|otoscopy|surgery|medicine|diagnosis|syndrome|cardiology|pharmacology|radiology|pediatrics|obstetrics|gynecology|التهاب|مرض|تشخيص|علاج|سريري/.test(lower)) return "medical";
  if (/equation|derivative|integral|matrix|probability|statistics|فرض|احتمال|معادلة|تفاضل|تكامل|احصاء/.test(lower)) return "math";
  if (/law|contract|court|article|قانون|محكمة|مادة|عقد/.test(lower)) return "law";
  if (/history|war|empire|civilization|تاريخ|حضارة|حرب/.test(lower)) return "history";
  return "general";
}

export function getRecommendedQuizLanguage(text = "") {
  const lang = detectLanguage(text);
  const subject = detectSubject(text);
  // Purely English material
  if (lang === "en") return "en";
  // Purely Arabic material and not medical
  if (lang === "ar" && subject !== "medical") return "ar";
  // Bilingual / mixed material or medical subjects:
  // Medical students study, test, and live in English! If there's any English content (>15%), default to English.
  const latin = (text.match(/[a-zA-Z]/g) || []).length;
  const arabic = (text.match(/[\u0600-\u06FF]/g) || []).length;
  if (subject === "medical" || lang === "mixed") {
    if (latin > 15 || (latin / (latin + arabic || 1)) >= 0.15) {
      return "en";
    }
  }
  return lang === "ar" ? "ar" : "en";
}

export function buildQuizAnalysisSample(value = "", maxChars = QUIZ_ANALYSIS_SAMPLE_CHARS) {
  const source = cleanQuizText(value);
  const limit = Math.max(2_000, Number(maxChars) || QUIZ_ANALYSIS_SAMPLE_CHARS);
  if (source.length <= limit) return source;

  // Odd window count guarantees a true middle sample in addition to head/tail.
  const windowCount = 9;
  const labelBudget = 64 * windowCount;
  const windowSize = Math.max(500, Math.floor((limit - labelBudget) / windowCount));
  const maxStart = Math.max(0, source.length - windowSize);
  const windows = [];
  for (let index = 0; index < windowCount; index += 1) {
    const start = Math.round((maxStart * index) / (windowCount - 1));
    windows.push(`[مقطع تحليلي ${index + 1}/${windowCount} · موضع ${start}]\n${source.slice(start, start + windowSize)}`);
  }
  return windows.join("\n\n").slice(0, limit);
}

function isOptionLine(line = "") {
  return /^(?:\(?[A-Fa-f]\)?|(?:أ|ا|ب|ج|د|هـ?|ه|و))\s*[\).:\-]\s*\S+/.test(line);
}

function isExplicitQuestionLine(line = "") {
  return /^(?:(?:س(?:ؤال)?|q(?:uestion)?)\s*\d*\s*[\).:\-]?)\s*\S+/i.test(line)
    || /[?؟]\s*$/.test(line)
    || /^(?:choose|select|which|what|why|how|explain|define|true or false|mcq|اختر|أي|ما هو|لماذا|اشرح|عرف|صح أم خطأ)(?:\s|:)/i.test(line);
}

function countStructuredQuestions(lines) {
  let count = 0;
  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const numberedStem = /^(?:س(?:ؤال)?|q(?:uestion)?)?\s*\d+\s*[\).:\-]\s*\S+/i.test(line);
    const explicitQuestion = isExplicitQuestionLine(line) && !numberedStem;
    if (!numberedStem && !explicitQuestion) continue;
    const nearbyOptions = lines.slice(index + 1, index + 10).filter(isOptionLine).length;
    if (nearbyOptions >= 2 || explicitQuestion) count += 1;
  }
  return count;
}

export function localAnalyzeQuizSource(value = "") {
  const sample = cleanQuizText(value);
  const lines = sample.split("\n").map((line) => line.trim()).filter(Boolean);
  const questionMarks = (sample.match(/[?؟]/g) || []).length;
  const structuredQuestions = countStructuredQuestions(lines);
  const explicitQuestionWords = lines.filter((line) => (
    isExplicitQuestionLine(line) && !/^\s*\d+\s*[\).:\-]/.test(line)
  )).length;
  const inlineOptions = (sample.match(/(?:^|\s)(?:\(?[A-Fa-f]\)?|(?:أ|ا|ب|ج|د|هـ?|ه|و))\s*[\).:\-]\s+\S/g) || []).length;
  const optionLines = Math.max(lines.filter(isOptionLine).length, inlineOptions);
  const answerMarkers = (sample.match(/(?:ans(?:wer)?\s*[\.:\-]|answer\s*key|correct\s*(?:answer|option)|model answer|الإجابة|الاجابة|الإجابات|الاجابات|نموذج الإجابة|مفتاح الإجابة|الحل\s*[:\-]|(?:^|\n)\s*\d+\s*[\).:\-]\s*[A-Fa-f1-6أابجدهو]\s*(?=$|[,;\s]))/gim) || []).length;
  const markedCorrectOptions = lines.filter((line) => isOptionLine(line) && /(?:[✓✔✅☑]|إجابة صحيحة|correct)\s*$/i.test(line)).length;
  const solutionMarkers = (sample.match(/(?:^|\n)\s*(?:solution|explanation|الشرح|التفسير)\s*[:\-]/gim) || []).length;
  const studySignals = (sample.match(/(?:chapter|lecture|definition|overview|summary|types|causes|treatment|مقدمة|محاضرة|تعريف|أنواع|أسباب|علاج|شرح)/gim) || []).length;
  const optionBasedCount = optionLines ? Math.max(1, Math.round(optionLines / 4.2)) : 0;
  const estimatedQuestionCount = Math.max(questionMarks, structuredQuestions, optionBasedCount, explicitQuestionWords);
  const hasQuestionBank = estimatedQuestionCount >= 1 && (optionLines >= 2 || answerMarkers >= 1 || structuredQuestions >= 2 || questionMarks >= 3);
  const isLongStudyMaterial = sample.length > 3500 && (studySignals >= 4 || lines.filter((line) => line.length > 120).length >= 8);
  const hasSubstantialStudyContent = isLongStudyMaterial && studySignals >= Math.max(4, Math.ceil(estimatedQuestionCount * 0.35));
  const sourceType = hasQuestionBank
    ? (hasSubstantialStudyContent ? "mixed" : "question_bank")
    : "study_material";
  const recommendation = sourceType === "question_bank" ? "extract" : sourceType === "mixed" ? "hybrid" : "generate";
  const confidence = Math.min(0.96, Math.max(0.55,
    (hasQuestionBank ? 0.62 : 0.58)
    + Math.min(0.18, estimatedQuestionCount * 0.015)
    + Math.min(0.12, answerMarkers * 0.03)
    + Math.min(0.08, optionLines * 0.004)
  ));

  return {
    source_type: sourceType,
    has_answers: answerMarkers > 0 || markedCorrectOptions > 0 || solutionMarkers >= Math.max(1, Math.ceil(estimatedQuestionCount / 3)),
    question_count: estimatedQuestionCount,
    recommended_count: sourceType === "question_bank"
      ? Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, estimatedQuestionCount || 10))
      : 10,
    dominant_language: detectLanguage(sample),
    subject: detectSubject(sample),
    confidence: Number(confidence.toFixed(2)),
    recommendation,
    reason: sourceType === "question_bank"
      ? "تم رصد أسئلة واضحة واختيارات داخل المصدر"
      : sourceType === "mixed"
        ? "المصدر يجمع بين الشرح وأسئلة جاهزة"
        : "المصدر مادة شرح؛ الأنسب توليد أسئلة جديدة",
  };
}

export function normalizeQuizSourceAnalysis(remote, fallback = {}) {
  const remoteSourceType = ["question_bank", "study_material", "mixed"].includes(remote?.source_type)
    ? remote.source_type
    : null;
  const fallbackSourceType = fallback.source_type || "study_material";
  // Remote analysis sees a representative sample; never let a sampled "study"
  // verdict erase strong question-bank signals found while scanning the full text.
  const sourceType = remoteSourceType === "study_material" && ["question_bank", "mixed"].includes(fallbackSourceType)
    ? fallbackSourceType
    : remoteSourceType || fallbackSourceType;
  const defaultRecommendation = sourceType === "question_bank" ? "extract" : sourceType === "mixed" ? "hybrid" : "generate";
  const sourceTypeWasOverridden = remoteSourceType && sourceType !== remoteSourceType;
  const recommendation = !sourceTypeWasOverridden && ["extract", "generate", "hybrid"].includes(remote?.recommendation)
    ? remote.recommendation
    : fallback.recommendation || defaultRecommendation;
  const count = Math.max(0, Math.min(QUIZ_MAX_QUESTIONS, Math.max(
    Number(remote?.question_count) || 0,
    Number(fallback.question_count) || 0,
  )));
  return {
    ...fallback,
    ...(remote && typeof remote === "object" ? remote : {}),
    source_type: sourceType,
    recommendation,
    has_answers: coerceBoolean(remote?.has_answers, false) || Boolean(fallback.has_answers),
    question_count: count,
    recommended_count: Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Math.max(
      Number(remote?.recommended_count) || 0,
      Number(fallback.recommended_count) || 0,
      count,
      10,
    ))),
    confidence: Math.max(0, Math.min(1, Number(remote?.confidence ?? fallback.confidence) || 0.55)),
    dominant_language: ["ar", "en", "mixed"].includes(remote?.dominant_language) ? remote.dominant_language : fallback.dominant_language || "mixed",
  };
}

function splitLongQuizText(source, maxChars, overlapChars) {
  if (source.length <= maxChars) return [source];
  const chunks = [];
  let start = 0;
  while (start < source.length) {
    let end = Math.min(source.length, start + maxChars);
    if (end < source.length) {
      const floor = start + Math.floor(maxChars * 0.62);
      const candidates = [
        source.lastIndexOf("\n\n", end),
        source.lastIndexOf("\n", end),
        source.lastIndexOf(". ", end),
        source.lastIndexOf("؟ ", end),
        source.lastIndexOf("? ", end),
      ];
      const boundary = Math.max(...candidates);
      if (boundary >= floor) end = boundary + 1;
    }
    const chunk = source.slice(start, end).trim();
    if (chunk) chunks.push(chunk);
    if (end >= source.length) break;
    start = Math.max(start + 1, end - overlapChars);
  }
  return chunks;
}

function selectEvenly(items, count) {
  if (items.length <= count) return items.map((text, sourceIndex) => ({ text, sourceIndex }));
  const selected = [];
  const used = new Set();
  for (let index = 0; index < count; index += 1) {
    let sourceIndex = Math.round((index * (items.length - 1)) / Math.max(1, count - 1));
    while (used.has(sourceIndex) && sourceIndex < items.length - 1) sourceIndex += 1;
    if (used.has(sourceIndex)) continue;
    used.add(sourceIndex);
    selected.push({ text: items[sourceIndex], sourceIndex });
  }
  return selected;
}

function chunkSourceMetadata(text, sourceIndex, sourceChunkCount) {
  const pages = [...sourcePages(text)].sort((a, b) => a - b);
  const sourceRef = pages.length === 1
    ? `صفحة ${pages[0]}`
    : pages.length > 1
      ? `صفحات ${pages[0]}–${pages.at(-1)}`
      : `مقطع ${sourceIndex + 1}/${sourceChunkCount}`;
  return {
    pageStart: pages[0] || null,
    pageEnd: pages.at(-1) || null,
    sourceRef,
    evidenceId: factId(`${sourceIndex}:${text.slice(0, 240)}:${text.slice(-240)}`),
  };
}

export function calculateChunkInformationDensity(text = "") {
  if (!text || text.length < 50) return 0.1;

  // 1. Technical & scientific keywords (English words 4+ chars, definitions, medical keywords)
  const englishTechTerms = (text.match(/\b[A-Za-z]{4,}\b/g) || []).length;
  const arabicTechTerms = (text.match(/(?:تعريف|وظيفة|أسباب|أعراض|علاج|ميكانيزم|تشخيص|أنواع|أقسام|تركيب|خصائص|تأثير|مرحلة|قانون|معادلة)/g) || []).length;

  // 2. Numerical values, equations, percentages
  const numbersAndStats = (text.match(/\b\d+(?:\.\d+)?%?\b/g) || []).length;

  // 3. Sentences & distinct statements
  const sentences = (text.match(/[^.!?؟\n]+[.!?؟\n]+/g) || []).length;

  // 4. Raw length factor (normalized per 1000 chars)
  const lengthFactor = Math.min(10, text.length / 1000);

  const density = (
    englishTechTerms * 1.2 +
    arabicTechTerms * 2.0 +
    numbersAndStats * 1.5 +
    sentences * 1.0 +
    lengthFactor * 2.0
  );

  return Math.max(1, Math.round(density));
}

export function buildQuizChunks(value = "", {
  mode = "generate",
  targetQuestions = 10,
  maxChars = QUIZ_CHUNK_MAX_CHARS,
} = {}) {
  const source = cleanQuizText(value);
  if (!source) return { chunks: [], sourceChunkCount: 0, sampled: false };
  const safeMax = Math.max(2_000, Number(maxChars) || QUIZ_CHUNK_MAX_CHARS);
  // Ensure safe overlap across chunk boundaries in all modes to avoid truncated concepts
  const overlap = Math.min(600, Math.max(300, Math.floor(safeMax * 0.06)));
  const sourceChunks = splitLongQuizText(source, safeMax, overlap);
  const target = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(targetQuestions) || 10));
  const usefulChunkLimit = mode === "extract"
    ? sourceChunks.length
    : mode === "hybrid"
      ? Math.min(24, Math.max(8, Math.ceil(Math.sqrt(target) * 3)))
      : Math.min(48, Math.max(4, Math.ceil(Math.sqrt(target) * 2)));
  const selected = selectEvenly(sourceChunks, usefulChunkLimit);
  return {
    chunks: selected.map(({ text, sourceIndex }, index) => ({
      text,
      sourceIndex,
      sourceChunkCount: sourceChunks.length,
      label: `جزء ${index + 1}/${selected.length} · موضع ${sourceIndex + 1}/${sourceChunks.length}`,
      density: calculateChunkInformationDensity(text),
      ...chunkSourceMetadata(text, sourceIndex, sourceChunks.length),
    })),
    sourceChunkCount: sourceChunks.length,
    sampled: selected.length < sourceChunks.length,
  };
}

/**
 * P1.2 Map-Reduce Question Allocation with Information Density Weighting:
 * Guarantees minimum 1 question per substantive chunk for full document coverage,
 * and distributes remainder proportionally according to technical density.
 */
export function allocateQuizQuestions(totalQuestions, chunksOrCount) {
  const total = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(totalQuestions) || 10));

  // Legacy fallback if chunksOrCount is just a number
  if (typeof chunksOrCount === "number" || !Array.isArray(chunksOrCount)) {
    const count = Math.max(1, Number(chunksOrCount) || 1);
    const plan = new Array(count).fill(0);
    if (total < count) {
      for (let index = 0; index < total; index += 1) {
        const chunkIndex = total === 1
          ? Math.floor((count - 1) / 2)
          : Math.round((index * (count - 1)) / (total - 1));
        plan[chunkIndex] += 1;
      }
      return plan;
    }
    for (let index = 0; index < total; index += 1) plan[index % count] += 1;
    return plan;
  }

  const chunks = chunksOrCount;
  const count = chunks.length;
  if (count === 0) return [];
  if (count === 1) return [total];

  // Calculate density weight for each chunk
  const densities = chunks.map((c) => {
    if (typeof c === "object" && c?.density !== undefined) return c.density;
    const text = typeof c === "string" ? c : c?.text || "";
    return calculateChunkInformationDensity(text);
  });
  const totalDensity = densities.reduce((sum, d) => sum + d, 0) || 1;

  const plan = new Array(count).fill(0);

  // Case A: Total questions >= number of chunks -> Every chunk gets at least 1 question (100% coverage)
  if (total >= count) {
    for (let i = 0; i < count; i++) plan[i] = 1;
    const remaining = total - count;

    if (remaining > 0) {
      const shares = densities.map((d) => (d / totalDensity) * remaining);
      const intShares = shares.map((s) => Math.floor(s));
      let assigned = intShares.reduce((sum, s) => sum + s, 0);

      for (let i = 0; i < count; i++) {
        plan[i] += intShares[i];
      }

      // Distribute fractional remainder to highest remainder chunks
      let leftover = remaining - assigned;
      const remainders = shares.map((s, idx) => ({ idx, rem: s - intShares[idx] }));
      remainders.sort((a, b) => b.rem - a.rem);

      for (let i = 0; i < leftover; i++) {
        plan[remainders[i % count].idx] += 1;
      }
    }
  } else {
    // Case B: Total questions < number of chunks -> Distribute evenly across document span
    for (let i = 0; i < total; i++) {
      const idx = total === 1
        ? Math.floor((count - 1) / 2)
        : Math.round((i * (count - 1)) / (total - 1));
      plan[idx] += 1;
    }
  }

  return plan;
}

function optionText(option) {
  if (option && typeof option === "object") {
    return option.text ?? option.label ?? option.value ?? option.option ?? option.answer ?? "";
  }
  return option ?? "";
}

function parseCorrectIndex(raw, options, zeroBased = false) {
  if (typeof raw === "number" && Number.isFinite(raw)) return zeroBased ? raw : (raw >= 1 ? raw - 1 : raw);
  const value = String(raw ?? "").trim();
  if (!value) return -1;
  if (/^\d+$/.test(value)) {
    const n = Number(value);
    return zeroBased ? n : (n >= 1 && n <= options.length ? n - 1 : n);
  }
  if (value in OPTION_LETTERS) return OPTION_LETTERS[value];
  const letter = value.match(/^[\(\[]?([A-Fa-fأابجدهو])[\)\].:-]?$/)?.[1];
  if (letter && letter in OPTION_LETTERS) return OPTION_LETTERS[letter];
  const exact = options.findIndex((option) => normalizedStem(optionText(option)) === normalizedStem(value));
  if (exact >= 0) return exact;
  const contains = options.findIndex((option) => normalizedStem(optionText(option)).includes(normalizedStem(value)) || normalizedStem(value).includes(normalizedStem(optionText(option))));
  return contains;
}

const RECONCILE_STOP_WORDS = new Set([
  "the", "and", "for", "with", "that", "this", "from", "are", "was", "were", "have", "has", "had",
  "which", "what", "when", "where", "who", "whom", "whose", "why", "how", "into", "onto", "upon",
  "about", "above", "below", "between", "among", "through", "during", "before", "after", "under",
  "over", "again", "further", "then", "once", "here", "there", "all", "any", "both", "each", "few",
  "more", "most", "other", "some", "such", "only", "own", "same", "than", "too", "very", "can",
  "will", "just", "should", "now", "also", "may", "might", "must", "would", "could", "does", "did",
  "في", "من", "إلى", "الى", "على", "عن", "مع", "هذا", "هذه", "ذلك", "تلك", "الذي", "التي", "الذين",
  "هو", "هي", "هم", "كان", "كانت", "يكون", "تكون", "أن", "ان", "إن", "إذ", "إذا", "او", "أو", "ثم",
  "كل", "بعض", "غير", "بين", "فوق", "تحت", "أثناء", "اثناء", "بعد", "قبل", "عند", "لا", "لم", "لن",
]);

function normalizeTokenRoot(word = "") {
  let w = String(word).toLowerCase().replace(ARABIC_DIACRITICS, "").replace(/[^a-z0-9\u0600-\u06FF]/g, "");
  if (w.length > 5) {
    w = w.replace(/(?:ation|ition|sion|ment|ness|ance|ence|ingly|edly|es|ed|ing|ly|al|ic|ous|ive|s)$/, "");
  } else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) {
    w = w.slice(0, -1);
  }
  if (/^[\u0600-\u06FF]+$/.test(w) && w.length > 4) {
    w = w.replace(/^(?:وال|بال|كال|فال|لل|ال)/, "").replace(/(?:ات|ون|ين|ان|ية|ها|هم|هن|كم)$/, "");
  }
  return w;
}

function extractRootTokens(text = "") {
  return String(text || "")
    .split(/[\s,.;:!?()[\]{}"'«»/\\+\-_]+/)
    .map(normalizeTokenRoot)
    .filter((t) => t.length >= 3 && !RECONCILE_STOP_WORDS.has(t));
}

export function verifyIndexWithExplanation(options = [], currentIndex = 0, explanation = "", questionStem = "") {
  if (!Array.isArray(options) || options.length < 2) return currentIndex;
  const expText = String(explanation || "").trim();
  if (expText.length < 15) return currentIndex;

  // 1. Check explicit declaration: "The correct answer is X" / "الإجابة الصحيحة هي X"
  const explicitMatch = expText.match(/(?:correct\s+(?:answer|option|choice)\s+is|right\s+answer\s+is|الإجابة\s+الصحيحة\s+هي|الخيار\s+الصحيح\s+هو)\s*[:\-]?\s*["'«]?([^.،;\n"'»]+)/i);
  if (explicitMatch?.[1]) {
    const target = normalizedStem(explicitMatch[1]);
    if (target.length >= 2) {
      const idx = options.findIndex((opt) => {
        const s = normalizedStem(optionText(opt));
        return s === target || (s.length >= 4 && target.includes(s)) || (target.length >= 4 && s.includes(target));
      });
      if (idx >= 0) return idx;
    }
  }

  // 2. Sentence-level thesis verification (Opening affirmative statement vs distractor elimination)
  const sentences = expText.split(/(?<=[.!?؟])\s+|\n+/).map((s) => s.trim()).filter((s) => s.length >= 8);
  const firstSentence = sentences[0] || expText;
  const hasOpeningNegation = /\b(?:is\s+incorrect|is\s+wrong|is\s+false|are\s+incorrect|are\s+wrong|not\s+the\s+correct|cannot\s+be|never)\b|غير\s+صحيح|إجابة\s+خاطئة|خاطئ\s+لأن/i.test(firstSentence);
  if (hasOpeningNegation) return currentIndex;

  const stemRoots = new Set(extractRootTokens(questionStem));
  const optTokenSets = options.map((opt) => new Set(extractRootTokens(optionText(opt)).filter((t) => !stemRoots.has(t))));

  // Identify tokens strictly unique to each option i
  const uniqueOptTokens = optTokenSets.map((set, i) =>
    [...set].filter((tok) => optTokenSets.every((otherSet, j) => i === j || !otherSet.has(tok)))
  );

  // Require at least the candidate and current option to have distinctive tokens
  const firstSentRoots = new Set(extractRootTokens(firstSentence));
  const allExpRoots = new Set(extractRootTokens(expText));

  const firstSentHits = uniqueOptTokens.map((tokens) => tokens.filter((t) => firstSentRoots.has(t)).length);
  const totalExpHits = uniqueOptTokens.map((tokens) => tokens.filter((t) => allExpRoots.has(t)).length);

  const safeCurrent = currentIndex >= 0 && currentIndex < options.length ? currentIndex : 0;
  if (firstSentHits[safeCurrent] > 0) {
    return safeCurrent;
  }

  // Find options that have unique keyword hits in the opening thesis sentence
  const positiveCandidates = [];
  for (let i = 0; i < options.length; i++) {
    if (firstSentHits[i] > 0 && uniqueOptTokens[i].length > 0) {
      positiveCandidates.push(i);
    }
  }

  if (positiveCandidates.length === 1) {
    const candidateIdx = positiveCandidates[0];
    const laterText = sentences.slice(1).join(" ");
    const laterRoots = new Set(extractRootTokens(laterText));
    const currentInLater = uniqueOptTokens[safeCurrent]?.some((t) => laterRoots.has(t));
    const currentAbsentEverywhere = totalExpHits[safeCurrent] === 0 && uniqueOptTokens[safeCurrent]?.length > 0;
    const isOneBasedOffset = safeCurrent === candidateIdx + 1;

    if (currentInLater || currentAbsentEverywhere || isOneBasedOffset) {
      return candidateIdx;
    }
  }

  return safeCurrent;
}

function findCorrectIndex(item, options) {
  // 1. Check explicit text answer field first (prevents 1-based vs 0-based numeric index off-by-one bugs)
  const textCandidates = [item?.correct_answer_text, item?.correct_option_text, item?.correct_answer, item?.answer];
  for (const cand of textCandidates) {
    if (typeof cand === "string") {
      const trimmed = cand.trim();
      if (trimmed.length >= 2 && !/^\d+$/.test(trimmed) && !/^[\(\[]?[A-Fa-fأابجدهو][\)\].:-]?$/.test(trimmed)) {
        const target = normalizedStem(trimmed);
        const exactIdx = (options || []).findIndex((opt) => normalizedStem(optionText(opt)) === target);
        if (exactIdx >= 0) return exactIdx;
      }
    }
  }

  const indexedFields = ["correct_index", "correctIndex", "correctOption", "answer_index", "answerIndex"];
  for (const field of indexedFields) {
    if (item?.[field] !== undefined && item?.[field] !== null) return parseCorrectIndex(item[field], options, true);
  }
  const marked = options.findIndex((option) => option && typeof option === "object" && coerceBoolean(option.is_correct ?? option.correct ?? option.isCorrect, false));
  if (marked >= 0) return marked;
  return parseCorrectIndex(item?.correct ?? item?.correct_answer ?? item?.answer, options, false);
}

export function reconcileQuestionAnswer(item) {
  if (!item || typeof item !== "object") return item;
  const rawOptions = Array.isArray(item.options) ? item.options : [];
  if (rawOptions.length < 2) return item;
  const options = rawOptions.map((o) => (typeof o === "object" ? optionText(o) : String(o ?? "")));
  const initialIdx = findCorrectIndex(item, options);
  const safeInitial = initialIdx >= 0 && initialIdx < options.length ? initialIdx : 0;
  const verifiedIdx = verifyIndexWithExplanation(
    options,
    safeInitial,
    item.explanation || item.exp || item.rationale || "",
    item.question || item.q || item.text || ""
  );
  if (verifiedIdx !== item.correct_index) {
    return {
      ...item,
      correct_index: verifiedIdx,
      correct: verifiedIdx,
      correctOption: verifiedIdx,
      correct_answer: options[verifiedIdx] || item.correct_answer,
    };
  }
  return item;
}

function normalizeOptions(options, correctIndex, maxOptions = 4) {
  const unique = [];
  const seen = new Set();
  const original = Array.isArray(options) ? options : [];
  const correctText = compactOption(optionText(original[correctIndex]));

  for (const option of original) {
    const text = compactOption(optionText(option));
    const key = normalizedStem(text);
    if (!text || key.length < 1 || seen.has(key)) continue;
    seen.add(key);
    unique.push(text);
  }

  let normalizedCorrect = correctText
    ? unique.findIndex((option) => normalizedStem(option) === normalizedStem(correctText))
    : -1;

  if (unique.length > maxOptions) {
    const kept = unique.slice(0, maxOptions);
    if (normalizedCorrect >= maxOptions) {
      kept[maxOptions - 1] = unique[normalizedCorrect];
      normalizedCorrect = maxOptions - 1;
    }
    return { options: kept, correctIndex: normalizedCorrect };
  }

  return { options: unique, correctIndex: normalizedCorrect };
}

function parseQuizInput(raw) {
  if (raw && typeof raw === "object") return raw;
  const value = String(raw || "").replace(/^\s*```(?:json)?/i, "").replace(/```\s*$/i, "").trim();
  if (!value) return {};
  try {
    return JSON.parse(value);
  } catch {
    return {};
  }
}

function evidenceKey(value = "") {
  return String(value)
    .toLowerCase()
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[\u0640]/g, "")
    .replace(/[^a-z0-9\u0600-\u06FF]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function sourcePages(value = "") {
  return new Set(
    [...String(value).matchAll(/\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/gi)]
      .map((match) => Number(match[1]))
      .filter(Number.isFinite),
  );
}

function normalizeSourceRef(value = "", sourceText = "", fallback = "") {
  const ref = compact(value || fallback).slice(0, 160);
  if (!ref) return "";
  const page = ref.match(/(?:صفحة|page)\s*[:#-]?\s*(\d+)/i)?.[1];
  if (!page) return ref;
  const pages = sourcePages(sourceText);
  return !pages.size || pages.has(Number(page)) ? ref : "";
}

function factId(value = "") {
  let hash = 2166136261;
  for (const char of evidenceKey(value)) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return value ? `fact_${(hash >>> 0).toString(36)}` : "";
}

function normalizeDifficulty(value, fallback = "mixed") {
  const safe = String(value || fallback).toLowerCase();
  if (/easy|سهل|recall|remember/.test(safe)) return "easy";
  if (/hard|صعب|analysis|analy/.test(safe)) return "hard";
  if (/medium|متوسط|apply|application/.test(safe)) return "medium";
  return fallback === "hard" || fallback === "easy" ? fallback : "medium";
}

/**
 * P0.2 Distractor Symmetry Check
 * Evaluates option length and word count to prevent "the longest option is always correct" giveaway.
 */
export function checkDistractorSymmetry(options = [], correctIndex = 0) {
  if (!options || options.length < 3) {
    return { flaggedForAsymmetry: false, asymmetryReason: null, wordCounts: [] };
  }

  const wordCounts = options.map((opt) => String(opt || "").trim().split(/\s+/).filter(Boolean).length);
  const correctWords = wordCounts[correctIndex] ?? 0;

  const distractorsWords = wordCounts.filter((_, idx) => idx !== correctIndex);
  const avgDistractorWords = distractorsWords.length > 0
    ? distractorsWords.reduce((sum, w) => sum + w, 0) / distractorsWords.length
    : correctWords;

  const maxWords = Math.max(...wordCounts);
  const minWords = Math.min(...wordCounts);

  // Check 1: Correct option is obviously longer than average distractor (> 1.55x) with at least 4 more words
  const isCorrectObviouslyLongest = correctWords >= maxWords && (
    (avgDistractorWords > 0 && correctWords >= avgDistractorWords * 1.55 && correctWords - avgDistractorWords >= 4) ||
    (minWords > 0 && (maxWords - minWords) / maxWords > 0.50 && correctWords - minWords >= 5)
  );

  // Check 2: Extreme general length disparity among options (> 70% disparity)
  const isExtremeVariance = minWords > 0 && (maxWords - minWords) / maxWords > 0.70;

  if (isCorrectObviouslyLongest || isExtremeVariance) {
    return {
      flaggedForAsymmetry: true,
      asymmetryReason: isCorrectObviouslyLongest
        ? "الإجابة الصحيحة أطول ومفصلة بشكل ملحوظ مقارنة بباقي الخيارات"
        : "تفاوت كبير في أطوال الخيارات قد يكشف الإجابة بالنظر",
      wordCounts,
    };
  }

  return { flaggedForAsymmetry: false, asymmetryReason: null, wordCounts };
}

export function normalizeQuizResult(raw, {
  desiredCount = 10,
  mode = "generate",
  sourceAnalysis = null,
  difficulty = "mixed",
  requireExplanation = false,
  sourceText = "",
  defaultSourceRef = "",
} = {}) {
  const parsed = parseQuizInput(raw);
  const input = Array.isArray(parsed) ? parsed : parsed?.questions;
  const questions = Array.isArray(input) ? input : [];
  const accepted = [];
  const seenQuestions = [];
  let invalidRemoved = 0;
  let duplicatesRemoved = 0;
  let missingExplanations = 0;
  let invalidEvidenceRemoved = 0;
  const normalizedSource = evidenceKey(sourceText);

  for (const item of questions) {
    const question = compact(item?.question || item?.prompt || item?.title || item?.text || "");
    const rawOptions = item?.options || item?.choices || item?.answers || [];
    const initialCorrect = findCorrectIndex(item, rawOptions);
    const { options, correctIndex: rawCorrectIndex } = normalizeOptions(rawOptions, initialCorrect, mode === "generate" ? 4 : 6);
    const stem = normalizedStem(question);

    const explanation = compact(item?.explanation || item?.reason || item?.rationale || "");
    const correctIndex = verifyIndexWithExplanation(options, rawCorrectIndex, explanation, question);
    const minimumOptions = mode === "generate" ? 4 : 2;
    if (
      !question ||
      stem.length < 8 ||
      options.length < minimumOptions ||
      correctIndex < 0 ||
      correctIndex >= options.length
    ) {
      invalidRemoved += 1;
      continue;
    }
    if (seenQuestions.some((seen) => stemSimilarity(seen, stem) >= 0.76)) {
      duplicatesRemoved += 1;
      continue;
    }
    seenQuestions.push(stem);

    if (requireExplanation && explanation.length < 8) missingExplanations += 1;
    let sourceEvidence = compact(item?.source_evidence || item?.evidence || item?.source_quote || "");
    if (sourceEvidence && normalizedSource && !normalizedSource.includes(evidenceKey(sourceEvidence))) {
      sourceEvidence = "";
      invalidEvidenceRemoved += 1;
    }

    const symmetry = checkDistractorSymmetry(options, correctIndex);
    const sourceRef = normalizeSourceRef(item?.source_ref || item?.source || item?.page_ref, sourceText, defaultSourceRef);
    const knowledgeBased = coerceBoolean(item?.knowledge_based, false)
      || Boolean(sourceAnalysis?.has_answers === false && !sourceEvidence);
    const answerConfidence = Math.max(0, Math.min(1, Number(item?.answer_confidence ?? item?.confidence) || (sourceEvidence ? 0.9 : 0.55)));
    const needsReview = coerceBoolean(item?.needs_review, false)
      || knowledgeBased
      || symmetry.flaggedForAsymmetry
      || (requireExplanation && explanation.length < 8)
      || (!sourceEvidence && mode !== "extract");

    accepted.push({
      question,
      options,
      correct_index: correctIndex,
      explanation,
      difficulty: normalizeDifficulty(item?.difficulty, difficulty),
      topic: compact(item?.topic || item?.chapter || ""),
      source_ref: sourceRef,
      source_evidence: sourceEvidence,
      source_fact_id: factId(sourceEvidence),
      knowledge_based: knowledgeBased,
      answer_confidence: Number(answerConfidence.toFixed(2)),
      needs_review: needsReview,
      type: options.length === 2 ? "true_false" : "mcq",
      flaggedForAsymmetry: symmetry.flaggedForAsymmetry,
      asymmetryReason: symmetry.asymmetryReason || null,
    });
  }

  const requested = Math.max(1, Math.min(QUIZ_MAX_QUESTIONS, Number(desiredCount) || 10));
  const limit = mode === "extract" && sourceAnalysis?.question_count
    ? Math.min(QUIZ_MAX_QUESTIONS, Math.max(requested, Number(sourceAnalysis.question_count) || requested))
    : requested;
  const finalQuestions = accepted.slice(0, limit);
  const coverageRate = requested ? Math.min(1, finalQuestions.length / requested) : 0;
  const validityRate = questions.length ? Math.min(1, accepted.length / questions.length) : 0;
  const evidenceCount = finalQuestions.filter((question) => question.source_evidence).length;
  const evidenceRate = finalQuestions.length ? evidenceCount / finalQuestions.length : 0;
  const reviewCount = finalQuestions.filter((question) => question.needs_review).length;

  return {
    questions: finalQuestions,
    stats: {
      requested,
      returned: questions.length,
      accepted: finalQuestions.length,
      invalid_removed: invalidRemoved,
      duplicates_removed: duplicatesRemoved,
      explanations_missing: missingExplanations,
      invalid_source_evidence_removed: invalidEvidenceRemoved,
      evidence_coverage_rate: Number(evidenceRate.toFixed(2)),
      needs_review: reviewCount,
      coverage_rate: Number(coverageRate.toFixed(2)),
      quality_score: Math.round((coverageRate * 0.55 + validityRate * 0.3 + evidenceRate * 0.15) * 100),
      source_type: sourceAnalysis?.source_type || "unknown",
      mode,
      difficulty_mix: finalQuestions.reduce((acc, q) => {
        acc[q.difficulty] = (acc[q.difficulty] || 0) + 1;
        return acc;
      }, {}),
    },
  };
}

function shouldRetryQuizChunk(error) {
  const message = String(error?.response?.data?.error || error?.message || error || "");
  return !/(?:UNAUTHORIZED|FORBIDDEN|NO_API_KEY|INVALID_ARGUMENT|INSUFFICIENT_CREDITS)/i.test(message);
}

export async function runQuizChunkPool(chunks, worker, {
  concurrency = 2,
  retries = 1,
  onProgress,
  shouldCancel = () => false,
} = {}) {
  const input = Array.isArray(chunks) ? chunks : [];
  const results = new Array(input.length);
  let cursor = 0;
  let completed = 0;

  const runner = async () => {
    while (cursor < input.length && !shouldCancel()) {
      const index = cursor;
      cursor += 1;
      let attempt = 0;
      while (attempt <= retries && !shouldCancel()) {
        try {
          results[index] = { ok: true, value: await worker(input[index], index, attempt), attempts: attempt + 1 };
          break;
        } catch (error) {
          const retry = attempt < retries && shouldRetryQuizChunk(error) && !shouldCancel();
          if (!retry) {
            results[index] = { ok: false, error, attempts: attempt + 1 };
            break;
          }
          await new Promise((resolve) => setTimeout(resolve, 400 * (attempt + 1)));
          attempt += 1;
        }
      }
      completed += 1;
      onProgress?.({ completed, total: input.length, index, result: results[index] });
    }
  };

  const workerCount = Math.max(1, Math.min(4, Number(concurrency) || 1, input.length || 1));
  await Promise.all(Array.from({ length: workerCount }, () => runner()));
  const settled = results.filter(Boolean);
  return {
    results,
    values: settled.filter((item) => item.ok).map((item) => item.value),
    failures: settled.filter((item) => !item.ok),
    completed,
    cancelled: shouldCancel(),
  };
}

export function buildQuizPerformance(questions = [], answers = []) {
  const byTopic = new Map();
  const byDifficulty = new Map();
  let correct = 0;

  questions.forEach((q, index) => {
    const picked = answers[index];
    const ok = picked === (q.correct_index ?? q.correct);
    if (ok) correct += 1;
    const topic = q.topic || "General";
    const difficulty = q.difficulty || "mixed";
    for (const [map, key] of [[byTopic, topic], [byDifficulty, difficulty]]) {
      const item = map.get(key) || { key, total: 0, correct: 0, wrong: 0, examples: [] };
      item.total += 1;
      if (ok) item.correct += 1;
      else {
        item.wrong += 1;
        if (item.examples.length < 3) item.examples.push(q.question);
      }
      map.set(key, item);
    }
  });

  const shape = (item) => ({
    ...item,
    percentage: item.total ? Math.round((item.correct / item.total) * 100) : 0,
  });
  const topics = [...byTopic.values()].map(shape).sort((a, b) => b.wrong - a.wrong || a.percentage - b.percentage);
  const difficulties = [...byDifficulty.values()].map(shape).sort((a, b) => b.wrong - a.wrong || a.percentage - b.percentage);
  const weakTopics = topics.filter((item) => item.wrong > 0).slice(0, 4);

  return {
    total: questions.length,
    correct,
    wrong: Math.max(0, questions.length - correct),
    percentage: questions.length ? Math.round((correct / questions.length) * 100) : 0,
    topics,
    difficulties,
    weakTopics,
  };
}

/**
 * Normalizes output from the Universal Free Text Exam Parser (Track G / PROMPTS.textExamParser).
 * Ensures zero data loss, supports 2 to 6 options, matches labels, flags missing answers,
 * and audits distractor symmetry without blocking any question.
 */
export function normalizeUniversalParsedQuiz(rawResult, sourceText = "") {
  const rawList = Array.isArray(rawResult)
    ? rawResult
    : Array.isArray(rawResult?.questions)
    ? rawResult.questions
    : [];

  const ARABIC_LETTERS = ["أ", "ب", "ج", "د", "هـ", "و"];
  const ENGLISH_LETTERS = ["a", "b", "c", "d", "e", "f"];

  const normalized = rawList.map((q, idx) => {
    const questionStem = String(q.question_text || q.question || "").trim();

    // 1. Process options: can be array of strings or array of { label, text }
    const rawOptions = Array.isArray(q.options) ? q.options : [];
    const options = rawOptions.map((opt) => {
      if (typeof opt === "string") return opt.trim();
      if (opt && typeof opt === "object") {
        const text = String(opt.text || opt.title || opt.value || "").trim();
        const label = String(opt.label || "").trim();
        if (label && (text.startsWith(`${label}`) || text.startsWith(`${label})`) || text.startsWith(`${label}.`))) {
          return text;
        }
        return label ? `${label}) ${text}` : text;
      }
      return String(opt || "").trim();
    }).filter(Boolean);

    // 2. Identify correct index based on correct_answer_label
    const targetLabel = String(q.correct_answer_label || q.answer || "").trim().toLowerCase();
    let correctIndex = -1;

    if (targetLabel) {
      rawOptions.forEach((opt, optIdx) => {
        if (correctIndex !== -1) return;
        const optLabel = typeof opt === "object" ? String(opt.label || "").trim().toLowerCase() : "";
        const optText = typeof opt === "string" ? opt.toLowerCase() : String(opt?.text || "").toLowerCase();

        if (optLabel && (optLabel === targetLabel || optLabel.replace(/[\)\.\:]/g, "").trim() === targetLabel.replace(/[\)\.\:]/g, "").trim())) {
          correctIndex = optIdx;
        } else if (optText.startsWith(`${targetLabel})`) || optText.startsWith(`${targetLabel}.`)) {
          correctIndex = optIdx;
        }
      });

      if (correctIndex === -1) {
        const cleanLabel = targetLabel.replace(/[\)\.\:\-]/g, "").trim();
        const engIdx = ENGLISH_LETTERS.indexOf(cleanLabel);
        if (engIdx !== -1 && engIdx < options.length) correctIndex = engIdx;
        const arIdx = ARABIC_LETTERS.indexOf(cleanLabel);
        if (arIdx !== -1 && arIdx < options.length) correctIndex = arIdx;
        const numIdx = parseInt(cleanLabel, 10);
        if (!isNaN(numIdx) && numIdx >= 1 && numIdx <= options.length) correctIndex = numIdx - 1;
      }
    }

    if (correctIndex === -1 && typeof q.correct_index === "number" && q.correct_index >= 0 && q.correct_index < options.length) {
      correctIndex = q.correct_index;
    }

    const needsReview = Boolean(
      q.needs_review ||
      correctIndex === -1 ||
      options.length < 2 ||
      !questionStem
    );

    const reviewReason = q.review_reason || (
      correctIndex === -1
        ? "لم يتم العثور على الإجابة الصحيحة في النص الأصلي — حدد الإجابة يدوياً بنقرة واحدة"
        : options.length < 2
        ? "السؤال يحتوي على أقل من خيارين"
        : null
    );

    const symmetry = checkDistractorSymmetry(options, correctIndex);

    return {
      id: `uq_${Date.now()}_${idx}`,
      question: questionStem || `سؤال ${idx + 1}`,
      options,
      correct_index: correctIndex,
      correct: correctIndex,
      explanation: q.explanation || "",
      difficulty: q.difficulty || "medium",
      type: "mcq",
      needs_review: needsReview,
      review_reason: reviewReason,
      flaggedForAsymmetry: symmetry.flaggedForAsymmetry,
      asymmetryReason: symmetry.asymmetryReason,
      source_ref: q.source_ref || null,
      source_evidence: q.source_evidence || "",
    };
  });

  const needsReviewCount = normalized.filter((q) => q.needs_review).length;

  return {
    questions: normalized,
    summary: {
      total_found: normalized.length,
      needs_review_count: needsReviewCount,
      success: normalized.length > 0,
    },
  };
}
