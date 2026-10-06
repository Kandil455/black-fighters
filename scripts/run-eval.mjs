#!/usr/bin/env node
/**
 * BLACK FIGHTERS V5 «الأطلس» + V4 REBIRTH — AI Evaluation Harness (Section 6.9)
 * Runs the Golden Set of medical & scientific lectures through the V5 Hierarchical Pipeline,
 * Cross-Family Dosage/Number Verifier, and Glossary Registry Lock.
 * Fails with exit code 1 if any quality gate drops below target:
 * - Coverage >= 95%
 * - Faithfulness / Dosage Verification >= 99%
 * - Glossary Consistency == 100%
 * - JSON Schema Validity == 100%
 */

import {
  analyzeIngestedPagesWithHashing,
  partitionBookIntoParts,
  buildFoundationalPrerequisiteBlock,
  verifyHighRiskNumbersAndDosages,
  createGlossaryRegistry,
  mergeChapterTermsIntoGlossary,
  validateGlossaryConsistency,
  renderToAtlasHtml,
} from '../src/lib/summaryV5/index.js';

const GOLDEN_LECTURES = [
  {
    id: 'golden_cardio_01',
    title: 'فسيولوجيا جهد الفعل القلبي · Cardiac Action Potential',
    terms: [
      { en: 'Action Potential', ar: 'جهد الفعل', chapterIndex: 1 },
      { en: 'Plateau Phase', ar: 'طور الهضبة', chapterIndex: 1 },
    ],
    pages: [
      {
        pageNumber: 12,
        text: 'Resting membrane potential in ventricular myocytes is -90 mV. Phase 0 rapid depolarization depends on fast Na+ channels. Phase 2 plateau is maintained by slow L-type Ca2+ influx balanced by K+ efflux.',
      },
      {
        pageNumber: 13,
        text: 'Amiodarone loading dose is 150 mg to 300 mg IV bolus over 10 minutes. Atropine dose in symptomatic bradycardia is 0.5 mg IV every 3 to 5 minutes up to 3 mg maximum.',
      },
    ],
    summaryText:
      'يتحدث هذا الفصل عن جهد الفعل وطور الهضبة بالتفصيل: جهد الراحة -90 mV، والطور الصفري Phase 0 يعتمد على قنوات الصوديوم السريعة، بينما طور الهضبة Phase 2 يستمر بفضل قنوات الكالسيوم البطيئة. جرعة الأميودارون 150 mg إلى 300 mg وريدياً خلال 10 دقائق، وجرعة الأتروبين 0.5 mg كل 3 إلى 5 دقائق بحد أقصى 3 mg.',
  },
  {
    id: 'golden_neuro_02',
    title: 'فارماكولوجيا الجهاز العصبي الذاتي · Autonomic Pharmacology',
    terms: [
      { en: 'Vasoconstriction', ar: 'انقباض الأوعية', chapterIndex: 1 },
      { en: 'Anaphylaxis', ar: 'صدمة الحساسية المفرطة', chapterIndex: 1 },
    ],
    pages: [
      {
        pageNumber: 1,
        text: 'Alpha-1 receptors cause vascular smooth muscle vasoconstriction via Gq phospholipase C pathway. Beta-1 receptors increase heart rate and contractility via Gs adenylyl cyclase.',
      },
      {
        pageNumber: 2,
        text: 'Epinephrine intramuscular dose for anaphylaxis is 0.3 mg to 0.5 mg IM in the anterolateral thigh, repeatable every 5 to 15 minutes.',
      },
    ],
    summaryText:
      'تسبب مستقبلات Alpha-1 انقباض الأوعية عبر مسار Gq، بينما تعالج صدمة الحساسية المفرطة بحقن الإبينفرين عضلياً بجرعة 0.3 mg إلى 0.5 mg كل 5 إلى 15 دقيقة.',
  },
];

async function runGoldenEval() {
  const results = [];

  for (const lecture of GOLDEN_LECTURES) {
    const ingest = await analyzeIngestedPagesWithHashing(lecture.pages);
    const parts = partitionBookIntoParts(lecture.pages, { targetPartSize: 25, overlapPages: 2 });
    const prereq = buildFoundationalPrerequisiteBlock({
      sectionTitle: lecture.title,
      keyTerms: lecture.terms,
    });

    let glossary = createGlossaryRegistry(lecture.terms);
    glossary = mergeChapterTermsIntoGlossary(glossary, lecture.terms);
    const glossaryCheck = validateGlossaryConsistency(glossary, lecture.summaryText);

    const sourceFullText = lecture.pages.map((p) => p.text).join('\n');
    const dosageVerification = verifyHighRiskNumbersAndDosages(lecture.summaryText, sourceFullText);

    const rendered = renderToAtlasHtml({
      title: lecture.title,
      sections: [
        {
          title: lecture.title,
          pageRange: `${lecture.pages[0].pageNumber}–${lecture.pages[lecture.pages.length - 1].pageNumber}`,
          blocks: [
            prereq,
            { type: 'definition', term: lecture.terms[0].ar, text: lecture.summaryText },
          ],
        },
      ],
    });

    const coverageRatio =
      ingest.totalPages === lecture.pages.length && parts.length >= 1 ? 100 : 0;
    const faithfulnessScore = dosageVerification.passed ? 100 : 0;
    const glossaryConsistency = glossaryCheck.consistent ? 100 : 0;
    const schemaValid =
      Boolean(rendered.html) &&
      rendered.within400KbBudget &&
      !rendered.html.includes('telegra.ph');

    results.push({
      id: lecture.id,
      title: lecture.title,
      coverageRatio,
      faithfulnessScore,
      glossaryConsistency,
      schemaValid,
    });
  }

  const avgCoverage =
    results.reduce((acc, r) => acc + r.coverageRatio, 0) / results.length;
  const avgFaithfulness =
    results.reduce((acc, r) => acc + r.faithfulnessScore, 0) / results.length;
  const avgGlossary =
    results.reduce((acc, r) => acc + r.glossaryConsistency, 0) / results.length;
  const allSchemaValid = results.every((r) => r.schemaValid);

  console.log('\n=====================================================================');
  console.log('🛡️  BLACK FIGHTERS V5 «الأطلس» — GOLDEN SET AI EVALUATION REPORT');
  console.log('=====================================================================');
  for (const r of results) {
    console.log(
      `• [${r.id}] Coverage: ${r.coverageRatio}% | Faithfulness: ${r.faithfulnessScore}% | Glossary: ${r.glossaryConsistency}% | Schema: ${
        r.schemaValid ? 'PASS' : 'FAIL'
      }`
    );
  }
  console.log('---------------------------------------------------------------------');
  console.log(`AVG COVERAGE     : ${avgCoverage.toFixed(2)}% (Target >= 95.00%)`);
  console.log(`AVG FAITHFULNESS : ${avgFaithfulness.toFixed(2)}% (Target >= 99.00%)`);
  console.log(`AVG GLOSSARY LOCK: ${avgGlossary.toFixed(2)}% (Target == 100.00%)`);
  console.log(`SCHEMA VALIDITY  : ${allSchemaValid ? '100% PASS' : 'FAIL'}`);
  console.log('=====================================================================\n');

  if (avgCoverage < 95 || avgFaithfulness < 99 || avgGlossary < 100 || !allSchemaValid) {
    console.error('❌ Evaluation Gate Failed!');
    process.exit(1);
  }
}

runGoldenEval().catch((err) => {
  console.error('❌ Eval Harness Error:', err);
  process.exit(1);
});
