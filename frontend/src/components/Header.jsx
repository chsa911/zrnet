import React, { useEffect } from "react";
import { NavLink, Link } from "react-router-dom";

function NavItem({ to, children }) {
  return (
    <NavLink
      to={to}
      className="zr-btn"
      end={to === "/"}
    >
      {children}
    </NavLink>
  );
}

export default function Header() {
  // Ensure legacy CSS and icon sets are loaded once (so header styles work on every route)
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
    <>
      <header className="zr-topbar">
        <Link className="zr-logo" to="/">
          <img src="/assets/images/allgemein/logo.jpeg" alt="Zenreader logo" />
        </Link>

        {/* Keep as simple search box for now (optional) */}
        <form className="zr-search" action="/books" method="get">
          <input type="text" name="q" placeholder="Bücher oder Autoren suchen…" />
          <button type="submit" aria-label="Search">🔎</button>
        </form>

        <nav className="zr-nav">
          <NavItem to="/ueber_mich.html">About me</NavItem>
          <NavItem to="/">HOME</NavItem>
          <NavItem to="/analytics">Readingdiary</NavItem>
          <NavItem to="/impressum.html">Impressum</NavItem>
          <NavItem to="/kontaktformular.html">Contact</NavItem>
          <NavItem to="/newsletter.html">Newsletter</NavItem>
          <NavItem to="/merchandise.html">Shop</NavItem>
          <NavItem to="/faq.html">FAQ</NavItem>

          {/* Social */}
          <a className="zr-btn zr-youtube" href="https://www.youtube.com/@zenreader26" target="_blank" rel="noreferrer">
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

      {/* Fallback header CSS if styles.min.css doesn't define these classes */}
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
        .zr-youtube{ background:#e60000; }
        .zr-tiktok{ background:#111; }
        .zr-instagram{ background:#d300bd; }
      `}</style>
    </>
  );
}
