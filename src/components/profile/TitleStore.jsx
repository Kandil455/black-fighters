import React, { useState } from "react";
import { Lock, Check, Coins, Loader2, Crown, Shield } from "lucide-react";
import { motion } from "framer-motion";
import { PROFILE_TITLES, TIER_LABELS, ownsTitle } from "@/lib/avatars";
import AnimatedTitle from "@/components/profile/AnimatedTitle";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import { useLocale } from "@/lib/LocaleContext";

export default function TitleStore({ user, selected, onSelect, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const { locale } = useLocale();
  const isEn = locale === "en";
  const credits = user?.credits ?? 0;

  const buy = async (key, price) => {
    if (price < 0) return toast.info(isEn ? "Exclusive VIP / Rank title!" : "لقب سيادة خاص باشتراكات VIP 👑");
    if (credits < price) return toast.error("كريدتس مش كافية — ذاكر وحل كويزات 💪");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "title", key });
      if (data?.error) return toast.error(data.error);
      const { default: confetti } = await import("canvas-confetti");
      confetti({ particleCount: 80, spread: 75, origin: { y: 0.6 } });
      toast.success(`فتحت لقب ${PROFILE_TITLES[key].labelAr || PROFILE_TITLES[key].label}! 🎉`);
      onUserUpdate?.({ credits: data.credits, owned_titles: data.owned_titles });
      onSelect(key);
    } catch (e) {
      toast.error(e?.response?.data?.error || e.message || "حصل خطأ في الشراء");
    } finally {
      setBuying(null);
    }
  };

  const TIER_ORDER = { vanguard: 0, common: 0, rare: 1, epic: 2, legendary: 3, exclusive: 4 };
  const entries = Object.entries(PROFILE_TITLES)
    .filter(([key, t]) => {
      if (t.exclusive && t.exclusive !== true) return ownsTitle(user, key);
      return true;
    })
    .sort(([, a], [, b]) => {
      const tierDiff = (TIER_ORDER[a.tier] ?? 0) - (TIER_ORDER[b.tier] ?? 0);
      return tierDiff !== 0 ? tierDiff : (a.price ?? 0) - (b.price ?? 0);
    });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-black flex items-center gap-2">
            <Shield className="w-4 h-4 text-primary" />
            {isEn ? "Winged Prestige Titles" : "خزانة شارات وألقاب المحاربين"}
          </h3>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn
              ? "Armored RPG title badges with live wings, crests, and metallic shimmer."
              : "شارات ألعاب مجنّحة بأيقونات وتدرجات مضيئة تتحرك حياً وتظهر تحت اسمك في كل مكان."}
          </p>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        {entries.map(([key, t]) => {
          const owned = ownsTitle(user, key);
          const isSelected = selected === key;
          const tier = TIER_LABELS[t.tier] || TIER_LABELS.vanguard;

          return (
            <motion.button
              key={key}
              type="button"
              whileHover={{ y: -2 }}
              onClick={() => (owned ? onSelect(key) : buy(key, t.price))}
              disabled={buying === key}
              className={`relative flex flex-col justify-between gap-2.5 p-4 rounded-2xl border-2 text-start transition-all overflow-hidden ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-[0_0_24px_rgba(25,240,140,0.2)]"
                  : owned
                  ? "border-border/80 bg-card/70 hover:border-primary/50"
                  : "border-border/50 bg-card/45 hover:border-primary/40"
              }`}
            >
              {/* Top Row: Rank Tier & Status */}
              <div className="w-full flex items-center justify-between gap-2">
                <span
                  className="text-[11px] font-black tracking-wide flex items-center gap-1.5"
                  style={{ color: tier.color }}
                >
                  {t.exclusive && <Crown className="w-3.5 h-3.5 text-amber-400" />}
                  {isEn ? tier.labelEn : tier.labelAr}
                </span>

                {isSelected && owned ? (
                  <span className="w-5 h-5 rounded-full bg-primary flex items-center justify-center shrink-0">
                    <Check className="w-3 h-3 text-primary-foreground stroke-[3]" />
                  </span>
                ) : !owned ? (
                  <span className="flex items-center gap-1 shrink-0">
                    {buying === key ? (
                      <Loader2 className="w-4 h-4 animate-spin text-primary" />
                    ) : t.price < 0 ? (
                      <span className="text-[10px] font-black text-rose-400 flex items-center gap-1">
                        <Lock className="w-3 h-3" /> VIP
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-xs font-black text-amber-400 font-mono tabular-nums">
                        <Coins className="w-3.5 h-3.5" /> {t.price}
                      </span>
                    )}
                  </span>
                ) : (
                  <span className="text-[10px] font-bold text-emerald-400">
                    {isEn ? "Unlocked" : "مفتوح ✔"}
                  </span>
                )}
              </div>

              {/* Center Live Animated Winged Title Badge */}
              <div className="my-1 flex items-center justify-center py-2 rounded-xl bg-background/50 border border-white/5 overflow-x-auto scrollbar-none">
                {key === "none" ? (
                  <span className="text-xs font-bold text-muted-foreground py-1">
                    {isEn ? "No Equipped Title" : "بدون لقب مفعّل"}
                  </span>
                ) : (
                  <AnimatedTitle titleKey={key} animate={true} size="sm" />
                )}
              </div>

              {/* Title Name Subtitle */}
              <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                <span className="font-bold text-foreground/90 truncate">
                  {isEn ? t.label : t.labelAr || t.label}
                </span>
                {isSelected && (
                  <span className="text-[10px] font-black text-primary">
                    {isEn ? "Active" : "مُفعّل"}
                  </span>
                )}
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
