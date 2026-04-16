import { useEffect, useMemo, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
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
  const { t, locale } = useI18n();

  const safeId = useMemo(() => String(id || "").trim(), [id]);

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

  const coverSrc = useMemo(() => {
    if (coverFromQS) return coverFromQS;
    if (!safeId) return "";
    return `/media/covers/${encodeURIComponent(safeId)}.jpg`;
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
        setErr(e?.message || t("book.failed_to_load_book"));
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    })();

    return () => ac.abort();
  }, [safeId, t]);

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
        setCommentsErr(e?.message || t("book.failed_to_load_comments"));
      } finally {
        if (!ac.signal.aborted) setCommentsLoading(false);
      }
    })();

    return () => ac.abort();
  }, [safeId, t]);

  async function submitComment(e) {
    e.preventDefault();
    setSubmitState({ busy: true, okMsg: "", errMsg: "" });

    try {
      const body = String(form.body || "").trim();
      const authorName = String(form.authorName || "").trim();

      if (body.length < 3) throw new Error(t("book.comment_too_short"));

      await createPublicBookComment(safeId, {
        authorName,
        body,
        website: form.website,
      });

      setForm({ authorName, body: "", website: "" });
      setSubmitState({
        busy: false,
        okMsg: t("book.comment_submit_success"),
        errMsg: "",
      });
    } catch (e2) {
      setSubmitState({
        busy: false,
        okMsg: "",
        errMsg: e2?.message || t("book.failed_to_submit_comment"),
      });
    }
  }

  const title = book?.title || "—";
  const author = book?.author || "—";
  const comment = book?.comment || "";

  const purchaseUrl = buyFromQS || book?.purchase_url || book?.purchase_link || "";
  const purchaseHost = purchaseUrl ? getHost(purchaseUrl) : "";

  const commentsApprovedText = commentsLoading
    ? t("book.loading")
    : `${comments.length} ${t("book.approved")}`;

  return (
    <div className="zr-bookpage">
      <div className="zr-bookpage__top">
        <Link className="zr-btn2 zr-btn2--ghost" to="/">
          ← {t("book.back")}
        </Link>

        {purchaseUrl ? (
          <a
            className="zr-btn2 zr-btn2--primary"
            href={purchaseUrl}
            target="_blank"
            rel="noopener noreferrer"
            title={t("book.opens_in_new_tab")}
          >
            {t("book.purchase_link")} ↗
          </a>
        ) : (
          <span className="zr-bookpage__noLink">{t("book.no_purchase_link")}</span>
        )}
      </div>

      {loading ? (
        <div className="zr-bookpage__card">{t("book.loading")}</div>
      ) : err ? (
        <div className="zr-bookpage__card">
          <strong>{t("book.error")}</strong> {err}
        </div>
      ) : (
        <>
          <div className="zr-bookpage__grid">
            <div className="zr-bookpage__coverCard">
              {coverSrc && !coverBroken ? (
                <img
                  className="zr-bookpage__coverImg"
                  src={coverSrc}
                  alt={`${title} ${t("book.cover_suffix")}`}
                  onError={() => setCoverBroken(true)}
                />
              ) : (
                <div className="zr-bookpage__coverEmpty">
                  {t("book.no_cover_image")}
                  {safeId ? (
                    <div className="zr-bookpage__coverHint">
                      {t("book.expected")} <code>/media.  /covers/{safeId}.jpg</code>
                    </div>
                  ) : null}
                </div>
              )}
            </div>

            <div className="zr-bookpage__card">
              <h1 className="zr-bookpage__title">{title}</h1>
              <div className="zr-bookpage__author">{author || "—"}</div>

              <div className="zr-bookpage__leaveBox">
                <div className="zr-bookpage__leaveHeader">
                  <h3 className="zr-bookpage__leaveTitle">{t("book.leave_comment")}</h3>
                  <div className="zr-bookpage__commentsMeta">{commentsApprovedText}</div>
                </div>

                <div className="zr-bookpage__hint">{t("book.comment_hint")}</div>

                {submitState.okMsg ? (
                  <div className="zr-bookpage__noticeOk">{submitState.okMsg}</div>
                ) : null}
                {submitState.errMsg ? (
                  <div className="zr-bookpage__noticeErr">{submitState.errMsg}</div>
                ) : null}

                <form className="zr-bookpage__form" onSubmit={submitComment}>
                  <label className="zr-bookpage__label">
                    {t("book.name_optional")}
                    <input
                      className="zr-input"
                      value={form.authorName}
                      onChange={(e) =>
                        setForm((p) => ({ ...p, authorName: e.target.value }))
                      }
                      maxLength={80}
                      placeholder={t("book.guest")}
                    />
                  </label>

                  <input
                    tabIndex={-1}
                    autoComplete="off"
                    className="zr-bookpage__hp"
                    value={form.website}
                    onChange={(e) => setForm((p) => ({ ...p, website: e.target.value }))}
                    name="website"
                  />

                  <label className="zr-bookpage__label">
                    {t("book.comment_label")}
                    <textarea
                      className="zr-input"
                      value={form.body}
                      onChange={(e) => setForm((p) => ({ ...p, body: e.target.value }))}
                      rows={6}
                      maxLength={2000}
                      placeholder={t("book.comment_placeholder")}
                      required
                    />
                  </label>

                  <button
                    className="zr-btn2 zr-btn2--primary"
                    type="submit"
                    disabled={submitState.busy}
                  >
                    {submitState.busy ? t("book.sending") : t("book.submit")}
                  </button>
                </form>
              </div>

              {comment ? (
                <div className="zr-bookpage__commentBox">
                  <div className="zr-bookpage__commentTitle">{t("book.my_comment")}</div>
                  <div
                    className="zr-bookpage__commentText"
                    style={{ whiteSpace: "pre-wrap" }}
                  >
                    {comment}
                  </div>
                </div>
              ) : null}

              <div className="zr-bookpage__buyBox">
                <div className="zr-bookpage__buyTitle">{t("book.purchase")}</div>

                {purchaseUrl ? (
                  <>
                    <div className="zr-bookpage__buyText">{t("book.stay_on_site")}</div>

                    <a
                      className="zr-bookpage__buyLink"
                      href={purchaseUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      {t("book.open_purchase_link")} {purchaseHost ? `(${purchaseHost})` : ""} ↗
                    </a>
                  </>
                ) : (
                  <div className="zr-bookpage__buyText">{t("book.no_purchase_link_yet")}</div>
                )}
              </div>
            </div>
          </div>

          <div className="zr-bookpage__card">
            <div className="zr-bookpage__commentsHeader">
              <h2 className="zr-bookpage__commentsTitle">{t("book.comments")}</h2>
              <div className="zr-bookpage__commentsMeta">{commentsApprovedText}</div>
            </div>

            {commentsErr ? (
              <div className="zr-bookpage__commentsError">{commentsErr}</div>
            ) : null}

            <div className="zr-bookpage__commentsList">
              {commentsLoading ? (
                <div className="zr-bookpage__commentsEmpty">{t("book.loading")}</div>
              ) : comments.length ? (
                comments.map((c) => (
                  <div key={c.id} className="zr-bookpage__comment">
                    <div className="zr-bookpage__commentTop">
                      <div className="zr-bookpage__commentAuthor">
                        {c.author_name || t("book.guest")}
                      </div>
                      <div className="zr-bookpage__commentDate">
                        {c.created_at
                          ? new Date(c.created_at).toLocaleDateString(locale || undefined)
                          : ""}
                      </div>
                    </div>
                    <div className="zr-bookpage__commentBody" style={{ whiteSpace: "pre-wrap" }}>
                      {c.body}
                    </div>
                  </div>
                ))
              ) : (
                <div className="zr-bookpage__commentsEmpty">{t("book.no_comments_yet")}</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}