// frontend/src/pages/AuthorPage.jsx
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useParams, useSearchParams } from "react-router-dom";
import { getBook, listPublicBooks } from "../api/books";
import { getApiRoot } from "../api/apiRoot";
import BookForm from "../components/BookForm";
import "./AuthorPage.css";

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted")
  );
}

function buyFallback(author, title) {
  const q = [title, author].filter(Boolean).join(" ");
  return q ? `https://www.amazon.de/s?k=${encodeURIComponent(q)}` : "";
}

function normStatus(s) {
  return String(s || "").toLowerCase().trim();
}

const normKey = (s) =>
  String(s || "")
    .toLowerCase()
    .replace(/[^a-z0-9]/g, "");

function pick(obj, aliases) {
  if (!obj || !aliases?.length) return undefined;
  const keyMap = new Map(Object.keys(obj).map((k) => [normKey(k), k]));
  for (const alias of aliases) {
    const k = keyMap.get(normKey(alias));
    if (k != null) return obj[k];
  }
  return undefined;
}

function isUuid(v) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    String(v || "").trim()
  );
}

function idFromRaw(raw) {
  const idRaw =
    raw?.id ??
    raw?.book_id ??
    raw?.bookId ??
    raw?.isbn ??
    raw?.ISBN ??
    raw?.barcode ??
    raw?.BMarkb ??
    raw?.BMark ??
    raw?._id;

  const id = idRaw != null && String(idRaw).trim() ? String(idRaw).trim() : "";
  return id;
}

function displayStatus(st) {
  const s = normStatus(st);
  // UI labels (keep internal values unchanged)
  if (s === "finished") return "Completed";
  if (s === "abandoned") return "Not a match";
  if (s === "in_progress") return "Reading";
  if (s === "in_stock") return "To read";
  if (s === "wishlist") return "Wishlist";
  return s || "";
}

