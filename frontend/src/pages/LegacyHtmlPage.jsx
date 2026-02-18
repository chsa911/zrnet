import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import { useI18n } from "../context/I18nContext";

// Some legacy pages exist in multiple language variants under /public/assets.
// We map a route like /faq.html to a locale-specific asset file when available.
// Add more mappings as you create translated HTML files.
const LEGACY_PAGE_MAP = {
  de: {
    // German versions currently use a _d suffix
    faq: "haeufige_fragen_d",
    impressum: "impressum_d",
  },
};

export default function LegacyHtmlPage() {
  const { page } = useParams(); // "ueber_mich" from "/ueber_mich.html"
  const { locale, t } = useI18n();

  const baseLocale = useMemo(() => {
    const norm = String(locale || "en");
    return norm.toLowerCase().startsWith("pt") ? "pt-BR" : norm.split("-")[0];
  }, [locale]);

  const [resolvedSrc, setResolvedSrc] = useState(`/assets/${page}.html`);
  const [hasLocalizedVariant, setHasLocalizedVariant] = useState(false);

  useEffect(() => {
    let alive = true;
    const ac = new AbortController();

    // IMPORTANT:
    // Many deployments have an SPA "catch-all" that returns index.html (HTTP 200)
    // even for missing files like /assets/technik_de.html. If we only check resp.ok
    // we'd incorrectly think the localized legacy HTML exists and then the iframe
    // would render the React app inside itself (double header + 404).
    //
    // So we also detect and reject SPA index.html responses.
    async function exists(url) {
      try {
        // Some servers don't support HEAD → use a lightweight GET.
        const resp = await fetch(url, { method: "GET", signal: ac.signal, cache: "no-store" });
        if (!resp.ok) return false;

        // Heuristic: our SPA index contains a root mount node.
        // Legacy HTML pages don't.
        const text = await resp.text();
        if (text.includes('id="root"') || text.includes("id='root'")) return false;
        return true;
      } catch {
        return false;
      }
    }

    (async () => {
      const base = baseLocale;
      const defaultUrl = `/assets/${page}.html`;

      const candidates = [];
      const mapped = LEGACY_PAGE_MAP?.[base]?.[page];
      if (mapped) candidates.push(`/assets/${mapped}.html`);

      // Convention-based fallbacks you can add later, e.g. technik_es.html
      if (base && base !== "en") {
        candidates.push(`/assets/${page}_${base}.html`);
        candidates.push(`/assets/${page}.${base}.html`);
      }

      candidates.push(defaultUrl);

      for (const url of candidates) {
        if (await exists(url)) {
          if (!alive) return;
          setResolvedSrc(url);
          setHasLocalizedVariant(url !== defaultUrl);
          return;
        }
      }

      // Last resort
      if (!alive) return;
      setResolvedSrc(defaultUrl);
      setHasLocalizedVariant(false);
    })();

    return () => {
      alive = false;
      ac.abort();
    };
  }, [page, baseLocale]);

  return (
    <section className="zr-section">
      {!hasLocalizedVariant && locale !== "en" ? (
        <div
          style={{
            marginBottom: 12,
            padding: "10px 12px",
            borderRadius: 10,
            background: "rgba(0,0,0,0.04)",
            fontFamily: "Arial, sans-serif",
          }}
        >
          {t("i18n_legacy_notice", { locale: String(locale).toUpperCase() })}
        </div>
      ) : null}

      {/* key forces reload when locale changes */}
      <iframe key={resolvedSrc} title={page} src={resolvedSrc} className="zr-legacyFrame" />
    </section>
  );
}