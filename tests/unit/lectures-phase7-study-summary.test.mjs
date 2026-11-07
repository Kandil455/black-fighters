import test from "node:test";
import assert from "node:assert/strict";

import {
  buildStudyView,
  validateGrounding,
  generateStudyNotes,
  generateLectureSummary,
} from "../../src/features/lectures/ai/studyAndSummary.js";
import { buildDocModel } from "../../src/features/lectures/ui/buildDocModel.js";
import { formatSentenceId } from "../../src/features/lectures/text/segment.js";

test("buildStudyView: deterministic study view collapses off-topic, bolds key sentences, and groups quick review", () => {
  const sentences = [
    { id: "s000001", num: 1, tSec: 0, text: "صباح الخير يا دكاترة النهاردة الجو برد." },
    { id: "s000002", num: 2, tSec: 6, text: "تعريف Heart Failure هو عدم قدرة القلب على ضخ الدم الكافي." },
    { id: "s000003", num: 3, tSec: 12, text: "الجرعة القياسية من Furosemide هي 40 mg وريدي." },
    { id: "s000004", num: 4, tSec: 18, text: "خلوا بالكم السؤال ده بيجي في الامتحان كل سنة." },
  ];
  const plan = {
    sections: [{ title: "فشل القلب", from: "s000001", to: "s000004", kind: "concept" }],
    paragraph_breaks: [],
    annotations: [
      { id: "s000002", kind: "definition", term: "Heart Failure" },
      { id: "s000003", kind: "number" },
      { id: "s000004", kind: "exam_pearl" },
    ],
    offtopic: [{ from: "s000001", to: "s000001", kind: "greeting" }],
    terms: [],
  };

  const doc = buildDocModel([{ pageIndex: 0, sentences }], plan, []);
  const study = buildStudyView(doc);

  assert.equal(study.collapseOfftopicByDefault, true);
  assert.equal(study.showAnnotationRail, true);
  assert.deepEqual(study.keySentenceIds, ["s000002", "s000003", "s000004"]);
  assert.equal(study.quickReviewGroups.length, 3);
  assert.equal(study.sections[0].studySentences[0].collapsedByDefault, true);
  assert.equal(study.sections[0].studySentences[1].isKeySentence, true);
});

test("validateGrounding: drops items without valid src, caps added:true at 25%, strips HTML, and preserves >=90% number annotations", () => {
  const validIds = ["s000001", "s000002", "s000003", "s000004"];

  // 1. Study notes payload with ungrounded item, HTML tags, and excess added:true
  const notesPayload = {
    sections: [
      {
        section_id: "sec-1",
        basics: [
          { text: "<b>معلومة من الدكتور</b>", src: ["s000001"], added: false },
          { text: "معلومة مخترعة بدون مصدر", src: ["s999999"], added: false }, // should be dropped!
          { text: "توضيح إضافي 1", src: [], added: true },
          { text: "توضيح إضافي 2 زائد عن الحد", src: [], added: true }, // should be dropped (>25%)
        ],
        from_lecture: [
          { text: "نقطة من المحاضرة 1", src: ["s000002"] },
          { text: "نقطة من المحاضرة 2", src: ["s000003"] },
        ],
        term_pairs: [{ ar: "فشل القلب", en: "<script>alert(1)</script>Heart Failure", src: ["s000002"] }],
        watch_out: [{ text: "تحذير مهم", src: ["s000004"] }],
      },
    ],
  };

  const checkedNotes = validateGrounding(notesPayload, validIds);
  assert.equal(checkedNotes.valid, true);
  assert.equal(checkedNotes.cleaned.sections[0].basics.length, 2); // 1 grounded + 1 allowed added:true
  assert.equal(checkedNotes.cleaned.sections[0].basics[0].text, "معلومة من الدكتور"); // HTML stripped
  assert.equal(checkedNotes.cleaned.sections[0].basics[0].sourceLabelAr, "من كلام الدكتور");
  assert.equal(checkedNotes.cleaned.sections[0].basics[1].sourceLabelAr, "توضيح إضافي");
  assert.equal(checkedNotes.cleaned.sections[0].term_pairs[0].en, "alert(1)Heart Failure");

  // 2. Summary payload with number annotations backfill (>=90% rule)
  const numberAnnotations = [
    { id: "s000002", kind: "number", term: "Dose A", sentenceText: "جرعة A هي 10 mg" },
    { id: "s000003", kind: "number", term: "Dose B", sentenceText: "جرعة B هي 20 mg" },
  ];
  const summaryPayload = {
    overview: [{ text: "ملخص عام", src: ["s000001"] }],
    main_points: [
      { title: "نقطة 1", text: "شرح النقطة", src: ["s000001"] },
      { title: "نقطة مخترعة", text: "بدون مصدر", src: [] }, // dropped
    ],
    numbers_and_doses: [{ label: "Dose A", value: "10 mg", src: ["s000002"] }],
    exam_pearls: [{ text: "موضع امتحان", src: ["s000004"] }],
  };

  const checkedSummary = validateGrounding(summaryPayload, validIds, numberAnnotations);
  assert.equal(checkedSummary.valid, true);
  assert.ok(checkedSummary.numberCoverageRatio >= 0.9);
  assert.equal(checkedSummary.cleaned.main_points.length, 1);
  assert.equal(checkedSummary.cleaned.numbers_and_doses.length, 2); // s000003 backfilled automatically
});

test("generateStudyNotes & generateLectureSummary: support detailed, medium, and quick levels with grounded citations", async () => {
  const sentences = Array.from({ length: 20 }, (_, i) => ({
    id: formatSentenceId(i + 1),
    num: i + 1,
    tSec: i * 5,
    text: `الجملة رقم ${i + 1} بتشرح جرعة الدواء ${i + 5} mg وتأثيره الإكلينيكي.`,
    annotations: i % 5 === 0 ? [{ id: formatSentenceId(i + 1), kind: "number", sentenceText: `${i + 5} mg` }] : [],
  }));

  const notes = await generateStudyNotes([{ id: "sec-1", title: "القسم الأول", sentences }], null);
  assert.equal(notes.sections.length, 1);
  assert.ok(notes.sections[0].basics.length > 0);
  assert.equal(notes.sections[0].basics[0].sourceLabelAr, "من كلام الدكتور");

  const numberAnns = sentences.flatMap((s) => s.annotations);
  for (const level of ["detailed", "medium", "quick"]) {
    const sum = await generateLectureSummary([{ sentences }], numberAnns, null, { level });
    assert.equal(sum.level, level);
    assert.ok(sum.numberCoverageRatio >= 0.9);
    assert.equal(sum.numbers_and_doses.length, numberAnns.length);
    assert.ok(sum.main_points.every((mp) => Array.isArray(mp.src) && mp.src.length > 0));
  }
});
