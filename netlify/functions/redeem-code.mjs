import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const normalized = String(body.code || "").trim().toUpperCase();
    if (!normalized) throw new Error("INVALID_CODE");
    let codeRef = adminDb.collection("activationCodes").doc(normalized);
    let codeSnap = await codeRef.get();
    if (!codeSnap.exists) {
      const matches = await adminDb.collection("activationCodes").where("code", "==", normalized).limit(1).get();
      if (matches.empty) throw new Error("كود غير صالح أو تم استخدامه");
      codeRef = matches.docs[0].ref;
      codeSnap = matches.docs[0];
    }
    const userRef = adminDb.collection("users").doc(user.uid);
    const result = await adminDb.runTransaction(async (transaction) => {
      const [freshCode, userSnap] = await Promise.all([transaction.get(codeRef), transaction.get(userRef)]);
      if (!freshCode.exists || freshCode.data().status !== "active") throw new Error("كود غير صالح أو تم استخدامه");
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");
      const code = freshCode.data();
      const profile = userSnap.data();
      const before = Number(profile.credits || 0);
      const added = Number(code.credits || 0);
      const updates = { credits: before + added, updatedAt: FieldValue.serverTimestamp() };
      const productType = code.product_type || (code.plan_key ? "subscription" : "credits");
      if (productType === "subscription") {
        const duration = Number(code.duration_days || 30);
        if (code.plan_key === "emergency_round" || code.product_key === "emergency_round") {
          const currentEmergencyEnd = Date.parse(profile.emergency_expires_at || "") || 0;
          const start = Math.max(Date.now(), currentEmergencyEnd);
          updates.has_emergency_round = true;
          updates.emergency_expires_at = new Date(start + duration * 86400000).toISOString();
          if (!profile.subscription_plan_key || profile.subscription_plan_key === "free") {
            updates.subscription_plan_key = "emergency_round";
            updates.subscription_plan_name = code.plan_name || "راوند الطوارئ";
            updates.subscription_status = "active";
          }
        } else {
          const currentEnd = Date.parse(profile.subscription_expires_at || "") || 0;
          const start = Math.max(Date.now(), currentEnd);
          updates.subscription_plan = "premium";
          updates.subscription_status = "active";
          updates.subscription_plan_key = code.plan_key || code.product_key || "premium";
          updates.subscription_plan_name = code.plan_name || "Premium";
          updates.subscription_expires_at = new Date(start + duration * 86400000).toISOString();
        }
      }
      transaction.update(userRef, updates);
      transaction.update(codeRef, {
        status: "used", used_by_id: user.uid, used_by_email: user.email || "",
        used_at: FieldValue.serverTimestamp(),
      });
      const ledgerRef = adminDb.collection("creditTransactions").doc(`code_${codeRef.id}`);
      transaction.set(ledgerRef, {
        user_id: user.uid, amount: added, balance_before: before, balance_after: before + added,
        transaction_type: "redeem", reason: productType, reference_id: codeRef.id,
        idempotency_key: ledgerRef.id, created_at: FieldValue.serverTimestamp(),
      });
      return { credits: added, balance: before + added, productType, planName: code.plan_name || "" , expiresAt: updates.subscription_expires_at || null };
    });
    return json(200, { success: true, credits: result.credits, balance: result.balance, product_type: result.productType, plan_name: result.planName, expires_at: result.expiresAt });
  } catch (error) {
    return handleError(error);
  }
};
