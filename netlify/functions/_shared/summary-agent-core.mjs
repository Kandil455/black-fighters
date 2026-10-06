import { adminDb, FieldValue } from "./firebase-admin.mjs";
import { generateText } from "../../../src/lib/ai.js";
import { AI_SUMMARY_EDIT_COST, AI_QUIZ_FROM_SUMMARY_COST } from "../../../src/lib/creditCosts.js";
import { getSummaryDocumentV3 } from "../../../src/lib/summaryDocument.js";
import { getSummaryDocumentText } from "../../../src/lib/summaryV3/document.js";
import { migrateLegacySummaryMarkdown } from "../../../src/lib/summaryV3/legacy.js";
import { validateSummaryDocument } from "./summary-documents.mjs";
import { checkAiDailyQuota, refundCreditsAtomic, releaseAiDailyQuota, spendCreditsAtomic, serverAiConfig } from "./server-ai.mjs";

const MAX_INSTRUCTION_CHARS = 2000;
const QUIZ_MIN_COUNT = 3;
const QUIZ_MAX_COUNT = 20;
const SUMMARY_TEXT_SLICE = 24000;

function cleanInstruction(value) {
  const text = String(value || "")
    // eslint-disable-next-line no-control-regex
    .replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, " ")
    .trim();
  if (!text) throw new Error("INVALID_INSTRUCTION");
  return text.slice(0, MAX_INSTRUCTION_CHARS);
}

async function getProfile(uid) {
  const snap = await adminDb.collection("users").doc(uid).get();
  return snap.exists ? snap.data() : {};
}

async function getOwnedCourse(uid, courseId) {
  const id = String(courseId || "").trim();
  if (!id || id.length > 180) throw new Error("INVALID_COURSE_ID");
  const snap = await adminDb.collection("courses").doc(id).get();
  if (!snap.exists) throw new Error("COURSE_NOT_FOUND");
  const course = { id: snap.id, ...snap.data() };
  if (course.user_id !== uid) throw new Error("FORBIDDEN_COURSE");
  return course;
}

async function getOwnedSummaryRecord(uid, courseId) {
  const snap = await adminDb.collection("generatedContent")
    .where("course_id", "==", courseId)
    .where("user_id", "==", uid)
    .where("content_type", "==", "summary")
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  let parsed = null;
  try {
    const raw = doc.data()?.content;
    parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  } catch { parsed = null; }
  return { ref: doc.ref, data: doc.data(), doc: parsed };
}

// ─── Action 1: apply an AI edit to the REAL saved summary document ───────────
export async function summaryAgentEdit(user, body) {
  const course = await getOwnedCourse(user.uid, body.courseId);
  const instruction = cleanInstruction(body.instruction);
  const profile = await getProfile(user.uid);

  const record = await getOwnedSummaryRecord(user.uid, course.id);
  const summaryDoc = record?.doc;
  const sourceMd =
    (typeof summaryDoc?.edited_summary_markdown === "string" && summaryDoc.edited_summary_markdown) ||
    (typeof summaryDoc?.summary_markdown === "string" && summaryDoc.summary_markdown) ||
    getSummaryDocumentV3(summaryDoc)?.source_markdown ||
    "";
  const v3 = getSummaryDocumentV3(summaryDoc);
  if (!v3 && !sourceMd) throw new Error("NO_SAVED_SUMMARY: مفيش تلخيص محفوظ ليه ملف — اعمل تلخيص الأول");

  const previous = v3 || migrateLegacySummaryMarkdown(sourceMd || "");
  const prompt = [
    "أنت محرّر أكاديمي خبير. عدّل ملف التلخيص التالي حسب تعليمات الطالب.",
    "أعد الملف المعدَّل كاملاً بصيغة Markdown فقط — بدون مقدمات وبدون شرح التعديلات.",
    "احافظ على كل المحتوى غير المتعلق بالتعديل، وبنفس اللغة، ونفس ترتيب الأقسام ما لم يُطلب غير ذلك.",
    "",
    `تعليمات التعديل: ${instruction}`,
    "",
    "── الملف الحالي ──",
    sourceMd || "(ملف فارغ — أنشئ محتوى ملخص من عنوان الكورس)",
  ].join("\n");

  // Charge BEFORE spending platform AI tokens; refund on failure.
  const pay = await spendCreditsAtomic(user.uid, {
    cost: AI_SUMMARY_EDIT_COST, reason: "ai_summary_edit", referenceId: course.id,
  });
  // Meter AFTER the charge: a broke user must never burn a quota unit, and a
  // quota rejection must refund the charge. `metered` guards the release so we
  // only give back a unit that was actually consumed.
  let metered = false;
  try {
    await checkAiDailyQuota(user, profile, "heavy");
    metered = true;
    const reply = await generateText(prompt, serverAiConfig(), "أنت محرر تلخيصات دقيق. أخرج Markdown فقط.");
    const revisedMd = String(reply || "").replace(/^```(?:markdown)?\s*|\s*```$/g, "").trim();
    if (!revisedMd) throw new Error("الرد فاضي من الـ AI");

    const nextDoc = migrateLegacySummaryMarkdown(revisedMd, {
      meta: {
        ...(previous?.meta || {}),
        title: previous?.meta?.title || course?.title || "تلخيص",
        edited_by_ai: true,
        edited_at: new Date().toISOString(),
      },
    });
    if (!nextDoc?.blocks?.length && !nextDoc?.sections?.length) throw new Error("تعذر بناء الملف المعدّل");
    validateSummaryDocument(nextDoc); // server-side safety gate on what we persist

    const payload = {
      ...(summaryDoc || {}),
      summary_document_v3: nextDoc,
      edited_summary_markdown: revisedMd,
    };
    if (record) {
      await record.ref.update({
        content: JSON.stringify(payload),
        updated_at: FieldValue.serverTimestamp(),
      });
    } else {
      await adminDb.collection("generatedContent").add({
        user_id: user.uid,
        course_id: course.id,
        content_type: "summary",
        content: JSON.stringify(payload),
        created_at: FieldValue.serverTimestamp(),
        updated_at: FieldValue.serverTimestamp(),
      });
    }
    return { ok: true, action: "edit", cost: AI_SUMMARY_EDIT_COST, credits: pay.credits };
  } catch (err) {
    if (pay.charged) {
      await refundCreditsAtomic(user.uid, {
        amount: AI_SUMMARY_EDIT_COST, reason: "ai_summary_edit", referenceId: course.id,
      });
    }
    if (metered) await releaseAiDailyQuota(user, profile, "heavy");
    throw err;
  }
}

