import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { splitCourseText } from "../src/lib/courseChunking.js";
import { generateHierarchicalSummary } from "../src/lib/summaryPipeline.js";
import { getSummaryJob } from "../src/lib/summaryJobs.js";
import {
  SUMMARY_TEMPLATE_REGISTRY,
  SUMMARY_TEMPLATE_ALIASES,
  applyDeterministicSectionEmphasis,
  assertValidSummaryDocument,
  createSummaryDocument,
  detectSummaryDirection,
  detectSummaryLanguage,
  hasLegacyMarkupLeak,
  isSummaryV3Document,
  migrateLegacySummaryMarkdown,
  normalizeLegacyHighlightMarkup,
  normalizeSummaryDocument,
  parseLegacyRichText,
  requireSummaryTemplateContract,
  resolveSummaryTemplateId,
  segmentBidirectionalText,
  summaryDocumentToMarkdown,
  validateSummaryDocument,
} from "../src/lib/summaryV3/index.js";

const expectedTemplateIds = [
  // Atlas V5 defaults first: the Create Course dialog offers them, so they MUST
  // exist here — while they were missing, the default create flow threw
  // UNKNOWN_SUMMARY_TEMPLATE and no summary could be generated at all.
  "foundational_bilingual",
  "atlas_cram",
  "bilingual_lecture",
  "complete_study_guide",
  "exam_revision_sheet",
  "comparison_classification",
  "qa_tutor",
  "visual_concepts_formulas",
];
assert.deepEqual(Object.keys(SUMMARY_TEMPLATE_REGISTRY), expectedTemplateIds);
assert.equal(new Set(Object.values(SUMMARY_TEMPLATE_REGISTRY).map((contract) => JSON.stringify(contract.structure))).size, 8);
const requiredTemplateAliases = {
  lecture_exact: "complete_study_guide",
  complete: "complete_study_guide",
  revision_sheet: "exam_revision_sheet",
  key_points: "exam_revision_sheet",
  equations_only: "visual_concepts_formulas",
};
assert.deepEqual(
  Object.fromEntries(Object.keys(requiredTemplateAliases).map((id) => [id, SUMMARY_TEMPLATE_ALIASES[id]])),
  requiredTemplateAliases,
);
for (const [legacyId, canonicalId] of Object.entries(requiredTemplateAliases)) {
  assert.equal(resolveSummaryTemplateId(legacyId), canonicalId);
  assert.equal(requireSummaryTemplateContract(legacyId).id, canonicalId);
}
assert.equal(resolveSummaryTemplateId("not_a_template"), null);
assert.throws(() => requireSummaryTemplateContract("not_a_template"), /UNKNOWN_SUMMARY_TEMPLATE/);

const mostlyArabic = "هذا شرح عربي طويل وواضح للمحاضرة ويحتوي على تعريفات وأمثلة وتطبيقات مهمة ATP ECG";
assert.equal(detectSummaryLanguage(mostlyArabic), "ar");
assert.equal(detectSummaryDirection(mostlyArabic), "rtl");
assert.equal(detectSummaryDirection("Cellular respiration produces ATP."), "ltr");
assert.deepEqual(
  segmentBidirectionalText("التنفس Cellular Respiration مهم").map((segment) => segment.direction),
  ["rtl", "ltr", "rtl"],
);

assert.equal(normalizeLegacyHighlightMarkup("==term==:cyan=="), "==cyan:term==");
assert.equal(normalizeLegacyHighlightMarkup("==cyan==:term=="), "==cyan:term==");
assert.equal(normalizeLegacyHighlightMarkup("`a == b` ==cyan:ATP==", { strip: true }), "`a == b` ATP");
assert.equal(hasLegacyMarkupLeak("a == b"), false);

const parsed = parseLegacyRichText("A **==green:definition==** and `x = y`.");
assert.equal(parsed.text, "A definition and x = y.");
assert.ok(parsed.annotations.some((annotation) => annotation.semantic === "definition" && annotation.bold && annotation.highlight));
assert.ok(parsed.annotations.some((annotation) => annotation.code));
assert.equal(hasLegacyMarkupLeak(parsed.text), false);

