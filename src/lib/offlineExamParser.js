/**
 * offlineExamParser.js
 * High-performance client-side regular expression engine to extract MCQs
 * directly from formatted documents without AI (0 credits, 0 tokens).
 * 
 * Supports:
 * - Standard English & Arabic numbering (1, 2, 3 and ١، ٢، ٣)
 * - Standard option prefixes: A), B), C), D) / (A), (B) / a., b. / أ), ب), ج), د)
 * - Inline answers: "Answer: C", "Correct: B", "الإجابة: ج", "الحل: ب", "[x]", "(✓)"
 * - Separated Answer Keys at the end of files (e.g. "Answers: 1.A 2.B 3.C...")
 * - Confidence scoring and mixed document separation.
 */

// Arabic to Western numeral mapping
const ARABIC_INDIC_DIGITS = {
  "٠": "0", "١": "1", "٢": "2", "٣": "3", "٤": "4",
  "٥": "5", "٦": "6", "٧": "7", "٨": "8", "٩": "9"
};

export function normalizeDigits(str = "") {
  return String(str).replace(/[٠-٩]/g, (d) => ARABIC_INDIC_DIGITS[d] || d);
}

const LETTER_TO_INDEX = {
  a: 0, b: 1, c: 2, d: 3, e: 4, f: 5,
  A: 0, B: 1, C: 2, D: 3, E: 4, F: 5,
  "أ": 0, "ا": 0, "ب": 1, "ج": 2, "د": 3, "هـ": 4, "ه": 4, "و": 5,
  "1": 0, "2": 1, "3": 2, "4": 3, "5": 4, "6": 5,
  "١": 0, "٢": 1, "٣": 2, "٤": 3, "٥": 4, "٦": 5,
};

/**
 * Parses separate Answer Key blocks typically placed at the end of exams:
 * e.g. "Answer Key:\n1. B\n2. C\n3. A" or "1-B, 2-C, 3-A" or "Answers: 1:B 2:D"
 */
export function extractEndAnswerKeys(text = "") {
  const answerMap = new Map(); // questionNumber (1-based) -> optionIndex (0-based)
  const normalized = normalizeDigits(text);

  // Search for an Answer Key section
  const sectionMatch = normalized.match(
    /(?:answer\s*key|answers|model\s*answer|key\s*answers?|مفتاح\s*الإجابات?|الإجابات?|الاجابات?|نموذج\s*الإجابة|الحلول|حلول\s*الأسئلة)\s*[:\-\n]+([\s\S]+)$/i
  );

  const searchScope = sectionMatch ? sectionMatch[1] : normalized;

  // Pattern 1: "1. B" or "1) C" or "1 - A" or "1: D"
  const pairRegex = /(?:^|\s|[,;\t])(\d{1,4})\s*[\).:\-–]\s*\(?([A-Fa-fأابجدهو])\)?(?=[\s,;\t\n]|$)/g;
  let match;
  while ((match = pairRegex.exec(searchScope)) !== null) {
    const qNum = parseInt(match[1], 10);
    const letter = match[2];
    if (LETTER_TO_INDEX[letter] !== undefined && qNum > 0 && qNum < 2000) {
      answerMap.set(qNum, LETTER_TO_INDEX[letter]);
    }
  }

  // Pattern 2: Compact table "1-B 2-C 3-A"
  if (answerMap.size === 0) {
    const compactRegex = /(\d{1,4})\s*-\s*([A-Fa-fأابجدهو])/g;
    while ((match = compactRegex.exec(searchScope)) !== null) {
      const qNum = parseInt(match[1], 10);
      const letter = match[2];
      if (LETTER_TO_INDEX[letter] !== undefined) {
        answerMap.set(qNum, LETTER_TO_INDEX[letter]);
      }
    }
  }

  return {
    answerMap,
    hasAnswerSection: Boolean(sectionMatch),
    cleanTextWithoutAnswerSection: sectionMatch
      ? normalized.slice(0, sectionMatch.index).trim()
      : normalized,
  };
}

/**
 * Checks if a line is an option line:
 * A) Option text
 * a. Option text
 * (B) Option text
 * أ) Option text
 */
function parseOptionLine(line = "") {
  const trimmed = line.trim();
  const match = trimmed.match(
    /^[\(\[]?([A-Fa-fأابجدهو1-6])[\)\].:\-–]\s*(.+)$/i
  );
  if (!match) return null;

  const rawLetter = match[1];
  const text = match[2].trim();
  const index = LETTER_TO_INDEX[rawLetter];

  // Check if option is marked correct inline (e.g. "Option [x]" or "Option (✓)" or "Option (correct)")
  const isMarkedCorrect = /(?:\[[xX✓✔✅]\]|\([✓✔✅]\)|[✓✔✅]|(?:إجابة\s*صحيحة|correct|true)\s*[\)\]]?\s*$)/i.test(text);
  const cleanText = text
    .replace(/(?:\[[xX✓✔✅]\]|\([✓✔✅]\)|[✓✔✅]|(?:إجابة\s*صحيحة|correct|true)\s*[\)\]]?\s*$)/gi, "")
    .trim();

  return {
    letter: rawLetter,
    index,
    text: cleanText,
    isMarkedCorrect,
  };
}

/**
 * Checks if a line is an explicit answer line:
 * e.g. "Answer: B", "Ans: C", "الإجابة: أ", "Correct Answer: D"
 */
function parseInlineAnswerLine(line = "") {
  const trimmed = normalizeDigits(line.trim());
  const match = trimmed.match(
    /^(?:ans(?:wer)?|correct(?:\s*answer)?|sol(?:ution)?|الإجابة|الاجابة|الحل|الرمز\s*الصحيح)\s*[:\-\s]\s*\(?([A-Fa-fأابجدهو1-6])\)?/i
  );
  if (!match) return null;
  return LETTER_TO_INDEX[match[1]];
}

