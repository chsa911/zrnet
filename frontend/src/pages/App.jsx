import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";
import InfoPage from "./pages/InfoPage";

import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";
import SearchUpdatePage from "./pages/SearchUpdatePage";
import SyncIssuePage from "./pages/SyncIssuePage";
import BarcodeDashboardPage from "./pages/BarcodeDashboardPage";
import BookThemesPage from "./pages/BookThemesPage";
import StatsDetailPage from "./pages/StatsDetailPage";
import MostReadAuthorsPage from "./pages/MostReadAuthorsPage";
import BookPage from "./pages/BookPage";
import MerchPage from "./pages/MerchPage";

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
      {/* ✅ Make the layout route explicit */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />

        {/* book themes */}
        <Route path="bookthemes" element={<BookThemesPage />} />
        <Route path="bookthemes.html" element={<Navigate to="/bookthemes" replace />} />

        {/* analytics */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* merch */}
        <Route path="merch" element={<MerchPage />} />
        <Route path="merchandise.html" element={<Navigate to="/merch" replace />} />

        {/* static info pages (React + i18n) */}
        <Route path="info/:slug" element={<InfoPage />} />

        {/* legacy static routes → info/:slug */}
        <Route path="technik.html" element={<Navigate to="/info/technik" replace />} />
        <Route path="ausruestung.html" element={<Navigate to="/info/ausruestung" replace />} />
        <Route path="beschaffung.html" element={<Navigate to="/info/beschaffung" replace />} />
        <Route path="faq.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="haeufige_fragen.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="haeufige_fragen_d.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="ueber_mich.html" element={<Navigate to="/info/ueber_mich" replace />} />
        <Route path="impressum.html" element={<Navigate to="/info/impressum" replace />} />
        <Route path="impressum_d.html" element={<Navigate to="/info/impressum" replace />} />

        {/* book detail */}
        <Route path="book/:id" element={<BookPage />} />

        {/* admin */}
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/register" element={<RegisterPage />} />
        <Route path="admin/search-update" element={<SearchUpdatePage />} />
        <Route path="admin/sync-issues" element={<SyncIssuePage />} />
        <Route path="admin/barcodes" element={<BarcodeDashboardPage />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="login.html" element={<Navigate to="/admin" replace />} />

        {/* legacy admin links */}
        <Route path="register" element={<Navigate to="/admin/register" replace />} />
        <Route path="update" element={<Navigate to="/admin/search-update" replace />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />

        {/* stats */}
        <Route path="stats/:type" element={<StatsDetailPage />} />

        {/* other legacy html routes */}
        <Route path="autoren_meistgelesen.html" element={<MostReadAuthorsPage />} />
        <Route path="autoren_meist_gelesen.html" element={<MostReadAuthorsPage />} />
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}