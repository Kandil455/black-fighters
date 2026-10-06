import { calculateSummaryCost } from "./economyCatalog.js";
import { getOfflineSnapshot, setOfflineSnapshot } from "./offlineDb.js";
import {
  SUMMARY_CHUNK_SIZE,
  consolidateMarkdownSections,
  processChunksParallel,
  reduceSummariesHierarchically,
  splitCourseTextAsync,
} from "./courseChunking.js";
import {
  applySummaryColorPolicy,
  insertBeforeSummaryConclusion,
} from "./summaryMarkup.js";
import { isFeatureEnabled } from "./featureFlags.js";
import {
  assembleSummaryDocumentFromFacts,
  extractLocalSummaryFacts,
  mergeSummaryFacts,
  normalizeSummaryFactBatch,
  validateSummaryDocument,
} from "./summaryV3/index.js";
import {
  cancelSummaryJob,
  startSummaryJob,
  updateSummaryJob,
} from "./summaryJobs.js";

const ARABIC = /[\u0600-\u06ff]/g;
const ENGLISH = /[A-Za-z]/g;
const STOP_WORDS = new Set([
  "about", "after", "again", "also", "because", "before", "between", "could", "during", "each", "from", "have", "into", "more", "most", "other", "should", "than", "that", "their", "these", "they", "this", "through", "using", "very", "were", "what", "when", "where", "which", "while", "with", "would",
  "التي", "الذي", "الذين", "هذا", "هذه", "ذلك", "تلك", "هناك", "حيث", "عند", "على", "إلى", "الى", "من", "في", "عن", "مع", "كما", "لكن", "بعد", "قبل", "بين", "يمكن", "يكون", "تكون", "كانت", "وذلك", "أيضا", "أيضاً", "أكثر", "خلال",
]);

