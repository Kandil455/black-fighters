import React from "react";
import { Check } from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { PROFILE_COLORS } from "@/lib/avatars";
import TitleStore from "@/components/profile/TitleStore";
import OrbitStore from "@/components/profile/OrbitStore";

export default function DecorPicker({
  user,
  titleKey, onTitleKey, onUserUpdate,
  profileColor, onProfileColor,
  model3d, onModel3d,
  enable3d, onEnable3d,
}) {
  return (
    <div className="space-y-7">
      {/* اللقب — ألقاب جاهزة فخمة */}
      <TitleStore
        user={user}
        selected={titleKey}
        onSelect={onTitleKey}
        onUserUpdate={onUserUpdate}
      />

      {/* لون الثيم */}
      <div>
        <p className="text-sm font-bold mb-2">Profile Accent</p>
        <div className="flex flex-wrap gap-3">
          {Object.entries(PROFILE_COLORS).map(([key, c]) => (
            <button
              key={key}
              onClick={() => onProfileColor(key)}
              className="relative w-10 h-10 rounded-full border-2 transition-colors"
              style={{ background: c.hex, borderColor: profileColor === key ? "#fff" : "transparent" }}
              title={c.label}
            >
              {profileColor === key && (
                <Check className="w-4 h-4 text-white absolute inset-0 m-auto drop-shadow" />
              )}
            </button>
          ))}
        </div>
      </div>

      <OrbitStore user={user} selected={model3d} onChange={onModel3d} onUserUpdate={onUserUpdate} />

      {/* تفعيل تأثير 3D */}
      <div className="flex items-center justify-between rounded-2xl border border-border/50 p-4">
        <div>
          <p className="text-sm font-bold">3D Depth & Tilt</p>
          <p className="text-xs text-muted-foreground">الكارت يميل ويتحرك مع حركة الماوس</p>
        </div>
        <Switch checked={enable3d} onCheckedChange={onEnable3d} />
      </div>
    </div>
  );
}
