import React, { useState } from "react";
import { Crown, Check, Loader2, Palette, Lock, Coins, ExternalLink, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { AVATAR_STYLES, AVATAR_FRAMES, TIER_LABELS, ownsFrame } from "@/lib/avatars";
import { useLocale } from "@/lib/LocaleContext";
import { Link } from "react-router-dom";

function avatarInitials(name = "") {
  const parts = String(name || "").trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "BF";
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0].slice(0, 2).toUpperCase();
}

export default function AvatarPicker({ profile, onSaved }) {
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [avatar, setAvatar] = useState(profile?.avatar_url || "");
  const [frame, setFrame] = useState(profile?.profile_frame || profile?.active_frame || "none");
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (frame !== "none" && !ownsFrame(profile, frame)) {
      return toast.error(
        isEn
          ? "Unlock this RPG frame from the Profile Armory first! 🔒"
          : "افتح الإطار ده الأول من ترسانة البروفايل عشان تقدر تفعّله! 🔒"
      );
    }
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_url: avatar || null, profile_frame: frame, active_frame: frame });
      toast.success(isEn ? "Profile loadout updated ✨" : "تم حفظ صورتك وإطارك المتحرك بنجاح ✨");
      onSaved?.({ avatar_url: avatar, profile_frame: frame });
    } catch (e) {
      toast.error(e.message || (isEn ? "Failed to save profile" : "حصل خطأ في الحفظ"));
    } finally {
      setSaving(false);
    }
  };

  const initials = avatarInitials(profile?.full_name || profile?.email || "BF");

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-primary/30" dir={dir}>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-2">
        <h2 className="font-black text-lg flex items-center gap-2">
          <Crown className="w-5 h-5 text-primary" />
          {isEn ? "RPG Avatar & Live Dragon Frames" : "استوديو الأفاتار وإطارات التنانين المتحركة"}
        </h2>
        <Link
          to="/profile"
          className="text-xs text-primary hover:underline flex items-center gap-1 font-black"
        >
          {isEn ? "Open Full Identity Studio" : "فتح استوديو البروفايل الكامل"}
          <ExternalLink className="w-3.5 h-3.5" />
        </Link>
      </div>
      <p className="text-sm text-muted-foreground mb-6">
        {isEn
          ? "Preview and equip live animated dragon, phoenix, and lightning frames."
          : "عاين وفعّل إطارات الألعاب المرسومة بالتنانين والأجنحة والصواعق المتحركة حياً."}
      </p>

      {/* Live Large Animated Preview */}
      <div className="flex flex-col items-center justify-center py-6 mb-7 rounded-2xl bg-background/60 border border-border/60">
        <AnimatedAvatar
          src={avatar}
          frame={frame}
          size={116}
          fallback={initials}
          animate={true}
        />
        <p className="mt-4 text-xs font-black text-primary">
          {AVATAR_FRAMES[frame]?.labelAr || AVATAR_FRAMES[frame]?.label || "بدون إطار"}
        </p>
      </div>

      {/* Avatar Gradient Swatches */}
      <p className="text-sm font-black mb-3 flex items-center gap-1.5">
        <Palette className="w-4 h-4 text-primary" />
        {isEn ? "Core Energy Color" : "لون طاقة الأفاتار"}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2.5 mb-7">
        {AVATAR_STYLES.map((s) => {
          const selected = avatar === s.gradient;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => setAvatar(s.gradient)}
              aria-pressed={selected}
              className={`group relative flex flex-col items-center gap-1.5 rounded-2xl border p-2.5 transition-colors ${
                selected ? "border-primary bg-primary/10" : "border-border hover:border-primary/40"
              }`}
            >
              <span
                className="flex h-11 w-11 items-center justify-center rounded-full text-sm font-black text-white shadow-md"
                style={{ background: s.gradient }}
              >
                {initials}
              </span>
              <span className={`text-[10px] font-bold truncate max-w-full ${selected ? "text-primary" : "text-muted-foreground"}`}>
                {s.label.split("·")[0].trim()}
              </span>
            </button>
          );
        })}
      </div>

      {/* Always-Animated RPG Frame Selector */}
      <div className="flex items-center justify-between mb-3">
        <p className="text-sm font-black flex items-center gap-1.5">
          <Sparkles className="w-4 h-4 text-amber-400" />
          {isEn ? "Animated RPG Frames (Always Live)" : "إطارات الألعاب المتحركة (معاينة حية دائمة)"}
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 mb-8">
        {Object.entries(AVATAR_FRAMES).map(([key, f]) => {
          const owned = key === "none" || ownsFrame(profile, key);
          const isSelected = frame === key;
          const tierObj = TIER_LABELS[f.tier || "vanguard"] || TIER_LABELS.vanguard;

          return (
            <button
              key={key}
              type="button"
              onClick={() => setFrame(key)}
              className={`relative flex flex-col items-center justify-between p-3.5 rounded-2xl border-2 transition-all ${
                isSelected
                  ? "border-primary bg-primary/10 shadow-lg"
                  : owned
                  ? "border-border/70 hover:border-primary/50 bg-card/50"
                  : "border-border/40 bg-card/30 hover:border-amber-400/50"
              }`}
            >
              <div className="w-full flex items-center justify-between text-[9px] font-bold mb-1">
                <span style={{ color: tierObj.color }}>{isEn ? tierObj.labelEn : tierObj.labelAr}</span>
                {isSelected && <Check className="w-3.5 h-3.5 text-primary stroke-[3]" />}
                {!owned && !isSelected && <Lock className="w-3 h-3 text-amber-400" />}
              </div>

              <div className="relative my-2.5 flex items-center justify-center w-20 h-20">
                <AnimatedAvatar
                  src={avatar}
                  frame={key}
                  size={58}
                  fallback={initials}
                  animate={true}
                />
              </div>

              <span className={`text-[11px] font-black truncate max-w-full ${isSelected ? "text-primary" : "text-foreground"}`}>
                {isEn ? f.label : f.labelAr || f.label}
              </span>

              {!owned ? (
                <span className="flex items-center gap-1 text-[10px] font-black text-amber-400 mt-1 font-mono tabular-nums">
                  <Coins className="w-3 h-3" />
                  {f.price < 0 ? "VIP" : f.price}
                </span>
              ) : (
                <span className="text-[10px] text-emerald-400 font-bold mt-1">
                  {key === "none" ? (isEn ? "Default" : "افتراضي") : (isEn ? "Unlocked" : "مفتوح ✔")}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <Button onClick={save} disabled={saving} className="w-full h-12 font-black gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {isEn ? "Save Avatar & Frame" : "حفظ الصورة والإطار"}
      </Button>
    </div>
  );
}