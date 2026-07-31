import React, { useEffect, useState } from "react";
import { Outlet, useLocation, Navigate } from "react-router-dom";
import TopBar from "./TopBar";
import Footer from "./Footer";
import UploadQueueManager from "./UploadQueueManager"; // <-- add
import { getApiRoot } from "../api/apiRoot";

/**
 * Site-wide login gate.
 *
 * Every page goes through the exact same check the admin sub-pages already
 * used (GET /api/admin/me, cookie-based). The only path exempt from the
 * check is the login form itself ("/admin"), otherwise nobody could ever
 * reach it to log in.
 */
function SiteGate({ children }) {
  const location = useLocation();
  const [state, setState] = useState({ checking: true, ok: false });

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch(`${getApiRoot()}/admin/me`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!cancelled) setState({ checking: false, ok: res.ok });
      } catch {
        if (!cancelled) setState({ checking: false, ok: false });
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [location.pathname]);

  if (state.checking) {
    return (
      <div style={{ padding: 24, fontFamily: "Arial, sans-serif" }}>
        <p>Checking login…</p>
      </div>
    );
  }

  if (!state.ok) {
    const next = `${location.pathname}${location.search || ""}${location.hash || ""}`;
    return <Navigate to={`/admin?next=${encodeURIComponent(next)}`} replace />;
  }

  return children;
}

export default function Layout() {
  const location = useLocation();
  const isLoginPage = location.pathname === "/admin" || location.pathname === "/admin/";

  const content = (
    <main className="zr-main">
      <Outlet />
    </main>
  );

  return (
    <div className="zr-page">
      <TopBar />
      <div className="zr-greybar" aria-hidden="true" />
      {isLoginPage ? content : <SiteGate>{content}</SiteGate>}
      <Footer />
      <UploadQueueManager />
    </div>
  );
}