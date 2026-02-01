import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";

function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>404</h2>
      <p>Seite nicht gefunden.</p>
      <a href="/" style={{ color: "#00d37c" }}>Zur Startseite</a>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        {/* Home */}
        <Route index element={<Home />} />
        <Route path="index.html" element={<Navigate to="/" replace />} />

        {/* Analytics (both /analytics and /analytics/ and deeper) */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* HARD REMOVE public admin pages */}
        <Route path="register" element={<Navigate to="/" replace />} />
        <Route path="update" element={<Navigate to="/" replace />} />

        {/* Legacy pages like /ueber_mich.html, /faq.html, /merchandise.html, /impressum.html */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        {/* 404 */}
        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}