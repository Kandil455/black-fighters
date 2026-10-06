// ── Summary AI Agent (server-authoritative) ───────────────────────────────────
// The chat is free; REAL actions cost credits and run ONLY on the server:
//   • apply edit  → /api/ai { name: "summaryAgentEdit" } rewrites the saved
//     summary document (AI_SUMMARY_EDIT_COST) — charged atomically server-side.
//   • create quiz → /api/ai { name: "summaryAgentQuiz" } builds a real
//     StandaloneQuiz + returns its /q/:id link (AI_QUIZ_FROM_SUMMARY_COST per
//     5 questions).
// Everything the AI returns is wrapped in machine-readable action blocks the
// client parses here — the AI never invents costs, the server enforces them.
// The client can no longer spend credits, call AI with platform keys, or write
// documents/quizzes directly from this module.

import { invokeSecureFunction } from './secureFunctions.js';

// ── Action block protocol (parsed from the model reply) ──────────────────────
// <<<APPLY_SUMMARY_EDIT>>\n{ "instruction": "..." }\n<<<END_APPLY_SUMMARY_EDIT>>>
// <<<CREATE_SUMMARY_QUIZ>>>\n{ "count": 5 }\n<<<END_CREATE_SUMMARY_QUIZ>>>

const APPLY_OPEN = '<<<APPLY_SUMMARY_EDIT>>>';
const APPLY_CLOSE = '<<<END_APPLY_SUMMARY_EDIT>>>';
const QUIZ_OPEN = '<<<CREATE_SUMMARY_QUIZ>>>';
const QUIZ_CLOSE = '<<<END_CREATE_SUMMARY_QUIZ>>>';

/** Pure: extract action requests + strip them from the user-visible text. */
export function parseAgentReply(replyText = '') {
  const actions = [];
  let visible = replyText;

  const applyMatch = replyText.match(new RegExp(`${APPLY_OPEN}\\s*([\\s\\S]*?)\\s*${APPLY_CLOSE}`));
  if (applyMatch) {
    try {
      const payload = JSON.parse(applyMatch[1]);
      if (payload?.instruction && typeof payload.instruction === 'string') {
        actions.push({ kind: 'apply_edit', instruction: payload.instruction.slice(0, 2000) });
      }
    } catch { /* malformed block — ignore, chat still renders */ }
    visible = visible.replace(applyMatch[0], '');
  }

  const quizMatch = replyText.match(new RegExp(`${QUIZ_OPEN}\\s*([\\s\\S]*?)\\s*${QUIZ_CLOSE}`));
  if (quizMatch) {
    try {
      const payload = JSON.parse(quizMatch[1]);
      const count = Math.min(20, Math.max(3, Number(payload?.count) || 5));
      actions.push({ kind: 'create_quiz', count });
    } catch { /* ignore */ }
    visible = visible.replace(quizMatch[0], '');
  }

  return { actions, visible: visible.trim() };
}

/** Pure: estimated questions for a summary quiz request. */
export const SUMMARY_QUIZ_DEFAULT_COUNT = 5;

/**
 * Apply an AI edit to the REAL saved summary document.
 * Runs server-side: ownership check, atomic credit charge, AI call with
 * server-only keys, validated document write. Refunded automatically on failure.
 */
export async function applySummaryEdit({ course, instruction }) {
  const res = await invokeSecureFunction('ai', {
    name: 'summaryAgentEdit',
    payload: {
      courseId: course?.id,
      instruction: String(instruction || '').slice(0, 2000),
    },
  });
  const data = res?.data || {};
  if (!data.ok) throw new Error(data.error || 'فشل تعديل الملف');
  return { ok: true, cost: data.cost, credits: data.credits };
}

/**
 * Create a REAL quiz from the summary (with a shareable /q/ link).
 * Runs server-side: ownership check, atomic credit charge (1 credit per 5
 * questions), AI call with server-only keys, quiz written by the server.
 */
export async function createQuizFromSummary({ course, count = SUMMARY_QUIZ_DEFAULT_COUNT }) {
  const res = await invokeSecureFunction('ai', {
    name: 'summaryAgentQuiz',
    payload: {
      courseId: course?.id,
      count: Math.min(20, Math.max(3, Number(count) || SUMMARY_QUIZ_DEFAULT_COUNT)),
    },
  });
  const data = res?.data || {};
  if (!data.ok || !data.quizId) throw new Error(data.error || 'فشل إنشاء الكويز');
  return { quiz: { id: data.quizId, questionCount: data.questionCount }, link: data.link || `/q/${data.quizId}`, cost: data.cost };
}
