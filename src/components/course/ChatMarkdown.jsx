import React from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const HL = {
  green: "bg-[#58f59b] text-black",
  yellow: "bg-[#fff05a] text-black",
  cyan: "bg-[#54f4ea] text-black",
  orange: "bg-[#ffc078] text-black",
  red: "bg-[#ff4d4d] text-black",
};

function renderInline(text) {
  if (typeof text !== "string") return text;
  const parts = text.split(/(==(?:green|yellow|cyan|orange|red):[^=]+==|==[^=]+==)/g);
  return parts.map((p, i) => {
    const semantic = p.match(/^==(green|yellow|cyan|orange|red):([\s\S]+)==$/);
    const plain = !semantic && p.startsWith("==") && p.endsWith("==");
    if (semantic || plain) {
      const color = semantic?.[1] || "yellow";
      const label = semantic?.[2] || p.slice(2, -2);
      return (
        <mark key={i} className={`px-1 py-0.5 rounded font-bold ${HL[color]}`}>
          {label}
        </mark>
      );
    }
    return <React.Fragment key={i}>{p}</React.Fragment>;
  });
}

function deepInline(children) {
  return React.Children.map(children, (c) =>
    typeof c === "string" ? renderInline(c) : c
  );
}

export default function ChatMarkdown({ content }) {
  return (
    <div dir="auto" className="chat-md text-sm leading-relaxed break-words">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({ children }) => <h1 className="text-base font-extrabold mt-3 mb-1.5 text-primary">{deepInline(children)}</h1>,
          h2: ({ children }) => <h2 className="text-sm font-extrabold mt-3 mb-1.5 text-primary">{deepInline(children)}</h2>,
          h3: ({ children }) => <h3 className="text-sm font-bold mt-2 mb-1">{deepInline(children)}</h3>,
          p: ({ children }) => <p className="my-1.5">{deepInline(children)}</p>,
          strong: ({ children }) => <strong className="font-bold text-primary">{deepInline(children)}</strong>,
          em: ({ children }) => <em className="italic">{deepInline(children)}</em>,
          ul: ({ children }) => <ul className="my-1.5 space-y-1 ps-1">{children}</ul>,
          ol: ({ children }) => <ol className="my-1.5 space-y-1 ps-5 list-decimal marker:text-primary marker:font-bold">{children}</ol>,
          li: ({ children }) => (
            <li className="flex gap-2 items-start">
              <span className="mt-1.5 w-1 h-1 rounded-full bg-primary shrink-0" />
              <span className="flex-1">{deepInline(children)}</span>
            </li>
          ),
          blockquote: ({ children }) => (
            <blockquote className="my-2 rounded-lg border-s-2 border-primary/60 bg-primary/5 px-3 py-2 font-medium">
              {children}
            </blockquote>
          ),
          code: ({ inline, children }) =>
            inline ? (
              <code className="px-1 py-0.5 rounded bg-background/60 text-primary text-[0.85em] font-mono">{children}</code>
            ) : (
              <code className="block my-2 p-3 rounded-xl bg-background/70 border border-border/50 text-[0.85em] font-mono overflow-x-auto whitespace-pre">{children}</code>
            ),
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-lg border border-border/50">
              <table className="w-full text-xs border-collapse">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-secondary/60">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-2 text-start font-bold border border-border/50">{deepInline(children)}</th>,
          td: ({ children }) => <td className="px-3 py-2 align-top border border-border/50">{deepInline(children)}</td>,
          tr: ({ children }) => <tr className="hover:bg-secondary/30 transition-colors">{children}</tr>,
          hr: () => <hr className="my-3 border-border/50" />,
          a: ({ children, ...p }) => (
            <a {...p} target="_blank" rel="noreferrer" className="text-primary underline underline-offset-2">{children}</a>
          ),
        }}
      >
        {content || ""}
      </ReactMarkdown>
    </div>
  );
}