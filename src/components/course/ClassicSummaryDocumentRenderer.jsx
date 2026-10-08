import React, { useEffect, useMemo, useState } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { normalizeSummaryMarkup } from "@/lib/summaryMarkup";
import {
  detectTextDirection,
  normalizeSummaryBlockType,
  summaryBlockText,
} from "@/lib/summaryDocument";

const HIGHLIGHT_CLASSES = {
  green: "bg-[#58f59b] text-black",
  yellow: "bg-[#fff05a] text-black",
  cyan: "bg-[#54f4ea] text-black",
  orange: "bg-[#ffc078] text-black",
  red: "bg-[#ff6b6b] text-black",
};

const ARABIC_RUN = "\\u0600-\\u06ff\\u0750-\\u077f\\u08a0-\\u08ff\\ufb50-\\ufdff\\ufe70-\\ufeff";
const BIDI_RUN = new RegExp(`([${ARABIC_RUN}]+(?:[\\s\\u200f]+[${ARABIC_RUN}]+)*|[A-Za-z]+(?:[A-Za-z0-9'’._/+:%-]*[A-Za-z0-9])?|\\d+(?:[.,:/%-]\\d+)*)`, "g");
const BLOCK_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "LI", "BLOCKQUOTE", "TD", "TH", "CAPTION", "PRE"]);
const SAFE_TAGS = new Set(["H1", "H2", "H3", "H4", "H5", "H6", "P", "DIV", "SPAN", "STRONG", "B", "EM", "I", "U", "S", "UL", "OL", "LI", "BLOCKQUOTE", "TABLE", "THEAD", "TBODY", "TFOOT", "TR", "TH", "TD", "CAPTION", "PRE", "CODE", "MARK", "A", "IMG", "HR", "BR", "SUP", "SUB", "BDI"]);

function childText(children) {
  return React.Children.toArray(children).map((child) => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (React.isValidElement(child)) return childText(child.props.children);
    return "";
  }).join(" ");
}

function BidiText({ children }) {
  const text = String(children ?? "");
  const parts = text.split(BIDI_RUN).filter((part) => part !== "");
  return parts.map((part, index) => {
    const direction = detectTextDirection(part, "");
    return direction ? <bdi key={`${index}-${part}`} dir={direction}>{part}</bdi> : <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;
  });
}

function inlineText(value) {
  const text = String(value ?? "");
  const parts = text.split(/(==(?:green|yellow|cyan|orange|red):[^=]+==|==[^=]+==)/gi);
  return parts.filter(Boolean).map((part, index) => {
    const semantic = part.match(/^==(green|yellow|cyan|orange|red):([\s\S]+)==$/i);
    const plain = !semantic && part.startsWith("==") && part.endsWith("==");
    if (semantic || plain) {
      const color = semantic?.[1]?.toLowerCase() || "yellow";
      const label = semantic?.[2] || part.slice(2, -2);
      return (
        <mark key={`${index}-${label}`} className={`rounded px-1.5 py-0.5 font-extrabold [box-decoration-break:clone] ${HIGHLIGHT_CLASSES[color]}`}>
          <BidiText>{label}</BidiText>
        </mark>
      );
    }
    return <BidiText key={`${index}-${part}`}>{part}</BidiText>;
  });
}

function inlineChildren(children) {
  return React.Children.map(children, (child) => (
    typeof child === "string" || typeof child === "number" ? inlineText(child) : child
  ));
}

