/**
 * imageExtractor.js
 * Client-side extraction engine for embedded images from PDF and PPTX files.
 * Extracts real embedded raster images, performs 2D Spatial Caption & Proximity Binding
 * so each image gets its own exact figure caption and adjacent text (preventing cross-image
 * context bleeding on multi-image slides), and builds uniform ExtractedImage data structures.
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
 * Clean out junk, CIDFont unmapped codes, and replacement characters
 */
function sanitizeExtractedText(raw = "") {
  return String(raw || "")
    .replace(/\(cid:\d+\)/gi, "")
    .replace(/\ufffd/g, "")
    .replace(/[\u0000-\u001F\u007F-\u009F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Compute minimum 2D distance between two axis-aligned bounding boxes:
 * boxA = { left, top, right, bottom }, boxB = { left, top, right, bottom }
 */
function rectDistance(boxA, boxB) {
  const dx = Math.max(0, boxA.left - boxB.right, boxB.left - boxA.right);
  const dy = Math.max(0, boxA.top - boxB.bottom, boxB.top - boxA.bottom);
  return Math.hypot(dx, dy);
}

/**
 * Check if a text line looks like a figure caption or anatomical/clinical pointer label
 */
function isCaptionLikeLine(text = "") {
  const trimmed = text.trim();
  if (!trimmed) return false;
  if (/^(?:fig(?:ure)?|table|diagram|image|photo|slide|plate|chart|box|arrow|pointer|note|شريحة|شكل|صورة|جدول|رسم|مخطط|سهم|علامة|ملاحظة)\b/i.test(trimmed)) {
    return true;
  }
  if (/^\(?[A-Za-z0-9\u0600-\u06FF]{1,3}[\)\.\-\:]\s+\S+/.test(trimmed) && trimmed.length <= 140) {
    return true;
  }
  return trimmed.length >= 4 && trimmed.length <= 110;
}

/**
 * Group individual PDF text items into logical reading lines with bounding boxes
 */
function buildPdfTextLines(textItems = []) {
  const rawItems = [];
  for (const item of textItems) {
    const str = sanitizeExtractedText(item.str || "");
    if (!str) continue;
    const tx = Number(item.transform?.[4]) || 0;
    const ty = Number(item.transform?.[5]) || 0;
    const fontH = Math.max(8, Math.abs(Number(item.transform?.[3]) || Number(item.height) || 12));
    const w = Math.max(4, Number(item.width) || str.length * (fontH * 0.5));
    rawItems.push({
      text: str,
      left: tx,
      right: tx + w,
      // In PDF user space, y increases upward; normalize to [top, bottom] where top <= bottom in Y-up or standard 2D rect
      top: ty,
      bottom: ty + fontH,
      yCenter: ty + fontH / 2,
      fontSize: fontH,
    });
  }

  // Sort top-to-bottom (descending Y in PDF coords), then left-to-right
  rawItems.sort((a, b) => {
    if (Math.abs(b.top - a.top) > 5) return b.top - a.top;
    return a.left - b.left;
  });

  const lines = [];
  for (const item of rawItems) {
    const lastLine = lines[lines.length - 1];
    if (lastLine && Math.abs(lastLine.top - item.top) <= Math.max(5, lastLine.fontSize * 0.45)) {
      lastLine.parts.push(item);
      lastLine.left = Math.min(lastLine.left, item.left);
      lastLine.right = Math.max(lastLine.right, item.right);
      lastLine.top = Math.min(lastLine.top, item.top);
      lastLine.bottom = Math.max(lastLine.bottom, item.bottom);
      lastLine.fontSize = Math.max(lastLine.fontSize, item.fontSize);
    } else {
      lines.push({
        parts: [item],
        left: item.left,
        right: item.right,
        top: item.top,
        bottom: item.bottom,
        fontSize: item.fontSize,
      });
    }
  }

  return lines.map((line) => {
    line.parts.sort((a, b) => a.left - b.left);
    const text = sanitizeExtractedText(line.parts.map((p) => p.text).join(" "));
    return {
      text,
      left: line.left,
      right: line.right,
      top: line.top,
      bottom: line.bottom,
      fontSize: line.fontSize,
    };
  }).filter((l) => l.text.length > 0);
}

/**
 * Extract image data from PDF.js image object to a PNG Blob + Data URL
 * Releases temporary canvas memory immediately after conversion.
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

  try {
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
        return null;
      }
      ctx.putImageData(imgData, 0, 0);
    } else {
      return null;
    }

    const dataUrl = canvas.toDataURL("image/png");
    const blob = await new Promise((resolve) => canvas.toBlob(resolve, "image/png"));
    return { blob, dataUrl, width, height };
  } finally {
    // Free backing store immediately to prevent GPU/RAM spikes on large PDFs
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * Extract images and spatially bound context from PDF files using pdfjs-dist
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
      try {
        // 1. Extract all text items and group into logical lines with bounding coordinates
        const textContent = await page.getTextContent();
        const textLines = buildPdfTextLines(textContent.items || []);
        const fullPageText = textLines.map((l) => l.text).join(" ").trim();

        // Detect main slide/page heading (largest font or top-most substantial line)
        let pageHeading = "";
        if (textLines.length > 0) {
          const topCandidates = textLines.slice(0, Math.min(4, textLines.length));
          const bestHeading = [...topCandidates].sort((a, b) => b.fontSize - a.fontSize)[0];
          if (bestHeading && bestHeading.text.length >= 3 && bestHeading.text.length <= 140) {
            pageHeading = bestHeading.text;
          }
        }

        // 2. Extract Operator List to locate images and their transformation matrices
        const opList = await page.getOperatorList();
        const { fnArray, argsArray } = opList;

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
            const w = Math.abs(currentMatrix[0]) || 120;
            const h = Math.abs(currentMatrix[3]) || 120;
            const x = currentMatrix[4];
            const y = currentMatrix[5];
            const left = Math.min(x, x + currentMatrix[0]);
            const bottom = Math.max(y, y + currentMatrix[3]);
            const top = Math.min(y, y + currentMatrix[3]);
            const right = Math.max(x, x + currentMatrix[0]);

            imagePositions.push({
              imgName,
              x,
              y,
              width: w,
              height: h,
              rect: { left, top, right, bottom },
            });
          }
        }

        // 3. Resolve images and perform exclusive spatial text binding
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
          } catch {
            imgObj = null;
          }

          if (!imgObj) continue;

          const converted = await pdfImageToBlobAndDataUrl(imgObj);
          if (!converted) continue;

          // 4. 2D Spatial Proximity & Exclusive Caption Binding
          // For each text line on the page, measure distance to THIS image vs OTHER images on the same page
          const directCaptionLines = [];
          const exclusiveNearbyLines = [];

          for (const line of textLines) {
            const distToThis = rectDistance(pos.rect, line);
            let minDistToOther = Infinity;

            if (imagePositions.length > 1) {
              for (let otherIdx = 0; otherIdx < imagePositions.length; otherIdx++) {
                if (otherIdx === imgIdx) continue;
                const dOther = rectDistance(imagePositions[otherIdx].rect, line);
                if (dOther < minDistToOther) minDistToOther = dOther;
              }
            }

            const isClosestToThis = distToThis <= minDistToOther + 12;

            // Direct caption: very close to image (<= 65pt) and closest to this image
            if (distToThis <= 65 && isClosestToThis) {
              directCaptionLines.push({ text: line.text, dist: distToThis });
            } else if (distToThis <= 110 && isClosestToThis && isCaptionLikeLine(line.text)) {
              directCaptionLines.push({ text: line.text, dist: distToThis });
            } else if (distToThis <= 220 && isClosestToThis) {
              exclusiveNearbyLines.push({ text: line.text, dist: distToThis });
            }
          }

          directCaptionLines.sort((a, b) => a.dist - b.dist);
          exclusiveNearbyLines.sort((a, b) => a.dist - b.dist);

          const directCaption = sanitizeExtractedText(
            directCaptionLines.map((l) => l.text).join(" | ")
          ).slice(0, 450);

          const nearbyContext = sanitizeExtractedText(
            exclusiveNearbyLines.map((l) => l.text).join(" ")
          ).slice(0, 700);

          const structuredParts = [];
          if (directCaption) {
            structuredParts.push(`[التسمية والنص الملاصق للصورة مباشرة]: ${directCaption}`);
          }
          if (nearbyContext && nearbyContext !== directCaption) {
            structuredParts.push(`[الشرح المحيط بالصورة]: ${nearbyContext}`);
          }
          if (pageHeading && !directCaption.includes(pageHeading)) {
            structuredParts.push(`[عنوان الشريحة/الصفحة]: ${pageHeading}`);
          }
          if (structuredParts.length === 0 && fullPageText.length > 0) {
            structuredParts.push(`[سياق الصفحة ${pageNum}]: ${fullPageText.slice(0, 800)}`);
          }

          const contextText =
            structuredParts.join("\n").trim() || `صورة من الصفحة رقم ${pageNum}`;

          extracted.push({
            id: generateId(),
            sourceFileName: file.name,
            sourceType: "pdf",
            pageOrSlideNumber: pageNum,
            imageOnPageIndex: imgIdx + 1,
            totalImagesOnPage: imagePositions.length,
            imageBlob: converted.blob,
            thumbnailDataUrl: converted.dataUrl,
            directCaption: directCaption || pageHeading || "",
            pageHeading: pageHeading || "",
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
        }
      } finally {
        try {
          page.cleanup();
        } catch {}
      }
    }

    return extracted;
  } finally {
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
 * Parse <a:off x="..." y="..."/> and <a:ext cx="..." cy="..."/> from PPTX XML snippet
 * Converts EMUs (English Metric Units, 1 pt = 12700 EMUs) to points for spatial comparison
 */
function parsePptxRect(xmlSnippet = "") {
  const offMatch = xmlSnippet.match(/<a:off\s+[^>]*x="(-?\d+)"[^>]*y="(-?\d+)"/i);
  const extMatch = xmlSnippet.match(/<a:ext\s+[^>]*cx="(\d+)"[^>]*cy="(\d+)"/i);
  if (!offMatch) return null;
  const xPt = Math.round(Number(offMatch[1]) / 12700);
  const yPt = Math.round(Number(offMatch[2]) / 12700);
  const wPt = extMatch ? Math.max(10, Math.round(Number(extMatch[1]) / 12700)) : 100;
  const hPt = extMatch ? Math.max(10, Math.round(Number(extMatch[2]) / 12700)) : 60;
  return {
    left: xPt,
    top: yPt,
    right: xPt + wPt,
    bottom: yPt + hPt,
    width: wPt,
    height: hPt,
  };
}

/**
 * Extract images and spatially matched context from PPTX presentations using JSZip
 */
export async function extractImagesFromPptx(file, onProgress = () => {}) {
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(file);

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

    // 1. Parse all text shapes <p:sp> with their spatial coordinates and title status
    const textShapes = [];
    let slideTitle = "";
    const spMatches = slideXml.matchAll(/<p:sp\b[\s\S]*?<\/p:sp>/g);
    for (const spMatch of spMatches) {
      const spXml = spMatch[0];
      const parts = [...spXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((m) => decodeXml(m[1]).trim())
        .filter(Boolean);
      const text = sanitizeExtractedText(parts.join(" "));
      if (!text) continue;

      const isTitle = /<p:ph[^>]*type="(?:title|ctrTitle)"/i.test(spXml);
      if (isTitle && !slideTitle) {
        slideTitle = text;
      }

      const rect = parsePptxRect(spXml);
      textShapes.push({
        text,
        isTitle,
        rect,
      });
    }

    const slideText = textShapes.map((s) => s.text).join(" ").trim();
    if (!slideTitle && textShapes.length > 0) {
      slideTitle = textShapes[0].text.slice(0, 120);
    }

    // 2. Extract speaker notes if present
    let notesText = "";
    const notesSlidePath = `ppt/notesSlides/notesSlide${slideNumber}.xml`;
    if (zip.files[notesSlidePath]) {
      const notesXml = await zip.files[notesSlidePath].async("string");
      const noteParts = [...notesXml.matchAll(/<a:t>([\s\S]*?)<\/a:t>/g)]
        .map((m) => decodeXml(m[1]).trim())
        .filter(Boolean);
      notesText = sanitizeExtractedText(noteParts.join(" "));
    }

    // 3. Resolve slide relationships to find image media targets
    const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
    const relsMap = {};
    if (zip.files[relsPath]) {
      const relsXml = await zip.files[relsPath].async("string");
      const relMatches = relsXml.matchAll(/<Relationship\s+[^>]*Id="([^"]+)"[^>]*Target="([^"]+)"/gi);
      for (const rm of relMatches) {
        const rId = rm[1];
        let target = rm[2];
        if (target.startsWith("../")) {
          target = "ppt/" + target.substring(3);
        } else if (!target.startsWith("ppt/")) {
          target = "ppt/slides/" + target;
        }
        relsMap[rId] = target;
      }
    }

    // 4. Find all picture blocks <p:pic> in the slide XML first so we can compare coordinates across pictures
    const rawPics = [];
    const picMatches = slideXml.matchAll(/<p:pic\b[\s\S]*?<\/p:pic>/g);
    for (const pm of picMatches) {
      const picXml = pm[0];
      const blipMatch = picXml.match(/<a:blip[^>]*r:embed="([^"]+)"/);
      if (!blipMatch) continue;
      const rId = blipMatch[1];
      const mediaPath = relsMap[rId];
      if (!mediaPath || !zip.files[mediaPath]) continue;
      if (/\.(emf|wmf)$/i.test(mediaPath)) continue;

      // Extract embedded alt-text / description / name from <p:cNvPr>
      const cNvPrMatch = picXml.match(/<p:cNvPr\b([^>]*)\/?>/i);
      let altDescr = "";
      if (cNvPrMatch) {
        const attrs = cNvPrMatch[1] || "";
        const descrAttr = decodeXml(attrs.match(/\bdescr="([^"]+)"/i)?.[1] || "").trim();
        const titleAttr = decodeXml(attrs.match(/\btitle="([^"]+)"/i)?.[1] || "").trim();
        const nameAttr = decodeXml(attrs.match(/\bname="([^"]+)"/i)?.[1] || "").trim();
        const cleanName = /^(?:picture|image|graphic|صورة|شكل)\s*\d*$/i.test(nameAttr) ? "" : nameAttr;
        altDescr = sanitizeExtractedText([titleAttr, descrAttr, cleanName].filter(Boolean).join(" — "));
      }

      const rect = parsePptxRect(picXml);
      rawPics.push({
        rId,
        mediaPath,
        altDescr,
        rect,
      });
    }

    // 5. Extract each picture with spatially matched text shapes
    for (let pIdx = 0; pIdx < rawPics.length; pIdx++) {
      const picInfo = rawPics[pIdx];
      const mediaFile = zip.files[picInfo.mediaPath];
      const ext = picInfo.mediaPath.split(".").pop()?.toLowerCase() || "png";
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

      const imgMeta = await new Promise((resolve) => {
        const img = new Image();
        img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
        img.onerror = () => resolve({ width: 0, height: 0 });
        img.src = dataUrl;
      });

      // Match text shapes spatially to THIS picture vs other pictures on the slide
      const directCaptions = [];
      const nearbyShapes = [];

      if (picInfo.altDescr) {
        directCaptions.push({ text: picInfo.altDescr, dist: 0 });
      }

      for (const shape of textShapes) {
        if (!picInfo.rect || !shape.rect) {
          if (!shape.isTitle) nearbyShapes.push({ text: shape.text, dist: 100 });
          continue;
        }
        const distToThis = rectDistance(picInfo.rect, shape.rect);
        let minDistToOther = Infinity;
        if (rawPics.length > 1) {
          for (let otherIdx = 0; otherIdx < rawPics.length; otherIdx++) {
            if (otherIdx === pIdx || !rawPics[otherIdx].rect) continue;
            const dOther = rectDistance(rawPics[otherIdx].rect, shape.rect);
            if (dOther < minDistToOther) minDistToOther = dOther;
          }
        }

        const isClosest = distToThis <= minDistToOther + 18;
        if (distToThis <= 85 && isClosest && !shape.isTitle) {
          directCaptions.push({ text: shape.text, dist: distToThis });
        } else if (isClosest && !shape.isTitle) {
          nearbyShapes.push({ text: shape.text, dist: distToThis });
        }
      }

      directCaptions.sort((a, b) => a.dist - b.dist);
      nearbyShapes.sort((a, b) => a.dist - b.dist);

      const directCaption = sanitizeExtractedText(
        directCaptions.map((c) => c.text).join(" | ")
      ).slice(0, 450);

      const nearbyContext = sanitizeExtractedText(
        nearbyShapes.map((s) => s.text).join(" ")
      ).slice(0, 700);

      const contextParts = [];
      if (directCaption) {
        contextParts.push(`[التسمية والنص الملاصق للصورة مباشرة]: ${directCaption}`);
      }
      if (nearbyContext && nearbyContext !== directCaption) {
        contextParts.push(`[الشرح المرتبط بالصورة في الشريحة]: ${nearbyContext}`);
      }
      if (slideTitle && !directCaption.includes(slideTitle)) {
        contextParts.push(`[عنوان الشريحة]: ${slideTitle}`);
      }
      if (notesText) {
        contextParts.push(`[ملاحظات المحاضر]: ${notesText.slice(0, 400)}`);
      }
      if (contextParts.length === 0 && slideText) {
        contextParts.push(`[محتوى الشريحة ${slideNumber}]: ${slideText.slice(0, 700)}`);
      }

      extracted.push({
        id: generateId(),
        sourceFileName: file.name,
        sourceType: "pptx",
        pageOrSlideNumber: slideNumber,
        imageOnPageIndex: pIdx + 1,
        totalImagesOnPage: rawPics.length,
        imageBlob: blob,
        thumbnailDataUrl: dataUrl,
        directCaption: directCaption || slideTitle || "",
        pageHeading: slideTitle || "",
        contextText: contextParts.join("\n").trim() || `صورة من الشريحة رقم ${slideNumber}`,
        boundingBox: picInfo.rect
          ? {
              x: picInfo.rect.left,
              y: picInfo.rect.top,
              width: picInfo.rect.width,
              height: picInfo.rect.height,
            }
          : undefined,
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
    const dataUrl = await blobToDataUrl(file);
    const imgMeta = await new Promise((resolve) => {
      const img = new Image();
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({ width: 0, height: 0 });
      img.src = dataUrl;
    });

    const cleanName = file.name.replace(/\.[^/.]+$/, "").replace(/[_-]+/g, " ").trim();
    return [
      {
        id: generateId(),
        sourceFileName: file.name,
        sourceType: "image",
        pageOrSlideNumber: 1,
        imageOnPageIndex: 1,
        totalImagesOnPage: 1,
        imageBlob: file,
        thumbnailDataUrl: dataUrl,
        directCaption: cleanName,
        pageHeading: cleanName,
        contextText: `صورة مرفوعة مباشرة: ${cleanName}`,
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
