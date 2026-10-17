import React from "react";
import { BlockList } from "./primitives";

/**
 * Data-driven summary layout engine.
 *
 * A template is a plain config object (see ./registry.js). The engine draws any
 * config over the same v3 document model, reusing the shared Block/BlockList
 * primitives, so every template gets identical, correct rendering of content and
 * only the LAYOUT changes between templates.
 *
 * Config shape:
 *   id, label, density ("comfortable" | "compact"), accent (tailwind text class),
 *   header: { kicker, showMeta },
 *   section: { numbering: "index" | "none", layout: "stack" | "two-col" | "panels" },
 *   roleSlots: [{ roles: ["definition"], title, tone }]  // ordered, rendered per section
 *   catchAll: boolean   // render blocks not claimed by any slot after the slots
 */

const TONE = {
  sky: { wrap: "border-sky-400/25 bg-sky-400/[0.05]", label: "text-sky-300" },
  violet: { wrap: "border-violet-400/25 bg-violet-400/[0.04]", label: "text-violet-300" },
  amber: { wrap: "border-amber-400/25 bg-amber-400/[0.05]", label: "text-amber-300" },
  emerald: { wrap: "border-emerald-400/25 bg-emerald-400/[0.05]", label: "text-emerald-300" },
  rose: { wrap: "border-rose-400/25 bg-rose-400/[0.05]", label: "text-rose-300" },
  neutral: { wrap: "border-border bg-white/[0.02]", label: "text-muted-foreground" },
};

function claimedBySlots(blocks, slots) {
  const claimed = new Set();
  for (const slot of slots) {
    for (const block of blocks) {
      if (slot.roles.includes(block?.role) || (slot.types || []).includes(block?.type)) claimed.add(block);
    }
  }
  return claimed;
}

function Cover({ doc, config }) {
  const sourcePages = Array.isArray(doc?.metadata?.sourceRefs) ? doc.metadata.sourceRefs : [];
  return (
    <header className="rounded-none border border-border bg-[#0E1117] p-6 sm:p-7">
      <p className={`text-[11px] font-black uppercase tracking-[0.2em] ${config.accent || "text-muted-foreground"}`}>
        {config.header?.kicker || config.label}
      </p>
      <h1 className="mt-2 text-2xl font-black leading-snug text-foreground sm:text-3xl">{doc?.title}</h1>
      {config.header?.showMeta !== false && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1.5 text-[11px] text-muted-foreground">
          <span>{(doc?.sections || []).length} قسم</span>
          {sourcePages.length > 0 && (
            <span className="font-mono">المصادر: {sourcePages.slice(0, 10).join(" · ")}</span>
          )}
        </div>
      )}
    </header>
  );
}

function Slot({ slot, blocks, density }) {
  if (!blocks.length) return null;
  const tone = TONE[slot.tone] || TONE.neutral;
  const compact = density === "compact";
  return (
    <div className={`rounded-none border p-4 ${tone.wrap}`}>
      {slot.title && (
        <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.16em] ${tone.label}`}>{slot.title}</p>
      )}
      <BlockList blocks={blocks} compact={compact} />
    </div>
  );
}

function Section({ section, index, config }) {
  const blocks = Array.isArray(section.blocks) ? section.blocks : [];
  const slots = config.roleSlots || [];
  const claimed = claimedBySlots(blocks, slots);
  const compact = config.density === "compact";
  const numbering = config.section?.numbering !== "none";
  return (
    <section className="rounded-none border border-border bg-[#0E1117] p-5 sm:p-6">
      <div className="mb-4 flex items-start gap-3 border-b border-border pb-4">
        {numbering && (
          <span className={`font-mono text-xs font-black ${config.accent || "text-muted-foreground"}`}>
            {String(index + 1).padStart(2, "0")}
          </span>
        )}
        <h2 className="min-w-0 flex-1 text-base font-black leading-snug text-foreground">{section.title}</h2>
      </div>
      <div className={compact ? "space-y-3" : "space-y-4"}>
        {slots.map((slot) => {
          const slotBlocks = blocks.filter((b) => claimed.has(b) && (slot.roles.includes(b?.role) || (slot.types || []).includes(b?.type)));
          return <Slot key={slot.id || slot.title} slot={slot} blocks={slotBlocks} density={config.density} />;
        })}
        {config.catchAll !== false && (
          <BlockList blocks={blocks.filter((b) => !claimed.has(b))} compact={compact} />
        )}
      </div>
    </section>
  );
}

export function TemplateEngine({ document: doc, config }) {
  const sections = Array.isArray(doc?.sections) ? doc.sections : [];
  return (
    <div className="space-y-5" dir="rtl">
      <Cover doc={doc} config={config} />
      {(doc?.overview || []).length > 0 && (
        <section className="rounded-none border border-border bg-[#0E1117] p-5">
          <h2 className="mb-3 text-sm font-black text-foreground">نظرة سريعة</h2>
          <BlockList blocks={doc.overview} compact={config.density === "compact"} />
        </section>
      )}
      {sections.map((section, index) => (
        <Section key={section.id || index} section={section} index={index} config={config} />
      ))}
      {(doc?.conclusion || []).length > 0 && (
        <section className="rounded-none border border-primary/25 bg-primary/[0.04] p-5 sm:p-6">
          <h2 className="mb-3 text-sm font-black text-primary">الخلاصة</h2>
          <BlockList blocks={doc.conclusion} compact={config.density === "compact"} />
        </section>
      )}
    </div>
  );
}
