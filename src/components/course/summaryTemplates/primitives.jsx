import React from "react";
import { detectTextDirection, normalizeSummaryBlockType, summaryBlockText } from "@/lib/summaryDocument";
import { cn } from "@/lib/utils";
import { AlertTriangle, Calculator, Info, Lightbulb, Quote } from "lucide-react";

/**
 * primitives.jsx — the shared, design-system-grade renderer for summary templates.
 *
 * WHY THIS EXISTS: every summary used to flow through one generic markdown-ish
 * renderer, so all four templates produced the same wall of grey paragraphs. The
 * v3 document model already carries everything needed for a real layout —
 * `sections[].blocks[]` with a semantic `role`, rich text with annotation spans
 * (highlight/bold/code), tables, equations and callouts. This module turns that
 * model into UI; templates below differ in layout, not in data.
 *
 * Rules kept: semantic Tailwind tokens (no inline colours), RTL-safe logical
 * properties, transform/opacity-only motion, and no `dangerouslySetInnerHTML`.
 */

const HIGHLIGHT_TONE = {
  green: "bg-[#58f59b]/85 text-black",
  yellow: "bg-[#fff05a]/85 text-black",
  cyan: "bg-[#54f4ea]/85 text-black",
  orange: "bg-[#ffc078]/85 text-black",
  red: "bg-[#ff6b6b]/85 text-black",
};

const ARABIC = "\\u0600-\\u06ff\\u0750-\\u077f\\u08a0-\\u08ff\\ufb50-\\ufdff\\ufe70-\\ufeff";
const BIDI_RUN = new RegExp(`([${ARABIC}]+(?:[\\s\\u200f]+[${ARABIC}]+)*|[A-Za-z]+(?:[A-Za-z0-9'’._/+:%-]*[A-Za-z0-9])?|\\d+(?:[.,:/%-]\\d+)*)`, "g");

/** Wraps mixed Arabic/Latin runs so neither direction mangles the other. */
export function Bidi({ children }) {
  const text = String(children ?? "");
  if (!text) return null;
  const parts = text.split(BIDI_RUN).filter((part) => part !== "");
  if (parts.length <= 1) return <>{text}</>;
  return (
    <>
      {parts.map((part, index) => {
        const direction = detectTextDirection(part, "");
        return direction
          ? <bdi key={`${index}-${part}`} dir={direction}>{part}</bdi>
          : <React.Fragment key={`${index}-${part}`}>{part}</React.Fragment>;
      })}
    </>
  );
}

/** Renders a RichText value, applying its annotation spans (highlight/bold/code). */
export function Rich({ value, className = "" }) {
  if (typeof value === "string" || typeof value === "number") {
    return <span className={className}><Bidi>{String(value)}</Bidi></span>;
  }
  const text = String(value?.text || "");
  const annotations = (Array.isArray(value?.annotations) ? value.annotations : [])
    .filter((a) => Number(a?.end) > Number(a?.start));
  if (!annotations.length) return <span className={className}><Bidi>{text}</Bidi></span>;

  const bounds = [...new Set([0, text.length, ...annotations.flatMap((a) => [Number(a.start), Number(a.end)])])]
    .filter((n) => Number.isInteger(n) && n >= 0 && n <= text.length)
    .sort((a, b) => a - b);

  return (
    <span className={className}>
      {bounds.slice(0, -1).map((start, index) => {
        const end = bounds[index + 1];
        const chunk = text.slice(start, end);
        if (!chunk) return null;
        const active = annotations.filter((a) => Number(a.start) <= start && Number(a.end) >= end);
        let node = <Bidi>{chunk}</Bidi>;
        if (active.some((a) => a.code)) {
          node = <code dir="ltr" className="rounded-md bg-black/40 px-1.5 py-0.5 font-mono text-[0.92em] [unicode-bidi:isolate]">{node}</code>;
        } else {
          const mark = active.find((a) => a.highlight);
          if (mark) node = <mark className={cn("rounded px-1 py-0.5 font-bold", HIGHLIGHT_TONE[mark.color] || HIGHLIGHT_TONE.yellow)}>{node}</mark>;
          if (active.some((a) => a.bold)) node = <strong className="font-black">{node}</strong>;
          if (active.some((a) => a.italic)) node = <em className="italic">{node}</em>;
        }
        return <React.Fragment key={`${start}-${end}`}>{node}</React.Fragment>;
      })}
    </span>
  );
}

/** A block's plain text, honouring its declared direction. */
export function blockText(block) {
  return summaryBlockText(block) || "";
}

export function blockDir(block, fallback = "rtl") {
  const declared = block?.direction;
  if (declared === "ltr" || declared === "rtl") return declared;
  return detectTextDirection(blockText(block), fallback);
}

const CALLOUT_STYLE = {
  warning: { wrap: "border-amber-400/40 bg-amber-400/[0.07]", icon: AlertTriangle, tone: "text-amber-300" },
  danger: { wrap: "border-red-400/40 bg-red-400/[0.07]", icon: AlertTriangle, tone: "text-red-300" },
  tip: { wrap: "border-primary/40 bg-primary/[0.07]", icon: Lightbulb, tone: "text-primary" },
  info: { wrap: "border-sky-400/40 bg-sky-400/[0.07]", icon: Info, tone: "text-sky-300" },
  quote: { wrap: "border-border bg-white/[0.03]", icon: Quote, tone: "text-muted-foreground" },
};

