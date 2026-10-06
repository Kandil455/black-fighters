import {
  SUMMARY_BLOCK_ROLES,
  SUMMARY_BLOCK_TYPES,
  SUMMARY_DIRECTIONS,
  SUMMARY_LANGUAGE_MODES,
  SUMMARY_SEMANTICS,
  SUMMARY_V3_SCHEMA_VERSION,
} from "./registry.js";

/**
 * @typedef {"ar"|"en"|"bilingual"} SummaryLanguageMode
 * @typedef {"rtl"|"ltr"|"auto"} SummaryDirection
 * @typedef {"term"|"definition"|"fact"|"result"|"example"|"warning"|"formula"|"statistic"} SummarySemantic
 *
 * @typedef {Object} SummaryAnnotation
 * @property {number} start
 * @property {number} end
 * @property {SummarySemantic} semantic
 * @property {number} [importance]
 * @property {boolean} [bold]
 * @property {boolean} [highlight]
 * @property {"green"|"yellow"|"cyan"|"orange"|"red"|null} [color]
 * @property {boolean} [code]
 * @property {boolean} [italic]
 *
 * @typedef {Object} SummaryRichText
 * @property {string} text
 * @property {SummaryDirection} direction
 * @property {"ar"|"en"|"mixed"|"neutral"} language
 * @property {SummaryAnnotation[]} annotations
 *
 * @typedef {Object} SummaryBlock
 * @property {string} id
 * @property {string} type
 * @property {string} role
 * @property {SummaryDirection} direction
 * @property {SummaryRichText} [content]
 * @property {SummaryRichText[]} [items]
 * @property {{headers: SummaryRichText[], rows: SummaryRichText[][]}} [table]
 * @property {number[]} sourceRefs
 * @property {string[]} sourceFactIds
 *
 * @typedef {Object} SummarySection
 * @property {string} id
 * @property {SummaryRichText} title
 * @property {SummaryBlock[]} blocks
 * @property {number[]} sourceRefs
 * @property {string[]} sourceFactIds
 *
 * @typedef {Object} SummaryDocument
 * @property {3} schemaVersion
 * @property {string} pipelineVersion
 * @property {string} templateId
 * @property {SummaryLanguageMode} languageMode
 * @property {string} colorLevel
 * @property {SummaryRichText} title
 * @property {SummaryBlock[]} overview
 * @property {SummarySection[]} sections
 * @property {SummaryBlock[]} conclusion
 * @property {Object} metadata
 */

