import React, { useEffect, useMemo, useState } from "react";
import RequireAdmin from "../components/RequireAdmin";
import { getBarcodeOccupancy } from "../api/barcodes";
import "./AuthorsIndexPage.css";

function num(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
}

function sortValue(row, key) {
  if (key === "prefix") return String(row.prefix || "");
  if (key === "range") return String(row.range || [row.first_barcode, row.last_barcode].filter(Boolean).join(" – "));
  if (key === "total") return num(row.total);
  if (key === "taken") return num(row.taken);
  if (key === "free") return num(row.free);
  if (key === "occupancy") return num(row.occupancy_percent);
  if (key === "next") return String(row.next_free_barcode || (num(row.free) === 0 ? "FULL" : "—"));
  if (key === "sizegroup") return num(row.sizegroup);
  if (key === "band") return String(row.band || "");
  return "";
}

function Inner() {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [sort, setSort] = useState({ key: "occupancy", dir: "desc" });

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
      <div className="authors-grid barcode-grid">
        <div className="authors-row authors-head barcode-row">
          <button className="authors-cell authors-head-btn barcode-prefix" onClick={() => toggleSort("prefix")}>
            <span>Prefix</span> <b>{arrow("prefix")}</b>
          </button>

          <button className="authors-cell authors-head-btn barcode-range" onClick={() => toggleSort("range")}>
            <span>Range</span> <b>{arrow("range")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("total")}>
            <span>Total</span> <b>{arrow("total")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("taken")}>
            <span>Taken</span> <b>{arrow("taken")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("free")}>
            <span>Free</span> <b>{arrow("free")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("occupancy")}>
            <span>Occupancy</span> <b>{arrow("occupancy")}</b>
          </button>

          <button className="authors-cell authors-head-btn barcode-next" onClick={() => toggleSort("next")}>
            <span>Next free</span> <b>{arrow("next")}</b>
          </button>

          <button className="authors-cell authors-head-btn authors-number" onClick={() => toggleSort("sizegroup")}>
            <span>Sizegroup</span> <b>{arrow("sizegroup")}</b>
          </button>

          <button className="authors-cell authors-head-btn barcode-band" onClick={() => toggleSort("band")}>
            <span>Band</span> <b>{arrow("band")}</b>
          </button>
        </div>

        {err ? <div className="authors-message authors-error">{err}</div> : null}
        {loading ? <div className="authors-message">Loading…</div> : null}

        {!loading && !err && sortedRows.length === 0 ? (
          <div className="authors-message">No barcode data found.</div>
        ) : null}

        {!loading && !err
          ? sortedRows.map((row) => {
              const range =
                row.range ||
                [row.first_barcode, row.last_barcode].filter(Boolean).join(" – ") ||
                "—";

              const pct = num(row.occupancy_percent);
              const nextFree = row.next_free_barcode || (num(row.free) === 0 ? "FULL" : "—");

              return (
                <div
                  className="authors-row barcode-row"
                  key={`${row.prefix || ""}-${row.sizegroup || ""}-${row.band || ""}-${range}`}
                >
                  <div className="authors-cell barcode-prefix">{row.prefix || "—"}</div>
                  <div className="authors-cell barcode-range">{range}</div>
                  <div className="authors-cell authors-number">{row.total ?? 0}</div>
                  <div className="authors-cell authors-number">{row.taken ?? 0}</div>
                  <div className="authors-cell authors-number">{row.free ?? 0}</div>
                  <div className="authors-cell authors-number">{pct.toFixed(1)}%</div>
                  <div className="authors-cell barcode-next">{nextFree}</div>
                  <div className="authors-cell authors-number">{row.sizegroup ?? "—"}</div>
                  <div className="authors-cell barcode-band">{row.band ?? "—"}</div>
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