/**
 * Checks if a line starts a new question:
 * e.g. "1. Which of the following...", "Q12) What is...", "س 5: ما هو..."
 */
function parseQuestionHeader(line = "") {
  const trimmed = normalizeDigits(line.trim());
  const match = trimmed.match(
    /^(?:(?:q(?:uestion)?|س(?:ؤال)?)\s*[:\-\.]?\s*)?(\d{1,4})\s*[\).:\-–]\s*(.+)$/i
  );
  if (!match) return null;
  const qNum = parseInt(match[1], 10);
  const stem = match[2].trim();
  return { qNum, stem };
}

/**
 * Attempts to extract complete MCQs from raw document text using local regex
 * Returns: { success: boolean, questions: Array, confidence: number, stats: object }
 */
export function tryOfflineExtraction(rawText = "") {
  if (!rawText || rawText.trim().length < 40) {
    return { success: false, questions: [], confidence: 0, reason: "النص قصير جداً" };
  }

  // 1. Check for end-of-file answer keys
  const { answerMap, cleanTextWithoutAnswerSection } = extractEndAnswerKeys(rawText);
  const lines = cleanTextWithoutAnswerSection
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean);

  const questions = [];
  let currentQuestion = null;
  let qCounter = 0;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Check for question header
    const qHeader = parseQuestionHeader(line);
    if (qHeader && qHeader.stem.length > 5) {
      if (currentQuestion && currentQuestion.options.length >= 2) {
        questions.push(currentQuestion);
      }
      qCounter += 1;
      currentQuestion = {
        questionNumber: qHeader.qNum || qCounter,
        question: qHeader.stem,
        options: [],
        correctIndex: -1,
        explanation: "",
        sourceType: "offline_parser",
      };
      continue;
    }

    if (!currentQuestion) continue;

    // Check for inline answer
    const inlineAns = parseInlineAnswerLine(line);
    if (inlineAns !== null && inlineAns !== undefined) {
      currentQuestion.correctIndex = inlineAns;
      continue;
    }

    // Check for explanation line
    const expMatch = line.match(/^(?:explanation|reason|rationale|الشرح|التفسير|السبب)\s*[:\-]\s*(.+)$/i);
    if (expMatch) {
      currentQuestion.explanation = expMatch[1].trim();
      continue;
    }

    // Check for option line
    const opt = parseOptionLine(line);
    if (opt && opt.text.length > 0) {
      currentQuestion.options.push(opt.text);
      if (opt.isMarkedCorrect) {
        currentQuestion.correctIndex = currentQuestion.options.length - 1;
      }
      continue;
    }

    // If still in question stem before any options arrived, append line to question stem
    if (currentQuestion.options.length === 0 && line.length > 2) {
      currentQuestion.question += " " + line;
    }
  }

  // Push last question if valid
  if (currentQuestion && currentQuestion.options.length >= 2) {
    questions.push(currentQuestion);
  }

  if (questions.length === 0) {
    return {
      success: false,
      questions: [],
      confidence: 0,
      reason: "لم يتم التعرف على بنية أسئلة صريحة مرقمة",
    };
  }

  // 2. Link separated Answer Key from end of file if question didn't have inline answer
  let matchedAnswersCount = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    if (q.correctIndex >= 0 && q.correctIndex < q.options.length) {
      matchedAnswersCount += 1;
      continue;
    }

    // Lookup in answerMap by question number or by 1-based index
    const lookupKey = q.questionNumber || (i + 1);
    if (answerMap.has(lookupKey)) {
      const mappedIdx = answerMap.get(lookupKey);
      if (mappedIdx >= 0 && mappedIdx < q.options.length) {
        q.correctIndex = mappedIdx;
        matchedAnswersCount += 1;
        continue;
      }
    }
    if (answerMap.has(i + 1)) {
      const mappedIdx = answerMap.get(i + 1);
      if (mappedIdx >= 0 && mappedIdx < q.options.length) {
        q.correctIndex = mappedIdx;
        matchedAnswersCount += 1;
      }
    }
  }

  const answeredRatio = questions.length > 0 ? matchedAnswersCount / questions.length : 0;
  const fourOptionRatio = questions.filter((q) => q.options.length >= 3).length / questions.length;

  // Confidence metric: based on questions found, answer availability, and standard options
  const confidence = Math.min(
    1.0,
    Number((fourOptionRatio * 0.45 + answeredRatio * 0.45 + (questions.length >= 3 ? 0.1 : 0.05)).toFixed(2))
  );

  // Consider successful if we have at least 2 questions with high structure
  const isHighConfidence = confidence >= 0.70 || (questions.length >= 3 && answeredRatio >= 0.60);

  return {
    success: isHighConfidence,
    confidence,
    questions: questions.map((q, idx) => ({
      id: `offline_q_${idx + 1}`,
      question: q.question.trim(),
      options: q.options,
      correct_index: q.correctIndex >= 0 ? q.correctIndex : 0,
      hasVerifiedAnswer: q.correctIndex >= 0,
      explanation: q.explanation || "مستخرج مباشرة من نموذج الامتحان الأصلي بدون استهلاك AI.",
      difficulty: "medium",
      source_ref: `سؤال رقم ${q.questionNumber || idx + 1}`,
      type: q.options.length === 2 ? "true_false" : "mcq",
      isOfflineExtracted: true,
    })),
    stats: {
      totalFound: questions.length,
      answeredCount: matchedAnswersCount,
      unansweredCount: questions.length - matchedAnswersCount,
      hasEndAnswerKey: answerMap.size > 0,
      creditsCost: 0, // 0 CREDITS!
    },
  };
}
