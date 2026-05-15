import React, { useEffect, useMemo, useRef, useState } from "react";
import { listNeedsReview, resolveMobileIssue, searchBarcodes } from "../api/mobileSync";
import { listBooksByPages } from "../api/books";
import "./AuthorsIndexPage.css";

function fmtTs(ts) {
  if (!ts) return "—";
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return String(ts);
  }
}

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
      return inner.split(",").map((x) => x.replace(/"/g, "").trim()).filter(Boolean);
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
  return it?.issue?.reason || it?.reason || "—";
}

function getIssueDetails(it) {
  return it?.issue?.details || it?.details || {};
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
  const [picked, setPicked] = useState(() => new Map());
  const [noteByIssue, setNoteByIssue] = useState(() => new Map());
  const [busy, setBusy] = useState(() => new Set());

  const [samePagesByIssue, setSamePagesByIssue] = useState(() => new Map());
  const [expectedPagesByIssue, setExpectedPagesByIssue] = useState(() => new Map());

  const [barcodeQueryByIssue, setBarcodeQueryByIssue] = useState(() => new Map());
  const [barcodeHitsByIssue, setBarcodeHitsByIssue] = useState(() => new Map());
  const [overrideBarcodeByIssue, setOverrideBarcodeByIssue] = useState(() => new Map());
  const barcodeDebounceRef = useRef(new Map());

  const canPrev = useMemo(() => q.page > 1, [q.page]);
  const canNext = useMemo(() => q.page < (data.pages || 1), [q.page, data.pages]);

  function setBusyOn(issueId, on) {
    setBusy((prev) => {
      const n = new Set(prev);
      if (on) n.add(issueId);
      else n.delete(issueId);
      return n;
    });
  }

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
      if (reason === "pages_mismatch" && expectedPages != null) {
        ensureBooksForExpectedPages(issueId, expectedPages);
      }
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
    if (expectedPages != null && expectedPages !== incomingPages) {
      ensureBooksForExpectedPages(issueId, expectedPages);
    }

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

    if (
      !window.confirm(
        "Dieses Sync-Issue ohne Änderungen schließen?\n\nEs wird kein Buch, kein Barcode und keine Seitenzahl geändert."
      )
    ) {
      return;
    }

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
      alert(e?.message || "Ohne Änderungen schließen fehlgeschlagen");
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

  function candidateLabelForId(id, samePages, expectedList, bcHits) {
    if (!id) return "—";
    const fromIncoming = samePages?.items?.find((b) => String(b.id) === String(id)) || null;
    const fromExpected = expectedList?.items?.find((b) => String(b.id) === String(id)) || null;
    const fromHits = bcHits?.items?.find((x) => String(x?.book?.id) === String(id)) || null;
    const hitBook = fromHits?.book || null;

    const title = fromIncoming?.title || fromExpected?.title || hitBook?.title_display || hitBook?.title || "—";
    const author = fromIncoming?.author || fromExpected?.author || hitBook?.author_display || hitBook?.author || "—";
    const barcode = fromIncoming?.barcode || fromHits?.barcode || "—";
    const pages = (fromIncoming?.pages ?? hitBook?.pages) != null ? `${fromIncoming?.pages ?? hitBook?.pages} S.` : "— S.";

    const hasDetails = title !== "—" || author !== "—" || barcode !== "—";
    if (!hasDetails) return id;
    return `${barcode} · ${title} · ${author} · ${pages}`;
  }

  return (
    <section className="authors-brutal-page" aria-busy={loading ? "true" : "false"}>
      <div className="authors-grid sync-grid">
        <div className="authors-row authors-head sync-row">
          <div className="authors-cell authors-name authors-head-btn">
            <span>Barcode</span>
          </div>
          <div className="authors-cell authors-number authors-head-btn">
            <span>Reason</span>
          </div>
          <div className="authors-cell authors-number authors-head-btn">
            <span>Incoming</span>
          </div>
          <div className="authors-cell authors-number authors-head-btn">
            <span>Expected</span>
          </div>
          <div className="authors-cell authors-number authors-head-btn">
            <span>Action</span>
          </div>
        </div>

        {err ? <div className="authors-message authors-error">{err}</div> : null}
        {loading ? <div className="authors-message">Loading…</div> : null}

        {!loading && !err && (data.items?.length || 0) === 0 ? (
          <div className="authors-message">Keine offenen Sync-Issues 🎉</div>
        ) : null}

        {!loading && !err
          ? (data.items || []).map((it, index) => {
              const issueId = getIssueId(it);
              const receipt = it?.receipt || it;
              const barcode = receipt?.barcode || "(kein Barcode)";
              const reason = getIssueReason(it);
              const incomingPages = getIncomingPages(it);
              const expectedPages = getExpectedPages(it);
              const isOpen = expanded.has(issueId);
              const isBusy = busy.has(issueId);
              const key = issueId || receipt?.receipt_id || receipt?.receiptId || index;

              const preferredBookId = getPreferredBookId(it);
              const candIds = getCandidateBookIds(it);
              const samePages = samePagesByIssue.get(issueId);
              const expectedList = expectedPagesByIssue.get(issueId);
              const pickedId = picked.get(issueId) || preferredBookId || "";

              const bcQuery = barcodeQueryByIssue.get(issueId) || "";
              const bcHits = barcodeHitsByIssue.get(issueId);
              const overrideBarcode = overrideBarcodeByIssue.get(issueId) || "";
              const effectiveBarcodeToFree = String(overrideBarcode || receipt?.barcode || "").trim();
              const canApply = !isBusy && !!pickedId;

              return (
                <React.Fragment key={key}>
                  <div className="authors-row sync-row">
                    <button
                      className="authors-cell authors-name sync-open"
                      type="button"
                      onClick={() => toggleExpanded(issueId, incomingPages, expectedPages, barcode)}
                    >
                      {barcode}
                    </button>

                    <div className="authors-cell authors-number">{reason}</div>
                    <div className="authors-cell authors-number">{incomingPages ?? "—"}</div>
                    <div className="authors-cell authors-number">{expectedPages ?? "—"}</div>

                    <div className="authors-cell authors-number sync-actions">
                      <button
                        type="button"
                        onClick={() => toggleExpanded(issueId, incomingPages, expectedPages, barcode)}
                      >
                        {isOpen ? "Close" : "Open"}
                      </button>
                      <button type="button" onClick={() => quickResolve(it)} disabled={isBusy}>
                        Resolve
                      </button>
                      <button type="button" onClick={() => discard(it)} disabled={isBusy}>
                        Ohne Änderungen schließen
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="sync-detail">
                      <div>
                        <strong>Received:</strong> {fmtTs(receipt?.received_at || receipt?.receivedAt)}
                      </div>
                      <div>
                        <strong>Status:</strong> {receipt?.reading_status || receipt?.readingStatus || "—"}
                      </div>
                      <div>
                        <strong>Updated:</strong>{" "}
                        {fmtTs(receipt?.reading_status_updated_at || receipt?.readingStatusUpdatedAt)}
                      </div>

                      <label style={{ display: "grid", gap: 6, marginTop: 12 }}>
                        <strong>Notiz (optional)</strong>
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

                      <div style={{ marginTop: 12 }}>
                        <div style={{ fontWeight: 700, marginBottom: 6 }}>Barcode-Suche (gleichscheinende)</div>
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
                          <button type="button" onClick={() => runBarcodeSearch(issueId, bcQuery)}>
                            Suchen
                          </button>
                          {bcHits?.loading ? <span style={{ fontSize: 12, opacity: 0.7 }}>lade…</span> : null}
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

                      {candIds.length ? (
                        <div style={{ marginTop: 12 }}>
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
                                {candidateLabelForId(id, samePages, expectedList, bcHits)}
                              </option>
                            ))}
                          </select>
                        </div>
                      ) : null}

                      {incomingPages != null ? (
                        <div style={{ marginTop: 12 }}>
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

                      {reason === "pages_mismatch" && expectedPages != null && expectedPages !== incomingPages ? (
                        <div style={{ marginTop: 12 }}>
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

                      <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginTop: 12 }}>
                        <button type="button" onClick={() => apply(it)} disabled={!canApply}>
                          Anwenden
                        </button>
                        <button type="button" onClick={() => discard(it)} disabled={isBusy}>
                          Ohne Änderungen schließen
                        </button>
                        {!pickedId ? (
                          <span style={{ fontSize: 12, opacity: 0.7 }}>Bitte zuerst Buch auswählen.</span>
                        ) : null}
                        {isBusy ? <span style={{ fontSize: 12, opacity: 0.7 }}>…</span> : null}
                      </div>

                      <pre style={{ marginTop: 12 }}>{JSON.stringify(getIssueDetails(it), null, 2)}</pre>
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })
          : null}

        <div className="authors-row sync-row">
          <button
            className="authors-cell authors-name sync-open"
            type="button"
            onClick={() => canPrev && setQ((p) => ({ ...p, page: p.page - 1 }))}
            disabled={!canPrev || loading}
          >
            ← Zurück
          </button>
          <div className="authors-cell authors-number">
            Seite {q.page} / {data.pages || 1}
          </div>
          <button
            className="authors-cell authors-name sync-open"
            type="button"
            onClick={() => canNext && setQ((p) => ({ ...p, page: p.page + 1 }))}
            disabled={!canNext || loading}
          >
            Weiter →
          </button>
          <label className="authors-cell authors-number">
            <span style={{ fontSize: 12 }}>Pro Seite</span>
            <select
              className="zr-select"
              value={q.limit}
              onChange={(e) => setQ((p) => ({ ...p, limit: Number(e.target.value) || 20, page: 1 }))}
            >
              <option value={10}>10</option>
              <option value={20}>20</option>
              <option value={50}>50</option>
            </select>
          </label>
          <button
            className="authors-cell authors-number sync-open"
            type="button"
            onClick={() => refresh()}
            disabled={loading}
          >
            Aktualisieren
          </button>
        </div>
      </div>
    </section>
  );
}
