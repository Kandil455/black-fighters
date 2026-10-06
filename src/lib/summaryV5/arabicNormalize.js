/**
 * BLACK FIGHTERS V5 — تطبيع عربي إجباري للبحث والفهرسة (Section 2.2)
 * Removes tashkeel/tatweel, unifies Alef (أ إ آ ٱ -> ا), Yeh/Alef Maqsura (ى ئ -> ي),
 * Teh Marbuta/Heh (ة -> ه), and Eastern Arabic numerals (٠-٩ -> 0-9).
 */

const TASHKEEL_AND_TATWEEL = /[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06DC\u06DF-\u06E8\u06EA-\u06ED\u0640]/g;
const ALEF_VARIANTS = /[\u0622\u0623\u0625\u0671]/g;
const YEH_VARIANTS = /[\u0649\u0626]/g;
const TEH_MARBUTA = /\u0629/g;
const EASTERN_DIGITS = /[٠-٩]/g;

export function normalizeArabicText(input = "") {
  return String(input || "")
    .replace(TASHKEEL_AND_TATWEEL, "")
    .replace(ALEF_VARIANTS, "ا")
    .replace(YEH_VARIANTS, "ي")
    .replace(TEH_MARBUTA, "ه")
    .replace(EASTERN_DIGITS, (d) => String(d.charCodeAt(0) - 0x0660))
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function tokenizeNormalized(input = "") {
  const norm = normalizeArabicText(input);
  if (!norm) return [];
  return norm
    .split(/[^a-z0-9\u0621-\u064A]+/i)
    .map((t) => t.trim())
    .filter((t) => t.length >= 2);
}

/**
 * Builds an inverted + prefix search index for a multi-chapter book (up to 1000 pages).
 * @param {Array<{id: string, number?: number, title: string, pages?: number[], blocks?: Array<{id: string, text: string, page?: number}>}>} chapters
 */
export function createBookSearchIndex(chapters = []) {
  const docs = [];
  const inverted = new Map();

  for (const chapter of chapters) {
    const blocks = Array.isArray(chapter.blocks) ? chapter.blocks : [];
    for (let i = 0; i < blocks.length; i += 1) {
      const blk = blocks[i];
      const rawText = String(blk.text || blk.content?.text || "");
      if (!rawText.trim()) continue;
      const docIndex = docs.length;
      const normText = normalizeArabicText(`${chapter.title || ""} ${rawText}`);
      const tokens = tokenizeNormalized(normText);

      docs.push({
        docIndex,
        chapterId: chapter.id,
        chapterTitle: chapter.title || "",
        blockId: blk.id || `${chapter.id}-b${i}`,
        page: blk.page || chapter.pages?.[0] || 1,
        excerpt: rawText.slice(0, 240),
        normText,
      });

      const uniqueTokens = new Set(tokens);
      for (const token of uniqueTokens) {
        let postings = inverted.get(token);
        if (!postings) {
          postings = [];
          inverted.set(token, postings);
        }
        postings.push(docIndex);
      }
    }
  }

  return { docs, inverted, totalDocs: docs.length };
}

/**
 * Searches the book index using mandatory Arabic normalization.
 */
export function searchBookIndex(index, query = "", limit = 25) {
  if (!index || !Array.isArray(index.docs)) return [];
  const normQuery = normalizeArabicText(query);
  if (!normQuery) return [];
  const queryTokens = tokenizeNormalized(normQuery);
  if (!queryTokens.length) return [];

  const scores = new Map();

  for (const qToken of queryTokens) {
    const exactPostings = index.inverted.get(qToken) || [];
    for (const docIdx of exactPostings) {
      scores.set(docIdx, (scores.get(docIdx) || 0) + 3);
    }
    // Prefix & substring match for morphological variants
    for (const [token, postings] of index.inverted.entries()) {
      if (token !== qToken && (token.startsWith(qToken) || token.includes(qToken))) {
        for (const docIdx of postings) {
          scores.set(docIdx, (scores.get(docIdx) || 0) + 1.5);
        }
      }
    }
  }

  // Exact phrase boost
  const results = [];
  for (const [docIdx, baseScore] of scores.entries()) {
    const doc = index.docs[docIdx];
    const phraseBoost = doc.normText.includes(normQuery) ? 4 : 0;
    results.push({
      chapterId: doc.chapterId,
      chapterTitle: doc.chapterTitle,
      blockId: doc.blockId,
      page: doc.page,
      excerpt: doc.excerpt,
      score: baseScore + phraseBoost,
    });
  }

  results.sort((a, b) => b.score - a.score || a.page - b.page);
  return results.slice(0, limit);
}

export const normalizeArabicForSearch = normalizeArabicText;

export function buildNormalizedBookSearchIndex(pagesOrChapters = []) {
  // Accept either chapters with blocks or flat pages [{ chapterIndex, plateNumber, pageNumber, text }]
  if (pagesOrChapters.length > 0 && !Array.isArray(pagesOrChapters[0]?.blocks)) {
    const syntheticChapters = pagesOrChapters.map((p, idx) => ({
      id: `ch-${p.chapterIndex || 1}`,
      chapterIndex: p.chapterIndex || 1,
      plateNumber: p.plateNumber || idx + 1,
      title: p.title || `Plate ${p.plateNumber || idx + 1}`,
      pages: [p.pageNumber || idx + 1],
      blocks: [
        {
          id: `b-${idx + 1}`,
          page: p.pageNumber || idx + 1,
          text: p.text || "",
          chapterIndex: p.chapterIndex || 1,
          plateNumber: p.plateNumber || idx + 1,
        },
      ],
    }));
    const idxObj = createBookSearchIndex(syntheticChapters);
    idxObj.flatMeta = pagesOrChapters;
    return idxObj;
  }
  return createBookSearchIndex(pagesOrChapters);
}

export function searchNormalizedBookIndex(index, query = "", options = {}) {
  const limit = Number(options.limit || 25);
  const rawResults = searchBookIndex(index, query, limit);
  return rawResults.map((r) => {
    const chapterNum = Number(String(r.chapterId || "1").replace(/\D/g, "")) || 1;
    return {
      ...r,
      chapterIndex: chapterNum,
      plateNumber: r.page,
      pageNumber: r.page,
      snippet: r.excerpt,
    };
  });
}
