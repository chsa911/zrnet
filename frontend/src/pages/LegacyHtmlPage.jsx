// frontend/src/pages/LegacyHtmlPage.jsx
import React from "react";
import { useParams } from "react-router-dom";

export default function LegacyHtmlPage() {
  const { page } = useParams(); // "/ueber_mich.html" => page="ueber_mich"
  const src = `/assets/${page}.html`;

  return (
    <iframe
      title={page}
      src={src}
      style={{
        width: "100%",
        height: "85vh",
        border: "1px solid #ddd",
        borderRadius: 8,
        background: "#fff",
      }}
      onLoad={(e) => {
        const doc = e.currentTarget.contentDocument;
        if (!doc) return;

        const style = doc.createElement("style");
        style.textContent = `
          .zr-topbar, header.zr-topbar { display:none !important; }
          body { background: transparent !important; }
        `;
        doc.head.appendChild(style);
      }}
    />
  );
}