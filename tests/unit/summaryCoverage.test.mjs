import { test } from "node:test";
import assert from "node:assert/strict";
import { buildCoverageReport } from "../../src/lib/summaryPipeline.js";

const source = `
الفصل الأول: التمثيل الضوئي
التمثيل الضوئي هو عملية تحول فيها النباتات ضوء الشمس إلى طاقة كيميائية.
المعادلة: 6CO2 + 6H2O -> C6H12O6 + 6O2
مثال: تستخدم النباتات الكلوروفيل لامتصاص الضوء الأحمر والأزرق.
`;

const weak = "## نظرة\nالنباتات مهمة للحياة.";
const good = `## التمثيل الضوئي
التمثيل الضوئي تحويل ضوء الشمس إلى طاقة كيميائية [صفحة 1]. المعادلة 6CO2 + 6H2O -> C6H12O6 + 6O2 [صفحة 1]. مثال: الكلوروفيل يمتص الضوء الأحمر والأزرق [صفحة 1].`;

test("weak summary scores far below a faithful one", () => {
  const w = buildCoverageReport(source, weak, { language: "ar", style: "foundational" });
  const g = buildCoverageReport(source, good, { language: "ar", style: "foundational" });
  assert.ok(w.score < 20, `weak=${w.score}`);
  assert.ok(g.score >= 60, `good=${g.score}`);
});

test("generic filler words are not counted as required terms", () => {
  const r = buildCoverageReport(source, good, { language: "ar", style: "foundational" });
  for (const filler of ["عملية", "الفصل", "تحول"]) {
    assert.ok(!r.missing.includes(filler), `filler "${filler}" wrongly required`);
  }
});

test("a paraphrase of a key term is not penalised as missing", () => {
  const plural = "## التمثيل الضوئي\nالتمثيل الضوئي يحول الضوء إلى طاقات كيميائية [صفحة 1]. المعادلة 6CO2 + 6H2O -> C6H12O6 + 6O2 [صفحة 1].";
  const r = buildCoverageReport(source, plural, { language: "ar", style: "foundational" });
  assert.ok(!r.missing.includes("طاقة"), "طاقة should match طاقات");
});
