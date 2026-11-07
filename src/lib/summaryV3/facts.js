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
      sectionTitleEn: contentDrivenTitle(text, "en"),
      sectionTitleAr: contentDrivenTitle(text, "ar"),
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

const PART_TITLE_RE = /^(?:الجزء|source part|part)\s*\d+/i;

/** Title from the CONTENT itself — never "الجزء N" scaffolding. The owner
 * mandated: no chunk-boundary titles anywhere a student can see. */
function contentDrivenTitle(text, language = "ar") {
  const snippet = clean(text, 64).replace(/[.،:؛]\s*$/, "");
  if (!snippet) return language === "ar" ? "محور الدراسة" : "Study Focus";
  const words = snippet.split(/\s+/).slice(0, 9).join(" ");
  return words.length < snippet.length ? `${words}…` : words;
}

/** Normalizes a section key: chunk scaffolding titles get upgraded to a
 * content-driven snippet extracted from the group's first real text. */
function saneSectionKey(key, facts) {
  const trimmed = clean(key, 180);
  if (trimmed && !PART_TITLE_RE.test(trimmed)) return trimmed;
  const firstText = facts
    .map((fact) => fact.statementAr || fact.statementEn || fact.sourceEvidence || "")
    .find((text) => clean(text, 10).length >= 10);
  return contentDrivenTitle(firstText);
}

