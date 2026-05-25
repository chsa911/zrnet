import React, { useEffect, useMemo, useState } from "react";
import RequireAdmin from "../components/RequireAdmin";
import { getBarcodeOccupancy } from "../api/barcodes";
import "./AuthorsIndexPage.css";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sortValue(row, key) {
  if (key === "bookcode") return String(row.prefix || "");
  if (key === "percentage") return num(row.occupancy_percent);
  return "";
}

function Inner() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState({ key: "percentage", dir: "desc" });

  async function refresh() {
    setLoading(true);
    setErr("");

    try {
      const d = await getBarcodeOccupancy();
      const items = Array.isArray(d?.items) ? d.items : Array.isArray(d) ? d : [];
      setRows(items);
    } catch (e) {
      setRows([]);
      setErr(e?.message || "Failed to load occupancy");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  const sortedRows = useMemo(() => {
    return rows.slice().sort((a, b) => {
      const av = sortValue(a, sort.key);
      const bv = sortValue(b, sort.key);

      if (typeof av === "number" && typeof bv === "number") {
        return sort.dir === "asc" ? av - bv : bv - av;
      }

      const diff = String(av).localeCompare(String(bv), "de", { sensitivity: "base" });
      return sort.dir === "asc" ? diff : -diff;
    });
  }, [rows, sort]);

  function toggleSort(key) {
    setSort((current) => ({
      key,
      dir: current.key === key && current.dir === "desc" ? "asc" : "desc",
    }));
  }

  function arrow(key) {
    if (sort.key !== key) return "↕";
    return sort.dir === "asc" ? "↑" : "↓";
  }

  return (
    <section className="authors-brutal-page" aria-busy={loading ? "true" : "false"}>
      <div className="authors-grid barcode-grid simple-barcode-grid">
        <div className="authors-row authors-head simple-barcode-row">
          <button className="authors-cell authors-head-btn" onClick={() => toggleSort("bookcode")}>
            <span>BookCode</span> <b>{arrow("bookcode")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("percentage")}>
            <span>Percentage</span> <b>{arrow("percentage")}</b>
          </button>
        </div>

        {err ? <div className="authors-message authors-error">{err}</div> : null}
        {loading ? <div className="authors-message">Loading…</div> : null}

        {!loading && !err && sortedRows.length === 0 ? (
          <div className="authors-message">No barcode data found.</div>
        ) : null}

        {!loading && !err
          ? sortedRows.map((row) => {
              const pct = num(row.occupancy_percent);

              return (
                <div className="authors-row simple-barcode-row" key={`${row.prefix || ""}-${row.sizegroup || ""}-${row.band || ""}`}>
                  <div className="authors-cell">{row.prefix || "—"}</div>
                  <div className="authors-cell authors-number">{pct.toFixed(0)}%</div>
                </div>
              );
            })
          : null}
      </div>
    </section>
  );
}

export default function BarcodeDashboardPage() {
  return (
    <RequireAdmin>
      <Inner />
    </RequireAdmin>
  );
}