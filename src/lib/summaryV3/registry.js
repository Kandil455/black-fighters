export const SUMMARY_V3_SCHEMA_VERSION = 3;
export const SUMMARY_V3_PIPELINE_VERSION = "3.0.0";

export const SUMMARY_LANGUAGE_MODES = Object.freeze(["ar", "en", "bilingual"]);
export const SUMMARY_DIRECTIONS = Object.freeze(["rtl", "ltr", "auto"]);
export const SUMMARY_BLOCK_ROLES = Object.freeze([
  "body",
  "english_points",
  "arabic_explanation",
  "question",
  "answer",
  "definition",
  "example",
  "warning",
  "formula",
]);
export const SUMMARY_BLOCK_TYPES = Object.freeze([
  "heading",
  "paragraph",
  "bullet_list",
  "ordered_list",
  "quote",
  "code",
  "equation",
  "table",
  "concept_map",
  "image",
]);

export const SUMMARY_SEMANTICS = Object.freeze([
  "term",
  "definition",
  "fact",
  "result",
  "example",
  "warning",
  "formula",
  "statistic",
]);

export const SEMANTIC_EMPHASIS = Object.freeze({
  warning: Object.freeze({ color: "red", weight: 100 }),
  formula: Object.freeze({ color: "cyan", weight: 95 }),
  definition: Object.freeze({ color: "green", weight: 90 }),
  result: Object.freeze({ color: "green", weight: 85 }),
  statistic: Object.freeze({ color: "yellow", weight: 80 }),
  fact: Object.freeze({ color: "yellow", weight: 75 }),
  example: Object.freeze({ color: "orange", weight: 65 }),
  term: Object.freeze({ color: "cyan", weight: 55 }),
});

export const SUMMARY_COLOR_PROFILES = Object.freeze({
  none: Object.freeze({ id: "none", minPerSection: 0, maxPerSection: 0, targetPerThousandWords: 0 }),
  medium: Object.freeze({ id: "medium", minPerSection: 0, maxPerSection: 4, targetPerThousandWords: 10 }),
  rich: Object.freeze({ id: "rich", minPerSection: 0, maxPerSection: 8, targetPerThousandWords: 24 }),
});

const allLanguages = Object.freeze(["ar", "en", "bilingual"]);

