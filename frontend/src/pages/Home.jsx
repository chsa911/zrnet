import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { useI18n } from "../context/I18nContext";
import "./home_minimal.css";

const COPY = {
  de: {
    eyebrow: "Weniger scrollen. Mehr Papierbuch.",
    title: "Bücher schneller in die Nutzung bringen. Lesefortschritt sichtbar machen.",
    lede:
      "PagesInLine verbindet das physische Lesen mit einer App: Bücher per Smartphone scannen, eindeutig zuordnen, unterwegs schneller nutzen und den Lesefortschritt digital festhalten.",
    primaryCta: "So funktioniert’s",
    secondaryCta: "Testzugang anfragen",
    bullets: [
      "Bücher direkt per Smartphone erfassen",
      "Jederzeit wissen, welches Buch du gerade liest",
      "Freie Minuten schneller fürs Lesen nutzen",
      "Fortschritt digital sichtbar halten",
    ],
    heroImageAlt: "Papierbuch für unterwegs in der Hosentasche",
    heroCardTitle: "Das Smartphone ist nur das Werkzeug",
    heroCardText:
      "Das Ziel ist das Papierbuch im Alltag: schnell erfassen, direkt nutzen, Lesefortschritt im Blick behalten.",
    proofLabel: "Live aus dem aktuellen Bestand",
    proofTitle: "Bereits im System sichtbar",
    proofStats: [
      { key: "in_stock", label: "Im System", meta: "aktueller Bestand", to: "/stats/stock" },
      { key: "finished", label: "Bereits gelesen", meta: "im Jahr 2026", to: "/stats/finished" },
      { key: "top", label: "Top-Titel", meta: "im Jahr 2026", to: "/stats/top" },
    ],
    highlightTitle: "Aktuelle Live-Highlights",
    highlightLeft: "Top Finished",
    highlightRight: "Top Received",
    problemLabel: "Warum die App nötig ist",
    problemTitle: "Das Papierbuch ist zum Lesen da. Die App behält den Überblick.",
    problemText:
      "Beim physischen Lesen verändert sich das Buch im Alltag. PagesInLine hält deshalb digital fest, welches Buch gelesen wird, was bereits geschafft wurde und wo der Wiedereinstieg ist.",
    problemPoints: [
      "Das Barcode-System hält die Identität des Buchs digital fest.",
      "Die Scanner-Funktion bringt neue Bücher ohne Umweg ins System.",
      "Die App verbindet das physische Lesen mit sichtbarem Fortschritt.",
    ],
    stepsLabel: "So funktioniert’s",
    stepsTitle: "Vom Buch zur Nutzung in vier Schritten",
    steps: [
      {
        no: "01",
        title: "Buch scannen",
        text: "Mit der integrierten Scanner-Funktion wird ein Buch direkt per Smartphone erfasst.",
      },
      {
        no: "02",
        title: "Eindeutig zuordnen",
        text: "Das Barcode-System sorgt dafür, dass jederzeit klar bleibt, welches Buch gelesen wird.",
      },
      {
        no: "03",
        title: "Schnell in die Nutzung bringen",
        text: "Ob zuhause oder unterwegs gekauft: Das Buch kommt ohne Umwege in den Lesealltag.",
      },
      {
        no: "04",
        title: "Fortschritt tracken",
        text: "Die App zeigt, was du liest, wie weit du bist und was bereits geschafft wurde.",
      },
    ],
    uniqueLabel: "Warum PagesInLine anders ist",
    uniqueTitle: "Mehr als eine Buch-App",
    uniqueText:
      "PagesInLine verwaltet Bücher nicht nur digital. Die App verbindet das physische Geschehen mit digitaler Übersicht: scannen, zuordnen, lesen, Fortschritt festhalten. So wird aus einem gekauften Buch schneller ein genutztes Buch.",
    uniqueCards: [
      {
        title: "Scanner-App in der PWA",
        text: "Bücher direkt erfassen statt Titel unterwegs aufzuschreiben.",
      },
      {
        title: "Digitale Buchzuordnung",
        text: "Auch wenn das physische Buch im Alltag nicht mehr alle Infos trägt, bleibt digital klar, worum es geht.",
      },
      {
        title: "Lesefortschritt sichtbar",
        text: "Die App macht sichtbar, was gelesen wurde und wo es weitergeht.",
      },
      {
        title: "Für freie Minuten gebaut",
        text: "Das richtige Papierbuch schneller dabeihaben und echte Lesezeit statt Scroll-Zeit nutzen.",
      },
    ],
    visionLabel: "Vision für DHDL",
    visionTitle: "Start mit Papierbüchern. Perspektive für den ganzen Lesemarkt.",
    visionText:
      "PagesInLine startet mit einem besonders konkreten physischen Use Case. Perspektivisch lässt sich das Prinzip auf normales Buchlesen, E-Books und digitale Wissens-Workflows erweitern – etwa durch die Erfassung relevanter Inhalte und die Weiterverwendung in Tools wie Notion.",
    statusLabel: "Aktueller Stand",
    statusTitle: "Der Produktkern funktioniert bereits.",
    statusText:
      "Aktuell öffnen wir erste Testzugänge, um den Workflow mit echten Nutzerinnen und Nutzern weiter zu schärfen. Die Homepage verkauft deshalb zuerst das Produkt – und die Beta folgt als ehrlicher nächster Schritt.",
    statusPrimary: "Jetzt Testzugang anfragen",
    statusSecondary: "Zur Beta-Seite",
  },
  en: {
    eyebrow: "Less scrolling. More paper books.",
    title: "Bring books into use faster. Make reading progress visible.",
    lede:
      "PagesInLine connects physical reading with an app: scan books on your phone, assign them clearly, use them faster on the go, and keep reading progress visible digitally.",
    primaryCta: "How it works",
    secondaryCta: "Request early access",
    bullets: [
      "Capture books directly on your smartphone",
      "Always know which book you are reading",
      "Turn free minutes into reading time faster",
      "Keep progress visible digitally",
    ],
    heroImageAlt: "Paper book in a pocket for reading on the go",
    heroCardTitle: "The smartphone is only the tool",
    heroCardText:
      "The goal is the paper book in everyday life: capture fast, use directly, keep progress in view.",
    proofLabel: "Live from the current inventory",
    proofTitle: "Already visible in the system",
    proofStats: [
      { key: "in_stock", label: "In system", meta: "current inventory", to: "/stats/stock" },
      { key: "finished", label: "Already read", meta: "in 2026", to: "/stats/finished" },
      { key: "top", label: "Top titles", meta: "in 2026", to: "/stats/top" },
    ],
    highlightTitle: "Current live highlights",
    highlightLeft: "Top Finished",
    highlightRight: "Top Received",
    problemLabel: "Why the app matters",
    problemTitle: "The paper book is for reading. The app keeps the overview.",
    problemText:
      "Physical reading changes the book in daily use. That is why PagesInLine stores digitally which book is being read, what has already been done, and where the user picks up again.",
    problemPoints: [
      "The barcode system preserves the identity of the book digitally.",
      "The scanner function brings new books into the system without friction.",
      "The app connects physical reading with visible progress.",
    ],
    stepsLabel: "How it works",
    stepsTitle: "From book to use in four steps",
    steps: [
      {
        no: "01",
        title: "Scan the book",
        text: "Use the integrated scanner to capture a book directly on your smartphone.",
      },
      {
        no: "02",
        title: "Assign it clearly",
        text: "The barcode system makes sure it is always clear which book is being read.",
      },
      {
        no: "03",
        title: "Bring it into use fast",
        text: "Whether bought at home or on the go, the book enters daily reading without detours.",
      },
      {
        no: "04",
        title: "Track progress",
        text: "The app shows what you are reading, how far you are, and what has already been done.",
      },
    ],
    uniqueLabel: "Why PagesInLine is different",
    uniqueTitle: "More than a book app",
    uniqueText:
      "PagesInLine does not just manage books digitally. It connects the physical process with a digital overview: scan, assign, read, keep progress. That turns a purchased book into a used book faster.",
    uniqueCards: [
      {
        title: "Scanner app in the PWA",
        text: "Capture books instantly instead of writing titles down while on the go.",
      },
      {
        title: "Digital book identity",
        text: "Even when the physical book no longer carries every detail visibly, the digital record keeps the identity clear.",
      },
      {
        title: "Visible reading progress",
        text: "The app shows what has been read already and where reading continues.",
      },
      {
        title: "Built for free minutes",
        text: "Have the right paper book with you faster and turn spare moments into reading time.",
      },
    ],
    visionLabel: "Vision for the pitch",
    visionTitle: "Start with paper books. Expand toward the full reading market.",
    visionText:
      "PagesInLine starts with a highly specific physical-book use case. Over time, the same principle can expand into normal book reading, e-books, and digital knowledge workflows such as capturing relevant content and reusing it in tools like Notion.",
    statusLabel: "Current status",
    statusTitle: "The product core already works.",
    statusText:
      "We are currently opening first test accesses in order to sharpen the workflow with real users. The homepage therefore sells the product first, with the beta as the honest next step.",
    statusPrimary: "Request early access",
    statusSecondary: "Go to beta page",
  },
};

