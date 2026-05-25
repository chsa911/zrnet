// frontend/src/components/LastRegisteredPanel.jsx
import React, { useState } from "react";
import { updateBook } from "../api/books";
import { BookCodeVisual } from "../utils/bookCodeDisplay";

function getBookId(book) {
  return book?.id || book?._id || book?.book_id;
}

function getBookCode(book) {
  return (
    book?.barcode ||
    book?.BMarkb ||
    book?.BMark ||
    book?.code ||
    ""
  );
}

export default function LastRegisteredPanel({ book, onEdit, onUpdated }) {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState("");

  if (!book) return null;

  async function markAbandoned() {
    const id = getBookId(book);
    if (!id) {
      setMsg("Book-ID fehlt.");
      return;
    }

    setBusy(true);
    setMsg("");

    try {
      const updated = await updateBook(id, { reading_status: "abandoned" });
      const nextBook = {
        ...book,
        ...(updated?.book || updated || {}),
        reading_status: "abandoned",
      };
      onUpdated?.(nextBook);
      setMsg("Als abandoned markiert ✔");
    } catch (e) {
      setMsg(e?.message || "Abandoned konnte nicht gespeichert werden.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="lrp" aria-label="Last registered book">
      <style>{`
.lrp {
  width: 100%;
  box-sizing: border-box;
  border: 3px solid #3d7f2e;
  background: #f4fff0;
  margin: 48px 0 64px 0;
  padding: 28px;
  font-family: inherit;
}

.lrp-info {
  display: grid;
  gap: 18px;
  font-size: clamp(28px, 4vw, 52px);
  font-weight: 900;
  line-height: 1.05;
  color: #111;
}

.lrp-line {
  display: flex;
  align-items: center;
  gap: 26px;
}

.lrp-icon {
  width: 90px;
  min-width: 90px;
  text-align: center;
  font-size: clamp(44px, 6vw, 82px);
  line-height: 1;
}

.lrp-separator {
  height: 3px;
  background: #3d7f2e;
  margin: 28px 0;
}

.lrp-actions {
  display: flex;
  gap: 24px;
}

.lrp-btn {
  flex: 1 1 50%;
  min-height: 112px;
  border: 3px solid currentColor;
  background: #fff;
  font: inherit;
  font-size: clamp(34px, 5vw, 68px);
  font-weight: 900;
  cursor: pointer;
}

.lrp-btn-abandoned {
  color: #a7190e;
}

.lrp-btn-edit {
  color: #0f5b9a;
}

.lrp-msg {
  margin-top: 18px;
  font-size: clamp(22px, 3vw, 38px);
  font-weight: 900;
}
      `}</style>

      <div className="lrp-info">
        <div className="lrp-line">
          <span className="lrp-icon">▥</span>
          <span>BookCode: {getBookCode(book) ? <BookCodeVisual code={getBookCode(book)} /> : "—"}</span>
        </div>

        <div className="lrp-line">
          <span className="lrp-icon">📖</span>
          <span>Pages: {book?.pages || "—"}</span>
        </div>
      </div>

      <div className="lrp-separator" />

      <div className="lrp-actions">
        <button
          type="button"
          className="lrp-btn lrp-btn-abandoned"
          disabled={busy || book?.reading_status === "abandoned"}
          onClick={markAbandoned}
        >
          {book?.reading_status === "abandoned" ? "Abandoned ✔" : "✕ Abandoned"}
        </button>

        <button
          type="button"
          className="lrp-btn lrp-btn-edit"
          disabled={busy}
          onClick={() => onEdit?.(book)}
        >
          ✎ Edit
        </button>
      </div>

      {msg ? <div className="lrp-msg">{msg}</div> : null}
    </section>
  );
}
