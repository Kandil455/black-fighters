import { executePaymentDecision } from "./_shared/payment-processor.mjs";
import { requireAdmin } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

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
    return json(200, { success: true, ...result });
  } catch (error) {
    return handleError(error);
  }
};

