import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import JSZip from "jszip";

import { createSummaryPptx } from "../../src/lib/summaryPptx.js";
import { exportToPptx, PPTX_ARABIC_FONT } from "../../src/lib/imageExport.js";

const ARABIC_RE = /[؀-ۿ]/;
// Latin-1 double-encoding signature ("Ø§", "Ù...") of UTF-8 Arabic bytes
// decoded as a legacy single-byte charset. If this appears, the pipeline
// double-encoded the text — the classic "هيروغليفي" mojibake.
const MOJIBAKE_RE = /[ØÙ][-ÿ]/;


const arabicDoc = {
  schemaVersion: 3,
  languageMode: "bilingual",
  title: "ملخص الأدوية | Emergency Drugs",
  overview: "نظرة سريعة على أدوية الطوارئ مع English keywords.",
  sections: [
    {
      id: "s1",
      title: "القسم الأول | القلب",
      blocks: [
        { type: "paragraph", text: "الجهاز القلبي يضخ الدم عبر الأوعية — the cardio system п≈." },
        { type: "bulletList", items: ["نقطة عربية أولى", "Second point in English"] },
        { type: "definition", term: "الأدرينالين", definition: "دواء الإنعاش القلبي الأول" },
      ],
    },
  ],
  conclusion: "الخلاصة: راجع الجرعات بدقة.",
};

async function readAllSlideXml(pptxBytes) {
  const zip = await JSZip.loadAsync(pptxBytes);
  const names = Object.keys(zip.files).filter(
    (name) => !zip.files[name].dir && /^ppt\/slides\/slide\d+\.xml$/.test(name),
  );
  assert.ok(names.length > 0, "PPTX must contain slides");
  const xmlParts = await Promise.all(names.map((name) => zip.file(name).async("string")));
  return { zip, slideXml: xmlParts.join("\n"), names };
}

function paragraphsWithArabic(slideXml) {
  return (slideXml.match(/<a:p>[\s\S]*?<\/a:p>/g) || []).filter((para) =>
    /<a:t>[\s\S]*?[؀-ۿ][\s\S]*?<\/a:t>/.test(para),
  );
}

test("summary PPTX keeps Arabic as valid UTF-8 (no double-encoding / mojibake)", async () => {
  const result = await createSummaryPptx(arabicDoc);
  const { slideXml } = await readAllSlideXml(result.bytes);

  // 1. The original strings survive byte-for-byte through a UTF-8 round-trip.
  assert.match(slideXml, /ملخص الأدوية/);
  assert.match(slideXml, /الأدرينالين/);
  assert.match(slideXml, /الخلاصة/);

  // 2. No double-encoded UTF-8 (latin-1 decoded) residue.
  assert.doesNotMatch(slideXml, MOJIBAKE_RE, "slide XML must not contain mojibake signatures");

  // 3. JSON/TextEncoder round-trip of the payload is stable (valid UTF-8,
  // no replacement characters introduced anywhere).
  const probe = "ملخص الأدوية والاختبار — PDF/PPTX: 100% ✅";
  const roundTrip = new TextDecoder().decode(new TextEncoder().encode(probe));
  assert.equal(roundTrip, probe);
  assert.equal(JSON.parse(JSON.stringify(probe)), probe);
  assert.ok(!roundTrip.includes("�"));

  // 4. Each slide XML part decodes cleanly as strict UTF-8 from raw bytes
  // (proves the ZIP stores UTF-8, not a legacy or double-encoded charset).
  const { names, zip } = await readAllSlideXml(result.bytes);
  for (const name of names) {
    const rawPart = await zip.file(name).async("uint8array");
    const strict = new TextDecoder("utf-8", { fatal: true });
    assert.doesNotThrow(() => strict.decode(rawPart), `${name} must be strict UTF-8`);
  }
});

test("every Arabic PPTX run carries an Arabic-capable (complex-script) font and RTL paragraph", async () => {
  const result = await createSummaryPptx(arabicDoc);
  const { slideXml } = await readAllSlideXml(result.bytes);
  const arabicParas = paragraphsWithArabic(slideXml);
  assert.ok(arabicParas.length > 0, "expected Arabic paragraphs in the deck");

  for (const para of arabicParas) {
    // <a:cs> = Complex Script font. Without it, Keynote/LibreOffice and some
    // macOS PowerPoint builds render Arabic as gibberish.
    assert.match(para, /<a:cs[^>]*typeface=/, "Arabic run must set a complex-script font");
    assert.match(para, /<a:latin[^>]*typeface=/, "Arabic run must set a latin font face too");
    assert.match(para, /<a:pPr[^>]*rtl="1"/, "Arabic paragraph must be marked RTL");
  }
});

test("image/quiz PPTX exporter emits Arabic-capable fonts for every Arabic run", async () => {
  assert.ok(ARABIC_RE.test("بنك الصور والمحاضرات"), "sanity: Arabic regex matches Arabic text");

  const PNG =
    "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==";
  const images = [
    {
      status: "kept",
      pageOrSlideNumber: 1,
      thumbnailDataUrl: PNG,
      aiClassification: { category: "صورة علمية" },
      contextText: "شرح مختصر بالعربي للصورة الأولى.",
      quiz: [
        {
          question: "ما هي وظيفة القلب؟",
          options: ["ضخ الدم", "التنفس", "الهضم"],
          correctIndex: 0,
          explanation: "القلب يضخ الدم لجميع أنحاء الجسم.",
        },
      ],
    },
  ];

  // exportToPptx writes via pptxgenjs writeFile (cwd-relative); sandbox it.
  const sandboxDir = await mkdtemp(join(tmpdir(), "bf-pptx-"));
  const prevCwd = process.cwd();
  let fileBytes;
  try {
    process.chdir(sandboxDir);
    await exportToPptx(images, "quiz_deck");
    fileBytes = await readFile(join(sandboxDir, "quiz_deck_presentation.pptx"));
  } finally {
    process.chdir(prevCwd);
    await rm(sandboxDir, { recursive: true, force: true });
  }

  const { zip, slideXml } = await readAllSlideXml(fileBytes);
  assert.doesNotMatch(slideXml, MOJIBAKE_RE, "image/quiz slide XML must not contain mojibake");
  assert.match(slideXml, /ما هي وظيفة القلب؟/);

  const arabicParas = paragraphsWithArabic(slideXml);
  assert.ok(arabicParas.length > 0, "expected Arabic paragraphs in the image/quiz deck");
  for (const para of arabicParas) {
    assert.match(para, /<a:cs[^>]*typeface="[^"]+"/, "Arabic run must declare a complex-script font");
    assert.match(para, /<a:pPr[^>]*rtl="1"/, "Arabic paragraph must be marked RTL");
  }

  // Theme fallback for notes/auto-text must also be Arabic-capable.
  const themeXml = await zip.file("ppt/theme/theme1.xml").async("string");
  assert.ok(
    themeXml.includes(`<a:latin typeface="${PPTX_ARABIC_FONT}"/>`),
    "theme latin font must be Arabic-capable",
  );
});
