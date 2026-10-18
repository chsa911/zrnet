// frontend/src/components/OpenIssuesBanner.jsx
// Roter Balken auf jeder Admin-Seite, solange es offene Vorgänge gibt
// (abgelehnte Registrierungen, die noch nicht erledigt sind).
// Aktualisierung: alle 30 s, beim Zurückkehren in den Tab und sofort nach
// notifyOpenIssuesChanged() (z. B. wenn ein Speichern abgelehnt wurde).
import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getOpenSaveFailures } from "../api/saveFailures";
import { OPEN_ISSUES_CHANGED_EVENT } from "../utils/saveFeedback";
import { ACTIVITY_CHANGED_EVENT } from "./ActivitiesToday";

const POLL_MS = 30000;

function since(ts) {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return "";
  const today = new Date();
  const yest = new Date(Date.now() - 864e5);
  const hm = d.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" });
  if (d.toDateString() === today.toDateString()) return `heute ${hm}`;
  if (d.toDateString() === yest.toDateString()) return `gestern ${hm}`;
  return `${d.toLocaleDateString("de-DE")} ${hm}`;
}

export default function OpenIssuesBanner() {
  const [data, setData] = useState(null);
  const { pathname } = useLocation();

  useEffect(() => {
    let alive = true;
    let inflight = false;
    const load = async () => {
      if (inflight) return;
      inflight = true;
      try {
        const j = await getOpenSaveFailures();
        if (alive) setData(j);
      } catch {
        /* keep last known state; the watcher on the Mac is the safety net */
      } finally {
        inflight = false;
      }
    };
    const onChanged = () => setTimeout(load, 400);
    const onVis = () => document.visibilityState === "visible" && load();
    load();
    const t = setInterval(() => document.visibilityState === "visible" && load(), POLL_MS);
    window.addEventListener(OPEN_ISSUES_CHANGED_EVENT, onChanged);
    window.addEventListener(ACTIVITY_CHANGED_EVENT, onChanged);
    document.addEventListener("visibilitychange", onVis);
    return () => {
      alive = false;
      clearInterval(t);
      window.removeEventListener(OPEN_ISSUES_CHANGED_EVENT, onChanged);
      window.removeEventListener(ACTIVITY_CHANGED_EVENT, onChanged);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  const items = data?.items || [];
  if (!items.length) return null;

  const first = items[0];
  const onListPage = pathname === "/admin/open-issues";

  return (
    <div className="zr-openissues" role="alert">
      <style>{`
        .zr-openissues { background: #b91c1c; color: #fff; padding: 12px 16px; margin: 0 0 16px;
          font-weight: 800; font-size: 18px; line-height: 1.35; display: flex; flex-wrap: wrap;
          gap: 8px 16px; align-items: center; justify-content: space-between; }
        .zr-openissues a { color: #fff; background: rgba(0,0,0,.25); padding: 6px 12px;
          text-decoration: none; border-radius: 4px; white-space: nowrap; }
        .zr-openissues a:hover { background: rgba(0,0,0,.4); }
        .zr-openissues small { font-weight: 600; opacity: .9; }
      `}</style>
      <span>
        ⚠ {items.length === 1 ? "1 offener Vorgang" : `${items.length} offene Vorgänge`}:{" "}
        {first.title}
        {first.author ? ` (${first.author})` : ""} – nicht gespeichert, seit {since(first.first_at)}
        {items.length > 1 ? <small> und {items.length - 1} weitere</small> : null}
      </span>
      {onListPage ? null : <Link to="/admin/open-issues">Anzeigen und erledigen →</Link>}
    </div>
  );
}
