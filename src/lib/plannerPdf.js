/**
 * plannerPdf.js
 * Generates a print-ready A4 PDF containing the Curriculum Block Progress Report,
 * Lecture Mastery Checklist (Solved / Unsolved / Quiz / OSCE), and Daily Study Schedule.
 * Supports full Arabic RTL & English LTR typography via offscreen light-scheme HTML rendering.
 */

import { computeBlockStats } from "./blockVaultStore";

const LOGO = "/icons/black-fighters-192.png";

const esc = (s = "") =>
  String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

function buildPlannerHtml(block, isEn = false) {
  const stats = computeBlockStats(block);
  const dir = isEn ? "ltr" : "rtl";
  const align = isEn ? "left" : "right";
  const lectures = Array.isArray(block?.lectures) ? block.lectures : [];
  const schedule = Array.isArray(block?.schedule) ? block.schedule : [];

  const statusLabel = (st) => {
    if (st === "solved") return isEn ? "Solved ✅" : "تم الحل ✅";
    if (st === "studying") return isEn ? "In Progress ⏳" : "قيد المذاكرة ⏳";
    if (st === "review_needed") return isEn ? "Needs Review 🔥" : "يحتاج مراجعة 🔥";
    return isEn ? "Unsolved ⭕" : "لم يُحل ⭕";
  };

  const statusStyle = (st) => {
    if (st === "solved") return "background:#ecfdf5 !important;color:#047857 !important;border:1px solid #10b981 !important;";
    if (st === "studying") return "background:#eff6ff !important;color:#1d4ed8 !important;border:1px solid #60a5fa !important;";
    if (st === "review_needed") return "background:#fffbeb !important;color:#b45309 !important;border:1px solid #f59e0b !important;";
    return "background:#f8fafc !important;color:#475569 !important;border:1px solid #cbd5e1 !important;";
  };

  const lecturesRowsHtml = lectures
    .map((lec, i) => {
      const checkBox = (val) => (val ? "☑" : "☐");
      return `
        <tr style="border-bottom:1px solid #e2e8f0 !important;background:${i % 2 === 0 ? "#ffffff" : "#f8fafc"} !important;">
          <td style="padding:8px 10px !important;font-weight:700 !important;color:#0f172a !important;text-align:center !important;">${lec.number || i + 1}</td>
          <td style="padding:8px 12px !important;font-weight:600 !important;color:#0f172a !important;text-align:${align} !important;">${esc(lec.title)}</td>
          <td style="padding:8px 10px !important;text-align:center !important;">
            <span style="display:inline-block;padding:3px 9px;border-radius:6px;font-size:11px;font-weight:700;${statusStyle(lec.status)}">
              ${statusLabel(lec.status)}
            </span>
          </td>
          <td style="padding:8px 8px !important;text-align:center !important;font-size:14px !important;color:#0f172a !important;">${checkBox(lec.summaryDone)}</td>
          <td style="padding:8px 8px !important;text-align:center !important;font-size:14px !important;color:#0f172a !important;">${checkBox(lec.theoryQuizDone)}</td>
          <td style="padding:8px 8px !important;text-align:center !important;font-size:14px !important;color:#0f172a !important;">${checkBox(lec.osceDone)}</td>
          <td style="padding:8px 10px !important;text-align:center !important;font-weight:700 !important;color:#0284c7 !important;">${lec.quizScore !== null && lec.quizScore !== undefined ? `${lec.quizScore}%` : "—"}</td>
        </tr>`;
    })
    .join("");

  const scheduleDaysHtml = schedule
    .map((day) => {
      const tasksHtml = (day.tasks || [])
        .map(
          (t) => `
          <div style="display:flex;align-items:flex-start;gap:8px;padding:5px 0;color:#1e293b !important;font-size:13px !important;">
            <span style="font-size:15px;line-height:1.2;color:${t.done ? "#10b981" : "#64748b"} !important;">${t.done ? "☑" : "☐"}</span>
            <span style="${t.done ? "text-decoration:line-through;color:#64748b !important;" : "font-weight:600;color:#0f172a !important;"}">${esc(t.title)}</span>
          </div>`
        )
        .join("");

      return `
        <div style="margin-bottom:14px;border:1.5px solid ${day.isOffDay ? "#cbd5e1" : "#94a3b8"} !important;border-radius:10px;background:${day.isOffDay ? "#f8fafc" : "#ffffff"} !important;padding:12px 16px;page-break-inside:avoid !important;">
          <div style="display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #e2e8f0;padding-bottom:8px;margin-bottom:8px;">
            <div style="font-weight:800;font-size:14px;color:#0f172a !important;">
              ${isEn ? `Day ${day.dayNumber}` : `اليوم ${day.dayNumber}`} — ${esc(day.dayName || "")} (${esc(day.date || "")})
            </div>
            <div style="font-size:12px;font-weight:700;padding:3px 10px;border-radius:6px;background:${day.isOffDay ? "#e2e8f0" : "#e0f2fe"} !important;color:${day.isOffDay ? "#475569" : "#0369a1"} !important;">
              ${day.isOffDay ? (isEn ? "Rest Day" : "يوم راحة") : `${day.estimatedHours || 4} ${isEn ? "Hours" : "ساعات"}`}
            </div>
          </div>
          <div style="font-size:13px;font-weight:700;color:#047857 !important;margin-bottom:6px;">
            ${esc(day.focusTitle || "")}
          </div>
          <div>${tasksHtml}</div>
        </div>`;
    })
    .join("");

  return `
    <div id="planner-pdf-root" dir="${dir}" style="width:794px;background:#ffffff !important;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Cairo',sans-serif;color:#0f172a !important;color-scheme:light !important;direction:${dir} !important;">
      <!-- Top Header Banner -->
      <div style="background:#0f172a !important;padding:20px 28px;display:flex;align-items:center;justify-content:space-between;color:#ffffff !important;direction:ltr !important;">
        <div style="display:flex;align-items:center;gap:12px;">
          <img src="${LOGO}" crossorigin="anonymous" style="width:44px;height:44px;border-radius:10px;" />
          <div>
            <div style="color:#ffffff !important;font-size:21px;font-weight:800;line-height:1.2;">Black Fighters · Block Vault & Study Planner</div>
            <div style="color:#94a3b8 !important;font-size:12px;font-weight:600;">${isEn ? "Curriculum Mastery Tracker & Printable Study Schedule" : "تقرير إنجاز البلوك وجدول المذاكرة الذكي"}</div>
          </div>
        </div>
        <div style="background:#10b981 !important;color:#03150c !important;font-size:13px;font-weight:800;padding:8px 16px;border-radius:8px;">
          ${stats.progressPct}% ${isEn ? "COMPLETED" : "نسبة الإنجاز"}
        </div>
      </div>
      <div style="height:4px;background:#10b981 !important;"></div>

      <div style="padding:26px 28px;background:#ffffff !important;">
        <!-- Block Summary Header -->
        <div style="display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:20px;border-bottom:2px solid #f1f5f9;padding-bottom:16px;">
          <div>
            <h1 style="font-size:24px !important;font-weight:800 !important;margin:0 0 6px !important;color:#0f172a !important;">${esc(block?.name || "Block Study Plan")}</h1>
            <div style="font-size:13px !important;color:#475569 !important;font-weight:600 !important;">
              ${isEn ? "Exam Date:" : "تاريخ الامتحان:"} <b>${esc(block?.examDate || "—")}</b>
              ${stats.daysUntilExam !== null ? ` • (${stats.daysUntilExam} ${isEn ? "days left" : "يوم متبقي"})` : ""}
              • ${isEn ? "Daily Pace:" : "المعدل اليومي المطلوب:"} <b>${stats.requiredDailyPace} ${isEn ? "lec/day" : "محاضرة/يوم"}</b>
            </div>
          </div>
          <div style="display:flex;gap:10px;">
            <div style="padding:8px 14px;border-radius:8px;background:#ecfdf5 !important;border:1px solid #a7f3d0 !important;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:#047857 !important;">${stats.solved} / ${stats.total}</div>
              <div style="font-size:11px;font-weight:700;color:#065f46 !important;">${isEn ? "Solved Lectures" : "محاضرات محلولة"}</div>
            </div>
            <div style="padding:8px 14px;border-radius:8px;background:#fff1f2 !important;border:1px solid #fecdd3 !important;text-align:center;">
              <div style="font-size:18px;font-weight:800;color:#be123c !important;">${stats.remainingToSolve}</div>
              <div style="font-size:11px;font-weight:700;color:#9f1239 !important;">${isEn ? "Remaining" : "متبقية للحل"}</div>
            </div>
          </div>
        </div>

        <!-- Visual Progress Bar -->
        <div style="margin-bottom:24px;">
          <div style="height:12px;width:100%;background:#e2e8f0 !important;border-radius:999px;overflow:hidden;">
            <div style="height:100%;width:${stats.progressPct}%;background:#10b98c !important;background-color:#10b981 !important;"></div>
          </div>
        </div>

        <!-- Section 1: Lectures Table -->
        <h2 style="font-size:17px !important;font-weight:800 !important;color:#0f172a !important;margin:0 0 12px !important;">
          1. ${isEn ? "Block Lectures & Completion Status" : "حافظة محاضرات البلوك وحالة الحل"} (${lectures.length})
        </h2>
        <table style="width:100%;border-collapse:collapse;margin-bottom:28px;font-size:12.5px;border:1.5px solid #cbd5e1;">
          <thead>
            <tr style="background:#f1f5f9 !important;border-bottom:1.5px solid #cbd5e1 !important;">
              <th style="padding:9px 8px;color:#0f172a !important;font-weight:800;text-align:center;width:42px;">#</th>
              <th style="padding:9px 12px;color:#0f172a !important;font-weight:800;text-align:${align};">${isEn ? "Lecture Title" : "اسم المحاضرة"}</th>
              <th style="padding:9px 8px;color:#0f172a !important;font-weight:800;text-align:center;width:125px;">${isEn ? "Status" : "الحالة"}</th>
              <th style="padding:9px 6px;color:#0f172a !important;font-weight:800;text-align:center;width:62px;">${isEn ? "Summary" : "الملخص"}</th>
              <th style="padding:9px 6px;color:#0f172a !important;font-weight:800;text-align:center;width:62px;">${isEn ? "Quiz" : "الكويز"}</th>
              <th style="padding:9px 6px;color:#0f172a !important;font-weight:800;text-align:center;width:62px;">${isEn ? "OSCE" : "الأوسكي"}</th>
              <th style="padding:9px 8px;color:#0f172a !important;font-weight:800;text-align:center;width:65px;">${isEn ? "Score" : "الدرجة"}</th>
            </tr>
          </thead>
          <tbody>
            ${lecturesRowsHtml || `<tr><td colspan="7" style="padding:14px;text-align:center;color:#64748b !important;">${isEn ? "No lectures added yet" : "لا توجد محاضرات مضافة"}</td></tr>`}
          </tbody>
        </table>

        <!-- Section 2: Daily Schedule -->
        ${
          schedule.length > 0
            ? `<h2 style="font-size:17px !important;font-weight:800 !important;color:#0f172a !important;margin:0 0 12px !important;">
                2. ${isEn ? "Smart Daily Study Schedule" : "جدول المذاكرة اليومي الموزع"} (${schedule.length} ${isEn ? "Days" : "يوم"})
              </h2>
              ${scheduleDaysHtml}`
            : ""
        }
      </div>
    </div>`;
}

