// frontend/src/utils/bookLanguages.js
// Small UI strings for translated titles / language info on public pages.
// Kept here (not in i18n/*.json) so the feature is self-contained.

const LABELS = {
  "de": {
    "original_title": "Originaltitel",
    "edition": "Meine Ausgabe",
    "original": "Original",
    "kind_official": "Titel der deutschen Ausgabe",
    "kind_free": "Sinngemäß übersetzt",
    "kind_free_no": "Sinngemäß übersetzt – nicht auf Deutsch erschienen"
  },
  "en": {
    "original_title": "Original title",
    "edition": "My edition",
    "original": "Original",
    "kind_official": "Title of the English edition",
    "kind_free": "Freely translated title",
    "kind_free_no": "Freely translated – not published in English"
  },
  "fr": {
    "original_title": "Titre original",
    "edition": "Mon édition",
    "original": "Original",
    "kind_official": "Titre de l'édition française",
    "kind_free": "Titre traduit librement",
    "kind_free_no": "Traduit librement – non publié en français"
  },
  "es": {
    "original_title": "Título original",
    "edition": "Mi edición",
    "original": "Original",
    "kind_official": "Título de la edición en español",
    "kind_free": "Título traducido libremente",
    "kind_free_no": "Traducido libremente – no publicado en español"
  },
  "pt-BR": {
    "original_title": "Título original",
    "edition": "Minha edição",
    "original": "Original",
    "kind_official": "Título da edição em português",
    "kind_free": "Título traduzido livremente",
    "kind_free_no": "Traduzido livremente – não publicado em português"
  }
};

export function bookLangLabel(locale, key) {
  return (LABELS[locale] || LABELS.en)[key] || LABELS.en[key] || key;
}

/** Name of a 2-letter language code in the given UI locale, e.g. ("en","de") -> "Englisch". */
export function languageName(code, locale) {
  const c = String(code || "").trim();
  if (!c) return "";
  try {
    return new Intl.DisplayNames([locale || "en"], { type: "language" }).of(c) || c;
  } catch {
    return c;
  }
}
