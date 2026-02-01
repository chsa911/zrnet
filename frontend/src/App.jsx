// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import RegisterPage from "./pages/RegisterPage";
import SearchUpdatePage from "./pages/SearchUpdatePage";
import BooksPage from "./pages/BooksPage";
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
        <Route path="index.html" element={<Navigate to="/" replace />} />

        <Route path="register" element={<RegisterPage />} />
        <Route path="update" element={<SearchUpdatePage />} />
        <Route path="analytics" element={<AnalyticsPage />} />
        <Route path="books" element={<BooksPage />} />

        {/* Catch old links like /ueber_mich.html, /faq.html, ... */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}