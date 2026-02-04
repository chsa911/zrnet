import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

const SUPPORTED = ["en", "de", "fr", "es", "pt-BR"];

const TRANSLATIONS = {
  en: {
    // header
    lang_label: "Language",
    search_placeholder: "Search books or authors…",
    nav_about: "About me",
    nav_home: "Home",
    nav_readingdiary: "Reading diary",
    nav_contact: "Contact",
    nav_newsletter: "Newsletter",
    nav_shop: "Shop",
    nav_faq: "FAQ",
    nav_login: "Login",
    nav_youtube: "YouTube",
    nav_tiktok: "TikTok",
    nav_instagram: "Instagram",
    stats_books_in: "Books in",
    stats_loading: "loading…",
    stats_finished: "Finished",
    stats_abandoned: "Abandoned",
    stats_top: "Top",
    stats_in_stock: "In stock",
    stats_live_db: "live from DB",
    stats_error: "Could not load stats: {error}",
    intro_quote: "“I don’t need a lot… all I need is a top-book.”",

    // home intro
    intro_lead:
      "This saying best explains my time consuming book procurement, administration and reading process and my disruptive reading technique which enables me to read every free minute and to select only pageturners out of a big variety of books. A dream!!",
    intro_explore: "Explore",
    li1_prefix: "My",
    li1_link: "reading technique",
    li1_img_alt: "Reading technique",
    li2_prefix1: "My",
    li2_link_equipment: "equipment",
    li2_suffix1: "and",
    li2_mid: "my recently found treasures",
    li2_img1_alt: "Book shelf",
    li2_img2_alt: "Treasure chest",
    li3_prefix: "My",
    li3_link_authors: "most read authors",
    li3_suffix: "and many more",
    li3_img_alt: "Authors",
    li4_prefix: "My",
    li4_link_sources: "sources",
    li4_mid: "and my",
    li4_link_books: "procurement process",
    li5_prefix: "My",
    li5_link_podcast: "podcast",
    li5_mid: "and my interview with",
    li5_link_bookdeckel: "BookDeckel",
    note_html:
      'Everything is based on a database which is connected to my physical bookshelf. <br/>More about how and why I did this is explained in <a href="/ueber_mich.html">About me</a>.',
  nav_impressum: "Imprint",
    },

  de: {
    // header
    lang_label: "Sprache",
    search_placeholder: "Bücher oder Autoren suchen…",
    nav_about: "Über mich",
    nav_home: "Start",
    nav_readingdiary: "Lesetagebuch",
    nav_contact: "Kontakt",
    nav_newsletter: "Newsletter",
    nav_shop: "Shop",
    nav_faq: "FAQ",
    nav_login: "Login",
    nav_youtube: "YouTube",
    nav_tiktok: "TikTok",
    nav_instagram: "Instagram",
    stats_books_in: "Bücher in",
    stats_loading: "lädt…",
    stats_finished: "Fertig",
    stats_abandoned: "Abgebrochen",
    stats_top: "Top",
    stats_in_stock: "Im Bestand",
    stats_live_db: "live aus DB",
    stats_error: "Konnte Stats nicht laden: {error}",
    intro_quote: "„Ich brauche nicht viel… ich brauche nur ein Top-Buch.“",

    // home intro
    intro_lead:
      "Dieses Zitat beschreibt am besten meinen zeitintensiven Prozess rund um Buchbeschaffung, Administration und Lesen – sowie meine disruptive Lesetechnik, die es mir ermöglicht, jede freie Minute zu lesen und aus einer großen Auswahl nur echte Pageturner zu wählen. Ein Traum!!",
    intro_explore: "Entdecken",
    li1_prefix: "Meine",
    li1_link: "Lesetechnik",
    li1_img_alt: "Lesetechnik",
    li2_prefix1: "Meine",
    li2_link_equipment: "Ausrüstung",
    li2_suffix1: "und",
    li2_mid: "meine zuletzt gefundenen Schätze",
    li2_img1_alt: "Bücherschrank",
    li2_img2_alt: "Schatzkiste",
    li3_prefix: "Meine",
    li3_link_authors: "meistgelesenen Autoren",
    li3_suffix: "und vieles mehr",
    li3_img_alt: "Autoren",
    li4_prefix: "Meine",
    li4_link_sources: "Quellen",
    li4_mid: "und mein",
    li4_link_books: "Beschaffungsprozess",
    li5_prefix: "Mein",
    li5_link_podcast: "Podcast",
    li5_mid: "und mein Interview mit",
    li5_link_bookdeckel: "BookDeckel",
    note_html:
      'Alles basiert auf einer Datenbank, die mit meinem physischen Bücherregal verbunden ist. <br/>Mehr darüber erkläre ich in <a href="/ueber_mich.html">Über mich</a>.',
  nav_impressum: "Impressum",
    },
};

function interpolate(template, vars) {
  return String(template || "").replace(/\{(\w+)\}/g, (_, k) => (vars?.[k] ?? ""));
}

function detectInitialLocale() {
  const saved = localStorage.getItem("zr_locale");
  if (saved && SUPPORTED.includes(saved)) return saved;

  // default language
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
    const dict = TRANSLATIONS[locale] || TRANSLATIONS.en;
    return (key, vars) => interpolate(dict[key] ?? TRANSLATIONS.en[key] ?? key, vars);
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