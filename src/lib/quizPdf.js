// يحدد اتجاه النص: لو فيه حروف عربية يبقى RTL، غير كده LTR (إنجليزي يبدأ من الشمال)
const isRTL = (txt = "") => /[\u0600-\u06FF\u0750-\u077F]/.test(txt);

const LOGO = "/icons/black-fighters-192.png";
const letters = ["A", "B", "C", "D", "E", "F"];

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

// نبني صفحة HTML منسّقة (تدعم العربي والإنجليزي صح) ثم نحوّلها لصورة داخل PDF
function buildHtml(quiz, withAnswers) {
  const titleText = String(quiz.title || "Quiz").trim();
  const titleRtl = isRTL(titleText);
  const count = quiz.questions?.length || 0;

  // فحص الكويز ككل: لو العنوان أو أول سؤال عربي يبقى عربي، غير كده إنجليزي LTR
  const firstQ = quiz.questions?.[0]?.question || quiz.questions?.[0]?.text || "";
  const overallRtl = titleRtl || isRTL(firstQ);
  const overallDir = overallRtl ? "rtl" : "ltr";
  const titleAlign = titleRtl ? "right" : "left";

  const questionsHtml = (quiz.questions || [])
    .map((q, qi) => {
      const qText = String(q.question || q.text || "").trim();
      const qIsRtl = isRTL(qText);
      const qDir = qIsRtl ? "rtl" : "ltr";
      const qAlign = qIsRtl ? "right" : "left";

      const optionsHtml = (q.options || [])
        .map((opt, oi) => {
          const correct = withAnswers && oi === (q.correct_index ?? q.correct ?? q.correctOption);
          // لو نص الخيار أصلاً بيبدأ بحرف زي "A)" أو "B." منضفش حرف تاني عشان ميتكررش
          const raw = String(opt).trim();
          const hasLetter = /^[A-Fa-f][).\-:]/.test(raw);
          const label = hasLetter ? esc(raw) : `${esc(letters[oi])}) ${esc(raw)}`;
          const optIsRtl = isRTL(raw);
          const optDir = optIsRtl ? "rtl" : qDir;
          const optAlign = optDir === "rtl" ? "right" : "left";

          return `
            <div class="opt ${correct ? "correct" : ""}" dir="${optDir}" style="direction:${optDir} !important;text-align:${optAlign} !important;color:#0f172a !important;">
              ${label}
            </div>`;
        })
        .join("");

      const expText = q.explanation ? String(q.explanation).trim() : "";
      const expIsRtl = isRTL(expText);
      const expDir = expIsRtl ? "rtl" : qDir;
      const expAlign = expDir === "rtl" ? "right" : "left";
      const expHtml =
        withAnswers && expText
          ? `<div class="exp" dir="${expDir}" style="direction:${expDir} !important;text-align:${expAlign} !important;">
              <b style="color:#78350f !important;">${expIsRtl ? "الشرح:" : "Explanation:"}</b> ${esc(expText)}
            </div>`
          : "";

      return `
        <div class="q" dir="${qDir}" style="direction:${qDir} !important;text-align:${qAlign} !important;">
          <div class="q-head" style="direction:${qDir} !important;">
            <span class="bullet" style="color:#ffffff !important;">${qi + 1}</span>
            <h3 dir="${qDir}" style="direction:${qDir} !important;text-align:${qAlign} !important;color:#0f172a !important;">${esc(qText)}</h3>
          </div>
          <div class="opts" style="direction:${qDir} !important;padding-${qIsRtl ? "right" : "left"}:36px !important;padding-${qIsRtl ? "left" : "right"}:0 !important;">
            ${optionsHtml}
          </div>
          ${expHtml}
        </div>`;
    })
    .join("");

  return `
    <div id="quiz-pdf-root" dir="${overallDir}" style="width:794px;background:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,'Cairo',sans-serif;color:#0f172a !important;color-scheme:light !important;direction:${overallDir} !important;">
      <div style="background:#111827 !important;padding:18px 28px;display:flex;align-items:center;justify-content:space-between;color:#ffffff !important;direction:ltr !important;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${LOGO}" crossorigin="anonymous" style="width:42px;height:42px;border-radius:10px;" />
          <div>
            <div style="color:#ffffff !important;font-size:22px;font-weight:800;line-height:1.2;">Black Fighters</div>
            <div style="color:#94a3b8 !important;font-size:12px;font-weight:600;">${withAnswers ? (titleRtl ? "كويز + نموذج الإجابات" : "Quiz + Answer Key") : (titleRtl ? "ورقة أسئلة الكويز" : "Quiz Sheet")}</div>
          </div>
        </div>
        <div style="background:${withAnswers ? "#10b981" : "#7c3aed"} !important;color:#ffffff !important;font-size:12px;font-weight:700;padding:8px 16px;border-radius:8px;">
          ${withAnswers ? (titleRtl ? "بالإجابات النموذجية" : "WITH ANSWERS") : (titleRtl ? "الأسئلة فقط" : "QUESTIONS ONLY")}
        </div>
      </div>
      <div style="height:4px;background:#0284c7 !important;"></div>

      <div style="padding:28px;background:#ffffff !important;">
        <h1 dir="${titleRtl ? "rtl" : "ltr"}" style="font-size:26px !important;font-weight:800 !important;margin:0 0 4px !important;text-align:${titleAlign} !important;direction:${titleRtl ? "rtl" : "ltr"} !important;color:#0f172a !important;">${esc(titleText)}</h1>
        <div dir="${titleRtl ? "rtl" : "ltr"}" style="color:#64748b !important;font-size:13.5px !important;font-weight:600 !important;margin-bottom:22px !important;text-align:${titleAlign} !important;direction:${titleRtl ? "rtl" : "ltr"} !important;">${count} ${titleRtl ? "سؤال" : "Questions"}</div>
        ${questionsHtml}
      </div>

      <style>
        #quiz-pdf-root, #quiz-pdf-root * {
          box-sizing: border-box !important;
          color-scheme: light !important;
        }
        #quiz-pdf-root h1,
        #quiz-pdf-root h2,
        #quiz-pdf-root h3,
        #quiz-pdf-root h4,
        #quiz-pdf-root h5,
        #quiz-pdf-root h6 {
          color: #0f172a !important;
          font-family: inherit !important;
          letter-spacing: normal !important;
        }
        #quiz-pdf-root p,
        #quiz-pdf-root div {
          color: #0f172a !important;
        }
        #quiz-pdf-root .q {
          margin-bottom: 24px !important;
          page-break-inside: avoid !important;
        }
        #quiz-pdf-root .q-head {
          display: flex !important;
          align-items: flex-start !important;
          gap: 12px !important;
          margin-bottom: 10px !important;
        }
        #quiz-pdf-root .bullet {
          flex: 0 0 24px !important;
          width: 24px !important;
          height: 24px !important;
          border-radius: 50% !important;
          background: #0284c7 !important;
          color: #ffffff !important;
          font-size: 13px !important;
          font-weight: 800 !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          margin-top: 2px !important;
          line-height: 1 !important;
        }
        #quiz-pdf-root h3 {
          font-size: 15.5px !important;
          font-weight: 700 !important;
          margin: 0 !important;
          line-height: 1.55 !important;
          flex: 1 1 auto !important;
          color: #0f172a !important;
        }
        #quiz-pdf-root .opts {
          display: flex !important;
          flex-direction: column !important;
          gap: 7px !important;
        }
        #quiz-pdf-root .opt {
          font-size: 14px !important;
          font-weight: 500 !important;
          padding: 8px 14px !important;
          border: 1.5px solid #cbd5e1 !important;
          border-radius: 8px !important;
          line-height: 1.5 !important;
          background: #f8fafc !important;
          color: #0f172a !important;
        }
        #quiz-pdf-root .opt.correct {
          background: #ecfdf5 !important;
          border-color: #10b981 !important;
          color: #047857 !important;
          font-weight: 700 !important;
        }
        #quiz-pdf-root .exp {
          margin-top: 10px !important;
          font-size: 13px !important;
          color: #78350f !important;
          line-height: 1.6 !important;
          background: #fef3c7 !important;
          border: 1.5px solid #fde68a !important;
          border-radius: 8px !important;
          padding: 10px 14px !important;
        }
      </style>
    </div>`;
}

