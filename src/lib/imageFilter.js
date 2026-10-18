/**
 * imageFilter.js
 * Multi-stage filtering, local visual/OCR inspection, and AI quiz generation for extracted images.
 * Stage 1: Fast client-side pixel heuristics + Visual Modality Signature (Canvas API)
 * Stage 2: Local Embedded Text OCR (Tesseract.js singleton worker) + Vision classification
 * Stage 3: Precision-aligned OSCE/OSPE Quiz Generation (works seamlessly with DeepSeek text API & Multimodal Vision)
 */

import { generateMultimodal, generateText, GEMINI_KEYS_POOL } from "./ai.js";

/**
 * Compute 64-bit Average Hash (aHash) for fast perceptual duplicate matching
 */
async function computeAverageHash(imgElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  try {
    ctx.drawImage(imgElement, 0, 0, 8, 8);
    const imgData = ctx.getImageData(0, 0, 8, 8).data;

    let sum = 0;
    const grays = new Uint8Array(64);

    for (let i = 0; i < 64; i++) {
      const idx = i * 4;
      const gray = Math.round(
        0.299 * imgData[idx] + 0.587 * imgData[idx + 1] + 0.114 * imgData[idx + 2]
      );
      grays[i] = gray;
      sum += gray;
    }

    const avg = sum / 64;
    let hash = "";
    for (let i = 0; i < 64; i++) {
      hash += grays[i] >= avg ? "1" : "0";
    }
    return hash;
  } finally {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Compute Hamming distance between two 64-bit binary hash strings
 */
function hammingDistance(hashA = "", hashB = "") {
  if (!hashA || !hashB || hashA.length !== hashB.length) return 64;
  let dist = 0;
  for (let i = 0; i < hashA.length; i++) {
    if (hashA[i] !== hashB[i]) dist++;
  }
  return dist;
}

/**
 * Analyze raw pixel distribution, entropy, edge density, and clinical visual modality using Canvas
 */
async function analyzeImagePixels(dataUrl) {
  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";

    img.onload = async () => {
      const width = img.naturalWidth || img.width;
      const height = img.naturalHeight || img.height;

      if (!width || !height) {
        resolve({
          width: 0,
          height: 0,
          aspectRatio: 1,
          isLowVariance: true,
          isHighTransparency: false,
          visualSignature: "Unknown visual",
          edgeDensity: 0,
          hash: "",
        });
        return;
      }

      const aspectRatio = width / height;

      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });

      if (!ctx) {
        resolve({
          width,
          height,
          aspectRatio,
          isLowVariance: false,
          isHighTransparency: false,
          visualSignature: "Clinical / Academic Figure",
          edgeDensity: 0.1,
          hash: "",
        });
        return;
      }

      try {
        ctx.drawImage(img, 0, 0, 64, 64);
        const imgData = ctx.getImageData(0, 0, 64, 64).data;
        const totalPixels = 64 * 64;

        let transparentPixels = 0;
        let luminanceSum = 0;
        let luminanceSqSum = 0;

        let grayscalePixels = 0;
        let darkPixels = 0;
        let whitePixels = 0;
        let pinkPurplePixels = 0;
        let redGridPixels = 0;
        let edgeCount = 0;

        const colorCounts = new Map();
        let maxColorFrequency = 0;
        const lumGrid = new Float32Array(totalPixels);

        for (let i = 0; i < totalPixels; i++) {
          const idx = i * 4;
          const r = imgData[idx];
          const g = imgData[idx + 1];
          const b = imgData[idx + 2];
          const a = imgData[idx + 3];

          if (a < 35) {
            transparentPixels++;
          }

          const lum = 0.299 * r + 0.587 * g + 0.114 * b;
          lumGrid[i] = lum;
          luminanceSum += lum;
          luminanceSqSum += lum * lum;

          const maxDiff = Math.max(Math.abs(r - g), Math.abs(g - b), Math.abs(r - b));
          if (maxDiff <= 14) grayscalePixels++;
          if (lum < 45) darkPixels++;
          if (lum > 230) whitePixels++;

          // H&E Histology stain detection (pink/magenta/violet dominance)
          if (r > 130 && b > 110 && g < r - 18 && g < b + 15 && maxDiff > 22) {
            pinkPurplePixels++;
          }
          // ECG pink/red grid detection
          if (r > 180 && r - g > 35 && r - b > 25) {
            redGridPixels++;
          }

          const qr = Math.round(r / 16);
          const qg = Math.round(g / 16);
          const qb = Math.round(b / 16);
          const key = `${qr}_${qg}_${qb}`;
          const count = (colorCounts.get(key) || 0) + 1;
          colorCounts.set(key, count);
          if (count > maxColorFrequency) {
            maxColorFrequency = count;
          }
        }

        // Compute horizontal & vertical edge density (detects text labels, arrows, diagrams, waveforms)
        for (let y = 0; y < 63; y++) {
          for (let x = 0; x < 63; x++) {
            const pos = y * 64 + x;
            const diffX = Math.abs(lumGrid[pos] - lumGrid[pos + 1]);
            const diffY = Math.abs(lumGrid[pos] - lumGrid[pos + 64]);
            if (diffX > 32 || diffY > 32) {
              edgeCount++;
            }
          }
        }

        const edgeDensity = edgeCount / (63 * 63);
        const meanLum = luminanceSum / totalPixels;
        const variance = luminanceSqSum / totalPixels - meanLum * meanLum;
        const stdDev = Math.sqrt(Math.max(0, variance));

        const isHighTransparency = transparentPixels / totalPixels > 0.8;
        const isSmoothGradientBanner = edgeDensity < 0.022 && stdDev < 24;
        const isLowVariance =
          stdDev < 14 || maxColorFrequency / totalPixels > 0.88 || isSmoothGradientBanner;

        // Classify visual clinical modality signature for DeepSeek context enrichment
        const grayRatio = grayscalePixels / totalPixels;
        const darkRatio = darkPixels / totalPixels;
        const whiteRatio = whitePixels / totalPixels;
        const histoRatio = pinkPurplePixels / totalPixels;
        const ecgRatio = redGridPixels / totalPixels;

        let visualSignature = "Clinical / Anatomical Illustration or Photograph";
        if (grayRatio > 0.78 && darkRatio > 0.18) {
          visualSignature = "Radiological Scan (X-Ray / CT / MRI / Ultrasound — Grayscale Medical Imaging)";
        } else if (histoRatio > 0.22) {
          visualSignature = "Histopathology / Microscopic Specimen (H&E Pink-Purple Stained Tissue)";
        } else if (whiteRatio > 0.45 && (ecgRatio > 0.04 || (aspectRatio > 1.65 && edgeDensity > 0.08))) {
          visualSignature = "ECG Tracing / Physiological Waveform / Diagnostic Chart";
        } else if (whiteRatio > 0.42 && edgeDensity > 0.09) {
          visualSignature = "Labeled Anatomical / Scientific Diagram, Pathway, or Clinical Table";
        }

        const hash = await computeAverageHash(img);

        resolve({
          width,
          height,
          aspectRatio,
          isLowVariance,
          isHighTransparency,
          stdDev: Math.round(stdDev),
          edgeDensity: Number(edgeDensity.toFixed(3)),
          visualSignature,
          transparentRatio: transparentPixels / totalPixels,
          hash,
        });
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    };

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        aspectRatio: 1,
        isLowVariance: true,
        isHighTransparency: false,
        visualSignature: "Unknown visual",
        edgeDensity: 0,
        hash: "",
      });
    };

    img.src = dataUrl;
  });
}

