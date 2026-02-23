import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { listBooks } from "../api/books";
import { listThemesSummary } from "../api/themes";

const DEFAULT_LIMIT = 30;

export default function ThemeBooksPage() {
  const params = useParams(); // { abbr }
  const navigate = useNavigate();

  // React Router gives us the raw URL segment. Decode to be safe.
  const abbr = useMemo(() => decodeURIComponent(params.abbr || ""), [params.abbr]);

  const [themeMeta, setThemeMeta] = useState(null);
  const [metaLoading, setMetaLoading] = useState(true);

  const [q, setQ] = useState("");
  const [page, setPage] = useState(1);
  const [limit] = useState(DEFAULT_LIMIT);

  const [busy, setBusy] = useState(true);
  const [err, setErr] = useState("");
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  const pages = useMemo(() => Math.max(1, Math.ceil((total || 0) / limit)), [total, limit]);

  // Load theme metadata (name/image/description) for a nice header.
  useEffect(() => {
    let alive = true;
    (async () => {
      setMetaLoading(true);
      try {
        const tRes = await listThemesSummary();
        if (!alive) return;

        const list = Array.isArray(tRes) ? tRes : tRes?.items || tRes?.data || [];
        const found =
          (list || []).find((t) => String(t?.abbr || "").trim() === String(abbr).trim()) || null;

        setThemeMeta(found);
      } catch {
        setThemeMeta(null);
      } finally {
        if (!alive) return;
        setMetaLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [abbr]);

  // Load books for this theme (server-side filter).
  useEffect(() => {
    let alive = true;
    (async () => {
      setBusy(true);
      setErr("");

      try {
        const res = await listBooks({
          page,
          limit,
          sortBy: "BEind",
          order: "desc",
          theme: abbr, // ✅ backend now supports ?theme=mt.
          q: q.trim() || undefined,
        });

        if (!alive) return;
        setItems(res?.items || []);
        setTotal(Number(res?.total || 0));
      } catch (e) {
        if (!alive) return;
        setItems([]);
        setTotal(0);
        setErr(e?.message || String(e));
      } finally {
        if (!alive) return;
        setBusy(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [abbr, page, limit, q]);

  const title = themeMeta?.full_name || abbr || "Theme";
  const desc = themeMeta?.description || "";
  const img = themeMeta?.image_path || "";

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto", padding: 16 }}>
      <div style={{ marginBottom: 12 }}>
        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          type="button"
          onClick={() => navigate("/bookthemes")}
        >
          ← Back to themes
        </button>
      </div>

      <div className="zr-card" style={{ padding: 16, marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 14, alignItems: "center" }}>
          {img ? (
            <img
              src={img}
              alt={title}
              style={{
                width: 96,
                height: 96,
                objectFit: "cover",
                borderRadius: 18,
                border: "1px solid rgba(0,0,0,0.10)",
              }}
              loading="lazy"
              decoding="async"
            />
          ) : null}

          <div style={{ minWidth: 0 }}>
            <div style={{ fontSize: 26, fontWeight: 950, letterSpacing: "-0.02em" }}>
              {metaLoading ? "Theme…" : title}
            </div>
            {desc ? (
              <div style={{ marginTop: 6, color: "rgba(0,0,0,0.70)", fontWeight: 700 }}>
                {desc}
              </div>
            ) : null}
            <div style={{ marginTop: 8, color: "rgba(0,0,0,0.65)", fontWeight: 800 }}>
              {total} books
            </div>
          </div>
        </div>

        <div className="zr-toolbar" style={{ marginTop: 12 }}>
          <input
            className="zr-input"
            placeholder="Search within this theme…"
            value={q}
            onChange={(e) => {
              setPage(1);
              setQ(e.target.value);
            }}
          />
        </div>
      </div>

      {err ? <div className="zr-alert zr-alert--error">{err}</div> : null}
      {busy ? <div className="zr-alert">Loading books…</div> : null}

      <div className="zr-card" style={{ padding: 0, overflow: "hidden" }}>
        {items.map((b) => {
          const id = b?.id;
          const titleText = b?.title_display || b?.titleDisplay || b?.title || "—";
          const authorText =
            b?.author_display || b?.author_name_display || b?.BAutor || b?.Autor || "—";

          return (
            <div
              key={id}
              style={{
                padding: 12,
                borderBottom: "1px solid rgba(0,0,0,0.08)",
                display: "flex",
                justifyContent: "space-between",
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <Link
                  to={`/book/${encodeURIComponent(id)}`}
                  style={{ fontWeight: 900, textDecoration: "none" }}
                >
                  {titleText}
                </Link>
                <div style={{ marginTop: 4, opacity: 0.8, fontWeight: 700 }}>{authorText}</div>
              </div>

              {b?.purchase_url ? (
                <a href={b.purchase_url} target="_blank" rel="noreferrer" style={{ whiteSpace: "nowrap" }}>
                  Details
                </a>
              ) : null}
            </div>
          );
        })}

        {!busy && items.length === 0 ? <div className="zr-alert">No books found.</div> : null}
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 12 }}>
        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          onClick={() => setPage(1)}
          disabled={page <= 1}
          type="button"
        >
          ⏮
        </button>
        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          onClick={() => setPage((p) => Math.max(1, p - 1))}
          disabled={page <= 1}
          type="button"
        >
          ◀
        </button>

        <div style={{ opacity: 0.8, fontWeight: 800 }}>
          Page {page} / {pages}
        </div>

        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          onClick={() => setPage((p) => Math.min(pages, p + 1))}
          disabled={page >= pages}
          type="button"
        >
          ▶
        </button>
        <button
          className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
          onClick={() => setPage(pages)}
          disabled={page >= pages}
          type="button"
        >
          ⏭
        </button>
      </div>
    </div>
  );
}