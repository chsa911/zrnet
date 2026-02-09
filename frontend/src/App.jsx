// frontend/src/App.jsx
import React from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";
import AdminPage from "./pages/AdminPage";
import MostReadAuthorsPage from "./pages/MostReadAuthorsPage";
import BookThemesPage from "./pages/BookThemesPage";
import StatsDetailPage from "./pages/StatsDetailPage";

// protected admin pages
import RegisterPage from "./pages/RegisterPage";
import SearchUpdatePage from "./pages/SearchUpdatePage";
import SyncIssuePage from "./pages/SyncIssuePage";
import RequireAdmin from "./components/RequireAdmin";

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
        <Route path="bookthemes" element={<BookThemesPage />} />
        <Route path="bookthemes.html" element={<Navigate to="/bookthemes" replace />} />

        {/* admin login (no link in header; only direct URL) */}
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />

        {/* authors */}
        <Route path="autoren_meistgelesen.html" element={<MostReadAuthorsPage />} />
        <Route path="autoren_meist_gelesen.html" element={<MostReadAuthorsPage />} />

        {/* protected admin tools */}
        <Route
          path="register"
          element={
            <RequireAdmin>
              <RegisterPage />
            </RequireAdmin>
          }
        />
        <Route
          path="update"
          element={
            <RequireAdmin>
              <SearchUpdatePage />
            </RequireAdmin>
          }
        />
        <Route
          path="sync-issues"
          element={
            <RequireAdmin>
              <SyncIssuePage />
            </RequireAdmin>
          }
        />

        {/* optional alias */}
        <Route
          path="search"
          element={
            <RequireAdmin>
              <SearchUpdatePage />
            </RequireAdmin>
          }
        />

        {/* stats */}
        <Route path="stats/:type" element={<StatsDetailPage />} />

        {/* legacy html routes like /ueber_mich.html, /impressum.html ... */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}