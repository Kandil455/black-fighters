import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const LocaleContext = createContext(null);

import ar from "@/i18n/ar.json";
import en from "@/i18n/en.json";

const MESSAGES = {
  ar,
  en,
};

export function LocaleProvider({ children }) {
  const [locale, setLocaleState] = useState(() => localStorage.getItem("iiiak_locale") || "en");
  const [isDual, setIsDual] = useState(() => localStorage.getItem("iiiak_dual_mode") === "true");

  const setLocale = (next) => {
    const valid = next === "en" ? "en" : "ar";
    setLocaleState(valid);
    localStorage.setItem("iiiak_locale", valid);
  };

  const toggleDual = () => {
    setIsDual((prev) => {
      const next = !prev;
      localStorage.setItem("iiiak_dual_mode", String(next));
      return next;
    });
  };

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = locale === "ar" ? "rtl" : "ltr";
  }, [locale]);

  const value = useMemo(() => ({
    locale,
    isDual,
    dir: locale === "ar" ? "rtl" : "ltr",
    setLocale,
    toggleDual,
    t: (key, fallback) => {
      if (isDual) {
        const arText = MESSAGES.ar[key] || fallback || key;
        const enText = MESSAGES.en[key] || fallback || key;
        return arText === enText ? arText : `${arText} • ${enText}`;
      }
      return MESSAGES[locale]?.[key] || fallback || key;
    },
  }), [locale, isDual]);

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const context = useContext(LocaleContext);
  if (!context) throw new Error("useLocale must be used within LocaleProvider");
  return context;
}
