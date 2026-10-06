import React from "react";
import { motion } from "framer-motion";
import { CheckCircle2, Loader2, FileText, Highlighter, Table2, ListChecks } from "lucide-react";

export const AGENTS = [
  { key: "summarizer", icon: FileText, label: "وكيل التلخيص المحترف", desc: "بيستخرج الجوهر ويكتب ملخص منظم" },
  { key: "highlighter", icon: Highlighter, label: "وكيل التلوين", desc: "بيحدد المهم ويلوّن كل نوع بلون" },
  { key: "tables", icon: Table2, label: "وكيل الجداول", desc: "بيحوّل البيانات والمقارنات لجداول" },
  { key: "organizer", icon: ListChecks, label: "وكيل التنظيم", desc: "بيرتّب كل حاجة في صورة نهائية" },
];

/**
 * activeIndex: -1 = none, 0..AGENTS.length-1 = current agent running, AGENTS.length = all done
 */
export default function AgentPipeline({ activeIndex = 0 }) {
  return (
    <div className="mx-auto mt-4 max-w-2xl">
      <p className="mb-2 text-start text-xs font-bold text-muted-foreground">مراحل المعالجة</p>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {AGENTS.map((agent, i) => {
        const done = i < activeIndex;
        const active = i === activeIndex;
        const Icon = agent.icon;
        return (
          <motion.div
            key={agent.key}
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.06 }}
            className={`flex min-w-0 items-center gap-2 rounded-xl border p-2.5 transition-colors ${
              active
                ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                : done
                ? "border-[hsl(152,100%,50%)]/30 bg-[hsl(152,100%,50%)]/5"
                : "border-border opacity-60"
            }`}
          >
            <div
              className={`grid h-9 w-9 shrink-0 place-items-center rounded-xl ${
                active ? "bg-primary/15 text-primary" : done ? "bg-[hsl(152,100%,50%)]/15 text-[hsl(152,100%,50%)]" : "bg-secondary text-muted-foreground"
              }`}
            >
              {done ? <CheckCircle2 className="h-5 w-5" /> : active ? <Loader2 className="h-5 w-5 animate-spin" /> : <Icon className="h-5 w-5" />}
            </div>
            <div className="min-w-0 flex-1 text-start">
              <p className="truncate text-xs font-black">{agent.label.replace("وكيل ", "")}</p>
            </div>
          </motion.div>
        );
      })}
      </div>
    </div>
  );
}
