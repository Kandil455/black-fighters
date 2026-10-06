import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import {
  ATLAS_DURATION,
  canTriggerSessionStamp,
  consumeSessionStamp,
  resetSessionStampForTests,
} from '../../src/design/atlasMotion.js';

import {
  normalizeArabicForSearch,
  buildNormalizedBookSearchIndex,
  searchNormalizedBookIndex,
  createGlossaryRegistry,
  mergeChapterTermsIntoGlossary,
  applyStudentCorrection,
  validateGlossaryConsistency,
  assertCrossFamilyVerifier,
  verifyHighRiskNumbersAndDosages,
  analyzeIngestedPagesWithHashing,
  partitionBookIntoParts,
  buildGlobalOutline,
  buildFoundationalPrerequisiteBlock,
  reduceToGlobalCheatSheet,
  retryFailedChapterPart,
  estimateDocumentJob,
  escapeHtml,
  renderToAtlasHtml,
  buildExportPackagePlan,
  verifySynthetic1000PagePdf,
  createReviewItem,
  scheduleFsrsReview,
  FSRS_RATINGS,
  buildTerritoryMapState,
  generateDailyOrderSheet,
  calculateDocumentCreditCost,
  PageCreditLedger,
  scrubPiiBeforeAiCall,
  selectCrossFamilyVerifierModel,
} from '../../src/lib/summaryV5/index.js';

import {
  dedupeTelegramUpdateId,
  verifyTelegramMiniAppInitData,
  createSignedTelegramInitData,
  validateStartAppPayload,
  parseStartAppCommand,
  ProgressMessageTracker,
  NotificationBudgetManager,
  TelegramOutbox,
  assertNoPublicTelegraphLeak,
  buildPrivateLectureDeliveryPayload,
  verifyLinkedGroupMember,
} from '../../netlify/functions/_shared/telegram-v5.mjs';

const ROOT = process.cwd();

