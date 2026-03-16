import React from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../context/I18nContext";
import "./BetaTestPage.css";

const COPY = {
  de: {
    badge: "Frühe Testphase",
    title: "Testzugang für Vielleser und frühe Nutzer",
    lede:
      "Wir öffnen erste Testzugänge für Leserinnen und Leser, die Bücher schneller in die Nutzung bringen und ihren Lesefortschritt digital sichtbar machen wollen.",
    primaryCta: "Zur Anmeldung",
    secondaryCta: "Funktionsüberblick",
    statusTitle: "Aktueller Stand",
    statusText:
      "Der Software-Kern funktioniert bereits. Die öffentliche Version ist noch nicht live. Genau deshalb öffnen wir jetzt erste Testzugänge, um den Workflow mit echten Nutzerinnen und Nutzern zu schärfen.",
    honestTitle: "Wichtig: ehrlicher Produktstatus",
    honestPoints: [
      "Keine Massenplattform, sondern eine frühe Testphase mit funktionierendem Kern.",
      "Der Fokus liegt auf einem klaren Workflow: scannen, zuordnen, lesen, Fortschritt festhalten.",
      "Offener Self-Service-Rollout folgt später; aktuell vergeben wir gezielt erste Testzugänge.",
    ],
    featuresTitle: "Was PagesInLine im Kern löst",
    features: [
      {
        title: "Bücher direkt per Smartphone erfassen",
        text:
          "Neu gekaufte oder bereits vorhandene Bücher kommen ohne Umweg ins System und können direkt für den Lesealltag genutzt werden.",
        tag: "Scanner",
      },
      {
        title: "Immer wissen, welches Buch du liest",
        text:
          "Das Barcode-System und die App sorgen dafür, dass Titel, Zuordnung und aktueller Lesestatus digital sichtbar bleiben.",
        tag: "Zuordnung",
      },
      {
        title: "Fortschritt statt Vergessen",
        text:
          "Die App macht sichtbar, was bereits gelesen wurde und wo der Wiedereinstieg ist – gerade dann, wenn im Alltag wenig Zeit bleibt.",
        tag: "Tracking",
      },
      {
        title: "Freie Minuten schneller zum Lesen nutzen",
        text:
          "Das Ziel ist nicht mehr Smartphone-Nutzung, sondern das passende Papierbuch schneller in echte Nutzung zu bringen.",
        tag: "Alltag",
      },
    ],
    benefitsTitle: "Was Testnutzer konkret bekommen",
    benefits: [
      "Zugang zu einer frühen Version mit Scanner-Funktion und digitaler Buchzuordnung",
      "direkten Draht für Feedback und Prioritäten aus dem echten Lesealltag",
      "Einblick in neue Funktionen rund um Nutzung, Fortschritt und Lesefluss",
    ],
    audienceTitle: "Für wen wir Testnutzer suchen",
    audience: [
      "Menschen mit vielen eigenen Büchern zuhause",
      "Vielleser, Pendler und Menschen mit wenig freier Zeit",
      "Leserinnen und Leser, die Bücher wirklich nutzen statt nur sammeln wollen",
      "frühe Nutzer, die ein konkretes Leseprodukt mitgestalten möchten",
    ],
    roadmapTitle: "Was wir in der Testphase herausfinden wollen",
    roadmap: [
      "Welche Schritte Bücher am schnellsten in die tatsächliche Nutzung bringen",
      "Welche Ansichten und Erinnerungen Lesefortschritt im Alltag am besten sichtbar machen",
      "Wie stark Scanner, Zuordnung und Tracking zusammen den Leseprozess verbessern",
      "Welche Erweiterungen als nächste Stufe am meisten Potenzial haben – von normalem Buchlesen bis zu E-Books und Wissens-Workflows",
    ],
    signupTitle: "Interesse an einem frühen Testzugang?",
    signupText:
      "Trag dich ein, wenn du früh dabei sein willst. Du bekommst Updates zur Testphase, zu neuen Funktionen und zu späteren Zugängen. Alternativ kannst du direkt per E-Mail anfragen.",
    mailLabel: "Direkt per E-Mail anfragen",
    mailHref:
      "mailto:christian@pagesinline.com?subject=Interesse%20an%20PagesInLine%20Testzugang&body=Hallo,%20ich%20interessiere%20mich%20f%C3%BCr%20einen%20fr%C3%BChen%20Testzugang%20bei%20PagesInLine.",
    backHome: "Zur Startseite",
    faqTitle: "Warum diese Testphase wichtig ist",
    faqs: [
      {
        q: "Warum nicht einfach eine Liste führen?",
        a:
          "Weil Lesen im Alltag schnell an Reibung verliert: Bücher werden gekauft, vergessen oder nicht sauber wieder aufgenommen. PagesInLine soll genau diesen Übergang in die Nutzung vereinfachen.",
      },
      {
        q: "Warum jetzt schon Testnutzer aufnehmen?",
        a:
          "Weil echte Leserinnen und Leser am besten zeigen, welche Schritte wirklich helfen, freie Minuten schneller in Lesezeit zu verwandeln.",
      },
      {
        q: "Ist die große Vision schon fertig?",
        a:
          "Nein. Der aktuelle Fokus liegt auf einem klaren Start-Use-Case. Erweiterungen für normales Buchlesen, E-Books und spätere Wissens-Workflows gehören zur Perspektive, nicht zum jetzigen Vollumfang.",
      },
    ],
  },
  en: {
    badge: "Early test phase",
    title: "Early access for avid readers and first users",
    lede:
      "We are opening first test accesses for readers who want to bring books into use faster and keep reading progress visible digitally.",
    primaryCta: "Go to signup",
    secondaryCta: "See feature overview",
    statusTitle: "Current status",
    statusText:
      "The software core already works. The public version is not live yet. That is exactly why we are opening first test accesses now, to sharpen the workflow with real users.",
    honestTitle: "Important: honest product status",
    honestPoints: [
      "Not a mass-market platform yet, but an early test phase with a working core.",
      "The focus is a clear workflow: scan, assign, read, keep progress.",
      "Open self-serve rollout comes later; right now we are giving access selectively.",
    ],
    featuresTitle: "What PagesInLine solves at its core",
    features: [
      {
        title: "Capture books directly on a smartphone",
        text:
          "Newly bought or already owned books enter the system without friction and can be brought into daily reading directly.",
        tag: "Scanner",
      },
      {
        title: "Always know which book you are reading",
        text:
          "The barcode system and the app keep the title, assignment and current reading status visible digitally.",
        tag: "Identity",
      },
      {
        title: "Progress instead of forgetting",
        text:
          "The app makes visible what has already been read and where the reader picks up again, especially when time is limited.",
        tag: "Tracking",
      },
      {
        title: "Turn spare minutes into reading time faster",
        text:
          "The goal is not more smartphone use, but to bring the right paper book into real use faster.",
        tag: "Daily life",
      },
    ],
    benefitsTitle: "What testers actually get",
    benefits: [
      "access to an early version with scanner function and digital book identity",
      "a direct line for feedback and priorities from real reading routines",
      "visibility into upcoming features around usage, progress and reading flow",
    ],
    audienceTitle: "Who we want as testers",
    audience: [
      "people with many books at home",
      "avid readers, commuters and people with little free time",
      "readers who want to truly use books instead of just storing them",
      "early adopters who want to shape a concrete reading product",
    ],
    roadmapTitle: "What we want to learn in the test phase",
    roadmap: [
      "Which steps bring books into actual use fastest",
      "Which views and reminders keep reading progress most visible in everyday life",
      "How strongly scanner, identity and tracking improve the reading process together",
      "Which extensions have the most potential next — from normal book reading to e-books and knowledge workflows",
    ],
    signupTitle: "Interested in early access?",
    signupText:
      "Sign up if you want to get in early. You will receive updates about the test phase, new features and later access waves. You can also reach out directly by email.",
    mailLabel: "Request access by email",
    mailHref:
      "mailto:christian@pagesinline.com?subject=Interest%20in%20PagesInLine%20early%20access&body=Hello,%20I%20am%20interested%20in%20early%20access%20to%20PagesInLine.",
    backHome: "Back to home",
    faqTitle: "Why this test phase matters",
    faqs: [
      {
        q: "Why not just keep a list manually?",
        a:
          "Because reading loses momentum quickly in everyday life: books are bought, forgotten or not resumed cleanly. PagesInLine is meant to reduce exactly that friction.",
      },
      {
        q: "Why recruit testers now?",
        a:
          "Because real readers best reveal which steps truly help turn spare minutes into reading time faster.",
      },
      {
        q: "Is the bigger vision finished already?",
        a:
          "No. The current focus is a clear starting use case. Extensions for normal book reading, e-books and later knowledge workflows belong to the roadmap, not the current full scope.",
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
           <a className="zr-btn2 zr-btn2--primary" href={copy.mailHref}>
    {copy.mailLabel}
  </a>
          </div>

          <div className="zr-card beta-contactCard">
            <h2>{copy.mailLabel}</h2>
            <p>christian@pagesinline.com</p>
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
