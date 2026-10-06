import { PLANS, planCredits } from "../../src/lib/plans.js";
import { activationCode } from "./_shared/catalog.mjs";
import { adminDb, FieldValue, requireAdmin } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const admin = await requireAdmin(event);
    const body = parseBody(event);
    const plan = PLANS.find((item) => item.key === body.plan_key);
    if (!plan) throw new Error("الخطة غير صالحة");
    const count = Math.min(100, Math.max(1, Number(body.count) || 1));
    const duration = Math.min(3650, Math.max(1, Number(body.duration_days) || 30));
    const batch = adminDb.batch();
    const codes = [];
    for (let index = 0; index < count; index += 1) {
      const code = activationCode();
      codes.push(code);
      batch.set(adminDb.collection("activationCodes").doc(code), {
        code,
        plan_key: plan.key,
        plan_name: body.plan_name || plan.name,
        duration_days: duration,
        credits: planCredits(plan, duration),
        status: "active",
        note: String(body.note || "").slice(0, 500),
        created_by: admin.uid,
        created_at: FieldValue.serverTimestamp(),
      });
    }
    await batch.commit();
    return json(200, { success: true, codes });
  } catch (error) {
    return handleError(error);
  }
};
