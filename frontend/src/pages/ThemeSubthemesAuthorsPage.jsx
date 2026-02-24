import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { listBooks } from "../api/books";
import { listThemesSummary } from "../api/themes";
import "./ThemeSubthemesAuthorsPage.css";

// Same tile look as your Featured tiles on BookThemesPage.
// Left side: subtheme tiles (K2, Mount Everest, ...)
// Right side: author tiles (Messner, Kammerlander, Krakauer, ...) with images.

const FALLBACK_IMG = "/assets/images/allgemein/buecherschrank_ganz_offen.avif";

// Presets (extend anytime). Key should match your theme abbr from DB.
const SUBTHEME_PRESETS = {
  bergsteigen: [
    { key: "k2", name: "K2", keywords: ["k2"] },
    { key: "everest", name: "Mount Everest", keywords: ["everest"] },
    { key: "himalaya", name: "Himalaya", keywords: ["himalaya", "himalaja"] },
    { key: "alps", name: "The Alps", keywords: ["alps", "alpen"] },
    { key: "annapurna", name: "Annapurna", keywords: ["annapurna"] },
    { key: "nanga", name: "Nanga Parbat", keywords: ["nanga"] },
  ],
  mountaineering: [
    { key: "k2", name: "K2", keywords: ["k2"] },
    { key: "everest", name: "Mount Everest", keywords: ["everest"] },
    { key: "himalaya", name: "Himalaya", keywords: ["himalaya", "himalaja"] },
    { key: "alps", name: "The Alps", keywords: ["alps", "alpen"] },
  ],
  "mt.": [
    { key: "k2", name: "K2", keywords: ["k2"] },
    { key: "everest", name: "Mount Everest", keywords: ["everest"] },
    { key: "himalaya", name: "Himalaya", keywords: ["himalaya", "himalaja"] },
    { key: "alps", name: "The Alps", keywords: ["alps", "alpen"] },
  ],
  "fs.": [
    {
      key: "iran",
      name: "Iran",
      keywords: ["iran", "mahmoody", "betty mahmoody"],
      img: "/assets/images/subthemes/iran.jpg",
    },
    {
      key: "kenia",
      name: "Kenia",
      keywords: ["kenia", "kenya", "hofmann", "corinne hofmann"],
      img: "/assets/images/subthemes/kenia.jpg",
    },
  ],
  fs: [
    {
      key: "iran",
      name: "Iran",
      keywords: ["iran", "mahmoody", "betty mahmoody"],
      img: "/assets/images/subthemes/iran.avif",
    },
    {
      key: "kenia",
      name: "Kenia",
      keywords: ["kenia", "kenya", "hofmann", "corinne hofmann"],
      img: "/assets/images/subthemes/kenia.avif",
    },
  ],
};

function normKey(v) {
  // no regex here (so this file can live in the canvas safely)
  const s = String(v || "").toLowerCase().trim();
  let out = "";
  let prevSpace = false;
  for (let i = 0; i < s.length; i += 1) {
    const ch = s[i];
    const isSpace = ch <= " ";
    if (isSpace) {
      if (!prevSpace) out += " ";
      prevSpace = true;
    } else {
      out += ch;
      prevSpace = false;
    }
  }
  return out.trim();
}

function containsAny(hayRaw, needles) {
  const hay = normKey(hayRaw);
  for (let i = 0; i < (needles || []).length; i += 1) {
    const n = normKey(needles[i]);
    if (n && hay.includes(n)) return true;
  }
  return false;
}

function bookHay(b) {
  // include author fields too, so subthemes can be keyed by author names (e.g. Mahmoody, Hofmann)
  return [
    b && (b.title_display || b.titleDisplay || b.title),
    b && b.full_title,
    b && b.comment,
    b && b.title_en,
    b && b.BKw,
    b && b.BKw1,
    b && b.BKw2,
    b && (b.author_name_display || b.author_display || b.BAutor || b.Autor),
  ]
    .filter(Boolean)
    .join(" ");
}

function pickPresetKey(abbrRaw) {
  const a = normKey(abbrRaw);
  if (SUBTHEME_PRESETS[a]) return a;
  const keys = Object.keys(SUBTHEME_PRESETS);
  for (let i = 0; i < keys.length; i += 1) {
    if (a.includes(keys[i])) return keys[i];
  }
  return a;
}

