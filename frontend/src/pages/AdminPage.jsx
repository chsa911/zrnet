// frontend/src/pages/AdminPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { getApiRoot } from "../api/apiRoot";

const API = getApiRoot();

export default function AdminPage() {
  const navigate = useNavigate();
  const location = useLocation();

  const nextPath = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const next = sp.get("next");
    return next && next.startsWith("/") ? next : null;
  }, [location.search]);

  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [msg, setMsg] = useState("");

  const [password, setPassword] = useState("");

  const [widthCm, setWidthCm] = useState("");
  const [heightCm, setHeightCm] = useState("");
  const [pages, setPages] = useState("");

  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");

  // live preview barcode
  const [previewBarcode, setPreviewBarcode] = useState("");
  const [previewErr, setPreviewErr] = useState("");

  // register result (full JSON)
  const [result, setResult] = useState(null);

  // check session on load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/admin/me`, {
          credentials: "include",
          cache: "no-store",
        });
        setLoggedIn(res.ok);
      } catch {
        setLoggedIn(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // live barcode preview (only when logged in)
  useEffect(() => {
    if (!loggedIn) {
      setPreviewBarcode("");
      setPreviewErr("");
      return;
    }

    const w = Number(String(widthCm).replace(",", "."));
    const h = Number(String(heightCm).replace(",", "."));

    if (!Number.isFinite(w) || !Number.isFinite(h)) {
      setPreviewBarcode("");
      setPreviewErr("");
      return;
    }

    const t = setTimeout(async () => {
      try {
        setPreviewErr("");
        const res = await fetch(
          `${API}/barcodes/preview-barcode?width=${encodeURIComponent(w)}&height=${encodeURIComponent(h)}`,
          { credentials: "include", cache: "no-store" }
        );
        const data = await res.json().catch(() => ({}));

        if (res.ok) {
          setPreviewBarcode(data?.candidate || "");
        } else {
          setPreviewBarcode("");
          setPreviewErr(data?.error || `HTTP_${res.status}`);
        }
      } catch {
        setPreviewBarcode("");
        setPreviewErr("preview_failed");
      }
    }, 200);

    return () => clearTimeout(t);
  }, [loggedIn, widthCm, heightCm]);

  async function login(e) {
    e.preventDefault();
    setMsg("");
    setResult(null);

    const res = await fetch(`${API}/admin/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify({ password }),
    });

    if (res.ok) {
      setLoggedIn(true);
      setMsg("Logged in.");
      setPassword("");

      // ✅ redirect to requested page if provided
      if (nextPath) navigate(nextPath, { replace: true });
    } else {
      setLoggedIn(false);
      setMsg("Login failed.");
    }
  }

  async function logout() {
    setMsg("");
    setResult(null);

    await fetch(`${API}/admin/logout`, {
      method: "POST",
      credentials: "include",
    }).catch(() => {});

    setLoggedIn(false);
    setMsg("Logged out.");
  }

  async function registerBook(e) {
    e.preventDefault();
    setMsg("");
    setResult(null);

    const payload = {
      width_cm: Number(String(widthCm).replace(",", ".")),
      height_cm: Number(String(heightCm).replace(",", ".")),
      pages: pages === "" ? null : Number(pages),
      title,
      author,
      publisher,
    };

    const res = await fetch(`${API}/admin/register`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const data = await res.json().catch(() => ({}));
    setResult({ ok: res.ok, data });

    if (res.ok) {
      setMsg(`Registered. Barcode: ${data.barcode} (rank ${data.rank})`);
    } else {
      setMsg(data?.error ? `Register failed: ${data.error}` : `Register failed: HTTP ${res.status}`);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 900 }}>
      <h1 style={{ fontSize: 48, marginBottom: 12 }}>Admin</h1>
      {msg && <p>{msg}</p>}

      {checking ? (
        <p>Checking login…</p>
      ) : !loggedIn ? (
        <form onSubmit={login} style={{ display: "grid", gap: 10, maxWidth: 360 }}>
          <label>
            Admin password
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ width: "100%", padding: 8, marginTop: 6 }}
              placeholder="ADMIN_PASSWORD"
            />
          </label>
          <button type="submit" style={{ padding: 10 }}>
            Login
          </button>
        </form>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <strong>Logged in</strong>
            <button onClick={logout} style={{ padding: "8px 10px" }}>
              Logout
            </button>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 16 }}>
            <Link to="/register" className="zr-btn2 zr-btn2--ghost zr-btn2--sm">
              Register
            </Link>
            <Link to="/update" className="zr-btn2 zr-btn2--ghost zr-btn2--sm">
              Search/Update
            </Link>
            <Link to="/sync-issues" className="zr-btn2 zr-btn2--ghost zr-btn2--sm">
              Sync Issues
            </Link>
          </div>

          <h2 style={{ fontSize: 34, margin: "18px 0 10px" }}>Register Book</h2>

          <form onSubmit={registerBook} style={{ display: "grid", gap: 10, maxWidth: 520 }}>
            {/* compact row */}
            <div style={{ display: "flex", alignItems: "flex-end", gap: 12, flexWrap: "wrap" }}>
              <label style={{ flex: "0 0 150px" }}>
                Width (cm)
                <input
                  value={widthCm}
                  onChange={(e) => setWidthCm(e.target.value)}
                  inputMode="decimal"
                  maxLength={6}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label style={{ flex: "0 0 150px" }}>
                Height (cm)
                <input
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  inputMode="decimal"
                  maxLength={6}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label style={{ flex: "0 0 150px" }}>
                Pages
                <input
                  value={pages}
                  onChange={(e) => setPages(e.target.value)}
                  inputMode="numeric"
                  maxLength={6}
                  style={{ width: "100%", padding: 8, marginTop: 6 }}
                />
              </label>

              <label style={{ flex: "0 0 170px" }}>
                Barcode (preview)
                <input
                  value={previewBarcode}
                  readOnly
                  style={{ width: "100%", padding: 8, marginTop: 6, background: "#f5f5f5" }}
                  placeholder="—"
                />
              </label>
            </div>

            {previewErr && (
              <div style={{ marginTop: 4, fontSize: 12, color: "#a00" }}>
                Preview error: {previewErr}
              </div>
            )}

            <label>
              Title
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <label>
              Author
              <input
                value={author}
                onChange={(e) => setAuthor(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <label>
              Publisher
              <input
                value={publisher}
                onChange={(e) => setPublisher(e.target.value)}
                style={{ width: "100%", padding: 8, marginTop: 6 }}
              />
            </label>

            <button type="submit" style={{ padding: 10 }}>
              Create + Assign
            </button>
          </form>
        </>
      )}

      {result && (
        <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <div style={{ marginTop: 20, opacity: 0.6 }}>
        API: <code>{API}</code>
      </div>
    </div>
  );
}