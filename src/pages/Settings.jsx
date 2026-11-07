import React from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAuth } from '@/lib/AuthContext';
import AiModelsAndProvidersManager from "@/components/settings/AiModelsAndProvidersManager";
import AvatarPicker from "@/components/settings/AvatarPicker";
import ThemePicker from "@/components/settings/ThemePicker";
import DeleteAccountCard from "@/components/settings/DeleteAccountCard";
import IntegrationsPanel from "@/components/settings/IntegrationsPanel";
import TelegramPanel from "@/components/settings/TelegramPanel";
import PageLoader from "@/components/PageLoader";
import PerformanceSettings from "@/components/settings/PerformanceSettings";
import LanguageSettings from "@/components/settings/LanguageSettings";
import SwitchShowcase from "@/components/settings/SwitchShowcase";
import { useLocale } from "@/lib/LocaleContext";

function SettingsSection({ title, hint, children }) {
  return (
    <section className="mt-8">
      <div className="mb-3 flex flex-wrap items-baseline gap-x-3 gap-y-1 border-b border-border pb-2">
        <h2 className="text-[13px] font-black uppercase tracking-[0.16em] text-primary">{title}</h2>
        {hint && <p className="text-[12px] text-muted-foreground">{hint}</p>}
      </div>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

export default function Settings() {
  const queryClient = useQueryClient();
  const { profile, refreshProfile, isAdmin } = useAuth();
  const { locale, dir } = useLocale();
  const isEn = locale === "en";

  const isAlphaAdmin = profile?.role === "admin" || String(profile?.email || "").toLowerCase() === "ibrahimkandil000@gmail.com";

  if (!profile) return <PageLoader message={isEn ? "Loading settings..." : "جاري التحميل..."} />;

  return (
    <div dir={dir} className="max-w-3xl mx-auto space-y-8">
      <header className="mb-2">
        <h1 className="text-2xl font-black sm:text-3xl">{isEn ? "Settings" : "الإعدادات"}</h1>
        <p className="mt-1.5 text-[13.5px] leading-6 text-muted-foreground">
          {isEn
            ? "Your look, language, notifications and account — grouped below."
            : "شكلك، لغتك، تنبيهاتك، وحسابك — مرتبين تحت في أقسام واضحة."}
        </p>
      </header>

      {isAlphaAdmin && (
        <SettingsSection
          title={isEn ? "Custom Model API & AI Rotation" : "إعدادات الـ API والنماذج والتبديل التلقائي"}
          hint={isEn ? "Add custom model APIs, fetch models, and rotate keys" : "أضف أي API مخصص أو جاهز، واجلب النماذج المتاحة واحفظها وبدّل بينها في أي وقت"}
        >
          <AiModelsAndProvidersManager
            isAdmin={true}
            onConfigUpdated={() => queryClient.invalidateQueries({ queryKey: ["userSettings"] })}
          />
        </SettingsSection>
      )}

      <SettingsSection title={isEn ? "Appearance" : "الشكل والمظهر"} hint={isEn ? "Theme, avatar, frame and motion" : "الثيم، الصورة، الإطار، وحركة الواجهة"}>
        <ThemePicker />
        <AvatarPicker profile={profile} onSaved={() => refreshProfile()} />
        <PerformanceSettings />
        {isAdmin && <SwitchShowcase />}
      </SettingsSection>

      <SettingsSection title={isEn ? "Language" : "اللغة"} hint={isEn ? "Interface language" : "لغة الواجهة"}>
        <LanguageSettings />
      </SettingsSection>

      <SettingsSection title={isEn ? "Telegram" : "تيليجرام"} hint={isEn ? "Link the bot and choose what it may send you" : "اربط البوت واختار اللي يوصلك منه"}>
        <TelegramPanel />
      </SettingsSection>

      {isAdmin && (
        <SettingsSection title={isEn ? "AI providers" : "مزودو الذكاء الاصطناعي"} hint={isEn ? "Your own API keys and Slack/Drive hooks" : "مفاتيحك الشخصية وربط Slack/Drive"}>
          <IntegrationsPanel />
        </SettingsSection>
      )}

      <SettingsSection title={isEn ? "Account" : "الحساب"} hint={isEn ? "Irreversible actions live here" : "خطوات مفيش رجوع فيها"}>
        <DeleteAccountCard />
      </SettingsSection>
    </div>
  );
}
