/**
 * htmlEscape — the escape used by lecture export/print rendering.
 *
 * Deliberately identical to escapeHtml() in src/lib/summaryStudyGuide.js so the
 * whole app escapes by one rule, but kept in its own tiny module so the lecture
 * bundle never pulls in the (large) summary study-guide code.
 */
const ESCAPES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };

export function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ESCAPES[char]);
}

export default escapeHtml;
