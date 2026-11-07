/**
 * lecture-summary.mjs — grounded summary / study version of a lecture.
 *
 * POST /api/lecture-summary
 *   body: {
 *     job_id,
 *     kind: "summary" | "study" | "study_notes" | "summary_detailed" | "summary_medium" | "summary_quick",
 *     force?: boolean
 *   }
 *
 * Every bullet must cite at least one sentence id; unsupported claims are
 * dropped server-side. Nothing is invented (owner rule: no hallucinated content).
 */
import { adminDb, FieldValue, requireUser } from "./_shared/firebase-admin.mjs";
import { json, parseBody, handleError } from "./_shared/http.mjs";
import { parseJsonLoose } from "../../src/features/lectures/lib/organize.js";
import { normalizeForCompare } from "../../src/features/lectures/lib/textNormalize.js";
import { callOrganizeModel, organizeModelAvailable } from "./_shared/lectures/deepseek-organize.mjs";
import { getAdminOrganizerConfig } from "./_shared/lectures/admin-keys.mjs";
import {
  generateStudyNotes,
  generateLectureSummary,
} from "../../src/features/lectures/ai/studyAndSummary.js";
import { formatSentenceId } from "../../src/features/lectures/text/segment.js";

const KINDS = new Set([
  "summary",
  "study",
  "study_notes",
  "summary_detailed",
  "summary_medium",
  "summary_quick",
]);

const SYSTEM_SUMMARY = `أنت مساعد مذاكرة. عندك جمل مرقّمة من محاضرة.
اكتب ملخصًا منظمًا يعتمد حصريًا على هذه الجمل.
قواعد:
1. كل نقطة لازم يكون معاها sentence_ids للجمل اللي جت منها.
2. ممنوع تخترع معلومة مش موجودة في الجمل.
3. احترم اللغة: المصطلح الإنجليزي إنجليزي، والعربي عربي (متحولش).
4. أرجع JSON فقط: {"sections":[{"heading":"...","bullets":[{"point":"...","sentence_ids":[1,2]}]}]}`;

const SYSTEM_STUDY = `أنت مصمم مذاكرة. عندك جمل مرقّمة من محاضرة.
حوّلها لنسخة مذاكرة سهلة الحفظ.
قواعد:
1. كل نقطة معاها sentence_ids.
2. اقترح أسئلة مراجعة (سؤال + إجابة) مبنية على الجمل.
3. ممنوع اختراع معلومة خارج الجمل.
4. أرجع JSON فقط: {"sections":[{"heading":"...","bullets":[{"point":"...","sentence_ids":[1]}]}],"questions":[{"q":"...","a":"...","sentence_ids":[2]}]}`;

function pickSentences(transcript) {
  const sentences = Array.isArray(transcript?.sentences) ? transcript.sentences : [];
  const cap = 1_500;
  let words = 0;
  const chosen = [];
  for (const sentence of sentences) {
    const w = String(sentence.text || "").split(/\s+/).filter(Boolean).length;
    if (words + w > cap && chosen.length) break;
    chosen.push(sentence);
    words += w;
  }
  return { chosen, truncated: chosen.length < sentences.length };
}

function validateGrounded(raw, transcript) {
  const parsed = parseJsonLoose(raw);
  if (!parsed || !Array.isArray(parsed.sections)) return null;
  const byId = new Map((transcript.sentences || []).map((s) => [Number(s.id), s]));
  const sections = [];
  for (const section of parsed.sections) {
    const heading = String(section?.heading || "").trim().slice(0, 120);
    const bullets = [];
    for (const bullet of Array.isArray(section?.bullets) ? section.bullets : []) {
      const point = String(bullet?.point || "").trim();
      if (!point) continue;
      const ids = (Array.isArray(bullet?.sentence_ids) ? bullet.sentence_ids : [])
        .map(Number)
        .filter((id) => byId.has(id));
      if (ids.length === 0) continue;
      const copied = ids.some((id) => normalizeForCompare(byId.get(id).text) === normalizeForCompare(point));
      bullets.push({ point, sentence_ids: ids, verbatim: copied });
    }
    if (heading || bullets.length) sections.push({ heading: heading || "ملخص", bullets });
  }
  const questions = Array.isArray(parsed.questions)
    ? parsed.questions
        .map((q) => {
          const ids = (Array.isArray(q?.sentence_ids) ? q.sentence_ids : [])
            .map(Number)
            .filter((id) => byId.has(id));
          const text = String(q?.q || "").trim();
          const answer = String(q?.a || "").trim();
          return text && answer && ids.length ? { q: text, a: answer, sentence_ids: ids } : null;
        })
        .filter(Boolean)
    : [];
  return sections.length ? { sections, questions } : null;
}