/**
 * Stage 1: Heuristic Quality Filtering
 * Returns: { kept: ExtractedImage[], rejected: ExtractedImage[], stats: object }
 */
export async function filterImagesHeuristics(
  images = [],
  options = {},
  onProgress = () => {}
) {
  const {
    minDimension = 100,
    maxAspectRatio = 8.5,
    minAspectRatio = 0.12,
    pageFrequencyThreshold = 0.28, // Reject if same/similar template image appears on >28% of pages
    allowDuplicates = false,
  } = options;

  const total = images.length;
  const processed = new Array(total);
  const BATCH_SIZE = 8;
  let completed = 0;

  // Step 1: Parallel pixel analysis in batches of 8
  for (let start = 0; start < total; start += BATCH_SIZE) {
    const batch = images.slice(start, start + BATCH_SIZE);
    await Promise.all(
      batch.map(async (item, offset) => {
        const idx = start + offset;
        const analysis = await analyzeImagePixels(item.thumbnailDataUrl);
        processed[idx] = {
          ...item,
          width: analysis.width || item.width,
          height: analysis.height || item.height,
          aspectRatio: analysis.aspectRatio,
          isLowVariance: analysis.isLowVariance,
          isHighTransparency: analysis.isHighTransparency,
          edgeDensity: analysis.edgeDensity,
          visualSignature: analysis.visualSignature || item.visualSignature,
          perceptualHash: analysis.hash,
        };
        completed++;
        onProgress({
          stage: "heuristic_analysis",
          current: completed,
          total,
          percent: Math.round((completed / total) * 100),
        });
      })
    );
  }

  // Step 2: Calculate cross-page hash frequencies (including near-identical hashes within Hamming distance <= 2)
  const hashPages = new Map();
  const totalPagesInDoc = Math.max(
    1,
    ...processed.map((img) => img.pageOrSlideNumber || 1)
  );

  for (const img of processed) {
    if (!img.perceptualHash) continue;
    let matchedKey = img.perceptualHash;
    for (const existingKey of hashPages.keys()) {
      if (hammingDistance(img.perceptualHash, existingKey) <= 2) {
        matchedKey = existingKey;
        break;
      }
    }
    img.clusterHash = matchedKey;
    if (!hashPages.has(matchedKey)) {
      hashPages.set(matchedKey, new Set());
    }
    hashPages.get(matchedKey).add(img.pageOrSlideNumber);
  }

  const kept = [];
  const rejected = [];
  const seenHashes = new Set();

  for (const img of processed) {
    let rejectReason = null;
    const hashKey = img.clusterHash || img.perceptualHash;

    // Check 1: Dimensions too small (logos, bullets, icons)
    if (img.width < minDimension || img.height < minDimension) {
      rejectReason = `أبعاد صغيرة جداً (${img.width}×${img.height}px) — غالباً أيقونة أو شعار`;
    }
    // Check 2: Extreme aspect ratio (dividers, decorative borders)
    else if (img.aspectRatio > maxAspectRatio || img.aspectRatio < minAspectRatio) {
      rejectReason = `نسبة أبعاد غير طبيعية (${img.aspectRatio.toFixed(1)}:1) — خط زخرفي أو شريط فاصل`;
    }
    // Check 3: Solid color / smooth gradient / low variance
    else if (img.isLowVariance) {
      rejectReason = "لون موحد أو خلفية ديكورية بدون تفاصيل علمية";
    }
    // Check 4: High transparency
    else if (img.isHighTransparency) {
      rejectReason = "شفافية عالية جداً — لوجو مفرغ أو علامة مائية شفافة";
    }
    // Check 5: Page frequency threshold (University / slide template header)
    else if (hashKey && hashPages.has(hashKey)) {
      const pageCount = hashPages.get(hashKey).size;
      const frequency = pageCount / totalPagesInDoc;
      if (totalPagesInDoc >= 3 && frequency > pageFrequencyThreshold) {
        rejectReason = `تكرار بنسبة ${(frequency * 100).toFixed(0)}% عبر الصفحات — شعار/ترويسة ثابتة للمحاضرة`;
      } else if (!allowDuplicates && seenHashes.has(hashKey)) {
        rejectReason = "تكرار مطابق لنفس الصورة في شريحة سابقة";
      }
    }

    if (rejectReason) {
      rejected.push({
        ...img,
        status: "rejected",
        rejectionReason: rejectReason,
      });
    } else {
      if (hashKey) {
        seenHashes.add(hashKey);
      }
      kept.push({
        ...img,
        status: "kept",
      });
    }
  }

  return {
    kept,
    rejected,
    stats: {
      total,
      keptCount: kept.length,
      rejectedCount: rejected.length,
      rejectRatio: total > 0 ? (rejected.length / total).toFixed(2) : "0",
    },
  };
}

