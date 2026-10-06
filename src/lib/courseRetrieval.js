const ARABIC_DIACRITICS = /[\u0610-\u061a\u064b-\u065f\u0670\u06d6-\u06ed]/g;
const PAGE_MARKER = /\[(?:صفحة|page)\s*[:#-]?\s*(\d+)\]/i;
const HEADING_LINE = /^\s{0,3}#{1,6}\s+(.+?)\s*$/m;

const STOP_WORDS = new Set([
  "في", "من", "على", "إلى", "الى", "عن", "ما", "ماذا", "هل", "هو", "هي", "هم", "هذا", "هذه",
  "ذلك", "تلك", "الذي", "التي", "الذين", "كان", "كانت", "يكون", "تكون", "مع", "ثم", "او", "أو",
  "و", "ف", "ب", "ك", "ل", "ال", "كل", "اي", "أي", "عايز", "عاوز", "محتاج", "اشرح", "وضح",
  "لخص", "لي", "ده", "دي", "دا", "هنا", "هناك", "and", "or", "the", "a", "an", "of", "to", "in",
  "on", "for", "from", "with", "is", "are", "was", "were", "be", "been", "this", "that", "these",
  "those", "what", "why", "how", "explain", "summarize", "please", "course", "chapter", "lesson",
]);

function normalizeArabic(value) {
  return value
    .replace(ARABIC_DIACRITICS, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ؤ/g, "و")
    .replace(/ئ/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/ـ/g, "");
}

export function normalizeRetrievalText(value = "") {
  return normalizeArabic(String(value).toLowerCase())
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeRetrievalText(value = "") {
  return normalizeRetrievalText(value)
    .split(" ")
    .filter((token) => token && (token.length > 1 || /^\d+$/.test(token)) && !STOP_WORDS.has(token));
}

function termFrequency(tokens) {
  const frequencies = new Map();
  tokens.forEach((token) => frequencies.set(token, (frequencies.get(token) || 0) + 1));
  return frequencies;
}

function splitLongText(text, maxLength = 900) {
  const clean = String(text || "").trim();
  if (!clean) return [];
  if (clean.length <= maxLength) return [clean];

  const sentences = clean.match(/[^.!?؟؛;\n]+(?:[.!?؟؛;]+|$)/g) || [clean];
  const parts = [];
  let current = "";

  const flush = () => {
    if (current.trim()) parts.push(current.trim());
    current = "";
  };

  sentences.forEach((sentence) => {
    const value = sentence.trim();
    if (!value) return;
    if (value.length > maxLength) {
      flush();
      for (let offset = 0; offset < value.length; offset += maxLength) {
        parts.push(value.slice(offset, offset + maxLength).trim());
      }
      return;
    }
    if (current && current.length + value.length + 1 > maxLength) flush();
    current += `${current ? " " : ""}${value}`;
  });
  flush();
  return parts;
}

function chapterBlocks(chapter, chapterIndex) {
  const chapterTitle = String(chapter?.title || `القسم ${chapterIndex + 1}`).trim();
  const content = String(chapter?.content || chapter?.text || "").trim();
  if (!content) return [];

  const rawBlocks = content
    .split(/\n\s*\n|(?=^\s{0,3}#{1,6}\s+)|(?=^\s*\[(?:صفحة|page)\s*[:#-]?\s*\d+\])/gim)
    .flatMap((block) => splitLongText(block));

  let currentPage = Number(chapter?.page_number ?? chapter?.pageNumber ?? chapter?.source_page) || null;
  let currentSection = chapterTitle;

  return rawBlocks.map((text, blockIndex) => {
    const pageMatch = text.match(PAGE_MARKER);
    if (pageMatch) currentPage = Number(pageMatch[1]);
    const headingMatch = text.match(HEADING_LINE);
    if (headingMatch) currentSection = headingMatch[1].replace(/[*_`#]/g, "").trim() || currentSection;
    return {
      text,
      page: currentPage,
      sectionTitle: currentSection,
      chapterTitle,
      chapterIndex,
      blockIndex,
    };
  });
}

function toChunks(blocks, targetLength = 1800, overlapBlocks = 1) {
  const chunks = [];
  let cursor = 0;

  while (cursor < blocks.length) {
    const selected = [];
    let length = 0;
    let next = cursor;
    let stoppedAtSectionBoundary = false;

    while (next < blocks.length) {
      const block = blocks[next];
      if (selected.length && block.sectionTitle !== selected[0].sectionTitle) {
        stoppedAtSectionBoundary = true;
        break;
      }
      if (selected.length && length + block.text.length + 2 > targetLength) break;
      selected.push(block);
      length += block.text.length + 2;
      next += 1;
      if (length >= targetLength) break;
    }

    if (!selected.length) {
      selected.push(blocks[cursor]);
      next = cursor + 1;
    }

    const first = selected[0];
    const pages = [...new Set(selected.map((block) => block.page).filter(Number.isFinite))];
    chunks.push({
      id: `${first.chapterIndex}:${first.blockIndex}`,
      text: selected.map((block) => block.text).join("\n\n").trim(),
      chapterTitle: first.chapterTitle,
      sectionTitle: selected[selected.length - 1]?.sectionTitle || first.sectionTitle,
      chapterIndex: first.chapterIndex,
      pages,
    });

    if (next >= blocks.length) break;
    cursor = stoppedAtSectionBoundary ? next : Math.max(cursor + 1, next - overlapBlocks);
  }
  return chunks;
}

function contentFingerprint(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  return chapters.map((chapter) => `${chapter?.title || ""}:${String(chapter?.content || chapter?.text || "").length}`).join("|");
}

export function buildCourseRetrievalIndex(course) {
  const chapters = Array.isArray(course?.chapters) ? course.chapters : [];
  const chunks = chapters.flatMap((chapter, chapterIndex) => toChunks(chapterBlocks(chapter, chapterIndex)));
  const documentFrequency = new Map();

  const indexedChunks = chunks.map((chunk) => {
    const tokens = tokenizeRetrievalText(`${chunk.chapterTitle} ${chunk.sectionTitle} ${chunk.text}`);
    const titleTokens = tokenizeRetrievalText(`${chunk.chapterTitle} ${chunk.sectionTitle}`);
    const frequencies = termFrequency(tokens);
    const titleTokenSet = new Set(titleTokens);
    new Set(tokens).forEach((token) => documentFrequency.set(token, (documentFrequency.get(token) || 0) + 1));
    return {
      ...chunk,
      normalizedText: normalizeRetrievalText(chunk.text),
      frequencies,
      titleTokenSet,
      tokenSet: new Set(tokens),
    };
  });

  return {
    courseId: course?.id || null,
    courseTitle: course?.title || "الكورس",
    fingerprint: contentFingerprint(course),
    chunks: indexedChunks,
    documentFrequency,
    sourceCharacterCount: chapters.reduce((sum, chapter) => sum + String(chapter?.content || chapter?.text || "").length, 0),
  };
}

function jaccardSimilarity(left, right) {
  if (!left?.size || !right?.size) return 0;
  let intersection = 0;
  const smaller = left.size <= right.size ? left : right;
  const larger = left.size <= right.size ? right : left;
  smaller.forEach((token) => {
    if (larger.has(token)) intersection += 1;
  });
  return intersection / (left.size + right.size - intersection);
}

function scoreChunk(chunk, queryTokens, queryText, index) {
  if (!queryTokens.length) return 0;
  const uniqueQuery = [...new Set(queryTokens)];
  let score = 0;
  let matched = 0;

  uniqueQuery.forEach((token) => {
    const frequency = chunk.frequencies.get(token) || 0;
    if (!frequency) return;
    matched += 1;
    const documentFrequency = index.documentFrequency.get(token) || 0;
    const idf = Math.log(1 + (index.chunks.length + 1) / (documentFrequency + 1));
    score += (1 + Math.log(frequency)) * idf * (chunk.titleTokenSet.has(token) ? 4.2 : 2.2);
  });

  score += (matched / uniqueQuery.length) * 10;

  const normalizedQuery = normalizeRetrievalText(queryText);
  if (normalizedQuery.length >= 8 && normalizedQuery.length <= 180 && chunk.normalizedText.includes(normalizedQuery)) {
    score += 16;
  }

  for (let index = 0; index < queryTokens.length - 1; index += 1) {
    const phrase = `${queryTokens[index]} ${queryTokens[index + 1]}`;
    if (chunk.normalizedText.includes(phrase)) score += 2.5;
  }
  return score;
}

function fallbackChunks(index, maxChunks) {
  const picked = [];
  const seenChapters = new Set();
  index.chunks.forEach((chunk) => {
    if (picked.length >= maxChunks || seenChapters.has(chunk.chapterIndex)) return;
    picked.push({ ...chunk, score: 0 });
    seenChapters.add(chunk.chapterIndex);
  });
  for (const chunk of index.chunks) {
    if (picked.length >= maxChunks) break;
    if (!picked.some((item) => item.id === chunk.id)) picked.push({ ...chunk, score: 0 });
  }
  return picked;
}

function rankChunks(index, query, maxChunks) {
  const queryTokens = tokenizeRetrievalText(query);
  const ranked = index.chunks
    .map((chunk) => ({ ...chunk, score: scoreChunk(chunk, queryTokens, query, index) }))
    .filter((chunk) => chunk.score > 0)
    .sort((left, right) => right.score - left.score);

  if (!ranked.length) return fallbackChunks(index, maxChunks);

  const selected = [];
  const chapterCounts = new Map();
  for (const candidate of ranked) {
    if (selected.length >= maxChunks) break;
    const perChapter = chapterCounts.get(candidate.chapterIndex) || 0;
    if (perChapter >= 3) continue;
    const tooSimilar = selected.some((item) => jaccardSimilarity(item.tokenSet, candidate.tokenSet) > 0.78);
    if (tooSimilar) continue;
    selected.push(candidate);
    chapterCounts.set(candidate.chapterIndex, perChapter + 1);
  }
  return selected.length ? selected : ranked.slice(0, maxChunks);
}

function sourceLabel(source) {
  const section = source.sectionTitle && source.sectionTitle !== source.chapterTitle
    ? `${source.chapterTitle} / ${source.sectionTitle}`
    : source.chapterTitle;
  const pageText = source.pages.length ? ` — صفحة ${source.pages.join("، ")}` : "";
  return `${section}${pageText}`;
}

export function retrieveCourseContext(index, query, options = {}) {
  const maxChunks = Math.max(1, Number(options.maxChunks) || 7);
  const maxChars = Math.max(2000, Number(options.maxChars) || 16000);
  if (!index?.chunks?.length) {
    return { context: "", sources: [], matchedChunks: 0, indexedChunks: 0, sourceCharacterCount: 0 };
  }

  const ranked = rankChunks(index, query, Math.max(maxChunks * 2, maxChunks));
  const selected = [];
  let usedCharacters = 0;

  for (const chunk of ranked) {
    if (selected.length >= maxChunks) break;
    const remaining = maxChars - usedCharacters;
    if (remaining < 350) break;
    const text = chunk.text.length > remaining ? `${chunk.text.slice(0, remaining).trim()}…` : chunk.text;
    selected.push({ ...chunk, text });
    usedCharacters += text.length;
  }

  const sources = selected.map((chunk, sourceIndex) => ({
    id: `مصدر ${sourceIndex + 1}`,
    label: sourceLabel(chunk),
    chapterTitle: chunk.chapterTitle,
    sectionTitle: chunk.sectionTitle,
    pages: chunk.pages,
    score: Number(chunk.score.toFixed(3)),
  }));

  const context = selected.map((chunk, sourceIndex) => {
    const source = sources[sourceIndex];
    return `### [${source.id}: ${source.label}]\n${chunk.text}`;
  }).join("\n\n");

  return {
    context,
    sources,
    matchedChunks: selected.length,
    indexedChunks: index.chunks.length,
    sourceCharacterCount: index.sourceCharacterCount,
  };
}