export const SUMMARY_V3_JSON_SCHEMA = Object.freeze({
  $id: "https://iiiak.app/schemas/summary-v3.json",
  $schema: "https://json-schema.org/draft/2020-12/schema",
  type: "object",
  required: Object.freeze([
    "schemaVersion",
    "pipelineVersion",
    "templateId",
    "languageMode",
    "colorLevel",
    "title",
    "overview",
    "sections",
    "conclusion",
    "metadata",
  ]),
  properties: Object.freeze({
    schemaVersion: Object.freeze({ const: SUMMARY_V3_SCHEMA_VERSION }),
    templateId: Object.freeze({ type: "string" }),
    languageMode: Object.freeze({ enum: SUMMARY_LANGUAGE_MODES }),
    colorLevel: Object.freeze({ enum: Object.freeze(["none", "medium", "rich"]) }),
    title: Object.freeze({ $ref: "#/$defs/richText" }),
    overview: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/block" }) }),
    sections: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/section" }) }),
    conclusion: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/block" }) }),
    metadata: Object.freeze({ type: "object" }),
  }),
  $defs: Object.freeze({
    annotation: Object.freeze({
      type: "object",
      required: Object.freeze(["start", "end", "semantic", "importance", "bold", "highlight", "color"]),
      properties: Object.freeze({
        start: Object.freeze({ type: "integer", minimum: 0 }),
        end: Object.freeze({ type: "integer", minimum: 1 }),
        semantic: Object.freeze({ enum: SUMMARY_SEMANTICS }),
        importance: Object.freeze({ type: "number", minimum: 0, maximum: 100 }),
        bold: Object.freeze({ type: "boolean" }),
        highlight: Object.freeze({ type: "boolean" }),
        color: Object.freeze({ type: ["string", "null"], enum: Object.freeze(["green", "yellow", "cyan", "orange", "red", null]) }),
        code: Object.freeze({ type: "boolean" }),
        italic: Object.freeze({ type: "boolean" }),
      }),
    }),
    richText: Object.freeze({
      type: "object",
      required: Object.freeze(["text", "direction", "language", "annotations"]),
      properties: Object.freeze({
        text: Object.freeze({ type: "string" }),
        direction: Object.freeze({ enum: SUMMARY_DIRECTIONS }),
        language: Object.freeze({ enum: Object.freeze(["ar", "en", "mixed", "neutral"]) }),
        annotations: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/annotation" }) }),
      }),
    }),
    block: Object.freeze({
      type: "object",
      required: Object.freeze(["id", "type", "role", "direction", "sourceRefs", "sourceFactIds"]),
      properties: Object.freeze({
        id: Object.freeze({ type: "string", minLength: 1 }),
        type: Object.freeze({ enum: SUMMARY_BLOCK_TYPES }),
        role: Object.freeze({ enum: SUMMARY_BLOCK_ROLES }),
        direction: Object.freeze({ enum: SUMMARY_DIRECTIONS }),
        content: Object.freeze({ $ref: "#/$defs/richText" }),
        items: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/richText" }) }),
        table: Object.freeze({
          type: "object",
          required: Object.freeze(["headers", "rows"]),
          properties: Object.freeze({
            headers: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/richText" }) }),
            rows: Object.freeze({ type: "array", items: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/richText" }) }) }),
          }),
        }),
        src: Object.freeze({ type: "string" }),
        alt: Object.freeze({ type: "string" }),
        attribution: Object.freeze({
          type: "object",
          properties: Object.freeze({
            creator: Object.freeze({ type: "string" }),
            license: Object.freeze({ type: "string" }),
            licenseUrl: Object.freeze({ type: "string" }),
            sourcePage: Object.freeze({ type: "string" }),
            provider: Object.freeze({ type: "string" }),
            approved: Object.freeze({ type: "boolean" }),
          }),
        }),
        sourceRefs: Object.freeze({ type: "array", items: Object.freeze({ type: "integer", minimum: 1 }), uniqueItems: true }),
        sourceFactIds: Object.freeze({ type: "array", items: Object.freeze({ type: "string", minLength: 1 }), uniqueItems: true }),
      }),
    }),
    section: Object.freeze({
      type: "object",
      required: Object.freeze(["id", "title", "blocks", "sourceRefs", "sourceFactIds"]),
      properties: Object.freeze({
        id: Object.freeze({ type: "string", minLength: 1 }),
        title: Object.freeze({ $ref: "#/$defs/richText" }),
        blocks: Object.freeze({ type: "array", items: Object.freeze({ $ref: "#/$defs/block" }), minItems: 1 }),
        sourceRefs: Object.freeze({ type: "array", items: Object.freeze({ type: "integer", minimum: 1 }), uniqueItems: true }),
        sourceFactIds: Object.freeze({ type: "array", items: Object.freeze({ type: "string", minLength: 1 }), uniqueItems: true }),
      }),
    }),
  }),
});

export const SUMMARY_V3_ENUMS = Object.freeze({
  languages: SUMMARY_LANGUAGE_MODES,
  directions: SUMMARY_DIRECTIONS,
  blockTypes: SUMMARY_BLOCK_TYPES,
  blockRoles: SUMMARY_BLOCK_ROLES,
  semantics: SUMMARY_SEMANTICS,
});

export function stableSummaryId(prefix, value, index = 0) {
  let hash = 2166136261;
  const input = `${prefix}:${index}:${String(value || "")}`;
  for (let cursor = 0; cursor < input.length; cursor += 1) {
    hash ^= input.charCodeAt(cursor);
    hash = Math.imul(hash, 16777619);
  }
  return `${prefix}_${(hash >>> 0).toString(36)}`;
}

export function isSummaryV3Document(value) {
  return !!value
    && typeof value === "object"
    && value.schemaVersion === SUMMARY_V3_SCHEMA_VERSION
    && typeof value.templateId === "string"
    && SUMMARY_LANGUAGE_MODES.includes(value.languageMode)
    && Array.isArray(value.sections);
}
