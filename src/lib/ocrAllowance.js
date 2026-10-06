/**
 * ocrAllowance.js
 * Smart credit and quota calculator for Practical Image Review OCR.
 * Enforces Alpha's strict quota policy:
 * 1. 1 free trial session (up to 5 images).
 * 2. Subsequent operations cost 1 credit per 5 images.
 * 3. Proportional partial execution: if the batch costs more than available credits,
 *    process only as many images as available credits afford (userCredits * 5) and stop gracefully.
 */

export function calculateOcrAllowance({
  targetCount = 0,
  userCredits = 0,
  isMasterAdmin = false,
  canUseFreeTrial = false,
} = {}) {
  const count = Math.max(0, Number(targetCount) || 0);
  const credits = Math.max(0, Number(userCredits) || 0);

  if (count === 0) {
    return {
      processableCount: 0,
      chargedCost: 0,
      isFreeTrial: false,
      isAffordable: true,
      remainingUnprocessed: 0,
    };
  }

  if (isMasterAdmin) {
    return {
      processableCount: count,
      chargedCost: 0,
      isFreeTrial: false,
      isAffordable: true,
      remainingUnprocessed: 0,
    };
  }

  const freeAllowance = canUseFreeTrial ? 5 : 0;
  const fullCost = Math.max(1, Math.ceil(count / 5));

  if (canUseFreeTrial) {
    if (count <= freeAllowance) {
      return {
        processableCount: count,
        chargedCost: 0,
        isFreeTrial: true,
        isAffordable: true,
        remainingUnprocessed: 0,
      };
    }

    const extraImages = count - freeAllowance;
    const extraCost = Math.max(1, Math.ceil(extraImages / 5));

    if (credits >= extraCost) {
      return {
        processableCount: count,
        chargedCost: extraCost,
        isFreeTrial: true,
        isAffordable: true,
        remainingUnprocessed: 0,
      };
    } else if (credits > 0) {
      const affordableBeyondFree = credits * 5;
      const totalAffordable = Math.min(count, freeAllowance + affordableBeyondFree);
      return {
        processableCount: totalAffordable,
        chargedCost: credits,
        isFreeTrial: true,
        isAffordable: true,
        remainingUnprocessed: count - totalAffordable,
      };
    } else {
      return {
        processableCount: freeAllowance,
        chargedCost: 0,
        isFreeTrial: true,
        isAffordable: true,
        remainingUnprocessed: count - freeAllowance,
      };
    }
  }

  if (credits >= fullCost) {
    return {
      processableCount: count,
      chargedCost: fullCost,
      isFreeTrial: false,
      isAffordable: true,
      remainingUnprocessed: 0,
    };
  } else if (credits > 0) {
    const affordableCount = Math.min(count, credits * 5);
    return {
      processableCount: affordableCount,
      chargedCost: credits,
      isFreeTrial: false,
      isAffordable: true,
      remainingUnprocessed: count - affordableCount,
    };
  } else {
    return {
      processableCount: 0,
      chargedCost: fullCost,
      isFreeTrial: false,
      isAffordable: false,
      remainingUnprocessed: count,
    };
  }
}
