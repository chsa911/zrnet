// frontend/src/App.jsx
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
      <p>Page not found.</p>
    </div>
  );
}

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Home />} />

        {/* Make /analytics and /analytics/ both work */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* HARD-REMOVE: public access to admin pages */}
        <Route path="register" element={<Navigate to="/" replace />} />
        <Route path="update" element={<Navigate to="/" replace />} />

        {/* legacy html routes like /ueber_mich.html */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}