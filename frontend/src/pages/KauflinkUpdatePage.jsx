import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { getBook, updateBook } from "../api/books";

export default function KauflinkUpdatePage() {
  const { bookId } = useParams();
  const navigate = useNavigate();

  const [book, setBook] = useState(null);
  const [kauflink, setKauflink] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
  getBook(bookId).then((b) => {
    setBook(b);
    setKauflink(b?.purchase_url || "");
  });
}, [bookId]);

  async function save() {
    setBusy(true);
    try {
      await updateBook(bookId, {
  purchase_url: kauflink.trim() || null,
  purchase_source: kauflink.trim() ? "manual" : null,
});
      navigate(-1);
    } finally {
      setBusy(false);
    }
  }

  return (
    <main style={{ padding: 40, maxWidth: 800 }}>
      <h1>Kauflink bearbeiten</h1>

      <p>
        <strong>{book?.title_display || "—"}</strong>
      </p>

      <label>
        Kauflink
        <input
          value={kauflink}
          onChange={(e) => setKauflink(e.target.value)}
          placeholder="https://..."
          style={{
            display: "block",
            width: "100%",
            marginTop: 8,
            padding: 12,
            fontSize: 18,
          }}
        />
      </label>

      <div style={{ marginTop: 20 }}>
        <button onClick={save} disabled={busy}>
          Speichern
        </button>

        <button
          type="button"
          onClick={() => navigate(-1)}
          style={{ marginLeft: 12 }}
        >
          Zurück
        </button>
      </div>
    </main>
  );
}   