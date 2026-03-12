import React from "react";
import { Link } from "react-router-dom";
import NewsletterSignup from "../components/NewsletterSignup";
import { useI18n } from "../context/I18nContext";
import "./BetaTestPage.css";

const COPY = {
  de: {
    badge: "Frühe Pilotphase",
    title: "Testnutzer für die neue Software gesucht",
    lede:
      "Wir öffnen eine frühe Beta für Leserinnen und Leser, die Bücher ohne Cover geordnet aufbewahren, schnell auswählen und mobil für unterwegs mitnehmen wollen.",
    primaryCta: "Jetzt als Testnutzer vormerken",
    secondaryCta: "Features ansehen",
    statusTitle: "Aktueller Stand",
    statusText:
      "Der Software-Kern funktioniert bereits. Die öffentliche SaaS-Version ist noch nicht live. Genau deshalb suchen wir jetzt erste Testnutzer und Pilotpartner, die den Use Case früh mit uns schärfen.",
    honestTitle: "Wichtig: ehrlicher Produktstatus",
    honestPoints: [
      "Keine Massenplattform, sondern eine frühe Beta mit funktionierendem Kern.",
      "Kein offener Self-Serve-Rollout: Testzugänge werden aktuell vorbereitet.",
      "Feature-Umfang wird mit echtem Nutzerfeedback priorisiert und erweitert.",
    ],
    featuresTitle: "Was die Beta lösen soll",
    features: [
      {
        title: "Bücher ohne Cover identifizierbar halten",
        text:
          "Nach der Trennung von Cover und Bindung bleibt jedes Buch eindeutig zuordenbar und im System wiederfindbar.",
        tag: "Kernfunktion",
      },
      {
        title: "Schnell für Reise und Alltag entnehmen",
        text:
          "Leseeinheiten sollen so organisiert werden, dass sie spontan für Pendeln, Wartezeiten oder Reisen mitgenommen werden können.",
        tag: "Mobilität",
      },
      {
        title: "Große Bestände geordnet verwalten",
        text:
          "Gerade bei vielen Büchern wird aus Improvisation schnell Chaos. Die Beta schafft Ordnung, Suche und klare Zuordnung.",
        tag: "Organisation",
      },
      {
        title: "Lesen statt Scrollen erleichtern",
        text:
          "Die Software macht analoge Leseeinheiten alltagstauglich, damit vorhandene Bücher schneller im Moment nutzbar sind.",
        tag: "Alltag",
      },
    ],
    benefitsTitle: "Was Testnutzer konkret bekommen",
    benefits: [
      "frühe Einblicke in neue Funktionen und Prioritäten",
      "direkten Draht für Feedback und Use-Case-Wünsche",
      "die Chance, den Ablauf für Reisen, Pendeln und große Buchbestände mitzugestalten",
    ],
    audienceTitle: "Für wen wir Testnutzer suchen",
    audience: [
      "Menschen mit großem Buchbestand zuhause",
      "Vielleser, Pendler und Reisende",
      "Lesefördernde Initiativen, Bildungsträger und Organisationen",
      "Neugierige Early Adopter, die ungewöhnliche Lesekonzepte testen wollen",
    ],
    roadmapTitle: "Was wir mit der Beta herausfinden wollen",
    roadmap: [
      "Welche Funktionen beim schnellen Finden und Entnehmen wirklich entscheidend sind",
      "Wie stark der Use Case für Reisen, Pendeln und spontane Nutzung ist",
      "Welche Organisationsansichten und Suchfilter echte Mehrwerte bieten",
      "Wie ein belastbares SaaS- und Pilotmodell für Privatnutzer und Organisationen aussehen soll",
    ],
    signupTitle: "Interesse als Testnutzer oder Pilotpartner?",
    signupText:
      "Trag dich ein, wenn du früh dabei sein willst. Du bekommst Updates zur Beta, zu Pilotzugängen und zu neuen Features. Alternativ kannst du direkt per E-Mail anfragen.",
    mailLabel: "Direkt per E-Mail anfragen",
    mailHref:
      "mailto:info@pagesinline.com?subject=Interesse%20an%20Beta-Test%20PagesInLine&body=Hallo,%20ich%20interessiere%20mich%20f%C3%BCr%20die%20Beta%20als%20Testnutzer%20oder%20Pilotpartner.",
    backHome: "Zur Startseite",
    faqTitle: "Warum diese Beta interessant ist",
    faqs: [
      {
        q: "Warum nicht einfach selbst eine Liste führen?",
        a:
          "Solange nur ein einziges Buch im Einsatz ist, geht das. Bei vielen entbundenen Büchern ohne Cover wird schnelle Zuordnung, Ordnung und spontane Entnahme aber zum eigentlichen Problem.",
      },
      {
        q: "Warum jetzt schon bewerben?",
        a:
          "Weil gerade frühe Testnutzer helfen, die richtigen Funktionen zuerst zu bauen und harte Anwendungsfälle zu validieren.",
      },
      {
        q: "Ist die SaaS-Version schon fertig?",
        a:
          "Noch nicht. Die Beta-Seite dient bewusst dazu, frühes Interesse, Pilotpartner und qualifiziertes Feedback zu sammeln.",
      },
    ],
  },
  en: {
    badge: "Early pilot phase",
    title: "Looking for early beta testers",
    lede:
      "We are opening an early beta for readers who want to store books without covers in an organized way, find them fast, and take them on the go.",
    primaryCta: "Join the beta list",
    secondaryCta: "See features",
    statusTitle: "Current status",
    statusText:
      "The software core already works. The public SaaS version is not live yet. That is exactly why we are now looking for first testers and pilot partners to sharpen the use case with us.",
    honestTitle: "Important: honest product status",
    honestPoints: [
      "Not a mass-market platform yet, but an early beta with a working core.",
      "No open self-serve rollout yet: access is currently being prepared.",
      "Feature scope will be prioritized and expanded with real user feedback.",
    ],
    featuresTitle: "What the beta is meant to solve",
    features: [
      {
        title: "Keep books identifiable without covers",
        text:
          "After separating cover and binding, each book remains clearly assigned and searchable inside the system.",
        tag: "Core",
      },
      {
        title: "Grab reading units quickly for travel and everyday use",
        text:
          "Reading units should be organized so they can be taken along spontaneously for commuting, waiting time, or travel.",
        tag: "Mobility",
      },
      {
        title: "Manage large collections with order",
        text:
          "Improvisation becomes chaos quickly when many books are involved. The beta is meant to create order, search and clear assignment.",
        tag: "Organization",
      },
      {
        title: "Make reading easier than scrolling",
        text:
          "The software makes analog reading units practical for daily life so existing books can be used in the moment.",
        tag: "Everyday",
      },
    ],
    benefitsTitle: "What testers actually get",
    benefits: [
      "early visibility into new features and priorities",
      "a direct line for feedback and use-case requests",
      "a chance to shape the workflow for travel, commuting and large book collections",
    ],
    audienceTitle: "Who we want as testers",
    audience: [
      "People with large home book collections",
      "Avid readers, commuters and travelers",
      "Reading promotion initiatives, educators and organizations",
      "Curious early adopters who enjoy testing unusual reading concepts",
    ],
    roadmapTitle: "What we want to learn from the beta",
    roadmap: [
      "Which functions matter most for fast finding and removal",
      "How strong the commuting, travel and spontaneous-use cases really are",
      "Which organization views and filters deliver real value",
      "How a robust SaaS and pilot model should look for consumers and organizations",
    ],
    signupTitle: "Interested as a tester or pilot partner?",
    signupText:
      "Sign up if you want early access. You will get updates on the beta, pilot access and upcoming features. You can also reach out directly by email.",
    mailLabel: "Request access by email",
    mailHref:
      "mailto:info@pagesinline.com?subject=Interest%20in%20PagesInLine%20beta&body=Hello,%20I%20am%20interested%20in%20joining%20the%20beta%20as%20a%20tester%20or%20pilot%20partner.",
    backHome: "Back to home",
    faqTitle: "Why this beta matters",
    faqs: [
      {
        q: "Why not just keep a manual list?",
        a:
          "That may work for one single book. With many unbound books without covers, quick assignment, order and spontaneous removal become the real problem.",
      },
      {
        q: "Why recruit now?",
        a:
          "Because early testers help us build the right features first and validate concrete use cases with honest feedback.",
      },
      {
        q: "Is the SaaS version finished already?",
        a:
          "Not yet. This beta page is deliberately meant to collect early interest, pilot partners and qualified feedback.",
      },
    ],
  },
};

