import React, { useState } from "react";
import { Crown, Check, Loader2, Palette, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { base44 } from "@/api/base44Client";
import AnimatedAvatar from "@/components/AnimatedAvatar";
import { AVATAR_STYLES } from "@/lib/avatars";
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
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await base44.auth.updateMe({ avatar_url: avatar || null });
      toast.success(isEn ? "Avatar updated ✨" : "تم حفظ صورتك بنجاح ✨");
      onSaved?.({ avatar_url: avatar });
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
          ? "Pick your photo or an energy colour — it appears everywhere in the app."
          : "اختار صورتك أو لون الطاقة — بيظهر في كل المنصة."}
      </p>

      {/* Live Large Animated Preview */}
      <div className="flex flex-col items-center justify-center py-6 mb-7 rounded-2xl bg-background/60 border border-border/60">
        <AnimatedAvatar
          src={avatar}
          frame="none"
          size={116}
          fallback={initials}
          animate={true}
        />
        <p className="mt-4 text-xs font-black text-primary">
          {isEn ? "Preview" : "معاينة"}
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


      <Button onClick={save} disabled={saving} className="w-full h-12 font-black gap-2">
        {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
        {isEn ? "Save Avatar" : "حفظ الصورة"}
      </Button>
    </div>
  );
}