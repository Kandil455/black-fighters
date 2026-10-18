/**
 * offlineExamParser.js
 * High-performance client-side regular expression engine to extract MCQs
 * directly from formatted documents without AI (0 credits, 0 tokens).
 * 
 * Supports:
 * - Standard English & Arabic numbering (1, 2, 3 and ١، ٢، ٣)
 * - Standard option prefixes: A), B), C), D) / (A), (B) / a., b. / أ), ب), ج), د)
 * - Inline answers: "Answer: C", "Correct Answer: B", "الإجابة الصحيحة: ج", "الحل: ب", "[x]", "(✓)", or full option text
 * - Inline or multi-line explanations with automatic answer-explanation reconciliation
 * - Separated Answer Keys at the end of files (e.g. "Answers: 1.A 2.B 3.C...")
 */

import { matchTextAgainstOptions, verifyIndexWithExplanation } from "@/lib/quizQuality";

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
  "أ": 0, "ا": 0, "إ": 0, "ب": 1, "ج": 2, "د": 3, "هـ": 4, "ه": 4, "و": 5,
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
    /(?:answer\s*keys?|answers|model\s*answers?|key\s*answers?|correct\s*answers?|مفتاح\s*الإجابات?|مفتاح\s*الاجابات?|الإجابات\s*الصحيحة|الاجابات\s*الصحيحة|الإجابات?|الاجابات?|نموذج\s*الإجابة|نموذج\s*الاجابة|الحلول|حلول\s*الأسئلة)\s*[:\-\n]+([\s\S]+)$/i
  );

  const searchScope = sectionMatch ? sectionMatch[1] : normalized;

  // Pattern 1: "1. B" or "1) C" or "1 - A" or "1: D"
  const pairRegex = /(?:^|\s|[,;\t|])(?:Q|س)?\s*(\d{1,4})\s*[\).:\-–=]\s*[\(\[]?([A-Fa-fأابجدهو]|هـ)[\)\]]?(?=[\s,;\t\n|]|$)/gi;
  let match;
  while ((match = pairRegex.exec(searchScope)) !== null) {
    const qNum = parseInt(match[1], 10);
    const letter = match[2];
    const mapped = LETTER_TO_INDEX[letter] ?? LETTER_TO_INDEX[letter.toLowerCase()];
    if (mapped !== undefined && qNum > 0 && qNum < 2000) {
      answerMap.set(qNum, mapped);
    }
  }

  // Pattern 2: Compact table "1-B 2-C 3-A"
  if (answerMap.size === 0) {
    const compactRegex = /(\d{1,4})\s*-\s*([A-Fa-fأابجدهو]|هـ)/g;
    while ((match = compactRegex.exec(searchScope)) !== null) {
      const qNum = parseInt(match[1], 10);
      const letter = match[2];
      const mapped = LETTER_TO_INDEX[letter] ?? LETTER_TO_INDEX[letter.toLowerCase()];
      if (mapped !== undefined) {
        answerMap.set(qNum, mapped);
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
 * A) Option text / *A) Option text / ✓ B) Option text / (B) Option text / أ) نص الخيار
 */
function parseOptionLine(line = "") {
  const trimmed = line.trim();
  const leadingCheckMatch = trimmed.match(/^(?:[✓✔✅☑★*•]+|\([✓✔✅xX*]\)|\[[✓✔✅xX*]\])\s*(.+)$/);
  const hasLeadingMark = Boolean(leadingCheckMatch);
  const coreLine = leadingCheckMatch ? leadingCheckMatch[1].trim() : trimmed;

  const match = coreLine.match(
    /^[\(\[]?([A-Fa-fأابجدهو1-6]|هـ)[\)\].:\-–]\s*(.+)$/i
  );
  if (!match) return null;

  const rawLetter = match[1];
  const text = match[2].trim();
  const index = LETTER_TO_INDEX[rawLetter] ?? LETTER_TO_INDEX[rawLetter.toLowerCase()];

  // Check if option is marked correct inline (e.g. "Option [x]" or "Option (✓)" or "Option (correct)" or "**Option**")
  const isMarkedCorrect =
    hasLeadingMark ||
    /(?:\[[xX✓✔✅*]\]|\([xX✓✔✅*]\)|[✓✔✅☑]|(?:\(\s*(?:إجابة\s*صحيحة|اجابة\s*صحيحة|صحيح|صحيحة|correct|true|right)\s*\))|(?:إجابة\s*صحيحة|اجابة\s*صحيحة|correct\s*answer|correct)\s*[\)\]]?\s*$)/i.test(text);

  const cleanText = text
    .replace(/(?:\[[xX✓✔✅*]\]|\([xX✓✔✅*]\)|[✓✔✅☑]|(?:\(\s*(?:إجابة\s*صحيحة|اجابة\s*صحيحة|صحيح|صحيحة|correct|true|right)\s*\))|(?:إجابة\s*صحيحة|اجابة\s*صحيحة|correct\s*answer|correct)\s*[\)\]]?\s*$)/gi, "")
    .replace(/^\*\*(.+)\*\*$/, "$1")
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
 * e.g. "Answer: B", "Correct Answer: C", "الإجابة الصحيحة: أ", "الجواب الصحيح: (ب) لأن...", "Answer: Mitral stenosis"
 * Returns { index: number, inlineExplanation: string } or null
 */
