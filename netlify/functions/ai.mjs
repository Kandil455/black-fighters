import { generateText, generateMultimodal, runAiChat, runGenerateStudyContent } from "../../src/lib/ai.js";
import { adminDb, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { serverAiConfig, checkAiDailyQuota, isPremiumProfile, isAdminProfile } from "./_shared/server-ai.mjs";
import { chargeLightUsage } from "./_shared/billing.mjs";
import { runSummaryAgentAction } from "./_shared/summary-agent-core.mjs";

// ─── SECURITY: platform AI keys live only in server env (see _shared/server-ai.mjs) ───

// ─── Input caps: client payloads are untrusted — bound them server-side ──────
const MAX_PROMPT_CHARS = 120_000;
const MAX_HISTORY_ITEMS = 40;
const MAX_HISTORY_ITEM_CHARS = 4_000;
const MAX_MEDIA_PARTS = 6;
const MAX_MEDIA_B64_CHARS = 8_000_000; // ~6 MB binary per image part

function assertPayloadLimits(payload = {}) {
  for (const field of ["prompt", "message", "systemPrompt", "courseContext"]) {
    if (typeof payload[field] === "string" && payload[field].length > MAX_PROMPT_CHARS) {
      throw new Error("INVALID_PAYLOAD: الطلب أكبر من الحد المسموح");
    }
  }
  if (Array.isArray(payload.history)) {
    if (payload.history.length > MAX_HISTORY_ITEMS) payload.history = payload.history.slice(-MAX_HISTORY_ITEMS);
    for (const item of payload.history) {
      const text = String(item?.content || item?.text || item || "");
      if (text.length > MAX_HISTORY_ITEM_CHARS) {
        if (typeof item === "object" && item) {
          if (typeof item.content === "string") item.content = item.content.slice(0, MAX_HISTORY_ITEM_CHARS);
          else if (typeof item.text === "string") item.text = item.text.slice(0, MAX_HISTORY_ITEM_CHARS);
        }
      }
    }
  }
  if (Array.isArray(payload.mediaParts)) {
    if (payload.mediaParts.length > MAX_MEDIA_PARTS) throw new Error("INVALID_PAYLOAD: عدد الصور أكبر من الحد المسموح");
    for (const part of payload.mediaParts) {
      if (String(part?.inlineData?.data || "").length > MAX_MEDIA_B64_CHARS) {
        throw new Error("INVALID_PAYLOAD: حجم الصورة أكبر من الحد المسموح");
      }
    }
  }
}

// ─── Heavy task gating: free users must have a charged AI job from the last 3 hours ───
// (quiz / summary / flashcards chunks are pre-charged via charge-ai-job; this prevents
//  calling the expensive generation endpoints without paying.)
async function requireRecentChargedJob(user) {
  const profileSnap = await adminDb.collection("users").doc(user.uid).get();
  const profile = profileSnap.exists ? profileSnap.data() : {};
  if (isAdminProfile(user, profile) || isPremiumProfile(profile)) return;

  const snap = await adminDb.collection("summaryJobs")
    .where("user_id", "==", user.uid)
    .where("status", "==", "charged")
    .limit(10)
    .get();
  const cutoff = Date.now() - 3 * 60 * 60 * 1000;
  const hasRecent = snap.docs.some((doc) => {
    const created = doc.data().created_at;
    const ms = typeof created?.toMillis === "function" ? created.toMillis() : Date.parse(created || "");
    return Number.isFinite(ms) && ms >= cutoff;
  });
  if (!hasRecent) {
    throw new Error("لا يوجد طلب AI مُدفع حديث — يتم خصم الكريدتس عند بدء كل عملية تلخيص أو كويز");
  }
}

// ─── Best-effort per-instance rate limit: 30 requests / 5 minutes / user ───
const RATE_WINDOW_MS = 5 * 60 * 1000;
const RATE_MAX = 30;
const rateMap = new Map();
function rateLimit(uid) {
  const now = Date.now();
  const hits = (rateMap.get(uid) || []).filter((t) => now - t < RATE_WINDOW_MS);
  if (hits.length >= RATE_MAX) throw new Error("RATE_LIMITED: طلبات كثيرة — انتظر قليلاً");
  hits.push(now);
  rateMap.set(uid, hits);
  if (rateMap.size > 5000) rateMap.clear();
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    rateLimit(user.uid);
    const { name, payload = {} } = parseBody(event);
    assertPayloadLimits(payload);
    const hasMedia = Array.isArray(payload.mediaParts) && payload.mediaParts.length > 0;
    const config = serverAiConfig(hasMedia);
    const profileSnap = await adminDb.collection("users").doc(user.uid).get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    if (name === "aiChat") {
      await chargeLightUsage(user, profile);
      const reply = await runAiChat(payload.message, payload.history || [], config, payload.courseContext || "");
      return json(200, { reply, text: reply });
    }
    if (name === "courseAssistant" || name === "generateText") {
      await chargeLightUsage(user, profile);
      const effectivePrompt = payload.prompt
        || (Array.isArray(payload.messages)
          ? payload.messages.map((m) => String(m?.content || m?.text || "")).filter(Boolean).join("\n\n")
          : "");
      // Multimodal passthrough (vision): mediaParts = [{ inlineData: { data, mimeType } }]
      if (Array.isArray(payload.mediaParts) && payload.mediaParts.length > 0) {
        const text = await generateMultimodal(effectivePrompt, payload.mediaParts, config, payload.systemPrompt || null);
        return json(200, name === "generateText" ? { text } : { reply: text, text });
      }
      const text = await generateText(effectivePrompt, config, payload.systemPrompt || null);
      return json(200, name === "generateText" ? { text } : { reply: text, text });
    }
    if (name === "summaryAgentEdit" || name === "summaryAgentQuiz") {
      const result = await runSummaryAgentAction(user, name, payload);
      return json(200, result);
    }
    if (name === "aiGenerate" || name === "generateStudyContent") {
      const task = String(payload.task || (name === "aiGenerate" ? "summary" : ""));
      if (task === "quiz_source_analysis" || task === "quiz_audit") {
        // Cheap pre-charge analysis or on-demand quiz verification call
        await chargeLightUsage(user, profile);
      } else {
        await requireRecentChargedJob(user);
        await checkAiDailyQuota(user, profile, "heavy");
      }
      const result = await runGenerateStudyContent(
        name === "aiGenerate" ? { ...payload, task: task || "summary" } : payload,
        config,
      );
      if (name === "aiGenerate") {
        const text = result?.summary_markdown || result?.text || JSON.stringify(result);
        return json(200, { result: { summary_markdown: text }, text });
      }
      return json(200, { result });
    }
    return json(400, { error: "UNSUPPORTED_AI_ACTION" });
  } catch (error) {
    if (String(error?.message || "").startsWith("RATE_LIMITED")) {
      return json(429, { error: error.message });
    }
    return handleError(error);
  }
};
