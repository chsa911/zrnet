// backend/scripts/buildSeoStatic.js
//
// Builds backend/seo/static-pages.json from the English UI texts in
// frontend/src/i18n/en.json. The backend container cannot read the frontend
// sources, so the texts crawlers see for the static pages are copied here.
//
// Re-run after changing English texts of the home / info / news / coaching pages:
//   node backend/scripts/buildSeoStatic.js
const fs = require("fs");
const path = require("path");

const EN = path.resolve(__dirname, "../../frontend/src/i18n/en.json");
const OUT = path.resolve(__dirname, "../seo/static-pages.json");

const en = JSON.parse(fs.readFileSync(EN, "utf8"));
const t = (k) => {
  const v = en[k];
  return typeof v === "string" ? v.trim() : "";
};
const list = (...keys) => keys.map(t).filter(Boolean);

const pages = {
  "/": {
    title: t("seo.home.title"),
    description: t("seo.home.desc"),
    h1: t("home_title"),
    paragraphs: list("home_hero_p1", "home_hero_title", "home_hero_lede", "intro_lead"),
    steps: list("home_how_1", "home_how_2", "home_how_3", "home_how_4", "home_how_5"),
  },
  "/titles": { title: t("seo.titles.title"), description: t("seo.titles.desc"), h1: t("seo.titles.title") },
  "/collection": {
    title: t("collection.title"),
    description: t("seo.collection.desc"),
    h1: t("collection.title"),
  },
  "/authors": { title: t("ao_title"), description: t("seo.authors.desc"), h1: t("ao_title") },
  "/top-authors": {
    title: t("seo.top_authors.title"),
    description: t("seo.top_authors.desc"),
    h1: t("seo.top_authors.title"),
  },
  "/bookthemes": {
    title: t("seo.themes.title"),
    description: t("seo.themes.desc"),
    h1: t("bt_title"),
    paragraphs: list("bt_lede"),
  },
  "/news": { title: t("news.title"), description: t("news.lede"), h1: t("news.title"), paragraphs: list("news.lede") },
  "/coaching": {
    title: t("coaching.title"),
    description: t("coaching.lede"),
    h1: t("coaching.title"),
    paragraphs: list("coaching.lede", "coaching.benefit_1", "coaching.benefit_2", "coaching.benefit_3"),
  },
  "/info/how-it-works": {
    title: t("info.technik.title"),
    description: t("info.technik.lede") || t("info.technik.p1"),
    h1: t("info.technik.title"),
    paragraphs: list(
      "info.technik.lede",
      "info.technik.p1",
      "info.technik.p2",
      "info.technik.p3",
      "info.technik.p4",
      "info.technik.card1.title",
      "info.technik.card1.text",
      "info.technik.card2.title",
      "info.technik.card2.text",
      "info.technik.card3.title",
      "info.technik.card3.text",
      "info.technik.callout"
    ),
  },
  "/info/sourcing": {
    title: t("info.beschaffung.title"),
    description: t("info.beschaffung.p1"),
    h1: t("info.beschaffung.title"),
    paragraphs: list("info.beschaffung.p1", "info.beschaffung.p2", "info.beschaffung.p3"),
  },
  "/info/faq": {
    title: t("info.faq.title"),
    description: t("info.faq.lede") || t("info.faq.a1"),
    h1: t("info.faq.title"),
    paragraphs: list("info.faq.lede"),
    faq: [1, 2, 3, 4, 5, 6, 7, 8]
      .map((i) => ({ q: t(`info.faq.q${i}`), a: t(`info.faq.a${i}`) }))
      .filter((x) => x.q && x.a),
  },
  "/info/impressum": { title: t("info.impressum.title"), h1: t("info.impressum.title") },
  "/info/datenschutz": { title: t("info.privacy.title"), h1: t("info.privacy.title") },
};

fs.mkdirSync(path.dirname(OUT), { recursive: true });
fs.writeFileSync(OUT, JSON.stringify(pages, null, 2) + "\n");
console.log(`wrote ${OUT} (${Object.keys(pages).length} pages)`);
