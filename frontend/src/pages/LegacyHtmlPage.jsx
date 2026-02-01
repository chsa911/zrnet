import React from "react";
import { useParams } from "react-router-dom";

export default function LegacyHtmlPage() {
  const { page } = useParams(); // "ueber_mich" from "/ueber_mich.html"
  const src = `/assets/${page}.html`;

  return (
    <iframe
      title={page}
      src={src}
      style={{
        width: "100%",
        height: "calc(100vh - 120px)",
        border: "0",
        background: "transparent",
      }}
    />
  );
}
