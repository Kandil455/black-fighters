/**
 * Summary Visual Designs — the pick the owner demanded at upload time.
 *
 * A "design" is a VISUAL skin choice. It maps 1:1 to a summary template
 * contract id so the generated document is born structured for that skin,
 * and the reader (SummaryView) applies the matching CSS skin from
 * doc.meta.templateId. There is a single source of truth here so the
 * CreateCourse picker, the auto-save flow, and the reader never disagree.
 */

export const SUMMARY_DESIGNS = [
  {
    id: "royal",
    templateId: "royal_study",
    icon: "book",
    titleAr: "المذكرة الأكاديمية الشاملة 📘",
    titleEn: "Academic Study Paper",
    descAr: "تنظيم أكاديمي متكامل مع تعريفات علمية واضحة، ترقيم أبواب منظم، وملاحظات امتحانية مركزة.",
    descEn: "Comprehensive academic study paper with structured definitions, numbered chapters, and high-yield exam notes.",
    // Hex pair feeds the picker's live mini-thumbnail (bg, accent).
    palette: { bg: "#f8fafc", primary: "#10b981", accent: "#059669" },
    recommended: true,
  },
  {
    id: "capsule",
    templateId: "capsule_sheet",
    icon: "capsule",
    titleAr: "الكبسولة السريعة ⚡",
    titleEn: "Capsule Sheet",
    descAr: "كبسولات مختصرة بنقاط محددة وخواتم تحذير — مذاكرة سريعة قبل الامتحان.",
    descEn: "Short punchy capsules with a warning seal — late-night revision mode.",
    palette: { bg: "#041423", primary: "#38bdf8", accent: "#22d3ee" },
  },
  {
    id: "tabular",
    templateId: "comparison_classification",
    icon: "table",
    titleAr: "الجدولي الأكاديمي 📊",
    titleEn: "Tabular Scholar",
    descAr: "جداول مقارنة وتصنيفات أولًا — كل محور يصبح جدولاً واضحاً.",
    descEn: "Comparison tables and classifications first — every axis becomes a clean grid.",
    palette: { bg: "#0b1220", primary: "#60a5fa", accent: "#f97316" },
  },
  {
    id: "concepts",
    templateId: "visual_concepts_formulas",
    icon: "network",
    titleAr: "منظومة المفاهيم 🧠",
    titleEn: "Concept Map",
    descAr: "مفاهيم وقوانين أولًا — كل فكرة علمية تُعرّف قبل الكلام.",
    descEn: "Concepts and formulas first — every scientific idea defined before the prose.",
    palette: { bg: "#120b1f", primary: "#a78bfa", accent: "#f472b6" },
  },
];

const BY_ID = new Map(SUMMARY_DESIGNS.map((design) => [design.id, design]));
const BY_TEMPLATE = new Map(SUMMARY_DESIGNS.map((design) => [design.templateId, design]));

export const DEFAULT_SUMMARY_DESIGN = "royal";

/** designId → template contract id (never returns an unknown template). */
export function resolveSummaryTemplateId(designId) {
  return BY_ID.get(String(designId || ""))?.templateId || BY_ID.get(DEFAULT_SUMMARY_DESIGN).templateId;
}

/** templateId → designId for the reader's skin key. Unknown → royal skin. */
export function resolveDesignIdFromTemplate(templateId) {
  if (BY_TEMPLATE.has(String(templateId || ""))) return BY_TEMPLATE.get(String(templateId)).id;
  // Legacy templates keep the royal skin by design-intent.
  return DEFAULT_SUMMARY_DESIGN;
}

export function getSummaryDesign(designId) {
  return BY_ID.get(String(designId || "")) || BY_ID.get(DEFAULT_SUMMARY_DESIGN);
}
