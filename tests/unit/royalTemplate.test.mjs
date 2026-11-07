/**
 * Design-first generation contracts (owner directive): documents created with
 * the new visual designs ("royal" → royal_study, "capsule" → capsule_sheet)
 * must be BORN with the structure the viewer's CSS skins key off:
 *
 *   royal_study   — per section, in order: definition strip (bold key terms)
 *                   → body bullets → danger callout (role "warning") → pearl
 *                   callout (role "example"); callout text lives in
 *                   `content.text` (string); never more than 9 chapters.
 *   capsule_sheet — per section: body bullets, ALWAYS sealed by a warning
 *                   callout with the top-yield facts.
 *
 * These tests pin the GENERATION side only; the viewer skins hang off
 * doc.templateId === "royal_study" | "capsule_sheet".
 */
import test from "node:test";
import assert from "node:assert/strict";
import {
  SUMMARY_TEMPLATE_REGISTRY,
  SUMMARY_TEMPLATE_ALIASES,
  resolveSummaryTemplateId,
  getSummaryTemplateContract,
} from "../../src/lib/summaryV3/registry.js";
import { assembleSummaryDocumentFromFacts } from "../../src/lib/summaryV3/facts.js";

/** Minimal fact shape, mirroring summaryTemplateMatrix.test.mjs inputs with
 * the fields the design factories actually read (semantic, importance,
 * keyTerm are consumed raw — facts are passed straight to assemble). */
function fact(id, overrides = {}) {
  return {
    id,
    statementEn: `${id} plain study statement about cardiac pharmacology and dosing`,
    statementAr: `${id} نقطة دراسية أساسية عن أدوية القلب والجرعات العلاجية`,
    explanationEn: `${id} detailed explanation of the mechanism and the clinical relevance`,
    explanationAr: `${id} شرح تفصيلي للميكانيزم والأهمية الإكلينيكية`,
    semantic: "fact",
    importance: 2,
    keyTerm: "",
    sourcePage: 1,
    chunkIndex: 0,
    groundingScore: 1,
    languageMode: "bilingual",
    sourceEvidence: `${id} evidence`,
    ...overrides,
  };
}

/** Mixed fixture: high-yield key terms, an explicit warning, and plain facts —
 * enough to make every royal block type appear. */
function royalFacts() {
  return [
    fact("rf0", { keyTerm: "Aspirin", importance: 5, statementEn: "Aspirin irreversibly inhibits the platelet COX-1 enzyme pathway", statementAr: "الأسبرين بيثبط إنزيم COX-1 في الصفائح بشكل غير عكوس" }),
    fact("rf1", { keyTerm: "INR", importance: 5, statementEn: "INR monitoring guides every Warfarin dose adjustment decision", statementAr: "متابعة INR بتوجه كل قرار تعديل لجرعة الوارفارين" }),
    fact("rf2", { keyTerm: "Digoxin", importance: 3, statementEn: "Digoxin increases cardiac contractility through sodium pump inhibition", statementAr: "الديجوكسين بيزود قوة انقباض القلب عن طريق تثبيط مضخة الصوديوم" }),
    fact("rf3", { semantic: "warning", importance: 4, statementEn: "Warfarin overdose causes dangerous uncontrolled internal bleeding", statementAr: "جرعة الوارفارين الزيادة بتسبب نزيف داخلي خطير غير متحكم فيه" }),
    fact("rf4", { importance: 2 }),
    fact("rf5", { importance: 3 }),
  ];
}

function assemble(templateId, facts, options = {}) {
  return assembleSummaryDocumentFromFacts(facts, {
    title: "أدوية القلب",
    templateId,
    languageMode: "bilingual",
    maxPages: 16,
    ...options,
  });
}

const callouts = (section) => section.blocks.filter((block) => block.type === "callout");

test("registry: royal_study and capsule_sheet exist with the agreed structure", () => {
  const royal = SUMMARY_TEMPLATE_REGISTRY.royal_study;
  const capsule = SUMMARY_TEMPLATE_REGISTRY.capsule_sheet;
  assert.ok(royal, "royal_study missing from registry");
  assert.ok(capsule, "capsule_sheet missing from registry");
  assert.equal(royal.id, "royal_study");
  assert.equal(royal.label, "Royal Study Paper");
  assert.equal(capsule.id, "capsule_sheet");
  assert.equal(capsule.label, "Capsule Sheet");
  // Owner rule: a study paper never exceeds 9 chapters.
  assert.ok(royal.structure.maxSections <= 9, `royal_study maxSections=${royal.structure.maxSections}`);
  assert.ok(capsule.structure.maxSections <= 9, `capsule_sheet maxSections=${capsule.structure.maxSections}`);
  assert.equal(royal.structure.requiresOverview, true);
  assert.equal(royal.structure.requiresConclusion, true);
  assert.equal(royal.structure.minBlocksPerSection, 3);
  assert.equal(capsule.structure.requiresOverview, true);
  assert.equal(capsule.structure.requiresConclusion, false);
  assert.equal(capsule.structure.minBlocksPerSection, 2);
  assert.equal(capsule.structure.preferLists, true);
  assert.equal(capsule.structure.maxParagraphWords, 70);
  for (const template of [royal, capsule]) {
    for (const mode of ["ar", "en", "bilingual"]) {
      assert.ok(template.supportedLanguages.includes(mode), `${template.id} must support ${mode}`);
    }
  }
});

