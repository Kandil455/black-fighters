/**
 * src/features/lectures/ai/dynamicLectureBuilder.js
 *
 * Builds the Masterpiece Bilingual Medical Study Sheet & Summary from any lecture
 * `docModel` (instant zero-latency local builder + merges AI `studyNotes` / `summary`
 * when generated).
 *
 * Core Layout Rules requested by Alpha:
 *   1. `1. ENGLISH MEDICAL STUDY NOTES (FOR EXAMS)` — crisp English exam bullets (LTR).
 *   2. `٢. الشرح والفهم بالعربي` — clear Arabic explanation grounded in the professor's words (RTL).
 *   3. Dosages, Normal Values & Numbers highlighted in dedicated cards.
 *   4. Medical Definitions Glossary placed at the very end after the summary.
 */
import { extractMedicalLexiconFromSentences, restoreEnglishMedicalTerms } from "../text/medicalTermRestorer.js";

const DOSAGE_REGEX = /\b\d+(?:\.\d+)?\s*(?:mg|g|mcg|µg|ml|mL|L|IU|units?|mmol|mEq|mmHg|bpm|%|hr|hours?|days?|weeks?|months?|years?|مجم|ملجم|جم|مل|وحدة|مم\s*زئبق|نبضة|ساعة|يوم|أسبوع)\b/i;
const EXAM_CUE_REGEX = /(مهم جدا|في الامتحان|سؤال امتحان|ركزوا على|أهم حاجة|لازم تعرف|الخط الأول|العلاج الأساسي|التشخيص الذهبي|ممنوع|خطر|first[-\s]?line|gold standard|pathognomonic|contraindicated|most common|most accurate|choice of|hallmark)/i;

function extractEnglishPhrases(text = "") {
  const matches = String(text || "").match(/[A-Za-z][A-Za-z0-9\s,()/+-]{2,90}/g) || [];
  return matches
    .map((m) => m.trim())
    .filter((m) => m.length >= 3 && !/^(and|the|for|with|from|into)$/i.test(m));
}

function buildEnglishExamBullet(sentenceText = "", sectionTitle = "", termsMap = new Map()) {
  const restored = restoreEnglishMedicalTerms(sentenceText);
  const enPhrases = extractEnglishPhrases(restored);
  const doseMatch = restored.match(DOSAGE_REGEX);

  if (enPhrases.length > 0) {
    const primaryTerm = enPhrases[0];
    const extraTerms = enPhrases.slice(1, 4).join(" • ");
    const def = termsMap.get(primaryTerm.toLowerCase());
    if (doseMatch) {
      return `${primaryTerm}${extraTerms ? ` (${extraTerms})` : ""} — Clinical target / dosage: ${doseMatch[0]}.`;
    }
    if ( extraTerms ) {
      return `${primaryTerm}: Key clinical association with ${extraTerms} in ${sectionTitle || "this topic"}.`;
    }
    if (def) {
      return `${primaryTerm}: High-yield clinical concept tested in exams (${sectionTitle || "Core Concept"}).`;
    }
    return `${primaryTerm} — Core clinical and exam concept highlighted in lecture.`;
  }

  if (doseMatch) {
    return `Clinical Reference Value / Dosage (${sectionTitle || "Lecture Note"}): ${doseMatch[0]} — high-yield numerical value for exam recall.`;
  }

  return null;
}

/**
 * Builds a complete, structured Bilingual Medical Study Sheet from `docModel`,
 * optionally enriched with AI `studyNotes` and `summaryData`.
 */
