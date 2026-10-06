import { applicationDefault, cert, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

let parsedServiceAccount = null;
function getServiceAccount() {
  if (parsedServiceAccount) return parsedServiceAccount;
  const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
  if (!raw) return null;
  try {
    const decoded = raw.trim().startsWith("{") ? raw.trim() : Buffer.from(raw.trim(), "base64").toString("utf-8");
    const parsed = JSON.parse(decoded);
    if (parsed.private_key) parsed.private_key = parsed.private_key.replace(/\\n/g, "\n");
    parsedServiceAccount = parsed;
    return parsed;
  } catch (err) {
    console.error("[FirebaseAdmin] Error parsing FIREBASE_SERVICE_ACCOUNT_JSON:", err.message);
    return null;
  }
}

function credentials() {
  const sa = getServiceAccount();
  if (sa) {
    return cert(sa);
  }
  if (process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
    return cert({
      projectId: process.env.FIREBASE_PROJECT_ID || "legendary-study-app",
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
    });
  }
  return applicationDefault();
}

const sa = getServiceAccount();
const resolvedProjectId = sa?.project_id || process.env.FIREBASE_PROJECT_ID || process.env.VITE_FIREBASE_PROJECT_ID || "legendary-study-app";

const app = getApps()[0] || initializeApp({
  credential: credentials(),
  projectId: resolvedProjectId,
});

export const adminDb = getFirestore(app);
export const adminAuth = getAuth(app);
export { FieldValue };

const LOCAL_DEV_ALPHA_USER = {
  uid: "up3y6pub7IgB1PpEMTcMASO2ei33",
  email: "ibrahimkandil000@gmail.com",
  name: "Alpha (Local Trial)",
  email_verified: true,
};

export async function requireUser(event) {
  const isLocalDev = !process.env.VERCEL && !process.env.NETLIFY;
  const header = event.headers.authorization || event.headers.Authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : "";
  if (isLocalDev && (!token || token === "local-dev-bypass-token")) {
    return LOCAL_DEV_ALPHA_USER;
  }
  if (!token) throw new Error("UNAUTHORIZED");
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    if (isLocalDev && !decoded.email) {
      return { ...decoded, email: "ibrahimkandil000@gmail.com" };
    }
    return decoded;
  } catch (err) {
    if (isLocalDev) return LOCAL_DEV_ALPHA_USER;
    throw err;
  }
}

export async function requireAdmin(event) {
  const user = await requireUser(event);
  const allowed = String(process.env.ADMIN_EMAILS || "ibrahimkandil000@gmail.com")
    .split(",").map((value) => value.trim().toLowerCase()).filter(Boolean);
  if (!allowed.includes(String(user.email || "").toLowerCase())) throw new Error("FORBIDDEN_ADMIN");
  return user;
}


