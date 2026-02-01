// frontend/src/components/Layout.jsx
import React, { useEffect } from "react";
import { Outlet, NavLink } from "react-router-dom";

function NavItem({ to, children, external = false }) {
  const cls =
    "zr-btn"; // keep your old button style

  if (external) {
    return (
      <a className={cls} href={to} target="_blank" rel="noreferrer">
        {children}
      </a>
    );
  }

  return (
    <NavLink
      to={to}
      className={({ isActive }) => `${cls} ${isActive ? "zr-active" : ""}`}
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  // ensure legacy css/fonts available everywhere (home, analytics, iframe pages)
  useEffect(() => {
    const ensureLink = (href) => {
      const existing = Array.from(document.querySelectorAll("link[rel='stylesheet']")).find(
        (l) => l.href === href || l.getAttribute("href") === href
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
      {/* ONE shared header */}
      <header className="zr-topbar">
        <NavLink className="zr-logo" to="/">
          <img src="/assets/images/allgemein/logo.jpeg" alt="Zenreader logo" />
        </NavLink>

        {/* optional search: goes to /books?q=... (adjust later in BooksPage) */}
        <form className="zr-search" action="/books" method="get">
          <input type="text" name="q" placeholder="Bücher oder Autoren suchen…" />
          <button type="submit" aria-label="Search">
            🔎
          </button>
        </form>

        <nav className="zr-nav">
          {/* legacy pages (served from /assets/*.html via LegacyHtmlPage) */}
          <NavItem to="/ueber_mich.html">About me</NavItem>
          <NavItem to="/">HOME</NavItem>

          {/* ✅ SPA analytics */}
          <NavItem to="/analytics">Readingdiary</NavItem>

          {/* ✅ legacy impressum */}
          <NavItem to="/impressum.html">Impressum</NavItem>

          <NavItem to="/kontaktformular.html">Contact</NavItem>
          <NavItem to="/newsletter.html">Newsletter</NavItem>
          <NavItem to="/merchandise.html">Shop</NavItem>
          <NavItem to="/faq.html">FAQ</NavItem>

          {/* ❌ Register/Update REMOVED (don’t add them here) */}

          <NavItem to="https://admin.zenreader.net/" external>
            Login
          </NavItem>

          <a className="zr-btn zr-youtube" href="https://www.youtube.com/@zenreader2026" target="_blank" rel="noreferrer">
            Youtube
          </a>
          <a className="zr-btn zr-tiktok" href="https://www.tiktok.com/@zenreader26" target="_blank" rel="noreferrer">
            Tiktok
          </a>
          <a className="zr-btn zr-instagram" href="https://www.instagram.com/zenreader26/" target="_blank" rel="noreferrer">
            Instagram
          </a>
        </nav>
      </header>

      {/* fallback CSS (only if styles.min.css doesn’t define these) */}
      <style>{`
        .zr-topbar{
          display:flex;
          align-items:center;
          gap:12px;
          padding:12px 16px;
          flex-wrap:wrap;
        }
        .zr-logo img{ height:72px; width:auto; display:block; }
        .zr-search{ display:flex; gap:8px; align-items:center; flex:1 1 260px; }
        .zr-search input{
          width:100%;
          max-width:520px;
          padding:8px 10px;
          border-radius:10px;
          border:1px solid #cfcfcf;
        }
        .zr-search button{
          padding:8px 10px;
          border-radius:10px;
          border:1px solid #cfcfcf;
          background:#fff;
          cursor:pointer;
        }
        .zr-nav{
          display:flex;
          flex-wrap:wrap;
          gap:8px;
          justify-content:flex-end;
          margin-left:auto;
        }
        .zr-btn{
          background:#d300bd;
          color:#fff;
          padding:6px 10px;
          border:2px solid #fff;
          border-radius:8px;
          text-decoration:none;
          font-size:14px;
          line-height:1.2;
          display:inline-block;
          white-space:nowrap;
        }
        .zr-active{ outline:2px solid rgba(255,255,255,0.7); }
        .zr-youtube{ background:#e60000; }
        .zr-tiktok{ background:#111; }
        .zr-instagram{ background:#d300bd; }
      `}</style>

      {/* page content */}
      <div style={{ backgroundColor: "mintcream" }}>
        <main style={{ padding: "16px" }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}