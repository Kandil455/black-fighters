import test from "node:test";
import assert from "node:assert/strict";
import {
  normalizeCredits,
  deductCredits,
  restoreCredits,
  extractServerCredits,
  quoteAiJobCost,
  resolvePostChargeBalance,
  chargeSuccessMessage,
  chargeRollbackMessage,
} from "../../src/lib/optimisticCredits.js";

// ── normalizeCredits ────────────────────────────────────────────────────────

test("normalizeCredits: floors at 0, rounds to 0.1, tolerates junk", () => {
  assert.equal(normalizeCredits(10), 10);
  assert.equal(normalizeCredits(-5), 0);
  assert.equal(normalizeCredits(3.26), 3.3);
  assert.equal(normalizeCredits("7.5"), 7.5);
  assert.equal(normalizeCredits(undefined), 0);
  assert.equal(normalizeCredits(null), 0);
  assert.equal(normalizeCredits("abc"), 0);
});

// ── deductCredits (optimistic, same-second deduction) ───────────────────────

test("deductCredits: profile + cost → balance - cost", () => {
  assert.equal(deductCredits(10, 3), 7);
  assert.equal(deductCredits(100, 12), 88);
  assert.equal(deductCredits(5.5, 0.5), 5);
});

test("deductCredits: never goes below zero (optimistic display stays honest)", () => {
  assert.equal(deductCredits(2, 5), 0);
  assert.equal(deductCredits(0, 1), 0);
});

test("deductCredits: fractional costs stay at 0.1 precision", () => {
  assert.equal(deductCredits(10, 2.5), 7.5);
  assert.equal(deductCredits(1, 0.5), 0.5);
});

test("deductCredits: invalid/zero cost is a no-op", () => {
  assert.equal(deductCredits(10, 0), 10);
  assert.equal(deductCredits(10, -4), 10);
  assert.equal(deductCredits(10, undefined), 10);
});

// ── restoreCredits (rollback on failure / refund delta) ─────────────────────

test("restoreCredits: gives the deducted cost back", () => {
  assert.equal(restoreCredits(7, 3), 10);
  assert.equal(restoreCredits(0, 2.5), 2.5);
  assert.equal(restoreCredits(7.4, 0.13), 7.5); // rounds to 0.1
});

// ── extractServerCredits (authoritative reconcile source) ───────────────────

test("extractServerCredits: adopts the server's authoritative balance", () => {
  assert.equal(extractServerCredits({ credits: 42 }), 42);
  assert.equal(extractServerCredits({ credits: "7.5" }), 7.5);
  assert.equal(extractServerCredits({ credits: 0 }), 0);
});

test("extractServerCredits: returns null when the response carries no balance", () => {
  assert.equal(extractServerCredits(null), null);
  assert.equal(extractServerCredits(undefined), null);
  assert.equal(extractServerCredits({}), null);
  assert.equal(extractServerCredits({ credits: undefined }), null);
  assert.equal(extractServerCredits({ credits: "plenty" }), null);
});

// ── quoteAiJobCost (mirrors the server quote for the optimistic estimate) ───

test("quoteAiJobCost: quiz is 1 credit per 5 questions (min 1)", () => {
  assert.equal(quoteAiJobCost({ task: "quiz", questionCount: 5 }), 1);
  assert.equal(quoteAiJobCost({ task: "quiz", questionCount: 6 }), 2);
  assert.equal(quoteAiJobCost({ task: "quiz", questionCount: 20 }), 4);
  assert.equal(quoteAiJobCost({ task: "quiz" }), 2); // default 10 questions
  assert.equal(quoteAiJobCost({ task: "quiz", questionCount: 1 }), 1);
});

test("quoteAiJobCost: quiz_audit is 1 credit per 10 questions (min 1)", () => {
  assert.equal(quoteAiJobCost({ task: "quiz_audit", questionCount: 10 }), 1);
  assert.equal(quoteAiJobCost({ task: "quiz_audit", questionCount: 11 }), 2);
  assert.equal(quoteAiJobCost({ task: "quiz_audit", questionCount: 4 }), 1);
});

test("quoteAiJobCost: flashcards scale by 40k chars, clamped to [1, 10]", () => {
  assert.equal(quoteAiJobCost({ task: "flashcards", charCount: 10_000 }), 1);
  assert.equal(quoteAiJobCost({ task: "flashcards", charCount: 40_001 }), 2);
  assert.equal(quoteAiJobCost({ task: "flashcards", charCount: 10_000_000 }), 10);
});

