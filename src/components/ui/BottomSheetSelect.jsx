import React, { useState } from "react";
import { Drawer, DrawerContent, DrawerTrigger, DrawerTitle, DrawerDescription } from "@/components/ui/drawer";
import { Check, ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

/**
 * Single-select that opens as a bottom sheet (mobile-friendly).
 * options: [{ value, label }]
 */
export default function BottomSheetSelect({
  value,
  onChange,
  options = [],
  placeholder = "اختر...",
  title,
  className,
  triggerClassName,
}) {
  const { dir } = useLocale();
  const [open, setOpen] = useState(false);
  const selected = options.find((o) => o.value === value);

  return (
    <Drawer open={open} onOpenChange={setOpen}>
      <DrawerTrigger asChild>
        <button
          type="button"
          className={cn(
            "w-full h-9 flex items-center justify-between gap-2 rounded-md bg-background border border-input px-3 text-sm tap-target",
            triggerClassName
          )}
        >
          <span className={cn("truncate", !selected && "text-muted-foreground")}>
            {selected ? selected.label : placeholder}
          </span>
          <ChevronDown className="w-4 h-4 shrink-0 text-muted-foreground" />
        </button>
      </DrawerTrigger>
      <DrawerContent dir={dir} className={className}>
        <DrawerTitle className="px-4 pt-4 pb-2 text-base font-extrabold">
          {title || placeholder}
        </DrawerTitle>
        <DrawerDescription className="sr-only">Select an option</DrawerDescription>
        <div className="px-2 pb-safe pb-4 max-h-[60vh] overflow-y-auto overscroll-contain">
          {options.map((opt) => {
            const active = opt.value === value;
            return (
              <button
                key={opt.value}
                type="button"
                onClick={() => {
                  onChange(opt.value);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-center justify-between gap-2 rounded-xl px-4 py-3 text-sm font-bold transition-colors tap-target",
                  active ? "bg-primary/15 text-primary" : "hover:bg-secondary/50"
                )}
              >
                <span>{opt.label}</span>
                {active && <Check className="w-4 h-4 shrink-0" />}
              </button>
            );
          })}
        </div>
      </DrawerContent>
    </Drawer>
  );
}