export default function BetaTestPage() {
  const { locale } = useI18n();
  const copy = locale?.startsWith("de") ? COPY.de : COPY.en;

  return (
    <section className="zr-section beta-page">
      <div className="beta-hero zr-card">
        <div>
          <span className="beta-badge">{copy.badge}</span>
          <h1>{copy.title}</h1>
          <p className="zr-lede beta-lede">{copy.lede}</p>

          <div className="beta-actions">
            <a className="zr-btn2 zr-btn2--primary" href="#beta-signup">
              {copy.primaryCta}
            </a>
            <a className="zr-btn2 zr-btn2--ghost" href="#beta-features">
              {copy.secondaryCta}
            </a>
          </div>
        </div>

        <aside className="beta-status">
          <div className="beta-status__label">{copy.statusTitle}</div>
          <p>{copy.statusText}</p>
        </aside>
      </div>

      <div className="beta-grid beta-grid--three beta-grid--cards">
        <div className="zr-card">
          <h2>{copy.honestTitle}</h2>
          <ul className="zr-bullets beta-bullets">
            {copy.honestPoints.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="zr-card">
          <h2>{copy.benefitsTitle}</h2>
          <ul className="zr-bullets beta-bullets">
            {copy.benefits.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>

        <div className="zr-card">
          <h2>{copy.audienceTitle}</h2>
          <ul className="zr-bullets beta-bullets">
            {copy.audience.map((point) => (
              <li key={point}>{point}</li>
            ))}
          </ul>
        </div>
      </div>

      <div className="zr-section" id="beta-features">
        <h2>{copy.featuresTitle}</h2>
        <div className="beta-grid beta-grid--four">
          {copy.features.map((feature) => (
            <article className="zr-card beta-feature" key={feature.title}>
              <span className="beta-feature__tag">{feature.tag}</span>
              <h3>{feature.title}</h3>
              <p>{feature.text}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="zr-section">
        <h2>{copy.roadmapTitle}</h2>
        <div className="beta-grid beta-grid--two">
          {copy.roadmap.map((point, idx) => (
            <div className="zr-card beta-roadmap" key={point}>
              <div className="beta-roadmap__index">0{idx + 1}</div>
              <p>{point}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="zr-section">
        <h2>{copy.faqTitle}</h2>
        <div className="beta-grid beta-grid--three">
          {copy.faqs.map((item) => (
            <article className="zr-card beta-faq" key={item.q}>
              <h3>{item.q}</h3>
              <p>{item.a}</p>
            </article>
          ))}
        </div>
      </div>

      <div className="zr-section" id="beta-signup">
        <div className="beta-grid beta-grid--signup">
          <div className="zr-card">
            <h2>{copy.signupTitle}</h2>
            <p className="zr-lede">{copy.signupText}</p>
            <NewsletterSignup source="beta_test_page" />
          </div>

          <div className="zr-card beta-contactCard">
            <h2>{copy.mailLabel}</h2>
            <p>
              info@pagesinline.com
            </p>
            <a className="zr-btn2 zr-btn2--ghost" href={copy.mailHref}>
              {copy.mailLabel}
            </a>
            <div className="beta-homeLink">
              <Link className="zr-btn2 zr-btn2--primary" to="/">
                {copy.backHome}
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
