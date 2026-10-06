/**
 * imageExtractor.js
 * Client-side extraction engine for embedded images from PDF and PPTX files.
 * Extracts real embedded raster images, associates surrounding text context,
 * and builds uniform ExtractedImage data structures.
 */

// Self-contained UUID generator
function generateId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "img_" + Date.now().toString(36) + "_" + Math.random().toString(36).substr(2, 9);
}

/**
 * Convert an ArrayBuffer or Uint8Array to a Blob
 */
export function bufferToBlob(buffer, mimeType = "image/png") {
  return new Blob([buffer], { type: mimeType });
}

/**
 * Convert a Blob to a Base64 data URL
 */
export function blobToDataUrl(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

/**
 * Extract image data from PDF.js image object to a PNG Blob + Data URL
 */
async function pdfImageToBlobAndDataUrl(imgObj) {
  const width = imgObj.width;
  const height = imgObj.height;
  if (!width || !height) return null;

  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return null;

  // Case 1: Image is already an ImageBitmap or HTMLImageElement
  if (imgObj.bitmap) {
    ctx.drawImage(imgObj.bitmap, 0, 0);
  } else if (imgObj.data) {
    const data = imgObj.data;
    const pixelCount = width * height;
    const imgData = ctx.createImageData(width, height);
    const rgba = imgData.data;

    // Check channels: Grayscale (1), RGB (3), or RGBA (4)
    if (data.length === pixelCount * 4) {
      rgba.set(data);
    } else if (data.length === pixelCount * 3) {
      let srcIdx = 0;
      let dstIdx = 0;
      for (let i = 0; i < pixelCount; i++) {
        rgba[dstIdx] = data[srcIdx];
        rgba[dstIdx + 1] = data[srcIdx + 1];
        rgba[dstIdx + 2] = data[srcIdx + 2];
        rgba[dstIdx + 3] = 255;
        srcIdx += 3;
        dstIdx += 4;
      }
    } else if (data.length === pixelCount) {
      // Grayscale
      let dstIdx = 0;
      for (let i = 0; i < pixelCount; i++) {
        const val = data[i];
        rgba[dstIdx] = val;
        rgba[dstIdx + 1] = val;
        rgba[dstIdx + 2] = val;
        rgba[dstIdx + 3] = 255;
        dstIdx += 4;
      }
    } else {
      // Unknown buffer layout fallback
      return null;
    }
    ctx.putImageData(imgData, 0, 0);
  } else {
    return null;
  }

  const dataUrl = canvas.toDataURL("image/png");
  const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
  return { blob, dataUrl, width, height };
}

/**
 * Extract images and context from PDF files using pdfjs-dist
 */
export async function extractImagesFromPdf(file, onProgress = () => {}) {
  const pdfjsLib = await import("pdfjs-dist");
  pdfjsLib.GlobalWorkerOptions.workerSrc = new URL(
    "pdfjs-dist/build/pdf.worker.min.mjs",
    import.meta.url
  ).toString();

  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: new Uint8Array(arrayBuffer),
    cMapUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/cmaps/",
    cMapPacked: true,
    standardFontDataUrl: "https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/standard_fonts/",
    useSystemFonts: true,
    disableFontFace: false,
    isEvalSupported: false,
  });

  const extracted = [];
  try {
    const pdf = await loadingTask.promise;
    const numPages = pdf.numPages;
    const OPS = pdfjsLib.OPS;

    for (let pageNum = 1; pageNum <= numPages; pageNum++) {
    onProgress({
      stage: "parsing_pdf",
      currentPage: pageNum,
      totalPages: numPages,
      percent: Math.round((pageNum / numPages) * 100),
    });

    const page = await pdf.getPage(pageNum);
    const viewport = page.getViewport({ scale: 1.0 });

    // 1. Extract all text items with bounding coordinates
    const textContent = await page.getTextContent();
    const textBlocks = [];
    for (const item of textContent.items) {
      if (!item.str || !item.str.trim()) continue;
      // transform: [scaleX, skewY, skewX, scaleY, x, y]
      const tx = item.transform[4];
      const ty = item.transform[5];
      textBlocks.push({
        text: item.str,
        x: tx,
        y: ty,
        width: item.width || 0,
        height: item.height || 0,
      });
    }
    const fullPageText = textBlocks.map((t) => t.text).join(" ").trim();

    // 2. Extract Operator List to locate images and their coordinates
    const opList = await page.getOperatorList();
    const { fnArray, argsArray } = opList;

    // Transformation stack to trace current matrix
    let matrixStack = [[1, 0, 0, 1, 0, 0]];
    let currentMatrix = [1, 0, 0, 1, 0, 0];

    const imagePositions = [];

    for (let i = 0; i < fnArray.length; i++) {
      const fn = fnArray[i];
      const args = argsArray[i];

      if (fn === OPS.save) {
        matrixStack.push([...currentMatrix]);
      } else if (fn === OPS.restore) {
        if (matrixStack.length > 1) {
          currentMatrix = matrixStack.pop();
        }
      } else if (fn === OPS.transform) {
        // Multiply matrices: currentMatrix * args
        const [a1, b1, c1, d1, e1, f1] = currentMatrix;
        const [a2, b2, c2, d2, e2, f2] = args;
        currentMatrix = [
          a1 * a2 + c1 * b2,
          b1 * a2 + d1 * b2,
          a1 * c2 + c1 * d2,
          b1 * c2 + d1 * d2,
          a1 * e2 + c1 * f2 + e1,
          b1 * e2 + d1 * f2 + f1,
        ];
      } else if (fn === OPS.paintImageXObject || fn === OPS.paintInlineImageXObject) {
        const imgName = args[0];
        imagePositions.push({
          imgName,
          x: currentMatrix[4],
          y: currentMatrix[5],
          width: Math.abs(currentMatrix[0]),
          height: Math.abs(currentMatrix[3]),
        });
      }
    }

    // 3. Resolve images from page.objs / page.commonObjs
    for (let imgIdx = 0; imgIdx < imagePositions.length; imgIdx++) {
      const pos = imagePositions[imgIdx];
      let imgObj = null;

      try {
        imgObj = await new Promise((resolve) => {
          if (page.objs.has(pos.imgName)) {
            page.objs.get(pos.imgName, (obj) => resolve(obj));
          } else if (page.commonObjs.has(pos.imgName)) {
            page.commonObjs.get(pos.imgName, (obj) => resolve(obj));
          } else {
            resolve(null);
          }
        });
      } catch (err) {
        imgObj = null;
      }

      if (!imgObj) continue;

      const converted = await pdfImageToBlobAndDataUrl(imgObj);
      if (!converted) continue;

      // 4. Proximity text context matching
      // Find texts on this page close to the image vertically (within 180 points)
      const nearbyTexts = textBlocks
        .filter((tb) => {
          const dy = Math.abs(tb.y - pos.y);
          return dy <= 180;
        })
        .map((tb) => tb.text)
        .join(" ")
        .trim();

      const rawText =
        nearbyTexts.length >= 30
          ? nearbyTexts
          : fullPageText.length > 0
          ? fullPageText.slice(0, 1200)
          : "";

      // Clean out junk, CIDFont unmapped codes, and replacement characters
      const cleanText = rawText
        .replace(/\(cid:\d+\)/gi, "")
        .replace(/\ufffd/g, "")
        .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
        .replace(/\s+/g, " ")
        .trim();

      const contextText =
        cleanText.length >= 10
          ? cleanText
          : `صورة من الصفحة رقم ${pageNum}`;

      extracted.push({
        id: generateId(),
        sourceFileName: file.name,
        sourceType: "pdf",
        pageOrSlideNumber: pageNum,
        imageBlob: converted.blob,
        thumbnailDataUrl: converted.dataUrl,
        contextText,
        boundingBox: {
          x: Math.round(pos.x),
          y: Math.round(pos.y),
          width: Math.round(pos.width || converted.width),
          height: Math.round(pos.height || converted.height),
        },
        width: converted.width,
        height: converted.height,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }  }

    return extracted;
  } finally {
    // MEMORY LEAK FIX: release the pdf document + file buffer (≈3-4× file
    // size retained until destroyed). Image-heavy PDFs held the most memory
    // of any pipeline here. Runs on the happy path AND on throws.
    await loadingTask.destroy().catch(() => {});
  }
}

/**
 * Decode XML entities in text strings
 */
function decodeXml(str = "") {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_, n) => String.fromCharCode(parseInt(n, 16)));
}

