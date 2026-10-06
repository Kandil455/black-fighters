import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { PDFDocument } from "pdf-lib";
import JSZip from "jszip";
import {
  adaptSummaryForExport,
  estimateSummaryPdfSize,
  getSummaryExportPlainText,
  parseMarkdownForExport,
} from "../src/lib/summaryExport.js";
import { createSummaryPdfV2 } from "../src/lib/summaryPdfV2.js";
import { createSummaryPptx } from "../src/lib/summaryPptx.js";
import { migrateLegacySummaryMarkdown } from "../src/lib/summaryV3/index.js";

const fontBytes = {
  regular: await readFile(new URL("../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans.ttf", import.meta.url)),
  bold: await readFile(new URL("../node_modules/dejavu-fonts-ttf/ttf/DejaVuSans-Bold.ttf", import.meta.url)),
};

const documentV3 = {
  schemaVersion: 3,
  templateId: "bilingual-lecture",
  languageMode: "bilingual",
  title: "مبادئ الإحصاء | Principles of Statistics",
  overview: {
    type: "paragraph",
    runs: [
      { text: "Statistics ", lang: "en", dir: "ltr", marks: ["bold"] },
      { text: "يحوّل البيانات إلى قرارات قابلة للاختبار.", lang: "ar", dir: "rtl" },
    ],
  },
  sections: [
    {
      id: "basics",
      title: "المفاهيم الأساسية | Core Concepts",
      sourceFactIds: ["fact-1"],
      blocks: [
        { type: "definition", term: "Population", definition: "كل الأفراد محل الدراسة", sourceFactIds: ["fact-1"] },
        { type: "bulletList", items: [
          { runs: [{ text: "Sample: a subset of the population", lang: "en", dir: "ltr", marks: ["bold"] }] },
          "العينة الجيدة تمثل المجتمع دون تحيز.",
        ] },
        { type: "callout", tone: "warning", title: "تنبيه", text: "Correlation does not imply causation." },
        { type: "equation", label: "Mean", expression: "x̄ = Σx / n", explanation: "المتوسط يساوي مجموع القيم مقسوماً على عددها." },
        {
          type: "table",
          caption: "مقارنة أنواع البيانات",
          headers: ["Type", "الوصف"],
          rows: [
            ["Nominal", "فئات بلا ترتيب"],
            ["Ordinal", "فئات مرتبة"],
          ],
        },
        {
          type: "timeline",
          items: [
            { label: "1", text: "Define the research question" },
            { label: "2", text: "اجمع البيانات ثم حلّلها" },
          ],
        },
        {
          type: "conceptMap",
          nodes: [
            { id: "a", text: "Data" },
            { id: "b", text: "التحليل" },
            { id: "c", text: "Decision" },
          ],
          edges: [{ from: "a", to: "b" }, { from: "b", to: "c" }],
        },
      ],
    },
  ],
  conclusion: "Use the right design, then explain the result بالعربية بوضوح.",
  sources: [{ id: "src-1", title: "Lecture 1", page: 3, url: "https://example.test/lecture" }],
  assets: [],
  style: { accentColor: "#12bfd0" },
  branding: { name: "IIIAK", accentColor: "#12bfd0" },
  quality: { coverage: 92 },
};

const adapted = adaptSummaryForExport({ document: documentV3 });
assert.equal(adapted.schemaVersion, 3);
assert.equal(adapted.sections.length, 1);
assert.deepEqual(adapted.sections[0].blocks.map((block) => block.type), ["definition", "bulletList", "callout", "equation", "table", "timeline", "conceptMap"]);
assert.match(getSummaryExportPlainText(adapted), /Population/);
assert.match(getSummaryExportPlainText(adapted), /العينة/);

const nativeV3 = migrateLegacySummaryMarkdown(`# Native V3 Export

## Quick Overview
Statistics turns observations into evidence.

## Core Concepts
- **Population**: all subjects of interest.
- Sample: a representative subset.

**الشرح بالعربي:**
المجتمع هو كل الأفراد محل الدراسة، والعينة جزء ممثل منهم. [page 4]

| Type | الوصف |
| --- | --- |
| Nominal | فئات بلا ترتيب |

## Summary Conclusion
Choose the design, then explain the result بوضوح.`, {
  templateId: "bilingual_lecture",
  languageMode: "bilingual",
  colorLevel: "medium",
});
const nativeAdapted = adaptSummaryForExport({ summary_document_v3: nativeV3 });
assert.equal(nativeV3.schemaVersion, 3);
assert.equal(nativeAdapted.title, "Native V3 Export");
assert.equal(nativeAdapted.sections[0].title, "Core Concepts");
assert.equal(nativeAdapted.sections[0].blocks.some((block) => block.type === "bulletList"), true);
assert.equal(nativeAdapted.sections[0].blocks.some((block) => block.type === "table"), true);
assert.deepEqual(nativeAdapted.sections[0].sourceRefs, [4]);
assert.equal(nativeAdapted.sections[0].blocks.some((block) => (
  block.runs?.some((run) => run.marks.includes("highlight"))
  || block.items?.some((item) => item.runs?.some((run) => run.marks.includes("highlight")))
  || block.headers?.some((cell) => cell.runs?.some((run) => run.marks.includes("highlight")))
)), true);
assert.match(getSummaryExportPlainText(nativeAdapted), /Population/);
assert.match(getSummaryExportPlainText(nativeAdapted), /المجتمع/);

