import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import AdminNavRow from "../components/AdminNavRow";
import { checkPhysCode } from "../api/books";
import {
  PAGE_NUM_POSITIONS,
  buildPhysCode,
  decodePhysCode,
  formatPhysCode,
  normalizePhysCode,
  pageNumPosLabel,
} from "../utils/pageNumPos";

// Buch prüfen: letzte Seite vermessen -> Nummer -> welches Buch ist das?
const box = { border: "1px solid #d1d5db", borderRadius: 10, padding: 14, background: "#fff" };
const lbl = { display: "grid", gap: 4, fontSize: 13 };
const inp = { fontSize: 18, padding: "6px 8px", width: "100%", boxSizing: "border-box" };

function BookCard({ book, diff, tone }) {
  const color = tone === "exact" ? "#15803d" : "#b45309";
  const d = [];
  if (diff?.width_mm) d.push(`Breite ${diff.width_mm > 0 ? "+" : ""}${diff.width_mm} mm`);
  if (diff?.height_mm) d.push(`Höhe ${diff.height_mm > 0 ? "+" : ""}${diff.height_mm} mm`);
  return (
    <div style={{ ...box, borderColor: color, borderWidth: 2 }}>
      <div style={{ fontWeight: 900, fontSize: 18 }}>{book.title_display || "(ohne Titel)"}</div>
      <div>{book.author_name_display || "—"}{book.publisher_name_display ? ` · ${book.publisher_name_display}` : ""}</div>
      <div style={{ fontFamily: "monospace", marginTop: 6 }}>Nr {formatPhysCode(book.phys_code)}</div>
      <div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>
        {book.width_cm ?? "?"} × {book.height_cm ?? "?"} cm · {book.pages ?? "?"} Seiten ·{" "}
        {pageNumPosLabel(book.page_num_pos) || "?"} · {book.chapters ?? "?"} Kapitel
        {book.barcode ? ` · Barcode ${book.barcode}` : ""}
        {book.reading_status ? ` · ${book.reading_status}` : ""}
      </div>
      {d.length ? <div style={{ color, fontWeight: 700, marginTop: 4 }}>Abweichung: {d.join(", ")}</div> : null}
      <div style={{ marginTop: 8, display: "flex", gap: 12 }}>
        <Link to={`/admin/search-update?q=${encodeURIComponent(book.phys_code || "")}`}>Bearbeiten</Link>
        <Link to={`/book/${book.id}`}>Buchseite</Link>
      </div>
    </div>
  );
}

export default function AdminPhysCodeCheckPage() {
  const [codeInput, setCodeInput] = useState("");
  const [v, setV] = useState({ width_cm: "", height_cm: "", pages: "", page_num_pos: "", chapters: "" });
  const [res, setRes] = useState(null);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  const fromFields = buildPhysCode(v);
  const code = normalizePhysCode(codeInput) || fromFields;
  const decoded = useMemo(() => decodePhysCode(code), [code]);

  useEffect(() => {
    setRes(null);
    setErr("");
    if (!code) return undefined;
    const ctrl = new AbortController();
    setBusy(true);
    const t = setTimeout(async () => {
      try {
        setRes(await checkPhysCode(code, { signal: ctrl.signal }));
      } catch (e) {
        if (e?.name !== "AbortError") setErr(e?.message || "Prüfung fehlgeschlagen");
      } finally {
        setBusy(false);
      }
    }, 300);
    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [code]);

  const set = (k) => (e) => setV((p) => ({ ...p, [k]: e.target.value }));

  return (
    <div style={{ maxWidth: 760, margin: "0 auto", padding: 16, display: "grid", gap: 14 }}>
      <AdminNavRow />
      <h1 style={{ margin: 0 }}>Buch prüfen</h1>
      <div style={{ opacity: 0.8 }}>
        Letzte Seite vermessen und Werte eingeben, oder die 14-stellige Nummer direkt eintippen.
      </div>

      <div style={{ ...box, display: "grid", gap: 10 }}>
        <label style={lbl}>
          <span>Nummer</span>
          <input
            style={{ ...inp, fontFamily: "monospace" }}
            inputMode="numeric"
            placeholder="125 210 0950 9 024"
            value={codeInput}
            onChange={(e) => setCodeInput(e.target.value)}
          />
        </label>
        <div style={{ textAlign: "center", opacity: 0.6 }}>oder</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(110px, 1fr))", gap: 10 }}>
          <label style={lbl}><span>Breite (cm)</span><input style={inp} inputMode="decimal" placeholder="12,5" value={v.width_cm} onChange={set("width_cm")} /></label>
          <label style={lbl}><span>Höhe (cm)</span><input style={inp} inputMode="decimal" placeholder="21" value={v.height_cm} onChange={set("height_cm")} /></label>
          <label style={lbl}><span>Seiten</span><input style={inp} inputMode="numeric" placeholder="950" value={v.pages} onChange={set("pages")} /></label>
          <label style={lbl}>
            <span>Position</span>
            <select style={inp} value={v.page_num_pos} onChange={set("page_num_pos")}>
              <option value="">–</option>
              {PAGE_NUM_POSITIONS.map((p) => (
                <option key={p.value} value={p.value}>{p.value} – {p.label}</option>
              ))}
            </select>
          </label>
          <label style={lbl}><span>Kapitel</span><input style={inp} inputMode="numeric" placeholder="24" value={v.chapters} onChange={set("chapters")} /></label>
        </div>
      </div>

      {decoded ? (
        <div style={{ ...box, background: "#f9fafb" }}>
          <div style={{ fontFamily: "monospace", fontSize: 22, fontWeight: 900 }}>{formatPhysCode(code)}</div>
          <div style={{ fontSize: 13, marginTop: 4 }}>
            Breite {decoded.width_mm / 10} cm · Höhe {decoded.height_mm / 10} cm · {decoded.pages} Seiten ·{" "}
            {pageNumPosLabel(decoded.page_num_pos)} · {decoded.chapters} Kapitel
          </div>
        </div>
      ) : codeInput.trim() ? (
        <div style={{ color: "#dc2626" }}>Nummer muss 14 Ziffern haben: BBB HHH SSSS P KKK (P = 7 8 9 1 2 3 oder 0).</div>
      ) : null}

      {err ? <div style={{ color: "#dc2626" }}>{err}</div> : null}
      {busy ? <div>Prüfe…</div> : null}

      {res && !busy ? (
        <div style={{ display: "grid", gap: 10 }}>
          {res.exact ? (
            <>
              <div style={{ fontWeight: 900, color: "#15803d" }}>✓ Das ist dieses Buch:</div>
              <BookCard book={res.exact} tone="exact" />
            </>
          ) : (
            <div style={{ fontWeight: 900 }}>Kein Buch mit genau dieser Nummer.</div>
          )}
          {res.similar?.length ? (
            <>
              <div style={{ fontWeight: 900, color: "#b45309" }}>
                {res.exact ? "Außerdem ähnlich" : "Ähnliche Bücher (Maße ±2 mm, Rest gleich) – vielleicht nur anders gemessen?"}
              </div>
              {res.similar.map((s) => (
                <BookCard key={s.book.id} book={s.book} diff={s.diff} tone="similar" />
              ))}
            </>
          ) : null}
          {!res.exact && !res.similar?.length ? (
            <div style={{ color: "#15803d" }}>Dieses Buch ist noch nicht in der Datenbank.</div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
