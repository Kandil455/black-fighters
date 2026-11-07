/**
 * buildOrganizationPlan — the DeepSeek organization step.
 *
 * Owner rules enforced here:
 *   N2  the transcript is never rewritten — the model may return ONLY sentence ids
 *   N3  English is kept English, Arabic kept Arabic (we never touch the words)
 *   N1  no fallback to another model — after N attempts we use a deterministic
 *       structural split (pure code, not a model)
 *
 * The caller injects `callModel` so this module stays testable and free of
 * network calls. Server code passes the CodeCraft/DeepSeek adapter.
 */
import { LECTURE_CONFIG } from "./config.js";
import {
  validateOrganization,
  fallbackOrganization,
} from "./organizationValidator.js";

const SYSTEM_PROMPT = `أنت منظّم محاضرات. عندك جمل مرقّمة من تفريغ صوتي لمحاضرة.
مهمتك: ترتيب أرقام الجمل في أقسام منطقية فقط.

قواعد صارمة لا تُخالَف:
1. ممنوع تمامًا كتابة نص أي جملة. استخدم أرقامها فقط.
2. كل رقم من 1 إلى N لازم يظهر مرة واحدة بالظبط — لا تكرار ولا حذف.
3. احافظ على ترتيب الجمل تصاعديًا داخل كل قسم (ترتيب الدكتور الأصل).
4. صنّف كل قسم بـ kindHint من: concept | steps | compare | exam | example | narration | fluff
5. سخافة وهزار وكلام جانبي ضعها في noise_sentence_ids (واجب ذكر أرقامها).
6. المصطلح الإنجليزي يبقى إنجليزي كما هو، والعربي عربي — في glossary فقط.
7. importance من 1 (عادي) إلى 3 (مهم جدًا للامتحان).
8. أعطِ عنوانًا عربيًا قصيرًا (أقل من 90 حرفًا) لكل قسم.

أرجع JSON فقط بهذا الشكل:
{"sections":[{"title":"...","kindHint":"concept","importance":2,"sentence_ids":[1,2,3]}],"noise_sentence_ids":[],"glossary":[{"term":"ACL","ar":"الرباط الصليبي الأمامي","sentence_ids":[4]}]}`;

function buildUserPrompt(sentences) {
  const lines = sentences.map((s) => `${s.id}. ${s.text}`).join("\n");
  return `عدد الجمل: ${sentences.length}
الجمل:
${lines}`;
}

/** Strip ```json fences the model sometimes adds. */
export function parseJsonLoose(raw) {
  if (raw && typeof raw === "object") return raw;
  const text = String(raw || "").trim();
  if (!text) return null;
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
  const body = fenced ? fenced[1] : text;
  const start = body.indexOf("{");
  const end = body.lastIndexOf("}");
  if (start === -1 || end === -1 || end <= start) return null;
  try {
    return JSON.parse(body.slice(start, end + 1));
  } catch {
    return null;
  }
}

/**
 * Split long transcripts into windows the model can handle coherently.
 * Windowing re-numbers nothing — sentence ids stay global.
 */
export function planWindows(sentences, maxWords = LECTURE_CONFIG.ORGANIZE_WINDOW_WORDS) {
  const windows = [];
  let current = [];
  let words = 0;
  for (const sentence of sentences) {
    const w = String(sentence.text || "").split(/\s+/).filter(Boolean).length;
    if (current.length && words + w > maxWords) {
      windows.push(current);
      current = [];
      words = 0;
    }
    current.push(sentence);
    words += w;
  }
  if (current.length) windows.push(current);
  return windows.length ? windows : [[]];
}

/**
 * @param {{sentences:Array, word_count:number}} transcript
 * @param {{callModel:(args:{system:string,user:string})=>Promise<unknown>}} deps
 */
export async function buildOrganizationPlan(transcript, { callModel } = {}) {
  const sentences = Array.isArray(transcript?.sentences) ? transcript.sentences : [];
  if (sentences.length === 0) {
    return {
      plan: { sections: [], noise_sentence_ids: [], glossary: [] },
      validation: { passed: false, errors: ["EMPTY_TRANSCRIPT"] },
      usedFallback: true,
      attempts: 0,
    };
  }

  const windows = planWindows(sentences);
  const merged = { sections: [], noise_sentence_ids: [], glossary: [] };
  const errors = [];
  let attempts = 0;
  let usedFallback = false;

  for (const [windowIndex, windowSentences] of windows.entries()) {
    const windowTranscript = { sentences: windowSentences };
    let windowPlan = null;

    for (let attempt = 1; attempt <= LECTURE_CONFIG.ORGANIZE_MAX_ATTEMPTS; attempt += 1) {
      attempts += 1;
      let raw;
      try {
        raw = await callModel({
          system: SYSTEM_PROMPT,
          user: buildUserPrompt(windowSentences),
          windowIndex,
        });
      } catch (error) {
        errors.push(`CALL_FAILED:${error?.message || "unknown"}`);
        continue;
      }
      const parsed = parseJsonLoose(raw);
      if (!parsed) {
        errors.push("UNPARSEABLE_JSON");
        continue;
      }
      const validation = validateOrganization(parsed, windowTranscript);
      if (validation.passed) {
        windowPlan = validation.plan;
        break;
      }
      errors.push(...validation.errors);
    }

    if (!windowPlan) {
      // Deterministic structural split — no second model, per owner rule N1.
      windowPlan = fallbackOrganization(windowTranscript);
      usedFallback = true;
    }

    // Offset global ids are already global, so merge directly.
    merged.sections.push(...windowPlan.sections);
    merged.noise_sentence_ids.push(...(windowPlan.noise_sentence_ids || []));
    merged.glossary.push(...(windowPlan.glossary || []));
  }

  // Final whole-document validation (catches cross-window duplication).
  const finalCheck = validateOrganization(merged, transcript);
  if (!finalCheck.passed) {
    const lastResort = fallbackOrganization(transcript);
    return {
      plan: lastResort,
      validation: { passed: false, errors: [...new Set([...errors, ...finalCheck.errors])].slice(0, 20) },
      usedFallback: true,
      attempts,
    };
  }

  return {
    plan: finalCheck.plan,
    validation: finalCheck,
    usedFallback,
    attempts,
  };
}

export { SYSTEM_PROMPT as ORGANIZE_SYSTEM_PROMPT, buildUserPrompt as buildOrganizePrompt };
export default buildOrganizationPlan;
