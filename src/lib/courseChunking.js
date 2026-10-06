// ─── Smart Course Chunking v2 ────────────────────────────────────────────────
// Handles huge PDFs, bilingual content, and parallel AI processing

export const SUMMARY_CHUNK_SIZE = 18000;
const DEFAULT_CHUNK_SIZE = SUMMARY_CHUNK_SIZE;

/**
 * Splits text into AI-digestible chunks.
 * Respects paragraph boundaries, never cuts mid-sentence.
 */
export function splitCourseText(text, maxChars = DEFAULT_CHUNK_SIZE) {
  const clean = String(text || "")
    .replace(/\r\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n") // normalize excessive blank lines
    .trim();

  // Short enough? No split needed
  if (clean.length <= maxChars) return [clean];

  const chunks = [];
  // Split on double newlines (paragraphs), then sentences as fallback
  const paragraphs = clean.split(/\n{2,}/);
  let current = "";

  for (const para of paragraphs) {
    const candidate = current ? `${current}\n\n${para}` : para;

    if (candidate.length <= maxChars) {
      current = candidate;
      continue;
    }

    // Save what we have so far
    if (current) {
      chunks.push(current);
      current = "";
    }

    // Para itself is huge — split by sentences
    if (para.length > maxChars) {
      const sentences = para.split(/(?<=[.؟!])\s+/);
      let buf = "";
      for (const sent of sentences) {
        const next = buf ? `${buf} ${sent}` : sent;
        if (next.length <= maxChars) { buf = next; continue; }
        if (buf) chunks.push(buf);
        // Single sentence bigger than limit — hard split
        if (sent.length > maxChars) {
          for (let i = 0; i < sent.length; i += maxChars) {
            chunks.push(sent.slice(i, i + maxChars));
          }
          buf = "";
        } else {
          buf = sent;
        }
      }
      if (buf) current = buf;
    } else {
      current = para;
    }
  }

  if (current) chunks.push(current);

  return chunks.filter((c) => c.trim().length > 0);
}

/** Uses a module worker for very large strings and falls back for old browsers/tests. */
export async function splitCourseTextAsync(text, maxChars = DEFAULT_CHUNK_SIZE) {
  if (String(text || "").length < maxChars * 2 || typeof Worker === "undefined") {
    return splitCourseText(text, maxChars);
  }
  try {
    const { splitTextInWorker } = await import("./fileWorkerClient");
    return await splitTextInWorker(String(text || ""), maxChars);
  } catch {
    return splitCourseText(text, maxChars);
  }
}

/**
 * Returns chunk info — total chars, estimated pages, etc.
 */
export function getTextStats(text) {
  const safeText = String(text || "");
  const words = safeText.trim() ? safeText.trim().split(/\s+/).length : 0;
  const chars = safeText.length;
  const estimatedPages = Math.ceil(words / 300);
  const chunks = Math.max(1, Math.ceil(chars / DEFAULT_CHUNK_SIZE));
  return { words, chars, estimatedPages, chunks };
}

/** Parses a JSON object even when a model wraps it in prose or Markdown fences. */
export function parseAIJson(raw) {
  if (raw && typeof raw === "object") return raw;
  const clean = String(raw || "")
    .replace(/^\s*```(?:json)?/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  const start = clean.indexOf("{");
  const end = clean.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("الـ AI لم يرجع JSON صالح");
  try {
    return JSON.parse(clean.slice(start, end + 1));
  } catch {
    throw new Error("الـ AI رجع JSON غير مكتمل — بيتم إعادة المحاولة");
  }
}

/**
 * Merges multiple AI-generated course parts into one coherent course.
 * Renumbers chapters, preserves title/metadata from first successful part.
 */
export function mergeCourseParts(parts, fallbackTitle = "كورس جديد") {
  const valid = parts.filter((p) => p && Array.isArray(p.chapters) && p.chapters.length > 0);
  if (!valid.length) throw new Error("AI لم يرجع أي أجزاء صالحة");

  const first = valid[0];
  const isMulti = valid.length > 1;

  const chapters = valid.flatMap((part, pi) =>
    (part.chapters || []).map((ch, ci) => ({
      title: ch.title || `فصل ${pi + ci + 1}`,
      content: ch.content || "",
      ...(isMulti ? { source_part: pi + 1 } : {}),
    }))
  );

  return {
    title: first.title || fallbackTitle,
    description: first.description || "كورس منظم تلقائياً",
    language: first.language || "ar",
    subject: first.subject || "عام",
    level: first.level || "عام",
    doc_type: first.doc_type || "study",
    chapters,
  };
}

/** Converts a final Markdown study sheet to course chapters without dropping text. */
export function markdownToCourseChapters(markdown, fallbackTitle = "الملخص") {
  const value = String(markdown || "").replace(/\r\n/g, "\n").trim();
  if (!value) return [{ title: fallbackTitle, content: "" }];

  const matches = [...value.matchAll(/^##\s+(.+)$/gm)];
  if (!matches.length) return [{ title: fallbackTitle, content: value }];

  const chapters = [];
  const preamble = value.slice(0, matches[0].index).trim();

  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index + matches[i][0].length;
    const end = matches[i + 1]?.index ?? value.length;
    const title = matches[i][1]
      .replace(/[*_`#]/g, "")
      .replace(/==(?:green|yellow|cyan|orange|red):([^=]+)==/gi, "$1")
      .trim() || `قسم ${i + 1}`;
    const content = value.slice(start, end).trim();
    if (content) chapters.push({ title, content });
  }

  if (preamble) {
    if (chapters[0] && /quick overview|نظرة سريعة|ملخص سريع/i.test(chapters[0].title)) {
      chapters[0].content = `${preamble}\n\n${chapters[0].content}`.trim();
    } else {
      chapters.unshift({ title: "Introduction", content: preamble });
    }
  }

  return chapters.length ? chapters : [{ title: fallbackTitle, content: value }];
}

/** Merges repeated H2 sections created at chunk boundaries while preserving content order. */
export function consolidateMarkdownSections(markdown) {
  const value = String(markdown || "").replace(/\r\n/g, "\n").trim();
  const matches = [...value.matchAll(/^##\s+(.+)$/gm)];
  if (matches.length < 2) return value;

  const preamble = value.slice(0, matches[0].index).trim();
  const sections = [];
  const positions = new Map();
  for (let i = 0; i < matches.length; i++) {
    const title = matches[i][1].trim();
    const body = value.slice(matches[i].index + matches[i][0].length, matches[i + 1]?.index ?? value.length).trim();
    const key = title.toLowerCase().replace(/[*_`==:#\s]+/g, " ").trim();
    const existingIndex = positions.get(key);
    if (existingIndex === undefined) {
      positions.set(key, sections.length);
      sections.push({ title, body });
      continue;
    }
    const existing = sections[existingIndex];
    if (/summary conclusion|الخلاصة|الخاتمة/i.test(key)) {
      existing.body = body || existing.body;
    } else if (!/quick overview|نظرة سريعة|ملخص سريع/i.test(key) && body && !existing.body.includes(body)) {
      existing.body = `${existing.body}\n\n${body}`.trim();
    }
  }

  return [preamble, ...sections.map(({ title, body }) => `## ${title}\n${body}`.trim())].filter(Boolean).join("\n\n");
}

/**
 * Processes chunks with:
 * - Parallel processing (up to 3 at a time)
 * - Auto-retry (2 attempts each)
 * - Progress callback
 */
export async function processChunksParallel(chunks, processFn, { onProgress, maxConcurrent = 2 } = {}) {
  const results = new Array(chunks.length).fill(null);
  const BATCH = maxConcurrent;

  for (let i = 0; i < chunks.length; i += BATCH) {
    const batch = chunks.slice(i, i + BATCH);
    const batchPromises = batch.map(async (chunk, bi) => {
      const idx = i + bi;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          onProgress?.({ idx, total: chunks.length, attempt });
          const res = await processFn(chunk, idx);
          return { idx, result: res };
        } catch (err) {
          if (attempt === 3) throw err;
          // Exponential backoff
          const message = String(err?.message || "");
          if (/NO_API_KEY|401|unauthorized|invalid api/i.test(message)) throw err;
          const rateLimited = /429|rate.?limit|quota/i.test(message);
          await new Promise((r) => setTimeout(r, (rateLimited ? 4000 : 1500) * attempt));
        }
      }
    });

    const batchResults = await Promise.all(batchPromises);
    for (const { idx, result } of batchResults) {
      results[idx] = result;
    }
  }

  return results;
}

function groupTextParts(parts, maxChars) {
  const normalized = parts
    .flatMap((part) => splitCourseText(String(part || ""), maxChars))
    .filter(Boolean);
  const groups = [];
  let current = "";
  for (const part of normalized) {
    const marked = `## مسودة مصدر\n${part}`;
    if (current && current.length + marked.length + 6 > maxChars) {
      groups.push(current);
      current = marked;
    } else {
      current = current ? `${current}\n\n---\n\n${marked}` : marked;
    }
  }
  if (current) groups.push(current);
  return groups;
}

/**
 * Consolidates many map summaries without ever sending the entire document in
 * one request. Each round shrinks groups of summaries until one result remains.
 */
export async function reduceSummariesHierarchically(parts, reduceFn, {
  maxChars = 16000,
  maxRounds = 7,
  maxConcurrent = 2,
  onProgress,
} = {}) {
  let current = parts.map((part) => String(part || "").trim()).filter(Boolean);
  if (!current.length) throw new Error("مفيش أجزاء صالحة للدمج");

  for (let round = 1; current.length > 1 && round <= maxRounds; round++) {
    const groups = groupTextParts(current, maxChars);
    current = await processChunksParallel(
      groups,
      (group, index) => reduceFn(group, { round, index, total: groups.length }),
      {
        maxConcurrent,
        onProgress: ({ idx, total }) => onProgress?.({ round, idx, total }),
      }
    );
  }

  return current.length === 1 ? current[0] : current.join("\n\n---\n\n");
}
