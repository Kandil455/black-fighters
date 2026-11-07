import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { synthesizeYouTubeLecture } from "../../src/lib/youtubeService.js";
import { YoutubeTranscript } from "youtube-transcript";

// ─── Server config (keys never reach the client) ───
function serverAiConfig() {
  const geminiKey = process.env.GEMINI_API_KEY || process.env.VITE_GEMINI_API_KEY || "";
  if (geminiKey) {
    return { provider: "gemini", api_key: geminiKey, model: process.env.GEMINI_MODEL || "gemini-3.5-flash-lite" };
  }
  const groqKey = process.env.GROQ_API_KEY || process.env.VITE_GROQ_API_KEY || "";
  if (groqKey) {
    return { provider: "groq", api_key: groqKey, model: process.env.GROQ_MODEL || "openai/gpt-oss-120b" };
  }
  const openrouterKey = process.env.OPENROUTER_API_KEY || process.env.VITE_OPENROUTER_API_KEY || "";
  if (openrouterKey) {
    return { provider: "openrouter", api_key: openrouterKey, model: process.env.OPENROUTER_MODEL || "openrouter/free" };
  }
  throw new Error("NO_API_KEY");
}

const PREMIUM_PLANS = new Set(["starter", "pro", "supreme", "premium"]);

function isPremiumProfile(profile) {
  if (!profile) return false;
  const plan = String(profile.subscription_plan || "").toLowerCase();
  if (PREMIUM_PLANS.has(plan)) return true;
  if (profile.subscription_status === "active") return true;
  const expires = Date.parse(profile.subscription_expires_at || "");
  return Number.isFinite(expires) && expires > Date.now();
}

function isAdminProfile(user, profile) {
  const email = String(user.email || profile?.email || "").toLowerCase();
  return email === "ibrahimkandil000@gmail.com" || profile?.role === "admin";
}

import { calculateYouTubeCost } from "../../src/lib/economyCatalog.js";

