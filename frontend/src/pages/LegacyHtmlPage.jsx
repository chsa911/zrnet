// frontend/src/pages/LegacyHtmlPage.jsx
import React from "react";
import { useParams } from "react-router-dom";

export default function LegacyHtmlPage() {
  const { page } = useParams(); // e.g. "ueber_mich" from "/ueber_mich.html"
  const src = `/assets/${page}.html`;

  return (
    <div style={{ width: "100%" }}>
      <div style={{ fontFamily: "Arial, sans-serif", marginBottom: 10 }}>
        <b>Legacy page:</b> {page}.html
      </div>

      <iframe
        title={page}
        src={src}
        style={{
          width: "100%",
          height: "80vh",
          border: "1px solid #ddd",
          borderRadius: 8,
          background: "#fff",
        }}
      />

      <div style={{ marginTop: 10, fontSize: 12, color: "#444" }}>
        If you get a 404 here, make sure this file exists in your repo at:
        <code style={{ marginLeft: 6 }}>frontend/public/assets/{page}.html</code>
        and rebuild the web image.
      </div>
    </div>
  );
}