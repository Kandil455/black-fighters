import test from "node:test";
import assert from "node:assert/strict";
import { calculateOcrAllowance } from "../../src/lib/ocrAllowance.js";

test("calculateOcrAllowance: admin is always 100% free with all images processable", () => {
  const result = calculateOcrAllowance({
    targetCount: 20,
    userCredits: 0,
    isMasterAdmin: true,
    canUseFreeTrial: false,
  });
  assert.equal(result.processableCount, 20);
  assert.equal(result.chargedCost, 0);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 0);
});

test("calculateOcrAllowance: free trial covers <= 5 images completely for 0 credits", () => {
  const result = calculateOcrAllowance({
    targetCount: 4,
    userCredits: 0,
    isMasterAdmin: false,
    canUseFreeTrial: true,
  });
  assert.equal(result.processableCount, 4);
  assert.equal(result.chargedCost, 0);
  assert.equal(result.isFreeTrial, true);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 0);
});

test("calculateOcrAllowance: free trial with 0 credits and > 5 images processes 5 free images and stops", () => {
  const result = calculateOcrAllowance({
    targetCount: 12,
    userCredits: 0,
    isMasterAdmin: false,
    canUseFreeTrial: true,
  });
  assert.equal(result.processableCount, 5);
  assert.equal(result.chargedCost, 0);
  assert.equal(result.isFreeTrial, true);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 7);
});

test("calculateOcrAllowance: free trial with 1 credit and 12 images processes 10 images (5 free + 5 paid)", () => {
  const result = calculateOcrAllowance({
    targetCount: 12,
    userCredits: 1,
    isMasterAdmin: false,
    canUseFreeTrial: true,
  });
  assert.equal(result.processableCount, 10);
  assert.equal(result.chargedCost, 1);
  assert.equal(result.isFreeTrial, true);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 2);
});

test("calculateOcrAllowance: regular user (no free trial) with 0 credits cannot process and is not affordable", () => {
  const result = calculateOcrAllowance({
    targetCount: 10,
    userCredits: 0,
    isMasterAdmin: false,
    canUseFreeTrial: false,
  });
  assert.equal(result.processableCount, 0);
  assert.equal(result.chargedCost, 2);
  assert.equal(result.isAffordable, false);
  assert.equal(result.remainingUnprocessed, 10);
});

test("calculateOcrAllowance: regular user with 1 credit for 12 images processes 5 images and stops (Alpha rule)", () => {
  const result = calculateOcrAllowance({
    targetCount: 12,
    userCredits: 1,
    isMasterAdmin: false,
    canUseFreeTrial: false,
  });
  assert.equal(result.processableCount, 5);
  assert.equal(result.chargedCost, 1);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 7);
});

test("calculateOcrAllowance: regular user with 3 credits for 12 images processes all 12 images", () => {
  const result = calculateOcrAllowance({
    targetCount: 12,
    userCredits: 3,
    isMasterAdmin: false,
    canUseFreeTrial: false,
  });
  assert.equal(result.processableCount, 12);
  assert.equal(result.chargedCost, 3);
  assert.equal(result.isAffordable, true);
  assert.equal(result.remainingUnprocessed, 0);
});
