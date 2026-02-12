import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPublicBook } from "../api/books";
import "./BookPage.css";

function isAbortError(e) {
  return (
    e?.name === "AbortError" ||
    String(e?.message || "").toLowerCase().includes("aborted")
  );
}

function getHost(url) {
  try {
    return new URL(url).host;
  } catch {
    return "";
  }
}

export default function BookPage() {
  const { id } = useParams();
  const [sp] = useSearchParams();

  const safeId = useMemo(() => String(id || "").trim(), [id]);

  // Optional params (still supported, but DB can also provide)
  const coverFromQS = sp.get("cover") || "";
  const buyFromQS = sp.get("buy") || "";

  const [book, setBook] = useState(null);
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(true);
  const [coverBroken, setCoverBroken] = useState(false);

  // Full cover: prefer querystring cover; else default to /assets/covers/<id>.jpg
  const coverSrc = useMemo(() => {
    if (coverFromQS) return coverFromQS;
    if (!safeId) return "";
    return `/assets/covers/${encodeURIComponent(safeId)}.jpg`;
  }, [coverFromQS, safeId]);

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        setLoading(true);
        setErr("");
        setBook(null);

        const data = await getPublicBook(safeId, { signal: ac.signal });
        setBook(data);
      } catch (e) {
        if (isAbortError(e)) return;
        setErr(e?.message || "Failed to load book");
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [safeId]);

  const title = book?.title || "—";
  const author = book?.author || "—";

  
  // ✅ Your personal comment (stored in DB)
  const comment = book?.comment || "";

  // Purchase link:
  // - prefer querystring (?buy=)
  // - else use DB fields if provided by API
  const purchaseUrl =
    buyFromQS ||
    book?.purchase_url ||
    book?.purchase_link ||
    "";

  const purchaseHost = purchaseUrl ? getHost(purchaseUrl) : "";

  return (
    <div className="zr-bookpage">
      <div className="zr-bookpage__top">
        <Link className="zr-btn2 zr-btn2--ghost" to="/">
          ← Back
        </Link>

        {purchaseUrl ? (
          <a
            className="zr-btn2 zr-btn2--primary"
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title="Opens in a new tab"
          >
            Purchase link ↗
          </a>
        ) : (
          <span className="zr-bookpage__noLink">No purchase link</span>
        )}
      </div>

      {loading ? (
        <div className="zr-bookpage__card">Loading…</div>
      ) : err ? (
        <div className="zr-bookpage__card">
          <strong>Error:</strong> {err}
        </div>
      ) : (
        <div className="zr-bookpage__grid">
          {/* Full cover */}
          <div className="zr-bookpage__coverCard">
            {coverSrc && !coverBroken ? (
              <img
                className="zr-bookpage__coverImg"
                src={coverSrc}
                alt={`${title} cover`}
                onError={() => setCoverBroken(true)}
              />
            ) : (
              <div className="zr-bookpage__coverEmpty">
                No cover image
                {safeId ? (
                  <div className="zr-bookpage__coverHint">
                    Expected: <code>/assets/covers/{safeId}.jpg</code>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          {/* User-facing info */}
          <div className="zr-bookpage__card">
            <h1 className="zr-bookpage__title">{title}</h1>
            <div className="zr-bookpage__author">{author}</div>

           
            {/* ✅ My comment */}
            {comment ? (
              <div className="zr-bookpage__commentBox">
                <div className="zr-bookpage__commentTitle">My comment</div>
                <div
                  className="zr-bookpage__commentText"
                  style={{ whiteSpace: "pre-wrap" }}
                >
                  {comment}
                </div>
              </div>
            ) : null}

            {/* Purchase section */}
            <div className="zr-bookpage__buyBox">
              <div className="zr-bookpage__buyTitle">Purchase</div>

              {purchaseUrl ? (
                <>
                  <div className="zr-bookpage__buyText">
                    You stay on this site unless you click the purchase link.
                  </div>

                  <a
                    className="zr-bookpage__buyLink"
                    href={purchaseUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Open purchase link {purchaseHost ? `(${purchaseHost})` : ""} ↗
                  </a>
                </>
              ) : (
                <div className="zr-bookpage__buyText">No purchase link set yet.</div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}