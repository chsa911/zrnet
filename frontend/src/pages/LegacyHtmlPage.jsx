import React from "react";
import { useParams } from "react-router-dom";

export default function LegacyHtmlPage() {
  const { page } = useParams(); // "ueber_mich" from "/ueber_mich.html"
  const src = `/assets/${page}.html`;

  return (
    <section className="zr-section">
      <iframe title={page} src={src} className="zr-legacyFrame" />
    </section>
  );
}