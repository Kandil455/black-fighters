import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { handleError, json, parseBody } from "./_shared/http.mjs";
import { runAiChat } from "../../src/lib/ai.js";
import { serverAiConfig, checkAiDailyQuota, isAdminProfile, isPremiumProfile } from "./_shared/server-ai.mjs";

// ─── social-actions: server-authoritative social messaging ───────────────────
// Every chat write (DMs, group messages, quiz shares, quiz announcements) goes
// through here so the server can enforce:
//   • friendship / membership before any message is written
//   • content size caps + control-character stripping
//   • a per-user send rate limit (anti-flood)
//   • recipient notifications written by the server (rules forbid client
//     writes to another user's notifications — the old client path never fired)

const MAX_MESSAGE_CHARS = 4000;
const MAX_NAME_CHARS = 80;
const MAX_AVATAR_CHARS = 2048;
const SEND_WINDOW_MS = 60_000;
const SEND_MAX_PER_WINDOW = 25;

// ─── In-memory anti-flood: 25 sends / minute / user (best-effort per instance) ─
const sendMap = new Map();
function sendRateLimit(uid) {
  const now = Date.now();
  const hits = (sendMap.get(uid) || []).filter((t) => now - t < SEND_WINDOW_MS);
  if (hits.length >= SEND_MAX_PER_WINDOW) throw new Error("RATE_LIMITED: بتبعت رسائل بسرعة كبيرة — استنى شوية");
  hits.push(now);
  sendMap.set(uid, hits);
  if (sendMap.size > 5000) sendMap.clear();
}

