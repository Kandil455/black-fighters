/**
 * PDF summary templates — data only.
 *
 * Each template describes how a summary PDF LOOKS: accent colour, density, and
 * whether it opens with a contents page. The content decides which template fits
 * (see `pickPdfTemplate`), so the text drives the design, not the other way round.
 *
 * The PDF builder (summaryPdfV2.js) reads these through `templateId`:
 *   accent    — hex colour for headings, rules and highlights
 *   density   — "airy" | "normal" | "dense": scales margins and body size
 *   toc       — boolean: add a contents page
 *   fit       — signals this template is best for (used by pickPdfTemplate)
 */

export const PDF_TEMPLATES = [
  { id: "classic_ink", nameAr: "كلاسيكي أسود", accent: "#12242d", density: "normal", toc: false, fit: { default: true } },
  { id: "study_cyan", nameAr: "مذاكرة سماوي", accent: "#087f8b", density: "normal", toc: true, fit: { sections: 4 } },
  { id: "exam_cram", nameAr: "برشامة الامتحان", accent: "#eb5757", density: "dense", toc: false, fit: { formulas: 3 } },
  { id: "formula_sheet", nameAr: "ورقة المعادلات", accent: "#8856d9", density: "dense", toc: false, fit: { formulas: 8 } },
  { id: "definitions_green", nameAr: "قاموس التعريفات", accent: "#27ae72", density: "normal", toc: true, fit: { definitions: 6 } },
  { id: "qa_orange", nameAr: "أسئلة وأجوبة", accent: "#f2994a", density: "normal", toc: false, fit: { questions: 4 } },
  { id: "warnings_red", nameAr: "تحذيرات مهمة", accent: "#c0392b", density: "normal", toc: false, fit: { warnings: 3 } },
  { id: "table_navy", nameAr: "جداول ومقارنات", accent: "#0f3460", density: "dense", toc: false, fit: { tables: 2 } },
  { id: "airy_gold", nameAr: "مساحة مريحة", accent: "#b9770e", density: "airy", toc: true, fit: { sections: 8 } },
  { id: "chapter_purple", nameAr: "فصول مرقّمة", accent: "#6c3483", density: "normal", toc: true, fit: { sections: 6 } },
  { id: "examples_teal", nameAr: "أمثلة محلولة", accent: "#0e7c7b", density: "normal", toc: false, fit: { examples: 3 } },
  { id: "lists_indigo", nameAr: "نقاط ومراجعة سريعة", accent: "#3f51b5", density: "normal", toc: false, fit: { lists: 4 } },
  { id: "images_slate", nameAr: "رسوم وأشكال", accent: "#546e7a", density: "normal", toc: false, fit: { images: 2 } },
  { id: "code_graphite", nameAr: "أكواد وخوارزميات", accent: "#263238", density: "dense", toc: false, fit: { code: 2 } },
  { id: "bilingual_blue", nameAr: "ثنائي اللغة", accent: "#1565c0", density: "normal", toc: true, fit: { english: 4 } },
  { id: "highlights_lime", nameAr: "نقاط مضيئة", accent: "#7cb342", density: "normal", toc: false, fit: { highlights: 4 } },
  { id: "quotes_brown", nameAr: "اقتباسات ومراجع", accent: "#6d4c41", density: "airy", toc: false, fit: { quotes: 2 } },
  { id: "timeline_plum", nameAr: "تسلسل زمني", accent: "#8e24aa", density: "normal", toc: true, fit: { sections: 5 } },
  { id: "cram_night", nameAr: "مراجعة ليلية", accent: "#b71c1c", density: "dense", toc: false, fit: { formulas: 5 } },
  { id: "oxford_maroon", nameAr: "كلاسيكي أكاديمي", accent: "#4e0d1e", density: "normal", toc: true, fit: { sections: 10 } },
  { id: "sunset_coral", nameAr: "دافئ", accent: "#ff7043", density: "normal", toc: false, fit: { definitions: 4 } },
  { id: "ocean_deep", nameAr: "محيطي عميق", accent: "#004d61", density: "normal", toc: true, fit: { sections: 7 } },
  { id: "desert_sand", nameAr: "رملي", accent: "#a1887f", density: "airy", toc: false, fit: { sections: 9 } },
  { id: "mint_fresh", nameAr: "نعناع", accent: "#00b894", density: "normal", toc: false, fit: { definitions: 8 } },
  { id: "royal_violet", nameAr: "بنفسجي ملكي", accent: "#5e35b1", density: "normal", toc: true, fit: { sections: 12 } },
  { id: "steel_clean", nameAr: "صلب نظيف", accent: "#37474f", density: "normal", toc: false, fit: { tables: 4 } },
  { id: "rose_soft", nameAr: "وردي ناعم", accent: "#d81b60", density: "airy", toc: false, fit: { questions: 6 } },
  { id: "copper_warm", nameAr: "نحاسي", accent: "#b87333", density: "normal", toc: false, fit: { warnings: 5 } },
  { id: "arctic_ice", nameAr: "ثلجي", accent: "#0288d1", density: "airy", toc: false, fit: { sections: 4 } },
  { id: "espresso_dark", nameAr: "قهوة داكن", accent: "#3e2723", density: "dense", toc: false, fit: { tables: 6 } },
  { id: "neon_lime_dark", nameAr: "نيون", accent: "#64dd17", density: "dense", toc: false, fit: { highlights: 8 } },
  { id: "pastel_peach", nameAr: "خوخي", accent: "#ffab91", density: "airy", toc: false, fit: { examples: 6 } },
  { id: "ruby_exam", nameAr: "ياقوتي للامتحان", accent: "#9b111e", density: "dense", toc: false, fit: { formulas: 12 } },
  { id: "sage_notes", nameAr: "ملاحظات مريحة", accent: "#7d9d7c", density: "airy", toc: true, fit: { sections: 6 } },
  { id: "gold_premium", nameAr: "ذهبي فاخر", accent: "#c9a227", density: "normal", toc: true, fit: { sections: 15 } },
  { id: "navy_formal", nameAr: "رسمي كحلي", accent: "#1a237e", density: "normal", toc: true, fit: { sections: 11 } },
  { id: "teal_grid", nameAr: "شبكة تيل", accent: "#00897b", density: "dense", toc: false, fit: { tables: 8 } },
  { id: "crimson_alert", nameAr: "تنبيهات حمراء", accent: "#d32f2f", density: "normal", toc: false, fit: { warnings: 9 } },
  { id: "obsidian", nameAr: "أسود أوبسيديان", accent: "#101418", density: "normal", toc: false, fit: { questions: 10 } },
  { id: "honey_study", nameAr: "عسلي للمذاكرة", accent: "#f9a825", density: "normal", toc: true, fit: { sections: 13 } },
  { id: "glacier_blue", nameAr: "أزرق جليدي", accent: "#4fc3f7", density: "airy", toc: false, fit: { examples: 9 } },
  { id: "ember_dense", nameAr: "جمر مكثف", accent: "#e64a19", density: "dense", toc: false, fit: { definitions: 14 } },
  { id: "moss_tables", nameAr: "جداول خضراء", accent: "#558b2f", density: "dense", toc: false, fit: { tables: 10 } },
  { id: "slate_list", nameAr: "قائمة رمادية", accent: "#78909c", density: "normal", toc: false, fit: { lists: 9 } },
  { id: "royal_code", nameAr: "أكواد ملكي", accent: "#4a148c", density: "dense", toc: false, fit: { code: 5 } },
  { id: "cocoa_quote", nameAr: "كاكاو اقتباس", accent: "#795548", density: "airy", toc: false, fit: { quotes: 5 } },
  { id: "aqua_image", nameAr: "أكوا صور", accent: "#00acc1", density: "normal", toc: false, fit: { images: 5 } },
  { id: "plum_bilingual", nameAr: "بلوم ثنائي", accent: "#ad1457", density: "normal", toc: true, fit: { english: 9 } },
  { id: "jade_final", nameAr: "جيد نهائي", accent: "#00695c", density: "normal", toc: true, fit: { sections: 16 } },
  { id: "maroon_cram", nameAr: "برشامة عنابي", accent: "#800000", density: "dense", toc: false, fit: { formulas: 16 } },
];