export async function exportQuizPdf(quiz, { withAnswers = false } = {}) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);
  // نحط الـ HTML في عنصر مخفي بس موجود في الصفحة عشان الطول ما يتقصش
  // CRITICAL: must be `fixed`, NOT `absolute` — an absolute holder participates
  // in document flow and extends the page scroll height to the full (huge) quiz
  // height, leaving an infinite blank scrollable screen behind it. Fixed keeps
  // it out of the document box entirely; the sheet has explicit 794px width.
  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "0";
  holder.style.top = "0";
  holder.style.zIndex = "-9999";
  holder.style.opacity = "0";
  holder.style.pointerEvents = "none";
  holder.style.colorScheme = "light";
  const firstQ = quiz.questions?.[0]?.question || quiz.questions?.[0]?.text || "";
  const overallRtl = isRTL(quiz.title || "") || isRTL(firstQ);
  holder.setAttribute("dir", overallRtl ? "rtl" : "ltr");
  holder.innerHTML = buildHtml(quiz, withAnswers);
  document.body.appendChild(holder);
  const root = holder.querySelector("#quiz-pdf-root");

  try {
    // ننتظر تحميل اللوجو
    const img = root.querySelector("img");
    if (img && !img.complete) {
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        // Never hang the export (and leak the DOM node) on a stuck image
        setTimeout(res, 8000);
      });
    }

    const canvas = await html2canvas(root, { 
      scale: 1.5, 
      backgroundColor: "#ffffff", 
      useCORS: true,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      scrollY: -window.scrollY
    });

    const buildDocument = (quality) => {
      const imgData = canvas.toDataURL("image/jpeg", quality);
      const doc = new jsPDF({ unit: "mm", format: "a4", compress: true });
      const pageW = doc.internal.pageSize.getWidth();
      const pageH = doc.internal.pageSize.getHeight();
      const imgH = (canvas.height * pageW) / canvas.width;
      let heightLeft = imgH;
      let position = 0;
      doc.addImage(imgData, "JPEG", 0, position, pageW, imgH, undefined, "FAST");
      heightLeft -= pageH;
      while (heightLeft > 0) {
        position -= pageH;
        doc.addPage();
        doc.addImage(imgData, "JPEG", 0, position, pageW, imgH, undefined, "FAST");
        heightLeft -= pageH;
      }
      return doc;
    };

    let doc;
    let blob;
    for (const quality of [0.75, 0.6, 0.45]) {
      doc = buildDocument(quality);
      blob = doc.output("blob");
      if (blob.size <= 3 * 1024 * 1024) break;
    }

    const safe = (quiz.title || "quiz").replace(/[^\w\u0600-\u06FF]+/g, "_").slice(0, 40);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safe}_${withAnswers ? "answers" : "questions"}.pdf`;
    anchor.click();
    URL.revokeObjectURL(url);
  } finally {
    holder.remove(); // remove() is null-safe even if body changed underneath
  }
}
