import React, { useEffect, useMemo, useRef } from "react";
import { useQuery } from "@tanstack/react-query";
import { entities } from '@/api/index';
import { Button } from "@/components/ui/button";
import { Download, Highlighter, Bold, FileCode } from "lucide-react";
import { toast } from "sonner";

const LOGO_URL = "/icons/black-fighters-192.png";

const COLORS = [
  { label: "تعريف", className: "hl-green", color: "#cdf5e0" },
  { label: "مهم", className: "hl-yellow", color: "#fff2b8" },
  { label: "أرقام", className: "hl-cyan", color: "#d6ecff" },
  { label: "مقارنة", className: "hl-orange", color: "#ffe0b2" },
  { label: "تحذير", className: "hl-red", color: "#ffd9d9" },
];

const styles = `
  .editable-frame {
    position: relative;
    background: #fff;
    border-radius: 16px;
    overflow: hidden;
  }
  .sheet-logo {
    position: absolute;
    top: 20px;
    left: 20px;
    width: 56px;
    height: 56px;
    border-radius: 16px;
    object-fit: cover;
    z-index: 2;
  }
  .sheet-watermark, .print-watermark {
    pointer-events: none;
    position: absolute;
    left: 50%;
    top: 50%;
    transform: translate(-50%,-50%);
    width: 260px;
    height: 260px;
    object-fit: cover;
    opacity: .03;
    z-index: 0;
  }
  .print-watermark { position: fixed; }
  
  .editable-sheet {
    position: relative;
    z-index: 1;
    background: #fff;
    color: #0f2430;
    line-height: 1.85;
    font-size: 14.5px;
  }

  /* ── Strict Direction & Alignment ── */
  .editable-sheet .en, .editable-sheet [dir="ltr"] {
    direction: ltr !important;
    text-align: left !important;
    unicode-bidi: isolate !important;
    font-family: "Segoe UI", -apple-system, BlinkMacSystemFont, Tahoma, Arial, sans-serif;
  }
  .editable-sheet ul.en, .editable-sheet ol.en {
    direction: ltr !important;
    text-align: left !important;
    padding-left: 28px !important;
    padding-right: 0 !important;
    list-style-type: disc !important;
    margin: 8px 0 16px !important;
  }
  .editable-sheet li.en, .editable-sheet p.en {
    direction: ltr !important;
    text-align: left !important;
    margin: 6px 0;
  }

  .editable-sheet .ar, .editable-sheet [dir="rtl"] {
    direction: rtl !important;
    text-align: right !important;
    unicode-bidi: isolate !important;
    font-family: "Segoe UI", "Noto Naskh Arabic", "Geeza Pro", Tahoma, sans-serif;
  }
  .editable-sheet ul.ar, .editable-sheet ol.ar {
    direction: rtl !important;
    text-align: right !important;
    padding-right: 28px !important;
    padding-left: 0 !important;
    list-style-type: square !important;
    margin: 8px 0 16px !important;
  }
  .editable-sheet li.ar, .editable-sheet p.ar {
    direction: rtl !important;
    text-align: right !important;
    margin: 7px 0;
    line-height: 1.85;
  }

  /* ── Headings & Titles ── */
  .editable-sheet .part-header {
    break-before: page;
    page-break-before: always;
    margin-top: 32px;
  }
  .editable-sheet .part-header:first-child {
    margin-top: 0;
  }
  .editable-sheet .part-title {
    display: block;
    margin: 0 0 16px;
    padding: 12px 18px;
    border-radius: 12px;
    font-size: 17px;
    font-weight: 800;
    line-height: 1.5;
    color: #fff;
    background: linear-gradient(90deg, #0b5c8a, #117bb5);
    direction: rtl;
    text-align: right;
  }
  .editable-sheet h3.sec {
    font-size: 14.5px;
    font-weight: 800;
    color: #0b5c8a;
    margin: 20px 0 10px;
    padding-inline-start: 10px;
    border-inline-start: 5px solid #117bb5;
  }
  .editable-sheet h3.sec.en {
    direction: ltr !important;
    text-align: left !important;
    border-inline-start: 0;
    border-left: 5px solid #117bb5;
    padding-left: 10px;
  }

  /* ── Highlights & Terms ── */
  .editable-sheet strong { font-weight: 800; color: #07304a; }
  .editable-sheet mark {
    border-radius: 4px;
    padding: 1px 5px;
    font-weight: 800;
    color: inherit;
    box-decoration-break: clone;
    -webkit-box-decoration-break: clone;
  }
  .editable-sheet mark.hl-yellow { background: #fff2b8; }
  .editable-sheet mark.hl-green  { background: #cdf5e0; }
  .editable-sheet mark.hl-cyan   { background: #d6ecff; }
  .editable-sheet mark.hl-orange { background: #ffe0b2; }
  .editable-sheet mark.hl-red    { background: #ffd9d9; }

  /* ── Formulas & Math ── */
  .editable-sheet .formula {
    direction: ltr !important;
    text-align: center !important;
    font-family: "Cambria Math", Cambria, Georgia, monospace;
    font-size: 14.5px;
    font-weight: 700;
    color: #08344f;
    background: #f2f7fa;
    border: 1px dashed #b9cfdd;
    border-radius: 8px;
    padding: 8px 14px;
    margin: 12px auto;
    width: fit-content;
    max-width: 92%;
  }

  /* ── Boxes (Rules / Danger / Pearls) ── */
  .editable-sheet .box {
    margin: 14px 0;
    padding: 12px 16px;
    border-radius: 10px;
    background: #f4f8fb;
    border-inline-start: 6px solid #117bb5;
    direction: rtl;
    text-align: right;
  }
  .editable-sheet .box .box-title {
    display: block;
    font-weight: 800;
    margin-bottom: 6px;
    font-size: 13.5px;
  }
  .editable-sheet .box.rule { background: #eefaf3; border-color: #0f7a52; }
  .editable-sheet .box.rule .box-title { color: #0f7a52; }
  .editable-sheet .box.danger { background: #fdf0ef; border-color: #c0392b; }
  .editable-sheet .box.danger .box-title { color: #b32020; }
  .editable-sheet .box.pearl { background: #fff9e8; border-color: #d99b00; }
  .editable-sheet .box.pearl .box-title { color: #8a6200; }

  /* ── Tables ── */
  .editable-sheet table.t {
    width: 100%;
    border-collapse: collapse;
    margin: 14px 0;
    font-size: 13px;
  }
  .editable-sheet table.t th, .editable-sheet table.t td {
    border: 1px solid #cfdde6;
    padding: 8px 10px;
    text-align: start;
    vertical-align: top;
  }
  .editable-sheet table.t th {
    background: #08344f;
    color: #fff;
    font-weight: 800;
  }
  .editable-sheet table.t tr:nth-child(even) { background: #f8fafc; }
`;

