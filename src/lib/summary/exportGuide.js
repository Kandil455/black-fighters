/**
 * exportGuide.js — ONE export path for every study-guide surface.
 *
 * Before this module the same blob/URL/print dance was copy-pasted four times
 * (StudyGuideViewer × 2, SummaryView × 2) and the storage key string
 * "bf_guide_template" was hardcoded in three files. Changing the template list
 * meant finding all of them; a typo in one silently broke that surface only.
 */

/** localStorage key for the student's chosen template. */
export const TEMPLATE_STORAGE_KEY = "bf_guide_template";

/** Default when nothing (valid) is stored. Must exist in STUDY_GUIDE_TEMPLATES. */
export const DEFAULT_TEMPLATE_ID = "modules_green";

/**
 * Read the stored template id, downgrading unknown ids to the default.
 * `modules_red` was used as a fallback in one file but is not a real template —
 * reading it produced a blank guide, so validation happens here.
 * @param {string[]} validIds
 */
export function readStoredTemplate(validIds = []) {
  try {
    const stored = localStorage.getItem(TEMPLATE_STORAGE_KEY);
    if (!stored) return DEFAULT_TEMPLATE_ID;
    if (validIds.length && !validIds.includes(stored)) return DEFAULT_TEMPLATE_ID;
    return stored;
  } catch {
    return DEFAULT_TEMPLATE_ID;
  }
}

export function storeTemplate(id) {
  try {
    localStorage.setItem(TEMPLATE_STORAGE_KEY, id);
  } catch {
    /* private mode / quota — the in-memory state still works */
  }
}

/** Filename-safe version of a (possibly Arabic) title. */
export function safeFileName(title, fallback = "ملخص") {
  const base = String(title || fallback)
    .replace(/[\\/:*?"<>|]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
  return base || fallback;
}

/**
 * Save an HTML string as a .html file.
 * @returns {boolean} whether the download started
 */
export function downloadHtmlFile(html, title, fallbackName) {
  try {
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `${safeFileName(title, fallbackName)}.html`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    // Revoke on the next tick so Safari has time to start the download.
    setTimeout(() => URL.revokeObjectURL(url), 1500);
    return true;
  } catch {
    return false;
  }
}

/**
 * Open the print dialog for an HTML string.
 *
 * The HTML is loaded in a hidden iframe rather than a popup window: popups are
 * blocked on mobile Safari and inside in-app browsers, which is why "طباعة"
 * used to do nothing for some students.
 *
 * @returns {boolean} whether printing was triggered
 */
export function printHtmlFile(html) {
  try {
    const iframe = document.createElement("iframe");
    iframe.setAttribute("aria-hidden", "true");
    iframe.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
    document.body.appendChild(iframe);

    const doc = iframe.contentWindow?.document;
    if (!doc) {
      iframe.remove();
      return false;
    }
    doc.open();
    doc.write(html);
    doc.close();

    const cleanup = () => {
      setTimeout(() => iframe.remove(), 400);
    };

    // Give the browser a beat to lay out images before printing.
    const fire = () => {
      try {
        iframe.contentWindow.focus();
        iframe.contentWindow.print();
      } finally {
        cleanup();
      }
    };
    setTimeout(fire, 260);
    return true;
  } catch {
    return false;
  }
}

/**
 * Share the HTML as a file where the platform supports it (mobile), else
 * download it. Keeps one behaviour across the exports.
 */
export async function shareOrDownloadHtml(html, title, fallbackName) {
  const name = `${safeFileName(title, fallbackName)}.html`;
  try {
    const file = new File([html], name, { type: "text/html" });
    if (navigator.canShare?.({ files: [file] })) {
      await navigator.share({ files: [file], title: name });
      return "shared";
    }
  } catch {
    /* user cancelled or unsupported — fall through to download */
  }
  return downloadHtmlFile(html, title, fallbackName) ? "downloaded" : "failed";
}

export default { downloadHtmlFile, printHtmlFile, shareOrDownloadHtml, readStoredTemplate, storeTemplate };
