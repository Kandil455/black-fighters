/**
 * imageFilter.js
 * Multi-stage filtering and AI analysis for extracted images.
 * Stage 1: Fast client-side pixel heuristics (Canvas API)
 * Stage 2: Multimodal Gemini Vision scientific classification
 * Stage 3: Context-aware Multimodal AI Quiz generation
 */

import { generateMultimodal } from "./ai.js";

/**
 * Compute 64-bit Average Hash (aHash) for fast perceptual duplicate matching
 */
async function computeAverageHash(imgElement) {
  const canvas = document.createElement("canvas");
  canvas.width = 8;
  canvas.height = 8;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return "";

  ctx.drawImage(imgElement, 0, 0, 8, 8);
  const imgData = ctx.getImageData(0, 0, 8, 8).data;

  let sum = 0;
  const grays = new Uint8Array(64);

  for (let i = 0; i < 64; i++) {
    const idx = i * 4;
    // Standard perceptual grayscale formula
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
}

/**
 * Analyze raw pixel distribution, entropy, and transparency using Canvas
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
          hash: "",
        });
        return;
      }

      const aspectRatio = width / height;

      // Sample image onto a 64x64 analysis canvas
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
          hash: "",
        });
        return;
      }

      ctx.drawImage(img, 0, 0, 64, 64);
      const imgData = ctx.getImageData(0, 0, 64, 64).data;
      const totalPixels = 64 * 64;

      let transparentPixels = 0;
      let luminanceSum = 0;
      let luminanceSqSum = 0;

      // Color frequency buckets
      const colorCounts = new Map();
      let maxColorFrequency = 0;

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
        luminanceSum += lum;
        luminanceSqSum += lum * lum;

        // Quantize to 16-bit color for histogram
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

      const meanLum = luminanceSum / totalPixels;
      const variance = luminanceSqSum / totalPixels - meanLum * meanLum;
      const stdDev = Math.sqrt(Math.max(0, variance));

      // Rule: If > 80% transparent, likely a floating logo or watermark
      const isHighTransparency = transparentPixels / totalPixels > 0.8;

      // Rule: Low variance (stdDev < 14) or one quantized color dominates > 88% of pixels
      const isLowVariance = stdDev < 14 || maxColorFrequency / totalPixels > 0.88;

      const hash = await computeAverageHash(img);

      resolve({
        width,
        height,
        aspectRatio,
        isLowVariance,
        isHighTransparency,
        stdDev: Math.round(stdDev),
        transparentRatio: transparentPixels / totalPixels,
        hash,
      });
    };

    img.onerror = () => {
      resolve({
        width: 0,
        height: 0,
        aspectRatio: 1,
        isLowVariance: true,
        isHighTransparency: false,
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
    maxAspectRatio = 9.5,
    minAspectRatio = 0.1,
    pageFrequencyThreshold = 0.3, // Reject if same image appears on >30% of pages
    allowDuplicates = false,
  } = options;

  const total = images.length;
  const processed = [];

  // Step 1: Pixel analysis on all images
  for (let i = 0; i < total; i++) {
    const item = images[i];
    onProgress({
      stage: "heuristic_analysis",
      current: i + 1,
      total,
      percent: Math.round(((i + 1) / total) * 100),
    });

    const analysis = await analyzeImagePixels(item.thumbnailDataUrl);
    processed.push({
      ...item,
      width: analysis.width || item.width,
      height: analysis.height || item.height,
      aspectRatio: analysis.aspectRatio,
      isLowVariance: analysis.isLowVariance,
      isHighTransparency: analysis.isHighTransparency,
      perceptualHash: analysis.hash,
    });
  }

  // Step 2: Calculate cross-page hash frequencies
  const hashPages = new Map();
  const totalPagesInDoc = Math.max(
    1,
    ...processed.map((img) => img.pageOrSlideNumber || 1)
  );

  for (const img of processed) {
    if (!img.perceptualHash) continue;
    if (!hashPages.has(img.perceptualHash)) {
      hashPages.set(img.perceptualHash, new Set());
    }
    hashPages.get(img.perceptualHash).add(img.pageOrSlideNumber);
  }

  const kept = [];
  const rejected = [];
  const seenHashes = new Set();

  for (const img of processed) {
    let rejectReason = null;

    // Check 1: Dimensions too small
    if (img.width < minDimension || img.height < minDimension) {
      rejectReason = `أبعاد صغيرة جداً (${img.width}×${img.height}px) — غالباً أيقونة أو لوجو`;
    }
    // Check 2: Extreme aspect ratio
    else if (img.aspectRatio > maxAspectRatio || img.aspectRatio < minAspectRatio) {
      rejectReason = `نسبة أبعاد غير طبيعية (${img.aspectRatio.toFixed(1)}:1) — خط زخرفي أو شريط فاصل`;
    }
    // Check 3: Solid color / low variance
    else if (img.isLowVariance) {
      rejectReason = "لون موحد أو تباين شبه معدوم — خلفية سوداء/بيضاء أو مساحة فارغة";
    }
    // Check 4: High transparency
    else if (img.isHighTransparency) {
      rejectReason = "شفافية عالية جداً — لوجو مفرغ أو علامة مائية شفافة";
    }
    // Check 5: Page frequency threshold (University / slide template header)
    else if (img.perceptualHash && hashPages.has(img.perceptualHash)) {
      const pageCount = hashPages.get(img.perceptualHash).size;
      const frequency = pageCount / totalPagesInDoc;
      if (totalPagesInDoc >= 3 && frequency > pageFrequencyThreshold) {
        rejectReason = `تكرار بنسبة ${(frequency * 100).toFixed(0)}% عبر الصفحات — شعار/ترويسة ثابتة للمحاضرة`;
      } else if (!allowDuplicates && seenHashes.has(img.perceptualHash)) {
        rejectReason = "تكرار مطابق لنفس الصورة في صفحة سابقة";
      }
    }

    if (rejectReason) {
      rejected.push({
        ...img,
        status: "rejected",
        rejectionReason: rejectReason,
      });
    } else {
      if (img.perceptualHash) {
        seenHashes.add(img.perceptualHash);
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
 * Fast client-side image compression for Gemini Vision API.
 * Resizes huge slide images down to max 640px and converts to lightweight JPEG (~30-50KB).
 * Reduces Gemini transmission latency by ~85% and prevents network timeouts!
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

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, width, height);
      ctx.drawImage(img, 0, 0, width, height);

      const jpegDataUrl = canvas.toDataURL("image/jpeg", quality);
      resolve(dataUrlToBase64Parts(jpegDataUrl));
    };
    img.onerror = () => resolve(dataUrlToBase64Parts(dataUrl));
    img.src = dataUrl;
  });
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
    .replace(/\[\s*(?:محتوى الشريحة|ملاحظات المحاضر|Slide Content|Speaker Notes)\s*\]\s*:?/gi, "")
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
 * Matches:
 * - Replacement character \ufffd
 * - Unmapped CID font tokens like (cid:123)
 * - Control characters / non-printable symbols (\u0000-\u001f)
 * - High proportion of isolated symbols or low ratio of readable letters
 * - Default empty placeholder strings
 */
export function isGarbledOrCorruptedText(text) {
  if (!text || typeof text !== "string") return true;
  const trimmed = text.trim();
  if (trimmed.length < 5) return true;
  if (/^صورة من الصفحة رقم \d+$/i.test(trimmed)) return true;

  // Explicit CIDFont codes or replacement chars
  if (/\(cid:\d+\)/i.test(trimmed)) return true;
  if (/\ufffd/.test(trimmed)) return true;

  // Count readable characters (Arabic incl. presentation forms, Latin, digits).
  // Ignore whitespace, bidi marks and emoji/symbols which are common in valid study PDFs.
  const readableLetters = (trimmed.match(/[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFFa-zA-Z0-9]/g) || []).length;
  const meaningful = trimmed.replace(/[\s\u200B-\u200F\u202A-\u202E\u2066-\u2069]/g, "").replace(/\p{Extended_Pictographic}/gu, "").length || 1;
  const ratio = readableLetters / meaningful;
  if (ratio < 0.45 && meaningful > 10) return true;

  // Excessive control or non-standard characters
  const badChars = (trimmed.match(/[\u0000-\u0008\u000B\u000E-\u001F\u007F-\u009F]/g) || []).length;
  if (badChars > 3 && badChars / trimmed.length > 0.01) return true;

  return false;
}

/**
 * AI Vision OCR: Extracts text, labels, anatomical pointers, and clinical findings
 * directly from the image pixels using Gemini Flash Multimodal.
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

  const raw = await generateMultimodal(
    prompt,
    [{ inlineData: { data: parts.data, mimeType: parts.mimeType } }],
    { ...aiConfig, model: aiConfig?.model || "gemini-3.5-flash-lite", max_tokens: 1500, temperature: 0.1 }
  );

  const cleaned = cleanContextText(raw);
  return cleaned || raw?.trim() || "";
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
 * Generate context-aware fallback questions with distributed correct answers (never fixed to index 0)
 */
function buildClinicalFallback(baseTitle, effectiveContext, effectiveLanguage, difficulty) {
  const isEn = effectiveLanguage === "en";
  const lower = `${baseTitle} ${effectiveContext}`.toLowerCase();

  let question = "";
  let correctOption = "";
  let distractors = [];
  let explanation = "";

  if (lower.includes("ecg") || lower.includes("ekg") || lower.includes("lead") || lower.includes("cardio") || lower.includes("heart") || lower.includes("قلب") || lower.includes("تخطيط")) {
    if (isEn) {
      question = baseTitle
        ? `Regarding the clinical visual demonstrating (${baseTitle}): What is the primary anatomical guideline or diagnostic interpretation?`
        : "Regarding the 12-lead ECG tracing / cardiac visual displayed: What is the primary anatomical guideline or diagnostic interpretation?";
      correctOption = "Standard precordial electrode placement (V1–V6) aligning horizontal cardiac electrical vectors";
      distractors = [
        "Inversion of limb leads producing artifactual axis deviation in leads I and aVL",
        "Acute anterolateral ST-elevation myocardial infarction requiring emergency intervention",
        "Subendocardial ischemia presentation requiring immediate dual antiplatelet therapy"
      ];
      explanation = "Proper anatomical placement of chest electrodes (V1–V6 across the 4th and 5th intercostal spaces) ensures accurate vector projection without electrode misplacement artifacts.";
    } else {
      question = baseTitle
        ? `بناءً على التوضيح السريري (${baseTitle}): ما هو المبدأ التشريحي أو التوجيه الطبي الأساسي المؤكد؟`
        : "بناءً على تخطيط القلب / التوزيع السريري المعروض: ما هو المبدأ التشريحي أو التوجيه الطبي الأساسي؟";
      correctOption = "الوضع التشريحي الصحيح للمساري الصدرية (V1–V6) لتحديد المتجهات الكهربائية للقلب بدقة";
      distractors = [
        "انعكاس أقطاب الأطراف مما يؤدي لانحراف وهمي في المحور الكهربائي للقلب",
        "بروتوكول التعامل العاجل مع احتشاء العضلة القلبية الحاد في المساري الأمامية",
        "علامات نقص تروية تحت الشغاف تتطلب تدخلاً دوائياً فورياً"
      ];
      explanation = "التثبيت الدقيق لمساري الصدر في المسافات الوربية المحددة يضمن تسجيل المتجهات الكهربائية الأفقية بصورة سليمة وتفادي التشخيص الخاطئ.";
    }
  } else if (lower.includes("x-ray") || lower.includes("ct") || lower.includes("mri") || lower.includes("radiolog") || lower.includes("اشعة") || lower.includes("أشعة") || lower.includes("رنين") || lower.includes("مقطعية")) {
    if (isEn) {
      question = baseTitle
        ? `Reviewing the radiological visual (${baseTitle}): Which diagnostic finding is most accurately indicated?`
        : "Reviewing the radiological visual: Which diagnostic finding is most accurately indicated?";
      correctOption = "Distinct radiological landmark and density interface corresponding to targeted anatomical structures";
      distractors = [
        "Acute cortical breach and displaced periosteal reaction requiring open reduction",
        "Homogeneous lobar consolidation with prominent air bronchograms",
        "Extensive soft tissue gas and dependent effusion with midline shift"
      ];
      explanation = "Radiological interpretation hinges on density differentials and contour landmarks demonstrated on standard imaging projections.";
    } else {
      question = baseTitle
        ? `بمراجعة الصورة الشعاعية (${baseTitle}): ما هو الاستنتاج التشخيصي أو المعلم الأبرز؟`
        : "بمراجعة الصورة الشعاعية المعروضة: ما هو الاستنتاج التشخيصي أو المعلم الأبرز؟";
      correctOption = "المعلم التشريحي الطبيعي وحدود الكثافة الشعاعية الدالة على البنية المستهدفة";
      distractors = [
        "كسر قشري حاد مع انزياح عظمي وتفاعل سمحاقي يتطلب تثبيتاً جراحياً",
        "تكثف فصي متجانس مع ظهور علامة القصبات الهوائية الشعاعية",
        "تجمع هوائي عميق في الأنسجة الرخوة مع انزياح تراكيب المحور"
      ];
      explanation = "التقييم الشعاعي السليم يعتمد على التمييز بين المعالم التشريحية الطبيعية وأي تغير في الكثافات النسيجية.";
    }
  } else if (lower.includes("histo") || lower.includes("patho") || lower.includes("cell") || lower.includes("biopsy") || lower.includes("نسيج") || lower.includes("خلية") || lower.includes("عينة")) {
    if (isEn) {
      question = baseTitle
        ? `Histopathological examination of (${baseTitle}): Which microscopic feature represents the key diagnostic hallmark?`
        : "Histopathological examination of this specimen: Which microscopic feature represents the key diagnostic hallmark?";
      correctOption = "Preserved cellular architecture and characteristic staining pattern of the target tissue";
      distractors = [
        "Marked cellular pleomorphism with atypical mitotic figures and loss of polarity",
        "Extensive caseous necrosis surrounded by Langhans multinucleated giant cells",
        "Chronic granulomatous infiltrate with perivascular fibrosis"
      ];
      explanation = "Histological examination relies on differential tissue affinities and structural organization to distinguish normal from pathological states.";
    } else {
      question = baseTitle
        ? `الفحص النسيجي المجهري لـ (${baseTitle}): ما هي العلامة التشخيصية الأبرز المعروضة؟`
        : "الفحص النسيجي المجهري للعينة المعروضة: ما هي العلامة التشخيصية الأبرز؟";
      correctOption = "المعالم النمطية للنسيج وطبيعة الصبغة الخلوية المميزة للعينة";
      distractors = [
        "تعدد أشكال خلوي مفرط مع انقسامات ميتوزية لا نمطية وفقدان التمايز",
        "نخر تجبني واسع محاط بخلايا لانغهانس العملاقة عديدة النوى",
        "ارتشاح حبيبي مزمن مع تليف متقدم حول الأوعية الدموية"
      ];
      explanation = "يعتمد الفحص الباثولوجي الدقيق على رصد التغيرات البنيوية في الخلايا ومقارنتها بالمعالم النسيجية الطبيعية.";
    }
  } else {
    // General clinical / anatomy
    if (isEn) {
      question = baseTitle
        ? `Based on the clinical visual and context (${baseTitle}): Which diagnostic or anatomical conclusion is most substantiated?`
        : "Based on the clinical visual: Which diagnostic or anatomical conclusion is most substantiated?";
      correctOption = "Target anatomical landmark and physiological features demonstrated in the visual presentation";
      distractors = [
        "Routine conservative observation without immediate surgical intervention",
        "Repeat diagnostic cross-sectional imaging or biopsy in 6 months for surveillance",
        "Benign congenital variant requiring no therapeutic escalation"
      ];
      explanation = "Accurate clinical assessment relies on identifying key hallmarks and correlating visual markers with established clinical protocols.";
    } else {
      question = baseTitle
        ? `استناداً للشريحة السريرية والسياق الموضح (${baseTitle}): ما هو الاستنتاج الطبي الأدق؟`
        : "استناداً للشريحة السريرية المعروضة: ما هو الاستنتاج الطبي الأدق؟";
      correctOption = "المعلم التشريحي والخصائص الوظيفية المحددة في الشريحة التعليمية";
      distractors = [
        "المتابعة الدورية التحفظية دون تدخل جراحي أو دوائي عاجل",
        "إعادة التصوير المقطعي أو الخزعة بعد ٦ أشهر للمتابعة الروتينية",
        "تغير خلقي حميد شائع لا يستدعي أي إجراء تدخلي"
      ];
      explanation = "يعتمد القرار السريري السليم على الربط بين المعالم البصرية المميزة في الشريحة والبروتوكولات الطبية المعتمدة.";
    }
  }

  // Randomize correctIndex across 0, 1, 2, 3
  const correctIndex = Math.floor(Math.random() * 4);
  const options = [...distractors];
  options.splice(correctIndex, 0, correctOption);

  return [{
    id: `q_fb_${Date.now()}_0`,
    question,
    options,
    correctIndex,
    explanation,
    difficulty,
  }];
}

/**
 * Stage 3: Context-aware Multimodal AI Quiz generation
 * Generates MCQs directly tied to the image and surrounding text
 */
export async function generateImageQuiz(image, options = {}, aiConfig) {
  const {
    numQuestions = 3,
    difficulty = "mixed",
    customExplanation = null,
    language = "auto",
  } = options;

  const parts = await optimizeImageForAi(image.thumbnailDataUrl, 512, 0.75);
  if (!parts) throw new Error("بيانات الصورة غير صالحة");

  const rawContext = customExplanation?.trim() || image.contextText?.trim() || "";
  const cleanedContext = cleanContextText(rawContext);
  const isGarbled = isGarbledOrCorruptedText(rawContext);
  const effectiveContext = (!isGarbled && cleanedContext)
    ? cleanedContext
    : "Clinical visual from lecture material (Extract context and read all labels directly from the image pixels)";

  // Determine language: If auto, check if text has English content or is medical (standard for OSCE is English)
  let effectiveLanguage = language;
  if (!effectiveLanguage || effectiveLanguage === "auto") {
    const textToScan = `${customExplanation || ""} ${image.contextText || ""} ${image.sourceFileName || ""}`;
    const arabic = (textToScan.match(/[\u0600-\u06FF]/g) || []).length;
    const latin = (textToScan.match(/[a-zA-Z]/g) || []).length;
    if (latin > 12 || latin > arabic * 0.3) {
      effectiveLanguage = "en";
    } else if (arabic > latin * 2) {
      effectiveLanguage = "ar";
    } else {
      effectiveLanguage = "en"; // Standard for OSCE/OSPE practicals is English
    }
  }

  const prompt = effectiveLanguage === "en"
    ? `You are an elite academic professor and expert medical examiner creating practical exam questions (OSCE / OSPE) to evaluate medical students on clinical and diagnostic visual data.
You will be provided with:
1) A high-yield clinical visual from medical lectures or exams (e.g., Histology, Radiology/X-Ray/CT/MRI, ECG tracings, Anatomy cadaver/illustration, Pathology specimen, Clinical signs).
2) The extracted context, title, and surrounding text from the slide/lecture.

TASK: Generate ${numQuestions} sophisticated, creative multiple-choice questions (MCQs) strictly anchored to this visual.
MANDATORY RULES:
1. STRICT VISUAL GROUNDING: Every question MUST require examining the image to answer (e.g. identify indicated structure/arrow, histological pattern, ECG wave anomaly, radiological sign, anatomical landmark). Strictly avoid generic theoretical trivia that can be answered without looking at the image!
2. DISTINCTIVENESS: Emphasize the specific hallmark visible in this exact image.
3. DISTRACTOR SYMMETRY: Exactly 4 options per question. All 4 options must be similar in length, style, and clinical plausibility. Only ONE unambiguous correct option. Do NOT make the correct answer noticeably longer than distractors.
4. CLINICAL EXPLANATION: Comprehensive explanation highlighting visual clues, differential diagnosis, and why alternative choices were ruled out.
5. STRICT LANGUAGE REQUIREMENT: All questions, answer options, and clinical explanations MUST BE 100% IN MEDICAL ENGLISH. Do NOT output Arabic words.
6. DIFFICULTY: ${difficulty}.
7. RANDOMIZED ANSWER POSITIONS: Randomly distribute the correct answer index across Option 0, 1, 2, and 3. DO NOT always make Option 0 the correct answer!
8. NO SCRAPER TAGS: NEVER mention or output "[محتوى الشريحة]" or "Slide Content" in questions or options.
9. PRECISE DECIMAL FORMATTING: When writing numerical values, intervals, or durations (e.g. ECG intervals like 0.12s, 0.20s, 0.04s, 0.44s, or dosages like 0.5 mg), ALWAYS write the complete decimal format with leading zero and unit (e.g. "0.12 seconds", "0.20 seconds"). NEVER truncate or drop the "0." decimal point!

Return STRICT JSON only (no markdown, no backticks, no preamble):
{
  "questions": [
    {
      "question": "Clear, concise clinical question referencing the visual...",
      "options": ["Option A", "Option B", "Option C", "Option D"],
      "explanation": "Detailed clinical rationale referencing visual hallmarks and why alternative options are excluded.",
      "correctAnswer": "Exact verbatim text of the correct option",
      "correctIndex": 0
    }
  ]
}

Lecture notes and context surrounding this visual:
${effectiveContext}`
    : `انت أستاذ وممتحن أكاديمي خبير بتجهز أسئلة كويز عملي (OSCE / OSPE) لتقييم فهم الطلاب للصور والأشكال التوضيحية والسريرية.
هيتبعتلك:
1) صورة علمية توضيحية من محاضرة أو ملف دراسي (أشعة، رسم قلب، نسيج، تشريح، علامات سريرية).
2) النص/الشرح المرتبط بيها من نفس الملف.

المطلوب: ولّد ${numQuestions} سؤال اختيار من متعدد ذكي وإبداعي (Creative) عن هذه الصورة تحديداً، مع الالتزام التام بالقواعد الصارمة الآتية:
القواعد الإلزامية:
1. الربط البصري المباشر (Strict Visual Grounding): يجب أن يستند السؤال تماماً على ما يظهر عيانياً في هذه الصورة (مثل: السهم، التغير النسيجي، الظلال الشعاعية، موجات الـ ECG، التركيب التشريحي). ممنوع وضع سؤال نظري عام يمكن حله دون رؤية الصورة!
2. تمايز الصور المتشابهة: إذا كان هناك أكثر من صورة لنفس المرض، ركز في سؤالك بدقة على المظهر الخاص أو المرحلة أو العلامة البصرية الفريدة المعروضة في هذه الصورة بالذات.
3. التوازن اللغوي: 4 خيارات متقاربة في الطول والأسلوب، خيار واحد صحيح فقط، مع تجنب جعل الخيار الصحيح أطول من المشتتات.
4. تفسير سريري دقيق (explanation): يشرح بالدليل البصري لماذا هذا الخيار صحيح ولماذا استبعدت الخيارات الأخرى.
5. درجة صعوبة: ${difficulty}.
6. تنويع موضع الإجابة الصحيحة: وزّع رقم الإجابة الصحيحة correctIndex عشوائياً بين 0 و 1 و 2 و 3. ممنوع جعل الخيار 0 هو الصحيح دائماً!
7. نظافة النص: ممنوع كتابة "[محتوى الشريحة]" أو أي وسوم استخراج داخل السؤال أو الخيارات.
8. كتابة الأرقام العشرية بدقة متناهية: إذا تضمنت الخيارات فترات زمنية أو جرعات أو قياسات (مثل فترات الـ ECG: 0.12 ثانية، 0.20 ثانية، 0.04 ثانية)، اكتب الرقم العشري كاملاً بالصفر والعلامة العشرية والوحدة (مثل "0.12 ثانية"). ممنوع حذف الصفر أو النقطة العشرية نهائياً!

رجّع النتيجة JSON فقط بالشكل ده:
{
  "questions": [
    {
      "question": "نص السؤال المرتبط بالصورة المرفقة...",
      "options": ["الخيار الأول", "الخيار الثاني", "الخيار الثالث", "الخيار الرابع"],
      "explanation": "الشرح التعليمي المستند لما تظهره الصورة...",
      "correctAnswer": "نص الخيار الصحيح حرفياً",
      "correctIndex": 0
    }
  ]
}

الشرح والنص المحيط بالصورة:
${effectiveContext}`;

  try {
    const raw = await generateMultimodal(
      prompt,
      [{ inlineData: { data: parts.data, mimeType: parts.mimeType } }],
      { ...aiConfig, model: aiConfig?.model || "gemini-3.5-flash-lite", max_tokens: 1500, temperature: 0.15 }
    );

    const parsed = parseAiJson(raw);
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
          id: `q_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
          question: cleanQuestion,
          options: rawOptions,
          correctIndex: finalCorrect,
          correct_index: finalCorrect,
          explanation: cleanExp,
          difficulty: q.difficulty || difficulty,
        };
      });
    }
  } catch (err) {
    console.warn("[generateImageQuiz] AI multimodal call failed, falling back to context generator:", err.message);
  }

  // Robust Clinical Fallback: Generate context-anchored questions with randomized correct answers & medical distractors
  const baseTitle = cleanContextText(image.contextText || "").slice(0, 80)
    || cleanContextText(image.sourceFileName || "")
    || (effectiveLanguage === "en" ? "Clinical visual" : "الشريحة السريرية");

  return buildClinicalFallback(baseTitle, effectiveContext, effectiveLanguage, difficulty);
}
