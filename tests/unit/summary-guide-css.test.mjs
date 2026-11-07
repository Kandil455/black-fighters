import assert from "node:assert/strict";
import test from "node:test";

import { renderStudyGuideHtml, STUDY_GUIDE_TEMPLATES } from "../../src/lib/summaryStudyGuide.js";

const HTML = renderStudyGuideHtml({
  markdown: "# عنوان\n\nالرباط الصليبي: أهم رباط. الجرعة 5 mg/kg و==danger:ممنوع== الإهمال.\n\n- ACL شائع",
  title: "اختبار",
  templateId: "modules_green",
  forExport: true,
});

test("PDF keeps its colours (print-color-adjust was missing)", () => {
  assert.match(HTML, /print-color-adjust:exact/);
});

test("A4 page setup with sane pagination", () => {
  assert.match(HTML, /@page\s*\{\s*size:A4/);
  assert.match(HTML, /orphans:3/);
  assert.match(HTML, /widows:3/);
  assert.match(HTML, /break-inside:avoid/);
});

test("the Arabic font is actually declared", () => {
  assert.match(HTML, /@font-face/);
});

test("reading measure is comfortable (not 1150px)", () => {
  assert.match(HTML, /max-width:820px/);
  assert.ok(!HTML.includes("max-width:1150px"));
});

test("exported file is fully self-contained", () => {
  assert.ok(!/<script/i.test(HTML), "exports must not contain scripts");
  assert.ok(!/(src|href)="https?:\/\//.test(HTML), "exports must not fetch remote assets");
});

test("emphasis engine output is present", () => {
  assert.ok(HTML.includes("bf-t-"), "no unified emphasis tokens rendered");
});

test("bold has exactly ONE definition (it used to be declared twice)", () => {
  const matches = HTML.match(/b, strong \{/g) || [];
  assert.equal(matches.length, 1, "duplicate b,strong rule returned");
});

test("purple never leaks as literal text", () => {
  assert.ok(!HTML.includes("purple:"), "purple: rendered as text instead of a highlight");
});

test("sticky index for wide screens, static for print", () => {
  assert.match(HTML, /position:sticky/);
  assert.match(HTML, /@media print/);
});

test("reader toggles work without JavaScript", () => {
  assert.ok(HTML.includes("bf-hide-hl"));
  assert.ok(HTML.includes("bf-recall"));
  assert.match(HTML, /:checked/);
});

test("every template renders without throwing", () => {
  for (const template of STUDY_GUIDE_TEMPLATES) {
    const html = renderStudyGuideHtml({
      markdown: "# أ\n\nنص **بولد** و==key:مهم==\n\n| أ | ب |\n|---|---|\n| 1 | 2 |",
      title: template.nameEn,
      templateId: template.id,
      forExport: true,
    });
    assert.ok(html.length > 500, `${template.id} produced an empty guide`);
    assert.ok(/dir="(rtl|ltr)"/.test(html), `${template.id} lost its direction attribute`);
  }
});
