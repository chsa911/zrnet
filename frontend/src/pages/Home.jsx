import React, { useEffect, useState } from "react";

export default function Home() {
  // Load external CSS the old HTML relied on
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

  // 2026 reading stats logic
  const DEFAULT_YEAR = 2026;
  const [stats, setStats] = useState({ finished: "—", abandoned: "—", top: "—" });
  const [statsNote, setStatsNote] = useState("loading…");
  const [statsError, setStatsError] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function loadStats() {
      setStatsNote("loading…");
      setStatsError("");

      try {
        const resp = await fetch(`/api/public/books/stats?year=${encodeURIComponent(DEFAULT_YEAR)}`, {
          headers: { Accept: "application/json" },
        });
        if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
        const data = await resp.json();

        if (cancelled) return;
        setStats({
          finished: String(data?.finished ?? 0),
          abandoned: String(data?.abandoned ?? 0),
          top: String(data?.top ?? 0),
        });
        setStatsNote("live from DB");
      } catch (e) {
        if (cancelled) return;
        setStats({ finished: "—", abandoned: "—", top: "—" });
        setStatsNote("");
        setStatsError(`Could not load stats: ${e?.message || String(e)}`);
      }
    }

    loadStats();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div style={{ backgroundColor: "#95d4cf", minHeight: "100vh" }}>
      {/* Top area */}
      <header className="zr-topbar">
        <a className="zr-logo" href="/">
          <img src="/assets/images/allgemein/logo.jpeg" alt="Zenreader logo" />
        </a>

        <form className="zr-search" action="/books/" method="get">
          <input type="text" name="q" placeholder="Bücher oder Autoren suchen…" />
          <button type="submit" aria-label="Search">
            🔎
          </button>
        </form>

        <nav className="zr-nav">
          <a className="zr-btn" href="/ueber_mich.html">About me</a>
          <a className="zr-btn" href="/">HOME</a>
          <a className="zr-btn" href="/analytics/">Readingdiary</a>
          <a className="zr-btn" href="/impressum/">Disclaimer</a>
          <a className="zr-btn" href="/kontaktformular.html">Contact</a>
          <a className="zr-btn" href="/newsletter.html">Newsletter</a>
          <a className="zr-btn" href="/merchandise.html">Shop</a>
          <a className="zr-btn" href="/faq.html">FAQ</a>
          <a className="zr-btn" href="https://admin.zenreader.net/">Login</a>
          <a className="zr-btn zr-youtube" href="https://www.youtube.com/@zenreader2026">Youtube</a>
          <a className="zr-btn zr-tiktok" href="https://www.tiktok.com/@zenreader26">Tiktok</a>
          <a className="zr-btn zr-instagram" href="https://www.instagram.com/zenreader26/">Instagram</a>
        </nav>
      </header>

      {/* Minimal fallback styles for the topbar (if styles.min.css doesn't define them) */}
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

      {/* Stats */}
      <div style={{ maxWidth: 1100, margin: "14px auto 0", padding: "0 16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", flexWrap: "wrap", gap: 10, marginBottom: 10 }}>
          <div style={{ fontSize: 14, color: "#111", fontWeight: 600 }}>
            Books in <span>{DEFAULT_YEAR}</span>
          </div>
          <div style={{ fontSize: 12, color: "#333" }}>{statsNote}</div>
        </div>

        <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
          {[
            { label: "Finished", value: stats.finished },
            { label: "Abandoned", value: stats.abandoned },
            { label: "Top", value: stats.top },
          ].map((card) => (
            <div
              key={card.label}
              style={{
                flex: 1,
                minWidth: 160,
                border: "2px solid white",
                borderRadius: 14,
                padding: "12px 14px",
                background: "rgba(255,255,255,0.65)",
              }}
            >
              <div style={{ fontSize: 12, color: "#333" }}>{card.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, lineHeight: 1.1 }}>{card.value}</div>
            </div>
          ))}
        </div>

        {statsError ? <div style={{ marginTop: 10, color: "#b00020", fontSize: 12 }}>{statsError}</div> : null}
      </div>

      {/* Content area */}
      <div style={{ backgroundColor: "mintcream" }}>
        <main role="main">
          <div style={{ height: 10, backgroundColor: "rgb(0, 255, 191)" }} />

          <div style={{ padding: "12px 0" }}>
            <h5
              style={{
                fontFamily: "'Apple Chancery','Zapf Chancery','URW Chancery L','Lucida Calligraphy',cursive",
                margin: "5px 30px",
                fontSize: 25,
              }}
            >
              "I don't need a lot... But all I need is a good book."
            </h5>

            <p style={{ fontFamily: "arial", margin: "1px 30px", fontSize: 20 }}>
              This saying best explains my time consuming book procurement administering and reading process and my disruptive reading{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/technik.html">
                technique{" "}
                <img
                  src="/assets/images/allgemein/hosentasche_link.jpeg"
                  alt="Technik"
                  style={{ width: "20%", height: 50, objectFit: "cover", marginLeft: 8 }}
                />
              </a>{" "}
              which enables me to read every free minute and to select only pageturners out of a big variety of books. A dream!!
            </p>

            <p style={{ fontFamily: "arial", margin: "1px 30px", fontSize: 20 }}>
              See which{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/ausruestung.html">
                equipment{" "}
                <img
                  src="/assets/images/allgemein/buecherschrank_link.jpeg"
                  alt="Equipment"
                  style={{ width: "20%", height: 50, objectFit: "cover", marginLeft: 8 }}
                />
              </a>{" "}
              I am using and which books I have discovered as pageturners{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/entdeckungen/2024/oktober.html">
                recently{" "}
                <img
                  src="/assets/images/allgemein/schatzkiste.jpeg"
                  alt="Entdeckungen"
                  style={{ width: "20%", height: 70, objectFit: "cover", marginLeft: 8 }}
                />
              </a>
              .
            </p>

            <p style={{ fontFamily: "arial", margin: "1px 30px", fontSize: 20 }}>
              Get to know my most read{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/autoren_meistgelesen.html">
                authors{" "}
                <img
                  src="/assets/images/allgemein/autoren_link.jpeg"
                  alt="Autoren"
                  style={{ width: "20%", height: 50, objectFit: "cover", marginLeft: 8 }}
                />
              </a>
              .
            </p>

            <p style={{ fontFamily: "arial", margin: "1px 30px", fontSize: 20 }}>
              See which{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/links.html">
                sources
              </a>{" "}
              inspire me how I find my{" "}
              <a style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }} href="/beschaffung.html">
                books
              </a>
              .
            </p>

            <p style={{ fontFamily: "arial", margin: "1px 30px", fontSize: 20, color: "#de1211" }}>
              Here is my{" "}
              <a
                style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }}
                href="https://podcasters.spotify.com/pod/show/chris-san1/episodes/mobile-reading-in-daily-live-e2qltnu"
              >
                podcast
              </a>{" "}
              with Andreas Bach from the youtube channel{" "}
              <a
                style={{ fontFamily: "arial", fontSize: 20, color: "#00d37c" }}
                href="https://www.youtube.com/watch?v=GoRloM7Td5A&t=7s"
              >
                "bookdeckel"
              </a>
              . And finally get to know my dog lili which accompanies me now on my reading trips and is now the symbol of my bookswipe promotion activities.
            </p>
          </div>

          <div style={{ height: 10, backgroundColor: "rgb(0, 255, 191)" }} />
        </main>
      </div>
    </div>
  );
}