function parseInlineAnswerLine(line = "", currentOptions = []) {
  const trimmed = normalizeDigits(line.trim());
  const prefixMatch = trimmed.match(
    /^(?:the\s+)?(?:correct\s*(?:answer|option|choice)|right\s*(?:answer|option|choice)|model\s*answer|ans(?:wer)?|sol(?:ution)?|key|(?:الإجابة|الاجابة|الجواب|الحل|الخيار|الاختيار|الرمز)\s*(?:الصحيحة|الصحيح|النموذجية|النموذجي|الأدق|الادق|السليم)?|الإجابة|الاجابة|الجواب|الحل)(?:\s+(?:is|are|هي|هو))?\s*[:\-–—=]\s*(.+)$/i
  );

  const body = prefixMatch ? prefixMatch[1].trim() : null;
  if (!body) return null;

  // Split potential inline explanation: e.g. "B - Because ..." or "ج لأن ..." or "B (Explanation: ...)"
  let answerPart = body;
  let inlineExplanation = "";

  const expSplitMatch = body.match(
    /^([^\n]+?)\s*(?:[-–—]\s*|\(\s*(?:explanation|reason|الشرح|التفسير|لأن|لان)\s*[:\-]?\s*|\b(?:because|since|لأن|لان|حيث\s+أن|حيث\s+ان|وذلك\s+لأن)\b\s*)(.+)$/i
  );
  if (expSplitMatch) {
    answerPart = expSplitMatch[1].trim();
    inlineExplanation = expSplitMatch[2].replace(/\)\s*$/, "").trim();
  }

  // 1. Check if answerPart starts with or is a letter/number label: e.g. "B", "(C)", "Option B", "ب", "B) Mitral stenosis"
  const pureLetter = answerPart.match(
    /^(?:(?:option|choice|خيار|الخيار|الاختيار|حرف)\s*)?[\(\[«"']?([A-Fa-fأابجدهو1-6]|هـ)[\)\]»"'.:\-]?$/i
  );
  if (pureLetter?.[1]) {
    const l = pureLetter[1];
    const idx = LETTER_TO_INDEX[l] ?? LETTER_TO_INDEX[l.toLowerCase()];
    if (idx !== undefined) {
      return { index: idx, inlineExplanation };
    }
  }

  // 2. Match against currentOptions by text (handles "B) Mitral stenosis" OR "Mitral stenosis" OR "تضيق الصمام")
  if (Array.isArray(currentOptions) && currentOptions.length >= 2) {
    const textIdx = matchTextAgainstOptions(answerPart, currentOptions);
    if (textIdx >= 0 && textIdx < currentOptions.length) {
      return { index: textIdx, inlineExplanation };
    }
  }

  // 3. Fallback: if answerPart starts with "B) ..." or "ب - ..." before options were matched
  const leadingLetter = answerPart.match(/^[\(\[]?([A-Fa-fأابجدهو1-6]|هـ)[\)\].:\-–]\s+(.+)$/i);
  if (leadingLetter?.[1]) {
    const l = leadingLetter[1];
    const idx = LETTER_TO_INDEX[l] ?? LETTER_TO_INDEX[l.toLowerCase()];
    if (idx !== undefined) {
      return { index: idx, inlineExplanation };
    }
  }

  return null;
}

/**
 * Checks if a line starts a new question:
 * e.g. "1. Which of the following...", "Q12) What is...", "س 5: ما هو...", "السؤال الأول: ..."
 */
function parseQuestionHeader(line = "") {
  const trimmed = normalizeDigits(line.trim());
  const match = trimmed.match(
    /^(?:(?:question|q|سؤال|السؤال|س)\s*[:\-\.#]?\s*)?(\d{1,4})\s*[\).:\-–]\s*(.+)$/i
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
  let inExplanationBlock = false;
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
      inExplanationBlock = false;
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

    // Check for inline answer line
    const inlineAns = parseInlineAnswerLine(line, currentQuestion.options);
    if (inlineAns !== null && inlineAns !== undefined) {
      currentQuestion.correctIndex = inlineAns.index;
      if (inlineAns.inlineExplanation && !currentQuestion.explanation) {
        currentQuestion.explanation = inlineAns.inlineExplanation;
      }
      inExplanationBlock = Boolean(inlineAns.inlineExplanation);
      continue;
    }

    // Check for explanation line
    const expMatch = line.match(
      /^(?:explanation|reason|rationale|justification|note|الشرح|التفسير|السبب|التعليل|توضيح|ملاحظة)\s*[:\-–—]\s*(.+)$/i
    );
    if (expMatch) {
      currentQuestion.explanation = currentQuestion.explanation
        ? `${currentQuestion.explanation} ${expMatch[1].trim()}`
        : expMatch[1].trim();
      inExplanationBlock = true;
      continue;
    }

    // Check for option line
    const opt = parseOptionLine(line);
    if (opt && opt.text.length > 0) {
      inExplanationBlock = false;
      currentQuestion.options.push(opt.text);
      if (opt.isMarkedCorrect) {
        currentQuestion.correctIndex = currentQuestion.options.length - 1;
      }
      continue;
    }

    // If inside an explanation block (after options), append continuation lines to explanation
    if (inExplanationBlock && currentQuestion.options.length >= 2) {
      currentQuestion.explanation = `${currentQuestion.explanation} ${line}`.trim();
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

  // 2. Link separated Answer Key from end of file AND reconcile with explanation!
  let matchedAnswersCount = 0;
  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];

    // If no inline answer, check end-of-file answer key
    if (q.correctIndex < 0 || q.correctIndex >= q.options.length) {
      const lookupKey = q.questionNumber || (i + 1);
      if (answerMap.has(lookupKey)) {
        const mappedIdx = answerMap.get(lookupKey);
        if (mappedIdx >= 0 && mappedIdx < q.options.length) {
          q.correctIndex = mappedIdx;
        }
      } else if (answerMap.has(i + 1)) {
        const mappedIdx = answerMap.get(i + 1);
        if (mappedIdx >= 0 && mappedIdx < q.options.length) {
          q.correctIndex = mappedIdx;
        }
      }
    }

    // 3. Reconcile or deduce answer from explanation if explanation is present!
    if (q.explanation && q.explanation.trim().length >= 6) {
      const reconciledIdx = verifyIndexWithExplanation(
        q.options,
        q.correctIndex >= 0 && q.correctIndex < q.options.length ? q.correctIndex : 0,
        q.explanation,
        q.question
      );
      if (q.correctIndex >= 0 && q.correctIndex < q.options.length) {
        q.correctIndex = reconciledIdx;
      } else {
        // Question had no explicit answer key, check if explanation explicitly declares or proves an option
        const probeFrom0 = verifyIndexWithExplanation(q.options, 0, q.explanation, q.question);
        const probeFrom1 = verifyIndexWithExplanation(q.options, 1, q.explanation, q.question);
        if (probeFrom0 === probeFrom1 && probeFrom0 >= 0 && probeFrom0 < q.options.length) {
          q.correctIndex = probeFrom0;
        }
      }
    }

    if (q.correctIndex >= 0 && q.correctIndex < q.options.length) {
      matchedAnswersCount += 1;
    }
  }

  const answeredRatio = questions.length > 0 ? matchedAnswersCount / questions.length : 0;
  const fourOptionRatio = questions.filter((q) => q.options.length >= 3).length / questions.length;

  // Confidence metric: based on questions found, answer availability, and standard options
  const confidence = Math.min(
    1.0,
    Number((fourOptionRatio * 0.45 + answeredRatio * 0.45 + (questions.length >= 3 ? 0.1 : 0.05)).toFixed(2))
  );

  // Only mark 0-credit offline extraction as ready for direct use when answers are actually present (>= 85%),
  // otherwise let AI solve the unanswered questions so we never default unanswered questions to Option A!
  const isHighConfidence =
    questions.length >= 2 &&
    answeredRatio >= 0.85 &&
    confidence >= 0.72;

  return {
    success: isHighConfidence,
    confidence,
    questions: questions.map((q, idx) => {
      const hasVerified = q.correctIndex >= 0 && q.correctIndex < q.options.length;
      const safeIdx = hasVerified ? q.correctIndex : 0;
      return {
        id: `offline_q_${idx + 1}`,
        question: q.question.trim(),
        options: q.options,
        correct_index: safeIdx,
        correct: safeIdx,
        correct_answer: q.options[safeIdx] || "",
        hasVerifiedAnswer: hasVerified,
        needs_review: !hasVerified,
        review_reason: !hasVerified ? "لم يتم العثور على مفتاح إجابة صريح لهذا السؤال" : null,
        explanation: q.explanation || `الإجابة الصحيحة هي (${q.options[safeIdx] || ""}) وفقاً لنموذج الامتحان المرفق.`,
        difficulty: "medium",
        source_ref: `سؤال رقم ${q.questionNumber || idx + 1}`,
        type: q.options.length === 2 ? "true_false" : "mcq",
        isOfflineExtracted: true,
      };
    }),
    stats: {
      totalFound: questions.length,
      answeredCount: matchedAnswersCount,
      unansweredCount: questions.length - matchedAnswersCount,
      hasEndAnswerKey: answerMap.size > 0,
      creditsCost: 0, // 0 CREDITS!
    },
  };
}

