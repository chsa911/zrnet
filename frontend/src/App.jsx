import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAdmin from "./components/RequireAdmin";

import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";
import InfoPage from "./pages/InfoPage";
import AdminCommentsPage from "./pages/AdminCommentsPage";
import AdminPage from "./pages/AdminPage";
import AdminAuthorsOverviewPage from "./pages/AdminAuthorsOverviewPage";
import AbbreviationsAdminPage from "./pages/AbbreviationsAdminPage";
import RegisterPage from "./pages/RegisterPage";
import SearchUpdatePage from "./pages/SearchUpdatePage";
import SyncIssuePage from "./pages/SyncIssuePage";
import BarcodeDashboardPage from "./pages/BarcodeDashboardPage";
import BookThemesPage from "./pages/BookThemesPage";
import ThemeBooksPage from "./pages/ThemeBooksPage";
import StatsDetailPage from "./pages/StatsDetailPage";
import MostReadAuthorsPage from "./pages/MostReadAuthorsPage";
import AuthorsOverviewPage from "./pages/AuthorsOverviewPage";
import AuthorPage from "./pages/AuthorPage";
import BookPage from "./pages/BookPage";
/* import NewsletterPage from "./pages/NewsletterPage"; */
import ThemeSubthemesAuthorsPage from "./pages/ThemeSubthemesAuthorsPage";
import BetaTestPage from "./pages/BetaTestPage";

import { processUploadQueue } from "./utils/uploadQueue";

function NotFound() {
  return (
    <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
      <h2>404</h2>
      <p>Page not found.</p>
    </div>
  );
}

export default function App() {
  useEffect(() => {
    let alive = true;

    const run = async () => {
      try {
        await processUploadQueue({ maxJobs: 10 });
      } catch {
        // ignore (queue persists)
      }
    };

    run();

    const onOnline = () => {
      if (alive) run();
    };

    const onVis = () => {
      if (!alive) return;
      if (document.visibilityState === "visible") run();
    };

    window.addEventListener("online", onOnline);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      alive = false;
      window.removeEventListener("online", onOnline);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  return (
    <Routes>
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />

        {/* book themes */}
        <Route path="bookthemes" element={<BookThemesPage />} />
        <Route path="bookthemes/:abbr" element={<ThemeBooksPage />} />
        <Route path="bookthemes.html" element={<Navigate to="/bookthemes" replace />} />
        <Route path="bookthemes/:abbr/subthemes" element={<ThemeSubthemesAuthorsPage />} />

        <Route path="beta-test" element={<BetaTestPage />} />

        {/* analytics */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* removed public merch/equipment pages for the DHDL-facing site */}
        <Route path="merch" element={<Navigate to="/" replace />} />
        <Route path="checkout" element={<Navigate to="/" replace />} />
        <Route path="order/:orderId" element={<Navigate to="/" replace />} />
        <Route path="merchandise.html" element={<Navigate to="/" replace />} />

        {/* newsletter */}
        {/*
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="newsletter.html" element={<Navigate to="/newsletter" replace />} />
        */}

        {/* static info pages */}
        <Route path="info/:slug" element={<InfoPage />} />

        {/* legacy static routes */}
        <Route path="technik" element={<Navigate to="/info/so-funktionierts" replace />} />
        <Route path="faq" element={<Navigate to="/info/faq" replace />} />
        <Route path="impressum" element={<Navigate to="/info/impressum" replace />} />
        <Route path="datenschutz" element={<Navigate to="/info/datenschutz" replace />} />

        <Route path="technik.html" element={<Navigate to="/info/so-funktionierts" replace />} />
        <Route path="info/technik" element={<Navigate to="/info/so-funktionierts" replace />} />
        <Route path="info/ausruestung" element={<Navigate to="/info/so-funktionierts" replace />} />
        <Route path="ausruestung.html" element={<Navigate to="/info/so-funktionierts" replace />} />
        <Route path="beschaffung.html" element={<Navigate to="/info/beschaffung" replace />} />
        <Route path="faq.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="haeufige_fragen.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="haeufige_fragen_d.html" element={<Navigate to="/info/faq" replace />} />
        <Route path="impressum.html" element={<Navigate to="/info/impressum" replace />} />
        <Route path="impressum_d.html" element={<Navigate to="/info/impressum" replace />} />
        <Route path="datenschutz.html" element={<Navigate to="/info/datenschutz" replace />} />

        {/* public authors / books */}
        <Route path="authors" element={<AuthorsOverviewPage />} />
        <Route path="author/:author" element={<AuthorPage />} />
        <Route path="book/:id" element={<BookPage />} />

        {/* admin */}
        <Route path="admin" element={<AdminPage />} />
        <Route
          path="admin/register"
          element={
            <RequireAdmin>
              <RegisterPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/authors"
          element={
            <RequireAdmin>
              <AdminAuthorsOverviewPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/abbreviations"
          element={
            <RequireAdmin>
              <AbbreviationsAdminPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/search-update"
          element={
            <RequireAdmin>
              <SearchUpdatePage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/sync-issues"
          element={
            <RequireAdmin>
              <SyncIssuePage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/barcodes"
          element={
            <RequireAdmin>
              <BarcodeDashboardPage />
            </RequireAdmin>
          }
        />
        <Route
          path="admin/comments"
          element={
            <RequireAdmin>
              <AdminCommentsPage />
            </RequireAdmin>
          }
        />

        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="login.html" element={<Navigate to="/admin" replace />} />

        {/* legacy admin links */}
        <Route path="register" element={<Navigate to="/admin/register" replace />} />
        <Route path="update" element={<Navigate to="/admin/search-update" replace />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />

        {/* stats */}
        <Route path="stats/:type" element={<StatsDetailPage />} />

        {/* top authors */}
        <Route path="top-authors" element={<MostReadAuthorsPage />} />
        <Route path="autoren_meistgelesen.html" element={<Navigate to="/top-authors" replace />} />
        <Route path="autoren_meist_gelesen.html" element={<Navigate to="/top-authors" replace />} />

        {/* other legacy html routes */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}