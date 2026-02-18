import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { NEWSLETTER } from "../config/newsletter";
import { useI18n } from "../context/I18nContext";

function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(String(email || "").trim());
}

export default function NewsletterSignup({ source = "newsletter_page" }) {
  const { t, locale } = useI18n();

  const [email, setEmail] = useState("");
  const [consent, setConsent] = useState(false);
  const [tracking, setTracking] = useState(false);
  const [hp, setHp] = useState(""); // honeypot (spam)

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState("");

  const [okMsg, setOkMsg] = useState("");
  const [errMsg, setErrMsg] = useState("");

  const canSubmit = useMemo(() => {
    const e = email.trim();
    return !busy && !done && consent && isValidEmail(e) && !hp;
  }, [busy, done, consent, email, hp]);

  const consentText = useMemo(() => {
    const freq = NEWSLETTER.FREQUENCY_HINT ? ` (${NEWSLETTER.FREQUENCY_HINT})` : "";
    return t("newsletter_consent_short", {
      list: NEWSLETTER.LIST_NAME,
      freq,
    });
  }, [t]);

  function resetToEdit() {
    setDone(false);
    setOkMsg("");
    setErrMsg("");
    // professional UX: keep the current email so user can correct it
    // keep consent checked (user already agreed), but you can force re-check if you prefer:
    // setConsent(false);
  }

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
      // bots fill hidden fields -> pretend success
      setSubmittedEmail(cleanEmail);
      setOkMsg(t("newsletter_success_pending"));
      setDone(true);
      return;
    }

    try {
      setBusy(true);

      if (NEWSLETTER.MODE === "form") {
        if (!NEWSLETTER.FORM_ACTION) {
          setErrMsg(t("newsletter_error_config"));
          return;
        }
        // Provider handles everything; we show local success
        const form = e.target;
        form.submit();

        setSubmittedEmail(cleanEmail);
        setOkMsg(t("newsletter_success_pending"));
        setDone(true);
        return;
      }

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

      setSubmittedEmail(cleanEmail);
      setOkMsg(data?.message || t("newsletter_success_pending"));
      setDone(true);
    } catch {
      setErrMsg(t("newsletter_error_generic"));
    } finally {
      setBusy(false);
    }
  }

  const formAction = NEWSLETTER.MODE === "form" ? NEWSLETTER.FORM_ACTION : undefined;
  const formMethod = NEWSLETTER.MODE === "form" ? (NEWSLETTER.FORM_METHOD || "post") : undefined;

  // Professional: after success, replace the form with a success panel
  if (done) {
    return (
      <div className="zr-newsletter">
        <div className="zr-alert">{okMsg || t("newsletter_success_pending")}</div>

        {submittedEmail ? (
          <div style={{ marginTop: 8, opacity: 0.85, fontSize: 14 }}>
            {submittedEmail}
          </div>
        ) : null}

        <div style={{ marginTop: 12 }}>
          <button type="button" className="zr-btn2 zr-btn2--ghost" onClick={resetToEdit}>
            Change email
          </button>
        </div>
      </div>
    );
  }

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
            onChange={(e2) => setEmail(e2.target.value)}
            required
            disabled={busy}
          />

          {/* Spam honeypot: should be hidden via CSS (.zr-newsletter__hp) */}
          <input
            className="zr-newsletter__hp"
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={hp}
            onChange={(e2) => setHp(e2.target.value)}
            aria-hidden="true"
          />

          {NEWSLETTER.MODE === "form" && (
            <>
              <input type="hidden" name="EMAIL" value={email} readOnly />
              {Object.entries(NEWSLETTER.FORM_HIDDEN_FIELDS || {}).map(([k, v]) => (
                <input key={k} type="hidden" name={k} value={String(v)} readOnly />
              ))}
            </>
          )}

          <button className="zr-btn2 zr-btn2--primary" type="submit" disabled={!canSubmit}>
            {busy ? t("newsletter_submitting") : t("newsletter_submit")}
          </button>
        </div>
      </div>

      <div className="zr-newsletter__checks">
        <label className="zr-newsletter__check">
          <input
            type="checkbox"
            checked={consent}
            onChange={(e2) => setConsent(e2.target.checked)}
            required
            disabled={busy}
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
            onChange={(e2) => setTracking(e2.target.checked)}
            disabled={busy}
          />
          <span>{t("newsletter_tracking_optional")}</span>
        </label>
      </div>

      {errMsg ? <div className="zr-alert zr-alert--error">{errMsg}</div> : null}
    </form>
  );
}