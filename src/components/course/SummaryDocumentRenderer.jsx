import React from "react";
import ClassicSummaryDocumentRenderer, {
  MarkdownDocumentRenderer as ClassicMarkdownRenderer,
} from "./ClassicSummaryDocumentRenderer";
import AtlasSummaryReader from "@/components/atlas/AtlasSummaryReader";

export function MarkdownDocumentRenderer(props) {
  return <ClassicMarkdownRenderer {...props} />;
}

/**
 * Unified LineVault Summary Document Renderer
 * Removes the conflicting "Atlas V5" vs "Neon" mode switches and provides
 * one calm, consistent summary reader with a simple Dark / Light paper toggle.
 */
export default function SummaryDocumentRenderer(props) {
  const doc = props.document || props.summary || props.data;
  const hasExplicitPlates =
    doc &&
    Array.isArray(doc.chapters) &&
    doc.chapters.length > 0 &&
    Array.isArray(doc.chapters[0]?.plates);

  return (
    <div className="flex flex-col w-full relative">
      {hasExplicitPlates ? (
        <AtlasSummaryReader
          document={doc}
          fallbackMarkdown={props.fallbackMarkdown || props.markdown || ""}
          initialTheme="dark"
        />
      ) : (
        <ClassicSummaryDocumentRenderer {...props} />
      )}
    </div>
  );
}
