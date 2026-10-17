// Semantic grounding check: a second model reads every content line of a summary
// and flags the ones the SOURCE does not support. Unsupported lines are removed.
// Fail-safe: on any error or unparseable reply the original summary is returned.
import { generateText } from "./ai.js";

const VERIFIER_SYSTEM = `You are a strict fact-checker for study summaries.
You receive a SOURCE text and a numbered list of CLAIMS written from it.
A claim is SUPPORTED only if the SOURCE states it, or states something that directly implies it.
A claim is UNSUPPORTED if it adds a fact, relation, number, causal link, example, or definition the SOURCE does not contain, even if it is true in general knowledge.
Do NOT flag headings, labels, section titles, or pure formatting lines.
Do NOT flag a claim only because you would word it differently; flag it only if its content is absent from the SOURCE.
Return ONLY a JSON object: {"unsupported":[<numbers of unsupported claims>]}. No prose.`;

// Page markers like "(صفحة 3)" are only legitimate if the source itself carries them.
export function stripUnsourcedPages(source, summary) {
  const sourceHasPages = /صفحة\s*\d+|page\s*\d+/i.test(String(source || ""));
  if (sourceHasPages) return String(summary || "");
  return String(summary || "").replace(/\s*\(?\[?صفحة\s*\d+\]?\)?/g, "");
}

const HEADING_OR_RULE = /^\s*(#{1,6}\s|---+\s*$|\*\*ملخص|\*\*ملاحظة|\*Study|\*الملخص)/;

function contentLines(markdown) {
  return String(markdown || "").split("\n").map((line, index) => ({ line, index }))
    .filter(({ line }) => line.trim() && !HEADING_OR_RULE.test(line) && !/^\s*\\\[|^\s*\\\]/.test(line));
}

function parseVerdict(raw) {
  const match = String(raw || "").match(/\{[\s\S]*\}/);
  if (!match) return null;
  try {
    const obj = JSON.parse(match[0]);
    return Array.isArray(obj.unsupported) ? obj.unsupported.map(Number).filter(Number.isInteger) : null;
  } catch { return null; }
}

export async function verifySummaryGrounding({ source, summary, config }) {
  const lines = contentLines(summary);
  if (!lines.length) return { summary, removed: [], checked: 0, ok: true };

  const claims = lines.map(({ line }, i) => `${i + 1}. ${line.replace(/^\s*[-*]\s*/, "").trim()}`).join("\n");
  const prompt = `SOURCE:\n"""\n${source}\n"""\n\nCLAIMS:\n${claims}`;

  let verdict = null;
  try {
    const raw = await generateText(prompt, config, VERIFIER_SYSTEM);
    verdict = parseVerdict(raw);
  } catch {
    verdict = null;
  }
  if (verdict === null) return { summary, removed: [], checked: lines.length, ok: false };

  const drop = new Set(verdict.filter((n) => n >= 1 && n <= lines.length).map((n) => lines[n - 1].index));
  const cleaned = stripUnsourcedPages(source, summary);
  const kept = cleaned.split("\n").filter((_, idx) => !drop.has(idx));
  const removed = [...drop].map((idx) => String(summary).split("\n")[idx]?.trim() || "");
  return { summary: kept.join("\n").replace(/\n{3,}/g, "\n\n"), removed, checked: lines.length, ok: true };
}
