import React, { Suspense, lazy } from "react";
import ClassicSummaryDocumentRenderer, {
  MarkdownDocumentRenderer as ClassicMarkdownRenderer,
} from "./ClassicSummaryDocumentRenderer";
import AtlasSummaryReader from "@/components/atlas/AtlasSummaryReader";

export function MarkdownDocumentRenderer(props) {
  return <ClassicMarkdownRenderer {...props} />;
}

/**
 * Template registry: templateId → designed layout.
 *
 * Before this, EVERY summary rendered through one generic markdown-ish renderer,
 * so all the templates the create dialog offers produced the same grey wall — the
 * template choice changed the AI's block recipe but never the visual design.
 *
 * These templates are pure LAYOUT over the existing v3 document model
 * (sections[].blocks[] with a semantic role), so no schema/validator/storage
 * change was needed and revision history stays intact. Unknown/unlisted template
 * ids fall through to the classic renderer, so nothing new can break rendering.
 */
const TEMPLATES = {
  foundational_bilingual: lazy(() => import("./summaryTemplates").then((m) => ({ default: m.FoundationalTemplate }))),
  atlas_cram: lazy(() => import("./summaryTemplates").then((m) => ({ default: m.CramTemplate }))),
  comparison_classification: lazy(() => import("./summaryTemplates").then((m) => ({ default: m.ComparisonTemplate }))),
  qa_tutor: lazy(() => import("./summaryTemplates").then((m) => ({ default: m.QaTemplate }))),
  complete_study_guide: lazy(() => import("./summaryTemplates").then((m) => ({ default: m.CompleteGuideTemplate }))),
};

export function resolveSummaryTemplate(templateId) {
  return TEMPLATES[String(templateId || "")] || null;
}

/**
 * Unified summary reader.
 *
 * Resolution order:
 *   1. Explicit Atlas "plates" documents (curated content) → Atlas reader.
 *   2. v3 document with a designed template → that template's layout.
 *   3. Anything else (legacy markdown, unknown template, HTML fallback) → classic.
 */
export default function SummaryDocumentRenderer(props) {
  const doc = props.document || props.summary || props.data;
  const hasExplicitPlates =
    doc &&
    Array.isArray(doc.chapters) &&
    doc.chapters.length > 0 &&
    Array.isArray(doc.chapters[0]?.plates);

  const templateId = doc?.templateId || doc?.metadata?.templateId;
  const Template = hasExplicitPlates ? null : resolveSummaryTemplate(templateId);

  return (
    <div className="flex flex-col w-full relative">
      {hasExplicitPlates ? (
        <AtlasSummaryReader
          document={doc}
          fallbackMarkdown={props.fallbackMarkdown || props.markdown || ""}
          initialTheme="dark"
        />
      ) : Template ? (
        <Suspense fallback={<ClassicSummaryDocumentRenderer {...props} />}>
          <Template document={doc} className={props.className} />
        </Suspense>
      ) : (
        <ClassicSummaryDocumentRenderer {...props} />
      )}
    </div>
  );
}