// ─── Action 2: create a REAL quiz from the summary (shareable /q/:id) ────────
function normalizeQuestions(parsed, count) {
  const questions = (Array.isArray(parsed) ? parsed : [])
    .filter((q) => q?.question && Array.isArray(q.options) && q.options.length >= 2)
    .slice(0, count)
    .map((q, idx) => {
      const options = q.options.map(String).slice(0, 6);
      let correctIndex = Number(q.correct_index ?? q.correct ?? q.correctOption);
      if (!Number.isInteger(correctIndex) || correctIndex < 0 || correctIndex >= options.length) {
        const asText = String(q.correct_answer ?? "").trim();
        const byText = options.findIndex((o) => o === asText);
        const byLetter = /^[A-Za-z]$/.test(asText)
          ? options.findIndex((o) => o === asText.toUpperCase() + ")" || o === asText.toLowerCase() + ")")
          : -1;
        correctIndex = byText >= 0 ? byText : byLetter >= 0 ? byLetter : 0;
      }
      return {
        id: `q_${idx + 1}`,
        question: String(q.question).slice(0, 1200),
        options,
        correct_index: correctIndex,
        correct_answer: options[correctIndex],
        explanation: String(q.explanation || "").slice(0, 1200),
      };
    });
  if (!questions.length) throw new Error("لم يتم استخراج أسئلة صالحة");
  return questions;
}

export async function summaryAgentQuiz(user, body) {
  const course = await getOwnedCourse(user.uid, body.courseId);
  const profile = await getProfile(user.uid);

  const count = Math.min(QUIZ_MAX_COUNT, Math.max(QUIZ_MIN_COUNT, Number(body.count) || 5));
  const blocks = Math.max(1, Math.ceil(count / 5));
  const cost = blocks * AI_QUIZ_FROM_SUMMARY_COST; // 1 credit per 5 questions

  const record = await getOwnedSummaryRecord(user.uid, course.id);
  const v3 = getSummaryDocumentV3(record?.doc);
  const summaryText = (v3 ? getSummaryDocumentText(v3) : "").slice(0, SUMMARY_TEXT_SLICE);

  const prompt = [
    `أنشئ ${count} أسئلة اختيار من متعدد (MCQ) من محتوى التلخيص التالي.`,
    "أعد النتيجة JSON فقط بهذا الشكل بالضبط — بدون أي نص إضافي:",
    '[{"question":"...","options":["أ","ب","ج","د"],"correct_answer":"أ","explanation":"..."}]',
    "الأسئلة على المحتوى فقط، بأربع خيارات، وإجابة صحيحة واحدة.",
    "",
    "── محتوى التلخيص ──",
    summaryText || `عنوان الكورس: ${course?.title}`,
  ].join("\n");

  const pay = await spendCreditsAtomic(user.uid, {
    cost, reason: "ai_quiz_from_summary", referenceId: course.id,
  });
  // Meter AFTER the charge — see summaryAgentEdit for the ordering rationale.
  let metered = false;
  try {
    await checkAiDailyQuota(user, profile, "heavy");
    metered = true;
    const reply = await generateText(prompt, serverAiConfig(), "أنت مولّد كويزات. أخرج JSON صالحاً فقط.");
    const match = String(reply || "").match(/\[[\s\S]*\]/);
    if (!match) throw new Error("الـ AI لم يرجع JSON صالح");
    const questions = normalizeQuestions(JSON.parse(match[0]), count);

    const quizData = {
      owner_id: user.uid,
      user_id: user.uid,
      owner_name: profile.full_name || profile.email || "",
      title: `🎯 كويز AI: ${course?.title || "ملخص"}`,
      description: "كويز مولّد بالذكاء الاصطناعي من ملخص الكورس",
      subject: course?.subject || "عام",
      is_public: true,
      generated_by: "summary_agent",
      questions,
      created_at: FieldValue.serverTimestamp(),
      updated_at: FieldValue.serverTimestamp(),
    };
    const ref = await adminDb.collection("standaloneQuizzes").add(quizData);
    return { ok: true, action: "quiz", quizId: ref.id, link: `/q/${ref.id}`, questionCount: questions.length, cost, credits: pay.credits };
  } catch (err) {
    if (pay.charged) {
      await refundCreditsAtomic(user.uid, { amount: cost, reason: "ai_quiz_from_summary", referenceId: course.id });
    }
    if (metered) await releaseAiDailyQuota(user, profile, "heavy");
    throw err;
  }
}

// ─── Entry point used by ai.mjs router ───────────────────────────────────────
export async function runSummaryAgentAction(user, name, body) {
  if (name === "summaryAgentEdit") return summaryAgentEdit(user, body);
  if (name === "summaryAgentQuiz") return summaryAgentQuiz(user, body);
  throw new Error("UNSUPPORTED_AI_ACTION");
}
