import React, { useEffect, useMemo, useRef, useState } from "react";
import { listNeedsReview, resolveMobileIssue } from "../api/mobileSync";
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

function getIssueReason(it) {
  return it?.issue?.reason || it?.reason || "—";
}

function getIssueDetails(it) {
  return it?.issue?.details || it?.details || {};
}


function getIssueNote(it) {
  const d = getIssueDetails(it) || {};
  // prefer explicit issue.note, then details.note, then payload note fields
  return (
    it?.issue?.note ??
    it?.note ??
    d?.note ??
    it?.issue?.payload?.note ??
    it?.receipt?.payload?.note ??
    it?.payload?.note ??
    null
  );
}

function getIncomingPages(it) {
  const d = getIssueDetails(it);
  const v = d?.incoming_pages ?? d?.incomingPages ?? it?.receipt?.pages;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function getExpectedPages(it) {
  const d = getIssueDetails(it);
  const v = d?.expected_pages ?? d?.expectedPages;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function SyncIssuePage() {
  const [q, setQ] = useState({ page: 1, limit: 20 });
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");
  const [data, setData] = useState({ items: [], total: 0, pages: 1 });
  const [expanded, setExpanded] = useState(() => new Set());
  const [busy, setBusy] = useState(() => new Set());
  const acRef = useRef(null);

  const canPrev = q.page > 1;
  const canNext = q.page < (data.pages || 1);

  async function refresh() {
    if (acRef.current) acRef.current.abort();

    const ac = new AbortController();
    acRef.current = ac;

    setLoading(true);
    setErr("");

    try {
      const d = await listNeedsReview({ page: q.page, limit: q.limit, signal: ac.signal });
      setData({
        items: Array.isArray(d?.items) ? d.items : [],
        total: Number.isFinite(d?.total) ? d.total : 0,
        pages: Number.isFinite(d?.pages) ? d.pages : 1,
      });
    } catch (e) {
      if (!ac.signal.aborted) {
        setData({ items: [], total: 0, pages: 1 });
        setErr(e?.message || "Fehler beim Laden");
      }
    } finally {
      if (!ac.signal.aborted) setLoading(false);
    }
  }

  useEffect(() => {
    refresh();
    return () => acRef.current?.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q.page, q.limit]);

  const rows = useMemo(() => data.items || [], [data.items]);

  function toggleExpanded(issueId) {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(issueId)) next.delete(issueId);
      else next.add(issueId);
      return next;
    });
  }

  function setBusyOn(issueId, on) {
    setBusy((prev) => {
      const next = new Set(prev);
      if (on) next.add(issueId);
      else next.delete(issueId);
      return next;
    });
  }

  async function discard(it) {
    const issueId = getIssueId(it);
    if (!issueId) return alert("Issue-ID fehlt");
    if (!window.confirm("Issue wirklich verwerfen?")) return;

    setBusyOn(issueId, true);

    try {
      await resolveMobileIssue(issueId, { action: "discard" });

      setData((prev) => ({
        ...prev,
        items: prev.items.filter((x) => getIssueId(x) !== issueId),
        total: Math.max(0, (prev.total || 0) - 1),
      }));
    } catch (e) {
      alert(e?.message || "Verwerfen fehlgeschlagen");
    } finally {
      setBusyOn(issueId, false);
    }
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

        {!loading && !err && rows.length === 0 ? (
          <div className="authors-message">Keine offenen Sync-Issues 🎉</div>
        ) : null}

        {!loading && !err
          ? rows.map((it, index) => {
              const issueId = getIssueId(it);
              const receipt = it?.receipt || it;
              const barcode = receipt?.barcode || "(kein Barcode)";
              const reason = getIssueReason(it);
              const incomingPages = getIncomingPages(it);
              const expectedPages = getExpectedPages(it);
              const isOpen = expanded.has(issueId);
              const isBusy = busy.has(issueId);
              const key = issueId || receipt?.receipt_id || receipt?.receiptId || index;

              return (
                <React.Fragment key={key}>
                  <div className="authors-row sync-row">
                    <button
                      className="authors-cell authors-name sync-open"
                      type="button"
                      onClick={() => toggleExpanded(issueId)}
                    >
                      {barcode}{getIssueNote(it) ? ` — 📝 ${getIssueNote(it)}` : ''}
                    </button>

                    <div className="authors-cell authors-number">{reason}</div>
                    <div className="authors-cell authors-number">{incomingPages ?? "—"}</div>
                    <div className="authors-cell authors-number">{expectedPages ?? "—"}</div>

                    <div className="authors-cell authors-number sync-actions">
                      <button type="button" onClick={() => toggleExpanded(issueId)}>
                        {isOpen ? "Close" : "Open"}
                      </button>
                      <button type="button" onClick={() => discard(it)} disabled={isBusy}>
                        Discard
                      </button>
                    </div>
                  </div>

                  {isOpen ? (
                    <div className="sync-detail">
                      <div>
                        <strong>Received:</strong>{" "}
                        {fmtTs(receipt?.received_at || receipt?.receivedAt)}
                      </div>
                      <div>
                        <strong>Status:</strong>{" "}
                        {receipt?.reading_status || receipt?.readingStatus || "—"}
                      </div>
                                            <div>
                        <strong>Note:</strong>{" "}
                        {getIssueNote(it) || "—"}
                      </div>
<div>
                        <strong>Updated:</strong>{" "}
                        {fmtTs(receipt?.reading_status_updated_at || receipt?.readingStatusUpdatedAt)}
                      </div>
                      <pre>{JSON.stringify(getIssueDetails(it), null, 2)}</pre>
                    </div>
                  ) : null}
                </React.Fragment>
              );
            })
          : null}
      </div>
    </section>
  );
}