/**
 * BLACK FIGHTERS V5 — سجل المصطلحات العالمي (Global Glossary Registry)
 * V5 Sections 2.1 #3 & 3.4:
 * - Unifies (EN, AR) term translations across all chapters of a 1000-page book
 *   so the same scientific term is never translated 3 different ways.
 * - Updates dynamically from accepted student corrections.
 */

import { normalizeArabicText } from "./arabicNormalize.js";

const DEFAULT_MEDICAL_GLOSSARY = Object.freeze([
  { en: "Cardiac Output", ar: "نتاج القلب", category: "physiology" },
  { en: "Stroke Volume", ar: "حجم الضربة", category: "physiology" },
  { en: "Heart Rate", ar: "معدل نبضات القلب", category: "physiology" },
  { en: "Preload", ar: "الحمل القبلي", category: "physiology" },
  { en: "Afterload", ar: "الحمل البعدي", category: "physiology" },
  { en: "Beta Blockers", ar: "حاصرات مستقبلات بيتا", category: "pharmacology" },
  { en: "Bronchospasm", ar: "تشنج قصبي", category: "clinical" },
  { en: "Half-life", ar: "عمر النصف الحيوي", category: "pharmacology" },
  { en: "Bioavailability", ar: "التوافر الحيوي", category: "pharmacology" },
  { en: "Contraindication", ar: "موانع الاستعمال", category: "clinical" },
  { en: "Mechanism of Action", ar: "آلية العمل", category: "pharmacology" },
  { en: "Adverse Effects", ar: "الآثار الجانبية", category: "clinical" },
]);

export function createGlobalGlossaryRegistry(seedEntries = []) {
  const entries = new Map();

  for (const item of [...DEFAULT_MEDICAL_GLOSSARY, ...seedEntries]) {
    if (!item?.en || !item?.ar) continue;
    const key = String(item.en).trim().toLowerCase();
    entries.set(key, {
      en: String(item.en).trim(),
      ar: String(item.ar).trim(),
      category: item.category || "general",
      pages: Array.isArray(item.pages) ? [...new Set(item.pages)] : [],
      lockedByCorrection: Boolean(item.lockedByCorrection),
      updatedBy: item.updatedBy || "system",
    });
  }

  return {
    version: 1,
    entries,
  };
}

export function extractGlossaryCandidatesFromOutline(outlineParts = [], existingRegistry = null) {
  const registry = existingRegistry || createGlobalGlossaryRegistry();
  for (const part of outlineParts) {
    const terms = Array.isArray(part?.terms) ? part.terms : [];
    for (const t of terms) {
      const en = String(t.en || t.term || "").trim();
      const ar = String(t.ar || t.translation || "").trim();
      if (!en || !ar) continue;
      const key = en.toLowerCase();
      const current = registry.entries.get(key);
      if (current?.lockedByCorrection) continue;
      const pages = [...new Set([...(current?.pages || []), ...(t.pages || [])])].sort((a, b) => a - b);
      registry.entries.set(key, {
        en: current?.en || en,
        ar: current?.ar || ar,
        category: t.category || current?.category || "general",
        pages,
        lockedByCorrection: false,
        updatedBy: current?.updatedBy || "outline",
      });
    }
  }
  registry.version += 1;
  return registry;
}

/**
 * V5 3.4: Accepted student correction becomes a permanent rule in the prompt registry.
 */
export function applyStudentTermCorrection(registry, { termEn, approvedAr, studentId = "student", pages = [] }) {
  if (!registry || !termEn || !approvedAr) return registry;
  const key = String(termEn).trim().toLowerCase();
  const prev = registry.entries.get(key);
  registry.entries.set(key, {
    en: prev?.en || String(termEn).trim(),
    ar: String(approvedAr).trim(),
    category: prev?.category || "student_verified",
    pages: [...new Set([...(prev?.pages || []), ...pages])],
    lockedByCorrection: true,
    updatedBy: studentId,
  });
  registry.version += 1;
  return registry;
}

export function formatGlossaryForWriterPrompt(registry, maxTerms = 80) {
  if (!registry?.entries?.size) return "";
  const list = [...registry.entries.values()].slice(0, maxTerms);
  const lines = list.map((item) => `- "${item.en}" ➔ "${item.ar}"${item.lockedByCorrection ? " [معتمد إلزامياً]" : ""}`);
  return [
    "【سجل المصطلحات العالمي الموحد — إجباري في جميع الفصول】",
    "التزم حرفياً بالترجمة العربية المعتمدة لكل مصطلح إنجليزي مما يلي ولا تستخدم أي ترجمة بديلة:",
    ...lines,
  ].join("\n");
}

export function checkGlossaryConsistency(registry, chapterText = "") {
  if (!registry?.entries?.size || !chapterText) {
    return { score: 1, checked: 0, matched: 0, violations: [] };
  }
  const normChapter = normalizeArabicText(chapterText);
  const lowerChapter = String(chapterText).toLowerCase();
  let checked = 0;
  let matched = 0;
  const violations = [];

  for (const item of registry.entries.values()) {
    if (lowerChapter.includes(item.en.toLowerCase())) {
      checked += 1;
      const normAr = normalizeArabicText(item.ar);
      if (normChapter.includes(normAr)) {
        matched += 1;
      } else {
        violations.push({ en: item.en, expectedAr: item.ar });
      }
    }
  }

  return {
    score: checked === 0 ? 1 : Number((matched / checked).toFixed(3)),
    checked,
    matched,
    violations,
    consistent: violations.length === 0,
  };
}

export function createGlossaryRegistry(seedEntries = []) {
  const reg = createGlobalGlossaryRegistry(seedEntries);
  return {
    ...reg,
    byEn: reg.entries,
    entries: [...reg.entries.values()],
  };
}

export function mergeChapterTermsIntoGlossary(reg, newTerms = []) {
  const mapEntries = reg.byEn || reg.entries;
  for (const t of newTerms) {
    if (!t?.en || !t?.ar) continue;
    const key = String(t.en).trim().toLowerCase();
    if (mapEntries.has(key)) continue;
    mapEntries.set(key, {
      en: String(t.en).trim(),
      ar: String(t.ar).trim(),
      category: t.category || "general",
      pages: t.pages || [],
      lockedByCorrection: false,
      studentLocked: false,
    });
  }
  return {
    ...reg,
    byEn: mapEntries,
    entries: [...mapEntries.values()],
  };
}

export function applyStudentCorrection(reg, termEn, approvedAr) {
  const mapEntries = reg.byEn || reg.entries;
  const key = String(termEn || "").trim().toLowerCase();
  const prev = mapEntries.get(key);
  mapEntries.set(key, {
    en: prev?.en || String(termEn).trim(),
    ar: String(approvedAr).trim(),
    category: prev?.category || "student_verified",
    pages: prev?.pages || [],
    lockedByCorrection: true,
    studentLocked: true,
  });
  return {
    ...reg,
    byEn: mapEntries,
    entries: [...mapEntries.values()],
  };
}

export function validateGlossaryConsistency(reg, chapterText = "") {
  const mapObj = { entries: reg.byEn || reg.entries };
  return checkGlossaryConsistency(mapObj, chapterText);
}