export function analyzeDocument(text, fileName = "") {
  const value = String(text || "");
  const arabicCount = (value.match(ARABIC) || []).length;
  const englishCount = (value.match(ENGLISH) || []).length;
  const letters = arabicCount + englishCount;
  const arabicRatio = letters ? arabicCount / letters : 0;
  const englishRatio = letters ? englishCount / letters : 0;
  const sourceLanguage = arabicRatio >= 0.72 ? "ar" : englishRatio >= 0.72 ? "en" : "mixed";
  const language = sourceLanguage === "en" || sourceLanguage === "mixed" ? "bilingual" : "ar";
  const headings = value.split("\n").map((line) => line.trim())
    .filter((line) => /^#{1,3}\s|^\d+[.)-]\s|^[A-Z\u0600-\u06ff][^.!؟]{3,70}$/.test(line))
    .slice(0, 12).map((line) => line.replace(/^#+\s*/, ""));
  const subjectType = /anatomy|physiology|diagnosis|treatment|clinical|تشريح|فسيولوج|تشخيص|علاج|سريري/i.test(value) ? "medical"
    : /equation|formula|circuit|algorithm|physics|معادلة|هندسة|فيزياء|خوارزم/i.test(value) ? "engineering"
      : /article|statute|court|legal|قانون|تشريع|محكمة|مادة قانونية/i.test(value) ? "law"
        : /marketing|finance|management|business|تسويق|تمويل|إدارة أعمال/i.test(value) ? "business"
          : /grammar|vocabulary|linguistic|قواعد|مفردات|لغويات/i.test(value) ? "languages"
            : /history|literature|philosophy|تاريخ|أدب|فلسفة/i.test(value) ? "humanities" : "auto";
  const recommendedStyle = language === "bilingual" ? "bilingual_lecture" : "complete_study_guide";
  const words = value.trim() ? value.trim().split(/\s+/).length : 0;
  return {
    fileName,
    language,
    sourceLanguage,
    sourceLanguageConfidence: Number(Math.max(arabicRatio, englishRatio).toFixed(2)),
    subjectType,
    recommendedStyle,
    headings,
    chars: value.length,
    words,
    estimatedPages: Math.max(1, Math.ceil(words / 300)),
    estimatedChunks: Math.max(1, Math.ceil(value.length / SUMMARY_CHUNK_SIZE)),
    creditCost: calculateSummaryCost(value.length),
  };
}

export async function fingerprintText(text) {
  const bytes = new TextEncoder().encode(String(text || ""));
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return [...new Uint8Array(digest)].map((value) => value.toString(16).padStart(2, "0")).join("");
}

function importantTerms(text) {
  const candidates = String(text || "").match(/[A-Za-z][A-Za-z0-9_-]{4,}|[\u0600-\u06ff]{5,}|\b\d+(?:\.\d+)?%?\b/g) || [];
  const counts = new Map();
  for (const term of candidates) {
    const key = term.toLowerCase();
    if (STOP_WORDS.has(key) || key.length < 4) continue;
    counts.set(key, (counts.get(key) || 0) + 1);
  }
  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || b[0].length - a[0].length)
    .slice(0, 50)
    .map(([term]) => term);
}

function normalizeForCoverage(value) {
  return String(value || "")
    .toLowerCase()
    .replace(/==(?:green|yellow|cyan|orange|red):|==|[*_`#>|]/g, " ")
    .replace(/[^a-z0-9\u0600-\u06ff%+=.-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function uniqueSnippets(items, max = 16) {
  const seen = new Set();
  const result = [];
  for (const item of items) {
    const clean = String(item || "").replace(/^\[صفحة\s+\d+\]\s*/i, "").replace(/\s+/g, " ").trim();
    const key = normalizeForCoverage(clean).slice(0, 160);
    if (!key || seen.has(key)) continue;
    seen.add(key);
    result.push(clean.slice(0, 320));
    if (result.length >= max) break;
  }
  return result;
}

export function extractCriticalItems(text) {
  const segments = String(text || "").split(/\n+|(?<=[.!؟])\s+/).map((item) => item.trim()).filter(Boolean);
  return {
    definitions: uniqueSnippets(segments.filter((line) => /\b(?:definition|defined as|refers to|means|is an?|are)\b|(?:تعريف|يُعر[ّ]?ف|يعرف|يُقصد|هو عبارة|هي عبارة|يعني)/i.test(line))),
    formulas: uniqueSnippets(segments.filter((line) => /(?:^|\s)[A-Za-z][A-Za-z0-9_()]*\s*=|[=±×÷∑√]|(?:equation|formula|law|معادلة|قانون)/i.test(line))),
    examples: uniqueSnippets(segments.filter((line) => /\b(?:example|for example|e\.g\.|case study)\b|(?:مثال|على سبيل المثال|حالة تطبيقية)/i.test(line))),
    pages: [...new Set([...String(text || "").matchAll(/\[صفحة\s+(\d+)\]/gi)].map((match) => Number(match[1])))].sort((a, b) => a - b),
  };
}

function snippetCovered(snippet, normalizedSummary, threshold = 0.55) {
  const normalizedSnippet = normalizeForCoverage(snippet);
  if (!normalizedSnippet) return true;
  if (normalizedSummary.includes(normalizedSnippet.slice(0, 90))) return true;
  const tokens = [...new Set(normalizedSnippet.split(" ").filter((token) => token.length >= 4 && !STOP_WORDS.has(token)))];
  if (!tokens.length) return true;
  const hits = tokens.filter((token) => normalizedSummary.includes(token)).length;
  return hits / tokens.length >= threshold;
}

export function buildCoverageReport(source, summary, options = {}) {
  const terms = importantTerms(source);
  const normalized = normalizeForCoverage(summary);
  const covered = terms.filter((term) => normalized.includes(term));
  const missing = terms.filter((term) => !normalized.includes(term));
  const critical = extractCriticalItems(source);
  const missingDefinitions = critical.definitions.filter((item) => !snippetCovered(item, normalized, 0.55));
  const missingFormulas = critical.formulas.filter((item) => !snippetCovered(item, normalized, 0.75));
  const missingExamples = critical.examples.filter((item) => !snippetCovered(item, normalized, 0.55));
  const citedPages = [...new Set([...String(summary || "").matchAll(/\[صفحة\s+(\d+)\]/gi)].map((match) => Number(match[1])))];
  const termScore = terms.length ? covered.length / terms.length : 1;
  const criticalTotal = critical.definitions.length + critical.formulas.length + critical.examples.length;
  const criticalMissing = missingDefinitions.length + missingFormulas.length + missingExamples.length;
  const criticalScore = criticalTotal ? (criticalTotal - criticalMissing) / criticalTotal : 1;
  const pageScore = critical.pages.length ? Math.min(1, citedPages.length / Math.max(1, Math.ceil(critical.pages.length / 4))) : 1;
  const score = Math.round((termScore * 0.5 + criticalScore * 0.35 + pageScore * 0.15) * 100);
  const h2Count = (String(summary || "").match(/^##\s+/gm) || []).length;
  const highlightCount = (String(summary || "").match(/==(?:green|yellow|cyan|orange|red):[^=]+==/gi) || []).length;
  const words = String(summary || "").trim().split(/\s+/).filter(Boolean).length;
  const contentSections = [...String(summary || "").matchAll(/^##\s+(.+)$/gm)]
    .map((match) => match[1])
    .filter((title) => !/quick overview|summary conclusion|coverage addendum|نظرة سريعة|ملخص سريع|الخلاصة|الخاتمة|استكمال التغطية/i.test(title));
  const arabicExplanationCount = (String(summary || "").match(/\*\*\s*الشرح بالعربي\s*:\s*\*\*/gi) || []).length;
  const requiresBilingualLayout = options.language === "bilingual" || options.style === "bilingual_lecture" || options.style === "ultra_multi_agent";
  const bilingualLayoutOk = !requiresBilingualLayout || (
    arabicExplanationCount >= Math.max(1, Math.min(contentSections.length, 3))
    && /^##\s+.*quick overview/im.test(String(summary || ""))
    && /^##\s+.*summary conclusion/im.test(String(summary || ""))
  );
  const colorLevel = options.colorLevel || "medium";
  const colorLimit = colorLevel === "rich" ? 8 : colorLevel === "none" ? 0 : 4;
  const sectionHighlightCounts = String(summary || "").split(/(?=^##\s+)/gm)
    .map((section) => (section.match(/==(?:green|yellow|cyan|orange|red):[^=]+==/gi) || []).length);
  const colorPolicyOk = sectionHighlightCounts.every((count) => count <= colorLimit);
  return {
    score,
    checkedTerms: terms.length,
    missing: missing.slice(0, 12),
    missingDefinitions: missingDefinitions.slice(0, 6),
    missingFormulas: missingFormulas.slice(0, 6),
    missingExamples: missingExamples.slice(0, 6),
    definitionCount: critical.definitions.length,
    formulaCount: critical.formulas.length,
    exampleCount: critical.examples.length,
    sourcePages: critical.pages.length,
    citedPages: citedPages.length,
    structure: {
      h2Count,
      hasOverview: /^##\s+.*(?:quick overview|نظرة سريعة|ملخص سريع)/im.test(String(summary || "")),
      hasConclusion: /^##\s+.*(?:summary conclusion|الخلاصة|الخاتمة)/im.test(String(summary || "")),
      highlightCount,
      highlightsPerThousandWords: words ? Math.round((highlightCount / words) * 1000) : 0,
      hasBrokenHighlightMarkup: /:(?:green|yellow|cyan|orange|red)==|==[^=]+==:(?:green|yellow|cyan|orange|red)/i.test(String(summary || "")),
      contentSections: contentSections.length,
      arabicExplanationCount,
      bilingualLayoutOk,
      colorPolicyOk,
      sectionHighlightCounts,
    },
    requiresStructureRepair: !bilingualLayoutOk,
    requiresRepair: score < 78 || missingFormulas.length > 0 || missingDefinitions.length > 3 || !bilingualLayoutOk,
  };
}

function optionsFingerprint(value) {
  let hash = 2166136261;
  for (const char of String(value || "")) {
    hash ^= char.charCodeAt(0);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(36);
}

async function generateStructuredSummaryV3({
  text,
  fileName,
  invoke,
  selectedLanguage,
  selectedStyle,
  maxPages,
  colorLevel,
  onProgress,
  signal,
  analysis,
  fingerprint,
  chunks,
  courseId = "",
}) {
  const snapshotKey = `summary-job:v3:${fingerprint}:${selectedStyle}:${selectedLanguage}:${maxPages}:${colorLevel}`;
  const saved = await getOfflineSnapshot(snapshotKey).catch(() => null);
  if (saved?.status === "completed" && saved.document && saved.summary) {
    return {
      summary: saved.summary,
      document: saved.document,
      facts: saved.facts || [],
      analysis: saved.analysis || analysis,
      coverage: saved.coverage || buildCoverageReport(text, saved.summary, { language: selectedLanguage, style: selectedStyle, colorLevel }),
      validation: saved.validation,
      fingerprint,
      chunks: chunks.length,
      jobId: saved.jobId || "",
      resumed: true,
      pipelineVersion: "summary-v3",
    };
  }

  const idempotencyKey = `summary-v3:${fingerprint}:${selectedStyle}:${selectedLanguage}:${maxPages}:${colorLevel}`;
  const started = await startSummaryJob({
    courseId,
    fingerprint,
    totalChunks: chunks.length,
    idempotencyKey,
    config: { templateId: selectedStyle, languageMode: selectedLanguage, colorLevel, maxPages, inputChars: text.length, pipelineVersion: "summary-v3" },
  });
  const jobId = started?.job?.id || "";
  const remoteResult = started?.result;
  if (remoteResult?.document && remoteResult?.summary) {
    const remoteValidation = validateSummaryDocument(remoteResult.document);
    if (remoteValidation.valid) {
      const coverage = remoteResult.coverage || buildCoverageReport(text, remoteResult.summary, {
        language: selectedLanguage,
        style: selectedStyle,
        colorLevel,
      });
      await setOfflineSnapshot(snapshotKey, {
        ...remoteResult,
        analysis: remoteResult.analysis || analysis,
        coverage,
        validation: remoteResult.validation || remoteValidation,
        jobId,
        status: "completed",
        updatedAt: Date.now(),
      }).catch(() => {});
      return {
        ...remoteResult,
        analysis: remoteResult.analysis || analysis,
        coverage,
        validation: remoteResult.validation || remoteValidation,
        fingerprint,
        chunks: chunks.length,
        jobId,
        resumed: true,
        pipelineVersion: "summary-v3",
      };
    }
  }
  const parts = Array.isArray(saved?.parts) && saved.parts.length === chunks.length
    ? [...saved.parts]
    : new Array(chunks.length).fill(null);
  for (const artifact of started?.chunkOutputs || []) {
    const index = Number(artifact?.index);
    if (Number.isInteger(index) && index >= 0 && index < parts.length && Array.isArray(artifact?.output) && artifact.output.length) {
      parts[index] = artifact.output;
    }
  }
  const modelNames = new Set(saved?.modelNames || []);
  const remaining = chunks.map((chunk, index) => ({ chunk, index })).filter(({ index }) => !Array.isArray(parts[index]) || !parts[index].length);

  try {
    await updateSummaryJob(jobId, { status: "running" }).catch(() => {});
    await processChunksParallel(remaining, async ({ chunk, index }) => {
      if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
      onProgress?.({ phase: "map_facts", current: parts.filter((part) => Array.isArray(part) && part.length).length + 1, total: chunks.length, analysis, jobId });
      await updateSummaryJob(jobId, { status: "running", chunkIndex: index, chunkStatus: "running" }).catch(() => {});
      let result;
      try {
        result = await invoke({
          task: "summary_facts",
          text: chunk,
          language: selectedLanguage,
          summaryStyle: selectedStyle,
          summaryMaxPages: maxPages,
          chunkIndex: index,
          totalChunks: chunks.length,
        });
      } catch (error) {
        await updateSummaryJob(jobId, { chunkIndex: index, chunkStatus: "failed", error: error?.message || "FACT_EXTRACTION_FAILED" }).catch(() => {});
        throw error;
      }
      const model = result?.model_actual || result?.model || "";
      if (model) modelNames.add(model);
      let facts = normalizeSummaryFactBatch(result, { sourceText: chunk, chunkIndex: index });
      if (!facts.length) facts = extractLocalSummaryFacts(chunk, { chunkIndex: index, languageMode: selectedLanguage });
      if (!facts.length) throw new Error(`NO_GROUNDED_FACTS_IN_CHUNK:${index + 1}`);
      parts[index] = facts;
      await Promise.all([
        setOfflineSnapshot(snapshotKey, { parts, analysis, jobId, modelNames: [...modelNames], status: "running", updatedAt: Date.now() }).catch(() => {}),
        updateSummaryJob(jobId, {
          status: "running",
          chunkIndex: index,
          chunkStatus: "completed",
          chunkOutput: facts,
          model: model || undefined,
        }).catch(() => {}),
      ]);
      return facts;
    }, { maxConcurrent: 2 });

    if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
    onProgress?.({ phase: "assemble", current: 1, total: 1, analysis, jobId });
    let facts = mergeSummaryFacts(parts, { maxFacts: Math.min(240, Math.max(20, maxPages * 12)) });
    let assembled = null;
    for (let attempt = 0; attempt < 5 && facts.length >= 3; attempt += 1) {
      assembled = assembleSummaryDocumentFromFacts(facts, {
        title: fileName || "Black Fighters Study Summary",
        templateId: selectedStyle,
        languageMode: selectedLanguage,
        colorLevel,
        maxPages,
        sourceFingerprint: fingerprint,
      });
      if (assembled.validation.valid) break;
      const budgetOnly = assembled.validation.errors.every((item) => ["SUMMARY_WORD_BUDGET_EXCEEDED", "DUPLICATE_CONTENT_RATIO"].includes(item.code));
      if (!budgetOnly) break;
      facts = [...facts]
        .sort((a, b) => b.importance - a.importance || a.chunkIndex - b.chunkIndex)
        .slice(0, Math.max(3, Math.floor(facts.length * 0.82)))
        .sort((a, b) => a.chunkIndex - b.chunkIndex);
    }
    if (!assembled?.validation?.valid) {
      const codes = assembled?.validation?.errors?.map((item) => item.code).join(",") || "UNKNOWN";
      throw new Error(`SUMMARY_V3_VALIDATION_FAILED:${codes}`);
    }
    const coverage = {
      ...buildCoverageReport(text, assembled.markdown, { language: selectedLanguage, style: selectedStyle, colorLevel }),
      v3: {
        valid: true,
        groundedFacts: assembled.facts.length,
        sourcePages: assembled.document.metadata?.sourceRefs?.length || 0,
        modelActual: [...modelNames],
        diagnostics: assembled.validation.warnings,
      },
    };
    await Promise.all([
      setOfflineSnapshot(snapshotKey, {
        parts,
        facts: assembled.facts,
        document: assembled.document,
        summary: assembled.markdown,
        analysis,
        coverage,
        validation: assembled.validation,
        jobId,
        modelNames: [...modelNames],
        status: "completed",
        updatedAt: Date.now(),
      }).catch(() => {}),
      updateSummaryJob(jobId, {
        status: "completed",
        model: [...modelNames].join(", "),
        quality: { coverageScore: coverage.score, groundedFacts: assembled.facts.length },
        resultOutput: {
          document: assembled.document,
          summary: assembled.markdown,
          facts: assembled.facts,
          analysis,
          coverage,
          validation: assembled.validation,
          modelActual: [...modelNames],
          pipelineVersion: "summary-v3",
        },
      }).catch(() => {}),
    ]);
    return {
      summary: assembled.markdown,
      document: assembled.document,
      facts: assembled.facts,
      analysis,
      coverage,
      validation: assembled.validation,
      fingerprint,
      chunks: chunks.length,
      jobId,
      modelActual: [...modelNames],
      pipelineVersion: "summary-v3",
    };
  } catch (error) {
    if (signal?.aborted || error?.name === "AbortError") await cancelSummaryJob(jobId).catch(() => {});
    else await updateSummaryJob(jobId, { status: "failed", error: error?.message || "SUMMARY_V3_FAILED" }).catch(() => {});
    throw error;
  }
}

export async function generateHierarchicalSummary({
  text,
  fileName = "",
  invoke,
  language,
  style,
  stylePrompt = "",
  maxPages = 12,
  colorLevel = "medium",
  onProgress,
  signal,
  courseId = "",
  featureFlags = null,
}) {
  const analysis = analyzeDocument(text, fileName);
  const selectedLanguage = language || analysis.language;
  const selectedStyle = style || analysis.recommendedStyle;
  const fingerprint = await fingerprintText(text);
  const chunks = await splitCourseTextAsync(text, SUMMARY_CHUNK_SIZE);
  if (isFeatureEnabled("summary_pipeline_v3", featureFlags)) {
    return generateStructuredSummaryV3({
      text,
      fileName,
      invoke,
      selectedLanguage,
      selectedStyle,
      maxPages,
      colorLevel,
      onProgress,
      signal,
      analysis,
      fingerprint,
      chunks,
      courseId,
    });
  }
  const snapshotKey = `summary-job:v2:${fingerprint}:${selectedStyle}:${selectedLanguage}:${maxPages}:${colorLevel}:${optionsFingerprint(stylePrompt)}`;
  const saved = await getOfflineSnapshot(snapshotKey).catch(() => null);
  if (saved?.status === "completed" && saved.summary) {
    return { summary: saved.summary, analysis: saved.analysis || analysis, coverage: saved.coverage || buildCoverageReport(text, saved.summary, { language: selectedLanguage, style: selectedStyle, colorLevel }), fingerprint, chunks: chunks.length, resumed: true };
  }
  const parts = Array.isArray(saved?.parts) && saved.parts.length === chunks.length
    ? [...saved.parts]
    : new Array(chunks.length).fill(null);
  const remaining = chunks.map((chunk, index) => ({ chunk, index })).filter(({ index }) => !parts[index]);
  await processChunksParallel(remaining, async ({ chunk, index }) => {
    if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
    onProgress?.({ phase: "map", current: parts.filter(Boolean).length + 1, total: chunks.length, analysis });
    const result = await invoke({
      task: "summary",
      text: chunk,
      language: selectedLanguage,
      summaryStyle: selectedStyle,
      summaryMaxPages: maxPages,
      chunkIndex: index,
      totalChunks: chunks.length,
      stylePrompt,
    });
    const markdown = result?.summary_markdown || result?.text || "";
    if (!markdown.trim()) throw new Error(`الجزء ${index + 1} رجع فارغ`);
    parts[index] = markdown;
    await setOfflineSnapshot(snapshotKey, { parts, analysis, updatedAt: Date.now() }).catch(() => {});
    return markdown;
  }, { maxConcurrent: 2 });

  const summary = chunks.length === 1 ? parts[0] : await reduceSummariesHierarchically(
    parts,
    async (groupText, { round, index, total }) => {
      if (signal?.aborted) throw new DOMException("تم الإلغاء", "AbortError");
      onProgress?.({ phase: "reduce", round, current: index + 1, total, analysis });
      const result = await invoke({
        task: "summary",
        text: `ادمج المسودات التالية في ملخص واحد متماسك بدون تكرار. حافظ على التعريفات والقوانين والأمثلة ومراجع الصفحات، ولا تذكر أنها مسودات:\n\n${groupText}`,
        language: selectedLanguage,
        summaryStyle: selectedStyle,
        summaryMaxPages: maxPages,
        chunkIndex: index,
        totalChunks: total,
        stylePrompt,
      });
      return result?.summary_markdown || result?.text || "";
    },
    { onProgress: ({ round, idx, total }) => onProgress?.({ phase: "reduce", round, current: idx + 1, total, analysis }) }
  );
  let finalSummary = applySummaryColorPolicy(consolidateMarkdownSections(summary), colorLevel);
  let coverage = buildCoverageReport(text, finalSummary, { language: selectedLanguage, style: selectedStyle, colorLevel });

  if (coverage.requiresStructureRepair) {
    onProgress?.({ phase: "structure", current: 1, total: 1, analysis });
    const structured = await invoke({
      task: "summary",
      text: `أعد تحرير المسودة التالية فقط لضبط بنيتها دون حذف معلومة أو إضافة حقيقة جديدة. حافظ على مراجع الصفحات والتعريفات والقوانين والأمثلة:\n\n${finalSummary}`,
      language: selectedLanguage,
      summaryStyle: selectedStyle,
      summaryMaxPages: maxPages,
      chunkIndex: 0,
      totalChunks: 1,
      stylePrompt: `${stylePrompt}\nقاعدة إلزامية: Quick Overview مرة واحدة في البداية، ثم في كل قسم نقاط English Study Notes تبدأ من اليسار، يعقبها مباشرة **الشرح بالعربي:** كـ نقاط منظمة تبدأ بـ -، وممنوع نهائياً كتابة أي باراجراف أو فقرة سردية مصمتة. وSummary Conclusion مرة واحدة في النهاية. لا تنقل كل الشرح العربي إلى آخر المستند ولا تخلط اتجاه اللغتين في نفس الجملة.`,
    });
    const candidate = applySummaryColorPolicy(
      consolidateMarkdownSections(String(structured?.summary_markdown || structured?.text || "")),
      colorLevel,
    );
    if (candidate) {
      const candidateCoverage = buildCoverageReport(text, candidate, { language: selectedLanguage, style: selectedStyle, colorLevel });
      if (candidateCoverage.structure.bilingualLayoutOk && candidateCoverage.score >= Math.max(60, coverage.score - 8)) {
        finalSummary = candidate;
        coverage = candidateCoverage;
      }
    }
  }

  if (coverage.requiresRepair) {
    const missingItems = [
      ...coverage.missingDefinitions,
      ...coverage.missingFormulas,
      ...coverage.missingExamples,
    ].slice(0, 14);
    if (missingItems.length) {
      onProgress?.({ phase: "validate", current: 1, total: 1, analysis });
      const repair = await invoke({
        task: "summary",
        text: `هذه معلومات من المصدر لم تظهر بوضوح في الملخص. أنشئ قسماً واحداً بعنوان ## Coverage Addendum. أدرج فقط المعلومات التالية بدون اختلاق أو تكرار، وحافظ على المصطلحات الإنجليزية واشرحها بالعربية عند الوضع الثنائي:\n\n${missingItems.map((item) => `- ${item}`).join("\n")}`,
        language: selectedLanguage,
        summaryStyle: selectedStyle,
        summaryMaxPages: Math.min(3, maxPages),
        chunkIndex: 0,
        totalChunks: 1,
        stylePrompt: "اكتب فقط قسماً بعنوان ## Coverage Addendum بنقاط مرتبة. لا تكتب مقدمة أو Quick Overview أو Summary Conclusion، ولا تضف أي معلومة غير موجودة في النص.",
      });
      const addendum = String(repair?.summary_markdown || repair?.text || "").trim();
      if (addendum) {
        finalSummary = applySummaryColorPolicy(
          consolidateMarkdownSections(insertBeforeSummaryConclusion(finalSummary, addendum)),
          colorLevel,
        );
        coverage = buildCoverageReport(text, finalSummary, { language: selectedLanguage, style: selectedStyle, colorLevel });
      }
    }
  }

  await setOfflineSnapshot(snapshotKey, { parts, summary: finalSummary, analysis, coverage, status: "completed", updatedAt: Date.now() }).catch(() => {});
  return { summary: finalSummary, analysis, coverage, fingerprint, chunks: chunks.length };
}
