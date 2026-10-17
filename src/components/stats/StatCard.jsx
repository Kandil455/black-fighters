import React from "react";
import { motion } from "framer-motion";
import { AnimatedNumber } from "@/components/ui/linevault";

export default function StatCard({ icon: Icon, label, value, color = "text-primary", border = "border-primary/30", glow = "", index = 0 }) {
  // Parse numeric value + optional unit/suffix (e.g., 120, "85%", "14h", "1,250")
  const parsed = (() => {
    if (typeof value === "number") return { num: value, prefix: "", suffix: "" };
    if (typeof value === "string") {
      const m = value.trim().match(/^([^\d-]*)([\d,]+(?:\.\d+)?)(.*)$/);
      if (m) {
        const num = Number(m[2].replace(/,/g, ""));
        if (Number.isFinite(num)) {
          return {
            num,
            decimals: m[2].includes(".") ? m[2].split(".")[1].length : 0,
            prefix: m[1] || "",
            suffix: m[3] || "",
          };
        }
      }
    }
    return null;
  })();

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
      className={`glass-card rounded-2xl p-6 border ${border} ${glow}`}
    >
      <Icon className={`w-7 h-7 ${color} mb-3`} />
      <p className="text-3xl font-black font-mono tabular-nums mb-1">
        {parsed ? (
          <AnimatedNumber
            value={parsed.num}
            decimals={parsed.decimals || 0}
            prefix={parsed.prefix}
            suffix={parsed.suffix}
          />
        ) : (
          value
        )}
      </p>
      <p className="text-sm text-muted-foreground">{label}</p>
    </motion.div>
  );
}