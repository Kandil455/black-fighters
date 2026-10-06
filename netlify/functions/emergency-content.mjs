import { adminDb, FieldValue, requireAdmin, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";

const OWNER_EMAIL = "ibrahimkandil000@gmail.com";

/**
 * Checks if the caller has valid Emergency Round subscription access.
 * Admin/Owner always has full access.
 */
async function verifyEmergencyAccess(user) {
  const email = String(user.email || "").toLowerCase().trim();
  if (email === OWNER_EMAIL || user.role === "admin") {
    return { isAllowed: true, isAdmin: true };
  }

  if (!adminDb) return { isAllowed: false, isAdmin: false };

  const userDoc = await adminDb.collection("users").doc(user.uid).get();
  if (!userDoc.exists) {
    return { isAllowed: false, isAdmin: false };
  }

  const data = userDoc.data() || {};

  // 1. Independent Emergency Round Add-on flag
  if (data.has_emergency_round === true) {
    const exp = data.emergency_expires_at ? Date.parse(data.emergency_expires_at) : 0;
    if (!exp || exp > Date.now()) {
      return { isAllowed: true, isAdmin: false, userProfile: data };
    }
  }

  // 2. Dedicated plan key
  const planKey = String(data.subscription_plan_key || "").toLowerCase();
  const planStatus = String(data.subscription_status || "").toLowerCase();
  const expiresAt = data.subscription_expires_at ? Date.parse(data.subscription_expires_at) : 0;
  const isTimeValid = !expiresAt || expiresAt > Date.now();

  const isEmergencySub = planKey === "emergency_round" && (planStatus === "active" || isTimeValid);

  return {
    isAllowed: isEmergencySub,
    isAdmin: false,
    userProfile: data,
  };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return json(405, { error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const action = String(body.action || "").trim();

    // ── 1. Admin-Only Operations ──
    if (["create", "update", "delete", "toggle"].includes(action)) {
      await requireAdmin(event);

      if (action === "create") {
        const {
          title,
          description = "",
          contentType = "html", // "html" | "pdf" | "quiz"
          htmlContent = "",
          fileUrl = "",
          quizId = "",
          fileName = "",
          tags = [],
          university = "epnu",
          isActive = true,
        } = body;

        if (!title || typeof title !== "string" || !title.trim()) {
          return json(400, { error: "MISSING_TITLE", message: "عنوان المحتوى مطلوب" });
        }

        if (!["html", "pdf", "quiz"].includes(contentType)) {
          return json(400, { error: "INVALID_CONTENT_TYPE", message: "نوع المحتوى يجب أن يكون html أو pdf أو quiz" });
        }

        if (contentType === "html" && !htmlContent && !fileUrl) {
          return json(400, { error: "MISSING_HTML_CONTENT", message: "يرجى كتابة كود الـ HTML أو رفع ملف HTML" });
        }

        if (contentType === "pdf" && (!fileUrl || typeof fileUrl !== "string")) {
          return json(400, { error: "MISSING_FILE_URL", message: "رابط أو ملف الـ PDF مطلوب" });
        }

        const docId = `emc_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        const safeHtml = (contentType === "html" && htmlContent)
          ? (htmlContent.length > 300000 && fileUrl ? "" : htmlContent)
          : "";

        const payload = {
          id: docId,
          title: title.trim(),
          description: String(description || "").trim(),
          contentType,
          htmlContent: safeHtml,
          fileUrl: (contentType === "pdf" || contentType === "html") ? (fileUrl || "") : "",
          quizId: contentType === "quiz" ? String(quizId || "").trim() : "",
          fileName: String(fileName || "").trim(),
          tags: Array.isArray(tags) ? tags.map((t) => String(t).trim().toLowerCase()).filter(Boolean) : ["epnu", "طوارئ"],
          university: String(university || "epnu").trim().toLowerCase(),
          isActive: Boolean(isActive),
          viewCount: 0,
          created_by: user.uid,
          created_by_email: user.email || "",
          createdAt: FieldValue.serverTimestamp(),
          updatedAt: FieldValue.serverTimestamp(),
        };

        await adminDb.collection("emergencyContent").doc(docId).set(payload);

        return json(200, { ok: true, message: "تم رفع محتوى الطوارئ بنجاح", content: payload });
      }

      if (action === "update") {
        const { contentId, updates } = body;
        if (!contentId) return json(400, { error: "MISSING_CONTENT_ID" });

        const docRef = adminDb.collection("emergencyContent").doc(contentId);
        const doc = await docRef.get();
        if (!doc.exists) return json(404, { error: "NOT_FOUND" });

        const allowedKeys = ["title", "description", "htmlContent", "fileUrl", "quizId", "fileName", "tags", "university", "isActive"];
        const sanitized = {};
        for (const k of allowedKeys) {
          if (updates && updates[k] !== undefined) sanitized[k] = updates[k];
        }
        sanitized.updatedAt = FieldValue.serverTimestamp();

        await docRef.update(sanitized);
        return json(200, { ok: true, message: "تم تحديث المحتوى بنجاح" });
      }

      if (action === "delete") {
        const { contentId } = body;
        if (!contentId) return json(400, { error: "MISSING_CONTENT_ID" });
        await adminDb.collection("emergencyContent").doc(contentId).delete();
        return json(200, { ok: true, message: "تم حذف المحتوى بنجاح" });
      }

      if (action === "toggle") {
        const { contentId, isActive } = body;
        if (!contentId) return json(400, { error: "MISSING_CONTENT_ID" });
        await adminDb.collection("emergencyContent").doc(contentId).update({
          isActive: Boolean(isActive),
          updatedAt: FieldValue.serverTimestamp(),
        });
        return json(200, { ok: true, isActive: Boolean(isActive) });
      }
    }

    // ── 2. Subscriber / Admin Read Operations ──
    const access = await verifyEmergencyAccess(user);
    if (!access.isAllowed) {
      return json(403, {
        ok: false,
        error: "FORBIDDEN_EMERGENCY_ONLY",
        message: "هذا القسم مخصص حصرياً لمشتركي باقة راوند الطوارئ (99 ج)",
      });
    }

    if (action === "list") {
      let query = adminDb.collection("emergencyContent");

      // Regular subscribers only see active items
      if (!access.isAdmin) {
        query = query.where("isActive", "==", true);
      }

      if (body.contentType) {
        query = query.where("contentType", "==", String(body.contentType));
      }

      const snap = await query.get();
      const items = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title || "",
          description: data.description || "",
          contentType: data.contentType || "html",
          fileUrl: data.fileUrl || "",
          quizId: data.quizId || "",
          fileName: data.fileName || "",
          tags: data.tags || [],
          university: data.university || "epnu",
          isActive: data.isActive !== false,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
          // Only send full htmlContent if specifically requesting or if it's small (<10KB)
          htmlContent: data.htmlContent && data.htmlContent.length < 15000 ? data.htmlContent : undefined,
          hasFullHtml: Boolean(data.htmlContent),
        };
      });

      // Sort in-memory to prevent complex composite index requirements
      items.sort((a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));

      return json(200, { ok: true, items, isAdmin: access.isAdmin });
    }

    if (action === "get") {
      const { contentId } = body;
      if (!contentId) return json(400, { error: "MISSING_CONTENT_ID" });

      const doc = await adminDb.collection("emergencyContent").doc(contentId).get();
      if (!doc.exists) return json(404, { error: "NOT_FOUND" });

      const data = doc.data();
      if (!access.isAdmin && data.isActive === false) {
        return json(403, { error: "CONTENT_INACTIVE", message: "هذا المحتوى غير متاح حالياً" });
      }

      // Increment view count asynchronously
      adminDb.collection("emergencyContent").doc(contentId).update({
        viewCount: FieldValue.increment(1),
      }).catch(() => {});

      return json(200, {
        ok: true,
        content: {
          id: doc.id,
          ...data,
          createdAt: data.createdAt?.toDate?.()?.toISOString() || null,
          updatedAt: data.updatedAt?.toDate?.()?.toISOString() || null,
        },
      });
    }

    return json(400, { error: "UNKNOWN_ACTION", message: "الإجراء غير معروف" });
  } catch (error) {
    console.error("[emergency-content] Error:", error);
    return handleError(error);
  }
};
