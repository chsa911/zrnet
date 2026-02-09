import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

import en from "../i18n/en.json";
import de from "../i18n/de.json";
import fr from "../i18n/fr.json";
import es from "../i18n/es.json";
import ptBR from "../i18n/pt-BR.json";

const SUPPORTED = ["en", "de", "fr", "es", "pt-BR"];

const TRANSLATIONS = {
  en,
  de,
  fr,
  es,
  "pt-BR": ptBR,
};

function interpolate(template, vars) {
  return String(template ?? "").replace(/\{(\w+)\}/g, (_, k) => String(vars?.[k] ?? ""));
}

function detectInitialLocale() {
  const saved = localStorage.getItem("zr_locale");
  if (saved && SUPPORTED.includes(saved)) return saved;

  const nav = (navigator.language || "").trim(); // e.g. "de-DE"
  if (SUPPORTED.includes(nav)) return nav;

  const base = nav.split("-")[0]; // "de"
  if (SUPPORTED.includes(base)) return base;

  return "en";
}

const I18nContext = createContext(null);

export function I18nProvider({ children }) {
  const [locale, setLocale] = useState(detectInitialLocale);

  useEffect(() => {
    localStorage.setItem("zr_locale", locale);
    document.documentElement.lang = locale;
  }, [locale]);

  const t = useMemo(() => {
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en || {};
    const fallback = TRANSLATIONS.en || {};
    return (key, vars) => {
      const raw = dict[key] ?? fallback[key] ?? key;
      return interpolate(raw, vars);
    };
  }, [locale]);

  const value = useMemo(
    () => ({
      locale,
      setLocale,
      t,
      supported: SUPPORTED,
    }),
    [locale, t]
  );

  return <I18nContext.Provider value={value}>{children}</I18nContext.Provider>;
}

export function useI18n() {
  const ctx = useContext(I18nContext);
  if (!ctx) throw new Error("useI18n must be used inside <I18nProvider>");
  return ctx;
}
