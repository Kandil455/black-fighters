import { test } from "node:test";
import assert from "node:assert/strict";
import { PDF_TEMPLATES, getPdfTemplate, pickPdfTemplate } from "../../src/lib/pdfTemplates.js";

const sec = (blocks) => ({ sections: [{ id: "s", title: "t", blocks }] });
const B = (role, type = "paragraph") => ({ role, type, text: "x" });

test("template ids are unique and every template has a valid accent", () => {
  const ids = PDF_TEMPLATES.map((t) => t.id);
  assert.equal(new Set(ids).size, ids.length);
  for (const t of PDF_TEMPLATES) assert.match(t.accent, /^#[0-9a-f]{6}$/i);
});

test("unknown template id falls back to the classic template", () => {
  assert.equal(getPdfTemplate("does_not_exist").id, "classic_ink");
  assert.equal(getPdfTemplate(undefined).id, "classic_ink");
});

test("content picks the matching template", () => {
  assert.equal(pickPdfTemplate(sec([B("definition"), B("definition"), B("definition"), B("definition"), B("definition"), B("definition")])).id, "definitions_green");
  assert.equal(pickPdfTemplate(sec([B("question"), B("answer"), B("question"), B("answer")])).id, "qa_orange");
  assert.equal(pickPdfTemplate(sec([B("warning"), B("warning"), B("warning")])).id, "warnings_red");
  assert.equal(pickPdfTemplate(sec([B("body", "table"), B("body", "table")])).id, "table_navy");
  assert.equal(pickPdfTemplate(sec([B("body")])).id, "classic_ink");
});

test("dense formula documents pick the formula sheet, not exam cram", () => {
  const nine = sec(Array.from({ length: 9 }, () => B("formula")));
  assert.equal(pickPdfTemplate(nine).id, "formula_sheet");
  const four = sec(Array.from({ length: 4 }, () => B("formula")));
  assert.equal(pickPdfTemplate(four).id, "exam_cram");
});

test("section count picks the structural templates", () => {
  const mk = (n) => ({ sections: Array.from({ length: n }, (_, i) => ({ id: "s" + i, title: "t", blocks: [B("body")] })) });
  assert.equal(pickPdfTemplate(mk(1)).id, "classic_ink");
  assert.equal(pickPdfTemplate(mk(4)).id, "study_cyan");
  assert.equal(pickPdfTemplate(mk(6)).id, "chapter_purple");
  assert.equal(pickPdfTemplate(mk(8)).id, "airy_gold");
});

test("the same content always picks the same template", () => {
  const d = sec([B("formula"), B("definition")]);
  assert.equal(pickPdfTemplate(d).id, pickPdfTemplate(d).id);
});

test("there are exactly 50 PDF templates with unique ids", () => {
  assert.equal(PDF_TEMPLATES.length, 50);
  assert.equal(new Set(PDF_TEMPLATES.map((t) => t.id)).size, 50);
});

test("every template is reachable by some content (none is dead)", () => {
  const measured = new Set(["sections","formulas","definitions","questions","warnings","tables","examples","lists","images","code","english","highlights","quotes"]);
  for (const t of PDF_TEMPLATES) {
    if (t.fit.default) continue;
    assert.ok(measured.has(Object.keys(t.fit)[0]), `${t.id} uses an unmeasured signal`);
  }
});

test("new content signals pick their templates", () => {
  const many = (role, type, n) => sec(Array.from({ length: n }, () => B(role, type)));
  assert.equal(pickPdfTemplate(many("example", "paragraph", 3)).id, "examples_teal");
  assert.equal(pickPdfTemplate(many("body", "code", 2)).id, "code_graphite");
  assert.equal(pickPdfTemplate(many("english_points", "paragraph", 4)).id, "bilingual_blue");
});