function RichTextContent({ value }) {
  if (typeof value === "string" || typeof value === "number") return inlineText(value);
  const text = String(value?.text || "");
  const annotations = (Array.isArray(value?.annotations) ? value.annotations : [])
    .filter((annotation) => Number(annotation?.end) > Number(annotation?.start));
  if (!annotations.length) return <BidiText>{text}</BidiText>;
  const boundaries = [...new Set([0, text.length, ...annotations.flatMap((annotation) => [Number(annotation.start), Number(annotation.end)])])]
    .filter((position) => Number.isInteger(position) && position >= 0 && position <= text.length)
    .sort((left, right) => left - right);
  return boundaries.slice(0, -1).map((start, index) => {
    const end = boundaries[index + 1];
    const chunk = text.slice(start, end);
    if (!chunk) return null;
    const active = annotations.filter((annotation) => Number(annotation.start) <= start && Number(annotation.end) >= end);
    let content = <BidiText>{chunk}</BidiText>;
    if (active.some((annotation) => annotation.code)) content = <code dir="ltr" className="rounded bg-cyan-50 px-1.5 py-0.5 font-mono [unicode-bidi:isolate]">{content}</code>;
    else {
      const highlighted = active.find((annotation) => annotation.highlight);
      if (highlighted) content = <mark className={`rounded px-1.5 py-0.5 font-extrabold ${HIGHLIGHT_CLASSES[highlighted.color] || HIGHLIGHT_CLASSES.yellow}`}>{content}</mark>;
      if (active.some((annotation) => annotation.bold)) content = <strong className="font-black">{content}</strong>;
      if (active.some((annotation) => annotation.italic)) content = <em>{content}</em>;
    }
    return <React.Fragment key={`${start}-${end}`}>{content}</React.Fragment>;
  });
}

function directionProps(children, fallback = "rtl") {
  const dir = detectTextDirection(childText(children), fallback);
  return { dir, lang: dir === "rtl" ? "ar" : "en", style: { unicodeBidi: "plaintext" } };
}

function safeUrl(value, { image = false } = {}) {
  const url = String(value || "").trim();
  if (!url) return "";
  if (/^(https?:|blob:)/i.test(url) || url.startsWith("/")) return url;
  if (image && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);/i.test(url)) return url;
  if (!image && /^(mailto:|tel:)/i.test(url)) return url;
  return "";
}

