import React from "react";
import { Check, Palette, Box } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PROFILE_COLORS } from "@/lib/avatars";
import TitleStore from "@/components/profile/TitleStore";
import OrbitStore from "@/components/profile/OrbitStore";
import { useLocale } from "@/lib/LocaleContext";

export default function DecorPicker({
  user,
  titleKey,
  onTitleKey,
  onUserUpdate,
  profileColor,
  onProfileColor,
  model3d,
  onModel3d,
  enable3d,
  onEnable3d,
  showStores = true,
}) {
  const { locale } = useLocale();
  const isEn = locale === "en";

  return (
    <div className="space-y-6">
      {/* لون طاقة البروفايل */}
      <div className="rounded-2xl border border-border/70 bg-card/50 p-4">
        <div className="mb-3">
          <p className="text-sm font-black flex items-center gap-2">
            <Palette className="w-4 h-4 text-primary" />
            {isEn ? "Profile Aura & Accent Color" : "لون هالة وثيم البروفايل"}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isEn ? "Controls the glowing border and ambient light around your profile card." : "يتحكم في لون الإضاءة والحدود المتوهجة حول بطاقتك الشخصية."}
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PROFILE_COLORS).map(([key, c]) => (
            <button
              key={key}
              type="button"
              onClick={() => onProfileColor(key)}
              className="group relative flex items-center gap-2 rounded-xl border px-3 py-2 transition-all"
              style={{
                borderColor: profileColor === key ? c.hex : "rgba(255,255,255,0.12)",
                background: profileColor === key ? `${c.hex}18` : "rgba(15,23,42,0.5)",
              }}
              title={c.label}
            >
              <span
                className="relative w-6 h-6 rounded-full flex items-center justify-center shadow"
                style={{ background: c.hex, boxShadow: `0 0 10px ${c.hex}88` }}
              >
                {profileColor === key && <Check className="w-3.5 h-3.5 text-slate-950 stroke-[3]" />}
              </span>
              <span className="text-xs font-bold">{c.label.split("·")[0].trim()}</span>
            </button>
          ))}
        </div>
      </div>

      {/* تفعيل تأثير 3D */}
      <div className="flex items-center justify-between rounded-2xl border border-border/70 bg-card/50 p-4">
        <div className="flex items-start gap-3">
          <Box className="w-5 h-5 text-primary mt-0.5 shrink-0" />
          <div>
            <p className="text-sm font-black">{isEn ? "3D Perspective & Interactive Tilt" : "العمق ثلاثي الأبعاد والميل التفاعلي (3D Tilt)"}</p>
            <p className="text-xs text-muted-foreground mt-0.5">
              {isEn ? "Your profile card tilts in 3D space as you move the cursor." : "بطاقة البروفايل تميل وتتفاعل ثلاثياً مع حركة الماوس أو اللمس."}
            </p>
          </div>
        </div>
        <Switch checked={enable3d} onCheckedChange={onEnable3d} />
      </div>

      {showStores && (
        <>
          <TitleStore
            user={user}
            selected={titleKey}
            onSelect={onTitleKey}
            onUserUpdate={onUserUpdate}
          />
          <OrbitStore
            user={user}
            selected={model3d}
            onChange={onModel3d}
            onUserUpdate={onUserUpdate}
          />
        </>
      )}
    </div>
  );
}
