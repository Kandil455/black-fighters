import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

export default function PdfToolCard({ tool, active, index, onSelect }) {
  const Icon = tool.icon;

  return (
    <motion.button
      initial={{ opacity: 0, y: 15 }}
      animate={{
        opacity: 1,
        y: 0,
        // The stagger delay is scoped to the ENTRANCE only. A shared
        // transition prop leaks the delay into whileHover: card #1 hovered
        // after 25ms, card #11 after 275ms — the 'some buttons hover faster
        // than others' report on /tools.
        transition: { delay: index * 0.025, duration: 0.4, ease: "easeOut" },
      }}
      onClick={() => onSelect(tool.id)}
      className={cn(
        // Hover is CSS-only (§7 Button contract): the entrance delay must
        // never touch hover feedback, and transition-colors would re-interpolate
        // framer's per-frame entrance writes. ios-glass-card already owns a
        // transform transition — one clean ease, same feel as every button.
        "ios-glass-card text-start rounded-2xl p-5 border relative overflow-hidden group select-none hover:-translate-y-1 active:translate-y-0",
        active
          ? "border-primary/50 bg-primary/10 shadow-[0_0_25px_rgba(0,245,255,0.2)]"
          : "border-white/10 hover:border-white/25 hover:bg-white/[0.05]"
      )}
    >
      {active && (
        <div className="absolute top-0 inset-x-0 h-1 bg-gradient-to-r from-primary via-cyan-400 to-accent" />
      )}

      <div className="flex items-start gap-4">
        <div
          className={cn(
            "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-[background-color,border-color,transform] duration-300 shadow-inner group-hover:scale-110",
            active ? "bg-primary/20 border-primary/40" : "bg-white/[0.04] border-white/10"
          )}
        >
          <Icon className={cn("w-6 h-6 transition-colors", tool.color)} />
        </div>
        <div>
          <span className="text-[10px] font-mono font-bold text-muted-foreground/80 uppercase tracking-wider mb-1 block">
            {tool.category}
          </span>
          <h3 className="font-black text-sm text-foreground font-heading mb-1">{tool.label}</h3>
          <p className="text-xs text-muted-foreground leading-relaxed">{tool.desc}</p>
        </div>
      </div>
    </motion.button>
  );
}