import { useCallback } from "react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";
import { useLocale } from "@/lib/LocaleContext";
import {
  chargeRollbackMessage,
  chargeSuccessMessage,
  deductCredits,
  extractServerCredits,
  normalizeCredits,
  restoreCredits,
} from "@/lib/optimisticCredits";

/**
 * useOptimisticCharge — THE single place where a credit charge touches the
 * visible balance. Every charge site goes through here, and every reader of
 * `profile.credits` (Layout balance chip, Dashboard metric, stores, image
 * extractor…) reflects the deduction in the SAME render the charge starts:
 *
 *   1. OPTIMISTIC DEDUCT — patch `profile.credits` locally BEFORE awaiting
 *      the charge request, so the deduction appears the same second.
 *   2. RECONCILE — the charge response carries the authoritative `credits`;
 *      adopt it (falling back to refreshProfile when absent).
 *   3. ROLLBACK — if the request fails, the optimistic deduction is undone
 *      and a toast explains the charge was refunded, with the error.
 *
 * Usage:
 *   const { applyOptimisticCharge } = useOptimisticCharge();
 *   const res = await applyOptimisticCharge(
 *     () => base44.functions.invoke("chargeAiJob", payload),
 *     { cost: quoteAiJobCost(payload) }
 *   );
 *   // res.data.cost is the authoritative charged amount.
 *
 * Refunds (charge succeeded, the AI work later failed) go through
 * `applyOptimisticRefund` — it reconciles the local balance with the server
 * refund response (or restores the cost when the answer carries no balance).
 */
export function useOptimisticCharge() {
  const { profile, patchProfile, refreshProfile } = useAuth();
  const { locale } = useLocale();

  const applyOptimisticCharge = useCallback(
    async (request, { cost = 0, toastOnSuccess = true, isEn } = {}) => {
      if (typeof request !== "function") {
        throw new TypeError("applyOptimisticCharge expects a charge request function");
      }
      const en = typeof isEn === "boolean" ? isEn : locale === "en";
      const safeCost = Math.max(0, Number(cost) || 0);
      const balanceBefore = normalizeCredits(profile?.credits);

      // (1) Optimistic deduction — every balance reader updates this render.
      if (safeCost > 0) {
        patchProfile((prev) => ({ credits: deductCredits(prev?.credits, safeCost) }));
      }

      let res;
      try {
        res = await request();
      } catch (err) {
        // (3) The server never confirmed a charge — restore the deduction.
        if (safeCost > 0) {
          patchProfile((prev) => ({ credits: restoreCredits(prev?.credits, safeCost) }));
        }
        toast.error(chargeRollbackMessage({ cost: safeCost, error: err, isEn: en }), { duration: 5000 });
        throw err;
      }

      // (2) Server confirmed — reconcile with its authoritative balance.
      const serverCredits = extractServerCredits(res?.data);
      const actualCost = Math.max(0, Number(res?.data?.cost ?? safeCost) || 0);
      if (serverCredits !== null) {
        patchProfile({ credits: serverCredits });
      } else {
        refreshProfile?.().catch(() => {});
      }

      if (toastOnSuccess && actualCost > 0) {
        toast.success(
          chargeSuccessMessage({
            cost: actualCost,
            balance: serverCredits ?? deductCredits(balanceBefore, actualCost),
            isEn: en,
          }),
          { duration: 4000 }
        );
      }
      return res;
    },
    [profile?.credits, patchProfile, refreshProfile, locale]
  );

  /**
   * Reconcile the visible balance with a finished charge/refund response:
   * adopt the embedded authoritative balance, restore `cost` as a delta when
   * the answer carries no balance, else fall back to a full profile refresh.
   */
  const reconcileCredits = useCallback(
    (res, { cost = 0 } = {}) => {
      const serverCredits = extractServerCredits(res?.data);
      if (serverCredits !== null) {
        patchProfile({ credits: serverCredits });
        return true;
      }
      const safeCost = Math.max(0, Number(cost) || 0);
      if (safeCost > 0) {
        patchProfile((prev) => ({ credits: restoreCredits(prev?.credits, safeCost) }));
        return true;
      }
      refreshProfile?.().catch(() => {});
      return false;
    },
    [patchProfile, refreshProfile]
  );

  const applyOptimisticRefund = useCallback(
    async (request, { cost = 0 } = {}) => {
      if (typeof request !== "function") {
        throw new TypeError("applyOptimisticRefund expects a refund request function");
      }
      try {
        const res = await request();
        reconcileCredits(res, { cost });
        return res;
      } catch (err) {
        // The refund call itself failed — never leave stale money on screen.
        refreshProfile?.().catch(() => {});
        throw err;
      }
    },
    [reconcileCredits, refreshProfile]
  );

  return { applyOptimisticCharge, applyOptimisticRefund, reconcileCredits };
}

export default useOptimisticCharge;