export const handler = async (event) => {
  if (event.httpMethod !== "POST") return json(405, { error: "METHOD_NOT_ALLOWED" });

  try {
    const user = await requireUser(event);
    const body = parseBody(event);
    const jobId = String(body.job_id || "").trim();
    const kind = String(body.kind || "summary");
    const force = Boolean(body.force);
    if (!jobId || !KINDS.has(kind)) return json(400, { error: "INVALID_REQUEST" });

    const jobSnap = await adminDb.collection("lectureJobs").doc(jobId).get();
    if (!jobSnap.exists) return json(404, { error: "NOT_FOUND" });
    if (jobSnap.data().user_id !== user.uid) return json(401, { error: "UNAUTHORIZED" });

    const cacheRef = adminDb.collection("lectureSummaries").doc(`${jobId}_${kind}`);
    if (!force) {
      const cached = await cacheRef.get();
      if (cached.exists) {
        return json(200, { ok: true, cached: true, kind, data: cached.data() });
      }
    }

    const tSnap = await adminDb.collection("lectureTranscripts").doc(jobId).get();
    if (!tSnap.exists) return json(409, { error: "TRANSCRIPT_NOT_READY" });
    const transcript = tSnap.data();
    const orgCfg = await getAdminOrganizerConfig();

    // Handle Phase 7 structured modes (`study_notes`, `summary_detailed`, `summary_medium`, `summary_quick`)
    if (kind === "study_notes" || kind.startsWith("summary_")) {
      const started = Date.now();
      const canonicalSentences = (transcript.sentences || []).map((s, idx) => ({
        ...s,
        id: typeof s.id === "string" && /^s\d+$/.test(s.id) ? s.id : formatSentenceId(s.id ?? idx + 1),
      }));
      const orgSnap = await adminDb.collection("lectureOrganizations").doc(jobId).get();
      const orgData = orgSnap.exists ? orgSnap.data() : {};
      const annotations = Array.isArray(orgData?.annotations) ? orgData.annotations : [];

      const modelCaller = organizeModelAvailable(orgCfg.apiKeys)
        ? ({ system, user: uPrompt }) =>
            callOrganizeModel({
              system,
              user: uPrompt,
              apiKeys: orgCfg.apiKeys,
              baseUrl: orgCfg.baseUrl,
              model: orgCfg.model,
            })
        : null;

      let payload;
      if (kind === "study_notes") {
        payload = await generateStudyNotes(
          [{ id: "sec-1", title: jobSnap.data().title || "المحاضرة", sentences: canonicalSentences }],
          modelCaller,
        );
      } else {
        const level = kind.replace("summary_", "");
        payload = await generateLectureSummary(
          [{ sentences: canonicalSentences }],
          annotations,
          modelCaller,
          { level, totalLectureWords: transcript.word_count || 0 },
        );
      }

      const docData = {
        job_id: jobId,
        user_id: user.uid,
        kind,
        model: orgCfg.model || "deepseek-v4-flash-0731",
        created_at: FieldValue.serverTimestamp(),
        payload,
        disclaimer: "summary_generated",
        took_ms: Date.now() - started,
      };
      await cacheRef.set(docData);
      return json(200, { ok: true, kind, payload });
    }

    if (!organizeModelAvailable(orgCfg.apiKeys)) {
      return json(503, { error: "DEEPSEEK_KEY_MISSING" });
    }

    const { chosen, truncated } = pickSentences(transcript);
    const prompt = `عدد الجمل المتاحة: ${chosen.length}\n${chosen
      .map((s) => `${s.id}. ${s.text}`)
      .join("\n")}`;

    const started = Date.now();
    let validated = null;
    let lastRaw = "";
    for (let attempt = 1; attempt <= 2 && !validated; attempt += 1) {
      lastRaw = await callOrganizeModel({
        system: kind === "study" ? SYSTEM_STUDY : SYSTEM_SUMMARY,
        user: prompt,
        apiKeys: orgCfg.apiKeys,
        baseUrl: orgCfg.baseUrl,
        model: orgCfg.model,
      });
      validated = validateGrounded(lastRaw, transcript);
    }
    if (!validated) return json(502, { error: "UNGROUNDED_SUMMARY" });

    await cacheRef.set({
      job_id: jobId,
      user_id: user.uid,
      kind,
      model: "deepseek-v4-flash-0731",
      created_at: FieldValue.serverTimestamp(),
      sections: validated.sections,
      questions: validated.questions,
      truncated,
      disclaimer: "summary_generated",
      took_ms: Date.now() - started,
    });

    return json(200, {
      ok: true,
      kind,
      sections: validated.sections.length,
      questions: validated.questions.length,
      truncated,
    });
  } catch (error) {
    return handleError(error);
  }
};
