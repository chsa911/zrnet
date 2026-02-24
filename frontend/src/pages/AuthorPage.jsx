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
  // on_hand | finished | abandoned | in_progress | in_stock | wishlist | top | all
  const tabRaw = (sp.get("tab") || "all").toLowerCase();
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
    id: null, // used for author photo filename
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

        const key = String(authorResolved.key || "").trim();
        if (!key) {
          setItems([]);
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
      } catch (e) {
        if (isAbortError(e) || ac.signal.aborted) return;
        setErr(e?.message || "Failed to load author books");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [authorResolved.key]);

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

      const topRankRaw = pick(raw, [
        "top_rank", "topRank", "top_no", "topNo", "top_number", "topNumber",
        "BTopRank", "BTopNo",
      ]);
      const topRankNum = Number(topRankRaw);
      const topRank = Number.isFinite(topRankNum) ? topRankNum : null;

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
    }

    return { all, onHand, finished, abandoned, inProgress, notStarted, wishlist, top };
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

  const tabSafe = !showWishlist && tab === "wishlist" ? "all" : tab;

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
                  : tabSafe === "finished"
                    ? groups.finished
                    : groups.all;

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

  const topBook = useMemo(() => {
    const topSorted = groups.top
      .slice()
      .sort(
        (a, b) =>
          (a.topRank ?? 9999) - (b.topRank ?? 9999) ||
          String(a.title || "").localeCompare(String(b.title || ""))
      );
    return topSorted[0] || null;
  }, [groups.top]);

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
          pick(patch, ["title_display", "titleDisplay", "title", "bookTitleDisplay", "BTitle"]) ?? null;

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

      {/* Two big panels only (panel itself not clickable; only buttons inside) */}
      <div className="zr-author__heroRow">
        <div
          className="zr-card zr-author__panel zr-author__panel--readings"
          aria-label="Readings summary"
          style={{ color: "#fff" }}
        >
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

        <div
          className="zr-card zr-author__panel zr-author__panel--onhand"
          aria-label="On hand summary"
          style={{ color: "#fff" }}
        >
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

      {/* Only ONE top book below, full-width */}
      {topBook ? (
        <div className="zr-card zr-author__topOne" aria-label="Top read">
          <div className="zr-author__sectionTitle">Top read</div>

          <article className="zr-author__topOneInner">
            <Link className="zr-author__topOneCover" to={"/book/" + encodeURIComponent(topBook.id)}>
              {topBook.cover ? (
                <img
                  className="zr-author__cover"
                  src={topBook.cover}
                  alt={topBook.title + " cover"}
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

            <div className="zr-author__topOneMeta">
              <Link className="zr-author__featuredTitle" to={"/book/" + encodeURIComponent(topBook.id)}>
                {topBook.title}
              </Link>

              <div className="zr-author__status">
                {displayStatus(topBook.st)} · top
              </div>

              <div className="zr-author__actions">
                <Link className="zr-btn2 zr-btn2--ghost" to={`/book/${encodeURIComponent(topBook.id)}`}>
                  Details
                </Link>

                {admin.ok ? (
                  <button
                    type="button"
                    className="zr-btn2 zr-btn2--ghost"
                    onClick={() => openEdit(topBook.id)}
                    title="Quick edit (admin only)"
                  >
                    Edit
                  </button>
                ) : null}

                {(topBook.purchaseUrl || buyFallback(authorName, topBook.title)) ? (
                  <a
                    className="zr-btn2 zr-btn2--primary"
                    href={topBook.purchaseUrl || buyFallback(authorName, topBook.title)}
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
        </div>
      ) : null}

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {loading ? <div className="zr-alert">Loading…</div> : null}

      {!loading && activeList.length === 0 ? (
        <div className="zr-card">No books found.</div>
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