export async function exportBlockPlannerPdf(block, { isEn = false } = {}) {
  const [{ jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas"),
  ]);

  const holder = document.createElement("div");
  holder.style.position = "fixed";
  holder.style.left = "0";
  holder.style.top = "0";
  holder.style.zIndex = "-9999";
  holder.style.opacity = "0";
  holder.style.pointerEvents = "none";
  holder.style.colorScheme = "light";
  holder.setAttribute("dir", isEn ? "ltr" : "rtl");
  holder.innerHTML = buildPlannerHtml(block, isEn);
  document.body.appendChild(holder);
  const root = holder.querySelector("#planner-pdf-root");

  try {
    const img = root.querySelector("img");
    if (img && !img.complete) {
      await new Promise((res) => {
        img.onload = res;
        img.onerror = res;
        setTimeout(res, 5000);
      });
    }

    const canvas = await html2canvas(root, {
      scale: 1.6,
      backgroundColor: "#ffffff",
      useCORS: true,
      windowWidth: root.scrollWidth,
      windowHeight: root.scrollHeight,
      scrollY: -window.scrollY,
    });

    const imgData = canvas.toDataURL("image/jpeg", 0.92);
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

    const cleanName = String(block?.name || "Study_Plan")
      .replace(/[^\u0600-\u06FFa-zA-Z0-9_\-\s]/g, "")
      .trim()
      .replace(/\s+/g, "_");
    doc.save(`BlackFighters_${cleanName || "Block_Schedule"}.pdf`);

    canvas.width = 0;
    canvas.height = 0;
  } finally {
    holder.remove();
  }
}