test('V5 Part 1: Atlas design tokens, 5 reader themes, print sheet, and 3 static prototypes exist', () => {
  const css = fs.readFileSync(path.join(ROOT, 'src/design/atlas-tokens.css'), 'utf8');
  assert.match(css, /:root\[data-theme=['"]plate['"]\]/);
  assert.match(css, /--paper:\s*#ECE7DC/i);
  assert.match(css, /--stamp:\s*#B8121F/i);
  assert.match(css, /:root\[data-theme=['"]night['"]\]/);
  assert.match(css, /--paper:\s*#0C0C0D/i);
  assert.match(css, /--stamp:\s*#FF3B4E/i);
  assert.match(css, /:root\[data-theme=['"]focus['"]\]/);
  assert.match(css, /:root\[data-theme=['"]cram['"]\]/);
  assert.match(css, /@media print/);
  assert.match(css, /\.atlas-declassify/);
  assert.match(css, /\.atlas-plate/);

  const prototypes = [
    'public/atlas-prototypes/plate-summary.html',
    'public/atlas-prototypes/declassify-mode.html',
    'public/atlas-prototypes/territory-landing.html',
  ];
  for (const rel of prototypes) {
    const full = path.join(ROOT, rel);
    assert.ok(fs.existsSync(full), `Missing static prototype: ${rel}`);
    const html = fs.readFileSync(full, 'utf8');
    assert.ok(html.length > 1500, `Prototype ${rel} looks incomplete`);
  }
});

test('V5 Part 1.7: Motion system durations and session stamp limiter', () => {
  assert.equal(ATLAS_DURATION.enter, 0.16);
  assert.equal(ATLAS_DURATION.exit, 0.12);
  assert.equal(ATLAS_DURATION.stamp, 0.18);

  resetSessionStampForTests();
  assert.equal(canTriggerSessionStamp(), true);
  assert.equal(consumeSessionStamp(), true);
  assert.equal(canTriggerSessionStamp(), false);
  assert.equal(consumeSessionStamp(), false);
  resetSessionStampForTests();
});

test('V5 Part 2.8: Mandatory Arabic normalization & full-book search index', () => {
  const raw = 'الإلكتروليتاتُ والأحماضُ في الخليّةِ القلبيّةِ ١٢٠ ملغ';
  const norm = normalizeArabicForSearch(raw);
  assert.equal(norm, 'الالكتروليتات والاحماض في الخليه القلبيه 120 ملغ');

  const index = buildNormalizedBookSearchIndex([
    { chapterIndex: 1, pageNumber: 12, text: 'طور الهضبة يعتمد على قنوات الكالسيوم البطيئة في البطين.' },
    { chapterIndex: 2, pageNumber: 45, text: 'الأميودارون يطيل فترة العصيان الفعالة بجرعة ١٥٠ ملغ.' },
  ]);

  const hits1 = searchNormalizedBookIndex(index, 'الهضبه');
  assert.equal(hits1.length, 1);
  assert.equal(hits1[0].pageNumber, 12);

  const hits2 = searchNormalizedBookIndex(index, 'الاميودارون 150');
  assert.equal(hits2.length, 1);
  assert.equal(hits2[0].pageNumber, 45);
});

test('V5 Part 2.3: Global Glossary Registry & Student Correction propagation', () => {
  let reg = createGlossaryRegistry([
    { en: 'Action Potential', ar: 'جهد الفعل', chapterIndex: 1 },
  ]);
  reg = mergeChapterTermsIntoGlossary(reg, [
    { en: 'Action Potential', ar: 'كامن العمل', chapterIndex: 2 }, // Should NOT override locked chapter 1 term
    { en: 'Refractory Period', ar: 'فترة العصيان', chapterIndex: 2 },
  ]);

  assert.equal(reg.byEn.get('action potential').ar, 'جهد الفعل');
  assert.equal(reg.byEn.get('refractory period').ar, 'فترة العصيان');

  // Student overrides translation globally
  reg = applyStudentCorrection(reg, 'Action Potential', 'جهد الفعل القلبي');
  assert.equal(reg.byEn.get('action potential').ar, 'جهد الفعل القلبي');
  assert.equal(reg.byEn.get('action potential').studentLocked, true);

  const consistency = validateGlossaryConsistency(
    reg,
    'يتحدث هذا الفصل عن جهد الفعل القلبي بالتفصيل ويشرح فترة العصيان.'
  );
  assert.equal(consistency.consistent, true);
});

test('V5 Part 2.6: Cross-Family Verifier rejects same-family models and catches hallucinated dosages', () => {
  const sameFamily = assertCrossFamilyVerifier('gemini-2.5-pro', 'gemini-2.5-flash');
  assert.equal(sameFamily.valid, false);

  const crossFamily = assertCrossFamilyVerifier('gemini-2.5-pro', 'gpt-4o-mini');
  assert.equal(crossFamily.valid, true);

  const sourceText = 'Give Amiodarone 150 mg IV over 10 minutes. Normal potassium is 3.5 to 5.0 mmol/L.';
  const validSummary = 'يُعطى عقار الأميودارون بجرعة 150 mg وريدياً خلال 10 دقائق، ومستوى البوتاسيوم 3.5 إلى 5.0 mmol/L.';
  const hallucinatedSummary = 'يُعطى عقار الأميودارون بجرعة 950 mg وريدياً.';

  const checkOk = verifyHighRiskNumbersAndDosages(validSummary, sourceText);
  assert.equal(checkOk.passed, true);

  const checkBad = verifyHighRiskNumbersAndDosages(hallucinatedSummary, sourceText);
  assert.equal(checkBad.passed, false);
  assert.ok(checkBad.unverifiedNumbers.includes('950'));
});

test('V5 Part 2.1–2.7: 1000-page Hierarchical Pipeline, SHA-256 dedupe, 25–40p parts with 2p overlap, and isolated retry', async () => {
  const pages = Array.from({ length: 1000 }, (_, i) => ({
    pageNumber: i + 1,
    text: i === 50 ? 'Duplicate page text content for hashing test purposes' : `Page ${i + 1} clinical content with enough characters to be classified as text layer without OCR needed.`,
  }));
  pages[51].text = pages[50].text; // Exact duplicate page

  const ingest = await analyzeIngestedPagesWithHashing(pages);
  assert.equal(ingest.totalPages, 1000);
  assert.ok(ingest.duplicatePageCount >= 1);

  const parts = partitionBookIntoParts(pages, { targetPartSize: 35, overlapPages: 2 });
  assert.ok(parts.length >= 25 && parts.length <= 40);
  assert.equal(parts[0].startPage, 1);
  assert.equal(parts[1].startPage, parts[0].endPage - 2 + 1); // 2-page overlap

  const outline = buildGlobalOutline(parts, 'مرجع الباطنة والجراحة');
  assert.equal(outline.totalChapters, parts.length);

  const prereq = buildFoundationalPrerequisiteBlock({
    sectionTitle: 'الفصل الأول: فسيولوجيا القلب',
    keyTerms: [{ en: 'Preload', ar: 'الحمل القبلي' }],
  });
  assert.equal(prereq.type, 'prerequisite_bridge');
  assert.match(prereq.headingAr, /قبل ما تقرا/);

  const cheatSheet = reduceToGlobalCheatSheet([
    {
      chapterIndex: 1,
      title: 'الفصل الأول',
      highYieldPoints: ['Phase 0 depends on Fast Na+ channels'],
      dosagesAndNumbers: ['Amiodarone 150 mg IV'],
    },
  ]);
  assert.equal(cheatSheet.totalChaptersCovered, 1);

  // Isolated retry of a single failed chapter
  const jobState = {
    docId: 'book_1000',
    parts: [
      { partIndex: 1, status: 'completed', result: { title: 'Ch 1' } },
      { partIndex: 2, status: 'failed', error: 'RATE_LIMIT' },
      { partIndex: 3, status: 'completed', result: { title: 'Ch 3' } },
    ],
  };
  let retriedCount = 0;
  const updatedState = await retryFailedChapterPart(jobState, 2, async (part) => {
    retriedCount += 1;
    return { title: `Recovered Ch ${part.partIndex}` };
  });
  assert.equal(retriedCount, 1);
  assert.equal(updatedState.parts[1].status, 'completed');
  assert.equal(updatedState.parts[0].result.title, 'Ch 1');
});

test('V5 Part 3: XSS-safe Standalone HTML Exporter & Multi-Chapter ZIP Plan + 1000-Page PDF Factory', async () => {
  const malicious = '<script>alert("xss")</script>';
  assert.equal(escapeHtml(malicious), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');

  const safeRendered = renderToAtlasHtml({
    title: 'محاضرة <script>1</script>',
    sections: [
      {
        title: 'قسم 1',
        blocks: [{ type: 'definition', term: 'تعريف', text: 'قنوات <img src=x onerror=alert(1)> Na+' }],
      },
    ],
  });
  assert.ok(!safeRendered.html.includes('<script>1</script>'));
  assert.ok(!safeRendered.html.includes('<img src=x'));
  assert.equal(safeRendered.within400KbBudget, true);

  const smallPlan = buildExportPackagePlan({
    docId: 'small_doc',
    title: 'محاضرة قصيرة',
    totalPages: 40,
    chapters: [{ chapterIndex: 1, title: 'فصل 1', blocks: [] }],
  });
  assert.equal(smallPlan.mode, 'single-html');

  const largePlan = buildExportPackagePlan({
    docId: 'big_book',
    title: 'مرجع 500 صفحة',
    totalPages: 500,
    chapters: [
      { chapterIndex: 1, title: 'فصل 1', blocks: [] },
      { chapterIndex: 2, title: 'فصل 2', blocks: [] },
    ],
  });
  assert.equal(largePlan.mode, 'multi-chapter-zip');
  assert.ok(largePlan.files.some((f) => f.path === 'manifest.json'));
  assert.ok(largePlan.files.some((f) => f.path === 'chapters/01.html'));

  const pdfVerification = await verifySynthetic1000PagePdf();
  assert.equal(pdfVerification.totalPages, 1000);
  assert.equal(pdfVerification.numberingContinuous, true);
  assert.equal(pdfVerification.tocAccurate, true);
  assert.equal(pdfVerification.onlyFailedChapterRetried, true);
  assert.equal(pdfVerification.within120MbBudget, true);
});

test('V5 Part 4: Telegram Engine V5 (update_id dedupe, initData HMAC, startapp, 3s progress throttle, notification budget, outbox DLQ, privacy guard)', async () => {
  // 1. Webhook update_id dedupe
  const first = await dedupeTelegramUpdateId(9001001);
  const second = await dedupeTelegramUpdateId(9001001);
  assert.equal(first.duplicate, false);
  assert.equal(second.duplicate, true);

  // 2. Mini App initData HMAC-SHA256 verification
  const botToken = '123456789:AAExampleBotTokenForV5VerificationTest';
  const nowSec = 1_750_000_000;
  const signedInitData = createSignedTelegramInitData(
    {
      auth_date: nowSec,
      query_id: 'AAHdF6IQAAAAAN0XohDhrOrc',
      user: { id: 778899, first_name: 'Ibrahim', username: 'alpha_zeta' },
      start_param: 'doc_cardio07_p_12',
    },
    botToken
  );

  const verified = verifyTelegramMiniAppInitData(signedInitData, botToken, {
    nowSeconds: nowSec + 45,
    maxAgeSeconds: 300,
  });
  assert.equal(verified.valid, true);
  assert.equal(verified.firebaseUid, 'tg_778899');
  assert.equal(verified.startParam, 'doc_cardio07_p_12');

  const expired = verifyTelegramMiniAppInitData(signedInitData, botToken, {
    nowSeconds: nowSec + 999,
    maxAgeSeconds: 300,
  });
  assert.equal(expired.valid, false);
  assert.equal(expired.error, 'EXPIRED_AUTH_DATE');

  // 3. startapp validator & router
  assert.equal(validateStartAppPayload('doc_cardio07_p_12').valid, true);
  assert.equal(validateStartAppPayload('bad payload with spaces!').valid, false);
  const routeInfo = parseStartAppCommand('doc_cardio07_p_12');
  assert.equal(routeInfo.mode, 'reader');
  assert.equal(routeInfo.docId, 'cardio07');
  assert.equal(routeInfo.page, 12);

  // 4. ProgressMessageTracker throttled to >= 3000ms
  const tracker = new ProgressMessageTracker({ minIntervalMs: 3000 });
  const t0 = 1_000_000;
  const r1 = await tracker.updateProgress('job1', 123, { completedParts: 1, totalParts: 10, stageAr: 'فصل 1' }, t0);
  assert.equal(r1.action, 'sent_initial');

  const r2 = await tracker.updateProgress('job1', 123, { completedParts: 1, totalParts: 10, stageAr: 'فصل 1' }, t0 + 4000);
  assert.equal(r2.action, 'skipped_identical');

  const r3 = await tracker.updateProgress('job1', 123, { completedParts: 2, totalParts: 10, stageAr: 'فصل 2' }, t0 + 1500);
  assert.equal(r3.action, 'throttled');

  const r4 = await tracker.updateProgress('job1', 123, { completedParts: 2, totalParts: 10, stageAr: 'فصل 2' }, t0 + 3500);
  assert.equal(r4.action, 'edited');

  // 5. Notification Budget Manager
  const budget = new NotificationBudgetManager({ maxDaily: 2 });
  assert.equal(budget.evaluateSend({ userId: 'u1', localHour: 2, dateKey: '2026-10-06' }).allowed, false); // Quiet hours
  assert.equal(budget.evaluateSend({ userId: 'u1', localHour: 14, dateKey: '2026-10-06' }).allowed, true);
  assert.equal(budget.evaluateSend({ userId: 'u1', localHour: 16, dateKey: '2026-10-06' }).allowed, true);
  assert.equal(budget.evaluateSend({ userId: 'u1', localHour: 18, dateKey: '2026-10-06' }).allowed, false); // >2 daily cap

  // 6. Outbox 429 retry_after & DLQ
  let callNum = 0;
  const outbox = new TelegramOutbox({
    maxAttempts: 2,
    senderFn: async () => {
      callNum += 1;
      return { ok: false, error_code: 429, parameters: { retry_after: 4 } };
    },
  });
  const msg = outbox.enqueue({ chat_id: 1, text: 'Hello' });
  const tick1 = await outbox.processTick(1000);
  assert.equal(tick1[0].status, 'retry_scheduled');
  const tick2 = await outbox.processTick(6000);
  assert.equal(tick2[0].status, 'dlq');
  assert.equal(outbox.dlq.length, 1);
  outbox.replayDlqItem(msg.id, 7000);
  assert.equal(outbox.dlq.length, 0);
  assert.equal(outbox.queue.length, 1);

  // 7. No Public Telegraph Leak
  assert.throws(() => assertNoPublicTelegraphLeak({ publishToTelegraph: true }), /V5_PRIVACY_VIOLATION/);
  const delivery = buildPrivateLectureDeliveryPayload({ docId: 'cardio_07' });
  assert.match(delivery.miniAppUrl, /\/tg\?startapp=doc_cardio_07_p_1/);

  // 8. Group auth guard
  const unlinked = await verifyLinkedGroupMember({
    telegramUserId: '999',
    chatId: '-100123',
    linkedAccountResolver: async () => null,
  });
  assert.equal(unlinked.authorized, false);
});

test('V5 Part 5: FSRS v4.5 Leech detection, Learner Model Daily Order Sheet, Credit Ledger & AI Gateway', () => {
  let card = createReviewItem({
    id: 'c1',
    docId: 'cardio',
    promptAr: 'ما القناة المسؤولة عن الهضبة؟',
    answerTerm: 'L-type Ca2+',
  });

  const now = 1_700_000_000_000;
  card = scheduleFsrsReview(card, FSRS_RATINGS.GOOD, now);
  assert.ok(card.intervalDays > 0);
  assert.equal(card.isLeech, false);

  for (let i = 0; i < 5; i += 1) {
    card = scheduleFsrsReview(card, FSRS_RATINGS.AGAIN, now + (i + 1) * 3600_000);
  }
  assert.equal(card.isLeech, true);
  assert.ok(card.leechAdviceAr.includes('قبل ما تقرا'));

  const mapState = buildTerritoryMapState([{ id: 'cardio', masteryPercent: 90 }]);
  assert.equal(mapState.territories[0].inkState, 'mastered');

  const orderSheet = generateDailyOrderSheet({
    territories: mapState.territories,
    reviewItems: [card],
    examDate: new Date(Date.now() + 2 * 86_400_000).toISOString(),
  });
  assert.ok(orderSheet.orders.length >= 3 && orderSheet.orders.length <= 5);
  assert.equal(orderSheet.cramModeRecommended, true);

  // Credit Ledger
  const cost = calculateDocumentCreditCost({ totalPages: 100, ocrPages: 20, deduplicatedPages: 10 });
  assert.equal(cost.billablePages, 90);
  assert.equal(cost.totalCreditsRequired, 100); // 70*1 + 20*1.5 = 100

  const ledger = new PageCreditLedger({ tier: 'pro', remainingCredits: 200 });
  ledger.reserveForJob('job_100', cost.totalCreditsRequired);
  assert.equal(ledger.availableCredits, 100);
  ledger.refundFailedPart('job_100', 15);
  assert.equal(ledger.availableCredits, 115);

  // PII Scrubber & Cross-family selector
  const scrubbed = scrubPiiBeforeAiCall('Contact student@example.com or +201012345678 regarding 150 mg dose');
  assert.match(scrubbed, /\[REDACTED_EMAIL\]/);
  assert.match(scrubbed, /150 mg/);

  const pair = selectCrossFamilyVerifierModel('gemini-2.5-pro');
  assert.notEqual(pair.writerFamily, pair.verifierFamily);
});

test('V4 Rebirth + V5 Atlas Full Platform Wiring (HelpCenter, Landing Showcase, MiniApp Auth, SQL Ledger Schema, Lighthouse CI, Eval Harness)', () => {
  // 1. HelpCenter.jsx 9 sections
  const helpSrc = fs.readFileSync(path.join(ROOT, 'src/pages/HelpCenter.jsx'), 'utf8');
  assert.match(helpSrc, /quickstart/);
  assert.match(helpSrc, /foundational-summary/);
  assert.match(helpSrc, /declassify-quizzes/);
  assert.match(helpSrc, /fsrs-leech/);
  assert.match(helpSrc, /telegram-miniapp/);
  assert.match(helpSrc, /credits-byok/);
  assert.match(helpSrc, /privacy-security/);
  assert.match(helpSrc, /shortcuts-faq/);
  assert.match(helpSrc, /changelog/);

  // 2. LandingAtlasShowcase.jsx 4-tab live demo + comparison table
  const showcaseSrc = fs.readFileSync(path.join(ROOT, 'src/components/atlas/LandingAtlasShowcase.jsx'), 'utf8');
  assert.match(showcaseSrc, /DEMO_TABS/);
  assert.match(showcaseSrc, /COMPARISON_ROWS/);
  assert.match(showcaseSrc, /Cross-Family Verifier/);

  // 3. Telegram MiniApp Auth endpoint
  const miniAppAuthSrc = fs.readFileSync(path.join(ROOT, 'netlify/functions/telegram-miniapp-auth.mjs'), 'utf8');
  assert.match(miniAppAuthSrc, /verifyTelegramMiniAppInitData/);
  assert.match(miniAppAuthSrc, /createCustomToken/);

  // 4. PostgreSQL + pgvector + Double-Entry Credit Ledger SQL schema
  const sqlSchema = fs.readFileSync(path.join(ROOT, 'db/v5_atlas_schema.sql'), 'utf8');
  assert.match(sqlSchema, /CREATE TABLE IF NOT EXISTS lectures/);
  assert.match(sqlSchema, /USING hnsw \(embedding vector_cosine_ops\)/);
  assert.match(sqlSchema, /CREATE TABLE IF NOT EXISTS credit_ledger/);
  assert.match(sqlSchema, /CREATE OR REPLACE FUNCTION reserve_credits/);
  assert.match(sqlSchema, /CREATE OR REPLACE FUNCTION release_credits/);
  assert.match(sqlSchema, /CREATE OR REPLACE VIEW v_ledger_drift/);

  // 5. Lighthouse CI budget (V4 Section 22.2)
  const lhrc = JSON.parse(fs.readFileSync(path.join(ROOT, 'lighthouserc.json'), 'utf8'));
  assert.equal(lhrc.ci.assert.assertions['largest-contentful-paint'][1].maxNumericValue, 2000);
  assert.equal(lhrc.ci.assert.assertions['total-blocking-time'][1].maxNumericValue, 200);
  assert.equal(lhrc.ci.assert.assertions['cumulative-layout-shift'][1].maxNumericValue, 0.05);

  // 6. Eval Harness exists
  assert.ok(fs.existsSync(path.join(ROOT, 'scripts/run-eval.mjs')));
});