function groupFacts(facts, maxSections) {
  const groups = [];
  for (const fact of facts) {
    const key = clean(fact.sectionTitleEn || fact.sectionTitleAr || "", 180)
      || contentDrivenTitle(fact.statementAr || fact.statementEn || fact.sourceEvidence, "ar");
    let group = groups.at(-1);
    if (!group || group.key !== key || group.facts.length >= 16) {
      group = { key, facts: [] };
      groups.push(group);
    }
    group.facts.push(fact);
  }
  if (groups.length <= maxSections) {
    return groups.map((group) => ({ ...group, key: saneSectionKey(group.key, group.facts) }));
  }
  const compactGroups = Array.from({ length: maxSections }, (_, index) => ({ key: groups[Math.floor((index * groups.length) / maxSections)]?.key || `Section ${index + 1}`, facts: [] }));
  groups.forEach((group, index) => compactGroups[Math.min(maxSections - 1, Math.floor((index * maxSections) / groups.length))].facts.push(...group.facts));
  return compactGroups
    .filter((group) => group.facts.length)
    .map((group) => ({ ...group, key: saneSectionKey(group.key, group.facts) }));
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
 * "Complete study guide" — structured lead definition + organized points + deep explanation.
 * Only emits a comparison table when there are ≥ 4 items with distinct statements and explanations.
 */
function completeBlocks(facts, language) {
  const refs = factRefs(facts);
  const isAr = language === "ar";
  const items = facts
    .map((fact) => {
      const base = factText(fact, language);
      if (!base) return "";
      if (fact.keyTerm && !base.toLowerCase().includes(fact.keyTerm.toLowerCase())) {
        return `${fact.keyTerm} — ${base}`;
      }
      return base;
    })
    .filter(Boolean);

  const distinctComparisons = facts.filter((fact) => {
    const stmt = isAr ? fact.statementAr : fact.statementEn;
    const expl = isAr ? fact.explanationAr : fact.explanationEn;
    return fact.keyTerm && stmt && expl && stmt.trim() !== expl.trim();
  });

  const blocks = [];
  if (items.length) {
    blocks.push({ type: "bullet_list", role: "body", items, ...refs });
  }

  if (distinctComparisons.length >= 4) {
    blocks.push({
      type: "table",
      role: "definition",
      table: {
        headers: isAr
          ? ["المفهوم العلمي", "القاعدة الأساسية", "التفسير والتفصيل"]
          : ["Concept", "Core Principle", "Mechanism & Detail"],
        rows: distinctComparisons.map((fact) => [
          fact.keyTerm,
          isAr ? fact.statementAr : fact.statementEn,
          isAr ? fact.explanationAr : fact.explanationEn,
        ]),
      },
      ...factRefs(distinctComparisons),
    });
  } else {
    const detailedItems = facts
      .map((fact) => {
        const expl = isAr
          ? fact.explanationAr || factText(fact, language, true)
          : fact.explanationEn || factText(fact, language, true);
        if (!expl) return "";
        return fact.keyTerm && !expl.toLowerCase().includes(fact.keyTerm.toLowerCase())
          ? `${fact.keyTerm}: ${expl}`
          : expl;
      })
      .filter(Boolean);
    if (detailedItems.length) {
      blocks.push({ type: "bullet_list", role: "definition", items: detailedItems, ...refs });
    }
  }

  if (blocks.length < 2) {
    const fallbackText = facts.map((fact) => factText(fact, language, true)).filter(Boolean)[0] ||
      (isAr ? "نقاط علمية أساسية للمراجعة والفهم." : "Core academic points for study and review.");
    blocks.push({ type: "paragraph", role: "definition", content: fallbackText, ...refs });
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
 * Structured with paired English study points + organized Arabic explanations
 * anchored by their scientific term, without dumping redundant 2-column glossary
 * tables in every single section.
 */
function foundationalBilingualBlocks(facts, languageMode) {
  const refs = factRefs(facts);
  const isArabic = languageMode !== "en";
  const english = facts
    .map((fact) => {
      const en = factText(fact, "en");
      if (!en) return "";
      if (fact.keyTerm && !en.toLowerCase().includes(fact.keyTerm.toLowerCase())) {
        return `${fact.keyTerm}: ${en}`;
      }
      return en;
    })
    .filter(Boolean);

  const explanations = facts
    .map((fact) => {
      const text = isArabic
        ? factText(fact, "ar", true)
        : (fact.explanationEn || factText(fact, "en", true));
      if (!text) return "";
      if (fact.keyTerm && !text.toLowerCase().includes(fact.keyTerm.toLowerCase())) {
        return `${fact.keyTerm} — ${text}`;
      }
      return text;
    })
    .filter(Boolean);

  const leadDefFact = facts.find((f) => f.semanticType === "definition" || (f.importance || 0) >= 4) || facts[0];
  const leadDefText = leadDefFact
    ? (isArabic
      ? (leadDefFact.statementAr || leadDefFact.explanationAr || "")
      : (leadDefFact.statementEn || leadDefFact.explanationEn || ""))
    : "";

  const blocks = [];
  if (leadDefFact?.keyTerm && leadDefText) {
    blocks.push({
      type: "paragraph",
      role: "definition",
      content: `${leadDefFact.keyTerm}: ${leadDefText}`,
      ...factRefs([leadDefFact]),
    });
  }
  if (english.length) {
    blocks.push({ type: "bullet_list", role: "english_points", items: english, ...refs });
  }
  if (explanations.length) {
    blocks.push({ type: "bullet_list", role: "arabic_explanation", items: explanations, ...refs });
  } else if (english.length) {
    blocks.push({ type: "bullet_list", role: "arabic_explanation", items: english, ...refs });
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

/** Tiny sections (1–2 facts) can make a callout's joined text byte-identical
 * to the body block's, which trips the global duplicate-content validator and
 * kills generation. A short label prefix keeps the box clearly labeled AND
 * textually distinct. Sections with 3+ facts always differ block-vs-box, so
 * they keep the clean joined text. */
function calloutText(joined, facts, language, label) {
  if (!joined) return "";
  if (facts.length > 2) return joined;
  return `${label}${joined}`;
}

/**
 * "Royal Study Paper" (الملكية) — the design is born in the document:
 * every section emits, in order:
 *   (a) definition strip — one bolded "**keyTerm** — explanation" bullet per
 *       key-term fact, FIRST;
 *   (b) body bullet list — factText for the remaining (non-key-term) facts,
 *       falling back to all facts when every fact carries a key term;
 *   (c) danger callout — semantic "warning" facts and critical (importance≥5)
 *       facts WITHOUT a key term, pinned at the section end;
 *   (d) pearl callout — critical key-term facts (the golden exam pearls).
 * Callout text lives in `content.text` (a plain string) because the viewer
 * renders warning/example boxes from exactly that field. A fact never feeds
 * two boxes, so the duplicate-content ratio stays flat. Sections always
 * return ≥3 blocks to satisfy the contract's minBlocksPerSection — padding is
 * deterministic, never fabricated content.
 */
function royalBlocks(facts, language) {
  const refs = factRefs(facts);
  const blocks = [];
  const termFacts = facts.filter((fact) => fact.keyTerm);
  const definitionItems = termFacts
    .map((fact) => {
      const explanation = factText(fact, language, true) || factText(fact, language);
      return explanation ? `**${fact.keyTerm}** — ${explanation}` : "";
    })
    .filter(Boolean);
  if (definitionItems.length) {
    blocks.push({ type: "bullet_list", role: "definition", items: definitionItems, ...factRefs(termFacts) });
  }
  const restFacts = facts.filter((fact) => !fact.keyTerm);
  const bodyFacts = restFacts.length ? restFacts : facts;
  const bodyItems = bodyFacts.map((fact) => factText(fact, language)).filter(Boolean);
  if (bodyItems.length) blocks.push({ type: "bullet_list", role: "body", items: bodyItems, ...factRefs(bodyFacts) });

  const dangerFacts = facts.filter((fact) => fact.semantic === "warning" || (Number(fact.importance) >= 5 && !fact.keyTerm));
  const dangerText = calloutText(
    dangerFacts.map((fact) => factText(fact, language, true) || factText(fact, language)).filter(Boolean).join("\n"),
    facts,
    language,
    language === "ar" ? "تحذير: " : "Danger: ",
  );
  if (dangerText) blocks.push({ type: "callout", role: "warning", content: { text: dangerText }, ...factRefs(dangerFacts) });

  const pearlFacts = facts.filter((fact) => fact.keyTerm && Number(fact.importance) >= 5 && fact.semantic !== "warning");
  const pearlText = calloutText(
    pearlFacts.map((fact) => factText(fact, language, true) || factText(fact, language)).filter(Boolean).join("\n"),
    facts,
    language,
    language === "ar" ? "لؤلؤة: " : "Pearl: ",
  );
  if (pearlText) blocks.push({ type: "callout", role: "example", content: { text: pearlText }, ...factRefs(pearlFacts) });

  // minBlocksPerSection is 3 for this contract: pad deterministically rather
  // than let a thin section fail validation and abort the whole generation.
  if (blocks.length < 3 && !definitionItems.length) {
    const detailed = facts
      .map((fact, index) => {
        const text = factText(fact, language, true) || factText(fact, language);
        return text ? `${language === "ar" ? "توضيح" : "Detail"} (${index + 1}): ${text}` : "";
      })
      .filter(Boolean);
    if (detailed.length) blocks.unshift({ type: "bullet_list", role: "definition", items: detailed, ...refs });
  }
  if (blocks.length < 3) {
    const top = [...facts].sort((a, b) => (b.importance || 0) - (a.importance || 0)).slice(0, 2);
    const recap = top.map((fact) => factText(fact, language, true) || factText(fact, language)).filter(Boolean).join(" · ");
    if (recap) {
      blocks.push({
        type: "callout",
        role: "example",
        content: { text: `${language === "ar" ? "لؤلؤة الباب: " : "Chapter pearl: "}${recap}` },
        ...factRefs(top),
      });
    }
  }
  return blocks;
}

/**
 * "Capsule Sheet" (الكبسولة) — dense revision bullets, ALWAYS sealed by a
 * warning callout holding the top-2 facts by importance (joined " · ") when
 * any fact scores importance≥4. Thin sections with no high-yield fact still
 * get a (prefixed) seal so minBlocksPerSection: 2 never fails validation.
 */
function capsuleBlocks(facts, language) {
  const bodyItems = facts.map((fact) => factText(fact, language)).filter(Boolean);
  const blocks = [];
  if (bodyItems.length) blocks.push({ type: "bullet_list", role: "body", items: bodyItems, ...factRefs(facts) });
  const ranked = [...facts].sort((a, b) => (b.importance || 0) - (a.importance || 0));
  const strong = ranked.filter((fact) => Number(fact.importance) >= 4);
  const seal = (strong.length ? strong : ranked).slice(0, 2);
  const joined = seal.map((fact) => factText(fact, language, true) || factText(fact, language)).filter(Boolean).join(" · ");
  const text = strong.length
    ? calloutText(joined, facts, language, language === "ar" ? "الأهم: " : "Must know: ")
    : (joined ? `${language === "ar" ? "الأهم للمراجعة: " : "Revision focus: "}${joined}` : "");
  if (text) blocks.push({ type: "callout", role: "warning", content: { text }, ...factRefs(seal) });
  return blocks;
}

function blockFactory(templateId, facts, languageMode) {
  const language = languageMode === "ar" ? "ar" : (languageMode === "bilingual" ? "ar" : "en");
  if (templateId === "bilingual_lecture") return bilingualBlocks(facts);
  if (templateId === "foundational_bilingual") return foundationalBilingualBlocks(facts, languageMode);
  if (templateId === "atlas_cram") return cramBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "exam_revision_sheet") return revisionBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "royal_study") return royalBlocks(facts, languageMode === "en" ? "en" : language);
  if (templateId === "capsule_sheet") return capsuleBlocks(facts, languageMode === "en" ? "en" : language);
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
  // Owner directive: a summary is a tight study paper — chapters scale WITH
  // the material (≈1 substantial chapter per ~5 summary pages), never 20+
  // chunk fragments: 3 chapters for short content, topping at 9 for Huge docs.
  const scaledSections = Math.max(3, Math.min(9, Math.ceil(Number(maxPages || 16) / 5)));
  const maxSections = Math.min(contract?.structure?.maxSections || 48, scaledSections);
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