export const SUMMARY_TEMPLATE_REGISTRY = Object.freeze({
  /**
   * Atlas V5 "شرح من الأساس" — the template the Create Course dialog defaults to.
   *
   * It was missing from this registry while the picker offered it, so the default
   * create-course flow threw `UNKNOWN_SUMMARY_TEMPLATE:foundational_bilingual`
   * and no summary could be generated at all.
   */
  foundational_bilingual: Object.freeze({
    id: "foundational_bilingual",
    version: 1,
    label: "Foundational Bilingual",
    // Must accept every mode the create dialog offers: pinning this to
    // "bilingual" made picking English fail with a language conflict.
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: true,
      requiresConclusion: true,
      minSections: 1,
      maxSections: 20,
      requiredRolesPerSection: Object.freeze(["english_points", "arabic_explanation"]),
    }),
  }),
  /** Atlas Cram "برشامة ليلة الامتحان" — the "fast" depth toggle. */
  atlas_cram: Object.freeze({
    id: "atlas_cram",
    version: 1,
    label: "Atlas Cram Sheet",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: true,
      requiresConclusion: true,
      minSections: 1,
      maxSections: 24,
      requiredRolesPerSection: Object.freeze([]),
    }),
  }),
  bilingual_lecture: Object.freeze({
    id: "bilingual_lecture",
    version: 1,
    label: "Bilingual Lecture",
    supportedLanguages: Object.freeze(["bilingual"]),
    structure: Object.freeze({
      requiresOverview: true,
      requiresConclusion: true,
      minSections: 1,
      maxSections: 18,
      requiredRolesPerSection: Object.freeze(["english_points", "arabic_explanation"]),
    }),
  }),
  complete_study_guide: Object.freeze({
    id: "complete_study_guide",
    version: 1,
    label: "Complete Study Guide",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: true,
      requiresConclusion: true,
      minSections: 1,
      maxSections: 60,
      requiredRolesPerSection: Object.freeze([]),
      minBlocksPerSection: 2,
    }),
  }),
  exam_revision_sheet: Object.freeze({
    id: "exam_revision_sheet",
    version: 1,
    label: "Exam Revision Sheet",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: false,
      requiresConclusion: true,
      minSections: 1,
      maxSections: 24,
      requiredRolesPerSection: Object.freeze([]),
      preferLists: true,
      maxParagraphWords: 90,
    }),
  }),
  comparison_classification: Object.freeze({
    id: "comparison_classification",
    version: 1,
    label: "Comparison and Classification",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: false,
      requiresConclusion: false,
      minSections: 1,
      maxSections: 30,
      requiredRolesPerSection: Object.freeze([]),
      requiresTableBlockPerSection: true,
    }),
  }),
  qa_tutor: Object.freeze({
    id: "qa_tutor",
    version: 1,
    label: "Question and Answer Tutor",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: false,
      requiresConclusion: false,
      minSections: 1,
      maxSections: 30,
      requiredRolesPerSection: Object.freeze(["question", "answer"]),
      requiresAlternatingQaPairs: true,
    }),
  }),
  visual_concepts_formulas: Object.freeze({
    id: "visual_concepts_formulas",
    version: 1,
    label: "Visual Concepts and Formulas",
    supportedLanguages: allLanguages,
    structure: Object.freeze({
      requiresOverview: false,
      requiresConclusion: false,
      minSections: 1,
      maxSections: 40,
      requiredRolesPerSection: Object.freeze([]),
      requiresVisualOrFormulaBlockPerSection: true,
    }),
  }),
});

export const SUMMARY_TEMPLATE_ALIASES = Object.freeze({
  ultra_multi_agent: "bilingual_lecture",
  lecture_exact: "complete_study_guide",
  complete: "complete_study_guide",
  revision_sheet: "exam_revision_sheet",
  key_points: "exam_revision_sheet",
  equations_only: "visual_concepts_formulas",
  bilingual_blocks: "bilingual_lecture",
  simple_overview: "complete_study_guide",
  compact: "exam_revision_sheet",
  qa_notes: "qa_tutor",
  comparison_tables: "comparison_classification",
  concept_map: "visual_concepts_formulas",
  timeline: "visual_concepts_formulas",
  organized_original: "complete_study_guide",
  format_only: "complete_study_guide",
});

export function resolveSummaryTemplateId(templateId) {
  const requested = String(templateId || "");
  if (SUMMARY_TEMPLATE_REGISTRY[requested]) return requested;
  return SUMMARY_TEMPLATE_ALIASES[requested] || null;
}

export function getSummaryTemplateContract(templateId) {
  const resolved = resolveSummaryTemplateId(templateId);
  return resolved ? SUMMARY_TEMPLATE_REGISTRY[resolved] : null;
}

export function requireSummaryTemplateContract(templateId) {
  const contract = getSummaryTemplateContract(templateId);
  if (!contract) throw new Error(`UNKNOWN_SUMMARY_TEMPLATE:${String(templateId || "")}`);
  return contract;
}

export function getSummaryColorProfile(colorLevel) {
  return SUMMARY_COLOR_PROFILES[String(colorLevel || "")] || null;
}

export function requireSummaryColorProfile(colorLevel) {
  const profile = getSummaryColorProfile(colorLevel);
  if (!profile) throw new Error(`UNKNOWN_SUMMARY_COLOR_LEVEL:${String(colorLevel || "")}`);
  return profile;
}

export function isTemplateLanguageCompatible(templateId, languageMode) {
  const contract = getSummaryTemplateContract(templateId);
  return !!contract && contract.supportedLanguages.includes(languageMode);
}
