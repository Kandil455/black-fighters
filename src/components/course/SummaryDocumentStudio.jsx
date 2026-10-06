import React, { lazy, Suspense, useCallback, useDeferredValue, useEffect, useMemo, useRef, useState } from "react";
import {
  Bold, Check, Code2, Eye, Heading2, Highlighter, History,
  ImagePlus, List, Loader2, Redo2, RotateCcw, Undo2,
} from "lucide-react";
import { FileSave3D } from "@/components/ui/Custom3DIcons";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { MarkdownDocumentRenderer } from "@/components/course/SummaryDocumentRenderer";
import {
  createEditedSummary,
  getSummaryDocumentV3,
  stableSummaryFingerprint,
  stripSummaryMarkup,
  summaryDocumentToMarkdown,
} from "@/lib/summaryDocument";
import { migrateLegacySummaryMarkdown, resolveSummaryTemplateId } from "@/lib/summaryV3/index.js";
import { listSummaryRevisions, saveSummaryDocument } from "@/lib/summaryJobs";
import LicensedImagePicker from "@/components/course/LicensedImagePicker";

const TiptapSummaryEditor = lazy(() => import("@/components/course/TiptapSummaryEditor"));

const MAX_UNDO_STEPS = 60;
const MAX_REVISIONS = 14;
const MAX_LOCAL_REVISION_CHARS = 1_800_000;

function storageKey(courseId, type) {
  return `iiiak:document-studio:${type}:${courseId || "unsaved"}`;
}

function readStorage(key, fallback) {
  if (typeof window === "undefined") return fallback;
  try {
    const parsed = JSON.parse(window.localStorage.getItem(key) || "null");
    return parsed ?? fallback;
  } catch {
    return fallback;
  }
}