const legacy = parseMarkdownForExport(`# محاضرة تجريبية

## Quick Overview
English overview ثم شرح عربي.

## القسم الأول
- **Definition**: تعريف أساسي
- ==red:Warning==: تحذير مهم

| Type | الوصف |
| --- | --- |
| A | النوع الأول |
| B | النوع الثاني |

## Summary Conclusion
الخلاصة النهائية.`);
assert.equal(legacy.sections.length, 1);
assert.equal(legacy.sections[0].blocks.some((block) => block.type === "table"), true);
assert.equal(legacy.sections[0].blocks.find((block) => block.type === "table").rows.length, 2);
assert.equal(legacy.overview.length, 1);
assert.equal(legacy.conclusion.length, 1);

const estimate = estimateSummaryPdfSize(documentV3);
assert.equal(estimate.withinTarget, true);
assert.ok(estimate.estimatedBytes > 200 * 1024);

const pdfResult = await createSummaryPdfV2(documentV3, { fontBytes });
assert.equal(pdfResult.bytes[0], 0x25); // %PDF
assert.ok(pdfResult.size > 25_000);
assert.ok(pdfResult.pageCount >= 2);
assert.equal(pdfResult.fileName.endsWith(".pdf"), true);
const parsedPdf = await PDFDocument.load(pdfResult.bytes);
assert.equal(parsedPdf.getPageCount(), pdfResult.pageCount);
assert.equal(parsedPdf.getTitle(), documentV3.title);

const pdfjs = await import("pdfjs-dist/legacy/build/pdf.mjs");
const pdfReader = await pdfjs.getDocument({ data: pdfResult.bytes, disableWorker: true }).promise;
let extracted = "";
for (let page = 1; page <= pdfReader.numPages; page += 1) {
  const content = await (await pdfReader.getPage(page)).getTextContent();
  extracted += ` ${content.items.map((item) => item.str).join(" ")}`;
}
assert.match(extracted, /IIIAK/);
assert.match(extracted, /Population|Statistics|Core Concepts/);
assert.match(extracted, /[\u0600-\u06ff\ufb50-\ufeff]/, "PDF must contain selectable Arabic text glyphs");

const longParagraph = "التجربة العلمية تبدأ بسؤال واضح، ثم تجمع البيانات وتحلل النتائج. Scientific evidence requires a reproducible method. ".repeat(22);
const longDocument = {
  ...documentV3,
  title: "اختبار تصدير مئة صفحة",
  overview: [],
  conclusion: [],
  sources: [],
  sections: Array.from({ length: 100 }, (_, index) => ({
    id: `long-${index + 1}`,
    title: `القسم ${index + 1} | Section ${index + 1}`,
    blocks: [{ type: "paragraph", text: longParagraph }],
  })),
};
const longPdf = await createSummaryPdfV2(longDocument, { fontBytes });
assert.ok(longPdf.pageCount >= 80, `expected a long document, got ${longPdf.pageCount} pages`);
assert.ok(longPdf.size <= 3 * 1024 * 1024, `100-page text PDF exceeded 3MB: ${longPdf.size}`);

const pptxResult = await createSummaryPptx(documentV3);
assert.equal(pptxResult.bytes[0], 0x50); // PK zip
assert.equal(pptxResult.bytes[1], 0x4b);
assert.ok(pptxResult.slideCount >= 4);
const pptxZip = await JSZip.loadAsync(pptxResult.bytes);
const slideNames = Object.keys(pptxZip.files).filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name));
assert.equal(slideNames.length, pptxResult.slideCount);
const slideXml = (await Promise.all(slideNames.map((name) => pptxZip.file(name).async("string")))).join("\n");
assert.match(slideXml, /IIIAK/);
assert.match(slideXml, /Population|Statistics/);
assert.match(slideXml, /[\u0600-\u06ff]/);

console.log(JSON.stringify({
  adapter: "v3+legacy",
  pdf: { pages: pdfResult.pageCount, bytes: pdfResult.size, extractedCharacters: extracted.length },
  longPdf: { pages: longPdf.pageCount, bytes: longPdf.size, megabytes: Number((longPdf.size / 1024 / 1024).toFixed(2)) },
  pptx: { slides: pptxResult.slideCount, bytes: pptxResult.size },
}, null, 2));
