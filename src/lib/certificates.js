import { invokeSecureFunction } from "./secureFunctions";

/**
 * Certificates issued by the system directly to the learner.
 * All calls go through the `certificates` serverless function; the owner is taken
 * from the verified token, never from these arguments.
 */
export async function issueCertificate({ title, recipientName, kind = "completion" }) {
  const res = await invokeSecureFunction("certificates", { action: "issue", title, recipientName, kind });
  return res?.data?.certificate || null;
}

export async function listCertificates() {
  const res = await invokeSecureFunction("certificates", { action: "list" });
  return res?.data?.certificates || [];
}

/**
 * Public verification — deliberately does NOT require a signed-in user, so anyone
 * holding a code (an employer, a friend) can check it.
 */
export async function verifyCertificate(code) {
  const base = (import.meta.env?.VITE_FUNCTIONS_BASE_URL || "/api").replace(/\/$/, "");
  const response = await fetch(`${base}/certificates`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ action: "verify", code }),
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data?.error || "تعذر التحقق من الشهادة");
  return { valid: Boolean(data.valid), certificate: data.certificate || null };
}

export function certificateVerifyUrl(code) {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/verify/${encodeURIComponent(code)}`;
}
