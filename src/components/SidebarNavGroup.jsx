import React, { useState } from "react";
import { Link } from "react-router-dom";
import { ChevronDown } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import { playClick } from "@/lib/sounds";

export default function SidebarNavGroup({ title, items, pathname, onNavigate, defaultOpen = true }) {
  const hasActive = items.some(
    (it) => pathname === it.to || (it.to !== "/dashboard" && pathname.startsWith(it.to))
  );
  const [open, setOpen] = useState(defaultOpen || hasActive);

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-2 text-[11px] font-bold uppercase tracking-wider text-muted-foreground/70 hover:text-foreground transition-colors"
      >
        <span>{title}</span>
        <ChevronDown className={cn("w-3.5 h-3.5 transition-transform", open ? "" : "-rotate-90")} />
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden space-y-1"
          >
            {items.map((item) => {
              const Icon = item.icon;
              const active = pathname === item.to || (item.to !== "/dashboard" && pathname.startsWith(item.to));
              return (
                <Link
                  key={item.to}
                  to={item.to}
                  onClick={() => { onNavigate?.(); playClick(); }}
                  className={cn(
                    "flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-semibold transition-colors duration-300",
                    active
                      ? "bg-primary/10 text-primary border border-primary/30 neon-glow-cyan"
                      : "text-sidebar-foreground hover:bg-sidebar-accent hover:text-foreground"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  {item.label}
                </Link>
              );
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}