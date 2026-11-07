import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { PROVIDERS, COLOR_CLASSES, getDefaultModel, TIERS, TIER_INFO, canUserAccessModel } from "@/lib/models";
import { CheckCircle2, ExternalLink, Lock } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/lib/AuthContext";

export default function ProviderModelPicker({
  provider,
  model,
  onProviderChange,
  onModelChange,
  enabledModels,
  userTier,
}) {
  const { profile } = useAuth();
  const activeUserTier = userTier || profile?.subscription_plan || profile?.role || "free";
  const [tierFilter, setTierFilter] = useState("all");

  const providerData = PROVIDERS[provider] || PROVIDERS.codecraft;
  let models = providerData.models.filter(
    (m) => !enabledModels || enabledModels.length === 0 || enabledModels.includes(m.id)
  );

  // If CodeCraft, apply tier filter
  if (provider === "codecraft" && tierFilter !== "all") {
    models = models.filter((m) => m.tier === tierFilter);
  }

  const colors = COLOR_CLASSES[providerData.color] || COLOR_CLASSES.amber;
  const selectedModel = model || getDefaultModel(provider, activeUserTier);

  const handleSelectModel = (m) => {
    const isAccessible = canUserAccessModel(m.id, activeUserTier);
    if (!isAccessible) {
      const tierData = TIER_INFO[m.tier] || { name: m.tier };
      toast.error(`نموذج ${m.name} يتطلب باقة ${tierData.nameAr || tierData.name} أو أعلى 🔒`, {
        description: "قم بترقية باقتك للوصول إلى كافة نماذج القمة الفضائية!",
      });
      return;
    }
    onModelChange(m.id);
  };

  return (
    <div>
      {/* Provider selector */}
      <label className="text-sm font-semibold mb-2 block">مزوّد الذكاء الاصطناعي</label>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-5">
        {Object.entries(PROVIDERS).map(([key, p]) => {
          const c = COLOR_CLASSES[p.color];
          const isActive = provider === key;
          return (
            <button
              key={key}
              onClick={() => {
                onProviderChange(key);
                onModelChange(getDefaultModel(key, activeUserTier));
              }}
              className={cn(
                "glass-card rounded-xl py-3 px-2 text-sm font-bold border transition-colors duration-300 flex flex-col items-center gap-1",
                isActive
                  ? `${c.border} ${c.text} ${c.bg} ring-1 ${c.border}`
                  : "border-border text-muted-foreground hover:border-primary/40"
              )}
            >
              <span className="text-xl">{p.icon}</span>
              <span className="text-xs font-black leading-tight text-center">{p.name}</span>
              {p.freeNote && isActive && (
                <span className="text-[9px] opacity-70 leading-tight text-center">{p.freeNote}</span>
              )}
            </button>
          );
        })}
      </div>

      {/* CodeCraft Tier Filter Tabs */}
      {provider === "codecraft" && (
        <div className="mb-4">
          <label className="text-xs font-bold text-muted-foreground mb-1.5 block">تصنيف النماذج الـ 31 حسب الخطة</label>
          <div className="flex flex-wrap gap-1.5 p-1 rounded-xl glass-card border border-border">
            {[
              { id: "all", label: "الكل (31)", color: "text-foreground" },
              { id: TIERS.FREE, label: "المجاني (8)", color: "text-emerald-400" },
              { id: TIERS.STARTER, label: "Starter (6)", color: "text-cyan-400" },
              { id: TIERS.PRO, label: "Pro ⭐ (8)", color: "text-purple-400" },
              { id: TIERS.SUPREME, label: "Supreme 👑 (9)", color: "text-amber-400" },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTierFilter(tab.id)}
                className={cn(
                  "px-3 py-1 text-xs font-black rounded-lg transition-colors",
                  tierFilter === tab.id
                    ? "bg-primary text-primary-foreground shadow-sm"
                    : `text-muted-foreground hover:text-foreground ${tab.color}`
                )}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Model list header */}
      <div className="flex items-center justify-between mb-2">
        <label className="text-sm font-semibold">
          النماذج المتاحة ({models.length})
        </label>
        {providerData.keyUrl && provider !== "codecraft" && (
          <a
            href={providerData.keyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary flex items-center gap-1 hover:underline"
          >
            احصل على API Key <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Model list */}
      <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
        {models.map((m) => {
          const isSelected = selectedModel === m.id;
          const isLocked = !canUserAccessModel(m.id, activeUserTier);
          const tierMeta = TIER_INFO[m.tier];

          return (
            <button
              key={m.id}
              type="button"
              onClick={() => handleSelectModel(m)}
              className={cn(
                "w-full glass-card text-start rounded-xl px-4 py-3 border transition-colors duration-300 relative",
                isSelected
                  ? `${colors.border} ${colors.bg} ring-1 ${colors.border}`
                  : isLocked
                  ? "border-border/60 opacity-75 hover:opacity-100 hover:border-amber-500/40"
                  : "border-border hover:border-primary/30"
              )}
            >
              <div className="flex items-center justify-between gap-2 mb-1">
                <div className="flex items-center gap-2">
                  <p className={cn("font-black text-sm", isSelected ? colors.text : "")}>{m.name}</p>
                  {m.provider && (
                    <span className="text-[10px] font-mono opacity-50 px-1.5 py-0.5 rounded bg-white/5">
                      {m.provider}
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {tierMeta && (
                    <span
                      className={cn(
                        "text-[9px] font-black px-2 py-0.5 rounded-full border",
                        m.tier === TIERS.FREE && "bg-emerald-500/10 text-emerald-400 border-emerald-500/25",
                        m.tier === TIERS.STARTER && "bg-cyan-500/10 text-cyan-400 border-cyan-500/25",
                        m.tier === TIERS.PRO && "bg-purple-500/10 text-purple-400 border-purple-500/25",
                        m.tier === TIERS.SUPREME && "bg-amber-500/15 text-amber-300 border-amber-500/30"
                      )}
                    >
                      {tierMeta.badge}
                    </span>
                  )}

                  {m.recommended && (
                    <span className={cn("text-[9px] px-2 py-0.5 rounded-full font-black", colors.badge)}>
                      مُوصى به ⭐
                    </span>
                  )}

                  {isLocked && (
                    <span className="text-[10px] text-amber-400 flex items-center gap-0.5 font-bold">
                      <Lock className="w-3 h-3" /> مقفول
                    </span>
                  )}

                  {isSelected && (
                    <CheckCircle2 className={cn("w-4 h-4 shrink-0", colors.text)} />
                  )}
                </div>
              </div>

              <p className="text-xs text-muted-foreground leading-relaxed">{m.features}</p>
            </button>
          );
        })}
      </div>
    </div>
  );
}