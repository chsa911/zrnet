import React, { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { API_BASE } from "../api/config";

// Same base logic as your api modules (avoids /api/api duplication)
const ENV_BASE = (import.meta?.env?.VITE_API_BASE_URL || import.meta?.env?.VITE_API_BASE || "").trim();
const BASE = String(ENV_BASE || API_BASE || "/api").replace(/\/$/, "");

function buildUrl(path) {
  if (/^https?:\/\//i.test(path)) return path;
  const p = path.startsWith("/") ? path : `/${path}`;
  if (BASE.endsWith("/api") && p.startsWith("/api/")) return `${BASE}${p.slice(4)}`;
  return `${BASE}${p}`;
}

export default function AdminPage() {
  const nav = useNavigate();
  const location = useLocation();

  const nextPath = useMemo(() => {
    const sp = new URLSearchParams(location.search || "");
    const next = sp.get("next");
    // default landing: the NEW register page
    const safe = next && next.startsWith("/") ? next : "/admin/register";
    // prevent loops
    if (safe === "/admin" || safe.startsWith("/admin?")) return "/admin/register";
    return safe;
  }, [location.search]);

  const [checking, setChecking] = useState(true);
  const [loggedIn, setLoggedIn] = useState(false);
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [busy, setBusy] = useState(false);

  // check session
  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(buildUrl("/admin/me"), { credentials: "include" });
        setLoggedIn(res.ok);
      } catch {
        setLoggedIn(false);
      } finally {
        setChecking(false);
      }
    })();
  }, []);

  // if already logged in -> go straight to the new register page
  useEffect(() => {
    if (!checking && loggedIn) nav(nextPath, { replace: true });
  }, [checking, loggedIn, nextPath, nav]);

  async function login(e) {
    e.preventDefault();
    setMsg("");
    setBusy(true);
    try {
      const res = await fetch(buildUrl("/admin/login"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ password }),
      });

      if (res.ok) {
        setLoggedIn(true);
        setPassword("");
        nav(nextPath, { replace: true });
      } else {
        setLoggedIn(false);
        setMsg("Login failed.");
      }
    } catch {
      setMsg("Login failed.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <section className="zr-section">
      <h1>Admin</h1>
      {msg ? <p className="zr-lede" style={{ color: "#a00" }}>{msg}</p> : null}

      {checking ? (
        <div className="zr-card">Checking login…</div>
      ) : (
        <div className="zr-card" style={{ maxWidth: 420 }}>
          <form onSubmit={login} style={{ display: "grid", gap: 10 }}>
            <label style={{ display: "grid", gap: 6 }}>
              Admin password
              <input
                className="zr-input"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="ADMIN_PASSWORD"
              />
            </label>
            <button className="zr-btn2 zr-btn2--primary" type="submit" disabled={busy}>
              {busy ? "…" : "Login"}
            </button>
          </form>
        </div>
      )}
    </section>
  );
}