export function buildDynamicStudySheet(docModel, { studyNotes = null, summaryData = null } = {}) {
  if (!docModel) return null;

  const allSentences = (docModel.sections || []).flatMap((sec) => sec.sentences || []);
  const glossary = extractMedicalLexiconFromSentences(allSentences, docModel.terms || []);
  const termsMap = new Map(glossary.map((g) => [String(g.en || "").toLowerCase(), g.ar_hint]));

  // 1. Executive Summary
  const executiveSummary = [];
  if (summaryData?.main_points?.length) {
    for (const mp of summaryData.main_points.slice(0, 6)) {
      executiveSummary.push({
        title: mp.title || "نقطة محورية",
        text: restoreEnglishMedicalTerms(mp.text || ""),
        src: mp.src || [],
      });
    }
  } else {
    for (const sec of (docModel.sections || []).slice(0, 6)) {
      const firstSent = sec.sentences?.[0];
      if (!firstSent) continue;
      executiveSummary.push({
        title: sec.title || `المحور ${sec.sectionNumber || 1}`,
        text: restoreEnglishMedicalTerms(firstSent.text),
        src: [firstSent.id],
      });
    }
  }

  // 2. High-Yield Exam Alerts & Warnings
  const highYieldWarnings = [];
  for (const s of allSentences) {
    const clean = restoreEnglishMedicalTerms(s.text);
    const isAnnotatedExam = (s.annotations || []).some((a) =>
      ["exam", "exam_pearl", "warning", "key_point"].includes(a.kind),
    );
    if (isAnnotatedExam || EXAM_CUE_REGEX.test(clean)) {
      highYieldWarnings.push({
        id: s.id,
        tSec: s.tSec,
        text: clean,
      });
    }
  }
  if (highYieldWarnings.length === 0 && allSentences.length > 0) {
    for (const s of allSentences.slice(0, Math.min(4, allSentences.length))) {
      highYieldWarnings.push({
        id: s.id,
        tSec: s.tSec,
        text: restoreEnglishMedicalTerms(s.text),
      });
    }
  }

  // 3. Dosages, Measurements & Critical Numbers
  const dosageAndNumbers = [];
  for (const s of allSentences) {
    const clean = restoreEnglishMedicalTerms(s.text);
    const match = clean.match(DOSAGE_REGEX);
    if (match) {
      dosageAndNumbers.push({
        id: s.id,
        value: match[0],
        context: clean,
        tSec: s.tSec,
      });
    }
  }

  // 4. Bilingual Topic-Grouped Study Sections
  const aiNotesBySec = new Map();
  if (studyNotes?.sections?.length) {
    for (const sn of studyNotes.sections) {
      aiNotesBySec.set(sn.section_id || sn.title, sn);
    }
  }

  const studySections = (docModel.sections || []).map((sec, idx) => {
    const sents = sec.sentences || [];
    const englishBullets = [];
    const arabicPoints = [];

    const aiSec = aiNotesBySec.get(sec.id) || aiNotesBySec.get(sec.title);
    if (aiSec) {
      for (const item of [...(aiSec.basics || []), ...(aiSec.from_lecture || [])]) {
        const cleanText = restoreEnglishMedicalTerms(item.text || "");
        arabicPoints.push({
          text: cleanText,
          src: item.src || [],
          badge: item.sourceLabelAr || "من كلام الدكتور",
        });
        const enBullet = buildEnglishExamBullet(cleanText, sec.title, termsMap);
        if (enBullet && !englishBullets.includes(enBullet)) {
          englishBullets.push(enBullet);
        }
      }
    }

    for (const s of sents) {
      const cleanText = restoreEnglishMedicalTerms(s.text || "");
      if (!aiSec) {
        arabicPoints.push({
          text: cleanText,
          src: [s.id],
          tSec: s.tSec,
          badge: EXAM_CUE_REGEX.test(cleanText) ? "موضع سؤال امتحان 🎯" : "شرح المحاضرة",
        });
      }
      const enBullet = buildEnglishExamBullet(cleanText, sec.title, termsMap);
      if (enBullet && !englishBullets.includes(enBullet)) {
        englishBullets.push(enBullet);
      }
    }

    if (englishBullets.length === 0 && sents.length > 0) {
      const secTerms = glossary.slice(idx * 2, idx * 2 + 3).map((g) => g.en);
      englishBullets.push(
        secTerms.length > 0
          ? `Core Exam Focus (${sec.title}): Master the clinical definition, mechanism, and indications of ${secTerms.join(", ")}.`
          : `Core Exam Focus (${sec.title}): Review key diagnostic criteria, mechanisms, and management steps discussed in this section.`,
      );
    }

    return {
      id: sec.id,
      sectionNumber: sec.sectionNumber || idx + 1,
      title: restoreEnglishMedicalTerms(sec.title || `المحور ${idx + 1}`),
      kindLabelAr: sec.kindLabelAr || "مفهوم علمي",
      approxStartSec: sec.approxStartSec || 0,
      englishBullets: englishBullets.slice(0, 8),
      arabicPoints: arabicPoints.slice(0, 12),
    };
  });

  // 5. Active Recall Flashcards
  const flashcards = glossary.slice(0, 20).map((term, idx) => ({
    id: `fc-${idx + 1}`,
    front: term.en,
    back: term.ar_hint,
    first_id: term.first_id,
  }));

  return {
    title: docModel.meta?.title || "محاضرة طبية",
    subject: docModel.meta?.subject || "طب بشري",
    lecturer: docModel.meta?.lecturer || "",
    totalWords: docModel.meta?.totalWords || 0,
    totalSentences: docModel.meta?.totalSentences || 0,
    executiveSummary,
    highYieldWarnings: highYieldWarnings.slice(0, 10),
    dosageAndNumbers: dosageAndNumbers.slice(0, 12),
    studySections,
    glossary,
    flashcards,
  };
}

export default {
  buildDynamicStudySheet,
};
