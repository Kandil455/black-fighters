/**
 * Certificate renderer — draws a clean, print-ready certificate on a canvas and
 * converts it to a single-page A4 PDF.
 *
 * Why canvas and not jsPDF text: jsPDF has no Arabic shaping, so Arabic names come
 * out with disconnected/reversed letters. The browser's canvas engine shapes text
 * correctly, so we draw at print resolution and embed the result as one image.
 */

const A4 = { w: 595.28, h: 841.89 }; // points
const SCALE = 3; // ~216 DPI at A4
const PX = { w: Math.round(A4.w * SCALE), h: Math.round(A4.h * SCALE) };

const PAPER = "#f8f5ee";
const PAPER_EDGE = "#efe9db";
const INK = "#1b1a18";
const INK_SOFT = "#6b675e";
const ACCENT = "#E8462A";

function font(weight, size, family = "Cairo, 'Instrument Serif', Georgia, serif") {
  return `${weight} ${size}px ${family}`;
}

/** Deterministic guilloche: concentric arcs, the visual texture of a real certificate. */
function drawGuilloche(ctx, cx, cy) {
  ctx.save();
  ctx.strokeStyle = "rgba(232,70,42,0.10)";
  ctx.lineWidth = 1.4;
  for (let i = 0; i < 26; i += 1) {
    const r = 120 + i * 26;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 0.05, Math.PI * 0.95, false);
    ctx.stroke();
  }
  ctx.strokeStyle = "rgba(27,26,24,0.05)";
  for (let i = 0; i < 18; i += 1) {
    const r = 160 + i * 30;
    ctx.beginPath();
    ctx.arc(cx, cy, r, Math.PI * 1.05, Math.PI * 1.95, false);
    ctx.stroke();
  }
  ctx.restore();
}

function drawFrame(ctx, x, y, w, h, color, lineWidth) {
  ctx.save();
  ctx.strokeStyle = color;
  ctx.lineWidth = lineWidth;
  ctx.strokeRect(x, y, w, h);
  ctx.restore();
}

function drawCornerFlourish(ctx, x, y, dirX, dirY, size) {
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x, y + dirY * size);
  ctx.lineTo(x, y);
  ctx.lineTo(x + dirX * size, y);
  ctx.stroke();
  ctx.restore();
}

function centered(ctx, text, y, { weight = "700", size = 40, color = INK, family, letterSpacing = 0 } = {}) {
  ctx.save();
  ctx.fillStyle = color;
  ctx.font = font(weight, size, family);
  ctx.textAlign = "center";
  ctx.textBaseline = "alphabetic";
  if (letterSpacing && "letterSpacing" in ctx) ctx.letterSpacing = `${letterSpacing}px`;
  ctx.fillText(text, PX.w / 2, y);
  ctx.restore();
}