function SecureSummaryImage({ src, alt = "", title = "", className = "" }) {
  const safeSource = safeUrl(src, { image: true });
  const isLocal = /^(?:data:image\/|blob:|\/)/i.test(safeSource);
  const [displaySource, setDisplaySource] = useState(isLocal ? safeSource : "");
  const [failed, setFailed] = useState(!safeSource);

  useEffect(() => {
    if (!safeSource) { setFailed(true); return undefined; }
    if (isLocal) { setDisplaySource(safeSource); setFailed(false); return undefined; }
    let cancelled = false;
    let objectUrl = "";
    setDisplaySource("");
    setFailed(false);
    import("@/lib/summaryJobs")
      .then(({ fetchLicensedImage }) => fetchLicensedImage(safeSource))
      .then((blob) => {
        if (cancelled) return;
        objectUrl = URL.createObjectURL(blob);
        setDisplaySource(objectUrl);
      })
      .catch(() => { if (!cancelled) setFailed(true); });
    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [isLocal, safeSource]);

  if (failed) return <div role="img" aria-label={alt} className="my-5 rounded-xl border border-dashed border-slate-300 bg-slate-50 px-4 py-10 text-center text-sm text-slate-500">تعذر تحميل الصورة المرخصة · {alt}</div>;
  if (!displaySource) return <div className="my-5 h-52 animate-pulse rounded-xl border border-slate-200 bg-slate-100" aria-label="جارٍ تحميل الصورة عبر الخادم" />;
  return <img src={displaySource} alt={alt} title={title} loading="lazy" decoding="async" className={className} />;
}

const markdownComponents = {
  h1: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <h1 {...props} className={`mb-5 mt-2 text-2xl font-black leading-relaxed ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        <span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white [box-decoration-break:clone]">{inlineChildren(children)}</span>
      </h1>
    );
  },
  h2: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <h2 {...props} className={`mb-3 mt-7 text-xl font-black leading-relaxed ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        <span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white [box-decoration-break:clone]">{inlineChildren(children)}</span>
      </h2>
    );
  },
  h3: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <h3 {...props} className={`mb-2 mt-5 text-base font-extrabold leading-relaxed ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        <span className="inline rounded bg-slate-800 px-2 py-0.5 text-white [box-decoration-break:clone]">{inlineChildren(children)}</span>
      </h3>
    );
  },
  h4: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <h4 {...props} className={`mb-2 mt-4 font-extrabold ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        {inlineChildren(children)}
      </h4>
    );
  },
  p: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <p {...props} className={`my-2.5 whitespace-pre-wrap leading-8 ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        {inlineChildren(children)}
      </p>
    );
  },
  strong: ({ children }) => <strong className="font-black text-slate-950">{inlineChildren(children)}</strong>,
  em: ({ children }) => <em>{inlineChildren(children)}</em>,
  ul: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <ul
        {...props}
        className={`my-3 list-disc space-y-1.5 ps-7 marker:text-slate-700 ${
          isLtr
            ? "text-left [direction:ltr!important] [text-align:left!important]"
            : "text-right [direction:rtl!important] [text-align:right!important]"
        }`}
      >
        {children}
      </ul>
    );
  },
  ol: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <ol
        {...props}
        className={`my-3 list-decimal space-y-1.5 ps-7 marker:font-bold marker:text-slate-700 ${
          isLtr
            ? "text-left [direction:ltr!important] [text-align:left!important]"
            : "text-right [direction:rtl!important] [text-align:right!important]"
        }`}
      >
        {children}
      </ol>
    );
  },
  li: ({ children }) => {
    const props = directionProps(children);
    const isLtr = props.dir === "ltr";
    return (
      <li {...props} className={`ps-1 leading-8 ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}>
        {children}
      </li>
    );
  },
  blockquote: ({ children }) => {
    const props = directionProps(children);
    return <blockquote {...props} className={`my-4 rounded-xl bg-amber-50 px-4 py-3 font-semibold text-slate-900 ${props.dir === "rtl" ? "border-r-4 border-amber-400" : "border-l-4 border-amber-400"}`}>{children}</blockquote>;
  },
  code: ({ children, className }) => (
    <code dir="ltr" className={`${className || ""} inline-block rounded-md border border-cyan-200 bg-cyan-50 px-1.5 py-0.5 font-mono text-[0.9em] text-slate-950 [unicode-bidi:isolate]`}>
      {children}
    </code>
  ),
  pre: ({ children }) => <pre dir="ltr" className="my-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-start font-mono text-sm leading-7 text-slate-100 [unicode-bidi:isolate]">{children}</pre>,
  table: ({ children }) => (
    <div className="my-5 overflow-x-auto rounded-xl border border-slate-300 bg-white overscroll-x-contain">
      <table className="w-full min-w-[680px] border-collapse text-[13px] leading-7">{children}</table>
    </div>
  ),
  thead: ({ children }) => <thead className="bg-slate-100">{children}</thead>,
  tbody: ({ children }) => <tbody>{children}</tbody>,
  tr: ({ children }) => <tr className="even:bg-slate-50/70">{children}</tr>,
  th: ({ children }) => <th {...directionProps(children)} className="min-w-32 border border-slate-300 px-3 py-2.5 text-start font-black text-slate-950">{inlineChildren(children)}</th>,
  td: ({ children }) => <td {...directionProps(children)} className="min-w-32 border border-slate-300 px-3 py-2.5 align-top text-start text-slate-900">{inlineChildren(children)}</td>,
  hr: () => <hr className="my-6 border-dashed border-slate-300" />,
  a: ({ children, href }) => {
    const safeHref = safeUrl(href);
    return safeHref ? <a href={safeHref} target="_blank" rel="noopener noreferrer" className="font-semibold text-blue-700 underline underline-offset-2">{children}</a> : <span>{children}</span>;
  },
  img: ({ src, alt, title }) => {
    const safeSrc = safeUrl(src, { image: true });
    return safeSrc ? <SecureSummaryImage src={safeSrc} alt={alt || ""} title={title} className="mx-auto my-5 max-h-[520px] max-w-full rounded-xl border border-slate-200 object-contain" /> : null;
  },
};

