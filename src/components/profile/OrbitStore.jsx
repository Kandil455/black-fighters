import React, { useState } from "react";
import { Check, Coins, Loader2, Lock, X } from "lucide-react";
import { base44 } from "@/api/base44Client";
import { ORBIT_EFFECTS, ownsOrbitEffect } from "@/lib/avatars";
import { toast } from "sonner";
import OrbitEffectGlyph from "@/components/profile/OrbitEffectGlyph";

const MAX_ACTIVE = 5;

export default function OrbitStore({ user, selected = [], onChange, onUserUpdate }) {
  const [buying, setBuying] = useState(null);
  const active = Array.isArray(selected) ? selected : selected && selected !== "none" ? [selected] : [];

  const toggle = (key) => {
    if (active.includes(key)) return onChange(active.filter((item) => item !== key));
    if (active.length >= MAX_ACTIVE) return toast.error(`You can equip up to ${MAX_ACTIVE} effects`);
    onChange([...active, key]);
  };

  const buy = async (key) => {
    const item = ORBIT_EFFECTS[key];
    if (Number(user?.credits || 0) < item.price) return toast.error("Not enough credits");
    setBuying(key);
    try {
      const { data } = await base44.functions.invoke("purchaseCosmetic", { type: "orbit", key });
      onUserUpdate?.({ credits: data.credits, owned_orbit_effects: data.owned_orbit_effects });
      onChange([...active, key].slice(0, MAX_ACTIVE));
      toast.success(`${item.label} unlocked`);
    } catch (error) {
      toast.error(error?.response?.data?.error || error.message || "Purchase failed");
    } finally {
      setBuying(null);
    }
  };

  return (
    <section>
      <div className="mb-3 flex items-center justify-between gap-3">
        <div>
          <h3 className="text-sm font-black">Orbit Collectibles</h3>
          <p className="text-xs text-muted-foreground">Buy and equip up to {MAX_ACTIVE} effects together</p>
        </div>
        {!!active.length && <button type="button" onClick={() => onChange([])} className="flex h-9 items-center gap-1 rounded-xl border border-border px-3 text-xs font-bold"><X className="h-3.5 w-3.5" /> Clear</button>}
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {Object.entries(ORBIT_EFFECTS).map(([key, item]) => {
          const owned = ownsOrbitEffect(user, key);
          const equipped = active.includes(key);
          return (
            <button key={key} type="button" onClick={() => owned ? toggle(key) : buy(key)} disabled={buying === key}
              className={`relative min-h-24 rounded-2xl border p-3 text-center transition ${equipped ? "border-primary bg-primary/10 shadow-[0_0_20px_hsl(var(--primary)/.2)]" : "border-border bg-card/40 hover:border-primary/50"}`}>
              <OrbitEffectGlyph kind={item.kind} color={item.color} size={42} className="mx-auto" />
              <span className="mt-1 block text-[11px] font-black">{item.label}</span>
              <span className="mt-1 flex items-center justify-center gap-1 text-[10px] font-bold text-amber-400"><Coins className="h-3 w-3" /> {item.price}</span>
              <span className="absolute end-2 top-2">{buying === key ? <Loader2 className="h-4 w-4 animate-spin" /> : equipped ? <Check className="h-4 w-4 text-primary" /> : !owned ? <Lock className="h-3.5 w-3.5 text-muted-foreground" /> : null}</span>
            </button>
          );
        })}
      </div>
    </section>
  );
}
