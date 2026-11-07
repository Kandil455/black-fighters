import test from "node:test";
import assert from "node:assert/strict";

import { validatePlan, repairPlan } from "../../src/features/lectures/ai/validatePlan.js";
import { buildFallbackPlan } from "../../src/features/lectures/ai/fallbackPlan.js";
import {
  buildOrganizeWindows,
  organizeSingleWindow,
  stitchWindowPlans,
} from "../../src/features/lectures/ai/organize.js";
import { formatSentenceId } from "../../src/features/lectures/text/segment.js";

function makeWindowSentences(count = 12, startNum = 1) {
  return Array.from({ length: count }, (_, idx) => {
    const num = startNum + idx;
    return {
      id: formatSentenceId(num),
      num,
      chunk: 0,
      tSec: idx * 5,
      text: `دي الجملة رقم ${num} في المحاضرة وفيها مصطلح Pharmacology واضح.`,
    };
  });
}

test("validatePlan: accepts a valid contiguous plan and normalizes IDs", () => {
  const sentences = makeWindowSentences(9, 1);
  const plan = {
    sections: [
      { title: "مقدمة المحاضرة", from: "s000001", to: "s000004", kind: "intro", continues_previous: false },
      { title: "آلية العمل", from: "s000005", to: "s000009", kind: "mechanism", continues_previous: false },
    ],
    paragraph_breaks: ["s000003", "s000007"],
    annotations: [
      { id: "s000002", kind: "definition", term: "Pharmacology" },
      { id: "s000006", kind: "key_point" },
      { id: "s000008", kind: "exam" },
    ],
    offtopic: [{ from: "s000001", to: "s000001", kind: "greeting" }],
    terms: [{ en: "Pharmacology", ar_hint: "علم الأدوية", first_id: "s000002" }],
  };

  const res = validatePlan(plan, sentences);
  assert.equal(res.valid, true, `Unexpected errors: ${res.errors.join(", ")}`);
  assert.equal(res.normalizedPlan.sections.length, 2);
  assert.equal(res.normalizedPlan.annotations.length, 3);
});

test("validatePlan: detects gap, overlap, unknown IDs, unsorted breaks, and too many annotations", () => {
  const sentences = makeWindowSentences(9, 1);

  // 1. Gap between sections (s000004 missing)
  const gapPlan = {
    sections: [
      { title: "أول", from: "s000001", to: "s000003", kind: "intro" },
      { title: "ثاني", from: "s000005", to: "s000009", kind: "concept" },
    ],
  };
  const gapRes = validatePlan(gapPlan, sentences);
  assert.equal(gapRes.valid, false);
  assert.ok(gapRes.errors.some((e) => e.startsWith("SECTION_GAP_AT")));

  // 2. Overlap between sections
  const overlapPlan = {
    sections: [
      { title: "أول", from: "s000001", to: "s000005", kind: "intro" },
      { title: "ثاني", from: "s000004", to: "s000009", kind: "concept" },
    ],
  };
  const overlapRes = validatePlan(overlapPlan, sentences);
  assert.equal(overlapRes.valid, false);
  assert.ok(overlapRes.errors.some((e) => e.startsWith("SECTION_OVERLAP_AT")));

  // 3. Unknown ID, unsorted breaks, and > 1 annotation per 3 sentences (9 sentences -> max 3)
  const messyPlan = {
    sections: [{ title: "كل المحاضرة", from: "s000001", to: "s000099", kind: "concept" }],
    paragraph_breaks: ["s000006", "s000002"],
    annotations: [
      { id: "s000001", kind: "key_point" },
      { id: "s000002", kind: "exam" },
      { id: "s000003", kind: "warning" },
      { id: "s000004", kind: "number" },
    ],
  };
  const messyRes = validatePlan(messyPlan, sentences);
  assert.equal(messyRes.valid, false);
  assert.ok(messyRes.errors.some((e) => e.startsWith("UNKNOWN_TO_ID")));
  assert.ok(messyRes.errors.some((e) => e.startsWith("UNSORTED_OR_DUPLICATE_BREAK")));
  assert.ok(messyRes.errors.some((e) => e.startsWith("TOO_MANY_ANNOTATIONS")));
});

