import assert from "node:assert/strict";
import test from "node:test";

import { renderLectureHtml } from "../../src/features/lectures/lib/renderLectureHtml.js";
import { buildTemplatePlan } from "../../src/features/lectures/lib/templatePlan.js";

const job = {
  title: 'تشريح الركبة & "المفصل"',
  subject: "Orthopedics",
  source: { duration_sec: 2 * 60 * 60 },
};

const transcript = {
  sentence_count: 6,
  word_count: 40,
  sentences: [
    { id: 1, text: "الدرس النهاردة عن مفصل الركبة.", lang: "ar" },
    { id: 2, text: "The knee joint is a synovial hinge joint.", lang: "en" },
    { id: 3, text: "الرباط الصليبي الأمامي هو ACL.", lang: "mixed" },
    { id: 4, text: "الفحص بيبدأ باختبار السحب.", lang: "ar" },
    { id: 5, text: "الأشعة المقطعية بتوضح الكسر.", lang: "ar" },
    { id: 6, text: "الخلاصة إن العلاج جراحي.", lang: "ar" },
  ],
  gaps: [{ after_sentence: 3, chunk_index: 2, reason: "EMPTY_RESPONSE" }],
};

const organization = {
  plan: {
    sections: [
      { title: "مقدمة", kindHint: "concept", importance: 2, sentence_ids: [1, 2] },
      { title: "خطوات الفحص", kindHint: "steps", importance: 3, sentence_ids: [4] },
      { title: "الرباط الصليبي", kindHint: "concept", importance: 3, sentence_ids: [3] },
      { title: "التصوير والعلاج", kindHint: "exam", importance: 3, sentence_ids: [5, 6] },
    ],
    noise_sentence_ids: [],
    glossary: [{ term: "ACL", ar: "الرباط الصليبي الأمامي", sentence_ids: [3] }],
  },
};

function render({ words = 40, summary } = {}) {
  const plan = buildTemplatePlan({ word_count: words }, organization);
  return renderLectureHtml({
    job,
    transcript,
    organization,
    summary,
    plan,
    copy: { viewer: { sections: "المحتوى" }, export: { footerNote: "Black Fighters" } },
    generatedAt: new Date("2026-10-30T00:00:00Z"),
  });
}

test("produces a full standalone HTML document", () => {
  const html = render();
  assert.match(html, /^<!DOCTYPE html>/);
  assert.match(html, /<html lang="ar" dir="rtl">/);
  assert.match(html, /<\/html>\s*$/);
});

test("is offline-safe: no external scripts, styles or images", () => {
  const html = render();
  assert.ok(!/<script/i.test(html), "no scripts");
  assert.ok(!/https?:\/\//i.test(html), "no remote URLs");
  assert.ok(!/@import/i.test(html), "no remote font import");
  assert.ok(!/<img/i.test(html), "no images");
});

test("escapes user and model text (no HTML injection)", () => {
  const html = render();
  assert.ok(!html.includes("<script>alert"), "injection blocked");
  assert.ok(html.includes("&amp;"), "ampersand escaped");
  assert.ok(html.includes("&quot;"), "quotes escaped");
});

test("strict bidi: every transcript paragraph is dir=auto", () => {
  const html = render();
  const paragraphs = html.match(/<p class="s(?:\s[^"]*)?"[^>]*>/g) || [];
  // 6 sentences, but the "steps" section renders as <li> — 4 paragraphs + 1 li.
  assert.ok(paragraphs.length >= 4, `expected transcript paragraphs, got ${paragraphs.length}`);
  for (const p of paragraphs) assert.match(p, /dir="auto"/, `missing dir=auto: ${p}`);
  const listItems = html.match(/<li dir="auto">/g) || [];
  assert.ok(listItems.length >= 1, "step sentences must carry dir=auto too");
});

test("includes a TOC once the lecture is big enough for it", () => {
  assert.ok(!render({ words: 200 }).includes('class="toc"'), "compact has no TOC");
  assert.ok(render({ words: 3_000 }).includes('class="toc"'), "rich has a TOC");
});

test("renders gaps instead of hiding missing audio", () => {
  const html = render();
  assert.ok(html.includes('class="gap"'));
});

test("renders the glossary with English term + Arabic meaning", () => {
  const html = render();
  assert.ok(html.includes("ACL"));
  assert.ok(html.includes("الرباط الصليبي الأمامي"));
});

test("step sections become an ordered list", () => {
  const html = render();
  assert.ok(html.includes('<ol class="steps">'));
});

test("generated summary is labelled as AI-generated", () => {
  const html = render({
    summary: {
      sections: [{ heading: "خلاصة", bullets: [{ point: "العلاج جراحي", sentence_ids: [6] }] }],
      questions: [{ q: "العلاج إيه؟", a: "جراحي", sentence_ids: [6] }],
    },
  });
  assert.ok(html.includes("متولّد بالـ AI"));
  assert.ok(html.includes("أسئلة مراجعة"));
});

test("print styles target A4 and avoid breaking cards", () => {
  const html = render();
  assert.ok(html.includes("@page"));
  assert.ok(html.includes("size:A4") || html.includes("size: A4"));
  assert.ok(/page-break-inside:\s*avoid|break-inside:\s*avoid/.test(html));
});

test("kind hints map to visual classes", () => {
  const html = render();
  for (const kind of ["concept", "steps", "exam"]) {
    assert.ok(html.includes(`kind-${kind}`), `missing kind-${kind}`);
  }
});

test("density changes structure, not content", () => {
  const compact = render({ words: 200 });
  const deep = render({ words: 20_000 });
  for (const html of [compact, deep]) {
    for (const sentence of transcript.sentences) {
      assert.ok(html.includes(sentence.text.slice(0, 18)), `missing content in piece`);
    }
  }
  // compact hides numbers, deep shows them
  assert.ok(!compact.includes('class="sec-num"'));
  assert.ok(deep.includes('class="sec-num"'));
});
