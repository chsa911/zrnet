import React, { useEffect } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import Layout from "./components/Layout";
import Home from "./pages/Home";
import AnalyticsPage from "./pages/AnalyticsPage";
import LegacyHtmlPage from "./pages/LegacyHtmlPage";
import InfoPage from "./pages/InfoPage";
import AdminCommentsPage from "./pages/AdminCommentsPage";
import AdminPage from "./pages/AdminPage";
import RegisterPage from "./pages/RegisterPage";
import SearchUpdatePage from "./pages/SearchUpdatePage";
import SyncIssuePage from "./pages/SyncIssuePage";
import BarcodeDashboardPage from "./pages/BarcodeDashboardPage";
import BookThemesPage from "./pages/BookThemesPage";
import ThemeBooksPage from "./pages/ThemeBooksPage";
import StatsDetailPage from "./pages/StatsDetailPage";
import MostReadAuthorsPage from "./pages/MostReadAuthorsPage";
import AuthorPage from "./pages/AuthorPage";
import BookPage from "./pages/BookPage";
import MerchPage from "./pages/MerchPage";
import CheckoutPage from "./pages/CheckoutPage";
import OrderThanksPage from "./pages/OrderThanksPage";
import NewsletterPage from "./pages/NewsletterPage";
import ThemeSubthemesAuthorsPage from "./pages/ThemeSubthemesAuthorsPage";
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
  // Safety net: retry any locally queued registrations/uploads when the app opens or comes online.
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

    const onOnline = () => alive && run();
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
      {/* ✅ Make the layout route explicit */}
      <Route path="/" element={<Layout />}>
        <Route index element={<Home />} />

        {/* book themes */}
        <Route path="bookthemes" element={<BookThemesPage />} />
        <Route path="bookthemes/:abbr" element={<ThemeBooksPage />} />
        <Route path="bookthemes.html" element={<Navigate to="/bookthemes" replace />} />

        {/* analytics */}
        <Route path="analytics/*" element={<AnalyticsPage />} />

        {/* merch */}
        <Route path="merch" element={<MerchPage />} />
        <Route path="checkout" element={<CheckoutPage />} />
        <Route path="order/:orderId" element={<OrderThanksPage />} />
        <Route path="merchandise.html" element={<Navigate to="/merch" replace />} />

        {/* newsletter */}
        <Route path="newsletter" element={<NewsletterPage />} />
        <Route path="newsletter.html" element={<Navigate to="/newsletter" replace />} />

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
        <Route path="datenschutz.html" element={<Navigate to="/info/datenschutz" replace />} />

        {/* book detail */}
        <Route path="book/:id" element={<BookPage />} />

        {/* author detail */}
        <Route path="author/:author" element={<AuthorPage />} />
<Route path="bookthemes/:abbr/subthemes" element={<ThemeSubthemesAuthorsPage />} />
        {/* admin */}
        <Route path="admin" element={<AdminPage />} />
        <Route path="admin/register" element={<RegisterPage />} />
        <Route path="admin/search-update" element={<SearchUpdatePage />} />
        <Route path="admin/sync-issues" element={<SyncIssuePage />} />
        <Route path="admin/barcodes" element={<BarcodeDashboardPage />} />
        <Route path="admin/comments" element={<AdminCommentsPage />} />
        <Route path="login" element={<Navigate to="/admin" replace />} />
        <Route path="login.html" element={<Navigate to="/admin" replace />} />

        {/* legacy admin links */}
        <Route path="register" element={<Navigate to="/admin/register" replace />} />
        <Route path="update" element={<Navigate to="/admin/search-update" replace />} />
        <Route path="admin.html" element={<Navigate to="/admin" replace />} />

        {/* stats */}
        <Route path="stats/:type" element={<StatsDetailPage />} />

        {/* Top authors */}
        <Route path="top-authors" element={<MostReadAuthorsPage />} />
        <Route path="autoren_meistgelesen.html" element={<Navigate to="/top-authors" replace />} />
        <Route path="autoren_meist_gelesen.html" element={<Navigate to="/top-authors" replace />} />

        {/* other legacy html routes (fallback) */}
        <Route path=":page.html" element={<LegacyHtmlPage />} />

        <Route path="*" element={<NotFound />} />
      </Route>
    </Routes>
  );
}