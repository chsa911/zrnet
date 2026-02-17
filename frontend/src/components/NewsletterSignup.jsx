import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NEWSLETTER } from "../config/newsletter";
import { useI18n } from "../context/I18nContext";

function isValidEmail(email) {
  // Practical validation (not RFC-perfect, but avoids obvious typos)
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default function NewsletterSignup({ source = "newsletter_page" }) {
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [hp, setHp] = useState(""); // honeypot (spam)
  const [busy, setBusy] = useState(false);
  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return !busy && consent && isValidEmail(e) && !hp;
  }, [busy, consent, email, hp]);

  const consentText = useMemo(() => {
    // Keep wording short on the form; your privacy policy should contain full details.
    // IMPORTANT: Keep this text in sync with your backend logging.
    const freq = NEWSLETTER.FREQUENCY_HINT ? ` (${NEWSLETTER.FREQUENCY_HINT})` : "";
    return t("newsletter_consent_short", {
      list: NEWSLETTER.LIST_NAME,
      freq,
    });
  }, [t]);

  async function onSubmit(e) {
    e.preventDefault();
    setOkMsg("");
    setErrMsg("");

    const cleanEmail = email.trim();
    if (!isValidEmail(cleanEmail)) {
      setErrMsg(t("newsletter_error_email"));
      return;
    }
    if (!consent) {
      setErrMsg(t("newsletter_error_consent"));
      return;
    }
    if (hp) {
      // spam bots fill hidden fields
      setOkMsg(t("newsletter_success_pending"));
      return;
    }

    try {
      setBusy(true);

      if (NEWSLETTER.MODE === "form") {
        if (!NEWSLETTER.FORM_ACTION) {
          setErrMsg(t("newsletter_error_config"));
          return;
        }

        // Use a normal POST to the provider endpoint (DOI is handled by the provider).
        // We still show a local success hint.
        const form = e.target;
        form.submit();
        setOkMsg(t("newsletter_success_pending"));
        setEmail("");
        setConsent(false);
        setTracking(false);
        return;
      }

      // API mode: backend should start DOUBLE OPT-IN and store consent proof
      const res = await fetch(NEWSLETTER.API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: cleanEmail,
          locale,
          source,
          consent: true,
          tracking,
          consent_text_version: NEWSLETTER.CONSENT_TEXT_VERSION,
          consent_text: consentText,
        }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.error || data?.message || "request_failed");
      }

      setOkMsg(data?.message || t("newsletter_success_pending"));
      setEmail("");
      setConsent(false);
      setTracking(false);
    } catch (err) {
      setErrMsg(t("newsletter_error_generic"));
      // Optional: uncomment for debugging
      // console.error(err);
    } finally {
      setBusy(false);
    }
  }

  const formAction = NEWSLETTER.MODE === "form" ? NEWSLETTER.FORM_ACTION : undefined;
  const formMethod = NEWSLETTER.MODE === "form" ? (NEWSLETTER.FORM_METHOD || "post") : undefined;

  return (
    <form
      className="zr-newsletter"
      onSubmit={onSubmit}
      action={formAction}
      method={formMethod}
      target={NEWSLETTER.MODE === "form" ? "_blank" : undefined}
      noValidate
    >
      <div className="zr-newsletter__row">
        <label className="zr-newsletter__label" htmlFor="zr_nl_email">
          {t("newsletter_email_label")}
        </label>
        <div className="zr-newsletter__inputRow">
          <input
            id="zr_nl_email"
            className="zr-input zr-newsletter__input"
            type="email"
            inputMode="email"
            autoComplete="email"
            placeholder={t("newsletter_email_placeholder")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          {/* Spam honeypot: hidden from humans, but bots may fill it */}
          <input
            className="zr-newsletter__hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e) => setHp(e.target.value)}
            aria-hidden="true"
          />

          {/* In FORM mode, providers often expect a field like EMAIL */}
          {NEWSLETTER.MODE === "form" && (
            <>
              <input type="hidden" name="EMAIL" value={email} readOnly />
              {Object.entries(NEWSLETTER.FORM_HIDDEN_FIELDS || {}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={String(v)} readOnly />
              ))}
            </>
          )}

          <button
            className="zr-btn2 zr-btn2--primary"
            type="submit"
            disabled={!canSubmit}
          >
            {busy ? t("newsletter_submitting") : t("newsletter_submit")}
          </button>
        </div>
      </div>

      <div className="zr-newsletter__checks">
        <label className="zr-newsletter__check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e) => setConsent(e.target.checked)}
            required
          />
          <span>
            {consentText}{" "}
            <span className="zr-newsletter__links">
              <Link to={NEWSLETTER.PRIVACY_URL}>{t("nav_privacy")}</Link>
              {" · "}
              <Link to={NEWSLETTER.IMPRINT_URL}>{t("nav_impressum")}</Link>
            </span>
          </span>
        </label>

        <label className="zr-newsletter__check">
          <input
            type="checkbox"
            checked={tracking}
            onChange={(e) => setTracking(e.target.checked)}
          />
          <span>{t("newsletter_tracking_optional")}</span>
        </label>
      </div>

      {okMsg ? <div className="zr-alert">{okMsg}</div> : null}
      {errMsg ? <div className="zr-alert zr-alert--error">{errMsg}</div> : null}
    </form>
  );
}