const legacy = `# Cellular Respiration

## Quick Overview
This lecture explains **cellular respiration** and ATP. [Page 1]

## Energy Conversion
- ==cyan:Cellular respiration== converts glucose into ATP.
- The formula is ==yellow:C6H12O6 + 6O2 = 6CO2 + 6H2O==. [Page 1]

**الشرح بالعربي:**
التنفس الخلوي هو عملية تحويل الجلوكوز إلى طاقة، وتوضح المعادلة المواد الداخلة والنواتج. [صفحة 1]

## Clinical Example
- Cells use ATP during muscle contraction. [Page 2]

**الشرح بالعربي:**
تستخدم الخلايا طاقة ATP أثناء انقباض العضلات، وهذا مثال تطبيقي مباشر. [صفحة 2]

## Summary Conclusion
Cellular respiration links glucose oxidation to usable energy.`;

const migrated = migrateLegacySummaryMarkdown(legacy, {
  templateId: "bilingual_lecture",
  languageMode: "bilingual",
  colorLevel: "medium",
});
assert.equal(migrated.schemaVersion, 3);
assert.equal(isSummaryV3Document(migrated), true);
assert.equal(migrated.sections.length, 2);
assert.deepEqual(migrated.metadata.sourceRefs, [1, 2]);
for (const section of migrated.sections) {
  assert.ok(section.blocks.some((block) => block.role === "english_points"));
  assert.ok(section.blocks.some((block) => block.role === "arabic_explanation"));
}
const migratedValidation = assertValidSummaryDocument(migrated, { sourcePages: [1, 2], maxPages: 5 });
assert.equal(migratedValidation.metrics.sectionHighlightCounts.every((count) => count <= 3), true);