/**
 * Parse JSON safely from AI output string
 */
function parseAiJson(raw) {
  if (raw && typeof raw === "object") return raw;
  const str = String(raw || "").trim();
  const start = str.indexOf("{");
  const end = str.lastIndexOf("}");
  if (start < 0 || end <= start) return null;
  const chunk = str.slice(start, end + 1);
  try {
    return JSON.parse(chunk);
  } catch {
    try {
      const fixed = chunk.replace(/,\s*([\]}])/g, "$1");
      return JSON.parse(fixed);
    } catch {
      return null;
    }
  }
}

/**
 * Convert dataURL to Base64 payload for Gemini Vision API
 */
function dataUrlToBase64Parts(dataUrl) {
  const match = dataUrl?.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) return null;
  return {
    mimeType: match[1] || "image/png",
    data: match[2],
  };
}

/**
 * Fast client-side image compression for AI & OCR.
 */
export async function optimizeImageForAi(dataUrl, maxDim = 640, quality = 0.8) {
  if (!dataUrl || typeof window === "undefined") return dataUrlToBase64Parts(dataUrl);
  if (dataUrl.length < 90000) {
    return dataUrlToBase64Parts(dataUrl);
  }

  return new Promise((resolve) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      let width = img.naturalWidth || img.width;
      let height = img.naturalHeight || img.height;
      if (!width || !height) {
        resolve(dataUrlToBase64Parts(dataUrl));
        return;
      }

      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement("canvas");
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d", { willReadFrequently: true });
      if (!ctx) {
        resolve(dataUrlToBase64Parts(dataUrl));
        return;
      }

      try {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, width, height);
        ctx.drawImage(img, 0, 0, width, height);

        const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
        resolve(dataUrlToBase64Parts(jpegDataUrl));
      } finally {
        canvas.width = 0;
        canvas.height = 0;
      }
    };
    img.onerror = () => resolve(dataUrlToBase64Parts(dataUrl));
    img.src = dataUrl;
  });
}

// ─── Local In-Browser OCR Singleton (for zero-cost embedded label reading with DeepSeek) ───
let sharedTesseractWorkerPromise = null;
const localOcrCache = new Map();

/**
 * Extract embedded labels, arrows, titles, and numbers written INSIDE the image pixels
 * locally in the browser using Tesseract.js with a fast timeout.
 * Essential when using text-only models like DeepSeek so the model knows what is written inside the figure.
 */
export async function extractEmbeddedImageTextLocal(dataUrl, timeoutMs = 4500) {
  if (!dataUrl || typeof window === "undefined") return "";
  const cacheKey = `${dataUrl.slice(0, 64)}_${dataUrl.length}`;
  if (localOcrCache.has(cacheKey)) {
    return localOcrCache.get(cacheKey);
  }

  try {
    if (!sharedTesseractWorkerPromise) {
      sharedTesseractWorkerPromise = (async () => {
        const { createWorker } = await import("tesseract.js");
        return await createWorker(["eng", "ara"], 1);
      })().catch((err) => {
        sharedTesseractWorkerPromise = null;
        throw err;
      });
    }

    const worker = await Promise.race([
      sharedTesseractWorkerPromise,
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_INIT_TIMEOUT")), timeoutMs)),
    ]);

    const res = await Promise.race([
      worker.recognize(dataUrl),
      new Promise((_, reject) => setTimeout(() => reject(new Error("OCR_RECOGNIZE_TIMEOUT")), timeoutMs)),
    ]);

    const rawText = String(res?.data?.text || "")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9\s\.\,\-\:\(\)\/\%\+]/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    // Keep only meaningful tokens (filter out 1-char OCR noise)
    const tokens = rawText.split(" ").filter((tok) => tok.length >= 2 || /\d/.test(tok));
    const cleaned = tokens.join(" ").slice(0, 500).trim();
    localOcrCache.set(cacheKey, cleaned);
    return cleaned;
  } catch {
    return "";
  }
}

/**
 * Stage 2: AI Multimodal Vision Classification
 * Evaluates whether image has authentic scientific/educational content
 */
