/**
 * access.mjs — who may use the lecture feature and whether the AI steps are on.
 *
 * Mirrors the existing platform economy: admins are unlimited, everyone else
 * spends credits quoted at creation time. AI post-processing (organize /
 * summary / restyle) additionally requires the server-side DeepSeek key.
 */
import { adminDb } from "../firebase-admin.mjs";
import { isAdminProfile } from "../server-ai.mjs";
import { organizeModelAvailable } from "./deepseek-organize.mjs";

export async function loadProfile(uid) {
  try {
    const snap = await adminDb.collection("users").doc(uid).get();
    return snap.exists ? snap.data() : null;
  } catch {
    return null;
  }
}

/**
 * @param {{uid:string, email?:string}} user
 * @returns {Promise<{isAdmin:boolean, credits:number, canCreate:boolean,
 *   canUseAi:boolean, reason:string|null, charged:boolean}>}
 */
export async function decideLectureAccess(user) {
  const profile = await loadProfile(user?.uid);
  const isAdmin = isAdminProfile(user, profile);
  const credits = Number(profile?.credits || 0);
  const canUseAi = organizeModelAvailable();

  // Creation itself is free — credits are charged when the job is accepted
  // for transcription (so a mis-planned upload never costs the student).
  return {
    isAdmin,
    credits,
    canCreate: true,
    canUseAi,
    reason: null,
    charged: false,
  };
}

/** True when this user may run the paid AI steps on a job they own. */
export function canUseAiFor(access) {
  return Boolean(access?.canUseAi) || Boolean(access?.isAdmin);
}
