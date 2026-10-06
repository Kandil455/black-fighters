import { cosmeticItem } from "./_shared/catalog.mjs";
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const resolved = cosmeticItem(body.type, body.key);
    if (!resolved) throw new Error("العنصر غير متاح للشراء");
    const { catalog, item } = resolved;
    const userRef = adminDb.collection("users").doc(user.uid);
    const txRef = adminDb.collection("creditTransactions").doc(`cosmetic_${user.uid}_${body.type}_${body.key}`);
    const result = await adminDb.runTransaction(async (transaction) => {
      const [userSnap, ledgerSnap] = await Promise.all([transaction.get(userRef), transaction.get(txRef)]);
      if (!userSnap.exists) throw new Error("المستخدم غير موجود");
      const profile = userSnap.data();
      const owned = Array.isArray(profile[catalog.field]) ? profile[catalog.field] : [];
      if (owned.includes(body.key) || ledgerSnap.exists || Number(item.price) === 0) {
        if (body.equip && catalog.activeField) {
          transaction.update(userRef, { [catalog.activeField]: body.key, updatedAt: FieldValue.serverTimestamp() });
        }
        return { credits: Number(profile.credits || 0), owned };
      }
      const before = Number(profile.credits || 0);
      const cost = Number(item.price);
      if (before < cost) throw new Error(`رصيدك غير كافي — محتاج ${cost} كريدت`);
      const after = before - cost;
      const nextOwned = [...new Set([...owned, body.key])];
      transaction.update(userRef, {
        credits: after,
        [catalog.field]: nextOwned,
        ...(body.equip && catalog.activeField ? { [catalog.activeField]: body.key } : {}),
        updatedAt: FieldValue.serverTimestamp(),
      });
      transaction.set(txRef, {
        user_id: user.uid, amount: -cost, balance_before: before, balance_after: after,
        transaction_type: "spend", reason: "cosmetic_purchase", reference_type: body.type,
        reference_id: body.key, idempotency_key: txRef.id, description: `شراء ${item.label}`,
        created_at: FieldValue.serverTimestamp(),
      });
      return { credits: after, owned: nextOwned };
    });
    return json(200, { success: true, credits: result.credits, [catalog.field]: result.owned });
  } catch (error) {
    return handleError(error);
  }
};
