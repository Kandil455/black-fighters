/**
 * imageExport.js
 * Multi-format exporter for extracted images and quizzes:
 * - PDF (jsPDF with image embedding, questions, and RTL notes)
 * - PPTX (pptxgenjs slides with images and speaker notes)
 * - Images ZIP (JSZip archive with structured filenames)
 * - Quiz JSON (Ready for Quiz Bank and challenge rooms)
 */

/**
 * Trigger file download directly in browser without third-party dependencies
 */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/**
 * Export all kept images as a ZIP archive
 */
export async function exportImagesToZip(images = [], baseFileName = "extracted_images") {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();

  const kept = images.filter((img) => img.status !== "rejected");
  if (!kept.length) throw new Error("لا توجد صور مقبولة للتصدير");

  const cleanBase = baseFileName.replace(/\.[^/.]+$/, "").replace(/\s+/g, "_");
  const folder = zip.folder(cleanBase) || zip;

  for (let i = 0; i < kept.length; i++) {
    const img = kept[i];
    const pageNum = img.pageOrSlideNumber || i + 1;
    const filename = `${cleanBase}_p${pageNum}_img${i + 1}.png`;

    // Convert data URL to binary data
    const base64Data = img.thumbnailDataUrl.split(",")[1];
    if (base64Data) {
      folder.file(filename, base64Data, { base64: true });
    }
  }

  // Include a summary JSON file with context text
  const metadata = kept.map((img, i) => ({
    index: i + 1,
    pageOrSlideNumber: img.pageOrSlideNumber,
    category: img.aiClassification?.category || "scientific",
    contextText: img.contextText || "",
    hasQuiz: Boolean(img.quiz?.length),
    questionsCount: img.quiz?.length || 0,
  }));
  folder.file("metadata.json", JSON.stringify(metadata, null, 2));

  const content = await zip.generateAsync({ type: "blob" });
  downloadBlob(content, `${cleanBase}_images.zip`);
}

/**
 * Export images and questions to PPTX presentation
 */
export async function exportToPptx(images = [], baseFileName = "scientific_slides", onProgress = null) {
  const report = typeof onProgress === "function" ? onProgress : () => {};
  const pptxgen = (await import("pptxgenjs")).default;
  const pptx = new pptxgen();

  pptx.layout = "LAYOUT_16x9";
  pptx.author = "Black Fighters Image Extractor";

  const kept = images.filter((img) => img.status !== "rejected");
  if (!kept.length) throw new Error("لا توجد صور مقبولة للتصدير");

  const cleanBase = baseFileName.replace(/\.[^/.]+$/, "");

  // Title Slide
  const titleSlide = pptx.addSlide();
  titleSlide.background = { color: "090a10" };
  titleSlide.addText("Black Fighters • بنك الصور والمحاضرات", {
    x: 0.8,
    y: 1.8,
    fontSize: 28,
    bold: true,
    color: "00f5ff",
    align: "center",
    rtlMode: true,
  });
  titleSlide.addText(`الملف المصدر: ${cleanBase} | إجمالي الصور: ${kept.length}`, {
    x: 0.8,
    y: 2.8,
    fontSize: 14,
    color: "94a3b8",
    align: "center",
    rtlMode: true,
  });

  // Slide per image
  for (let i = 0; i < kept.length; i++) {
    report({ stage: "render", percent: 10 + Math.round((i / kept.length) * 80), detail: `بناء السلايد ${i + 1} من ${kept.length}…` });
    const img = kept[i];
    const slide = pptx.addSlide();
    slide.background = { color: "0d0e15" };

    const pageTitle = `شريحة / صفحة ${img.pageOrSlideNumber || i + 1} • ${
      img.aiClassification?.category || "صورة علمية"
    }`;

    slide.addText(pageTitle, {
      x: 0.5,
      y: 0.4,
      w: 12.3,
      h: 0.5,
      fontSize: 16,
      bold: true,
      color: "00f5ff",
      rtlMode: true,
    });

    const hasQuestions = Array.isArray(img.quiz) && img.quiz.length > 0;

    // Place image
    if (hasQuestions) {
      // Half slide for image, half for quiz
      slide.addImage({
        data: img.thumbnailDataUrl,
        x: 0.5,
        y: 1.1,
        w: 5.8,
        h: 5.4,
        sizing: { type: "contain", w: 5.8, h: 5.4 },
      });

      // Questions column
      const qTexts = [];
      img.quiz.slice(0, 2).forEach((q, qIdx) => {
        qTexts.push({ text: `س${qIdx + 1}: ${q.question}\n`, options: { bold: true, fontSize: 12, color: "ffffff", rtlMode: true } });
        (q.options || []).forEach((opt, optIdx) => {
          const correctIdx = q.correctIndex ?? q.correct_index ?? q.correct ?? 0;
          const isCorrect = optIdx === correctIdx;
          qTexts.push({
            text: `  [${String.fromCharCode(65 + optIdx)}] ${opt}${isCorrect ? " ✓" : ""}\n`,
            options: { fontSize: 10, color: isCorrect ? "00ff88" : "94a3b8", rtlMode: true },
          });
        });
        if (q.explanation) {
          qTexts.push({ text: `  💡 الشرح: ${q.explanation}\n\n`, options: { fontSize: 9, italic: true, color: "facc15", rtlMode: true } });
        }
      });

      slide.addText(qTexts, {
        x: 6.6,
        y: 1.1,
        w: 6.2,
        h: 5.4,
        align: "right",
        rtlMode: true,
      });
    } else {
      // Full centered image
      slide.addImage({
        data: img.thumbnailDataUrl,
        x: 1.2,
        y: 1.1,
        w: 10.9,
        h: 5.4,
        sizing: { type: "contain", w: 10.9, h: 5.4 },
      });
    }

    // Add context to speaker notes
    if (img.contextText) {
      slide.addNotes(img.contextText);
    }
  }

  report({ stage: "save", percent: 95, detail: "إنشاء الملف…" });
  await pptx.writeFile({ fileName: `${cleanBase}_presentation.pptx` });
}

