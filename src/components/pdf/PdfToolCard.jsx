import React from "react";

export default function PdfToolCard({ tool, active, onSelect }) {
  const Icon = tool.icon;

  return (
    <button
      type="button"
      onClick={() => onSelect(tool.id)}
      className={`tool ${active ? "on" : ""}`}
      style={{
        borderColor: active ? "var(--sig)" : "var(--line)",
        backgroundColor: active ? "color-mix(in srgb, var(--sig) 6%, var(--paper2))" : "var(--paper2)",
        borderRadius: "4px",
      }}
    >
      <div className="flex items-center justify-between w-full">
        <b className="text-sm block" style={{ color: active ? "var(--sig)" : "var(--ink)" }}>
          {tool.label}
        </b>
        {Icon && (
          <Icon
            className="w-4 h-4 shrink-0"
            style={{ color: active ? "var(--sig)" : "var(--mute)" }}
            animated={false}
          />
        )}
      </div>
      <small style={{ color: "var(--mute)", lineHeight: 1.5 }}>
        {tool.desc}
      </small>
      <span className="mono text-[0.65rem] mt-auto">
        {tool.category}
      </span>
    </button>
  );
}