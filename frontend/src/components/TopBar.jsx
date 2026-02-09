import { Link } from "react-router-dom";
import "./topbar.css";

export default function TopBar() {
  return (
    <header className="zr-topbar">
      <div className="zr-topbar__inner">
        {/* LOGO LEFT */}
        <Link to="/" className="zr-brand" aria-label="ZenReader Home">
          ZenReader
        </Link>

        {/* BUTTONS RIGHT */}
        <nav className="zr-nav" aria-label="Main navigation">
          <Link className="zr-nav__link" to="/technik.html">Technique</Link>
          <Link className="zr-nav__link" to="/analytics">Diary</Link>
          <Link className="zr-nav__link" to="/faq.html">FAQ</Link>

          {/* ALL OTHER PAGES UNDER "MORE" */}
          <details className="zr-more">
            <summary className="zr-nav__link">More</summary>
            <div className="zr-more__menu">
              <Link to="/ueber_mich.html">About</Link>
              <Link to="/newsletter.html">Newsletter</Link>
              <Link to="/merchandise.html">Shop</Link>
              <Link to="/kontaktformular.html">Contact</Link>
              <Link to="/login">Login</Link>
              <Link to="/impressum.html">Imprint</Link>
              <Link to="/bookthemes">Book themes</Link>
              {/* Optional extras (if these routes exist in your project) */}
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