test("repairPlan: repairs minor boundary shift under 30% threshold and rejects > 30% moves", () => {
  const sentences = makeWindowSentences(10, 1);

  // 2 sections = 4 boundaries. Moving 1 boundary = 25% <= 30% -> should repair!
  const minorDefectPlan = {
    sections: [
      { title: "مقدمة", from: "s000001", to: "s000004", kind: "intro" },
      // Gap at s000005: starts at s000006 instead of s000005 (1 boundary move out of 4 = 25%)
      { title: "تفاصيل", from: "s000006", to: "s000010", kind: "concept" },
    ],
    paragraph_breaks: ["s000008", "s000003", "s000003"],
    annotations: [
      { id: "s000007", kind: "exam" },
      { id: "s000002", kind: "key_point" },
      { id: "s000004", kind: "warning" },
      { id: "s000009", kind: "number" }, // 4th annotation on 10 sentences (max 3) -> should be capped to 3
    ],
  };

  const repaired = repairPlan(minorDefectPlan, sentences);
  assert.equal(repaired.repaired, true);
  assert.ok(repaired.moveRatio <= 0.3);
  assert.equal(repaired.plan.sections[1].from, "s000005");
  assert.deepEqual(repaired.plan.paragraph_breaks, ["s000003", "s000008"]);
  assert.equal(repaired.plan.annotations.length, 3);

  // Major boundary defect (>30% boundaries moved): 2 sections where 3 of 4 boundaries are wrong (75%)
  const majorDefectPlan = {
    sections: [
      { title: "أول", from: "s000003", to: "s000004", kind: "intro" },
      { title: "ثاني", from: "s000007", to: "s000008", kind: "concept" },
    ],
  };
  const rejected = repairPlan(majorDefectPlan, sentences);
  assert.equal(rejected.repaired, false);
  assert.ok(String(rejected.reason).startsWith("TOO_MANY_BOUNDARY_MOVES"));
});

test("buildFallbackPlan: always produces a plan that passes validatePlan", () => {
  const sentences = makeWindowSentences(25, 1);
  const fallback = buildFallbackPlan(sentences, { sectionStartNumber: 1 });
  const check = validatePlan(fallback, sentences);
  assert.equal(check.valid, true, `Fallback plan invalid: ${check.errors.join(", ")}`);
  assert.ok(fallback.sections.length >= 1);
  assert.equal(fallback.sections[0].from, "s000001");
  assert.equal(fallback.sections[fallback.sections.length - 1].to, "s000025");
});

test("organizeSingleWindow & stitchWindowPlans: retries on invalid JSON, falls back cleanly, and stitches continues_previous", async () => {
  const win1Sentences = makeWindowSentences(6, 1);
  const win2Sentences = makeWindowSentences(6, 7);

  let callCount = 0;
  const result1 = await organizeSingleWindow({
    window: { windowIndex: 0, fromId: "s000001", toId: "s000006", sentences: win1Sentences },
    callModel: async () => {
      callCount += 1;
      if (callCount === 1) return "not valid json at all";
      return JSON.stringify({
        sections: [
          { title: "مقدمة عامة", from: "s000001", to: "s000003", kind: "intro", continues_previous: false },
          { title: "ميكانيكا الدواء", from: "s000004", to: "s000006", kind: "mechanism", continues_previous: false },
        ],
        paragraph_breaks: ["s000002"],
        annotations: [{ id: "s000005", kind: "key_point" }],
        offtopic: [],
        terms: [{ en: "Pharmacology", ar_hint: "علم الأدوية", first_id: "s000001" }],
      });
    },
  });

  assert.equal(result1.source, "deepseek");
  assert.equal(result1.attempts, 2);

  const result2 = await organizeSingleWindow({
    window: { windowIndex: 1, fromId: "s000007", toId: "s000012", sentences: win2Sentences },
    previousSectionTitle: "ميكانيكا الدواء",
    callModel: async () =>
      JSON.stringify({
        sections: [
          { title: "ميكانيكا الدواء (تكملة)", from: "s000007", to: "s000009", kind: "mechanism", continues_previous: true },
          { title: "الأعراض الجانبية", from: "s000010", to: "s000012", kind: "clinical", continues_previous: false },
        ],
        paragraph_breaks: ["s000008"],
        annotations: [{ id: "s000011", kind: "warning" }],
        offtopic: [],
        terms: [{ en: "pharmacology", ar_hint: "علم الأدوية", first_id: "s000007" }],
      }),
  });

  const stitched = stitchWindowPlans([result1, result2]);
  // Section 2 of win1 ("ميكانيكا الدواء", kind: "mechanism") and Section 1 of win2 (continues_previous: true, kind: "mechanism") merge!
  assert.equal(stitched.sections.length, 3);
  assert.equal(stitched.sections[1].title, "ميكانيكا الدواء");
  assert.equal(stitched.sections[1].from, "s000004");
  assert.equal(stitched.sections[1].to, "s000009");
  assert.equal(stitched.terms.length, 1); // deduplicated case-insensitively
});
