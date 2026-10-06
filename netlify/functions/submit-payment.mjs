import { getPurchasableProduct } from "../../src/lib/economyCatalog.js";
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const product = getPurchasableProduct(body);
    if (!product) throw new Error("المنتج غير صالح");
    if (!body.senderNumber?.trim() || !body.screenshotUrl?.trim()) throw new Error("بيانات التحويل غير مكتملة");
    const cleanedSender = String(body.senderNumber || "").replace(/\D/g, "");
    if (!/^01\d{9}$/.test(cleanedSender)) {
      throw new Error("رقم الهاتف المحول منه غير صالح، يجب أن يتكون من 11 رقماً ويبدأ بـ 01");
    }
    if (!["vodafone_cash", "instapay"].includes(body.method)) throw new Error("وسيلة الدفع غير صالحة");
    const key = String(body.idempotencyKey || crypto.randomUUID()).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 80);
    const ref = adminDb.collection("paymentRequests").doc(`${user.uid}_${key}`);
    const existing = await ref.get();
    if (existing.exists) return json(200, { success: true, id: ref.id, duplicate: true });
    await ref.set({
      user_id: user.uid,
      user_name: user.name || "",
      user_email: user.email || "",
      product_type: product.productType,
      product_key: body.productKey,
      plan_key: product.productType === "subscription" ? body.productKey : "",
      plan_name: product.name,
      billing_cycle: body.billing || "monthly",
      duration_days: product.durationDays || 0,
      credits: product.credits || product.grantedCredits || 0,
      amount: product.amount,
      method: body.method,
      sender_number: body.senderNumber.trim(),
      screenshot_url: body.screenshotUrl.trim(),
      note: String(body.note || "").slice(0, 500),
      status: "pending",
      idempotency_key: key,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    });

    // Notify Alpha immediately via Telegram Bot
    try {
      const { sendPaymentAlertToAlpha } = await import("./_shared/telegram-engine.mjs");
      await sendPaymentAlertToAlpha({
        requestId: ref.id,
        userName: user.name || "",
        userEmail: user.email || "",
        method: body.method,
        amount: product.amount,
        productType: product.productType,
        planName: product.name,
        senderNumber: body.senderNumber.trim(),
        screenshotUrl: body.screenshotUrl.trim(),
      });
    } catch (botErr) {
      console.warn("Telegram payment alert skipped:", botErr.message);
    }

    return json(200, { success: true, id: ref.id, amount: product.amount });
  } catch (error) {
    return handleError(error);
  }
};
