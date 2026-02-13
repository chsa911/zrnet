import React, { useEffect, useMemo, useRef, useState } from "react";
import { listNeedsReview, resolveMobileIssue, searchBarcodes } from "../api/mobileSync";
import { listBooksByPages } from "../api/books";
import AdminNavRow from "../components/AdminNavRow";

function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

function badge(text) {
  return (
    <span
      style={{
        display: "inline-block",
        padding: "2px 8px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.15)",
        fontSize: 12,
        opacity: 0.85,
      }}
    >
      {text}
    </span>
  );
}

// robust issue id
function getIssueId(it) {
  return it?.issue?.id || it?.issue?.issueId || it?.issue?.issue_id || it?.issueId || it?.issue_id || null;
}

function normalizeUuidArray(v) {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return [];
    if (s.startsWith("{") && s.endsWith("}")) {
      const inner = s.slice(1, -1).trim();
      if (!inner) return [];
      return inner
        .split(",")
        .map((x) => x.replace(/"/g, "").trim())
        .filter(Boolean);
    }
    try {
      const j = JSON.parse(s);
      if (Array.isArray(j)) return j.map(String).filter(Boolean);
    } catch {}
    return [s];
  }
  return [];
}

function getIssueReason(it) {
  return it?.issue?.reason || it?.reason || null;
}
function getIssueDetails(it) {
  return it?.issue?.details || it?.details || null;
}
function getChosenBookId(it) {
  const d = getIssueDetails(it) || {};
  return d?.chosen_book_id || d?.chosenBookId || null;
}
function getExpectedPages(it) {
  const d = getIssueDetails(it) || {};
  const v = d?.expected_pages ?? d?.expectedPages;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function getIncomingPages(it) {
  const d = getIssueDetails(it) || {};
  const v = d?.incoming_pages ?? d?.incomingPages;
  const n = Number(v);
  if (Number.isFinite(n)) return n;
  const rp = it?.receipt;
  const n2 = Number(rp?.pages);
  return Number.isFinite(n2) ? n2 : null;
}
function getCandidateBookIds(it) {
  const issue = it?.issue || {};
  return normalizeUuidArray(
    issue?.candidate_book_ids ??
      issue?.candidateBookIds ??
      it?.candidate_book_ids ??
      it?.candidateBookIds
  );
}
function getPreferredBookId(it) {
  const chosen = getChosenBookId(it);
  if (chosen) return chosen;
  const ids = getCandidateBookIds(it);
  if (ids.length === 1) return ids[0];
  return null;
}

function normalizeBookForPick(b) {
  if (!b) return null;
  const id = b.id ?? b._id ?? null;
  if (!id) return null;

  const title =
    b.title_display ||
    b.title ||
    [b.BKw, b.BKw1, b.BKw2].filter(Boolean).join(" ").trim() ||
    "—";

  const author = b.authorNameDisplay || b.author_display || b.author || b.BAutor || "";

  return {
    id,
    barcode: b.barcode || b.BMarkb || b.BMark || null,
    pages: b.pages ?? b.BSeiten ?? null,
    reading_status: b.reading_status ?? b.status ?? null,
    top_book: b.top_book ?? b.BTop ?? null,
    registered_at: b.registered_at ?? b.createdAt ?? b.BEind ?? null,
    title,
    author,
  };
}

export default function SyncIssuePage() {
  const [q, setQ] = useState({ page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });

  const [expanded, setExpanded] = useState(() => new Set());
  const [picked, setPicked] = useState(() => new Map()); // issueId -> bookId
  const [noteByIssue, setNoteByIssue] = useState(() => new Map());
  const [busy, setBusy] = useState(() => new Set());

  const [samePagesByIssue, setSamePagesByIssue] = useState(() => new Map());
  const [expectedPagesByIssue, setExpectedPagesByIssue] = useState(() => new Map());

  // barcode search state
  const [barcodeQueryByIssue, setBarcodeQueryByIssue] = useState(() => new Map());
  const [barcodeHitsByIssue, setBarcodeHitsByIssue] = useState(() => new Map()); // issueId -> {loading, err, items}
  const [overrideBarcodeByIssue, setOverrideBarcodeByIssue] = useState(() => new Map()); // issueId -> barcode

  // debounce timers per issueId
  const barcodeDebounceRef = useRef(new Map());

  function setBusyOn(issueId, on) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(issueId);
      else n.delete(issueId);
      return n;
    });
  }

  const canPrev = useMemo(() => q.page > 1, [q.page]);
  const canNext = useMemo(() => q.page < (data.pages || 1), [q.page, data.pages]);

  async function refresh() {
    setLoading(true);
    setErr("");
    try {
      const d = await listNeedsReview({ page: q.page, limit: q.limit });
      setData({
        items: Array.isArray(d?.items) ? d.items : [],
        total: Number.isFinite(d?.total) ? d.total : 0,
        pages: Number.isFinite(d?.pages) ? d.pages : 1,
      });
    } catch (e) {
      setData({ items: [], total: 0, pages: 1 });
      setErr(e?.message || "Fehler beim Laden");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.limit]);

  useEffect(() => {
    return () => {
      for (const t of barcodeDebounceRef.current.values()) clearTimeout(t);
      barcodeDebounceRef.current.clear();
    };
  }, []);

  function scheduleBarcodeSearch(issueId, value) {
    const v = String(value || "").trim();

    if (v.length < 2) {
      const t = barcodeDebounceRef.current.get(issueId);
      if (t) clearTimeout(t);
      barcodeDebounceRef.current.delete(issueId);

      setBarcodeHitsByIssue((prev) => {
        const n = new Map(prev);
        n.delete(issueId);
        return n;
      });
      return;
    }

    const old = barcodeDebounceRef.current.get(issueId);
    if (old) clearTimeout(old);

    const timer = setTimeout(() => {
      runBarcodeSearch(issueId, v);
      barcodeDebounceRef.current.delete(issueId);
    }, 300);

    barcodeDebounceRef.current.set(issueId, timer);
  }

  async function ensureBooksForIncomingPages(issueId, pages) {
    if (!issueId || pages == null) return;
    const existing = samePagesByIssue.get(issueId);
    if (existing?.loading || existing?.items) return;

    setSamePagesByIssue((prev) => {
      const n = new Map(prev);
      n.set(issueId, { loading: true, err: "", items: null, total: 0 });
      return n;
    });

    try {
      const res = await listBooksByPages(pages, { limit: 200, page: 1 });
      const items = (res.items || []).map(normalizeBookForPick).filter(Boolean);
      setSamePagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: "", items, total: res.total || items.length });
        return n;
      });
    } catch (e) {
      setSamePagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: e?.message || "Fehler", items: [], total: 0 });
        return n;
      });
    }
  }

  async function ensureBooksForExpectedPages(issueId, expectedPages) {
    if (!issueId || expectedPages == null) return;
    const existing = expectedPagesByIssue.get(issueId);
    if (existing?.loading || existing?.items) return;

    setExpectedPagesByIssue((prev) => {
      const n = new Map(prev);
      n.set(issueId, { loading: true, err: "", items: null, total: 0 });
      return n;
    });

    try {
      const res = await listBooksByPages(expectedPages, { limit: 200, page: 1 });
      const items = (res.items || []).map(normalizeBookForPick).filter(Boolean);
      setExpectedPagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: "", items, total: res.total || items.length });
        return n;
      });
    } catch (e) {
      setExpectedPagesByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: e?.message || "Fehler", items: [], total: 0 });
        return n;
      });
    }
  }

  async function runBarcodeSearch(issueId, query) {
    const qq = String(query || "").trim();
    if (!issueId || !qq) return;

    setBarcodeHitsByIssue((prev) => {
      const n = new Map(prev);
      n.set(issueId, { loading: true, err: "", items: [] });
      return n;
    });

    try {
      const r = await searchBarcodes({ q: qq, mode: "similar", limit: 40 });
      const items = Array.isArray(r?.items) ? r.items : [];
      setBarcodeHitsByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: "", items });
        return n;
      });
    } catch (e) {
      setBarcodeHitsByIssue((prev) => {
        const n = new Map(prev);
        n.set(issueId, { loading: false, err: e?.message || "Fehler", items: [] });
        return n;
      });
    }
  }

  // Prefetch
  useEffect(() => {
    (data.items || []).forEach((it) => {
      const issueId = getIssueId(it);
      if (!issueId) return;

      const reason = getIssueReason(it);
      const incomingPages = getIncomingPages(it);
      const expectedPages = getExpectedPages(it);
      const prefId = getPreferredBookId(it);

      if (prefId && !picked.get(issueId)) {
        setPicked((prev) => {
          const n = new Map(prev);
          n.set(issueId, prefId);
          return n;
        });
      }

      if (incomingPages != null) ensureBooksForIncomingPages(issueId, incomingPages);
      if (reason === "pages_mismatch" && expectedPages != null)
        ensureBooksForExpectedPages(issueId, expectedPages);
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.items]);

  function toggleExpanded(issueId, incomingPages, expectedPages, barcode) {
    const willOpen = !expanded.has(issueId);

    setExpanded((prev) => {
      const n = new Set(prev);
      if (n.has(issueId)) n.delete(issueId);
      else n.add(issueId);
      return n;
    });

    if (!willOpen) return;

    ensureBooksForIncomingPages(issueId, incomingPages);
    if (expectedPages != null && expectedPages !== incomingPages)
      ensureBooksForExpectedPages(issueId, expectedPages);

    const bq = String(barcode || "").trim();
    if (bq) {
      setBarcodeQueryByIssue((prev) => {
        const n = new Map(prev);
        if (!n.get(issueId)) n.set(issueId, bq);
        return n;
      });
      runBarcodeSearch(issueId, bq);
    }
  }

  async function apply(it, overrideBookId = null) {
    const issueId = getIssueId(it);
    const bookId = overrideBookId || picked.get(issueId);

    if (!issueId) return alert("Issue-ID fehlt (Backend Response prüfen)");
    if (!bookId) return alert("Bitte wähle ein Buch aus");

    const overrideBarcode = overrideBarcodeByIssue.get(issueId) || null;

    setBusyOn(issueId, true);
    try {
      await resolveMobileIssue(issueId, {
        action: "apply",
        bookId,
        note: noteByIssue.get(issueId) || null,
        ...(overrideBarcode ? { overrideBarcode } : {}),
      });

      setData((prev) => ({
        ...prev,
        items: prev.items.filter((x) => getIssueId(x) !== issueId),
        total: Math.max(0, (prev.total || 0) - 1),
      }));

      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(issueId);
        return n;
      });
    } catch (e) {
      alert(e?.message || "Resolve fehlgeschlagen");
    } finally {
      setBusyOn(issueId, false);
    }
  }

  async function discard(it) {
    const issueId = getIssueId(it);
    if (!issueId) return alert("Issue-ID fehlt (Backend Response prüfen)");
    if (!window.confirm("Issue wirklich verwerfen?")) return;

    setBusyOn(issueId, true);
    try {
      await resolveMobileIssue(issueId, {
        action: "discard",
        note: noteByIssue.get(issueId) || null,
      });

      setData((prev) => ({
        ...prev,
        items: prev.items.filter((x) => getIssueId(x) !== issueId),
        total: Math.max(0, (prev.total || 0) - 1),
      }));

      setExpanded((prev) => {
        const n = new Set(prev);
        n.delete(issueId);
        return n;
      });
    } catch (e) {
      alert(e?.message || "Verwerfen fehlgeschlagen");
    } finally {
      setBusyOn(issueId, false);
    }
  }

  function quickResolve(it) {
    const issueId = getIssueId(it);
    const pref = getPreferredBookId(it);
    if (issueId && pref) return apply(it, pref);

    const incomingPages = getIncomingPages(it);
    const expectedPages = getExpectedPages(it);
    const receipt = it?.receipt || it;
    toggleExpanded(issueId, incomingPages, expectedPages, receipt?.barcode);
  }

  return (
    <section className="zr-section">
      <AdminNavRow />
      <h1>Sync Issues</h1>
      <p className="zr-lede">
        Mobile-Sync Einträge mit <strong>status=needs_review</strong>.
      </p>

      <div className="zr-card">
        <div className="zr-toolbar" style={{ alignItems: "center" }}>
          <div style={{ fontSize: 14, opacity: 0.85 }}>
            Seite <strong>{q.page}</strong> / <strong>{data.pages || 1}</strong> · Gesamt{" "}
            <strong>{data.total || 0}</strong>
          </div>

          <div className="zr-toolbar__grow" />

          <label style={{ fontSize: 12, opacity: 0.75 }}>
            Pro Seite
            <select
              className="zr-select"
              style={{ marginLeft: 8 }}
              value={q.limit}
              onChange={(e) =>
                setQ((p) => ({
                  ...p,
                  limit: Number(e.target.value) || 20,
                  page: 1,
                }))
              }
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => refresh()}
            disabled={loading}
          >
            Aktualisieren
          </button>

          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => canPrev && setQ((p) => ({ ...p, page: p.page - 1 }))}
            disabled={!canPrev || loading}
          >
            ◀
          </button>
          <button
            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
            onClick={() => canNext && setQ((p) => ({ ...p, page: p.page + 1 }))}
            disabled={!canNext || loading}
          >
            ▶
          </button>
        </div>

        {err ? <div style={{ marginTop: 10, color: "#a00" }}>{err}</div> : null}
        {loading ? <div style={{ marginTop: 10, opacity: 0.75 }}>Lade…</div> : null}

        {!loading && !err && (data.items?.length || 0) === 0 ? (
          <div style={{ marginTop: 10, opacity: 0.75 }}>Keine offenen Sync-Issues 🎉</div>
        ) : null}

        <div style={{ display: "grid", gap: 12, marginTop: 12 }}>
          {(data.items || []).map((it) => {
            const issueId = getIssueId(it);
            const receipt = it?.receipt || it;
            const isOpen = expanded.has(issueId);
            const isBusy = busy.has(issueId);

            const incomingPages = getIncomingPages(it);
            const expectedPages = getExpectedPages(it);
            const reason = getIssueReason(it);
            const preferredBookId = getPreferredBookId(it);

            const candIds = getCandidateBookIds(it);

            const samePages = samePagesByIssue.get(issueId);
            const expectedList = expectedPagesByIssue.get(issueId);

            const pickedId = picked.get(issueId) || preferredBookId || "";

            const bookFromExpected = pickedId && expectedList?.items?.find((b) => b?.id === pickedId);
            const bookFromIncoming = pickedId && samePages?.items?.find((b) => b?.id === pickedId);
            const showBook = bookFromExpected || bookFromIncoming || null;

            const bcQuery = barcodeQueryByIssue.get(issueId) || "";
            const bcHits = barcodeHitsByIssue.get(issueId);
            const overrideBarcode = overrideBarcodeByIssue.get(issueId) || "";
            const effectiveBarcodeToFree = String(overrideBarcode || receipt?.barcode || "").trim();

            const canApply = !isBusy && !!pickedId;

            // candidate label helper (NO "a" variable)
            const candidateLabelForId = (id) => {
              if (!id) return "—";
              const fromIncoming2 = samePages?.items?.find((b) => String(b.id) === String(id)) || null;
              const fromExpected2 = expectedList?.items?.find((b) => String(b.id) === String(id)) || null;

              const fromHits2 =
                bcHits?.items?.find((x) => String(x?.book?.id) === String(id)) || null;

              const hitBook = fromHits2?.book || null;

              const title =
                fromIncoming2?.title ||
                fromExpected2?.title ||
                hitBook?.title_display ||
                hitBook?.title ||
                "—";

              const author =
                fromIncoming2?.author ||
                fromExpected2?.author ||
                hitBook?.author_display ||
                hitBook?.author ||
                "—";

              const barcode = fromIncoming2?.barcode || fromHits2?.barcode || "—";
              const pages = (fromIncoming2?.pages ?? hitBook?.pages) != null ? `${(fromIncoming2?.pages ?? hitBook?.pages)} S.` : "— S.";

              // If we have nothing but title/author as "—", fallback to UUID
              const hasDetails = title !== "—" || author !== "—" || barcode !== "—";
              if (!hasDetails) return id;

              return `${barcode} · ${title} · ${author} · ${pages}`;
            };

            return (
              <div
                key={receipt?.receipt_id || receipt?.receiptId || issueId || Math.random()}
                style={{ border: "1px solid rgba(0,0,0,0.12)", borderRadius: 16, padding: 14 }}
              >
                <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
                  <strong style={{ fontSize: 16 }}>{receipt?.barcode || "(kein Barcode)"}</strong>
                  {incomingPages != null ? badge(`${incomingPages} Seiten`) : null}
                  {reason ? badge(reason) : null}
                  {receipt?.received_at || receipt?.receivedAt
                    ? badge(`empfangen: ${fmtTs(receipt?.received_at || receipt?.receivedAt)}`)
                    : null}
                  {candIds.length ? badge(`Kandidaten: ${candIds.length}`) : null}

                  <div style={{ flex: 1 }} />

                  <button
                    className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                    onClick={() =>
                      toggleExpanded(issueId, incomingPages, expectedPages, receipt?.barcode)
                    }
                  >
                    {isOpen ? "Details schließen" : "Details öffnen"}
                  </button>

                  <button className="zr-btn2 zr-btn2--sm" onClick={() => quickResolve(it)} disabled={isBusy}>
                    Resolve
                  </button>
                </div>

                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.85 }}>
                  Incoming: status{" "}
                  <strong>{receipt?.reading_status || receipt?.readingStatus || "—"}</strong> · geändert am{" "}
                  <strong>{fmtTs(receipt?.reading_status_updated_at || receipt?.readingStatusUpdatedAt)}</strong>
                </div>

                {showBook ? (
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.85 }}>
                    Buch (DB): <strong>{showBook.title || "—"}</strong>
                    {showBook.author ? ` · ${showBook.author}` : ""}
                    {showBook.pages != null ? ` · ${showBook.pages} Seiten` : ""}
                  </div>
                ) : (
                  <div style={{ marginTop: 6, fontSize: 13, opacity: 0.65 }}>
                    Buch (DB): {pickedId ? "lade Daten…" : "kein Kandidat"}
                  </div>
                )}

                {isOpen ? (
                  <div style={{ marginTop: 12 }}>
                    <div style={{ display: "grid", gap: 10 }}>
                      <label style={{ display: "grid", gap: 6 }}>
                        Notiz (optional)
                        <input
                          className="zr-input"
                          value={noteByIssue.get(issueId) || ""}
                          onChange={(e) => {
                            const v = e.target.value;
                            setNoteByIssue((prev) => {
                              const n = new Map(prev);
                              n.set(issueId, v);
                              return n;
                            });
                          }}
                          placeholder="z.B. richtiger Datensatz gewählt …"
                        />
                      </label>

                      {/* Barcode Search */}
                      <div style={{ marginTop: 6 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>
                          Barcode-Suche (gleichscheinende)
                        </div>

                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
                          <input
                            className="zr-input"
                            style={{ minWidth: 220 }}
                            placeholder="z.B. dyk021"
                            value={bcQuery}
                            onChange={(e) => {
                              const v = e.target.value;
                              setBarcodeQueryByIssue((prev) => {
                                const n = new Map(prev);
                                n.set(issueId, v);
                                return n;
                              });
                              scheduleBarcodeSearch(issueId, v);
                            }}
                          />
                          <button
                            className="zr-btn2 zr-btn2--ghost zr-btn2--sm"
                            onClick={() => runBarcodeSearch(issueId, bcQuery)}
                          >
                            Suchen
                          </button>
                          {bcHits?.loading ? (
                            <span style={{ fontSize: 12, opacity: 0.7 }}>lade…</span>
                          ) : null}
                        </div>

                        {bcHits?.err ? (
                          <div style={{ color: "#a00", fontSize: 12, marginTop: 6 }}>{bcHits.err}</div>
                        ) : null}

                        {Array.isArray(bcHits?.items) && bcHits.items.length ? (
                          <div style={{ marginTop: 8, display: "grid", gap: 6 }}>
                            <select
                              className="zr-select"
                              value={overrideBarcode}
                              onChange={(e) => {
                                const v = e.target.value;

                                setOverrideBarcodeByIssue((prev) => {
                                  const n = new Map(prev);
                                  if (!v) n.delete(issueId);
                                  else n.set(issueId, v);
                                  return n;
                                });

                                const hit = bcHits.items.find((x) => x?.barcode === v);
                                const bid = hit?.book?.id;
                                if (bid) {
                                  setPicked((prev) => {
                                    const n = new Map(prev);
                                    n.set(issueId, String(bid));
                                    return n;
                                  });
                                }
                              }}
                            >
                              <option value="">(Barcode aus Receipt verwenden)</option>
                              {bcHits.items.map((x) => {
                                const t = x.book?.title_display ?? x.book?.title ?? "—";
                                const a = x.book?.author_display ?? x.book?.author ?? "—";
                                const p = x.book?.pages != null ? `${x.book.pages} S.` : "— S.";
                                return (
                                  <option key={x.barcode} value={x.barcode}>
                                    {`${x.barcode} · ${t} · ${a} · ${p}`}
                                  </option>
                                );
                              })}
                            </select>

                            <div style={{ fontSize: 12, opacity: 0.75 }}>
                              Freigegeben wird: <strong>{effectiveBarcodeToFree || "—"}</strong>
                            </div>
                          </div>
                        ) : (
                          <div style={{ marginTop: 8, fontSize: 12, opacity: 0.7 }}>
                            {bcHits?.loading ? "" : "Keine Treffer – Tipp: nur den Anfang (z.B. dyk) suchen."}
                          </div>
                        )}
                      </div>

                      {/* Kandidaten */}
                      {candIds.length ? (
                        <div style={{ marginTop: 6 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>Kandidaten</div>
                          <select
                            className="zr-select"
                            value={pickedId}
                            onChange={(e) => {
                              const id = e.target.value;
                              setPicked((prev) => {
                                const n = new Map(prev);
                                if (!id) n.delete(issueId);
                                else n.set(issueId, id);
                                return n;
                              });
                            }}
                          >
                            <option value="">Bitte wählen…</option>
                            {candIds.map((id) => (
                              <option key={id} value={id}>
                                {candidateLabelForId(id)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {/* Bücher mit incoming pages */}
                      {incomingPages != null ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            Bücher mit {incomingPages} Seiten
                            {samePages?.loading ? " (lade…)" : ""}
                            {!samePages?.loading && samePages?.items
                              ? ` (${samePages.total || samePages.items.length})`
                              : ""}
                          </div>

                          {samePages?.err ? (
                            <div style={{ color: "#a00", fontSize: 12 }}>{samePages.err}</div>
                          ) : null}

                          {!samePages?.loading && Array.isArray(samePages?.items) ? (
                            samePages.items.length ? (
                              <select
                                className="zr-select"
                                value={picked.get(issueId) || ""}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setPicked((prev) => {
                                    const n = new Map(prev);
                                    if (!id) n.delete(issueId);
                                    else n.set(issueId, id);
                                    return n;
                                  });
                                }}
                              >
                                <option value="">Bitte wählen…</option>
                                {samePages.items.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {(b.barcode || "—") +
                                      " · " +
                                      (b.title || "—") +
                                      (b.author ? " · " + b.author : "")}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ opacity: 0.7, fontSize: 12 }}>Keine Treffer.</div>
                            )
                          ) : null}
                        </div>
                      ) : null}

                      {/* Bei pages_mismatch zusätzlich DB-expected pages */}
                      {reason === "pages_mismatch" &&
                      expectedPages != null &&
                      expectedPages !== incomingPages ? (
                        <div style={{ marginTop: 10 }}>
                          <div style={{ fontWeight: 700, marginBottom: 6 }}>
                            Bücher mit {expectedPages} Seiten (DB)
                            {expectedList?.loading ? " (lade…)" : ""}
                            {!expectedList?.loading && expectedList?.items
                              ? ` (${expectedList.total || expectedList.items.length})`
                              : ""}
                          </div>

                          {expectedList?.err ? (
                            <div style={{ color: "#a00", fontSize: 12 }}>{expectedList.err}</div>
                          ) : null}

                          {!expectedList?.loading && Array.isArray(expectedList?.items) ? (
                            expectedList.items.length ? (
                              <select
                                className="zr-select"
                                value={picked.get(issueId) || ""}
                                onChange={(e) => {
                                  const id = e.target.value;
                                  setPicked((prev) => {
                                    const n = new Map(prev);
                                    if (!id) n.delete(issueId);
                                    else n.set(issueId, id);
                                    return n;
                                  });
                                }}
                              >
                                <option value="">Bitte wählen…</option>
                                {expectedList.items.map((b) => (
                                  <option key={b.id} value={b.id}>
                                    {(b.barcode || "—") +
                                      " · " +
                                      (b.title || "—") +
                                      (b.author ? " · " + b.author : "")}
                                  </option>
                                ))}
                              </select>
                            ) : (
                              <div style={{ opacity: 0.7, fontSize: 12 }}>Keine Treffer.</div>
                            )
                          ) : null}
                        </div>
                      ) : null}

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 6 }}>
                        <button className="zr-btn2 zr-btn2--sm" onClick={() => apply(it)} disabled={!canApply}>
                          Anwenden
                        </button>
                        <button className="zr-btn2 zr-btn2--ghost zr-btn2--sm" onClick={() => discard(it)} disabled={isBusy}>
                          Verwerfen
                        </button>
                        {!pickedId ? (
                          <span style={{ fontSize: 12, opacity: 0.7 }}>Bitte zuerst Buch auswählen.</span>
                        ) : null}
                        {isBusy ? <span style={{ fontSize: 12, opacity: 0.7 }}>…</span> : null}
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}