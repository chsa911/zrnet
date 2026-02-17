import React, { useMemo } from "react";
import { useLocation } from "react-router-dom";
import NewsletterSignup from "../components/NewsletterSignup";
import { NEWSLETTER } from "../config/newsletter";
import { useI18n } from "../context/I18nContext";

export default function NewsletterPage() {
  const { t } = useI18n();
  const location = useLocation();

  const statusMsg = useMemo(() => {
    const sp = new URLSearchParams(location.search);
    const confirmed = sp.get("confirmed");
    const unsub = sp.get("unsubscribed");

    if (confirmed === "1") return { kind: "ok", text: t("newsletter_confirmed_ok") };
    if (confirmed === "0") return { kind: "err", text: t("newsletter_confirmed_bad") };
    if (unsub === "1") return { kind: "ok", text: t("newsletter_unsub_ok") };
    if (unsub === "0") return { kind: "err", text: t("newsletter_unsub_bad") };
    return null;
  }, [location.search, t]);

  return (
    <section className="zr-section">
      <h1>{t("newsletter_title")}</h1>
      <p className="zr-lede">{t("newsletter_lede", { list: NEWSLETTER.LIST_NAME })}</p>

      <div className="zr-card">
        <h2 style={{ marginTop: 0 }}>{t("newsletter_signup_title")}</h2>
        {statusMsg ? (
          <div className={statusMsg.kind === "err" ? "zr-alert zr-alert--error" : "zr-alert"}>
            {statusMsg.text}
          </div>
        ) : null}
        <NewsletterSignup source="newsletter_page" />
      </div>

      <div className="zr-card" style={{ marginTop: 16 }}>
        <h2 style={{ marginTop: 0 }}>{t("newsletter_what_title")}</h2>
        <ul className="zr-bullets" style={{ margin: 0 }}>
          <li>{t("newsletter_what_1")}</li>
          <li>{t("newsletter_what_2")}</li>
          <li>{t("newsletter_what_3")}</li>
        </ul>

        <div className="zr-alert" style={{ marginTop: 12 }}>
          {t("newsletter_doi_hint")}
        </div>
      </div>
    </section>
  );
}
