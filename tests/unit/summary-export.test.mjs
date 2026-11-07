import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  TEMPLATE_STORAGE_KEY,
  DEFAULT_TEMPLATE_ID,
  safeFileName,
} from "../../src/lib/summary/exportGuide.js";
import { STUDY_GUIDE_TEMPLATES } from "../../src/lib/summaryStudyGuide.js";

const VALID_IDS = STUDY_GUIDE_TEMPLATES.map((t) => t.id);

test("the default template id is a real template", () => {
  assert.ok(VALID_IDS.includes(DEFAULT_TEMPLATE_ID), `${DEFAULT_TEMPLATE_ID} is not real`);
});

test("storage key is declared once, in exportGuide", () => {
  assert.equal(TEMPLATE_STORAGE_KEY, "bf_guide_template");
  const files = [
    "src/components/course/SummaryView.jsx",
    "src/components/course/StudyGuideViewer.jsx",
    "src/pages/CourseView.jsx",
  ];
  for (const file of files) {
    const src = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.ok(
      !src.includes('"bf_guide_template"'),
      `${file} still hardcodes the storage key instead of using the shared constant`,
    );
  }
});

test("the phantom template modules_red is no longer used as a fallback", () => {
  assert.ok(!VALID_IDS.includes("modules_red"), "modules_red must not be a real template");
  const courseView = readFileSync(
    new URL("../../src/pages/CourseView.jsx", import.meta.url),
    "utf8",
  );
  // Only a code fallback would hurt; the name may still appear in a comment.
  const codeOnly = courseView
    .split("\n")
    .filter((line) => !line.trim().startsWith("//"))
    .join("\n");
  assert.ok(
    !/["']modules_red["']/.test(codeOnly),
    "CourseView still falls back to the non-existent modules_red template",
  );
});

test("no export surface re-implements blob/download by hand", () => {
  const files = [
    "src/components/course/SummaryView.jsx",
    "src/components/course/StudyGuideViewer.jsx",
  ];
  for (const file of files) {
    const src = readFileSync(new URL(`../../${file}`, import.meta.url), "utf8");
    assert.ok(!src.includes("new Blob([exportHtml]"), `${file} still has a duplicated blob exporter`);
    assert.ok(!src.includes("window.open(url"), `${file} still opens a popup to print`);
  }
});

test("safeFileName strips filesystem-hostile characters", () => {
  assert.equal(safeFileName('a/b:c*d?"e"<f>|g'), "a b c d e f g");
  assert.equal(safeFileName("   "), "ملخص");
  assert.ok(safeFileName("x".repeat(200)).length <= 80);
});

test("Arabic titles survive safeFileName", () => {
  assert.equal(safeFileName("جراحة الركبة — ACL"), "جراحة الركبة — ACL");
});
