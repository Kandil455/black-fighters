/**
 * src/features/lectures/ai/schemas.js — Constants and schema definitions for
 * DeepSeek Plan, StudyNotes, and Summary outputs (Section 11.3, 13.3, 13.4).
 */

export const SECTION_KINDS = Object.freeze([
  "intro",
  "concept",
  "mechanism",
  "classification",
  "clinical_case",
  "steps",
  "comparison",
  "exam_tips",
  "recap",
  "other",
  // Legacy aliases supported seamlessly
  "compare",
  "exam",
  "example",
  "narration",
  "fluff",
]);

export const ANNOTATION_KINDS = Object.freeze([
  "key_point",
  "definition",
  "warning",
  "exam",
  "exam_pearl",
  "mnemonic",
  "example",
  "number",
  "question_to_students",
]);

export const OFFTOPIC_KINDS = Object.freeze([
  "joke",
  "greeting",
  "logistics",
  "personal_story",
  "tech_issue",
  "attendance",
  "other",
]);

export const ANNOTATION_LABELS_AR = Object.freeze({
  key_point: "نقطة أساسية",
  definition: "تعريف",
  warning: "تحذير",
  exam: "موضع امتحان ⭐",
  exam_pearl: "موضع امتحان ⭐",
  mnemonic: "بصمجة / اختصار للحفظ",
  example: "مثال / حالة إكلينيكية",
  number: "رقم / جرعة مهمة",
  question_to_students: "سؤال للطلبة",
});

export const SECTION_KIND_LABELS_AR = Object.freeze({
  intro: "مقدمة",
  concept: "مفهوم أساسي",
  mechanism: "آلية العمل",
  classification: "تقسيمة",
  clinical_case: "حالة إكلينيكية",
  steps: "خطوات",
  comparison: "مقارنة",
  compare: "مقارنة",
  exam_tips: "تنبيهات امتحان",
  exam: "تنبيهات امتحان",
  example: "مثال",
  recap: "مراجعة",
  narration: "شرح",
  fluff: "كلام جانبي",
  other: "عام",
});

export default {
  SECTION_KINDS,
  ANNOTATION_KINDS,
  OFFTOPIC_KINDS,
  ANNOTATION_LABELS_AR,
  SECTION_KIND_LABELS_AR,
};
