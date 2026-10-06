import React, { forwardRef, useEffect, useImperativeHandle, useRef } from "react";
import { Extension } from "@tiptap/core";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Highlight from "@tiptap/extension-highlight";
import Image from "@tiptap/extension-image";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { Markdown } from "@tiptap/markdown";

const BlockDirection = Extension.create({
  name: "iiiakBlockDirection",
  addGlobalAttributes() {
    return [{
      types: ["paragraph", "heading", "blockquote", "listItem", "tableCell", "tableHeader"],
      attributes: {
        dir: {
          default: "auto",
          parseHTML: (element) => element.getAttribute("dir") || "auto",
          renderHTML: (attributes) => ({ dir: attributes.dir || "auto" }),
        },
      },
    }];
  },
});

function normalizeEditorMarkdown(value) {
  return String(value || "")
    .replace(/==(?:green|yellow|cyan|orange|red):([^=\n]+)==/gi, "==$1==")
    .replace(/\r\n/g, "\n");
}

const TiptapSummaryEditor = forwardRef(function TiptapSummaryEditor({ value, initialJson = null, onChange, onJsonChange, onSave }, ref) {
  const hasHydratedInitialContent = useRef(false);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({ codeBlock: { HTMLAttributes: { dir: "ltr" } } }),
      Highlight.configure({ multicolor: true }),
      Image.configure({ allowBase64: false, HTMLAttributes: { class: "tiptap-summary-image" } }),
      Table.configure({ resizable: true }),
      TableRow,
      TableHeader,
      TableCell,
      BlockDirection,
      Markdown,
    ],
    content: initialJson || normalizeEditorMarkdown(value),
    contentType: initialJson ? "json" : "markdown",
    editorProps: {
      attributes: {
        class: "tiptap-summary-editor min-h-[570px] flex-1 bg-white p-4 text-[15px] leading-8 text-slate-950 outline-none dark:bg-slate-950 dark:text-slate-50",
        dir: "auto",
        spellcheck: "true",
      },
      handleKeyDown: (_view, event) => {
        if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "s") {
          event.preventDefault();
          onSave?.();
          return true;
        }
        return false;
      },
    },
    onUpdate: ({ editor: current }) => {
      onChange?.(current.getMarkdown());
      onJsonChange?.(current.getJSON());
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (!hasHydratedInitialContent.current) {
      hasHydratedInitialContent.current = true;
      onJsonChange?.(editor.getJSON());
      return;
    }
    const next = normalizeEditorMarkdown(value);
    if (editor.getMarkdown() !== next) {
      editor.commands.setContent(next, { contentType: "markdown", emitUpdate: false });
      onJsonChange?.(editor.getJSON());
    }
  }, [editor, onJsonChange, value]);

  useImperativeHandle(ref, () => ({
    focus: () => editor?.commands.focus(),
    undo: () => editor?.chain().focus().undo().run(),
    redo: () => editor?.chain().focus().redo().run(),
    toggleBold: () => editor?.chain().focus().toggleBold().run(),
    toggleHeading: () => editor?.chain().focus().toggleHeading({ level: 2 }).run(),
    toggleBulletList: () => editor?.chain().focus().toggleBulletList().run(),
    toggleHighlight: () => editor?.chain().focus().toggleHighlight({ color: "#fff05a" }).run(),
    toggleCode: () => editor?.chain().focus().toggleCode().run(),
    insertMarkdown: (markdown) => editor?.chain().focus().insertContent(markdown, { contentType: "markdown" }).run(),
    getJSON: () => editor?.getJSON() || null,
  }), [editor]);

  if (!editor) return <div className="min-h-[570px] animate-pulse bg-slate-100 dark:bg-slate-900" aria-label="جارٍ تحميل المحرر" />;
  return <EditorContent editor={editor} />;
});

export default TiptapSummaryEditor;