export default function AuthorPage() {
  const { author: authorParam } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const [sp, setSp] = useSearchParams();

  const authorQuery = useMemo(() => {
    try {
      return decodeURIComponent(String(authorParam || "")).trim();
    } catch {
      return String(authorParam || "").trim();
    }
  }, [authorParam]);

  // tab names:
  // on_hand | finished | abandoned | in_progress | in_stock (to read) | wishlist | top | all
  const tabRaw = (sp.get("tab") || "on_hand").toLowerCase();
  const tab =
    tabRaw === "read" || tabRaw === "completed"
      ? "finished"
      : tabRaw === "stock" || tabRaw === "toread"
        ? "in_stock"
        : tabRaw === "hand" || tabRaw === "onhand" || tabRaw === "now"
          ? "on_hand"
          : tabRaw;

  const q = sp.get("q") || "";
  const scrollParam = sp.get("scroll") || "";

  const listAnchorRef = useRef(null);
  const lastScrollRef = useRef("");

  const setTab = (next) => {
    const p = new URLSearchParams(sp);
    p.set("tab", next);
    setSp(p, { replace: true });
  };

  const setQ = (next) => {
    const p = new URLSearchParams(sp);
    if (next) p.set("q", next);
    else p.delete("q");
    setSp(p, { replace: true });
  };

  // If a link passes ?scroll=1, scroll the list into view once and then clean up the URL.
  useEffect(() => {
    const token = String(scrollParam || "");
    if (!token) {
      lastScrollRef.current = "";
      return;
    }
    if (lastScrollRef.current === token) return;
    lastScrollRef.current = token;

    const t1 = window.setTimeout(() => {
      const el = listAnchorRef.current;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 40);

    const t2 = window.setTimeout(() => {
      const p = new URLSearchParams(sp);
      p.delete("scroll");
      setSp(p, { replace: true });
    }, 120);

    return () => {
      window.clearTimeout(t1);
      window.clearTimeout(t2);
    };
  }, [scrollParam, sp, setSp]);

  // Resolve author if URL contains UUID: fetch author display/abbr, then query books by that.
  const [authorResolved, setAuthorResolved] = useState({
    id: null, // <-- important for author photo filename
    key: authorQuery,
    display: authorQuery,
    publishedTitles: null,
  });

  useEffect(() => {
    let alive = true;

    (async () => {
      const base = authorQuery || "";
      if (!base) {
        if (alive) setAuthorResolved({ id: null, key: "", display: "Author", publishedTitles: null });
        return;
      }

      // If not UUID -> use it directly as key (abbr/name_display)
      if (!isUuid(base)) {
        if (alive) setAuthorResolved({ id: null, key: base, display: base, publishedTitles: null });
        return;
      }

      // UUID: try resolving via public authors endpoint
      try {
        const res = await fetch(
          `${getApiRoot()}/public/authors/${encodeURIComponent(base)}`,
          { credentials: "include", cache: "no-store" }
        );
        if (!res.ok) throw new Error("author_lookup_failed");
        const a = await res.json();

        const display =
          a?.name_display ??
          a?.nameDisplay ??
          a?.display ??
          a?.full_name ??
          a?.fullName ??
          a?.name ??
          base;

        const key =
          a?.abbreviation ??
          a?.abbr ??
          a?.short ??
          a?.name_display ??
          a?.nameDisplay ??
          a?.name ??
          display;

        const ptRaw = a?.published_titles ?? a?.publishedTitles ?? null;
        const pt = Number(ptRaw);

        const id = a?.id ?? base;

        if (alive) {
          setAuthorResolved({
            id: String(id || "").trim() || base,
            key: String(key || "").trim() || base,
            display: String(display || "").trim() || base,
            publishedTitles: Number.isFinite(pt) && pt > 0 ? pt : null,
          });
        }
      } catch {
        if (alive) setAuthorResolved({ id: base, key: base, display: base, publishedTitles: null });
      }
    })();

    return () => {
      alive = false;
    };
  }, [authorQuery]);

  const [items, setItems] = useState([]);
  const [totalInDb, setTotalInDb] = useState(null);
  const [publishedTitles, setPublishedTitles] = useState(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState("");

  // admin session (enables quick edit)
  const [admin, setAdmin] = useState({ checking: true, ok: false });

  // admin quick edit modal state (reuses shared BookForm)
  const [editOpen, setEditOpen] = useState(false);
  const [editBusy, setEditBusy] = useState(false);
  const [editErr, setEditErr] = useState("");
  const [editId, setEditId] = useState("");
  const [editingBook, setEditingBook] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiRoot()}/admin/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled) setAdmin({ checking: false, ok: res.ok });
      } catch {
        if (!cancelled) setAdmin({ checking: false, ok: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Load books for this author (by resolved key)
  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setItems([]);
        setTotalInDb(null);

        const key = String(authorResolved.key || "").trim();
        if (!key) {
          setItems([]);
          setTotalInDb(0);
          return;
        }

        const res = await listPublicBooks({
          author: key,
          limit: 2000,
          offset: 0,
          signal: ac.signal,
        });

        if (ac.signal.aborted) return;

        const nextItems = Array.isArray(res?.items) ? res.items : [];
        setItems(nextItems);

        const t = Number(res?.total);
        setTotalInDb(Number.isFinite(t) ? t : nextItems.length);
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || "Failed to load author books");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [authorResolved.key]);

  // Published titles: prefer authorResolved, else take from list rows, else fallback to getBook(firstId)
  useEffect(() => {
    if (authorResolved.publishedTitles != null) {
      setPublishedTitles(authorResolved.publishedTitles);
      return;
    }

    const fromList = items
      .map((x) => x?.published_titles ?? x?.publishedTitles ?? null)
      .map((v) => Number(v))
      .find((n) => Number.isFinite(n) && n > 0);

    if (fromList != null) {
      setPublishedTitles(fromList);
      return;
    }

    let alive = true;
    const firstId = items?.map((x) => idFromRaw(x)).find((x) => !!x);
    if (!firstId) {
      setPublishedTitles(null);
      return () => {
        alive = false;
      };
    }

    (async () => {
      try {
        const full = await getBook(firstId);
        if (!alive) return;

        const v = full?.published_titles ?? full?.publishedTitles ?? null;
        const n = Number(v);
        setPublishedTitles(Number.isFinite(n) && n > 0 ? n : null);
      } catch {
        if (!alive) return;
        setPublishedTitles(null);
      }
    })();

    return () => {
      alive = false;
    };
  }, [items, authorResolved.publishedTitles]);

  // Prefer nicer heading
  const authorName = useMemo(() => {
    const d = String(authorResolved.display || "").trim();
    const first = items?.[0];
    const displayFromItems =
      first?.authorNameDisplay ||
      first?.author_name_display ||
      first?.author ||
      null;

    if (d && !isUuid(d)) return d;
    if (displayFromItems && String(displayFromItems).trim()) return String(displayFromItems).trim();
    return d || "Author";
  }, [authorResolved.display, items]);

  // Determine authorId for photo filename (best-effort)
  const authorIdForImage = useMemo(() => {
    if (authorResolved.id && isUuid(authorResolved.id)) return authorResolved.id;
    if (isUuid(authorParam)) return String(authorParam).trim();
    const first = items?.[0];
    const idFromItems =
      first?.author_id ??
      first?.authorId ??
      first?.authorID ??
      first?.author_uuid ??
      null;
    return isUuid(idFromItems) ? String(idFromItems).trim() : null;
  }, [authorResolved.id, authorParam, items]);

  // Grouping (client-side)
  const groups = useMemo(() => {
    const all = [];
    const onHand = [];
    const finished = [];
    const abandoned = [];
    const inProgress = [];
    const notStarted = [];
    const wishlist = [];
    const top = [];
    const shelf = [];

    for (const raw of items) {
      const id =
        idFromRaw(raw) ||
        `${normKey(raw?.title || raw?.BTitle || "book")}-${all.length + 1}`;

      const readingStatus = raw?.readingStatus || raw?.reading_status || raw?.status || "";
      const st = normStatus(readingStatus);

      const isTop = Boolean(
        raw?.top_book ??
          raw?.topBook ??
          pick(raw, ["BTop", "top", "Topbook", "top_book", "topBook"])
      );

      const onShelf = Boolean(raw?.isInStock ?? raw?.is_in_stock);

      const topRankRaw = pick(raw, [
        "top_rank", "topRank", "top_no", "topNo", "top_number", "topNumber",
        "BTopRank", "BTopNo",
      ]);
      const topRankNum = Number(topRankRaw);
      const topRank = Number.isFinite(topRankNum) ? topRankNum : null;

      const favRankRaw = pick(raw, [
        "favorite_rank", "favoriteRank", "fav_rank", "favRank",
        "BFavRank", "BFavNo",
      ]);
      const favRankNum = Number(favRankRaw);
      const favRank = Number.isFinite(favRankNum) ? favRankNum : null;

      const isFavorite = Boolean(
        pick(raw, [
          "favorite_book", "favoriteBook", "favorite",
          "is_favorite", "isFavorite", "BFav", "BFavorite",
        ])
      );

      const b = {
        id,
        title:
          raw?.titleDisplay ||
          raw?.bookTitleDisplay ||
          raw?.title ||
          raw?.BTitle ||
          "—",
        cover: raw?.cover || (id ? `/assets/covers/${id}.jpg` : ""),
        purchaseUrl: raw?.purchaseUrl || raw?.purchase_url || "",
        readingStatus,
        st,
        isTop,
        topRank,
        isFavorite,
        favRank,
        onShelf,
      };

      all.push(b);

      // On hand = available right now (not completed / not a match / not wishlist)
      if (st !== "finished" && st !== "abandoned" && st !== "wishlist") onHand.push(b);

      if (st === "finished") finished.push(b);
      if (st === "abandoned") abandoned.push(b);
      if (st === "in_progress") inProgress.push(b);
      if (st === "in_stock") notStarted.push(b);
      if (st === "wishlist") wishlist.push(b);
      if (isTop) top.push(b);
      if (onShelf) shelf.push(b);
    }

    return { all, onHand, finished, abandoned, inProgress, notStarted, wishlist, top, shelf };
  }, [items]);

  const counts = {
    onHand: groups.onHand.length,
    finished: groups.finished.length,
    abandoned: groups.abandoned.length,
    inProgress: groups.inProgress.length,
    notStarted: groups.notStarted.length,
    wishlist: groups.wishlist.length,
    top: groups.top.length,
    all: groups.all.length,
  };

  const showWishlist = counts.wishlist > 0;
  const showTop = counts.top > 0;
  const tabSafe = !showWishlist && tab === "wishlist" ? "on_hand" : tab;

  const activeList = useMemo(() => {
    const base =
      tabSafe === "on_hand"
        ? groups.onHand
        : tabSafe === "wishlist"
          ? groups.wishlist
          : tabSafe === "in_stock"
            ? groups.notStarted
            : tabSafe === "in_progress"
              ? groups.inProgress
              : tabSafe === "abandoned"
                ? groups.abandoned
                : tabSafe === "top"
                  ? groups.top
                  : tabSafe === "all"
                    ? groups.all
                    : groups.finished;

    const needle = q.trim().toLowerCase();
    if (!needle) return base;
    return base.filter((b) => String(b.title || "").toLowerCase().includes(needle));
  }, [tabSafe, q, groups]);

  const completedCount = counts.finished;
  const notMatchCount = counts.abandoned;
  const decisionTotal = completedCount + notMatchCount;
  const completionPct = decisionTotal > 0 ? (completedCount / decisionTotal) * 100 : null;

  const fmtPct = (x) => {
    if (!Number.isFinite(x)) return "—";
    return `${Math.round(x * 10) / 10}%`;
  };

  const favoriteBook = useMemo(() => {
    const favs = groups.all
      .filter((b) => b.isFavorite)
      .slice()
      .sort(
        (a, b) =>
          (a.favRank ?? 9999) - (b.favRank ?? 9999) ||
          String(a.title || "").localeCompare(String(b.title || ""))
      );

    if (favs.length) return favs[0];

    const topSorted = groups.top
      .slice()
      .sort(
        (a, b) =>
          (a.topRank ?? 9999) - (b.topRank ?? 9999) ||
          String(a.title || "").localeCompare(String(b.title || ""))
      );

    return topSorted.length ? topSorted[0] : null;
  }, [groups]);

  const top3Books = useMemo(() => {
    if (decisionTotal <= 10) return [];
    const topSorted = groups.top
      .slice()
      .sort(
        (a, b) =>
          (a.topRank ?? 9999) - (b.topRank ?? 9999) ||
          String(a.title || "").localeCompare(String(b.title || ""))
      );
    return topSorted.slice(0, 3);
  }, [decisionTotal, groups]);

  const jumpTo = (nextTab) => {
    setQ("");
    setTab(nextTab);
    window.setTimeout(() => {
      const el = listAnchorRef.current;
      if (el && typeof el.scrollIntoView === "function") {
        el.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }, 20);
  };

  function closeEdit() {
    setEditOpen(false);
    setEditErr("");
    setEditId("");
    setEditingBook(null);
  }

  async function openEdit(id) {
    if (!id) return;
    setEditOpen(true);
    setEditBusy(true);
    setEditErr("");
    setEditId(id);
    setEditingBook(null);

    try {
      const full = await getBook(id);
      setEditingBook(full);
    } catch (e) {
      setEditErr(e?.message || "Failed to load book");
    } finally {
      setEditBusy(false);
    }
  }

  function patchLocalList(id, patch) {
    if (!id) return;
    setItems((prev) =>
      prev.map((raw) => {
        const rid = idFromRaw(raw);
        if (rid !== id) return raw;

        const next = { ...raw, ...(patch || {}) };

        // title variants
        const t =
          pick(patch, [
            "title_display",
            "titleDisplay",
            "title",
            "bookTitleDisplay",
            "BTitle",
          ]) ?? null;

        if (t != null && String(t).trim()) {
          const s = String(t).trim();
          next.title = s;
          next.BTitle = s;
          next.title_display = s;
          next.titleDisplay = s;
          next.bookTitleDisplay = s;
        }

        // reading_status
        const st = pick(patch, ["reading_status", "readingStatus", "status"]);
        if (st !== undefined) {
          next.reading_status = st;
          next.readingStatus = st;
          next.status = st;
        }

        // top flag
        const tb = pick(patch, ["top_book", "topBook", "BTop", "top", "top_book"]);
        if (tb !== undefined) {
          next.top_book = tb;
          next.topBook = tb;
          next.BTop = tb;
        }

        // published_titles (author-level field, kept for compatibility)
        if (patch?.published_titles !== undefined) next.published_titles = patch.published_titles;
        if (patch?.publishedTitles !== undefined) next.publishedTitles = patch.publishedTitles;

        return next;
      })
    );
  }

  // close modal with Escape
  useEffect(() => {
    if (!editOpen) return;
    const onKey = (e) => {
      if (e.key === "Escape") closeEdit();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [editOpen]);

  const adminLoginHref = useMemo(() => {
    const next = `${location.pathname}${location.search || ""}${location.hash || ""}`;
    return `/admin?next=${encodeURIComponent(next)}`;
  }, [location.pathname, location.search, location.hash]);

  const authorPhotoSrc = `/assets/images/authors/${authorIdForImage || "default"}.jpg`;

  return (
    <section className="zr-section zr-author" aria-busy={loading ? "true" : "false"}>
      <div className="zr-author__top">
        <button className="zr-btn2 zr-btn2--ghost" onClick={() => navigate(-1)}>
          ← Back
        </button>
        <Link className="zr-btn2 zr-btn2--ghost" to="/top-authors">
          Top authors
        </Link>

        <div style={{ flex: 1 }} />

        {admin.checking ? (
          <span className="zr-badge" title="Checking admin session…">
            …
          </span>
        ) : admin.ok ? (
          <span className="zr-badge" title="Quick edit enabled">
            Admin
          </span>
        ) : (
          <Link className="zr-btn2 zr-btn2--ghost zr-btn2--sm" to={adminLoginHref}>
            Admin login
          </Link>
        )}

        <Link className="zr-btn2 zr-btn2--ghost" to="/region/himalaya">
          Himalaya
        </Link>
        <Link className="zr-btn2 zr-btn2--ghost" to="/bookthemes?q=bergsteigen">
          Bergsteigen
        </Link>
        <Link className="zr-btn2 zr-btn2--ghost" to="/year/1996">
          1996
        </Link>
      </div>

      {/* Header with author photo */}
      <div className="zr-author__head">
        <img
          className="zr-author__avatar"
          src={authorPhotoSrc}
          alt={authorName}
          loading="lazy"
          onError={(e) => {
            e.currentTarget.src = "/assets/images/authors/default.jpg";
          }}
        />
        <div>
          <h1 className="zr-author__title">{authorName}</h1>
          <p className="zr-lede">All readings by this author (from your reading life).</p>
        </div>
      </div>

      {/* Option A: Readings + On hand hero cards (numbers live only here) */}
      <div className="zr-author__heroRow">
        <div className="zr-card zr-author__panel zr-author__panel--readings" aria-label="Readings summary">
          <div className="zr-author__panelHead">
            <div>
              <div className="zr-author__panelTitle">Readings</div>
              <div className="zr-author__panelBig">{loading ? "—" : decisionTotal}</div>
            </div>

            <div className="zr-author__rate" title="Completed / Readings">
              <div className="zr-author__rateLabel">Completion rate</div>
              <div className="zr-author__rateValue">
                {loading ? "—" : completionPct == null ? "—" : fmtPct(completionPct)}
              </div>
              <div className="zr-author__progress" aria-hidden="true">
                <div className="zr-author__progressBar" style={{ width: (completionPct || 0) + "%" }} />
              </div>
            </div>
          </div>

          <div className="zr-author__chipRow">
            <button className="zr-author__chip" type="button" onClick={() => jumpTo("finished")} disabled={loading}>
              <span>Completed</span>
              <strong>{loading ? "—" : counts.finished}</strong>
            </button>
            <button className="zr-author__chip" type="button" onClick={() => jumpTo("abandoned")} disabled={loading}>
              <span>Not a match</span>
              <strong>{loading ? "—" : counts.abandoned}</strong>
            </button>
          </div>
        </div>

        <div className="zr-card zr-author__panel zr-author__panel--onhand" aria-label="On hand summary">
          <div className="zr-author__panelTitle">On hand</div>
          <div className="zr-author__panelBig">{loading ? "—" : counts.onHand}</div>

          <div className="zr-author__chipRow">
            <button className="zr-author__chip" type="button" onClick={() => jumpTo("in_stock")} disabled={loading}>
              <span>To read</span>
              <strong>{loading ? "—" : counts.notStarted}</strong>
            </button>
            <button className="zr-author__chip" type="button" onClick={() => jumpTo("in_progress")} disabled={loading}>
              <span>Reading</span>
              <strong>{loading ? "—" : counts.inProgress}</strong>
            </button>
            {showWishlist ? (
              <button className="zr-author__chip" type="button" onClick={() => jumpTo("wishlist")} disabled={loading}>
                <span>Wishlist</span>
                <strong>{loading ? "—" : counts.wishlist}</strong>
              </button>
            ) : null}
          </div>
        </div>
      </div>

      {favoriteBook ? (
        <div className="zr-card zr-author__featured" aria-label="Favorite read">
          <div className="zr-author__sectionTitle">Favorite read</div>
          <article className="zr-author__featuredBook">
            <Link className="zr-author__featuredCover" to={"/book/" + encodeURIComponent(favoriteBook.id)}>
              {favoriteBook.cover ? (
                <img
                  className="zr-author__cover"
                  src={favoriteBook.cover}
                  alt={favoriteBook.title + " cover"}
                  loading="lazy"
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const next = e.currentTarget.nextElementSibling;
                    if (next) next.style.display = "flex";
                  }}
                />
              ) : null}
              <div className="zr-author__coverEmpty">No cover</div>
            </Link>

            <div className="zr-author__featuredMeta">
              <Link className="zr-author__featuredTitle" to={"/book/" + encodeURIComponent(favoriteBook.id)}>
                {favoriteBook.title}
              </Link>
              <div className="zr-author__status">
                {displayStatus(favoriteBook.st)}
                {favoriteBook.isTop ? " · top" : ""}
              </div>
            </div>
          </article>
        </div>
      ) : null}

      {!loading && decisionTotal > 10 && top3Books.length ? (
        <div className="zr-card zr-author__top3" aria-label="Top reads">
          <div className="zr-author__sectionTitle">Top reads</div>
          <div className="zr-author__topRow">
            {top3Books.map((b, idx) => (
              <Link key={b.id} className="zr-author__topCard" to={"/book/" + encodeURIComponent(b.id)}>
                <div className="zr-author__rank">{idx + 1}</div>
                <div className="zr-author__topCover">
                  {b.cover ? (
                    <img
                      className="zr-author__topImg"
                      src={b.cover}
                      alt={b.title + " cover"}
                      loading="lazy"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                        const next = e.currentTarget.nextElementSibling;
                        if (next) next.style.display = "flex";
                      }}
                    />
                  ) : null}
                  <div className="zr-author__topEmpty">No cover</div>
                </div>
                <div className="zr-author__topTitle">{b.title}</div>
              </Link>
            ))}
          </div>
        </div>
      ) : null}

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {loading ? <div className="zr-alert">Loading…</div> : null}

      {/* Tabs + Search (labels only, no numbers) */}
      <div className="zr-card" style={{ marginBottom: 12 }}>
        <div className="zr-toolbar" style={{ flexWrap: "wrap", gap: 8 }}>
          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "all" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("all")}
          >
            All
          </button>

          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "on_hand" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("on_hand")}
          >
            On hand
          </button>

          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "in_stock" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("in_stock")}
          >
            To read
          </button>

          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "in_progress" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("in_progress")}
          >
            Reading
          </button>

          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "finished" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("finished")}
          >
            Completed
          </button>

          <button
            className={`zr-btn2 zr-btn2--sm ${tabSafe === "abandoned" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
            onClick={() => setTab("abandoned")}
          >
            Not a match
          </button>

          {showWishlist ? (
            <button
              className={`zr-btn2 zr-btn2--sm ${tabSafe === "wishlist" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
              onClick={() => setTab("wishlist")}
            >
              Wishlist
            </button>
          ) : null}

          {showTop ? (
            <button
              className={`zr-btn2 zr-btn2--sm ${tabSafe === "top" ? "zr-btn2--primary" : "zr-btn2--ghost"}`}
              onClick={() => setTab("top")}
            >
              Top
            </button>
          ) : null}

          <div style={{ flex: 1 }} />
          <input
            className="zr-input"
            placeholder="Search title…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            style={{ minWidth: 220 }}
          />
        </div>
      </div>

      {!loading && activeList.length === 0 ? (
        <div className="zr-card">No books found for this selection.</div>
      ) : null}

      <div ref={listAnchorRef} />

      <div className="zr-author__grid">
        {activeList.map((b) => {
          const buy = b.purchaseUrl || buyFallback(authorName, b.title);

          return (
            <article key={b.id} className="zr-card zr-author__book">
              <Link className="zr-author__coverWrap" to={`/book/${encodeURIComponent(b.id)}`}>
                {b.cover ? (
                  <img
                    className="zr-author__cover"
                    src={b.cover}
                    alt={`${b.title} cover`}
                    loading="lazy"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                      const next = e.currentTarget.nextElementSibling;
                      if (next) next.style.display = "flex";
                    }}
                  />
                ) : null}
                <div className="zr-author__coverEmpty">No cover</div>
              </Link>

              <div className="zr-author__meta">
                <Link className="zr-author__bookTitle" to={`/book/${encodeURIComponent(b.id)}`}>
                  {b.title}
                </Link>

                <div className="zr-author__status">
                  {displayStatus(b.st)}
                  {b.isTop ? " · top" : ""}
                </div>

                <div className="zr-author__actions">
                  <Link className="zr-btn2 zr-btn2--ghost" to={`/book/${encodeURIComponent(b.id)}`}>
                    Details
                  </Link>

                  {admin.ok ? (
                    <button
                      type="button"
                      className="zr-btn2 zr-btn2--ghost"
                      onClick={() => openEdit(b.id)}
                      title="Quick edit (admin only)"
                    >
                      Edit
                    </button>
                  ) : null}

                  {buy ? (
                    <a
                      className="zr-btn2 zr-btn2--primary"
                      href={buy}
                      target="_blank"
                      rel="noreferrer noopener"
                      title="Opens in a new tab"
                    >
                      Buy ↗
                    </a>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </div>

      {/* Quick edit modal */}
      {admin.ok && editOpen ? (
        <div
          className="zr-modalOverlay"
          role="presentation"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) closeEdit();
          }}
        >
          <div
            className="zr-modal"
            role="dialog"
            aria-modal="true"
            aria-label="Quick edit book"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="zr-modal__head">
              <div>
                <div className="zr-modal__title">Edit book</div>
                <div className="zr-modal__sub">{editId}</div>
              </div>
              <button className="zr-btn2 zr-btn2--ghost" type="button" onClick={closeEdit}>
                ✕
              </button>
            </div>

            <div className="zr-modal__body">
              {editErr ? <div className="zr-alert zr-alert--error">{editErr}</div> : null}
              {editBusy ? <div className="zr-alert">Loading…</div> : null}

              {editingBook ? (
                <BookForm
                  mode="edit"
                  bookId={editId}
                  initialBook={editingBook}
                  lockBarcode={true}
                  showUnknownFields={true}
                  excludeUnknownKeys={[]}
                  showReadingStatus={true}
                  showStockTop={true}
                  submitLabel="Speichern"
                  onCancel={closeEdit}
                  onSuccess={({ payload, saved }) => {
                    const patch = saved && typeof saved === "object" ? saved : payload;
                    patchLocalList(editId, patch);
                    setEditingBook((prev) => ({ ...(prev || {}), ...(patch || {}) }));

                    const pt = patch?.published_titles ?? patch?.publishedTitles;
                    const n = Number(pt);
                    if (Number.isFinite(n) && n > 0) setPublishedTitles(n);
                  }}
                />
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </section>
  );
}