function toIntOrNull(v) {
  if (v === null || v === undefined) return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

export default function Home() {
  const { locale } = useI18n();
  const copy = locale?.startsWith("de") ? COPY.de : COPY.en;
  const year = 2026;
  const FALLBACK_IMG = "/assets/images/allgemein/hosentasche_link.jpeg";

  const [hl, setHl] = useState(null);
  const [stats, setStats] = useState({ in_stock: null, finished: null, top: null });

  useEffect(() => {
    const ac = new AbortController();

    (async () => {
      try {
        const res = await fetch("/api/public/home-highlights", { signal: ac.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setHl(data);
      } catch {
        setHl(null);
      }
    })();

    return () => ac.abort();
  }, []);

  useEffect(() => {
    const ac = new AbortController();

    async function load() {
      try {
        const res = await fetch(`/api/public/books/stats?year=${year}&_=${Date.now()}`, {
          signal: ac.signal,
          headers: { Accept: "application/json" },
          cache: "no-store",
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        setStats({
          in_stock: toIntOrNull(data.in_stock ?? data.inStock ?? data.instock ?? data.stock),
          finished: toIntOrNull(data.finished ?? data.finished_books ?? data.finishedBooks),
          top: toIntOrNull(data.top ?? data.top_books ?? data.topBooks),
        });
      } catch {
        // keep previous values without breaking the home page
      }
    }

    load();
    const id = setInterval(load, 60_000);

    return () => {
      clearInterval(id);
      ac.abort();
    };
  }, [year]);

  const finished = hl?.finished || {};
  const received = hl?.received || {};

  const pickCover = (x) => x?.cover_home || x?.cover_full || x?.cover || FALLBACK_IMG;

  const buildLink = (x) => {
    if (!x?.id) return "/";
    const sp = new URLSearchParams();
    if (x.buy) sp.set("buy", x.buy);
    const qs = sp.toString();
    return `/book/${encodeURIComponent(x.id)}${qs ? `?${qs}` : ""}`;
  };

  return (
    <>
      <section className="pil-hero">
        <div className="pil-hero__content">
          <div className="pil-eyebrow">{copy.eyebrow}</div>
          <h1>{copy.title}</h1>
          <p className="pil-lede">{copy.lede}</p>

          <div className="pil-actions">
            <a className="zr-btn2 zr-btn2--primary" href="#product-how">
              {copy.primaryCta}
            </a>
            <Link className="zr-btn2 zr-btn2--ghost" to="/beta-test#beta-signup">
              {copy.secondaryCta}
            </Link>
          </div>

          <ul className="zr-bullets pil-bullets">
            {copy.bullets.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </div>

        <div className="pil-hero__media">
          <img className="pil-hero__image" src={FALLBACK_IMG} alt={copy.heroImageAlt} />

          <div className="pil-miniCard">
            <div className="pil-miniCard__title">{copy.heroCardTitle}</div>
            <p>{copy.heroCardText}</p>
          </div>
        </div>
      </section>

      <section className="pil-proofStrip" aria-label={copy.proofTitle}>
        <div className="pil-proofStrip__head">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.proofLabel}</div>
          <h2>{copy.proofTitle}</h2>
        </div>

        <div className="pil-proofGrid">
          {copy.proofStats.map((item) => (
            <Link key={item.key} className="pil-proofCard" to={`${item.to}?year=${year}`}>
              <span className="pil-proofCard__label">{item.label}</span>
              {item.meta ? <span className="pil-proofCard__meta">{item.meta}</span> : null}
              <strong className="pil-proofCard__value">{stats[item.key] ?? "—"}</strong>
            </Link>
          ))}
        </div>
      </section>

      <section className="zr-section pil-highlights">
        <div className="pil-sectionHead">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.highlightTitle}</div>
        </div>

        <div className="zr-splitHighlight">
          <Link
            className="zr-splitHighlight__half zr-splitHighlight__half--left"
            to={buildLink(finished)}
            style={{
              backgroundImage: `url(${pickCover(finished)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="zr-splitHighlight__overlay zr-splitHighlight__overlay--top">
              <div className="zr-splitHighlight__badge">{copy.highlightLeft}</div>
              <div className="zr-splitHighlight__value">
                <strong>{finished.authorNameDisplay || "—"}</strong>
                <div>{finished.titleDisplay || "—"}</div>
              </div>
            </div>
          </Link>

          <Link
            className="zr-splitHighlight__half zr-splitHighlight__half--right"
            to={buildLink(received)}
            style={{
              backgroundImage: `url(${pickCover(received)})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }}
          >
            <div className="zr-splitHighlight__overlay zr-splitHighlight__overlay--top">
              <div className="zr-splitHighlight__badge">{copy.highlightRight}</div>
              <div className="zr-splitHighlight__value">
                <strong>{received.authorNameDisplay || "—"}</strong>
                <div>{received.titleDisplay || "—"}</div>
              </div>
            </div>
          </Link>
        </div>
      </section>

      <section className="zr-section pil-problem" id="product-problem">
        <div className="pil-sectionHead">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.problemLabel}</div>
          <h2>{copy.problemTitle}</h2>
          <p className="zr-lede">{copy.problemText}</p>
        </div>

        <div className="pil-grid pil-grid--three">
          {copy.problemPoints.map((point) => (
            <article className="pil-card" key={point}>
              <p>{point}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zr-section pil-how" id="product-how">
        <div className="pil-sectionHead">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.stepsLabel}</div>
          <h2>{copy.stepsTitle}</h2>
        </div>

        <div className="pil-grid pil-grid--four">
          {copy.steps.map((step) => (
            <article className="pil-card pil-card--step" key={step.no}>
              <span className="pil-stepNo">{step.no}</span>
              <h3>{step.title}</h3>
              <p>{step.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zr-section pil-unique">
        <div className="pil-sectionHead">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.uniqueLabel}</div>
          <h2>{copy.uniqueTitle}</h2>
          <p className="zr-lede">{copy.uniqueText}</p>
        </div>

        <div className="pil-grid pil-grid--four">
          {copy.uniqueCards.map((card) => (
            <article className="pil-card" key={card.title}>
              <h3>{card.title}</h3>
              <p>{card.text}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="zr-section pil-vision">
        <div className="pil-visionBox">
          <div className="pil-eyebrow pil-eyebrow--muted">{copy.visionLabel}</div>
          <h2>{copy.visionTitle}</h2>
          <p className="zr-lede">{copy.visionText}</p>
        </div>
      </section>

      <section className="zr-section pil-status" id="start">
        <div className="pil-statusBox">
          <div>
            <div className="pil-eyebrow pil-eyebrow--muted">{copy.statusLabel}</div>
            <h2>{copy.statusTitle}</h2>
            <p className="zr-lede">{copy.statusText}</p>
          </div>

          <div className="pil-actions pil-actions--status">
            <Link className="zr-btn2 zr-btn2--primary" to="/beta-test#beta-signup">
              {copy.statusPrimary}
            </Link>
            <Link className="zr-btn2 zr-btn2--ghost" to="/beta-test">
              {copy.statusSecondary}
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