function writeStorage(key, value) {
  if (typeof window === "undefined") return false;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

function revisionLabel(date) {
  try {
    return new Intl.DateTimeFormat("ar-EG", { dateStyle: "medium", timeStyle: "short" }).format(new Date(date));
  } catch {
    return String(date || "");
  }
}

function contentWordCount(value) {
  const plain = stripSummaryMarkup(value);
  return plain ? plain.split(/\s+/).filter(Boolean).length : 0;
}

function markdownSafe(value, max = 240) {
  return String(value || "").replace(/[\r\n|\[\]\"]+/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function compactLocalRevisions(revisions) {
  const output = [];
  let characters = 0;
  for (const revision of revisions) {
    if (revision?.remote) continue;
    const size = String(revision?.content || "").length;
    if (output.length && characters + size > MAX_LOCAL_REVISION_CHARS) continue;
    output.push(revision);
    characters += size;
    if (output.length >= MAX_REVISIONS) break;
  }
  return output;
}

function timestampValue(value) {
  if (!value) return new Date().toISOString();
  if (typeof value === "string" || typeof value === "number") {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
  }
  const seconds = Number(value._seconds ?? value.seconds);
  return Number.isFinite(seconds) ? new Date(seconds * 1000).toISOString() : new Date().toISOString();
}

function languageModeFor(courseLanguage, originalDocument) {
  if (["ar", "en", "bilingual"].includes(originalDocument?.languageMode)) return originalDocument.languageMode;
  if (courseLanguage === "mixed" || courseLanguage === "bilingual") return "bilingual";
  return courseLanguage === "en" ? "en" : "ar";
}

function createVersionedDocument(markdown, { summary, courseTitle, courseLanguage, editorJson }) {
  const original = getSummaryDocumentV3(summary);
  const languageMode = languageModeFor(courseLanguage, original);
  const requestedTemplate = original?.templateId || (languageMode === "bilingual" ? "bilingual_lecture" : "complete_study_guide");
  const templateId = resolveSummaryTemplateId(requestedTemplate) || (languageMode === "bilingual" ? "bilingual_lecture" : "complete_study_guide");
  const metadata = {
    ...(original?.metadata || {}),
    manuallyEdited: true,
    editedAt: new Date().toISOString(),
    previousSchemaVersion: original?.schemaVersion || null,
    ...(editorJson ? { tiptap: { version: 1, content: editorJson, updatedAt: new Date().toISOString() } } : {}),
  };
  try {
    return migrateLegacySummaryMarkdown(markdown, {
      title: original?.title?.text || courseTitle || "Summary",
      templateId,
      languageMode,
      colorLevel: original?.colorLevel || "medium",
      metadata,
      migratedFrom: original ? "summary_v3_editor" : "legacy_editor",
    });
  } catch {
    return migrateLegacySummaryMarkdown(markdown, {
      title: original?.title?.text || courseTitle || "Summary",
      templateId: languageMode === "bilingual" ? "bilingual_lecture" : "complete_study_guide",
      languageMode,
      colorLevel: "medium",
      metadata,
      migratedFrom: original ? "summary_v3_editor" : "legacy_editor",
    });
  }
}

export default function SummaryDocumentStudio({
  courseId,
  courseTitle = "",
  courseLanguage = "ar",
  summary,
  initialValue,
  onSaved,
}) {
  const draftKey = storageKey(courseId, "draft");
  const revisionsKey = storageKey(courseId, "revisions");
  const initialFingerprint = useMemo(() => stableSummaryFingerprint(initialValue), [initialValue]);
  const recoveredDraft = useMemo(() => readStorage(draftKey, null), [draftKey]);
  const hasRecoveredDraft = !!(recoveredDraft?.content && recoveredDraft.content !== initialValue);
  const [recovered, setRecovered] = useState(hasRecoveredDraft);
  const [value, setValue] = useState(() => hasRecoveredDraft ? recoveredDraft.content : initialValue);
  const [savedValue, setSavedValue] = useState(initialValue);
  const [draftStatus, setDraftStatus] = useState(hasRecoveredDraft ? "recovered" : "saved");
  const [saving, setSaving] = useState(false);
  const [pendingSync, setPendingSync] = useState(!!recoveredDraft?.pendingSync);
  const [showPreview, setShowPreview] = useState(true);
  const [showRevisions, setShowRevisions] = useState(false);
  const [imagePickerOpen, setImagePickerOpen] = useState(false);
  const [editorJson, setEditorJson] = useState(() => recoveredDraft?.editorJson || getSummaryDocumentV3(summary)?.metadata?.tiptap?.content || null);
  const [revisions, setRevisions] = useState(() => compactLocalRevisions(readStorage(revisionsKey, [])));
  const [activeRevision, setActiveRevision] = useState(() => Math.max(0, Number(summary?.active_revision || summary?.revision || 0)));
  const textareaRef = useRef(null);
  const tiptapRef = useRef(null);
  const latestValueRef = useRef(value);
  const historyRef = useRef({ past: [], future: [], lastCheckpoint: 0 });
  const deferredValue = useDeferredValue(value);
  const deferredWordCount = useMemo(() => contentWordCount(deferredValue), [deferredValue]);
  const dirty = value !== savedValue;

  useEffect(() => { latestValueRef.current = value; }, [value]);

  useEffect(() => {
    setActiveRevision((current) => Math.max(current, Number(summary?.active_revision || summary?.revision || 0)));
  }, [summary?.active_revision, summary?.revision]);

  useEffect(() => {
    if (!courseId) return undefined;
    let cancelled = false;
    listSummaryRevisions(courseId, 8).then((result) => {
      if (cancelled || !Array.isArray(result?.revisions) || !result.revisions.length) return;
      const remote = result.revisions.map((revision) => {
        const content = summaryDocumentToMarkdown(revision.document);
        return {
          id: `remote-${revision.revision || revision.id}`,
          content,
          reason: revision.reason || `Revision ${revision.revision}`,
          createdAt: timestampValue(revision.updated_at || revision.created_at),
          words: contentWordCount(content),
          remote: true,
          revision: Number(revision.revision || 0),
        };
      }).filter((revision) => revision.content);
      setActiveRevision((current) => Math.max(current, ...remote.map((revision) => revision.revision || 0)));
      setRevisions((current) => {
        const ids = new Set(remote.map((revision) => revision.id));
        const merged = [...remote, ...current.filter((revision) => !ids.has(revision.id))].slice(0, MAX_REVISIONS);
        return merged;
      });
    }).catch(() => {});
    return () => { cancelled = true; };
  }, [courseId, revisionsKey]);

  useEffect(() => {
    if (dirty) return;
    setValue(initialValue);
    setSavedValue(initialValue);
  }, [initialValue, dirty]);

  useEffect(() => {
    if (!dirty) return undefined;
    setDraftStatus("saving");
    const timer = window.setTimeout(() => {
      const ok = writeStorage(draftKey, {
        content: value,
        editorJson,
        baseFingerprint: initialFingerprint,
        updatedAt: new Date().toISOString(),
      });
      setDraftStatus(ok ? "saved" : "error");
    }, 550);
    return () => window.clearTimeout(timer);
  }, [dirty, draftKey, editorJson, initialFingerprint, value]);

  useEffect(() => {
    const persistLatest = () => {
      if (latestValueRef.current === savedValue) return;
      writeStorage(draftKey, {
        content: latestValueRef.current,
        editorJson: tiptapRef.current?.getJSON?.() || editorJson,
        baseFingerprint: initialFingerprint,
        updatedAt: new Date().toISOString(),
      });
    };
    window.addEventListener("beforeunload", persistLatest);
    return () => {
      window.removeEventListener("beforeunload", persistLatest);
      persistLatest();
    };
  }, [draftKey, editorJson, initialFingerprint, savedValue]);

  const updateValue = useCallback((nextValue, forceCheckpoint = false) => {
    setValue((currentValue) => {
      if (nextValue === currentValue) return currentValue;
      const now = Date.now();
      if (forceCheckpoint || now - historyRef.current.lastCheckpoint > 700) {
        historyRef.current.past.push(currentValue);
        historyRef.current.past = historyRef.current.past.slice(-MAX_UNDO_STEPS);
        historyRef.current.lastCheckpoint = now;
      }
      historyRef.current.future = [];
      return nextValue;
    });
  }, []);

  const undo = useCallback(() => {
    setValue((currentValue) => {
      const previous = historyRef.current.past.pop();
      if (previous === undefined) return currentValue;
      historyRef.current.future.push(currentValue);
      return previous;
    });
  }, []);

  const redo = useCallback(() => {
    setValue((currentValue) => {
      const next = historyRef.current.future.pop();
      if (next === undefined) return currentValue;
      historyRef.current.past.push(currentValue);
      return next;
    });
  }, []);

  const replaceSelection = useCallback((replacement, selectionStart, selectionEnd) => {
    const next = `${value.slice(0, selectionStart)}${replacement}${value.slice(selectionEnd)}`;
    updateValue(next, true);
    window.requestAnimationFrame(() => {
      textareaRef.current?.focus();
      textareaRef.current?.setSelectionRange(selectionStart, selectionStart + replacement.length);
    });
  }, [updateValue, value]);

  const wrapSelection = useCallback((prefix, suffix = prefix, placeholder = "النص") => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selected = value.slice(start, end) || placeholder;
    replaceSelection(`${prefix}${selected}${suffix}`, start, end);
  }, [replaceSelection, value]);

  const prefixLines = useCallback((prefix) => {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const lineStart = value.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const nextBreak = value.indexOf("\n", end);
    const lineEnd = nextBreak === -1 ? value.length : nextBreak;
    const selected = value.slice(lineStart, lineEnd) || "عنوان القسم";
    replaceSelection(selected.split("\n").map((line) => `${prefix}${line.replace(/^\s+/, "")}`).join("\n"), lineStart, lineEnd);
  }, [replaceSelection, value]);

  const insertLicensedImage = useCallback((item) => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? start;
    const title = markdownSafe(item.title || "Educational image");
    const alt = markdownSafe(item.title || "Educational image", 180);
    const creator = markdownSafe(item.creator || "Unknown", 180);
    const license = markdownSafe(item.license || "", 24).toLowerCase();
    const provider = markdownSafe(item.provider || "", 40);
    const imageUrl = encodeURI(String(item.url || "").trim());
    const sourcePage = String(item.sourcePage || "").trim();
    const licenseUrl = String(item.licenseUrl || "").trim();
    const snippet = `\n\n![${alt}](${imageUrl} \"${title}\")\n> Image credit: ${creator} | ${license} | ${sourcePage} | ${licenseUrl} | ${provider} | approved\n\n`;
    if (tiptapRef.current?.insertMarkdown?.(snippet)) {
      toast.success("أُضيفت الصورة مع الترخيص والمصدر");
      return;
    }
    replaceSelection(snippet, start, end);
    toast.success("أُضيفت الصورة مع الترخيص والمصدر");
  }, [replaceSelection, value.length]);

  const addRevision = useCallback((content, reason) => {
    if (!content?.trim()) return;
    setRevisions((current) => {
      if (current[0]?.content === content) return current;
      const next = [{
        id: `${Date.now()}-${stableSummaryFingerprint(content)}`,
        content,
        reason,
        createdAt: new Date().toISOString(),
        words: contentWordCount(content),
      }, ...current].slice(0, MAX_REVISIONS);
      writeStorage(revisionsKey, compactLocalRevisions(next));
      return next;
    });
  }, [revisionsKey]);

  const persist = useCallback(async ({ silent = false } = {}) => {
    if (!courseId) {
      if (!silent) toast.error("تعذر تحديد الكورس لحفظ الملخص");
      return;
    }
    if (!value.trim()) {
      if (!silent) toast.error("الملخص لا يمكن أن يكون فارغاً");
      return;
    }
    setSaving(true);
    try {
      const document = createVersionedDocument(value.trim(), {
        summary,
        courseTitle,
        courseLanguage,
        editorJson: tiptapRef.current?.getJSON?.() || editorJson,
      });
      const versioned = await saveSummaryDocument({
        courseId,
        document,
        baseRevision: activeRevision,
        reason: silent ? "autosave" : "manual_edit",
        renderedMarkdown: value.trim(),
      });
      const isPendingSync = !!(versioned?.offline || versioned?.pendingSync);
      const revision = isPendingSync ? activeRevision : Math.max(activeRevision + 1, Number(versioned?.revision || 0));
      const nextSummary = createEditedSummary(summary, value.trim(), { document, revision });
      if (savedValue && savedValue !== value) addRevision(savedValue, "قبل التعديل");
      addRevision(value.trim(), "حفظ يدوي");
      setSavedValue(value.trim());
      if (!isPendingSync) setActiveRevision(revision);
      setValue(value.trim());
      setPendingSync(isPendingSync);
      if (isPendingSync) {
        writeStorage(draftKey, { content: value.trim(), editorJson: tiptapRef.current?.getJSON?.() || editorJson, baseFingerprint: initialFingerprint, updatedAt: new Date().toISOString(), pendingSync: true });
        setDraftStatus("pending");
      } else {
        window.localStorage.removeItem(draftKey);
        setRecovered(false);
        setDraftStatus("synced");
      }
      historyRef.current = { past: [], future: [], lastCheckpoint: 0 };
      onSaved?.(nextSummary);
      if (!silent) {
        if (isPendingSync) toast.info("المسودة محفوظة على الجهاز وستُزامن عند توفر الخادم");
        else toast.success("تم حفظ الملخص والمراجعة الجديدة");
      }
    } catch (error) {
      writeStorage(draftKey, { content: value, editorJson: tiptapRef.current?.getJSON?.() || editorJson, baseFingerprint: initialFingerprint, updatedAt: new Date().toISOString() });
      setDraftStatus("saved");
      if (!silent) toast.error(error?.message || "تعذر الحفظ على الحساب؛ المسودة محفوظة على الجهاز");
    } finally {
      setSaving(false);
    }
  }, [activeRevision, addRevision, courseId, courseLanguage, courseTitle, draftKey, editorJson, initialFingerprint, onSaved, savedValue, summary, value]);

  const save = useCallback(() => persist({ silent: false }), [persist]);

  useEffect(() => {
    if (!dirty || saving || typeof navigator === "undefined" || !navigator.onLine) return undefined;
    const timer = window.setTimeout(() => persist({ silent: true }), 10_000);
    return () => window.clearTimeout(timer);
  }, [dirty, persist, saving]);

  useEffect(() => {
    if (!pendingSync) return undefined;
    const retry = () => persist({ silent: true });
    window.addEventListener("online", retry);
    return () => window.removeEventListener("online", retry);
  }, [pendingSync, persist]);

  const resetToSaved = useCallback(() => {
    if (value === savedValue) return;
    historyRef.current.past.push(value);
    historyRef.current.future = [];
    setValue(savedValue);
    window.localStorage.removeItem(draftKey);
    setRecovered(false);
    setDraftStatus("saved");
  }, [draftKey, savedValue, value]);

  const restoreRevision = useCallback((revision) => {
    updateValue(revision.content, true);
    setShowRevisions(false);
    toast.info("تم استرجاع النسخة داخل المحرر؛ اضغط حفظ لتثبيتها");
  }, [updateValue]);

  const runEditorCommand = useCallback((command, fallback) => {
    const handled = tiptapRef.current?.[command]?.();
    if (!handled) fallback?.();
  }, []);

  const handleTiptapChange = useCallback((markdown) => updateValue(markdown), [updateValue]);
  const handleTiptapJson = useCallback((json) => setEditorJson(json), []);

  const statusText = draftStatus === "saving" ? "جارٍ حفظ المسودة..."
    : draftStatus === "error" ? "تعذر حفظ المسودة محلياً"
    : draftStatus === "recovered" ? "تم استرجاع مسودة محلية"
    : draftStatus === "pending" ? "محفوظ محلياً وينتظر المزامنة"
    : draftStatus === "synced" ? "محفوظ تلقائياً على الحساب"
    : dirty ? "المسودة محفوظة على هذا الجهاز" : "لا توجد تغييرات";

  return (
    <section className="overflow-hidden rounded-2xl border border-primary/25 bg-background/95 shadow-2xl" aria-label="محرر الملخص">
      <div className="flex flex-wrap items-center gap-1.5 border-b border-border bg-muted/35 p-2.5">
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("undo", undo)} title="تراجع"><Undo2 className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("redo", redo)} title="إعادة"><Redo2 className="h-4 w-4" /></Button>
        <span className="mx-1 h-6 w-px bg-border" />
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("toggleBold", () => wrapSelection("**", "**", "مصطلح مهم"))} title="عريض"><Bold className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("toggleHeading", () => prefixLines("## "))} title="عنوان"><Heading2 className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("toggleBulletList", () => prefixLines("- "))} title="قائمة"><List className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("toggleHighlight", () => wrapSelection("==yellow:", "==", "معلومة مهمة"))} title="تمييز"><Highlighter className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant="ghost" onClick={() => runEditorCommand("toggleCode", () => wrapSelection("`", "`", "formula"))} title="كود أو معادلة"><Code2 className="h-4 w-4" /></Button>
        <Button type="button" size="sm" variant={imagePickerOpen ? "secondary" : "ghost"} onClick={() => setImagePickerOpen((current) => !current)} title="صورة تعليمية مرخصة" className="gap-1.5"><ImagePlus className="h-4 w-4" /><span className="hidden sm:inline">صورة</span></Button>
        <span className="mx-1 hidden h-6 w-px bg-border sm:block" />
        <Button type="button" size="sm" variant={showPreview ? "secondary" : "ghost"} onClick={() => setShowPreview((current) => !current)} className="gap-1.5 md:hidden"><Eye className="h-4 w-4" /> معاينة</Button>
        <Button type="button" size="sm" variant={showRevisions ? "secondary" : "ghost"} onClick={() => setShowRevisions((current) => !current)} className="gap-1.5"><History className="h-4 w-4" /> النسخ <span className="rounded-full bg-background px-1.5 text-[10px]">{revisions.length}</span></Button>
        <Button type="button" size="sm" variant="ghost" onClick={resetToSaved} disabled={!dirty} className="gap-1.5"><RotateCcw className="h-4 w-4" /> تجاهل</Button>
        <Button type="button" size="sm" onClick={save} disabled={(!dirty && !pendingSync) || saving} className="ms-auto min-w-24 gap-1.5 font-bold">
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : dirty || pendingSync ? <FileSave3D size={18} /> : <Check className="h-4 w-4 text-emerald-400" />}
          {saving ? "يحفظ..." : pendingSync ? "مزامنة" : dirty ? "حفظ التعديلات" : "تم الحفظ"}
        </Button>
      </div>

      <LicensedImagePicker
        open={imagePickerOpen}
        onClose={() => setImagePickerOpen(false)}
        onInsert={insertLicensedImage}
        defaultQuery={courseTitle}
      />

      {recovered && recoveredDraft?.baseFingerprint !== initialFingerprint && (
        <div className="border-b border-amber-300/40 bg-amber-500/10 px-4 py-2 text-xs leading-relaxed text-amber-700 dark:text-amber-200">
          هذه المسودة أقدم من النسخة المولدة الحالية. حافظنا عليها حتى لا يضيع تعديلك؛ استخدم “تجاهل” للعودة إلى النسخة الحالية.
        </div>
      )}

      {showRevisions && (
        <div className="border-b border-border bg-muted/20 p-3">
          {revisions.length ? (
            <div className="grid max-h-52 gap-2 overflow-y-auto sm:grid-cols-2">
              {revisions.map((revision) => (
                <button key={revision.id} type="button" onClick={() => restoreRevision(revision)} className="rounded-xl border border-border bg-background p-3 text-start transition-colors hover:border-primary/50 hover:bg-primary/5">
                  <span className="block text-xs font-bold">{revision.reason}</span>
                  <span className="mt-1 block text-[11px] text-muted-foreground">{revisionLabel(revision.createdAt)} · {Number(revision.words || 0).toLocaleString()} كلمة</span>
                  <span dir="auto" className="mt-1 line-clamp-2 block text-xs [unicode-bidi:plaintext]">{stripSummaryMarkup(revision.content).slice(0, 150)}</span>
                </button>
              ))}
            </div>
          ) : <p className="py-3 text-center text-xs text-muted-foreground">يُنشأ سجل المراجعات عند أول حفظ.</p>}
        </div>
      )}

      <div className="grid min-h-[620px] md:grid-cols-2">
        <div className="flex min-h-[620px] flex-col border-border md:border-e">
          <div className="flex items-center justify-between border-b border-border px-4 py-2 text-xs text-muted-foreground">
            <span>Tiptap JSON قابل للتحرير</span>
            <span>{deferredWordCount.toLocaleString()} كلمة</span>
          </div>
          <Suspense fallback={<div className="min-h-[570px] animate-pulse bg-slate-100 dark:bg-slate-900" aria-label="جارٍ تحميل المحرر" />}>
            <TiptapSummaryEditor
              ref={tiptapRef}
              value={value}
              initialJson={editorJson}
              onChange={handleTiptapChange}
              onJsonChange={handleTiptapJson}
              onSave={save}
            />
          </Suspense>
          <div className="flex items-center justify-between border-t border-border px-4 py-2 text-[11px] text-muted-foreground">
            <span className={draftStatus === "error" ? "text-destructive" : ""}>{statusText}</span>
            <span>⌘/Ctrl + S للحفظ</span>
          </div>
        </div>
        <div className={`${showPreview ? "block" : "hidden md:block"} max-h-[760px] overflow-y-auto bg-slate-100/70 p-3 sm:p-5`}>
          <div className="mx-auto min-h-full max-w-[760px] rounded-xl bg-white p-5 text-slate-950 shadow-lg sm:p-8">
            <MarkdownDocumentRenderer content={deferredValue} />
          </div>
        </div>
      </div>
    </section>
  );
}
