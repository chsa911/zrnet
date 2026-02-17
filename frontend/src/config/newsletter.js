// Newsletter integration config (frontend)
// ------------------------------------------------------------
// This React/Vite project is served as static files (nginx). To avoid
// exposing provider API keys in the browser, the recommended setup is:
//   - frontend POSTs to your own backend endpoint
//   - backend talks to your email service provider (Brevo, CleverReach, rapidmail, Mailjet, ...)
//   - backend triggers a DOUBLE OPT-IN flow and stores consent proof
//
// If you don't have a backend endpoint yet, you can temporarily use a
// provider-hosted subscription form (MODE: "form").

export const NEWSLETTER = {
  // "api" = POST to your backend endpoint
  // "form" = classic HTML form submit to a provider endpoint
  MODE: "api",

  // API mode
  // Optional override at build time: VITE_API_BASE="https://api.example.com" (no trailing slash)
  API_URL: `${String(import.meta?.env?.VITE_API_BASE || "").replace(/\/$/, "")}/api/public/newsletter/subscribe`,

  // Form mode (provider hosted)
  // Example (Mailchimp): "https://YOUR.usX.list-manage.com/subscribe/post?u=...&id=..."
  FORM_ACTION: "",
  FORM_METHOD: "post",
  // Extra hidden fields required by some providers (e.g. Mailchimp)
  // Example: { u: "...", id: "..." }
  FORM_HIDDEN_FIELDS: {},

  // Copy
  LIST_NAME: "ZenReader Newsletter",
  FREQUENCY_HINT: "", // e.g. "1–2×/Monat" or "monthly"

  // Links
  PRIVACY_URL: "/datenschutz.html",
  IMPRINT_URL: "/impressum.html",

  // Version your consent wording so you can prove what users agreed to.
  CONSENT_TEXT_VERSION: "2026-02-16",
};
