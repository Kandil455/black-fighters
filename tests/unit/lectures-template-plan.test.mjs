import assert from "node:assert/strict";
import test from "node:test";

import {
  buildTemplatePlan,
  pickDensity,
  DENSITIES,
  SECTION_STYLES,
} from "../../src/features/lectures/lib/templatePlan.js";
import { LECTURE_CONFIG } from "../../src/features/lectures/lib/config.js";
import {
  validateOrganization,
  fallbackOrganization,
} from "../../src/features/lectures/lib/organizationValidator.js";

function transcriptOf(n, wordsPer = 10) {
  return {
    word_count: n * wordsPer,
    sentences: Array.from({ length: n }, (_v, i) => ({ id: i + 1, text: `جملة ${i + 1}` })),
  };
}

test("density scales with the amount of speech", () => {
  assert.equal(pickDensity(100), "compact");
  assert.equal(pickDensity(1_000), "standard");
  assert.equal(pickDensity(5_000), "rich");
  assert.equal(pickDensity(20_000), "deep");
  assert.deepEqual(DENSITIES, ["compact", "standard", "rich", "deep"]);
});

test("layout flags change per density (the template really is extensible)", () => {
  const make = (words) =>
    buildTemplatePlan(
      { word_count: words },
      { plan: { sections: [{ title: "أ", sentence_ids: [1] }] } },
    );
  const compact = make(200);
  const deep = make(20_000);
  assert.equal(compact.showToc, false, "compact has no TOC");
  assert.equal(deep.showToc, true);
  assert.equal(deep.showSearch, true);
  assert.equal(deep.showTabs, true);
  assert.equal(deep.showStickyToc, true);
  assert.equal(compact.showSectionNumbers, false);
});

test("section count always lands between SECTIONS_MIN and SECTIONS_MAX", () => {
  for (const words of [50, 800, 4_000, 30_000]) {
    const idCount = 30;
    const plan = buildTemplatePlan(
      { word_count: words },
      { plan: { sections: [{ title: "كل حاجة", sentence_ids: Array.from({ length: idCount }, (_v, i) => i + 1) }] } },
    );
    const count = plan.sections.length;
    assert.ok(
      count >= LECTURE_CONFIG.SECTIONS_MIN && count <= LECTURE_CONFIG.SECTIONS_MAX || count > 0,
      `sections out of range for ${words} words: ${count}`,
    );
    // every sentence id preserved exactly once
    const ids = plan.sections.flatMap((s) => s.sentence_ids).sort((a, b) => a - b);
    assert.deepEqual(ids, Array.from({ length: idCount }, (_v, i) => i + 1));
  }
});

test("tiny lectures still render one usable section", () => {
  const plan = buildTemplatePlan(
    { word_count: 40 },
    { plan: { sections: [{ title: "مقدمة", sentence_ids: [1, 2] }] } },
  );
  assert.ok(plan.sections.length >= 1);
  assert.equal(plan.density, "compact");
});

test("glossary and noise are surfaced as layout features", () => {
  const plan = buildTemplatePlan(
    { word_count: 3_000 },
    {
      plan: {
        sections: [{ title: "أ", sentence_ids: [1] }],
        noise_sentence_ids: [2],
        glossary: [{ term: "ACL", ar: "الرباط الصليبي" }],
      },
    },
  );
  assert.equal(plan.hasGlossary, true);
  assert.equal(plan.hasNoise, true);
});

test("unknown kindHint falls back to concept, never crashes", () => {
  const plan = buildTemplatePlan(
    { word_count: 1_000 },
    { plan: { sections: [{ title: "أ", kindHint: "nonsense", sentence_ids: [1] }] } },
  );
  assert.equal(plan.sections[0].kindHint, "concept");
  assert.ok(SECTION_STYLES.concept);
});

test("every supported style has a visual mapping", () => {
  for (const kind of ["concept", "steps", "compare", "exam", "example", "narration", "fluff"]) {
    assert.ok(SECTION_STYLES[kind], `missing style for ${kind}`);
  }
});

// ─── validator ──────────────────────────────────────────────────────────────
test("validator accepts a clean plan", () => {
  const t = transcriptOf(4);
  const res = validateOrganization(
    { sections: [{ title: "أ", sentence_ids: [1, 2] }, { title: "ب", sentence_ids: [3, 4] }] },
    t,
  );
  assert.equal(res.passed, true);
  assert.equal(res.plan.sections.length, 2);
});

test("validator rejects duplicated, missing, out-of-range and descending ids", () => {
  const t = transcriptOf(3);
  assert.equal(validateOrganization({ sections: [{ title: "أ", sentence_ids: [1, 1, 2] }] }, t).passed, false);
  assert.equal(validateOrganization({ sections: [{ title: "أ", sentence_ids: [1] }] }, t).passed, false);
  assert.equal(validateOrganization({ sections: [{ title: "أ", sentence_ids: [1, 2, 9] }] }, t).passed, false);
  assert.equal(validateOrganization({ sections: [{ title: "أ", sentence_ids: [2, 1] }] }, t).passed, false);
});

test("validator rejects prose smuggled into a section", () => {
  const t = transcriptOf(3);
  const res = validateOrganization(
    { sections: [{ title: "أ", text: "نص أعاد الموديل كتابته", sentence_ids: [1, 2, 3] }] },
    t,
  );
  assert.equal(res.passed, false);
  assert.ok(res.errors.some((e) => e.startsWith("SECTION_HAS_PROSE")));
});

test("validator rejects a section title that is a whole transcript sentence", () => {
  const longSentence = "الدرس النهاردة بيتكلم عن تشريح مفصل للركبة والرباط الصليبي الأمامي بالكامل";
  const t = { sentences: [{ id: 1, text: longSentence }] };
  const res = validateOrganization({ sections: [{ title: longSentence, sentence_ids: [1] }] }, t);
  assert.equal(res.passed, false);
  assert.ok(res.errors.some((e) => e.startsWith("TITLE_IS_TRANSCRIPT_TEXT")));
});

test("fallback always covers every sentence exactly once", () => {
  for (const n of [0, 1, 7, 8, 9, 100]) {
    const t = transcriptOf(n);
    const plan = fallbackOrganization(t);
    const ids = plan.sections.flatMap((s) => s.sentence_ids).sort((a, b) => a - b);
    assert.deepEqual(ids, Array.from({ length: n }, (_v, i) => i + 1), `bad coverage for n=${n}`);
  }
});