export async function classifyImageWithAI(image, aiConfig) {
  const parts = await optimizeImageForAi(image.thumbnailDataUrl);
  if (!parts) {
    return {
      isScientificContent: true,
      category: "other_scientific",
      confidence: 0.7,
      reason: "تم التمرير تلقائياً",
    };
  }

  const prompt = `انت فلتر جودة صور لمحتوى تعليمي ودراسي لجميع التخصصات والمراحل. هيتبعتلك صورة واحدة.
رد بـ JSON فقط بالشكل ده:
{
  "isScientificContent": true/false,
  "category": "diagram" | "anatomical_illustration" | "chart_or_graph" | "table" | "clinical_photo" | "radiology" | "histology" | "other_scientific" | "logo_or_watermark" | "decorative" | "low_quality_or_screenshot" | "blank_or_solid_color",
  "confidence": 0.0-1.0,
  "reason": "سبب مختصر"
}
اعتبر الصورة isScientificContent = false لو كانت: لوجو، ايقونة، خلفية سودة/بيضاء/مفرغة، screenshot لواجهة برامج أو مواقع، صورة مقصوصة بشكل ركيك (نص مقطوع، حواف غريبة)، صورة زخرفية بحتة بدون معلومة تعليمية.
اعتبرها true لو فيها معلومة تعليمية أو توضيحية واضحة: رسم توضيحي، جدول بيانات، رسم بياني، صورة مجهرية أو فوتوغرافية شارحة، مخطط هيكلي، أو شكل علمي.`;

  try {
    const raw = await generateMultimodal(
      prompt,
      [{ inlineData: { data: parts.data, mimeType: parts.mimeType } }],
      { ...aiConfig, max_tokens: 500, temperature: 0.1 }
    );
    const parsed = parseAiJson(raw);
    if (!parsed) {
      return {
        isScientificContent: true,
        category: "other_scientific",
        confidence: 0.65,
        reason: "تم التمرير لعدم تمكن الـ AI من نفي العلمية",
      };
    }

    return {
      isScientificContent: Boolean(parsed.isScientificContent),
      category: parsed.category || "other_scientific",
      confidence: Math.max(0, Math.min(1, Number(parsed.confidence) || 0.7)),
      reason: parsed.reason || "",
    };
  } catch (err) {
    console.warn("[classifyImageWithAI] Classification failed, falling back to heuristic:", err);
    return {
      isScientificContent: true,
      category: "other_scientific",
      confidence: 0.6,
      reason: "تم قبول الصورة احتياطياً لتعذر فحص الـ AI",
    };
  }
}

/**
 * Clean context text by removing slide scrapers, speaker note tags, copyright, CIDFont codes, and junk characters
 */