function formatDate(iso, lang) {
  const date = iso ? new Date(iso) : new Date();
  try {
    return date.toLocaleDateString(lang === "en" ? "en-GB" : "ar-EG", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

/** Wrap a line to a max pixel width, returning the lines. */
function wrap(ctx, text, maxWidth, fontSpec) {
  ctx.save();
  ctx.font = fontSpec;
  const words = String(text).split(/\s+/);
  const lines = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (ctx.measureText(next).width > maxWidth && line) {
      lines.push(line);
      line = word;
    } else {
      line = next;
    }
  }
  if (line) lines.push(line);
  ctx.restore();
  return lines;
}

/**
 * Draw the certificate and return the canvas.
 * @param {{recipientName: string, title: string, code: string, issuedAt?: string, lang?: string, verifyUrl?: string}} data
 */
export function renderCertificateCanvas(data) {
  const lang = data.lang === "en" ? "en" : "ar";
  const canvas = document.createElement("canvas");
  canvas.width = PX.w;
  canvas.height = PX.h;
  const ctx = canvas.getContext("2d");
  ctx.direction = lang === "ar" ? "rtl" : "ltr";

  // Paper with a soft edge so the page does not look flat white.
  const bg = ctx.createLinearGradient(0, 0, PX.w, PX.h);
  bg.addColorStop(0, PAPER);
  bg.addColorStop(1, PAPER_EDGE);
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, PX.w, PX.h);

  drawGuilloche(ctx, PX.w / 2, PX.h * 0.44);

  const pad = 96;
  drawFrame(ctx, pad, pad, PX.w - pad * 2, PX.h - pad * 2, INK, 4);
  drawFrame(ctx, pad + 18, pad + 18, PX.w - (pad + 18) * 2, PX.h - (pad + 18) * 2, ACCENT, 1.5);
  const corner = 64;
  drawCornerFlourish(ctx, pad + 18, pad + 18, 1, 1, corner);
  drawCornerFlourish(ctx, PX.w - pad - 18, pad + 18, -1, 1, corner);
  drawCornerFlourish(ctx, pad + 18, PX.h - pad - 18, 1, -1, corner);
  drawCornerFlourish(ctx, PX.w - pad - 18, PX.h - pad - 18, -1, -1, corner);

  const cx = PX.w / 2;

  // Kicker — no institution is named: the system issues this directly.
  centered(ctx, lang === "ar" ? "شهادة إتمام" : "CERTIFICATE OF COMPLETION", PX.h * 0.2, {
    weight: "800",
    size: 34,
    color: INK_SOFT,
    letterSpacing: lang === "ar" ? 0 : 6,
  });

  // Hairline under the kicker
  ctx.save();
  ctx.strokeStyle = "rgba(27,26,24,0.25)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx - 90, PX.h * 0.215);
  ctx.lineTo(cx + 90, PX.h * 0.215);
  ctx.stroke();
  ctx.restore();

  centered(ctx, lang === "ar" ? "تُمنح هذه الشهادة إلى" : "This certificate is awarded to", PX.h * 0.27, {
    weight: "400",
    size: 34,
    color: INK_SOFT,
  });

  // Recipient name — the centrepiece.
  const nameFont = font("800", 92);
  const nameLines = wrap(ctx, data.recipientName || "—", PX.w - pad * 4, nameFont);
  let nameY = PX.h * 0.35;
  for (const line of nameLines.slice(0, 2)) {
    centered(ctx, line, nameY, { weight: "800", size: nameLines.length > 1 ? 76 : 92 });
    nameY += nameLines.length > 1 ? 96 : 0;
  }

  // Rule under the name
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(cx - 210, nameY + 46);
  ctx.lineTo(cx + 210, nameY + 46);
  ctx.stroke();
  ctx.restore();

  centered(
    ctx,
    lang === "ar" ? "لإتمامها بنجاح" : "for the successful completion of",
    nameY + 128,
    { weight: "400", size: 32, color: INK_SOFT },
  );

  const titleFont = font("700", 46);
  const titleLines = wrap(ctx, data.title || "—", PX.w - pad * 4, titleFont);
  let titleY = nameY + 208;
  for (const line of titleLines.slice(0, 3)) {
    centered(ctx, line, titleY, { weight: "700", size: 46 });
    titleY += 62;
  }

  // Seal: a thin double ring with a check mark, drawn rather than an image.
  const sealX = cx;
  const sealY = PX.h * 0.745;
  ctx.save();
  ctx.strokeStyle = ACCENT;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 92, 0, Math.PI * 2);
  ctx.stroke();
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(sealX, sealY, 76, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = INK;
  ctx.lineWidth = 8;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(sealX - 28, sealY + 4);
  ctx.lineTo(sealX - 6, sealY + 26);
  ctx.lineTo(sealX + 32, sealY - 22);
  ctx.stroke();
  ctx.restore();

  centered(ctx, lang === "ar" ? "صادرة إلكترونيًا" : "Issued electronically", sealY + 136, {
    weight: "700",
    size: 24,
    color: INK_SOFT,
  });

  // Footer: date on one side, verification on the other.
  const footY = PX.h - pad - 96;
  ctx.save();
  ctx.strokeStyle = "rgba(27,26,24,0.15)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(pad + 90, footY - 56);
  ctx.lineTo(PX.w - pad - 90, footY - 56);
  ctx.stroke();
  ctx.restore();

  ctx.save();
  ctx.font = font("700", 26);
  ctx.fillStyle = INK;
  ctx.textAlign = "left";
  ctx.fillText(formatDate(data.issuedAt, lang), pad + 90, footY);
  ctx.restore();

  ctx.save();
  ctx.textAlign = "right";
  ctx.font = font("400", 22);
  ctx.fillStyle = INK_SOFT;
  const verifyLabel = lang === "ar" ? "كود التحقق" : "Verification code";
  const codeText = data.code || "";
  ctx.font = font("700", 28);
  ctx.fillStyle = INK;
  ctx.fillText(codeText, PX.w - pad - 90, footY);
  ctx.font = font("400", 22);
  ctx.fillStyle = INK_SOFT;
  ctx.fillText(verifyLabel, PX.w - pad - 90, footY - 38);
  ctx.restore();

  if (data.verifyUrl) {
    centered(ctx, data.verifyUrl.replace(/^https?:\/\//, ""), PX.h - pad - 44, {
      weight: "400",
      size: 20,
      color: INK_SOFT,
    });
  }

  return canvas;
}

/** Wait for the web fonts so Arabic renders in Cairo, not a fallback. */
async function ensureFonts() {
  if (!document.fonts?.load) return;
  try {
    await Promise.all([
      document.fonts.load(font("700", 40, "Cairo")),
      document.fonts.load(font("800", 40, "Cairo")),
      document.fonts.load(font("400", 40, "Cairo")),
    ]);
    await document.fonts.ready;
  } catch {
    /* fall back to whatever is available */
  }
}

/**
 * Build the PDF document (no download). Split out so tests and previews can use it
 * without triggering a file save.
 * @returns {Promise<{doc: import("jspdf").jsPDF, fileName: string}>}
 */
export async function buildCertificatePdf(data) {
  await ensureFonts();
  const canvas = renderCertificateCanvas(data);
  // JPEG at high quality keeps a full-bleed A4 page around a few hundred KB;
  // PNG of this much fine line-work ran past 1 MB, which is heavy on mobile data.
  const image = canvas.toDataURL("image/jpeg", 0.94);
  const { jsPDF } = await import("jspdf");
  const doc = new jsPDF({ unit: "pt", format: "a4", orientation: "portrait", compress: true });
  doc.addImage(image, "JPEG", 0, 0, A4.w, A4.h, undefined, "FAST");
  const safeName = String(data.recipientName || "certificate").replace(/[^\p{L}\p{N} _-]/gu, "").trim().slice(0, 40) || "certificate";
  return { doc, fileName: `${safeName}-${data.code || "BF"}.pdf` };
}

/**
 * Render + download the certificate as a real PDF file.
 * @returns {Promise<{fileName: string}>}
 */
export async function downloadCertificatePdf(data) {
  const { doc, fileName } = await buildCertificatePdf(data);
  doc.save(fileName);
  return { fileName };
}

/** Read-only helper used by the UI preview. */
export async function renderCertificatePreview(data) {
  await ensureFonts();
  const canvas = renderCertificateCanvas(data);
  return canvas.toDataURL("image/png", 0.92);
}