const BY_ID = Object.fromEntries(PDF_TEMPLATES.map((t) => [t.id, t]));

export function getPdfTemplate(id) {
  return BY_ID[String(id || "")] || BY_ID.classic_ink;
}

/**
 * Pick the template whose signals best match the document's content.
 * Counts the content blocks by role/type, then scores each template's `fit`.
 * Deterministic: same content always picks the same template.
 */
export function pickPdfTemplate(doc) {
  const sections = Array.isArray(doc?.sections) ? doc.sections : [];
  const blocks = sections.flatMap((s) => (Array.isArray(s.blocks) ? s.blocks : []));
  const count = (pred) => blocks.filter(pred).length;
  const signals = {
    sections: sections.length,
    formulas: count((b) => b?.role === "formula" || b?.type === "equation"),
    definitions: count((b) => b?.role === "definition"),
    questions: count((b) => b?.role === "question" || b?.role === "answer"),
    warnings: count((b) => b?.role === "warning"),
    tables: count((b) => b?.type === "table"),
    examples: count((b) => b?.role === "example"),
    lists: count((b) => b?.type === "bullet_list" || b?.type === "ordered_list"),
    images: count((b) => b?.type === "image"),
    code: count((b) => b?.type === "code"),
    english: count((b) => b?.role === "english_points"),
    highlights: count((b) => b?.type === "highlight" || b?.type === "plain_highlight"),
    quotes: count((b) => b?.type === "quote"),
  };
  let best = null;
  let bestScore = -1;
  for (const t of PDF_TEMPLATES) {
    if (t.fit.default) continue;
    const key = Object.keys(t.fit)[0];
    const need = t.fit[key];
    const have = signals[key] || 0;
    // A template fits when its signal reaches its threshold. Prefer the most
    // SPECIFIC match: the highest threshold that is met, so a 9-formula document
    // lands on formula_sheet (8) rather than exam_cram (3).
    if (have < need) continue;
    if (need > bestScore) {
      bestScore = need;
      best = t;
    }
  }
  return bestScore > 0 ? best : PDF_TEMPLATES[0];
}