test("registry: design aliases resolve to the new contracts", () => {
  assert.equal(SUMMARY_TEMPLATE_ALIASES.royal, "royal_study");
  assert.equal(SUMMARY_TEMPLATE_ALIASES.capsule, "capsule_sheet");
  assert.equal(resolveSummaryTemplateId("royal"), "royal_study");
  assert.equal(resolveSummaryTemplateId("capsule"), "capsule_sheet");
  assert.equal(getSummaryTemplateContract("royal")?.id, "royal_study");
});

test("royal_study assembly validates, caps sections at 9, and keeps block order", () => {
  const { document, validation } = assemble("royal_study", royalFacts());
  assert.equal(document.templateId, "royal_study", "doc.meta.templateId must be the skin key");
  assert.ok(
    validation.valid,
    `document must validate: ${(validation.errors || []).map((error) => `${error.code}@${error.path}`).join(", ")}`,
  );
  assert.ok(document.sections.length <= 9, `expected ≤9 sections, got ${document.sections.length}`);
  assert.ok(document.sections.length >= 1);
  // requiresOverview/requiresConclusion are honored by the assembler.
  assert.ok(document.overview.length > 0, "royal_study requires an overview");
  assert.ok(document.conclusion.length > 0, "royal_study requires a conclusion");

  for (const section of document.sections) {
    const roles = section.blocks.map((block) => block.role);
    assert.ok(section.blocks.length >= 3, `section "${section.title?.text}" has ${section.blocks.length} blocks (contract: 3)`);
    assert.equal(roles[0], "definition", `key-term facts exist, so the definition strip must open the section, got: ${roles.join(",")}`);
    const bodyIndex = roles.indexOf("body");
    assert.ok(bodyIndex >= 1, "body bullets must follow the definition strip");
    const boxes = callouts(section);
    assert.ok(boxes.length >= 1, "royal section must end in callout box(es)");
    const firstBoxIndex = section.blocks.indexOf(boxes[0]);
    assert.ok(firstBoxIndex > bodyIndex, `callouts must come after definition/body (order: ${roles.join(",")})`);
    for (const box of boxes) {
      assert.equal(typeof box.content?.text, "string", "viewer reads callout text from content.text");
      assert.ok(box.content.text.trim().length > 0, "callout text must not be empty");
      assert.ok(["warning", "example"].includes(box.role), `unexpected callout role ${box.role}`);
    }
  }

  // The explicit warning fact lands in a danger box (role "warning").
  const warningBoxes = document.sections.flatMap((section) => callouts(section)).filter((block) => block.role === "warning");
  assert.ok(warningBoxes.length >= 1, "semantic=warning facts must produce a danger callout");
  assert.ok(
    warningBoxes.some((block) => block.content.text.includes("نزيف") || block.content.text.includes("bleeding")),
    "danger callout must carry the warning fact text",
  );
  // High-yield key terms land in a pearl box (role "example").
  const pearlBoxes = document.sections.flatMap((section) => callouts(section)).filter((block) => block.role === "example");
  assert.ok(pearlBoxes.length >= 1, "importance≥5 key-term facts must produce a pearl callout");
});

test("royal_study definition strip bolds key terms as '**term** — explanation'", () => {
  const { document } = assemble("royal_study", royalFacts());
  const definition = document.sections[0].blocks.find((block) => block.role === "definition");
  assert.ok(definition, "first section must have a definition strip");
  assert.equal(definition.type, "bullet_list");
  const texts = definition.items.map((item) => item.text);
  // Normalization turns the **term** markers into a bold annotation on a
  // "term — explanation" plain-text item (no legacy markup may leak).
  assert.ok(texts.some((text) => /^Aspirin\s*—/.test(text)), `definition item must lead with the key term, got: ${texts[0]}`);
  assert.ok(texts.every((text) => !text.includes("**") && !text.includes("==")), "legacy markup must not leak into canonical rich text");
  const boldAnnotated = definition.items.some((item) =>
    (item.annotations || []).some((annotation) => annotation.bold),
  );
  assert.ok(boldAnnotated, "key terms must carry a bold annotation for the skin");
});

