import React, { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE_URL || "http://localhost:4000/api";

export default function AdminPage() {
  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [msg, setMsg] = useState("");

  const [password, setPassword] = useState("");

  const [widthCm, setWidthCm] = useState("12.0");
  const [heightCm, setHeightCm] = useState("21.0"); // must match eq_heights: 20.5 / 21.0 / 21.5
  const [pages, setPages] = useState("279");
  const [title, setTitle] = useState("");
  const [author, setAuthor] = useState("");
  const [publisher, setPublisher] = useState("");
  const [result, setResult] = useState(null);

  // check session on load
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API}/admin/me`, { credentials: "include" });
        setLoggedIn(res.ok);
      } catch {
        setLoggedIn(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

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
      // optional: keep title/author/publisher, reset dims/pages
      setWidthCm("12.0");
      setHeightCm("21.0");
      setPages("279");
    } else {
      setMsg(data?.error ? `Register failed: ${data.error}` : `Register failed: HTTP ${res.status}`);
    }
  }

  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif", maxWidth: 700 }}>
      <h1 style={{ fontSize: 42, marginBottom: 16 }}>Admin</h1>

      {checking ? (
        <p>Checking login…</p>
      ) : !loggedIn ? (
        <>
          <p style={{ marginBottom: 12 }}>Login required.</p>
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
        </>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
            <strong>Logged in</strong>
            <button onClick={logout} style={{ padding: "8px 10px" }}>
              Logout
            </button>
          </div>

          <h2 style={{ fontSize: 28, marginTop: 20 }}>Register Book</h2>
          <p style={{ opacity: 0.75, marginTop: 6 }}>
            Note: height must match the allowed set (eq_heights). In your DB these are 20.5 / 21.0 / 21.5 cm.
          </p>

          <form onSubmit={registerBook} style={{ display: "grid", gap: 10, maxWidth: 420, marginTop: 12 }}>
            <label>
              Width (cm)
              <input value={widthCm} onChange={(e) => setWidthCm(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label>
              Height (cm)
              <input value={heightCm} onChange={(e) => setHeightCm(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label>
              Pages
              <input value={pages} onChange={(e) => setPages(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label>
              Title
              <input value={title} onChange={(e) => setTitle(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label>
              Author
              <input value={author} onChange={(e) => setAuthor(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <label>
              Publisher
              <input value={publisher} onChange={(e) => setPublisher(e.target.value)} style={{ width: "100%", padding: 8, marginTop: 6 }} />
            </label>

            <button type="submit" style={{ padding: 10 }}>
              Create + Assign lowest-ranked barcode
            </button>
          </form>
        </>
      )}

      {msg && <p style={{ marginTop: 16 }}>{msg}</p>}

      {result && (
        <pre style={{ marginTop: 16, background: "#111", color: "#0f0", padding: 12, overflow: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}

      <hr style={{ margin: "24px 0" }} />
      <p style={{ opacity: 0.6 }}>
        API: <code>{API}</code>
      </p>
    </div>
  );
}