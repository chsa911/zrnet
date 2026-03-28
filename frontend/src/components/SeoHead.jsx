import { useEffect } from "react";
import { useLocation } from "react-router-dom";

/**
 * Lightweight, dependency-free SEO head updates for an SPA.
 * - Keeps <link rel="canonical"> in sync with the current route
 * - Keeps <meta property="og:url"> in sync with the current route
 *
 * Note: These tags are set client-side (Google renders JS, curl won't show them).
 */
export default function SeoHead() {
  const { pathname } = useLocation();

  useEffect(() => {
    if (typeof window === "undefined") return;

    const origin = window.location.origin || "https://pagesinline.com";
    const cleanPath =
      pathname === "/" ? "/" : pathname.replace(/\/+$/, ""); // drop trailing slash (except root)
    const canonicalHref = origin + cleanPath;

    // Canonical link
    let canonical = document.querySelector("link[rel='canonical']");
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.setAttribute("rel", "canonical");
      document.head.appendChild(canonical);
    }
    canonical.setAttribute("href", canonicalHref);

    // OpenGraph URL
    let ogUrl = document.querySelector("meta[property='og:url']");
    if (!ogUrl) {
      ogUrl = document.createElement("meta");
      ogUrl.setAttribute("property", "og:url");
      document.head.appendChild(ogUrl);
    }
    ogUrl.setAttribute("content", canonicalHref);
  }, [pathname]);

  return null;
}