const canonicalMarkdown = summaryDocumentToMarkdown(migrated);
assert.match(canonicalMarkdown, /^# Cellular Respiration/m);
assert.equal((canonicalMarkdown.match(/\*\*الشرح بالعربي:\*\*/g) || []).length, 2);
assert.equal((canonicalMarkdown.match(/^## Quick Overview$/gm) || []).length, 1);
assert.equal((canonicalMarkdown.match(/^## Summary Conclusion$/gm) || []).length, 1);

const incompatible = normalizeSummaryDocument({
  ...migrated,
  languageMode: "en",
});
assert.ok(validateSummaryDocument(incompatible).errors.some((error) => error.code === "TEMPLATE_LANGUAGE_CONFLICT"));

const missingArabic = normalizeSummaryDocument({
  ...migrated,
  sections: migrated.sections.map((section, index) => index === 1
    ? { ...section, blocks: section.blocks.filter((block) => block.role !== "arabic_explanation") }
    : section),
});
const missingArabicValidation = validateSummaryDocument(missingArabic);
assert.ok(missingArabicValidation.errors.some((error) => error.code === "MISSING_REQUIRED_SECTION_ROLE"));

const completeGuide = createSummaryDocument({
  title: "Complete Guide",
  templateId: "complete_study_guide",
  languageMode: "en",
  colorLevel: "none",
  overview: [{ type: "paragraph", role: "body", content: "A complete overview." }],
  sections: [{
    title: "Core Topic",
    blocks: [
      { type: "paragraph", role: "definition", content: "The core topic is defined here." },
      { type: "bullet_list", role: "body", items: ["First detail", "Second detail"] },
    ],
  }],
  conclusion: [{ type: "paragraph", role: "body", content: "The ideas are connected." }],
});
assert.equal(assertValidSummaryDocument(completeGuide).valid, true);
const incompleteGuide = normalizeSummaryDocument({
  ...completeGuide,
  sections: [{ title: "Core Topic", blocks: [{ type: "paragraph", role: "body", content: "Only one block." }] }],
});
assert.ok(validateSummaryDocument(incompleteGuide).errors.some((error) => error.code === "TOO_FEW_BLOCKS_IN_SECTION"));

const revisionSheet = createSummaryDocument({
  title: "Revision Sheet",
  templateId: "exam_revision_sheet",
  languageMode: "en",
  colorLevel: "none",
  sections: [{ title: "Exam Facts", blocks: [{ type: "bullet_list", role: "body", items: ["Fact one", "Fact two"] }] }],
  conclusion: [{ type: "paragraph", role: "body", content: "Review these facts." }],
});
assert.equal(assertValidSummaryDocument(revisionSheet).valid, true);

const comparisonSheet = createSummaryDocument({
  title: "Comparison",
  templateId: "comparison_classification",
  languageMode: "en",
  colorLevel: "none",
  sections: [{
    title: "Types",
    blocks: [{ type: "table", role: "body", table: { headers: ["Type", "Feature"], rows: [["A", "Fast"], ["B", "Accurate"]] } }],
  }],
});
assert.equal(assertValidSummaryDocument(comparisonSheet).valid, true);
const comparisonWithoutTable = normalizeSummaryDocument({
  ...comparisonSheet,
  sections: [{ title: "Types", blocks: [{ type: "paragraph", role: "body", content: "A and B differ." }] }],
});
assert.ok(validateSummaryDocument(comparisonWithoutTable).errors.some((error) => error.code === "MISSING_COMPARISON_TABLE"));

const qaTutor = createSummaryDocument({
  title: "Q and A",
  templateId: "qa_tutor",
  languageMode: "en",
  colorLevel: "none",
  sections: [{
    title: "Energy",
    blocks: [
      { type: "paragraph", role: "question", content: "What is ATP?" },
      { type: "paragraph", role: "answer", content: "ATP is a cellular energy carrier." },
    ],
  }],
});
assert.equal(assertValidSummaryDocument(qaTutor).valid, true);
const reversedQa = normalizeSummaryDocument({
  ...qaTutor,
  sections: [{ title: "Energy", blocks: [
    { type: "paragraph", role: "answer", content: "ATP carries energy." },
    { type: "paragraph", role: "question", content: "What is ATP?" },
  ] }],
});
assert.ok(validateSummaryDocument(reversedQa).errors.some((error) => error.code === "INVALID_QA_PAIR_SEQUENCE"));

const noColor = migrateLegacySummaryMarkdown(`## Topic
- ==yellow:Important fact==
- ==plain legacy marker==
- ==warning==:red==`, {
  templateId: "lecture_exact",
  languageMode: "en",
  colorLevel: "none",
});
assert.equal(validateSummaryDocument(noColor).metrics.highlights, 0);
assert.equal(hasLegacyMarkupLeak(noColor.sections[0].blocks[0].items.map((item) => item.text).join(" ")), false);

const noColorTitle = createSummaryDocument({
  title: "==yellow:Highlighted title==",
  templateId: "lecture_exact",
  languageMode: "en",
  colorLevel: "none",
  sections: [{ title: "Topic", blocks: [{ type: "paragraph", role: "body", content: "Body." }] }],
});
assert.equal(noColorTitle.title.annotations.filter((annotation) => annotation.highlight).length, 0);

const ranked = normalizeSummaryDocument({
  templateId: "lecture_exact",
  languageMode: "en",
  colorLevel: "rich",
  title: "Safety",
  sections: [{
    title: "Safety",
    blocks: [{
      type: "paragraph",
      role: "body",
      content: "==cyan:Term one==, ==cyan:Term two==, ==cyan:Term three==, ==green:Defined as a safety rule==, and ==red:Warning: never mix these substances==.",
    }],
  }],
});
applyDeterministicSectionEmphasis(ranked.sections[0], "medium");
const rankedAnnotations = ranked.sections[0].blocks[0].content.annotations;
assert.equal(rankedAnnotations.filter((annotation) => annotation.highlight).length, 4);
assert.ok(rankedAnnotations.some((annotation) => annotation.semantic === "warning" && annotation.highlight));
assert.ok(rankedAnnotations.filter((annotation) => annotation.semantic === "term").some((annotation) => !annotation.highlight));

const inventedPage = structuredClone(migrated);
inventedPage.sections[0].blocks[0].sourceRefs.push(999);
assert.ok(validateSummaryDocument(inventedPage, { sourcePages: [1, 2] }).errors.some((error) => error.code === "INVENTED_SOURCE_PAGE"));

const unknownFact = structuredClone(migrated);
unknownFact.sections[0].blocks[0].sourceFactIds.push("fact_missing");
assert.ok(validateSummaryDocument(unknownFact, { sourceFactIds: ["fact_1"] }).errors.some((error) => error.code === "UNKNOWN_SOURCE_FACT"));

const equationDocument = createSummaryDocument({
  title: "Equations",
  templateId: "equations_only",
  languageMode: "en",
  colorLevel: "none",
  sections: [{
    title: "Energy",
    blocks: [{ type: "equation", role: "formula", content: "a == b == c\nE = mc^2" }],
  }],
});
assert.equal(assertValidSummaryDocument(equationDocument).valid, true);
assert.equal(equationDocument.templateId, "visual_concepts_formulas");
assert.match(equationDocument.sections[0].blocks[0].content.text, /a == b == c/);
const missingEquation = normalizeSummaryDocument({
  ...equationDocument,
  sections: [{ title: "Energy", blocks: [{ type: "paragraph", role: "body", content: "Energy notes." }] }],
});
assert.ok(validateSummaryDocument(missingEquation).errors.some((error) => error.code === "MISSING_VISUAL_OR_FORMULA_BLOCK"));

const licensedImageDocument = createSummaryDocument({
  title: "Clinical image guide",
  templateId: "complete_study_guide",
  languageMode: "en",
  colorLevel: "medium",
  overview: [{ type: "paragraph", role: "body", content: "A sourced visual supports this guide." }],
  sections: [{
    title: "Visual anatomy",
    blocks: [
      { type: "paragraph", role: "body", content: "The diagram is reviewed before insertion." },
      {
        type: "image",
        role: "example",
        src: "https://upload.wikimedia.org/wikipedia/commons/thumb/a/a3/Example.jpg/640px-Example.jpg",
        alt: "Example anatomy image",
        content: "Approved educational diagram",
        attribution: {
          creator: "Wikimedia contributor",
          license: "by-sa",
          licenseUrl: "https://creativecommons.org/licenses/by-sa/4.0/",
          sourcePage: "https://commons.wikimedia.org/wiki/File:Example.jpg",
          provider: "wikimedia",
          approved: true,
        },
      },
    ],
  }],
  conclusion: [{ type: "paragraph", role: "body", content: "Use visuals with attribution." }],
});
assert.equal(validateSummaryDocument(licensedImageDocument).valid, true);
const licensedImageMarkdown = summaryDocumentToMarkdown(licensedImageDocument);
assert.match(licensedImageMarkdown, /!\[Example anatomy image\]/);
assert.match(licensedImageMarkdown, /Image credit: Wikimedia contributor \| by-sa/);
const remigratedImageDocument = migrateLegacySummaryMarkdown(licensedImageMarkdown, {
  templateId: "complete_study_guide",
  languageMode: "en",
  colorLevel: "medium",
});
const remigratedImage = remigratedImageDocument.sections.flatMap((section) => section.blocks).find((block) => block.type === "image");
assert.equal(remigratedImage?.attribution?.approved, true);
assert.equal(remigratedImage?.attribution?.license, "by-sa");
assert.match(remigratedImage?.src || "", /^https:\/\/upload\.wikimedia\.org\//);

const overBudget = validateSummaryDocument(migrated, { maxWords: 8 });
assert.ok(overBudget.errors.some((error) => error.code === "SUMMARY_WORD_BUDGET_EXCEEDED"));

function makeGroundedSource(targetChars) {
  const rows = [];
  let length = 0;
  for (let index = 0; length < targetChars; index += 1) {
    const code = index.toString(36).padStart(6, "0");
    const page = (index % 200) + 1;
    const row = `[Page ${page}] Conceptcode${code} is defined as signalcode${code} converting pathcode${code} into outcomecode${code}; metriccode${code} verifies value ${index + 17}, while casecode${code} demonstrates the same source mechanism.`;
    rows.push(row);
    length += row.length + 2;
  }
  return rows.join("\n\n").slice(0, targetChars);
}

function createGroundedFactMock({ failOnceAt = -1 } = {}) {
  const attemptsByChunk = new Map();
  let calls = 0;
  return {
    get calls() { return calls; },
    attemptsByChunk,
    invoke: async ({ task, text, chunkIndex }) => {
      assert.equal(task, "summary_facts");
      calls += 1;
      const attempt = (attemptsByChunk.get(chunkIndex) || 0) + 1;
      attemptsByChunk.set(chunkIndex, attempt);
      if (chunkIndex === failOnceAt && attempt === 1) throw new Error("temporary summary fact extraction failure");

      const rows = String(text).split(/\n{2,}/).map((row) => row.trim()).filter((row) => /Conceptcode[0-9a-z]{6}/.test(row));
      const facts = rows.slice(0, 4).map((evidence) => {
        const page = Number(evidence.match(/^\[Page\s+(\d+)\]/i)?.[1]);
        const term = evidence.match(/Conceptcode[0-9a-z]{6}/)?.[0] || "";
        const statement = evidence.replace(/^\[Page\s+\d+\]\s*/i, "").split(";")[0];
        return {
          statement_en: statement,
          explanation_en: evidence.replace(/^\[Page\s+\d+\]\s*/i, ""),
          key_term: term,
          semantic_type: "definition",
          importance: 5,
          section_title_en: `Source module ${Math.floor(chunkIndex / 4) + 1}`,
          source_page: page,
          source_evidence: evidence,
        };
      });
      assert.ok(facts.length >= 3, `chunk ${chunkIndex + 1} must expose at least three grounded facts`);
      return { facts, model_actual: "grounded-fact-test-model" };
    },
  };
}

const groundedPipelineReports = [];
for (const targetChars of [5_000, 100_000, 1_000_000]) {
  const source = makeGroundedSource(targetChars);
  const expectedChunks = splitCourseText(source).length;
  const mock = createGroundedFactMock({ failOnceAt: targetChars === 100_000 ? 1 : -1 });
  const startedAt = performance.now();
  const options = {
    text: source,
    fileName: `grounded-${targetChars}.txt`,
    language: "en",
    style: "complete_study_guide",
    maxPages: targetChars >= 1_000_000 ? 30 : 12,
    colorLevel: "none",
    invoke: mock.invoke,
    featureFlags: { summary_pipeline_v3: true },
  };
  const result = await generateHierarchicalSummary(options);
  assert.equal(result.pipelineVersion, "summary-v3");
  assert.equal(result.validation.valid, true);
  assert.equal(result.chunks, expectedChunks);
  assert.ok(result.facts.length >= expectedChunks * 3);
  assert.equal(new Set(result.facts.map((fact) => fact.id)).size, result.facts.length);
  assert.equal(new Set(result.facts.map((fact) => fact.sourceEvidence)).size, result.facts.length);
  assert.equal(new Set(result.facts.map((fact) => fact.chunkIndex)).size, expectedChunks);
  assert.ok(result.facts.every((fact) => fact.groundingScore === 1 && source.includes(fact.sourceEvidence)));
  assert.ok(result.facts.every((fact) => Number.isInteger(fact.sourcePage) && fact.sourcePage > 0));
  assert.deepEqual(result.document.metadata.sourceFactIds, result.facts.map((fact) => fact.id));

  const persisted = await getSummaryJob(result.jobId);
  assert.equal(persisted.job.status, "completed");
  assert.equal(persisted.job.completed_chunks, expectedChunks);
  assert.ok(persisted.job.chunks.every((chunk) => chunk.status === "completed"));
  if (targetChars === 100_000) assert.equal(mock.attemptsByChunk.get(1), 2);

  if (targetChars === 5_000) {
    const callsBeforeResume = mock.calls;
    const resumed = await generateHierarchicalSummary(options);
    assert.equal(resumed.resumed, true);
    assert.equal(resumed.jobId, result.jobId);
    assert.equal(mock.calls, callsBeforeResume, "completed V3 snapshot must resume without another AI call");
  }

  groundedPipelineReports.push({
    chars: targetChars,
    chunks: expectedChunks,
    groundedFacts: result.facts.length,
    aiCalls: mock.calls,
    retryAttempts: targetChars === 100_000 ? mock.attemptsByChunk.get(1) : 1,
    elapsedMs: Math.round(performance.now() - startedAt),
  });
}

console.log(JSON.stringify({
  ok: true,
  templates: Object.keys(SUMMARY_TEMPLATE_REGISTRY),
  migratedSections: migrated.sections.length,
  migratedMetrics: migratedValidation.metrics,
  groundedPipelineReports,
}, null, 2));
