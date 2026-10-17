import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeRaw from "rehype-raw";
import { isEnglishNode, preprocessBidiMarkdown } from "./bidiMarkdown";

/**
 * ⚡️ Bi-Directional Section Viewer (BidiMarkdownViewer)
 * Matches the requested modular clinical layout:
 * - Part pill badge
 * - English Core Notes (Strict LTR, left bullets, highlighted terms)
 * - (الشرح بالعربي) pill badge
 * - Arabic Clinical Walkthrough (Strict RTL, right bullets, bold terms)
 * - Dual bilingual tables (English first, Arabic below)
 */
export default function BidiMarkdownViewer({ markdown, theme = "dark", isEn = false }) {
  const isLight = theme === "light";
  const processed = React.useMemo(() => (markdown ? preprocessBidiMarkdown(markdown) : ""), [markdown]);

  const parsedParts = React.useMemo(() => {
    if (!processed) return [];
    // Split markdown by ## (H2) headings while preserving delimiters
    const rawParts = processed.split(/\n(?=##\s+)/);

    return rawParts.map((rawPart, idx) => {
      const trimmed = rawPart.trim();
      const firstLine = trimmed.split("\n")[0] || "";
      const isH2 = firstLine.startsWith("## ");
      const title = isH2 ? firstLine.replace(/^##\s+/, "").trim() : "";

      // Robust check for embedded Arabic Walkthrough split:
      // Matches ### (الشرح بالعربي) / (الشرح بالعربي) / **الشرح بالعربي:** / الشرح بالعربي: / ### الشرح التفصيلي
      const splitRegex = /(?:\n|^)\s*(?:#{1,4}\s*)?(?:\*{0,2})\s*\(?الشرح\s+(?:بالعربي|التفصيلي|الإكلينيكي)\)?(?:\*{0,2})\s*:?/i;
      const splitMatch = trimmed.match(splitRegex);

      if (splitMatch && splitMatch.index !== undefined && splitMatch.index > 15) {
        const enChunk = trimmed.slice(0, splitMatch.index).trim();
        const arChunk = trimmed.slice(splitMatch.index).trim();
        return {
          id: idx,
          type: "paired_part",
          title,
          enContent: enChunk,
          arContent: arChunk,
        };
      }

      // Standalone section (intro, standalone table, or summary)
      const hasEnglishKeyword = /English Core Notes|Diagnostic Criteria|Technical Notes|Classification|Comparison Table \(English\)/i.test(title);
      const arabicLetters = (trimmed.match(/[\u0600-\u06FF]/g) || []).length;
      const englishLetters = (trimmed.match(/[a-zA-Z]/g) || []).length;
      const isEnglish = hasEnglishKeyword || (englishLetters > 35 && englishLetters > arabicLetters * 1.3);

      return {
        id: idx,
        type: "standalone",
        title,
        content: trimmed,
        isEnglish,
      };
    });
  }, [processed]);

  if (!markdown) return null;

  return (
    <div className="space-y-8">
      {parsedParts.map((item) => {
        if (item.type === "paired_part") {
          return (
            <div
              key={item.id}
              className={`paired-part-card my-8 rounded-3xl p-6 sm:p-8 space-y-6 transition-colors duration-300 ${
                isLight
                  ? "bg-card border border-border shadow-xl text-card-foreground"
                  : "bg-surface border border-border shadow-2xl text-foreground"
              }`}
            >
              {/* Part Header Badge */}
              <div className={`flex items-center justify-between border-b pb-4 ${isLight ? "border-border" : "border-border"}`}>
                <div className="part-header-pill">
                  {item.title}
                </div>
                <span className={`text-[11px] font-mono font-bold uppercase tracking-wider ${isLight ? "text-muted-foreground" : "text-muted-foreground"}`}>
                  BILINGUAL CLINICAL MODULE
                </span>
              </div>

              {/* 1. English Core Notes (Strict LTR) */}
              <div dir="ltr" className="bidi-ltr text-left font-sans space-y-3" style={{ direction: "ltr", textAlign: "left" }}>
                <ReactMarkdown
                  remarkPlugins={[remarkGfm]}
                  rehypePlugins={[rehypeRaw]}
                  components={{
                    h1: () => null,
                    h2: () => null,
                    h3: ({ children }) => (
                      <h3 className={`text-base font-black font-mono mt-4 mb-2 text-left ${isLight ? "text-primary" : "text-primary"}`}>
                        {children}
                      </h3>
                    ),
                    p: ({ children }) => (
                      <p
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left" }}
                        className={`my-2.5 leading-7 text-[15px] font-sans font-medium text-left ${isLight ? "text-foreground" : "text-foreground"}`}
                      >
                        {children}
                      </p>
                    ),
                    ul: ({ children }) => (
                      <ul
                        className={`my-3 space-y-2 list-disc ps-6 text-left ${isLight ? "marker:text-primary text-foreground" : "marker:text-primary text-foreground"}`}
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                      >
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol
                        className={`my-3 space-y-2 list-decimal ps-6 text-left ${isLight ? "marker:text-primary text-foreground" : "marker:text-primary text-foreground"}`}
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                      >
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => (
                      <li
                        dir="ltr"
                        style={{ direction: "ltr", textAlign: "left" }}
                        className={`leading-7 text-[15px] font-medium text-left ${isLight ? "text-foreground" : "text-foreground"}`}
                      >
                        {children}
                      </li>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-black text-foreground">{children}</strong>
                    ),
                    code: ({ children }) => (
                      <code className={`px-1.5 py-0.5 rounded font-mono text-xs ${
                        isLight
                          ? "bg-muted border border-border text-foreground font-bold"
                          : "bg-muted border border-border text-primary"
                      }`}>
                        {children}
                      </code>
                    ),
                    table: ({ children }) => (
                      <div className={`my-5 overflow-x-auto rounded-xl border ${
                        isLight ? "border-border bg-card" : "border-border bg-card"
                      }`}>
                        <table className="w-full text-xs sm:text-sm text-left border-collapse">
                          {children}
                        </table>
                      </div>
                    ),
                    th: ({ children }) => (
                      <th className={`p-3 border-b font-mono font-bold text-left ${
                        isLight ? "bg-muted border-border text-foreground" : "bg-muted border-border text-foreground"
                      }`}>
                        {children}
                      </th>
                    ),
                    td: ({ children }) => (
                      <td className={`p-3 border-b align-top text-left font-sans ${
                        isLight ? "border-border text-foreground font-medium" : "border-border text-foreground"
                      }`}>
                        {children}
                      </td>
                    ),
                  }}
                >
                  {item.enContent.replace(/^##\s+.*?\n/, "")}
                </ReactMarkdown>
              </div>

              {/* Divider & Arabic Walkthrough */}
              <div className={`border-t pt-4 ${isLight ? "border-border" : "border-border"}`}>
                <div className="flex justify-end mb-3">
                  <div className="arabic-walkthrough-pill">
                    {isEn ? "(Arabic Clinical Walkthrough):" : "(الشرح بالعربي):"}
                  </div>
                </div>

                <div dir="rtl" className="bidi-rtl text-right font-sans space-y-3" style={{ direction: "rtl", textAlign: "right" }}>
                  <ReactMarkdown
                    remarkPlugins={[remarkGfm]}
                    rehypePlugins={[rehypeRaw]}
                    components={{
                      h1: () => null,
                      h2: () => null,
                      h3: () => null,
                      p: ({ children }) => {
                        const isEnP = isEnglishNode(children);
                        return (
                          <p
                            dir={isEnP ? "ltr" : "rtl"}
                            style={{
                              direction: isEnP ? "ltr" : "rtl",
                              textAlign: isEnP ? "left" : "right",
                              unicodeBidi: "isolate",
                            }}
                            className={`my-3 leading-8 text-[15px] font-sans font-medium ${isEnP ? "text-left" : "text-right"} text-foreground`}
                          >
                            {children}
                          </p>
                        );
                      },
                      ul: ({ children }) => (
                        <ul
                          className="my-3 space-y-2 list-disc pe-6 marker:text-emerald-500 text-foreground"
                          dir="rtl"
                          style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                        >
                          {children}
                        </ul>
                      ),
                      ol: ({ children }) => (
                        <ol
                          className="my-3 space-y-2 list-decimal pe-6 marker:text-emerald-500 text-foreground"
                          dir="rtl"
                          style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                        >
                          {children}
                        </ol>
                      ),
                      li: ({ children }) => {
                        const isEnLi = isEnglishNode(children);
                        return (
                          <li
                            dir={isEnLi ? "ltr" : "rtl"}
                            style={{
                              direction: isEnLi ? "ltr" : "rtl",
                              textAlign: isEnLi ? "left" : "right",
                              unicodeBidi: "isolate",
                            }}
                            className={`leading-7 text-[15px] font-medium ${isEnLi ? "text-left ps-4" : "text-right"} text-foreground`}
                          >
                            {children}
                          </li>
                        );
                      },
                      strong: ({ children }) => (
                        <strong className="font-black text-foreground">{children}</strong>
                      ),
                      code: ({ children }) => (
                        <code
                          dir="ltr"
                          className="bidi-isolate px-1.5 py-0.5 rounded font-mono text-xs mx-1 inline-block bg-muted border border-border text-foreground"
                        >
                          {children}
                        </code>
                      ),
                      table: ({ children }) => (
                        <div className="my-5 overflow-x-auto rounded-xl border border-border bg-card">
                          <table className="w-full text-xs sm:text-sm text-right border-collapse">
                            {children}
                          </table>
                        </div>
                      ),
                      th: ({ children }) => (
                        <th className="p-3 border-b font-bold text-right bg-muted border-border text-foreground">
                          {children}
                        </th>
                      ),
                      td: ({ children }) => (
                        <td className="p-3 border-b align-top text-right font-sans border-border text-foreground font-medium">
                          {children}
                        </td>
                      ),
                      blockquote: ({ children }) => (
                        <blockquote className="my-4 p-4 rounded-xl border-r-4 text-right bg-muted/60 border-primary text-foreground font-medium">
                          {children}
                        </blockquote>
                      ),
                    }}
                  >
                    {item.arContent.replace(/^(?:#{1,4}\s*)?(?:\*{0,2})\s*\(?الشرح\s+(?:بالعربي|التفصيلي|الإكلينيكي)\)?(?:\*{0,2})[:\s]*/i, "")}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          );
        }

        // Standalone Section (Intro, Standalone Table, Pitfalls, etc.)
        if (item.isEnglish) {
          return (
            <div
              key={item.id}
              dir="ltr"
              className="bidi-ltr my-6 p-6 sm:p-8 rounded-2xl border text-left font-sans shadow-lg transition-colors duration-300 bg-card border-border text-card-foreground"
            >
              {item.title && (
                <div className="part-header-pill mb-4">
                  {item.title}
                </div>
              )}
              <ReactMarkdown
                remarkPlugins={[remarkGfm]}
                rehypePlugins={[rehypeRaw]}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-xl sm:text-2xl font-black font-mono mb-4 text-left text-primary">
                      {children}
                    </h1>
                  ),
                  h2: () => null,
                  h3: ({ children }) => (
                    <h3 className="text-base font-bold font-mono mt-5 mb-2 text-left text-foreground">
                      {children}
                    </h3>
                  ),
                  p: ({ children }) => (
                    <p className="my-2.5 leading-7 text-[15px] font-sans font-medium text-left text-foreground">
                      {children}
                    </p>
                  ),
                  ul: ({ children }) => (
                    <ul
                      className="my-3 space-y-2 list-disc ps-6 text-left marker:text-primary text-foreground"
                      style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                    >
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol
                      className="my-3 space-y-2 list-decimal ps-6 text-left marker:text-primary text-foreground"
                      style={{ direction: "ltr", textAlign: "left", listStylePosition: "outside" }}
                    >
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-7 text-[15px] font-medium text-left text-foreground">
                      {children}
                    </li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-black text-foreground">{children}</strong>
                  ),
                  code: ({ children }) => (
                    <code className="px-1.5 py-0.5 rounded font-mono text-xs bg-muted border border-border text-foreground">
                      {children}
                    </code>
                  ),
                  table: ({ children }) => (
                    <div className="my-5 overflow-x-auto rounded-xl border border-border bg-card">
                      <table className="w-full text-xs sm:text-sm text-left border-collapse">
                        {children}
                      </table>
                    </div>
                  ),
                  th: ({ children }) => (
                    <th className="p-3 border-b font-mono font-bold text-left bg-muted border-border text-foreground">
                      {children}
                    </th>
                  ),
                  td: ({ children }) => (
                    <td className="p-3 border-b align-top text-left font-sans border-border text-foreground font-medium">
                      {children}
                    </td>
                  ),
                }}
              >
                {item.content.replace(/^##\s+.*?\n/, "")}
              </ReactMarkdown>
            </div>
          );
        }

        // Standalone Arabic Section
        return (
          <div
            key={item.id}
            dir="rtl"
            className="bidi-rtl my-6 p-6 sm:p-8 rounded-2xl border text-right font-sans shadow-lg transition-colors duration-300 bg-card border-border text-card-foreground"
          >
            {item.title && (
              <div className="part-header-pill mb-4">
                {item.title}
              </div>
            )}
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              rehypePlugins={[rehypeRaw]}
              components={{
                h1: ({ children }) => (
                  <h1 className="text-2xl sm:text-3xl font-black mb-4 border-b pb-3 text-right text-foreground border-border">
                    {children}
                  </h1>
                ),
                h2: () => null,
                h3: ({ children }) => (
                  <h3 className="text-base sm:text-lg font-bold mt-5 mb-2 border-r-4 pr-3 text-right text-foreground border-primary">
                    {children}
                  </h3>
                ),
                p: ({ children }) => {
                  const isEnP = isEnglishNode(children);
                  return (
                    <p
                      dir={isEnP ? "ltr" : "rtl"}
                      style={{ direction: isEnP ? "ltr" : "rtl", textAlign: isEnP ? "left" : "right" }}
                      className={`my-3 leading-8 text-[15px] font-sans font-medium ${isEnP ? "text-left" : "text-right"} text-foreground`}
                    >
                      {children}
                    </p>
                  );
                },
                ul: ({ children }) => (
                  <ul
                    className="my-3 space-y-2 list-disc pr-6 text-right marker:text-primary text-foreground"
                    style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                  >
                    {children}
                  </ul>
                ),
                ol: ({ children }) => (
                  <ol
                    className="my-3 space-y-2 list-decimal pr-6 text-right marker:text-primary text-foreground"
                    style={{ direction: "rtl", textAlign: "right", listStylePosition: "outside" }}
                  >
                    {children}
                  </ol>
                ),
                li: ({ children }) => {
                  const isEnLi = isEnglishNode(children);
                  return (
                    <li
                      dir={isEnLi ? "ltr" : "rtl"}
                      style={{ direction: isEnLi ? "ltr" : "rtl", textAlign: isEnLi ? "left" : "right" }}
                      className={`leading-7 text-[15px] font-medium ${isEnLi ? "text-left ps-4" : "text-right"} text-foreground`}
                    >
                      {children}
                    </li>
                  );
                },
                strong: ({ children }) => (
                  <strong className="font-black text-foreground">{children}</strong>
                ),
                code: ({ children }) => (
                  <code
                    dir="ltr"
                    className="bidi-isolate px-1.5 py-0.5 rounded font-mono text-xs mx-1 inline-block bg-muted border border-border text-foreground"
                  >
                    {children}
                  </code>
                ),
                table: ({ children }) => (
                  <div className="my-5 overflow-x-auto rounded-xl border border-border bg-card">
                    <table className="w-full text-xs sm:text-sm text-right border-collapse">
                      {children}
                    </table>
                  </div>
                ),
                th: ({ children }) => (
                  <th className="p-3 border-b font-bold text-right bg-muted border-border text-foreground">
                    {children}
                  </th>
                ),
                td: ({ children }) => (
                  <td className="p-3 border-b align-top text-right font-sans border-border text-foreground font-medium">
                    {children}
                  </td>
                ),
                blockquote: ({ children }) => (
                  <blockquote className="my-4 p-4 rounded-xl border-r-4 text-right bg-muted/60 border-primary text-foreground font-medium">
                    {children}
                  </blockquote>
                ),
              }}
            >
              {item.content.replace(/^##\s+.*?\n/, "")}
            </ReactMarkdown>
          </div>
        );
      })}
    </div>
  );
}
