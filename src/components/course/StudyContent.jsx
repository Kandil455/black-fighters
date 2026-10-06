import React from "react";
import { MarkdownDocumentRenderer } from "@/components/course/SummaryDocumentRenderer";

/**
 * Shared study-content surface. Branding belongs to the parent document shell,
 * so nested uses do not render a second logo, watermark, or header.
 */
export default function StudyContent({ content, compact = false, className = "" }) {
  return (
    <div
      dir="auto"
      className={`study-content relative overflow-hidden rounded-2xl bg-white text-slate-950 ${compact ? "p-4 md:p-6" : "p-6 shadow-xl md:p-10"} ${className}`}
    >
      <MarkdownDocumentRenderer content={content} />
    </div>
  );
}
