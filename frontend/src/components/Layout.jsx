import React, { useEffect } from "react";
import { Link, NavLink, Outlet } from "react-router-dom";

function Btn({ to, children, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className="zr-btn"
      style={({ isActive }) => ({
        opacity: isActive ? 1 : 0.92,
        filter: isActive ? "saturate(1.1)" : "none",
      })}
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  // Load external CSS once (legacy site styles)
  useEffect(() => {
    const ensureLink = (href) => {
      const existing = Array.from(document.querySelectorAll("link[rel='stylesheet']")).find(
        (l) => l.getAttribute("href") === href
      );
      if (existing) return;
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    };

    ensureLink("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");
    ensureLink("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css");
    ensureLink("/assets/css/styles.min.css");
  }, []);

  return (
    <div style={{ backgroundColor: "#95d4cf", minHeight: "100vh" }}>
      {/* Shared header */}
      <header className="zr-topbar">
        <Link className="zr-logo" to="/">
          <img src="/assets/images/allgemein/logo.jpeg" alt="Zenreader logo" />
        </Link>

        <form className="zr-search" action="/books" method="get" onSubmit={(e) => e.preventDefault()}>
          <input type="text" name="q" placeholder="Bücher oder Autoren suchen…" />
          <button type="submit" aria-label="Search">🔎</button>
        </form>

        <nav className="zr-nav">
          <Btn to="/" end>Home</Btn>
          <Btn to="/analytics">Readingdiary</Btn>

          {/* legacy pages (served via SPA route :page.html) */}
          <Btn to="/ueber_mich.html">Über mich</Btn>
          <Btn to="/impressum.html">Impressum</Btn>
          <Btn to="/kontaktformular.html">Contact</Btn>
          <Btn to="/newsletter.html">Newsletter</Btn>
          <Btn to="/merchandise.html">Shop</Btn>
          <Btn to="/faq.html">FAQ</Btn>

          {/* external */}
          <a className="zr-btn" href="https://admin.zenreader.net/" rel="noreferrer">Login</a>
          <a className="zr-btn zr-youtube" href="https://www.youtube.com/@zenreader2026" target="_blank" rel="noreferrer">Youtube</a>
          <a className="zr-btn zr-tiktok" href="https://www.tiktok.com/@zenreader26" target="_blank" rel="noreferrer">Tiktok</a>
          <a className="zr-btn zr-instagram" href="https://www.instagram.com/zenreader26/" target="_blank" rel="noreferrer">Instagram</a>
        </nav>
      </header>

      {/* Fallback styling if styles.min.css doesn’t define these */}
      <style>{`
        .zr-topbar{display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap}
        .zr-logo img{height:72px;width:auto;display:block}
        .zr-search{display:flex;gap:8px;align-items:center;flex:1 1 260px}
        .zr-search input{width:100%;max-width:520px;padding:8px 10px;border-radius:10px;border:1px solid #cfcfcf}
        .zr-search button{padding:8px 10px;border-radius:10px;border:1px solid #cfcfcf;background:#fff;cursor:pointer}
        .zr-nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-left:auto}
        .zr-btn{background:#d300bd;color:#fff;padding:6px 10px;border:2px solid #fff;border-radius:8px;text-decoration:none;font-size:14px;line-height:1.2;display:inline-block;white-space:nowrap}
        .zr-youtube{background:#e60000}
        .zr-tiktok{background:#111}
        .zr-instagram{background:#d300bd}
      `}</style>

      {/* Page content */}
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "12px 16px" }}>
        <Outlet />
      </main>
    </div>
  );
}