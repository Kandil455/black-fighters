/**
 * src/features/lectures/export/postMortemStudyHtml.js
 *
 * Masterpiece "Post-Mortem Study Sheet" Builder & Standalone HTML/PDF Renderer.
 * Matches the exact visual layout, typography, `.pair` structure (`.en` with `<mark>` +
 * `.ar` grey right-bordered explanation + `.doc` dashed "قال الدكتور:" quote +
 * schematic `<svg>` diagrams + `.key` yellow N.B. alerts + comparison `<table>`s +
 * final `تجميعة للامتحان Exam compilation` table + `تريكات الدكتور اللي ممكن تيجي في الامتحان`).
 */

import { buildDynamicStudySheet } from "../ai/dynamicLectureBuilder.js";

const HTML_ESCAPE_MAP = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

export function escapePmHtml(value = "") {
  return String(value ?? "").replace(/[&<>"']/g, (ch) => HTML_ESCAPE_MAP[ch] || ch);
}

/**
 * Highlights high-yield medical keywords, lead labels (Definition:, Mechanism:, etc.),
 * and numbers/dosages/durations with `<mark>...</mark>` after escaping HTML.
 */
export function highlightEnglishWithMarks(rawText = "", glossaryTerms = []) {
  let safe = escapePmHtml(String(rawText || "").trim());
  if (!safe) return "";

  // 1. Highlight lead-in clinical labels (Definition:, Mechanism:, Causes:, etc.)
  safe = safe.replace(
    /^((?:Definition|Mechanism|Causes?|Duration|Time of appearance|Formula|Method|Diagnosis|Characters|Steps|Procedure|Medicolegal importance|N\.B\.|Note|Warning|Important|Key point|Exam puzzle|Stage\s*\d*|First|Second|Third)\s*:?)/i,
    "<mark>$1</mark>",
  );

  // 2. Highlight numeric values with medical/time units
  safe = safe.replace(
    /\b(\d+(?:\.\d+)?(?:\s*(?:–|-|to)\s*\d+(?:\.\d+)?)?\s*(?:hours?|hrs?|h|minutes?|mins?|days?|weeks?|months?|years?|°C|cm|mm|mmHg|mg\/dl|mg|g|kg|ml|L|%))\b/gi,
    "<mark>$1</mark>",
  );

  // 3. Highlight known medical glossary terms (up to 4 per sentence to keep visual clarity)
  let markedCount = 0;
  for (const item of Array.isArray(glossaryTerms) ? glossaryTerms : []) {
    if (markedCount >= 4) break;
    const term = String(item?.term || item?.en || "").trim();
    if (term.length < 4) continue;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const rx = new RegExp(`\\b(${escapedTerm})\\b`, "i");
    if (rx.test(safe) && !safe.includes(`<mark>${term}`)) {
      safe = safe.replace(rx, "<mark>$1</mark>");
      markedCount += 1;
    }
  }

  return safe;
}

/**
 * Generates a clean, crisp schematic `<svg viewBox="0 0 520 ...">` diagram
 * matching the exact monochrome + accent style of `post-mortem-part2-study.html`.
 */
export function buildSchematicSvgForSection(sectionTitle = "", stepsOrPoints = [], index = 0) {
  const cleanPoints = (Array.isArray(stepsOrPoints) ? stepsOrPoints : [])
    .map((p) =>
      String(p || "")
        .replace(/^(?:Definition|Mechanism|Key point)\s*:\s*/i, "")
        .trim(),
    )
    .filter(Boolean)
    .slice(0, 4);

  if (cleanPoints.length === 0) return "";

  const shortLabel = (str, max = 26) => {
    const s = String(str || "").replace(/\s+/g, " ").trim();
    return escapePmHtml(s.length > max ? `${s.slice(0, max - 1)}…` : s);
  };

  // Variant A: Horizontal 3-box or 4-box process/sequence flowchart
  if (cleanPoints.length >= 3 && index % 2 === 0) {
    const boxes = cleanPoints.slice(0, 3);
    return `<svg viewBox="0 0 520 92">
  <g style="font-size:10px">
    <rect class="w" x="8" y="18" width="150" height="50"/>
    <text x="16" y="38">1. ${shortLabel(boxes[0], 22)}</text>
    <text x="16" y="55">${shortLabel(boxes[0].slice(22), 24)}</text>
    <rect class="g1" x="185" y="18" width="150" height="50"/>
    <text x="193" y="38">2. ${shortLabel(boxes[1], 22)}</text>
    <text x="193" y="55">${shortLabel(boxes[1].slice(22), 24)}</text>
    <rect class="g2" x="362" y="18" width="150" height="50"/>
    <text x="370" y="38">3. ${shortLabel(boxes[2], 22)}</text>
    <text x="370" y="55">${shortLabel(boxes[2].slice(22), 24)}</text>
  </g>
  <path class="l" d="M158,43H185M335,43H362"/>
</svg>`;
  }

  // Variant B: Two-stage contrast / summary schematic
  const first = cleanPoints[0] || sectionTitle;
  const second = cleanPoints[1] || cleanPoints[0] || sectionTitle;
  return `<svg viewBox="0 0 520 82">
  <rect class="g1" x="10" y="14" width="235" height="52"/>
  <text x="22" y="36">${shortLabel(sectionTitle, 30)}</text>
  <text x="22" y="54">${shortLabel(first, 32)}</text>
  <path class="l" d="M250,40H275M267,33L275,40L267,47"/>
  <rect class="g2" x="280" y="14" width="230" height="52"/>
  <text x="292" y="36">Key Exam Takeaway</text>
  <text x="292" y="54">${shortLabel(second, 32)}</text>
</svg>`;
}

/**
 * Builds the Overview SVG map at the top of the document (`0. خريطة المحاضرة Overview`).
 */
function buildOverviewMapSvg(sections = []) {
  const titles = (Array.isArray(sections) ? sections : [])
    .map((s) => String(s?.topicTitle || s?.title || "").trim())
    .filter(Boolean)
    .slice(0, 6);
  if (titles.length === 0) return "";

  const firstHalf = titles.slice(0, Math.ceil(titles.length / 2)).join(" · ");
  const secondHalf = titles.slice(Math.ceil(titles.length / 2)).join(" · ") || firstHalf;
  const clip = (s, n = 34) => escapePmHtml(s.length > n ? `${s.slice(0, n - 1)}…` : s);

  return `<svg viewBox="0 0 520 80">
  <rect class="g1" x="10" y="15" width="240" height="50"/>
  <text x="24" y="36">Part 1 — Core Foundations</text>
  <text x="20" y="54">${clip(firstHalf, 33)}</text>
  <path class="l" d="M255,40H275M268,33L276,40L268,47"/>
  <rect class="g2" x="280" y="15" width="230" height="50"/>
  <text x="294" y="36">Part 2 — Clinical &amp; Exam Focus</text>
  <text x="292" y="54">${clip(secondHalf, 31)}</text>
</svg>`;
}

export const POST_MORTEM_STUDY_CSS = `
body{background:#fff;color:#000;font-family:Arial,Tahoma,sans-serif;max-width:900px;margin:0 auto;padding:20px;line-height:1.85}
h1{font-size:24px;border-bottom:4px solid #000;padding-bottom:6px;direction:rtl;text-align:right}
h2{font-size:20px;border-bottom:2px solid #000;padding-bottom:4px;margin-top:40px;direction:rtl;text-align:right}
h3{font-size:16px;margin:28px 0 6px;direction:rtl;text-align:right}
.src{color:#333;font-size:14px;direction:rtl;text-align:right}
.pair{margin:16px 0 26px}
.en{direction:ltr;text-align:left;font-weight:bold;margin:0 0 6px}
.ar{direction:rtl;text-align:right;border-right:5px solid #000;background:#f3f3f3;padding:8px 14px;margin:0 0 8px}
.ar ul,.ar ol{margin:4px 0;padding-right:20px}
.doc{direction:rtl;text-align:right;border:2px dashed #000;padding:8px 14px;margin:0 0 8px;background:#fff}
.doc:before{content:"قال الدكتور:";display:block;font-weight:bold;margin-bottom:3px}
mark{background:#fff0a0;font-weight:bold;padding:0 2px;color:#000}
table{border-collapse:collapse;width:100%;margin:10px 0;font-size:15px;direction:ltr}
th,td{border:1px solid #000;padding:7px;vertical-align:top;text-align:left}
th{background:#eaeaea;font-weight:bold}
td.ar{direction:rtl;text-align:right;border-right:1px solid #000;background:#fff}
svg{display:block;max-width:100%;height:auto;margin:6px auto 4px}
svg text{font-family:Arial,sans-serif;font-size:12px;font-weight:bold;fill:#000}
svg .tw{fill:#fff}
.l{stroke:#000;stroke-width:2;fill:none}
.d{stroke:#000;stroke-width:2;fill:none;stroke-dasharray:5 4}
.w{fill:#fff;stroke:#000;stroke-width:2}
.g1{fill:#e6e6e6;stroke:#000;stroke-width:2}
.g2{fill:#aaa;stroke:#000;stroke-width:2}
.g3{fill:#555;stroke:#000;stroke-width:2}
.gr{fill:#9bd29b;stroke:#000;stroke-width:2}
.key{border:2px solid #000;padding:6px 16px;margin:16px 0;direction:rtl;text-align:right;background:#fffbe0}
.pm-toolbar{display:flex;flex-wrap:wrap;justify-content:space-between;align-items:center;gap:10px;padding:12px 16px;margin-bottom:20px;border:2px solid #000;background:#f8f8f8;direction:rtl}
.pm-btn{cursor:pointer;border:2px solid #000;background:#fff;color:#000;padding:6px 14px;font-weight:bold;font-size:13px}
.pm-btn-primary{background:#000;color:#fff}
.fig-box{margin-top:10px;padding:8px;border:1.5px solid #000;background:#fafafa;text-align:center}
.fig-box img{max-width:100%;max-height:340px;height:auto;display:block;margin:0 auto;border:1px solid #ccc;background:#fff}
.fig-cap{margin-top:5px;font-size:12px;color:#333;direction:rtl;font-weight:bold}
@media print {
  @page { size: A4; margin: 14mm 14mm; }
  .no-print, .pm-toolbar { display: none !important; }
  body { padding: 0; max-width: 100%; }
  .pair, table, svg, .key, .fig-box { break-inside: avoid; }
}
`;

/**
 * Converts a `docModel` + optional `aiPostMortemData` + optional `pdfNotesText`
 * into the structured Post-Mortem Study Sheet model.
 */
export function buildPostMortemStudyModel(docModel = {}, options = {}) {
  const {
    studyNotes = null,
    summaryData = null,
    aiSheet = null,
    pdfText = "",
    figures = [],
    includeFigures = true,
  } = options;
  const activeFigures = includeFigures && Array.isArray(figures) ? figures.filter((f) => f && f.url) : [];
  const dynamicSheet = buildDynamicStudySheet(docModel, { studyNotes, summaryData });
  const glossary = dynamicSheet?.glossary || docModel?.terms || [];

  // If AI-synthesized Post-Mortem sheet data exists, merge it with deterministic data
  if (aiSheet && Array.isArray(aiSheet.sections) && aiSheet.sections.length > 0) {
    return {
      titleAr: aiSheet.titleAr || docModel?.meta?.title || "محاضرة طبية",
      titleEn: aiSheet.titleEn || docModel?.meta?.subject || "Medical Study Sheet",
      introNote:
        aiSheet.introNote ||
        "ملف مذاكرة شامل مبني على تفريغ المحاضرة والـ PDF الخاص بالدكتور. كل جملة إنجليزي بعدها شرحها بالعربي، وتحتها كلام الدكتور (في الإطار المنقّط)، وتحتها الرسمة التوضيحية والجداول.",
      overviewPairs: Array.isArray(aiSheet.overviewPairs) ? aiSheet.overviewPairs : [],
      sections: aiSheet.sections,
      examCompilationTable: Array.isArray(aiSheet.examCompilationTable)
        ? aiSheet.examCompilationTable
        : [],
      examTricks: Array.isArray(aiSheet.examTricks) ? aiSheet.examTricks : [],
      glossary,
      figures: activeFigures,
    };
  }

  const sections = (dynamicSheet?.studySections || []).map((sec, sIdx) => {
    const rawDocSection = (docModel?.sections || [])[sIdx] || {};
    const rawSentences = (rawDocSection.sentences || []).filter((s) => !s.isOfftopic);

    const enList = Array.isArray(sec.englishMedicalNotes) ? sec.englishMedicalNotes : [];
    const arList = Array.isArray(sec.arabicExplanation) ? sec.arabicExplanation : [];
    const pairCount = Math.max(1, enList.length, Math.ceil(arList.length / 2));

    const pairs = [];
    for (let i = 0; i < pairCount; i += 1) {
      const enLine =
        enList[i] ||
        (enList[0] && i === 0
          ? enList[0]
          : `Key Point ${i + 1} (${sec.topicTitle || `Section ${sIdx + 1}`}): High-yield clinical & exam concept.`);
      const arChunk = arList.slice(i * 2, i * 2 + 2);
      const docQuote = rawSentences
        .slice(i * 2, i * 2 + 2)
        .map((s) => s.text)
        .join(" ");

      pairs.push({
        en: enLine,
        ar: arChunk.length > 0 ? arChunk.join(" — ") : docQuote,
        doc: docQuote && docQuote !== arChunk.join(" — ") ? docQuote : "",
        svg:
          i === 0
            ? buildSchematicSvgForSection(sec.topicTitle, enList.length ? enList : arList, sIdx)
            : "",
      });
    }

    return {
      number: sIdx + 1,
      titleAr: sec.topicTitle || `القسم ${sIdx + 1}`,
      titleEn: sec.kindLabelAr || "",
      pairs,
      comparisonTable: null,
      keyNote:
        (rawDocSection.keyPointsRail || [])[0]?.sentenceText || "",
    };
  });

  // Build Exam Compilation Table (Item | Value) from dosages, numbers, and glossary
  const examCompilationTable = [];
  for (const numItem of dynamicSheet?.dosageAndNumbers || []) {
    examCompilationTable.push({
      item: numItem.sectionTitle || "رقم / جرعة هامة",
      value: numItem.text,
    });
  }
  for (const g of glossary.slice(0, 18)) {
    examCompilationTable.push({
      item: g.term || g.en,
      value: g.ar || g.ar_hint,
    });
  }

  // Build Exam Tricks from highYieldWarnings + executiveSummary
  const examTricks = (dynamicSheet?.highYieldWarnings || []).map((w, idx) => ({
    en: `Exam Trick #${idx + 1} (${w.kind || "High-Yield"}): Pay close attention to this point in MCQ & clinical cases.`,
    ar: w.text,
  }));

  // If user pasted PDF text, append a dedicated PDF Integration section if not already covered
  if (pdfText && pdfText.trim().length > 20) {
    const pdfLines = pdfText
      .split(/\n+/)
      .map((l) => l.trim())
      .filter((l) => l.length > 15)
      .slice(0, 8);
    if (pdfLines.length > 0) {
      sections.push({
        number: sections.length + 1,
        titleAr: "إضافات وجداول ملف الـ PDF الخاص بالدكتور",
        titleEn: "Doctor's PDF Additions",
        pairs: pdfLines.map((line) => ({
          en: `[From Doctor's PDF]: ${line}`,
          ar: `نقطة مضافة من ملف الـ PDF الخاص بالمحاضرة لاستكمال التفريغ الصوتي.`,
          doc: "",
          svg: "",
        })),
      });
    }
  }

  return {
    titleAr: docModel?.meta?.title || "محاضرة طبية",
    titleEn: docModel?.meta?.subject || "Medical Lecture Study Sheet",
    introNote:
      "ملف مذاكرة مبني على تفريغ المحاضرة وعلى الـ PDF بتاع الدكتور. كل جملة إنجليزي بعدها شرحها بالعربي، وتحتها كلام الدكتور (في الإطار المنقّط)، وتحتها الرسمة التوضيحية. وفي النهاية تجميعة كل الأرقام والمصطلحات وتريكات الامتحان.",
    overviewPairs: (dynamicSheet?.executiveSummary || []).slice(0, 3).map((line, idx) => ({
      en: `Overview Point ${idx + 1}: Core concept from ${docModel?.meta?.title || "the lecture"}.`,
      ar: line,
    })),
    sections,
    examCompilationTable,
    examTricks,
    glossary,
    figures: activeFigures,
  };
}

/**
 * Converts a Course Summary Markdown + extracted source PDF figures into a Post-Mortem Study Sheet model.
 */
export function buildPostMortemFromCourseSummary({
  title = "ملخص المحاضرة",
  markdown = "",
  figures = [],
  includeFigures = true,
} = {}) {
  const activeFigures = includeFigures && Array.isArray(figures) ? figures.filter((f) => f && f.url) : [];
  const rawBlocks = String(markdown || "")
    .split(/^#{1,3}\s+/m)
    .map((b) => b.trim())
    .filter(Boolean);

  const sections = [];
  const examCompilationTable = [];
  const examTricks = [];

  rawBlocks.forEach((block, sIdx) => {
    const lines = block
      .split(/\n+/)
      .map((l) => l.trim())
      .filter(Boolean);
    if (!lines.length) return;
    const heading = lines[0].replace(/[*#`]/g, "").trim() || `القسم ${sIdx + 1}`;
    const bodyLines = lines.slice(1).filter((l) => !/^[-|:\s]+$/.test(l));

    const enLines = [];
    const arLines = [];
    bodyLines.forEach((line) => {
      const clean = line.replace(/^[-*•]\s*/, "").replace(/\*\*/g, "").trim();
      if (!clean) return;
      if (/\d/.test(clean) && clean.length < 130 && examCompilationTable.length < 18) {
        examCompilationTable.push({
          item: heading.slice(0, 45),
          value: clean,
        });
      }
      if (/important|n\.b|exam|trick|warning|هام|امتحان|تريكة|خلي بالك|مهم/i.test(clean) && examTricks.length < 10) {
        examTricks.push({
          en: `Exam Focus (${heading}): High-yield point frequently tested.`,
          ar: clean,
        });
      }
      const arabicRatio = (clean.match(/[\u0600-\u06FF]/g) || []).length / Math.max(1, clean.length);
      if (arabicRatio < 0.25) {
        enLines.push(clean);
      } else {
        arLines.push(clean);
      }
    });

    const pairCount = Math.max(1, enLines.length, Math.ceil(arLines.length / 2));
    const pairs = [];
    for (let i = 0; i < pairCount; i += 1) {
      const en =
        enLines[i] ||
        (arLines[i * 2]
          ? `Key Concept ${i + 1} (${heading}): ${arLines[i * 2].slice(0, 110)}`
          : `Core Point ${i + 1}: ${heading}`);
      const ar = arLines.slice(i * 2, i * 2 + 2).join(" — ") || enLines[i] || "";
      pairs.push({
        en,
        ar,
        doc: "",
        svg: i === 0 ? buildSchematicSvgForSection(heading, enLines.length ? enLines : arLines, sIdx) : "",
      });
    }

    sections.push({
      number: sIdx + 1,
      titleAr: heading,
      titleEn: "",
      pairs,
      comparisonTable: null,
      keyNote: "",
    });
  });

  return {
    titleAr: title,
    titleEn: "Structured Study Sheet",
    introNote:
      "مذكرة منظمة بنظام الجداول والمربعات الثنائية (English + الشرح العربي + الرسومات التوضيحية وصور الملف الأصلي + تجميعة الامتحان).",
    overviewPairs: sections.slice(0, 3).map((s, i) => ({
      en: `Section ${i + 1}: ${s.titleAr}`,
      ar: s.pairs?.[0]?.ar || s.titleAr,
    })),
    sections,
    examCompilationTable,
    examTricks,
    glossary: [],
    figures: activeFigures,
  };
}

/**
 * Renders the Post-Mortem Study Model to a complete standalone HTML5 document
 * identical in look and feel to `post-mortem-part2-study.html`.
 */
export function renderPostMortemStudyHtml(docModel = {}, options = {}) {
  const pm =
    docModel && Array.isArray(docModel.sections) && docModel.overviewPairs
      ? docModel
      : buildPostMortemStudyModel(docModel, options);

  const glossary = pm.glossary || [];
  const activeFigures =
    options?.includeFigures === false
      ? []
      : Array.isArray(pm.figures)
        ? pm.figures
        : Array.isArray(options?.figures)
          ? options.figures.filter((f) => f && f.url)
          : [];
  const overviewSvg = buildOverviewMapSvg(pm.sections);

  const overviewHtml =
    pm.overviewPairs?.length > 0
      ? `<h2>0. خريطة المحاضرة Overview</h2>
${pm.overviewPairs
  .map(
    (p, idx) => `<div class="pair">
<p class="en">${highlightEnglishWithMarks(p.en, glossary)}</p>
<div class="ar">${escapePmHtml(p.ar)}</div>
${idx === 0 ? overviewSvg : ""}
</div>`,
  )
  .join("\n")}`
      : "";

  const sectionsHtml = (pm.sections || [])
    .map((sec, idx) => {
      const pairsHtml = (sec.pairs || [])
        .map(
          (pair) => `<div class="pair">
<p class="en">${highlightEnglishWithMarks(pair.en, glossary)}</p>
${pair.ar ? `<div class="ar">${escapePmHtml(pair.ar)}</div>` : ""}
${pair.doc ? `<div class="doc">${escapePmHtml(pair.doc)}</div>` : ""}
${pair.svg || ""}
</div>`,
        )
        .join("\n");

      const tableHtml =
        sec.comparisonTable &&
        Array.isArray(sec.comparisonTable.headers) &&
        Array.isArray(sec.comparisonTable.rows)
          ? `<div class="pair">
<p class="en"><mark>Comparison Table:</mark></p>
<table>
<tr>${sec.comparisonTable.headers.map((h) => `<th>${escapePmHtml(h)}</th>`).join("")}</tr>
${sec.comparisonTable.rows
  .map(
    (row) =>
      `<tr>${(Array.isArray(row) ? row : [])
        .map((cell) => `<td>${escapePmHtml(cell)}</td>`)
        .join("")}</tr>`,
  )
  .join("\n")}
</table>
</div>`
          : "";

      const keyHtml = sec.keyNote
        ? `<div class="key"><p><b>ملحوظة هامة للامتحان (N.B.):</b> ${escapePmHtml(sec.keyNote)}</p></div>`
        : "";

      const sectionFigure = activeFigures[idx];
      const figHtml =
        sectionFigure && sectionFigure.url
          ? `<div class="fig-box">
<img src="${escapePmHtml(sectionFigure.url)}" alt="شكل توضيحي من الملف الأصلي — صفحة ${escapePmHtml(String(sectionFigure.page || idx + 1))}">
<div class="fig-cap">🖼️ صورة من الملف الأصلي${sectionFigure.page ? ` (صفحة ${escapePmHtml(String(sectionFigure.page))})` : ""}${sectionFigure.caption ? ` — ${escapePmHtml(sectionFigure.caption)}` : ""}</div>
</div>`
          : "";

      return `<h2>${sec.number ?? idx + 1}. ${escapePmHtml(sec.titleAr)}${
        sec.titleEn ? ` (${escapePmHtml(sec.titleEn)})` : ""
      }</h2>
${pairsHtml}
${tableHtml}
${keyHtml}
${figHtml}`;
    })
    .join("\n\n");

  const extraFigures = activeFigures.slice((pm.sections || []).length);
  const extraFiguresHtml =
    extraFigures.length > 0
      ? `<h2>ملحق صور وأشكال الملف الأصلي (${extraFigures.length})</h2>
${extraFigures
  .map(
    (fig, fIdx) => `<div class="fig-box">
<img src="${escapePmHtml(fig.url)}" alt="صورة من الملف الأصلي ${fIdx + 1}">
<div class="fig-cap">🖼️ شكل توضيحي من الملف الأصلي${fig.page ? ` (صفحة ${escapePmHtml(String(fig.page))})` : ""}${fig.caption ? ` — ${escapePmHtml(fig.caption)}` : ""}</div>
</div>`,
  )
  .join("\n")}`
      : "";

  const compilationNum = (pm.sections?.length || 0) + 1;
  const compilationHtml =
    Array.isArray(pm.examCompilationTable) && pm.examCompilationTable.length > 0
      ? `<h2>${compilationNum}. تجميعة للامتحان Exam compilation</h2>
<div class="pair">
<p class="en"><mark>All the important numbers, terms, and high-yield facts in one table.</mark></p>
<table>
<tr><th>Item / Term</th><th>Value / Explanation</th></tr>
${pm.examCompilationTable
  .map(
    (row) =>
      `<tr><td><b>${escapePmHtml(row.item)}</b></td><td class="ar">${escapePmHtml(row.value)}</td></tr>`,
  )
  .join("\n")}
</table>
<div class="ar">دي أهم الأرقام والتعريفات والمقارنات اللي محتاجة تتحفظ قبل الامتحان مباشرة.</div>
</div>`
      : "";

  const tricksHtml =
    Array.isArray(pm.examTricks) && pm.examTricks.length > 0
      ? `<h3>تريكات الدكتور اللي ممكن تيجي في الامتحان</h3>
${pm.examTricks
  .map(
    (tr) => `<div class="pair">
<p class="en">${highlightEnglishWithMarks(tr.en, glossary)}</p>
<div class="ar">${escapePmHtml(tr.ar)}</div>
${tr.doc ? `<div class="doc">${escapePmHtml(tr.doc)}</div>` : ""}
</div>`,
  )
  .join("\n")}`
      : "";

  return `<!DOCTYPE html>
<html lang="ar">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapePmHtml(pm.titleAr)} — ${escapePmHtml(pm.titleEn)}</title>
<style>${POST_MORTEM_STUDY_CSS}</style>
</head>
<body>
<div class="pm-toolbar no-print">
  <div><b>📄 مذكرة المذاكرة الشاملة (نمط Post-Mortem الاحترافي)</b></div>
  <div style="display:flex;gap:8px">
    <button type="button" class="pm-btn pm-btn-primary" onclick="window.print()">🖨️ طباعة / حفظ كملف PDF (A4)</button>
  </div>
</div>

<h1>${escapePmHtml(pm.titleAr)}<br>${escapePmHtml(pm.titleEn)}</h1>
<p class="src">${escapePmHtml(pm.introNote)}</p>

${overviewHtml}

${sectionsHtml}

${extraFiguresHtml}

${compilationHtml}

${tricksHtml}

</body>
</html>`;
}

/**
 * Triggers a browser download of the Post-Mortem style `.html` study file.
 */
export function downloadPostMortemStudyHtml(docModel = {}, options = {}) {
  const html = renderPostMortemStudyHtml(docModel, options);
  if (typeof window === "undefined" || typeof document === "undefined") return html;
  const rawTitle = String(docModel?.meta?.title || options?.title || "lecture-study")
    .trim()
    .replace(/[\\/:*?"<>|]+/g, "-")
    .replace(/\s+/g, "-");
  const filename = `${rawTitle || "lecture"}-study.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1500);
  return html;
}

/**
 * Opens the Post-Mortem style study sheet in a print-ready A4 window and triggers `window.print()`.
 */
export function printPostMortemStudyHtml(docModel = {}, options = {}) {
  const html = renderPostMortemStudyHtml(docModel, options);
  if (typeof window === "undefined") return false;
  const win = window.open("", "_blank");
  if (!win) return false;
  win.document.open();
  win.document.write(html);
  win.document.close();
  setTimeout(() => {
    try {
      win.focus();
      win.print();
    } catch {
      // Ignore print errors
    }
  }, 350);
  return true;
}

export default {
  escapePmHtml,
  highlightEnglishWithMarks,
  buildSchematicSvgForSection,
  buildPostMortemStudyModel,
  buildPostMortemFromCourseSummary,
  renderPostMortemStudyHtml,
  downloadPostMortemStudyHtml,
  printPostMortemStudyHtml,
};