export function cleanContextText(text) {
  if (!text || typeof text !== "string") return "";
  let cleaned = text
    .replace(/\(cid:\d+\)/gi, "")
    .replace(/\ufffd/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\[\s*(?:محتوى الشريحة|ملاحظات المحاضر|Slide Content|Speaker Notes|التسمية والنص الملاصق للصورة مباشرة|الشرح المحيط بالصورة|الشرح المرتبط بالصورة في الشريحة|عنوان الشريحة\/الصفحة|عنوان الشريحة|سياق الصفحة \d+|محتوى الشريحة \d+)\s*\]\s*:?/gi, " ")
    .replace(/©[^\n\r\)]+/gi, "")
    .replace(/\b(?:slide|page|صفحة|شريحة)\s*\d+/gi, "")
    .replace(/\bhttps?:\/\/\S+/gi, "")
    .replace(/[\(\[\{]\s*[\)\]\}]/g, "")
    .replace(/^\s*[\(\[\{:\-\–\—\s]+/, "")
    .replace(/[\(\[\{:\-\–\—\s]+$/, "")
    .replace(/\s+/g, " ")
    .trim();
  if (cleaned.startsWith("(") && !cleaned.includes(")")) cleaned = cleaned.slice(1).trim();
  if (cleaned.endsWith(")") && !cleaned.includes("(")) cleaned = cleaned.slice(0, -1).trim();
  return cleaned;
}

/**
 * Detect if text extracted from PDF/slide is garbled, unreadable, or mojibake.
 */
export function isGarbledOrCorruptedText(text) {
  if (!text || typeof text !== "string") return true;
  const trimmed = text.trim();
  if (trimmed.length < 5) return true;
  if (/^صورة من (?:الصفحة|الشريحة) رقم \d+$/i.test(trimmed)) return true;

  if (/\(cid:\d+\)/i.test(trimmed)) return true;
  if (/\ufffd/.test(trimmed)) return true;

  const readableLetters = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9]/g) || []).length;
  const meaningful = trimmed.replace(/[\s\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").replace(/\p{Extended_Pictographic}/gu, "").length || 1;
  const ratio = readableLetters / meaningful;
  if (ratio < 0.45 && meaningful > 10) return true;

  const badChars = (trimmed.match(/[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F]/g) || []).length;
  if (badChars > 3 && badChars / trimmed.length > 0.01) return true;

  return false;
}

/**
 * AI Vision OCR: Extracts text, labels, anatomical pointers, and clinical findings
 * directly from the image pixels using Gemini Flash Multimodal, with local Tesseract fallback.
 */
export async function ocrImageWithVisionAI(image, aiConfig = {}) {
  const dataUrl = image?.thumbnailDataUrl || image?.dataUrl || image;
  if (!dataUrl) throw new Error("بيانات الصورة غير صالحة لـ OCR");

  const parts = await optimizeImageForAi(dataUrl, 768, 0.85);
  if (!parts) throw new Error("تعذر معالجة بيانات الصورة لـ OCR");

  const prompt = `أنت خبير قراءة واستخراج النصوص والمصطلحات من الشرائح والامتحانات الطبية والأكاديمية (Clinical & Academic OCR).
مهمتك: قراءة كل ما هو مكتوب وموضح في هذه الصورة بدقة فائقة:
1. اقرأ كل النصوص، العناوين، والشروحات المكتوبة (سواء بالإنجليزية أو العربية).
2. استخرج التسميات التشريحية والأسهم وما تشير إليه (Labels & anatomical landmarks).
3. استخرج بيانات رسم القلب (ECG)، الأشعة، التحاليل، أو العينات المجهرية إن وجدت.
4. إذا كان في الصورة سؤال أو إجابة مكتوبة، انقل السؤال والإجابة بدقة.

اكتب النص المستخرج فقط بشكل مرتب وواضح ومباشر، بدون مقدمات أو خاتمة وبدون اختراع معلومات غير موجودة في الصورة.`;

  try {
    const raw = await generateMultimodal(
      prompt,
      [{ inlineData: { data: parts.data, mimeType: parts.mimeType } }],
      { ...aiConfig, model: aiConfig?.model || "DeepSeek-V4.1-Flash-1017", max_tokens: 1500, temperature: 0.1 }
    );

    const cleaned = cleanContextText(raw);
    if (cleaned) return cleaned;
  } catch (err) {
    console.warn("[ocrImageWithVisionAI] Vision API unavailable, using local OCR:", err?.message);
  }

  return await extractEmbeddedImageTextLocal(dataUrl, 6000);
}

/**
 * Clean option string and remove option letter prefixes like A) or 1.
 * CRITICAL: NEVER strip decimal numbers like "0.20 seconds", "0.12s", "1.5 mg", ".04s"!
 */
export function cleanOptionText(opt) {
  const cleaned = cleanContextText(String(opt || ""));
  return cleaned.replace(/^\[?\(?([A-Da-d]|[1-9])(?:\)|\]|\:(?!\d)|\.(?!\d))\s*/, "").trim();
}

/**
 * Generate context-anchored fallback questions when completely offline
 */
function buildClinicalFallback(baseTitle, effectiveContext, effectiveLanguage, difficulty, image = {}) {
  const isEn = effectiveLanguage === "en";
  const cleanCaption = cleanContextText(image.directCaption || image.embeddedOcrText || baseTitle || "").slice(0, 110);
  const lower = `${cleanCaption} ${effectiveContext} ${image.visualSignature || ""}`.toLowerCase();

  let question = "";
  let correctOption = "";
  let distractors = [];
  let explanation = "";

  if (lower.includes("ecg") || lower.includes("ekg") || lower.includes("lead") || lower.includes("cardio") || lower.includes("heart") || lower.includes("قلب") || lower.includes("تخطيط")) {
    if (isEn) {
      question = cleanCaption
        ? `In this OSCE station demonstrating "${cleanCaption}", which diagnostic interpretation or anatomical finding is most accurate?`
        : "Regarding the ECG / cardiovascular visual displayed in this station: What is the primary clinical interpretation?";
      correctOption = cleanCaption && cleanCaption.length > 12
        ? `Clinical hallmark of ${cleanCaption} with characteristic electrophysiological/anatomical correlation`
        : "Standard precordial electrode placement (V1–V6) aligning horizontal cardiac electrical vectors";
      distractors = [
        "Inversion of limb leads producing artifactual axis deviation in leads I and aVL",
        "Benign early repolarization variant requiring no clinical follow-up",
        "Right ventricular pacing artifact with secondary retrograde atrial capture",
      ];
      explanation = `This visual demonstrates ${cleanCaption || "key cardiovascular landmarks"} as described in the lecture context: ${effectiveContext.slice(0, 220)}.`;
    } else {
      question = cleanCaption
        ? `في محطة الأوسكي المعروضة لـ (${cleanCaption}): ما هو التشخيص أو المعلم السريري الأدق؟`
        : "بناءً على التخطيط / الشكل القلبي المعروض في هذه المحطة: ما هو الاستنتاج السريري الصحيح؟";
      correctOption = cleanCaption && cleanCaption.length > 10
        ? `المعلم السريري والتشخيصي الخاص بـ: ${cleanCaption}`
        : "التوزيع التشريحي والكهربائي القياسي للمساري القلبية الموضحة بالشريحة";
      distractors = [
        "انعكاس أقطاب الأطراف مما يؤدي لانحراف وهمي في المحور الكهربائي",
        "تغير فسيولوجي حميد عابر لا يرتبط بأي دلالة مرضية",
        "تشويش حركي ناتج عن عدم ثبات الأقطاب السطحية أثناء التسجيل",
      ];
      explanation = `توضح هذه الصورة (${cleanCaption || "معالم قلبية تشخيصية"}) وفقاً لما ورد في الشريحة: ${effectiveContext.slice(0, 220)}.`;
    }
  } else if (lower.includes("x-ray") || lower.includes("ct") || lower.includes("mri") || lower.includes("radiolog") || lower.includes("ultrasound") || lower.includes("اشعة") || lower.includes("أشعة") || lower.includes("رنين") || lower.includes("مقطعية")) {
    if (isEn) {
      question = cleanCaption
        ? `Examine this radiological image (${cleanCaption}): Which key diagnostic feature or anatomical structure is demonstrated?`
        : "Examine the attached radiological scan: Which diagnostic finding is most accurately indicated?";
      correctOption = cleanCaption && cleanCaption.length > 12
        ? `Radiological demonstration of ${cleanCaption}`
        : "Distinct radiological landmark and density interface corresponding to the target structure";
      distractors = [
        "Normal anatomical variant with artifactual motion blurring on standard projection",
        "Subcutaneous emphysema secondary to iatrogenic puncture without visceral involvement",
        "Calcified benign granuloma requiring no further diagnostic workup",
      ];
      explanation = `Radiological evaluation confirms ${cleanCaption || "the target imaging sign"} in correlation with the slide context: ${effectiveContext.slice(0, 220)}.`;
    } else {
      question = cleanCaption
        ? `بفحص الصورة الشعاعية المرفقة (${cleanCaption}): ما هي العلامة التشخيصية أو البنية التشريحية الموضحة؟`
        : "بمراجعة الصورة الشعاعية المعروضة: ما هو الاستنتاج التشخيصي الأدق؟";
      correctOption = cleanCaption && cleanCaption.length > 10
        ? `المعلم الشعاعي والتشخيصي الدال على: ${cleanCaption}`
        : "المعلم التشريحي وحدود الكثافة الشعاعية الدالة على البنية المستهدفة في الشريحة";
      distractors = [
        "تغير تشريحي طبيعي ناتج عن زاوية التصوير دون دلالة مرضية",
        "تكلس حميد قديم غير نشط لا يستدعي أي تدخل سريري",
        "ظل كاذب ناتج عن تداخل الأنسجة الرخوة السطحية",
      ];
      explanation = `تُظهر الصورة الشعاعية (${cleanCaption || "المعلم التشخيصي الموضح"}) كما ورد في شرح المحاضرة: ${effectiveContext.slice(0, 220)}.`;
    }
  } else {
    if (isEn) {
      question = cleanCaption
        ? `Based on this OSCE figure illustrating "${cleanCaption}", which statement accurately identifies the structure or clinical finding?`
        : "Based on the clinical visual in this OSCE station, which conclusion is most substantiated?";
      correctOption = cleanCaption && cleanCaption.length > 10
        ? `Characteristic features and anatomical/clinical correlation of ${cleanCaption}`
        : "Target anatomical landmark and clinical features demonstrated in this specific figure";
      distractors = [
        "Incidental non-pathological artifact unrelated to the primary organ system",
        "Secondary degenerative change seen only in end-stage chronic fibrosis",
        "Congenital hypoplasia variant requiring conservative observation only",
      ];
      explanation = `This figure specifically illustrates ${cleanCaption || "key clinical hallmarks"}: ${effectiveContext.slice(0, 220)}.`;
    } else {
      question = cleanCaption
        ? `استناداً إلى الصورة المعروضة في هذه المحطة (${cleanCaption}): ما هو التحديد التشريحي أو التشخيصي الصحيح؟`
        : "استناداً للشريحة السريرية المعروضة: ما هو الاستنتاج الطبي الأدق؟";
      correctOption = cleanCaption && cleanCaption.length > 10
        ? `المعالم التشخيصية والتشريحية الخاصة بـ: ${cleanCaption}`
        : "المعلم التشريحي والخصائص السريرية المحددة في هذه الصورة";
      distractors = [
        "تغير عارض غير مرتبط بالبنية الأساسية الموضحة في الشريحة",
        "ضمور نسيجي ثانوي متأخر لا يمثل العلامة الأساسية للمحاضرة",
        "تباين خلقي حميد لا يتطلب أي إجراء تشخيصي أو علاجي",
      ];
      explanation = `توضح هذه الصورة تحديداً (${cleanCaption || "المعلم السريري الأساسي"}): ${effectiveContext.slice(0, 220)}.`;
    }
  }

  const correctIndex = Math.floor(Math.random() * 4);
  const options = [...distractors];
  options.splice(correctIndex, 0, correctOption);

  return [{
    id: `q_fb_${Date.now()}_0`,
    imageId: image.id,
    pageOrSlideNumber: image.pageOrSlideNumber,
    visualFinding: cleanCaption.slice(0, 80),
    question,
    options,
    correctIndex,
    correct_index: correctIndex,
    explanation,
    difficulty,
  }];
}

/**
 * Stage 3: Precision-Aligned OSCE / OSPE Quiz Generation
 * Powered by DeepSeek-V4.1-Flash-1017 Multimodal Vision + Spatial Caption Binding + Local In-Browser OCR.
 */
export async function generateImageQuiz(image, options = {}, aiConfig = {}) {
  const {
    numQuestions = 1,
    difficulty = "mixed",
    customExplanation = null,
    language = "auto",
  } = options;

  let resolvedAiConfig = { ...(aiConfig || {}) };
  if (typeof window !== "undefined" && !resolvedAiConfig.api_key) {
    try {
      const { getAiConfig } = await import("@/api/index");
      const loaded = await getAiConfig();
      if (loaded) {
        resolvedAiConfig = { ...loaded, ...resolvedAiConfig, api_key: resolvedAiConfig.api_key || loaded.api_key };
      }
    } catch {}
  }

  // 1. Run local in-browser OCR if embedded text hasn't been extracted yet and image has minimal caption or shares a slide
  let embeddedOcrText = image.embeddedOcrText || "";
  if (!embeddedOcrText && (!image.directCaption || image.directCaption.length < 45 || (image.totalImagesOnPage || 1) > 1)) {
    try {
      embeddedOcrText = await extractEmbeddedImageTextLocal(image.thumbnailDataUrl, 3500);
      image.embeddedOcrText = embeddedOcrText;
    } catch {
      embeddedOcrText = "";
    }
  }

  const rawContext = customExplanation?.trim() || image.contextText?.trim() || "";
  const cleanedContext = cleanContextText(rawContext);
  const isGarbled = isGarbledOrCorruptedText(rawContext);
  const directCaption = cleanContextText(image.directCaption || "");
  const pageHeading = cleanContextText(image.pageHeading || "");
  const visualSignature = image.visualSignature || "Clinical / Academic Figure";

  // Build highly specific per-image grounding block so the model never confuses multiple images on a slide
  const specificGroundingParts = [];
  if (directCaption) {
    specificGroundingParts.push(`• DIRECT FIGURE CAPTION / ADJACENT LABEL (Highest Priority): ${directCaption}`);
  }
  if (embeddedOcrText) {
    specificGroundingParts.push(`• TEXT & LABELS READ INSIDE THE IMAGE PIXELS (OCR): ${embeddedOcrText}`);
  }
  if (visualSignature) {
    specificGroundingParts.push(`• VISUAL MODALITY & APPEARANCE: ${visualSignature} (${image.width || 0}x${image.height || 0}px, Slide/Page #${image.pageOrSlideNumber || 1}, Figure #${image.imageOnPageIndex || 1} of ${image.totalImagesOnPage || 1} on this slide)`);
  }
  if (!isGarbled && cleanedContext) {
    specificGroundingParts.push(`• SURROUNDING SLIDE / PAGE EXPLANATION: ${cleanedContext}`);
  }
  if (pageHeading) {
    specificGroundingParts.push(`• SLIDE TOPIC HEADER: ${pageHeading}`);
  }

  const effectiveContext = specificGroundingParts.length > 0
    ? specificGroundingParts.join("\n")
    : `Clinical figure on slide #${image.pageOrSlideNumber || 1} (${visualSignature})`;

  // Determine language
  let effectiveLanguage = language;
  if (!effectiveLanguage || effectiveLanguage === "auto") {
    const textToScan = `${directCaption} ${embeddedOcrText} ${cleanedContext} ${image.sourceFileName || ""}`;
    const arabic = (textToScan.match(/[\u0600-\u06FF]/g) || []).length;
    const latin = (textToScan.match(/[a-zA-Z]/g) || []).length;
    if (latin > 12 || latin > arabic * 0.3) {
      effectiveLanguage = "en";
    } else if (arabic > latin * 2) {
      effectiveLanguage = "ar";
    } else {
      effectiveLanguage = "en";
    }
  }

  const prompt = effectiveLanguage === "en"
    ? `You are an elite medical professor and OSCE/OSPE examiner creating practical station questions.
Analyze the attached image directly AND cross-reference it with its exact slide metadata below (Slide/Page #${image.pageOrSlideNumber || 1}, Figure #${image.imageOnPageIndex || 1} of ${image.totalImagesOnPage || 1}).

EXACT DATA FOR THIS SPECIFIC IMAGE:
${effectiveContext}

TASK: Generate ${numQuestions} high-yield multiple-choice question(s) (MCQs) strictly matched to THIS EXACT ATTACHED IMAGE and its direct caption/labels above.
MANDATORY RULES FOR 100% IMAGE-QUESTION & ANSWER-EXPLANATION ALIGNMENT:
1. VISUAL + CAPTION TARGETING: Inspect the attached image visually (anatomical landmarks, arrows/pointers, radiology scan, ECG rhythm, histology, or diagram) and combine it with "DIRECT FIGURE CAPTION / ADJACENT LABEL". Ignore any unrelated slide paragraphs!
2. OSCE STATION STYLE: Phrase the question naturally as a practical visual station (e.g., "In the displayed figure showing...", "Identify the anatomical structure / pathological finding / diagnostic sign indicated in this visual...", "A patient presents with the finding shown..."). NEVER mention "OCR" or "according to the caption text".
3. DISTRACTOR SYMMETRY: Provide 4 plausible clinical options of balanced length. Only ONE unambiguous correct option.
4. ANSWER-EXPLANATION LOCK (CRITICAL):
   - Write "explanation" FIRST before "correctAnswer" and "correctIndex".
   - Start "explanation" with: "Correct answer: [exact verbatim text of the winning option] — " followed by the clinical rationale and why the other 3 distractors are ruled out.
   - Copy the exact verbatim text of that winning option into "correctAnswer".
   - Set "correctIndex" (0, 1, 2, or 3) so that options[correctIndex] === correctAnswer.
5. LANGUAGE: 100% Medical English.
6. DIFFICULTY: ${difficulty}.
7. PRECISE DECIMALS: Always preserve leading zeros in decimals (e.g. "0.12 seconds", "0.20 seconds").

Return STRICT JSON only (no markdown, no backticks):
{
  "questions": [
    {
      "visualFinding": "Short 3-7 word summary of the exact structure/sign in this image",
      "question": "Clear OSCE question referring to the displayed figure...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "explanation": "Correct answer: Option B — Detailed clinical rationale...",
      "correctAnswer": "Option B",
      "correctIndex": 1
    }
  ]
}`
    : `أنت أستاذ وممتحن أكاديمي خبير تضع أسئلة امتحان عملي (OSCE / OSPE) دقيقة.
افحص الصورة المرفقة بصرياً بدقة واربطها بالبيانات الدقيقة الخاصة بها أدناه (شريحة/صفحة رقم ${image.pageOrSlideNumber || 1}، الشكل رقم ${image.imageOnPageIndex || 1} من أصل ${image.totalImagesOnPage || 1} في هذه الشريحة).

البيانات الدقيقة الخاصة بهذه الصورة تحديداً:
${effectiveContext}

المطلوب: ولّد ${numQuestions} سؤال اختيار من متعدد (MCQ) مطابق 100% لهذه الصورة المرفقة بالذات.
القواعد الإلزامية لضمان تطابق السؤال مع الصورة وتطابق الإجابة مع الشرح:
1. التطابق البصري والجراحي مع الصورة: افحص ما يظهر داخل الصورة المرفقة (المعالم التشريحية، الأسهم، الأشعة، تخطيط القلب، المخطط العلمي) مع "DIRECT FIGURE CAPTION". إذا كان في الشريحة كلام عام غير مرتبط بهذه الصورة، تجاهله تماماً واسأل فقط عما تمثله هذه الصورة!
2. صياغة أوسكي احترافية: صِغ السؤال كمحطة امتحان عملي طبيعي (مثال: "في الشكل السريري المعروض..."، "ما هو التشخيص / التركيب التشريحي الموضح في هذه الصورة..."). ممنوع ذكر كلمة "OCR" أو "حسب النص المستخرج".
3. التوازن اللغوي: 4 خيارات متقاربة في الطول والأسلوب، خيار واحد صحيح فقط.
4. قفل الإجابة مع الشرح (قاعدة صارمة):
   - اكتب حقل "explanation" أولاً، وابدأه دائماً بعبارة: "الإجابة الصحيحة: [انسخ نص الخيار الصحيح حرفياً] — " ثم اشرح السبب العلمي ولماذا استُبعدت الخيارات الأخرى.
   - انسخ نص الخيار الصحيح حرفياً في "correctAnswer".
   - اضبط "correctIndex" (0 أو 1 أو 2 أو 3) بحيث يطابق موضع الخيار الصحيح في مصفوفة options.
5. درجة الصعوبة: ${difficulty}.

أرجع النتيجة JSON فقط بدون أي نص إضافي:
{
  "questions": [
    {
      "visualFinding": "وصف مختصر (3-7 كلمات) للعلامة أو البنية المعروضة في الصورة",
      "question": "نص سؤال الأوسكي المرتبط بالصورة المعروضة...",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "explanation": "الإجابة الصحيحة: الخيار الثاني — الشرح السريري والتعليمي الدقيق...",
      "correctAnswer": "الخيار الثاني",
      "correctIndex": 1
    }
  ]
}`;

  let rawResponse = "";

  // Strategy A: Primary Multimodal Vision Analysis (DeepSeek-V4.1-Flash-1017 / Vision Engine reads the image pixels directly)
  try {
    const parts = await optimizeImageForAi(image.thumbnailDataUrl, 768, 0.8);
    if (parts) {
      rawResponse = await generateMultimodal(
        prompt,
        [{ inlineData: { data: parts.data, mimeType: parts.mimeType } }],
        {
          ...resolvedAiConfig,
          model: resolvedAiConfig?.model || "DeepSeek-V4.1-Flash-1017",
          max_tokens: 2000,
          temperature: 0.15,
        }
      );
    }
  } catch (visionErr) {
    console.warn("[generateImageQuiz] Vision call failed, falling back to grounded text engine:", visionErr?.message);
  }

  // Strategy B: Grounded Text AI Fallback (if vision endpoint was unreachable or returned non-JSON)
  if (!rawResponse || !parseAiJson(rawResponse)?.questions?.length) {
    try {
      rawResponse = await generateText(
        prompt,
        {
          ...resolvedAiConfig,
          model: resolvedAiConfig?.model || "DeepSeek-V4.1-Flash-1017",
          max_tokens: 2000,
          temperature: 0.15,
        }
      );
    } catch (textErr) {
      console.warn("[generateImageQuiz] Text AI call failed:", textErr?.message);
    }
  }

  const parsed = parseAiJson(rawResponse);
  if (parsed && Array.isArray(parsed.questions) && parsed.questions.length > 0) {
    const { reconcileQuestionAnswer } = await import("./quizQuality.js");
    return parsed.questions.map((q, idx) => {
      const rawOptions = Array.isArray(q.options) && q.options.length === 4
        ? q.options.map(cleanOptionText)
        : (effectiveLanguage === "en" ? ["Option A", "Option B", "Option C", "Option D"] : ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"]);

      let initialCorrect = Number.isInteger(q.correctIndex) && q.correctIndex >= 0 && q.correctIndex <= 3
        ? q.correctIndex
        : 0;

      const cleanAns = cleanOptionText(String(q.correctAnswer || q.correct_answer || ""));
      if (cleanAns.length >= 2) {
        const textIdx = rawOptions.findIndex((o) => o.toLowerCase() === cleanAns.toLowerCase());
        if (textIdx >= 0) initialCorrect = textIdx;
      }

      const cleanQuestion = cleanContextText(String(q.question || ""))
        || (effectiveLanguage === "en" ? `Clinical question regarding the attached visual (${idx + 1})` : `سؤال سريري مرتبط بالشريحة المرفقة (${idx + 1})`);

      const cleanExp = cleanContextText(String(q.explanation || ""))
        || (effectiveLanguage === "en" ? "Clinical rationale based on visual hallmarks demonstrated in the slide." : "الشرح السريري المستند لما توضحه الشريحة المعروضة.");

      const reconciled = reconcileQuestionAnswer({
        question: cleanQuestion,
        options: rawOptions,
        correct_index: initialCorrect,
        explanation: cleanExp,
      });

      const finalCorrect = Number.isInteger(reconciled.correct_index) && reconciled.correct_index >= 0 && reconciled.correct_index <= 3
        ? reconciled.correct_index
        : initialCorrect;

      return {
        id: `q_${image.id || Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
        imageId: image.id,
        pageOrSlideNumber: image.pageOrSlideNumber,
        visualFinding: cleanContextText(String(q.visualFinding || q.visual_finding || directCaption || "")).slice(0, 90),
        question: cleanQuestion,
        options: rawOptions,
        correctIndex: finalCorrect,
        correct_index: finalCorrect,
        explanation: cleanExp,
        difficulty: q.difficulty || difficulty,
      };
    });
  }

  // Context-anchored fallback if completely offline
  const baseTitle = directCaption
    || embeddedOcrText.slice(0, 80)
    || cleanContextText(image.contextText || "").slice(0, 80)
    || cleanContextText(image.sourceFileName || "")
    || (effectiveLanguage === "en" ? "Clinical visual" : "الشريحة السريرية");

  return buildClinicalFallback(baseTitle, effectiveContext, effectiveLanguage, difficulty, image);
}