export function Callout({ tone = "info", children, className = "" }) {
  const style = CALLOUT_STYLE[tone] || CALLOUT_STYLE.info;
  const Icon = style.icon;
  return (
    <div className={cn("flex gap-3 rounded-2xl border px-4 py-3.5", style.wrap, className)}>
      <Icon className={cn("mt-0.5 h-4 w-4 shrink-0", style.tone)} />
      <div className="min-w-0 flex-1 text-[13.5px] leading-7">{children}</div>
    </div>
  );
}

/** Renders one summary block. `variant` lets a template restyle list/paragraph. */
export function Block({ block, variant = "default", compact = false }) {
  const type = normalizeSummaryBlockType(block);
  const dir = blockDir(block);
  const role = String(block?.role || "body");
  const text = blockText(block);

  if (type === "heading") {
    return (
      <h3 dir={dir} className={cn("font-black leading-snug text-foreground", compact ? "mt-4 text-base" : "mt-6 text-lg")}>
        <Rich value={block.content ?? text} />
      </h3>
    );
  }

  if (type === "bullet_list" || type === "ordered_list") {
    const items = Array.isArray(block.items) ? block.items : [];
    const ordered = type === "ordered_list";
    return (
      <ul dir={dir} className={cn("space-y-1.5", ordered && "list-decimal ps-5", !ordered && "list-none ps-0")}>
        {items.map((item, index) => (
          <li key={item?.id || index} className="flex gap-2.5 text-[13.5px] leading-7">
            {!ordered && <span aria-hidden="true" className="mt-2.5 h-1.5 w-1.5 shrink-0 rounded-full bg-primary/70" />}
            <span className="min-w-0 flex-1"><Rich value={item} /></span>
          </li>
        ))}
      </ul>
    );
  }

  if (type === "table") {
    const table = block.table && typeof block.table === "object" ? block.table : block;
    const headers = Array.isArray(table.headers) ? table.headers : [];
    const rows = Array.isArray(table.rows) ? table.rows : [];
    return (
      <div className="my-4 overflow-x-auto rounded-2xl border border-border">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          {headers.length > 0 && (
            <thead>
              <tr className="bg-white/[0.04]">
                {headers.map((cell, cellIndex) => (
                  <th key={cell?.id || cellIndex} className="border-b border-border px-3.5 py-2.5 text-start font-black text-foreground">
                    <Rich value={cell} />
                  </th>
                ))}
              </tr>
            </thead>
          )}
          <tbody>
            {rows.map((row, rowIndex) => (
              <tr key={rowIndex} className="even:bg-white/[0.02]">
                {(Array.isArray(row) ? row : row?.cells || []).map((cell, cellIndex) => (
                  <td key={cell?.id || cellIndex} className="border-b border-border/60 px-3.5 py-2.5 align-top text-muted-foreground">
                    <Rich value={cell} />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }

  if (type === "equation" || type === "code") {
    return (
      <div dir="ltr" className="my-4 flex items-start gap-2.5 overflow-x-auto rounded-2xl border border-primary/25 bg-black/50 px-4 py-3">
        {type === "equation" && <Calculator className="mt-1 h-4 w-4 shrink-0 text-primary" />}
        <pre className="min-w-0 flex-1 font-mono text-[13px] leading-7 text-primary [unicode-bidi:isolate]"><code>{text}</code></pre>
      </div>
    );
  }

  if (type === "quote" || type === "callout") {
    const tone = role === "warning" ? "warning" : role === "formula" ? "info" : /warning|تنبيه|تحذير/i.test(text) ? "warning" : "quote";
    return (
      <Callout tone={tone} className="my-4">
        <Rich value={block.content ?? text} />
      </Callout>
    );
  }

  if (type === "divider") return <hr className="my-6 border-dashed border-border" />;

  // Paragraph roles drive the chrome — this is what makes a template readable.
  if (role === "arabic_explanation") {
    return (
      <p dir="rtl" className={cn("text-[14px] leading-8 text-foreground/90", variant === "atlas" && "border-s-2 border-primary/30 ps-3")}>
        <Rich value={block.content ?? text} />
      </p>
    );
  }
  if (role === "warning") {
    return (
      <Callout tone="warning" className="my-3">
        <Rich value={block.content ?? text} />
      </Callout>
    );
  }
  if (role === "example") {
    return (
      <Callout tone="tip" className="my-3">
        <Rich value={block.content ?? text} />
      </Callout>
    );
  }

  return (
    <p dir={dir} className="whitespace-pre-wrap text-[13.5px] leading-7 text-muted-foreground">
      <Rich value={block.content ?? text} />
    </p>
  );
}

export function BlockList({ blocks, variant = "default", compact = false, className = "" }) {
  const list = Array.isArray(blocks) ? blocks : [];
  return (
    <div className={cn("space-y-3", className)}>
      {list.map((block, index) => (
        <Block key={block?.id || index} block={block} variant={variant} compact={compact} />
      ))}
    </div>
  );
}

/** Arabic-Indic-free section numbering that reads well in RTL. */
export function SectionNumber({ index, className = "" }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-primary/30 bg-primary/10 font-mono text-[13px] font-black text-primary",
        className,
      )}
    >
      {String(index + 1).padStart(2, "0")}
    </span>
  );
}