export function MarkdownDocumentRenderer({ content, className = "", fontSize = 15 }) {
  return (
    <div className={`summary-document-content text-slate-950 ${className}`} dir="auto" style={{ fontSize: `${fontSize}px` }}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents} skipHtml>
        {normalizeSummaryMarkup(String(content || ""))}
      </ReactMarkdown>
    </div>
  );
}

function renderRuns(runs) {
  return (Array.isArray(runs) ? runs : []).map((run, index) => {
    if (typeof run === "string") return <BidiText key={`${index}-${run}`}>{run}</BidiText>;
    if (!run || typeof run !== "object") return null;
    let content = <BidiText>{run.text ?? run.content ?? run.value ?? ""}</BidiText>;
    if (run.code) content = <code dir="ltr" className="rounded bg-cyan-50 px-1.5 py-0.5 font-mono [unicode-bidi:isolate]">{content}</code>;
    if (run.bold || run.strong) content = <strong className="font-black">{content}</strong>;
    if (run.italic || run.emphasis) content = <em>{content}</em>;
    if (run.highlight) {
      const color = typeof run.highlight === "string" ? run.highlight : (run.color || "yellow");
      content = <mark className={`rounded px-1.5 py-0.5 font-extrabold ${HIGHLIGHT_CLASSES[color] || HIGHLIGHT_CLASSES.yellow}`}>{content}</mark>;
    }
    const href = safeUrl(run.href || run.url);
    if (href) content = <a href={href} target="_blank" rel="noopener noreferrer" className="text-blue-700 underline">{content}</a>;
    return <React.Fragment key={run.id || index}>{content}</React.Fragment>;
  });
}

function BlockInline({ block }) {
  if (Array.isArray(block?.runs)) return renderRuns(block.runs);
  if (block?.content && typeof block.content === "object" && typeof block.content.text === "string") return <RichTextContent value={block.content} />;
  return inlineText(summaryBlockText(block));
}

