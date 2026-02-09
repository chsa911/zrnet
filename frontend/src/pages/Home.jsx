import { Link } from "react-router-dom";

export default function Home() {
  return (
    <>
      <section className="zr-hero">
        <div className="zr-hero__text">
          <h1>Turn waiting time into reading time.</h1>
          <p>
            ZenReader is a paper reading method supported by a calm system.
            Pocket sections, real-life minutes, visible progress.
            No smartphone reading. No e-reader. Just pages.
          </p>

          <div className="zr-hero__ctas">
            <a className="zr-btn2 zr-btn2--primary" href="#start">Start in 3 minutes</a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/technik.html">See the technique</Link>
          </div>

          <ul className="zr-bullets">
            <li>Always with you: pocket sections, not a heavy book.</li>
            <li>Read in real life: station, queue, checkout.</li>
            <li>Done pages → recycling (progress stays visible).</li>
            <li>Read what you love—drop what you don’t.</li>
          </ul>
        </div>

        <div className="zr-hero__media">
          <img
            className="zr-heroImg"
            src="/assets/images/allgemein/hosentasche_link.jpeg"
            alt="Pocket pages"
          />
          <div className="zr-proof">
            <div className="zr-proof__title">Live stats</div>
            <div className="zr-proof__row"><span>In stock</span><strong>2933</strong></div>
            <div className="zr-proof__row"><span>Finished (2026)</span><strong>15</strong></div>
            <div className="zr-proof__row"><span>Top</span><strong>11</strong></div>
            <div className="zr-proof__note">Connected to shelf + database.</div>
          </div>
        </div>
      </section>

      <section className="zr-section">
        <h2>How it works</h2>
        <ol className="zr-steps">
          <li>Pick a paperback you want to read.</li>
          <li>Split it into pocket sections (20–40 pages).</li>
          <li>Carry one section and read top-to-bottom.</li>
          <li>Use micro-moments (waiting time becomes reading time).</li>
          <li>Done pages → recycling (you always know where you stopped).</li>
        </ol>
      </section>

      <section className="zr-section" id="start">
        <h2>Start today</h2>
        <p className="zr-lede">
          Choose one book you actually want. Make one small section. Read every waiting minute today.
        </p>
        <div className="zr-startbox">
          <div className="zr-startbox__step"><strong>1</strong> Choose a paperback.</div>
          <div className="zr-startbox__step"><strong>2</strong> Make one pocket section.</div>
          <div className="zr-startbox__step"><strong>3</strong> Carry it today.</div>
        </div>
      </section>
    </>
  );
}