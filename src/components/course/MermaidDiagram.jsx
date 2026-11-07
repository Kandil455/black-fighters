import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Loader2, Maximize2, X, GitBranch } from "lucide-react";
import { cn } from "@/lib/utils";

let mermaidPromise = null; // single lazy load, shared by every diagram on the page

function loadMermaid() {
  if (!mermaidPromise) {
    mermaidPromise = import("mermaid").then((mod) => {
      const mermaid = mod.default || mod;
      mermaid.initialize({
        startOnLoad: false,
        securityLevel: "strict", // SVG only — no foreignObject, CSP-safe
        theme: "dark",
        suppressErrorRendering: true,
        themeVariables: {
          background: "#070a12",
          primaryColor: "#0b2b1c",
          primaryBorderColor: "#19f08c",
          primaryTextColor: "#e8f5ee",
          lineColor: "#19f08c",
          secondaryColor: "#141a26",
          tertiaryColor: "#141a26",
          edgeLabelBackground: "#0d1420",
          clusterBkg: "#0d1420",
          titleColor: "#19f08c",
          nodeBorder: "#19f08c",
          fontFamily: "Cairo, sans-serif",
          fontSize: "14px",
        },
        flowchart: { curve: "basis", htmlLabels: false },
        sequence: { useMaxWidth: true },
      });
      return mermaid;
    });
  }
  return mermaidPromise;
}

/** Renders one mermaid diagram as SVG with graceful failure + fullscreen zoom. */
export default function MermaidDiagram({ code, title, className }) {
  const hostRef = useRef(null);
  const [state, setState] = useState("loading"); // loading | ready | failed
  const [svg, setSvg] = useState("");
  const [zoomed, setZoomed] = useState(false);

  useEffect(() => {
    let alive = true;
    setState("loading");
    loadMermaid()
      .then((mermaid) =>
        mermaid.render(`bf-mmd-${Math.random().toString(36).slice(2, 9)}`, code)
      )
      .then(({ svg: out }) => {
        if (!alive) return;
        setSvg(out);
        setState("ready");
      })
      .catch((err) => {
        console.warn("[MermaidDiagram] render failed:", err?.message);
        if (alive) setState("failed");
      });
    return () => {
      alive = false;
    };
  }, [code]);

  if (state === "failed") return null; // degraded gracefully — the text beside it still teaches

  const diagramBody = (
    <div
      ref={hostRef}
      className="overflow-x-auto"
      // eslint-disable-next-line react/no-danger
      dangerouslySetInnerHTML={{ __html: svg }}
      dir="ltr"
    />
  );

  return (
    <div className={cn("rounded-xl border border-[#19f08c]/30 bg-[#070a12] overflow-hidden my-3", className)}>
      <div className="flex items-center justify-between gap-2 px-4 py-2 border-b border-[#19f08c]/15 bg-[#19f08c]/[0.06]">
        <div className="flex items-center gap-2 text-xs font-black text-[#19f08c] min-w-0">
          <GitBranch className="size-4 shrink-0" />
          <span className="rounded-md border border-[#19f08c]/30 bg-[#19f08c]/15 px-2 py-0.5 text-[10px] font-black shrink-0">
            📊 مخطط
          </span>
          <span className="truncate text-[#bfe9d4]">{title || "مخطط توضيحي"}</span>
        </div>
        {state === "ready" && (
          <button
            type="button"
            onClick={() => setZoomed(true)}
            className="inline-flex items-center gap-1 rounded-lg border border-white/[0.08] bg-white/[0.04] px-2 py-1 text-[10px] font-bold text-[#9aa4b2] hover:text-white cursor-pointer transition-colors"
          >
            <Maximize2 className="size-3" /> تكبير
          </button>
        )}
      </div>

      <div className="p-3 sm:p-4">
        {state === "loading" && (
          <div className="flex items-center justify-center gap-2 py-8 text-xs text-[#9aa4b2]">
            <Loader2 className="size-4 animate-spin text-[#19f08c]" /> بيرسم المخطط...
          </div>
        )}
        {state === "ready" && diagramBody}
      </div>

      {zoomed &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            className="fixed inset-0 z-[140] bg-[#05070a]/97 backdrop-blur-md overflow-auto p-4 sm:p-10"
            onClick={() => setZoomed(false)}
            role="presentation"
          >
            <button
              type="button"
              onClick={() => setZoomed(false)}
              className="fixed top-4 end-4 z-10 w-10 h-10 rounded-xl grid place-items-center bg-white/[0.06] border border-white/[0.1] text-white hover:bg-white/[0.12] cursor-pointer"
              aria-label="إغلاق"
            >
              <X className="size-5" />
            </button>
            <div
              className="max-w-5xl mx-auto rounded-2xl border border-[#19f08c]/30 bg-[#070a12] p-4 sm:p-8"
              onClick={(e) => e.stopPropagation()}
              role="presentation"
            >
              {title && (
                <p className="text-sm font-black text-[#19f08c] mb-4 flex items-center gap-2">
                  <GitBranch className="size-4" /> {title}
                </p>
              )}
              {/* eslint-disable-next-line react/no-danger */}
              <div dir="ltr" dangerouslySetInnerHTML={{ __html: svg }} />
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
