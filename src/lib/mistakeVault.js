/**
 * Unified Mistake Vault (بنك الأخطاء الذكي الموحد)
 *
 * Collects wrong answers from both Website quizzes and Telegram Bot quizzes
 * so students can review weak points, read detailed explanations linked to
 * summary sections, and launch a 1-click Mistake Recovery Quiz.
 */

const STORAGE_KEY = "bf_mistake_vault_v1";

function safeReadLocal() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function safeWriteLocal(items) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items.slice(0, 250)));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new CustomEvent("bf:mistake-vault-updated", { detail: { count: items.length } }));
    }
  } catch {
    /* ignore quota errors */
  }
}

export function getMistakeVaultItems({ courseId = null } = {}) {
  const all = safeReadLocal();
  if (!courseId) return all;
  return all.filter((item) => String(item.courseId || "") === String(courseId));
}

export function recordMistake({
  question,
  options = [],
  correctIndex = 0,
  chosenIndex = -1,
  explanation = "",
  topic = "",
  sourceRef = "",
  courseId = "",
  courseTitle = "مراجعة عامة",
  via = "web",
}) {
  if (!question || !Array.isArray(options) || options.length < 2) return null;
  const qText = String(question).trim();
  if (!qText) return null;

  const list = safeReadLocal();
  const existingIdx = list.findIndex((x) => x.question === qText);
  const now = new Date().toISOString();

  const entry = {
    id: existingIdx >= 0 ? list[existingIdx].id : `mv_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    question: qText,
    options: options.map((o) => (typeof o === "object" ? o.text || o.label || String(o) : String(o))),
    correct_index: Number.isFinite(Number(correctIndex)) ? Number(correctIndex) : 0,
    chosen_index: Number.isFinite(Number(chosenIndex)) ? Number(chosenIndex) : -1,
    explanation: String(explanation || ""),
    topic: String(topic || courseTitle || "مفهوم أساسي"),
    source_ref: String(sourceRef || ""),
    courseId: String(courseId || ""),
    courseTitle: String(courseTitle || "مراجعة عامة"),
    via,
    mistakeCount: existingIdx >= 0 ? Number(list[existingIdx].mistakeCount || 1) + 1 : 1,
    updatedAt: now,
  };

  if (existingIdx >= 0) {
    list.splice(existingIdx, 1);
  }
  list.unshift(entry);
  safeWriteLocal(list);
  return entry;
}

export function resolveMistake(questionOrId) {
  if (!questionOrId) return;
  const list = safeReadLocal();
  const filtered = list.filter((item) => item.id !== questionOrId && item.question !== questionOrId);
  safeWriteLocal(filtered);
}

export function clearMistakeVault(courseId = null) {
  if (!courseId) {
    safeWriteLocal([]);
    return;
  }
  const list = safeReadLocal().filter((item) => String(item.courseId || "") !== String(courseId));
  safeWriteLocal(list);
}
