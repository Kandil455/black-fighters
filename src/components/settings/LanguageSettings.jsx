import React from "react";
import { Languages } from "lucide-react";
import { useLocale } from "@/lib/LocaleContext";

export default function LanguageSettings() {
  const { locale, setLocale } = useLocale();
  return (
    <div className="glass-card rounded-3xl border border-border/50 p-6">
      <div className="mb-4 flex items-center gap-2"><Languages className="h-5 w-5 text-primary" /><h2 className="font-black">App Language</h2></div>
      <div className="grid grid-cols-2 gap-2">
        <button type="button" onClick={() => setLocale("ar")} className={`h-11 rounded-xl border font-bold ${locale === "ar" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>العربية</button>
        <button type="button" onClick={() => setLocale("en")} className={`h-11 rounded-xl border font-bold ${locale === "en" ? "border-primary bg-primary/10 text-primary" : "border-border"}`}>English</button>
      </div>
    </div>
  );
}
