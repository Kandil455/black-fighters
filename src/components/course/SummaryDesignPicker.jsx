import React from "react";
import { Crown, Pill, Table2, Network, CheckCircle2 } from "lucide-react";
import { SUMMARY_DESIGNS } from "@/lib/summaryDesigns";

const ICONS = { crown: Crown, capsule: Pill, table: Table2, network: Network };

/**
 * Living miniature of the design — a real tiny "summary" rendered with the
 * design's palette so the owner SEES the result before choosing (his rule:
 * "اعمل كذا شكل و انا اختار"). Pure CSS, no images, LTR-safe.
 */
function DesignThumb({ palette, designId }) {
  const rows = {
    royal: (
      <>
        <div className="h-[3px] w-3/4 rounded-full" style={{ background: `linear-gradient(90deg, ${palette.accent}, ${palette.primary})` }} />
        <div className="mt-1.5 rounded-md border-l-2 px-1.5 py-1 text-[6px] leading-[150%] text-slate-300" style={{ borderColor: palette.primary, background: `${palette.primary}14` }}>
          <span className="font-bold" style={{ color: palette.primary }}>تعريف — Stroke Volume</span>
        </div>
        <div className="mt-1 flex items-center gap-1">
          <span className="size-[3px] rotate-45 rounded-[1px]" style={{ background: palette.accent }} />
          <span className="h-[2px] w-2/3 rounded-full bg-slate-500/40" />
        </div>
        <div className="mt-1 rounded-md px-1.5 py-0.5 text-[6px] font-bold text-red-300" style={{ background: "rgba(220,38,38,.12)", border: "1px solid rgba(220,38,38,.3)" }}>
          ⚠ فخ الامتحان
        </div>
      </>
    ),
    capsule: (
      <>
        <div className="h-[3px] w-2/3 rounded-full" style={{ background: `linear-gradient(90deg, ${palette.primary}, ${palette.accent})` }} />
        {[0, 1, 2].map((i) => (
          <div key={i} className="mt-1 rounded-lg border px-1.5 py-1" style={{ borderColor: `${palette.primary}44`, background: `${palette.primary}0d` }}>
            <div className="h-[2px] w-4/5 rounded-full bg-slate-400/50" />
          </div>
        ))}
      </>
    ),
    tabular: (
      <div className="mt-1 overflow-hidden rounded-md border border-slate-500/30">
        <div className="grid grid-cols-3" style={{ background: palette.primary }}>
          {[0, 1, 2].map((i) => <div key={i} className="px-1 py-0.5 text-[5.5px] font-bold text-white">Col {i + 1}</div>)}
        </div>
        {[0, 1, 2].map((r) => (
          <div key={r} className={`grid grid-cols-3 border-t border-slate-500/20 ${r % 2 ? "bg-white/[0.02]" : ""}`}>
            {[0, 1, 2].map((c) => <div key={c} className="px-1 py-0.5"><div className="h-[2px] w-4/5 rounded-full bg-slate-400/40" /></div>)}
          </div>
        ))}
      </div>
    ),
    concepts: (
      <>
        <div className="mt-1 grid grid-cols-2 gap-1">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="rounded-md border px-1 py-1 text-[5.5px] font-bold text-purple-200" style={{ borderColor: `${palette.primary}55`, background: `${palette.primary}14` }}>
              {i === 0 ? "E = mc²" : i === 1 ? "تعريف MDS" : i === 2 ? "قانون الدمج" : "سبب → نتيجة"}
            </div>
          ))}
        </div>
        <div className="mt-1.5 flex items-center gap-1">
          <span className="size-1.5 rounded-full" style={{ background: palette.accent }} />
          <span className="h-[2px] w-1/2 rounded-full bg-slate-500/40" />
        </div>
      </>
    ),
  };
  return (
    <div
      className="pointer-events-none relative h-20 overflow-hidden rounded-xl border border-white/10 p-2"
      style={{ background: palette.bg }}
    >
      {rows[designId] || rows.royal}
      <div className="absolute inset-x-0 bottom-0 h-6 bg-gradient-to-t from-[#080C14]/80 to-transparent" />
    </div>
  );
}

/**
 * The Design Question — 4 live cards the owner picks from when uploading.
 * Emits the design id; mapping to the contract template happens via
 * src/lib/summaryDesigns.js (single source of truth).
 */
export default function SummaryDesignPicker({ value, onChange, isEn = false }) {
  return (
    <div>
      <p className="text-xs font-black text-muted-foreground mb-2.5">
        {isEn ? "2. Choose the summary look — it renders instantly:" : "٢. اختر شكل التلخيص — سيُعرض لك فوريًا بنفس الشكل:"}
      </p>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        {SUMMARY_DESIGNS.map((design) => {
          const Icon = ICONS[design.icon] || Crown;
          const active = value === design.id;
          return (
            <button
              key={design.id}
              type="button"
              onClick={() => onChange?.(design.id)}
              aria-pressed={active}
              className={`relative text-right rounded-2xl border p-2.5 transition-all cursor-pointer ${
                active
                  ? "border-primary bg-primary/10 shadow-lg shadow-primary/10"
                  : "border-white/10 bg-white/[0.02] hover:bg-white/[0.05]"
              }`}
            >
              {active && (
                <CheckCircle2 className="absolute end-2 top-2 w-4 h-4 text-primary" />
              )}
              {design.recommended && !active && (
                <span className="absolute end-2 top-2 rounded-full border border-amber-400/40 bg-amber-500/10 px-1.5 py-0.5 text-[8px] font-black text-amber-300">
                  {isEn ? "BEST" : "الأفخم"}
                </span>
              )}
              <DesignThumb palette={design.palette} designId={design.id} />
              <div className="mt-2 flex items-center gap-1.5">
                <Icon className="w-3.5 h-3.5 shrink-0" style={{ color: design.palette.primary }} />
                <span className="text-[11px] sm:text-xs font-black text-foreground">
                  {isEn ? design.titleEn : design.titleAr}
                </span>
              </div>
              <p className="mt-0.5 text-[9.5px] leading-snug text-muted-foreground">
                {isEn ? design.descEn : design.descAr}
              </p>
            </button>
          );
        })}
      </div>
    </div>
  );
}
