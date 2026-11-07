/**
 * src/features/lectures/export/exportPowerPoint.js
 *
 * Exports a lecture (`docModel` + `studySheet`) into a clean, professional 16:9
 * PowerPoint (`.pptx`) presentation using `pptxgenjs`, supporting both:
 *   • `bilingual` (English Medical Exam Bullets + Arabic Clinical Explanation)
 *   • `english_only` (Pure English Medical Slides for Exams)
 */
import { buildDynamicStudySheet } from "../ai/dynamicLectureBuilder.js";
import { buildExportFilename } from "./exportHtml.js";

export async function exportLecturePowerPoint(docModel, options = {}) {
  const {
    mode = "bilingual", // 'bilingual' | 'english_only'
    studyNotes = null,
    summary = null,
  } = options;

  const PptxGenJSModule = await import("pptxgenjs");
  const PptxGenJS = PptxGenJSModule.default || PptxGenJSModule;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE"; // 13.33 x 7.5 in
  pptx.author = "Black Fighters Academic Platform";
  pptx.company = "Black Fighters";
  pptx.title = docModel?.meta?.title || "Medical Lecture Study Deck";

  const sheet = buildDynamicStudySheet(docModel, { studyNotes, summaryData: summary });
  const titleText = sheet?.title || "محاضرة طبية";
  const subjectText = sheet?.subject || "Medical Study Deck";

  // ── Slide 1: Cover Slide ──
  const cover = pptx.addSlide();
  cover.background = { color: "090D16" };
  cover.addText("BLACK FIGHTERS — MEDICAL STUDY DECK", {
    x: 0.8,
    y: 1.1,
    w: 11.7,
    h: 0.5,
    fontSize: 13,
    bold: true,
    color: "19F08C",
    fontFace: "Arial",
  });
  cover.addText(titleText, {
    x: 0.8,
    y: 1.9,
    w: 11.7,
    h: 1.8,
    fontSize: 32,
    bold: true,
    color: "F8FAFC",
    fontFace: "Arial",
    align: "right",
    rtlMode: true,
  });
  cover.addText(
    `${subjectText}${sheet?.lecturer ? `  •  ${sheet.lecturer}` : ""}  •  ${sheet?.totalWords || 0} Words`,
    {
      x: 0.8,
      y: 4.1,
      w: 11.7,
      h: 0.6,
      fontSize: 15,
      color: "94A3B8",
      fontFace: "Arial",
      align: "right",
    },
  );

  // ── Slide 2: Executive Summary & High-Yield Pearls ──
  if (sheet?.executiveSummary?.length > 0) {
    const sumSlide = pptx.addSlide();
    sumSlide.background = { color: "0F172A" };
    sumSlide.addText("Executive Summary — الخلاصة التنفيذية للمحاضرة", {
      x: 0.6,
      y: 0.4,
      w: 12.1,
      h: 0.6,
      fontSize: 22,
      bold: true,
      color: "19F08C",
      fontFace: "Arial",
      align: "right",
      rtlMode: true,
    });
    const bullets = sheet.executiveSummary.slice(0, 6).map((mp, idx) => ({
      text: `${idx + 1}. ${mp.title ? `${mp.title}: ` : ""}${mp.text}`,
      options: { breakLine: true, fontSize: 14, color: "F1F5F9" },
    }));
    sumSlide.addText(bullets, {
      x: 0.7,
      y: 1.3,
      w: 11.9,
      h: 5.5,
      fontFace: "Arial",
      align: "right",
      valign: "top",
      rtlMode: true,
      lineSpacingMultiple: 1.3,
    });
  }

  // ── Section Slides ──
  for (const sec of sheet?.studySections || []) {
    const slide = pptx.addSlide();
    slide.background = { color: "090D16" };

    slide.addText(`${sec.sectionNumber}. ${sec.title}`, {
      x: 0.6,
      y: 0.35,
      w: 12.1,
      h: 0.65,
      fontSize: 21,
      bold: true,
      color: "38BDF8",
      fontFace: "Arial",
      align: "right",
      rtlMode: true,
    });

    if (mode === "english_only") {
      slide.addText("1. ENGLISH MEDICAL STUDY NOTES (FOR EXAMS)", {
        x: 0.7,
        y: 1.15,
        w: 11.9,
        h: 0.45,
        fontSize: 13,
        bold: true,
        color: "19F08C",
        fontFace: "Arial",
      });
      const enItems = (sec.englishBullets || []).slice(0, 7).map((b) => ({
        text: `• ${b}`,
        options: { breakLine: true, fontSize: 14, color: "E2E8F0" },
      }));
      slide.addText(enItems, {
        x: 0.7,
        y: 1.7,
        w: 11.9,
        h: 5.1,
        fontFace: "Arial",
        align: "left",
        valign: "top",
      });
    } else {
      // Left Column: English Exam Notes
      slide.addText("1. ENGLISH MEDICAL NOTES (EXAMS)", {
        x: 0.6,
        y: 1.15,
        w: 5.8,
        h: 0.4,
        fontSize: 12,
        bold: true,
        color: "38BDF8",
        fontFace: "Arial",
        align: "left",
      });
      const enItems = (sec.englishBullets || []).slice(0, 6).map((b) => ({
        text: `• ${b}`,
        options: { breakLine: true, fontSize: 13, color: "E2E8F0" },
      }));
      slide.addText(enItems, {
        x: 0.6,
        y: 1.65,
        w: 5.8,
        h: 5.2,
        fontFace: "Arial",
        align: "left",
        valign: "top",
      });

      // Right Column: Arabic Explanation
      slide.addText("٢. الشرح والفهم بالعربي (من كلام الدكتور)", {
        x: 6.8,
        y: 1.15,
        w: 5.9,
        h: 0.4,
        fontSize: 13,
        bold: true,
        color: "19F08C",
        fontFace: "Arial",
        align: "right",
        rtlMode: true,
      });
      const arItems = (sec.arabicPoints || []).slice(0, 6).map((p) => ({
        text: `• ${p.text}`,
        options: { breakLine: true, fontSize: 13, color: "F8FAFC" },
      }));
      slide.addText(arItems, {
        x: 6.8,
        y: 1.65,
        w: 5.9,
        h: 5.2,
        fontFace: "Arial",
        align: "right",
        valign: "top",
        rtlMode: true,
      });
    }
  }

  // ── Final Slide: Medical Definitions Glossary (at the very end) ──
  if (sheet?.glossary?.length > 0) {
    const glSlide = pptx.addSlide();
    glSlide.background = { color: "0F172A" };
    glSlide.addText("قاموس التعريفات والمصطلحات الطبية — Medical Glossary", {
      x: 0.6,
      y: 0.4,
      w: 12.1,
      h: 0.6,
      fontSize: 21,
      bold: true,
      color: "FBBF24",
      fontFace: "Arial",
      align: "right",
      rtlMode: true,
    });
    const rows = [
      [
        { text: "المصطلح الطبي (English Term)", options: { bold: true, color: "090D16", fill: "19F08C" } },
        { text: "التعريف والشرح بالعربي", options: { bold: true, color: "090D16", fill: "19F08C", align: "right" } },
      ],
      ...sheet.glossary.slice(0, 10).map((g) => [
        { text: g.en, options: { bold: true, color: "38BDF8", fill: "111827" } },
        { text: g.ar_hint, options: { color: "F8FAFC", fill: "111827", align: "right" } },
      ]),
    ];
    glSlide.addTable(rows, {
      x: 0.6,
      y: 1.2,
      w: 12.1,
      colW: [3.8, 8.3],
      fontSize: 12,
      border: { pt: 1, color: "1E293B" },
    });
  }

  const filename = buildExportFilename(titleText, new Date().toISOString().slice(0, 10), "pptx");
  await pptx.writeFile({ fileName: filename });
  return { filename, slideCount: (sheet?.studySections?.length || 0) + 2 };
}

export default {
  exportLecturePowerPoint,
};
