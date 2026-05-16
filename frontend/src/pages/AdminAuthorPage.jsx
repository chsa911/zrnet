import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getApiRoot } from "../api/apiRoot";
import "./AuthorsIndexPage.css";

const EDITABLE_FIELDS = [
  "first_name",
  "last_name",
  "name_display",
  "author_nationality",
  "place_of_birth",
  "male_female",
  "published_titles",
  "number_of_millionsellers",
];

function labelFor(key) {
  return key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (m) => m.toUpperCase());
}

function valueToInputValue(value) {
  if (value == null) return "";
  return String(value);
}

function formatValue(value) {
  if (value == null || value === "") return "—";
  if (typeof value === "object") return JSON.stringify(value, null, 2);
  return String(value);
}

export default function AdminAuthorPage() {
  const { authorId } = useParams();

  const [author, setAuthor] = useState(null);
  const [form, setForm] = useState({});
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const ac = new AbortController();

    async function loadAuthor() {
      setLoading(true);
      setErr("");
      setSaved(false);

      try {
        const url = new URL(
          `${getApiRoot()}/admin/authors/${authorId}`,
          window.location.origin
        );

        const res = await fetch(url.toString().replace(window.location.origin, ""), {
          credentials: "include",
          cache: "no-store",
          signal: ac.signal,
        });

        if (!res.ok) throw new Error(`Request failed (${res.status})`);

        const json = await res.json();
        const nextAuthor = json?.author || null;
        setAuthor(nextAuthor);

        const nextForm = {};
        for (const key of EDITABLE_FIELDS) {
          nextForm[key] = valueToInputValue(nextAuthor?.[key]);
        }
        setForm(nextForm);
      } catch (e) {
        if (!ac.signal.aborted) {
          setErr(e?.message || "Failed to load author");
          setAuthor(null);
        }
      } finally {
        if (!ac.signal.aborted) setLoading(false);
      }
    }

    loadAuthor();
    return () => ac.abort();
  }, [authorId]);

  const allFields = useMemo(() => {
    if (!author) return [];
    return Object.keys(author).sort((a, b) => a.localeCompare(b));
  }, [author]);

  function updateField(key, value) {
    setSaved(false);
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function saveAuthor(e) {
    e.preventDefault();
    setSaving(true);
    setErr("");
    setSaved(false);

    try {
      const url = new URL(
        `${getApiRoot()}/admin/authors/${authorId}`,
        window.location.origin
      );

      const res = await fetch(url.toString().replace(window.location.origin, ""), {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json?.detail || json?.error || `Request failed (${res.status})`);
      }

      const nextAuthor = json?.author || null;
      setAuthor(nextAuthor);

      const nextForm = {};
      for (const key of EDITABLE_FIELDS) {
        nextForm[key] = valueToInputValue(nextAuthor?.[key]);
      }
      setForm(nextForm);
      setSaved(true);
    } catch (e2) {
      setErr(e2?.message || "Failed to save author");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section className="authors-brutal-page" aria-busy={loading ? "true" : "false"}>
      <p>
        <Link to="/admin/authors">← Back to authors</Link>
      </p>

      {loading ? <div className="authors-message">Loading…</div> : null}
      {err ? <div className="authors-message authors-error">{err}</div> : null}

      {!loading && !err && author ? (
        <div className="authors-grid" style={{ maxWidth: 1200 }}>
          <div className="authors-row authors-head" style={{ gridTemplateColumns: "1fr" }}>
            <div className="authors-cell authors-name">
              {author.name_display || author.last_name || "Author"}
            </div>
          </div>

          <form onSubmit={saveAuthor}>
            {EDITABLE_FIELDS.map((key) => (
              <div className="authors-row" style={{ gridTemplateColumns: "320px 1fr" }} key={key}>
                <label className="authors-cell authors-name" htmlFor={key}>
                  {labelFor(key)}
                </label>
                <div className="authors-cell">
                  <input
                    id={key}
                    value={form[key] ?? ""}
                    onChange={(e) => updateField(key, e.target.value)}
                    style={{
                      width: "100%",
                      fontSize: 24,
                      fontWeight: 800,
                      padding: "12px 14px",
                      border: "3px solid #555",
                    }}
                  />
                </div>
              </div>
            ))}

            <div className="authors-row" style={{ gridTemplateColumns: "1fr" }}>
              <div className="authors-cell" style={{ gap: 12 }}>
                <button
                  type="submit"
                  disabled={saving}
                  style={{
                    border: "4px solid #555",
                    background: saving ? "#ddd" : "#111",
                    color: "#fff",
                    padding: "16px 24px",
                    fontSize: 24,
                    fontWeight: 900,
                    cursor: saving ? "not-allowed" : "pointer",
                  }}
                >
                  {saving ? "Saving…" : "Save author"}
                </button>

                <Link to={`/admin/authors/${authorId}/titles`}>
                  View titles
                </Link>

                {saved ? <strong>Saved.</strong> : null}
              </div>
            </div>
          </form>

          <div className="authors-row authors-head" style={{ gridTemplateColumns: "1fr" }}>
            <div className="authors-cell authors-name">All author data</div>
          </div>

          {allFields.map((key) => (
            <div className="authors-row" style={{ gridTemplateColumns: "320px 1fr" }} key={key}>
              <div className="authors-cell authors-name">{labelFor(key)}</div>
              <div className="authors-cell" style={{ whiteSpace: "pre-wrap", overflowWrap: "anywhere" }}>
                {formatValue(author[key])}
              </div>
            </div>
          ))}
        </div>
      ) : null}
    </section>
  );
}