function DocumentBlock({ block, index = 0, depth = 0 }) {
  if (typeof block === "string") return <MarkdownDocumentRenderer content={block} />;
  if (!block || typeof block !== "object") return null;
  const type = normalizeSummaryBlockType(block);
  const text = summaryBlockText(block);
  const declaredDirection = block.dir || block.direction;
  const dir = declaredDirection === "ltr" || declaredDirection === "rtl" ? declaredDirection : detectTextDirection(text, "rtl");
  const direction = { dir, lang: dir === "rtl" ? "ar" : "en", style: { unicodeBidi: "plaintext" } };
  const key = block.id || `${type}-${depth}-${index}`;

  if (type === "heading") {
    const match = /^h([1-6])$/i.exec(String(block.type || ""));
    const level = Math.max(1, Math.min(6, Number(block.level || match?.[1] || depth + 2)));
    const Heading = `h${level}`;
    const size = level <= 1 ? "text-2xl" : level === 2 ? "text-xl" : "text-base";
    return <Heading key={key} {...direction} className={`${level <= 2 ? "mt-7" : "mt-5"} mb-3 ${size} text-start font-black leading-relaxed`}><span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white [box-decoration-break:clone]"><BlockInline block={block} /></span></Heading>;
  }
  if (type === "markdown") return <MarkdownDocumentRenderer key={key} content={text} />;
  if (["paragraph", "text"].includes(type)) {
    const isLtr = dir === "ltr";
    return <p key={key} {...direction} className={`my-2.5 whitespace-pre-wrap leading-8 ${isLtr ? "text-left [direction:ltr!important] [text-align:left!important]" : "text-right [direction:rtl!important] [text-align:right!important]"}`}><BlockInline block={block} /></p>;
  }
  if (type === "list") {
    const items = Array.isArray(block.items) ? block.items : (Array.isArray(block.children) ? block.children : []);
    const List = block.ordered || /ordered/.test(String(block.type || "")) ? "ol" : "ul";
    const sampleText = items.map((it) => summaryBlockText(it)).join(" ");
    const listDir = detectTextDirection(sampleText, dir);
    const isLtr = listDir === "ltr";
    return (
      <List
        key={key}
        dir={listDir}
        lang={listDir === "rtl" ? "ar" : "en"}
        className={`my-3 space-y-1.5 ps-7 ${List === "ol" ? "list-decimal" : "list-disc"} ${
          isLtr
            ? "text-left [direction:ltr!important] [text-align:left!important]"
            : "text-right [direction:rtl!important] [text-align:right!important]"
        }`}
      >
        {items.map((item, itemIndex) => {
          const itemText = summaryBlockText(item);
          const itemDirection = typeof item === "object" ? item?.dir || item?.direction : "";
          const itemDir = ["rtl", "ltr"].includes(itemDirection) ? itemDirection : detectTextDirection(itemText, listDir);
          const itemIsLtr = itemDir === "ltr";
          return (
            <li
              key={item?.id || itemIndex}
              dir={itemDir}
              lang={itemDir === "rtl" ? "ar" : "en"}
              className={`ps-1 leading-8 [unicode-bidi:plaintext] ${
                itemIsLtr
                  ? "text-left [direction:ltr!important] [text-align:left!important]"
                  : "text-right [direction:rtl!important] [text-align:right!important]"
              }`}
            >
              {typeof item === "object" && Array.isArray(item.runs)
                ? renderRuns(item.runs)
                : typeof item === "object" && typeof item.text === "string"
                ? <RichTextContent value={item} />
                : inlineText(itemText)}
            </li>
          );
        })}
      </List>
    );
  }
  if (type === "table") {
    const table = block.table && typeof block.table === "object" ? block.table : block;
    const headers = Array.isArray(table.headers) ? table.headers : (Array.isArray(table.columns) ? table.columns : []);
    const rows = Array.isArray(table.rows) ? table.rows : [];
    return (
      <div key={key} className="my-5 overflow-x-auto rounded-xl border border-slate-300 bg-white overscroll-x-contain">
        <table className="w-full min-w-[680px] border-collapse text-[13px] leading-7">
          {headers.length > 0 && <thead className="bg-slate-100"><tr>{headers.map((cell, cellIndex) => { const cellText = summaryBlockText(cell); const cellDir = detectTextDirection(cellText, dir); return <th key={cell?.id || cellIndex} dir={cellDir} className="min-w-32 border border-slate-300 px-3 py-2.5 text-start font-black [unicode-bidi:plaintext]">{typeof cell === "object" && typeof cell.text === "string" ? <RichTextContent value={cell} /> : inlineText(cellText)}</th>; })}</tr></thead>}
          <tbody>{rows.map((row, rowIndex) => <tr key={row?.id || rowIndex} className="even:bg-slate-50/70">{(Array.isArray(row) ? row : row?.cells || []).map((cell, cellIndex) => { const cellText = summaryBlockText(cell); const cellDir = detectTextDirection(cellText, dir); return <td key={cell?.id || cellIndex} dir={cellDir} className="min-w-32 border border-slate-300 px-3 py-2.5 align-top text-start [unicode-bidi:plaintext]">{typeof cell === "object" && typeof cell.text === "string" ? <RichTextContent value={cell} /> : inlineText(cellText)}</td>; })}</tr>)}</tbody>
        </table>
      </div>
    );
  }
  if (["callout", "quote"].includes(type)) {
    const tone = String(block.tone || block.variant || block.type || "note").toLowerCase();
    const color = /warning|danger|error/.test(tone) ? "border-red-400 bg-red-50" : /tip|success/.test(tone) ? "border-emerald-400 bg-emerald-50" : "border-violet-400 bg-violet-50";
    return <blockquote key={key} {...direction} className={`my-4 rounded-xl border-s-4 px-4 py-3 text-start font-semibold text-slate-900 ${color}`}><BlockInline block={block} /></blockquote>;
  }
  if (type === "code") return <pre key={key} dir="ltr" className="my-4 overflow-x-auto rounded-xl bg-slate-950 p-4 text-start font-mono text-sm leading-7 text-slate-100 [unicode-bidi:isolate]"><code>{text}</code></pre>;
  if (type === "image") {
    const source = safeUrl(block.src || block.url || block.asset_url, { image: true });
    const caption = block.content?.text || block.caption?.text || block.caption || "";
    const sourcePage = safeUrl(block.attribution?.sourcePage);
    return source ? (
      <figure key={key} className="my-6 text-center">
        <SecureSummaryImage src={source} alt={block.alt || caption || "Educational image"} className="mx-auto max-h-[520px] max-w-full rounded-xl border border-slate-200 object-contain" />
        {caption && <figcaption dir={detectTextDirection(caption, dir)} className="mt-2 text-sm text-slate-600 [unicode-bidi:plaintext]"><BidiText>{caption}</BidiText></figcaption>}
        {block.attribution && <p dir="ltr" className="mt-1 text-[10px] text-slate-400 [unicode-bidi:isolate]">{block.attribution.creator || "Unknown"} · {String(block.attribution.license || "").toUpperCase()} {sourcePage && <>· <a href={sourcePage} target="_blank" rel="noopener noreferrer" className="underline">Source</a></>}</p>}
      </figure>
    ) : null;
  }
  if (type === "divider") return <hr key={key} className="my-6 border-dashed border-slate-300" />;
  // concept_map had NO branch: the visual_concepts_formulas template emits it
  // (see visualBlocks in summaryV3/facts.js) and it silently degraded into a plain
  // paragraph with embedded newlines — the "this template looks broken" report.
  if (type === "concept_map") {
    const routes = String(text || "")
      .split(/\n+/)
      .map((line) => line.trim())
      .filter(Boolean);
    if (!routes.length) return null;
    return (
      <div key={key} className="my-5 grid gap-2 sm:grid-cols-2">
        {routes.map((route, routeIndex) => {
          const [head, ...tail] = route.split(/\s*(?:→|->|:)\s*/);
          const body = tail.join(" → ");
          const routeDir = detectTextDirection(route, dir);
          return (
            <div
              key={`${key}-${routeIndex}`}
              dir={routeDir}
              className="rounded-xl border border-slate-300 bg-slate-50 px-3.5 py-3 text-start [unicode-bidi:plaintext]"
            >
              <p className="text-[13px] font-black text-slate-900">{inlineText(head)}</p>
              {body && <p className="mt-1 text-[12.5px] leading-7 text-slate-700">{inlineText(body)}</p>}
            </div>
          );
        })}
      </div>
    );
  }
  if (type === "section") {
    const children = Array.isArray(block.blocks) ? block.blocks : (Array.isArray(block.children) ? block.children : []);
    return <section key={key} className="my-5">{text && <h2 {...direction} className="mb-3 mt-7 text-xl text-start font-black leading-relaxed"><span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white"><BlockInline block={block} /></span></h2>}{children.map((child, childIndex) => <DocumentBlock key={child?.id || childIndex} block={child} index={childIndex} depth={depth + 1} />)}</section>;
  }
  return text ? <p key={key} {...direction} className="my-2.5 whitespace-pre-wrap text-start leading-8"><BlockInline block={block} /></p> : null;
}

function SourceReferences({ references }) {
  const values = [...new Set((Array.isArray(references) ? references : []).map(Number).filter((value) => Number.isInteger(value) && value > 0))];
  if (!values.length) return null;
  return <div className="mt-1 flex flex-wrap gap-1.5" aria-label="References">{values.map((page) => <span key={page} dir="auto" className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-bold text-slate-500">p. {page}</span>)}</div>;
}

function V3BlockList({ blocks, sectionId }) {
  let arabicLabelShown = false;
  return (blocks || []).map((block, index) => {
    const showArabicLabel = block?.role === "arabic_explanation" && !arabicLabelShown;
    if (showArabicLabel) arabicLabelShown = true;
    const roleClass = block?.role === "english_points"
      ? "border-s-2 border-cyan-300/70 ps-3"
      : block?.role === "arabic_explanation"
      ? "border-s-2 border-violet-300/70 ps-3"
      : "";
    const blockDir = block?.role === "english_points" ? "ltr" : block?.role === "arabic_explanation" ? "rtl" : undefined;
    return (
      <div key={block?.id || `${sectionId}-${index}`} dir={blockDir} className={`my-2 ${roleClass}`}>
        {showArabicLabel && <div dir="auto" className="mb-1 inline-flex rounded-md bg-violet-100 px-2 py-1 text-xs font-black text-violet-900">Arabic Explanation • الشرح بالعربي</div>}
        <DocumentBlock block={block} index={index} />
        <SourceReferences references={block?.sourceRefs} />
      </div>
    );
  });
}

function V3DocumentRenderer({ document, fontSize, className }) {
  return (
    <div dir="auto" className={`summary-document-content text-slate-950 ${className || ""}`} style={{ fontSize: `${fontSize}px` }}>
      {!!document.overview?.length && (
        <section className="mb-7">
          <h2 dir="ltr" className="mb-3 mt-1 text-xl text-start font-black leading-relaxed"><span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white">Quick Overview</span></h2>
          <V3BlockList blocks={document.overview} sectionId="overview" />
        </section>
      )}
      {(document.sections || []).map((section, sectionIndex) => {
        const title = section?.title?.text || String(section?.title || `Section ${sectionIndex + 1}`);
        const dir = section?.title?.direction === "ltr" || section?.title?.direction === "rtl" ? section.title.direction : detectTextDirection(title, "rtl");
        return (
          <section key={section?.id || sectionIndex} className="my-7 [content-visibility:auto] [contain-intrinsic-size:1px_320px]">
            <h2 dir={dir} lang={dir === "rtl" ? "ar" : "en"} className="mb-3 text-xl text-start font-black leading-relaxed [unicode-bidi:plaintext]"><span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white [box-decoration-break:clone]"><RichTextContent value={section.title} /></span></h2>
            <V3BlockList blocks={section.blocks} sectionId={section?.id || sectionIndex} />
            <SourceReferences references={section?.sourceRefs} />
          </section>
        );
      })}
      {!!document.conclusion?.length && (
        <section className="mt-8">
          <h2 dir="ltr" className="mb-3 text-xl text-start font-black leading-relaxed"><span className="inline rounded-md bg-slate-950 px-2.5 py-1 text-white">Summary Conclusion</span></h2>
          <V3BlockList blocks={document.conclusion} sectionId="conclusion" />
        </section>
      )}
    </div>
  );
}

function sanitizeLegacyHtml(raw) {
  if (!raw) return "";
  if (typeof DOMParser === "undefined") return String(raw).replace(/<[^>]*>/g, " ");
  const document = new DOMParser().parseFromString(String(raw), "text/html");
  document.querySelectorAll("script,iframe,object,embed,style,link,meta,base,form,input,button,textarea,select,video,audio,source").forEach((node) => node.remove());
  [...document.body.querySelectorAll("*")].forEach((node) => {
    if (!SAFE_TAGS.has(node.tagName)) {
      node.replaceWith(...node.childNodes);
      return;
    }
    [...node.attributes].forEach((attribute) => {
      const name = attribute.name.toLowerCase();
      const allowed = (node.tagName === "A" && ["href", "title"].includes(name))
        || (node.tagName === "IMG" && ["src", "alt", "title", "width", "height"].includes(name))
        || (["TH", "TD"].includes(node.tagName) && ["colspan", "rowspan"].includes(name))
        || (name === "class" && /^(?:hl-(?:green|yellow|cyan|orange|red)|section-title|small|arabic-note|note-title)(?:\s|$)/.test(attribute.value));
      if (!allowed) node.removeAttribute(attribute.name);
    });
    if (node.tagName === "A") {
      const href = safeUrl(node.getAttribute("href"));
      if (href) { node.setAttribute("href", href); node.setAttribute("target", "_blank"); node.setAttribute("rel", "noopener noreferrer"); }
      else node.removeAttribute("href");
    }
    if (node.tagName === "IMG") {
      const source = safeUrl(node.getAttribute("src"), { image: true });
      if (!source) node.remove();
      else { node.setAttribute("src", source); node.setAttribute("loading", "lazy"); node.setAttribute("referrerpolicy", "no-referrer"); }
    }
    if (BLOCK_TAGS.has(node.tagName)) {
      const dir = detectTextDirection(node.textContent, "rtl");
      node.setAttribute("dir", dir);
      node.setAttribute("lang", dir === "rtl" ? "ar" : "en");
    }
  });
  const walker = document.createTreeWalker(document.body, 4);
  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);
  textNodes.forEach((node) => {
    if (!node.nodeValue?.trim() || node.parentElement?.tagName === "BDI") return;
    const bdi = document.createElement("bdi");
    bdi.setAttribute("dir", detectTextDirection(node.nodeValue, "rtl"));
    bdi.textContent = node.nodeValue;
    node.replaceWith(bdi);
  });
  return document.body.innerHTML;
}

function LegacyHtmlRenderer({ html, fontSize }) {
  const safeHtml = useMemo(() => sanitizeLegacyHtml(html), [html]);
  return <div dir="auto" className="summary-document-content legacy-summary-html text-slate-950 [&_h1]:mt-2 [&_h1]:text-2xl [&_h1]:font-black [&_h2]:mb-3 [&_h2]:mt-7 [&_h2]:text-xl [&_h2]:font-black [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:font-extrabold [&_p]:my-2.5 [&_p]:leading-8 [&_ul]:my-3 [&_ul]:list-disc [&_ul]:ps-7 [&_ol]:my-3 [&_ol]:list-decimal [&_ol]:ps-7 [&_li]:my-1 [&_blockquote]:my-4 [&_blockquote]:rounded-xl [&_blockquote]:border-s-4 [&_blockquote]:border-violet-400 [&_blockquote]:bg-violet-50 [&_blockquote]:p-4 [&_table]:my-5 [&_table]:w-full [&_table]:border-collapse [&_th]:border [&_th]:border-slate-300 [&_th]:bg-slate-100 [&_th]:p-2.5 [&_td]:border [&_td]:border-slate-300 [&_td]:p-2.5 [&_img]:mx-auto [&_img]:my-5 [&_img]:max-w-full [&_img]:rounded-xl" style={{ fontSize: `${fontSize}px` }} dangerouslySetInnerHTML={{ __html: safeHtml }} />;
}

export default function SummaryDocumentRenderer({ document, fallbackMarkdown = "", legacyHtml = "", fontSize = 15, className = "" }) {
  if (document && Number(document.schemaVersion) === 3 && Array.isArray(document.sections)) {
    return <V3DocumentRenderer document={document} fontSize={fontSize} className={className} />;
  }
  if (document && Array.isArray(document.blocks)) {
    return <div dir="auto" className={`summary-document-content text-slate-950 ${className}`} style={{ fontSize: `${fontSize}px` }}>{document.blocks.map((block, index) => <DocumentBlock key={block?.id || index} block={block} index={index} />)}</div>;
  }
  if (fallbackMarkdown) return <MarkdownDocumentRenderer content={fallbackMarkdown} fontSize={fontSize} className={className} />;
  if (legacyHtml) return <LegacyHtmlRenderer html={legacyHtml} fontSize={fontSize} />;
  return null;
}
