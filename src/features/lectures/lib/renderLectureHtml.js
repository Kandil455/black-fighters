/**
 * renderLectureHtml — builds a standalone HTML document for export/print.
 *
 * Constraints (owner rules):
 *   • works offline: no CDN, no fonts, no images, no JS dependency
 *   • strict bidi: Arabic RTL paragraphs, English LTR islands via dir="auto"
 *   • density comes from buildTemplatePlan — the same content re-flows per size
 *   • generated AI sections are labelled, never presented as the transcript
 *   • print-friendly: white background, A4 page rules, no page-break inside cards
 */
import { escapeHtml } from "./htmlEscape.js";

const STYLE = `
:root{
  --ink:#101828; --muted:#5b6577; --line:#e4e8ef; --bg:#ffffff;
  --accent:#0f7b57; --accent-soft:#e9f7ef;
  --exam:#b45309; --exam-soft:#fef6e7;
  --concept:#1e3a5f; --concept-soft:#eaf1fa;
  --example:#1d4ed8; --example-soft:#eef3fe;
  --compare:#6d28d9; --compare-soft:#f3efff;
}
*{box-sizing:border-box}
html,body{margin:0;padding:0;background:var(--bg);color:var(--ink)}
body{
  font-family:"Segoe UI","Noto Naskh Arabic",Tahoma,Arial,sans-serif;
  line-height:1.85; font-size:15px;
  padding:28px 20px 56px;
}
.page{max-width:900px;margin:0 auto}
header.lec{border-bottom:3px solid var(--accent);padding-bottom:14px;margin-bottom:22px}
header.lec h1{margin:0 0 6px;font-size:24px;line-height:1.4}
header.lec .meta{color:var(--muted);font-size:13px}
.toc{border:1px solid var(--line);border-radius:12px;padding:12px 16px;margin:0 0 22px;background:#fbfcfe}
.toc h2{margin:0 0 8px;font-size:15px;color:var(--muted)}
.toc ol{margin:0;padding-inline-start:20px}
.toc a{color:var(--concept);text-decoration:none}
section.sec{margin:0 0 18px;border:1px solid var(--line);border-radius:14px;padding:14px 16px}
section.sec.breakable{page-break-inside:avoid}
.sec-head{display:flex;align-items:center;gap:10px;margin-bottom:10px}
.sec-num{
  flex:0 0 auto;min-width:28px;height:28px;border-radius:8px;
  display:inline-flex;align-items:center;justify-content:center;
  font-size:13px;font-weight:700;background:var(--concept-soft);color:var(--concept)
}
.sec-head h2{margin:0;font-size:17px;line-height:1.5}
.kind-concept{border-inline-start:4px solid var(--concept)}
.kind-exam{border-inline-start:4px solid var(--exam);background:var(--exam-soft)}
.kind-example{border-inline-start:4px solid var(--example);background:var(--example-soft)}
.kind-compare{border-inline-start:4px solid var(--compare);background:var(--compare-soft)}
.kind-steps{border-inline-start:4px solid var(--accent);background:var(--accent-soft)}
p.s{display:block;margin:0 0 8px;text-align:start;unicode-bidi:plaintext}
p.s.verbatim{font-weight:600}
[dir="auto"]{text-align:start}
ol.steps{margin:0;padding-inline-start:22px}
ol.steps li{margin:0 0 8px}
.glossary{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:8px}
.term{border:1px solid var(--line);border-radius:10px;padding:8px 10px;background:#fbfcfe}
.term b{color:var(--concept)}
.term span{color:var(--muted);font-size:13px}
details.noise{margin-top:14px;border:1px dashed var(--line);border-radius:10px;padding:10px 12px}
details.noise summary{cursor:pointer;color:var(--muted);font-size:13px}
.gap{border:1px dashed var(--exam);border-radius:10px;padding:8px 12px;margin:0 0 14px;color:var(--exam);background:var(--exam-soft);font-size:13px}
.gen-note{font-size:12px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px;margin-top:10px}
footer.lec{margin-top:26px;border-top:1px solid var(--line);padding-top:10px;color:var(--muted);font-size:12px}
.q{border:1px solid var(--line);border-radius:10px;padding:10px 12px;margin:0 0 10px}
.q .a{margin-top:6px;color:var(--muted);font-size:13px}
@page{size:A4;margin:14mm}
@media print{
  html,body{background:#fff;padding:0;font-size:11.5pt}
  .no-print{display:none!important}
  section.sec,details.noise,.toc{page-break-inside:avoid;break-inside:avoid;box-shadow:none}
  header.lec h1{font-size:18pt}
  a{color:inherit;text-decoration:none}
}
`;

function sentenceParagraphs(ids, sentenceById, { verbatim = false } = {}) {
  const out = [];
  for (const id of ids) {
    const sentence = sentenceById.get(Number(id));
    if (!sentence) continue;
    out.push(
      `<p class="s${verbatim ? " verbatim" : ""}" dir="auto">${escapeHtml(sentence.text)}</p>`,
    );
  }
  return out.join("\n");
}

function renderSection({ section, index, plan, sentenceById }) {
  const num = plan.showSectionNumbers
    ? `<span class="sec-num">${index + 1}</span>`
    : "";
  const kind = plan.sections[index]?.kindHint || "concept";
  const body =
    kind === "steps" && plan.sections[index].sentence_ids.length > 1
      ? `<ol class="steps">${plan.sections[index].sentence_ids
          .map((id) => sentenceById.get(Number(id)))
          .filter(Boolean)
          .map((s) => `<li dir="auto">${escapeHtml(s.text)}</li>`)
          .join("\n")}</ol>`
      : sentenceParagraphs(section.sentence_ids, sentenceById);

  return `<section class="sec kind-${kind}${plan.compact ? "" : " breakable"}" id="sec-${index + 1}">
  <div class="sec-head">${num}<h2 dir="auto">${escapeHtml(section.title)}</h2></div>
  ${body}
</section>`;
}