// ─── Transcript fetch (server-side, mirrors netlify/functions/youtube-transcript.mjs logic) ───
function extractYouTubeId(urlOrId) {
  if (!urlOrId || typeof urlOrId !== "string") return null;
  const trimmed = urlOrId.trim();
  if (trimmed.length === 11 && !trimmed.includes("/") && !trimmed.includes(".")) return trimmed;
  const patterns = [
    /(?:v=|\/)([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtu\.be\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/embed\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
    /youtube\.com\/shorts\/([0-9A-Za-z_-]{11})(?:[&?\/]|$)/,
  ];
  for (const pattern of patterns) {
    const match = trimmed.match(pattern);
    if (match) return match[1];
  }
  return null;
}

function parseTimeSeconds(val) {
  if (!val) return null;
  if (typeof val === "number") return val;
  const str = String(val).trim();
  const parts = str.split(":").map(Number);
  if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) return parts[0] * 60 + parts[1];
  if (parts.length === 3 && !isNaN(parts[0]) && !isNaN(parts[1]) && !isNaN(parts[2])) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  const num = Number(str);
  return isNaN(num) ? null : num;
}

async function fetchTranscript(videoId, startSec, endSec) {
  const attempts = [{ lang: "ar" }, undefined, { lang: "en" }];
  let lastErr = null;
  for (const opt of attempts) {
    try {
      const items = await YoutubeTranscript.fetchTranscript(videoId, opt);
      if (items && items.length > 0) {
        let filtered = items;
        if (startSec !== null || endSec !== null) {
          filtered = items.filter((i) => {
            const sec = i.offset > 10000 ? i.offset / 1000 : i.offset;
            if (startSec !== null && sec < startSec) return false;
            if (endSec !== null && sec > endSec) return false;
            return true;
          });
        }
        if (filtered.length === 0) filtered = items;
        const text = filtered.map((i) => i.text).join(" ").replace(/\s+/g, " ").trim();
        if (text.length > 30) return { text, hasCaptions: true };
      }
    } catch (e) {
      lastErr = e;
    }
  }
  return { text: "", hasCaptions: false, lastErr: lastErr?.message };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  let jobRef = null;
  let chargedCost = 0;
  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const videoId = extractYouTubeId(body.url);
    if (!videoId) throw new Error("INVALID_YOUTUBE_URL");

    const userRef = adminDb.collection("users").doc(user.uid);
    const profileSnap = await userRef.get();
    const profile = profileSnap.exists ? profileSnap.data() : {};

    // YouTube synthesis charges credits for all non-admin users
    const admin = isAdminProfile(user, profile);

    // 1. Fetch transcript server-side
    const startSec = parseTimeSeconds(body.startTime);
    const endSec = parseTimeSeconds(body.endTime);
    let durationSeconds = Number(body.durationSeconds) || 0;
    if (!durationSeconds && endSec !== null && startSec !== null && endSec > startSec) {
      durationSeconds = endSec - startSec;
    }
    let { text: transcript, hasCaptions } = await fetchTranscript(videoId, startSec, endSec);

    let title = String(body.title || "").trim();
    if (!transcript) {
      // Robust Fallback: fetch title, author, and description from YouTube
      let vTitle = "";
      let vDesc = "";
      let vAuthor = "";
      try {
        const oe = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${videoId}&format=json`).then(r => r.json());
        vTitle = oe.title || "";
        vAuthor = oe.author_name || "";
      } catch {}
      try {
        const pageRes = await fetch(`https://www.youtube.com/watch?v=${videoId}`, {
          headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36' }
        });
        if (pageRes.ok) {
          const html = await pageRes.text();
          if (!vTitle) {
            const tm = html.match(/<title>([^<]*)<\/title>/);
            if (tm) vTitle = tm[1].replace(/- YouTube$/, '').trim();
          }
          const dm = html.match(/<meta name="description" content="([^"]*)"/);
          if (dm) vDesc = dm[1].trim();
        }
      } catch {}

      if (vTitle || vDesc) {
        title = title || vTitle || "محاضرة يوتيوب";
        transcript = vDesc
          ? `محاضرة سريرية متقدمة بعنوان: "${title}" من إعداد "${vAuthor || 'المحاضر'}".\n\nالمحتوى والمحاور العلمية للمحاضرة:\n${vDesc}\n\nيرجى تلخيص واستخلاص الشرح الأكاديمي والسريري والفسيولوجي الشامل وبناء بنك الأسئلة السريري المتكامل لهذا الموضوع بأعلى دقة.`
          : `محاضرة سريرية متقدمة بعنوان: "${title}" من إعداد "${vAuthor || 'المحاضر'}". يرجى تلخيص واستخلاص الشرح الأكاديمي والسريري والفسيولوجي الشامل وبناء بنك الأسئلة السريري المتكامل لهذا الموضوع بأعلى دقة.`;
        hasCaptions = false;
      }
    }

    if (!transcript) {
      throw new Error("فشل جلب الترجمة من فيديو يوتيوب. تأكد من وجود ترجمة أو رابط صحيح.");
    }

    if (!title) title = "محاضرة يوتيوب";
    const mode = ["both", "summary_only", "quiz_only"].includes(body.mode) ? body.mode : "both";
    const quizCount = Math.max(3, Math.min(100, Number(body.quizCount) || 10));
    const jobKey = String(body.jobKey || `${user.uid}_${Date.now()}`).replace(/[^a-zA-Z0-9_-]/g, "").slice(0, 100);

    // 2. Atomic credit deduction: 1 hr = 20 credits, 10 Qs = 5 credits
    const cost = calculateYouTubeCost({
      durationSeconds,
      transcriptChars: transcript.length,
      mode,
      quizCount,
    });

    let chargeInfo = { cost: 0, unlimited: true };
    if (!admin) {
      const ledgerRef = adminDb.collection("creditTransactions").doc(`yt_${user.uid}_${jobKey}`);
      const jobDocRef = adminDb.collection("summaryJobs").doc(`yt_${user.uid}_${jobKey}`);
      chargeInfo = await adminDb.runTransaction(async (transaction) => {
        const [freshUser, existingJob] = await Promise.all([transaction.get(userRef), transaction.get(jobDocRef)]);
        if (!freshUser.exists) throw new Error("المستخدم غير موجود");
        // Idempotent: already charged for this jobKey → reuse
        if (existingJob.exists) {
          const prev = existingJob.data();
          if (prev.status === "charged") return { cost: Number(prev.cost || 0), unlimited: false, reused: true };
          if (prev.status === "completed") throw new Error("هذه العملية اتنفذت خلاص — ابدأ عملية جديدة");
        }
        const before = Number(freshUser.data().credits || 0);
        if (before < cost) {
          throw new Error(`رصيدك غير كافي — العملية تتطلب ${cost} كريدت ومعاك ${before} كريدت. اشحن كريدتس للاستمرار!`);
        }
        const after = Math.max(0, Math.round((before - cost) * 10) / 10);
        transaction.update(userRef, {
          credits: after,
          credits_used: (Number(freshUser.data().credits_used) || 0) + cost,
          updatedAt: FieldValue.serverTimestamp(),
        });
        transaction.set(jobDocRef, {
          user_id: user.uid, task: "youtube_synthesis", cost, status: "charged",
          char_count: transcript.length, video_id: videoId, mode, quiz_count: quizCount,
          duration_seconds: durationSeconds,
          created_at: FieldValue.serverTimestamp(),
        });
        transaction.set(ledgerRef, {
          user_id: user.uid, amount: -cost, balance_before: before, balance_after: after,
          transaction_type: "spend", reason: "youtube_synthesis", reference_id: jobKey,
          idempotency_key: ledgerRef.id, created_at: FieldValue.serverTimestamp(),
        });
        return { cost, unlimited: false, reused: false };
      });
      chargedCost = chargeInfo.cost;
      jobRef = adminDb.collection("summaryJobs").doc(`yt_${user.uid}_${jobKey}`);
    }

    // 3. Run the synthesis on the server with server keys
    let synth;
    try {
      synth = await synthesizeYouTubeLecture({
        transcript,
        title,
        mode,
        quizCount,
        apiKey: serverAiConfig().api_key,
      });
    } catch (synthErr) {
      // 4. Refund on failure (atomic, only if still charged)
      if (chargedCost > 0 && jobRef) {
        await adminDb.runTransaction(async (transaction) => {
          const [freshUser, freshJob] = await Promise.all([transaction.get(userRef), transaction.get(jobRef)]);
          if (!freshJob.exists || freshJob.data().status !== "charged") return;
          const before = Number(freshUser.data().credits || 0);
          const after = before + chargedCost;
          transaction.update(userRef, { credits: after, updatedAt: FieldValue.serverTimestamp() });
          transaction.update(jobRef, { status: "refunded", refunded_at: FieldValue.serverTimestamp() });
          transaction.set(adminDb.collection("creditTransactions").doc(`yt_refund_${user.uid}_${jobKey}`), {
            user_id: user.uid, amount: chargedCost, balance_before: before, balance_after: after,
            transaction_type: "refund", reason: "youtube_synthesis_failed", reference_id: jobKey,
            idempotency_key: `yt_refund_${user.uid}_${jobKey}`, created_at: FieldValue.serverTimestamp(),
          });
        }).catch(() => {});
      }
      throw synthErr;
    }

    // 5. Finalize
    if (jobRef) {
      await jobRef.update({ status: "completed", completed_at: FieldValue.serverTimestamp() }).catch(() => {});
    }

    return json(200, {
      success: true,
      videoId,
      hasCaptions,
      mode,
      markdown: synth.markdown || "",
      quiz: synth.quiz || [],
      charged: chargedCost,
      unlimited: chargeInfo.unlimited,
    });
  } catch (error) {
    return handleError(error);
  }
};