function cleanText(value, maxChars, fieldName) {
  const text = String(value ?? "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .trim();
  if (!text) throw new Error(`INVALID_${fieldName}`);
  return text.slice(0, maxChars);
}

function cleanName(value) {
  return String(value || "").slice(0, MAX_NAME_CHARS);
}

function cleanAvatar(value) {
  const url = String(value || "");
  return /^https:\/\//.test(url) ? url.slice(0, MAX_AVATAR_CHARS) : "";
}

async function getProfile(uid) {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : {};
}

// Sender must be an ACCEPTED friend of the receiver (or messaging the AI tutor).
async function assertCanDM(uid, receiverId) {
  if (receiverId === "ai") return; // AI tutor thread — handled by aiThreadKey
  const snap = await adminDb.collection("friendships")
    .where("participant_ids", "array-contains", uid)
    .where("status", "==", "accepted")
    .limit(50)
    .get();
  const isFriend = snap.docs.some((doc) => doc.data()?.participant_ids?.includes(receiverId));
  if (!isFriend) throw new Error("FORBIDDEN_THREAD: تقدر تبعت بس لأصدقائك");
}

async function assertGroupMember(uid, groupId) {
  const id = String(groupId || "").trim();
  if (!id || id.length > 180) throw new Error("INVALID_GROUP_ID");
  const snap = await adminDb.collection("studyGroups").doc(id).get();
  if (!snap.exists) throw new Error("GROUP_NOT_FOUND");
  if (!(snap.data()?.member_ids || []).includes(uid)) throw new Error("FORBIDDEN_GROUP: مش عضو في الجروب ده");
  return { id, ...snap.data() };
}

async function createNotification(userId, data) {
  if (!userId || userId === "ai") return;
  try {
    await adminDb.collection("notifications").add({
      user_id: userId,
      type: "social",
      read: false,
      created_at: FieldValue.serverTimestamp(),
      ...data,
    });
  } catch (err) {
    console.warn("[social-actions] notification failed:", err?.message);
  }
}

async function getUserBrief(uid) {
  const profile = await getProfile(uid);
  return {
    sender_id: uid,
    sender_name: cleanName(profile.full_name || profile.email || "مستخدم"),
    sender_avatar: cleanAvatar(profile.avatar_url),
  };
}

// ─── sendDirectMessage: friendship-checked DM (text or quiz share) ───────────
async function sendDirectMessage(user, body) {
  const receiverId = String(body.receiverId || "").trim();
  if (!receiverId || receiverId.length > 180) throw new Error("INVALID_RECEIVER");
  await assertCanDM(user.uid, receiverId);

  const isAi = receiverId === "ai";
  const threadKey = isAi ? `ai__${user.uid}` : [user.uid, receiverId].sort().join("__");
  const sender = await getUserBrief(user.uid);

  let message;
  if (body.quizId) {
    const quizId = String(body.quizId).trim();
    if (!/^[A-Za-z0-9_-]{6,180}$/.test(quizId)) throw new Error("INVALID_QUIZ_ID");
    const quizSnap = await adminDb.collection("standaloneQuizzes").doc(quizId).get();
    if (!quizSnap.exists) throw new Error("QUIZ_NOT_FOUND");
    const quiz = quizSnap.data();
    const isOwner = quiz.owner_id === user.uid || quiz.user_id === user.uid;
    const isPublic = quiz.is_public === true;
    if (!isOwner && !isPublic) throw new Error("FORBIDDEN_QUIZ");
    message = {
      ...sender,
      thread_key: threadKey,
      receiver_id: receiverId,
      is_quiz: true,
      quiz_id: quizId,
      content: `${String(quiz.title || "كويز").slice(0, 200)}\n/q/${quizId}`,
      created_at: FieldValue.serverTimestamp(),
    };
  } else {
    message = {
      ...sender,
      thread_key: threadKey,
      receiver_id: receiverId,
      content: cleanText(body.content, MAX_MESSAGE_CHARS, "CONTENT"),
      is_ai: false,
      created_at: FieldValue.serverTimestamp(),
    };
  }

  const ref = await adminDb.collection("directMessages").add(message);

  if (!isAi) {
    await createNotification(receiverId, {
      title: message.is_quiz ? `${sender.sender_name} أرسل لك كويز 🎯` : `رسالة جديدة من ${sender.sender_name}`,
      body: String(message.content || "").slice(0, 120),
      icon: message.is_quiz ? "target" : "message-circle",
      link: message.is_quiz ? `/q/${message.quiz_id}` : "/friends",
    });
  }

  // AI tutor reply (server-side, billed through the light-usage meter)
  let aiReply = null;
  if (isAi) {
    const profile = await getProfile(user.uid);
    await checkAiDailyQuota(user, profile, "light");
    const config = serverAiConfig();
    const reply = await runAiChat(message.content, Array.isArray(body.history) ? body.history.slice(-10) : [], config, "");
    aiReply = String(reply || "").slice(0, MAX_MESSAGE_CHARS);
    await adminDb.collection("directMessages").add({
      sender_id: "ai",
      sender_name: "توجي AI",
      sender_avatar: "",
      thread_key: threadKey,
      receiver_id: user.uid,
      content: aiReply,
      is_ai: true,
      created_at: FieldValue.serverTimestamp(),
    });
  }

  return { ok: true, messageId: ref.id, aiReply };
}

// ─── sendGroupMessage: membership-checked group message (+ optional @ai) ─────
const AI_TRIGGER = /^(@ai|@blackfighters|@bf|@توجي|@toji)\b/i;

async function sendGroupMessage(user, body) {
  const group = await assertGroupMember(user.uid, body.groupId);
  const content = cleanText(body.content, MAX_MESSAGE_CHARS, "CONTENT");
  const sender = await getUserBrief(user.uid);

  const ref = await adminDb.collection("groupMessages").add({
    ...sender,
    group_id: group.id,
    content,
    is_ai: false,
    created_at: FieldValue.serverTimestamp(),
  });

  // @ai mention → billed AI answer posted into the group by the server
  let aiReply = null;
  if (AI_TRIGGER.test(content)) {
    const profile = await getProfile(user.uid);
    await checkAiDailyQuota(user, profile, "light");
    const question = content.replace(AI_TRIGGER, "").trim().slice(0, MAX_MESSAGE_CHARS);
    const history = (Array.isArray(body.history) ? body.history : [])
      .slice(-8)
      .map((m) => ({ role: m?.is_ai ? "assistant" : "user", content: String(m?.content || "").slice(0, 1800) }));
    const config = serverAiConfig();
    const reply = await runAiChat(question || content, history, config, "");
    aiReply = String(reply || "").slice(0, MAX_MESSAGE_CHARS);
    await adminDb.collection("groupMessages").add({
      sender_id: "ai",
      sender_name: "Black Fighters AI",
      sender_avatar: "",
      group_id: group.id,
      content: aiReply,
      is_ai: true,
      created_at: FieldValue.serverTimestamp(),
    });
  }

  return { ok: true, messageId: ref.id, aiReply };
}

// ─── announceGroupQuiz: create session + announce in group chat ──────────────
async function announceGroupQuiz(user, body) {
  const group = await assertGroupMember(user.uid, body.groupId);
  const quizId = String(body.quizId || "").trim();
  if (!/^[A-Za-z0-9_-]{6,180}$/.test(quizId)) throw new Error("INVALID_QUIZ_ID");
  const quizSnap = await adminDb.collection("standaloneQuizzes").doc(quizId).get();
  if (!quizSnap.exists) throw new Error("QUIZ_NOT_FOUND");
  const quiz = quizSnap.data();
  if (quiz.owner_id !== user.uid && quiz.user_id !== user.uid) throw new Error("FORBIDDEN_QUIZ: مش كويزك");

  const questions = Array.isArray(quiz.questions) ? quiz.questions : [];
  if (!questions.length) throw new Error("QUIZ_HAS_NO_QUESTIONS");
  const timeLimit = Math.min(60, Math.max(1, Number(body.timeLimitMinutes) || 10));
  const sender = await getUserBrief(user.uid);

  const sessionRef = await adminDb.collection("groupQuizSessions").add({
    group_id: group.id,
    quiz_id: quizId,
    quiz_title: String(quiz.title || "كويز").slice(0, 200),
    questions,
    host_id: user.uid,
    host_name: sender.sender_name,
    time_limit_minutes: timeLimit,
    status: "waiting",
    participants: [{ user_id: user.uid, user_name: sender.sender_name, avatar: sender.sender_avatar, score: 0, total: 0, percentage: 0, time_spent_seconds: 0, finished: false }],
    created_at: FieldValue.serverTimestamp(),
    updated_at: FieldValue.serverTimestamp(),
  });

  await adminDb.collection("groupMessages").add({
    ...sender,
    group_id: group.id,
    content: `🎯 بدأت كويز جماعي: "${String(quiz.title || "كويز").slice(0, 120)}" — انضموا بسرعة!`,
    is_ai: false,
    created_at: FieldValue.serverTimestamp(),
  });

  // Notify every member except the host (server-side write)
  const members = (group.member_ids || []).filter((id) => id && id !== user.uid);
  await Promise.all(members.slice(0, 100).map((memberId) =>
    createNotification(memberId, {
      title: `🎯 ${sender.sender_name} بدأ كويز جماعي`,
      body: String(quiz.title || "").slice(0, 120),
      icon: "target",
      link: "/groups",
    }).catch(() => {}),
  ));

  return { ok: true, sessionId: sessionRef.id };
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });
  try {
    const user = await requireUser(event);
    sendRateLimit(user.uid);
    const body = parseBody(event);
    const action = String(body.action || "");

    let result;
    if (action === "sendDirectMessage") result = await sendDirectMessage(user, body);
    else if (action === "sendGroupMessage") result = await sendGroupMessage(user, body);
    else if (action === "announceGroupQuiz") result = await announceGroupQuiz(user, body);
    else return json(400, { error: "UNSUPPORTED_ACTION" });

    return json(200, result);
  } catch (error) {
    if (String(error?.message || "").startsWith("RATE_LIMITED")) {
      return json(429, { error: error.message });
    }
    return handleError(error);
  }
};
