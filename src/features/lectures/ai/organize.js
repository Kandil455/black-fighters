/**
 * src/features/lectures/ai/organize.js — Windowed DeepSeek lecture organiser,
 * retry with validation feedback, deterministic fallback, and stitch pass (Section 11).
 */
import { LECTURE_CONFIG } from "../config.js";
import { ORGANIZE_SYSTEM_PROMPT, buildOrganizeWindowUserMessage } from "./prompts.js";
import { validatePlan, repairPlan } from "./validatePlan.js";
import { buildFallbackPlan } from "./fallbackPlan.js";
import { parseJsonLoose } from "../lib/organize.js";
import { extractTermCandidates } from "../text/terms.js";

/**
 * Group sentences into windows of about `ORGANIZE_WINDOW_WORDS` words on sentence boundaries,
 * preferring to end at a chunk boundary (Section 11.1).
 */
export function buildOrganizeWindows(
  sentences = [],
  {
    targetWords = LECTURE_CONFIG.ORGANIZE_WINDOW_WORDS,
    minWords = LECTURE_CONFIG.ORGANIZE_WINDOW_MIN_WORDS,
    maxWords = LECTURE_CONFIG.ORGANIZE_WINDOW_MAX_WORDS,
  } = {},
) {
  const list = Array.isArray(sentences) ? sentences : [];
  if (list.length === 0) return [];

  const windows = [];
  let startIdx = 0;
  let currentWords = 0;

  for (let i = 0; i < list.length; i += 1) {
    const s = list[i];
    const wc = String(s.text || "").trim().split(/\s+/).filter(Boolean).length;
    currentWords += wc;

    const next = list[i + 1];
    const isLast = i === list.length - 1;
    const isChunkBoundary = next && s.chunk != null && next.chunk != null && s.chunk !== next.chunk;

    const shouldCloseAtChunkBoundary = isChunkBoundary && currentWords >= minWords;
    const reachedTarget = currentWords >= targetWords;
    const reachedMax = currentWords >= maxWords;

    if (isLast || shouldCloseAtChunkBoundary || reachedTarget || reachedMax) {
      const slice = list.slice(startIdx, i + 1);
      const contextStart = Math.max(0, startIdx - 3);
      const contextSentences = list.slice(contextStart, startIdx);
      windows.push({
        windowIndex: windows.length,
        fromId: slice[0].id,
        toId: slice[slice.length - 1].id,
        sentences: slice,
        contextSentences,
      });
      startIdx = i + 1;
      currentWords = 0;
    }
  }

  return windows;
}

/**
 * Organise a single window with DeepSeek:
 *   • Attempt 1
 *   • If invalid and repairPlan cannot fix within 30% boundary rule -> Attempt 2 with validation errors appended
 *   • Then deterministic fallback plan (`buildFallbackPlan`)
 */
export async function organizeSingleWindow({
  window,
  previousSectionTitle = null,
  glossaryTerms = [],
  callModel,
  sectionStartNumber = 1,
}) {
  const windowSentences = window.sentences || [];
  let lastErrors = [];
  let attempts = 0;

  if (typeof callModel === "function") {
    for (let attempt = 1; attempt <= 2; attempt += 1) {
      attempts += 1;
      const userMsg = buildOrganizeWindowUserMessage({
        windowSentences,
        contextSentences: window.contextSentences || [],
        previousSectionTitle,
        glossaryTerms,
        validationErrors: attempt > 1 ? lastErrors : [],
      });

      let rawResponse;
      try {
        rawResponse = await callModel({
          system: ORGANIZE_SYSTEM_PROMPT,
          user: userMsg,
          windowIndex: window.windowIndex,
          attempt,
        });
      } catch (err) {
        lastErrors = [`NETWORK_OR_API_ERROR:${err?.message || "unknown"}`];
        continue;
      }

      const parsed = parseJsonLoose(rawResponse);
      if (!parsed) {
        lastErrors = ["UNPARSEABLE_JSON"];
        continue;
      }

      const directCheck = validatePlan(parsed, windowSentences);
      if (directCheck.valid) {
        return {
          windowIndex: window.windowIndex,
          fromId: window.fromId,
          toId: window.toId,
          plan: directCheck.normalizedPlan,
          source: "deepseek",
          attempts,
        };
      }

      const repaired = repairPlan(parsed, windowSentences);
      if (repaired.repaired) {
        return {
          windowIndex: window.windowIndex,
          fromId: window.fromId,
          toId: window.toId,
          plan: repaired.plan,
          source: "deepseek",
          repaired: true,
          attempts,
        };
      }

      lastErrors = directCheck.errors;
    }
  }

  // Deterministic non-AI fallback (Section 11.6)
  const fallback = buildFallbackPlan(windowSentences, { sectionStartNumber });
  return {
    windowIndex: window.windowIndex,
    fromId: window.fromId,
    toId: window.toId,
    plan: fallback,
    source: "fallback",
    attempts,
    errors: lastErrors,
  };
}

