import assert from "node:assert/strict";
import test from "node:test";

import {
  detectLanguage,
  segmentSentences,
  buildTranscript,
} from "../../src/features/lectures/lib/segmentSentences.js";
import {
  normalizeForCompare,
  tidyTranscript,
  trimOverlap,
} from "../../src/features/lectures/lib/textNormalize.js";

// ─── language detection ─────────────────────────────────────────────────────
test("detects Arabic, English and mixed", () => {
  assert.equal(detectLanguage("المريض عنده ألم في الركبة"), "ar");
  assert.equal(detectLanguage("The ACL is torn"), "en");
  assert.equal(detectLanguage("بنعمل ACL reconstruction للركبة"), "mixed");
  assert.equal(detectLanguage("42"), "neutral");
});

test("a single stray Latin token does not flip an Arabic sentence to mixed", () => {
  assert.equal(detectLanguage("الرباط الصليبي الأمامي ACL"), "ar");
});

// ─── segmentation ───────────────────────────────────────────────────────────
test("splits on Arabic and Latin terminators", () => {
  const out = segmentSentences("المريض عنده ألم. الدرس بدأ؟ Yes it did!");
  assert.deepEqual(out, ["المريض عنده ألم.", "الدرس بدأ؟", "Yes it did!"]);
});

test("keeps decimals and abbreviations intact", () => {
  const out = segmentSentences("The dose is 2.5 mg. Dr. Ahmed said so.");
  assert.equal(out.length, 2);
  assert.match(out[0], /2\.5 mg\./);
  assert.match(out[1], /Dr\. Ahmed/);
});

test("forces a clause split at the word limit for run-on speech", () => {
  const words = Array.from({ length: 130 }, (_v, i) => `كلمة${i + 1}`).join(" ");
  const out = segmentSentences(words, { maxWords: 45 });
  assert.ok(out.length >= 3, `expected >=3 segments, got ${out.length}`);
  for (const sentence of out) {
    assert.ok(sentence.split(/\s+/).length <= 45, `segment too long: ${sentence}`);
  }
});

test("returns [] for empty input", () => {
  for (const bad of ["", "   ", null, undefined, "\n\n"]) {
    assert.deepEqual(segmentSentences(bad), []);
  }
});

test("buildTranscript numbers sentences 1..N in order", () => {
  const t = buildTranscript("First one. الثانية. Third one.");
  assert.equal(t.sentence_count, 3);
  assert.deepEqual(t.sentences.map((s) => s.id), [1, 2, 3]);
  assert.equal(t.sentences[0].lang, "en");
  assert.equal(t.sentences[1].lang, "ar");
  assert.ok(t.word_count >= 5);
});

// ─── normalisation ──────────────────────────────────────────────────────────
test("normalizeForCompare unifies Arabic variants and casing", () => {
  assert.equal(normalizeForCompare("الأَلَم"), normalizeForCompare("الالم"));
  assert.equal(normalizeForCompare("مصطفى"), normalizeForCompare("مصطفي"));
  assert.equal(normalizeForCompare("ACL Tear"), "acl tear");
});

test("tidyTranscript fixes punctuation spacing", () => {
  assert.equal(tidyTranscript("المريض ، عنده ألم ."), "المريض، عنده ألم.");
});

test("trimOverlap removes the repeated boundary when the recorder overlaps", () => {
  const prev = "الدرس النهاردة عن الرباط الصليبي الأمامي وطريقة علاجه";
  const next = "الرباط الصليبي الأمامي وطريقة علاجه بالجراحة ثم التأهيل";
  const out = trimOverlap(prev, next);
  assert.equal(out, "بالجراحة ثم التأهيل");
});

test("trimOverlap leaves unrelated text alone", () => {
  const out = trimOverlap("كلام أول", "كلام تاني مختلف تماما");
  assert.equal(out, "كلام تاني مختلف تماما");
});

// ─── bilingual boundary handling (real lecture behaviour) ───────────────────
test("splits a fused Arabic→English switch so English keeps its own unit", () => {
  const out = segmentSentences(
    "المريض عنده تمزق في الرباط الصليبي ومحتاج عملية The anterior cruciate ligament is torn and needs an MRI.",
  );
  assert.equal(out.length, 2);
  assert.match(out[0], /عملية$/);
  assert.match(out[1], /^The anterior cruciate/);
});

test("an English acronym inside an Arabic sentence never causes a split", () => {
  for (const sentence of [
    "الرباط الصليبي الأمامي ACL هو الأهم في الركبة.",
    "بنعمل MRI على الركبة عشان نشوف التمزق كويس جدا.",
  ]) {
    assert.equal(segmentSentences(sentence).length, 1, `should stay whole: ${sentence}`);
  }
});

test("pure sentences are never chopped by the bilingual rule", () => {
  const english = "The knee joint is a synovial hinge joint and it moves in two planes.";
  assert.deepEqual(segmentSentences(english), [english]);
  const arabic = "المريض بيشتكي من ألم مستمر في الركبة اليمين ومحتاج فحص كامل للرباط.";
  assert.deepEqual(segmentSentences(arabic), [arabic]);
});

test("longest real-world mixing stays organised", () => {
  const out = segmentSentences(
    "بنشرح ACL injury. The patient felt a pop. بعد كده بنعمل فحص Lachman test كويس.",
  );
  assert.equal(out.length, 3);
  assert.match(out[0], /ACL injury/);
  assert.match(out[1], /^The patient/);
  assert.match(out[2], /Lachman test/);
});
