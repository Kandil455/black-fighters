import { activationCode, getPurchasableProduct } from "./catalog.mjs";
import { adminDb, FieldValue } from "./firebase-admin.mjs";

/**
 * Executes a payment approval or rejection transaction.
 * Shared between Admin Web Panel and Telegram Bot Webhook.
 */
export async function executePaymentDecision({
  requestId,
  action, // "approve" | "reject"
  deliveryMode = "direct", // "direct" | "code"
  adminNote = "",
  reviewerId = "alpha_sovereign",
}) {
  if (!requestId) throw new Error("MISSING_REQUEST_ID");
  const requestRef = adminDb.collection("paymentRequests").doc(requestId);

  return adminDb.runTransaction(async (transaction) => {
    const requestSnap = await transaction.get(requestRef);
    if (!requestSnap.exists) throw new Error("NOT_FOUND_PAYMENT_REQUEST");
    const payment = requestSnap.data();

    if (payment.status !== "pending") {
      return {
        alreadyHandled: true,
        duplicate: true,
        status: payment.status,
        code: payment.activation_code || "",
        userName: payment.user_name || "",
        amount: payment.amount || 0,
      };
    }

    if (action === "reject") {
      transaction.delete(requestRef);
      return {
        status: "rejected",
        deleted: true,
        userName: payment.user_name || "",
        amount: payment.amount || 0,
      };
    }

    const product = getPurchasableProduct({
      productType: payment.product_type || "subscription",
      productKey: payment.product_key || payment.plan_key,
      billing: payment.billing_cycle || (Number(payment.duration_days) >= 365 ? "yearly" : "monthly"),
    });

    if (!product || Number(payment.amount) !== Number(product.amount)) {
      throw new Error("المبلغ لا يطابق المنتج المسجل في الكتالوج");
    }

    const actualDeliveryMode = deliveryMode === "code" ? "code" : "direct";
    let code = "";

    if (actualDeliveryMode === "code") {
      code = activationCode();
      transaction.set(adminDb.collection("activationCodes").doc(code), {
        code,
        product_type: product.productType,
        product_key: payment.product_key || payment.plan_key,
        plan_key: product.productType === "subscription" ? (payment.product_key || payment.plan_key) : "",
        plan_name: product.name,
        duration_days: product.durationDays || 0,
        credits: product.credits || product.grantedCredits || 0,
        status: "active",
        payment_request_id: requestRef.id,
        created_at: FieldValue.serverTimestamp(),
      });
    } else {
      const userRef = adminDb.collection("users").doc(payment.user_id);
      const userSnap = await transaction.get(userRef);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");
      const profile = userSnap.data();
      const before = Number(profile.credits || 0);
      const added = Number(product.credits || product.grantedCredits || 0);
      // Tokens grant: use plan's tokens field if product type is subscription
      const tokensBefore = Number(profile.token_balance || 0);
      const tokensToAdd = Number(product.tokens || 0);
      const updates = {
        credits: before + added,
        updatedAt: FieldValue.serverTimestamp(),
      };

      // Add token_balance if the plan defines tokens
      if (tokensToAdd > 0) {
        updates.token_balance = tokensBefore + tokensToAdd;
      }

      if (product.productType === "subscription") {
        if (product.isEmergency || payment.product_key === "emergency_round" || payment.plan_key === "emergency_round") {
          // Emergency Round is an independent standalone add-on product!
          // Stacks with existing Pro/Starter/Supreme plans without overwriting them.
          const currentEmergencyEnd = Date.parse(profile.emergency_expires_at || "") || 0;
          const start = Math.max(Date.now(), currentEmergencyEnd);
          updates.has_emergency_round = true;
          updates.emergency_expires_at = new Date(start + Number(product.durationDays || 30) * 86400000).toISOString();
          if (!profile.subscription_plan_key || profile.subscription_plan_key === "free") {
            updates.subscription_plan_key = "emergency_round";
            updates.subscription_plan_name = product.name;
            updates.subscription_status = "active";
          }
        } else {
          // Main Subscription Tier (Starter / Pro / Supreme)
          const currentEnd = Date.parse(profile.subscription_expires_at || "") || 0;
          const start = Math.max(Date.now(), currentEnd);
          updates.subscription_plan = "premium";
          updates.subscription_status = "active";
          updates.is_pro = true;
          updates.subscription_plan_key = payment.product_key || payment.plan_key;
          updates.subscription_plan_name = product.name;
          updates.subscription_expires_at = new Date(start + Number(product.durationDays) * 86400000).toISOString();
        }
      }

      transaction.update(userRef, updates);

      const ledgerRef = adminDb.collection("creditTransactions").doc(`payment_${requestRef.id}`);
      transaction.set(ledgerRef, {
        user_id: payment.user_id,
        amount: added,
        balance_before: before,
        balance_after: before + added,
        tokens_added: tokensToAdd,
        token_balance_before: tokensBefore,
        token_balance_after: tokensBefore + tokensToAdd,
        transaction_type: "purchase",
        reason: product.productType,
        reference_id: requestRef.id,
        idempotency_key: ledgerRef.id,
        performed_by: reviewerId,
        created_at: FieldValue.serverTimestamp(),
      });
    }

    transaction.update(requestRef, {
      status: "approved",
      delivery_mode: actualDeliveryMode,
      activation_code: code,
      reviewed_by: reviewerId,
      reviewed_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
      admin_note: String(adminNote || "").slice(0, 500),
    });

    return {
      status: "approved",
      code,
      deliveryMode: actualDeliveryMode,
      userName: payment.user_name || "",
      productName: product.name,
      amount: product.amount,
      addedCredits: product.credits || product.grantedCredits || 0,
    };
  });
}