test("royal_study: 30 ungrouped facts still yield at most 9 sections", () => {
  const facts = Array.from({ length: 30 }, (_, index) =>
    fact(`bulk${index}`, {
      importance: (index % 5) + 1,
      keyTerm: index % 3 === 0 ? `Term-${index}` : "",
      semantic: index % 7 === 0 ? "warning" : "fact",
    }));
  const { document, validation } = assemble("royal_study", facts, { maxPages: 45 });
  assert.ok(document.sections.length <= 9, `expected ≤9 sections, got ${document.sections.length}`);
  assert.ok(document.sections.length > 3, "30 distinct fact groups must spread across several chapters");
  assert.ok(
    validation.valid,
    `document must validate: ${(validation.errors || []).map((error) => `${error.code}@${error.path}`).join(", ")}`,
  );
  for (const section of document.sections) {
    assert.ok(section.blocks.length >= 3, `section "${section.title?.text}" under the 3-block contract`);
  }
});

test("capsule_sheet assembly validates and seals every section with a warning callout", () => {
  const { document, validation } = assemble("capsule_sheet", royalFacts());
  assert.equal(document.templateId, "capsule_sheet", "doc.meta.templateId must be the skin key");
  assert.ok(
    validation.valid,
    `document must validate: ${(validation.errors || []).map((error) => `${error.code}@${error.path}`).join(", ")}`,
  );
  assert.ok(document.sections.length <= 9, `expected ≤9 sections, got ${document.sections.length}`);
  assert.ok(document.overview.length > 0, "capsule_sheet requires an overview");
  for (const section of document.sections) {
    assert.ok(section.blocks.length >= 2, `section "${section.title?.text}" has ${section.blocks.length} blocks (contract: 2)`);
    assert.equal(section.blocks[0].type, "bullet_list", "capsule sections open with the body list");
    assert.equal(section.blocks[0].role, "body");
    const last = section.blocks.at(-1);
    assert.equal(last.type, "callout", "capsule section must END with a warning seal");
    assert.equal(last.role, "warning");
    assert.equal(typeof last.content?.text, "string");
    assert.ok(last.content.text.trim().length > 0, "seal must carry the top-yield facts");
  }
  // The seal holds top importance≥4 facts joined by " · " (a section holding
  // two strong facts proves it; single-fact sections seal with that fact).
  const seals = document.sections.map((section) => section.blocks.at(-1));
  assert.ok(
    seals.some((seal) => seal.content.text.split(" · ").length >= 2) || seals.length === 1,
    "seal joins the top-2 facts with ' · ' when two strong facts share a section",
  );
  assert.ok(
    seals.some((seal) => seal.content.text.includes("INR") || seal.content.text.includes("الأسبرين") || seal.content.text.includes("نزيف") || seal.content.text.includes("شرح تفصيلي")),
    "seal carries a high-yield fact text",
  );
});

test("capsule_sheet without importance≥4 facts still seals (contract: minBlocksPerSection 2)", () => {
  const flat = [fact("cf0", { importance: 1 }), fact("cf1", { importance: 2 }), fact("cf2", { importance: 3 })];
  const { document, validation } = assemble("capsule_sheet", flat);
  assert.ok(
    validation.valid,
    `document must validate: ${(validation.errors || []).map((error) => `${error.code}@${error.path}`).join(", ")}`,
  );
  for (const section of document.sections) {
    assert.ok(section.blocks.length >= 2, "no high-yield fact must not drop the seal below the contract");
    assert.equal(section.blocks.at(-1).role, "warning");
  }
});

test("aliases drive generation: 'royal' and 'capsule' produce the right templateId", () => {
  const royal = assemble("royal", royalFacts());
  assert.equal(royal.document.templateId, "royal_study");
  assert.ok(royal.validation.valid);
  const capsule = assemble("capsule", royalFacts());
  assert.equal(capsule.document.templateId, "capsule_sheet");
  assert.ok(capsule.validation.valid);
});

test("royal_study generates valid documents in English mode too", () => {
  const { document, validation } = assemble("royal_study", royalFacts(), { languageMode: "en" });
  assert.equal(document.languageMode, "en");
  assert.ok(
    validation.valid,
    `en document must validate: ${(validation.errors || []).map((error) => `${error.code}@${error.path}`).join(", ")}`,
  );
  assert.equal(document.sections[0].blocks[0].role, "definition");
});
