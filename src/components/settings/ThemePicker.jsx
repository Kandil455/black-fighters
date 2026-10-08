import React, { useState } from "react";
import { useAuth } from "@/lib/AuthContext";
import { THEME_LIST, applyTheme } from "@/lib/themes";
import { Palette, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useLocale } from "@/lib/LocaleContext";

export default function ThemePicker() {
  const { profile, updateMe } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";
  const [saving, setSaving] = useState(null);
  const current = profile?.app_theme || "clinical";

  const pick = async (key) => {
    if (key === current) return;
    applyTheme(key); // Realtime preview
    setSaving(key);
    try {
      await updateMe({ app_theme: key });
      toast.success(isEn ? "Theme updated 🎨" : "تم تغيير الثيم 🎨");
    } catch {
      applyTheme(current);
      toast.error(isEn ? "Failed to save theme" : "فشل حفظ الثيم");
    } finally {
      setSaving(null);
    }
  };

  return (
    <div className="glass-card rounded-3xl p-6 sm:p-8 border border-accent/30" dir={dir}>
      <h2 className="font-extrabold text-lg mb-1 flex items-center gap-2">
        <Palette className="w-5 h-5 text-accent" /> {isEn ? "Color Theme" : "ثيم الألوان"}
      </h2>
      <p className="text-sm text-muted-foreground mb-6">
        {isEn 
          ? "Choose your preferred aesthetic style — instantly applied across the entire app."
          : "اختر الستايل اللي يريّح عينك — بيتطبّق على التطبيق كله فوراً."}
      </p>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEME_LIST.map((t) => {
          const active = current === t.key;
          return (
            <button
              key={t.key}
              onClick={() => pick(t.key)}
              className={`relative rounded-2xl border p-3 text-start transition-colors tap-target ${
                active ? "border-primary ring-2 ring-primary/40" : "border-border hover:border-primary/40"
              }`}
            >
              <div className="flex items-center gap-1.5 mb-3">
                {t.preview.map((c, i) => (
                  <span
                    key={i}
                    className="w-6 h-6 rounded-full border border-white/10"
                    style={{ background: c }}
                  />
                ))}
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-bold">{t.emoji} {isEn && t.nameEn ? t.nameEn : t.name}</span>
                {saving === t.key ? (
                  <Loader2 className="w-4 h-4 animate-spin text-primary shrink-0" />
                ) : active ? (
                  <Check className="w-4 h-4 text-primary shrink-0" />
                ) : null}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}