import assert from "node:assert/strict";
import { performance } from "node:perf_hooks";
import { PROMPTS } from "../src/lib/ai.js";
import { splitCourseText, SUMMARY_CHUNK_SIZE } from "../src/lib/courseChunking.js";
import {
  applySummaryColorPolicy,
  insertBeforeSummaryConclusion,
} from "../src/lib/summaryMarkup.js";
import {
  analyzeDocument,
  buildCoverageReport,
  generateHierarchicalSummary,
} from "../src/lib/summaryPipeline.js";

const validSummary = (marker = "1") => `## Quick Overview
This lecture explains **Cellular Respiration** and its energy pathway. [صفحة ${marker}]

## Cellular Respiration
- **Cellular Respiration** converts glucose into ATP.
  - The equation is \`C6H12O6 + 6O2 = 6CO2 + 6H2O + ATP\`.
- An example is ATP production in muscle cells.

**الشرح بالعربي:**
التنفس الخلوي هو مسار تحويل الجلوكوز إلى طاقة **ATP**، وتشمل المعادلة الجلوكوز والأكسجين والنواتج الموضحة. المثال الوارد هو إنتاج الطاقة داخل الخلايا العضلية. [صفحة ${marker}]

## Summary Conclusion
Cellular respiration links glucose oxidation to usable ATP energy.`;

function makeSource(targetChars) {
  const paragraph = `[صفحة 1]\nCellular Respiration is defined as the process that converts glucose into ATP. The equation is C6H12O6 + 6O2 = 6CO2 + 6H2O + ATP. For example, muscle cells use ATP during contraction.\n\n`;
  return paragraph.repeat(Math.ceil(targetChars / paragraph.length)).slice(0, targetChars);
}

function createMockInvoke() {
  let calls = 0;
  return {
    get calls() { return calls; },
    invoke: async ({ text }) => {
      calls += 1;
      if (String(text).includes("Coverage Addendum")) {
        return { summary_markdown: "## Coverage Addendum\n- **Cellular Respiration** remains source-grounded. [صفحة 1]" };
      }
      return { summary_markdown: validSummary("1") };
    },
  };
}

const overColored = "## Test\n==cyan:Definition of energy== ==cyan:Example case== ==cyan:Warning exception== ==cyan:Important fact== ==cyan:Term 5== ==cyan:Term 6== ==cyan:Term 7==";
const balanced = applySummaryColorPolicy(overColored, "medium");
const balancedHighlights = [...balanced.matchAll(/==(\w+):/g)].map((match) => match[1]);
assert.equal(balancedHighlights.length, 4, "medium color policy must cap each section at four highlights");
assert.ok(new Set(balancedHighlights).size > 1, "repeated one-color output must be balanced");
assert.equal((applySummaryColorPolicy(overColored, "none").match(/==/g) || []).length, 0);

const ordered = insertBeforeSummaryConclusion(
  "## Topic\nBody\n\n## Summary Conclusion\nEnd",
  "## Coverage Addendum\nMissing",
);
assert.ok(ordered.indexOf("Coverage Addendum") < ordered.indexOf("Summary Conclusion"));

const budgetPrompt = PROMPTS.summary("source", "bilingual_lecture", 30, "bilingual", 0, 10);
assert.match(budgetPrompt, /نحو 3 صفحة من أصل 30/);

const reports = [];
for (const targetChars of [5_000, 100_000, 1_000_000]) {
  const source = makeSource(targetChars);
  const started = performance.now();
  const chunks = splitCourseText(source);
  assert.ok(chunks.every((chunk) => chunk.length <= SUMMARY_CHUNK_SIZE));
  const minimumChunks = Math.max(1, Math.ceil(targetChars / SUMMARY_CHUNK_SIZE));
  assert.ok(chunks.length >= minimumChunks && chunks.length <= minimumChunks + 1);

  const mock = createMockInvoke();
  const result = await generateHierarchicalSummary({
    text: source,
    fileName: `lecture-${targetChars}.txt`,
    language: "bilingual",
    style: "bilingual_lecture",
    stylePrompt: "English points then a complete Arabic explanation after every section.",
    maxPages: targetChars >= 1_000_000 ? 30 : 12,
    colorLevel: "medium",
    invoke: mock.invoke,
    featureFlags: { summary_pipeline_v3: false },
  });
  const analysis = analyzeDocument(source);
  const coverage = buildCoverageReport(source, result.summary, {
    language: "bilingual",
    style: "bilingual_lecture",
    colorLevel: "medium",
  });
  assert.equal(analysis.chars, targetChars);
  assert.equal(coverage.structure.bilingualLayoutOk, true);
  assert.equal(coverage.structure.colorPolicyOk, true);
  assert.match(result.summary, /\*\*الشرح بالعربي:\*\*/);
  assert.match(result.summary, /^## Quick Overview/m);
  assert.match(result.summary, /^## Summary Conclusion/m);
  reports.push({
    chars: targetChars,
    chunks: result.chunks,
    aiCalls: mock.calls,
    coverage: result.coverage.score,
    elapsedMs: Math.round(performance.now() - started),
  });
}

console.log(JSON.stringify({ ok: true, reports }, null, 2));
