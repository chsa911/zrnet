import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";
import AdminPage from "./pages/AdminPage";

function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>404</h2>
      <p>Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* analytics */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* admin (no link in header; only direct URL) */}
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />

        {/* hide old public admin pages if any */}
        <Route path="register" element={<Navigate to="/" replace />} />
        <Route path="update" element={<Navigate to="/" replace />} />

        {/* legacy html routes like /ueber_mich.html, /impressum.html ... */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}
