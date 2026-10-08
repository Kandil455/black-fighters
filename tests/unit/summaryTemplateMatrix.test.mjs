/**
 * Template × language matrix.
 *
 * THIS TEST EXISTS BECAUSE OF A REAL OUTAGE. A template ("foundational_bilingual")
 * was pinned to `supportedLanguages: ["bilingual"]` while the create dialog offers
 * this template with every language, and its block builder hardcoded Arabic text
 * regardless of the chosen mode. Picking English therefore produced an
 * Arabic-language document, the validator rejected it, and the user saw:
 *
 *     SUMMARY_V3_VALIDATION_FAILED:DOCUMENT_LANGUAGE_MISMATCH
 *
 * …i.e. the summary simply refused to generate. The matrix below (every template ×
 * every language mode the UI can select) is the guard that was missing.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { SUMMARY_TEMPLATE_REGISTRY, SUMMARY_TEMPLATE_ALIASES, isTemplateLanguageCompatible } from "../../src/lib/summaryV3/registry.js";
import { assembleSummaryDocumentFromFacts } from "../../src/lib/summaryV3/facts.js";

const LANGUAGES = ["ar", "en", "bilingual"];

function sampleFacts(count = 14) {
  return Array.from({ length: count }, (_, i) => ({
    id: `f${i}`,
    statementEn: `Cardiac mechanism ${i + 1} explains excitation-contraction coupling`,
    statementAr: `آلية رقم ${i + 1} بتنظم الانقباض والارتخاء في عضلة القلب`,
    explanationEn: `Because gating changes at step ${i + 1}, the cell responds and the plateau shifts`,
    explanationAr: `لأن البوابة بتتغير في الخطوة رقم ${i + 1} الخلية بتستجيب وبتتأثر الهضبة`,
    keyTerm: `Term-${i + 1}`,
    semanticType: "fact",
    importance: (i % 5) + 1,
    chunkIndex: Math.floor(i / 4),
    sourceHeading: `Heading ${Math.floor(i / 4)}`,
    sourcePage: i + 1,
    sourceRefs: [i + 1],
    sourceFactIds: [`f${i}`],
  }));
}

test("every registered template declares the languages it supports", () => {
  for (const [id, contract] of Object.entries(SUMMARY_TEMPLATE_REGISTRY)) {
    assert.ok(Array.isArray(contract.supportedLanguages) && contract.supportedLanguages.length > 0, `${id} declares no languages`);
    for (const lang of contract.supportedLanguages) {
      assert.ok(LANGUAGES.includes(lang), `${id} claims to support an unknown language "${lang}"`);
    }
  }
});

test("every template generates a VALID document in every language the UI offers", () => {
  const failures = [];
  for (const id of Object.keys(SUMMARY_TEMPLATE_REGISTRY)) {
    for (const languageMode of LANGUAGES) {
      // The dialog can pick any template with any language, so the contract must
      // either support it or the builder must still produce a valid document.
      let result;
      try {
        result = assembleSummaryDocumentFromFacts(sampleFacts(), {
          title: "اختبار",
          templateId: id,
          languageMode,
          maxPages: 8,
        });
      } catch (error) {
        failures.push(`${id} + ${languageMode}: THREW ${error.message}`);
        continue;
      }
      const errors = (result.validation?.errors || []).map((e) => e.code);
      if (!result.validation?.valid) {
        failures.push(`${id} + ${languageMode}: ${errors.join(", ")}`);
      }
    }
  }
  assert.deepEqual(
    failures,
    [],
    "a template/language combination the UI allows does not produce a valid summary — students see " +
      "SUMMARY_V3_VALIDATION_FAILED and no summary at all",
  );
});

test("a language-restricted template is reported as unsupported, never silently mis-generated", () => {
  for (const [id, contract] of Object.entries(SUMMARY_TEMPLATE_REGISTRY)) {
    for (const languageMode of LANGUAGES) {
      if (contract.supportedLanguages.includes(languageMode)) continue;
      assert.equal(
        isTemplateLanguageCompatible(id, languageMode),
        false,
        `${id} must report ${languageMode} as unsupported`,
      );
    }
  }
});

test("the templates the create dialog defaults to are usable in Arabic and English", () => {
  // These two are the dialog's default and its "fast"/"deep" toggles.
  for (const id of ["foundational_bilingual", "atlas_cram"]) {
    for (const languageMode of ["ar", "en", "bilingual"]) {
      assert.ok(
        isTemplateLanguageCompatible(id, languageMode),
        `${id} cannot be used in ${languageMode} although the dialog offers it — this is exactly the ` +
          "SUMMARY_V3_VALIDATION_FAILED:DOCUMENT_LANGUAGE_MISMATCH combination that broke generation",
      );
    }
  }
});

test("every alias still resolves to a registered template", () => {
  for (const [alias, target] of Object.entries(SUMMARY_TEMPLATE_ALIASES)) {
    assert.ok(SUMMARY_TEMPLATE_REGISTRY[target], `alias "${alias}" points at unregistered "${target}"`);
  }
});