function Tile(props) {
  const imgSrc = props.imgSrc;
  const title = props.title;
  const count = props.count;
  const active = !!props.active;
  const onClick = props.onClick;

  return (
    <button
      type="button"
      className={"stp-tile" + (active ? " is-active" : "")}
      onClick={onClick}
      aria-pressed={active}
      title={title}
    >
      <img
        className="stp-img"
        src={imgSrc || FALLBACK_IMG}
        alt={title}
        loading="lazy"
        decoding="async"
        onError={(e) => {
          e.currentTarget.src = FALLBACK_IMG;
        }}
      />
      <div className="stp-overlay" />
      <div className="stp-label">
        <div className="stp-name">{title}</div>
        {typeof count === "number" ? <div className="stp-count">{count}</div> : null}
      </div>
    </button>
  );
}

export default function ThemeSubthemesAuthorsPage() {
  const params = useParams();
  const navigate = useNavigate();

  const abbr = useMemo(() => decodeURIComponent(params.abbr || ""), [params.abbr]);

  const [themeMeta, setThemeMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [books, setBooks] = useState([]);

  const [subKey, setSubKey] = useState("all");

  const acRef = useRef(null);

  // Theme meta
  useEffect(() => {
    let alive = true;
    (async () => {
      setMetaLoading(true);
      try {
        const tRes = await listThemesSummary();
        if (!alive) return;
        const list = Array.isArray(tRes) ? tRes : tRes && (tRes.items || tRes.data) || [];
        const found = (list || []).find((t) => String(t && t.abbr || "").trim() === String(abbr).trim());
        setThemeMeta(found || null);
      } catch {
        setThemeMeta(null);
      } finally {
        if (alive) setMetaLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [abbr]);

  // Books for this theme (used to compute authors + counts)
  useEffect(() => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    (async () => {
      setBusy(true);
      setErr("");

      try {
        const res = await listBooks({
          page: 1,
          limit: 2000,
          sortBy: "BEind",
          order: "desc",
          theme: abbr,
        });

        if (ac.signal.aborted) return;
        setBooks(res && res.items || []);
      } catch (e) {
        if (ac.signal.aborted) return;
        setBooks([]);
        setErr((e && e.message) || String(e));
      } finally {
        if (!ac.signal.aborted) setBusy(false);
      }
    })();

    return () => ac.abort();
  }, [abbr]);

  const themeTitle = (themeMeta && themeMeta.full_name) || abbr || "Theme";
  const themeImg = (themeMeta && themeMeta.image_path) || FALLBACK_IMG;

  const presetKey = useMemo(() => pickPresetKey(abbr), [abbr]);

  const subthemes = useMemo(() => {
    const preset = SUBTHEME_PRESETS[presetKey] || [];

    return preset.map((st) => {
      const kw = st.keywords || [];
      let c = 0;
      for (let i = 0; i < books.length; i += 1) {
        if (containsAny(bookHay(books[i]), kw)) c += 1;
      }
      const img = st.img || themeImg;
      return { key: st.key, name: st.name, keywords: kw, count: c, img };
    });
  }, [books, presetKey, themeImg]);

  const activeSubtheme = useMemo(() => {
    if (subKey === "all") return null;
    for (let i = 0; i < subthemes.length; i += 1) {
      if (subthemes[i].key === subKey) return subthemes[i];
    }
    return null;
  }, [subKey, subthemes]);

  const filteredBooks = useMemo(() => {
    if (!activeSubtheme) return books;
    const kw = activeSubtheme.keywords || [];
    return books.filter((b) => containsAny(bookHay(b), kw));
  }, [books, activeSubtheme]);

  const authors = useMemo(() => {
    const map = new Map();

    for (let i = 0; i < filteredBooks.length; i += 1) {
      const b = filteredBooks[i];
      const name = (b && (b.author_name_display || b.author_display || b.BAutor || b.Autor)) || "";
      const key = String(name || "").trim();
      if (!key) continue;

      if (!map.has(key)) {
        const cover = b && b.id ? ("/assets/covers/" + String(b.id).trim() + ".jpg") : themeImg;
        map.set(key, { name: key, count: 0, img: cover });
      }

      map.get(key).count += 1;
    }

    const arr = Array.from(map.values());
    arr.sort((a, b) => (b.count - a.count) || a.name.localeCompare(b.name));
    return arr;
  }, [filteredBooks, themeImg]);

  return (
    <section className="zr-section stp-page" aria-busy={busy ? "true" : "false"}>
      <div className="stp-top">
        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          type="button"
          onClick={() => navigate("/bookthemes")}
        >
          ← Back to themes
        </button>

        <div className="stp-head">
          <h1 className="stp-h1">{metaLoading ? "Theme…" : themeTitle}</h1>
          <p className="zr-lede stp-lede">Pick a subtheme on the left — authors update on the right.</p>
        </div>
      </div>

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {busy ? <div className="zr-alert">Loading…</div> : null}

      <div className="stp-split">
        <div>
          <div className="stp-bar">
            <div className="stp-title">Subthemes</div>
          </div>

          {subthemes.length ? (
            <div className="stp-tiles">
              {subthemes.map((st) => (
                <Tile
                  key={st.key}
                  imgSrc={st.img}
                  title={st.name}
                  count={st.count}
                  active={subKey === st.key}
                  onClick={() => setSubKey(subKey === st.key ? "all" : st.key)}
                />
              ))}
            </div>
          ) : (
            <div className="zr-alert" style={{ marginTop: 10 }}>
              No subthemes preset for <b>{abbr}</b> yet.
            </div>
          )}
        </div>

        <div>
          <div className="stp-bar">
            <div>
              <div className="stp-title">Authors</div>
            </div>
          </div>

          <div className="stp-tiles stp-tiles--authors">
            {authors.map((a) => (
              <Tile
                key={a.name}
                imgSrc={a.img}
                title={a.name}
                count={a.count}
                active={false}
                onClick={() => navigate("/author/" + encodeURIComponent(a.name))}
              />
            ))}
          </div>

          {!busy && authors.length === 0 ? (
            <div className="zr-alert" style={{ marginTop: 10 }}>
              No authors match your filters.
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}

/*
Create: frontend/src/pages/ThemeSubthemesAuthorsPage.css

.stp-page{max-width:1120px;margin:0 auto;padding:0 16px}
.stp-top{display:flex;gap:12px;align-items:flex-start;flex-wrap:wrap;margin-bottom:14px}
.stp-head{min-width:0}
.stp-h1{margin:0;font-weight:950;letter-spacing:-0.03em;font-size:clamp(26px,3vw,40px);line-height:1.06}
.stp-lede{margin-top:6px}

.stp-split{display:grid;grid-template-columns:1fr 1.4fr;gap:18px;align-items:start}
@media (max-width: 920px){.stp-split{grid-template-columns:1fr}}

.stp-bar{display:flex;align-items:flex-end;justify-content:space-between;gap:10px;flex-wrap:wrap;margin-bottom:10px}
.stp-title{font-weight:950;letter-spacing:-0.02em;font-size:18px}
.stp-hint{font-size:12px;opacity:0.75;font-weight:800;margin-top:2px}
.stp-search{min-width:220px}

.stp-tiles{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.stp-tiles--authors{grid-template-columns:repeat(3,minmax(0,1fr))}
@media (max-width: 720px){.stp-tiles--authors{grid-template-columns:repeat(2,minmax(0,1fr))}}

.stp-tile{position:relative;border:1px solid rgba(0,0,0,0.10);border-radius:16px;overflow:hidden;background:#fff;padding:0;cursor:pointer;text-align:left;aspect-ratio:1/1;box-shadow:0 1px 6px rgba(0,0,0,0.06);transition:transform .14s ease, box-shadow .14s ease, border-color .14s ease}
.stp-tile:hover{transform:translateY(-1px);box-shadow:0 10px 22px rgba(0,0,0,0.16);border-color:rgba(0,0,0,0.14)}
.stp-tile.is-active{outline:2px solid rgba(0,0,0,0.35);outline-offset:2px}

.stp-img{width:100%;height:100%;object-fit:cover;display:block;background:#f2f2f2}
.stp-overlay{position:absolute;inset:0;background:linear-gradient(180deg,rgba(0,0,0,0.00) 0%, rgba(0,0,0,0.55) 100%)}

.stp-label{position:absolute;left:10px;right:10px;bottom:10px;display:flex;align-items:flex-end;justify-content:space-between;gap:10px;color:#fff}
.stp-name{font-weight:950;letter-spacing:-0.02em;font-size:14px;line-height:1.15;display:-webkit-box;-webkit-line-clamp:2;-webkit-box-orient:vertical;overflow:hidden}
.stp-count{flex:0 0 auto;min-width:34px;height:26px;padding:0 10px;border-radius:999px;background:rgba(255,255,255,0.16);border:1px solid rgba(255,255,255,0.22);display:inline-flex;align-items:center;justify-content:center;font-weight:900;font-size:12px}

.stp-pillActive{background:rgba(0,0,0,0.08)}

Routing:
- Add in App.jsx:
  Route path bookthemes slash :abbr slash subthemes
- Update BookThemesPage navigation to go to that route.
*/
