import { createSummaryDocument, summaryDocumentToMarkdown } from "./document.js";
import { stableSummaryId } from "./schema.js";
import { getSummaryTemplateContract, resolveSummaryTemplateId, SEMANTIC_EMPHASIS, SUMMARY_SEMANTICS } from "./registry.js";
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
  return key.length >= 8 && sourceKey.includes(key) ? evidence : "";
}

function factIdentity(fact, chunkIndex, factIndex) {
  return stableSummaryId("fact", fact.sourceEvidence || fact.statementEn || fact.statementAr, chunkIndex * 1_000 + factIndex);
}

export function normalizeSummaryFact(raw, { sourceText = "", chunkIndex = 0, factIndex = 0 } = {}) {
  const statementEn = clean(raw?.statement_en || raw?.statementEn || raw?.english || raw?.statement, 900);
  const statementAr = clean(raw?.statement_ar || raw?.statementAr || raw?.arabic, 1_100);
  const explanationAr = clean(raw?.explanation_ar || raw?.explanationAr || raw?.arabic_explanation, 1_800);
  const explanationEn = clean(raw?.explanation_en || raw?.explanationEn || raw?.english_explanation, 1_500);
  const rawEvidence = clean(raw?.source_evidence || raw?.evidence || raw?.quote, 360);
  const evidence = exactEvidence(rawEvidence, sourceText);
  const candidate = statementEn || statementAr || explanationAr || explanationEn;
  if (!candidate) return null;
  const keyTermRaw = clean(raw?.key_term || raw?.keyTerm || raw?.term, 120);
  const tokenScore = Math.max(
    tokenCoverage(statementEn, sourceText),
    tokenCoverage(statementAr, sourceText),
    tokenCoverage(explanationEn, sourceText),
    tokenCoverage(rawEvidence, sourceText),
    keyTermRaw ? tokenCoverage(keyTermRaw, sourceText) * 0.75 : 0,
  );
  const groundingScore = evidence ? 1 : tokenScore;
  const hasCrossLangTranslation = Boolean((statementAr || explanationAr) && (statementEn || rawEvidence));
  const minGrounding = hasCrossLangTranslation ? 0.2 : 0.34;
  if (!evidence && groundingScore < minGrounding) return null;
  const pages = pageSet(sourceText);
  const formula = clean(raw?.formula, 500);
  const safeFormula = formula && (evidenceKey(sourceText).includes(evidenceKey(formula)) || tokenCoverage(formula, sourceText) >= 0.6) ? formula : "";
  const semantic = normalizeSemantic(raw?.semantic_type || raw?.semantic, `${candidate} ${safeFormula}`);
  const combinedCandidate = `${statementEn} ${statementAr} ${explanationEn} ${explanationAr}`;
  const fact = {
    statementEn,
    statementAr,
    explanationAr,
    explanationEn,
    sourceEvidence: evidence || rawEvidence,
    sourcePage: sourcePage(raw?.source_page ?? raw?.page, pages),
    sourceHeading: clean(raw?.source_heading || raw?.heading, 180),
    sectionTitleEn: clean(raw?.section_title_en || raw?.sectionTitleEn || raw?.section, 180),
    sectionTitleAr: clean(raw?.section_title_ar || raw?.sectionTitleAr, 180),
    semantic,
    importance: Math.max(1, Math.min(5, Number(raw?.importance) || 3)),
    keyTerm: keyTermRaw && combinedCandidate.toLowerCase().includes(keyTermRaw.toLowerCase()) ? keyTermRaw : "",
    formula: safeFormula,
    question: clean(raw?.question, 500),
    answer: clean(raw?.answer, 1_100),
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
  if (text.length < 22 || text.length > 850) return "";
  return text;
}

export function extractLocalSummaryFacts(sourceText, { chunkIndex = 0, languageMode = "bilingual", maxFacts = 45 } = {}) {
  const pages = pageSet(sourceText);
  let activePage = pages.size === 1 ? [...pages][0] : null;
  const candidates = [];
  for (const segment of String(sourceText || "").split(SENTENCE_BOUNDARY)) {
    const marker = segment.match(/^\s*\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/i);
    if (marker) activePage = Number(marker[1]);
    const text = localFactText(segment);
    if (!text) continue;
    const semantic = normalizeSemantic("", text);
    const signal = semantic !== "fact"
      || text.length >= 42
      || /\b(?:is|are|causes?|types?|includes?|important|must|defined|leads?|results?|consists?|used|characterized)\b|(?:هو|هي|يعرف|أنواع|أسباب|يشمل|مهم|يجب|يؤدي|يتكون|يستخدم|يتميز)/i.test(text);
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

export function mergeSummaryFacts(batches, { maxFacts = 900 } = {}) {
  const merged = [];
  const input = (Array.isArray(batches) ? batches : []).flat().filter(Boolean)
    .sort((a, b) => a.chunkIndex - b.chunkIndex || b.importance - a.importance);
  for (const fact of input) {
    const duplicateIndex = merged.findIndex((existing) => duplicateScore(existing, fact) >= 0.82);
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
  const text = clean(value || fallback, 1_800);
  if (!text) return "";
  const term = fact.keyTerm && text.toLowerCase().includes(fact.keyTerm.toLowerCase()) ? fact.keyTerm : "";
  if (!term) return text;
  const index = text.toLowerCase().indexOf(term.toLowerCase());
  const color = SEMANTIC_EMPHASIS[fact.semantic]?.color || "yellow";
  return `${text.slice(0, index)}==${color}:${text.slice(index, index + term.length)}==${text.slice(index + term.length)}`;
}

function factText(fact, language, detailed = false) {
  if (language === "ar") {
    const stmt = clean(fact.statementAr, 1_000);
    const exp = clean(fact.explanationAr, 1_600);
    let combined = detailed ? (exp || stmt) : (stmt || exp);
    if (detailed && stmt && exp && !exp.includes(stmt.slice(0, 30)) && !stmt.includes(exp.slice(0, 30))) {
      combined = `${stmt} — ${exp}`;
    }
    return marked(combined, fact, stmt || exp || fact.statementEn || fact.explanationEn);
  }
  const stmt = clean(fact.statementEn, 900);
  const exp = clean(fact.explanationEn, 1_400);
  let combined = detailed ? (exp || stmt) : (stmt || exp);
  if (detailed && stmt && exp && !exp.includes(stmt.slice(0, 30)) && !stmt.includes(exp.slice(0, 30))) {
    combined = `${stmt} — ${exp}`;
  }
  return marked(combined, fact, stmt || exp || fact.statementAr || fact.explanationAr);
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
    if (!group || group.key !== key || group.facts.length >= 16) {
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
  const rawArabic = facts.map((fact) => factText(fact, "ar", true)).filter(Boolean);
  const arabicItems = rawArabic.map((item) => (/[\u0600-\u06ff]/.test(item) ? item : `الشرح والتفصيل: ${item}`));
  const refs = factRefs(facts);
  return [
    { type: "bullet_list", role: "english_points", items: english.length ? english : ["Key study point"], ...refs },
    {
      type: "bullet_list",
      role: "arabic_explanation",
      items: arabicItems.length ? arabicItems : ["شرح عربي تفصيلي للنقاط العلمية في هذا الجزء."],
      ...refs,
    },
  ];
}

/**
 * "Complete study guide" — structured bullet lists + a definition table.
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
        headers: language === "ar" ? ["المصطلح", "الشرح والتفصيل"] : ["Term", "Detailed Explanation"],
        rows: withTerms.map((fact) => [fact.keyTerm, factText(fact, language, true)]),
      },
      ...factRefs(withTerms),
    });
  } else {
    const detailedItems = facts
      .map((fact) => fact.explanationAr || fact.explanationEn || factText(fact, language, true))
      .filter(Boolean)
      .map((item, idx) => (language === "ar" ? `توضيح (${idx + 1}): ${item}` : `Detail (${idx + 1}): ${item}`));
    if (detailedItems.length) {
      blocks.push({ type: "bullet_list", role: "definition", items: detailedItems, ...refs });
    }
  }
  if (!blocks.length) {
    const explanations = facts.map((fact) => factText(fact, language, true)).filter(Boolean);
    if (explanations.length) blocks.push({ type: "bullet_list", role: "body", items: explanations, ...refs });
  }
  return blocks;
}

function revisionBlocks(facts, language) {
  return [{ type: "bullet_list", role: "body", items: facts.map((fact) => factText(fact, language, true)).filter(Boolean), ...factRefs(facts) }];
}

function comparisonBlocks(facts, language) {
  const headers = language === "ar" ? ["المفهوم", "النقطة الأساسية", "الشرح التفصيلي"] : ["Concept", "Key point", "Explanation"];
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
    const answer = clean(fact.answer || factText(fact, language, true) || statement, 1_200);
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
    { type: "bullet_list", role: "body", items: facts.map((fact) => factText(fact, language, true)).filter(Boolean), ...refs },
  ];
  return [{ type: "concept_map", role: "body", content: facts.map((fact) => `${fact.keyTerm || (language === "ar" ? "مفهوم" : "Concept")} → ${factText(fact, language, true)}`).join("\n"), ...refs }];
}

/**
 * "Foundational bilingual" (شرح من الأساس) — the Atlas V5 default.
 * Always structured as bullet lists + glossary table, never solid narrative paragraphs.
 */
function foundationalBilingualBlocks(facts, languageMode) {
  const refs = factRefs(facts);
  const isArabic = languageMode !== "en";
  const english = facts.map((fact) => factText(fact, "en")).filter(Boolean);
  const explanations = facts
    .map((fact) => (isArabic
      ? factText(fact, "ar", true)
      : (fact.explanationEn || factText(fact, "en", true))))
    .filter(Boolean);
  const terms = facts
    .filter((fact) => fact.keyTerm)
    .map((fact) => ({
      term: fact.keyTerm,
      meaning: (isArabic ? (fact.statementAr || fact.explanationAr || fact.statementEn) : (fact.statementEn || fact.explanationEn || fact.statementAr)) || "",
    }))
    .filter((entry) => entry.meaning);

  const anchor = facts[0]?.keyTerm || facts[0]?.sourceHeading || "";
  const bridge = facts[0]
    ? (isArabic
      ? `قبل ما تقرا: القسم ده مبني على ${anchor || "المفهوم الأساسي"} — ركّز في التسلسل العلمي والنقاط المرتبة تحته.`
      : `Before you read: this section builds on ${anchor || "the core concept"} — review the structured points below carefully.`)
    : "";

  const blocks = [];
  if (bridge) blocks.push({ type: "quote", role: "example", content: bridge, ...refs });
  if (english.length) blocks.push({ type: "bullet_list", role: "english_points", items: english, ...refs });
  if (explanations.length) {
    blocks.push({ type: "bullet_list", role: "arabic_explanation", items: explanations, ...refs });
  } else if (english.length) {
    blocks.push({ type: "bullet_list", role: "arabic_explanation", items: english, ...refs });
  }
  if (terms.length) {
    blocks.push({
      type: "table",
      role: "definition",
      table: {
        headers: isArabic ? ["المصطلح", "المعنى والتوضيح"] : ["Term", "Meaning"],
        rows: terms.map((entry) => [entry.term, entry.meaning]),
      },
      ...refs,
    });
  }
  return blocks.length ? blocks : completeBlocks(facts, isArabic ? "ar" : "en");
}

/**
 * "Atlas cram" (برشامة ليلة الامتحان) — maximum exam density.
 */
function cramBlocks(facts, language) {
  const refs = factRefs(facts);
  const scored = [...facts].sort((a, b) => (b.importance || 0) - (a.importance || 0));
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
      items: critical.map((fact) => factText(fact, language, true)).filter(Boolean),
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
  const language = languageMode === "ar" ? "ar" : (languageMode === "bilingual" ? "ar" : "en");
  if (templateId === "bilingual_lecture") return bilingualBlocks(facts);
  if (templateId === "foundational_bilingual") return foundationalBilingualBlocks(facts, languageMode);
  if (templateId === "atlas_cram") return cramBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "exam_revision_sheet") return revisionBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "comparison_classification") return comparisonBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "qa_tutor") return qaBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "visual_concepts_formulas") return visualBlocks(facts, languageMode === "en" ? "en" : language);
  return completeBlocks(facts, languageMode === "en" ? "en" : language);
}

function sectionTitle(group, languageMode, index) {
  const first = group.facts[0];
  if (languageMode === "ar") return first.sectionTitleAr || first.sectionTitleEn || `القسم ${index + 1}`;
  if (languageMode === "bilingual") {
    if (first.sectionTitleEn && first.sectionTitleAr && first.sectionTitleEn !== first.sectionTitleAr) {
      return `${first.sectionTitleEn} — ${first.sectionTitleAr}`;
    }
    return first.sectionTitleEn || first.sectionTitleAr || `Section ${index + 1}`;
  }
  return first.sectionTitleEn || first.sectionTitleAr || `Section ${index + 1}`;
}

export function assembleSummaryDocumentFromFacts(facts, {
  title = "Summary",
  templateId = "bilingual_lecture",
  languageMode = "bilingual",
  colorLevel = "medium",
  maxPages = 16,
  sourceFingerprint = "",
} = {}) {
  const resolvedTemplate = resolveSummaryTemplateId(templateId);
  if (!resolvedTemplate) throw new Error(`UNKNOWN_SUMMARY_TEMPLATE:${templateId}`);
  const contract = getSummaryTemplateContract(resolvedTemplate);
  const effectiveLanguage = resolvedTemplate === "bilingual_lecture" ? "bilingual" : (languageMode === "mixed" ? "bilingual" : languageMode);
  const wordBudget = Math.max(1_800, Math.min(180_000, Number(maxPages || 16) * 900));
  const maxFacts = Math.max(12, Math.min(1_200, Math.floor(wordBudget / (effectiveLanguage === "bilingual" ? 20 : 15))));
  const selected = [...facts].sort((a, b) => a.chunkIndex - b.chunkIndex || b.importance - a.importance).slice(0, maxFacts);
  if (!selected.length) throw new Error("NO_GROUNDED_SUMMARY_FACTS");
  const maxSections = contract?.structure?.maxSections || 48;
  const groups = groupFacts(selected, maxSections);
  const sections = groups.map((group, index) => ({
    title: sectionTitle(group, effectiveLanguage, index),
    blocks: blockFactory(resolvedTemplate, group.facts, effectiveLanguage),
    ...factRefs(group.facts),
  }));
  const top = [...selected].sort((a, b) => b.importance - a.importance).slice(0, 6);
  const hasArabicFacts = selected.some((f) => /[\u0600-\u06ff]/.test(`${f.statementAr || ""} ${f.explanationAr || ""}`));
  const overviewLanguage = effectiveLanguage === "en" ? "en" : (hasArabicFacts ? "ar" : "en");
  const overviewItems = top
    .map((fact, idx) => {
      const text = factText(fact, overviewLanguage);
      if (!text) return "";
      return idx === 0
        ? `${overviewLanguage === "ar" ? "نظرة شاملة:" : "Overview:"} ${text}`
        : text;
    })
    .filter(Boolean);
  const conclusionFacts = top.slice(0, 4);
  const conclusionItems = conclusionFacts
    .map((fact, idx) => {
      const text = factText(fact, overviewLanguage, true) || factText(fact, overviewLanguage);
      if (!text) return "";
      return idx === 0
        ? `${overviewLanguage === "ar" ? "الخلاصة:" : "Conclusion:"} ${text}`
        : text;
    })
    .filter(Boolean);
  const overview = [{
    type: "bullet_list",
    role: "body",
    items: overviewItems.length ? overviewItems : [overviewLanguage === "ar" ? "نظرة عامة على محاور المحاضرة." : "Overview of lecture topics."],
    ...factRefs(top),
  }];
  const conclusion = [{
    type: "bullet_list",
    role: "body",
    items: conclusionItems.length ? conclusionItems : [overviewLanguage === "ar" ? "خلاصة أهم النقاط الامتحانية." : "Conclusion of key study points."],
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
    maxPages: Math.max(Number(maxPages || 16) * 4, 80),
  });
  return { document, markdown: summaryDocumentToMarkdown(document), validation, facts: selected };
}
