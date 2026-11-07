/**
 * Study-guide template contracts.
 *
 * The owner supplied two HTML study guides as the reference design
 * (Defibrillator_Study_Guide.html / Hypoglycemia_Study_Guide.html) and asked for
 * the summaries to be rendered into designs like them, with the student SEEING
 * and CHOOSING a template. Three things must therefore hold, and each has failed
 * in some form before:
 *
 *  1. Every declared theme renders a COMPLETE standalone document (the picker
 *     used to show hand-drawn SVG "wireframes" that were not the real design).
 *  2. Content is escaped — the HTML is injected into an iframe and exported as a
 *     file, so a model response must never be able to emit markup.
 *  3. The semantic blocks the AI produces map onto the design's boxes
 *     (تعريف / فهم عميق / فخ الامتحان / تريكة), otherwise the "template" is just
 *     the old grey wall in different colours.
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  renderStudyGuideHtml,
  STUDY_GUIDE_TEMPLATES,
  STUDY_GUIDE_THEMES,
  GUIDE_PALETTES,
  getStudyGuideTemplate,
  escapeHtml,
} from "../../src/lib/summaryStudyGuide.js";

const SAMPLE_DOC = {
  title: { text: "فسيولوجيا القلب" },
  metadata: { sourceRefs: [1, 2, 3] },
  overview: [{ type: "paragraph", role: "body", content: { text: "نظرة سريعة." } }],
  sections: [
    {
      title: { text: "التوصيل الكهربي" },
      blocks: [
        { type: "paragraph", role: "definition", content: { text: "العقدة الجيبية منظم الإيقاع." } },
        { type: "paragraph", role: "example", content: { text: "تخيلها كقائد أوركسترا." } },
        { type: "bullet_list", role: "english_points", items: [{ text: "SA node: pacemaker" }] },
        {
          type: "table",
          role: "body",
          table: { headers: [{ text: "مصطلح" }, { text: "معنى" }], rows: [[{ text: "QT" }, { text: "زمن" }]] },
        },
        { type: "paragraph", role: "warning", content: { text: "فخ الامتحان: الأعراض = تدخل فوري." } },
        { type: "quote", content: { text: "ركّز على الترتيب." } },
      ],
    },
  ],
  conclusion: [],
};

test("templates differ in LAYOUT, not just in colour", () => {
  // The first attempt shipped four recolours of one layout and the owner rejected
  // it: "انت بتغير لي الألوان، أنا بتكلم قوالب مختلفة". Each template must own a
  // distinct structural signature.
  const signatures = {
    modules: 'class="toc"',
    cram: "cramgrid",
    cards: "cardsgrid",
    outline: 'class="outline"',
    tables: 'class="theader"',
  };
  const seenLayouts = new Set();

  for (const template of STUDY_GUIDE_TEMPLATES) {
    assert.ok(signatures[template.layout], `${template.id} uses an unknown layout "${template.layout}"`);
    const html = renderStudyGuideHtml({ document: SAMPLE_DOC, title: "اختبار", templateId: template.id });
    assert.ok(
      html.includes(signatures[template.layout]),
      `${template.id} does not render its "${template.layout}" structure — a template that only changes colour is not a template`,
    );
    // …and it must NOT contain another layout's signature.
    for (const [otherLayout, marker] of Object.entries(signatures)) {
      if (otherLayout === template.layout) continue;
      assert.equal(
        html.includes(marker),
        false,
        `${template.id} (${template.layout}) also emitted the "${otherLayout}" structure — layouts are bleeding into each other`,
      );
    }
    seenLayouts.add(template.layout);
  }

  assert.equal(
    seenLayouts.size,
    STUDY_GUIDE_TEMPLATES.length,
    "two templates share a layout, so choosing between them changes only the colour",
  );
});

test("every template pairs a layout with a real palette and renders completely", () => {
  for (const template of STUDY_GUIDE_TEMPLATES) {
    assert.ok(GUIDE_PALETTES[template.palette], `${template.id} references an unknown palette`);
    assert.ok(template.nameAr && template.descAr, `${template.id} is missing its Arabic name/description`);

    const html = renderStudyGuideHtml({ document: SAMPLE_DOC, title: "اختبار", templateId: template.id });
    for (const marker of ["<!DOCTYPE html>", 'class="header"', "</html>", "box-red", "box-blue", "box-yellow", "trick", "<table>"]) {
      assert.ok(html.includes(marker), `${template.id}: missing ${marker}`);
    }
    assert.ok(html.includes(GUIDE_PALETTES[template.palette].headerFrom), `${template.id}: palette not applied`);
  }
  // The owner's own references must survive as usable designs.
  const paletteIds = new Set(STUDY_GUIDE_TEMPLATES.map((t) => t.palette));
  assert.ok(paletteIds.has("emergency_red"), "the emergency palette from the reference file is gone");
  assert.ok(paletteIds.has("clinical_navy"), "the clinical palette from the reference file is gone");
});

test("an unknown template id falls back instead of throwing", () => {
  const html = renderStudyGuideHtml({ document: SAMPLE_DOC, templateId: "does-not-exist" });
  assert.ok(html.includes("<!DOCTYPE html>"), "an unknown template id produced no document");
  assert.equal(getStudyGuideTemplate("does-not-exist").id, STUDY_GUIDE_TEMPLATES[0].id);
});

test("blocks map onto the design's semantic boxes", () => {
  const html = renderStudyGuideHtml({ document: SAMPLE_DOC, templateId: "modules_red" });
  assert.ok(html.includes("التعريف بالعربي"), "a `definition` block must become the تعريف box");
  assert.ok(html.includes("الفهم العميق"), "an `example` block must become the فهم عميق box");
  assert.ok(html.includes("فخ الامتحان"), "a `warning` block must become the exam-trap box");
  assert.ok(html.includes("لأن") || html.includes("تريكة"), "a quote must become a تريكة callout");
  assert.ok(html.includes("Core") || html.includes("section-header-eng"), "english_points must get the English rail");
});

test("model text can never inject markup", () => {
  const hostile = {
    title: { text: '<script>alert(1)</script>' },
    sections: [{
      title: { text: '<img src=x onerror=alert(1)>' },
      blocks: [{ type: "paragraph", role: "body", content: { text: '<iframe src="javascript:alert(1)"></iframe>' } }],
    }],
  };
  const html = renderStudyGuideHtml({ document: hostile, templateId: "cards_navy" });
  // No dangerous ELEMENT may survive. (A literal "onerror=" may still appear as
  // escaped text, which is inert — the check is that no tag was formed.)
  for (const tag of ["script", "iframe", "img", "svg", "object", "embed"]) {
    assert.equal(
      new RegExp(`<\\s*${tag}`, "i").test(html),
      false,
      `a <${tag}> element survived into the document`,
    );
  }
  assert.ok(html.includes("&lt;script&gt;"), "escaping did not happen at all");
  assert.ok(html.includes("&lt;img"), "the img tag was not escaped");
});

test("legacy markdown summaries still render (no v3 document)", () => {
  const html = renderStudyGuideHtml({
    markdown: "## القسم الأول\n- نقطة أولى\n- نقطة ثانية\n\n## القسم الثاني\nفقرة عادية",
    title: "ملخص قديم",
  });
  assert.ok(html.includes("القسم الأول"), "markdown headings were not parsed");
  assert.ok(html.includes("نقطة أولى"), "markdown bullets were not parsed");
  assert.ok(html.includes('id="s1"') && html.includes('id="s2"'), "markdown sections were not numbered");
});

test("escapeHtml covers the characters that matter", () => {
  assert.equal(escapeHtml('<a href="x">&'), "&lt;a href=&quot;x&quot;&gt;&amp;");
  assert.equal(escapeHtml("it's"), "it&#39;s");
});