function escapeHtml(value = "") {
  return value.replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}

function inline(value = "") {
  return escapeHtml(value)
    .replace(/==(green|yellow|cyan|orange|red):([^=]+)==/g, '<mark class="hl-$1">$2</mark>')
    .replace(/==([^=]+)==/g, '<mark class="hl-yellow">$1</mark>')
    .replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')
    .replace(/`([^`]+)`/g, '<code class="m">$1</code>');
}

function isPrimarilyArabic(text = "") {
  const arCount = (text.match(/[\u0600-\u06ff]/g) || []).length;
  const enCount = (text.match(/[a-zA-Z]/g) || []).length;
  return arCount > enCount;
}

function markdownToHtml(value = "") {
  const lines = value.split("\n");
  let html = "";
  let inList = false;
  let currentListClass = "";
  let inArabicExplanation = false;

  const closeList = () => {
    if (inList) {
      html += "</ul>";
      inList = false;
      currentListClass = "";
    }
  };

  lines.forEach((line) => {
    const trimmed = line.trim();
    if (!trimmed) {
      closeList();
      return;
    }

    // Check if entering Arabic explanation section
    if (
      trimmed.includes("الشرح بالعربي") ||
      trimmed.includes("الشرح العربي") ||
      trimmed.includes("Arabic Explanation") ||
      trimmed.includes("2. الشرح")
    ) {
      closeList();
      inArabicExplanation = true;
      html += `<h3 class="sec ar"><span class="box-title">2. الشرح والترجمة التفصيلية بالعربي</span></h3>`;
      return;
    }

    if (
      trimmed.includes("English Study Notes") ||
      trimmed.includes("1. English") ||
      trimmed.includes("English Points")
    ) {
      closeList();
      inArabicExplanation = false;
      html += `<h3 class="sec en"><span class="box-title">1. English Study Notes</span></h3>`;
      return;
    }

    if (trimmed.startsWith("## ")) {
      closeList();
      inArabicExplanation = false;
      html += `<div class="part-header"><h2 class="part-title">${inline(trimmed.slice(3))}</h2></div>`;
      return;
    }

    if (trimmed.startsWith("### ")) {
      closeList();
      const content = trimmed.slice(4);
      const isAr = isPrimarilyArabic(content);
      html += `<h3 class="sec ${isAr ? "ar" : "en"}"><span>${inline(content)}</span></h3>`;
      return;
    }

    // Callout boxes (> blockquote)
    if (trimmed.startsWith(">")) {
      closeList();
      const rawText = trimmed.replace(/^>\s?/, "");
      let boxClass = "box";
      let boxTitle = "";

      if (/danger|تحذير|خطر|ممنوع|خطأ/i.test(rawText)) {
        boxClass = "box danger";
        boxTitle = "⚠️ تحذير إكلينيكي";
      } else if (/rule|قاعدة|علاج|بروتوكول/i.test(rawText)) {
        boxClass = "box rule";
        boxTitle = "🛡️ قاعدة ذهبية";
      } else if (/pearl|حيلة|امتحان|mcq|سر/i.test(rawText)) {
        boxClass = "box pearl";
        boxTitle = "💡 حيلة للحفظ / نقطة امتحان";
      }

      html += `<div class="${boxClass}">${boxTitle ? `<span class="box-title">${boxTitle}</span>` : ""}<p>${inline(rawText)}</p></div>`;
      return;
    }

    // Formula / Equation line
    if (trimmed.startsWith("`") && trimmed.endsWith("`") && trimmed.length > 5 && (trimmed.includes("=") || trimmed.includes("÷") || trimmed.includes("×") || trimmed.includes("+"))) {
      closeList();
      html += `<div class="formula">${inline(trimmed.slice(1, -1))}</div>`;
      return;
    }

    // Bullet points (- or • or *)
    if (/^[-•*]\s+/.test(trimmed)) {
      const bulletContent = trimmed.replace(/^[-•*]\s+/, "");
      const isAr = inArabicExplanation || isPrimarilyArabic(bulletContent);
      const targetClass = isAr ? "ar" : "en";

      if (!inList || currentListClass !== targetClass) {
        closeList();
        html += `<ul class="${targetClass}">`;
        inList = true;
        currentListClass = targetClass;
      }
      html += `<li class="${targetClass}">${inline(bulletContent)}</li>`;
      return;
    }

    // Paragraph handling in Arabic Explanation
    if (inArabicExplanation) {
      // Split sentences so Arabic explanation is NEVER a solid paragraph wall
      const sentences = trimmed.split(/(?<=[.!?؟])\s+/).filter((s) => s.trim().length > 3);
      if (sentences.length > 1) {
        if (!inList || currentListClass !== "ar") {
          closeList();
          html += `<ul class="ar">`;
          inList = true;
          currentListClass = "ar";
        }
        sentences.forEach((s) => {
          html += `<li class="ar">${inline(s.trim())}</li>`;
        });
        return;
      } else {
        if (!inList || currentListClass !== "ar") {
          closeList();
          html += `<ul class="ar">`;
          inList = true;
          currentListClass = "ar";
        }
        html += `<li class="ar">${inline(trimmed)}</li>`;
        return;
      }
    }

    // Regular paragraph
    closeList();
    const isAr = isPrimarilyArabic(trimmed);
    html += `<p class="${isAr ? "ar" : "en"}">${inline(trimmed)}</p>`;
  });

  closeList();
  return html;
}

function cheapHash(str = "") {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = ((hash << 5) + hash) + str.charCodeAt(i);
    hash |= 0;
  }
  return `${str.length}_${hash}`;
}

export default function EditableStudySheet({ course }) {
  const editorRef = useRef(null);
  const { data: notes = [] } = useQuery({
    queryKey: ["notes", course?.id],
    queryFn: () => entities.CourseNote.filter({ course_id: course.id }, "chapter_index", 100),
    enabled: !!course?.id,
    initialData: [],
  });

  const initialHtml = useMemo(() => {
    return (course?.chapters || []).map((ch, i) => {
      const title = ch.title || `Part ${i + 1}`;
      const hasPartPrefix = /^part\s*\d+/i.test(title);
      const displayTitle = hasPartPrefix ? title : `Part ${i + 1}: ${title}`;
      return `<div class="part-header"><h2 class="part-title">${inline(displayTitle)}</h2></div>${markdownToHtml(ch.content)}`;
    }).join("");
  }, [course]);

  const lastSeededRef = useRef({ courseId: null, contentKey: null });
  useEffect(() => {
    // Seed the sheet when the course changes or when generated chapters actually change.
    // Window-focus refetches (or offline→online swaps) that return identical chapter HTML
    // share the same contentKey, preserving the user's manual highlights & bold edits.
    if (!course?.id) return;
    const contentKey = cheapHash(initialHtml);
    const prev = lastSeededRef.current;
    if (prev.courseId === course.id && prev.contentKey === contentKey) return;
    if (editorRef.current) editorRef.current.innerHTML = initialHtml;
    lastSeededRef.current = { courseId: course.id, contentKey };
  }, [course?.id, initialHtml]);

  const applyColor = (color) => {
    document.execCommand("backColor", false, color);
  };

  const applyBold = () => document.execCommand("bold", false);

  const downloadPdf = () => {
    const body = editorRef.current?.innerHTML || "";
    const notesHtml = notes.length ? `<section class="notes-section"><h2 class="part-title">ملاحظاتي الشخصية</h2>${notes.map((n) => `<div class="box pearl"><span class="box-title">${n.chapter_index === -1 ? "عام" : `Part ${n.chapter_index + 1}`}</span><p>${escapeHtml(n.content || "").replace(/\n/g, "<br/>")}</p></div>`).join("")}</section>` : "";
    const win = window.open("", "_blank");
    win.document.write(`<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8"><title>${escapeHtml(course?.title || "Black Fighters")}</title><style>@page{size:A4;margin:14mm 12mm 15mm}*,*::before,*::after{box-sizing:border-box}html{-webkit-print-color-adjust:exact;print-color-adjust:exact}body{margin:0;background:#fff;color:#0f2430;font-family:"Segoe UI",Tahoma,sans-serif;line-height:1.85}.page{position:relative;width:820px;max-width:100%;margin:0 auto;padding:30px 40px;box-sizing:border-box;background:#fff}.part-header{break-before:page;page-break-before:always}.part-header:first-child{break-before:avoid;page-break-before:avoid}@media print{.page{width:auto;margin:0;padding:0}.print-watermark{position:fixed}}${styles}</style></head><body><img class="print-watermark" src="${LOGO_URL}"/><main class="page"><header style="display:flex;align-items:center;justify-content:space-between;margin-bottom:28px;border-bottom:2px solid #0b5c8a;padding-bottom:12px"><div><h1 style="margin:0;font-size:24px;color:#08344f;direction:ltr;text-align:left">${escapeHtml(course?.title || "Black Fighters")}</h1><div style="font-size:12px;color:#0b5c8a;margin-top:4px">Black Fighters Study Notes System</div></div><img src="${LOGO_URL}" style="width:52px;height:52px;border-radius:12px;object-fit:cover"/></header><div class="editable-sheet">${body}${notesHtml}</div></main><script>window.onload=()=>setTimeout(()=>window.print(),350)</script></body></html>`);
    win.document.close();
  };

  const downloadStandaloneHtml = () => {
    const title = course?.title || "Study Notes";
    const bodyContent = editorRef.current?.innerHTML || "";
    const standalone = `<!DOCTYPE html>
<html lang="ar" dir="rtl">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)} — Study Notes</title>
<style>
@page { size: A4; margin: 14mm 12mm 15mm; }
*, *::before, *::after { box-sizing: border-box; }
html { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
body {
  margin: 0; background: #dfe6ea; color: #0f2430;
  font-family: "Segoe UI", "Noto Naskh Arabic", Tahoma, Arial, sans-serif;
  direction: rtl; text-align: right; font-size: 12pt; line-height: 1.9;
}
.sheet {
  max-width: 900px; margin: 0 auto; background: #fff;
  padding: 22px 32px 34px; box-shadow: 0 8px 30px rgba(15, 36, 48, .15);
}
.toolbar {
  position: sticky; top: 0; z-index: 50; display: flex; gap: 12px;
  align-items: center; justify-content: center; flex-wrap: wrap;
  background: #08344f; color: #fff; padding: 10px 14px; font-size: 11.5pt;
}
.toolbar button {
  font: inherit; font-weight: 700; cursor: pointer; border: 0; border-radius: 8px;
  padding: 8px 18px; background: #f6c33a; color: #3b2a00;
}
.toolbar button:hover { background: #ffd766; }
.cover { text-align: center; padding: 34px 10px 20px; border-bottom: 2px solid #e2e8f0; margin-bottom: 24px; }
.cover .cover-title {
  display: block; margin: 0 auto 6px; padding: 18px 16px; border-radius: 14px;
  background: linear-gradient(135deg, #08344f, #117bb5); color: #fff;
  font-size: 20pt; font-weight: 800; line-height: 1.5; direction: ltr; text-align: center;
}
.cover .cover-sub { margin-top: 10px; font-size: 12.5pt; color: #0b5c8a; font-weight: 700; }
.part-title {
  margin: 26px 0 14px; padding: 10px 16px; border-radius: 10px;
  font-size: 15.5pt; line-height: 1.5; color: #fff;
  background: linear-gradient(90deg, #0b5c8a, #117bb5);
}
h3.sec {
  font-size: 13.5pt; color: #0b5c8a; margin: 18px 0 8px;
  padding-inline-start: 10px; border-inline-start: 5px solid #117bb5;
}
.en { direction: ltr !important; text-align: left !important; font-family: "Segoe UI", Arial, sans-serif; font-size: 11.6pt; line-height: 1.75; }
.en ul, .en ol { padding-left: 26px !important; padding-right: 0 !important; direction: ltr !important; text-align: left !important; }
.en li { direction: ltr !important; text-align: left !important; margin: 5px 0; }
.ar { direction: rtl !important; text-align: right !important; }
.ar ul, .ar ol { padding-right: 26px !important; padding-left: 0 !important; direction: rtl !important; text-align: right !important; }
.ar li { direction: rtl !important; text-align: right !important; margin: 6px 0; }
.formula {
  direction: ltr !important; text-align: center !important; font-family: "Cambria Math", Cambria, Georgia, monospace;
  font-size: 12.5pt; font-weight: 700; color: #08344f; background: #f2f7fa;
  border: 1px dashed #b9cfdd; border-radius: 8px; padding: 8px 12px; margin: 10px auto; width: fit-content;
}
.box {
  margin: 12px 0; padding: 10px 14px; border-radius: 10px;
  background: #f4f8fb; border-inline-start: 6px solid #117bb5;
}
.box .box-title { display: block; font-weight: 800; margin-bottom: 4px; color: #0b5c8a; }
.box.rule { background: #eefaf3; border-color: #0f7a52; }
.box.rule .box-title { color: #0f7a52; }
.box.danger { background: #fdf0ef; border-color: #c0392b; }
.box.danger .box-title { color: #b32020; }
.box.pearl { background: #fff9e8; border-color: #d99b00; }
.box.pearl .box-title { color: #8a6200; }
mark.hl { background: linear-gradient(180deg, rgba(255,255,255,0) 52%, #ffe066 52%); color: inherit; padding: 0 3px; font-weight: 800; border-radius: 3px; }
mark.hl-y { background: #fff2b8; font-weight: 800; padding: 1px 4px; border-radius: 3px; }
mark.hl-g { background: #cdf5e0; font-weight: 800; padding: 1px 4px; border-radius: 3px; }
mark.hl-r { background: #ffd9d9; font-weight: 800; padding: 1px 4px; border-radius: 3px; }
mark.hl-b { background: #d6ecff; font-weight: 800; padding: 1px 4px; border-radius: 3px; }
table.t { width: 100%; border-collapse: collapse; margin: 14px 0; font-size: 11pt; }
table.t th, table.t td { border: 1px solid #cfdde6; padding: 8px 10px; text-align: start; }
table.t th { background: #08344f; color: #fff; font-weight: 800; }
table.t tr:nth-child(even) { background: #f8fafc; }
@media print {
  body { background: #fff; font-size: 11.4pt; line-height: 1.8; }
  .sheet { max-width: none; margin: 0; padding: 0; box-shadow: none; }
  .toolbar { display: none !important; }
  .part-header { break-before: page; page-break-before: always; }
}
</style>
</head>
<body>
<div class="toolbar">
  <button type="button" onclick="window.print()">🖨️ اطبع / احفظ كـ PDF</button>
  <span>من نافذة الطباعة اختَر <b>Save as PDF</b> — حجم الورق A4</span>
</div>
<div class="sheet">
<header class="cover">
  <span class="cover-title">${escapeHtml(title)} — Study Notes</span>
  <div class="cover-sub">Black Fighters Elite Study Material • مِسطرة المذكرات</div>
</header>
${bodyContent}
</div>
</body>
</html>`;
    const blob = new Blob([standalone], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${title.replace(/\s+/g, "_")}_Study_Notes.html`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("تم تنزيل ملف HTML المستقل بنفس تنسيق المذكرة! 📑✨");
  };

  return (
    <div className="space-y-3">
      <style>{styles}</style>
      <div className="sticky top-3 z-10 glass-card border border-primary/20 rounded-2xl p-3 flex flex-wrap items-center gap-2 shadow-lg">
        <span className="text-sm font-bold me-2 flex items-center gap-1">
          <Highlighter className="w-4 h-4 text-primary" /> تلوين يدوي
        </span>
        {COLORS.map((c) => (
          <Button key={c.className} type="button" size="sm" variant="outline" onClick={() => applyColor(c.color)} className="gap-1.5">
            <span className={`w-3 h-3 rounded-sm ${c.className}`} /> {c.label}
          </Button>
        ))}
        <Button type="button" size="sm" variant="outline" onClick={applyBold} className="gap-1.5">
          <Bold className="w-3.5 h-3.5" /> Bold
        </Button>
        <div className="ms-auto flex items-center gap-2">
          <Button type="button" size="sm" variant="outline" onClick={downloadStandaloneHtml} className="gap-1.5 border-accent/40 text-accent hover:bg-accent/10">
            <FileCode className="w-3.5 h-3.5" /> تصدير HTML كامل
          </Button>
          <Button type="button" size="sm" onClick={downloadPdf} className="gap-1.5">
            <Download className="w-3.5 h-3.5" /> تحميل النسخة دي (PDF)
          </Button>
        </div>
      </div>
      <div className="editable-frame shadow-2xl border border-slate-200">
        <img src={LOGO_URL} alt="Black Fighters" className="sheet-logo" />
        <img src={LOGO_URL} alt="" className="sheet-watermark" />
        <div ref={editorRef} contentEditable suppressContentEditableWarning dir="auto" className="editable-sheet rounded-2xl p-6 md:p-10 outline-none min-h-[520px]" />
      </div>
    </div>
  );
}