import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { getApiRoot } from "../api/apiRoot";

function asText(value) {
  return String(value || "").trim();
}

function normalizeAbbr(value) {
  return asText(value).toLowerCase().replace(/[^a-z0-9]+/g, "");
}

function displayAbbr(rowOrValue) {
  const raw = typeof rowOrValue === "object" ? asText(rowOrValue?.abbr_raw) : "";
  if (raw) return raw;
  const norm = typeof rowOrValue === "object" ? asText(rowOrValue?.abbr_norm) : normalizeAbbr(rowOrValue);
  return norm ? `${norm}.` : "—";
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
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [notice, setNotice] = useState("");
  const [q, setQ] = useState("");
  const [level, setLevel] = useState("1");
  const [saving, setSaving] = useState({});
  const [selected, setSelected] = useState({});
  const [reloadTick, setReloadTick] = useState(0);

  const [freeAbbr, setFreeAbbr] = useState("");
  const [authorQuery, setAuthorQuery] = useState("");
  const [authorOptions, setAuthorOptions] = useState([]);
  const [freeAuthorId, setFreeAuthorId] = useState("");
  const [freeAuthor, setFreeAuthor] = useState(null);
  const [freeSaving, setFreeSaving] = useState(false);
  const [assignedInfo, setAssignedInfo] = useState(null);
  const [assignedLoading, setAssignedLoading] = useState(false);

  const acRef = useRef(null);
  const lookupRef = useRef(null);

  useEffect(() => {
    if (acRef.current) acRef.current.abort();
    const ac = new AbortController();
    acRef.current = ac;

    const params = new URLSearchParams();
    params.set("level", level);
    params.set("limit", "2000");
    if (q.trim()) params.set("q", q.trim());

    setLoading(true);
    setErr("");

    fetch(`${getApiRoot()}/admin/abbreviations?${params.toString()}`, {
      credentials: "include",
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) throw new Error("Please login to view abbreviations.");
          const text = await res.text().catch(() => "");
          throw new Error(text || `Request failed (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        const items = Array.isArray(data?.items) ? data.items : [];
        setRows(items);
        setSelected(Object.fromEntries(items.map((r) => [r.abbr_norm, r.current_author_id || ""])));
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setRows([]);
        setErr(e?.message || String(e));
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, [q, level, reloadTick]);

  useEffect(() => {
    if (lookupRef.current) lookupRef.current.abort();
    const query = authorQuery.trim();

    if (query.length < 1) {
      setAuthorOptions([]);
      return;
    }

    const ac = new AbortController();
    lookupRef.current = ac;
    const handle = setTimeout(() => {
      const params = new URLSearchParams({ q: query, limit: "25" });
      fetch(`${getApiRoot()}/admin/authors/lookup?${params.toString()}`, {
        credentials: "include",
        cache: "no-store",
        signal: ac.signal,
      })
        .then(async (res) => {
          const data = await res.json().catch(() => ({}));
          if (!res.ok) throw new Error(data?.detail || data?.error || `Lookup failed (${res.status})`);
          return data;
        })
        .then((data) => {
          if (!ac.signal.aborted) setAuthorOptions(Array.isArray(data?.items) ? data.items : []);
        })
        .catch((e) => {
          if (!ac.signal.aborted) setErr(e?.message || String(e));
        });
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

          if (item?.current_author_id) {
            const author = {
              id: item.current_author_id,
              name: item.current_author_name || item.full_name,
              name_display: item.current_name_display,
              full_name: item.current_author_full_name || item.current_full_name,
              first_name: item.current_first_name,
              last_name: item.current_last_name,
              abbr: item.current_abbr || displayAbbr(abbrNorm),
            };
            setFreeAuthorId(author.id);
            setFreeAuthor(author);
            setAuthorOptions([author]);
          } else {
            setFreeAuthorId("");
            setFreeAuthor(null);
            setAuthorOptions([]);
          }
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
  }, [freeAbbr]);

  const visibleRows = useMemo(() => {
    return rows.slice().sort((a, b) => asText(a.abbr_norm).localeCompare(asText(b.abbr_norm), "de"));
  }, [rows]);

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

  async function save(row) {
    const abbrNorm = asText(row?.abbr_norm);
    const authorId = asText(selected[abbrNorm]);
    if (!abbrNorm || !authorId) return;

    setSaving((s) => ({ ...s, [abbrNorm]: true }));
    setErr("");
    setNotice("");
    try {
      const data = await saveByAuthorId(abbrNorm, authorId);
      setRows((list) =>
        list.map((r) =>
          r.abbr_norm === abbrNorm
            ? {
                ...r,
                current_author_id: data.item.current_author_id,
                current_full_name: data.item.current_full_name,
                current_name_display: data.item.current_name_display,
                current_abbr: data.item.current_abbr || displayAbbr(abbrNorm),
              }
            : r
        )
      );
      setSelected((s) => ({ ...s, [abbrNorm]: data.item.current_author_id || authorId }));
      setNotice(`${displayAbbr(abbrNorm)} saved for ${data.item.current_name_display || data.item.current_full_name}.`);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setSaving((s) => ({ ...s, [abbrNorm]: false }));
    }
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
      const author = data.item?.current_author_id
        ? {
            id: data.item.current_author_id,
            name: data.item.current_author_name || data.item.full_name,
            name_display: data.item.current_name_display,
            full_name: data.item.current_author_full_name || data.item.current_full_name,
            first_name: data.item.current_first_name,
            last_name: data.item.current_last_name,
            abbr: data.item.current_abbr || displayAbbr(abbrNorm),
          }
        : null;
      setFreeAuthor(author);
      setFreeAuthorId(author?.id || "");
      setAuthorQuery("");
      setAuthorOptions(author ? [author] : []);
      setLevel(String(abbrNorm.length));
      setQ(displayAbbr(abbrNorm));
      setReloadTick((n) => n + 1);
    } catch (e) {
      setErr(e?.message || String(e));
    } finally {
      setFreeSaving(false);
    }
  }

  const freeAbbrNorm = normalizeAbbr(freeAbbr);
  const selectedFreeAuthor = freeAuthor || authorOptions.find((a) => a.id === freeAuthorId) || null;

  return (
    <section className="zr-section" aria-busy={loading ? "true" : "false"}>
      <AdminNavRow />

      <h1>Author abbreviations</h1>
      <p className="zr-lede">
        Freely assign any abbreviation to any author: type the abbreviation on the left, check the current assignment,
        then lookup an author by last name on the right and save.
      </p>

      <div className="zr-card" style={{ marginBottom: 14 }}>
        {err ? (
          <div className="zr-alert zr-alert--error" style={{ display: "grid", gap: 6, marginBottom: 12 }}>
            <div>{err}</div>
            {String(err).toLowerCase().includes("login") ? (
              <div>
                <Link to="/admin?next=/admin/abbreviations">Go to Admin login</Link>
              </div>
            ) : null}
          </div>
        ) : null}
        {notice ? <div className="zr-alert" style={{ marginBottom: 12 }}>{notice}</div> : null}

        <h2 style={{ marginTop: 0 }}>Free abbreviation assignment</h2>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(180px, 320px) minmax(300px, 1fr) auto", gap: 12, alignItems: "start" }}>
          <label style={{ display: "grid", gap: 6 }}>
            Abbreviation
            <input
              className="zr-input"
              value={freeAbbr}
              onChange={(e) => setFreeAbbr(e.target.value)}
              placeholder="a or ab"
              autoComplete="off"
            />
            <span style={{ fontSize: 14, opacity: 0.8 }}>
              Normalized: <strong>{freeAbbrNorm ? displayAbbr(freeAbbrNorm) : "—"}</strong>
            </span>
            <span style={{ fontSize: 14 }}>
              Current assignment: {assignedLoading ? (
                <em>checking…</em>
              ) : assignedInfo?.current_name_display || assignedInfo?.current_full_name ? (
                <strong>{assignedInfo.current_name_display || assignedInfo.current_full_name}</strong>
              ) : freeAbbrNorm ? (
                <em>none</em>
              ) : (
                <em>enter an abbreviation</em>
              )}
            </span>
          </label>

          <label style={{ display: "grid", gap: 6, position: "relative" }}>
            Author lookup by last name
            <input
              className="zr-input"
              value={authorQuery}
              onChange={(e) => {
                setAuthorQuery(e.target.value);
                setFreeAuthorId("");
                setFreeAuthor(null);
              }}
              placeholder="type last name: a, ar, arch…"
              autoComplete="off"
            />
            <div>
              {selectedFreeAuthor ? (
                <div style={{ marginBottom: 8 }}>
                  Selected: <strong>{authorLabel(selectedFreeAuthor)}</strong>
                </div>
              ) : null}
              {authorOptions.length > 0 ? (
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {authorOptions.map((a) => (
                    <button
                      key={a.id}
                      type="button"
                      onClick={() => {
                        setFreeAuthorId(a.id);
                        setFreeAuthor(a);
                      }}
                      style={{
                        border: "1px solid rgba(0,0,0,0.14)",
                        background: a.id === freeAuthorId ? "rgba(0,0,0,0.08)" : "#fff",
                        borderRadius: 999,
                        padding: "5px 9px",
                        cursor: "pointer",
                      }}
                    >
                      {authorLabel(a)}
                    </button>
                  ))}
                </div>
              ) : authorQuery.trim().length >= 1 ? (
                <span style={{ opacity: 0.7 }}>No author matches.</span>
              ) : (
                <span style={{ opacity: 0.7 }}>Type a last-name prefix to lookup an author.</span>
              )}
              {selectedFreeAuthor ? (
                <div style={{ marginTop: 8, fontSize: 14 }}>
                  Will assign <strong>{authorLabel(selectedFreeAuthor)}</strong> to <strong>{displayAbbr(freeAbbrNorm)}</strong>.
                </div>
              ) : null}
            </div>
          </label>

          <button
            className="zr-btn2 zr-btn2--primary"
            type="button"
            disabled={!freeAbbrNorm || !freeAuthorId || freeSaving}
            onClick={createFreeAbbreviation}
            style={{ marginTop: 30 }}
          >
            {freeSaving ? "Saving…" : "Assign / save"}
          </button>
        </div>
      </div>

      <div className="zr-card" style={{ marginBottom: 14 }}>
        <div style={{ display: "grid", gridTemplateColumns: "minmax(220px, 1fr) auto", gap: 12, alignItems: "end" }}>
          <label style={{ display: "grid", gap: 6 }}>
            Search existing abbreviation or author
            <input className="zr-input" value={q} onChange={(e) => setQ(e.target.value)} placeholder="a., archer, aust…" />
          </label>

          <label style={{ display: "grid", gap: 6 }}>
            Level
            <select className="zr-input" value={level} onChange={(e) => setLevel(e.target.value)}>
              <option value="1">1 — a.</option>
              <option value="2">2 — ab.</option>
              <option value="3">3 — abc.</option>
              <option value="4">4</option>
            </select>
          </label>
        </div>
      </div>

      <div className="zr-card" style={{ marginBottom: 14, padding: 12 }}>
        <strong>{visibleRows.length}</strong> abbreviation rows.
      </div>

      {loading ? <div className="zr-alert">Loading…</div> : null}

      {!loading && visibleRows.length > 0 ? (
        <div className="zr-card" style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: 840 }}>
            <thead>
              <tr style={{ textAlign: "left", borderBottom: "1px solid rgba(0,0,0,0.12)" }}>
                <th style={{ padding: "10px 8px" }}>Abbr.</th>
                <th style={{ padding: "10px 8px" }}>Current author</th>
                <th style={{ padding: "10px 8px" }}>Choose author</th>
                <th style={{ padding: "10px 8px" }}>All candidates</th>
                <th style={{ padding: "10px 8px" }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {visibleRows.map((row) => {
                const abbrNorm = asText(row.abbr_norm);
                const candidates = Array.isArray(row.candidates) ? row.candidates : [];
                const isDirty = asText(selected[abbrNorm]) && asText(selected[abbrNorm]) !== asText(row.current_author_id);
                return (
                  <tr key={abbrNorm} style={{ borderBottom: "1px solid rgba(0,0,0,0.08)", verticalAlign: "top" }}>
                    <td style={{ padding: "10px 8px", fontWeight: 800, whiteSpace: "nowrap" }}>{displayAbbr(row)}</td>
                    <td style={{ padding: "10px 8px" }}>{asText(row.current_name_display || row.current_full_name) || "—"}</td>
                    <td style={{ padding: "10px 8px" }}>
                      <select
                        className="zr-input"
                        value={selected[abbrNorm] || ""}
                        onChange={(e) => setSelected((s) => ({ ...s, [abbrNorm]: e.target.value }))}
                        style={{ minWidth: 250 }}
                      >
                        <option value="">Choose…</option>
                        {candidates.map((a) => (
                          <option key={a.id} value={a.id}>
                            {authorLabel(a)}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td style={{ padding: "10px 8px", maxWidth: 360 }}>
                      <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                        {candidates.slice(0, 18).map((a) => (
                          <button
                            key={a.id}
                            type="button"
                            onClick={() => setSelected((s) => ({ ...s, [abbrNorm]: a.id }))}
                            style={{
                              border: "1px solid rgba(0,0,0,0.14)",
                              background: a.id === selected[abbrNorm] ? "rgba(0,0,0,0.08)" : "#fff",
                              borderRadius: 999,
                              padding: "4px 8px",
                              cursor: "pointer",
                            }}
                            title={authorLabel(a)}
                          >
                            {authorLabel(a)}
                          </button>
                        ))}
                        {candidates.length > 18 ? <span>+{candidates.length - 18} more</span> : null}
                      </div>
                    </td>
                    <td style={{ padding: "10px 8px" }}>
                      <button
                        className="zr-btn2 zr-btn2--primary"
                        type="button"
                        disabled={!isDirty || saving[abbrNorm]}
                        onClick={() => save(row)}
                      >
                        {saving[abbrNorm] ? "Saving…" : "Save"}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ) : null}

      {!loading && visibleRows.length === 0 ? <div className="zr-alert">No abbreviations found.</div> : null}
    </section>
  );
}