const esc = (s = "") =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildImagePdfHtml(images = [], baseFileName = "study_doc") {
  const kept = images.filter((img) => img.status !== "rejected");

  const pagesHtml = kept
    .map((img, i) => {
      const pageNum = img.pageOrSlideNumber || i + 1;
      const category = img.aiClassification?.category || "صورة سريرية / علمية";
      const hasQuiz = Array.isArray(img.quiz) && img.quiz.length > 0;

      const quizHtml = hasQuiz
        ? `
        <div class="quiz-section">
          <div class="quiz-title">
            <span class="icon">🎯</span>
            <span>أسئلة وتدريبات الكويز (Questions &amp; Assessment)</span>
          </div>
          <div class="questions-list">
            ${img.quiz
              .slice(0, 3)
              .map((q, qIdx) => {
                const correctIdx = q.correctIndex ?? q.correct_index ?? q.correct ?? 0;
                const options = q.options || [];
                return `
                <div class="q-card">
                  <div class="q-header">
                    <span class="q-badge">س ${qIdx + 1}</span>
                    <span class="q-text" dir="auto">${esc(q.question)}</span>
                  </div>
                  <div class="options-grid">
                    ${options
                      .map((opt, optIdx) => {
                        const isCorrect = optIdx === correctIdx;
                        return `
                        <div class="opt-box ${isCorrect ? "opt-correct" : ""}" dir="auto">
                          <span class="opt-letter">[${String.fromCharCode(65 + optIdx)}]</span>
                          <span class="opt-text">${esc(opt)}</span>
                          ${isCorrect ? '<span class="correct-badge">✓ صحيحة</span>' : ""}
                        </div>
                      `;
                      })
                      .join("")}
                  </div>
                  ${
                    q.explanation
                      ? `
                    <div class="explanation-box" dir="auto">
                      <strong>💡 التفسير والشرح العلمي:</strong> ${esc(q.explanation)}
                    </div>
                  `
                      : ""
                  }
                </div>
              `;
              })
              .join("")}
          </div>
        </div>
      `
        : img.contextText
        ? `
        <div class="context-section">
          <div class="context-title">
            <span class="icon">📝</span>
            <span>سياق المحاضرة والشرح:</span>
          </div>
          <div class="context-text" dir="auto">${esc(img.contextText)}</div>
        </div>
      `
        : "";

      return `
      <div class="pdf-page">
        <!-- Header -->
        <div class="page-header">
          <div class="brand">
            <span class="brand-title">Black Fighters • بنك الصور والكويزات</span>
            <span class="brand-sub">Realm Zeta OSPE &amp; Practical Intelligence</span>
          </div>
          <div class="page-meta">
            <span class="page-num">شريحة / صفحة ${pageNum}</span>
            <span class="cat-badge">${esc(category)}</span>
          </div>
        </div>

        <!-- Image Container -->
        <div class="image-wrapper">
          <img src="${img.thumbnailDataUrl}" class="slide-img" />
        </div>

        <!-- Quiz / Context Body -->
        <div class="content-wrapper">
          ${quizHtml}
        </div>

        <!-- Footer -->
        <div class="page-footer">
          <span>المصدر: ${esc(baseFileName)}</span>
          <span>صفحة ${i + 1} من ${kept.length}</span>
        </div>
      </div>
    `;
    })
    .join("");

  return `
    <div id="image-pdf-root" style="width: 794px; background: #090a10; color: #ffffff; font-family: 'Cairo', 'Segoe UI', Tahoma, Arial, sans-serif;">
      ${pagesHtml}
      <style>
        #image-pdf-root * { box-sizing: border-box; }
        .pdf-page {
          width: 794px;
          min-height: 1120px;
          background: #090a10;
          color: #e2e8f0;
          padding: 22px 28px;
          display: flex;
          flex-direction: column;
          page-break-after: always;
          position: relative;
        }
        .page-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding-bottom: 10px;
          border-bottom: 2px solid rgba(0, 245, 255, 0.3);
          margin-bottom: 12px;
        }
        .brand-title {
          font-size: 15px;
          font-weight: 900;
          color: #00f5ff;
          display: block;
        }
        .brand-sub {
          font-size: 10px;
          color: #94a3b8;
        }
        .page-meta {
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .page-num {
          background: #1e2238;
          color: #fff;
          font-size: 11px;
          font-weight: 800;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
        }
        .cat-badge {
          background: rgba(0, 245, 255, 0.12);
          color: #00f5ff;
          font-size: 11px;
          font-weight: 700;
          padding: 4px 10px;
          border-radius: 8px;
          border: 1px solid rgba(0, 245, 255, 0.25);
        }
        .image-wrapper {
          display: flex;
          justify-content: center;
          align-items: center;
          background: #040508;
          border: 1px solid rgba(255, 255, 255, 0.1);
          border-radius: 12px;
          padding: 8px;
          margin-bottom: 14px;
          max-height: 420px;
        }
        .slide-img {
          max-width: 100%;
          max-height: 400px;
          object-fit: contain;
          border-radius: 8px;
        }
        .content-wrapper {
          flex: 1;
        }
        .quiz-title, .context-title {
          font-size: 13px;
          font-weight: 800;
          color: #facc15;
          display: flex;
          align-items: center;
          gap: 6px;
          margin-bottom: 8px;
        }
        .q-card {
          background: #10121d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 12px;
          padding: 10px 14px;
          margin-bottom: 8px;
        }
        .q-header {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 8px;
        }
        .q-badge {
          background: #00f5ff;
          color: #000;
          font-weight: 900;
          font-size: 11px;
          padding: 2px 7px;
          border-radius: 6px;
          flex-shrink: 0;
        }
        .q-text {
          font-size: 13px;
          font-weight: 800;
          color: #ffffff;
          line-height: 1.5;
        }
        .options-grid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 6px;
          margin-bottom: 8px;
        }
        .opt-box {
          background: #171926;
          border: 1px solid rgba(255, 255, 255, 0.07);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          color: #cbd5e1;
          display: flex;
          align-items: center;
          gap: 6px;
        }
        .opt-box.opt-correct {
          background: rgba(16, 185, 129, 0.15);
          border-color: #10b981;
          color: #34d399;
          font-weight: 800;
        }
        .opt-letter {
          font-weight: 900;
          color: #94a3b8;
        }
        .opt-correct .opt-letter {
          color: #10b981;
        }
        .correct-badge {
          margin-right: auto;
          font-size: 9px;
          background: #10b981;
          color: #000;
          padding: 1px 5px;
          border-radius: 4px;
          font-weight: 900;
        }
        .explanation-box {
          background: rgba(0, 245, 255, 0.06);
          border: 1px solid rgba(0, 245, 255, 0.2);
          border-radius: 8px;
          padding: 6px 10px;
          font-size: 11px;
          color: #67e8f9;
          line-height: 1.5;
        }
        .context-text {
          background: #10121d;
          border: 1px solid rgba(255, 255, 255, 0.08);
          border-radius: 10px;
          padding: 12px;
          font-size: 11px;
          color: #94a3b8;
          line-height: 1.6;
        }
        .page-footer {
          margin-top: auto;
          padding-top: 8px;
          border-top: 1px solid rgba(255, 255, 255, 0.08);
          display: flex;
          justify-content: space-between;
          font-size: 9px;
          color: #64748b;
        }
      </style>
    </div>
  `;
}

