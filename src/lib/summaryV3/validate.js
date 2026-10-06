import {
  SEMANTIC_EMPHASIS,
  SUMMARY_BLOCK_ROLES,
  SUMMARY_BLOCK_TYPES,
  SUMMARY_COLOR_PROFILES,
  SUMMARY_DIRECTIONS,
  SUMMARY_LANGUAGE_MODES,
  SUMMARY_SEMANTICS,
  SUMMARY_V3_SCHEMA_VERSION,
  getSummaryTemplateContract,
  isTemplateLanguageCompatible,
} from "./registry.js";
import {
  collectBlockRichText,
  countSectionHighlights,
  detectSummaryDirection,
  detectSummaryLanguage,
  hasLegacyMarkupLeak,
} from "./text.js";
import { getSummaryDocumentText } from "./document.js";

function diagnostic(code, path, message, details = {}) {
  return { code, path, message, ...details };
}

function normalizeDuplicateText(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u0600-\u06ff%+=.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function blockPlainText(block) {
  return collectBlockRichText(block).map((richText) => richText.text).join(" ").trim();
}

function validateRichText(richText, path, errors, warnings, options = {}) {
  if (!richText || typeof richText !== "object") {
    errors.push(diagnostic("INVALID_RICH_TEXT", path, "Rich text must be an object."));
    return { words: 0, highlights: 0 };
  }
  const text = String(richText.text || "");
  if (!SUMMARY_DIRECTIONS.includes(richText.direction)) {
    errors.push(diagnostic("INVALID_DIRECTION", `${path}.direction`, "Direction must be rtl, ltr, or auto."));
  } else {
    const expectedDirection = detectSummaryDirection(text);
    if (richText.direction !== expectedDirection) {
      warnings.push(diagnostic("DIRECTION_MISMATCH", `${path}.direction`, `Expected ${expectedDirection} for this text.`, { expected: expectedDirection, actual: richText.direction }));
    }
  }
  const expectedLanguage = detectSummaryLanguage(text);
  if (richText.language !== expectedLanguage) {
    warnings.push(diagnostic("LANGUAGE_TAG_MISMATCH", `${path}.language`, `Expected ${expectedLanguage} for this text.`, { expected: expectedLanguage, actual: richText.language }));
  }
  if (!options.allowTechnicalEquality && hasLegacyMarkupLeak(text)) {
    errors.push(diagnostic("LEGACY_MARKUP_LEAK", `${path}.text`, "Canonical rich text must not contain legacy highlight or bold markers."));
  }

  let highlights = 0;
  const annotations = Array.isArray(richText.annotations) ? richText.annotations : [];
  for (let index = 0; index < annotations.length; index += 1) {
    const annotation = annotations[index];
    const annotationPath = `${path}.annotations[${index}]`;
    if (!Number.isInteger(annotation?.start) || !Number.isInteger(annotation?.end) || annotation.start < 0 || annotation.end > text.length || annotation.end <= annotation.start) {
      errors.push(diagnostic("INVALID_ANNOTATION_RANGE", annotationPath, "Annotation range must be inside the plain text."));
      continue;
    }
    if (!SUMMARY_SEMANTICS.includes(annotation.semantic)) {
      errors.push(diagnostic("INVALID_ANNOTATION_SEMANTIC", `${annotationPath}.semantic`, "Unknown annotation semantic."));
    }
    if (annotation.highlight) {
      highlights += 1;
      const expectedColor = SEMANTIC_EMPHASIS[annotation.semantic]?.color;
      if (!annotation.color || annotation.color !== expectedColor) {
        errors.push(diagnostic("NON_DETERMINISTIC_HIGHLIGHT_COLOR", `${annotationPath}.color`, `Semantic ${annotation.semantic} must use ${expectedColor}.`, { expected: expectedColor, actual: annotation.color }));
      }
    } else if (annotation.color != null) {
      errors.push(diagnostic("INACTIVE_HIGHLIGHT_COLOR", `${annotationPath}.color`, "A non-highlight annotation must not retain a display color."));
    }
  }
  const words = text.trim() ? text.trim().split(/\s+/).length : 0;
  return { words, highlights };
}

function validateBlock(block, path, errors, warnings, options) {
  if (!block || typeof block !== "object") {
    errors.push(diagnostic("INVALID_BLOCK", path, "Block must be an object."));
    return { words: 0, highlights: 0, text: "" };
  }
  if (!block.id) errors.push(diagnostic("MISSING_BLOCK_ID", `${path}.id`, "Block id is required."));
  if (!SUMMARY_BLOCK_TYPES.includes(block.type)) errors.push(diagnostic("INVALID_BLOCK_TYPE", `${path}.type`, "Unknown block type."));
  if (!SUMMARY_BLOCK_ROLES.includes(block.role)) errors.push(diagnostic("INVALID_BLOCK_ROLE", `${path}.role`, "Unknown block role."));
  if (!SUMMARY_DIRECTIONS.includes(block.direction)) errors.push(diagnostic("INVALID_BLOCK_DIRECTION", `${path}.direction`, "Unknown block direction."));
  if ((block.type === "code" || block.type === "equation") && block.direction !== "ltr") {
    errors.push(diagnostic("TECHNICAL_BLOCK_NOT_LTR", `${path}.direction`, "Code and equation blocks must be ltr."));
  }
  if (block.type === "image") {
    if (!/^https:\/\//i.test(String(block.src || ""))) errors.push(diagnostic("INVALID_IMAGE_SOURCE", `${path}.src`, "Image source must use HTTPS."));
    const allowedLicenses = new Set(["cc0", "pdm", "by", "by-sa"]);
    if (!allowedLicenses.has(String(block.attribution?.license || "").toLowerCase())) errors.push(diagnostic("INVALID_IMAGE_LICENSE", `${path}.attribution.license`, "Image license is not approved."));
    if (block.attribution?.approved !== true) errors.push(diagnostic("IMAGE_NOT_APPROVED", `${path}.attribution.approved`, "A user must approve every suggested image."));
    if (!/^https:\/\//i.test(String(block.attribution?.sourcePage || ""))) errors.push(diagnostic("MISSING_IMAGE_SOURCE_PAGE", `${path}.attribution.sourcePage`, "Image source page is required."));
  }

  let words = 0;
  let highlights = 0;
  const richTexts = collectBlockRichText(block);
  for (let index = 0; index < richTexts.length; index += 1) {
    const result = validateRichText(richTexts[index], `${path}.richText[${index}]`, errors, warnings, {
      ...options,
      allowTechnicalEquality: block.type === "code" || block.type === "equation",
    });
    words += result.words;
    highlights += result.highlights;
  }
  if (!richTexts.length) errors.push(diagnostic("EMPTY_BLOCK", path, "Block must contain content, list items, or table cells."));

  const allowedPages = options.sourcePages;
  for (const page of block.sourceRefs || []) {
    if (!Number.isInteger(page) || page <= 0) errors.push(diagnostic("INVALID_SOURCE_PAGE", `${path}.sourceRefs`, "Source page must be a positive integer.", { page }));
    else if (allowedPages && !allowedPages.has(page)) errors.push(diagnostic("INVENTED_SOURCE_PAGE", `${path}.sourceRefs`, "Source page does not exist in the source document.", { page }));
  }
  const allowedFacts = options.sourceFactIds;
  for (const factId of block.sourceFactIds || []) {
    if (allowedFacts && !allowedFacts.has(factId)) errors.push(diagnostic("UNKNOWN_SOURCE_FACT", `${path}.sourceFactIds`, "Source fact id does not exist in the map output.", { factId }));
  }
  return { words, highlights, text: blockPlainText(block) };
}

function makeSet(value, numberValues = false) {
  if (!value) return null;
  const values = value instanceof Set ? [...value] : Array.isArray(value) ? value : [];
  return new Set(numberValues ? values.map(Number) : values.map(String));
}

export function validateSummaryDocument(document, options = {}) {
  const errors = [];
  const warnings = [];
  const validationOptions = {
    ...options,
    sourcePages: makeSet(options.sourcePages, true),
    sourceFactIds: makeSet(options.sourceFactIds),
  };

  if (!document || typeof document !== "object") {
    return {
      valid: false,
      errors: [diagnostic("INVALID_DOCUMENT", "$", "Summary document must be an object.")],
      warnings,
      metrics: {},
    };
  }
  if (document.schemaVersion !== SUMMARY_V3_SCHEMA_VERSION) {
    errors.push(diagnostic("INVALID_SCHEMA_VERSION", "$.schemaVersion", `Expected schema version ${SUMMARY_V3_SCHEMA_VERSION}.`, { actual: document.schemaVersion }));
  }
  const contract = getSummaryTemplateContract(document.templateId);
  if (!contract) errors.push(diagnostic("UNKNOWN_TEMPLATE", "$.templateId", "Template id is not registered."));
  if (!SUMMARY_LANGUAGE_MODES.includes(document.languageMode)) errors.push(diagnostic("INVALID_LANGUAGE_MODE", "$.languageMode", "Unknown language mode."));
  else if (contract && !isTemplateLanguageCompatible(document.templateId, document.languageMode)) {
    errors.push(diagnostic("TEMPLATE_LANGUAGE_CONFLICT", "$.languageMode", `Template ${document.templateId} does not support ${document.languageMode}.`));
  }
  const colorProfile = SUMMARY_COLOR_PROFILES[document.colorLevel];
  if (!colorProfile) errors.push(diagnostic("INVALID_COLOR_LEVEL", "$.colorLevel", "Unknown color level."));

  const titleMetrics = validateRichText(document.title, "$.title", errors, warnings, validationOptions);
  if (!String(document.title?.text || "").trim()) errors.push(diagnostic("EMPTY_TITLE", "$.title.text", "Summary title is required."));
  const overview = Array.isArray(document.overview) ? document.overview : [];
  const sections = Array.isArray(document.sections) ? document.sections : [];
  const conclusion = Array.isArray(document.conclusion) ? document.conclusion : [];
  if (!Array.isArray(document.overview)) errors.push(diagnostic("INVALID_OVERVIEW", "$.overview", "Overview must be an array."));
  if (!Array.isArray(document.sections)) errors.push(diagnostic("INVALID_SECTIONS", "$.sections", "Sections must be an array."));
  if (!Array.isArray(document.conclusion)) errors.push(diagnostic("INVALID_CONCLUSION", "$.conclusion", "Conclusion must be an array."));

  if (contract) {
    if (contract.structure.requiresOverview && !overview.length) errors.push(diagnostic("MISSING_OVERVIEW", "$.overview", "This template requires an overview."));
    if (contract.structure.requiresConclusion && !conclusion.length) errors.push(diagnostic("MISSING_CONCLUSION", "$.conclusion", "This template requires a conclusion."));
    if (sections.length < contract.structure.minSections) errors.push(diagnostic("TOO_FEW_SECTIONS", "$.sections", `This template requires at least ${contract.structure.minSections} section(s).`));
    if (sections.length > contract.structure.maxSections) errors.push(diagnostic("TOO_MANY_SECTIONS", "$.sections", `This template allows at most ${contract.structure.maxSections} sections.`));
  }

  let words = titleMetrics.words;
  let highlights = titleMetrics.highlights;
  const ids = new Set();
  const duplicateKeys = new Map();
  const sectionHighlightCounts = [];

  const inspectBlocks = (blocks, path) => {
    let localHighlights = 0;
    (blocks || []).forEach((block, index) => {
      const result = validateBlock(block, `${path}[${index}]`, errors, warnings, validationOptions);
      words += result.words;
      highlights += result.highlights;
      localHighlights += result.highlights;
      if (block?.id) {
        if (ids.has(block.id)) errors.push(diagnostic("DUPLICATE_ID", `${path}[${index}].id`, "Block and section ids must be unique.", { id: block.id }));
        ids.add(block.id);
      }
      const key = normalizeDuplicateText(result.text);
      if (key.length >= 40) duplicateKeys.set(key, (duplicateKeys.get(key) || 0) + 1);
    });
    return localHighlights;
  };

  const overviewHighlights = inspectBlocks(overview, "$.overview");
  const conclusionHighlights = inspectBlocks(conclusion, "$.conclusion");
  if (colorProfile && overviewHighlights > colorProfile.maxPerSection) errors.push(diagnostic("OVERVIEW_HIGHLIGHT_LIMIT", "$.overview", "Overview exceeds the highlight limit."));
  if (colorProfile && conclusionHighlights > colorProfile.maxPerSection) errors.push(diagnostic("CONCLUSION_HIGHLIGHT_LIMIT", "$.conclusion", "Conclusion exceeds the highlight limit."));

  for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
    const section = sections[sectionIndex];
    const sectionPath = `$.sections[${sectionIndex}]`;
    if (!section?.id) errors.push(diagnostic("MISSING_SECTION_ID", `${sectionPath}.id`, "Section id is required."));
    else {
      if (ids.has(section.id)) errors.push(diagnostic("DUPLICATE_ID", `${sectionPath}.id`, "Block and section ids must be unique.", { id: section.id }));
      ids.add(section.id);
    }
    const sectionTitle = validateRichText(section?.title, `${sectionPath}.title`, errors, warnings, validationOptions);
    words += sectionTitle.words;
    if (!String(section?.title?.text || "").trim()) errors.push(diagnostic("EMPTY_SECTION_TITLE", `${sectionPath}.title.text`, "Section title is required."));
    const blocks = Array.isArray(section?.blocks) ? section.blocks : [];
    if (!blocks.length) errors.push(diagnostic("EMPTY_SECTION", `${sectionPath}.blocks`, "Section must contain at least one block."));
    const sectionHighlights = inspectBlocks(blocks, `${sectionPath}.blocks`);
    sectionHighlightCounts.push(sectionHighlights);
    if (colorProfile && sectionHighlights > colorProfile.maxPerSection) {
      errors.push(diagnostic("SECTION_HIGHLIGHT_LIMIT", `${sectionPath}.blocks`, `Section exceeds the ${document.colorLevel} highlight limit.`, { actual: sectionHighlights, max: colorProfile.maxPerSection }));
    }
    if (document.colorLevel === "none" && countSectionHighlights(section) > 0) {
      errors.push(diagnostic("HIGHLIGHT_IN_NONE_MODE", `${sectionPath}.blocks`, "None color mode must contain zero highlights."));
    }
    for (const page of section?.sourceRefs || []) {
      if (validationOptions.sourcePages && !validationOptions.sourcePages.has(page)) {
        errors.push(diagnostic("INVENTED_SOURCE_PAGE", `${sectionPath}.sourceRefs`, "Section source page does not exist in the source document.", { page }));
      }
    }
    for (const factId of section?.sourceFactIds || []) {
      if (validationOptions.sourceFactIds && !validationOptions.sourceFactIds.has(factId)) {
        errors.push(diagnostic("UNKNOWN_SOURCE_FACT", `${sectionPath}.sourceFactIds`, "Section source fact id does not exist in the map output.", { factId }));
      }
    }

    if (contract) {
      for (const requiredRole of contract.structure.requiredRolesPerSection || []) {
        if (!blocks.some((block) => block.role === requiredRole && blockPlainText(block))) {
          errors.push(diagnostic("MISSING_REQUIRED_SECTION_ROLE", `${sectionPath}.blocks`, `Every section requires role ${requiredRole}.`, { role: requiredRole }));
        }
      }
      if (contract.structure.minBlocksPerSection && blocks.length < contract.structure.minBlocksPerSection) {
        errors.push(diagnostic("TOO_FEW_BLOCKS_IN_SECTION", `${sectionPath}.blocks`, `Every section requires at least ${contract.structure.minBlocksPerSection} blocks.`, { actual: blocks.length, minimum: contract.structure.minBlocksPerSection }));
      }
      if (contract.id === "bilingual_lecture") {
        const englishIndexes = blocks.map((block, index) => block.role === "english_points" ? index : -1).filter((index) => index >= 0);
        const arabicIndexes = blocks.map((block, index) => block.role === "arabic_explanation" ? index : -1).filter((index) => index >= 0);
        if (englishIndexes.length && arabicIndexes.length && Math.max(...englishIndexes) > Math.min(...arabicIndexes)) {
          errors.push(diagnostic("BILINGUAL_ROLE_ORDER", `${sectionPath}.blocks`, "English study points must come before the Arabic explanation."));
        }
        for (const index of englishIndexes) {
          if (detectSummaryLanguage(blockPlainText(blocks[index])) === "ar") errors.push(diagnostic("ENGLISH_ROLE_IS_ARABIC", `${sectionPath}.blocks[${index}]`, "English points block does not contain English study text."));
        }
        for (const index of arabicIndexes) {
          if (detectSummaryLanguage(blockPlainText(blocks[index])) === "en") errors.push(diagnostic("ARABIC_ROLE_IS_ENGLISH", `${sectionPath}.blocks[${index}]`, "Arabic explanation block does not contain Arabic explanation text."));
        }
      }
      if (contract.structure.requiresTableBlockPerSection && !blocks.some((block) => block.type === "table")) {
        errors.push(diagnostic("MISSING_COMPARISON_TABLE", `${sectionPath}.blocks`, "Every comparison section requires a table block."));
      }
      if (contract.structure.requiresAlternatingQaPairs) {
        const qaRoles = blocks.map((block) => block.role).filter((role) => role === "question" || role === "answer");
        const validPairs = qaRoles.length >= 2
          && qaRoles.length % 2 === 0
          && qaRoles.every((role, index) => role === (index % 2 === 0 ? "question" : "answer"));
        if (!validPairs) errors.push(diagnostic("INVALID_QA_PAIR_SEQUENCE", `${sectionPath}.blocks`, "Q&A sections require alternating question and answer block pairs."));
      }
      if (contract.structure.requiresVisualOrFormulaBlockPerSection && !blocks.some((block) => block.type === "equation" || block.type === "concept_map" || block.type === "table" || block.role === "formula")) {
        errors.push(diagnostic("MISSING_VISUAL_OR_FORMULA_BLOCK", `${sectionPath}.blocks`, "Every visual concepts section requires a formula, concept map, or table block."));
      }
      if (contract.structure.preferLists && blocks.length && !blocks.some((block) => block.type === "bullet_list" || block.type === "ordered_list")) {
        warnings.push(diagnostic("KEY_POINTS_WITHOUT_LIST", `${sectionPath}.blocks`, "Key-points sections should use list blocks."));
      }
      if (contract.structure.maxParagraphWords) {
        blocks.forEach((block, blockIndex) => {
          if (block.type !== "paragraph") return;
          const paragraphWords = blockPlainText(block).split(/\s+/).filter(Boolean).length;
          if (paragraphWords > contract.structure.maxParagraphWords) {
            errors.push(diagnostic("REVISION_PARAGRAPH_TOO_LONG", `${sectionPath}.blocks[${blockIndex}]`, "Revision-sheet paragraphs must stay concise.", { words: paragraphWords, max: contract.structure.maxParagraphWords }));
          }
        });
      }
    }
  }

  const duplicateInstances = [...duplicateKeys.values()].reduce((total, count) => total + Math.max(0, count - 1), 0);
  const uniqueComparableBlocks = [...duplicateKeys.values()].reduce((total, count) => total + count, 0);
  const duplicateRatio = uniqueComparableBlocks ? duplicateInstances / uniqueComparableBlocks : 0;
  const maxDuplicateRatio = Number(options.maxDuplicateRatio ?? 0.18);
  if (duplicateRatio > maxDuplicateRatio) errors.push(diagnostic("DUPLICATE_CONTENT_RATIO", "$.sections", "Repeated block content exceeds the allowed ratio.", { duplicateRatio, maxDuplicateRatio }));

  const maxWords = Number(options.maxWords || (options.maxPages ? Number(options.maxPages) * 300 : 0));
  if (maxWords > 0 && words > maxWords) errors.push(diagnostic("SUMMARY_WORD_BUDGET_EXCEEDED", "$", "Summary exceeds the deterministic word budget.", { words, maxWords }));

  const summaryText = getSummaryDocumentText(document);
  const documentLanguage = detectSummaryLanguage(summaryText);
  if (document.languageMode === "ar" && documentLanguage === "en") errors.push(diagnostic("DOCUMENT_LANGUAGE_MISMATCH", "$.languageMode", "Arabic mode produced an English-only document."));
  if (document.languageMode === "en" && documentLanguage === "ar") errors.push(diagnostic("DOCUMENT_LANGUAGE_MISMATCH", "$.languageMode", "English mode produced an Arabic-only document."));

  return {
    valid: errors.length === 0,
    errors,
    warnings,
    metrics: {
      words,
      sections: sections.length,
      highlights,
      sectionHighlightCounts,
      duplicateRatio: Number(duplicateRatio.toFixed(4)),
      sourceRefs: Array.isArray(document.metadata?.sourceRefs) ? document.metadata.sourceRefs.length : 0,
      language: documentLanguage,
    },
  };
}

export function assertValidSummaryDocument(document, options = {}) {
  const result = validateSummaryDocument(document, options);
  if (!result.valid) {
    const error = new Error(`INVALID_SUMMARY_V3:${result.errors.map((item) => item.code).join(",")}`);
    error.validation = result;
    throw error;
  }
  return result;
}
