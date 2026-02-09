import React, { useMemo, useState } from "react";
import "./BookThemesPage.css";
import { useI18n } from "../context/I18nContext";


const DEFAULT_IMG = "/assets/images/allgemein/buecherschrank_ganz_offen.avif";
// Edit this list to match your real favorites.
// Images live in /public so you can reference them like "/assets/...".
const THEMES = [

{
    slug: "frauenschicksale",
    title: "Frauenschicksale",
    blurb: "Frauenleben zwischen Gesellschaft, Familie, Politik und persönlicher Freiheit.",
    tags: ["geschichte", "biografie", "gesellschaft"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "starke-frauen",
    title: "Starke Frauen",
    blurb: "Porträts, Biografien und Geschichten über Mut, Widerstand und Selbstbestimmung.",
    tags: ["biografie", "gesellschaft", "inspiration"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "weltkriege",
    title: "1. & 2. Weltkrieg",
    blurb: "Ursachen, Fronten, Alltag, Widerstand und langfristige Folgen.",
    tags: ["geschichte", "krieg", "20-jahrhundert"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "diktatoren-totalitarismus",
    title: "Diktatoren & Totalitarismus",
    blurb: "Machtmechanismen, Propaganda, Terror – und warum Systeme kippen.",
    tags: ["politik", "geschichte", "20-jahrhundert"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "mao",
    title: "Mao",
    blurb: "Maoismus, Staatsaufbau, Ideologie und Umbrüche in China.",
    tags: ["china", "politik", "geschichte"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "stalin",
    title: "Stalin",
    blurb: "Sowjetunion, Repression, Krieg und die Struktur des Systems.",
    tags: ["russland", "politik", "geschichte"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "china-kulturrevolution",
    title: "China & Kulturrevolution",
    blurb: "Kulturrevolution, Umwälzungen, persönliche Schicksale und politische Dynamik.",
    tags: ["china", "geschichte", "politik"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "romanows-zaren",
    title: "Romanows & Zaren",
    blurb: "Dynastie, Hof, Machtpolitik und der Weg in die Krise.",
    tags: ["russland", "geschichte", "monarchie"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "russische-revolution",
    title: "Russische Revolution",
    blurb: "Revolution(en), Umbruch, Bürgerkrieg und die Neuordnung eines Reichs.",
    tags: ["russland", "geschichte", "politik"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "mafia",
    title: "Mafia",
    blurb: "Clans, Codes, Macht und die Grauzonen zwischen Staat und Unterwelt.",
    tags: ["crime", "gesellschaft", "zeitgeschichte"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "hells-angels",
    title: "Hells Angels & Rocker",
    blurb: "Mythos, Milieu, Regeln – zwischen Rebellion und organisierter Struktur.",
    tags: ["crime", "gesellschaft", "zeitgeschichte"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "dschingis-khan",
    title: "Dschingis Khan",
    blurb: "Aufstieg der Mongolen, Eroberungen und Verwaltung eines Weltreichs.",
    tags: ["geschichte", "mittelalter", "asien"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "marco-polo",
    title: "Marco Polo & Reisen",
    blurb: "Entdeckerberichte, Handelsrouten und Weltbilder der Zeit.",
    tags: ["reise", "geschichte", "handel"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "geschichte-allgemein",
    title: "Geschichte (Allgemein)",
    blurb: "Große Linien, Wendepunkte, Imperien – das große Ganze.",
    tags: ["geschichte", "überblick"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "mittelalter",
    title: "Mittelalter",
    blurb: "Herrschaft, Religion, Alltag, Kriege und Kulturen Europas & darüber hinaus.",
    tags: ["geschichte", "mittelalter"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "altes-rom",
    title: "Altes Rom",
    blurb: "Republik, Imperium, Politik, Legionen und der römische Alltag.",
    tags: ["geschichte", "antike", "rom"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "altes-griechenland",
    title: "Altes Griechenland",
    blurb: "Stadtstaaten, Kriege, Philosophie und die Geburt politischer Ideen.",
    tags: ["geschichte", "antike", "griechenland"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "autobiografien",
    title: "Autobiografien",
    blurb: "Lebenswege aus erster Hand – ehrlich, kantig, inspirierend.",
    tags: ["biografie", "memoir"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "tierwelt",
    title: "Tierwelt",
    blurb: "Verhalten, Evolution und überraschende Intelligenz in der Natur.",
    tags: ["natur", "tiere", "wissenschaft"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "natur",
    title: "Natur",
    blurb: "Ökosysteme, Landschaften, Wildnis – und was sie mit uns macht.",
    tags: ["natur", "reise"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "amazonas",
    title: "Amazonas",
    blurb: "Regenwald, Expeditionen, Artenvielfalt und Konflikte um Lebensräume.",
    tags: ["natur", "südamerika", "reise"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "afrika",
    title: "Afrika",
    blurb: "Geschichte, Regionen, Kolonialzeit und moderne Entwicklungen.",
    tags: ["geschichte", "reise", "kultur"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "altes-japan",
    title: "Altes Japan",
    blurb: "Shogunate, Samurai, Kultur und die lange Linie der Traditionen.",
    tags: ["japan", "geschichte", "kultur"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "wall-street-wirtschaft",
    title: "Wall Street & Wirtschaft",
    blurb: "Märkte, Krisen, Macht von Geld – und die Geschichten dahinter.",
    tags: ["wirtschaft", "finanzen", "zeitgeschichte"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },
  {
    slug: "gesundheit",
    title: "Gesundheit",
    blurb: "Körper, Psyche, Routinen – wissenschaftlich, praktisch und motivierend.",
    tags: ["gesundheit", "wissenschaft", "alltag"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "bergsteigen-himalaya",
    title: "Bergsteigen & Himalaya",
    blurb: "Extrembedingungen, Entscheidungen am Limit, Expeditionen und Überleben.",
    tags: ["abenteuer", "reise", "natur"],
    image: DEFAULT_IMG,
    books: [{ title: "Titel eintragen…", note: "" }],
  },

  {
    slug: "filmfiguren-80er-action",
    title: "Filmfiguren (Rambo, Beverly Hills Cop)",
    blurb: "Ikonische Figuren, große Sprüche und 80er-Action / Buddy-Cop-Vibes.",
    tags: ["film", "popkultur", "action"],
    image: DEFAULT_IMG,
    books: [
      { title: "Rambo (First Blood)", note: "Grenzerfahrung, Trauma, Überleben." },
      { title: "Beverly Hills Cop (Axel Foley)", note: "Buddy-Cop, Humor, Tempo." },
    ],
  },
];


function uniq(arr) {
  return Array.from(new Set(arr));
}

export default function BookThemesPage() {
  const { t } = useI18n();

  const [query, setQuery] = useState("");
  const [tag, setTag] = useState("all");
  const [sort, setSort] = useState("fav");
  const [active, setActive] = useState(null);

  const allTags = useMemo(() => {
    const tags = THEMES.flatMap((x) => x.tags || []);
    return ["all", ...uniq(tags).sort((a, b) => a.localeCompare(b))];
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    let items = THEMES.filter((th) => {
      if (tag !== "all" && !(th.tags || []).includes(tag)) return false;
      if (!q) return true;

      const hay = [
        th.title,
        th.blurb,
        ...(th.tags || []),
        ...(th.books || []).map((b) => b.title),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(q);
    });

    items = [...items].sort((a, b) => {
      if (sort === "books") return (b.books?.length || 0) - (a.books?.length || 0);
      if (sort === "alpha") return a.title.localeCompare(b.title);
      // "fav" keeps curated order in THEMES
      return 0;
    });

    return items;
  }, [query, tag, sort]);

  const activeTheme = useMemo(
    () => (active ? THEMES.find((x) => x.slug === active) : null),
    [active]
  );

  return (
    <>
      <section className="zr-hero zr-themeHero">
        <div className="zr-hero__text">
          <h1>{t("bt_title")}</h1>
          <p>{t("bt_lede")}</p>

          <div className="zr-themeTools">
            <input
              className="zr-input zr-themeSearch"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={t("bt_search_placeholder")}
              aria-label={t("bt_search_label")}
            />

            <select
              className="zr-select"
              value={tag}
              onChange={(e) => setTag(e.target.value)}
              aria-label={t("bt_filter_label")}
            >
              {allTags.map((x) => (
                <option key={x} value={x}>
                  {x === "all" ? t("bt_filter_all") : x}
                </option>
              ))}
            </select>

            <select
              className="zr-select"
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              aria-label={t("bt_sort_label")}
            >
              <option value="fav">{t("bt_sort_fav")}</option>
              <option value="books">{t("bt_sort_books")}</option>
              <option value="alpha">{t("bt_sort_alpha")}</option>
            </select>
          </div>

          <div className="zr-themeTip">
            <span className="zr-themeTip__label">{t("bt_tip_label")}</span>
            <span className="zr-themeTip__text">{t("bt_tip_text")}</span>
          </div>
        </div>

        <div className="zr-hero__media">
          <img
            className="zr-heroImg"
            src="/assets/images/allgemein/buecherschrank_ganz_offen.avif"
            alt={t("bt_hero_img_alt")}
          />

          <div className="zr-proof">
            <div className="zr-proof__title">{t("bt_stats_title")}</div>
            <div className="zr-proof__row">
              <span>{t("bt_stats_themes")}</span>
              <strong>{THEMES.length}</strong>
            </div>
            <div className="zr-proof__row">
              <span>{t("bt_stats_shown")}</span>
              <strong>{filtered.length}</strong>
            </div>
            <div className="zr-proof__note">{t("bt_stats_note")}</div>
          </div>
        </div>
      </section>

      <section className="zr-section" aria-label={t("bt_grid_label")}>
        <div className="zr-themeGrid">
          {filtered.map((th) => {
            const isActive = th.slug === active;
            const top = (th.books || []).slice(0, 3);

            return (
              <button
                key={th.slug}
                type="button"
                className={`zr-themeCard ${isActive ? "zr-themeCard--active" : ""}`}
                onClick={() => setActive((cur) => (cur === th.slug ? null : th.slug))}
                aria-pressed={isActive ? "true" : "false"}
              >
                <img className="zr-themeImg" src={th.image} alt="" />
                <div className="zr-themeBody">
                  <div className="zr-themeTitleRow">
                    <div className="zr-themeTitle">{th.title}</div>
                    <div className="zr-themeCount">{(th.books || []).length}</div>
                  </div>

                  <div className="zr-themeBlurb">{th.blurb}</div>

                  <div className="zr-themeTags">
                    {(th.tags || []).slice(0, 4).map((x) => (
                      <span key={x} className="zr-chip">
                        {x}
                      </span>
                    ))}
                  </div>

                  <div className="zr-themeMiniList" aria-label={t("bt_top_picks")}>
                    {top.map((b) => (
                      <div key={b.title} className="zr-themeMiniItem">
                        {b.title}
                      </div>
                    ))}
                  </div>

                  <div className="zr-themeCta">
                    {isActive ? t("bt_collapse") : t("bt_expand")}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        {!filtered.length ? (
          <div className="zr-alert" style={{ marginTop: 12 }}>
            {t("bt_empty")}
          </div>
        ) : null}

        {activeTheme ? (
          <div className="zr-card zr-themeDetail" id="theme-detail">
            <div className="zr-themeDetail__head">
              <div>
                <div className="zr-themeDetail__title">{activeTheme.title}</div>
                <div className="zr-themeDetail__blurb">{activeTheme.blurb}</div>
              </div>

              <button
                className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                onClick={() => setActive(null)}
                type="button"
              >
                {t("bt_close")}
              </button>
            </div>

            <div className="zr-themeDetail__tags">
              {(activeTheme.tags || []).map((x) => (
                <span key={x} className="zr-chip zr-chip--solid">
                  {x}
                </span>
              ))}
            </div>

            <div className="zr-themeDetail__list">
              {(activeTheme.books || []).map((b) => (
                <div key={b.title} className="zr-themeDetail__item">
                  <div className="zr-themeDetail__itemTitle">{b.title}</div>
                  {b.note ? <div className="zr-themeDetail__itemNote">{b.note}</div> : null}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </section>
    </>
  );
}