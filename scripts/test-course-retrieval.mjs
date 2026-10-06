import assert from "node:assert/strict";
import { buildCourseRetrievalIndex, retrieveCourseContext } from "../src/lib/courseRetrieval.js";

const filler = Array.from({ length: 180 }, (_, index) => (
  `[صفحة ${index + 1}]\n## أساسيات عامة ${index + 1}\nهذا شرح تمهيدي متكرر عن الدراسة والتنظيم والمراجعة.`
)).join("\n\n");

const course = {
  id: "retrieval-test",
  title: "اختبار كورس طويل",
  chapters: [
    { title: "المقدمة", content: filler },
    {
      title: "أمراض الكلى",
      content: "[صفحة 999]\n## المتلازمة النفروزية\nتتميز المتلازمة النفروزية ببيلة بروتينية شديدة ونقص ألبومين الدم ووذمة وارتفاع الدهون.",
    },
  ],
};

const index = buildCourseRetrievalIndex(course);
const result = retrieveCourseContext(index, "ما علامات المتلازمة النفروزية nephrotic syndrome؟", {
  maxChunks: 4,
  maxChars: 5000,
});

assert.ok(index.sourceCharacterCount > 15_000, "يجب أن يفهرس المصدر الطويل كاملاً");
assert.match(result.context, /المتلازمة النفروزية/);
assert.match(result.context, /صفحة 999/);
assert.equal(result.sources[0].pages[0], 999);
assert.equal(result.sources[0].chapterTitle, "أمراض الكلى");
assert.ok(result.context.length <= 5_300, "يجب أن يبقى سياق النموذج محدوداً بعد ترتيب المقاطع");

console.log(`Course retrieval passed: ${index.chunks.length} chunks indexed, ${result.matchedChunks} selected.`);