/**
 * Export images and questions to printable PDF document with 100% Arabic text fidelity
 */
export async function exportToPdf(images = [], baseFileName = "scientific_quiz", onProgress = null) {
  const report = typeof onProgress === "function" ? onProgress : () => {};
  const kept = images.filter((img) => img.status !== "rejected");
  if (!kept.length) throw new Error("لا توجد صور مقبولة للتصدير");

  report({ stage: "load", percent: 5, detail: "تجهيز المكتبات…" });
  const [{ jsPDF }, htmlToImage] = await Promise.all([
    import("jspdf"),
    import("html-to-image"),
  ]);

  const cleanBase = baseFileName.replace(/\.[^/.]+$/, "");
  // CRITICAL: must be `fixed`, NOT `absolute` — an absolute holder participates
  // in document flow and extends the page scroll height to the full (huge) PDF
  // height, leaving an infinite blank scrollable screen behind it. Fixed keeps
  // it out of the document box entirely; pages have explicit 794px width.
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "0";
  holder.style.top = "0";
  holder.style.zIndex = "-9999";
  holder.style.opacity = "0";
  holder.style.pointerEvents = "none";
  holder.innerHTML = buildImagePdfHtml(images, cleanBase);
  document.body.appendChild(holder);

  try {
    const imgEls = Array.from(holder.querySelectorAll("img"));
    await Promise.all(
      imgEls.map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise((res) => {
          const done = () => res();
          img.onload = done;
          img.onerror = done;
          // Never hang the export (and leak the DOM node) on a stuck image
          setTimeout(done, 8000);
        });
      })
    );

    const doc = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
      compress: true,
    });

    const pageEls = Array.from(holder.querySelectorAll(".pdf-page"));
    for (let i = 0; i < pageEls.length; i++) {
      report({ stage: "render", percent: 10 + Math.round((i / pageEls.length) * 80), detail: `تصدير الصفحة ${i + 1} من ${pageEls.length}…` });
      if (i > 0) doc.addPage();
      const imgData = await htmlToImage.toJpeg(pageEl, {
        quality: 0.85,
        pixelRatio: 1.35,
        backgroundColor: "#090a10",
        skipFonts: true,
      });
      doc.addImage(imgData, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    }

    doc.save(`${cleanBase}_study_doc.pdf`);
  } finally {
    holder.remove(); // remove() is null-safe even if body changed underneath
  }
}

