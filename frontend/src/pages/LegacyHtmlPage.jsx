import React, { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

export default function LegacyHtmlPage() {
  const { page } = useParams(); // "ueber_mich" from "/ueber_mich.html"
  const src = useMemo(() => `/assets/${page}.html`, [page]);

  const [html, setHtml] = useState("");
  const [err, setErr] = useState("");

  useEffect(() => {
    let cancelled = false;

    async function load() {
      setErr("");
      setHtml("");

      // Don’t allow redirects to break us (common cause of mixed-content / wrong page)
      const resp = await fetch(src, { cache: "no-store", redirect: "manual" });

      if (resp.status >= 300 && resp.status < 400) {
        throw new Error(
          `Legacy file redirected (${resp.status}). Fix nginx so /assets/*.html is served as a file (no redirects).`
        );
      }
      if (!resp.ok) throw new Error(`HTTP ${resp.status} while loading ${src}`);

      const text = await resp.text();

      // Parse and strip legacy header + scripts
      const parser = new DOMParser();
      const doc = parser.parseFromString(text, "text/html");

      // remove old header blocks (you want ONE header from Layout)
      doc.querySelectorAll("header.zr-topbar, header").forEach((el) => el.remove());

      // remove scripts (avoid legacy JS doing redirects / injecting another header)
      doc.querySelectorAll("script").forEach((el) => el.remove());

      // remove legacy <link rel="stylesheet"> (Layout already loads CSS)
      doc.querySelectorAll("link[rel='stylesheet']").forEach((el) => el.remove());

      let body = doc.body ? doc.body.innerHTML : text;

      // fix common relative asset paths (assets/.. -> /assets/..)
      body = body.replace(/(src|href)=["']assets\//g, '$1="/assets/');
      body = body.replace(/url\(\s*['"]?assets\//g, "url(/assets/");

      // force https if any hardcoded http://zenreader.net exists
      body = body.replaceAll("http://zenreader.net", "https://zenreader.net");

      if (!cancelled) setHtml(body);
    }

    load().catch((e) => {
      if (!cancelled) setErr(e.message || String(e));
    });

    return () => {
      cancelled = true;
    };
  }, [src]);

  if (err) {
    return (
      <div style={{ fontFamily: "Arial, sans-serif", background: "white", padding: 16, borderRadius: 12 }}>
        <h2 style={{ marginTop: 0 }}>Fehler</h2>
        <p>{err}</p>
        <p>
          Datei erwartet unter: <code>{src}</code>
        </p>
      </div>
    );
  }

  return (
    <div style={{ background: "white", padding: 16, borderRadius: 12 }}>
      {html ? <div dangerouslySetInnerHTML={{ __html: html }} /> : <div>Loading…</div>}
    </div>
  );
}