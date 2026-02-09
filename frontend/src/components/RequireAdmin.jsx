// frontend/src/components/RequireAdmin.jsx
import React, { useEffect, useState } from "react";
import { Navigate, useLocation } from "react-router-dom";
import { getApiRoot } from "../api/apiRoot";

/**
 * Checks cookie session via GET /api/admin/me
 * If not logged in => redirects to /admin?next=...
 */
export default function RequireAdmin({ children }) {
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
  }, []);

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