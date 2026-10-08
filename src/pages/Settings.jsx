import React, { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { base44 } from '@/api/base44Client';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Key, Check, Trash2, Loader2, ExternalLink } from "lucide-react";
import { toast } from "sonner";
import { PROVIDERS, getDefaultModel } from "@/lib/models";
import { testAiKey } from "@/lib/ai";
import ProviderModelPicker from "@/components/settings/ProviderModelPicker";
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

/**
 * A labelled block of settings.
 *
 * The page used to be eight cards separated only by `mt-8`, so there was no way
 * to tell where "appearance" ended and "account deletion" began — and the
 * destructive card sat one scroll away from the theme swatches with nothing
 * marking it apart.
 */
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
  const [provider, setProvider] = useState("gemini");
  const [apiKey, setApiKey] = useState("");
  const [model, setModel] = useState("");
  const [saving, setSaving] = useState(false);

  const { data: settings = [], isLoading } = useQuery({
    queryKey: ["userSettings"],
    queryFn: () => base44.entities.UserSettings.filter({}, "-created_date", 10),
  });

  const isAlphaAdmin = profile?.role === "admin" || String(profile?.email || "").toLowerCase() === "ibrahimkandil000@gmail.com";
  const current = settings[0];

  useEffect(() => {
    if (current && isAlphaAdmin) {
      setProvider(current.provider || "gemini");
      setModel(current.model || "");
      setApiKey(current.api_key ? "••••••••••••••••" : "");
    }
  }, [current, isAlphaAdmin]);

  if (!profile) return <PageLoader message={isEn ? "Loading settings..." : "جاري التحميل..."} />;

  const save = async () => {
    let keyToSave = apiKey.trim();
    if (keyToSave.includes("•")) {
      keyToSave = current?.api_key || "";
    }
    if (!keyToSave) return toast.error("اكتب الـ API Key الأول");

    setSaving(true);
    try {
      // Test the key before saving it
      await testAiKey(provider, keyToSave);

      const data = { provider, api_key: keyToSave, model: model || getDefaultModel(provider), is_active: true };
      if (current) {
        await base44.entities.UserSettings.update(current.id, data);
      } else {
        await base44.entities.UserSettings.create(data);
      }
      queryClient.invalidateQueries({ queryKey: ["userSettings"] });
      toast.success("اتحفظ! هنستخدم المفتاح بتاعك دلوقتي ✅");
    } catch (e) {
      toast.error(e.message || "المفتاح غير صالح");
    } finally {
      setSaving(false);
    }
  };

  const remove = async () => {
    await base44.entities.UserSettings.delete(current.id);
    queryClient.invalidateQueries({ queryKey: ["userSettings"] });
    setApiKey("");
    toast.success("اتمسح — هنرجع نستخدم المفتاح الافتراضي");
  };

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
        <>
          {current && (
            <div className="glass-card neon-glow-green rounded-2xl p-5 border border-[hsl(152,100%,50%)]/30 mb-8 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <Check className="w-5 h-5 text-[hsl(152,100%,50%)]" />
                <div>
                  <p className="font-bold">{isEn ? "Custom API Key Active" : "مفتاحك الشخصي شغال"}</p>
                  <p className="text-sm text-muted-foreground">
                    {PROVIDERS[current.provider]?.name} — {current.model}
                  </p>
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={remove} className="text-muted-foreground hover:text-destructive">
                <Trash2 className="w-4 h-4" />
              </Button>
            </div>
          )}

          <div className="glass-card rounded-3xl p-8 border border-primary/30 mb-8">
            <h2 className="font-extrabold text-lg mb-6 flex items-center gap-2">
              <Key className="w-5 h-5 text-primary" /> {current ? (isEn ? "Change API Key" : "تغيير المفتاح") : (isEn ? "Add Custom API Key" : "إضافة مفتاح جديد")}
            </h2>

            <ProviderModelPicker
              provider={provider}
              model={model}
              enabledModels={current?.enabled_models}
              onProviderChange={(p) => {
                setProvider(p);
                setModel("");
                if (current && current.provider === p && current.api_key) {
                  setApiKey("••••••••••••••••");
                } else {
                  setApiKey("");
                }
              }}
              onModelChange={setModel}
            />

            <div className="mt-6">
              <label className="text-sm font-semibold mb-2 block">{isEn ? "API Key Secret" : "الـ API Key"}</label>
              <Input
                dir="ltr"
                type="password"
                placeholder="AIza... / gsk_... / sk-or-..."
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
              />
              <a
                href={PROVIDERS[provider].keyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
              >
                <ExternalLink className="w-3 h-3" /> {isEn ? "Get free API key here" : "اعمل مفتاح مجاني من هنا"}
              </a>
            </div>

            <Button onClick={save} disabled={saving} className="w-full h-12 font-bold mt-6 gap-2">
              {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4" />}
              {isEn ? "Save API Key" : "حفظ"}
            </Button>
          </div>
        </>
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