test("quoteAiJobCost: image_ocr is 1 credit per 5 images (min 1)", () => {
  assert.equal(quoteAiJobCost({ task: "image_ocr", imageCount: 1 }), 1);
  assert.equal(quoteAiJobCost({ task: "image_ocr", imageCount: 5 }), 1);
  assert.equal(quoteAiJobCost({ task: "image_ocr", imageCount: 6 }), 2);
});

test("quoteAiJobCost: explicit cost wins, and OCR PDFs are free", () => {
  assert.equal(quoteAiJobCost({ task: "summary_edit", cost: 3 }), 3);
  assert.equal(quoteAiJobCost({ task: "custom", amount: 7 }), 7);
  assert.equal(quoteAiJobCost({ task: "ocr", pageCount: 20 }), 0);
});

test("quoteAiJobCost: summary falls back to the shared summary catalog", () => {
  assert.equal(quoteAiJobCost({ task: "summary", charCount: 1_000 }), 2);
  assert.equal(quoteAiJobCost({ task: "summary", charCount: 20_000 }), 8);
  assert.equal(quoteAiJobCost({ task: "summary", charCount: 130_000 }), 35);
});

// ── resolvePostChargeBalance (reconcile on success) ─────────────────────────

test("resolvePostChargeBalance: server value wins over the optimistic estimate", () => {
  // Optimistic estimate said 10 - 3 = 7, but the server says 6.5 → adopt 6.5.
  assert.equal(resolvePostChargeBalance({ before: 10, serverCredits: 6.5, actualCost: 3 }), 6.5);
});

test("resolvePostChargeBalance: without a server value, deduct the confirmed cost", () => {
  assert.equal(resolvePostChargeBalance({ before: 10, serverCredits: null, actualCost: 2 }), 8);
});

// ── Toast copy (Arabic default, English via isEn) ───────────────────────────

test("chargeSuccessMessage: Arabic default shows cost and new balance", () => {
  assert.equal(
    chargeSuccessMessage({ cost: 3, balance: 7 }),
    "خصم ✅ 3 كريدت — رصيدك الآن 7 كريدت"
  );
});

test("chargeSuccessMessage: English fallback via isEn", () => {
  assert.equal(
    chargeSuccessMessage({ cost: 2.5, balance: 47.5, isEn: true }),
    "Charged ✅ 2.5 credits — your balance is now 47.5"
  );
});

test("chargeRollbackMessage: explains the refund and carries the error", () => {
  const err = new Error("السيرفر مش راضي");
  const ar = chargeRollbackMessage({ cost: 3, error: err });
  assert.match(ar, /اترجّع الخصم ✅ 3 كريدت/);
  assert.match(ar, /السيرفر مش راضي/);

  const en = chargeRollbackMessage({ cost: 3, error: "boom", isEn: true });
  assert.match(en, /refunded ✅ 3 credits restored/);
  assert.match(en, /boom/);
});

// ── Full charge lifecycle through the pure reducer ──────────────────────────

test("lifecycle: deduct → success reconciles to the server balance", () => {
  const profile = { id: "u1", credits: 10 };
  const cost = 3;

  // 1) Optimistic instant deduction
  const optimisticCredits = deductCredits(profile.credits, cost);
  assert.equal(optimisticCredits, 7);

  // 2) Server confirmed with the authoritative balance
  const response = { data: { success: true, cost: 3, credits: 6.5 } };
  const serverCredits = extractServerCredits(response.data);
  const finalCredits = resolvePostChargeBalance({
    before: profile.credits,
    serverCredits,
    actualCost: response.data.cost,
  });
  assert.equal(finalCredits, 6.5);
});

test("lifecycle: deduct → failure restores the balance (rollback)", () => {
  const profile = { id: "u1", credits: 10 };
  const cost = 3;

  const optimisticCredits = deductCredits(profile.credits, cost);
  assert.equal(optimisticCredits, 7);

  // The request failed — the locally shown deduction is undone.
  const rolledBack = restoreCredits(optimisticCredits, cost);
  assert.equal(rolledBack, 10);
});

test("lifecycle: refund reconciles to the server's post-refund balance", () => {
  const afterCharge = 7;
  const cost = 3;

  // Refund response carries the authoritative restored balance.
  const refundRes = { data: { success: true, cost, credits: 10, status: "refunded" } };
  const serverCredits = extractServerCredits(refundRes.data);
  assert.equal(serverCredits, 10);

  // And a transport-only refund (no balance in the answer) restores by delta.
  const deltaRestored = restoreCredits(afterCharge, cost);
  assert.equal(deltaRestored, 10);
});
