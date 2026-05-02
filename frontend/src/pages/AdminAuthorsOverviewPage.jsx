import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { getApiRoot } from "../api/apiRoot";

function normKey(s) {
  return String(s || "")
    .toLowerCase()
    .trim();
}

export default function AdminAuthorsOverviewPage() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [q, setQ] = useState("");
  const acRef = useRef(null);

  useEffect(() => {
    if (acRef.current) acRef.current.abort();

    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setErr("");

    fetch(`${getApiRoot()}/admin/authors/overview`, {
      credentials: "include",
      cache: "no-store",
      signal: ac.signal,
    })
      .then(async (res) => {
        if (!res.ok) {
          if (res.status === 401 || res.status === 403) {
            throw new Error("Please login to view the authors overview.");
          }

          const t = await res.text().catch(() => "");
          throw new Error(t || `Request failed (${res.status})`);
        }

        return res.json();
      })
      .then((data) => {
        if (ac.signal.aborted) return;
        setRows(Array.isArray(data?.items) ? data.items : []);
      })
      .catch((e) => {
        if (ac.signal.aborted) return;
        setErr(e?.message || String(e));
        setRows([]);
      })
      .finally(() => {
        if (!ac.signal.aborted) setLoading(false);
      });

    return () => ac.abort();
  }, []);

  const filtered = useMemo(() => {
    const needle = normKey(q);
    const base = Array.isArray(rows) ? rows : [];

    if (!needle) return base;

    return base.filter((r) => {
      const haystack = [
        r.last_name,
        r.last,
        r.first_name,
        r.first,
        r.name_display,
        r.author,
        r.id,
      ]
        .filter(Boolean)
        .map(normKey)
        .join(" ");

      return haystack.includes(needle);
    });
  }, [rows, q]);

  return (
    <section className="zr-section" aria-busy={loading ? "true" : "false"}>
      <AdminNavRow />

      <h1>Authors overview</h1>
      <p className="zr-lede">
        Alphabetical by last name. Counts follow the same meaning as the Author page: Completed
        (finished), Not a match (abandoned), On hand (in_progress + in_stock).
      </p>

      <div className="zr-card">
        {err ? (
          <div className="zr-alert zr-alert--error" style={{ display: "grid", gap: 6 }}>
            <div>{err}</div>
            {(String(err).toLowerCase().includes("login") ||
              String(err).toLowerCase().includes("unauthorized") ||
              String(err).toLowerCase().includes("forbidden")) && (
              <div>
                <Link to="/admin?next=/admin/authors">Go to Admin login</Link>
              </div>
            )}
          </div>
        ) : null}

        {loading ? <div className="zr-alert">Loading…</div> : null}

        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <label style={{ display: "grid", gap: 6 }}>
            Search
            <input
              className="zr-input"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Lastname, firstname, …"
              style={{ minWidth: 260 }}
            />
          </label>

          <div style={{ opacity: 0.8, paddingTop: 22 }}>
            {filtered.length} / {rows.length} authors
          </div>
        </div>

        <div style={{ overflow: "auto", marginTop: 12 }}>
          <table className="zr-table">
            <thead>
              <tr>
                <th>Lastname</th>
                <th>Firstname</th>
                <th>Author</th>
                <th style={{ textAlign: "right" }}>Completed</th>
                <th style={{ textAlign: "right" }}>Not a match</th>
                <th style={{ textAlign: "right" }}>On hand</th>
                <th style={{ textAlign: "right" }}>Total</th>
              </tr>
            </thead>

            <tbody>
              {filtered.map((r) => {
                const id = String(r.id || r.author || r.name_display || "");
                const last = r.last_name || r.last || "";
                const first = r.first_name || r.first || "";
                const name = r.name_display || r.author || "—";
                const completed = r.completed ?? r.finished ?? 0;
                const notMatch = r.not_match ?? r.not_a_match ?? 0;
                const onHand = r.on_hand ?? 0;
                const total = r.total ?? 0;

                return (
                  <tr key={id || name}>
                    <td>{last}</td>
                    <td>{first}</td>
                    <td>{name}</td>
                    <td style={{ textAlign: "right" }}>{completed}</td>
                    <td style={{ textAlign: "right" }}>{notMatch}</td>
                    <td style={{ textAlign: "right" }}>{onHand}</td>
                    <td style={{ textAlign: "right" }}>{total}</td>
                  </tr>
                );
              })}

              {!loading && filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} style={{ opacity: 0.75 }}>
                    No authors found.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