/**
 * Stitch pass (Section 11.7, deterministic):
 *   • Merge adjacent sections across window edges when `continues_previous === true` and `kind` matches
 *   • Renumber sections
 *   • Build table of contents (`toc`)
 *   • Collect global term list (deduplicated, first occurrence kept)
 */
export function stitchWindowPlans(windowResults = []) {
  const stitchedSections = [];
  const paragraphBreaks = [];
  const annotations = [];
  const offtopic = [];
  const termMap = new Map();

  for (const winRes of windowResults) {
    const plan = winRes?.plan || {};
    const secs = Array.isArray(plan.sections) ? plan.sections : [];

    for (let i = 0; i < secs.length; i += 1) {
      const sec = secs[i];
      const prev = stitchedSections[stitchedSections.length - 1];
      if (
        i === 0 &&
        prev &&
        sec.continues_previous &&
        prev.kind === sec.kind
      ) {
        prev.to = sec.to;
        prev.sentence_ids = [...(prev.sentence_ids || []), ...(sec.sentence_ids || [])];
        prev.subheadings = [...(prev.subheadings || []), ...(sec.subheadings || [])];
      } else {
        stitchedSections.push({
          ...sec,
          sectionNumber: stitchedSections.length + 1,
          id: `sec-${stitchedSections.length + 1}`,
          windowSource: winRes.source || "deepseek",
          windowIndex: winRes.windowIndex ?? 0,
        });
      }
    }

    if (Array.isArray(plan.paragraph_breaks)) {
      paragraphBreaks.push(...plan.paragraph_breaks);
    }
    if (Array.isArray(plan.annotations)) {
      annotations.push(...plan.annotations);
    }
    if (Array.isArray(plan.offtopic)) {
      offtopic.push(...plan.offtopic);
    }
    if (Array.isArray(plan.terms)) {
      for (const t of plan.terms) {
        if (!t?.en) continue;
        const key = t.en.toLowerCase();
        if (!termMap.has(key)) {
          termMap.set(key, t);
        }
      }
    }
  }

  // Renumber sequentially
  stitchedSections.forEach((sec, idx) => {
    sec.sectionNumber = idx + 1;
    sec.id = `sec-${idx + 1}`;
  });

  const toc = stitchedSections.map((sec) => ({
    id: sec.id,
    sectionNumber: sec.sectionNumber,
    title: sec.title,
    kind: sec.kind,
    from: sec.from,
    to: sec.to,
  }));

  const terms = Array.from(termMap.values());

  return {
    sections: stitchedSections,
    toc,
    paragraph_breaks: Array.from(new Set(paragraphBreaks)),
    annotations,
    offtopic,
    terms,
    glossary: terms.map((t) => ({
      term: t.en,
      ar: t.ar_hint || "",
      sentence_ids: [t.first_id],
    })),
    noise_sentence_ids: offtopic.map((o) => o.from),
    usedFallback: windowResults.some((w) => w.source === "fallback"),
  };
}

/**
 * Full pipeline: build windows, organise with concurrency <= 2 (sequentially to pass previousSectionTitle),
 * and stitch into a unified plan.
 */
export async function organizeTranscriptWindows(
  sentences = [],
  { callModel, glossaryTerms = [], onWindowDone } = {},
) {
  const autoTerms = extractTermCandidates(sentences, { maxTerms: 60 }).map((t) => t.term);
  const combinedGlossary = Array.from(new Set([...glossaryTerms, ...autoTerms])).slice(0, 100);

  const windows = buildOrganizeWindows(sentences);
  const windowResults = [];
  let prevTitle = null;
  let secCounter = 1;

  for (const win of windows) {
    const res = await organizeSingleWindow({
      window: win,
      previousSectionTitle: prevTitle,
      glossaryTerms: combinedGlossary,
      callModel,
      sectionStartNumber: secCounter,
    });
    windowResults.push(res);
    const lastSec = res.plan?.sections?.[res.plan.sections.length - 1];
    if (lastSec?.title) prevTitle = lastSec.title;
    secCounter += res.plan?.sections?.length || 1;
    onWindowDone?.({
      windowsDone: windowResults.length,
      windowsTotal: windows.length,
      windowResult: res,
    });
  }

  const stitched = stitchWindowPlans(windowResults);
  return {
    windows: windowResults,
    stitched,
  };
}

export default {
  buildOrganizeWindows,
  organizeSingleWindow,
  stitchWindowPlans,
  organizeTranscriptWindows,
};
