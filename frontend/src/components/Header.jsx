// frontend/src/components/Layout.jsx
import React, { useEffect } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";

function ensureStyles() {
  const add = (href) => {
    const exists = Array.from(document.querySelectorAll("link[rel='stylesheet']")).some(
      (l) => l.getAttribute("href") === href
    );
    if (!exists) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = href;
      document.head.appendChild(link);
    }
  };

  add("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/4.7.0/css/font-awesome.min.css");
  add("https://cdn.jsdelivr.net/npm/bootstrap-icons@1.10.3/font/bootstrap-icons.css");
  add("/assets/css/styles.min.css");
}

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `zr-btn ${isActive ? "zr-active" : ""}`.trim()
      }
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

export default function Layout() {
  const navigate = useNavigate();

  useEffect(() => {
    ensureStyles();
  }, []);

  return (
    <div style={{ minHeight: "100vh", backgroundColor: "#95d4cf" }}>
      {/* ONE shared header */}
      <header className="zr-topbar">
        <a className="zr-logo" href="/" onClick={(e) => { e.preventDefault(); navigate("/"); }}>
          <img src="/assets/images/allgemein/logo.jpeg" alt="Zenreader logo" />
        </a>

        <form
          className="zr-search"
          onSubmit={(e) => {
            e.preventDefault();
            const q = new FormData(e.currentTarget).get("q") || "";
            navigate(`/books?q=${encodeURIComponent(String(q))}`);
          }}
        >
          <input type="text" name="q" placeholder="Bücher oder Autoren suchen…" />
          <button type="submit" aria-label="Search">🔎</button>
        </form>

        <nav className="zr-nav">
          <NavItem to="/">HOME</NavItem>

          {/* legacy pages (served via React route /:page.html) */}
          <NavItem to="/ueber_mich.html">About me</NavItem>
          <NavItem to="/kontaktformular.html">Contact</NavItem>
          <NavItem to="/newsletter.html">Newsletter</NavItem>
          <NavItem to="/merchandise.html">Shop</NavItem>
          <NavItem to="/faq.html">FAQ</NavItem>

          {/* SPA analytics */}
          <NavItem to="/analytics">Readingdiary</NavItem>

          {/* external */}
          <a className="zr-btn" href="https://admin.zenreader.net/" rel="noreferrer">Login</a>
          <a className="zr-btn zr-youtube" href="https://www.youtube.com/@zenreader2026" rel="noreferrer">Youtube</a>
          <a className="zr-btn zr-tiktok" href="https://www.tiktok.com/@zenreader26" rel="noreferrer">Tiktok</a>
          <a className="zr-btn zr-instagram" href="https://www.instagram.com/zenreader26/" rel="noreferrer">Instagram</a>
        </nav>
      </header>

      {/* Page content */}
      <main style={{ backgroundColor: "mintcream" }}>
        <Outlet />
      </main>

      {/* fallback styles if styles.min.css doesn’t contain these */}
      <style>{`
        .zr-topbar{display:flex;align-items:center;gap:12px;padding:12px 16px;flex-wrap:wrap;}
        .zr-logo img{height:72px;width:auto;display:block;}
        .zr-search{display:flex;gap:8px;align-items:center;flex:1 1 260px;}
        .zr-search input{width:100%;max-width:520px;padding:8px 10px;border-radius:10px;border:1px solid #cfcfcf;}
        .zr-search button{padding:8px 10px;border-radius:10px;border:1px solid #cfcfcf;background:#fff;cursor:pointer;}
        .zr-nav{display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end;margin-left:auto;}
        .zr-btn{background:#d300bd;color:#fff;padding:6px 10px;border:2px solid #fff;border-radius:8px;text-decoration:none;font-size:14px;line-height:1.2;display:inline-block;white-space:nowrap;}
        .zr-youtube{background:#e60000;}
        .zr-tiktok{background:#111;}
        .zr-instagram{background:#d300bd;}
        .zr-active{outline:2px solid rgba(0,0,0,0.25);}
      `}</style>
    </div>
  );
}