/**
 * Extract images and context from PPTX presentations using JSZip
 */
export async function extractImagesFromPptx(file, onProgress = () => {}) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

  // Discover all slide files
  const slideFileNames = Object.keys(zip.files)
    .filter((name) => /^ppt\/slides\/slide\d+\.xml$/.test(name))
    .sort((a, b) => {
      const numA = parseInt(a.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
      const numB = parseInt(b.match(/slide(\d+)\.xml/)?.[1] || "0", 10);
      return numA - numB;
    });

  const totalSlides = slideFileNames.length;
  const extracted = [];

  for (let sIdx = 0; sIdx < totalSlides; sIdx++) {
    const slidePath = slideFileNames[sIdx];
    const slideNumber = sIdx + 1;

    onProgress({
      stage: "parsing_pptx",
      currentPage: slideNumber,
      totalPages: totalSlides,
      percent: Math.round((slideNumber / totalSlides) * 100),
    });

    const slideXml = await zip.files[slidePath].async("string");

    // 1. Extract all text inside <a:t>
    const slideTextParts = [...slideXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
      .map((m) => decodeXml(m[1]).trim())
      .filter(Boolean);
    const slideText = slideTextParts.join(" ").trim();

    // 2. Extract speaker notes if present
    let notesText = "";
    const notesRelPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const notesSlidePath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    if (zip.files[notesSlidePath]) {
      const notesXml = await zip.files[notesSlidePath].async("string");
      const noteParts = [...notesXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((m) => decodeXml(m[1]).trim())
        .filter(Boolean);
      notesText = noteParts.join(" ").trim();
    }

    const fullSlideContext = [
      slideText ? `[محتوى الشريحة]: ${slideText}` : "",
      notesText ? `[ملاحظات المحاضر]: ${notesText}` : "",
    ]
      .filter(Boolean)
      .join("\n")
      .trim();

    // 3. Resolve slide relationships to find image media targets
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const relsMap = {};
    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async("string");
      const relMatches = relsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi);
      for (const rm of relMatches) {
        const rId = rm[1];
        let target = rm[2];
        // Clean relative path ../media/image1.png -> ppt/media/image1.png
        if (target.startsWith("../")) {
          target = "ppt/" + target.substring(3);
        } else if (!target.startsWith("ppt/")) {
          target = "ppt/slides/" + target;
        }
        relsMap[rId] = target;
      }
    }

    // 4. Find all picture blocks <p:pic> in the slide XML
    const picMatches = slideXml.matchAll(/<p:pic[\s\S]*?<\/p:pic>/g);
    for (const pm of picMatches) {
      const picXml = pm[0];
      const blipMatch = picXml.match(/<a:blip[^>]*r:embed="([^"]+)"/);
      if (!blipMatch) continue;
      const rId = blipMatch[1];
      const mediaPath = relsMap[rId];
      if (!mediaPath || !zip.files[mediaPath]) continue;

      // Skip EMF/WMF legacy vectors that browsers cannot display
      if (/\.(emf|wmf)$/i.test(mediaPath)) continue;

      const mediaFile = zip.files[mediaPath];
      const ext = mediaPath.split(".").pop()?.toLowerCase() || "png";
      const mimeType =
        ext === "jpg" || ext === "jpeg"
          ? "image/jpeg"
          : ext === "webp"
          ? "image/webp"
          : ext === "gif"
          ? "image/gif"
          : "image/png";

      const buffer = await mediaFile.async("arraybuffer");
      const blob = new Blob([buffer], { type: mimeType });
      const dataUrl = await blobToDataUrl(blob);

      // Measure dimensions
      const imgMeta = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = dataUrl;
      });

      extracted.push({
        id: generateId(),
        sourceFileName: file.name,
        sourceType: "pptx",
        pageOrSlideNumber: slideNumber,
        imageBlob: blob,
        thumbnailDataUrl: dataUrl,
        contextText: fullSlideContext || `صورة من الشريحة رقم ${slideNumber}`,
        width: imgMeta.width,
        height: imgMeta.height,
        status: "pending",
        createdAt: new Date().toISOString(),
      });
    }
  }

  return extracted;
}

/**
 * Universal router for extracting images from any supported file (PDF, PPTX, Images)
 */
export async function extractImagesFromFile(file, onProgress = () => {}) {
  const ext = file.name.split(".").pop()?.toLowerCase() || "";

  if (ext === "pdf") {
    return extractImagesFromPdf(file, onProgress);
  } else if (ext === "pptx" || ext === "ppt") {
    return extractImagesFromPptx(file, onProgress);
  } else if (["png", "jpg", "jpeg", "webp"].includes(ext)) {
    // Single image file
    const dataUrl = await blobToDataUrl(file);
    const imgMeta = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });

    return [
      {
        id: generateId(),
        sourceFileName: file.name,
        sourceType: "image",
        pageOrSlideNumber: 1,
        imageBlob: file,
        thumbnailDataUrl: dataUrl,
        contextText: `صورة مرفوعة مباشرة: ${file.name}`,
        width: imgMeta.width,
        height: imgMeta.height,
        status: "pending",
        createdAt: new Date().toISOString(),
      },
    ];
  } else {
    throw new Error(`صيغة الملف غير مدعومة: .${ext}. يدعم النظام ملفات PDF و PPTX والصور.`);
  }
}
