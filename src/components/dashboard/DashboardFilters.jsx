import React from "react";
import { Input } from "@/components/ui/input";
import { Search, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { useLocale } from "@/lib/LocaleContext";

export default function DashboardFilters({
  search, onSearch,
  subjects, activeSubject, onSubject,
  levels, activeLevel, onLevel,
  categories = [], activeCategory, onCategory,
  groupBy, onGroupBy,
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";
  const allLabel = isEn ? "All" : "الكل";

  return (
    <div className="ios-glass-card rounded-3xl p-5 mb-8 space-y-4 shadow-xl border border-white/10">
      <div className="relative">
        <Search className="w-4 h-4 text-primary absolute top-1/2 -translate-y-1/2 start-4" />
        <Input
          value={search}
          onChange={(e) => onSearch(e.target.value)}
          placeholder={isEn ? "Search your courses and lectures..." : "ابحث في كورساتك..."}
          className="ps-11 h-12 bg-[#EEF2F5] border-white/10 rounded-2xl text-foreground placeholder:text-muted-foreground/60 focus-visible:ring-primary/40 focus-visible:border-primary/50 transition-colors"
        />
        {search && (
          <button onClick={() => onSearch("")} className="absolute top-1/2 -translate-y-1/2 end-4 text-muted-foreground hover:text-foreground p-1 rounded-lg hover:bg-white/10 transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="space-y-3.5 pt-1">
        {categories.length > 0 && (
          <FilterRow label={isEn ? "Category" : "التصنيف"} items={[allLabel, ...categories]} active={activeCategory === "الكل" || activeCategory === "all" ? allLabel : activeCategory} onChange={(val) => onCategory(val === allLabel ? "all" : val)} accent="green" />
        )}
        {subjects.length > 0 && (
          <FilterRow label={isEn ? "Subject" : "المادة"} items={[allLabel, ...subjects]} active={activeSubject === "الكل" || activeSubject === "all" ? allLabel : activeSubject} onChange={(val) => onSubject(val === allLabel ? "all" : val)} accent="primary" />
        )}
        {levels.length > 0 && (
          <FilterRow label={isEn ? "Level" : "المستوى"} items={[allLabel, ...levels]} active={activeLevel === "الكل" || activeLevel === "all" ? allLabel : activeLevel} onChange={(val) => onLevel(val === allLabel ? "all" : val)} accent="accent" />
        )}
      </div>

      <div className="flex items-center gap-2 pt-2 border-t border-white/5">
        <span className="text-xs text-muted-foreground font-semibold">{isEn ? "Group By:" : "ترتيب الأقسام:"}</span>
        <div className="flex items-center gap-1.5 p-1 bg-white/[0.03] rounded-xl border border-white/5">
          {[["subject", isEn ? "Subject" : "المادة"], ["level", isEn ? "Level" : "المستوى"], ["none", isEn ? "None" : "بدون"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => onGroupBy(v)}
              className={cn(
                "px-3 py-1.5 rounded-lg text-xs font-bold transition-colors active:scale-95",
                groupBy === v 
                  ? "bg-primary text-black shadow-[0_2px_12px_rgba(0,245,255,0.3)]" 
                  : "text-muted-foreground hover:text-foreground hover:bg-white/5"
              )}
            >
              {l}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

const ACCENT_CLS = {
  primary: "bg-primary/15 text-primary border-primary/40 shadow-[0_0_12px_rgba(0,245,255,0.2)]",
  accent:  "bg-accent/15 text-accent border-accent/40 shadow-[0_0_12px_rgba(191,95,255,0.2)]",
  green:   "bg-[hsl(152,100%,50%)]/15 text-[hsl(152,100%,50%)] border-[hsl(152,100%,50%)]/40 shadow-[0_0_12px_rgba(0,255,136,0.2)]",
};

function FilterRow({ label, items, active, onChange, accent }) {
  const activeCls = ACCENT_CLS[accent] || ACCENT_CLS.primary;
  return (
    <div className="flex items-center gap-2.5">
      <span className="text-xs text-muted-foreground/80 font-semibold shrink-0">{label}:</span>
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 -mb-1 scrollbar-none">
        {items.map((item) => (
          <button
            key={item}
            onClick={() => onChange(item)}
            className={cn(
              "px-3.5 py-1.5 rounded-xl text-xs font-bold border transition-colors duration-200 whitespace-nowrap shrink-0 active:scale-95",
              active === item 
                ? activeCls 
                : "border-white/10 bg-white/[0.02] text-muted-foreground hover:text-foreground hover:bg-white/5 hover:border-white/20"
            )}
          >
            {item}
          </button>
        ))}
      </div>
    </div>
  );
}
