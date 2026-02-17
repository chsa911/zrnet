import { Link } from "react-router-dom";
import { useEffect, useRef } from "react";
import "./topbar.css";

export default function TopBar() {
  const moreRef = useRef(null);

  useEffect(() => {
    const onPointerDown = (e) => {
      const el = moreRef.current;
      if (!el || !el.open) return;
      if (!el.contains(e.target)) el.open = false;
    };

    const onKeyDown = (e) => {
      const el = moreRef.current;
      if (!el || !el.open) return;
      if (e.key === "Escape") el.open = false;
    };

    window.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("keydown", onKeyDown);

    return () => {
      window.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("keydown", onKeyDown);
    };
  }, []);

  const closeMore = () => {
    if (moreRef.current?.open) moreRef.current.open = false;
  };

  return (
    <header className="zr-topbar">
      <div className="zr-topbar__inner">
        {/* LOGO LEFT */}
        <Link to="/" className="zr-brand" aria-label="ZenReader Home">
          PagesInLine
        </Link>

        {/* BUTTONS RIGHT */}
        <nav className="zr-nav" aria-label="Main navigation">
          <Link className="zr-nav__link" to="/technik.html">Technique</Link>
          <Link className="zr-nav__link" to="/analytics">Diary</Link>
          <Link className="zr-nav__link" to="/faq.html">FAQ</Link>

          {/* ALL OTHER PAGES UNDER "MORE" */}
          <details ref={moreRef} className="zr-more">
            <summary className="zr-nav__link">More</summary>

            <div
              className="zr-more__menu"
              role="menu"
              onClick={(e) => {
                // close when user clicks any menu item
                if (e.target.closest?.("a")) closeMore();
              }}
            >
              <Link to="/ueber_mich.html">About</Link>
             {/* <Link to="/newsletter.html">Newsletter</Link>
             // <Link to="/merchandise.html">Shop</Link>
             // <Link to="/kontaktformular.html">Contact</Link>*/}
              <Link to="/login">Admin / Login</Link>
              <Link to="/impressum.html">Imprint</Link>
            {/*  <Link to="/bookthemes">Book themes</Link> */}
              <Link to="/ausruestung.html">Equipment</Link>
              <Link to="/beschaffung.html">Getting books</Link>
              <Link to="/autoren_meistgelesen.html">Top authors</Link>
            </div>
          </details>

          <a className="zr-btn zr-btn--primary" href="#start">
            Start
          </a>
        </nav>
      </div>
    </header>
  );
}