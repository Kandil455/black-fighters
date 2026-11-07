import test from "node:test";
import assert from "node:assert/strict";

import { renderDocToHtml, escapeHtml } from "../../src/features/lectures/export/renderDocToHtml.js";
import { buildExportFilename } from "../../src/features/lectures/export/exportHtml.js";
import { renderPlainText, renderMarkdownText } from "../../src/features/lectures/export/exportText.js";
import { buildDocModel } from "../../src/features/lectures/ui/buildDocModel.js";

const isIosDevice = (ua = "") => /iPhone|iPad|iPod/i.test(String(ua || ""));

test("escapeHtml & renderDocToHtml: neutralizes XSS payloads in titles, sentences, attributes, and glossary terms", () => {
  const xssPayloads = [
    '<img src=x onerror=alert("xss")>',
    "</script><script>window.__pwned = true;</script>",
    '" onclick="alert(1)" data-x="',
    "' onmouseover='alert(2)'",
    "<!-- comment opener -->",
  ];

  const sentences = xssPayloads.map((payload, idx) => ({
    id: `s00000${idx + 1}`,
    num: idx + 1,
    tSec: idx * 10,
    text: `جملة رقم ${idx + 1} تحتوي على ${payload} ومصطلح Beta-Blocker.`,
  }));

  const plan = {
    sections: [
      {
        title: `قسم خطير <img onerror=alert(1)> "</script>`,
        from: "s000001",
        to: `s00000${sentences.length}`,
        kind: "concept",
      },
    ],
    paragraph_breaks: [],
    annotations: [],
    offtopic: [],
    terms: [
      {
        en: `Beta-Blocker"><img src=x onerror=alert(9)>`,
        ar_hint: `حاصرات بيتا </script><script>evil()</script>`,
        first_id: "s000001",
      },
    ],
  };

  const model = buildDocModel([{ pageIndex: 0, sentences }], plan, [], {
    title: `محاضرة </script><img src=x onerror=alert(1)>`,
    subject: `باطنة " onclick="evil()`,
  });

  const html = renderDocToHtml(model, {
    includeOfftopic: true,
    includeAnnotations: true,
    exportDate: "2026-10-31",
  });

  // Verify standalone HTML structure
  assert.ok(html.startsWith("<!doctype html>"));
  assert.ok(html.includes('lang="ar" dir="rtl"'));
  assert.ok(html.includes("@page { size: A4; margin: 18mm 16mm; }"));

  // Verify zero unescaped XSS tags or event handlers exist inside any HTML tag
  assert.equal(html.includes("<img"), false, "Unescaped <img> tag found in HTML output!");
  assert.equal(/<[^>]*\bonerror\s*=/i.test(html), false, "Unescaped onerror handler found inside tag!");
  assert.equal(/<[^>]*\bonmouseover\s*=/i.test(html), false, "Unescaped onmouseover handler found inside tag!");
  assert.equal(html.includes('onclick="alert'), false, "Unescaped onclick attribute breakout found!");
  assert.equal(html.includes("<!--"), false, "Unescaped HTML comment opener found!");

  // Count `<script>` tags: there must be ONLY 1 (the inline standalone TOC/theme controller at the bottom)
  const scriptCount = (html.match(/<script>/g) || []).length;
  const closeScriptCount = (html.match(/<\/script>/g) || []).length;
  assert.equal(scriptCount, 1);
  assert.equal(closeScriptCount, 1);

  // Ensure escapeHtml escapes /, <, >, ", ', &
  assert.equal(escapeHtml("</script>"), "&lt;&#x2F;script&gt;");
});

test("renderPlainText, renderMarkdownText, and buildExportFilename: preserve verbatim text, ~mm:ss markers, and gap notes", () => {
  const sentences = [
    { id: "s000001", num: 1, tSec: 65, text: "أول جملة في المحاضرة عن Digoxin." },
    { id: "s000002", num: 2, tSec: 72, text: "ثاني جملة بتوضح الجرعة 0.25 mg." },
  ];
  const model = buildDocModel(
    [{ pageIndex: 0, sentences }],
    {
      sections: [{ title: "علاج فشل القلب", from: "s000001", to: "s000002", kind: "concept" }],
    },
    [{ chunkIndex: 1, fromSec: 120, toSec: 180 }],
    { title: "محاضرة القلب: الجزء الأول", date: "2026-10-31" },
  );

  const txt = renderPlainText(model);
  assert.ok(txt.includes("علاج فشل القلب (~01:05)"));
  assert.ok(txt.includes("أول جملة في المحاضرة عن Digoxin. ثاني جملة بتوضح الجرعة 0.25 mg."));
  assert.ok(txt.includes("مقطع غير مفرّغ من 02:00 إلى 03:00"));

  const md = renderMarkdownText(model);
  assert.ok(md.includes("# محاضرة القلب: الجزء الأول"));
  assert.ok(md.includes("## علاج فشل القلب `~01:05`"));
  assert.ok(md.includes("> ⚠️ **مقطع غير مفرّغ من 02:00 إلى 03:00**"));

  const fname = buildExportFilename("محاضرة القلب: الجزء الأول / ٢٠٢٦", "2026-10-31", "html");
  assert.equal(fname, "محاضرة-القلب-الجزء-الأول-٢٠٢٦-2026-10-31.html");
  assert.equal(isIosDevice("Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)"), true);
  assert.equal(isIosDevice("Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0)"), false);
});