/**
 * Export all questions across all images as standardized Quiz JSON
 */
export function exportToQuizJson(images = [], baseFileName = "quiz_bank") {
  const kept = images.filter((img) => img.status !== "rejected" && Array.isArray(img.quiz) && img.quiz.length > 0);
  if (!kept.length) throw new Error("لا توجد أسئلة مولدة للتصدير كـ JSON");

  const cleanBase = baseFileName.replace(/\.[^/.]+$/, "");
  const allQuestions = [];

  kept.forEach((img) => {
    img.quiz.forEach((q) => {
      allQuestions.push({
        question: q.question,
        options: q.options,
        correct_index: q.correctIndex,
        explanation: q.explanation,
        source_page: img.pageOrSlideNumber,
        category: img.aiClassification?.category || "scientific_image",
        image_preview: img.thumbnailDataUrl.slice(0, 100) + "...",
      });
    });
  });

  const output = {
    title: `كويز الصور المستخرجة: ${cleanBase}`,
    source_file: baseFileName,
    questions_count: allQuestions.length,
    created_at: new Date().toISOString(),
    questions: allQuestions,
  };

  const blob = new Blob([JSON.stringify(output, null, 2)], { type: "application/json" });
  downloadBlob(blob, `${cleanBase}_quiz.json`);
}
