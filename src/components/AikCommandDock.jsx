import React from "react";
import { Link, useLocation } from "react-router-dom";
import { BrainCircuit, CreditCard, FileCog, Plus, Sparkles, Trophy } from "lucide-react";
import { cn } from "@/lib/utils";

const ACTIONS = [
  { to: "/create", label: "تلخيص", icon: Plus, color: "text-primary" },
  { to: "/review", label: "مراجعة", icon: BrainCircuit, color: "text-[hsl(var(--neon-green))]" },
  { to: "/tools", label: "PDF", icon: FileCog, color: "text-accent" },
  { to: "/subscriptions", label: "خطط", icon: CreditCard, color: "text-[hsl(var(--neon-green))]" },
  { to: "/leaderboard", label: "تحدّي", icon: Trophy, color: "text-primary" },
];

export default function AikCommandDock() {
  const location = useLocation();

  return (
    <div className="hidden md:block fixed bottom-4 left-6 z-40">
      <div className="glass-card border border-primary/25 rounded-2xl p-2 shadow-2xl neon-glow-cyan flex items-center gap-1">
        <div className="hidden sm:flex items-center gap-2 px-3 text-xs font-extrabold text-primary border-e border-border me-1">
          <Sparkles className="w-3.5 h-3.5" /> Black Fighters Boost
        </div>
        {ACTIONS.map(({ to, label, icon: Icon, color }) => {
          const active = location.pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={cn(
                "group min-w-14 rounded-xl px-3 py-2 text-center transition-colors duration-300 hover:bg-primary/10",
                active && "bg-primary/15 border border-primary/25"
              )}
            >
              <Icon className={cn("w-4 h-4 mx-auto mb-1 group-hover:scale-110 transition-transform", color)} />
              <span className="text-[10px] font-bold text-muted-foreground group-hover:text-foreground">{label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}