import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getApiRoot } from "../api/apiRoot";
import { autocomplete } from "../api/books";

function asText(value) {
  return String(value || "").trim();
}

function normalizeAbbr(value) {
  return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function displayAbbr(rowOrValue) {
  const raw = typeof rowOrValue === "object" ? asText(rowOrValue?.abbr_raw) : "";
  if (raw) return raw;
  const norm =
    typeof rowOrValue === "object"
      ? asText(rowOrValue?.abbr_norm)
      : normalizeAbbr(rowOrValue);
  return norm ? `${norm}.` : "—";
}

function bookLabel(b) {
  const title = asText(b?.title_display || b?.main_title_display || b?.title || b?.name);
  const author = asText(b?.author_name_display || b?.author_display || b?.name_display);
  return author ? `${title} · ${author}` : title || "Untitled";
}

function isExactAuthorAbbr(query, author) {
  const q = normalizeAbbr(query);
  const abbr = normalizeAbbr(author?.abbr || author?.abbreviation || author?.author_abbreviation);
  return !!q && !!abbr && q === abbr;
}

function authorLabel(a) {
  const name = asText(a?.name_display || a?.full_name || a?.name);
  const last = asText(a?.last_name);
  const first = asText(a?.first_name);
  const abbr = asText(a?.abbr);
  const details = [];
  if (last || first) details.push([first, last].filter(Boolean).join(" "));
  if (abbr) details.push(abbr);
  return details.length ? `${name} (${details.join(", ")})` : name;
}

export default function AbbreviationsAdminPage() {
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [level, setLevel] = useState("1");
  const [reloadTick, setReloadTick] = useState(0);

  const [freeAbbr, setFreeAbbr] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [authorOptions, setAuthorOptions] = useState([]);
  const [freeAuthorId, setFreeAuthorId] = useState("");
  const [freeAuthor, setFreeAuthor] = useState(null);
  const [freeSaving, setFreeSaving] = useState(false);
  const [assignedInfo, setAssignedInfo] = useState(null);
  const [assignedLoading, setAssignedLoading] = useState(false);

  const [titleQuery, setTitleQuery] = useState("");
  const [titleOptions, setTitleOptions] = useState([]);
  const [selectedBook, setSelectedBook] = useState(null);
  const [titleAuthorQuery, setTitleAuthorQuery] = useState("");
  const [titleAuthorOptions, setTitleAuthorOptions] = useState([]);
  const [selectedTitleAuthor, setSelectedTitleAuthor] = useState(null);
  const [titleSaving, setTitleSaving] = useState(false);

  const lookupRef = useRef(null);
  const titleLookupRef = useRef(null);
  const titleAuthorLookupRef = useRef(null);

  useEffect(() => {
    if (lookupRef.current) lookupRef.current.abort();
    const query = authorQuery.trim();

    if (query.length < 1) {
      setAuthorOptions([]);
      return;
    }

    const ac = new AbortController();
    lookupRef.current = ac;
    const handle = setTimeout(async () => {
      try {
        const items = await autocomplete("author_lastname", query, { limit: 200, signal: ac.signal });
        if (ac.signal.aborted) return;
        const next = Array.isArray(items) ? items : [];
        setAuthorOptions(next);

        if (next.length === 1 && isExactAuthorAbbr(query, next[0])) {
          setFreeAuthor(next[0]);
          setFreeAuthorId(asText(next[0]?.id || next[0]?.author_id));
        }
      } catch (e) {
        if (!ac.signal.aborted && e?.name !== "AbortError") setErr(e?.message || String(e));
      }
    }, 180);

    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [authorQuery]);

  useEffect(() => {
    const abbrNorm = normalizeAbbr(freeAbbr);
    setAssignedInfo(null);

    if (!abbrNorm) return;

    const ac = new AbortController();
    const handle = setTimeout(() => {
      setAssignedLoading(true);
      fetch(`${getApiRoot()}/admin/abbreviations/${encodeURIComponent(abbrNorm)}`, {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.detail || data?.error || `Abbreviation lookup failed (${res.status})`);
          return data;
        })
        .then((data) => {
          if (ac.signal.aborted) return;

          const item = data?.item || null;
          setAssignedInfo(item);

          setFreeAuthorId("");
          setFreeAuthor(null);
          setAuthorQuery("");
          setAuthorOptions([]);
        })
        .catch((e) => {
          if (!ac.signal.aborted) setErr(e?.message || String(e));
        })
        .finally(() => {
          if (!ac.signal.aborted) setAssignedLoading(false);
        });
    }, 160);

    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [freeAbbr, reloadTick]);

  async function saveByAuthorId(abbrNorm, authorId) {
    if (!abbrNorm || !authorId) return null;

    const res = await fetch(`${getApiRoot()}/admin/abbreviations/${encodeURIComponent(abbrNorm)}`, {
      method: "PATCH",
      credentials: "include",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ authorId }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.detail || data?.error || `Save failed (${res.status})`);
    return data;
  }

  async function createFreeAbbreviation() {
    const abbrNorm = normalizeAbbr(freeAbbr);
    const authorId = asText(freeAuthorId);
    if (!abbrNorm || !authorId) return;

    setFreeSaving(true);
    setErr("");
    setNotice("");
    try {
      const data = await saveByAuthorId(abbrNorm, authorId);
      setNotice(`${displayAbbr(abbrNorm)} assigned to ${data.item.current_name_display || data.item.current_full_name}.`);
      setAssignedInfo(data.item);
      setFreeAuthor(null);
      setFreeAuthorId("");
      setAuthorQuery("");
      setAuthorOptions([]);
      setLevel(String(abbrNorm.length));
      setReloadTick((n) => n + 1);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setFreeSaving(false);
    }
  }

  useEffect(() => {
    if (titleLookupRef.current) titleLookupRef.current.abort();
    const query = titleQuery.trim();

    if (query.length < 1) {
      setTitleOptions([]);
      setSelectedBook(null);
      return;
    }

    const ac = new AbortController();
    titleLookupRef.current = ac;
    const handle = setTimeout(async () => {
      try {
        const items = await autocomplete("title_display", query, { limit: 200, signal: ac.signal });
        if (ac.signal.aborted) return;
        const next = Array.isArray(items) ? items : [];
        setTitleOptions(next);
        setSelectedBook((prev) => (prev?.id && next.some((x) => x.id === prev.id) ? prev : next.length === 1 ? next[0] : null));
      } catch (e) {
        if (!ac.signal.aborted && e?.name !== "AbortError") setErr(e?.message || String(e));
      }
    }, 180);

    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [titleQuery]);

  useEffect(() => {
    if (titleAuthorLookupRef.current) titleAuthorLookupRef.current.abort();
    const query = titleAuthorQuery.trim();

    if (query.length < 1) {
      setTitleAuthorOptions([]);
      setSelectedTitleAuthor(null);
      return;
    }

    const ac = new AbortController();
    titleAuthorLookupRef.current = ac;
    const handle = setTimeout(async () => {
      try {
        const items = await autocomplete("author_lastname", query, { limit: 200, signal: ac.signal });
        if (ac.signal.aborted) return;
        const next = Array.isArray(items) ? items : [];
        setTitleAuthorOptions(next);

        if (next.length === 1 && isExactAuthorAbbr(query, next[0])) {
          setSelectedTitleAuthor(next[0]);
        }
      } catch (e) {
        if (!ac.signal.aborted && e?.name !== "AbortError") setErr(e?.message || String(e));
      }
    }, 180);

    return () => {
      clearTimeout(handle);
      ac.abort();
    };
  }, [titleAuthorQuery]);

  async function assignTitleToAuthor() {
    const bookId = asText(selectedBook?.id);
    const authorId = asText(selectedTitleAuthor?.id || selectedTitleAuthor?.author_id);
    if (!bookId || !authorId) return;

    setTitleSaving(true);
    setErr("");
    setNotice("");

    try {
      const res = await fetch(`${getApiRoot()}/admin/books/${encodeURIComponent(bookId)}/assign-author`, {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorId }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.detail || data?.error || `Assign failed (${res.status})`);

      setNotice(`Assigned "${bookLabel(selectedBook)}" to ${authorLabel(selectedTitleAuthor)}.`);
      setTitleQuery("");
      setTitleOptions([]);
      setSelectedBook(null);
      setTitleAuthorQuery("");
      setTitleAuthorOptions([]);
      setSelectedTitleAuthor(null);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setTitleSaving(false);
    }
  }

  const freeAbbrNorm = normalizeAbbr(freeAbbr);
  const selectedFreeAuthor = freeAuthor || authorOptions.find((a) => a.id === freeAuthorId) || null;

  return (
    <section className="ab-section">
      <style>{`
        .ab-section {
          width: 100%;
          max-width: 1700px;
          margin: 0 auto;
          padding: 28px;
          box-sizing: border-box;
        }

        .ab-section * {
          box-sizing: border-box;
        }

        .ab-grid {
          width: 100%;
          border: 4px solid #666 !important;
          background: #fff;
          overflow: hidden;
        }

        .ab-top {
          display: grid;
          grid-template-columns: 260px minmax(320px, 1fr) 190px;
          background: #f1f1f1;
        }

        .ab-cell {
          border-right: 4px solid #666;
          padding: 14px;
          min-width: 0;
        }

        .ab-cell:last-child {
          border-right: 0;
        }

        .ab-label {
          display: grid;
          gap: 6px;
          color: #555;
          font-size: 13px;
          font-weight: 900;
          letter-spacing: 0.02em;
          text-transform: uppercase;
        }

        .ab-input,
        .ab-select {
          appearance: none;
          width: 100%;
          min-height: 44px;
          border: 3px solid #666 !important;
          border-radius: 0 !important;
          outline: 0;
          background: #fff;
          color: #111;
          font-size: 19px;
          font-weight: 850;
          padding: 6px 9px;
        }

        .ab-btn {
          appearance: none;
          border: 3px solid #111 !important;
          border-radius: 0 !important;
          background: #111;
          color: #fff;
          min-height: 44px;
          padding: 0 14px;
          font-size: 16px;
          font-weight: 950;
          cursor: pointer;
        }

        .ab-btn:hover:not(:disabled) {
          background: #fff;
          color: #111;
        }

        .ab-btn:disabled {
          opacity: 0.35;
          cursor: default;
        }

        .ab-status {
          border-bottom: 4px solid #666;
          padding: 14px 18px;
          color: #555;
          background: #fff;
          font-size: 20px;
          font-weight: 850;
        }

        .ab-status--error {
          background: #fff3f3;
          color: #8b1111;
        }

        .ab-muted {
          color: #777;
          font-size: 14px;
          font-weight: 750;
          text-transform: none;
          letter-spacing: 0;
        }

        .ab-pills {
          display: flex;
          gap: 6px;
          flex-wrap: wrap;
        }

        .ab-pill {
          appearance: none;
          border: 2px solid #666 !important;
          border-radius: 0 !important;
          background: #fff;
          color: #111;
          padding: 5px 8px;
          font-size: 13px;
          font-weight: 850;
          cursor: pointer;
        }

        .ab-pill:hover,
        .ab-pill.is-active {
          background: #111;
          color: #fff;
        }

        @media (max-width: 900px) {
          .ab-section {
            padding: 16px;
          }

          .ab-top {
            grid-template-columns: 1fr;
          }

          .ab-cell {
            border-right: 0;
            border-bottom: 4px solid #666;
          }

          .ab-cell:last-child {
            border-bottom: 0;
          }
        }
      `}</style>

      <div className="ab-grid">
        {err ? (
          <div className="ab-status ab-status--error">
            {err}
            {String(err).toLowerCase().includes("login") ? (
              <div>
                <Link to="/admin?next=/admin/abbreviations">Go to Admin login</Link>
              </div>
            ) : null}
          </div>
        ) : null}

        {notice ? <div className="ab-status">{notice}</div> : null}

        <div className="ab-top">
          <div className="ab-cell">
            <label className="ab-label">
              Abbreviation
              <input
                className="ab-input"
                value={freeAbbr}
                onChange={(e) => setFreeAbbr(e.target.value)}
                placeholder="a or ab"
                autoComplete="off"
              />
              <span className="ab-muted">
                Normalized: <strong>{freeAbbrNorm ? displayAbbr(freeAbbrNorm) : "—"}</strong>
              </span>
              <span className="ab-muted">
                Current: {" "}
                {assignedLoading ? (
                  <em>checking…</em>
                ) : assignedInfo?.current_name_display || assignedInfo?.current_full_name ? (
                  <strong>{assignedInfo.current_name_display || assignedInfo.current_full_name}</strong>
                ) : freeAbbrNorm ? (
                  <em>none</em>
                ) : (
                  <em>enter abbreviation</em>
                )}
              </span>
            </label>
          </div>

          <div className="ab-cell">
            <label className="ab-label">
              Author lookup by last name
              <input
                className="ab-input"
                value={authorQuery}
                onChange={(e) => {
                  setAuthorQuery(e.target.value);
                  setFreeAuthorId("");
                  setFreeAuthor(null);
                }}
                placeholder="type last name: wood, archer…"
                autoComplete="off"
              />
            </label>

            <div className="ab-pills" style={{ marginTop: 10 }}>
              {authorOptions.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className={`ab-pill ${a.id === freeAuthorId ? "is-active" : ""}`}
                  onClick={() => {
                    setFreeAuthorId(a.id);
                    setFreeAuthor(a);
                  }}
                >
                  {authorLabel(a)}
                </button>
              ))}
            </div>

            {selectedFreeAuthor ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Will assign <strong>{authorLabel(selectedFreeAuthor)}</strong> to {" "}
                <strong>{displayAbbr(freeAbbrNorm)}</strong>.
              </div>
            ) : authorQuery.trim().length >= 1 ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                {authorOptions.length ? "Select an author above." : "No author matches."}
              </div>
            ) : (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Type a last-name prefix to lookup an author.
              </div>
            )}
          </div>

          <div className="ab-cell" style={{ display: "flex", alignItems: "end" }}>
            <button
              className="ab-btn"
              type="button"
              disabled={!freeAbbrNorm || !freeAuthorId || freeSaving}
              onClick={createFreeAbbreviation}
            >
              {freeSaving ? "Saving…" : "Assign / save"}
            </button>
          </div>
        </div>

        <div className="ab-top" style={{ borderTop: "4px solid #666" }}>
          <div className="ab-cell">
            <label className="ab-label">
              Title lookup
              <input
                className="ab-input"
                value={titleQuery}
                onChange={(e) => {
                  setTitleQuery(e.target.value);
                  setSelectedBook(null);
                }}
                placeholder="type title…"
                autoComplete="off"
              />
            </label>

            <div className="ab-pills" style={{ marginTop: 10 }}>
              {titleOptions.map((b) => (
                <button
                  key={b.id}
                  type="button"
                  className={`ab-pill ${selectedBook?.id === b.id ? "is-active" : ""}`}
                  onClick={() => setSelectedBook(b)}
                >
                  {bookLabel(b)}
                </button>
              ))}
            </div>

            {selectedBook ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Selected title: <strong>{bookLabel(selectedBook)}</strong>
              </div>
            ) : titleQuery.trim().length >= 1 ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                {titleOptions.length ? "Select a title above." : "No title matches."}
              </div>
            ) : (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Type a title prefix, for example shall.
              </div>
            )}
          </div>

          <div className="ab-cell">
            <label className="ab-label">
              Assign author
              <input
                className="ab-input"
                value={titleAuthorQuery}
                onChange={(e) => {
                  setTitleAuthorQuery(e.target.value);
                  setSelectedTitleAuthor(null);
                }}
                placeholder="type abbreviation or author…"
                autoComplete="off"
              />
            </label>

            <div className="ab-pills" style={{ marginTop: 10 }}>
              {titleAuthorOptions.map((a) => (
                <button
                  key={a.id || a.author_id}
                  type="button"
                  className={`ab-pill ${asText(selectedTitleAuthor?.id || selectedTitleAuthor?.author_id) === asText(a.id || a.author_id) ? "is-active" : ""}`}
                  onClick={() => setSelectedTitleAuthor(a)}
                >
                  {authorLabel(a)}
                </button>
              ))}
            </div>

            {selectedBook && selectedTitleAuthor ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Will assign <strong>{bookLabel(selectedBook)}</strong> to {" "}
                <strong>{authorLabel(selectedTitleAuthor)}</strong>.
              </div>
            ) : titleAuthorQuery.trim().length >= 1 ? (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                {titleAuthorOptions.length ? "Select an author above." : "No author matches."}
              </div>
            ) : (
              <div className="ab-muted" style={{ marginTop: 10 }}>
                Type an abbreviation like a. or an author name.
              </div>
            )}
          </div>

          <div className="ab-cell" style={{ display: "flex", alignItems: "end" }}>
            <button
              className="ab-btn"
              type="button"
              disabled={!selectedBook?.id || !asText(selectedTitleAuthor?.id || selectedTitleAuthor?.author_id) || titleSaving}
              onClick={assignTitleToAuthor}
            >
              {titleSaving ? "Saving…" : "Assign title"}
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
