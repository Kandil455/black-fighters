import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Bolt, BrainCircuit, TimerReset } from "lucide-react";

export default function EfficiencyRail({ courses }) {
  const newest = courses[0];
  const items = [
    { icon: Bolt, label: "ابدأ أسرع", text: newest ? `كمل ${newest.title}` : "اعمل أول كورس", to: newest ? `/course/${newest.id}` : "/create" },
    { icon: BrainCircuit, label: "راجع بذكاء", text: "افتح جلسة مراجعة مركزة", to: "/review" },
    { icon: TimerReset, label: "اختصر الوقت", text: "استخدم أدوات PDF والتحليل", to: "/tools" },
  ];

  return (
    <div className="grid gap-3">
      {items.map(({ icon: Icon, label, text, to }) => (
        <Link key={label} to={to} className="group rounded-2xl border border-border bg-background/45 p-4 transition-colors hover:border-primary/45 hover:bg-primary/10">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/10 text-primary group-hover:neon-glow-cyan">
              <Icon className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-black">{label}</p>
              <p className="truncate text-xs text-muted-foreground">{text}</p>
            </div>
            <ArrowLeft className="h-4 w-4 text-muted-foreground transition-transform group-hover:-translate-x-1 group-hover:text-primary" />
          </div>
        </Link>
      ))}
    </div>
  );
}