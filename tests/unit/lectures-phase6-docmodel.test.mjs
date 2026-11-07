import test from "node:test";
import assert from "node:assert/strict";

import { buildDocModel, classifySectionDensity } from "../../src/features/lectures/ui/buildDocModel.js";
import { formatSentenceId } from "../../src/features/lectures/text/segment.js";

function makeSentenceWithWordCount(num, targetWords) {
  const words = Array.from({ length: targetWords }, (_, i) =>
    i % 5 === 0 ? "Hypertension" : `كلمة${i + 1}`,
  );
  return {
    id: formatSentenceId(num),
    num,
    chunk: 0,
    tSec: num * 4,
    text: `${words.join(" ")}.`,
  };
}

test("classifySectionDensity & buildDocModel: adapts density across 10, 100, 500, and 2000 word sections", () => {
  assert.equal(classifySectionDensity(10), "micro");
  assert.equal(classifySectionDensity(100), "compact");
  assert.equal(classifySectionDensity(500), "standard");
  assert.equal(classifySectionDensity(2000), "extended");

  // Build 4 sections of 10, 100, 500, and 2000 words
  const sentences = [
    makeSentenceWithWordCount(1, 10), // s000001 (10 words -> micro)
    makeSentenceWithWordCount(2, 50), // s000002..s000003 (100 words -> compact)
    makeSentenceWithWordCount(3, 50),
    makeSentenceWithWordCount(4, 250), // s000004..s000005 (500 words -> standard)
    makeSentenceWithWordCount(5, 250),
    makeSentenceWithWordCount(6, 500), // s000006..s000009 (2000 words -> extended)
    makeSentenceWithWordCount(7, 500),
    makeSentenceWithWordCount(8, 500),
    makeSentenceWithWordCount(9, 500),
  ];

  const plan = {
    sections: [
      { title: "ملاحظة سريعة", from: "s000001", to: "s000001", kind: "intro" },
      { title: "قسم مختصر", from: "s000002", to: "s000003", kind: "concept" },
      { title: "قسم قياسي", from: "s000004", to: "s000005", kind: "mechanism" },
      { title: "قسم مطول", from: "s000006", to: "s000009", kind: "clinical_case" },
    ],
    paragraph_breaks: ["s000003", "s000005", "s000008"],
    annotations: [
      { id: "s000004", kind: "key_point" },
      { id: "s000007", kind: "exam_pearl" },
    ],
  };

  const doc = buildDocModel([{ pageIndex: 0, sentences }], plan, []);
  assert.equal(doc.sections.length, 4);

  // 10 words -> micro (no numbering, single paragraph group)
  assert.equal(doc.sections[0].density, "micro");
  assert.equal(doc.sections[0].showNumber, false);
  assert.equal(doc.sections[0].sectionNumber, null);

  // 100 words -> compact (numbered #1, single paragraph group even if break existed)
  assert.equal(doc.sections[1].density, "compact");
  assert.equal(doc.sections[1].showNumber, true);
  assert.equal(doc.sections[1].sectionNumber, 1);
  assert.equal(doc.sections[1].paragraphs.length, 1);

  // 500 words -> standard (numbered #2, split by paragraph_breaks, keyPointsRail populated)
  assert.equal(doc.sections[2].density, "standard");
  assert.equal(doc.sections[2].sectionNumber, 2);
  assert.equal(doc.sections[2].paragraphs.length, 2);
  assert.equal(doc.sections[2].keyPointsRail.length, 1);

  // 2000 words -> extended (numbered #3, subsections generated every ~600 words, first open, rest behind اعرض الباقي)
  assert.equal(doc.sections[3].density, "extended");
  assert.equal(doc.sections[3].sectionNumber, 3);
  assert.ok(doc.sections[3].subsections.length >= 2);
  assert.equal(doc.sections[3].subsections[0].defaultExpanded, true);
  assert.equal(doc.sections[3].subsections[1].defaultExpanded, false);
  assert.equal(doc.sections[3].subsections[1].expandButtonLabel, "اعرض الباقي");
});

test("buildDocModel: preserves 100% verbatim sentence text across all sections and paragraphs", () => {
  const sentences = Array.from({ length: 30 }, (_, i) => ({
    id: formatSentenceId(i + 1),
    num: i + 1,
    chunk: Math.floor(i / 10),
    tSec: i * 6,
    text: `الدكتور قال في الجملة رقم ${i + 1} إن جرعة Metoprolol هي ${10 + i} mg يوميًا.`,
  }));

  const doc = buildDocModel([{ pageIndex: 0, sentences }], null, [
    { chunkIndex: 1, fromSec: 60, toSec: 120 },
  ]);

  const sourceJoined = sentences.map((s) => s.text).join(" ");
  const renderedFromSections = doc.sections
    .flatMap((sec) => sec.sentences.map((s) => s.text))
    .join(" ");
  const renderedFromParagraphs = doc.sections
    .flatMap((sec) => sec.paragraphs.map((p) => p.text))
    .join(" ");

  assert.equal(renderedFromSections, sourceJoined);
  assert.equal(renderedFromParagraphs, sourceJoined);
  assert.equal(doc.gaps.length, 1);
  assert.match(doc.gaps[0].labelAr, /مقطع غير مفرّغ من 01:00 إلى 02:00/);
});

test("buildDocModel: builds a 40,000-word synthetic lecture rapidly with lazySections enabled", () => {
  // 2,000 sentences * 20 words = 40,000 words
  const sentences = Array.from({ length: 2000 }, (_, i) =>
    makeSentenceWithWordCount(i + 1, 20),
  );

  const t0 = Date.now();
  const doc = buildDocModel([{ pageIndex: 0, sentences }], null, []);
  const elapsedMs = Date.now() - t0;

  assert.equal(doc.meta.totalWords, 40000);
  assert.equal(doc.meta.totalSentences, 2000);
  assert.equal(doc.meta.lazySections, true);
  assert.ok(elapsedMs < 1500, `Expected buildDocModel < 1500ms, took ${elapsedMs}ms`);
});
