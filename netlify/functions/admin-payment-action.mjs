import { executePaymentDecision } from "./_shared/payment-processor.mjs";
import { requireAdmin } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { notifyPaymentApproved } from "./_shared/telegram-sync.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const admin = await requireAdmin(event);
    const body = parseBody(event);
    const result = await executePaymentDecision({
      requestId: body.requestId,
      action: body.action,
      deliveryMode: body.deliveryMode,
      adminNote: body.adminNote,
      reviewerId: admin.uid,
    });

    // Tell the student their plan is live. Best-effort: approval must succeed even
    // if Telegram is unreachable or the delivery queue is backed up.
    if (result?.status === "approved" && result.userId) {
      notifyPaymentApproved({ uid: result.userId, planName: result.planName || result.productName })
        .catch((err) => console.warn("[admin-payment-action] notify skipped:", err?.message));
    }

    return json(200, { success: true, ...result });
  } catch (error) {
    return handleError(error);
  }
};

