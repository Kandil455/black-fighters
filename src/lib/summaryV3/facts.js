import { createSummaryDocument, summaryDocumentToMarkdown } from "./document.js";
import { stableSummaryId } from "./schema.js";
import { resolveSummaryTemplateId, SEMANTIC_EMPHASIS, SUMMARY_SEMANTICS } from "./registry.js";
import { validateSummaryDocument } from "./validate.js";

const PAGE_MARKER = /\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/gi;
const SENTENCE_BOUNDARY = /\n+|(?<=[.!؟])\s+/;

function clean(value, max = 2_000) {
  return String(value || "").replace(/\s+/g, " ").trim().slice(0, max);
}

function evidenceKey(value) {
  return clean(value, 4_000)
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u0640]/g, "")
    .replace(/[^a-z0-9\u0600-\u06ff%+=.()-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function tokenCoverage(needle, haystack) {
  const tokens = [...new Set(evidenceKey(needle).split(" ").filter((token) => token.length >= 3))];
  if (!tokens.length) return 0;
  const normalized = evidenceKey(haystack);
  return tokens.filter((token) => normalized.includes(token)).length / tokens.length;
}

function pageSet(text) {
  return new Set([...String(text || "").matchAll(PAGE_MARKER)].map((match) => Number(match[1])).filter(Number.isFinite));
}

function normalizeSemantic(value, text) {
  if (SUMMARY_SEMANTICS.includes(value)) return value;
  if (/warning|danger|contraindication|exception|تحذير|خطر|استثناء/i.test(text)) return "warning";
  if (/[=±×÷∑√]|equation|formula|معادلة|قانون/i.test(text)) return "formula";
  if (/defined|definition|means|refers to|تعريف|يعرف|يعني/i.test(text)) return "definition";
  if (/example|case|مثال|حالة/i.test(text)) return "example";
  if (/result|therefore|نتيجة|خلاصة/i.test(text)) return "result";
  if (/\d+(?:\.\d+)?%/.test(text)) return "statistic";
  return "fact";
}

function sourcePage(raw, pages) {
  const page = Number(raw);
  if (Number.isInteger(page) && page > 0 && pages.has(page)) return page;
  return null;
}

function exactEvidence(value, source) {
  const evidence = clean(value, 360);
  if (!evidence) return "";
  const sourceKey = evidenceKey(source);
  const key = evidenceKey(evidence);
  return key.length >= 10 && sourceKey.includes(key) ? evidence : "";
}

function factIdentity(fact, chunkIndex, factIndex) {
  return stableSummaryId("fact", fact.sourceEvidence || fact.statementEn || fact.statementAr, chunkIndex * 1_000 + factIndex);
}

export function normalizeSummaryFact(raw, { sourceText = "", chunkIndex = 0, factIndex = 0 } = {}) {
  const statementEn = clean(raw?.statement_en || raw?.statementEn || raw?.english || raw?.statement, 700);
  const statementAr = clean(raw?.statement_ar || raw?.statementAr || raw?.arabic, 900);
  const explanationAr = clean(raw?.explanation_ar || raw?.explanationAr || raw?.arabic_explanation, 1_500);
  const explanationEn = clean(raw?.explanation_en || raw?.explanationEn || raw?.english_explanation, 1_200);
  const evidence = exactEvidence(raw?.source_evidence || raw?.evidence || raw?.quote, sourceText);
  const candidate = statementEn || statementAr || explanationAr || explanationEn;
  if (!candidate) return null;
  const groundingScore = evidence ? 1 : Math.max(tokenCoverage(statementEn, sourceText), tokenCoverage(statementAr, sourceText));
  if (!evidence && groundingScore < 0.46) return null;
  const pages = pageSet(sourceText);
  const formula = clean(raw?.formula, 500);
  const safeFormula = formula && evidenceKey(sourceText).includes(evidenceKey(formula)) ? formula : "";
  const semantic = normalizeSemantic(raw?.semantic_type || raw?.semantic, `${candidate} ${safeFormula}`);
  const keyTerm = clean(raw?.key_term || raw?.keyTerm || raw?.term, 100);
  const fact = {
    statementEn,
    statementAr,
    explanationAr,
    explanationEn,
    sourceEvidence: evidence,
    sourcePage: sourcePage(raw?.source_page ?? raw?.page, pages),
    sourceHeading: clean(raw?.source_heading || raw?.heading, 180),
    sectionTitleEn: clean(raw?.section_title_en || raw?.sectionTitleEn || raw?.section, 180),
    sectionTitleAr: clean(raw?.section_title_ar || raw?.sectionTitleAr, 180),
    semantic,
    importance: Math.max(1, Math.min(5, Number(raw?.importance) || 3)),
    keyTerm: candidate.toLowerCase().includes(keyTerm.toLowerCase()) ? keyTerm : "",
    formula: safeFormula,
    question: clean(raw?.question, 500),
    answer: clean(raw?.answer, 900),
    chunkIndex,
    groundingScore: Number(groundingScore.toFixed(2)),
  };
  fact.id = factIdentity(fact, chunkIndex, factIndex);
  return fact;
}

export function normalizeSummaryFactBatch(raw, options = {}) {
  const input = Array.isArray(raw) ? raw : raw?.facts;
  return (Array.isArray(input) ? input : [])
    .map((fact, factIndex) => normalizeSummaryFact(fact, { ...options, factIndex }))
    .filter(Boolean);
}

function localFactText(sentence) {
  const text = clean(sentence, 900).replace(/^\[(?:صفحة|page)\s*[:#-]?\s*\d+\]\s*/i, "");
  if (text.length < 25 || text.length > 850) return "";
  return text;
}

export function extractLocalSummaryFacts(sourceText, { chunkIndex = 0, languageMode = "bilingual", maxFacts = 24 } = {}) {
  const pages = pageSet(sourceText);
  let activePage = pages.size === 1 ? [...pages][0] : null;
  const candidates = [];
  for (const segment of String(sourceText || "").split(SENTENCE_BOUNDARY)) {
    const marker = segment.match(/^\s*\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/i);
    if (marker) activePage = Number(marker[1]);
    const text = localFactText(segment);
    if (!text) continue;
    const semantic = normalizeSemantic("", text);
    const signal = semantic !== "fact" || /\b(?:is|are|causes?|types?|includes?|important|must|defined)\b|(?:هو|هي|يعرف|أنواع|أسباب|يشمل|مهم|يجب)/i.test(text);
    if (!signal) continue;
    const isArabic = /[\u0600-\u06ff]/.test(text);
    candidates.push({
      id: stableSummaryId("fact", text, chunkIndex * 1_000 + candidates.length),
      statementEn: !isArabic ? text : "",
      statementAr: isArabic ? text : "",
      explanationAr: isArabic ? text : "",
      explanationEn: !isArabic ? text : "",
      sourceEvidence: text,
      sourcePage: activePage,
      sourceHeading: "",
      sectionTitleEn: `Source part ${chunkIndex + 1}`,
      sectionTitleAr: `الجزء ${chunkIndex + 1}`,
      semantic,
      importance: semantic === "warning" || semantic === "formula" || semantic === "definition" ? 5 : 3,
      keyTerm: "",
      formula: semantic === "formula" ? text : "",
      question: "",
      answer: "",
      chunkIndex,
      groundingScore: 1,
      locallyExtracted: true,
      languageMode,
    });
    if (candidates.length >= maxFacts) break;
  }
  return candidates;
}

function duplicateScore(left, right) {
  const a = evidenceKey(left.sourceEvidence || left.statementEn || left.statementAr);
  const b = evidenceKey(right.sourceEvidence || right.statementEn || right.statementAr);
  if (!a || !b) return 0;
  if (a === b || (a.length > 60 && (a.includes(b) || b.includes(a)))) return 1;
  const tokens = new Set(a.split(" ").filter((token) => token.length >= 4));
  const other = new Set(b.split(" ").filter((token) => token.length >= 4));
  const intersection = [...tokens].filter((token) => other.has(token)).length;
  const union = new Set([...tokens, ...other]).size;
  return union ? intersection / union : 0;
}

export function mergeSummaryFacts(batches, { maxFacts = 240 } = {}) {
  const merged = [];
  const input = (Array.isArray(batches) ? batches : []).flat().filter(Boolean)
    .sort((a, b) => a.chunkIndex - b.chunkIndex || b.importance - a.importance);
  for (const fact of input) {
    const duplicateIndex = merged.findIndex((existing) => duplicateScore(existing, fact) >= 0.78);
    if (duplicateIndex >= 0) {
      if (fact.importance > merged[duplicateIndex].importance || fact.sourceEvidence.length > merged[duplicateIndex].sourceEvidence.length) {
        merged[duplicateIndex] = { ...fact, id: merged[duplicateIndex].id };
      }
      continue;
    }
    merged.push(fact);
    if (merged.length >= maxFacts) break;
  }
  return merged;
}

function marked(value, fact, fallback = "") {
  const text = clean(value || fallback, 1_600);
  if (!text) return "";
  const term = fact.keyTerm && text.toLowerCase().includes(fact.keyTerm.toLowerCase()) ? fact.keyTerm : "";
  if (!term) return text;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  const color = SEMANTIC_EMPHASIS[fact.semantic]?.color || "yellow";
  return `${text.slice(0, index)}==${color}:${text.slice(index, index + term.length)}==${text.slice(index + term.length)}`;
}

function factText(fact, language, detailed = false) {
  if (language === "ar") return marked(detailed ? fact.explanationAr : fact.statementAr, fact, fact.statementAr || fact.explanationAr || fact.statementEn);
  return marked(detailed ? fact.explanationEn : fact.statementEn, fact, fact.statementEn || fact.explanationEn || fact.statementAr);
}

function factRefs(facts) {
  return {
    sourceRefs: [...new Set(facts.map((fact) => fact.sourcePage).filter(Boolean))],
    sourceFactIds: facts.map((fact) => fact.id),
  };
}

function groupFacts(facts, maxSections) {
  const groups = [];
  for (const fact of facts) {
    const key = clean(fact.sectionTitleEn || fact.sectionTitleAr || fact.sourceHeading || `Part ${fact.chunkIndex + 1}`, 180);
    let group = groups.at(-1);
    if (!group || group.key !== key || group.facts.length >= 12) {
      group = { key, facts: [] };
      groups.push(group);
    }
    group.facts.push(fact);
  }
  if (groups.length <= maxSections) return groups;
  const compactGroups = Array.from({ length: maxSections }, (_, index) => ({ key: groups[Math.floor((index * groups.length) / maxSections)]?.key || `Section ${index + 1}`, facts: [] }));
  groups.forEach((group, index) => compactGroups[Math.min(maxSections - 1, Math.floor((index * maxSections) / groups.length))].facts.push(...group.facts));
  return compactGroups.filter((group) => group.facts.length);
}

function bilingualBlocks(facts) {
  const english = facts.map((fact) => factText(fact, "en")).filter(Boolean);
  const arabic = facts.map((fact) => factText(fact, "ar", true)).filter(Boolean).join(" ");
  const refs = factRefs(facts);
  return [
    { type: "bullet_list", role: "english_points", items: english, ...refs },
    { type: "paragraph", role: "arabic_explanation", content: arabic || "شرح عربي غير متاح لهذا الجزء.", ...refs },
  ];
}

/**
 * "Complete study guide" — bullets + a definition table.
 *
 * It used to emit the SAME section content twice: a bullet list of every
 * statement followed by a paragraph joining every explanation. That tripped the
 * validator's own DUPLICATE_CONTENT_RATIO gate (repeated block content > 18%), so
 * documents assembled with this template were flagged invalid. Splitting the
 * content into "points" + "term → explanation" removes the duplication and reads
 * better anyway.
 */
function completeBlocks(facts, language) {
  const refs = factRefs(facts);
  const items = facts.map((fact) => factText(fact, language)).filter(Boolean);
  const withTerms = facts.filter((fact) => fact.keyTerm && factText(fact, language, true));
  const blocks = [];
  if (items.length) blocks.push({ type: "bullet_list", role: "body", items, ...refs });
  if (withTerms.length) {
    blocks.push({
      type: "table",
      role: "definition",
      table: {
        headers: language === "ar" ? ["المصطلح", "الشرح"] : ["Term", "Explanation"],
        rows: withTerms.map((fact) => [fact.keyTerm, factText(fact, language, true)]),
      },
      ...factRefs(withTerms),
    });
  }
  if (!blocks.length) {
    const explanations = facts.map((fact) => factText(fact, language, true)).filter(Boolean);
    if (explanations.length) blocks.push({ type: "paragraph", role: "body", content: explanations.join(" "), ...refs });
  }
  return blocks;
}

function revisionBlocks(facts, language) {
  return [{ type: "bullet_list", role: "body", items: facts.map((fact) => factText(fact, language)).filter(Boolean), ...factRefs(facts) }];
}

function comparisonBlocks(facts, language) {
  const headers = language === "ar" ? ["المفهوم", "النقطة الأساسية", "الشرح"] : ["Concept", "Key point", "Explanation"];
  const rows = facts.map((fact) => [
    fact.keyTerm || fact.sourceHeading || (language === "ar" ? "مفهوم" : "Concept"),
    factText(fact, language),
    factText(fact, language, true),
  ]);
  return [{ type: "table", role: "body", table: { headers, rows }, ...factRefs(facts) }];
}

function qaBlocks(facts, language) {
  return facts.flatMap((fact, index) => {
    const statement = factText(fact, language);
    const question = clean(fact.question || (language === "ar" ? `ما الفكرة الأساسية رقم ${index + 1}؟` : `What is the key idea in item ${index + 1}?`), 500);
    const answer = clean(fact.answer || factText(fact, language, true) || statement, 1_000);
    const refs = factRefs([fact]);
    return [
      { type: "paragraph", role: "question", content: question, ...refs },
      { type: "paragraph", role: "answer", content: answer, ...refs },
    ];
  });
}

function visualBlocks(facts, language) {
  const formula = facts.find((fact) => fact.formula);
  const refs = factRefs(facts);
  if (formula) return [
    { type: "equation", role: "formula", content: formula.formula, ...factRefs([formula]) },
    { type: "bullet_list", role: "body", items: facts.map((fact) => factText(fact, language)).filter(Boolean), ...refs },
  ];
  return [{ type: "concept_map", role: "body", content: facts.map((fact) => `${fact.keyTerm || (language === "ar" ? "مفهوم" : "Concept")} → ${factText(fact, language)}`).join("\n"), ...refs }];
}

/**
 * "Foundational bilingual" (شرح من الأساس) — the Atlas V5 default.
 *
 * Each section opens with a prerequisite bridge for a student who has never seen
 * the topic, then the English study points, then a structured Arabic explanation.
 * The prerequisite line matters: it is the difference between a summary that
 * explains and one that just lists conclusions.
 */
/**
 * "Foundational bilingual" (شرح من الأساس) — the Atlas V5 default.
 *
 * LANGUAGE SAFETY: every string here must be produced in the document's own
 * language mode. The first version hardcoded an Arabic prerequisite bridge and
 * always pulled `explanationAr`, so choosing English produced an Arabic document
 * and validation rejected the whole run with
 * `SUMMARY_V3_VALIDATION_FAILED:DOCUMENT_LANGUAGE_MISMATCH` — the summary simply
 * refused to generate.
 */
function foundationalBilingualBlocks(facts, language) {
  const refs = factRefs(facts);
  const isArabic = language === "ar";
  const english = facts.map((fact) => factText(fact, "en")).filter(Boolean);
  // The "explanation" rail follows the document language, not a fixed field.
  const explanations = facts
    .map((fact) => (isArabic
      ? (fact.explanationAr || fact.arabicExplanation || factText(fact, "ar", true))
      : (fact.explanationEn || factText(fact, "en", true))))
    .filter(Boolean);
  const terms = facts
    .filter((fact) => fact.keyTerm)
    .map((fact) => ({
      term: fact.keyTerm,
      meaning: (isArabic ? (fact.statementAr || fact.statementEn) : (fact.statementEn || fact.statementAr)) || "",
    }))
    .filter((entry) => entry.meaning);

  const anchor = facts[0]?.keyTerm || facts[0]?.sourceHeading || "";
  const bridge = facts[0]
    ? (isArabic
      ? `قبل ما تقرا: القسم ده مبني على ${anchor || "المفهوم الأساسي"} — لو مش متأكد منه ارجع له الأول.`
      : `Before you read: this section builds on ${anchor || "the core concept"} — go back to it first if you are not sure.`)
    : "";

  const blocks = [];
  if (bridge) blocks.push({ type: "quote", role: "example", content: bridge, ...refs });
  if (english.length) blocks.push({ type: "bullet_list", role: "english_points", items: english, ...refs });
  if (explanations.length) {
    blocks.push({ type: "bullet_list", role: "arabic_explanation", items: explanations, ...refs });
  } else if (english.length) {
    blocks.push({ type: "paragraph", role: "arabic_explanation", content: english.join(" "), ...refs });
  }
  if (terms.length) {
    blocks.push({
      type: "table",
      role: "definition",
      table: {
        headers: isArabic ? ["المصطلح", "المعنى"] : ["Term", "Meaning"],
        rows: terms.map((entry) => [entry.term, entry.meaning]),
      },
      ...refs,
    });
  }
  return blocks.length ? blocks : completeBlocks(facts, language);
}

/**
 * "Atlas cram" (برشامة ليلة الامتحان) — maximum exam density.
 * Definitions, hard numbers/dosages and comparisons only: the content a student
 * actually needs the night before, with nothing narrative in the way.
 */
function cramBlocks(facts, language) {
  const refs = factRefs(facts);
  const scored = [...facts].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  // "Critical" means the content a student cannot reconstruct under time pressure:
  // top-importance facts, formulas, and hard numbers (dosages/units/percentages) —
  // NOT every statement that merely contains a digit.
  const isCritical = (fact) =>
    (fact.importance || 0) >= 4 ||
    Boolean(fact.formula) ||
    /\d+(\.\d+)?\s*(mg|mcg|µg|g|kg|ml|l|mmhg|%|iu|mmol|meq|bpm|hours?|hrs?|days?)\b/i.test(
      `${fact.statementEn || ""} ${fact.statementAr || ""} ${fact.explanationEn || ""}`,
    );
  const critical = scored.filter(isCritical);
  const rest = scored.filter((fact) => !isCritical(fact));
  const blocks = [];

  if (critical.length) {
    blocks.push({
      type: "bullet_list",
      role: "warning",
      items: critical.map((fact) => factText(fact, language)).filter(Boolean),
      ...refs,
    });
  }
  if (rest.length) {
    blocks.push({
      type: "table",
      role: "body",
      table: {
        headers: language === "ar" ? ["النقطة", "التفصيل"] : ["Point", "Detail"],
        rows: rest.map((fact) => [
          fact.keyTerm || fact.sourceHeading || (language === "ar" ? "نقطة" : "Point"),
          factText(fact, language, true) || factText(fact, language),
        ]),
      },
      ...refs,
    });
  }
  const formula = facts.find((fact) => fact.formula);
  if (formula) blocks.push({ type: "equation", role: "formula", content: formula.formula, ...factRefs([formula]) });
  if (!blocks.length) return revisionBlocks(facts, language);
  return blocks;
}

function blockFactory(templateId, facts, languageMode) {
  const language = languageMode === "ar" ? "ar" : "en";
  if (templateId === "bilingual_lecture") return bilingualBlocks(facts);
  if (templateId === "foundational_bilingual") return foundationalBilingualBlocks(facts, language);
  if (templateId === "atlas_cram") return cramBlocks(facts, language);
  if (templateId === "exam_revision_sheet") return revisionBlocks(facts, language);
  if (templateId === "comparison_classification") return comparisonBlocks(facts, language);
  if (templateId === "qa_tutor") return qaBlocks(facts, language);
  if (templateId === "visual_concepts_formulas") return visualBlocks(facts, language);
  return completeBlocks(facts, language);
}

function sectionTitle(group, languageMode, index) {
  const first = group.facts[0];
  if (languageMode === "ar") return first.sectionTitleAr || first.sectionTitleEn || `القسم ${index + 1}`;
  return first.sectionTitleEn || first.sectionTitleAr || `Section ${index + 1}`;
}

export function assembleSummaryDocumentFromFacts(facts, {
  title = "Summary",
  templateId = "bilingual_lecture",
  languageMode = "bilingual",
  colorLevel = "medium",
  maxPages = 12,
  sourceFingerprint = "",
} = {}) {
  const resolvedTemplate = resolveSummaryTemplateId(templateId);
  if (!resolvedTemplate) throw new Error(`UNKNOWN_SUMMARY_TEMPLATE:${templateId}`);
  const effectiveLanguage = resolvedTemplate === "bilingual_lecture" ? "bilingual" : (languageMode === "mixed" ? "bilingual" : languageMode);
  const wordBudget = Math.max(300, Math.min(30_000, Number(maxPages || 12) * 300));
  const maxFacts = Math.max(5, Math.min(240, Math.floor(wordBudget / (effectiveLanguage === "bilingual" ? 42 : 25))));
  const selected = [...facts].sort((a, b) => a.chunkIndex - b.chunkIndex || b.importance - a.importance).slice(0, maxFacts);
  if (!selected.length) throw new Error("NO_GROUNDED_SUMMARY_FACTS");
  const maxSections = resolvedTemplate === "bilingual_lecture" ? 18 : 24;
  const groups = groupFacts(selected, maxSections);
  const sections = groups.map((group, index) => ({
    title: sectionTitle(group, effectiveLanguage, index),
    blocks: blockFactory(resolvedTemplate, group.facts, effectiveLanguage),
    ...factRefs(group.facts),
  }));
  const top = [...selected].sort((a, b) => b.importance - a.importance).slice(0, 4);
  const overviewLanguage = effectiveLanguage === "ar" ? "ar" : "en";
  const overviewText = top.map((fact) => factText(fact, overviewLanguage)).filter(Boolean).join(" ");
  const conclusionFacts = top.slice(0, 3);
  const conclusionText = conclusionFacts.map((fact) => factText(fact, overviewLanguage)).filter(Boolean).join(" ");
  const overview = [{
    type: "paragraph",
    role: "body",
    content: `${overviewLanguage === "ar" ? "نظرة عامة:" : "Overview:"} ${overviewText}`.trim(),
    ...factRefs(top),
  }];
  const conclusion = [{
    type: "paragraph",
    role: "body",
    content: `${overviewLanguage === "ar" ? "الخلاصة:" : "Conclusion:"} ${conclusionText}`.trim(),
    ...factRefs(conclusionFacts),
  }];
  const document = createSummaryDocument({
    title,
    templateId: resolvedTemplate,
    languageMode: effectiveLanguage,
    colorLevel,
    overview: ["comparison_classification", "qa_tutor", "visual_concepts_formulas"].includes(resolvedTemplate) ? [] : overview,
    sections,
    conclusion: ["comparison_classification", "qa_tutor", "visual_concepts_formulas"].includes(resolvedTemplate) ? [] : conclusion,
    metadata: {
      sourceFingerprint,
      sourceFactIds: selected.map((fact) => fact.id),
      sourceRefs: [...new Set(selected.map((fact) => fact.sourcePage).filter(Boolean))],
      groundedFacts: selected.length,
      locallyExtractedFacts: selected.filter((fact) => fact.locallyExtracted).length,
      generatedAt: new Date().toISOString(),
    },
  });
  const validation = validateSummaryDocument(document, {
    sourcePages: document.metadata.sourceRefs,
    sourceFactIds: document.metadata.sourceFactIds,
    maxPages,
  });
  return { document, markdown: summaryDocumentToMarkdown(document), validation, facts: selected };
}
