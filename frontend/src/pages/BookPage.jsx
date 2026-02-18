import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { getPublicBook } from "../api/books";
import { createPublicBookComment, listPublicBookComments } from "../api/comments";
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

  const [comments, setComments] = useState([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentsErr, setCommentsErr] = useState("");

  const [form, setForm] = useState({ authorName: "", body: "", website: "" });
  const [submitState, setSubmitState] = useState({
    busy: false,
    okMsg: "",
    errMsg: "",
  });

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

  // Load approved comments
  useEffect(() => {
    if (!safeId) return;
    const ac = new AbortController();

    (async () => {
      try {
        setCommentsLoading(true);
        setCommentsErr("");
        const items = await listPublicBookComments(safeId, { signal: ac.signal });
        setComments(Array.isArray(items) ? items : []);
      } catch (e) {
        if (isAbortError(e)) return;
        setCommentsErr(e?.message || "Failed to load comments");
      } finally {
        if (!ac.signal.aborted) setCommentsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [safeId]);

  async function submitComment(e) {
    e.preventDefault();
    setSubmitState({ busy: true, okMsg: "", errMsg: "" });

    try {
      const body = String(form.body || "").trim();
      const authorName = String(form.authorName || "").trim();

      if (body.length < 3) throw new Error("Comment is too short.");

      await createPublicBookComment(safeId, {
        authorName,
        body,
        website: form.website,
      });

      setForm({ authorName: authorName, body: "", website: "" });
      setSubmitState({
        busy: false,
        okMsg: "Thanks! Your comment will appear after approval.",
        errMsg: "",
      });
    } catch (e2) {
      setSubmitState({
        busy: false,
        okMsg: "",
        errMsg: e2?.message || "Failed to submit comment",
      });
    }
  }

  const title = book?.title || "—";
  const author = book?.author || "—";

  // ✅ Your personal comment (stored in DB)
  const comment = book?.comment || "";

  // Purchase link:
  // - prefer querystring (?buy=)
  // - else use DB fields if provided by API
  const purchaseUrl = buyFromQS || book?.purchase_url || book?.purchase_link || "";
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
        <>
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

              {/* ✅ Leave a comment (moved up) */}
              <div className="zr-bookpage__leaveBox">
                <div className="zr-bookpage__leaveHeader">
                  <h3 className="zr-bookpage__leaveTitle">Leave a comment</h3>
                  <div className="zr-bookpage__commentsMeta">
                    {commentsLoading ? "Loading…" : `${comments.length} approved`}
                  </div>
                </div>

                <div className="zr-bookpage__hint">
                  No account needed. Comments are visible after approval.
                </div>

                {submitState.okMsg ? (
                  <div className="zr-bookpage__noticeOk">{submitState.okMsg}</div>
                ) : null}
                {submitState.errMsg ? (
                  <div className="zr-bookpage__noticeErr">{submitState.errMsg}</div>
                ) : null}

                <form className="zr-bookpage__form" onSubmit={submitComment}>
                  <label className="zr-bookpage__label">
                    Name (optional)
                    <input
                      className="zr-input"
                      value={form.authorName}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, authorName: e.target.value }))
                      }
                      maxLength={80}
                      placeholder="Guest"
                    />
                  </label>

                  {/* Honeypot (hidden) */}
                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    className="zr-bookpage__hp"
                    value={form.website}
                    onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                    name="website"
                  />

                  <label className="zr-bookpage__label">
                    Comment
                    <textarea
                      className="zr-input"
                      value={form.body}
                      onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                      rows={6}
                      maxLength={2000}
                      placeholder="Write your comment…"
                      required
                    />
                  </label>

                  <button
                    className="zr-btn2 zr-btn2--primary"
                    type="submit"
                    disabled={submitState.busy}
                  >
                    {submitState.busy ? "Sending…" : "Submit"}
                  </button>
                </form>
              </div>

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

          {/* Public comments (list only) */}
          <div className="zr-bookpage__card">
            <div className="zr-bookpage__commentsHeader">
              <h2 className="zr-bookpage__commentsTitle">Comments</h2>
              <div className="zr-bookpage__commentsMeta">
                {commentsLoading ? "Loading…" : `${comments.length} approved`}
              </div>
            </div>

            {commentsErr ? (
              <div className="zr-bookpage__commentsError">{commentsErr}</div>
            ) : null}

            <div className="zr-bookpage__commentsList">
              {commentsLoading ? (
                <div className="zr-bookpage__commentsEmpty">Loading…</div>
              ) : comments.length ? (
                comments.map((c) => (
                  <div key={c.id} className="zr-bookpage__comment">
                    <div className="zr-bookpage__commentTop">
                      <div className="zr-bookpage__commentAuthor">
                        {c.author_name || "Guest"}
                      </div>
                      <div className="zr-bookpage__commentDate">
                        {c.created_at ? new Date(c.created_at).toLocaleDateString() : ""}
                      </div>
                    </div>
                    <div className="zr-bookpage__commentBody" style={{ whiteSpace: "pre-wrap" }}>
                      {c.body}
                    </div>
                  </div>
                ))
              ) : (
                <div className="zr-bookpage__commentsEmpty">No comments yet.</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}