/**
 * @param {object} args
 * @param {object} args.job lectureJobs doc
 * @param {object} args.transcript lectureTranscripts doc
 * @param {object} args.organization lectureOrganizations doc
 * @param {object} [args.summary] lectureSummaries doc (optional)
 * @param {object} args.plan result of buildTemplatePlan()
 * @param {string} [args.copy] lectures.ar strings
 */
export function renderLectureHtml({
  job,
  transcript,
  organization,
  summary,
  plan,
  copy,
  generatedAt = new Date(),
}) {
  const sentenceById = new Map((transcript?.sentences || []).map((s) => [Number(s.id), s]));
  const sections = plan?.sections?.length
    ? plan.sections
    : (organization?.plan?.sections || []);

  const toc = plan?.showToc
    ? `<nav class="toc"><h2>${escapeHtml(copy?.viewer?.sections || "المحتوى")}</h2><ol>${sections
        .map(
          (s, i) =>
            `<li><a href="#sec-${i + 1}" dir="auto">${escapeHtml(s.title)}</a></li>`,
        )
        .join("")}</ol></nav>`
    : "";

  const gapBlocks = (transcript?.gaps || [])
    .map(
      (gap, i) =>
        `<div class="gap" data-gap="${i}">${escapeHtml(
          copy?.viewer?.gapHint || "فيه جزء من المحاضرة مش موجود.",
        )}</div>`,
    )
    .join("\n");

  const body = sections
    .map((section, index) => renderSection({ section, index, plan: { ...plan, sections }, sentenceById }))
    .join("\n");

  const glossaryHtml = plan?.hasGlossary
    ? `<section class="sec"><div class="sec-head"><h2>${
        escapeHtml(copy?.viewer?.glossary || "مصطلحات المحاضرة")
      }</h2></div><div class="glossary">${(organization?.plan?.glossary || [])
        .map(
          (g) =>
            `<div class="term"><b dir="auto">${escapeHtml(g.term)}</b>${
              g.ar ? ` <span dir="auto">— ${escapeHtml(g.ar)}</span>` : ""
            }</div>`,
        )
        .join("")}</div></section>`
    : "";

  const noiseHtml = plan?.hasNoise
    ? `<details class="noise"><summary>${escapeHtml(
        copy?.viewer?.noiseHint || "كلام جانبي",
      )}</summary>${sentenceParagraphs(
        organization?.plan?.noise_sentence_ids || [],
        sentenceById,
      )}</details>`
    : "";

  const summaryHtml = summary?.sections?.length
    ? `<section class="sec kind-example">
  <div class="sec-head"><h2>${escapeHtml(copy?.viewer?.summaryTab || "الخلاصة")}</h2></div>
  ${summary.sections
    .map(
      (s) => `<h3 dir="auto">${escapeHtml(s.heading)}</h3>
      <ul>${(s.bullets || [])
        .map((b) => `<li dir="auto">${escapeHtml(b.point)}</li>`)
        .join("")}</ul>`,
    )
    .join("\n")}
  ${
    summary.questions?.length
      ? `<h3>${escapeHtml(copy?.viewer?.questions || "أسئلة مراجعة")}</h3>${summary.questions
          .map(
            (q) =>
              `<div class="q"><div dir="auto"><b>${escapeHtml(q.q)}</b></div><div class="a" dir="auto">${escapeHtml(
                q.a,
              )}</div></div>`,
          )
          .join("")}`
      : ""
  }
  <div class="gen-note">${escapeHtml(
    copy?.export?.generatedBanner || "الجزء ده متولّد بالـ AI",
  )}</div>
</section>`
    : "";

  const title = job?.title || "محاضرة";
  const durMin = Math.round((job?.source?.duration_sec || 0) / 60);
  const meta = [
    job?.subject,
    durMin ? `${durMin} دقيقة` : null,
    `${transcript?.sentence_count || 0} جملة`,
    `${transcript?.word_count || 0} كلمة`,
  ]
    .filter(Boolean)
    .join(" · ");

  return `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>${STYLE}</style>
</head>
<body>
<div class="page">
<header class="lec">
  <h1 dir="auto">${escapeHtml(title)}</h1>
  <div class="meta" dir="auto">${escapeHtml(meta)}</div>
</header>
${toc}
${gapBlocks}
${body}
${glossaryHtml}
${noiseHtml}
${summaryHtml}
<footer class="lec">
  <span dir="auto">${escapeHtml(copy?.export?.sourceNote || "المصدر: Black Fighters")}</span>
  · ${generatedAt.toLocaleDateString("ar-EG")}
  · ${escapeHtml(copy?.export?.footerNote || "Black Fighters")}
</footer>
</div>
</body>
</html>`;
}

/** Wrap generated HTML in a download and return the object URL. */
export function downloadHtml(html, fileName = "lecture.html") {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4_000);
}

/** Print-to-PDF: open a hidden iframe so the app UI never prints. */
export function printHtml(html) {
  const frame = document.createElement("iframe");
  frame.setAttribute("aria-hidden", "true");
  frame.style.cssText = "position:fixed;inset:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(frame);
  const doc = frame.contentDocument;
  doc.open();
  doc.write(html);
  doc.close();
  const done = () => {
    try {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    } finally {
      setTimeout(() => frame.remove(), 1_000);
    }
  };
  if (doc.readyState === "complete") setTimeout(done, 120);
  else frame.onload = () => setTimeout(done, 120);
}

export default renderLectureHtml;
